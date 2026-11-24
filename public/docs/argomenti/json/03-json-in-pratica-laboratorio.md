JSON si usa ovunque nei sistemi reali: risposte HTTP, configurazioni, payload di eventi, import ed export. Questo laboratorio mette insieme sintassi e validazione in un piccolo progetto eseguibile: leggere un file, trasformarlo, serializzarlo in modo sicuro, validarlo con uno schema e coprirlo con test. Il risultato è un flusso riutilizzabile per qualsiasi integrazione basata su JSON.

## Obiettivi

- Leggere e scrivere file JSON in Node.js gestendo errori di parsing e di sistema.
- Trasformare i dati con `JSON.parse` e il reviver, senza perdere precisione sugli ID.
- Serializzare in modo stabile con indentazione e revisione, evitando dati non previsti.
- Validare input con uno schema e restituire messaggi di errore utili.
- Scrivere test automatici con fixture valide e invalide.

## Lettura e scrittura dei file

In Node.js `fs/promises` offre la lettura asincrona; un errore di sintassi arriva come `SyntaxError`, un file mancante come codice `ENOENT`. Distinguerli serve per rispondere in modo diverso all'utente e ai log.

```javascript
import { readFile, writeFile } from "node:fs/promises";

function leggiJson(testo) {
  try {
    return JSON.parse(testo);
  } catch (errore) {
    const pos = /position (\d+)/.exec(String(errore.message));
    throw new Error(
      `JSON non valido${pos ? ` vicino al byte ${pos[1]}` : ""}`,
      { cause: errore },
    );
  }
}

const testo = await readFile("dati.json", "utf8");
const dati = leggiJson(testo);
```

La lettura come stringa UTF-8 è importante: senza `"utf8"` ottieni un `Buffer` e il parsing fallisce con un errore poco chiaro. Per documenti molto grandi la scelta migliore è uno streaming parser, perché caricare centinaia di megabyte in memoria non è sostenibile.

## Trasformazione sicura

Il reviver di `JSON.parse` permette di convertire valori durante la lettura, per esempio preservando gli ID numerici grandi come stringhe. In scrittura, il secondo argomento di `JSON.stringify` riduce ciò che finisce nel file, mentre il terzo controlla l'indentazione.

```javascript
function normalizza(chiave, valore) {
  if (chiave === "id" && typeof valore === "number") {
    if (!Number.isSafeInteger(valore)) {
      throw new Error(`id non sicuro: ${valore}`);
    }
    return String(valore);
  }
  return valore;
}

const serializzato = JSON.stringify(dati, ["id", "nome", "email"], 2);
await writeFile("out/dati.json", serializzato + "\n", "utf8");
```

Nel serializzare a mano i valori non serializzabili compaiono come `null` o spariscono, ed è un classico modo per perdere campi in produzione. Se devi salvare date, `undefined` o strutture con cicli, converti prima in oggetti semplici e stringhe ISO.

## Validazione con schema

Lo schema del progetto definisce la forma dei record; la validazione avviene subito dopo il parsing, prima di ogni altra logica.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
      "nome": { "type": "string", "minLength": 1 },
      "email": { "type": "string", "format": "email" }
    },
    "required": ["id", "nome", "email"],
    "additionalProperties": false
  }
}
```

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./schema.json" with { type: "json" };

const ajv = addFormats(new Ajv({ allErrors: true, strict: true }));
const valida = ajv.compile(schema);

export function validaDati(dati) {
  if (valida(dati)) return { ok: true, dati };
  const errori = (valida.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message}`,
  );
  return { ok: false, errori };
}
```

Il flusso completo è: parse, validazione, trasformazione, serializzazione, scrittura atomica su file temporaneo e `rename`. La scrittura atomica evita che un crash lasci un file troncato.

## Test e verifica

I test più utili per un elaboratore JSON sono quelli sulle fixture: un caso valido che deve passare, casi invalidi che devono fallire, e un caso di regressione con un bug reale. Con `node:test` bastano pochi passaggi.

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { validaDati } from "../src/valida.js";

test("accetta un record completo", () => {
  const r = validaDati([{ id: "a-1", nome: "Ada", email: "a@b.it" }]);
  assert.equal(r.ok, true);
});

test("rifiuta campi extra", () => {
  const r = validaDati([{ id: "a-1", nome: "Ada", email: "a@b.it", x: 1 }]);
  assert.equal(r.ok, false);
});
```

Tenere i test vicino agli schemi serve: quando si allenta una regola, un test che diventa rosso segnala che la modifica ha cambiato il contratto.

## Errori comuni

- **Leggere senza `"utf8"`**: il `Buffer` passa al parser e l'errore non indica il problema reale.
- **Ignorare il codice di errore `ENOENT`**: file mancante e JSON invalido richiedono messaggi diversi.
- **Validare dopo aver trasformato**: i dati modificati nascondono gli errori dell'input originale.
- **Usare `stringify` per confrontare oggetti**: l'ordine delle chiavi cambia il risultato, meglio fare assert sui campi.

## Esercizi

1. Scrivi una funzione che legga un file JSON e restituisca un errore distinto per `ENOENT` e `SyntaxError`.
2. Implementa il reviver degli ID grandi e verifica che `9007199254740993` non perda cifre.
3. Serializza un array di record con chiavi filtrate e indentazione a due spazi; verifica il diff di git stabile.
4. Aggiungi allo schema la regola che l'email contenga `@` e che `nome` non superi 80 caratteri.
5. Scrivi cinque test: tre invalidi, uno valido, uno di regressione su una fixture reale.
6. Aggiungi la scrittura atomica con `rename` e un test sull'errore a metà scrittura.

<details><summary>Soluzione</summary>

1. Una funzione con `try/catch` intorno a `readFile`, che ricontrolla `errore.code === "ENOENT"` e restituisce `{ tipo: "mancante" }`, altrimenti delega al parser e restituisce `{ tipo: "sintassi" }` con la posizione.

2. Il reviver `if (chiave === "id" && typeof valore === "number") { if (!Number.isSafeInteger(valore)) throw ...; return String(valore); }` intercetta il problema prima della perdita di precisione.

3. `JSON.stringify(records, ["id", "nome", "email"], 2) + "\n"` produce un output deterministico: stesso input, stesso diff, nessun rumore di ordinamento.

4. Allo schema si aggiungono `"maxLength": 80` su `nome` e `"pattern": "^[^@]+@[^@]+$"` su `email`, oppure si abilita `format: "email"` con `ajv-formats`.

5. I test invalidano un campo mancante, un tipo errato e un campo extra; il valido copre un record completo; il test di regressione riproduce un payload reale che in passato aveva causato un bug.

6. Si scrive su `dati.json.tmp`, si esegue `rename` verso il file finale, e il test usa una fixture che simula il fallimento prima del rename verificando che il file originale resti intatto.
</details>

## In sintesi

Il flusso affidabile è parse con gestione degli errori, validazione prima delle trasformazioni, serializzazione con chiavi esplicite e scrittura atomica. Il reviver protegge dai problemi di precisione dei numeri grandi. Gli schemi e le fixture vanno versionati insieme al codice e coperti da test. Ogni passaggio ha un errore tipico che i test catturano solo se scritti apposta.

## Fonti

- [RFC 8259 - JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)
- [MDN - JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [JSON Schema - Getting Started Step by Step](https://json-schema.org/learn/getting-started-step-by-step)
- [Ajv JSON schema validator](https://ajv.js.org/)
