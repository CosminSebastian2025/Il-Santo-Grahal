Stripe è un'infrastruttura di pagamenti esposta come API HTTP/JSON: non installi un gateway nel tuo codice, chiami risorse REST con la tua chiave segreta e lasci che sia Stripe a parlare con circuiti, banche e wallet. Questa lezione costruisce il modello mentale che serve prima di scrivere la prima riga di integrazione: oggetti, chiavi, ambienti e il flusso per cui un incasso non si considera concluso quando la schermata dice "ok".

## Obiettivi

- Distinguere le chiavi publishable, secret e restricted e capire perché il client non deve mai vedere quella segreta.
- Riconoscere gli oggetti principali (`Customer`, `PaymentIntent`, `Charge`, `Refund`, `Invoice`) e le loro relazioni.
- Separare modalità test e live, compresi i prefissi delle chiavi e i dati che non sono condivisi.
- Descrivere il ciclo di vita di un pagamento e individuare il momento in cui il denaro è davvero acquisito.
- Usare idempotency key e webhook firmati come parti del contratto, non come optional.

## Chiavi, ambienti e identità dell'account

Ogni chiamata è autenticata da una chiave API nella forma `Authorization: Bearer sk_...`. Le chiavi hanno prefissi che ne dichiarano tipo e ambiente: `pk_test_`/`pk_live_` per la publishable, `sk_test_`/`sk_live_` per la secret, `rk_` per le restricted. Il prefisso è un segnale utile per intercettare un errore di configurazione prima che arrivi in produzione.

| Chiave | Dove vive | Cosa può fare |
| --- | --- | --- |
| publishable (`pk_`) | browser, app mobile | tokenizzare carte, inizializzare gli elementi di pagamento |
| secret (`sk_`) | solo backend | creare rimborsi, leggere clienti, qualsiasi operazione |
| restricted (`rk_`) | backend o servizi terzi | permessi limitati per risorsa e per operazione |
| chiave di firma webhook (`whsec_`) | endpoint che riceve eventi | verificare l'autenticità del payload |

Le modalità test e live sono separate anche nei dati: un cliente creato in test non esiste in live, e gli oggetti hanno prefissi diversi (`cus_`, `pi_`, `ch_`, `re_`, `in_`). Le chiavi test non muovono denaro e non parlano con circuiti reali, tranne quando una carta di test simula una specifica risposta. Questo rende la suite di test riproducibile, ma obbliga a tenere due set di variabili d'ambiente e a ruotare la chiave live quando un dipendente lascia il progetto.

## Gli oggetti del modello

Stripe non modella il pagamento come una singola riga contabile. Il `PaymentIntent` rappresenta l'intenzione di incassare un importo in una valuta, e traccia gli stati da `requires_payment_method` a `succeeded`. Sotto di lui compaiono i `Charge` (il tentativo effettivo sul metodo di pagamento) e i `Refund`; sopra di lui stanno il `Customer` e, per i pagamenti ricorrenti, le `Invoice`.

```json
{
  "id": "pi_3Q4xYzLkdIwHu7ix1a2b3c",
  "object": "payment_intent",
  "amount": 4990,
  "currency": "eur",
  "status": "requires_action",
  "client_secret": "pi_3Q4xYzLkdIwHu7ix1a2b3c_secret_9Zx8",
  "next_action": { "type": "use_stripe_sdk" },
  "metadata": { "ordine": "A-1042" }
}
```

Gli importi sono interi nella valuta minima: 4990 significa 49,90 EUR. Le valute senza decimali, come JPY, usano l'unità intera, e le valute a tre decimali richiedono attenzione: Stripe documenta che l'importo va espresso in unità minime, quindi non si arrotonda a caso. L'`id` è la chiave da salvare nel tuo database insieme a `metadata`, perché `metadata` è l'unico posto in cui puoi scrivere riferimenti tuoi (massimo 50 chiavi, 500 caratteri per valore) e ritrovarli nei webhook.

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u sk_test_51...: \
  -d amount=4990 -d currency=eur \
  -d "automatic_payment_methods[enabled]=true" \
  -d "metadata[ordine]=A-1042"
```

Nota il `:` finale dopo la chiave: la secret è l'username HTTP, la password è vuota. Il client ufficiale (`stripe` per Node, `stripe` per Python, `com.stripe:stripe-java` per JVM) incapsula lo stesso schema e gestisce retry e form encoding.

## Il ciclo di vita di un pagamento

Il flusso consigliato è *Payment Intents con Payment Element*: il backend crea il PaymentIntent, il frontend raccoglie i dati con il componente di Stripe e conferma, il backend ascolta i webhook. La conferma può richiedere un'azione del cliente, come l'autenticazione 3-D Secure, e in quel caso lo stato diventa `requires_action` prima di tornare a `processing` o `succeeded`.

| Stato | Significato | Cosa deve fare il backend |
| --- | --- | --- |
| `requires_payment_method` | nessun metodo valido associato | mostrare il form, non spedire |
| `requires_confirmation` | metodo presente, conferma non ancora inviata | confermare lato server o client |
| `requires_action` | serve un passaggio del cliente (3DS, redirect) | completare l'azione, non considerare concluso |
| `processing` | fondi in elaborazione asincrona | attendere `payment_intent.succeeded` |
| `succeeded` | incasso riuscito | evadere l'ordine |
| `canceled` | intento annullato | liberare l'inventario |

La regola operativa che evita la maggior parte degli incidenti è: **l'ordine si evade solo dopo un webhook con firma valida**, non dopo il redirect di ritorno. Il redirect può non avvenire (l'utente chiude la scheda), può avvenire due volte, e può essere falsificato. Il webhook ha una firma HMAC calcolata con `whsec_`, un timestamp e il corpo grezzo della richiesta: senza verificarla, chiunque conosca l'URL può dichiarare pagamenti avvenuti.

La conferma sul server richiede la stessa idempotency key della creazione se devi ritentare; in generale ogni `POST` che muove denaro va inviato con `Idempotency-Key`, e Stripe conserva il risultato per 24 ore. Due richieste identiche restituiscono la stessa risposta senza creare due addebiti.

```javascript
const intent = await stripe.paymentIntents.create(
  { amount: 4990, currency: "eur", automatic_payment_methods: { enabled: true },
    metadata: { ordine: "A-1042" } },
  { idempotencyKey: `ordine-A-1042-tentativo-1` }
);
```

## Errori comuni

- **Mettere la secret key nel frontend**: la publishable serve solo a inizializzare gli elementi; qualunque operazione autorizzativa deve passare dal backend.
- **Evadere l'ordine al ritorno dell'URL**: il redirect non è prova di pagamento, e un utente può aprire quell'URL a mano.
- **Verificare la firma sul JSON parsato**: la firma copre i byte grezzi del corpo, quindi il middleware deve conservare il raw body prima del parsing.
- **Usare importi float**: `49.9` diventa `49.9 * 100` con errori di arrotondamento; lavora sempre con interi in centesimi.
- **Riutilizzare la stessa idempotency key per ordini diversi**: la seconda chiamata riceve la risposta della prima, cioè un pagamento che non c'entra.
- **Mescolare chiavi test e live**: un evento di test su un endpoint live viene rifiutato o, peggio, trattato come reale se il controllo sull'ambiente manca.

## In sintesi

Stripe è un'API di risorse con oggetti durevoli, non un checkout one-shot. Le chiavi determinano il perimetro dei permessi e la coppia test/live separa dati e denaro. Il `PaymentIntent` traccia un'intenzione che attraversa più stati, e l'unico segnale affidabile di incasso è un webhook firmato. Importi interi, `metadata` come legame con il tuo dominio e idempotency key sui `POST` sono le tre abitudini che rendono l'integrazione ripetibile.

## Fonti

- [Stripe API Reference](https://docs.stripe.com/api)
- [Stripe - API keys](https://docs.stripe.com/keys)
- [Stripe - The Payment Intents lifecycle](https://docs.stripe.com/payments/paymentintents/lifecycle)
- [Stripe - Idempotent requests](https://docs.stripe.com/idempotency)
