Ionic è un toolkit di componenti UI per costruire applicazioni ibride usando tecnologie web: HTML, CSS, JavaScript e TypeScript. Non è un framework JavaScript: si appoggia ad Angular, React o Vue per stato, routing e ciclo di vita, e aggiunge un livello di componenti (`ion-button`, `ion-list`, `ion-tab-bar`) disegnati per assomigliare ai controlli nativi di iOS, Android e Material Design. Il risultato è una sola codebase che gira in un browser, dentro un'app installata tramite Capacitor, oppure come PWA. In questa lezione capisci cosa fa Ionic e, soprattutto, cosa non fa.

## Obiettivi

- Distinguere il ruolo di Ionic (componenti e stile) dal ruolo del framework host e di Capacitor (accesso nativo).
- Riconoscere la struttura minima di un progetto Ionic v9 con React, Angular o Vue.
- Usare i Web Component, il layout `ion-app` con header, content e footer, e la theming a variabili CSS.
- Capire perché i componenti sono Web Component e come questo convive con Angular, React e Vue.
- Scegliere tra webview e PWA per un progetto reale.

## Tre strati, tre responsabilità

Un'app Ionic è composta da strati ben separati. Confonderli è la prima causa di progetti bloccati.

| Strato | Cosa fornisce | Esempio |
| --- | --- | --- |
| Framework host | stato, routing, build, componenti di logica | Angular 20, React 19, Vue 3 |
| Ionic Framework | componenti UI, temi, gesti, navigazione a stack | `IonTabs`, `IonModal`, `IonRange` |
| Capacitor | ponte verso API native e packaging | camera, filesystem, notifiche push |

Ionic non gestisce la business logic né il data layer: un servizio di rete è codice del framework host. Non gestisce nemmeno l'accesso all'hardware: `navigator.geolocation` nel browser e `@capacitor/geolocation` nell'app nativa sono due mondi con permessi diversi. Ionic v9 (pubblicato nel 2026) richiede un runtime che supporti i Web Component nativi, quindi i browser moderni e WebView aggiornate.

```bash
# progetto React, da cartella vuota
npm install -g @ionic/cli
ionic start demo-bloccante tabs --type=react --capacitor
cd demo-bloccante
ionic serve
```

`ionic start` genera un progetto già configurato con routing, tema e dipendenze Capacitor. La cartella `src/pages` contiene una pagina per tab, `src/theme/variables.css` i colori, `capacitor.config.ts` la configurazione della shell nativa.

## Componenti: markup, non widget opachi

I componenti Ionic sono Web Component con tag in kebab-case. In React e Vue si usano direttamente, in Angular si importano dal pacchetto `@ionic/angular` che espone le direttive. Un form di contatto usa `IonHeader`, `IonContent`, `IonItem` e `IonInput`: il markup descrive la struttura, il CSS la personalizza.

```tsx
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonInput, IonButton } from '@ionic/react';
import { useState } from 'react';

export default function ContattoForm() {
  const [email, setEmail] = useState('');
  const valido = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email);

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Contatto</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonInput
              label="Email"
              labelPlacement="stacked"
              type="email"
              value={email}
              onIonInput={(e) => setEmail(e.detail.value ?? '')}
            />
          </IonItem>
        </IonList>
        <IonButton expand="block" disabled={!valido}>Invia</IonButton>
      </IonContent>
    </>
  );
}
```

Due dettagli fondamentali: gli eventi dei Web Component sono `onIonInput`, `onIonChange`, `onIonDismiss`, non `onChange`; il valore letto è `e.detail.value`, non `e.target.value` in modo affidabile durante la digitazione. Senza `IonApp` alla radice il layout non si stabilizza e il contenuto può finire sotto la status bar.

## Theming e variabili CSS

I colori non si sovrascrivono con selettori puntuali sui componenti: si cambiano le variabili CSS dichiarate da Ionic. Un brand aziendale si applica in `src/theme/variables.css` impostando `--ion-color-primary` e i suoi derivati.

```css
:root {
  --ion-color-primary: #0f766e;
  --ion-color-primary-rgb: 15, 118, 110;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #0d6861;
  --ion-color-primary-tint: #27847d;
  --ion-font-family: "Inter", system-ui, sans-serif;
}
```

I valori `shade` e `tint` servono agli stati pressed e hover dei pulsanti: definendo solo `--ion-color-primary` il toggle assume toni incoerenti. Ionic riconosce inoltre `prefers-color-scheme` e applica il tema scuro con la classe `.ion-palette-dark`, personalizzabile a sua volta.

## Da webview a PWA: dove gira il codice

Lo stesso bundle può essere servito in tre contesti, con vincoli differenti.

| Contesto | Come gira | Accesso nativo | Distribuzione |
| --- | --- | --- | --- |
| Browser | server web | limitato alle API web | URL pubblico |
| PWA | browser installabile | limitato, service worker per offline | HTTPS obbligatorio |
| App ibrida | WebView in shell Capacitor | plugin Capacitor completi | App Store e Play Store |

Il codice di Ionic è identico; cambia il modo in cui si accede alle capacità del dispositivo. Una funzione che deve funzionare in tutti e tre i contesti controlla `Capacitor.isNativePlatform()` e prevede un fallback web. L'alternativa nativa pura, per app con grafica 3D o accesso esteso al sistema, resta fuori dal perimetro di Ionic.

## Errori comuni

- **Trattare Ionic come framework**: chi cerca il router "di Ionic" per React scopre che il router è React Router e Ionic fornisce solo gli outlet (`IonRouterOutlet`).
- **Sovrascrivere `background-color` sui componenti**: i componenti usano la variabile `--background`, e un `background` diretto viene ignorato o sporca gli stati.
- **Ascoltare `onChange` sui Web Component React**: l'evento è `onIonChange`; `onChange` non scatta perché i React wrapper espongono solo eventi custom mappati.
- **Dimenticare `IonApp`**: senza il contenitore radice, safe area e scorrimento su iOS non funzionano.
- **Assumere che `ionic serve` equivalga al dispositivo**: la webview ha un motore e una safe area diversi; serve `npx cap run android` o `ios` per accorgersene.
- **Installare plugin Capacitor senza `npx cap sync`**: il codice JS c'è, la parte nativa no, e la chiamata fallisce a runtime.

## In sintesi

Ionic fornisce l'interfaccia, il framework host fornisce la logica, Capacitor fornisce il dispositivo. I componenti sono Web Component con eventi `onIon*` e valori in `detail`, si personalizzano con variabili CSS e vivono in un layout con `IonApp`, header, content e footer. Lo stesso codice gira in browser, come PWA o dentro una WebView: la differenza è nelle API disponibili e nel processo di distribuzione.

## Fonti

- [Ionic Framework - Documentation](https://ionicframework.com/docs)
- [Ionic - UI Components](https://ionicframework.com/docs/components)
- [Capacitor - Documentation](https://capacitorjs.com/docs)
- [Ionic - Documentation (React)](https://ionicframework.com/docs/react)
