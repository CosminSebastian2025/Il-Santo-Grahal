I generics permettono di scrivere funzioni e tipi che funzionano su qualsiasi tipo senza perdere informazione, mentre il narrowing è il meccanismo con cui TypeScript restringe un tipo in base ai controlli che fai nel codice. Insieme sono il cuore del TypeScript "da libreria": senza generics ripeteresti la stessa funzione per ogni tipo, senza narrowing ogni union diventerebbe una serie di cast. In questa lezione impari a scrivere generici leggibili e a fare type guard affidabili.

## Obiettivi

- Definire funzioni e tipi generici con i vincoli (`extends`) giusti.
- Usare i parametri generici di default e prevederne l'inferenza.
- Scrivere type guard con `typeof`, `in`, uguaglianze letterali e predicati `is`.
- Gestire union complesse e casi impossibili con `never` e i controlli esaustivi.
- Evitare generici che non aggiungono informazione rispetto a `any`.

## Funzioni e tipi generici

Un parametro di tipo è una variabile che assume un tipo concreto al momento della chiamata. Il compilatore lo inferisce dagli argomenti, quindi raramente serve scriverlo:

```typescript
function primo<T>(lista: T[]): T | undefined {
  return lista[0];
}

const n = primo([1, 2, 3]);      // number | undefined
const s = primo(["a", "b"]);     // string | undefined
```

Il valore aggiunto è la relazione tra input e output: `T` lega i due lati. Una funzione che restituisce `any` perde questa relazione; una che restituisce `unknown` la richiede esplicitamente. La stessa idea si applica ai tipi compositi:

```typescript
type ApiResult<T> =
  | { ok: true; dati: T }
  | { ok: false; errore: string };

function successo<T>(dati: T): ApiResult<T> {
  return { ok: true, dati };
}
```

I vincoli si esprimono con `extends`: `function chiave<T extends object>(v: T)` significa che `T` deve essere un oggetto, e dentro la funzione puoi contare su proprietà e metodi comuni. I parametri di tipo ammettono anche default, utili nelle librerie: `type Cache<K = string, V = unknown>` consente di scrivere `Cache` senza argomenti e `Cache<string, number>` quando serve precisione.

| Uso | Esempio | Quando serve |
| --- | --- | --- |
| Relazione input/output | `function primo<T>(l: T[]): T` | collezioni e trasformazioni |
| Tipo composito | `ApiResult<T>` | stati di rete con payload |
| Vincolo | `<T extends { id: string }>` | accesso sicuro a un campo |
| Default | `<T = string>` | API ergonomiche |

## Narrowing: restringere un tipo con i controlli

Quando una variabile ha una union, TypeScript analizza i controlli e ne restringe il tipo nei rami:

```typescript
type Risposta = string | number | null;

function stampa(r: Risposta): string {
  if (typeof r === "string") return r.toUpperCase();
  if (typeof r === "number") return r.toFixed(2);
  return "vuoto";                 // qui r è null
}
```

I controlli riconosciuti sono `typeof`, `instanceof`, il controllo di verità, l'operatore `in`, le uguaglianze con letterali e le assert di assegnazione. Il `switch` su proprietà discriminate è il caso più leggibile per i modelli a "tag":

```typescript
type Evento =
  | { tipo: "click"; x: number; y: number }
  | { tipo: "key"; tasto: string };

function gestisci(e: Evento): string {
  switch (e.tipo) {
    case "click":
      return `${e.x},${e.y}`;
    case "key":
      return e.tasto.toUpperCase();
  }
}
```

Il narrowing è flow-sensitive: vale dentro il ramo, e non "torna indietro" se il valore può cambiare dopo un `await` o una chiamata a funzione che modifica la variabile.

## Type guard personalizzati

Quando il controllo di forma è più ricco del `typeof`, si scrive un predicato di tipo, una funzione il cui ritorno è `arg is Tipo`:

```typescript
type Utente = { nome: string; email: string };

function isUtente(v: unknown): v is Utente {
  return (
    typeof v === "object" && v !== null &&
    "nome" in v && typeof (v as Utente).nome === "string" &&
    "email" in v && typeof (v as Utente).email === "string"
  );
}

function saluta(v: unknown): string {
  return isUtente(v) ? `Ciao ${v.nome}` : "Dato non valido";
}
```

Il predicato è una **promessa** al compilatore: se il controllo è sbagliato, nessun errore comparirà, e il bug emergerà a runtime. Per questo i type guard vanno testati come qualsiasi logica di validazione, e vanno scritti in modo che accettino solo ciò che dichiarano.

Per i controlli esaustivi si usa `never`: nell'ultimo ramo di uno `switch` su una union discriminata, `const esaustivo: never = e` fallisce se aggiungi una variante senza gestirla.

## Errori comuni

- **Usare `as` invece di un type guard**: il cast non verifica nulla e sposta il bug a runtime.
- **Predicati troppo permissivi**: `v is Utente` che accettano `null` o campi parziali fidandosi del chiamante.
- **Generici inutilizzati**: `function log<T>(x: T)` che non usa `T` nell'output equivale a `unknown`.
- **Fidarsi del narrowing attraverso funzioni**: modifiche fatte dentro una callback non vengono tracciate dal compilatore.
- **Vincoli troppo stretti**: `T extends object` su valori che devono essere anche primitivi genera errori difficili da spiegare.

## In sintesi

I generics esprimono relazioni tra tipi e si devono inferire dagli argomenti, con vincoli e default solo quando servono. Il narrowing trasforma i controlli runtime in informazione statica, purché siano controlli riconosciuti e affidabili. I predicati `is` sono potenti e delicati: vanno testati come la validazione dei dati. Union discriminate e `never` rendono impossibile dimenticare un caso.

## Fonti

- [TypeScript Handbook - Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook - Keyof Types](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [MDN - JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
