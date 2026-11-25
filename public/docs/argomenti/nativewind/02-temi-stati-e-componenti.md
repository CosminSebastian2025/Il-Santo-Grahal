In un'app reale la configurazione di NativeWind non è un dettaglio: un file fuori da `content`, una dipendenza nativa salita di versione o un tema calcolato dinamicamente bastano a far sparire le classi o a lasciare schermate bianche in dark mode. Questa lezione copre il secondo livello: stati e varianti, tema e dark mode, CSS variables con `vars()`, classi per piattaforma e integrazione con componenti di terze parti via `cssInterop` e `remapProps`.

## Obiettivi

- Costruire componenti con stati combinati (`active:`, `disabled:`, `group-*`) senza scrivere logica JS per il colore.
- Impostare un tema con colori semantici in `tailwind.config.js` e gestire dark mode di sistema e manuale con `colorScheme.set`.
- Passare valori runtime dal JS alle classi con `vars()` e `useUnstableNativeVariable`.
- Applicare classi a componenti di terze parti con `cssInterop` e `remapProps`, sapendo chi vince in caso di conflitto.
- Risolvere le differenze iOS, Android e web con i modificatori `platform:`, `web:`, `native:`.

## Stati, varianti e gruppi

NativeWind supporta i modificatori di Tailwind ma li traduce in condizioni React Native. `active:` risponde alla pressione, `disabled:` alla prop `disabled` del componente e `empty:` all'assenza di figli. Si possono combinare: tutte le condizioni devono essere vere.

```tsx
import { Pressable, Text } from 'react-native';

type Props = { etichetta: string; onPress: () => void; disabilitato?: boolean };

export function Pulsante({ etichetta, onPress, disabilitato }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato}
      className="rounded-xl bg-indigo-600 px-4 py-3 active:bg-indigo-800 disabled:opacity-50"
    >
      <Text className="text-center text-base font-semibold text-white">{etichetta}</Text>
    </Pressable>
  );
}
```

Per far reagire i figli allo stato del contenitore si usa `group`: il genitore porta `group/{nome}` e i figli usano `group-active/{nome}:` oppure `group-focus/{nome}:`. I gruppi con nome evitano collisioni quando due contenitori interattivi si annidano.

Il tema può leggere anche funzioni native: `platformSelect`, `platformColor`, `hairlineWidth` e `pixelRatio` da `nativewind/theme` producono valori diversi per piattaforma e densità. Un esempio tipico è una linea di separazione di 1 pixel fisico, che su schermi a densità 3 non può essere `border` intero: si dichiara `borderWidth.hairline = hairlineWidth()` e si usa `border-hairline`.

| Esigenza | Soluzione | Attenzione |
| --- | --- | --- |
| cambio colore alla pressione | `active:bg-*` su `Pressable` | non funziona su `View` |
| figlio che cambia col contenitore premuto | `group-active/nome:` | il genitore deve avere il nome |
| stato disabilitato | `disabled:opacity-50` | richiede la prop `disabled` |
| badge con attributi dati | `[&[data-attivo]]:bg-green-500` | passa per `dataSet` su React Native Web |
| varianti per piattaforma | `ios:pt-3 android:pt-1` | utili per status bar e barre di sistema |
| separatore di 1 pixel fisico | `border-hairline` dal helper `hairlineWidth` | valore diverso per ogni densità |

## Tema, colori semantici e dark mode

Definire colori semantici nel tema riduce le classi ripetute e permette di cambiare la tavolozza in un punto solo. Su NativeWind 4 si estende `theme.colors` con nomi come `superficie` e `testoPrimario`.

```js
// tailwind.config.js
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        superficie: { claro: '#ffffff', scuro: '#0f172a' },
        marca: { DEFAULT: '#4f46e5', chiara: '#eef2ff' },
      },
    },
  },
  plugins: [],
};
```

La dark mode ha due modalità documentate. La prima è di sistema: `useColorScheme` legge la preferenza del dispositivo e su Expo richiede `userInterfaceStyle: "automatic"` in `app.json`, altrimenti l'app resta bloccata sul tema chiaro. La seconda è manuale: la funzione `setColorScheme` del hook forza il tema e va persistito con `AsyncStorage` se deve sopravvivere al riavvio.

```tsx
import { Pressable, Text } from 'react-native';
import { useColorScheme } from 'nativewind';

export function InterruttoreTema() {
  const { colorScheme: attuale, setColorScheme } = useColorScheme();
  return (
    <Pressable
      onPress={() => setColorScheme(attuale === 'dark' ? 'light' : 'dark')}
      className="rounded-lg bg-slate-200 p-3 dark:bg-slate-700"
    >
      <Text className="text-slate-900 dark:text-slate-100">
        Tema: {attuale}
      </Text>
    </Pressable>
  );
}

export function tornaAlSistema() {
  // accetta "light", "dark" o "system"
  colorScheme.set('system');
}
```

L'hook restituisce anche `toggleColorScheme`, che evita di scrivere il confronto ogni volta, e `setColorScheme('system')` riporta l'app alla preferenza del dispositivo. Dichiara sempre entrambe le varianti: una sola classe per il tema scuro senza la controparte chiara è una delle cause più comuni di elementi invisibili, perché React Native fatica con stili applicati condizionalmente durante transizioni e animazioni.

## Valori runtime con vars()

Le utility statiche non bastano quando il colore arriva dal server, da un'azienda con branding variabile o da uno stato JS. `vars()` restituisce un oggetto stile con CSS variables che si propagano ai figli e sono reattive.

```tsx
import { Text, View } from 'react-native';
import { vars, useUnstableNativeVariable } from 'nativewind';

export function FasciaMarca({ colore }: { colore: string }) {
  return (
    <View style={vars({ '--marca': colore })} className="rounded-md bg-[--marca] p-4">
      <Riquadro />
    </View>
  );
}

function Riquadro() {
  const colore = useUnstableNativeVariable('--marca');
  return <Text className="text-white">{String(colore)}</Text>;
}
```

`useUnstableNativeVariable` porta il prefisso "unstable" perché l'API può cambiare: usalo dove serve leggere il valore in JS, per esempio per passarlo a una libreria che accetta solo una prop `color`. `vars` invece è stabile ed è la strada giusta per il theming dinamico.

## Componenti di terze parti

Una libreria che non accetta `className` si adatta in due modi. `cssInterop` dichiara la mappatura da `className` a uno o più prop `style` e funziona a livello di componente; `remapProps` fa la stessa cosa su un componente già esistente senza riscriverlo.

```tsx
import { Text, View } from 'react-native';
import { cssInterop, remapProps } from 'nativewind';
import Slider from '@react-native-community/slider';

cssInterop(Slider, { className: { target: 'style', nativeStyleToProp: { color: true } } });
remapProps(Text, { className: 'style' });
```

Sui componenti rimappati la precedenza cambia e può causare divergenze tra nativo e web: una classe su un prop rimappato applica il colore, ma uno `style` inline può scavalcarla con esiti diversi sui due motori. Il rimedio documentato è `!important` nel modificatore, per esempio `!text-red-500`, che riporta l'ordine alla specificità CSS su tutte le piattaforme.

| Modalità | Cosa fa | Quando usarla |
| --- | --- | --- |
| `cssInterop` | registra una mappatura `className` → prop per un componente | wrapper di librerie non NativeWind |
| `remapProps` | dichiara che un prop esistente riceve le classi | estendere componenti React Native |
| `!` davanti alla classe | forza la precedenza | conflitti con `style` inline |

## Errori comuni

- **Solo `dark:` senza classe chiara**: in tema chiaro l'elemento usa il default e diventa illeggibile; dichiara sempre entrambe le varianti.
- **`useColorScheme` senza `userInterfaceStyle` su Expo**: la preferenza di sistema non viene letta e l'app resta sempre chiara.
- **`className` su una libreria senza `cssInterop`**: la prop viene ignorata e non produce errori; la classe non arriva al componente nativo.
- **Aspettarsi che `!` risolva qualsiasi conflitto**: ordina le classi per specificità, ma non cambia quali proprietà il componente nativo applica dopo.
- **Dipendenze peer mancanti**: senza `react-native-safe-area-context` e `react-native-reanimated` molte utility non compilano; l'upgrade va fatto con `npx expo install` per rispettare l'SDK.
- **Classi costruite con template string senza farle vedere al compilatore**: Tailwind estrae stringhe letterali; `bg-${colore}` non genera nulla, mentre `{rosso ? 'bg-red-500' : 'bg-blue-500'}` sì.

## In sintesi

Gli stati di NativeWind sono varianti tradotte in eventi e prop native, e `group` estende la reazione ai figli. Il tema si centralizza nella configurazione, la dark mode si legge da `useColorScheme` o si forza con `colorScheme.set`, sempre dichiarando le due varianti. I colori dinamici passano da `vars()` come CSS variables reattive, e i componenti di terze parti si integrano con `cssInterop` e `remapProps`. La regola costante è che il compilatore vede solo stringhe letterali di classi: qualunque classifica calcolata deve restare un insieme di letterali scelti da JS.

## Fonti

- [NativeWind - States & Pseudo-classes](https://www.nativewind.dev/docs/core-concepts/states)
- [NativeWind - Dark Mode](https://www.nativewind.dev/docs/core-concepts/dark-mode)
- [NativeWind - vars() and useUnstableNativeVariable()](https://www.nativewind.dev/docs/api/vars)
- [NativeWind - cssInterop](https://www.nativewind.dev/docs/api/css-interop)
