# Fase 8: Progetto finale e pubblicazione (giorni 99-120)

**Obiettivo:** portare un'app dalla scelta del problema alla pubblicazione, trattando dati, sessioni, errori e schermate vuote come percorsi normali e non come imprevisti.

### Percorso dei giorni

| Giorni | Argomento | Esercizio |
| --- | --- | --- |
| 99-100 | Scelta del progetto, scope minimo, wireframe e flusso | 1, 2 |
| 101 | Modello dati e tipi TypeScript | 3 |
| 102 | Repository pulito, struttura, TypeScript, lint | 4 |
| 103-104 | Navigazione con stack e tab, design system | 5, 6 |
| 105 | Stato globale scelto e giustificato | 7 |
| 106 | Livello dati: leggere, salvare, aggiornare, eliminare | 8 |
| 107 | Autenticazione mock e sessione salvata | 9 |
| 108-109 | CRUD core e funzionalità secondarie | 10, 11 |
| 110-111 | Offline, cache e funzionalità del dispositivo | 12, 13 |
| 112-115 | Rifiniture, test, performance, accessibilità | 14 |
| 116-120 | Sicurezza, build, materiali, rilascio | 15 |

### Scegliere il progetto e definire lo scope minimo

Il progetto si sceglie da un problema che conosci, non da una tecnologia che vuoi provare. Cinque tracce praticabili in venti giorni: **spese** (importo, categoria, data, totale del mese), **ricette** (ingredienti, passi, ricerca), **fitness** (allenamenti, durata, serie), **note avanzate** (tag, ricerca, archivio), **feed semplice** (post, like, aggiornamento dall'alto). Le prime tre hanno dati facili da inventare e da verificare; il feed richiede più stati di caricamento e quindi più tempo.

Lo scope minimo si scrive in una frase verificabile: "l'app permette a una persona di registrare una spesa in meno di quindici secondi e di ritrovarla dopo il riavvio". Tutto ciò che non entra in quella frase è fuori ambito e va elencato: serve a dire di no a te stesso al giorno 110, quando arriva l'idea che sposta il progetto di una settimana. Il wireframe si disegna su carta in mezz'ora: cinque riquadri, una freccia per ogni tocco, e per ogni schermata le tre facce (contenuto, vuoto, errore). Se l'azione principale richiede più di tre tocchi, il problema è nel flusso, non nella grafica.

```text
Flusso: Home → Spese → Nuova spesa → Spese → Dettaglio → Modifica
Fuori ambito: login social, sincronizzazione cloud, notifiche push, condivisione
Criterio: aggiungo "Caffè 1,20" e lo ritrovo dopo il riavvio, in meno di 15 secondi
```

### Modello dati e tipi TypeScript

Il modello è la parte che sopravvive alle schermate: se è sbagliato, ogni schermata diventa una correzione. Tre decisioni contano più delle altre: come si identifica un elemento, come si rappresentano i numeri con la virgola e come si rappresentano le date.

```ts
type Categoria = "casa" | "trasporti" | "cibo" | "svago";

interface Spesa {
  id: string;
  descrizione: string;
  importo: number;
  data: string;
  categoria: Categoria;
  nota?: string;
}
```

`id` è una stringa generata alla creazione, non la posizione nella lista: la posizione cambia appena elimini qualcosa. `importo` è in centesimi, perché `0.1 + 0.2` non fa `0.3` e i totali con i decimali si sbagliano di un centesimo. `data` è una stringa ISO (`2026-03-14`), ordinabile e senza fuso orario. I valori derivati, come il totale del mese, non si salvano: si calcolano, così non possono essere incoerenti con le righe.

```text
Spesa: { id: "s1", descrizione: "Caffè", importo: 120, data: "2026-03-14", categoria: "cibo" }
Totale marzo: 120 centesimi → "1,20 €"
```

### Repository, struttura e livello dati

Il repository nasce il primo giorno, non l'ultimo: commit piccoli raccontano le decisioni e permettono di tornare indietro. Insieme al repository si impostano TypeScript strict, lint e formattazione, così lo stile non diventa un argomento di discussione al giorno 115.

```text
src/
  components/   Button.tsx, Input.tsx, Card.tsx, Text.tsx, StatoVuoto.tsx
  screens/      SpeseScreen.tsx, DettaglioScreen.tsx, NuovaSpesaScreen.tsx
  navigation/   Navigatore.tsx, tipi.ts
  hooks/        useSpese.ts, useSessione.ts
  services/     speseService.ts, authService.ts
  utils/        importi.ts, date.ts
  types/        spesa.ts
```

Il livello dati espone quattro operazioni e nasconde dove vivono i dati: oggi storage locale, domani un server, senza toccare le schermate. Per venti elementi salvare l'intera lista è semplice e prevedibile; con dati grandi servirebbe un'operazione per elemento, e la scelta va scritta nel README con il motivo.

```ts
export const speseService = {
  elenca: async (): Promise<Spesa[]> => {
    const grezzo = await AsyncStorage.getItem(CHIAVE);
    return grezzo ? (JSON.parse(grezzo) as Spesa[]) : [];
  },
  salva: async (spese: Spesa[]): Promise<void> =>
    AsyncStorage.setItem(CHIAVE, JSON.stringify(spese)),
};
```

### Navigazione e design system

La navigazione si costruisce con schermate vuote ma collegate: prima si verifica che ogni tocco porti dove deve, poi si riempie il contenuto. Tab per le aree stabili, stack per i dettagli che si aprono e si chiudono.

```tsx
<Tab.Navigator>
  <Tab.Screen name="Spese" component={SpeseScreen} />
  <Tab.Screen name="Riepilogo" component={RiepilogoScreen} />
  <Tab.Screen name="Impostazioni" component={ImpostazioniScreen} />
</Tab.Navigator>
```

Il design system è un file di valori e quattro componenti: `Text`, `Button`, `Input`, `Card`. Colori e spaziature vivono in un solo posto, e ogni schermata usa quelli.

```ts
export const colori = { testo: "#111827", sfondo: "#F9FAFB", primario: "#1D4ED8", errore: "#B91C1C" };
```

Un pulsante con tre varianti (primario, secondario, pericolo) e uno stato disabilitato evita venti stili copiati. Il contrasto si verifica subito: testo scuro su sfondo chiaro, almeno 4.5:1; un colore "elegante" ma illeggibile è un difetto, non una scelta.

### Stato globale, autenticazione e sessione

Nello stato globale finisce solo ciò che serve a più schermate: sessione, tema, elenco condiviso. Testo dell'input, caricamento di una singola schermata e messaggi di errore restano locali. La scelta tra Context e store esterno dipende dalla frequenza degli aggiornamenti: Context basta per sessione e tema, uno store aiuta quando molti componenti scrivono spesso.

L'autenticazione finta serve a provare i percorsi difficili: login, token scaduto, logout, riapertura dell'app.

```ts
interface Sessione {
  token: string;
  utente: string;
  scadenza: string;
}
const accedi = async (email: string, password: string): Promise<Sessione> => {
  if (email.trim() === "" || password.length < 4) {
    throw new Error("Credenziali non valide.");
  }
  return { token: "demo-token", utente: email, scadenza: "2026-12-31" };
};
```

Il token va salvato in `SecureStore`, non in `AsyncStorage`: il primo è protetto dal sistema, il secondo è un file leggibile. All'avvio si legge la sessione, si controlla la scadenza e solo dopo si decide quale schermata mostrare. Il logout cancella il token e riporta al login, chiedendo conferma se ci sono modifiche non sincronizzate.

### Funzionalità core, secondarie, offline e dispositivo

Il CRUD core è un flusso unico: elenco, dettaglio, creazione, modifica, eliminazione con conferma. Ogni passo aggiorna la lista nello stesso modo, e ogni scrittura passa dal servizio.

Ricerca, filtri e preferiti sono **viste** sui dati, non copie: si calcolano con funzioni pure e non si salvano come liste separate, altrimenti le due versioni divergono. Il preferito è un campo booleano sull'elemento, non un secondo elenco.

Offline significa tre regole: la lettura parte sempre dalla cache locale, le scritture si accodano se la rete manca, l'interfaccia dice cosa è sincronizzato e cosa no. Un errore di rete non è un motivo per cancellare dati.

```text
Aggiungo una spesa in modalità aereo: compare subito con etichetta "Da sincronizzare"
Chiudo e riapro: la spesa è ancora lì, etichetta invariata
Torno online e premo "Sincronizza": etichetta sparisce, coda 0
```

La funzionalità del dispositivo si sceglie in base al progetto: fotocamera per la ricevuta, posizione per il luogo della spesa, notifiche per il promemoria serale. In tutti i casi esiste il percorso "permesso negato": messaggio che spiega a cosa serve e come attivarlo nelle impostazioni, senza bloccare il resto dell'app.

### Rifiniture, test, performance e accessibilità

Ogni schermata ha quattro stati: caricamento, contenuto, vuoto, errore. Lo stato vuoto spiega cosa fare ("Nessuna spesa questo mese. Aggiungine una."), l'errore offre un'azione ("Riprova"), il caricamento non blocca i pulsanti già pronti. Le animazioni durano 150-250 ms: più lunghe sembrano lente, più corte sembrano scatti. I test coprono i percorsi critici, non le decorazioni: aggiungere, modificare, eliminare, login, sessione scaduta, salvataggio offline. Per la performance: liste con chiavi stabili e `getItemLayout`, immagini ridimensionate prima del caricamento, nessun `console.log` nella build, tempo di avvio misurato sulla build reale e non solo in sviluppo.

Accessibilità: contrasto almeno 4.5:1, aree toccabili di almeno 44x44 punti, `accessibilityLabel` sui pulsanti con sola icona, testo che regge l'ingrandimento di sistema senza tagliare contenuto, ordine di lettura coerente con l'ordine visivo.

```text
Testo di sistema al 150%: i titoli vanno a capo, nessun testo tagliato
Contrasto grigio su bianco 3.1:1 → insufficiente, si scurisce il grigio
```

### Sicurezza di base, build e rilascio

Nel codice non entrano segreti: né chiavi, né password, né URL privati. Le variabili `EXPO_PUBLIC_` finiscono dentro l'app e chiunque può leggerle, quindi sono adatte solo a valori pubblici; se serve una chiave, la chiamata passa da un servizio esterno che la custodisce. L'input si valida sempre, anche quando il campo sembra controllato: l'utente può incollare qualsiasi cosa.

La build si fa con `eas-cli`, dopo aver configurato `eas.json` con un profilo di anteprima e uno di produzione; il comando è `eas build --platform android --profile preview`. La build reale è obbligatoria: Expo Go non riproduce icone, splash, permessi e alcuni bug di runtime.

```text
Build di anteprima: APK installato sul telefono di prova
Avvio a freddo: 3 secondi, icona corretta, splash senza salti
Permesso fotocamera negato: messaggio con istruzioni, resto dell'app utilizzabile
```

Per lo store servono icona 1024x1024, splash coerente, almeno quattro screenshot con didascalia e una descrizione che dica a chi serve l'app in due righe. In alternativa, la presentazione su GitHub: README con demo, screenshot, funzionalità, stack, avvio in tre comandi, test, scelte e limiti noti.

### Le tappe 99-120

| Giorno | Cosa fai | Fatto quando |
| --- | --- | --- |
| 99 | scegli traccia, utenti, problema | scrivi cinque funzionalità e i casi limite |
| 100 | wireframe e flusso su carta | ogni schermata ha contenuto, vuoto, errore |
| 101 | modello dati e tipi | compila e copre anche i campi derivati |
| 102 | repository, struttura, strict, lint | primo commit, app avviata, nessun `.env` tracciato |
| 103 | stack e tab con placeholder | ogni tab e ogni dettaglio si apre e si chiude |
| 104 | design system | pulsanti, input, card e testi usano i token |
| 105 | stato globale | sessione e dati condivisi in un solo posto |
| 106 | livello dati | leggere, salvare, aggiornare, eliminare dal servizio |
| 107 | login mock e sessione | riavvio: sessione ripristinata o login richiesto |
| 108 | CRUD core | creo, modifico, elimino e la lista resta coerente |
| 109 | ricerca, filtri, preferiti | ricerca vuota e senza risultati gestite |
| 110 | offline e cache | modalità aereo: dati visibili, coda dichiarata |
| 111 | funzionalità dispositivo | permesso concesso e negato funzionano |
| 112 | animazioni e rifiniture | quattro stati per schermata, transizioni brevi |
| 113 | test critici | percorsi core coperti, test verdi |
| 114 | performance | lista fluida, immagini leggere, zero log |
| 115 | accessibilità | contrasti, etichette, testo ingrandito verificati |
| 116 | sicurezza | nessun segreto, variabili pubbliche dichiarate |
| 117 | build di anteprima | APK installato da file, non da Expo Go |
| 118 | test su dispositivo reale | bug di runtime corretti e annotati |
| 119 | materiali store o presentazione | icona, splash, screenshot, descrizione pronti |
| 120 | rilascio o demo, README, retrospettiva | link o file consegnabile, README completo |

### Come ragionare: dal problema allo schermo

**Esempio guidato 1 — Aggiungere una spesa e ritrovarla dopo il riavvio**

**Problema.** Una persona annota le spese su carta e a fine mese non sa dove sono finiti i soldi. Vuole registrare una spesa in pochi secondi, vedere il totale del mese e ritrovare tutto anche senza rete.

**Dati.** `Spesa` con `id`, `descrizione`, `importo` in centesimi, `data` ISO, `categoria`. Il totale del mese è derivato: si somma ciò che è già in memoria.

**Stato.** `spese` globale, `filtroMese` nella schermata elenco, `salvataggio` nel form, `errore` locale. Il testo digitato non serve a nessun altro: resta nel form.

**Schermate ed eventi.** Elenco con totale e mese; form con descrizione, importo, categoria; dettaglio con modifica ed eliminazione. Eventi: salva, annulla, elimina con conferma, cambia mese.

**Casi limite.** Importo vuoto, non numerico o zero; descrizione vuota; doppio tocco su Salva; storage che rifiuta la scrittura; mese senza spese.

```tsx
const salva = async () => {
  const centesimi = Math.round(Number(importo.replace(",", ".")) * 100);
  if (!Number.isFinite(centesimi) || centesimi <= 0) {
    setErrore("Inserisci un importo maggiore di zero.");
    return;
  }
  setSalvataggio(true);
  const nuova: Spesa = {
    id: String(Date.now()),
    descrizione: descrizione.trim() || "Senza descrizione",
    importo: centesimi,
    data: new Date().toISOString().slice(0, 10),
    categoria,
  };
  await speseService.salva([nuova, ...spese]);
  setSpese((attuali) => [nuova, ...attuali]);
  navigation.goBack();
};
```

```text
Inserisco "Caffè", "1,20", categoria cibo, Salva:
  elenco: "Caffè · 1,20 €" in cima, totale marzo 1,20 €
  chiudo e riapro l'app: "Caffè · 1,20 €" ancora presente
Importo "abc": "Inserisci un importo maggiore di zero.", nessuna scrittura
Mese senza spese: "Nessuna spesa questo mese. Aggiungine una."
```

Le decisioni: l'importo si converte in centesimi prima di salvare, così il totale non accumula errori; l'`id` nasce con l'elemento e non dalla posizione; il totale si calcola e non si salva; il salvataggio attende la scrittura e solo dopo aggiorna la lista, così un errore di storage non lascia in interfaccia un dato che non esiste; il flag `salvataggio`, che qui non viene azzerato per brevità, va ripristinato in `finally` e tiene il pulsante disabilitato, ed è ciò che impedisce il doppio inserimento; un errore del servizio mostra un messaggio e lascia il form aperto. La descrizione vuota non è un errore bloccante: un titolo di riserva è più utile di un rifiuto.

**Esempio guidato 2 — Sessione scaduta con rete assente**

**Problema.** L'app viene aperta dopo due settimane, il token è scaduto e il telefono è in modalità aereo. L'utente deve capire cosa succede e non perdere le modifiche fatte offline.

**Dati.** `Sessione` con `token`, `utente`, `scadenza`; una coda di modifiche pendenti con l'`id` dell'elemento e l'operazione.

**Stato.** `sessione`, `statoRete`, `coda`, `messaggio`. La coda è persistente: sopravvive alla chiusura dell'app.

**Schermate ed eventi.** Login con messaggio, elenco con banner "Offline", impostazioni con "Esci". Eventi: apertura app, salvataggio offline, "Riprova", logout.

**Casi limite.** Token scaduto all'avvio, rete che cade durante il salvataggio, logout con coda piena, credenziali vuote.

```ts
const scaduta = (s: Sessione) => new Date(s.scadenza).getTime() < Date.now();

const ripristina = async () => {
  const grezzo = await SecureStore.getItemAsync("sessione");
  if (!grezzo) return;
  const salvata = JSON.parse(grezzo) as Sessione;
  if (scaduta(salvata)) {
    await SecureStore.deleteItemAsync("sessione");
    setMessaggio("Sessione scaduta. Accedi di nuovo.");
    return;
  }
  setSessione(salvata);
};
```

```text
Avvio con token scaduto e rete assente:
  1. login con "Sessione scaduta. Accedi di nuovo."
  2. le spese locali non vengono cancellate
  3. login con credenziali demo: elenco con 3 spese, coda invariata
Salvataggio senza rete: la spesa appare con "Da sincronizzare"; al ritorno della rete l'etichetta sparisce, coda 0
Logout con 2 modifiche in coda: "Hai 2 modifiche non sincronizzate. Uscire comunque?"
```

Le decisioni: la sessione sta in `SecureStore` perché è una credenziale; la scadenza si controlla all'avvio e non al primo errore, così l'utente non scopre il problema a metà lavoro; un errore di rete non tocca i dati locali, che sono l'unica copia esistente; la coda è visibile, perché una sincronizzazione silenziosa che fallisce è peggio di un'etichetta; il logout chiede conferma solo quando c'è qualcosa da perdere, altrimenti diventa un ostacolo.

### Come ragiona un informatico

- **Definisce "fatto" prima di scrivere.** Un criterio verificabile ("ritrovo la spesa dopo il riavvio") evita di rifinire dettagli mentre il flusso principale è rotto.
- **Progetta le schermate per stati, non per pixel.** Ogni schermata ha caricamento, contenuto, vuoto, errore: il codice nasce già con i quattro casi.
- **Tratta i dati locali come la verità disponibile.** Se il server non risponde, l'app mostra e conserva ciò che ha; cancellare per un timeout è una perdita, non una pulizia.
- **Taglia lo scope con una decisione.** Ciò che esce dallo scope finisce nella sezione "Limiti noti", non resta a metà.
- **Non mette segreti nel client.** Il telefono è in mano all'utente: tutto ciò che è nell'app può essere letto.
- **Considera la pubblicazione parte del lavoro.** Build, icona, screenshot, README e test sul dispositivo sono consegna, non extra.

### Errori comuni

- **Scope troppo grande.** Causa: entusiasmo iniziale e funzionalità che sembrano piccole. Correzione: tre funzionalità core, il resto in "Limiti noti"; ogni aggiunta toglie tempo ai test.
- **Importi salvati come numeri con la virgola.** Causa: sembra naturale. Correzione: centesimi interi e formattazione solo in visualizzazione.
- **Login finto che non scade mai.** Causa: si prova solo il caso felice. Correzione: sessione con scadenza e logout per verificare i percorsi difficili.
- **Cancellare i dati locali dopo un errore di rete.** Causa: si confonde "non sincronizzato" con "corrotto". Correzione: separare errore di sincronizzazione e reset esplicito dell'utente.
- **Token reale in `AsyncStorage`.** Causa: è la prima cosa che si trova. Correzione: `SecureStore` per le credenziali, `AsyncStorage` solo per dati non sensibili.
- **Chiave API nel codice.** Causa: funziona subito. Correzione: variabili d'ambiente per valori pubblici, nessuna chiave nell'app, chiamata tramite servizio.
- **Test solo in Expo Go.** Causa: è comodo. Correzione: build di anteprima installata da file, avvio a freddo, permessi e icona verificati.
- **Rilascio senza materiali.** Causa: si arriva al giorno 120 con l'app e senza screenshot. Correzione: preparare icona, splash e screenshot al giorno 119.

### Esercizi progressivi

1. **Scelta e scope.** Scegli la traccia e scrivi problema, due utenti, cinque funzionalità, cinque schermate, fuori ambito e tre criteri misurabili (base 1).
   Output atteso:
   ```text
   Funzionalità core: 3 · secondarie: 2 · fuori ambito: 4
   Criterio: aggiungo una spesa in meno di 15 secondi e la ritrovo dopo il riavvio
   ```
2. **Wireframe e flusso.** Disegna cinque schermate su carta con le tre facce (contenuto, vuoto, errore) e descrivi il percorso dell'azione principale (base 2). Criterio: nessun passaggio richiede più di tre tocchi.
3. **Modello dati.** Scrivi i tipi in `src/types`, con identificativo stabile, importi in centesimi e date ISO (base 3). Criterio: nessun `any`; `Spesa` non contiene il totale del mese, che si calcola.
4. **Repository e struttura.** Crea repository, `.gitignore`, TypeScript strict, lint, formattazione e le cartelle previste (base 4).
   Output atteso:
   ```text
   git log --oneline → "Struttura iniziale e tipi del modello"
   npx tsc --noEmit    → (nessun output)
   ```
5. **Navigazione con placeholder.** Stack e tab collegate, ogni schermata con titolo e un pulsante che porta avanti nel flusso (base 5). Criterio: si torna indietro da ogni schermata.
   Comportamento atteso: tab Spese → dettaglio → indietro torna alla lista con lo stesso mese selezionato.
6. **Design system.** Crea `Text`, `Button`, `Input`, `Card` con varianti e token di colore e spaziatura (intermedio 6). Criterio: nessun colore scritto a mano nelle schermate.
7. **Stato globale.** Scegli Context o store esterno, motiva la scelta nel README e sposta sessione e dati condivisi (intermedio 7). Criterio: una sola fonte per ogni dato condiviso.
8. **Livello dati.** Implementa `elenca`, `crea`, `aggiorna`, `elimina` nel servizio, con gestione degli errori (intermedio 8). Criterio: le schermate non conoscono lo storage.
9. **Autenticazione e sessione.** Login mock con scadenza, sessione in `SecureStore`, ripristino all'avvio, logout con conferma se ci sono modifiche in coda (intermedio 9).
   Output atteso:
   ```text
   Email vuota: "Credenziali non valide."
   Riavvio con token scaduto: login, "Sessione scaduta. Accedi di nuovo."
   ```
10. **CRUD core.** Completa creazione, lettura, modifica ed eliminazione con conferma, aggiornando la lista dopo ogni scrittura (intermedio 10).
    Output atteso:
    ```text
    Creo "Caffè 1,20" → 1 riga, totale 1,20 €
    Modifico in "Caffè 1,50" → totale 1,50 €
    Elimino → 0 righe, "Nessuna spesa questo mese."
    ```
11. **Ricerca, filtri e preferiti.** Aggiungi ricerca per testo, filtro per categoria e preferiti come campo booleano (intermedio 11). Criterio: ricerca vuota restituisce tutto, nessun risultato ha un messaggio dedicato.
    Output atteso:
    ```text
    Ricerca "caf" → 1 risultato · ricerca "   " → 5 · "zzz" → "Nessun risultato"
    Preferiti attivi → 2 elementi, badge nell'header
    ```
12. **Offline e cache.** Leggi sempre dalla cache, accoda le scritture senza rete, mostra "Da sincronizzare" e il conteggio della coda (avanzato 12).
    Output atteso:
    ```text
    Modalità aereo: 3 spese visibili, banner "Offline"
    Aggiungo: 4 righe, 1 "Da sincronizzare"; sincronizzo: coda 0
    ```
13. **Funzionalità dispositivo.** Aggiungi fotocamera, posizione o notifiche, con percorso dedicato al permesso negato (avanzato 13). Criterio: l'app resta utilizzabile senza permesso.
    Comportamento atteso: permesso negato → messaggio con istruzioni, nessun crash, resto dell'app funzionante.
14. **Test, accessibilità e performance.** Scrivi i test dei percorsi critici, verifica contrasti ed etichette, misura la lista con 500 elementi (avanzato 14). Criterio: test verdi, zero violazioni critiche, nessun log nella build.
    Output atteso:
    ```text
    Tests: 9 passed, 9 total
    Lista 500 elementi: scroll fluido, nessun avviso di chiave
    ```
15. **Build, README e presentazione.** Crea la build di anteprima, installala da file, scrivi il README con demo, stack, avvio, test, scelte e limiti, prepara cinque minuti di presentazione (avanzato 15).
    Output atteso:
    ```text
    eas build --platform android --profile preview → build completata
    Installazione da file: avvio a freddo in 3 secondi, README con 6 sezioni
    ```

### Criteri di verifica

Prima di dichiarare finito il progetto, ogni caso va provato sul dispositivo, non solo nel simulatore, con test verdi e zero segreti nel codice.

| Caso | Comportamento atteso | Come verificarlo |
| --- | --- | --- |
| Rete assente | dati locali visibili, banner offline, scritture in coda | modalità aereo, aggiungi e riapri |
| Sessione scaduta | login con messaggio, dati locali intatti | token con scadenza passata |
| Input non valido | messaggio vicino al campo, salvataggio bloccato | importo `abc`, descrizione vuota |
| Lista vuota | messaggio con azione primaria, nessun errore | primo avvio, oppure elimina tutto |
| Testo lungo | due righe con ellissi in lista, testo completo nel dettaglio | descrizione da 200 caratteri |
| Permesso negato | spiegazione e istruzioni, resto dell'app utilizzabile | nega fotocamera e notifiche |
| Doppio tocco | una sola scrittura, pulsante disabilitato | tocco rapido su Salva |

### Varianti

- Sostituisci lo storage locale con un backend gestito, mantenendo lo stesso servizio: le schermate non devono cambiare.
- Prepara una presentazione registrata di cinque minuti con demo e limiti noti, utile anche come materiale per il portfolio.
- Riduci l'app a una sola schermata principale: serve a capire quali funzionalità sono davvero irrinunciabili.
