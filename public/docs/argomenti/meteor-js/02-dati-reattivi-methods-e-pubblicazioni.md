Il cuore di un'app Meteor è il flusso dei dati: una pubblicazione sul server sceglie quali documenti un client può vedere, DDP li trasporta, minimongo li tiene in memoria e Tracker avverte i componenti quando cambiano. Se questo canale è scritto male l'app funziona in sviluppo e crolla in produzione, con pubblicazioni che serializzano collezioni intere o Metodi che non validano nulla. Questa lezione costruisce il modello mentale completo e mostra il codice per farlo bene con Meteor 3, React e `react-meteor-data`.

## Obiettivi

- Scrivere pubblicazioni con cursori, limiti e gestione corretta di `this.userId`.
- Consumare le iscrizioni in React con `useSubscribe` e `useTracker`.
- Applicare il pattern optimistic UI con le stubs dei Method.
- Validare argomenti e risultati con `check` e con `SimpleSchema`.
- Evitare pubblicazioni illeggibili che annullano i benefici della reattività.

## Pubblicazioni: cosa arriva davvero al client

Una pubblicazione è una funzione che restituisce un cursore o un array di cursori. Il server esegue la query una volta, manda i documenti al client e poi osserva le modifiche al cursore: ogni `insert`, `update` o `remove` su un documento che rientra nella query genera un messaggio DDP al client collegato.

```js
// server/publications.js
import { Meteor } from 'meteor/meteor';
import { TasksCollection } from '../imports/api/tasks';

Meteor.publish('tasks.mine', function ({ search = '', limit = 20 } = {}) {
  if (!this.userId) return this.ready();          // nessun dato per gli anonimi
  this.unblock();                                 // libera la connection per altre chiamate
  return TasksCollection.find(
    { owner: this.userId, text: { $regex: search, $options: 'i' } },
    { sort: { createdAt: -1 }, limit: Math.min(limit, 100) },
  );
});
```

Tre regole pratiche riassumono quanto sopra. La pubblicazione deve filtrare sempre per `userId` quando i dati sono privati; deve imporre un limite massimo lato server, perché il client non è attendibile; e deve usare proiezioni (`fields`) per non spedire campi pesanti come la descrizione completa quando la lista ne mostra solo il titolo.

| Errore | Effetto | Correzione |
| --- | --- | --- |
| `return Collection.find()` senza filtro | sync di tutta la collezione a ogni client | filtro e `limit` |
| parametri senza `check` | query arbitraria, anche su campi interni | `check(args, Object)` |
| nessun `this.ready()` | la `subscribe` resta `pending` per sempre | `ready` per gli anonimi |
| query non indicizzata | CPU del server al merge dei cursori | indice composto su `owner` + `createdAt` |

## React con Tracker

`react-meteor-data` espone due hook: `useSubscribe` gestisce il ciclo di vita dell'iscrizione, `useTracker` esegue una funzione reattiva e ridisegna il componente quando le sue dipendenze cambiano.

```js
// imports/ui/TaskList.jsx
import React from 'react';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { TasksCollection } from '../api/tasks';

export function TaskList({ search }) {
  const isLoading = useSubscribe('tasks.mine', { search, limit: 20 });
  const tasks = useTracker(() => TasksCollection.find({}, { sort: { createdAt: -1 } }).fetch(), [search]);
  if (isLoading()) return <p>Carico…</p>;
  return (
    <ul>
      {tasks.map((t) => <li key={t._id}>{t.text}</li>)}
    </ul>
  );
}
```

La differenza rispetto a `useEffect` più fetch è sostanziale: `useTracker` registra le dipendenze reattive (`Collection.find`, `ReactiveVar`, `Session`) e si riattiva quando una di esse cambia, senza che tu debba specificare un array di dipendenze che indichi la collection. L'array passato a `useTracker` serve solo per i valori React non reattivi, come `search`.

`isLoading()` è una funzione, non un booleano: il valore cambia quando l'iscrizione diventa pronta, quindi deve essere letta dentro il render per far scattare il nuovo calcolo.

## Metodi e optimistic UI

Un Method è l'unica strada per modificare i dati, ma Meteor permette una scorciatoia: se sul client esiste una *stub* con lo stesso nome del Method, il client la esegue subito su minimongo e, quando il server risponde, riconcilia il risultato.

```js
// imports/api/tasks.js
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

Meteor.methods({
  async 'tasks.setDone'({ taskId, done }) {
    check(taskId, String);
    check(done, Boolean);
    const r = await TasksCollection.updateAsync(
      { _id: taskId, owner: this.userId },
      { $set: { done, updatedAt: new Date() } },
    );
    if (r === 0) throw new Meteor.Error('not-found', 'Task inesistente o non tua');
  },
});
```

La stub corrispondente sul client duplica la query in minimongo: si scrive una volta sola importando il Method dal codice condiviso (`imports/api/tasks.js` è caricato da entrambi i bundle), ma il corpo deve usare gli stessi `updateAsync` e la stessa condizione `owner`. Se le due versioni divergono l'UI mostra uno stato che il server corregge a ritroso dopo qualche centinaio di millisecondi, ed è difficile da diagnosticare.

I Method lanciati dal client non restituiscono il valore di ritorno: restituiscono una Promise che si risolve con il risultato solo quando il server conferma. Il flag `this.isSimulation` è vero nella stub del client e falso sul server: serve per non ripetere una chiamata a un servizio esterno durante la simulazione.

## Errori comuni

- **Pubblicare con `fetch()` lato server**: un Method che restituisce un array materializzato non è reattivo; il vantaggio di Meteor svanisce.
- **Dimenticare `this.unblock()`**: una pubblicazione lenta blocca le altre richieste sulla stessa connessione e la UI sembra congelata.
- **Filtrare solo nel client**: `useTracker` con `find()` sull'intera collezione in minimongo mostrerà anche documenti che il server non ha pubblicato, se la pubblicazione è permissiva.
- **Memorizzare il risultato di `isLoading()` in una variabile esterna**: si legge un valore stantio e il componente resta sullo spinner.
- **Scrivere test solo sul server**: le stubs si testano solo con `Meteor.call` in ambiente client, dove puoi verificare la latenza percepita.

## In sintesi

Le pubblicazioni sono il perimetro di sicurezza e di banda: filtrano, limitano e proiettano. DDP trasporta le differenze, minimongo le applica, Tracker e `useTracker` ridisegnano il componente. I Methods validano con `check` e si appoggiano alle stubs per l'ottimismo dell'interfaccia, ma solo se il codice è condiviso e identico nei due bundle. Nella lezione successiva tutto questo diventa un'app da avviare, testare e deployare.

## Fonti

- [Meteor Guide — Publications and Data Loading](https://guide.meteor.com/data-loading)
- [Meteor Guide — Methods](https://guide.meteor.com/methods)
- [Meteor API — Collections](https://docs.meteor.com/api/collections)
- [Meteor Guide — Security](https://guide.meteor.com/security)
