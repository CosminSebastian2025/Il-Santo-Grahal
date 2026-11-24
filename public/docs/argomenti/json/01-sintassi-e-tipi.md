JSON (JavaScript Object Notation) è un formato testuale per scambiare dati strutturati, definito dalla RFC 8259 come sottoinsieme della sintassi degli oggetti JavaScript. È il formato standard di API, file di configurazione e log, ma la sua semplicità nasconde regole precise: virgolette obbligatorie, nessuna virgola finale, pochi tipi e nessun commento. In questa lezione impari la grammatica esatta e come il testo diventa un valore nel programma.

## Obiettivi

- Riconoscere e scrivere i sei tipi di valore JSON senza errori di sintassi.
- Distinguere JSON valido da JavaScript valido e sapere perché la differenza conta.
- Gestire correttamente l'escaping delle stringhe e i caratteri Unicode.
- Capire rapporti e limiti: numeri in virgola mobile, `null`, assenza di `undefined` e date.
- Usare `JSON.parse` e `JSON.stringify` con le opzioni di revisione e formattazione.

## La grammatica in breve

Un documento JSON è un singolo valore: un oggetto, un array, una stringa, un numero, `true`, `false` o `null`. Un oggetto è una sequenza di coppie separate da virgole, con chiavi sempre tra doppie virgolette; un array è una sequenza di valori.

```json
{
  "titolo": "Guida JSON",
  "versione": 2,
  "pubblicato": true,
  "autori": ["Ada", "Linus"],
  "meta": { "licenza": "CC-BY", "note": null }
}
```

I commenti non esistono: `//` e `/* */` rendono il documento invalido, anche se molti strumenti accettano varianti "JSONC". Anche gli spazi e i fine riga sono liberi, ma non possono comparire dentro le chiavi non quotate, che comunque non sono ammesse.

| Tipo | Esempio | Note |
| --- | --- | --- |
| oggetto | `{ "a": 1 }` | chiavi sempre stringhe |
| array | `[1, "due", null]` | valori di tipo qualsiasi |
| stringa | `"ciao"` | solo doppie virgolette |
| numero | `1.5e3`, `-0.25` | niente `NaN` né `Infinity` |
| booleano | `true` | minuscolo obbligatorio |
| null | `null` | senza `undefined` |

## JSON e JavaScript: le differenze

JSON è un sottoinsieme, quindi non tutto ciò che è JavaScript è JSON. Le differenze più frequenti in pratica:

- Le chiavi devono essere tra doppie virgolette: `{ a: 1 }` è JavaScript, non JSON.
- Non ci sono virgole finali: `[1, 2,]` è invalido.
- Le stringhe possono usare solo doppie virgolette: `'ciao'` non è JSON.
- Non esistono funzioni, commenti, `undefined`, `NaN` e `Infinity`.
- Non esistono riferimenti o cicli: ogni valore è copiato nel testo.

Queste restrizioni rendono il formato facile da parsare in modo deterministico e sicuro in qualsiasi linguaggio, ma richiedono di normalizzare i dati prima della serializzazione.

## Stringhe, escaping e Unicode

Dentro una stringa JSON servono escape per il doppio apice, il backslash e i caratteri di controllo (sotto U+0020). Le forme `\uXXXX` codificano un code unit UTF-16; per i caratteri fuori dal piano base servono due escape in coppia surrogata, ma è perfettamente valido anche inserirli in UTF-8 diretto.

```json
{
  "percorso": "C:\\cartelle\\dati",
  "citazione": "disse \"ok\"",
  "aCapo": "riga1\nriga2",
  "emoji": "\ud83d\ude80",
  "accento": "città"
}
```

L'escape `\/` è permesso ma inutile; `\x41`, `\'` e `\a` non esistono in JSON e rendono il documento invalido. La regola pratica: se una stringa viene generata con `JSON.stringify` non ci sono problemi, mentre la scrittura manuale è la fonte tipica di errori di escape.

## Numeri, null e date

I numeri JSON seguono la forma decimale senza zeri iniziali: `01` è invalido, `1.` e `.5` pure. Non c'è distinzione tra interi e decimali, e molti linguaggi li convertono in `double`: identificativi numerici molto lunghi perdono precisione già intorno a 2^53. Per questo gli ID grandi si serializzano come stringhe.

`null` è un valore esplicito; l'assenza del campo è una cosa diversa. Le date non hanno un tipo: la convenzione di interoperabilità è la stringa ISO 8601 in UTC, per esempio `"2026-11-07T10:00:00Z"`, e la conversione resta a carico dell'applicazione.

Nel codice le due operazioni si usano con giudizio:

```javascript
const testo = JSON.stringify({ id: "7", attivo: true }, null, 2);
const valore = JSON.parse(testo, (chiave, v) =>
  chiave === "attivo" ? Boolean(v) : v,
);
```

Il secondo argomento di `JSON.parse` è il reviver, utile per trasformare valori durante la lettura; il terzo di `stringify` è l'indentazione. `stringify` ignora le proprietà con valore `undefined`, le funzioni e i simboli negli oggetti, e trasforma in `null` quei valori dentro gli array.

## Errori comuni

- **Aggiungere commenti o virgole finali**: il parser lancia `SyntaxError` e il file intero è invalido.
- **Scrivere chiavi senza virgolette**: funziona in JavaScript, ma non è JSON.
- **Usare `Infinity`, `NaN` o `undefined`**: invalidi nel testo; `stringify` li trasforma silenziosamente in `null` o li omette.
- **Gestire numeri oltre 2^53 come interi**: gli ID grandi perdono cifre, meglio stringhe.
- **Assumere l'ordine delle chiavi**: è preservato dai parser comuni ma non è significativo per il formato.

## In sintesi

JSON ammette un solo valore alla radice e sei tipi: oggetto, array, stringa, numero, booleano e `null`. Chiavi quotate, nessun commento, nessuna virgola finale, solo doppie virgolette. L'escaping è obbligatorio per apici, backslash e caratteri di controllo. `JSON.parse` e `JSON.stringify` sono sicuri se usati sui dati interni, ma non validano nulla: quella è la responsabilità del livello successivo.

## Fonti

- [RFC 8259 - The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)
- [MDN - JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [MDN - JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
