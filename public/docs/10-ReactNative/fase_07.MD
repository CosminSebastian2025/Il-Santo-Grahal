# Fase 7: TypeScript, test e performance (giorni 85-98)

**Obiettivo:** dare forma e nome ai dati dell'app, difenderli con test che girano in pochi secondi e ottimizzare solo ciò che una misura dimostra lento.

### Percorso dei giorni

| Giorni | Argomento | Esercizio |
| --- | --- | --- |
| 85 | Tipi di base: primitivi, array, oggetti, unioni | 1, 2 |
| 86 | Props e stato tipizzati, errori frequenti | 3, 4 |
| 87 | Tipi per i dati che arrivano dalle API | 5 |
| 88 | Struttura di cartelle che regge la crescita | 7, 8 |
| 89 | Logica separata dalla UI: servizi e hook | 7 |
| 90 | P10: inizio conversione del progetto | 6 |
| 91 | P10: fine conversione, zero `any` | 8 |
| 92 | Jest con funzioni pure | 9 |
| 93 | Test di rendering dei componenti | 10 |
| 94 | Mock di API e storage, loading ed errore | 11, 12 |
| 95 | FlatList: chiavi, layout, `renderItem` stabile | 13 |
| 96 | `memo`, `useMemo`, `useCallback` con misura | 14 |
| 97 | Debugging con log mirati e React DevTools | 14 |
| 98 | Ripasso e P11: test su un progetto esistente | 15 |

### TypeScript: descrivere i dati prima di usarli

TypeScript è JavaScript con annotazioni: il controllo avviene prima dell'esecuzione, nell'editor e con `npx tsc --noEmit`. I tipi spariscono dal codice compilato, quindi non proteggono dai dati sbagliati in arrivo dalla rete: quelli si controllano a runtime.

```ts
type Categoria = "casa" | "lavoro" | "sport";

interface Nota {
  id: string;
  titolo: string;
  categoria: Categoria;
  archiviata: boolean;
  tag: string[];
}
```

`interface` descrive la forma di un oggetto, `type` serve anche per unioni e alias. Il tipo letterale intercetta l'errore di battitura prima dell'avvio, `tag: string[]` impedisce di assegnare un testo dove serve una lista.

```text
nota.categoria = "famiglia"
Errore TS2322: Type '"famiglia"' is not assignable to type 'Categoria'.
```

### Props e stato tipizzati

Le props sono il contratto di un componente: se è scritto, chi lo usa non può sbagliare per distrazione. Il tipo dello stato deve prevedere anche il vuoto, perché all'inizio non c'è nulla da mostrare.

```tsx
interface RigaNotaProps {
  nota: Nota;
  onApri: (id: string) => void;
  evidenziata?: boolean;
}

export function RigaNota({ nota, onApri, evidenziata = false }: RigaNotaProps) {
  return (
    <Pressable onPress={() => onApri(nota.id)} accessibilityRole="button">
      <Text style={evidenziata ? styles.evidenziata : styles.titolo}>{nota.titolo}</Text>
    </Pressable>
  );
}
```

Il punto interrogativo rende la prop facoltativa, il valore di riserva evita `undefined` nei rami successivi. Nello stato, `useState<Nota[]>([])` dice che la lista contiene note e `useState<string | null>(null)` obbliga a controllare prima di leggere. Senza parametro l'inferenza produce `never[]` e `setNote([nota])` non compila: `Errore TS2345, 'Nota' is not assignable to parameter of type 'never'`.

### Tipizzare i dati delle API, senza `any`

La risposta di un server è il punto in cui il tipo è più utile e meno affidabile: descrive ciò che ti aspetti, non ciò che ricevi. La strategia è una: interfaccia per il dato grezzo, funzione di conversione verso il modello interno, valori di riserva per i campi opzionali.

```ts
interface UtenteApi {
  id: number;
  name: string;
  address?: { city?: string };
}

interface Utente {
  id: string;
  nome: string;
  citta: string;
}

function normalizza(grezzo: UtenteApi): Utente {
  return {
    id: String(grezzo.id),
    nome: grezzo.name,
    citta: grezzo.address?.city ?? "Non indicata",
  };
}
```

`any` spegne il controllo e riporta i bug a runtime, dove costano di più. `unknown` è l'alternativa onesta: obbliga a verificare la forma prima di leggere un campo. Normalizzare in un punto solo evita che i nomi inglesi del server si sparpaglino nei componenti.

```text
Utente con address → { id: "1", nome: "Leanne Graham", citta: "Gwenborough" }
Utente senza address → { id: "1", nome: "Leanne Graham", citta: "Non indicata" }
```

### Struttura di cartelle e separazione tra logica e UI

La cartella non è estetica: dice dove cercare e impedisce le dipendenze sbagliate.

```text
src/
  components/   RigaNota.tsx, Bottone.tsx, StatoVuoto.tsx
  screens/      NoteScreen.tsx, DettaglioNotaScreen.tsx
  hooks/        useNote.ts
  services/     noteService.ts
  utils/        filtraNote.ts, date.ts
  types/        note.ts
```

Le regole sono tre: le schermate orchestrano e non chiamano `fetch`, i componenti ricevono dati e callback senza conoscere lo storage, i servizi parlano con l'esterno. Gli hook tengono insieme stato ed effetti, gli `utils` contengono funzioni pure, con stesso ingresso e stesso risultato, facili da testare senza simulatore.

```ts
// src/utils/filtraNote.ts
export const filtraNote = (note: Nota[], testo: string): Nota[] => {
  const cerca = testo.trim().toLowerCase();
  if (cerca === "") {
    return note;
  }
  return note.filter((n) => n.titolo.toLowerCase().includes(cerca));
};
```

### Il progetto P10: convertire senza fermarsi

La conversione si fa a piccoli passi, e dopo ogni passo l'app deve continuare a funzionare. Ordine consigliato: tipi condivisi, servizi, hook, componenti foglia, schermate.

1. Rinomina i file in `.ts` e `.tsx`, uno alla volta, avviando l'app dopo ciascuno.
2. Attiva `"strict": true` quando i file principali sono convertiti: prima si vedrebbero centinaia di errori indistinguibili.
3. Scrivi i modelli in `src/types` e importali: un modello, una definizione.
4. Sostituisci ogni `any` con un tipo vero, con `unknown` più controllo, o con un generico.
5. Conta il debito con `grep -rn ": any" src`: il numero deve scendere ogni giorno.

```text
Giorno 90: file convertiti 4 su 18 · "any" presenti 9 · lista note funzionante
Giorno 91: file convertiti 18 su 18 · "any" presenti 0 · tsc senza errori
```

Convertito non significa compilabile: significa che i tipi raccontano il dominio. Se `Nota` ha `categoria: string` e nel codice confronti `"casa"` con `"Casa"`, il tipo non ti ha aiutato.

### Test: funzioni pure, rendering, mock

Prima l'installazione, senza inventare versioni: Expo installa quelle compatibili con il progetto. In `package.json` si aggiungono lo script `"test": "jest"` e il blocco `"jest": { "preset": "jest-expo" }`. Il primo test riguarda una funzione pura.

```bash
npx expo install jest-expo jest @types/jest --dev
npm i -D @testing-library/react-native
```

```ts
// src/utils/filtraNote.test.ts
const note = [
  creaNota({ id: "1", titolo: "Spesa settimanale" }),
  creaNota({ id: "2", titolo: "Riunione" }),
];

describe("filtraNote", () => {
  it("ignora maiuscole e spazi ai bordi", () => {
    expect(filtraNote(note, "  SPE ")).toHaveLength(1);
  });

  it("restituisce tutte le note con testo vuoto", () => {
    expect(filtraNote(note, "   ")).toHaveLength(2);
  });
});
```

`describe` raggruppa, `it` descrive un comportamento, `expect` confronta: un test utile si legge come una frase e non dipende da rete, ora o ordine. Il test di rendering verifica ciò che l'utente vede e tocca: `getByText` fallisce subito se il testo non c'è, `findByText` aspetta la comparsa nei percorsi asincroni, `jest.mock` sostituisce il servizio.

```tsx
jest.mock("../services/noteService");

it("chiama onApri con l'identificativo della nota", () => {
  const onApri = jest.fn();
  render(<RigaNota nota={creaNota({ id: "n1" })} onApri={onApri} />);
  fireEvent.press(screen.getByText("Comprare pane"));
  expect(onApri).toHaveBeenCalledWith("n1");
});

it("mostra l'errore quando il servizio fallisce", async () => {
  (caricaNote as jest.Mock).mockRejectedValueOnce(new Error("rete"));
  render(<NoteScreen />);
  expect(await screen.findByText("Impossibile leggere le note.")).toBeTruthy();
});
```

### Performance: liste, memoizzazione, debugging

Una `FlatList` è veloce se riceve tre informazioni corrette: `keyExtractor` con identificativo stabile, `renderItem` definito una volta sola, `getItemLayout` quando l'altezza è fissa.

```tsx
const renderRiga = useCallback(
  ({ item }: { item: Nota }) => <RigaNota nota={item} onApri={apri} />,
  [apri]
);

<FlatList
  data={visibili}
  keyExtractor={(item) => item.id}
  renderItem={renderRiga}
  getItemLayout={(_, index) => ({
    length: ALTEZZA_RIGA,
    offset: ALTEZZA_RIGA * index,
    index,
  })}
/>
```

`getItemLayout` è una promessa: con righe di altezza diversa lo scroll salta, quindi va usato solo con un'altezza fissa dichiarata in una costante. `memo`, `useMemo` e `useCallback` interrompono render inutili, non accelerano un calcolo lento: prima si misura con il Profiler di React DevTools e con `console.time`, poi si corregge la causa, che spesso è una chiave instabile o un oggetto ricreato a ogni render.

Per il debugging: log con etichetta e valore ("caricaNote: 3 elementi"), rimossi prima del commit; scheda Components di React DevTools per vedere props e stato reali; menu di sviluppo di Expo per rete e ricaricamento. Si legge l'errore dal basso, si isola il caso più piccolo che lo riproduce, si corregge una cosa per volta. Se dopo una modifica i numeri non cambiano, la modifica va tolta: codice in più senza guadagno è manutenzione futura.

```text
Prima:  filtro digitato → 200 render di RigaNota, 480 ms
Dopo:   filtro digitato → 12 render di RigaNota, 40 ms
```

### Come ragionare: dal problema allo schermo

**Esempio guidato 1 — Convertire la schermata Note e coprirla con i test**

**Problema.** Una schermata in JavaScript mostra caricamento, errore e lista, ma nessuno sa quali campi arrivino dal server. Un refactor ha già rotto due volte il filtro, scoperto dall'utente.

**Dati.** La nota interna ha `id`, `titolo`, `testo`, `categoria`, `tag`. Il server risponde con `id` numerico, `title`, `body`: due forme, un solo modello.

**Stato.** `note`, `caricamento`, `errore`, `testo`. La lista filtrata non è stato: si calcola con `filtraNote(note, testo)`.

**Schermate ed eventi.** Elenco con ricerca e dettaglio in sola lettura; digitare, toccare una riga, premere "Riprova".

**Casi limite.** Titolo vuoto dal server, lista vuota, rete assente, testo cercato senza risultati.

```ts
export function daApi(grezzo: NotaApi): Nota {
  const titolo = grezzo.title.trim();
  return {
    id: String(grezzo.id),
    titolo: titolo === "" ? "Senza titolo" : titolo,
    testo: grezzo.body,
    categoria: "casa",
    archiviata: false,
    tag: [],
  };
}
```

```text
Avvio senza rete:
  1. ActivityIndicator per circa un secondo
  2. "Impossibile leggere le note salvate." e pulsante Riprova
  3. tocco su Riprova: spinner, poi 2 note
Ricerca "  SPE ": 1 riga visibile; ricerca "zzz": "Nessun risultato per questa ricerca."
```

Le decisioni: `NotaApi` descrive il server, `Nota` descrive l'app, la conversione avviene in un punto solo. Il titolo vuoto si corregge all'ingresso, non nella riga della lista, così ogni schermata riceve dati già validi. Il filtro resta una funzione pura esterna al componente: si testa senza simulatore e si riusa nei preferiti. "Nessun risultato" è distinto da "lista vuota": l'utente deve capire se ha sbagliato la ricerca o se non ha ancora scritto nulla.

**Esempio guidato 2 — Una lista da 2000 elementi che scorre a scatti**

**Problema.** La schermata dei movimenti contiene 2000 righe: lo scroll è a scatti e ogni tasto nel filtro blocca l'interfaccia per mezzo secondo.

**Dati.** `Movimento` con `id`, `descrizione`, `importo` in centesimi, `data`, `categoria`. Altezza riga fissa: 64.

**Stato.** `movimenti`, `filtro`, `caricamento`. Nessuno stato nuovo: il problema non è che manchino dati, è il costo di disegnarli.

**Schermate ed eventi.** Una sola, con filtro per categoria, apertura del dettaglio, eliminazione di un movimento.

**Casi limite.** Lista vuota, descrizione lunghissima, filtro con zero risultati, eliminazione durante lo scroll.

```tsx
const visibili = useMemo(
  () => movimenti.filter((m) => filtro === "tutte" || m.categoria === filtro),
  [movimenti, filtro]
);

<FlatList
  data={visibili}
  keyExtractor={(m) => m.id}
  renderItem={renderRiga}
  getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
/>
```

```text
Prima:  filtro digitato → 200 render di RigaMovimento, 480 ms, scroll a scatti
Dopo:   filtro digitato → 12 render di RigaMovimento, 40 ms, scroll fluido
(misure rilevate sul dispositivo di prova)
```

Le decisioni, nell'ordine: prima la chiave, perché `keyExtractor` con l'indice, dopo un'eliminazione, mostra il testo sbagliato nella riga sbagliata; poi `getItemLayout`, che elimina il calcolo delle altezze; poi `memo` sulla riga; solo alla fine `useMemo` sul filtro. Ogni passo è stato misurato da solo, altrimenti non si saprebbe quale ha funzionato. Il filtro resta in `visibili` e non dentro `renderItem`, così la lista conosce il proprio conteggio e può mostrare lo stato vuoto.

### Come ragiona un informatico

- **Tipizza ai confini, lascia inferire all'interno.** I tipi scritti a mano servono dove i dati entrano (rete, storage, navigazione) e dove escono (props pubbliche); dentro, il compilatore deduce e il codice resta leggibile.
- **Tratta il tipo come un test gratuito.** Se il compilatore accetta un valore, quel percorso non produce errori di forma; se lo rifiuta, hai evitato un crash sul telefono.
- **Testa comportamenti, non righe.** "Premendo Elimina la riga sparisce" sopravvive a un refactor; "la variabile interna vale 3" no.
- **Rende il test ripetibile.** Niente rete, niente ora corrente, niente dipendenza dall'ordine: dati fissi e servizi sostituiti.
- **Misura prima di ottimizzare.** "Sembra lento" non dice dove intervenire; il Profiler sì.
- **Toglie ciò che non serve.** Un `useCallback` senza misura, un log di debug, un test duplicato: tutto diventa costo di manutenzione.

### Errori comuni

- **`any` per far tacere il compilatore.** Causa: la fretta di vedere zero errori. Correzione: `unknown` più controllo o il tipo corretto; `any` solo come segnaposto con un commento.
- **`useState([])` senza tipo.** Causa: l'inferenza produce `never[]`. Correzione: `useState<Nota[]>([])` al momento della creazione.
- **Usare l'interfaccia dell'API come modello interno.** Causa: sembra più rapido. Correzione: normalizzare in una funzione e tenere i nomi del server fuori dai componenti.
- **Test che dipendono da rete o ora.** Causa: si testa il caso reale invece del comportamento. Correzione: `jest.mock` sui servizi e date fisse come argomento.
- **`keyExtractor` con l'indice.** Causa: funziona finché la lista non cambia. Correzione: usare l'`id`, generato alla creazione del dato.
- **`getItemLayout` con altezze variabili.** Causa: sembra un'ottimizzazione gratuita. Correzione: usarlo solo con altezza fissa, altrimenti toglierlo.
- **`memo` e `useCallback` ovunque.** Causa: "così è più veloce". Correzione: misurare prima e dopo, tenere solo le modifiche che spostano i numeri.
- **Log di debug lasciati nel codice.** Causa: servono ancora "per sicurezza" e finiscono nei log di produzione. Correzione: etichette durante il lavoro, rimozione prima del commit.

### Esercizi progressivi

1. **Tipi di base.** Crea `src/types/note.ts` con `Categoria`, `Nota` e la funzione pura `riepilogo(note: Nota[]): string` che conta le note per categoria (base 1).
   Output atteso:
   ```text
   riepilogo([])                              → "0 note"
   riepilogo([notaCasa, notaCasa, notaSport]) → "3 note · casa 2 · sport 1"
   ```
2. **Interfaccia per un modello.** Descrivi `Movimento` con `id: string`, `importo: number` in centesimi, `data: string`, categoria a scelta chiusa e `nota?` facoltativa (base 2). Criterio: una stringa nell'importo non compila.
   Output atteso:
   ```text
   const m: Movimento = { id: "m1", importo: "12,50" }
   Errore TS2322: Type 'string' is not assignable to type 'number'.
   ```
3. **Props tipizzate.** Converti `CardNota` con `nota` e `onApri` obbligatorie, `evidenziata` facoltativa con valore di riserva `false` (base 3). Criterio: senza `onApri` il compilatore segnala `Property 'onApri' is missing in type`, nessun `any`, props destrutturate.
4. **Stato tipizzato.** Nella schermata Note dichiara `note`, `testo`, `errore`, dove l'errore può essere `null` (base 4). Criterio: `tsc --noEmit` pulito, nessun `errore.length` senza controllo e `setNote([nota])` compila solo con `useState<Nota[]>([])`.
5. **Dati API tipizzati.** Chiama `https://jsonplaceholder.typicode.com/users`, definisci `UtenteApi` e `normalizza` verso `Utente { id, nome, email, citta }` (base 5). Criterio: nessun `any`, città di riserva quando `address` manca.
   Output atteso:
   ```text
   grezzo:  { id: 1, name: "Leanne Graham", address: { city: "Gwenborough" } }
   interno: { id: "1", nome: "Leanne Graham", citta: "Gwenborough" }
   ```
6. **P10: conversione dei componenti.** Converti almeno tre componenti foglia in `.tsx` con props tipizzate, uno alla volta, avviando l'app dopo ognuno (intermedio 6). Criterio: comportamento identico, nessuna schermata bianca, `npx tsc --noEmit` senza output.
7. **P10: servizi e hook tipizzati.** Tipizza il servizio (`leggiNote(): Promise<Nota[]>`, `salvaNota(n: Nota): Promise<void>`) e l'hook che lo usa (intermedio 7). Criterio: la schermata non importa più il servizio e con storage vuoto mostra `Nessuna nota salvata.`
8. **Rimozione degli `any`.** Elimina tutti gli `any` sostituendoli con tipi veri o `unknown` più controllo, ed estrai in `utils` le funzioni di formattazione (intermedio 8). Criterio: `grep -rn ": any" src` senza corrispondenze, test ancora verdi.
9. **Primo test con Jest.** Configura Jest, poi testa `filtraNote` e `riepilogo` con almeno quattro casi, inclusi testo vuoto e nessun risultato (intermedio 9). Criterio: `npm test` verde, nessuna dipendenza dalla rete.
   Output atteso:
   ```text
   PASS src/utils/filtraNote.test.ts
   Tests: 4 passed, 4 total
   ```
10. **Test di rendering.** Testa `CardNota`: mostra il titolo e chiama `onApri` con l'`id` giusto (intermedio 10). Criterio: nessun test basato su classi di stile.
    Comportamento atteso: toccando "Comprare pane" la funzione finta riceve `"n1"`.
11. **Test di interazione.** Monta la schermata Note, digita nella ricerca e verifica quante righe restano (intermedio 11). Criterio: `fireEvent.changeText`, dati fissi.
    Output atteso:
    ```text
    changeText("spe") → 1 riga visibile
    changeText("zzz") → 0 righe, "Nessun risultato per questa ricerca."
    ```
12. **Mock di `fetch`.** Sostituisci `global.fetch` con una funzione finta che prima risolve e poi rifiuta; verifica i due percorsi della schermata (avanzato 12). Criterio: nessuna chiamata reale durante i test.
    Output atteso:
    ```text
    Prima: "Caricamento..."
    Dopo: "Impossibile caricare i movimenti. Riprova."
    ```
13. **Ottimizzazione FlatList.** Porta la lista a 2000 elementi con altezza fissa, `keyExtractor` su `id` e `getItemLayout` (avanzato 13). Criterio: con `keyExtractor` sull'indice, dopo un'eliminazione, la riga 3 mostra il testo della 4; con l'`id` la riga eliminata sparisce e le altre restano coerenti.
14. **Memoizzazione misurata.** Conta i render di `RigaMovimento` prima e dopo `memo`, `useCallback` e `useMemo`, annotando i numeri (avanzato 14). Criterio: ogni modifica ha una misura prima e una dopo; le modifiche inutili vengono rimosse.
    Output atteso:
    ```text
    Senza memo: 200 render per un cambio di filtro
    Con memo + useCallback: 12 render
    ```
15. **P11: test su un progetto esistente.** Aggiungi almeno cinque test a un progetto delle fasi precedenti e annota ogni errore trovato con causa e correzione (avanzato 15). Criterio: per ogni schermata toccata, un caso felice, un caso limite e un errore.
    Output atteso:
    ```text
    Tests: 7 passed, 7 total
    Errori annotati: 5
    ```

### Varianti

- Aggiungi una validazione a runtime con `isNota(valore: unknown): valore is Nota` all'ingresso dei dati: il tipo diventa una garanzia, non una speranza.
- Introduci un test di snapshot su `RigaNota`, sapendo che va aggiornato a ogni modifica voluta: utile come rete di sicurezza, inutile se è l'unico test.
- Sostituisci le chiamate dirette con una libreria di data fetching e confronta i render prima e dopo: cambia il numero di richieste, non solo il codice.
- Misura il tempo di avvio con gli strumenti di Expo e confronta sviluppo e build di produzione: in sviluppo il codice non è ottimizzato e i numeri sono peggiori.
