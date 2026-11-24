# Fase 5: Stato, storage e form (giorni 57-70)

**Obiettivo:** decidere dove vive ogni dato, salvarlo sul telefono e costruire form che dicano all'utente che cosa manca prima di premere Salva.

**Percorso dei giorni**

| Giorno | Argomento | Esercizi |
| --- | --- | --- |
| 57 | Context API per tema e utente condiviso | 1, 2 |
| 58 | useReducer con azioni esplicite | 3 |
| 59 | Zustand e confronto con Context | 4, 5 |
| 60 | AsyncStorage, MMKV, SQLite: quale scegliere | 5 |
| 61 | P06 note offline: modello dati e lista | 6 |
| 62 | P06 creazione e modifica con salvataggio locale | 7, 8 |
| 63 | P06 eliminazione e ricerca | 9, 10 |
| 64 | Componenti Input riutilizzabili | 11 |
| 65 | Validazione di email, password e campi obbligatori | 12 |
| 66 | Tastiera, form e aree toccabili | 12 |
| 67 | P07 schermate Login, Registrazione, Profilo | 13 |
| 68 | P07 login simulato e sessione salvata | 13 |
| 69 | P07 profilo, logout e protezione delle schermate | 14, 15 |
| 70 | Ripasso, refactor e commit di fine fase | 15 |

### Context API: un dato per molti componenti

Passare lo stesso dato di props in props, attraverso componenti che non lo usano, crea una catena fragile. Il Context mette un valore a disposizione di un sottoalbero: il Provider lo offre, `useContext` lo legge. Si usa per tema, utente e impostazioni, cioè per dati che cambiano poco; non per il testo di un `TextInput`, che a ogni tasto rilancerebbe tutti i consumer.

```jsx
const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const [chiaro, setChiaro] = useState(true);
  const valore = { chiaro, inverti: () => setChiaro((c) => !c) };
  return <TemaContext.Provider value={valore}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
```

### useReducer: descrivere le azioni invece dei passaggi

Con `useState` la regola di aggiornamento vive nel gestore del tocco; con `useReducer` vive in una funzione pura che riceve lo stato e un'azione. Conviene quando le azioni sono tante e devono restare coerenti, come in un contatore con passi e azzeramento.

```jsx
function riduttore(stato, azione) {
  switch (azione.tipo) {
    case "incrementa":
      return { valore: stato.valore + 1, passi: stato.passi + 1 };
    case "decrementa":
      return { valore: stato.valore - 1, passi: stato.passi + 1 };
    case "azzera":
      return { valore: 0, passi: 0 };
    default:
      throw new Error("Azione sconosciuta: " + azione.tipo);
  }
}
```

Poi `useReducer(riduttore, { valore: 0, passi: 0 })` restituisce stato e `dispatch`. Il `default` che lancia un errore è voluto: un'azione scritta male si scopre durante lo sviluppo, e un riduttore puro si prova senza montare componenti.

### Zustand: uno store leggero fuori dall'albero

Zustand tiene lo stato in un modulo e non richiede un Provider: il componente si abbona solo alla parte che gli interessa, grazie al selettore.

```jsx
export const useNoteStore = create((set) => ({
  note: [],
  aggiungi: (nota) => set((s) => ({ note: [nota, ...s.note] })),
  elimina: (id) => set((s) => ({ note: s.note.filter((n) => n.id !== id) })),
}));
const note = useNoteStore((stato) => stato.note);
```

| Aspetto | Context | Zustand |
| --- | --- | --- |
| Dove vive lo stato | Dentro l'albero | In un modulo |
| Provider | Serve | Non serve |
| Adatto a | Tema, utente | Liste, azioni frequenti |

Senza selettore il componente si ridisegna a ogni cambiamento dello store, anche se quel campo non lo riguarda. Per iniziare: Context per il tema, store per le note.

### Salvare sul telefono: AsyncStorage, MMKV, SQLite

Sul telefono non c'è `localStorage`. AsyncStorage offre coppie chiave-valore asincrone che accettano solo stringhe; per un elenco di note è la scelta giusta. Si installa con `npx expo install @react-native-async-storage/async-storage`.

| Soluzione | Che cosa è | Quando serve |
| --- | --- | --- |
| AsyncStorage | Chiave-valore asincrono | Iniziare, poche centinaia di elementi |
| MMKV | Chiave-valore sincrono e nativo | Molte letture piccole e frequenti |
| SQLite | Database relazionale | Migliaia di righe, filtri e più tabelle |

MMKV e SQLite sono ottimi ma richiedono una build nativa e più concetti: si cambia solo quando una misura dice che AsyncStorage non basta.

```jsx
const CHIAVE = "note:v1";
export const salvaNote = (note) =>
  AsyncStorage.setItem(CHIAVE, JSON.stringify(note));

export async function caricaNote() {
  try {
    const testo = await AsyncStorage.getItem(CHIAVE);
    return testo === null ? [] : JSON.parse(testo);
  } catch {
    return [];
  }
}
```

`JSON.stringify` perché lo storage accetta solo testo, il `catch` perché un dato corrotto non deve impedire l'avvio, `note:v1` perché la forma dei dati cambierà.

### P06 note offline: modello, lista e operazioni

Una nota ha `id`, `titolo`, `testo` e `data` ISO: l'`id` non può essere il titolo, perché due note possono chiamarsi uguale, né la posizione nella lista, che cambia appena elimini qualcosa. L'`id` si costruisce con `Date.now()` più una parte casuale, così due tocchi rapidi non collidono.

```jsx
<FlatList
  data={note}
  keyExtractor={(item) => item.id}
  ListEmptyComponent={<Text>Nessuna nota.</Text>}
  renderItem={({ item }) => (
    <Pressable onPress={() => apri(item.id)} accessibilityRole="button">
      <Text>{item.titolo}</Text>
      <Text>{new Date(item.data).toLocaleDateString("it-IT")}</Text>
    </Pressable>
  )}
/>
```

Creazione, modifica ed eliminazione sono tre azioni sulla stessa lista: si aggiorna con copie (`[nuova, ...note]`, `map`, `filter`), mai con `push`. La ricerca è un filtro derivato su titolo e testo, non un secondo elenco da tenere allineato.

### Form: campi riutilizzabili, validazione e tastiera

Un campo scritto tre volte diventa tre posti da correggere. Il componente `Campo` riceve valore, cambiamento, etichetta ed errore, e si occupa di bordo e messaggio; la validazione è una funzione separata che restituisce un oggetto di errori, senza componenti né colori.

```jsx
export function valida(dati) {
  const errori = {};
  if (dati.titolo.trim() === "") {
    errori.titolo = "Il titolo è obbligatorio.";
  }
  if (dati.email.trim() === "") {
    errori.email = "L'email è obbligatoria.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dati.email.trim())) {
    errori.email = "Email non valida.";
  }
  if (dati.password.length < 8) {
    errori.password = "La password deve avere almeno 8 caratteri.";
  }
  return errori;
}
```

Con titolo vuoto, email `anna@example` e password `corta` compaiono tre messaggi sotto i campi e il salvataggio non parte. Gli errori si mostrano insieme, non durante la prima lettera digitata. Per la tastiera servono `KeyboardAvoidingView` con `behavior` `padding` su iOS e `height` su Android, `keyboardShouldPersistTaps="handled"` sul `ScrollView` e `Keyboard.dismiss()` sullo sfondo.

### P07 login simulato e schermate protette

Il login mock non contatta nessun server: confronta i dati con un utente demo e salva la sessione. Il flusso è identico a quello vero: form, attesa, errore, sessione, uscita.

```jsx
const UTENTE_DEMO = { nome: "Anna", email: "demo@scuola.it", password: "password123" };
async function accedi(email, password) {
  const valido =
    email.trim().toLowerCase() === UTENTE_DEMO.email &&
    password === UTENTE_DEMO.password;
  if (!valido) {
    throw new Error("Email o password non corretti.");
  }
  const utente = { nome: UTENTE_DEMO.nome, email: UTENTE_DEMO.email };
  await AsyncStorage.setItem("sessione:v1", JSON.stringify(utente));
  return utente;
}
```

All'avvio l'app legge la sessione e, finché la lettura non è finita, mostra un indicatore: "non ancora caricato" non è "non collegato". Poi sceglie le schermate in base allo stato `utente`. Questa è una protezione di interfaccia, non sicurezza: la password non si salva mai e il controllo vero resta sul server.

### Come ragionare: dal problema allo schermo

#### Esempio guidato 1: blocco note offline

**Problema.** Scrivere note senza connessione, ritrovarle alla riapertura, eliminarle e cercarle per parola.

**Dati.** Nota con `id`, `titolo`, `testo`, `data`; chiave `note:v1`.

**Stato.** `note` (la lista vera), `caricamento` (lettura asincrona), `ricerca` (filtro temporaneo). La lista filtrata non è stato: si calcola.

**Schermate ed eventi.** Lista con ricerca e pulsante Nuova nota; Editor con titolo, testo, Salva ed Elimina, che riceve l'`id` e capisce se crea o modifica. Azioni: crea, modifica, elimina, cerca, torna indietro.

**Casi limite.** Storage vuoto, JSON corrotto, titolo vuoto, ricerca senza risultati, doppio tocco su Salva.

```jsx
function riduttoreNote(stato, azione) {
  switch (azione.tipo) {
    case "carica":
      return { ...stato, note: azione.note, caricamento: false };
    case "crea":
      return { ...stato, note: [azione.nota, ...stato.note] };
    case "elimina":
      return { ...stato, note: stato.note.filter((n) => n.id !== azione.id) };
    default:
      return stato;
  }
}

useEffect(() => {
  caricaNote().then((note) => dispatch({ tipo: "carica", note }));
}, []);
useEffect(() => {
  if (!stato.caricamento) salvaNote(stato.note);
}, [stato.note, stato.caricamento]);
```

Comportamento atteso dopo tre note, una ricerca e un'eliminazione, con riavvio:

```text
Avvio con storage vuoto: "Nessuna nota."
Dopo 3 note: 3 righe, la più recente in cima
Ricerca "pane": 1 risultato, contatore "1 di 3"
Dopo eliminazione: 2 note, e al riavvio ci sono ancora
```

Tre decisioni importanti. Il salvataggio sta in un `useEffect` che dipende dalle note, non nel gestore del tocco: così ogni modifica viene salvata. La guardia `!stato.caricamento` impedisce di sovrascrivere lo storage con una lista vuota prima che la lettura sia finita. La ricerca è derivata: se la salvi, devi ricalcolarla dopo ogni modifica, e prima o poi dimentichi. La modifica di una nota segue lo stesso schema di `crea` ed `elimina`, con una `map` che sostituisce la nota con lo stesso `id`.

#### Esempio guidato 2: sessione e schermate protette

**Problema.** Avere Login, Registrazione e Profilo; dopo l'accesso il Profilo deve restare disponibile riaprendo l'app, e con Esci si torna al Login.

**Dati.** Utente demo con nome, email e password; sessione salvata con nome ed email, senza password.

**Stato.** `utente` (null oppure oggetto), `pronto` (sessione letta), `errore`, `invio`.

**Schermate ed eventi.** Login e Registrazione formano l'area pubblica, Profilo l'area riservata; azioni Accedi, Registrati, Esci e riapertura dell'app.

**Casi limite.** Campi vuoti, credenziali errate, doppio tocco su Accedi, sessione corrotta.

```jsx
function Radice() {
  const [utente, setUtente] = useState(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    leggiSessione().then((salvato) => {
      setUtente(salvato);
      setPronto(true);
    });
  }, []);
  const esci = async () => {
    await cancellaSessione();
    setUtente(null);
  };

  if (!pronto) return <ActivityIndicator style={{ flex: 1 }} />;

  return utente ? (
    <AreaRiservata utente={utente} onEsci={esci} />
  ) : (
    <AreaPubblica onAccedi={setUtente} />
  );
}
```

Comportamento atteso:

```text
Primo avvio: Login, nessuna sessione salvata
Credenziali errate: "Email o password non corretti."
Accesso corretto: Profilo con "Anna" e "demo@scuola.it"
Dopo Esci e riavvio: Login
```

La password non viene salvata: serve solo al confronto. `pronto` esiste perché la lettura è asincrona; senza, l'app mostrerebbe il Login per un istante anche a chi è già collegato. La scelta delle schermate è una conseguenza dello stato `utente`: non c'è modo di restare nel Profilo dopo l'uscita.

### Come ragiona un informatico

- **Assegna un proprietario a ogni dato.** Il testo del form è locale, il tema è condiviso, le note sono persistenti: se un dato ha due proprietari, le copie divergono.
- **Tratta la persistenza come un confine.** Solo `noteStorage.js` conosce AsyncStorage: sostituirlo con un server diventa un lavoro su un file.
- **Non salva lo stato derivato.** Ricerca, conteggi e totali si calcolano; salvarli significa aggiornarli in ogni punto e sbagliarsi.
- **Scrive riduttori puri e testabili.** Stessa azione sullo stesso stato produce lo stesso risultato, quindi la logica si prova senza telefono.
- **Prevede il primo avvio e il dato corrotto.** Sono i casi che rompono l'app a chi la apre per la prima volta.
- **Distingue protezione dell'interfaccia e sicurezza.** Nascondere una schermata è comodità; impedire l'accesso ai dati è compito del server.

### Errori comuni

- **Salvare un oggetto senza `JSON.stringify`.** AsyncStorage accetta solo stringhe e il valore diventa `[object Object]`. Correzione: convertire in scrittura e fare `JSON.parse` in lettura, dentro un `try`.
- **Salvare dentro `onChangeText`.** Ogni tasto scrive su disco e l'app si impunta. Correzione: salvare dopo il submit o dopo una breve pausa.
- **Sovrascrivere lo storage all'avvio.** Il primo render ha la lista vuota e il salvataggio automatico cancella le note vere. Correzione: salvare solo a caricamento concluso.
- **Aggiornare la lista con `push`.** Il riferimento non cambia e lo schermo resta fermo. Correzione: creare una lista nuova con `[...note, nuova]` o `filter`.
- **Usare `Date.now()` da solo come id.** Due tocchi rapidi producono lo stesso valore. Correzione: aggiungere una parte casuale.
- **Mettere tutto nel Context.** Un valore che cambia a ogni tasto rilancia l'intera app. Correzione: stato locale per i form.
- **Mostrare gli errori mentre si digita la prima volta.** Il campo sembra sbagliato prima di essere riempito. Correzione: validare al submit o quando il campo perde il fuoco.
- **Dimenticare `behavior` in `KeyboardAvoidingView`.** Su iOS il campo in fondo resta coperto. Correzione: `padding` su iOS, `height` su Android.

### Esercizi progressivi

1. **Tema con Context.** Crea `TemaContext`, il Provider e il hook `useTema`; una schermata mostra un testo colorato e un pulsante Inverti tema (base 1).

   Output atteso:

   ```text
   Avvio: tema chiaro, sfondo #FFFFFF
   Dopo un tocco: tema scuro, sfondo #111111
   ```

2. **Due consumer.** Aggiungi `Intestazione` e `Card` che leggono il tema con `useContext`, senza props dal genitore: al tocco su Inverti cambiano colore entrambi nello stesso render (base 2).
3. **Contatore con useReducer.** Riduttore con `incrementa`, `decrementa`, `azzera` e stato `{ valore, passi }`; tre pulsanti e un'etichetta con i due numeri (base 3).

   Output atteso:

   ```text
   Dopo 3 incrementi: valore 3, passi 3
   Dopo 1 decremento: valore 2, passi 4
   Dopo azzera: valore 0, passi 0
   ```

4. **Store Zustand.** Crea `useNoteStore` con note, `aggiungi`, `elimina` e un selettore per il conteggio; aggiungi due note e elimina la prima (base 4).

   Output atteso:

   ```text
   Note: 2
   Dopo eliminazione: 1, resta "Latte"
   ```

5. **Confronto scritto.** In `scelte.md` scrivi quattro righe: che cosa usi per il tema, che cosa per le note, perché, e che cosa hai scartato (base 5).
6. **P06, lista note.** Modello con `id`, `titolo`, `testo`, `data`; `FlatList` con `keyExtractor`, data in italiano e messaggio per la lista vuota (intermedio 6).

   Comportamento atteso:

   ```text
   Prima apertura: "Nessuna nota."
   Con tre note: 3 righe, date nel formato 07/11/2026
   ```

7. **P06, creazione.** Editor con titolo e testo; Salva rifiuta il titolo vuoto, crea la nota e torna alla lista con la nota in cima (intermedio 7).

   Output atteso:

   ```text
   Titolo vuoto: resta nell'editor con "Il titolo è obbligatorio."
   Titolo "Spesa": torna alla lista, la nota è la prima
   ```

8. **P06, modifica.** Tocca una nota, apri l'editor con i campi pieni, salva: la nota resta la stessa e cambia la data (intermedio 8). Comportamento atteso: il titolo diventa "Spesa settimanale" e la nota mantiene la posizione.
9. **P06, eliminazione.** Pulsante Elimina nell'editor con finestra di conferma; dopo la conferma si torna alla lista aggiornata (intermedio 9). Comportamento atteso: da 3 note a 2, e la nota non ricompare al riavvio.
10. **P06, ricerca.** Filtro su titolo e testo, senza distinguere maiuscole e minuscole, con contatore dei risultati (intermedio 10).

    Output atteso:

    ```text
    Ricerca "PANE": 1 risultato, "1 di 4"; "xyz": 0 risultati
    Campo svuotato: di nuovo 4 note
    ```

11. **Campo riutilizzabile.** Componente `Campo` con etichetta, valore, `onChangeText`, errore e stile del bordo; usalo in due form diversi (intermedio 11). Con errore: bordo rosso e messaggio sotto; senza errore: bordo neutro.
12. **Validazione completa.** Form con titolo obbligatorio, email valida e password di almeno 8 caratteri; errori sotto i campi e salvataggio bloccato finché non sono corretti (avanzato 12).

    Output atteso:

    ```text
    Tutti vuoti: tre messaggi, nessun salvataggio
    Campi corretti: salvataggio eseguito
    ```

13. **P07, login mock.** Login e Registrazione con utente demo; credenziali errate mostrano un messaggio, credenziali corrette salvano la sessione e portano al Profilo (avanzato 13).

    Output atteso:

    ```text
    Password sbagliata: "Email o password non corretti."
    Accesso corretto: Profilo salvato e persistente
    ```

14. **P07, profilo e logout.** Profilo con nome ed email, pulsante Esci che cancella la sessione e riporta al Login (avanzato 14). Comportamento atteso: dopo l'uscita nessun dato resta visibile e al riavvio compare il Login.
15. **Protezione e rifinitura.** Sposta la logica di sessione in `sessione.js`, decidi le schermate da `utente` e `pronto`, togli i doppioni e chiudi con un commit che spiega il perché delle scelte (avanzato 15). Comportamento atteso: nessun accesso al Profilo senza utente e nessun lampeggio del Login durante la lettura.

### Varianti

- Sostituisci AsyncStorage con MMKV in un ramo separato e annota che cosa cambia nel codice e che cosa nella build.
- Aggiungi alle note un campo `colore` e mostra un pallino nella lista, senza toccare il resto del modello.
- Nella ricerca evidenzia la parola trovata e aggiungi l'ordinamento per titolo oltre che per data.
- Sposta il tema in Zustand e confronta il numero di righe con la versione Context.
