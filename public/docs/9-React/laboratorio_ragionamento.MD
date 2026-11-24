# Laboratorio di ragionamento: React

**Obiettivo:** allenare il passaggio dalla richiesta alla schermata React, decidendo componenti, stato, valori derivati, effetti e correzioni senza copiare esempi.

### Perché serve un laboratorio

Sapere la sintassi significa riconoscere `useState` e `useEffect` in un componente già scritto. Sapere dove applicarli significa leggere "il cliente vuole cercare le prenotazioni per nome e vedere quante ne restano" e decidere da soli quali componenti servono, dove vive lo stato, che cosa si calcola durante il render. Sono due competenze diverse: la prima si studia, la seconda si allena.

Chi ha imparato solo a memoria mostra tre sintomi tipici:

- copia un componente e lo adatta per tentativi, aggiungendo `useState` finché la pagina non assomiglia a quella desiderata;
- si blocca davanti a una richiesta nuova: conosce `useState` ma non sa dire se un valore va salvato o calcolato;
- davanti a un errore non sa da dove partire: cambia l'ordine degli hook, svuota la cache del browser e ricomincia il file.

### Cinque contesti reali

**Portale prenotazioni.** Lo usa chi gestisce una sala o uno studio. I dati sono prenotazioni con cliente, data, servizio e stato. Le azioni sono cercare, filtrare per stato, confermare, annullare. Se è fatto male, il filtro e il contatore mostrano numeri diversi: due copie dello stesso elenco aggiornate in momenti diversi.

**Carrello.** Lo usa chi compra. I dati sono articoli con id, nome, prezzo e quantità, più il totale. Le azioni sono aggiungere, cambiare quantità, rimuovere, andare al pagamento. Se è fatto male, la quantità modificata non si riflette sul totale, oppure la lista si svuota cambiando pagina perché lo stato vive nel componente sbagliato.

**Profilo utente.** Lo usa la persona che modifica i propri dati. I dati sono nome, email, data di nascita, avatar. Le azioni sono modificare, validare, salvare, annullare. Se è fatto male, il form mostra un errore su un campo già corretto o salva dati non validi perché il controllo era solo visivo.

**Ricerca con API.** La usa chi cerca un documento, un cliente, un prodotto. I dati sono il termine scritto, i risultati, lo stato della richiesta. Le azioni sono digitare, scegliere un risultato, riprovare dopo un errore. Se è fatto male, una risposta lenta sovrascrive quella di una ricerca più recente e la pagina mostra risultati di un'altra parola.

**Pannello di amministrazione.** Lo usa chi controlla il sistema. I dati sono elenchi di utenti, richieste, log, con filtri e azioni ripetute su ogni riga. Se è fatto male, una riga mostra lo stato della riga accanto, perché la `key` non identifica l'elemento e React riusa il componente sbagliato.

### Il metodo in sei passi

1. **Riformula la richiesta** con parole tue, senza termini tecnici. Cosa si guadagna: emergono le informazioni mancanti (chi vede il numero, che cosa succede se non c'è nulla).
2. **Disegna i blocchi** dell'interfaccia, uno per responsabilità: testata, filtri, elenco, dettaglio. Cosa si guadagna: sai quanti componenti servono prima di scrivere JSX.
3. **Elenca i dati e classifica**: che cosa cambia nel tempo, che cosa si calcola, che cosa arriva da fuori. Cosa si guadagna: lo stato contiene solo ciò che non si può ricavare.
4. **Decidi chi possiede lo stato**: il componente antenato più vicino che lo condivide. Cosa si guadagna: un solo punto di verità e figli che ricevono props e callback.
5. **Scrivi il minimo**: struttura statica con props fisse, poi un solo `useState` e un solo evento. Cosa si guadagna: vedi la struttura prima di aggiungere complessità.
6. **Prova i casi limite**: lista vuota, testo con maiuscole, campo svuotato, rete lenta, doppio invio. Cosa si guadagna: scopri le assunzioni nascoste prima dell'utente.

### Tre casi guidati

#### Caso 1: dove vive lo stato in una schermata con ricerca e filtro

**Richiesta:** "Voglio una schermata con l'elenco delle prenotazioni, un campo per cercare il cliente e un menu per lo stato. Sopra l'elenco deve comparire quanti risultati sto vedendo."

**Domande da farsi**

- Chi ha bisogno del testo cercato? Solo il campo o anche la testata?
- La lista filtrata è un dato da salvare o un calcolo?
- Che cosa vede l'utente quando i filtri non trovano nulla?

**Dati:** le prenotazioni arrivano da fuori (per ora una costante nel file): `id`, `cliente`, `sala`, `ora`, `stato`. Due valori cambiano con l'utente: il testo cercato e lo stato selezionato. Un solo valore è derivato: l'elenco visibile, da cui dipendono anche il conteggio e il messaggio di lista vuota.

**Passi**

1. Tengo i due stati nel componente che contiene sia i filtri sia l'elenco: è l'antenato comune.
2. Calcolo `visibili` durante il render, senza `useState`.
3. Uso `visibili.length` per il conteggio e mostro un messaggio quando è zero: nessuna seconda verità da aggiornare.
4. Do a ogni riga `key={p.id}`, non l'indice.

**Codice**

```jsx
import { useState } from "react";

const PRENOTAZIONI = [
  { id: "p1", cliente: "Rossi", sala: "Sala A", ora: "09:00", stato: "confermata" },
  { id: "p2", cliente: "Bianchi", sala: "Sala B", ora: "10:30", stato: "in attesa" },
  { id: "p3", cliente: "Conti", sala: "Sala A", ora: "12:00", stato: "confermata" },
  { id: "p4", cliente: "Ferrari", sala: "Sala C", ora: "18:00", stato: "annullata" },
];

export default function Schermata() {
  const [testo, setTesto] = useState("");
  const [stato, setStato] = useState("tutte");

  const cerca = testo.trim().toLowerCase();
  const visibili = PRENOTAZIONI.filter((p) => {
    const perNome = p.cliente.toLowerCase().includes(cerca);
    const perStato = stato === "tutte" || p.stato === stato;
    return perNome && perStato;
  });

  return (
    <main>
      <input
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        placeholder="Cerca cliente"
      />
      <select value={stato} onChange={(e) => setStato(e.target.value)}>
        <option value="tutte">Tutte</option>
        <option value="confermata">Confermate</option>
        <option value="in attesa">In attesa</option>
        <option value="annullata">Annullate</option>
      </select>
      <p>Risultati: {visibili.length}</p>
      {visibili.length === 0 ? (
        <p>Nessuna prenotazione con questi filtri.</p>
      ) : (
        <ul>
          {visibili.map((p) => (
            <li key={p.id}>{p.ora} - {p.cliente} ({p.sala}) - {p.stato}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

**Output**

```text
Avvio: Risultati: 4 e quattro righe.
Campo "o", filtro Tutte: Risultati: 2 (Rossi, Conti).
Campo "o", filtro Annullate: Risultati: 0 e Nessuna prenotazione con questi filtri.
```

**Cosa cambia se...** aggiungo un terzo filtro per sala: se lo stato resta nel componente `Filtri`, la testata che mostra il conteggio non lo conosce e serve una callback o lo spostamento dello stato nel genitore. Se invece salvo `visibili` in un `useState` per "evitare di ricalcolare", il conteggio e la lista possono divergere appena cambia un filtro. Infine, se il filtro modificasse `PRENOTAZIONI` con `setPrenotazioni(visibili)`, l'elenco di partenza andrebbe perso: il filtro produce una vista, non distrugge il dato.

#### Caso 2: form del profilo con validazione e messaggi

**Richiesta:** "Nel profilo si devono poter cambiare nome, email ed età. Se un campo non va bene, voglio il messaggio solo dopo che ho provato a salvare, non mentre scrivo la prima lettera."

**Domande da farsi**

- Quali valori sono stato? E gli errori?
- Il messaggio deve comparire subito o dopo il primo tentativo di salvataggio?
- Che cosa succede se l'utente corregge un campo dopo un errore?

**Dati:** tre campi di testo in un unico oggetto `valori`. Un valore booleano `inviato` dice se l'utente ha già provato a salvare. Gli errori sono derivati: si calcolano dai valori a ogni render, non si salvano.

**Passi**

1. Un solo `useState` per i valori, aggiornato con lo spread e la chiave del campo.
2. Una funzione `valida(valori)` che restituisce un oggetto di errori, vuoto se va tutto bene.
3. Gli errori si calcolano durante il render; `inviato` decide solo se mostrarli.
4. Al submit imposto `inviato` e interrompo se c'è almeno un errore; ogni messaggio resta collegato al campo con `htmlFor` e `id`.

**Codice**

```jsx
import { useState } from "react";

function valida(valori) {
  const errori = {};
  if (valori.nome.trim().length < 2) errori.nome = "Scrivi almeno due caratteri.";
  if (!valori.email.includes("@") || !valori.email.includes(".")) errori.email = "Email incompleta.";
  const eta = Number(valori.eta);
  if (!valori.eta.trim() || !Number.isFinite(eta) || eta < 18) errori.eta = "Serve un'età di almeno 18 anni.";
  return errori;
}

export default function Profilo() {
  const [valori, setValori] = useState({ nome: "", email: "", eta: "" });
  const [inviato, setInviato] = useState(false);

  const errori = valida(valori);
  const valido = Object.keys(errori).length === 0;
  const cambia = (campo, valore) =>
    setValori({ ...valori, [campo]: valore });

  function invia(evento) {
    evento.preventDefault();
    setInviato(true);
  }

  return (
    <form onSubmit={invia} noValidate>
      <label htmlFor="nome">Nome</label>
      <input id="nome" value={valori.nome} onChange={(e) => cambia("nome", e.target.value)} />
      {inviato && errori.nome && <p className="errore">{errori.nome}</p>}
      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={valori.email} onChange={(e) => cambia("email", e.target.value)} />
      {inviato && errori.email && <p className="errore">{errori.email}</p>}
      <label htmlFor="eta">Età</label>
      <input id="eta" type="number" value={valori.eta} onChange={(e) => cambia("eta", e.target.value)} />
      {inviato && errori.eta && <p className="errore">{errori.eta}</p>}
      <button type="submit">Salva profilo</button>
      {inviato && valido && <p role="status">Profilo salvato.</p>}
    </form>
  );
}
```

**Output**

```text
Campi vuoti, clic su Salva profilo: tre messaggi, nessun salvataggio.
Nome "A": Scrivi almeno due caratteri.
Email "anna.example.com": Email incompleta.
Età 17: Serve un'età di almeno 18 anni.
Nome Anna, email anna@example.com, età 24: Profilo salvato.
```

**Cosa cambia se...** salvo gli errori in un `useState` e li aggiorno solo dentro `invia`: dopo aver corretto il nome il messaggio resta finché non premo di nuovo, perché nessuno ricalcola nulla. Se mostro gli errori senza `inviato`, il form accusa l'utente alla prima lettera. Se tolgo `noValidate`, il browser blocca l'invio con i suoi messaggi prima che il nostro codice venga eseguito, e i messaggi personalizzati non compaiono: due sistemi di validazione che si sovrappongono sono peggio di uno solo. Nota anche `Number("")` che vale `0` e `Number("abc")` che vale `NaN`: senza `Number.isFinite`, un'età scritta male supererebbe il controllo.

#### Caso 3: caricamento con useEffect, dipendenze e cleanup

**Richiesta:** "Nel pannello di amministrazione scelgo un cliente da un menu e vedo le sue richieste di assistenza. Mentre carica lo dico, se non ci sono richieste lo dico, se la rete non risponde lo dico."

**Domande da farsi**

- L'effetto dipende da che cosa? Che cosa deve farlo ripartire?
- Che cosa succede se cambio cliente mentre la prima richiesta è ancora in corso?
- Che cosa deve fare la pulizia quando il componente sparisce?

**Dati:** `clienteId` scelto dal menu, `richieste` che arrivano dalla rete, più `caricamento` ed `errore`. Tre situazioni possibili, non una: in corso, errore, risultato (che può essere vuoto).

**Passi**

1. `clienteId` è stato; `richieste`, `caricamento` ed `errore` sono lo stato della richiesta.
2. L'effetto dichiara `[clienteId]`: riparte solo quando cambia il cliente.
3. A ogni avvio azzero errore e imposto caricamento, altrimenti resta il messaggio della volta prima.
4. `AbortController` annulla la richiesta precedente; nel `finally` controllo `signal.aborted`, così quella annullata non spegne il caricamento di quella nuova.

**Codice**

```jsx
import { useEffect, useState } from "react";

export default function Richieste() {
  const [clienteId, setClienteId] = useState(1);
  const [richieste, setRichieste] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const url = `https://jsonplaceholder.typicode.com/comments?postId=${clienteId}`;
    setCaricamento(true);
    setErrore(null);

    async function carica() {
      try {
        const risposta = await fetch(url, { signal: controller.signal });
        if (!risposta.ok) throw new Error(`Stato ${risposta.status}`);
        setRichieste(await risposta.json());
      } catch (e) {
        if (e.name !== "AbortError") setErrore(e.message);
      } finally {
        if (!controller.signal.aborted) setCaricamento(false);
      }
    }

    carica();
    return () => controller.abort();
  }, [clienteId]);

  return (
    <section>
      <label htmlFor="cliente">Cliente</label>
      <select id="cliente" value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))}>
        <option value={1}>Cliente 1</option>
        <option value={2}>Cliente 2</option>
        <option value={999}>Cliente 999 (senza richieste)</option>
      </select>
      {caricamento && <p>Caricamento…</p>}
      {errore && <p>Errore: {errore}</p>}
      {!caricamento && !errore && richieste.length === 0 && (
        <p>Nessuna richiesta per questo cliente.</p>
      )}
      {!caricamento && !errore && richieste.length > 0 && (
        <ul>
          {richieste.map((r) => (
            <li key={r.id}>Richiesta #{r.id}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

**Output**

```text
Avvio: Caricamento…, poi cinque righe, dalla #1 alla #5.
Cliente 999: Caricamento…, poi Nessuna richiesta per questo cliente.
Cambio rapido 1 -> 2: un solo caricamento visibile, poi le richieste del cliente 2.
```

**Cosa cambia se...** metto `[]` come dipendenze: cambiare cliente non ricarica niente e la lista resta quella del primo. Tolgo del tutto l'array: l'effetto riparte a ogni render, quindi `setCaricamento` provoca un nuovo render e si entra in un ciclo. Aggiungo `richieste` alle dipendenze: `setRichieste` cambia il valore, l'effetto riparte, e il ciclo è garantito. Tolgo la pulizia: cambiando cliente in fretta, la risposta più lenta può arrivare dopo e sovrascrivere quella giusta, mostrando i dati di un cliente con l'etichetta di un altro.

### Debug in cinque mosse

1. **Leggi il messaggio.** Un warning di React e un errore JavaScript raccontano cose diverse: il primo parla di identità e aggiornamenti, il secondo di valori.
2. **Individua il punto.** La console indica il componente e la riga; nei warning la riga è spesso quella della lista o dell'effetto.
3. **Chiediti quale valore può essere sbagliato.** Spesso è un riferimento rimasto uguale, una dipendenza mancante o un valore derivato salvato.
4. **Riduci a un esempio minimo.** Estrai il componente in un file con tre dati finti: se il difetto resta, lo hai isolato.
5. **Correggi e verifica.** Ricontrolla anche ciò che funzionava: una correzione che rompe il filtro non è una correzione.

**Errore 1: stato mutato con `push`**

```jsx
const [attivita, setAttivita] = useState([{ id: 1, testo: "Studiare" }]);

function aggiungi(testo) {
  attivita.push({ id: Date.now(), testo });
  setAttivita(attivita);
}
```

In console non compare nessun errore: la lista resta ferma e chi guarda pensa a un problema di CSS o di rendering. `push` modifica l'array esistente e `setAttivita` riceve lo stesso riferimento di prima; React confronta i riferimenti, non il contenuto, quindi non vede alcun cambiamento. La trappola è che `console.log(attivita)` mostra l'elemento nuovo: il dato è cambiato, l'interfaccia no. La domanda da farsi è sempre la stessa: sto creando un nuovo valore o sto modificando quello vecchio?

```jsx
function aggiungi(testo) {
  setAttivita([...attivita, { id: Date.now(), testo }]);
}
```

**Errore 2: `key` uguale o indice come `key`**

```text
Warning: Encountered two children with the same key, `1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
```

La causa è una `key` che non identifica la riga: l'indice dell'array, lo stato della prenotazione o un campo non unico. Con l'indice, React associa il componente alla posizione: eliminando la prima riga, la seconda eredita lo stato della prima e una casella spuntata finisce sul record sbagliato. La correzione è usare l'identificatore stabile, `key={p.id}`, che resta lo stesso anche dopo un filtro o un riordino.

**Errore 3: ciclo infinito di `useEffect`**

```jsx
const [filtro, setFiltro] = useState("");
const criteri = { testo: filtro };
useEffect(() => {
  setRisultati(cerca(criteri));
}, [criteri]);
```

```text
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

`criteri` è un oggetto creato durante il render: a ogni render è un riferimento nuovo, quindi l'effetto si considera da rieseguire, chiama `setRisultati`, provoca un render e ricomincia. La stessa cosa accade con un array o una funzione dichiarata nel corpo del componente. Le dipendenze devono essere valori primitivi (`filtro`) e i risultati di una ricerca sono spesso derivati: se non c'è una chiamata di rete, si calcolano durante il render senza effetto e senza stato.

### Esercizi di ragionamento

Otto esercizi senza scrivere codice, o con pochissimo. Per ognuno annota componenti, stato, valori derivati e casi limite prima di leggere la soluzione.

1. **Dove vive lo stato.** Una barra di ricerca e un contatore dei risultati sono due fratelli dentro una testata. Dove metti il testo cercato e perché?
   Cosa osservare: se ognuno tiene la propria copia, le due copie divergono alla prima digitazione.
2. **Dato o calcolato.** Nel carrello hai articoli, quantità, totale e numero di pezzi. Quali sono stato e quali derivati?
   Cosa osservare: totale e numero di pezzi si ricavano sempre dagli articoli; salvarli significa aggiornarli in ogni punto in cui cambia una quantità.
3. **Tre messaggi.** La lista delle richieste è vuota. Quali situazioni diverse possono produrre una lista vuota e che messaggio dai a ciascuna?
   Cosa osservare: nessun dato in archivio, filtri troppo stretti e ricerca senza risultati richiedono testi diversi.
4. **Codice fragile.** Un componente copia le props in uno stato con `useState(props.elenco)` e le aggiorna in un `useEffect` quando le props cambiano. Che cosa può andare storto?
   Cosa osservare: due copie della stessa lista, un render in più e un momento in cui la copia è vecchia.
5. **Form.** Tre campi, messaggi di errore, un pulsante di annullamento. Quanti `useState` servono e che cosa contiene ciascuno?
   Cosa osservare: un solo oggetto per i valori, un booleano per "ho provato a salvare", nessuno stato per gli errori.
6. **Scelta della `key`.** In un elenco di prenotazioni modificabili, quali campi sono adatti come `key` e quali no?
   Cosa osservare: la `key` deve essere stabile e unica; un campo che l'utente può modificare cambia identità alla riga.
7. **Dipendenze.** Una ricerca parte quando cambia la parola scritta. Che cosa metti nelle dipendenze e che cosa succede se dimentichi la parola?
   Cosa osservare: con `[]` la ricerca resta ferma sulla prima parola; senza array parte a ogni render.
8. **Doppio invio.** L'utente clicca due volte su "Conferma". Quale informazione ti serve e dove la metti?
   Cosa osservare: serve uno stato "invio in corso" che disabilita il pulsante, più un controllo sul dato lato server.

### Soluzioni guidate

1. Il testo vive nel genitore comune, la testata: `BarraRicerca` riceve `valore` e `onChange`, il contatore riceve il numero calcolato. Un solo punto di verità, due figli senza stato proprio.
2. Stato: gli articoli con le quantità. Derivati: totale, numero di pezzi, eventuale sconto. Il totale si ricalcola durante il render con `reduce`; salvarlo in un secondo `useState` richiederebbe un effetto o un aggiornamento manuale per ogni modifica.
3. Tre testi: "Nessuna richiesta in archivio" se i dati sono zero, "Nessun risultato con questi filtri" se il filtro è attivo, "Nessuna richiesta per questo cliente" se il cliente non ne ha. Un solo messaggio generico costringe l'utente a indovinare che cosa cambiare.
4. La copia può restare indietro di un render, l'effetto può sovrascrivere una modifica locale e il componente diventa difficile da leggere. Se il dato serve solo per mostrarlo, si usano le props; se deve essere modificabile, lo stato sale al genitore e la modifica passa da una callback.
5. Due stati: `valori` come oggetto con i tre campi e `inviato` come booleano. Gli errori si calcolano con una funzione pura durante il render; "annulla" riporta `valori` ai valori iniziali e `inviato` a `false`.
6. Va bene `id`, cioè un identificatore che non cambia. Non vanno bene l'indice, la data o lo stato: cambiando filtro o modificando il campo, React riassocia lo stato alla riga sbagliata.
7. Nelle dipendenze va la parola cercata (o il cliente scelto), non l'oggetto che la contiene. Con `[]` l'effetto gira una volta sola e la pagina resta sulla prima ricerca; senza array si entra in un ciclo se l'effetto chiama un `set`.
8. Serve un booleano `inviando`, impostato a `true` prima della chiamata e a `false` alla fine, con il pulsante disabilitato nel frattempo. Non basta: due schede aperte possono inviare insieme, quindi il controllo decisivo resta sul dato, non sull'interfaccia.

### Come capire di aver capito

- Disegni i blocchi della schermata prima di aprire l'editor e sai dire quale componente possiede lo stato.
- Per ogni valore del componente sai se è stato, prop o calcolo.
- Non salvi in `useState` niente che si possa ricavare dagli altri dati.
- Sai spiegare perché una lista usa `key={elemento.id}` e non l'indice.
- Davanti a una lista vuota sai elencare le tre situazioni possibili e i messaggi corrispondenti.
- Sai dire che cosa rifà partire un effetto e che cosa fa la sua pulizia.

### Errori comuni

- **Valore derivato nello stato.** `const [visibili, setVisibili] = useState(elenco)` e poi un effetto che lo aggiorna a ogni filtro. Causa: si vuole "evitare di ricalcolare". Correzione: calcola `visibili` durante il render e tieni nello stato solo il filtro.
- **Stato mutato.** `lista.push(nuovo)` seguito da `setLista(lista)`, oppure `utente.nome = "Anna"`. Causa: React confronta i riferimenti. Correzione: `[...lista, nuovo]` e `{ ...utente, nome: "Anna" }`.
- **Indice come `key`.** Funziona finché la lista non viene filtrata, ordinata o accorciata. Causa: la posizione non è l'identità. Correzione: usa `id`; se non esiste, crealo quando il dato entra.
- **Effetto senza dipendenze corrette.** `[]` congela i valori letti dentro; un oggetto creato nel render fa ripartire l'effetto ogni volta. Causa: le dipendenze sono trattate come formalità. Correzione: elenca i primitivi usati dentro l'effetto e non creare oggetti nel corpo del componente se finiscono nelle dipendenze.
- **Campo controllato senza `onChange`.** React avvisa: «You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field.» Causa: il `value` viene dallo stato ma nessun evento lo aggiorna. Correzione: aggiungi `onChange` e aggiorna lo stato, oppure usa `defaultValue` se il campo non deve essere controllato.
