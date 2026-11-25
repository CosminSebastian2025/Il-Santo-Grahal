In questo laboratorio costruisci `electron-note`, un editor di appunti con tre finestre (principale, impostazioni, anteprima), un preload tipizzato, un processo di indice in `utilityProcess`, la checklist di sicurezza applicata, i fuses attivi e un pacchetto firmato con `electron-forge`. Ogni passo ha un criterio verificabile: alla fine hai un'app installabile che supera `npx @electron/fuses` senza fuses aperti.

## Obiettivi

- Inizializzare un progetto con `create-electron-app` e la struttura main/preload/renderer.
- Esporre un'API stretta con `contextBridge` e tipizzarla con un file `.d.ts`.
- Costruire un indice di ricerca in `utilityProcess` senza bloccare il main.
- Applicare `setWindowOpenHandler`, CSP e validazione dei percorsi.
- Impacchettare, attivare i fuses e firmare gli installer.

## Passo 1 - Scaffolding

```bash
npx create-electron-app@latest electron-note --template=webpack
cd electron-note
npm start
```

La struttura prodotta mette `src/main.js`, `src/preload.js` e `src/renderer.js` con un `index.html`. Criterio: `npm start` apre la finestra e la console del terminale mostra l'evento `ready` del main. Se il processo muore subito su Linux, mancano le librerie `libnss3` e `libgtk-3-0`; su Windows, il primo avvio scarica il binario Electron (circa 100 MB) dal registry npm.

## Passo 2 - Finestre dichiarative

Sposta la configurazione della finestra principale in una funzione riutilizzabile, con tutte le opzioni di sicurezza esplicite, e aggiungi una finestra impostazioni.

```js
const { app, BrowserWindow } = require("electron");
const path = require("node:path");

function finestra(apre, opzioni) {
  const win = new BrowserWindow({
    ...opzioni,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  win.loadFile(path.join(__dirname, "renderer", apre));
  return win;
}

app.whenReady().then(() => {
  finestra("index.html", { width: 1000, height: 800, title: "Note" });
  finestra("impostazioni.html", { width: 420, height: 320, parent: BrowserWindow.getAllWindows()[0] });
});
```

Criterio: nella finestra impostazioni apri i DevTools e verifica `typeof require` (deve essere `"undefined"`) e `typeof process` (`"undefined"`): è la prova che il sandbox è attivo.

## Passo 3 - Preload tipizzato e IPC per dominio

Il preload espone quattro verbi e nient'altro. Il file `.d.ts` rende l'API visibile a TypeScript nel renderer senza import di `electron`.

```js
// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("note", {
  elenco: () => ipcRenderer.invoke("note:elenco"),
  leggi: (nome) => ipcRenderer.invoke("note:leggi", nome),
  salva: (nome, testo) => ipcRenderer.invoke("note:salva", nome, testo),
  suIndice: (cb) => {
    const l = (_e, n) => cb(n);
    ipcRenderer.on("note:indice", l);
    return () => ipcRenderer.removeListener("note:indice", l);
  }
});
```

```ts
// src/renderer/note.d.ts
export interface ApiNote {
  elenco(): Promise<string[]>;
  leggi(nome: string): Promise<string>;
  salva(nome: string, testo: string): Promise<void>;
  suIndice(cb: (totale: number) => void): () => void;
}
declare global { interface Window { note: ApiNote } }
```

Nel main le tre funzioni usano la stessa validazione del nome vista nella lezione precedente. Criterio: dal renderer, `window.note.salva("../../etc/passwd", "x")` viene rifiutata con "nome non valido" e nessun file esce da `userData`.

## Passo 4 - Indice in `utilityProcess`

Il conteggio delle parole su centinaia di note appartiene a un processo utility, non al main.

```js
// src/indice.js - processo utility
const fs = require("node:fs/promises");
const path = require("node:path");

process.parentPort.on("message", async ({ data }) => {
  const file = await fs.readdir(data.cartella);
  let totale = 0;
  for (const f of file) {
    const testo = await fs.readFile(path.join(data.cartella, f), "utf8").catch(() => "");
    totale += testo.split(/\s+/).filter(Boolean).length;
    process.parentPort.postMessage({ totale });
  }
});
```

```js
// nel main
const { utilityProcess } = require("electron");
const indice = utilityProcess.fork(path.join(__dirname, "indice.js"));
indice.on("message", (m) => finestraPrincipale.webContents.send("note:indice", m.totale));
indice.postMessage({ cartella: path.join(app.getPath("userData"), "note") });
```

Criterio: con 500 note il main resta reattivo (la finestra si sposta senza scatti) e la UI riceve aggiornamenti progressivi. Se usi `fs.readFileSync` nel main, lo stesso test mostra la finestra bloccata: è la differenza misurata.

## Passo 5 - Blocchi di sicurezza e CSP

```js
app.on("web-contents-created", (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (evento) => evento.preventDefault());
  contents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
});
```

Nell'HTML delle pagine, l'header CSP va dichiarato come meta (o servito da un handler `protocol`), e deve permettere solo gli script locali:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:">
```

Criterio: un `<script>alert(1)</script>` iniettato dal DevTools non parte. Un `style-src 'unsafe-inline'` resta necessario solo se generi stili inline; meglio toglierlo prima della release.

## Passo 6 - Pacchetto con Forge

```bash
npx electron-forge make --platform=win32 --arch=x64
ls out/make
```

`make` produce `out/make/squirrel.windows/x64/*.exe` o il pacchetto configurato nel `forge.config.js`; sul Mac `out/make/zip/darwin` e `out/make/dmg`. Il codice dell'app finisce in `app.asar`: verifica con `npx asar list resources/app.asar` che non ci siano file `.map`, `node_modules` inutili o test dentro il bundle.

Criterio: `du -sh out/*/electron-note.app` o il corrispettivo Windows mostra che l'archivio dell'app pesa ordini di grandezza meno del runtime: è normale, perché Chromium domina il pacchetto.

## Passo 7 - Fuses e firma

```bash
npx @electron/fuses read --app "out/electron-note-win32-x64/electron-note.exe"
```

Il comando riporta i fuses attivi. Nel `forge.config.js`, con il plugin `@electron/fuses`, imposta almeno `RunAsNode: false`, `EnableNodeOptionsEnvironmentVariable: false` e `EnableNodeCliInspectArguments: false` prima di generare la distribuzione. Sul Mac, firma con Developer ID e notarizzazione:

```bash
codesign --deep --force --sign "Developer ID Application: ..." out/electron-note.app
xcrun notarytool submit out/electron-note.zip --keychain-profile profilo --wait
xcrun stapler staple out/electron-note.app
```

Criterio: `spctl -a -vv` sull'app firmata risponde "accepted", e il `read` dei fuses non riporta valori aperti.

## Passo 8 - Test end-to-end

```js
// e2e.spec.js con Playwright (_electron)
const { _electron: electron } = require("playwright");
const app = await electron.launch({ args: ["./src"] });
const win = await app.firstWindow();
await win.evaluate(() => window.note.salva("prova", "tre parole qui"));
await win.reload();
const testo = await win.evaluate(() => window.note.leggi("prova"));
console.log(testo, await app.evaluate(({ app }) => app.getVersion()));
```

Criterio: il test passa in locale e in CI senza aprire finestre visibili (`--headless` non esiste in Electron: si usa un runner con display o `xvfb-run` su Linux).

## Errori comuni

- **Passare funzioni tramite `contextBridge`**: vengono serializzate e muoiono; esponi solo funzioni dal preload.
- **Chiamare `ipcRenderer.on` a ogni render della UI**: listener duplicati; restituisci sempre la funzione di cleanup.
- **`utilityProcess` creato prima di `app.whenReady()`**: il processo parte e resta orfano se l'app si chiude; crealo dopo il ready e chiudilo in `will-quit`.
- **Firmare il pacchetto ma non notarizzare su macOS**: Gatekeeper mostra "impossibile verificare lo sviluppatore" e non c'è modo per l'utente di aggirarlo su macOS moderni.
- **Dimenticare `app.quit()` non chiude gli utility process**: gestisci `before-quit` con `indice.kill()`.

## In sintesi

Hai un'app con finestre isolate, una superficie preload di quattro funzioni tipizzate, un indice costruito fuori dal thread principale e una catena di sicurezza che copre navigazione, permessi, CSP e fuses. La distribuzione passa da Forge con `app.asar` controllato, e su macOS da firma più notarizzazione. Il criterio che riassume il laboratorio è uno: tutto ciò che il renderer può fare passa da `window.note`, e nessun argomento di `window.note` può uscire da `userData`.

## Fonti

- [Electron - IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron - Sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron - Packaging Your Application](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging)
- [Electron - Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
