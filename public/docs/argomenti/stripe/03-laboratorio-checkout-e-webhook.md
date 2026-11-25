In questo laboratorio costruisci `negozio-stripe`, un mini negozio in modalità test con carrello, PaymentIntent, Payment Element, webhook firmato con deduplicazione e un job di riconciliazione. Il percorso porta un ordine da `requires_payment_method` a `succeeded` senza fidarsi del browser, con test sui casi che rompono le integrazioni reali.

## Obiettivi

- Preparare l'ambiente con Stripe CLI, chiavi test e una `whsec_` locale.
- Separare prezzo, creazione dell'intent e conferma client in punti testabili.
- Scrivere un webhook che valida la firma sul raw body e applica ogni evento una sola volta.
- Provare i percorsi di errore con carte di test deterministiche.
- Chiudere con un job che recupera gli ordini rimasti senza evento.

## Passo 0: preparazione

Serve Node 22 o superiore e la CLI. Le chiavi stanno in *Developers > API keys*: `pk_test_...` per il browser e `sk_test_...` solo nel backend. La `whsec_` da usare in locale la stampa `stripe listen`, non va presa dal dashboard perché quella vale per l'endpoint deployato.

```bash
npm init -y
npm i express stripe
stripe login
stripe listen --forward-to localhost:3000/webhook/stripe
# > Ready! Your webhook signing secret is whsec_2f8a...
```

Schema minimo: `ordini` (totale, stato, `paymentIntentId`) ed `eventiProcessati` con `eventId` univoco.

| File | Responsabilità | Doppio nei test |
| --- | --- | --- |
| `src/intenti.js` | create/retrieve PaymentIntent | client fake |
| `src/webhook.js` | verifica e applica evento | verificatore iniettato |
| `src/riconcilia.js` | recupero ordini senza evento | lista fake |

## Passo 1: prezzo e intento

Il prezzo si ricalcola sul server dal catalogo in centesimi: quello del client è solo un suggerimento. L'intent usa una idempotency key derivata dall'ordine, così un doppio click non produce due pagamenti.

```javascript
// src/intenti.js
const catalogo = { caffe: 250, brioche: 220 }; // centesimi
export function totale(righe) {
  return righe.reduce((s, r) => s + catalogo[r.sku] * r.quantita, 0);
}
export function creaIntent(stripe, ordine, utente) {
  return stripe.paymentIntents.create({
    amount: ordine.totaleCentesimi, currency: "eur",
    automatic_payment_methods: { enabled: true },
    receipt_email: utente.email,
    metadata: { ordineId: ordine.id },
  }, { idempotencyKey: `ordine-${ordine.id}-v1` });
}
```

L'`amount` non compare mai nella richiesta del client: il client riceve solo `client_secret`. `metadata.ordineId` è il ponte che il webhook userà per ritrovare la riga, perché l'evento arriva su un'altra connessione senza contesto di sessione.

## Passo 2: Payment Element sul client

La pagina carica Stripe.js con la publishable e monta il Payment Element. Con `redirect: "if_required"` i metodi senza redirect completano subito; gli altri tornano sulla `return_url`.

```javascript
const stripe = Stripe("pk_test_...");
const { clientSecret } = await fetch(`/api/ordini/${id}/intent`,
  { method: "POST" }).then((r) => r.json());
const elements = stripe.elements({ clientSecret, appearance: { theme: "flat" } });
elements.create("payment").mount("#elemento");
document.querySelector("#paga").onclick = async () => {
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: `${location.origin}/ritorno.html` },
    redirect: "if_required",
  });
  stato(error ? "errore" : "in verifica, attendi l'email");
};
```

Il testo dopo la conferma è "in verifica": lo stato definitivo arriva dal webhook. La pagina `/ritorno.html` interroga `GET /api/ordini/:id/stato`, che espone solo stato e totale.

## Passo 3: webhook idempotente

Il webhook va montato prima di qualsiasi parser JSON e legge il corpo come `Buffer`. La verifica usa `constructEvent` con la `whsec_` della CLI in sviluppo e quella dell'endpoint in produzione.

```javascript
// src/webhook.js
export function rotteWebhook(app, stripe, db, segreto) {
  app.post("/webhook/stripe", express.raw({ type: "application/json" }),
    async (req, res) => {
      let evento;
      try {
        evento = stripe.webhooks.constructEvent(
          req.body, req.headers["stripe-signature"], segreto);
      } catch (e) {
        return res.status(400).send("firma non valida");
      }
      const nuovo = await db.eventi.insertIgnore(evento.id); // false se esiste
      if (!nuovo) return res.sendStatus(200);
      const intent = evento.data.object;
      if (intent.metadata?.ordineId) {
        await db.ordini.applicaStato(intent.metadata.ordineId, intent.status);
      }
      res.sendStatus(200);
    });
}
```

`insertIgnore` restituisce `false` se l'`event.id` esiste già: la risposta è `200` senza effetti. `applicaStato` ignora le transizioni all'indietro, così un `processing` duplicato non riapre un ordine pagato.

## Passo 4: verifica manuale

| Prova | Come | Atteso |
| --- | --- | --- |
| successo | carta `4242 4242 4242 4242`, CVC `123` | intent `succeeded`, ordine pagato |
| 3DS | carta `4000 0000 0000 3220` | `requires_action`, poi modale di conferma |
| declino | carta `4000 0000 0000 9995` | errore `card_declined`, ordine non pagato |
| duplicato | `stripe trigger payment_intent.succeeded` due volte | secondo `200`, nessuna riscrittura |
| firma falsa | `curl -X POST -H 'Stripe-Signature: t=1,v1=abc' --data '{}' localhost:3000/webhook/stripe` | `400`, nessuna scrittura |
| importo manomesso | modifica il JSON del carrello nel browser | totale invariato, ricalcolato sul server |

La firma falsa deve fallire prima di toccare il database; il duplicato deve passare la verifica e fermarsi sulla deduplicazione.

## Passo 5: test e riconciliazione

I test iniettano un verificatore con un evento fissato e un database in memoria: la logica gira senza rete.

```javascript
it("ignora un evento duplicato", async () => {
  const evento = { id: "evt_1", data: { object: { status: "succeeded",
    metadata: { ordineId: "o1" } } } };
  const verifica = () => evento;
  await consegna(verifica, db, { body: {}, headers: {} });
  await consegna(verifica, db, { body: {}, headers: {} });
  expect(db.ordini.get("o1").statoPagamento).toBe("succeeded");
  expect(db.scritture).toBe(1);
});
```

Il job cerca gli ordini in `processing` o `requires_action` da oltre 60 minuti, interroga Stripe e applica `succeeded` come farebbe il webhook, loggando la fonte `riconciliazione`.

```bash
node src/riconcilia.js --dry-run   # stampa solo le differenze
node src/riconcilia.js             # applica e logga
```

## Esercizi

1. Gestisci `payment_intent.payment_failed` salvando `last_payment_error.code`, con un test su `card_declined`.
2. Aggiungi `POST /api/ordini/:id/rimborso` con idempotency key e verifica che un secondo invio non duplichi il rimborso.
3. Blocca la versione dell'API con `apiVersion` nel client e annota le differenze con la versione dell'account.
4. Aggiungi un limitatore sull'endpoint di creazione e impedisci due intent aperti per lo stesso ordine.

<details>
<summary>Soluzione</summary>

1. L'evento porta `data.object.last_payment_error`: salva `code` e `decline_code` in colonne dedicate e usa il codice per il messaggio all'utente.

2. `stripe.refunds.create({ payment_intent, amount }, { idempotencyKey: \`rimborso-${ordineId}-${n}\` })`, dove `n` cresce solo dopo un rimborso riuscito: il retry dello stesso rimborso è idempotente.

3. Senza `apiVersion` il client usa la versione dell'account, quindi un aggiornamento nella dashboard può cambiare gli oggetti ricevuti senza un deploy.

4. Contatore per `utenteId` con finestra di un minuto, più una query sugli intent con `status` diverso da `succeeded`/`canceled` per `metadata.ordineId` prima della creazione.

</details>

## Errori comuni

- **Dimenticare `express.raw` sulla route**: la firma fallisce e sembra un problema di chiave.
- **Salvare l'evento separatamente dall'effetto**: se il processo muore tra le due scritture il retry lo salta; usa una transazione con l'insert di `event.id`.
- **Usare `stripe trigger` come unica prova**: genera un intent finto, non il tuo, quindi serve una conferma reale dal browser.
- **Non controllare la proprietà dell'ordine**: chi conosce un id altrui può creare pagamenti sul suo carrello.
- **Loggare il body grezzo**: contiene dati personali e va trattato come tale.

## In sintesi

Tre fonti di verità si controllano: il client raccoglie, il webhook dichiara, la riconciliazione recupera. La firma protegge dall'esterno, la deduplicazione per `event.id` dai duplicati, il rango degli stati dall'ordine di arrivo. Poi si estende lo scheletro a rimborsi e abbonamenti.

## Fonti

- [Stripe CLI](https://docs.stripe.com/cli)
- [Stripe - Testing](https://docs.stripe.com/testing)
- [Stripe - Payment Element](https://docs.stripe.com/payments/payment-element)
- [Stripe - Webhook signatures](https://docs.stripe.com/webhooks/signature)
