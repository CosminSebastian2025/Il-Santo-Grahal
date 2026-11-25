Un'app Ionic diventa installabile quando entra in una shell nativa: Capacitor compila la webview in un progetto Android e iOS, espone l'hardware tramite plugin e permette di aggiornare il codice web come asset locale. In questa lezione costruisci la pipeline completa, dalla pagina che chiama la fotocamera fino al bundle firmato, e impari dove si rompe il ciclo tra webview, plugin e store.

## Obiettivi

- Aggiungere Capacitor a un progetto Ionic e capire cosa genera `cap add`.
- Chiamare un plugin nativo (`Camera`, `Preferences`, `Filesystem`) con gestione dei permessi e fallback web.
- Usare il plugin come sorgente di servizi condivisi tramite dependency injection del framework host.
- Configurare icona, splash e permessi nel manifest Android e nel `Info.plist` iOS.
- Produrre un APK di debug e un bundle release firmato, sapendo cosa cambia tra i due.

## Dalla webview alla shell nativa

`@capacitor/cli` crea due progetti nativi che copiano il build web dentro `public/` dell'app. La webview carica quei file dal filesystem locale, non da un server remoto, quindi l'app funziona offline per costruzione.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Demo Bloccante" it.example.demo --web-dir=dist
npm run build                 # produce dist/
npx cap add android
npx cap add ios
npx cap sync                  # copia dist/ e sincronizza i plugin
npx cap run android           # build APK di debug e installazione
```

Tre comandi non sono intercambiabili: `cap copy` copia il bundle web, `cap update` sincronizza solo i plugin, `cap sync` fa entrambi. Dimenticare `sync` dopo `npm install @capacitor/camera` produce l'errore "plugin not implemented" a runtime, anche se il codice TypeScript compila.

| File | Ruolo |
| --- | --- |
| `capacitor.config.ts` | appId, appName, cartella web, impostazioni server |
| `android/app/src/main/AndroidManifest.xml` | permessi, activity, intent filter |
| `ios/App/App/Info.plist` | descrizioni d'uso delle API sensibili |
| `android/variables.gradle` | versioni SDK e dipendenze Gradle |

## Il ciclo callbacks nativi e permessi

I plugin Capacitor ritornano Promise. I permessi però non sono un dettaglio implementativo: su Android 13+ e iOS 17+ l'utente può negarli, e la tua app deve funzionare anche in quello stato. Il pattern corretto separa il controllo dal consumo.

```ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';

export async function scattaFoto(): Promise<string | null> {
  const stato = await Camera.checkPermissions();
  if (stato.camera === 'denied' && stato.photos === 'denied') return null;
  const permessi = stato.camera === 'prompt' || stato.photos === 'prompt'
    ? await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
    : stato;
  if (permessi.camera === 'denied' && permessi.photos === 'denied') return null;

  const foto = await Camera.getPhoto({
    quality: 80,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt, // camera o galleria
  });
  await Preferences.set({ key: 'ultima-foto', value: foto.path ?? '' });
  return foto.webPath ?? null;
}
```

`webPath` è un URI che la webview sa caricare (`capacitor://localhost/_capacitor_file_...`), `path` è il percorso reale utile per caricare il file via `Filesystem` o `fetch` con `CapacitorHttp`. Salvare solo `webPath` in un database e rileggerlo dopo un riavvio è una fonte classica di immagini rotte: si salva `path` e si mostra `Capacitor.convertFileSrc(path)`.

Il modello transazionale di `CameraSource.Prompt` è la scelta giusta per un'app che gira su entrambi i sistemi, perché su iOS la selezione della galleria non richiede il permesso della fotocamera e viceversa: `CameraSource.Camera` forcella l'esperienza e va giustificato.

## Servizi condivisi e stato del framework

Il plugin non va chiamato dai componenti uno per uno: un servizio del framework host incapsula Capacitor e l'app lo inietta dove serve. In Angular `providedIn: 'root'`, in React un hook con context, in Vue un composable. Lo stesso servizio espone il fallback web, così i test girano in browser con `Playwright` e le build web restano utilizzabili.

```ts
// src/services/foto.ts - framework-agnostico
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const piattaforma = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

export async function apriSorgente(): Promise<HTMLInputElement | null> {
  if (Capacitor.isNativePlatform()) return null; // usa il plugin
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  return input;
}
```

| Scelta | Quando | Note |
| --- | --- | --- |
| Servizio con iniezione | stato condiviso tra pagine | mockabile nei test |
| Chiamata diretta nel componente | prototipo o demo | difficoltà di test |
| Plugin community | installazione rapida | verifica lo stato di manutenzione |
| Plugin custom | API aziendale o nativa mancante | più codice nativo da mantenere |

Per una lista che si aggiorna quando arriva una foto, lo stato vive nel framework, non nella webview: Ionic non ha un sistema di stato globale e non deve averlo. React Query o Redux, Signals in Angular o Pinia in Vue sono i luoghi corretti; la funzione che chiama `Camera.getPhoto` resta pura e testabile con un mock.

## Permessi, icone e release

Prima di pubblicare, allinea i tre anelli: configurazione Capacitor, manifest iOS e manifest Android. Android dichiara `CAMERA` e le query di intent; iOS richiede testo in italiano in `NSCameraUsageDescription` e `NSPhotoLibraryUsageDescription`, e la revisione App Store rifiuta descrizioni vuote o generiche.

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

Per il build release Android servono un keystore e le credenziali in un file ignorato da Git:

```bash
keytool -genkeypair -v -keystore release.keystore -alias demo -keyalg RSA -keysize 2048 -validity 10000
cd android && ./gradlew bundleRelease   # AAB per Play Store
./gradlew assembleRelease               # APK per test interno
```

Un errore tipico è compilare un APK con `targetSdk` vecchio perché `variables.gradle` è rimasto al valore generato mesi prima: il Play Store rifiuta il caricamento se il target è inferiore al minimo richiesto. Le icone e le splash si generano da un singolo PNG 1024×1024 con `@capacitor/assets`, che scrive nei percorsi attesi da Android e `Assets.xcassets`.

Per l'aggiornamento OTA senza store esistono Capacitor Live Updates (servizi Ionic) e soluzioni self-hosted: cambia solo il bundle web dentro `public/`, mai il codice nativo. Va bene per fix di UI, non per nuove API native.

## Errori comuni

- **Plugin installato ma nessun `cap sync`**: il build web si aggiorna, il nativo resta vecchio e il plugin risulta assente.
- **Salvare `webPath` invece di `path`**: dopo il riavvio l'URI temporaneo non risolve più.
- **Usare `http://localhost` in produzione**: la webview blocca richieste in chiaro; va configurato `server.androidScheme` e il traffico HTTPS.
- **Testare solo l'emulatore**: le viste hardware reali differiscono per permessi, safe area e Android WebView version.
- **Assumere che la cache Gradle si aggiorni da sola**: a volte trattiene un vecchio plugin e `./gradlew clean` risolve.
- **Perdere il keystore**: un APK firmato con una chiave nuova non può aggiornare l'app installata; il keystore va in un vault.

## In sintesi

Capacitor trasforma un'app web in un'app installata copiando il bundle in una webview nativa ed esponendo l'hardware con plugin Promise-based. Il ciclo corretto è build web, `cap sync`, build nativa, e i tre manifest vanno allineati prima della release. I plugin si incapsulano in servizi del framework host con fallback web, e il keystore di firma è un asset crittografico da custodire come tale.

## Fonti

- [Capacitor - Documentation](https://capacitorjs.com/docs)
- [Capacitor - Plugins](https://capacitorjs.com/docs/plugins)
- [Capacitor - Configuration](https://capacitorjs.com/docs/config)
- [Capacitor - Camera API](https://capacitorjs.com/docs/apis/camera)
