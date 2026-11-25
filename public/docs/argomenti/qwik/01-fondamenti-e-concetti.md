Qwik è un framework frontend che sostituisce l'idratazione con la ripresa dell'esecuzione: l'HTML generato dal server porta con sé lo stato dell'applicazione, e il browser scarica il codice di un gestore di eventi solo nell'istante in cui l'utente lo attiva. In questa lezione vedi da dove nasce l'idea, come si scrive un componente e perché il compilatore, più che la libreria a runtime, è il vero motore del framework.

## Obiettivi

- Spiegare la differenza tra idratazione e ripresa (`resumability`) e misurarla in termini di codice caricato all'avvio.
- Scrivere un componente Qwik con `component$`, `useSignal` e gestori di eventi con il suffisso `$`.
- Riconoscere il ruolo del compilatore ottimizzatore e dei QRL nella generazione dei chunk.
- Gestire stato serializzabile con `useStore` e capire quando serve `noSerialize`.

## Dal problema dell'idratazione alla ripresa

Un'applicazione React o Vue renderizzata sul server deve, una volta arrivata al browser, rieseguire tutti i componenti per ricostruire il virtual DOM e poi collegare i listener: è l'idratazione. Il costo cresce con il numero di componenti, non con ciò che l'utente sta per fare, e finché non è finita il pulsante visibile non risponde. Qwik ribalta il modello: il server serializza non solo l'HTML, ma anche lo stato e i riferimenti alle funzioni, e il browser riprende da lì senza rieseguire nulla.

| Aspetto | Idratazione (React, Vue, Svelte) | Ripresa (Qwik) |
| --- | --- | --- |
| Lavoro all'avvio | ricostruzione del DOM virtuale di tutta la pagina | lettura di un attributo `q:obj` e dei QRL già presenti |
| Quando parte un handler | dopo la fine dell'idratazione | al primo evento su quell'elemento, con prefetch al passaggio del mouse |
| Codice scaricato inizialmente | bundle con tutti i componenti | core del framework e pochi chunk |
| Tempo per interattivo | dipende dal numero di componenti | dipende dalla profondità dell'interazione |

La documentazione ufficiale riassume il modello con una frase: le applicazioni Qwik in qualsiasi punto del ciclo di vita possono essere serializzate e spostate su un'altra istanza, che sia un server o un browser, e lì riprendono esattamente da dove la serializzazione si era fermata.

## Componenti, segnali ed eventi lazy

Un componente Qwik è una funzione asincrona dichiarata con `component$`. Il simbolo `$` non è decorativo: segnala al compilatore di trasformare quella funzione in un chunk separato con relativo QRL (`q-abc123.js#Contatore_component_XYZ`), cioè un indirizzo che il browser può risolvere a comando.

```tsx
import { component$, useSignal, useStore, $ } from "@builder.io/qwik";

export const Contatore = component$<{ etichetta: string }>(({ etichetta }) => {
  const conteggio = useSignal(0);
  const store = useStore({ clic: 0 });

  return (
    <div>
      <p>{etichetta}: {conteggio.value}</p>
      <button
        onClick$={() => {
          conteggio.value++;
          store.clic++;
        }}
      >
        incrementa
      </button>
    </div>
  );
});
```

`useSignal` crea un valore reattivo locale al componente; `useStore` crea un oggetto reattivo con più proprietà annidate. Entrambi devono essere serializzabili, perché da essi il server costruisce l'HTML e lo stato di partenza. Le istanze di classi o gli handle del browser come `WebSocket` non lo sono: per quelle si usa `noSerialize`, che le marca come non serializzabili ma le mantiene vive nel contesto in cui sono create.

| Primitive | Uso | Serializzabile |
| --- | --- | --- |
| `useSignal(valore)` | valore scalare con `.value` | sì, se il valore lo è |
| `useStore(oggetto)` | stato strutturato con proxy | sì, con campi serializzabili |
| `useContextId` / `createContextId` | contesto tipizzato | sì, tramite provider |
| `$` / `component$` / `onClick$` | confine di chunk | diventano QRL |
| `noSerialize(x)` | oggetti opachi (wrapper, socket) | no, ricreati al bisogno |

## L'ottimizzatore e i confini dei chunk

Il passaggio da `$` a file separato è compito dell'ottimizzatore, un plugin Vite (`@builder.io/qwik/optimizer`) che gira in build. Esso estrae ogni funzione racchiusa da `$` in un proprio modulo, le assegna un hash stabile e riscrive le chiamate in modo che il runtime possa importarle su richiesta. Il risultato è che il costo di un handler non è pagato da chi non lo usa.

```ts
// qwik.config / vite.config.ts
import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";

export default defineConfig({
  plugins: [qwikVite({ ssr: { origin: "https://example.com" } })],
});
```

Due conseguenze pratiche: il codice dentro un `$` viene chiuso in un proprio scope, quindi non può catturare variabili che non siano segnali, store o valori serializzati dalla chiusura; e il nome della funzione compare nell'URL del chunk, per cui rinominarla invalida la cache di quei chunk. Accanto ai chunk, la build emette un `q-manifest.json` che mappa ogni QRL al proprio file e agli import impliciti, ed è il motivo per cui una nuova build va servita integralmente: chunk e manifest devono appartenere alla stessa versione.

## Stato globale e contesto

Per condividere stato tra componenti lontani nell'albero si usa `createContextId` con `useContextProvider` e `useContext`, oppure gli store esportati da un modulo. Qwik City aggiunge `useServiceWorker`, `useDocumentHead` e i loader di rotta, ma il nucleo resta lo stesso: nessuna magia globale, tutto ciò che attraversa il confine server-browser deve essere serializzabile.

```tsx
import { createContextId, type Signal } from "@builder.io/qwik";

export const TemaContext = createContextId<Signal<"chiaro" | "scuro">>("tema");
```

Il contesto è identificato da un oggetto, non da una stringa libera: due moduli che esportano contextId diversi non collidono, e `useContext` verifica i tipi in compilazione. Il provider va inserito sopra i consumatori nello stesso albero, e un valore di default evita che il contesto non fornito produca un errore a runtime.

## Errori comuni

- **Dimenticare il `$` sul nome della funzione**: `onClick={...}` invece di `onClick$={...}` non viene estratto e il gestore non arriva mai al browser, oppure finisce nel bundle principale annullando il vantaggio.
- **Catturare variabili non serializzabili in un handler**: una `Map` creata in render o un timer catturato in chiusura rompe la serializzazione; vanno tenuti in segnali o ricreati dentro il gestore.
- **Usare `useVisibleTask$` per inizializzare stato**: il task visibile gira nel browser e non è ripreso dal server; se serve solo per leggere `localStorage`, meglio un task o un evento esplicito.
- **Aspettarsi un globale condiviso**: ogni `$` gira in un contesto che può essere ricreato; non contare su variabili mutate a livello di modulo.
- **Misurare le prestazioni sul server di sviluppo**: il prefetch e i chunk si valutano solo su build di produzione servita da HTTP/2 o HTTP/3.

## In sintesi

Qwik sposta il costo dal caricamento all'interazione: il server consegna HTML più stato serializzato, il browser riprende senza idratare e scarica i chunk dei QRL solo quando servono. Il `$` è il contratto con l'ottimizzatore, e la serializzabilità è il vincolo che attraversa segnali, store, contesto e handler. Chi capisce questi tre elementi ha già capito l'architettura del framework, che nella prossima lezione diventa un'applicazione completa con routing e dati.

## Fonti

- [Qwik - Resumable](https://qwik.dev/docs/concepts/resumable/)
- [Qwik - Think Qwik](https://qwik.dev/docs/concepts/think-qwik/)
- [Qwik - QRL](https://qwik.dev/docs/advanced/qrl/)
- [Qwik - Optimizer](https://qwik.dev/docs/advanced/optimizer/)
- [Qwik - Component Overview](https://qwik.dev/docs/components/overview/)
