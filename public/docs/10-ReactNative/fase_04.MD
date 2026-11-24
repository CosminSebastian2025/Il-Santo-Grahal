# Fase 4: Navigazione, API e dati remoti (giorni 43-56)

**Obiettivo:** spostarsi tra schermate senza perdere il filo, portare dati da un'API dentro una lista e gestire caricamento, errori e ricerca, fino alla rubrica locale e all'app collegata a jsonplaceholder.

| Giorno | Argomento | Esercizio |
| --- | --- | --- |
| 43 | Expo Router, cartella app/ e stack | 1 |
| 44 | Home e Dettagli, avanti e indietro | 2 |
| 45 | Parametri tra schermate | 3 |
| 46 | Tab Home, Cerca, Profilo | 4 |
| 47 | Header dinamici e cartelle | 5 |
| 48 | P04 rubrica: lista locale | 6 |
| 49 | P04 dettaglio e ricerca | 7, 8 |
| 50 | fetch e lista da API | 9 |
| 51 | ActivityIndicator e azioni disabilitate | 10 |
| 52 | Errori con messaggio e Riprova | 11 |
| 53 | Pull-to-refresh | 12 |
| 54 | Ricerca client-side | 13 |
| 55 | P05: lista remota completa | 14 |
| 56 | P05: dettaglio e casi limite | 15 |

### Expo Router: la navigazione scritta nei file

Con Expo Router ogni file dentro `app/` è una schermata e il nome del file è il percorso: `app/index.jsx` è la Home, `app/dettagli/[id].jsx` risponde a `/dettagli/3`. Dove si usa: in ogni app con più di una schermata. React Navigation resta l'alternativa manuale per chi preferisce dichiarare le rotte nel codice invece che nelle cartelle.

```jsx
// app/_layout.jsx
import { Stack } from "expo-router";

export default function Radice() {
  return <Stack />;
}
```

Il file `_layout.jsx` è il contenitore comune: si disegna una volta e resta mentre le schermate entrano ed escono. Uno stack è una pila: la schermata nuova si appoggia sopra, il tasto Indietro la toglie e mostra quella sotto.

```text
app/
  _layout.jsx         Stack comune
  index.jsx           "/"
  dettagli/[id].jsx   "/dettagli/3"
```

Il ragionamento: il percorso dell'utente è una pila, non una mappa. La Home resta in fondo, ogni dettaglio è un livello sopra, e "indietro" significa sempre "togli l'ultimo livello".

### Stack: andare avanti e tornare indietro

```jsx
import { Link, router } from "expo-router";

<Link href="/dettagli">Apri il dettaglio</Link>
<Pressable onPress={() => router.push("/dettagli")}>Apri</Pressable>
<Pressable onPress={() => router.back()}>Indietro</Pressable>
```

`Link` è la scelta quando l'elemento è un testo o una card che deve sembrare un collegamento; `router.push` serve dentro un'azione, per esempio dopo il salvataggio di un form. `router.back()` torna al livello precedente e coincide con la freccia dell'header e con il tasto Indietro di Android. Dove si usa: menu, card toccabili, ritorno dopo una conferma. `replace` sostituisce la voce in cima invece di aggiungerne una: dopo un accesso riuscito serve `router.replace("/home")`, altrimenti Indietro riporta al modulo di login già compilato.

### Parametri tra schermate

Una schermata di dettaglio deve sapere quale elemento mostrare: l'informazione viaggia nella rotta.

```jsx
import { useLocalSearchParams } from "expo-router";

export default function Dettaglio() {
  const { id } = useLocalSearchParams();
  const contatto = contatti.find((c) => String(c.id) === id);
  if (!contatto) {
    return <Text>Contatto non trovato.</Text>;
  }
  return <Text>{contatto.nome}</Text>;
}
```

Per aprire la schermata si usa `router.push({ pathname: "/dettagli/[id]", params: { id: "3" } })`. I parametri arrivano sempre come stringhe: il confronto va fatto con `String(id)` oppure convertendo con `Number(id)`, altrimenti `3 === "3"` è falso e il dettaglio risulta vuoto. Il caso "non trovato" non è un dettaglio: la rotta si può digitare a mano o arrivare da un collegamento vecchio. Passare l'identificatore e ricercare i dati nella schermata rende il dettaglio indipendente da come ci si è arrivati.

### Tab: tre sezioni sempre a portata

```jsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const icona = (nome) => ({ color, size }) => <Ionicons name={nome} color={color} size={size} />;

<Tabs>
  <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icona("home") }} />
  <Tabs.Screen name="cerca" options={{ title: "Cerca", tabBarIcon: icona("search") }} />
  <Tabs.Screen name="profilo" options={{ title: "Profilo", tabBarIcon: icona("person") }} />
</Tabs>
```

La cartella `app/(tabs)/` è un gruppo: le parentesi dicono a Expo Router di non aggiungere quel nome alla URL. Dentro ci stanno `index.jsx`, `cerca.jsx` e `profilo.jsx`, e `_layout.jsx` descrive la barra in basso.

Dove si usa: quando le sezioni sono poche, di pari importanza e devono restare raggiungibili da qualsiasi punto. Ogni tab conserva il proprio stato finché l'app è aperta: è comodo per la ricerca, è un problema se ci si aspetta che il tab riparta da zero. Icone: `@expo/vector-icons` è già compreso in Expo, non serve installare altro.

### Header e titoli dinamici

```jsx
import { Stack } from "expo-router";

<Stack.Screen options={{ title: "Rubrica", headerBackTitle: "Home" }} />
```

Le `options` si possono mettere nel layout per tutte le schermate o dentro una singola schermata per cambiarle mentre è visibile. Un titolo dinamico si ottiene calcolandolo dai dati: `title: contatto ? contatto.nome : "Dettaglio"`.

Dove si usa: titoli che dipendono dal contenuto, pulsanti nell'header, header nascosto su una schermata di benvenuto. L'organizzazione delle cartelle segue la stessa logica delle rotte: `app/(tabs)/` per le sezioni principali, `app/dettagli/[id].jsx` per i dettagli, `components/` fuori da `app/` per i pezzi riusabili. Un componente messo dentro `app/` diventa una rotta: è l'errore di struttura più comune all'inizio.

### Dati remoti: fetch e i tre stati

`fetch` funziona come nel browser. Per gli esempi si usa `https://jsonplaceholder.typicode.com/users`, un servizio pubblico che non richiede chiavi.

```jsx
const [utenti, setUtenti] = useState([]);
const [caricamento, setCaricamento] = useState(true);
const [errore, setErrore] = useState("");

const carica = async () => {
  setCaricamento(true);
  setErrore("");
  try {
    const risposta = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!risposta.ok) {
      throw new Error("Stato " + risposta.status);
    }
    setUtenti(await risposta.json());
  } catch (e) {
    setErrore("Impossibile caricare i contatti.");
  } finally {
    setCaricamento(false);
  }
};
```

Nell'interfaccia si legge in ordine: prima `caricamento`, che mostra un `ActivityIndicator`, poi `errore`, poi lista vuota, infine la lista. Ogni condizione esclude le altre, altrimenti due messaggi si sovrappongono. Durante il caricamento il pulsante che ripete la richiesta va disabilitato: due tocchi rapidi lanciano due richieste e l'ultima risposta non è per forza la più recente.

### Pull-to-refresh e ricerca client-side

Il gesto di trascinare la lista verso il basso si ottiene con `RefreshControl`, che ha bisogno di due cose collegate allo stato: quando sta aggiornando e cosa fare.

```jsx
<FlatList
  data={visibili}
  keyExtractor={(item) => String(item.id)}
  renderItem={riga}
  refreshControl={
    <RefreshControl refreshing={aggiornamento} onRefresh={carica} />
  }
/>
```

La ricerca è un filtro applicato ai dati già scaricati, non una seconda richiesta e non un secondo stato: `const visibili = utenti.filter((u) => u.name.toLowerCase().includes(cerca.trim().toLowerCase()))`. Salvare `visibili` nello stato creerebbe due verità da tenere allineate a ogni modifica.

Dove si usa: liste che cambiano poco e vanno aggiornate a richiesta (post, contatti, ordini), elenchi dove l'utente cerca un nome tra quelli già presenti. Con migliaia di elementi il filtro va spostato sul server, altrimenti a ogni tasto si scarica tutto.

### Casi limite: lista vuota, rete assente, nessun risultato

Tre situazioni diverse hanno bisogno di tre messaggi diversi, altrimenti l'utente non sa se deve aspettare, correggere la ricerca o controllare la rete.

```text
Dati arrivati ma nessun elemento -> "Nessun elemento disponibile."
Ricerca "zzz" senza risultati    -> "Nessun risultato per «zzz»."
Rete assente o server spento     -> "Controlla la connessione." + pulsante Riprova
```

Il caso "rete assente" in `fetch` produce un errore di tipo `TypeError` con messaggio "Network request failed": va distinto da un 404, che invece significa che il server ha risposto e la risorsa non esiste. Il primo invita a riprovare, il secondo a tornare indietro.

### Come ragionare: dal problema allo schermo

**Esempio guidato 1: la rubrica locale (P04).**

*Problema.* Vedere l'elenco dei colleghi, cercarne uno per nome e aprire la sua scheda.

*Dati.* Otto contatti in `data/contatti.js`, ognuno con `{ id, nome, ruolo, telefono, email }`. Dati costanti: nessuna rete.

*Stato.* Solo `cerca`, il testo digitato nella Home. La lista visibile è calcolata.

*Schermate.* Home con lista e campo di ricerca; Dettaglio in `app/contatti/[id].jsx`.

*Eventi.* Digitare nel campo, toccare una riga, tornare indietro con la freccia.

*Casi limite.* Ricerca senza risultati, `id` inesistente, nome lungo, telefono mancante.

```jsx
// app/(tabs)/index.jsx
const visibili = contatti.filter((c) =>
  c.nome.toLowerCase().includes(cerca.trim().toLowerCase())
);

<TextInput value={cerca} onChangeText={setCerca} placeholder="Cerca un nome" />
<FlatList
  data={visibili}
  keyExtractor={(c) => String(c.id)}
  ListEmptyComponent={<Text>Nessun risultato per «{cerca}».</Text>}
  renderItem={({ item }) => (
    <Link href={{ pathname: "/contatti/[id]", params: { id: String(item.id) } }}>
      <Text>{item.nome}</Text>
    </Link>
  )}
/>
```

```text
Home, campo vuoto: 8 righe in ordine alfabetico
Digitando "an": 2 righe (Anna Bianchi, Giovanni Rossi)
Digitando "zzz": "Nessun risultato per «zzz»."
Tocco su "Anna Bianchi": dettaglio, header "Anna Bianchi"
Indietro: la Home è ancora con "an" nel campo
```

*Decisioni.* Il filtro è una variabile calcolata a ogni render, non uno stato: una sola verità, quella dei contatti. Il parametro è una stringa e si converte solo nel confronto. `Link` intorno alla riga rende il tocco coerente con il resto del sistema e lascia al router la gestione dell'animazione. Il campo di ricerca conserva il testo al ritorno perché la Home non viene smontata: è il comportamento atteso di uno stack.

**Esempio guidato 2: l'app collegata all'API (P05).**

*Problema.* Mostrare gli utenti di jsonplaceholder, aggiornarli con un gesto e aprire la scheda di ognuno.

*Dati.* `GET /users` restituisce dieci oggetti con `id`, `name`, `email`, `phone`; `GET /users/3` restituisce uno solo.

*Stato.* `utenti`, `caricamento`, `errore`, `aggiornamento` (per il refresh) e `cerca`.

*Schermate.* Home con lista e ricerca; Dettaglio che riceve l'`id` e carica l'utente.

*Eventi.* Apertura della app, trascinamento verso il basso, tocco su una riga, tocco su "Riprova".

*Casi limite.* Rete assente, 404 su un `id` inventato, lista vuota, ricerca senza risultati, doppio tocco su Riprova.

```jsx
const visibili = utenti.filter((u) =>
  u.name.toLowerCase().includes(cerca.trim().toLowerCase())
);

if (caricamento) {
  return <ActivityIndicator size="large" />;
}

if (errore !== "") {
  return (
    <View>
      <Text>{errore}</Text>
      <Pressable onPress={carica} accessibilityRole="button">
        <Text>Riprova</Text>
      </Pressable>
    </View>
  );
}

<FlatList
  data={visibili}
  keyExtractor={(u) => String(u.id)}
  ListEmptyComponent={<Text>Nessun utente disponibile.</Text>}
  refreshControl={<RefreshControl refreshing={aggiornamento} onRefresh={carica} />}
  renderItem={({ item }) => <Text>{item.name}</Text>}
/>
```

```text
All'apertura: spinner per circa un secondo
Dopo il caricamento: 10 utenti, primo "Leanne Graham"
Trascinando in basso: spinner in cima, la lista resta visibile
Rete disattivata: "Impossibile caricare i contatti." e pulsante Riprova
/users/999: "Utente non trovato." senza pulsante Riprova
```

*Decisioni.* I tre stati sono esclusivi e si leggono nell'ordine giusto: senza `caricamento` l'utente vede una schermata vuota e pensa a un guasto, senza `errore` crede che non esistano utenti. Il refresh non svuota la lista: `aggiornamento` è separato da `caricamento` proprio per non far sparire i dati già visibili. "Utente non trovato" è un esito previsto e non offre Riprova, perché riprovare darebbe lo stesso risultato.

### Come ragiona un informatico

- **Disegna il flusso prima delle schermate.** Elenca "lista, dettaglio, ritorno, ricerca" e solo dopo apri l'editor: le rotte diventano conseguenza, non improvvisazione.
- **Tratta il percorso come una pila.** Ogni spinta ha un ritorno: se una schermata non ha un modo chiaro di tornare indietro, il flusso è sbagliato.
- **Passa identificatori, non oggetti.** Un `id` sopravvive ai collegamenti esterni, alla ricarica e ai cambi di formato; un oggetto intero no.
- **Rappresenta il caricamento come stato.** Un'attesa non gestita è indistinguibile da un guasto, per chi guarda lo schermo.
- **Distingue guasto ed esito previsto.** 404, campo vuoto e ricerca senza risultati sono risposte normali del sistema; la rete assente è un guasto temporaneo.
- **Calcola invece di duplicare.** Lista filtrata, titolo del dettaglio e contatori derivano dai dati: ogni copia è una verità in più da mantenere allineata.

### Errori comuni

- Mettere un componente dentro `app/`: diventa una rotta e compare nella navigazione. Correzione: spostarlo in `components/`.
- Confrontare `id` numerico con il parametro stringa: `u.id === id` è sempre falso. Correzione: `String(u.id) === id`.
- Chiamare `router.push` dentro il `renderItem` senza funzione: la navigazione parte durante il disegno. Correzione: `onPress={() => router.push(...)}`.
- Dimenticare il caso "id inesistente": `find` restituisce `undefined` e leggere `.nome` manda in crash la schermata. Correzione: controllo prima del render.
- Trattare ogni risposta come valida: senza `risposta.ok` un 404 sembra un successo e `json()` può fallire su un corpo vuoto. Correzione: controllare lo stato e lanciare un errore.
- Mostrare solo il caso "dati arrivati": con rete lenta l'utente vede una lista vuota. Correzione: `caricamento`, `errore`, lista vuota, lista.
- Legare `refreshing` a un valore sempre vero o mai aggiornato: lo spinner resta per sempre o non parte. Correzione: `setAggiornamento(false)` nel `finally`.
- Salvare la lista filtrata in un secondo stato: si disallinea appena i dati cambiano. Correzione: calcolarla con `filter` nel render.

### Esercizi progressivi

1. **Stack con due schermate.** Crea `app/index.jsx` e `app/chi-sono.jsx` con un `_layout.jsx` che monta `<Stack />` (base 1). Comportamento atteso: dalla Home si apre la seconda schermata e la freccia in alto riporta indietro.
2. **Home e Dettagli.** Aggiungi `app/dettagli.jsx`, un pulsante "Apri dettaglio" e un pulsante "Torna alla Home" con `router.back()` (base 2). Comportamento atteso: due livelli nella pila, nessuna voce doppia nell'header.
3. **Parametri di rotta.** Crea `app/contatti/[id].jsx` e passa `id` da tre righe della Home (base 3).

   Output atteso:

   ```text
   Tocco sulla riga 2: header "Dettaglio 2", corpo "Contatto 2"
   ```
4. **Tab navigation.** Crea `app/(tabs)/_layout.jsx` con Home, Cerca e Profilo, ognuna con la sua icona e la sua schermata (base 4). Comportamento atteso: la barra in basso resta visibile e la sezione attiva è evidenziata.
5. **Header dinamico.** Porta il titolo del dettaglio sul nome del contatto e aggiungi `headerBackTitle: "Rubrica"` (base 5). Comportamento atteso: il titolo cambia da "Dettaglio" a "Anna Bianchi" senza toccare il codice del layout.
6. **P04 lista.** Otto contatti in `data/contatti.js`, `FlatList` con `keyExtractor` e `ListEmptyComponent` (intermedio 6).

   Output atteso:

   ```text
   Home: 8 righe, ordine alfabetico, nessun warning in console
   ```
7. **P04 dettaglio con parametri.** Ogni riga apre `contatti/[id]`; la schermata cerca il contatto per `id` e gestisce l'assenza (intermedio 7). Comportamento atteso: `/contatti/99` mostra "Contatto non trovato." senza crash.
8. **P04 ricerca.** Campo di ricerca nella Home con filtro sul nome, insensibile a maiuscole e spazi (intermedio 8).

   Output atteso:

   ```text
   "an"  -> 2 risultati
   " AN " -> gli stessi 2 risultati
   "zzz" -> "Nessun risultato per «zzz»."
   ```
9. **fetch e lista.** Scarica `/users` e mostra nome ed email in una `FlatList` (intermedio 9).

   Output atteso:

   ```text
   10 righe; la prima è "Leanne Graham"
   ```
10. **Loading con ActivityIndicator.** Mostra lo spinner finché la richiesta non finisce e disabilita il pulsante di ricarica (intermedio 10).

    Comportamento atteso:

    ```text
    Primo secondo: spinner al centro, pulsante "Ricarica" disabilitato
    Dopo: lista visibile, pulsante attivo
    ```
11. **Errore e Riprova.** Gestisci il guasto di rete con un messaggio chiaro e un pulsante che ripete la richiesta (intermedio 11).

    Output atteso:

    ```text
    Rete assente: "Controlla la connessione." e pulsante Riprova
    Dopo Riprova con rete attiva: lista di 10 utenti
    ```
12. **Pull-to-refresh.** Aggiungi `RefreshControl` alla lista e mantieni i dati visibili durante l'aggiornamento (intermedio 12).

    Comportamento atteso:

    ```text
    Trascinando: spinner in cima, lista ancora leggibile
    Al rilascio: spinner sparisce dopo la risposta
    ```
13. **Ricerca client-side.** Filtra i dati già scaricati con `TextInput` e `filter`, senza nuove richieste (intermedio 13).

    Output atteso:

    ```text
    "le" -> "Leanne Graham"; "zz" -> "Nessun risultato per «zz»."
    ```
14. **P05 completo.** Lista remota con ricerca, spinner, errore con Riprova e pull-to-refresh nello stesso schermo (avanzato 14).

    Output atteso:

    ```text
    Apertura: spinner, poi 10 utenti
    Ricerca "er": 1 utente
    Rete assente durante il refresh: messaggio, lista precedente ancora visibile
    ```
15. **P05 casi limite.** Gestisci lista vuota, rete assente, ricerca senza risultati e `id` inesistente nel dettaglio (avanzato 15).

    Output atteso:

    ```text
    Lista vuota: "Nessun utente disponibile."
    Ricerca senza esito: "Nessun risultato per «xxx»."
    /utenti/999: "Utente non trovato." senza pulsante Riprova
    ```

### Varianti

- Sostituisci `fetch` con una funzione `useUtenti` in `hooks/` che restituisce dati, caricamento ed errore.
- Aggiungi un tab "Preferiti" che salva gli utenti scelti con AsyncStorage.
- Passa dalla lista piatta a una `SectionList` che raggruppa gli utenti per iniziale del nome.
- Aggiungi un ritardo artificiale di due secondi alla richiesta per verificare spinner e refresh senza rete lenta.
