Il canale fra processo principale e interfaccia è dove Electron vince o perde: un preload troppo generoso apre l'intero sistema all'interfaccia, un IPC mal progettato trasforma ogni interazione in stringhe non tipizzate. Inoltre, poiché Chromium è in ogni pacchetto, le prestazioni si ottengono capendo cosa costa in Electron e cosa quasi niente. Questa lezione copre `ipcMain.handle`, `contextBridge`, la checklist di sicurezza ufficiale, i fuses, `utilityProcess` e la misura dei crash.

## Obiettivi

- Scegliere fra `ipcRenderer.invoke`/`handle` e l'invio a senso unico con `send`.
- Scrivere un preload che espone un'API stretta invece dell'intero `ipcRenderer`.
- Validare gli argomenti nel main perché il renderer non è fidato.
- Applicare la checklist di sicurezza e i fuses di Electron.
- Spostare lavoro pesante fuori dal main con `utilityProcess`.

## IPC: due direzioni, un solo contratto

Il pattern moderno è **request/response asincrono** con `ipcMain.handle` (main) e `ipcRenderer.invoke` (renderer). Il valore restituito è structured-clone: oggetti, array, `ArrayBuffer` e `Uint8Array` passano bene, le classi no, i `Error` perdono il tipo.

```js
// main.js
const { ipcMain, dialog } = require("electron");

ipcMain.handle("dialog:apri", async (evento, filtro) => {
  if (typeof filtro !== "string") throw new Error("filtro non valido");
  const r = await dialog.showOpenDialog({
    filters: [{ name: "Testo", extensions: [filtro] }],
    properties: ["openFile"]
  });
  return r.canceled ? null : r.filePaths[0];
});
```

```js
// preload.js
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("note", {
  apriFile: (filtro) => ipcRenderer.invoke("dialog:apri", filtro),
  suProgresso: (cb) => {
    const listener = (_e, percento) => cb(percento);
    ipcRenderer.on("download:progresso", listener);
    return () => ipcRenderer.removeListener("download:progresso", listener); // cleanup
  }
});
```

| Esigenza | API | Nota |
| --- | --- | --- |
| chiamata che restituisce dati | `invoke` + `handle` | Promise, gestione errori con `try/catch` |
| notifica senza risposta | `send` + `on` | più veloce, nessun valore di ritorno |
| main verso renderer | `webContents.send` | può raccogliere dati senza risposta |
| renderer concorrenti | `webContents` nell'`evento.sender` | identifica la finestra chiamante |

La regola: il preload espone verbi di dominio (`note.apriFile`, `note.salva`), non `ipc.invoke(canale, ...)` generico. Un proxy generico equivale a dare al renderer tutti i canali senza filtri.

## Validazione e isolamento

Gli argomenti che arrivano al main provengono dal renderer, e il renderer può essere compromesso. Due abitudini risolvono il novanta per cento dei casi: validare il tipo prima di usare il valore, e non costruire percorsi con stringhe arbitrarie.

```js
const path = require("node:path");
const fs = require("node:fs/promises");

ipcMain.handle("note:leggi", async (_e, nome) => {
  if (!/^[a-z0-9_-]+$/.test(nome)) throw new Error("nome non valido");
  const cartella = path.join(app.getPath("userData"), "note");
  const percorso = path.join(cartella, `${nome}.md`);
  if (!percorso.startsWith(cartella + path.sep)) throw new Error("path traversal");
  return fs.readFile(percorso, "utf8");
});
```

Senza il controllo di prefisso, `nome = "../../.ssh/id_rsa"` esce dalla cartella dati. E senza `contextIsolation` attivo, il renderer può sovrascrivere `window.fetch` o i metodi di `window.note` che il preload espone.

## Checklist di sicurezza e fuses

La guida ufficiale elenca scelte concrete: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, nessun `allowRunningInsecureContent`, nessuna `setPermissionRequestHandler` aperta di default, Content Security Policy nella pagina, bloccare `setWindowOpenHandler` verso nuovi contenuti.

```js
app.on("web-contents-created", (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", (evento, url) => {
    if (!url.startsWith("app://")) evento.preventDefault();
  });
});
```

I **fuses** sono interruttori compilati nel binario che chiudono comportamenti pericolosi in produzione: disattivano le opzioni che abilitano il Node inspector a runtime, il caricamento di moduli da variabili d'ambiente e il downgrade di Electron. Si applicano con `@electron/fuses` nel pacchetto di distribuzione:

```js
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");
await flipFuses(eseguibile, {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false
});
```

## Prestazioni: dove va il tempo

Il main process è single-thread e, se bloccato, si fermano anche la gestione delle finestre e l'IPC. Il lavoro pesante va in `utilityProcess`, cioè un processo Node separato che comunica via IPC.

```js
const { utilityProcess } = require("electron");
const worker = utilityProcess.fork(path.join(__dirname, "indice.js"));
worker.postMessage({ cartella: "/home/me/note" });
worker.on("message", (m) => console.log("progresso", m.percento));
```

L'altra leva è la vista: `BrowserView` e `WebContentsView` ridisegnano solo l'area interessata, mentre una singola pagina con tre pannelli pesanti ridisegna tutto. Per grandi liste, `content-visibility: auto` in CSS evita il lavoro fuori schermo senza cambiare architettura. Le misure vanno prese con i DevTools Performance del renderer e con `process.getProcessMemoryInfo()` nel main, non a sensazione.

## Crash, telemetria e aggiornamenti

Un renderer che va in crash non porta giù l'app: `render-process-gone` te lo dice.

```js
app.on("render-process-gone", (_e, wc, dettagli) => {
  console.error("renderer terminato:", dettagli.reason); // crashed, oom, killed
});
```

`crashReporter.start()` invia i crash report se configurato, `process.on("uncaughtException")` nel main deve registrare e uscire in modo ordinato, e `electron-updater` gestisce gli aggiornamenti firmati su `autoUpdater`. Gli aggiornamenti su macOS richiedono la firma con certificato Developer ID e notarizzazione, altrimenti Gatekeeper blocca l'avvio.

## Errori comuni

- **Esporre `ipcRenderer` intero o `require` tramite `contextBridge`**: la funzione passata viene clonata, quindi non funziona; significa che qualcuno ha disattivato `contextIsolation`.
- **Dimenticare di rimuovere i listener**: `ipcRenderer.on` senza cleanup accumula callback a ogni cambio di schermata e il renderer rallenta.
- **Usare il main per parsing JSON grandi**: blocca IPC e finestre; metti il lavoro in `utilityProcess`.
- **Lasciare `webContents.openDevTools()` in produzione**: apre il renderer e con esso `window.note`; chiudi la modalità debug nel build.
- **Aggiornare Electron senza rileggere il changelog**: le API principali cambiano di rado, ma i default di `webPreferences` e i plugin nativi (con ABI diversa) no.

## In sintesi

In Electron la superficie tra UI e sistema è il preload: stretta, tipizzata per dominio, verificata nel main. `invoke`/`handle` per le chiamate, `send` per le notifiche, `utilityProcess` per il lavoro pesante fuori dal thread principale. Sicurezza significa default `contextIsolation` e `sandbox`, CSP, validazione dei percorsi e fuses nel binario distribuito. Prestazioni e stabilità si misurano, non si indovinano, e gli aggiornamenti vanno firmati su entrambe le piattaforme mainstream.

## Fonti

- [Electron - Inter-Process Communication](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron - Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron - Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron - Fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)
