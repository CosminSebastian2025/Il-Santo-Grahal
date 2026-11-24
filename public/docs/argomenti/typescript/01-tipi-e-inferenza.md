TypeScript aggiunge un sistema di tipi statici sopra JavaScript: il codice continua a girare sul motore JS, ma prima dell'esecuzione un compilatore controlla che i valori abbiano le forme previste. La parte più importante non è scrivere annotazioni ovunque, quanto capire come TypeScript deduce i tipi partendo dal codice che scrivi. In questa lezione impari i tipi primitivi, le union e le intersection, e soprattutto come l'inferenza decide al posto tuo.

## Obiettivi

- Distinguere i tipi primitivi da `any`, `unknown`, `never` e dalle forme letterali.
- Combinare tipi con union (`|`) e intersection (`&`) e sapere quando usarle.
- Leggere le inferenze del compilatore per capire perché un errore "non ha senso".
- Tipizzare oggetti e array in modo strutturale, senza classi né interfacce obbligatorie.
- Usare le annotazioni solo dove l'inferenza non basta.

## Tipi primitivi e forme letterali

I tipi primitivi sono `string`, `number`, `boolean`, `bigint`, `symbol`, oltre a `null` e `undefined`:

```typescript
let nome: string = "Ada";
let versione: number = 5;
let attivo: boolean = true;
let vuoto: null = null;
```

TypeScript ha anche i tipi **letterali**: `"ok"` è un tipo che ammette solo quella stringa esatta. Sono la base delle union e dei discriminanti:

```typescript
type Stato = "idle" | "loading" | "error";
let stato: Stato = "idle";
stato = "done"; // errore: "done" non è assegnabile a Stato
```

Non confonderli con le versioni "wrapper" come `String`, `Number` o `Boolean`: esistono, ma sono oggetti e non servono quasi mai come annotazioni. Usa sempre le forme minuscole.

## Union, intersection e tipi speciali

Una **union** dice "uno di questi tipi". Un'**intersection** dice "tutti questi tipi insieme", cioè un valore che soddisfa le proprietà di entrambe le forme:

```typescript
type ConId = { id: string };
type ConTimestamp = { creatoIl: Date };
type Record = ConId & ConTimestamp;

const r: Record = { id: "a1", creatoIl: new Date() };
```

Le intersection si usano soprattutto con i tipi strutturali: poiché TypeScript confronta le **forme** e non i nomi, due tipi con campi compatibili sono interscambiabili. Una union di forme, invece, richiede narrow prima di accedere ai campi non comuni.

Tre tipi meritano attenzione:

| Tipo | Significato | Uso tipico |
| --- | --- | --- |
| `any` | disattiva il controllo | codice legacy, da evitare |
| `unknown` | valore di tipo ignoto, richiede narrow | input esterni (JSON, `catch`) |
| `never` | nessun valore possibile | casi esauriti, funzioni che lanciano |

`unknown` è la scelta giusta per i dati che arrivano dall'esterno: al contrario di `any`, obbliga a verificarne la forma prima dell'uso.

## Inferenza: come il compilatore propone i tipi

L'inferenza è l'abilità del compilatore di dedurre il tipo da un'inizializzazione. Se scrivi `const n = 42`, `n` ha tipo `42` (letterale); con `let n = 42` diventa `number` perché il valore può cambiare. Questo dettaglio spiega molti errori apparentemente strani.

```typescript
const linguaggi = ["ts", "js"];      // string[]
const config = { strict: true };      // { strict: boolean }
const risposta = "ok" as const;       // "ok"

function somma(a: number, b: number) {
  return a + b;                       // inferito: number
}
```

L'intelligenza dell'inferenza si estende agli oggetti: un array di oggetti con campi diversi produce un tipo che è la forma comune dedotta dai letterali. Se vuoi fissare una forma precisa, annota la variabile, perché le annotazioni "contano" di più del valore iniziale.

```typescript
type Utente = { nome: string; ruolo: "admin" | "user" };
const utenti: Utente[] = [{ nome: "Lea", ruolo: "admin" }];
```

## Tipi strutturali e annotazioni utili

TypeScript è strutturale: un oggetto che ha le proprietà richieste è assegnabile, anche se non è "quel tipo". Per descrivere dati esterni conviene comunque dichiarare i tipi vicino al punto in cui vengono validati, e usare le annotazioni sulle funzioni pubbliche per non esporre inferenze accidentali.

```typescript
function formatta(prezzo: number, valuta: string): string {
  return `${prezzo.toFixed(2)} ${valuta}`;
}
```

Le annotazioni costano codice, quindi usale dove fanno contratti: funzioni esportate, oggetti passati tra moduli, tipi di ritorno nei servizi. All'interno di una funzione l'inferenza lavora bene, e forzarla è rumore.

## Errori comuni

- **Dichiarare `any` per far tacere il compilatore**: il tipaggio scompare su tutto ciò che tocca quel valore.
- **Credere che `let x = "a"` sia di tipo `"a"`**: con `let` il tipo letterale viene allargato a `string`.
- **Confondere union e intersection**: `{ a: string } | { b: string }` non permette `x.a` senza narrow.
- **Annotare `String`/`Number` invece di `string`/`number`**: i wrapper sono oggetti e si comportano diversamente.
- **Usare `undefined` in union senza `strictNullChecks`**: senza il flag l'errore non compare e scoppia a runtime.

## In sintesi

Il sistema di tipi di TypeScript è strutturale: descrive forme e le combina con union e intersection. L'inferenza fa quasi tutto il lavoro, ma dipende da `const`/`let` e dalle annotazioni, che hanno priorità. `unknown` è il tipo corretto per i dati provenienti dall'esterno, `any` è la scorciatoia da evitare. Le annotazioni migliori sono poche e posizionate sui contratti pubblici.

## Fonti

- [TypeScript Handbook - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [tsconfig reference](https://www.typescriptlang.org/tsconfig/)
