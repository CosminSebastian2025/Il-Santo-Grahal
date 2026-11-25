NativeWind porta le utility di Tailwind CSS dentro React Native: invece di `style={{ padding: 12 }}` scrivi `className="p-3"`, e il compilatore traduce le classi in `StyleSheet` nativi per iOS e Android e in CSS reale sul web. Il punto non è la sintassi, è il modello: stesse classi, stesso tema e stessa logica di stati su due piattaforme che hanno motori di stile diversi. In questa lezione capisci cosa fa il compilatore, come convivono className e style, e dove i due motori divergono davvero.

## Obiettivi

- Descrivere la catena className → stile nativo con `react-native-css-interop` e Tailwind CSS 3.
- Usare la configurazione minima: `tailwind.config.js` con preset NativeWind, `global.css`, `metro.config.js`, preset Babel e file dei tipi.
- Capire la relazione tra `className` e `style` e quale vince quando sono sulla stessa vista.
- Riconoscere le differenze di layout tra React Native e il web: direzione di default, unità, shrink.

## Dalla classe allo stile nativo

NativeWind 4 si appoggia a `react-native-css-interop`, un runtime che compila il foglio CSS generato da Tailwind e lo applica come stile React Native. Metro, il bundler di React Native, vede il file `global.css` grazie a `withNativeWind`, genera una versione intermedia delle classi trovate nel codice e la collega ai componenti che ricevono `className`.

| Pezzo | Ruolo | File |
| --- | --- | --- |
| `tailwindcss` 3.x | genera le classi dal contenuto dei file elencati in `content` | `tailwind.config.js` |
| `nativewind` | runtime e preset Tailwind | `nativewind/preset` |
| `react-native-css-interop` | traduce classi in stili nativi, gestisce temi e CSS vars | dentro `nativewind` |
| Metro + `withNativeWind` | collega CSS, asset e bundle | `metro.config.js` |
| preset Babel | abilita `jsxImportSource` e trasformazioni | `babel.config.js` |
| `react-native-reanimated` | animazioni usate dalle transizioni delle utility | dipendenza peer |
| `react-native-safe-area-context` | inset di sistema per utility che ne hanno bisogno | dipendenza peer |

La versione stabile documentata è la 4.2.x con Tailwind CSS 3 (^3.4.17); esiste una release candidate di NativeWind 5 con Tailwind CSS 4, ma i progetti nuovi conviene avviarli sulla 4 finché la 5 non è stabile sul tuo SDK Expo.

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

## Classi, stile e specificità

Un componente NativeWind non sostituisce `style`: i due convivono. La regola di precedenza, documentata in "Style Specificity", è: stili con `!important`, poi stili inline e rimappati, poi le classi secondo l'ordine CSS. In pratica uno `style` inline vince sulla classe dello stesso tipo di proprietà.

```tsx
import { Pressable, Text, View } from 'react-native';

export function RigaArticolo({ nome, onPress }: { nome: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="border-b border-slate-200 active:bg-slate-100">
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Text className="flex-1 text-base font-medium text-slate-900" numberOfLines={1}>
          {nome}
        </Text>
        <Text className="text-slate-400" style={{ fontVariant: ['tabular-nums'] }}>
          x2
        </Text>
      </View>
    </Pressable>
  );
}
```

`style` resta utile quando una proprietà non ha utility equivalente, come `fontVariant`, o quando arriva da una libreria di animazione. Le pseudo-classi native sono un adattamento, non CSS: `active:` si mappa su `onPressIn`/`onPressOut`, `hover:` su `onHoverIn`/`onHoverOut`, `focus:` su `onFocus`/`onBlur`. Il componente deve supportare l'evento, quindi `hover:` funziona su `Pressable` e `TextInput` ma non su `View`.

| Modificatore | Evento che lo attiva | Componenti | Note |
| --- | --- | --- | --- |
| `active:` | `onPressIn` / `onPressOut` | `Pressable`, `TouchableOpacity` | non esiste su `View` |
| `hover:` | `onHoverIn` / `onHoverOut` | `Pressable`, `TextInput` | su touch quasi inutile |
| `focus:` | `onFocus` / `onBlur` | `TextInput`, `Pressable` | utile con tastiera esterna |
| `disabled:` | prop `disabled` vera | `Pressable`, `TextInput` | non dipende da DOM |
| `empty:` | assenza di figli | qualsiasi | raro in app native |

## Layout: dove React Native non è il web

Flexbox in React Native è simile al web ma con default diversi, e NativeWind non li nasconde. Se dimentichi `flex-row`, una riga diventa una colonna; `flexShrink` parte da 0, quindi un testo lungo fa crescere il contenitore invece di accorciarsi.

| Proprietà | Web | React Native | Rimedio pratico |
| --- | --- | --- | --- |
| `flexDirection` | `row` | `column` | dichiara sempre `flex-row` o `flex-col` |
| `flexShrink` | `1` | `0` | `shrink` o `truncate` sui testi in riga |
| `alignContent` | `stretch` | `flex-start` | raro, ma spiega allineamenti inattesi |
| unità | `px` | dp (density-independent pixel) | NativeWind le tratta come equivalenti |
| `vw` / `vh` | CSS | polyfill con `Dimensions.get('window')` | non si aggiornano su rotazione senza render |

Il documento sugli unità lo dice esplicitamente: `vw` e `vh` sono polyfill basati su `Dimensions.get('window')`, quindi un layout che dipende da rotazione e multitasking deve avere comunque un re-render. Le differenze di piattaforma si gestiscono con i modificatori `web:`, `native:`, `ios:`, `android:` sullo stesso elemento, preferendoli a una logica JS che sceglie le classi a runtime.

## Const, estensione dei tipi e prime verifiche

I tipi di `className` non esistono su `View` e `Text` di React Native: arrivano da `nativewind/types`, importati con una direttiva in un file `.d.ts` che non deve chiamarsi `nativewind.d.ts`.

```ts
/// <reference types="nativewind/types" />
```

Il flusso di verifica di un progetto appena configurato è di tre comandi: avviare Metro con cache pulita, controllare che l'app mostri testo centrato e colorato come da docs, e leggere l'avviso nei log se una classe non viene riconosciuta. Una classe non trovata quasi sempre significa file fuori da `content` in `tailwind.config.js`, oppure Metro che serve una cache vecchia.

```bash
npx expo start --clear
npx tsc --noEmit
```

```tsx
// App.tsx
import './global.css';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-blue-500">NativeWind è attivo</Text>
    </View>
  );
}
```

Con questo assetto il confine con React Native diventa leggibile: `className` porta solo presentazione, la logica resta nei componenti e il tema resta nella configurazione. Quando una classe non funziona, la domanda utile non è "quale proprietà CSS manca", ma "il compilatore ha visto questa stringa e l'ha tradotta in una proprietà che il componente nativo applica?".

## Errori comuni

- **Dimenticare `presets: [require('nativewind/preset')]`**: le utility esistono, ma il preset con le customizzazioni native no, e alcune classi producono stili diversi dal previsto.
- **Mettere `content` solo su `./App.tsx`**: le classi usate in `src/` non entrano nel foglio generato e spariscono a runtime senza errore.
- **Assumere che `className` batta lo `style` inline**: succede il contrario; per imporre la classe serve il modificatore `!`, come `!text-red-500`.
- **Usare `hover:` su una `View`**: l'evento non esiste e l'effetto non si attiva; serve `Pressable`.
- **Trattare i dp come px**: su display a densità 3 il valore nativo è triplicato rispetto al web; le utility restano coerenti, i valori calcolati a mano no.
- **Nominare il file dei tipi `nativewind.d.ts`**: TypeScript non lo carica come previsto, e `className` resta un errore di compilazione.

## In sintesi

NativeWind è un compilatore più un runtime: Tailwind genera le classi solo per i file in `content`, Metro le collega al bundle e `react-native-css-interop` le applica come stili nativi. `className` e `style` convivono con una precedenza precisa, e le pseudo-classi sono mappate sugli eventi dei componenti, non sui selettori CSS. Il layout è Flexbox con default diversi dal web, che vanno scritti esplicitamente. Con la configurazione minima giusta e `content` completo, le classi funzionano su iOS, Android e web senza rami di codice separati.

## Fonti

- [NativeWind documentation](https://www.nativewind.dev/)
- [NativeWind - Installation](https://www.nativewind.dev/docs/getting-started/installation)
- [NativeWind - Style Specificity](https://www.nativewind.dev/docs/core-concepts/style-specificity)
- [NativeWind - States & Pseudo-classes](https://www.nativewind.dev/docs/core-concepts/states)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
