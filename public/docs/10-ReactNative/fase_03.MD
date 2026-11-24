# Fase 3: React Native base (giorni 29-42)

**Obiettivo:** trasformare dati e stato in schermate da telefono, imparando i cinque componenti di base, il layout flexbox e le liste, fino alla lista della spesa che ricorda i prodotti.

| Giorno | Argomento | Esercizio |
| --- | --- | --- |
| 29 | View e Text, contenitori annidati | 1 |
| 30 | StyleSheet.create, colori e spazi | 2 |
| 31 | Flexbox: riga, colonna, allineamento | 3 |
| 32 | Pressable e feedback al tocco | 4 |
| 33 | TextInput, placeholder, multiline | 5 |
| 34 | Image locale e remota | 6 |
| 35 | ScrollView e quando non basta | 7 |
| 36 | FlatList con data e keyExtractor | 8 |
| 37 | Liste raggruppate con intestazioni | 9 |
| 38 | Tastiera e KeyboardAvoidingView | 10 |
| 39 | SafeAreaView e Platform | 11 |
| 40 | P03: input e lista | 12 |
| 41 | P03: completare e rimuovere | 13 |
| 42 | P03: AsyncStorage e rifinitura | 14, 15 |

### View e Text: i due mattoni

`View` è il contenitore invisibile: raggruppa e dispone, non mostra testo. `Text` è l'unico componente che sa mostrare caratteri. Dove si usa: in ogni schermata, perché non esiste HTML e non esiste `div`.

```jsx
import { Text, View } from "react-native";

export default function Biglietto() {
  return (
    <View style={styles.scheda}>
      <Text style={styles.nome}>Anna Bianchi</Text>
      <Text style={styles.ruolo}>Sviluppatrice mobile</Text>
    </View>
  );
}
```

Un `View` dentro l'altro diventa un gruppo che si sposta come un blocco solo: si legge dall'alto come una scatola dentro l'altra. Regola dura: una stringa fuori da `Text` produce un errore rosso, non un testo invisibile. Un `Text` dentro un altro `Text` eredita lo stile e resta sulla stessa riga, utile per mescolare grassetto e normale.

### StyleSheet.create: lo stile è un oggetto

Nel web gli stili sono testo CSS; qui sono oggetti JavaScript. `StyleSheet.create` li valida una volta sola e restituisce riferimenti stabili, da tenere in fondo al file con nomi in italiano.

```jsx
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  scheda: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, margin: 24 },
  nome: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
});
```

I numeri sono dp, unità indipendenti dalla densità: `fontSize: 16` si vede grande uguale su un telefono economico e su uno con schermo densissimo. Le percentuali sono stringhe (`width: "100%"`), i colori esadecimali o `rgba`. `padding` è lo spazio interno, `margin` quello esterno: se lo sfondo colorato deve restare attaccato al contenuto serve `padding`, mentre per distanziare figli uguali si usa `gap`, che evita di mettere `margin` a tutti tranne l'ultimo.

### Flexbox: riga, colonna e allineamento

In React Native ogni `View` è un contenitore flex. La sorpresa per chi arriva dal web: la direzione predefinita è `column`, non `row`.

```jsx
const styles = StyleSheet.create({
  riga: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  colonna: { flex: 1, justifyContent: "center" },
});
```

`flexDirection` sceglie l'asse principale; `justifyContent` distribuisce lungo quell'asse, `alignItems` allinea sull'asse opposto. `flex: 1` significa "prenditi lo spazio che avanza": è così che un blocco riempie lo schermo senza misure fisse. Dove si usa: barra in alto con titolo e icona, card affiancate, contenuto centrato, pulsante spinto in fondo. Il ragionamento è sempre lo stesso: chi contiene chi e quale asse voglio distribuire. Se una riga non si allinea, la domanda giusta è "quale genitore la contiene", non "quale margine aggiungo".

### Pressable: il tocco e il suo feedback

Sul telefono non esiste hover: esiste il dito. `Pressable` è il contenitore toccabile che sa dirti se è premuto.

```jsx
<Pressable
  onPress={aggiungi}
  style={({ pressed }) => [styles.bottone, pressed && styles.premuto]}
  accessibilityRole="button"
>
  <Text style={styles.etichetta}>Aggiungi</Text>
</Pressable>
```

La prop `style` riceve una funzione con `pressed`: è uno stato interno del componente, non tuo. L'array di stili si legge da sinistra a destra e l'ultimo vince, mentre `false` viene ignorato: per questo `pressed && styles.premuto` dice "aggiungi questo stile solo mentre è premuto". Dove si usa: ogni bottone personalizzato, ogni riga toccabile di una lista. L'area minima è 44x44 dp; se l'icona è piccola si allarga l'area con `hitSlop` invece di ingrandire il disegno. `disabled` blocca il tocco e va accompagnato da un colore diverso, altrimenti l'utente non capisce perché non succede nulla.

### TextInput: leggere quello che l'utente scrive

`TextInput` è un input controllato: tu tieni il testo nello stato, lui lo mostra e ti avvisa a ogni modifica.

```jsx
<TextInput
  value={testo}
  onChangeText={setTesto}
  placeholder="Nuovo prodotto"
  placeholderTextColor="#94a3b8"
  autoCapitalize="sentences"
  style={styles.input}
/>
```

Dove si usa: form, ricerca, note, quantità numeriche. `keyboardType` sceglie la tastiera giusta (`"numeric"`, `"email-address"`, `"phone-pad"`): una tastiera sbagliata costringe l'utente a cambiare modalità a ogni campo. `multiline` trasforma l'input in un'area che va a capo; su Android serve anche `textAlignVertical: "top"`, altrimenti il testo parte dal centro. `onSubmitEditing` scatta quando si preme Invio: è il posto naturale per aggiungere un elemento e svuotare il campo.

### Image: locale, remota e dimensioni esplicite

```jsx
<Image source={require("../../assets/logo.png")} style={styles.logo} />
<Image
  source={{ uri: "https://picsum.photos/200" }}
  style={styles.foto}
  resizeMode="cover"
  accessibilityLabel="Foto di copertina"
/>
```

Un'immagine locale si importa con `require` e finisce dentro l'app: si vede anche senza rete. Una remota si passa come `{ uri }` e ha bisogno di `width` e `height` espliciti, perché prima di scaricarsi non ha dimensioni e occuperebbe zero pixel. Dove si usa: avatar, copertine, icone di prodotto. Il ragionamento: decidi prima la forma dello spazio (quadrato, 16:9, cerchio con `borderRadius: 50`), poi scegli il `resizeMode` che non deforma la foto. `cover` riempie e taglia i bordi, `contain` mostra tutto e lascia bande vuote, `stretch` deforma quasi sempre ed è la scelta da evitare.

### ScrollView e FlatList: scorrere senza sprechi

`ScrollView` disegna tutti i figli subito e lascia scorrere il contenuto: va bene per un dettaglio o un form, dove gli elementi sono pochi e fissi. `FlatList` riceve i dati e disegna solo le righe visibili, riciclando quelle uscite dallo schermo.

```jsx
<ScrollView contentContainerStyle={styles.contenuto}>
  <Text style={styles.titolo}>Dettaglio ordine</Text>
  <Text>Cliente: Anna Bianchi</Text>
</ScrollView>

<FlatList
  data={prodotti}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.nome}</Text>}
  ListEmptyComponent={<Text>Nessun prodotto.</Text>}
/>
```

La regola pratica: contenuto lungo e noto, `ScrollView`; elenco che cresce, `FlatList`. `keyExtractor` restituisce un identificatore stabile, non l'indice, altrimenti dopo una rimozione le righe mostrano i dati sbagliati. Una `FlatList` dentro uno `ScrollView` è un errore di struttura: due scroll sovrapposti e nessun riciclo.

### Sezioni, tastiera e differenze di piattaforma

Una lista con intestazioni si fa con `SectionList`: i dati sono gruppi che contengono una lista.

```jsx
const sezioni = [
  { title: "Frutta", data: [{ id: "1", nome: "Mele" }] },
  { title: "Pane", data: [{ id: "2", nome: "Pane integrale" }] },
];

<SectionList
  sections={sezioni}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.nome}</Text>}
  renderSectionHeader={({ section }) => <Text>{section.title}</Text>}
/>
```

La tastiera copre la parte bassa dello schermo: un input in fondo sparisce mentre si scrive. `KeyboardAvoidingView` sposta il contenuto, `SafeAreaView` evita la tacca e la barra gestuale.

```jsx
<SafeAreaView style={styles.schermo}>
  <KeyboardAvoidingView
    style={styles.schermo}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <FlatList data={prodotti} renderItem={riga} keyExtractor={chiave} />
    <TextInput value={testo} onChangeText={setTesto} style={styles.input} />
  </KeyboardAvoidingView>
</SafeAreaView>
```

`Platform.OS` vale `"ios"`, `"android"` o `"web"`; `Platform.select` sceglie un valore per piattaforma. Le differenze vere sono poche ma fastidiose: iOS usa `shadowColor`, `shadowOffset` e `shadowOpacity`, Android usa `elevation`; iOS accetta `"padding"` come `behavior`, Android spesso si comporta meglio con `"height"`. Il metodo: scrivi una volta, prova su entrambi, isola la differenza in una sola espressione invece di duplicare la schermata.

### Come ragionare: dal problema allo schermo

**Esempio guidato 1: il biglietto da visita (P01).**

*Problema.* Una tessera digitale con nome, ruolo e contatto, leggibile su schermi da 320 a 430 dp, con un pulsante che conferma la condivisione.

*Dati.* `{ nome, ruolo, email }`: costanti, nessun server, nessun caricamento.

*Stato.* I dati non cambiano; l'unica cosa che cambia è `messaggio`, una stringa vuota che dopo il tocco diventa una conferma.

*Schermate ed eventi.* Una sola schermata; il tocco su "Condividi" imposta il messaggio.

*Casi limite.* Nome lungo, email lunga, schermo piccolo, tocchi ripetuti.

```jsx
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Biglietto() {
  const [messaggio, setMessaggio] = useState("");

  return (
    <View style={styles.sfondo}>
      <View style={styles.scheda}>
        <Text style={styles.nome} numberOfLines={1}>Anna Bianchi</Text>
        <Text style={styles.ruolo}>Sviluppatrice mobile</Text>
        <Text style={styles.contatto}>anna.bianchi@example.it</Text>
        <Pressable
          onPress={() => setMessaggio("Contatto copiato")}
          style={({ pressed }) => [styles.bottone, pressed && styles.premuto]}
          accessibilityRole="button"
        >
          <Text style={styles.etichetta}>Condividi</Text>
        </Pressable>
        {messaggio !== "" && <Text style={styles.messaggio}>{messaggio}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1, backgroundColor: "#e2e8f0", justifyContent: "center", padding: 24 },
  scheda: { backgroundColor: "#ffffff", borderRadius: 16, padding: 24, gap: 8 },
  nome: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  ruolo: { fontSize: 16, color: "#475569" },
  contatto: { fontSize: 14, color: "#1d4ed8" },
  bottone: { marginTop: 16, backgroundColor: "#1d4ed8", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  premuto: { opacity: 0.7 },
  etichetta: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  messaggio: { marginTop: 12, fontSize: 14, color: "#166534" },
});
```

```text
Prima del tocco: nessun messaggio visibile
Dopo un tocco: "Contatto copiato" sotto il pulsante
Nome di 40 caratteri: una sola riga che finisce con "..."
```

*Decisioni.* `justifyContent: "center"` sullo sfondo centra la scheda senza `position: absolute`. La condizione `messaggio !== ""` invece di un booleano separato evita due stati da tenere allineati. `numberOfLines={1}` impedisce a un nome lungo di spezzare il layout, e `gap: 8` distanzia i figli senza contare i margini a mano. Lo stile premuto non è salvato nello stato: è una conseguenza del tocco, quindi la gestisce `Pressable`.

**Esempio guidato 2: la lista della spesa persistente (P03).**

*Problema.* Aggiungere prodotti, segnarli come comprati, eliminarli, ritrovarli alla riapertura.

*Dati.* `{ id, nome, comprato }`. L'`id` non è il nome: due righe possono chiamarsi "Pane".

*Stato.* `prodotti` (la lista), `testo` (l'input, temporaneo) e `caricato` (vero quando lo storage è stato letto). La lista filtrata non è stato: si calcola.

*Schermate ed eventi.* Una sola, con input in alto, lista al centro, contatore in basso; Invio nell'input, tocco su "Comprato", tocco su "Elimina".

*Casi limite.* Testo vuoto o fatto di spazi, duplicati, lista vuota, JSON corrotto nello storage, tastiera che copre l'input.

```jsx
const CHIAVE = "spesa.prodotti";

useEffect(() => {
  async function leggi() {
    try {
      const salvato = await AsyncStorage.getItem(CHIAVE);
      const letti = JSON.parse(salvato ?? "[]");
      setProdotti(Array.isArray(letti) ? letti : []);
    } catch (e) {
      setProdotti([]);
    } finally {
      setCaricato(true);
    }
  }
  leggi();
}, []);

useEffect(() => {
  if (!caricato) return;
  AsyncStorage.setItem(CHIAVE, JSON.stringify(prodotti)).catch(() => {});
}, [prodotti, caricato]);
```

Il salvataggio è protetto da `caricato`: senza quella guardia il primo render scriverebbe una lista vuota sopra i dati veri, cancellandoli. Il `try` sul `JSON.parse` copre il file rovinato, che altrimenti bloccherebbe l'app all'avvio. Nell'interfaccia servono `FlatList` con `keyExtractor={(item) => item.id}` e un `KeyboardAvoidingView` per non perdere l'input in fondo.

```text
Avvio con storage vuoto: "Nessun prodotto. Aggiungine uno."
Dopo un tocco su "Pane": riga barrata, contatore "3 prodotti, 1 comprato"
Dopo "Elimina" sulla prima riga: 2 righe, l'ordine delle altre non cambia
Riapertura dell'app: le stesse 2 righe, con "Pane" ancora comprato
```

*Decisioni.* `setProdotti((attuali) => [...attuali, nuovo])` crea una lista nuova: React confronta i riferimenti, non il contenuto, quindi una `push` sulla lista esistente non fa ridisegnare nulla. Il completamento è un `map` che cambia solo la riga toccata, la rimozione è un `filter` per `id`. La persistenza sta in un `useEffect` che osserva `prodotti`: la schermata non deve ricordarsi di salvare, il salvataggio è una conseguenza dello stato.

### Come ragiona un informatico

- **Pensa a chi contiene chi, non a coordinate.** Non "il pulsante sta a 300 pixel", ma "è l'ultimo figlio di una colonna che occupa lo spazio": così funziona su ogni schermo.
- **Conta i dp, non i pixel.** La densità cambia, il dito no: 44 dp è il minimo per un tocco comodo.
- **Decide prima chi scorre.** In una schermata con una lista lunga scorre la lista, tutto il resto resta fermo: è una decisione di struttura, non di stile.
- **Tiene lo stato dove serve.** La lista vive nella schermata, la riga riceve i dati e restituisce eventi: una riga che modifica la lista da sola è difficile da testare e da riusare.
- **Usa identificatori stabili.** L'indice cambia quando si elimina, l'`id` no: questa scelta elimina un'intera famiglia di bug visivi.
- **Prova subito i casi scomodi.** Schermo piccolo, testo lungo, tastiera aperta, lista vuota: quattro prove a fine giornata valgono più di dieci ritocchi estetici.

### Errori comuni

- Scrivere una stringa fuori da `Text`: compare "Text strings must be rendered within a Text component". Causa: `View` non mostra testo. Correzione: avvolgere in `Text`.
- Mettere `"20px"` in uno stile: React Native accetta numeri o percentuali, non unità. Correzione: `fontSize: 20`.
- Aspettarsi un layout orizzontale: la direzione predefinita è `column`. Correzione: `flexDirection: "row"`.
- Mostrare un'immagine remota senza `width` e `height`: non appare, perché la sua dimensione iniziale è zero. Correzione: dimensioni esplicite nello stile.
- Mettere una `FlatList` dentro uno `ScrollView`: il warning "VirtualizedLists should never be nested inside plain ScrollViews" segnala scroll doppio e righe non riciclate. Correzione: una sola lista che scorre.
- Usare l'indice come chiave e poi eliminare un elemento: le righe mostrano dati sbagliati. Correzione: `keyExtractor` sull'`id`.
- Aggiornare la lista con `prodotti.push(nuovo)`: nessun ridisegno, perché il riferimento non cambia. Correzione: `setProdotti((attuali) => [...attuali, nuovo])`.
- Dimenticare `behavior` su `KeyboardAvoidingView`: su iOS la tastiera copre l'input. Correzione: `Platform.OS === "ios" ? "padding" : "height"`.

### Esercizi progressivi

1. **P01 biglietto.** Crea una schermata con nome, ruolo e email dentro una scheda centrata, con sfondo grigio e angoli arrotondati (base 1). Output atteso: tre righe di testo, nessuna incollata ai bordi.
2. **Stili con StyleSheet.** Porta gli stili inline in `StyleSheet.create`, con nomi italiani e valori coerenti: 22 per il nome, 16 per il ruolo, 14 per il contatto (base 2). Comportamento atteso: cambiando un solo stile cambia solo quell'elemento.
3. **Layout riga e colonna.** Metti due card affiancate in una riga con `gap` e due in una colonna (base 3).

   Output atteso:

   ```text
   Riga: [Card A] [Card B] con 12 dp di spazio; colonna: Card C sopra Card D
   ```
4. **Pressable con stato premuto.** Aggiungi un pulsante che cambia opacità mentre è premuto e mostra "Aggiunto" dopo il tocco (base 4). Comportamento atteso: con il dito premuto il colore si attenua, al rilascio compare il messaggio.
5. **TextInput multilinea.** Un campo note con `multiline`, `placeholder` e contatore di caratteri (base 5).

   Output atteso:

   ```text
   Dopo 12 caratteri il contatore mostra 12 e il testo va a capo
   ```
6. **Image con dimensioni corrette.** Mostra un logo locale da 120x120 e una foto remota 16:9 con `resizeMode="cover"` (intermedio 6). Comportamento atteso: nessuna immagine deformata e nessun salto di layout durante il caricamento.
7. **ScrollView contro FlatList.** Costruisci due schermate: un dettaglio con 8 elementi in `ScrollView` e un elenco di 500 elementi in `FlatList` (intermedio 7).

   Output atteso:

   ```text
   Dettaglio ed elenco scorrono fluidi, senza avvisi di liste annidate
   ```
8. **FlatList con keyExtractor.** Elenco di 20 città con `id` numerico, riga toccabile e `ListEmptyComponent` (intermedio 8). Comportamento atteso: eliminando la prima città restano 19 righe con i nomi giusti, non spostati.
9. **Lista raggruppata con intestazioni.** Usa `SectionList` con tre sezioni (Frutta, Pane, Bevande) e intestazioni in evidenza (intermedio 9).

   Output atteso:

   ```text
   FRUTTA sopra Mele, PANE sopra Pane integrale
   ```
10. **Form non coperto dalla tastiera.** Metti un input in fondo allo schermo dentro `KeyboardAvoidingView` e verifica che resti visibile mentre scrivi (intermedio 10).

    Comportamento atteso:

    ```text
    Tastiera aperta: input sopra la tastiera, cursore visibile
    ```
11. **SafeArea e differenze di piattaforma.** Applica `SafeAreaView` e usa `Platform.select` per l'ombra della scheda (intermedio 11).

    Output atteso:

    ```text
    iOS: shadowOpacity 0.15 visibile
    Android: elevation 3 visibile
    ```
12. **P03 aggiunta.** Input, pulsante e `FlatList`: aggiunge prodotti ignorando testo vuoto e spazi (avanzato 12).

    Output atteso:

    ```text
    Aggiungendo "  Pane  " compare "Pane" e il campo si svuota
    ```
13. **P03 completamento e rimozione.** Ogni riga ha "Comprato" e "Elimina"; la riga comprata è barrata e il contatore si aggiorna (avanzato 13).

    Output atteso:

    ```text
    Prima: 3 prodotti, 0 comprati; dopo "Comprato" su Pane: 1 comprato
    Dopo "Elimina" su Mele: 2 prodotti, 1 comprato
    ```
14. **P03 persistenza.** Installa lo storage con `npx expo install @react-native-async-storage/async-storage` e salva la lista a ogni modifica (avanzato 14). Comportamento atteso: chiudendo e riaprendo l'app i prodotti e il loro stato sono gli stessi.
15. **P03 rifinitura.** Gestisci lista vuota, testo duplicato, JSON corrotto, tastiera aperta e nome molto lungo (avanzato 15).

    Output atteso:

    ```text
    Lista vuota: "Nessun prodotto. Aggiungine uno."
    Storage corrotto: lista vuota, nessun crash all'avvio
    ```

### Varianti

- Aggiungi un pulsante "Svuota comprati" che rimuove in un colpo tutti i prodotti completati.
- Sostituisci il contatore testuale con una barra di avanzamento proporzionale ai comprati.
- Raggruppa la spesa per reparto usando `SectionList` al posto di `FlatList`.
- Aggiungi la modifica del nome con un tocco lungo sulla riga e un input in linea.
