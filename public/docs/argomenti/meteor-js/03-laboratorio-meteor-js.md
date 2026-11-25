In questo laboratorio costruisci `bacheca`, un'app Meteor 3 con note private per utente: `accounts-password`, pubblicazione filtrata, Method validato, UI React reattiva e test di autorizzazione.

## Obiettivi

- Creare un progetto Meteor 3 con React e avviarlo in locale.
- Definire una collezione e un Method con validazione e controlli di autorizzazione.
- Collegare pubblicazione, `useSubscribe` e `useTracker` in una lista reattiva.
- Scrivere un test che verifichi che un utente non rubi le note di un altro.
- Preparare un bundle di produzione e controllare i punti di configurazione.

## Passo 1 — Progetto e dipendenze

Meteor 3 si installa con `npx meteor`, che scarica il tool nella home utente. Il wizard di `meteor create` chiede nome e framework.

```bash
npx meteor
meteor create bacheca --react
cd bacheca
meteor npm install
meteor add accounts-password accounts-base
meteor run
```

`meteor --version` deve dare `Meteor 3.x`: le API `*Async` non esistono in Meteor 2 e il codice fallirebbe con `TypeError`.

| Comando | Effetto |
| --- | --- |
| `meteor run` | build in sviluppo, hot reload client, riavvio server |
| `meteor build ../dist --directory` | bundle di produzione non minificato |
| `meteor reset` | svuota il database locale |

## Passo 2 — Collezione, schema e Method

Tutto il codice comune sta in `imports/api/notes.js`. La collezione si crea una sola volta e si importa da entrambi i lati: due `new Mongo.Collection('notes')` creano istanze che non si sincronizzano.

```js
// imports/api/notes.js
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const NotesCollection = new Mongo.Collection('notes');

Meteor.methods({
  async 'notes.insert'({ text }) {
    check(text, String);
    if (!this.userId) throw new Meteor.Error('not-authorized', 'Serve un login');
    if (text.trim().length === 0 || text.length > 500) {
      throw new Meteor.Error('invalid-text', 'Testo tra 1 e 500 caratteri');
    }
    return NotesCollection.insertAsync({
      text: text.trim(),
      owner: this.userId,
      createdAt: new Date(),
    });
  },

  async 'notes.remove'({ noteId }) {
    check(noteId, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const removed = await NotesCollection.removeAsync({ _id: noteId, owner: this.userId });
    if (removed === 0) throw new Meteor.Error('not-found', 'Nota inesistente o non tua');
  },
});
```

Il filtro `owner: this.userId` dentro `removeAsync` è il controllo di autorizzazione: un comando atomico evita la finestra tra lettura e cancellazione.

## Passo 3 — Pubblicazione e UI reattiva

Senza utente la pubblicazione chiama `this.ready()`: la `subscribe` è pronta e la UI non resta in loading per chi non ha fatto login.

```js
// server/main.js
import { Meteor } from 'meteor/meteor';
import { NotesCollection } from '../imports/api/notes';

Meteor.publish('notes.mine', function () {
  if (!this.userId) return this.ready();
  return NotesCollection.find({ owner: this.userId }, { sort: { createdAt: -1 }, limit: 50 });
});
```

L'iscrizione e la lettura della collection sono due hook: il primo gestisce il ciclo di vita della subscription, il secondo traccia la query e ridisegna a ogni cambiamento.

```jsx
// imports/ui/Board.jsx
import React from 'react';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { NotesCollection } from '../api/notes';

export function Board() {
  const isLoading = useSubscribe('notes.mine');
  const notes = useTracker(() =>
    NotesCollection.find({}, { sort: { createdAt: -1 } }).fetch());
  if (isLoading()) return <p>Carico…</p>;
  return (
    <ul>
      {notes.map((n) => (
        <li key={n._id}>
          {n.text}
          <button onClick={() => Meteor.callAsync('notes.remove', { noteId: n._id })}>×</button>
        </li>
      ))}
    </ul>
  );
}
```

Con Meteor 3 il client chiama i Method con `Meteor.callAsync`, che restituisce una Promise e propaga gli errori come rifiuti. Collega `Board` in `client/main.jsx` dentro `<Meteor.startup>` e mostra il login quando `useTracker(() => Meteor.userId())` è nullo.

## Passo 4 — Test di autorizzazione

Il test più utile prova che un utente non cancella i dati di un altro. `meteor test --full-app` avvia client e server reali con `Meteor.isAppTest` a vero.

```js
// imports/api/notes.test.js
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { NotesCollection } from './notes';

describe('notes.remove', function () {
  let aliceId, bobId, noteId;

  before(async function () {
    aliceId = await Meteor.users.insertAsync({ username: 'alice' });
    bobId = await Meteor.users.insertAsync({ username: 'bob' });
    noteId = await NotesCollection.insertAsync({ text: 'privata', owner: aliceId, createdAt: new Date() });
  });

  it('rifiuta un utente anonimo', async function () {
    await assert.isRejected(Meteor.callAsync('notes.remove', { noteId }));
  });

  it('non cancella la nota di un altro utente', async function () {
    const ctx = { userId: bobId };
    await assert.isRejected(Meteor.applyAsync('notes.remove', [{ noteId }], { context: ctx }));
    assert.isOk(await NotesCollection.findOneAsync(noteId));
  });
});
```

Lancia con `meteor test --full-app --driver-package meteortesting:mocha`. Il `context` di `Meteor.applyAsync` impersona un utente senza login reale.

## Passo 5 — Build di produzione

Tre impostazioni sono obbligatorie: `MONGO_URL` verso un Mongo esterno, `ROOT_URL` con schema `https://` e `METEOR_SETTINGS` come JSON.

```bash
meteor build ../dist --directory
MONGO_URL='mongodb://localhost:27017/bacheca' \
ROOT_URL='https://bacheca.example.com' \
PORT=3000 node ../dist/bundle/main.js
```

Se `ROOT_URL` resta su `http://localhost:3000` dietro un proxy TLS, gli URL assoluti e i cookie di `accounts-password` sbagliano schema; il bundle va eseguito con la major di Node dichiarata da Meteor (3.5 usa Node 24).

## Esercizi

1. Aggiungi un contatore reattivo delle note con `useTracker` e verifica che si aggiorni senza ricaricare la pagina.
2. Introduci un campo `sharedWith: [userId]` e una pubblicazione `notes.shared`, con test che mostrano che B vede solo ciò che A gli ha condiviso.
3. Misura con DevTools i messaggi DDP con 500 note e riducili con `fields` e paginazione.
4. Rendi la rimozione ottimistica scrivendo una stub client-side e verifica che, in caso di errore server, la nota ricompaia.
5. Aggiungi `rate-limit` sul Method `notes.insert` e un test che superi la soglia.

<details>
<summary>Soluzione</summary>

1. `useTracker(() => NotesCollection.find({}).count())` restituisce un numero che cambia a ogni inserimento: il contatore non va memorizzato fuori dal componente.

2. La pubblicazione filtra con `{ $or: [{ owner: this.userId }, { sharedWith: this.userId }] }`; il Method di condivisione verifica di essere l'owner prima del `$addToSet`.

3. Un cursore con `limit: 50` e proiezione `{ text: 1, createdAt: 1 }` riduce il payload; il pannello Network mostra i frame WebSocket con i messaggi DDP.

4. La stub usa `NotesCollection.removeAsync({ _id, owner: this.userId })` e rilancia gli errori: minimongo ripristina lo stato quando il server rifiuta.

5. `DDPRateLimiter.addRule` con `type: 'method', name: 'notes.insert'` e 10 chiamate al minuto per connessione; il test chiama 11 volte e si aspetta un errore.

</details>

## Errori comuni

- **Creare la collection nel file della pubblicazione**: il client non la vede e la UI resta vuota, senza errori a console.
- **Usare `meteor create` con un template vecchio**: il progetto generato può essere Meteor 2, e `insertAsync` non esiste; controlla `--version`.
- **Usare `Meteor.userId()` lato server fuori da un Method**: restituisce `null` e la query non trova nulla.
- **Testare con `meteor test` senza `--full-app`**: i Method lato server non vengono caricati e le chiamate falliscono con "Method not found".
- **Mettere `METEOR_SETTINGS` nel repository**: contiene credenziali OAuth, da iniettare al deploy.

## In sintesi

`bacheca` copre l'intero giro: Method atomico con `check`, pubblicazione con `ready()` per gli anonimi, hook React, test con context esplicito e build con le variabili giuste. Le parti fragili sono i dettagli di sicurezza — filtro per `owner`, `ROOT_URL`, `METEOR_SETTINGS` — da verificare con i test.

## Fonti

- [Meteor Install](https://docs.meteor.com/about/install.html)
- [Meteor Guide — Publications and Data Loading](https://guide.meteor.com/data-loading)
- [Meteor Guide — Methods](https://guide.meteor.com/methods)
- [Meteor CLI](https://docs.meteor.com/cli)
