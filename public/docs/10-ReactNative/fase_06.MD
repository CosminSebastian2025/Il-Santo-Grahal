# Fase 6: Fotocamera, posizione, animazioni (giorni 71-84)

**Obiettivo:** usare fotocamera, galleria, posizione e notifiche rispettando i permessi, poi dare movimento all'interfaccia senza sacrificare chiarezza e usabilità.

**Percorso dei giorni**

| Giorno | Argomento | Esercizi |
| --- | --- | --- |
| 71 | Permessi: perché servono e che cosa succede se negati | 1 |
| 72 | Galleria con expo-image-picker | 2 |
| 73 | Fotocamera, scatto e annullamento | 3 |
| 74 | Posizione corrente con latitudine e longitudine | 4 |
| 75 | Notifiche locali e canale Android | 5 |
| 76 | P08 ricordo con foto, testo e posizione | 6 |
| 77 | P08 salvataggio locale e lista dei ricordi | 7 |
| 78-79 | Animated e Reanimated: fade-in e posizione | 8, 9 |
| 80 | Gesti semplici: tap lungo e swipe | 10 |
| 81-82 | Micro-interazioni, liste e skeleton loader | 10, 11 |
| 83 | Dark mode con colori dinamici e toggle | 12 |
| 84 | P09 onboarding animato e rifinitura | 13, 14, 15 |

### Permessi: chiedere prima di usare

Un permesso non è una formalità: senza, il sistema blocca fotocamera, galleria, posizione e notifiche. Si chiede nel momento in cui serve, non all'avvio, e si legge la risposta, perché `granted` può essere falso. Se l'utente ha negato per sempre, l'unica strada è mandarlo nelle impostazioni con `Linking.openSettings()`. Chiedersi che cosa vede l'utente se dice no è parte del lavoro.

| Permesso | A che cosa serve | Se negato |
| --- | --- | --- |
| Fotocamera | Scattare la foto del ricordo | Si può scegliere dalla galleria |
| Galleria | Scegliere una foto esistente | Si può scattare sul momento |
| Posizione | Allegare il luogo | Il ricordo resta senza luogo |
| Notifiche | Promemoria locali | L'app funziona, senza avvisi |

```jsx
const [permesso, chiediPermesso] = useCameraPermissions();
if (!permesso) {
  return <Text>Verifico il permesso...</Text>;
}
if (!permesso.granted) {
  return (
    <Pressable onPress={chiediPermesso} accessibilityRole="button">
      <Text>Senza fotocamera non posso scattare. Consenti</Text>
    </Pressable>
  );
}
```

Lo stato "sto ancora controllando" è distinto da "negato": mostrare subito il rifiuto a chi ha già concesso è un errore che si vede solo sul telefono.

### Galleria e fotocamera

`expo-image-picker` restituisce sempre lo stesso oggetto: `canceled` dice se l'utente ha annullato, `assets` contiene le foto scelte, ognuna con `uri`, `width` e `height`. `expo-camera` serve quando vuoi l'anteprima dentro l'app, con il pulsante di scatto disegnato da te. Entrambi vanno installati con `npx expo install expo-image-picker expo-camera expo-location expo-notifications`.

```jsx
const permesso = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (!permesso.granted) {
  return;
}
const risultato = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  quality: 0.7,
});
if (!risultato.canceled) {
  setFoto(risultato.assets[0].uri);
}
```

`quality: 0.7` riduce peso e memoria senza rovinare la foto. Nelle versioni più vecchie dell'SDK il filtro si scrive `ImagePicker.MediaTypeOptions.Images`: se il codice di un tutorial non compila, il motivo è spesso questo. Lo scatto con `takePictureAsync` può restituire `undefined` se premuto due volte, quindi va protetto con un controllo e un `try`/`catch`.

### Posizione e notifiche locali

`expo-location` chiede il permesso di primo piano e restituisce `coords.latitude` e `coords.longitude`. La precisione `Balanced` è sufficiente per un ricordo e consuma meno batteria di `Highest`. Le notifiche locali, con `expo-notifications`, si programmano dal telefono senza server; su Android hanno bisogno di un canale, altrimenti non compaiono.

```jsx
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== "granted") {
  setErrore("Permesso posizione negato: il ricordo resta senza luogo.");
  return;
}
const posizione = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
});
setCoordinate({
  latitudine: posizione.coords.latitude,
  longitudine: posizione.coords.longitude,
});
```

```jsx
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("promemoria", {
    name: "Promemoria",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
await Notifications.scheduleNotificationAsync({
  content: { title: "Ricordo salvato", body: "Aprilo per rivederlo." },
  trigger: null,
});
```

`trigger: null` mostra la notifica subito; per un promemoria tra qualche secondo si usa `{ seconds: 5 }`. Su Expo Go alcune di queste funzioni sono limitate o assenti: per i test completi serve una build di sviluppo, e questo vale soprattutto per notifiche e moduli nativi.

### P08 ricordo: dati, foto e luogo

Un ricordo è una nota con in più una foto e, se disponibile, una posizione. La foto va copiata in una cartella stabile prima di salvare il riferimento: l'URI della cache può essere ripulito dal sistema e il ricordo resterebbe con un'immagine rotta.

```jsx
const ricordo = {
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  foto,
  testo: "Tramonto al parco",
  posizione: { latitudine: 45.4642, longitudine: 9.19 },
  data: new Date().toISOString(),
};
export async function salvaRicordi(ricordi) {
  await AsyncStorage.setItem("ricordi:v1", JSON.stringify(ricordi));
}
export async function caricaRicordi() {
  try {
    const testo = await AsyncStorage.getItem("ricordi:v1");
    return testo === null ? [] : JSON.parse(testo);
  } catch {
    return [];
  }
}
```

La lista mostra miniatura, testo e data; il tocco apre il dettaglio con la mappa o con le coordinate. Senza posizione il ricordo è valido lo stesso: il luogo è un extra, non un requisito.

### Animazioni e gesti: Animated, Reanimated, tap e swipe

L'API `Animated` è inclusa in React Native e basta per fade-in, scorrimenti e pulsazioni. Si crea un valore con `useRef(new Animated.Value(0))`, si anima con `Animated.timing` e si collega allo stile. Reanimated è più potente e sposta il calcolo sul thread nativo, ma è un approfondimento facoltativo: prima si impara a usare poco movimento, con criterio.

```jsx
const opacita = useRef(new Animated.Value(0)).current;
useEffect(() => {
  Animated.timing(opacita, {
    toValue: 1,
    duration: 400,
    useNativeDriver: true,
  }).start();
}, [opacita]);
<Animated.View style={{ opacity: opacita }}>...</Animated.View>
```

`useNativeDriver: true` funziona per opacità e trasformazioni, non per Proprietà di layout come `height`. Per i gesti, `onLongPress` su `Pressable` copre il tocco prolungato, mentre uno swipe si costruisce con `PanResponder` o con `react-native-gesture-handler`; in ogni caso serve un'alternativa visibile, perché il gesto non è scopribile da solo.

### Micro-interazioni, liste e skeleton

Un'animazione utile risponde a una domanda: che cosa sta succedendo? Il skeleton loader dice "sto caricando" meglio di una schermata vuota, e una comparsa morbida delle righe segnala che i dati sono arrivati. Le animazioni che rallentano l'accesso ai contenuti, invece, sono solo un ostacolo.

```jsx
function Skeleton() {
  const pulsazione = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsazione, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulsazione, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [pulsazione]);
  return <Animated.View style={[styles.blocco, { opacity: pulsazione }]} />;
}
```

Il `return () => ciclo.stop()` ferma l'animazione quando il componente sparisce. Nelle liste si animano poche righe visibili, si usano durate brevi e si evita di animare ogni elemento a ogni scroll.

### Dark mode e onboarding animato

La dark mode non è un colore scuro messo a caso: è una coppia di colori scelti per contrasto e leggibilità, con la possibilità di seguire il sistema. `useColorScheme()` legge la preferenza del telefono; una scelta esplicita dell'utente la sostituisce e viene salvata.

```jsx
const sistema = useColorScheme();
const [scelta, setScelta] = useState("sistema");
const scuro = scelta === "sistema" ? sistema === "dark" : scelta === "scuro";
const colori = scuro
  ? { sfondo: "#111111", testo: "#F5F5F5" }
  : { sfondo: "#FFFFFF", testo: "#111111" };
```

L'onboarding chiude la fase: due o tre schermate con un'animazione leggera, i pallini di posizione, il pulsante Salta e il pulsante Inizia che salva un flag in AsyncStorage. Chi ha già visto l'onboarding non lo rivede, e chi lo salta non resta bloccato.

### Come ragionare: dal problema allo schermo

#### Esempio guidato 1: nuovo ricordo con foto e luogo

**Problema.** Creare un ricordo con foto, testo e posizione, salvarlo sul telefono e ritrovarlo nella lista anche senza rete.

**Dati.** Ricordo con `id`, `foto`, `testo`, `posizione` (può essere `null`), `data`; chiave `ricordi:v1`.

**Stato.** `foto`, `testo`, `coordinate`, `errore`, `salvataggio`. La lista dei ricordi è persistente, la bozza è temporanea.

**Schermate ed eventi.** Form con Scatta, Scegli dalla galleria, Allega posizione e Salva; lista con miniature; dettaglio. Azioni: cattura, scelta, posizione, salvataggio, annullamento.

**Casi limite.** Permesso negato, picker annullato, foto scattata due volte, GPS lento o assente, testo vuoto, doppio tocco su Salva.

```jsx
async function salva() {
  if (salvataggio) return;
  if (!foto || testo.trim() === "") {
    setErrore("Servono una foto e una descrizione.");
    return;
  }
  setSalvataggio(true);
  const ricordi = await caricaRicordi();
  await salvaRicordi([
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      foto,
      testo: testo.trim(),
      posizione: coordinate,
      data: new Date().toISOString(),
    },
    ...ricordi,
  ]);
  setSalvataggio(false);
  navigation.goBack();
}
```

Comportamento atteso:

```text
Solo foto, testo vuoto: "Servono una foto e una descrizione."
Foto e testo validi: torna alla lista, il ricordo è il primo
Posizione negata: salvato con "Luogo non disponibile", resta al riavvio
```

Le decisioni da notare: il salvataggio legge prima la lista esistente e poi scrive quella nuova, così non cancella i ricordi precedenti; `coordinate` può essere `null` e la lista lo gestisce; `salvataggio` impedisce il doppio inserimento. La foto viene salvata come URI e per un uso reale andrebbe copiata in una cartella permanente con `expo-file-system`.

#### Esempio guidato 2: onboarding animato in tre schermate

**Problema.** Introdurre l'app con tre schermate, un'animazione leggera, Salta e Inizia; chi lo ha già visto non deve rivederlo.

**Dati.** Tre pagine con titolo, testo e colore; un flag `onboarding:visto` salvato sul telefono.

**Stato.** `indice`, `visto` (ancora da leggere), `opacita` animata. La pagina corrente è un indice, non una copia dei contenuti.

**Schermate ed eventi.** Tre pagine scorrevoli, pallini, Salta, Inizia. Azioni: scorrimento, tocco su Salta, tocco su Inizia.

**Casi limite.** Onboarding già visto, scorrimento veloce oltre l'ultima pagina, utente che salta, animazioni disattivate dal sistema.

```jsx
const [indice, setIndice] = useState(0);
const opacita = useRef(new Animated.Value(0)).current;
useEffect(() => {
  opacita.setValue(0);
  Animated.timing(opacita, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, [indice, opacita]);
async function inizia() {
  await AsyncStorage.setItem("onboarding:visto", "1");
  navigation.replace("Home");
}
```

Comportamento atteso:

```text
Primo avvio: pagina 1, pallino 1 attivo, pulsante Salta
Scorrimento a destra: pagina 2, opacità che sale in 300 ms
Tocco su Inizia: Home, e al riavvio l'onboarding non compare
```

L'animazione parte da `setValue(0)` a ogni cambio pagina, così non si somma alle precedenti. L'indice determina pallini e pulsante: non c'è uno stato separato per "quale pallino è attivo", che si disallineerebbe. `navigation.replace` impedisce di tornare all'onboarding con il tasto indietro.

### Come ragiona un informatico

- **Tratta il permesso come uno stato, non come un sì.** I valori sono "non chiesto", "concesso", "negato" e "negato per sempre": ognuno merita una schermata diversa.
- **Non dà per scontato l'hardware.** Simulatore senza fotocamera, GPS spento, notifiche bloccate: l'app deve restare usabile.
- **Chiede il minimo e spegne presto.** La posizione consuma batteria: precisione bilanciata, un solo aggiornamento, nessun ascolto infinito.
- **Distingue dati e riferimenti.** L'URI di una foto è un puntatore a un file che può sparire; il dato vero va copiato e protetto.
- **Progetta l'animazione come risposta a una domanda.** "Sto caricando", "è arrivato", "ho toccato": se non risponde a niente, si toglie.
- **Verifica sul dispositivo reale.** Expo Go aiuta, ma notifiche, fotocamera e gesture si giudicano solo su un telefono con una build di sviluppo.

### Errori comuni

- **Chiedere il permesso e ignorare la risposta.** Se `granted` è falso e l'app continua, la schermata resta nera. Correzione: ramo dedicato con messaggio e pulsante per riprovare o aprire le impostazioni.
- **Leggere `assets[0]` dopo l'annullamento.** Il picker restituisce `canceled: true` e nessun asset. Correzione: controllare `canceled` prima di usare l'URI.
- **Salvare l'URI della cache come archivio.** Il sistema può ripulire la cache e la foto sparisce. Correzione: copiare il file in una cartella permanente con `expo-file-system`.
- **Chiamare `takePictureAsync` due volte.** Il secondo scatto restituisce `undefined`. Correzione: disabilitare il pulsante durante lo scatto e gestire il `catch`.
- **Chiedere la precisione massima per un ricordo.** Il GPS consuma batteria e impiega di più. Correzione: `Balanced` e un timeout con messaggio chiaro.
- **Animare proprietà di layout con il driver nativo.** `height` e `width` non sono supportate e l'animazione non parte. Correzione: animare `opacity` e `transform`, oppure usare `useNativeDriver: false`.
- **Dimenticare il canale di notifica su Android.** La notifica viene programmata ma non compare. Correzione: creare il canale prima di programmarla.
- **Ripetere l'onboarding a ogni avvio.** Il flag viene scritto ma mai letto. Correzione: leggere la chiave all'avvio e decidere la prima schermata di conseguenza.

### Esercizi progressivi

1. **Tabella dei permessi.** Compila una tabella con fotocamera, galleria, posizione e notifiche: a che cosa servono, che cosa mostra l'app se negati, come si sbloccano (base 1).

   Output atteso:

   ```text
   Fotocamera: negata -> si usa la galleria, avviso con "Apri impostazioni"
   Posizione: negata -> ricordo valido con "Luogo non disponibile"
   ```

2. **Galleria.** Con `expo-image-picker` scegli una foto, mostra l'anteprima con `Image` e gestisci l'annullamento senza errori (base 2).
3. **Fotocamera.** Con `expo-camera` mostra l'anteprima, scatta e visualizza la foto; con permesso negato mostra il pulsante per chiederlo di nuovo (base 3).

   Output atteso:

   ```text
   Permesso concesso: anteprima e foto visibile dopo lo scatto
   Permesso negato: nessuna anteprima, pulsante "Consenti" visibile
   ```

4. **Posizione.** Leggi la posizione corrente con `Accuracy.Balanced` e mostra latitudine e longitudine con tre decimali (base 4).

   Output atteso:

   ```text
   Posizione: 45.464, 9.190; permesso negato: "Luogo non disponibile"
   ```

5. **Notifica locale.** Programma una notifica immediata con titolo e testo, creando prima il canale su Android (base 5).

   Output atteso:

   ```text
   Android: notifica visibile nel centro notifiche, canale "Promemoria"
   Notifiche negate: messaggio nell'app, nessuna notifica
   ```

6. **P08, form ricordo.** Form con foto, testo, pulsante Allega posizione; Salva disabilitato finché foto e testo non ci sono (intermedio 6). Comportamento atteso: con solo la foto il pulsante resta spento e compare il messaggio sul testo mancante.
7. **P08, salvataggio e lista.** Salva i ricordi in AsyncStorage con la chiave `ricordi:v1` e mostrali in una `FlatList` con miniatura, testo e data (intermedio 7).

   Output atteso:

   ```text
   Primo avvio: "Nessun ricordo."
   Dopo un salvataggio: 1 riga con miniatura e data
   Riavvio: il ricordo è ancora presente
   ```

8. **Fade-in.** Schermata dettaglio che compare con opacità da 0 a 1 in 400 ms usando `Animated` (intermedio 8). Comportamento atteso: all'apertura il contenuto appare gradualmente e resta visibile, senza scatti.
9. **Animazione di posizione.** Card che entra dal basso con `translateY` da 20 a 0 insieme all'opacità (intermedio 9). Comportamento atteso: l'animazione dura meno di mezzo secondo e non blocca i tocchi.
10. **Tap lungo e swipe.** Una riga della lista si elimina con tap lungo e conferma, oppure con swipe verso sinistra; entrambi i gesti hanno un'alternativa visibile (intermedio 10).

    Output atteso:

    ```text
    Tap lungo: "Eliminare questo ricordo?" e riga rimossa dopo conferma
    Swipe a sinistra: stessa conferma, nessuna eliminazione accidentale
    ```

11. **Skeleton loader.** Durante il caricamento dei ricordi mostra tre blocchi grigi pulsanti, poi la lista vera (intermedio 11). Comportamento atteso: lo skeleton sparisce appena i dati arrivano e non resta mai insieme alla lista.
12. **Dark mode.** Toggle Sistema, Chiaro, Scuro; colori di sfondo e testo coerenti e scelta salvata in AsyncStorage (avanzato 12).

    Output atteso:

    ```text
    Scelta "Sistema" con telefono scuro: sfondo #111111
    Scelta "Chiaro": sfondo #FFFFFF, anche con telefono scuro
    Riavvio: la scelta esplicita viene mantenuta
    ```

13. **P09 onboarding.** Tre pagine con pallini, Salta e Inizia; il flag `onboarding:visto` viene letto all'avvio (avanzato 13).

    Output atteso:

    ```text
    Primo avvio: pagina 1 di 3; dopo Inizia e riavvio: Home
    ```

14. **Accessibilità dell'onboarding.** Ogni pagina ha un titolo leggibile, i pallini hanno etichette comprensibili, i pulsanti hanno aree grandi e l'animazione rispetta chi riduce il movimento (avanzato 14). Comportamento atteso: con il lettore di schermo si sente "Pagina 1 di 3" e i pulsanti sono raggiungibili.
15. **Prova reale e permessi.** Installa su un telefono con build di sviluppo, prova tutti i percorsi negati, annota che cosa cambia rispetto a Expo Go e correggi i messaggi (avanzato 15). Comportamento atteso: ogni permesso negato porta a una schermata comprensibile, senza blocchi.

### Varianti

- Aggiungi ai ricordi un filtro "solo con luogo" e mostra le coordinate in una mappa statica, senza chiavi API.
- Sostituisci il fade-in con una comparsa a scaglioni delle righe della lista, misurando la durata percepita.
- Aggiungi un promemoria a un ricordo dopo un giorno e verifica la notifica sul telefono reale.
- Rifai l'onboarding con Reanimated e confronta il codice con la versione Animated in due righe di note.
