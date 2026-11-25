In questo laboratorio costruisci **Spesa**, un'app Ionic React con persistenza locale. Il progetto è piccolo ma realistico: fa emergere le decisioni vere su stato, salvataggio, routing e gesti. Stack: Ionic 9, React 19, Capacitor 8.

## Obiettivi

- Generare un'app Ionic React e sostituire la pagina starter con una lista funzionante.
- Definire lo stato con un reducer puro e salvarlo su `Preferences` con debounce.
- Usare `IonList`, `IonItemSliding`, `IonFab`, `IonAlert` e `IonToast` con eventi `onIon*`.
- Aggiungere una rotta di dettaglio con parametro e verificare tutto su Android.

## Passo 1: progetto e struttura

```bash
npm install -g @ionic/cli
ionic start spesa blank --type=react --capacitor
cd spesa && npm install @capacitor/preferences && npx cap sync
ionic serve
```

`ionic serve` apre il browser con live reload. La struttura che userai:

| Percorso | Contenuto |
| --- | --- |
| `src/App.tsx` | `IonApp`, routing, provider dello stato |
| `src/pages/Lista.tsx` | lista con swipe e FAB di aggiunta |
| `src/pages/Dettaglio.tsx` | dettaglio di una voce |
| `src/state/spesa.ts` | tipi, reducer e persistenza |

## Passo 2: il modello e il reducer

La voce ha un id stabile, un nome e una quantità; il reducer resta puro e la persistenza vive fuori.

```ts
// src/state/spesa.ts
import { Preferences } from '@capacitor/preferences';

export interface Voce { id: string; nome: string; quantita: number; comprato: boolean }

export type Azione =
  | { type: 'load'; voci: Voce[] }
  | { type: 'add'; nome: string }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string };

export function riduci(voci: Voce[], azione: Azione): Voce[] {
  switch (azione.type) {
    case 'load':
      return azione.voci;
    case 'add': {
      const nome = azione.nome.trim();
      if (nome.length === 0) return voci;
      return [...voci, { id: crypto.randomUUID(), nome, quantita: 1, comprato: false }];
    }
    case 'toggle':
      return voci.map((v) => (v.id === azione.id ? { ...v, comprato: !v.comprato } : v));
    case 'remove':
      return voci.filter((v) => v.id !== azione.id);
  }
}

const CHIAVE = 'spesa:voci';

export async function carica(): Promise<Voce[]> {
  const { value } = await Preferences.get({ key: CHIAVE });
  try {
    const voci = value ? JSON.parse(value) : [];
    return Array.isArray(voci) ? voci : []; // dati corrotti: riparti da zero
  } catch {
    return [];
  }
}

export const salva = (voci: Voce[]) =>
  Preferences.set({ key: CHIAVE, value: JSON.stringify(voci) });
```

`crypto.randomUUID()` è disponibile nelle WebView moderne in secure context: con `Date.now()` due voci aggiunte nello stesso millisecondo condividono l'id e lo swipe rimuove quella sbagliata.

## Passo 3: stato globale senza librerie

Un `useReducer` con `useContext` basta per due schermate. Lo stato si salva con debounce di 300 ms, perché `Preferences.set` scrive su `UserDefaults` e su `SharedPreferences`.

```tsx
// src/state/SpesaContext.tsx
import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { carica, riduci, salva, type Azione, type Voce } from './spesa';

const Ctx = createContext<{ voci: Voce[]; dispatch: React.Dispatch<Azione> } | null>(null);

export function SpesaProvider({ children }: { children: React.ReactNode }) {
  const [voci, dispatch] = useReducer(riduci, []);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    void carica().then((v) => { dispatch({ type: 'load', voci: v }); setPronto(true); });
  }, []);

  useEffect(() => {
    if (!pronto) return; // non sovrascrivere lo storage prima del caricamento
    const t = setTimeout(() => void salva(voci), 300);
    return () => clearTimeout(t);
  }, [voci, pronto]);

  return <Ctx.Provider value={{ voci, dispatch }}>{children}</Ctx.Provider>;
}

export function useSpesa() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSpesa fuori da SpesaProvider');
  return ctx;
}
```

La guardia `pronto` evita il bug più frequente: il salvataggio parte con `voci = []`, scrive un array vuoto sopra i dati esistenti e l'app "dimentica" tutto a ogni riavvio.

## Passo 4: lista con swipe e FAB

`IonItemSliding` espone l'eliminazione con `IonItemOptions side="end"`; il FAB apre un `IonAlert` con input, il `IonToast` conferma.

```tsx
// src/pages/Lista.tsx (estratto)
<IonContent>
  <IonList inset>
    {voci.map((v) => (
      <IonItemSliding key={v.id}>
        <IonItem routerLink={`/voce/${v.id}`}>
          <IonCheckbox slot="start" checked={v.comprato}
            onIonChange={() => dispatch({ type: 'toggle', id: v.id })} />
          <IonLabel style={{ textDecoration: v.comprato ? 'line-through' : undefined }}>{v.nome}</IonLabel>
          <IonNote slot="end">x{v.quantita}</IonNote>
        </IonItem>
        <IonItemOptions side="end">
          <IonItemOption color="danger" onClick={() => dispatch({ type: 'remove', id: v.id })}>Elimina</IonItemOption>
        </IonItemOptions>
      </IonItemSliding>
    ))}
  </IonList>
  <IonFab vertical="bottom" horizontal="end" slot="fixed">
    <IonFabButton onClick={() => setAlert(true)}><IonIcon icon={add} /></IonFabButton>
  </IonFab>
  <IonAlert isOpen={alert} header="Nuova voce"
    inputs={[{ name: 'nome', type: 'text', placeholder: 'Latte' }]}
    buttons={[
      { text: 'Annulla', role: 'cancel' },
      { text: 'Aggiungi', handler: (d) => dispatch({ type: 'add', nome: d.nome ?? '' }) },
    ]}
    onDidDismiss={() => setAlert(false)} />
  <IonToast isOpen={toast} message="Voce aggiunta" duration={1200} onDidDismiss={() => setToast(false)} />
</IonContent>
```

Ionic posiziona per slot dichiarativi (`slot="start"` sulla checkbox), non per CSS; `IonFab` richiede `slot="fixed"` per restare sopra lo scorrimento.

## Passo 5: dettaglio, routing e test

La rotta di dettaglio legge `id` dalla URL e ricava la voce dallo stato condiviso: nessuna copia locale, quindi lista e dettaglio non divergono.

```tsx
export default function Dettaglio() {
  const { id } = useParams<{ id: string }>();
  const { voci, dispatch } = useSpesa();
  const voce = voci.find((v) => v.id === id);
  if (!voce) return <IonContent className="ion-padding">Voce non trovata.</IonContent>;
  return (
    <IonContent className="ion-padding">
      <h2>{voce.nome}</h2>
      <IonButton expand="block" onClick={() => dispatch({ type: 'toggle', id: voce.id })}>
        {voce.comprato ? 'Segna da comprare' : 'Segna come comprato'}
      </IonButton>
    </IonContent>
  );
}
```

I test del reducer sono puri e veloci:

```ts
test('add ignora nomi vuoti e genera id distinti', () => {
  expect(riduci([], { type: 'add', nome: '   ' })).toHaveLength(0);
  const a = riduci([], { type: 'add', nome: 'Pane' });
  expect(riduci(a, { type: 'add', nome: 'Pane' })[1].id).not.toBe(a[0].id);
});
```

Criterio di uscita: `npm test` verde, una voce che sopravvive al reload in `ionic serve`, swipe che elimina solo la voce trascinata, app verificata con `npx cap run android`.

## Esercizi

1. Aggiungi una `IonSearchbar` che filtra senza toccare lo stato salvato.
2. Aggiungi quantità modificabile con `IonCounter` e verifica il limite a 1.
3. Aggiungi una `IonTabBar` con tab "Da comprare" e "Comprati".

<details>
<summary>Soluzione</summary>

1. Un `useMemo` su `nome.includes(q.toLowerCase())` produce la lista visibile; i dati nello storage restano intatti.

2. `IonCounter` con `min={1}` e una nuova azione `setQuantita`; il test verifica che il riduttore non scenda sotto 1.

3. Due rotte figlie di `IonTabs`, un solo `SpesaProvider` e un filtro su `comprato`; il badge conta i non comprati.

</details>

## Errori comuni

- **Salvare prima del caricamento**: il primo render scrive un array vuoto sopra lo storage; guardia `pronto`.
- **Copiare la voce nel dettaglio**: dopo un toggle la lista resta vecchia; leggi dallo stato condiviso.
- **Usare `localStorage` nell'app**: la webview iOS può svuotarlo; `Preferences` è stabile.
- **Leggere `e.target.value` su `IonInput`**: durante la digitazione il valore affidabile è `e.detail.value`.
- **Usare l'indice come `key`**: con lo swipe si cancella l'elemento sbagliato.
- **Testare solo in browser**: gesti e safe area si verificano su device, non in `ionic serve`.

## In sintesi

Hai costruito una piccola app reale con il trio che conta: reducer puro per la logica, provider React per lo stato condiviso, `Preferences` per la persistenza. Ionic ha fornito layout, gesti e componenti senza imporre un'architettura. Il criterio non è "si vede sul browser" ma "l'app installata ricorda i dati dopo il kill del processo".

## Fonti

- [Ionic CLI - Build](https://ionicframework.com/docs/cli/commands/build)
- [Ionic Framework - Documentation](https://ionicframework.com/docs)
- [Ionic - Documentation (React)](https://ionicframework.com/docs/react)
- [Capacitor - Preferences API](https://capacitorjs.com/docs/apis/preferences)
