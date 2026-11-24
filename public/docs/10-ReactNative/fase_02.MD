# Fase 2: React base (giorni 15-28)

**Obiettivo:** costruire interfacce che cambiano con i dati, usando componenti funzionali, props, stato, eventi, effetti, liste e form controllati fino al contatore P02 e al form contatto.

| Giorno | Argomento | Esercizio |
| --- | --- | --- |
| 15 | Cos'è React, componente funzionale, JSX con `View` e `Text` | 1 |
| 16 | Props e componenti riutilizzabili (card) | 2 |
| 17 | `useState` e contatore | 3 |
| 18 | Eventi con `onPress` | 4 |
| 19 | `useEffect` e quando viene eseguito | 5 |
| 20 | Liste con `map` e `key` | 6 |
| 21 | Rendering condizionale e toggle | 7 |
| 22 | Stato sollevato e funzioni come props | 8 |
| 23 | `TextInput` controllato | 9 |
| 24 | Custom hook `useCounter` | 10 |
| 25 | P02: incremento, decremento, reset, colori | 11 |
| 26 | P02: cronologia degli ultimi 5 tocchi | 12 |
| 27 | Form contatto con dati mostrati sotto | 13 |
| 28 | Ripasso, validazione e refactor | 14, 15 |

In questa fase si lavora in un unico `App.jsx` con i componenti nello stesso file oppure in `src/components`; la navigazione arriva nella fase 4. Si usa React 19 con componenti funzionali, senza classi. Le stringhe e i valori si scrivono nel codice: nessuna chiave API.

### Cos'è React e il primo componente

React è una funzione che trasforma dati in interfaccia: dai un componente, ricevi elementi. Un componente funzionale è una funzione che restituisce JSX, e il JSX non è HTML: è la descrizione di quali componenti nativi devono esistere.

```jsx
import { Text, View } from "react-native";

export default function Saluto() {
  return (
    <View>
      <Text>Buongiorno</Text>
      <Text>Benvenuto nel corso</Text>
    </View>
  );
}
```

Il nome del componente inizia con la maiuscola, altrimenti React lo scambia per un tag nativo. Il testo sta sempre dentro `Text`: una stringa appesa a `View` produce un errore. `View` è un contenitore invisibile che dispone i figli. Gli stili citati negli esempi (`styles.card`, `styles.numero`) sono definiti una volta con `StyleSheet.create` in fondo al file.

### Props: dati che entrano, interfaccia che esce

Le props sono parametri del componente: chi lo usa passa valori, il componente li disegna. Sono in sola lettura: un componente non modifica ciò che riceve.

```jsx
function Card({ titolo, testo }) {
  return (
    <View style={styles.card}>
      <Text style={styles.titolo}>{titolo}</Text>
      <Text>{testo}</Text>
    </View>
  );
}

<Card titolo="Prima nota" testo="Il testo entra dalle props." />
<Card titolo="Seconda nota" testo="Stesso componente, dati diversi." />
```

Il destructuring `{ titolo, testo }` evita `props.titolo` a ogni riga. Una card che riceve i dati è riusabile dieci volte; una card che contiene testi fissi va riscritta dieci volte.

### useState: la memoria del componente

Lo stato è un valore che sopravvive ai ridisegni. `useState` restituisce il valore attuale e una funzione per sostituirlo; chiamando il setter, React ridisegna il componente.

```jsx
const [valore, setValore] = useState(0);

return (
  <View>
    <Text>{valore}</Text>
    <Pressable onPress={() => setValore((v) => v + 1)}>
      <Text>+1</Text>
    </Pressable>
  </View>
);
```

```text
Prima del tocco: 0
Dopo un tocco: 1
Dopo tre tocchi: 3
```

La forma `setValore((v) => v + 1)` legge il valore precedente invece di quello catturato al momento del disegno: serve quando due tocchi rapidi si sovrappongono, altrimenti si perde un incremento. Lo stato non si modifica mai a mano (`valore = 5` non ridisegna nulla).

### Eventi: onPress e funzioni passate

Sul telefono non c'è `click`: c'è il tocco, gestito da `Pressable` o `Button`. Si passa una funzione, non il risultato di una chiamata.

```jsx
<Pressable onPress={incrementa} accessibilityRole="button">
  <Text>Aumenta</Text>
</Pressable>

<Pressable onPress={() => setValore(0)} accessibilityRole="button">
  <Text>Azzera</Text>
</Pressable>
```

`onPress={incrementa}` passa la funzione e React la chiama al tocco; `onPress={incrementa()}` la chiama subito, al disegno, e passa il risultato. L'arrow `() => setValore(0)` serve quando bisogna passare argomenti. `accessibilityRole` dice allo screen reader che si tratta di un pulsante, e l'area toccabile deve essere grande almeno un dito.

### useEffect: codice che accade dopo

Un effetto è un'operazione che non produce interfaccia: un log, una richiesta, un timer, un permesso. `useEffect` la esegue dopo che il componente è stato disegnato.

```jsx
useEffect(() => {
  console.log("montato");
  return () => console.log("smontato");
}, []);

useEffect(() => {
  console.log("valore cambiato:", valore);
}, [valore]);
```

```text
Avvio: montato
Primo tocco: valore cambiato: 1
Uscita dalla schermata: smontato
```

Le dipendenze decidono quando: array vuoto uguale una sola volta dopo il primo disegno, `[valore]` a ogni cambiamento di `valore`, nessun array a ogni disegno. La funzione restituita è la pulizia, utile per timer e richieste in corso. Sul telefono non esiste `document.title`: il titolo diventa l'intestazione della schermata, che arriva con la navigazione nella fase 4.

### Liste, key e rendering condizionale

Una lista si costruisce con `map`, e ogni elemento ha bisogno di una `key` stabile: React la usa per capire quale riga è cambiata.

```jsx
{prodotti.map((p) => (
  <View key={p.id}>
    <Text>{p.nome}</Text>
  </View>
))}
{prodotti.length === 0 && <Text>Nessun prodotto.</Text>}
{prodotti.length > 0 ? <Text>Totale: {prodotti.length}</Text> : null}
```

La `key` è l'`id`, non l'indice: con l'indice, cancellare la prima riga sposta tutte le chiavi e React riusa lo stato sbagliato. Le tre forme condizionali non sono equivalenti: `if` prima del `return` quando il caso è esclusivo, `&&` per un blocco opzionale, ternario per scegliere tra due elementi.

### Stato sollevato e funzioni come props

Quando due componenti devono condividere un dato, il dato sale al genitore comune e scende come props; le modifiche scendono come funzioni.

```jsx
function Pulsante({ onPremuto, etichetta }) {
  return (
    <Pressable onPress={onPremuto} accessibilityRole="button">
      <Text>{etichetta}</Text>
    </Pressable>
  );
}

export default function App() {
  const [totale, setTotale] = useState(0);
  return (
    <>
      <Text>{totale}</Text>
      <Pulsante etichetta="Aggiungi" onPremuto={() => setTotale((t) => t + 1)} />
    </>
  );
}
```

Il figlio non sa cosa succede al tocco: chiama `onPremuto` e basta. Così lo stesso pulsante funziona in contesti diversi, e lo stato resta in un solo posto, facile da leggere e da correggere.

### TextInput controllato e custom hook

Un campo controllato ha il valore nello stato: l'input mostra lo stato e ogni tasto lo aggiorna. Non ci sono due verità da tenere allineate.

```jsx
const [testo, setTesto] = useState("");

<TextInput
  value={testo}
  onChangeText={setTesto}
  placeholder="Scrivi qui"
  autoCapitalize="none"
/>
<Text>Caratteri: {testo.length}</Text>
```

Un custom hook è una funzione che inizia con `use` e raggruppa stato e operazioni riusabili. Non è una libreria: è codice tuo, spostato in un punto solo.

```jsx
function useCounter(iniziale = 0) {
  const [valore, setValore] = useState(iniziale);
  return {
    valore,
    incrementa: () => setValore((v) => v + 1),
    decrementa: () => setValore((v) => v - 1),
    azzera: () => setValore(iniziale),
  };
}
```

### Come ragionare: dal problema allo schermo

Lo schema resta quello della fase 1, ma ora ogni stato diventa una parte visibile dello schermo. Prima si decide cosa mostra il componente in ogni situazione, poi si scrive il JSX.

#### Esempio guidato 1: P02, contatore con cronologia

**Problema.** Un contatore con tre comandi (più, meno, azzera) che colora il numero secondo il segno e mostra gli ultimi cinque tocchi.

**Dati.** Non arrivano da fuori: sono due valori, il numero e la lista dei tocchi. La lista contiene stringhe `+1` e `-1`, non oggetti, perché non serve altro.

**Stato.** `valore` e `cronologia` vivono nello stesso componente: nessun altro li usa, quindi non vanno sollevati. Il colore non è stato: si calcola da `valore`.

**Schermata, eventi, casi limite.** Tre pulsanti, un numero grande, una riga di cronologia. Casi limite: tocchi rapidi, cronologia oltre cinque elementi, reset che deve svuotare anche la cronologia.

```jsx
export default function App() {
  const [valore, setValore] = useState(0);
  const [cronologia, setCronologia] = useState([]);
  const cambia = (delta) => {
    setValore((v) => v + delta);
    setCronologia((prec) => [String(delta), ...prec].slice(0, 5));
  };

  const azzera = () => {
    setValore(0);
    setCronologia([]);
  };
  const colore = valore > 0 ? "#1b7f3b" : valore < 0 ? "#a1242b" : "#555555";

  return (
    <View style={styles.contenitore}>
      <Text style={[styles.numero, { color: colore }]}>{valore}</Text>
      <Pressable onPress={() => cambia(1)} accessibilityRole="button">
        <Text>+1</Text>
      </Pressable>
      <Pressable onPress={() => cambia(-1)} accessibilityRole="button">
        <Text>-1</Text>
      </Pressable>
      <Pressable onPress={azzera} accessibilityRole="button">
        <Text>Reset</Text>
      </Pressable>
      <Text style={styles.cronologia}>{cronologia.join(" ")}</Text>
    </View>
  );
}
```

```text
Avvio: 0 in grigio, cronologia vuota
Dopo +1 +1 -1: 1 in verde, cronologia "-1 +1 +1"
Dopo altri tre +1: 4, cronologia "+1 +1 +1 -1 +1"
Dopo Reset: 0 in grigio, cronologia vuota
```

Le decisioni: `setValore` e `setCronologia` ricevono una funzione perché due tocchi ravvicinati leggerebbero lo stesso valore precedente e uno andrebbe perso; `slice(0, 5)` tiene la lista corta senza contatori separati; il colore è calcolato a ogni disegno, perché duplicarlo nello stato creerebbe due valori da tenere allineati. La cronologia si azzera nel reset perché è parte della stessa storia: un reset che lascia i tocchi vecchi racconta una cosa falsa.

#### Esempio guidato 2: form contatto con validazione

**Problema.** Un form con nome, email e messaggio; i dati validi compaiono sotto, gli errori accanto ai campi.

**Dati.** Tre stringhe in ingresso e un oggetto `inviato` che vale `null` finché non si invia.

**Stato.** Tre stati per i campi, uno per il risultato. Gli errori non sono stato: si calcolano dai campi a ogni disegno, così non possono restare indietro.

**Schermata, eventi, casi limite.** Tre `TextInput`, un pulsante, l'anteprima sotto. Casi limite: campi vuoti o di soli spazi, email senza `@`, messaggio troppo corto, secondo invio con dati corretti.

```jsx
export default function App() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [inviato, setInviato] = useState(null);

  const errori = [];
  if (nome.trim().length < 2) errori.push("Il nome deve avere almeno 2 caratteri.");
  if (!email.includes("@")) errori.push("L'email deve contenere @.");
  if (messaggio.trim().length < 10) errori.push("Il messaggio deve avere almeno 10 caratteri.");
  const invia = () => {
    if (errori.length > 0) return;
    setInviato({ nome: nome.trim(), email, messaggio: messaggio.trim() });
  };

  return (
    <View style={styles.form}>
      <TextInput value={nome} onChangeText={setNome} placeholder="Nome" />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
      <TextInput value={messaggio} onChangeText={setMessaggio} placeholder="Messaggio" multiline />
      {errori.map((e) => (
        <Text key={e} style={styles.errore}>{e}</Text>
      ))}
      <Pressable onPress={invia} accessibilityRole="button">
        <Text>Invia</Text>
      </Pressable>
      {inviato && <Text>Grazie {inviato.nome}, risponderemo a {inviato.email}.</Text>}
    </View>
  );
}
```

```text
Campi vuoti: tre messaggi di errore, nessuna anteprima
Nome "A", email "anna", messaggio "ciao": restano tre errori
Dati validi: "Grazie Anna, risponderemo a anna@example.com."
```

Le decisioni: gli errori si calcolano nel corpo del componente e non in uno stato, perché uno stato copiato dai campi può restare vecchio; `trim()` viene applicato al momento dell'invio, così gli spazi non contano; `inviato` è `null` oppure un oggetto, quindi `{inviato && ...}` distingue "non ancora inviato" da "inviato"; la `key` degli errori è il testo, perché due errori identici sarebbero comunque uno solo. In un'app vera l'invio chiamerebbe un servizio: qui il ragionamento su stato, validazione e casi limite è già completo.

### Come ragiona un informatico

- **Distingue dati e derivati.** Il colore, gli errori, il totale si calcolano; solo ciò che l'utente cambia diventa stato. Ogni stato in più è un valore che può disallinearsi.
- **Tiene lo stato il più in basso possibile.** Sale solo quando due componenti devono vederlo: stato ovunque significa props ovunque.
- **Tratta i tre casi di un dato.** Assente, in caricamento, presente: il JSX deve saper disegnare tutti e tre, non solo l'ultimo.
- **Scrive prima i casi limite.** Campo vuoto, lista vuota, doppio tocco: sono la parte che si dimentica e che rompe la demo.
- **Dà nomi al comportamento.** `onAggiungi`, `onAzzera`, `inviato`: chi legge il JSX capisce cosa succede senza aprire il genitore.
- **Estrae un componente quando serve la seconda volta.** Non prima: un'astrazione nata da un solo uso è indovinello, non risparmio.

### Errori comuni

- **Modificare lo stato a mano.** `prodotti.push(x)` cambia l'array ma non il riferimento, quindi React non ridisegna. Correzione: `setProdotti([...prodotti, x])`.
- **Chiamare la funzione nel `onPress`.** `onPress={azzera()}` esegue subito e passa `undefined`. Correzione: `onPress={azzera}` oppure `onPress={() => azzera(id)}`.
- **Usare l'indice come `key`.** Cancellare o riordinare righe mescola stato e input. Correzione: `key={item.id}`, con id generato alla creazione.
- **Leggere stato appena aggiornato.** `setValore(valore + 1); console.log(valore)` stampa il valore vecchio: l'aggiornamento è asincrono. Correzione: calcolare il nuovo valore in una variabile o usare il setter a funzione.
- **Dimenticare le dipendenze di `useEffect`.** L'effetto legge valori vecchi e il timer non si ferma. Correzione: elencare le variabili usate e restituire la pulizia.
- **Definire un componente dentro un altro.** A ogni disegno nasce un tipo nuovo, lo stato interno si perde e l'input perde il fuoco. Correzione: componenti fuori, al livello del modulo.
- **Gestire solo il caso "dati presenti".** Lista vuota e caricamento producono schermate mute. Correzione: prevedere un messaggio per ogni ramo.
- **Dimenticare `value` in `TextInput`.** Il campo sembra funzionare, ma lo stato non è la verità e la validazione legge valori vecchi. Correzione: `value` più `onChangeText`.

### Esercizi progressivi

Gli esercizi sono le tappe del progetto di fase: dall'esercizio 1 al 15 si costruisce lo stesso `App.jsx`, che alla fine contiene il contatore P02 e il form contatto.

1. **Componente Saluto.** Crea `Saluto` con due `Text` dentro una `View` e usalo in `App`. Comportamento atteso: sul telefono compaiono due righe, "Buongiorno" e "Benvenuto nel corso" (base 1).
2. **Card con props.** Estrai una `Card` che riceve `titolo` e `testo` e mostrane due con contenuti diversi. Comportamento atteso: due riquadri distinti, senza duplicare JSX (base 2).
3. **Contatore con useState.** Aggiungi un numero e un pulsante che lo incrementa. Comportamento atteso: parte da `0`, dopo tre tocchi mostra `3` (base 3).

   ```text
   0
   dopo 3 tocchi: 3
   ```

4. **Bottoni con onPress.** Aggiungi i pulsanti meno e azzera accanto a più; verifica che il tocco non esegua nulla all'avvio (base 4).
5. **useEffect per log e titolo.** Registra un log al montaggio e uno a ogni cambio del valore; aggiungi la pulizia. Comportamento atteso nella console: `montato` una volta, poi una riga per ogni tocco (base 5).
6. **Lista statica con key.** Disegna tre prodotti con `map` e `key={id}`; aggiungi un prodotto alla lista e verifica che compaia senza errori di chiave (intermedio 6).
7. **Mostra e nascondi.** Con un pulsante alterna la visibilità della card; usa `&&`. Comportamento atteso: primo tocco nasconde la card, secondo la riporta (intermedio 7).

   ```text
   Avvio: card visibile, pulsante "Nascondi"
   Dopo un tocco: card assente, pulsante "Mostra"
   ```

8. **Stato sollevato.** Metti il contatore in `App` e passa al figlio la funzione di incremento; il figlio contiene solo il pulsante. Comportamento atteso: identico all'esercizio 3, con il numero nel genitore (intermedio 8).
9. **TextInput controllato.** Aggiungi un campo che mostra in tempo reale il numero di caratteri digitati. Output atteso: `Caratteri: 0` a campo vuoto, `Caratteri: 4` dopo "ciao" (intermedio 9).
10. **Custom hook.** Estrai `useCounter` e usalo per due contatori indipendenti nella stessa schermata. Comportamento atteso: toccare il primo non cambia il secondo (intermedio 10).
11. **P02 completo.** Incremento, decremento, reset e colore per segno (verde sopra zero, rosso sotto, grigio a zero) (intermedio 11).
12. **P02 con cronologia.** Aggiungi gli ultimi cinque tocchi, dal più recente, azzerati dal reset (avanzato 12).

    ```text
    Dopo +1 +1 -1: 1, cronologia "-1 +1 +1"
    Dopo altri tre +1: 4, cronologia "+1 +1 +1 -1 +1"
    Dopo Reset: 0, cronologia vuota
    ```

13. **Form contatto.** Tre campi controllati e un pulsante che mostra sotto i dati inseriti. Output atteso con nome "Anna", email "anna@example.com" e un messaggio valido: `Grazie Anna, risponderemo a anna@example.com.` (avanzato 13).
14. **Validazione del form.** Blocca l'invio e mostra un messaggio per ogni campo non valido; nascondi l'anteprima finché non è valido (avanzato 14).

    ```text
    Campi vuoti: tre messaggi, nessuna anteprima
    Solo il messaggio corretto: resta "Il nome deve avere almeno 2 caratteri."
    ```

15. **Refactor e README.** Sposta i componenti in `src/components`, gli stili in fondo al file, aggiungi un README con avvio, schermate ed esercizi fatti. Comportamento atteso: `npx expo start` funziona, il README spiega in due minuti come provare P02 e il form (avanzato 15).

### Varianti

- Nel contatore aggiungi il limite minimo a zero e disabilita il pulsante meno con `disabled`.
- Nel form salva i dati in memoria con `AsyncStorage` solo dopo la validazione (fase 5).
- Nella lista dei prodotti aggiungi un campo di ricerca controllato che filtra con `includes`.
- Nel contatore mostra un messaggio diverso quando il valore supera dieci, senza aggiungere stato.
