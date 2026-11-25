In questo laboratorio costruisci `catalogo`, una piccola app Expo con NativeWind che mostra un elenco di prodotti, una schermata di dettaglio, un tema chiaro e scuro con toggle persistente e una sezione con slider di terze parti integrato con `cssInterop`. Il percorso è quello di un progetto nuovo: bootstrap, configurazione, componenti, tema, integrazione e verifica finale su iOS, Android e web. Ogni passo ha un risultato osservabile, così sai subito se qualcosa manca.

## Obiettivi

- Avviare un progetto Expo con NativeWind partendo dallo schema `npx rn-new --nativewind`.
- Costruire componenti di lista e dettaglio con classi condivise e stati `active:` su `Pressable`.
- Collegare un toggle chiaro/scuro persistente con `useColorScheme` e `AsyncStorage`.
- Integrare uno slider di terze parti con `cssInterop` e combattere le divergenze di specificità.
- Verificare build e comportamento su le tre piattaforme con criteri ripetibili.

## Passo 1: bootstrap e contratto

| Elemento | Scelta | Motivo |
| --- | --- | --- |
| base | Expo SDK con Metro | NativeWind si integra con `withNativeWind` su Metro |
| versione | `nativewind@4.2.x` con `tailwindcss@^3.4.17` | coppia stabile documentata |
| fonti dati | array locale in `src/data/prodotti.ts` | nessuna rete per isolare lo stile |
| schermate | lista e dettaglio con `expo-router` o una `Stack` semplice | navigazione minima |
| tema | `userInterfaceStyle: automatic` più toggle manuale | copre sistema e scelta utente |
| verifica | `npx tsc --noEmit` e prova su web, iOS, Android | tre motori di stile diversi |

```bash
npx rn-new --nativewind catalogo
cd catalogo
npx expo start --clear
npx tsc --noEmit
```

Lo schema `rn-new` crea già `tailwind.config.js`, `global.css`, `metro.config.js` e `babel.config.js` corretti per NativeWind 4: il primo passo reale è capire cosa contiene, non riscriverlo. Apri i quattro file e verifica `content`, `presets`, `withNativeWind(config, { input })` e `jsxImportSource: 'nativewind'`. Se manca la cartella `types`, aggiungi `nativewind-env.d.ts` con la direttiva `/// <reference types="nativewind/types" />`.

```json
// app.json
{
  "expo": {
    "userInterfaceStyle": "automatic",
    "web": { "bundler": "metro" }
  }
}
```

La riga `web.bundler` vale solo per progetti senza Expo Router o con integrazioni manuali; con Expo attuale il web usa Metro di default. `userInterfaceStyle` invece è obbligatorio se vuoi che `useColorScheme` segua il sistema.

## Passo 2: lista e dettaglio

La lista usa `FlatList`, righe come componenti dedicati e uno sfondo esplicito sulla riga premuta: il `Pressable` non ha sfondo proprio di default, e un `active:bg-*` senza colore di base lascia trasparire quello della lista con un effetto incoerente tra iOS e Android. Le due varianti del tema vanno dichiarate entrambe, altrimenti la riga resta chiara o scura a metà.

```tsx
// src/components/RigaProdotto.tsx
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Prodotto } from '../data/prodotti';

export function RigaProdotto({ prodotto }: { prodotto: Prodotto }) {
  return (
    <Link href={`/prodotto/${prodotto.id}`} asChild>
      <Pressable className="border-b border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-900" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900 dark:text-slate-100" numberOfLines={1}>
              {prodotto.nome}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {prodotto.categoria}
            </Text>
          </View>
          <Text className="font-medium text-slate-900 dark:text-slate-100">
            € {prodotto.prezzo.toFixed(2)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
```

```tsx
// app/index.tsx
import { FlatList, Text, View } from 'react-native';
import { RigaProdotto } from '../src/components/RigaProdotto';
import { prodotti } from '../src/data/prodotti';

export default function Catalogo() {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <FlatList
        data={prodotti}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <RigaProdotto prodotto={item} />}
        ItemSeparatorComponent={() => <View className="h-0" />}
        ListEmptyComponent={<Text className="p-6 text-slate-500">Nessun prodotto</Text>}
      />
    </View>
  );
}
```

Tre trappole evitabili qui: `gap-3` su `flex-row` funziona con le versioni recenti di React Native, ma su un SDK vecchio conviene `space-x-3`; il `Link asChild` deve contenere un solo figlio diretto; e `keyExtractor` deve produrre stringhe stabili, altrimenti la lista ricrea righe a ogni render.

## Passo 3: tema chiaro/scuro persistente

Il toggle legge la preferenza salvata all'avvio, imposta il tema e la salva. Il componente è piccolo, ma sta sopra tutta l'app.

```tsx
// src/components/ToggleTema.tsx
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, Text } from 'react-native';
import { useColorScheme } from 'nativewind';

type Tema = 'light' | 'dark';

export function ToggleTema() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('tema').then((salvato) => {
      if (salvato === 'light' || salvato === 'dark') setColorScheme(salvato);
      setPronto(true);
    });
  }, [setColorScheme]);

  const cambia = () => {
    const nuovo: Tema = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(nuovo);
    AsyncStorage.setItem('tema', nuovo);
  };

  return (
    <Pressable onPress={cambia} className="rounded-lg bg-slate-200 px-3 py-2 dark:bg-slate-700">
      <Text className="text-sm text-slate-900 dark:text-slate-100">
        {pronto ? (colorScheme === 'dark' ? 'Chiaro' : 'Scuro') : 'Tema…'}
      </Text>
    </Pressable>
  );
}
```

```bash
npx expo install @react-native-async-storage/async-storage
```

`@react-native-async-storage` è un modulo nativo: dopo l'installazione serve un rebuild dell'app, non solo un reload JS. Se il toggle mostra "Tema…" per sempre, il `then` non è mai arrivato: di solito la dipendenza è installata ma l'app in esecuzione è ancora la build precedente.

## Passo 4: terze parti con cssInterop

Nella schermata di dettaglio aggiungiamo uno slider per la quantità, usando `@react-native-community/slider`, che non accetta `className`. La mappatura si dichiara una volta sola, in un modulo importato da `app/_layout.tsx`, così viene registrata prima di qualsiasi render.

```tsx
// src/theme/slider.ts
import Slider from '@react-native-community/slider';
import { cssInterop } from 'nativewind';

cssInterop(Slider, {
  className: {
    target: 'style',
    nativeStyleToProp: { minimumTrackTintColor: '#4f46e5' },
  },
});
```

```tsx
// app/prodotto/[id].tsx
import { useState } from 'react';
import Slider from '@react-native-community/slider';
import { Text, View } from 'react-native';
import '../src/theme/slider';

export default function Dettaglio() {
  const [quantita, setQuantita] = useState(1);
  return (
    <View className="flex-1 gap-4 bg-white p-4 dark:bg-slate-900">
      <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Quantità: {quantita}
      </Text>
      <Slider
        className="h-10 w-full"
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={quantita}
        onValueChange={setQuantita}
      />
    </View>
  );
}
```

Su uno slider rimappato la classe e uno `style` inline hanno precedenze diverse su nativo e web: se il colore non coincide, prova prima `!` davanti alla utility, per esempio `!bg-indigo-600`, che riporta l'ordine alla specificità CSS su tutte le piattaforme.

## Passo 5: verifica su tre motori

```bash
npx tsc --noEmit
npx expo start --clear        # poi "w" per il web, "i" e "a" per device
npx expo export --platform web
```

Il criterio di uscita è una checklist breve ma obbligatoria: le righe della lista hanno lo stesso padding su iOS e Android; il toggle cambia tema senza riavvio e dopo il kill dell'app riparte dal tema salvato; lo slider ha la stessa altezza e il colore di traccia sul web; `npx tsc --noEmit` non riporta errori su `className`. Se una classe non compare sul web ma funziona su nativo, il primo sospetto è una utility non supportata dal motore web, il secondo una classe generata a runtime con template string.

## Esercizi

1. Aggiungi una sezione "in evidenza" con sfondo `bg-[--accento]` impostato da `vars()` in base alla categoria.
2. Estendi il tema con `hairlineWidth()` per i separatori e verifica che su Android non spariscano.
3. Rendi il toggle a tre stati (chiaro, scuro, sistema) e mostra l'etichetta corretta dopo il riavvio.
4. Integra una libreria di animazioni che accetta solo `style` e passa il colore letto con `useUnstableNativeVariable`.
5. Misura il tempo di primo render con e senza classi su un `FlatList` da mille righe.

<details>
<summary>Soluzione</summary>

1. Un `View style={vars({ '--accento': coloreCategoria })}` avvolge la sezione e i figli usano `bg-[--accento]`; il valore si aggiorna senza ricreare i componenti.
2. In `tailwind.config.js` aggiungi `borderWidth: { hairline: hairlineWidth() }` da `nativewind/theme` e usa `border-hairline`: è 1 pixel fisico, non 1 dp.
3. Lo stato diventa `'light' | 'dark' | 'system'`; `setColorScheme('system')` ripristina la preferenza del dispositivo e la persistenza salva la stringa così com'è.
4. `useUnstableNativeVariable('--accento')` restituisce il valore risolto, che si passa come prop `color` alla libreria.
5. Confronta i risultati con DevTools del web e con il profiler di React Native: le differenze più evidenti stanno nel numero di nodi creati dal runtime interop, non nel layout.

</details>

## Errori comuni

- **Importare `global.css` solo in `App.tsx` spostato da Expo Router**: con Expo Router l'import va nel layout radice, altrimenti le classi arrivano dopo il primo render e lo schermo lampeggia senza stile.
- **Classi condizionali costruite come stringhe**: `bg-${tema}` non esiste nel foglio generato; usa mappe di letterali come `{ dark: 'bg-slate-900', light: 'bg-white' }`.
- **Dimenticare il rebuild dopo una dipendenza nativa**: sia `AsyncStorage` sia lo slider richiedono una build nativa nuova, altrimenti il runtime lancia un errore di modulo mancante.
- **Modificare `tailwind.config.js` e non riavviare Metro**: la configurazione viene letta all'avvio; usa `--clear` per scartare la cache.
- **Verificare solo su un emulatore**: un layout che regge su iOS può traboccare su Android per le font di sistema o su web per il `vh` polyfill.

## In sintesi

Un progetto NativeWind sano parte da uno schema ufficiale e si verifica su tre motori: classi solo come letterali, tema dichiarato in configurazione, dark mode gestita dall'hook con persistenza, componenti di terze parti registrati con `cssInterop`. La checklist finale, tipi, tema persistente, slider coerente e lista senza jank, copre quasi tutti i problemi che si incontrano nelle prime due settimane su un'app nuova. Il passo successivo naturale è il laboratorio su React Native per capire dove NativeWind finisce e dove comincia la logica nativa.

## Fonti

- [NativeWind - Installation](https://www.nativewind.dev/docs/getting-started/installation)
- [NativeWind - Theme helpers](https://www.nativewind.dev/docs/customization/theme)
- [NativeWind - useColorScheme()](https://www.nativewind.dev/docs/api/use-color-scheme)
- [Expo - Using Tailwind CSS with Expo](https://docs.expo.dev/guides/tailwind/)
