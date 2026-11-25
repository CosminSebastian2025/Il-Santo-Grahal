Electron è un runtime che trasforma un'applicazione web in un programma desktop impacchettando Chromium e Node.js nello stesso eseguibile. È la tecnologia dietro Visual Studio Code, Slack, Discord e Teams, e la sua peculiarità non è l'interfaccia ma il modello di processo: un processo principale controlla finestre, file e sistema, e ogni finestra è un processo di rendering isolato. In questa lezione vedi come sono organizzati questi processi (l'API stabile corrente è Electron 45), come si struttura un progetto e quali scelte pesano su dimensioni, sicurezza e prestazioni.

## Obiettivi

- Distinguere processo principale, processo di rendering, preload e processi utility.
- Sapere dove vivono le API Node.js e dove quelle del DOM.
- Strutturare un progetto Electron con `main`, `preload` e renderer separati.
- Creare una `BrowserWindow` sicura con `contextIsolation` e `sandbox`.
- Riconoscere il costo reale di Electron in memoria e dimensioni del pacchetto.

## Tre processi, tre responsabilità

Electron eredita il modello multi-processo di Chromium: il **main process** è un processo Node pieno che crea finestre, gestisce menu, tray, lifecycle dell'app; ogni **renderer** è una pagina web in un processo Chromium separato, con l'API DOM ma senza accesso diretto a Node; il **preload script** gira nel renderer prima della pagina e fa da ponte controllato.

| Processo | API disponibili | Compito tipico |
| --- | --- | --- |
| Main | Node completo + `app`, `BrowserWindow`, `ipcMain`, `dialog` | lifecycle, finestre, file, menu, updater |
| Renderer | DOM, `fetch`, Web API | interfaccia, stato UI |
| Preload | Node limitato + `contextBridge`, `ipcRenderer` | esporre funzioni specifiche |
| Utility | Node | parsing, worker pesanti, rete di background |

Da Electron 20 il renderer parte con `sandbox: true` per impostazione predefinita: il preload non ha più `require` di moduli Node arbitrari, ma solo un set ridotto (`electron`, `events`, `timers`, `url`). Questa singola scelta ha eliminato la maggior parte degli exploit basati su codice remoto nel renderer.

## Un progetto minimo completo

```js
// package.json (estratto)
{
  "main": "main.js",
  "scripts": { "start": "electron ." }
}
```

```js
// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

function creaFinestra() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  win.loadFile("index.html");
}

ipcMain.handle("app:versione", () => app.getVersion());
app.whenReady().then(creaFinestra);
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
```

```js
// preload.js
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  versione: () => ipcRenderer.invoke("app:versione")
});
```

```html
<!-- index.html -->
<script>
  document.querySelector("#v").textContent = await window.api.versione();
</script>
```

Il flusso è: il renderer chiama `window.api.versione()`, il preload traduce in `ipcRenderer.invoke`, il main risponde con `ipcMain.handle`. Il renderer non ha né `require` né `process`: la superficie che vede è solo quella esposta dal preload.

## `webPreferences`: le cinque opzioni che contano

| Opzione | Default (45) | Perché lasciarla |
| --- | --- | --- |
| `contextIsolation` | `true` | isola il contesto del preload dal mondo della pagina |
| `sandbox` | `true` | rende il renderer un processo Chromium ristretto |
| `nodeIntegration` | `false` | evita `require` dentro la pagina |
| `webSecurity` | `true` | blocca richieste cross-origin e file locali |
| `preload` | assente | unico ingresso controllato alle API del main |

Le prime tre sono il recinto: insieme significano che un XSS nel renderer non può leggere file né lanciare processi. Disattivarne una "perché una libreria non funziona" è il primo passo di una regressione di sicurezza che consente a qualsiasi script in pagina di eseguire codice sul computer.

## Packaging: cosa finisce nel pacchetto

Electron distribuisce Chromium (circa 130-160 MB compresso, più una cartella di risorse) e un runtime Node in ogni pacchetto. Il vantaggio è la coerenza: la stessa versione di Chromium e Node gira su Windows, macOS e Linux, e non c'è da combattere con WebView di sistema diverse. Lo svantaggio è che ogni app porta il proprio browser.

| Pacchetto | Contenuto | Nota |
| --- | --- | --- |
| `.app` / `.exe` distribuito | Chromium + Node + codice | peso fisso per app |
| `app.asar` | solo il tuo codice e le dipendenze | di solito pochi MB |
| processi a runtime | 1 main + 1 GPU + 1 renderer per finestra | la memoria cresce con le finestre |

`electron-builder` o `@electron-forge` producono installer (`NSIS`, `dmg`, `deb`, `AppImage`) e aggiornamenti (`electron-updater`). Il codice dell'app finisce in un archivio `app.asar`: non è cifratura, è un contenitore leggibile da chiunque abbia gli strumenti - per questo segreti e chiavi non vanno nel bundle.

## Errori comuni

- **Attivare `nodeIntegration: true` per usare `fs` nel renderer**: qualsiasi script nella pagina diventa esecuzione di codice; il preload con `ipcRenderer.invoke` fa la stessa cosa in modo controllato.
- **Esporre l'intero `ipcRenderer` su `window`**: l'API diventa un proxy generico verso il main e vanifica l'isolamento; esponi funzioni specifiche.
- **Caricare URL remoti nella finestra principale**: una pagina di terzi finisce nello stesso renderer che ha il preload; separa le viste remote in processi senza preload.
- **Assumere che `app.quit()` aspetti i salvataggi**: il main va progettato con `before-quit` e `will-quit` se ci sono scritture pendenti.
- **Valutare Electron solo dal peso**: senza bundling separato delle risorse e con due librerie di frontend, anche un'app "leggera" arriva a 300 MB installati.

## In sintesi

Electron è un contenitore di tre processi: main Node che governa l'app, renderer Chromium che disegna, preload che fa da ponte esplicito. La sicurezza dipende da tre default - `contextIsolation`, `sandbox`, `nodeIntegration: false` - e dal non superarli. Il costo è fisso e noto in anticipo (Chromium e Node in ogni pacchetto), il beneficio è un rendering identico su tutti i sistemi. Con questi concetti puoi leggere il codice di VS Code o di qualunque app Electron senza sorprese.

## Fonti

- [Electron - Documentation](https://www.electronjs.org/docs/latest/)
- [Electron - Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron - Tutorial: First App](https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app)
- [Electron - Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
