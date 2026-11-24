Un progetto TypeScript serio si regge su tre pilastri: un `tsconfig.json` con le opzioni giuste, un ciclo di verifica che unisca `tsc` a lint e test, e la disciplina di applicare il "modo strict" fin dall'inizio. Senza questi strumenti il sistema di tipi diventa decorativo, e gli errori compaiono solo in produzione. Questa lezione di laboratorio mostra come configurare il progetto, leggere gli errori e verificare un piccolo modulo tipizzato end-to-end.

## Obiettivi

- Costruire un `tsconfig.json` minimale e attivare le opzioni strict rilevanti.
- Usare `tsc --noEmit`, `--watch` e `tsc --init` nel ciclo di sviluppo.
- Comprendere il significato di `strictNullChecks`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`.
- Leggere e risolvere gli errori del compilatore senza ricorrere ad `any`.
- Impostare i test di un modulo con tipi verificati e runtime controllato.

## Configurare il compilatore

`tsc --init` crea un file con decine di opzioni commentate. Un punto di partenza leggibile per un progetto Node moderno:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`strict` è un contenitore che attiva una famiglia di controlli: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `useUnknownInCatchVariables` e altri. Sopra `strict` restano utili opzioni aggiuntive, perché non sono incluse nel pacchetto.

| Opzione | Effetto | Costo tipico |
| --- | --- | --- |
| `strictNullChecks` | `null`/`undefined` entrano nelle union | testi aggiuntivi per i campi mancanti |
| `noUncheckedIndexedAccess` | `arr[i]` diventa `T \| undefined` | gestione esplicita degli indici |
| `exactOptionalPropertyTypes` | distingue "assente" da "presente e `undefined`" | tipi più precisi da progettare |
| `noImplicitAny` | vieta `any` impliciti | annotazioni sui parametri |
| `noUnusedLocals` | segnala variabili inutilizzate | pulizia del codice |

Attivare `strict` su un progetto nuovo costa poco; su codice vecchio conviene migrare per moduli, alzando le opzioni man mano che la base torna verde.

## Ciclo di verifica e strumenti

Il compilatore non emette codice quando deve solo controllare: `tsc --noEmit` è il comando da mettere nella pipeline. `tsc --watch` ricompila a ogni salvataggio, e per lo sviluppo si usa di solito un runner come `tsx` che esegue TypeScript dopo un controllo di sintassi, senza il type-check completo. Il type-check resta un passo separato e obbligatorio.

```bash
npx tsc --init                      # crea la configurazione commentata
npx tsc --noEmit                    # controlla senza generare file
npx tsc --noEmit --watch            # controllo continuo
npx tsc --showConfig                # opzioni effettive dopo l'ereditarietà
```

`--showConfig` chiarisce perché un'opzione "non funziona": spesso un `extends` la sovrascrive. I test poi girano sul codice compilato o eseguito, e non sostituiscono il controllo dei tipi.

## Laboratorio: un modulo tipizzato

Costruisci un piccolo modulo `src/rate.ts` che converte valute, con input non fidato e risultato tipizzato, poi verifica il comportamento.

```typescript
export type Esito =
  | { ok: true; valore: number }
  | { ok: false; motivo: string };

export function converti(
  importo: unknown,
  tasso: number | undefined,
): Esito {
  if (typeof importo !== "number" || !Number.isFinite(importo)) {
    return { ok: false, motivo: "importo non numerico" };
  }
  if (tasso === undefined || tasso <= 0) {
    return { ok: false, motivo: "tasso non valido" };
  }
  return { ok: true, valore: Math.round(importo * tasso * 100) / 100 };
}
```

Con `strict` e `noUncheckedIndexedAccess` il compilatore obbliga a gestire ogni percorso, e il ritorno discrimina l'errore. I test verificano comportamento e forma:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { converti } from "../src/rate.js";

test("conversione valida", () => {
  const esito = converti(100, 0.92);
  assert.ok(esito.ok);
  assert.equal(esito.valore, 92);
});

test("rifiuta tassi negativi", () => {
  const esito = converti(100, -1);
  assert.equal(esito.ok, false);
});
```

Esegui `npx tsc --noEmit` e `node --test dist` in sequenza: prima il controllo statico, poi i test. Aggiungere casi limite (stringa numerica, `NaN`, `undefined`) rende il modulo pronto all'uso.

## Errori comuni

- **Attivare `strict` e disattivare i flag che danno fastidio**: `strictNullChecks: false` annulla quasi tutto il vantaggio.
- **Installare `ts-node` o runner simili e scambiarli per il type-check**: l'esecuzione senza errori non dimostra che i tipi siano corretti.
- **Dimenticare `include`/`files`**: `tsc` non controlla file fuori dal progetto e il verde è ingannevole.
- **Usare `skipLibCheck: false` con dipendenze vecchie**: il build fallisce su tipi di terzi, non sul tuo codice.
- **Generare file in `outDir` dentro `node_modules` o `dist` tracciati da git**: `dist` va escluso dal repository.

## Esercizi

1. Aggiungi `exactOptionalPropertyTypes` e crea `Opzioni { debug?: boolean }`; spiega perché `{ debug: undefined }` non è più assegnabile.
2. Estendi `converti` con valute validate da una lista `as const`.
3. Scrivi un tipo `ApiResult<T>` con varianti `ok`/`errore` e una funzione `unwrap` che lancia solo nel caso di errore, mantenendo il ritorno tipizzato `T`.
4. Configura `tsc --build` con due progetti tramite `references`, separando `src` e `test`.
5. Scrivi tre test per `converti` che coprano input non numerico, tasso `undefined` e arrotondamento a due decimali.
6. Aggiungi al CI i comandi `tsc --noEmit` e `node --test` e verifica che un errore di tipo faccia fallire il job prima dei test.

<details><summary>Soluzione</summary>

1. Con `exactOptionalPropertyTypes: true` una proprietà opzionale non accetta `undefined` esplicito. Le opzioni sono dichiarare `debug?: boolean | undefined` oppure non passare la proprietà: la seconda è preferibile, perché "assente" e "presente con undefined" sono distinti.

2. `const VALUTE = ["EUR", "USD", "GBP"] as const; type Valuta = (typeof VALUTE)[number];` poi `VALUTE.includes(valuta as Valuta)` prima del calcolo; l'errore diventa una variante che il chiamante deve gestire.

3. `function unwrap<T>(r: ApiResult<T>): T { if (!r.ok) throw new Error(r.errore); return r.dati; }`: il narrowing su `ok` permette l'accesso sicuro a `dati`.

4. Servono due `tsconfig` con `composite: true` e un file radice che elenca le referenze.

5. I test usano `converti("100", 1)`, `converti(100, undefined)` e `converti(10.005, 1)`, verificando `ok: false`, `ok: false` e `valore: 10.01`.

6. Nel CI `npx tsc --noEmit` precede `npm test`; un errore come `const x: number = "a"` ferma il build prima degli artefatti.
</details>

## In sintesi

`strict` è il default ragionevole per i progetti nuovi, con `noUncheckedIndexedAccess` ed `exactOptionalPropertyTypes` come evoluzione naturale. Il type-check è un passo separato dall'esecuzione: `tsc --noEmit` deve stare in CI e prima dei test. `--showConfig` chiarisce le opzioni effettive quando un `extends` le nasconde. Un modulo tipizzato si testa su comportamento e forma, e i test che compilano solo con il narrowing corretto proteggono entrambi i lati.

## Fonti

- [tsconfig reference](https://www.typescriptlang.org/tsconfig/)
- [TypeScript Handbook - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
