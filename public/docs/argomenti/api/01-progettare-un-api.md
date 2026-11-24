Un'API è un contratto: descrive cosa un client può chiedere, cosa riceverà e quali regole valgono in caso di rifiuto. Progettarla significa decidere prima delle risorse, dei nomi, degli stati e degli errori, così chi consuma il servizio non deve leggere il codice del server. Questa lezione parte dal modello delle risorse e arriva a un contratto HTTP coerente, con esempi JSON e regole di validazione.

## Obiettivi

- Modellare il dominio come risorse e collezioni invece che come funzioni remote.
- Scegliere metodi HTTP, percorsi e codici di stato in modo coerente.
- Definire una rappresentazione JSON stabile: identificatori, date, enumerazioni, paginazione.
- Separare gli errori applicativi dai codici di trasporto.
- Riconoscere le insidie che rendono un'API difficile da usare o da evolvere.

## Dalle risorse ai percorsi

Una risorsa è un'entità che ha senso nominare al singolare: un ordine, un utente, un prodotto. Le collezioni sono i loro contenitori al plurale. Il percorso identifica la risorsa; il metodo HTTP dice cosa vuoi farle. È il principio REST: non `/getOrder?id=42` ma `GET /orders/42`, perché il verbo è già nel metodo.

| Operazione | Metodo e percorso | Esito tipico |
| --- | --- | --- |
| Elenco | `GET /orders` | `200` con array paginato |
| Lettura | `GET /orders/42` | `200` o `404` |
| Creazione | `POST /orders` | `201` con `Location` |
| Sostituzione | `PUT /orders/42` | `200` o `204` |
| Modifica parziale | `PATCH /orders/42` | `200` con risorsa aggiornata |
| Cancellazione | `DELETE /orders/42` | `204` o `404` |

Le relazioni si esprimono annidando solo quando il figlio non ha vita propria: `/orders/42/items` ha senso perché una riga d'ordine esiste solo dentro l'ordine. Gli identificatori pubblici non devono essere gli ID autoincrementali del database, per non rivelare volumi e permettere enumerazioni: usa UUID o ULID.

Differenza pratica tra `PUT` e `PATCH`: `PUT` sostituisce l'intera rappresentazione, quindi ogni campo assente viene azzerato; `PATCH` invia solo le modifiche. Se non gestisci `PATCH` con un formato dichiarato come JSON Merge Patch, è più onesto esporre solo `PUT`.

## Il contratto della rappresentazione

La forma del JSON è parte del contratto tanto quanto il percorso.

```json
{
  "id": "ord_01J8ZK3Q2M",
  "status": "paid",
  "currency": "EUR",
  "total": { "amount": 1299, "currency": "EUR" },
  "placedAt": "2026-11-07T09:30:00Z",
  "items": [
    { "sku": "GRL-01", "quantity": 2, "unitPrice": { "amount": 649, "currency": "EUR" } }
  ]
}
```

Regole ricorrenti:

- **date in ISO 8601 con fuso UTC** (`...Z`), mai timestamp numerici ambigui;
- **importi come interi** nella valuta minima (centesimi) più il codice valuta, per evitare errori di arrotondamento in virgola mobile;
- **enumerazioni esplicite** per gli stati (`pending`, `paid`, `shipped`) e non booleani che nascondono più di due casi;
- **campi sempre presenti**: se un valore manca, usa `null` invece di omettere la chiave, così i client hanno una forma prevedibile;
- **`snake_case` o `camelCase`** in modo uniforme, senza mescolanze.

Per le collezioni, la paginazione è una decisione di contratto: offset e limite sono semplici ma instabili quando i dati cambiano; la paginazione a cursore (`?cursor=...&limit=50`) è più robusta su grandi volumi. Rispondi con un oggetto che contiene dati e cursore successivo, non con un array nudo, così aggiungi metadati senza rompere i client.

```json
{
  "data": [ { "id": "ord_01J8ZK3Q2M" } ],
  "nextCursor": "eyJpZCI6Im9yZF8wMUo4WksifQ",
  "hasMore": true
}
```

## Metodi, stati e idempotenza

Il codice di stato è il primo livello di informazione che un client può usare senza leggere il corpo: `2xx` successo, `3xx` inoltro, `4xx` errore del client, `5xx` errore del server.

L'idempotenza è spesso trascurata: chiamare più volte la stessa richiesta deve produrre lo stesso stato finale. `GET`, `PUT` e `DELETE` sono idempotenti; `POST` no. Per evitare doppi ordini quando la rete ritenta, accetta un header `Idempotency-Key` e restituisci alle chiamate successive il risultato associato alla chiave.

```http
POST /orders HTTP/1.1
Authorization: Bearer <token>
Idempotency-Key: 6f1d4c2a-1b7e-4c8f-9a2d-2f6b9c1e3d70
Content-Type: application/json

{ "currency": "EUR", "items": [ { "sku": "GRL-01", "quantity": 1 } ] }
```

```http
HTTP/1.1 201 Created
Location: /orders/ord_01J8ZK3Q2M
Content-Type: application/json
```

Il `Location` nell'esito `201` è una convenzione utile: il client sa dove trovare la risorsa appena creata senza indovinare l'URL.

## Errori come parte del contratto

Un formato coerente, ispirato a Problem Details (RFC 9457), rende l'errore leggibile sia da un umano sia da un programma:

```json
{
  "type": "https://api.example.com/problems/validation",
  "title": "Dati non validi",
  "status": 422,
  "detail": "Il campo quantity deve essere maggiore di zero.",
  "instance": "/orders/ord_01J8ZK3Q2M",
  "errors": [ { "field": "items[0].quantity", "code": "min", "message": "Deve essere >= 1" } ]
}
```

Punti fermi: il codice HTTP racconta la categoria (`400` sintassi, `401` non autenticato, `403` non autorizzato, `404` assente, `409` conflitto di stato, `422` dati semanticamente invalidi, `429` limite superato), il corpo fornisce il dettaglio. `type` è un URI stabile che identifica la classe di errore: i client possono ramificare su quello invece di leggere il testo.

Non esporre stack trace, nomi di tabelle o query SQL: un errore è una comunicazione pubblica. Registra il dettaglio nei log con un identificatore di correlazione e restituiscilo nel corpo, così chi segnala un problema può citarlo e tu ritrovi la traccia.

## Errori comuni

- **Progettare endpoint come funzioni RPC** (`/doCheckout`, `/addToCart`) e poi chiamarli "REST": l'incoerenza si paga al primo client generalizzato.
- **Restituire `200 OK` con un flag di errore nel corpo**: i proxy, le metriche e le librerie HTTP trattano la chiamata come riuscita.
- **Esporre gli ID interni del database**: consente enumerazioni, rivela volumi e rende impossibili migrazioni di schema trasparenti.
- **Mescolare unità di misura e formati**: importi in float, date locali senza fuso, stati `"1"/"2"` non documentati.

## In sintesi

- Modella risorse e collezioni, lascia che il metodo HTTP esprima l'azione.
- Tratta la forma del JSON come parte del contratto: identificatori opachi, date UTC, importi interi, stati enumerati.
- Usa codici di stato corretti e un formato di errore uniforme basato su Problem Details.
- L'idempotenza e `Idempotency-Key` evitano effetti doppi quando i client ritentano.

## Fonti

- OpenAPI Specification (versione corrente): https://spec.openapis.org/oas/latest.html
- RFC 9457 — Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
- RFC 9110 — HTTP Semantics (metodi, stati, idempotenza): https://www.rfc-editor.org/rfc/rfc9110.html
- OWASP API Security Top 10: https://owasp.org/API-Security/
