Un contratto raccontato a voce si dimentica, uno scritto in un documento condiviso invecchia. Un'API progettata con OpenAPI ha invece una descrizione macchina-leggibile che può essere validata, generata e testata. In questo laboratorio scrivi una specifica minima, la controlli con un validatore, verifichi le risposte con `curl` e infine provi a romperla per scoprire quali controlli mancano. Ti servono solo un editor, `node` e `curl`; non è necessario eseguire un server reale per la maggior parte degli esercizi.

## Obiettivi

- Scrivere una specifica OpenAPI 3.1 con schemi, parametri e risposte di errore.
- Validare la specifica con un linter invece che a occhio.
- Verificare una risposta reale contro lo schema dichiarato.
- Aggiungere validazione di input coerente con il contratto.
- Riconoscere le cattive configurazioni che OWASP segnala nelle API.

## La struttura di una specifica

Una specifica OpenAPI 3.1 è un documento JSON o YAML con pochi elementi portanti: `openapi` (versione), `info` (metadati), `servers`, `paths` e `components` per gli schemi riutilizzabili. In 3.1 gli schemi sono allineati al vocabolario JSON Schema, quindi `type`, `required` e `enum` hanno la stessa semantica di JSON Schema.

```yaml
openapi: 3.1.0
info:
  title: Ordini
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /orders/{orderId}:
    get:
      summary: Legge un ordine
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            pattern: "^ord_[A-Za-z0-9]+$"
      responses:
        "200":
          description: Ordine trovato
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "404":
          description: Ordine inesistente
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
components:
  schemas:
    Order:
      type: object
      required: [id, status, total]
      properties:
        id:
          type: string
        status:
          type: string
          enum: [pending, paid, shipped]
        total:
          type: integer
          minimum: 0
    Problem:
      type: object
      required: [type, title, status]
      properties:
        type: { type: string, format: uri-reference }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
```

Le scelte che fanno la differenza sono tre: dichiarare le risposte di errore, non solo il `200`; usare `application/problem+json` per gli errori, coerente con RFC 9457; mettere in `components` tutto ciò che ricorre, così la specifica resta leggibile e i generatori producono modelli riutilizzabili.

```bash
npx --yes @redocly/cli@latest lint openapi.yaml
```

Il linter segnala riferimenti mancanti, parametri duplicati, risposte senza `description` e uso di costrutti ambigui. Queste segnalazioni vanno lette e corrette, non silenziate con le regole di default ancora attive.

## Validare input e output

La validazione è la parte in cui la specifica smette di essere documentazione e diventa codice in esecuzione. Un approccio pragmatico: il server valida il corpo e i parametri contro lo schema *prima* della logica di dominio, e i test validano la risposta *dopo*, contro lo stesso schema.

```javascript
// Serve solo a capire il concetto: la validazione deve usare lo schema dichiarato.
import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validate = ajv.compile({
  type: "object",
  required: ["currency", "items"],
  properties: {
    currency: { type: "string", pattern: "^[A-Z]{3}$" },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["sku", "quantity"],
        properties: {
          sku: { type: "string", minLength: 1 },
          quantity: { type: "integer", minimum: 1 }
        }
      }
    }
  },
  additionalProperties: false
});

const ok = validate({ currency: "EUR", items: [{ sku: "GRL-01", quantity: 2 }] });
console.log(ok, validate.errors);
```

`additionalProperties: false` è una scelta di prodotto: rifiuti campi sconosciuti invece di ignorarli. Per le richieste è spesso la scelta giusta, perché impedisce errori di battitura silenziosi (`currnecy`); nelle risposte è meglio lasciare spazio a campi nuovi senza rompere i client.

Dopo la validazione strutturale serve quella semantica: `quantity > 0` è giusto, ma superare le scorte è un `409`, non un `422`. Evita così di usare la validazione come logica di business.

## Verificare con curl

Una specifica senza verifica resta un'ipotesi. Con `curl -i` controlli status e header, con `-sS` aspetti il silenzio in caso di successo e l'errore in caso di problemi di rete.

```bash
curl -sS -i -X POST https://httpbin.org/post \
  -H "Content-Type: application/json" \
  -d '{"currency": "EUR", "items": [{"sku": "GRL-01", "quantity": 2}]}'
```

```bash
curl -sS https://httpbin.org/status/404 -o /dev/null -w "%{http_code}\n"
```

`httpbin.org` è un servizio di test pubblico: restituisce in JSON l'eco della richiesta e ha endpoint per status arbitrari. È perfetto per verificare l'handling degli errori lato client quando il tuo server non è ancora pronto, ma non va usato per test di carico o in pipeline di produzione, perché dipende da un servizio di terzi.

## Errori comuni

- **Documentare solo il percorso felice**: nessuno sa cosa restituisce l'API in errore, e i client improvvisano.
- **Disallineare specifica e server**: se la specifica non viene validata in CI, le due versioni divergono in settimane.
- **Usare `additionalProperties: false` anche in risposta**: appena aggiungi un campo, i client vecchi rifiutano una risposta valida.
- **Correre senza `--fail`**: anche con `-w "%{http_code}"`, uno script non si accorge di ricevere un `500` se non ne tratta il codice.

## Esercizi

### 1. Aggiungi la creazione di un ordine

Estendi la specifica con `POST /orders` che accetta un corpo validato e restituisce `201` con header `Location`. Quali campi della risposta ometterai?

<details><summary>Soluzione</summary>

```yaml
  /orders:
    post:
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [currency, items]
              additionalProperties: false
              properties:
                currency:
                  type: string
                  pattern: "^[A-Z]{3}$"
                items:
                  type: array
                  minItems: 1
                  items:
                    type: object
                    required: [sku, quantity]
                    properties:
                      sku: { type: string }
                      quantity: { type: integer, minimum: 1 }
      responses:
        "201":
          description: Ordine creato
          headers:
            Location:
              required: true
              schema: { type: string, format: uri-reference }
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "422":
          description: Dati invalidi
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
```

Ometterai `id`, `status` e `placedAt` dal corpo di richiesta: sono valori che decide il server. Il client non può inventare l'identificativo né dichiarare di aver già pagato.

</details>

### 2. Valida la specifica

Salva il file come `openapi.yaml` e lancialo. Quali segnalazioni ricevi e come le correggi?

<details><summary>Soluzione</summary>

```bash
npx --yes @redocly/cli@latest lint openapi.yaml
```

Le segnalazioni tipiche sono l'assenza di `info.description`, risposte senza `content` dichiarato, `operationId` mancanti (che rendono difficoltosa la generazione di client) e campi `required` sugli header. Correggi aggiungendo le descrizioni, gli `operationId` e le risposte di errore; solo dopo valuta se disabilitare una regola specifica, una alla volta e con un commento.

</details>

### 3. Verifica un errore con curl

Simula un `401` e un `429` con `httpbin` e leggi gli header. Quale header userebbe il tuo client per ritentare?

<details><summary>Soluzione</summary>

```bash
curl -sS -i https://httpbin.org/status/401
curl -sS -i https://httpbin.org/status/429
```

Per ritentare serve `Retry-After`, che nella pratica il tuo server deve inviare nel caso `429`. `httpbin` restituisce lo status ma non un corpo Problem Details: è il segnale che, per i test di contratto, serve un server locale che produca i tuoi errori, non un echo generico.

</details>

### 4. Aggiungi la paginazione

Definisci `GET /orders` con parametri `limit` e `cursor` e una risposta a oggetto con `data` e `nextCursor`.

<details><summary>Soluzione</summary>

```yaml
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
        - name: cursor
          in: query
          schema: { type: string, maxLength: 256 }
      responses:
        "200":
          description: Elenco ordini
          content:
            application/json:
              schema:
                type: object
                required: [data, hasMore]
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Order"
                  nextCursor:
                    type: [string, "null"]
                  hasMore:
                    type: boolean
```

Il `maximum` sul limite è una difesa contro il consumo di risorse (API4): senza di esso un client può chiedere un milione di record.

</details>

### 5. Trova il disallineamento

Un collega ha modificato il server per restituire `total` come stringa `"1299"`. Con quale strumento lo scopri prima della produzione?

<details><summary>Soluzione</summary>

Con un test di contratto che valida la risposta reale contro lo schema:

```javascript
const res = await fetch("https://api.example.com/v1/orders/ord_01J8ZK3Q2M");
const body = await res.json();
console.log(validateOrder(body), validateOrder.errors);
```

Lo schema dichiara `total: { type: integer }`, quindi `"1299"` produce un errore sulla parola chiave `type`, con il percorso `total` in `validateOrder.errors`. Va notato anche che JavaScript usa `Number` per entrambi: è il validatore, non il linguaggio, a distinguerli. Il test va eseguito in CI contro un ambiente di staging: è il punto in cui la specifica diventa un collaudo automatico.

</details>

### 6. Controlla un endpoint potenzialmente vulnerabile

Perché `GET /orders/{orderId}` deve restituire `404` e non `403` quando l'ordine esiste ma è di un altro utente?

<details><summary>Soluzione</summary>

Restituire `403` conferma l'esistenza della risorsa e permette di enumerare gli identificativi validi: è il Broken Object Level Authorization (API1) visto dal punto di vista della risposta. `404` uniforma il caso "assente" a quello "non tuo" e non rivela nulla. La verifica di autorizzazione va comunque fatta prima della query, non solo mascherata nell'output.

</details>

## Errori comuni

- **Specifica separata dal test**: se nessun test legge `openapi.yaml`, la specifica mente dopo il primo sprint.
- **Generare client e ignorare gli errori**: un client generato che non gestisce `422` o `429` è incompleto quanto uno scritto a mano.
- **Correre `httpbin` in produzione**: è un servizio esterno, senza garanzie di disponibilità né controllo sui tuoi schemi.
- **Silenziare il linter di default**: disattiva regole puntuali con motivazione, non l'intero set.

## In sintesi

- OpenAPI 3.1 descrive path, schemi ed errori con la semantica di JSON Schema.
- Il linter trasforma la specifica in un controllo automatico e ripetibile.
- Valida in input con `additionalProperties: false` e lascia spazio in output.
- `curl -i` verifica header e status; i test di contratto verificano la forma.

## Fonti

- OpenAPI Specification 3.1 (corrente): https://spec.openapis.org/oas/latest.html
- RFC 9457 — Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
