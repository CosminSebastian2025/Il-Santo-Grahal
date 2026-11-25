Meteor.js è un framework JavaScript full-stack nato nel 2012 che lega client e server in un unico progetto: la stessa base di codice viene compilata da un lato per il browser e dall'altro per Node.js, e le modifiche su un database MongoDB raggiungono i client in tempo reale senza polling. La versione 3 (attuale, 3.6.x) ha buttato via Fibers, il vecchio meccanismo di coroutine, e ha portato le API di scrittura su database a funzioni asincrone. Questa lezione spiega cosa fa Meteor quando esegui `meteor run` e perché la sua architettura è diversa da quella di una classica app Express più React.

## Obiettivi

- Riconoscere i layer di Meteor: build system, server Node.js, client, database e protocollo DDP.
- Capire il modello "isomorphic": un file in `imports/` può essere caricato da entrambi i lati.
- Distinguere collezioni condivise, pubblicazioni e Methods.
- Avviare un progetto Meteor 3 e individuare i file che contano.
- Spiegare cosa è cambiato tra Meteor 2 (Fibers) e Meteor 3 (async/await).

## Un unico progetto, due bundle

Un'app Meteor ha una struttura di cartelle convenzionale. Il bundler legge tutto ciò che si trova fuori da `imports/` e lo include automaticamente, mentre `imports/` viene caricato solo quando qualcuno lo importa esplicitamente: è da qui che parte la modularità.

```text
todo/
├── client/main.html      # entry client
├── client/main.js        # codice browser-only
├── server/main.js        # codice server-only
├── imports/api/tasks.js  # collezione condivisa, caricata da entrambi
├── public/               # asset serviti staticamente
└── package.json
```

| Cartella | Bundle client | Bundle server | Quando viene eseguita |
| --- | --- | --- | --- |
| `client/` | sì | no | al caricamento della pagina |
| `server/` | no | sì | all'avvio del processo |
| `imports/` | solo se importata | solo se importata | al momento dell'`import` |
| `public/` | servita dal server | — | su richiesta HTTP |

Il bundler è cambiato nel tempo: Meteor 3 espone Rspack accanto al Meteor Bundler storico e a webpack. Con `meteor run` il client riceve un hot code push a ogni build, mentre il server si riavvia.

## Il database è reattivo per costruzione

In un'app REST tradizionale il client chiede e il server risponde. In Meteor il client si iscrive a una pubblicazione: il server manda un set iniziale di documenti e poi invia aggiornamenti incrementali man mano che la collezione cambia. Il protocollo si chiama DDP (Distributed Data Protocol) e viaggia su WebSocket.

```js
// imports/api/tasks.js — codice condiviso
import { Mongo } from 'meteor/mongo';
export const TasksCollection = new Mongo.Collection('tasks');
```

Sul server, una pubblicazione decide quali documenti mandare a quel client:

```js
// server/main.js
import { Meteor } from 'meteor/meteor';
import { TasksCollection } from '../imports/api/tasks';

Meteor.publish('tasks.visible', function () {
  if (!this.userId) return this.ready();
  return TasksCollection.find({ owner: this.userId }, { limit: 50 });
});
```

Sul client la stessa `TasksCollection` è una "minimongo", una copia locale in memoria con una piccola parte dell'API di MongoDB. Quando l'utente inserisce un documento, minimongo lo scrive subito e l'interfaccia si ridisegna prima che il server risponda: è il motivo per cui le app Meteor sembrano istantanee.

| Concetto | Dove gira | Responsabilità |
| --- | --- | --- |
| Collezione | client e server | nome e schema condivisi |
| Pubblicazione | server | seleziona il sottoinsieme di documenti |
| Iscrizione (`Meteor.subscribe`) | client | attiva una pubblicazione |
| Method | entrambi (definito sul server) | unica via per le scritture |
| DDP | trasporto | sincronizzazione e stream |

Le scritture, però, non passano dal client direttamente al database: passano da un Method. Dalla Meteor 2 le collezioni sono "secure by default", quindi `TasksCollection.insertAsync(...)` lanciato dal client fallisce se non esiste un Method che lo autorizzi. Il vecchio pattern `allow/deny` è deprecato: è difficile da verificare sul server.

## Methods e autorizzazione

Un Method è una RPC nominata: il client la chiama con argomenti serializzati in EJSON, il server esegue il corpo e restituisce il valore. L'`this` del Method contiene `userId` e `connection`, quindi il controllo di autorizzazione sta dentro il Method stesso.

```js
// imports/api/tasks.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

Meteor.methods({
  async 'tasks.insert'(text) {
    check(text, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    return TasksCollection.insertAsync({
      text: text.slice(0, 200),
      owner: this.userId,
      createdAt: new Date(),
    });
  },
});
```

`check` valida i tipi degli argomenti contro un pattern dichiarativo; senza di esso un client può inviare qualsiasi oggetto, anche una funzione prototipale. In Meteor 3 i metodi che toccano il database sono `async` e usano la variante `insertAsync`, perché Mongo driver è asincrono e Fibers non esistono più.

## Meteor 2 contro Meteor 3

Per capire i tutorial che trovi in giro serve sapere che cosa è cambiato tra le due major. In Meteor 2 ogni metodo poteva essere scritto in stile sincrono: Fibers sospendeva la funzione mentre aspettava Mongo, quindi `TasksCollection.insert()` sembrava bloccare ma non bloccava il thread. Con Meteor 3 quella magia è finita.

| Aspetto | Meteor 2 (fino a 2.16) | Meteor 3 (3.x) |
| --- | --- | --- |
| Concorrenza | Fibers, `meteor/promise` | `async`/`await`, Promise native |
| Scrittura DB | `insert`, `update`, `remove` | `insertAsync`, `updateAsync`, `removeAsync` |
| Method | `function ()` sincrona apparente | `async function ()` |
| Build | Meteor Bundler / webpack | Rspack o Meteor Bundler |
| Node.js incluso | 14 (2.16) | 20 (3.3), 22 (3.4), 24 (3.5), 26.12 (3.6) |

La migrazione non è automatica: ogni `await` mancante diventa un fallimento silenzioso o un errore a runtime, quindi la guida ufficiale di migrazione consiglia di convertire un file alla volta e di usare `meteor lint` e i test per scovare i punti rimasti sincroni.

## Errori comuni

- **Credere che `imports/` venga compilato sempre**: un file lì dentro esiste solo se qualcuno lo importa, quindi dichiarare una collezione senza importarla produce un errore "collection undefined".
- **Scrivere direttamente dal client**: senza un Method il `insertAsync` resta in coda finché il server lo rifiuta, e il documento sparisce dalla UI.
- **Usare `this.userId` fuori da un Method**: negli handler HTTP e nei job schedulati non esiste, va recuperato esplicitamente.
- **Copiare esempi di Meteor 2 senza async**: `TasksCollection.insert()` non è più una funzione sincrona e i test falliscono con promesse non gestite.
- **Confondere `meteor create` con un boilerplate React**: il wizard permette di scegliere React, Vue, Svelte, Solid o Blaze, e la scelta cambia i file generati.

## In sintesi

Meteor è un framework "batterie incluse" dove il database è la sorgente di verità condivisa: il server pubblica sottoinsiemi reattivi, il client li replica in memoria e le scritture passano da Methods validati. La Meteor 3 ha completato il passaggio ad async/await, eliminando Fibers; chi arriva da tutorial vecchi deve tradurre ogni chiamata sincrona alla variante `*Async`. Con questa base puoi leggere la lezione successiva, che entra dentro pubblicazioni, fine-grained reactivity e Method robusti.

## Fonti

- [Meteor.js Documentation](https://docs.meteor.com/)
- [Meteor Guide](https://guide.meteor.com/)
- [Meteor.js 3 Migration Guide](https://v3-migration-docs.meteor.com/)
- [Meteor Install](https://docs.meteor.com/about/install.html)
