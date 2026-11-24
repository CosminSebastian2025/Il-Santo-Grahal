# Introduzione a React Native

**Obiettivo:** costruire app per telefono partendo da zero, in 120 giorni e 12 progetti progressivi. Non si tratta solo di imparare comandi: si tratta di imparare a trasformare un'esigenza in schermate, dati e stati, e a capire perché ogni scelta funziona su un dispositivo vero.

### Cos'è React Native e perché studiarlo

React Native è un modo di scrivere app mobili usando JavaScript e React. Non produce una pagina web dentro un browser: produce componenti nativi, cioè gli stessi pulsanti, testi e liste che il sistema operativo del telefono sa disegnare. Da una sola base di codice si ottiene un'app Android e, con un computer Mac, anche iOS.

Rispetto al web cambiano tre cose, e sono quelle che confondono all'inizio:

- **Non c'è HTML.** `div` diventa `View`, `p` e `span` diventano `Text`, `button` diventa `Pressable` o `Button`.
- **Non c'è CSS.** Gli stili sono oggetti JavaScript (`{ fontSize: 16 }`) creati con `StyleSheet.create`.
- **Lo schermo è piccolo e il dito è impreciso.** Le liste lunghe richiedono `FlatList`, i form devono convivere con la tastiera, i tocchi devono avere un'area abbastanza grande.

Il resto del ragionamento è identico a React: dati che cambiano, componenti che ricevono props, stato che produce l'interfaccia.

### Il percorso in 8 fasi

| Fase | Giorni | Tema | Progetti |
| --- | --- | --- | --- |
| 1 | 1-14 | JavaScript e ambiente | P00 ambiente, mini script |
| 2 | 15-28 | React base | P02 contatore, form contatto |
| 3 | 29-42 | React Native base | P01 biglietto, P03 lista della spesa |
| 4 | 43-56 | Navigazione, API e dati | P04 rubrica, P05 app API |
| 5 | 57-70 | Stato, storage e form | P06 note offline, P07 login mock |
| 6 | 71-84 | Fotocamera, posizione, animazioni | P08 foto e posizione, P09 onboarding |
| 7 | 85-98 | TypeScript, test e performance | P10 refactor, P11 qualità |
| 8 | 99-120 | Progetto finale e pubblicazione | P12 app completa |

I giorni sono un ritmo suggerito, non una scadenza. Se una fase richiede il doppio, si prende il doppio: la velocità non è una competenza, la comprensione sì.

### Come ragionare (e come si applica)

#### Dove si applica

- **App di consegne**: una lista di ordini, uno stato per ordine (in attesa, in viaggio, consegnato), una schermata di dettaglio. Ogni modifica all'ordine deve aggiornare la lista senza ricaricare tutto.
- **Diario fitness**: si inseriscono allenamenti con data, durata e note; si mostrano statistiche settimanali. I dati devono restare dopo la chiusura dell'app, quindi servono storage locale e un modello dati stabile.
- **Note offline**: creare, leggere, modificare ed eliminare testi senza connessione. La rete non è garantita: l'app deve funzionare anche quando il telefono è in modalità aereo.
- **Feed sociale**: si caricano dati da un server, si mostra il caricamento, si gestiscono errori e si aggiorna con il gesto pull-to-refresh. Lo stato non è mai solo "dati": è caricamento, errore oppure contenuto.
- **Gestionale di magazzino**: si scansiona un codice con la fotocamera, si cerca un prodotto, si modifica la quantità. Qui contano validazione, permessi e messaggi chiari quando qualcosa non torna.

In tutti questi casi il lavoro dell'informatico è sempre lo stesso: capire quali dati servono, decidere dove vivono, disegnare la schermata che li mostra e prevedere che cosa succede quando i dati mancano o arrivano tardi.

#### La logica in sei passi

1. **Riformula il problema** con parole tue, senza termini tecnici. "Devo ricordarmi cosa comprare" prima di "devo usare FlatList".
2. **Elenca i dati**: che cosa serve, con che campi, e quale campo identifica ogni elemento.
3. **Disegna il flusso**: quali schermate, quale tocco porta da una all'altra, dove si torna indietro.
4. **Decidi lo stato**: che cosa cambia nel tempo (lista, filtro, testo cercato, caricamento) e dove deve vivere.
5. **Scrivi la versione minima**: dati finti in memoria, una schermata, nessuna grafica rifinita.
6. **Aggiungi i casi difficili**: lista vuota, errore di rete, input sbagliato, rotazione dello schermo, testo lungo.

Il punto 4 è quello che fa fallire più progetti: se lo stato è sparso in cinque componenti, ogni modifica richiede passaggi ovunque. Se lo stato è in un solo posto chiaro, il resto diventa conseguenza.

#### Esempio guidato 1: lista della spesa con stato e persistenza

**Problema.** Aggiungere prodotti, segnarli come comprati, eliminarli, e ritrovarli alla riapertura.

**Dati.** Un prodotto ha `id`, `nome`, `comprato`. L'`id` non è il nome: due prodotti possono chiamarsi uguale.

**Stato.** La lista è lo stato principale. Il testo dell'input è un secondo stato temporaneo. La lista filtrata non è stato: si calcola dai dati.

```jsx
const [testo, setTesto] = useState("");
const [prodotti, setProdotti] = useState([]);

const aggiungi = () => {
  const nome = testo.trim();
  if (nome === "") {
    return;
  }
  setProdotti((attuali) => [
    ...attuali,
    { id: String(Date.now()), nome, comprato: false },
  ]);
  setTesto("");
};
```

`setProdotti` riceve una funzione che parte dalla lista attuale: è il modo sicuro di aggiornare quando il nuovo valore dipende dal precedente. `[...attuali, nuovo]` crea una lista nuova invece di modificare quella vecchia, perché React capisce il cambiamento confrontando i riferimenti.

**Interfaccia.** Una `FlatList` con `keyExtractor` stabile e una riga che contiene nome e due azioni.

```jsx
<FlatList
  data={prodotti}
  keyExtractor={(item) => item.id}
  ListEmptyComponent={<Text>Nessun prodotto. Aggiungine uno.</Text>}
  renderItem={({ item }) => (
    <View style={styles.riga}>
      <Text style={item.comprato ? styles.comprato : styles.nome}>
        {item.nome}
      </Text>
      <Pressable onPress={() => toggle(item.id)} accessibilityRole="button">
        <Text>{item.comprato ? "Riapri" : "Comprato"}</Text>
      </Pressable>
      <Pressable onPress={() => elimina(item.id)} accessibilityRole="button">
        <Text>Elimina</Text>
      </Pressable>
    </View>
  )}
/>
```

**Casi difficili.** Testo vuoto rifiutato, lista vuota con messaggio, eliminazione dell'elemento attivo, persistenza con `AsyncStorage` dopo ogni modifica.

Comportamento atteso dopo tre aggiunte e un completamento:

```text
Prodotti: 3
Comprati: 1
Riga 2: "Pane" - comprato
```

Il ragionamento da portare a casa: prima i dati, poi lo stato, poi la schermata. Chi comincia dall'interfaccia finisce per mettere la logica dentro il `renderItem`, dove è difficile da testare e da riusare.

#### Esempio guidato 2: caricare dati con tre stati

**Problema.** Mostrare una lista di utenti presa da internet.

**Errore tipico.** Scrivere solo il caso in cui i dati arrivano. Quando la rete è lenta, l'utente vede una schermata vuota e pensa che l'app sia rotta.

**Modello.** Lo stato non è "utenti": è una macchina con tre situazioni possibili, più il caso "nessun risultato".

```jsx
const [utenti, setUtenti] = useState([]);
const [caricamento, setCaricamento] = useState(true);
const [errore, setErrore] = useState("");

useEffect(() => {
  const controller = new AbortController();

  async function carica() {
    try {
      const risposta = await fetch("https://jsonplaceholder.typicode.com/users", {
        signal: controller.signal,
      });
      if (!risposta.ok) {
        throw new Error("Risposta non valida: " + risposta.status);
      }
      setUtenti(await risposta.json());
    } catch (e) {
      if (e.name !== "AbortError") {
        setErrore("Impossibile caricare gli utenti. Riprova.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setCaricamento(false);
      }
    }
  }

  carica();
  return () => controller.abort();
}, []);
```

Nell'interfaccia si legge nell'ordine giusto: prima `caricamento`, poi `errore`, poi lista vuota, infine la lista. Ogni condizione esclude le altre, altrimenti si vedono due messaggi contemporaneamente.

Comportamento atteso:

```text
Subito: ActivityIndicator visibile
Dopo circa 1 secondo: 10 utenti, primo "Leanne Graham"
Con rete disattivata: "Impossibile caricare gli utenti. Riprova." e pulsante Riprova
```

Il ragionamento: un caricamento non è un dettaglio estetico, è uno stato del sistema. Se non lo rappresenti, l'utente non sa che cosa sta succedendo.

#### Esempio guidato 3: leggere un errore invece di indovinare

Messaggio reale:

```text
TypeError: Cannot read property 'nome' of undefined
```

Traduzione: stai leggendo `.nome` su qualcosa che non esiste. Le cause sono tre, in ordine di frequenza: l'elemento non è stato trovato (`find` restituisce `undefined`), la lista è arrivata vuota, la forma dei dati è diversa da quella che credi.

```jsx
const utente = utenti.find((u) => u.id === id); // può essere undefined

if (!utente) {
  return <Text>Utente non trovato.</Text>;
}

return <Text>{utente.nome}</Text>;
```

Il metodo è sempre lo stesso: leggere il messaggio, localizzare la riga, chiedersi "quale valore qui può essere `undefined`?", aggiungere un controllo o un valore di riserva, riprovare. Non si cambia codice a caso finché l'errore sparisce.

#### Tabella di traduzione: dal web al telefono

| Web | React Native | Nota |
| --- | --- | --- |
| `div` | `View` | Contenitore invisibile, layout con flexbox |
| `p`, `span`, `h1` | `Text` | Il testo può stare solo dentro `Text` |
| `button` | `Pressable` | Gestisce il tocco e lo stato premuto |
| `img` | `Image` | Richiede `width` e `height` espliciti per le immagini remote |
| `input` | `TextInput` | Gestisce tastiera, `placeholder`, `keyboardType` |
| scroll della pagina | `ScrollView` / `FlatList` | `FlatList` per liste lunghe |
| `position: fixed` | nessun equivalente diretto | Si usano header di navigazione o overlay assoluti |
| hover | nessun equivalente | Sul telefono esiste solo il tocco |

#### Come ragiona un informatico, in pratica

- **Parte dai casi, non dalle schermate.** Elenca "aggiungi, completa, elimina, riapri" prima di disegnare la lista.
- **Separa i dati dalla loro rappresentazione.** Il prodotto è un oggetto; la card è una funzione che lo disegna. Se domani cambia il design, i dati restano.
- **Fa vivere ogni informazione in un solo posto.** Se il totale appare in due schermate, si calcola da una funzione comune, non si duplica.
- **Tratta gli errori come percorsi normali.** Rete assente, permesso negato, campo vuoto: sono scenari previsti, non imprevisti.
- **Misura prima di ottimizzare.** Un'app lenta si diagnostica con il profiler e con i log, non con "aggiungo `memo` ovunque".
- **Scrive il README mentre costruisce.** Chi riapre il progetto fra un mese deve capire come avviarlo in due minuti.

### Il metodo di studio

Ogni giorno:

1. Leggi la parte teorica per 15-20 minuti.
2. Scrivi codice per 40-80 minuti, senza copiare: chiudi il documento e ricostruisci.
3. Rompi qualcosa di proposito e osserva l'errore: è la parte che insegna di più.
4. Annota tre righe: cosa ho capito, dove mi sono bloccato, cosa provo domani.

Ogni fase si chiude con 15 esercizi progressivi: i primi cinque sono base, sei sono intermedi, quattro sono avanzati. Gli esercizi non sono separati dai progetti: sono le tappe del progetto della fase.

### Strumenti e primo avvio

Servono Node.js LTS, Visual Studio Code, un telefono con l'app Expo Go e lo stesso Wi-Fi del computer.

```bash
node -v
npx create-expo-app@latest mia-app
cd mia-app
npx expo start
```

Il comando mostra un codice QR: si scansiona con Expo Go e l'app parte sul telefono. Se il telefono non si collega, si prova `npx expo start --tunnel`.

Sul computer Windows si può sviluppare per Android; per compilare per iOS serve un Mac. Expo Go permette di provare quasi tutto senza Mac, tranne le funzionalità native particolari.

### Convenzioni del percorso

- Componenti funzionali e hook, niente classi.
- `const` di default, `let` solo quando il valore cambia davvero.
- Stato aggiornato con funzioni e copie (`[...lista, nuovo]`), mai modificando l'array esistente.
- Stili in `StyleSheet.create` in fondo al file, nomi in italiano coerenti.
- Una schermata = un file; i componenti riusabili vanno in `components/`.
- Nessuna chiave segreta nel codice: le variabili pubbliche di Expo iniziano con `EXPO_PUBLIC_` e restano comunque visibili nell'app.
- Ogni esercizio ha un comportamento osservabile: se non sai come verificarlo, non è pronto.

### Come sono organizzate le fasi

Ogni fase contiene:

- i concetti del periodo, con esempi eseguibili;
- una sezione "Come ragionare: dal problema allo schermo" con esempi guidati;
- una sezione "Come ragiona un informatico" con le abitudini di quel dominio;
- gli errori comuni con la spiegazione della causa;
- 15 esercizi progressivi con il risultato atteso;
- alcune varianti per chi vuole approfondire.

### Regola d'oro

Un'app non è un elenco di schermate: è un insieme di dati che cambiano e di regole che li fanno cambiare. Prima si capisce quali sono i dati e le regole, poi si disegna. Se il modello è chiaro, il codice mobile diventa corto; se il modello è confuso, nessuna libreria lo salva.

**FINE DELL'INTRODUZIONE**
