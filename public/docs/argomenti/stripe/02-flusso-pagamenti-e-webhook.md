Il pezzo che distingue un'integrazione Stripe che regge la produzione da una demo è il controllo di ogni transizione di stato fuori dal browser: i webhook firmano gli eventi, la riconciliazione periodica copre quelli persi e i test con oggetti mock rendono verificabili i percorsi di errore. Qui costruiamo questi tre strati su un backend Node/Express e una pagina con Payment Element, senza saltare nessuno dei casi scomodi.

## Obiettivi

- Creare un `PaymentIntent` sul server e confermarlo dal client con `stripe.confirmPayment`.
- Verificare la firma `Stripe-Signature` sul raw body e gestire l'evento una sola volta.
- Gestire l'ordine di arrivo fuori sequenza degli eventi confrontando gli stati.
- Testare la logica con il test clock, le carte di test.
- Riconciliare i pagamenti mancanti chiamando l'API e filtrare per `status`.

## Endpoint di creazione e conferma

Il backend espone un solo endpoint per l'ordine. Riceve l'identificativo del carrello, ricalcola l'importo dal database (mai dal client), crea il `PaymentIntent` con una idempotency key derivata dall'ordine e restituisce solo il `client_secret`.

```javascript
// POST /api/ordini/:id/payment-intent
app.post("/api/ordini/:id/payment-intent", async (req, res) => {
  const ordine = await db.ordini.findById(req.params.id);
  if (!ordine || ordine.utenteId !== req.utente.id) return res.sendStatus(404);
  if (ordine.pagatoIl) return res.status(409).json({ stato: "gia-pagato" });

  const intent = await stripe.paymentIntents.create(
    {
      amount: ordine.totaleCentesimi,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: req.utente.email,
      metadata: { ordineId: ordine.id },
    },
    { idempotencyKey: `ordine-${ordine.id}-v1` }
  );
  res.json({ clientSecret: intent.client_secret });
});
```

Nel browser il Payment Element raccoglie tutti i metodi abilitati dall'account, incluse carte, wallet e, nei paesi supportati, addebiti SEPA. `confirmPayment` usa il `client_secret` e un `return_url`: il parametro non è un dettaglio cosmetico perché alcuni metodi di pagamento abbandonano la pagina e tornano solo tramite redirect.

```javascript
const stripe = Stripe(process.env.VITE_STRIPE_PK);
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: `${location.origin}/ordine/conferma` },
  redirect: "if_required",
});
if (!error && paymentIntent.status === "succeeded") mostraStato("in elaborazione");
```

La pagina di ritorno deve rileggere lo stato dell'ordine dal backend e mostrare "pagamento in verifica" finché il webhook non arriva: dichiarare la conferma basandosi sul redirect reintroduce il problema che l'idempotenza e i webhook vogliono evitare.

| Punto di verità | Cosa legge | Quando è affidabile |
| --- | --- | --- |
| browser | `paymentIntent` restituito da `confirmPayment` | solo per mostrare un messaggio temporaneo |
| backend, richiesta | verifica del `client_secret` e `status` | conferma immediata per metodi sincroni |
| backend, evento | `payment_intent.succeeded` firmato | conferma definitiva, sopravvive alla chiusura del browser |
| riconciliazione | lista di PaymentIntent per giorno | copre webhook persi o endpoint offline |

## Webhook: firma, ordine e dedup

L'endpoint dei webhook deve leggere il corpo come `Buffer` e verificarlo prima di `JSON.parse`. Express applica `express.json()` a tutto per default, quindi si monta una route dedicata con `express.raw({ type: "application/json" })`, prima del parser globale, altrimenti il raw body non esiste più.

```javascript
app.post("/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, req.headers["stripe-signature"], process.env.STRIPE_WH_SECRET
      );
    } catch (err) {
      return res.status(400).send(`firma non valida: ${err.message}`);
    }
    try {
      await gestisci(event);       // idempotente per event.id
    } catch (e) {
      return res.status(500).send("riprova"); // Stripe ritenta con backoff
    }
    res.sendStatus(200);
  }
);
```

Due proprietà rendono `gestisci` corretto. La prima è la deduplicazione per `event.id` in una tabella `eventi_processati` con vincolo unique: Stripe consegna almeno una volta, quindi lo stesso evento può arrivare due volte anche a distanza di ore. La seconda è il confronto degli stati, perché `payment_intent.succeeded` e `payment_intent.canceled` possono arrivare in ordine inverso rispetto a come sono stati generati; una tabella di rango dello stato evita di riportare indietro un ordine già pagato.

```javascript
const rango = { requires_payment_method: 1, requires_action: 2, processing: 3,
                succeeded: 4, canceled: 4 };
async function applica(intent) {
  const ordine = await db.ordini.findById(intent.metadata.ordineId);
  if (rango[intent.status] < rango[ordine.statoPagamento]) return; // evento vecchio
  await db.ordini.aggiorna(ordine.id, {
    statoPagamento: intent.status,
    paymentIntentId: intent.id,
    addebitoId: intent.latest_charge,
  });
}
```

Stripe ritenta con backoff esponenziale se la risposta non è `2xx`. Restituire `400` su una firma non valida è corretto: il problema è del chiamante e un retry non lo risolve. Restituire `200` su un errore interno è invece il classico modo per perdere un pagamento.

## Test e riconciliazione

Le carte di test coprono i rami di errore in modo deterministico: `4242 4242 4242 4242` va sempre a buon fine, `4000 0000 0000 3220` richiede 3-D Secure, `4000 0000 0000 9995` genera una carta rifiutata per fondi insufficienti, `4000 0000 0000 0341` collega un pagamento a un cliente che poi rifiuta. Il numero `4000 0000 0000 0002` viene declinato. Il test clock (`stripe.testHelpers.testClocks`) permette di avanzare il tempo per fatturazione ricorrente e periodi di grazia senza aspettare giorni.

```bash
stripe login
stripe listen --forward-to localhost:3000/webhook/stripe
stripe trigger payment_intent.succeeded
stripe customers list --limit 3
```

`stripe listen` stampa al primo avvio la `whsec_...` locale da usare negli eventi inoltrati: è diversa da quella dell'endpoint deployato. Per i test unitari conviene iniettare una funzione `verificaFirma` e sostituirla con un doppio che restituisce un evento fissato: testare l'intera critical section con HTTP reale è lento e dipende dalla rete.

La riconciliazione chiude il cerchio. Un job ogni 15 minuti, o un cron notturno, cerca gli ordini rimasti in `requires_action` o `processing` da più di un'ora e interroga Stripe per verificare lo stato corretto: `stripe.paymentIntents.retrieve` con `expand: ["latest_charge"]` restituisce lo stato aggiornato, mentre `stripe.paymentIntents.list({ created: { gte: ... } })` permette di confrontare gli intenti del giorno con il tuo database.

| Scenario | Prevenzione |
| --- | --- |
| webhook duplicato | unique su `event.id` |
| evento fuori ordine | tabella di rango degli stati |
| endpoint irraggiungibile | retry di Stripe + riconciliazione oraria |
| importo diverso dal carrello | ricalcolo sul server, `amount` dal DB |
| utente che chiude il browser | stato letto dal backend, non dal redirect |

## Errori comuni

- **Montare `express.json()` prima della route webhook**: il body viene consumato e la verifica fallisce con "No signatures found".
- **Rispondere `200` per tutti gli errori**: Stripe smette di ritentare e l'ordine resta non evaso senza segnali.
- **Creare l'intent senza verificare il login**: chi conosce l'id di un ordine può generare un pagamento a proprio nome.
- **Aggiornare lo stato solo alla creazione del charge**: `charge.succeeded` e `payment_intent.succeeded` raccontano cose diverse, e cambiare l'ordine su un evento non relativo al suo intento crea stati impossibili.
- **Testare solo con la carta di successo**: i bug stanno nei percorsi `requires_action` e nei declini.
- 
## In sintesi

Il server crea e controlla, il client raccoglie e conferma, gli eventi firmati dichiarano il risultato. La deduplicazione per `event.id` e il confronto per rango degli stati rendono il webhook idempotente rispetto alla natura della rete. Test clock, carte deterministiche e `stripe listen` coprono i percorsi di errore prima della produzione, mentre un job di riconciliazione intercetta i webhook persi. Un ordine si evade una volta, e solo su un segnale firmato.

## Fonti

- [Stripe - Webhooks](https://docs.stripe.com/webhooks)
- [Stripe - Resolve webhook signature verification errors](https://docs.stripe.com/webhooks/signature)
- [Stripe - Payment Element](https://docs.stripe.com/payments/payment-element)
- [Stripe - Testing](https://docs.stripe.com/testing)
