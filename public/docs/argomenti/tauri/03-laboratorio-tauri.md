In questo laboratorio costruisci `tauri-note`, un'app desktop minima ma completa: una finestra che mostra la lista degli appunti salvati, tre comandi Rust (leggi, scrivi, conta parole), permessi ristretti alla sola cartella dati, icone, pacchetto per Windows e macOS e un updater firmato. Ogni passo ha un criterio di verifica eseguibile, così sai subito se qualcosa è andato storto. Chiude un errore deliberato da riparare: la WebView chiede un file fuori dallo scope e deve ricevere "not allowed".

## Obiettivi

- Creare un progetto Tauri 2 con frontend Vite e verificarlo con `tauri dev`.
- Scrivere comandi tipizzati, registrarli e chiamarli dal frontend.
- Limitare i permessi con una capability che restringe i percorsi a `$APPDATA`.
- Impacchettare l'app con `tauri build` e firmare gli artefatti per l'updater.
- Riparare un errore di permessi leggendo il messaggio del runtime.

## Passo 1 - Prerequisiti e scaffolding

Su Windows servono il runtime WebView2 (preinstallato su Windows 11 e sulle versioni aggiornate di Windows 10), MSVC Build Tools con Windows SDK e Rust stabile 1.78 o superiore (il progetto di questo sito usa `rust-version = "1.88"`). Su macOS servono Xcode Command Line Tools; su Debian/Ubuntu `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.

```bash
npm create tauri-app@latest tauri-note -- --template vanilla-ts --manager npm
cd tauri-note
npm install
npm run tauri dev
```

Criterio: `tauri dev` apre una finestra con il testo di benvenuto e le modifiche al frontend ricaricano a caldo. Se compaiono errori di collegamento su `WebView2Loader`, manca il SDK di Windows: installalo prima di riprovare.

## Passo 2 - Tre comandi Rust

Sostituiamo i comandi demo con quelli dell'app. La cartella dati viene da `app.path().app_data_dir()`, così i file restano dentro `$APPDATA` e non sparse sul disco.

```rust
use std::fs;
use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
struct Nota { nome: String, parole: usize }

#[tauri::command]
fn elenca(app: tauri::AppHandle) -> Result<Vec<Nota>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for voce in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let voce = voce.map_err(|e| e.to_string())?;
        if voce.path().extension().and_then(|e| e.to_str()) != Some("md") { continue; }
        let testo = fs::read_to_string(voce.path()).unwrap_or_default();
        out.push(Nota {
            nome: voce.file_name().to_string_lossy().into_owned(),
            parole: testo.split_whitespace().count(),
        });
    }
    Ok(out)
}

#[tauri::command]
fn salva(app: tauri::AppHandle, nome: String, testo: String) -> Result<(), String> {
    if nome.contains('/') || nome.contains('\\') || nome.contains("..") {
        return Err("nome non valido".into());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(format!("{nome}.md")), testo).map_err(|e| e.to_string())
}
```

Confronta con la lezione precedente: l'errore è una `String`, e per questo laboratorio va bene, perché il frontend mostra il testo così com'è. `elenca` e `salva` sono sincroni perché il lavoro su pochi file dura millisecondi; se una cartella avesse migliaia di file useresti `spawn_blocking`.

Registra i comandi in `lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![elenca, salva])
        .run(tauri::generate_context!())
        .expect("avvio fallito");
}
```

Criterio: `cargo check` in `src-tauri/` termina senza warning su argomenti non camelCase.

## Passo 3 - Frontend che parla con il core

```ts
import { invoke } from "@tauri-apps/api/core";

type Nota = { nome: string; parole: number };

export async function aggiorna() {
  const note = await invoke<Nota[]>("elenca");
  document.querySelector("#lista")!.textContent =
    note.map((n) => `${n.nome} - ${n.parole} parole`).join("\n");
}

export async function salva(nome: string, testo: string) {
  try {
    await invoke("salva", { nome, testo }); // rust: nome, testo
    await aggiorna();
  } catch (e) {
    document.querySelector("#errore")!.textContent = String(e);
  }
}
```

Criterio: scrivi "ciao dal webview", premi Salva e la lista mostra `ciao.md - 3 parole`. Chiudi e riapri l'app: la nota è ancora lì, perché vive in `app_data_dir` e non nella cache della WebView.

## Passo 4 - Capability ristretta

Nell'esempio base non serve il plugin `fs`, perché i comandi leggono da Rust. Aggiungiamo però un'anteprima Markdown che usa il plugin `dialog` per scegliere un file esterno, con permesso limitato a `$DOCUMENT`.

```bash
npm run tauri add dialog
```

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "fs:allow-read-text-file",
    { "identifier": "fs:allow-read-dir", "allow": [{ "path": "$APPDATA/note" }] }
  ]
}
```

Criterio: aprendo la capability e controllando `src-tauri/gen/schemas/desktop-schema.json` ogni identificatore esiste (il file è generato da `tauri build`/`dev`, non a mano). Un permesso con refuso fa fallire la compilazione con "unknown permission".

## Passo 5 - Icone e pacchetto

```bash
npm run tauri icon ./logo-1024.png
npm run tauri build
ls src-tauri/target/release/bundle
```

Su Windows ottieni `bundle/msi/tauri-note_0.5.0_x64_en-US.msi` e `bundle/nsis/tauri-note_0.5.0_x64-setup.exe`; su macOS `bundle/macos/tauri-note.app` e `bundle/dmg/*.dmg`. `tauri icon` produce anche `icon.icns` e `icon.ico`, che `bundle.icon` deve elencare, altrimenti la build fallisce su un formato.

## Passo 6 - Firma e updater

L'updater di Tauri 2 richiede due chiavi: il pubblico in `tauri.conf.json`, il privato come variabile d'ambiente in fase di build.

```bash
npm run tauri signer generate -- -w ~/.tauri/nota.key
# scrive la chiave privata cifrata e stampa la pubblica
```

```json
"plugins": {
  "updater": {
    "active": true,
    "endpoints": ["https://esempio.org/releases/latest/download/latest.json"],
    "pubkey": "<chiave pubblica minisign>"
  }
}
```

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/nota.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="password-scelta"
npm run tauri build
```

Criterio: in `bundle` compaiono file `.sig` accanto ai pacchetti. Senza firma la build passa ma l'app rifiuta l'aggiornamento a runtime con "signature mismatch". Il file `latest.json` che serve l'endpoint contiene `version`, `platforms` con URL e `signature` per ogni pacchetto: è il pezzo che un endpoint statico (GitHub Releases) deve fornire.

## Passo 7 - Ripara l'errore di permessi

Aggiungi nel frontend una chiamata diretta al plugin:

```ts
import { readTextFile } from "@tauri-apps/plugin-fs";
await readTextFile("C:/Windows/win.ini"); // deve fallire
```

Criterio: la promessa viene rifiutata con un messaggio che nomina il permesso e il percorso ("path not allowed on the configured scope"). La riparazione corretta non è aggiungere `fs:default`: togli la lettura diretta dal frontend e passa dal comando `salva`/`elenca`, che ha già la sua validazione.

## Errori comuni

- **Argomenti in snake_case lato JS**: un parametro Rust `app_data_dir` va passato come `appDataDir`; il comando rifiuta con "invalid args".
- **Comando registrato dopo `.run()`**: l'handler è consumato all'avvio; tutte le registrazioni vanno prima.
- **`$APPDATA` su Linux**: il percorso reale è `$XDG_DATA_HOME/<identifier>`; usare `app_data_dir()` evita di cablare percorsi per sistema.
- **Build macOS da Linux**: `dmg` e `app` richiedono macOS; la CI deve usare un runner per piattaforma.
- **Chiave pubblica rigenerata dopo il rilascio**: le installazioni esistenti rifiutano i nuovi aggiornamenti per sempre; conserva la coppia di chiavi.

## In sintesi

Hai montato un'app Tauri 2 end-to-end: comandi tipizzati registrati con `generate_handler!`, percorso dati derivato dall'identifier invece che cablato, capability con scope, icone generate dal logo e pacchetto firmato per l'updater. Le tre verifiche che contano sono la lista che sopravvive al riavvio, il `.sig` accanto al pacchetto e il rifiuto di un percorso fuori scope: coprono persistenza, distribuzione e sicurezza.

## Fonti

- [Tauri 2 - Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/)
- [Tauri 2 - Distribute](https://v2.tauri.app/distribute/)
- [Tauri 2 - Updater plugin](https://v2.tauri.app/plugin/updater/)
- [Tauri 2 - Logging plugin](https://v2.tauri.app/plugin/logging/)
