Un file JSON può essere sintatticamente valido e comunque sbagliato per la tua applicazione: campi mancanti, tipi incoerenti, valori fuori intervallo, proprietà non previste. JSON Schema è lo standard per descrivere queste regole in un documento JSON, e un validatore come Ajv le applica a runtime. In questa lezione impari a scrivere uno schema utile, a validare i dati e a integrare la validazione nel ciclo di sviluppo e test.

## Obiettivi

- Distinguere validazione sintattica e validazione semantica di un documento JSON.
- Scrivere uno schema con `type`, `properties`, `required`, `items` e i vincoli comuni.
- Usare la parola chiave `$schema` e i booleani `additionalProperties` e `unevaluatedProperties`.
- Validare con Ajv da CLI e da codice, leggendo correttamente gli errori.
- Comporre schemi con `$ref` e integrare la validazione nei test.

## Perché servono gli schemi

`JSON.parse` garantisce solo che il testo sia JSON: restituisce `unknown` e lascia al programma la scoperta della forma. Uno schema aggiunge un contratto dichiarativo, verificabile con qualsiasi linguaggio, utilizzabile anche per generare documentazione, tipi TypeScript e form di input. La stessa definizione diventa la fonte di verità per consumatori diversi.

## Struttura di uno schema

Uno schema è un oggetto JSON con parole chiave. `$schema` dichiara la dialettica (draft) usata; `type` fissa il tipo; `properties` e `required` descrivono gli oggetti; `items` gli array.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]{3,32}$" },
    "nome": { "type": "string", "minLength": 1, "maxLength": 80 },
    "email": { "type": "string", "format": "email" },
    "ruolo": { "enum": ["admin", "editor", "lettore"] },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "maxItems": 10
    },
    "creatoIl": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "nome", "email"],
  "additionalProperties": false
}
```

Le parole chiave principali si raggruppano così:

| Gruppo | Parole chiave | Uso |
| --- | --- | --- |
| Tipo | `type`, `enum`, `const` | forma del valore |
| Numeri | `minimum`, `maximum`, `multipleOf` | intervalli |
| Stringhe | `minLength`, `maxLength`, `pattern`, `format` | lunghezza e forma |
| Oggetti | `properties`, `required`, `additionalProperties` | campi e chiusura |
| Array | `items`, `minItems`, `maxItems`, `uniqueItems` | elementi |
| Composizione | `anyOf`, `oneOf`, `allOf`, `$ref` | schemi riusabili |

Attenzione a `format`: in draft 2020-12 è annotativo per default, quindi bisogna abilitare la validazione dei formati nel validatore per farla rispettare.

## Validare in pratica con Ajv

Ajv è il validatore JavaScript più diffuso. Da CLI si può validare un file contro uno schema senza scrivere codice:

```bash
npx ajv-cli validate -s schema.json -d dati.json --strict=true
```

Da codice si compila lo schema una volta e si valida molte volte, leggendo errori strutturati:

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const valida = ajv.compile(schema);
const ok = valida(dati);

if (!ok) {
  for (const e of valida.errors ?? []) {
    console.log(`${e.instancePath || "/"} ${e.message}`);
  }
}
```

`allErrors` raccoglie tutti i problemi invece del primo, mentre `strict` rifiuta parole chiave sconosciute o mal scritte: un `requierd` tipografico diventa un errore invece di essere ignorato. Gli errori con `instancePath` indicano dove intervenire; per i documenti annidati conviene aggiungere i propri messaggi.

## Composizione e chiusura degli oggetti

`$ref` riusa definizioni comuni, e `$defs` è il contenitore consigliato dalle versioni recenti dello standard. Senza `additionalProperties: false` o `unevaluatedProperties: false` un oggetto accetta qualsiasi proprietà extra: comodo in fase di evoluzione, pericoloso quando si vuole scoprire un campo scritto male. Le combinazioni `oneOf`/`anyOf` richiedono invece schemi discriminati, perché il messaggio di errore tende a essere poco leggibile.

Vale la pena anche distinguere gli schemi per gli input da quelli per gli output. Uno schema di input deve rifiutare i campi che il client non può impostare (un `ruolo` o un `id` assegnati dal server), mentre lo schema del documento salvato li include tutti. Mantenere due schemi collegati con `$ref` evita sia le voragini di sicurezza sia i campi mancanti quando il dato viene riletto. Analogamente, la validazione della richiesta va fatta prima della logica di business, così gli errori tornano al chiamante con un 400 e una indicazione precisa del campo, invece di un errore interno a metà elaborazione.

```json
{
  "$defs": {
    "identificativo": { "type": "string", "pattern": "^[a-z0-9-]+$" }
  },
  "type": "object",
  "properties": {
    "id": { "$ref": "#/$defs/identificativo" },
    "parentId": { "$ref": "#/$defs/identificativo" }
  }
}
```

Per la verifica, gli schemi vanno trattati come codice: nel repository, con test che coprano un caso valido e uno per ogni regola. Una fixture dichiarata invalida deve fallire, altrimenti la regola non sta proteggendo nulla. Se il progetto è in TypeScript, un generatore da schema ai tipi come `json-schema-to-typescript` permette di non duplicare il contratto tra validazione e compilatore.

## Errori comuni

- **Scrivere `"required": true` nella proprietà**: la parola chiave è a livello di oggetto, con la lista dei nomi.
- **Dimenticare `additionalProperties`**: i campi sconosciuti passano senza segnalazione.
- **Usare un dialetto misto**: `$schema` draft-07 con parole di 2020-12 produce validazioni incoerenti.
- **Fidarsi di `format` senza abilitarlo**: la validazione del formato è opzionale in base al validatore.
- **Schemi senza test**: una regola scritta male non viene scoperta finché non arriva il dato reale.

## In sintesi

La validazione sintattica dice se il testo è JSON; la validazione semantica dice se i dati sono utilizzabili. JSON Schema descrive la seconda con parole chiave dichiarative, riunite in `$defs` e composte con `$ref`. Ajv applica lo schema in modo veloce e restituisce errori con percorso, se configurato in strict e con tutti gli errori. Gli schemi sono codice: versionati, testati e chiusi sugli oggetti esposti.

## Fonti

- [JSON Schema - Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)
- [JSON Schema - Getting Started Step by Step](https://json-schema.org/learn/getting-started-step-by-step)
- [JSON Schema Validation - Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation)
- [Ajv JSON schema validator](https://ajv.js.org/)
