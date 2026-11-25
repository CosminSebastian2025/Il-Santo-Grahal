Tauri è un framework per applicazioni desktop in cui l'interfaccia è HTML, CSS e JavaScript eseguito nella WebView del sistema operativo, mentre la logica di sistema, i file, le reti e il database girano in un processo Rust. A differenza di Electron non porta con sé un browser completo: su Windows usa WebView2, su macOS WKWebView, su Linux WebKitGTK. In questa lezione impari com'è fatta un'app Tauri di oggi (versione 2: la crate `tauri` è alla 2.12, l'API JavaScript alla 2.12) e quali sono i concetti che decidono dimensioni del binario, sicurezza e architettura.

## Obiettivi

- Descrivere l'architettura a due processi: core Rust e WebView, con il canale IPC in mezzo.
- Sapere dove girano `main.rs` e `lib.rs` e perché il pattern `run()` è quello consigliato.
- Leggere `tauri.conf.json` e distinguere le sezioni `build`, `app` e `bundle`.
- Comandare il core con il trait `Manager` (finestre, stato, eventi).
- Capire perché il modello di permessi di Tauri 2 è diverso da quello di Tauri 1.

## Architettura: core Rust e WebView

Un'app Tauri ha due mondi. Il **core** è un processo Rust che possiede le finestre, la tray icon, i file e l'accesso al sistema; la **WebView** è il motore reso disponibile dal sistema operativo e disegna solo l'interfaccia. Fra i due corre un protocollo IPC: la WebView non ha accesso diretto al filesystem, chiama funzioni Rust esposte come comandi.

| Aspetto | Core Rust (processo principale) | WebView (frontend) |
| --- | --- | --- |
| Linguaggio | Rust | HTML/CSS/JS |
| Motore | il tuo binario | WebView2, WKWebView, WebKitGTK |
| Accesso al sistema | completo, tramite API Rust | solo via `@tauri-apps/api` e comandi |
| Canale | `invoke_handler` | `invoke("nome", args)` |
| Distribuzione | dentro l'eseguibile | asset statici in `frontendDist` |

La conseguenza pratica è il peso: un eseguibile Tauri per Windows è nell'ordine di alcuni megabyte, contro le centinaia di un pacchetto Electron, perché il motore di rendering è già installato nel sistema. Il rovescio della medaglia è che su Linux la resa dipende dalla versione di WebKitGTK, e su Windows 10 il runtime WebView2 deve essere aggiornato.

## La struttura di un progetto Tauri 2

`npm create tauri-app@latest` genera un progetto con `src-tauri/` per Rust e una cartella frontend a scelta (Vite, Next, SvelteKit...). Dentro `src-tauri/src` ci sono due file invocati dallo stesso crate: `main.rs` per il binario e `lib.rs` per il codice dell'app. Separarli permette di riusare la logica in una build mobile (iOS e Android fanno parte di Tauri 2).

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn saluta(nome: &str) -> String {
    format!("Ciao, {nome}!")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![saluta])
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio di Tauri");
}
```

```rust
// src-tauri/src/main.rs
fn main() {
    app_lib::run()
}
```

`generate_handler!` registra i comandi: un comando non registrato non esiste per la WebView, anche se la funzione compila. `generate_context!` legge `tauri.conf.json` e incorpora icone e asset nel binario a tempo di compilazione.

## `tauri.conf.json`: cosa controlla

Il file di configurazione ha tre sezioni che conviene conoscere a memoria. `build` dice come produrre il frontend e dove caricarlo; `app` descrive finestre e sicurezza; `bundle` decide i formati di pacchetto.

```json
{
  "productName": "Note",
  "version": "0.5.0",
  "identifier": "com.example.note",
  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [{ "label": "main", "title": "Note", "width": 1000, "height": 800 }],
    "security": { "csp": null }
  },
  "bundle": { "active": true, "targets": ["nsis", "msi"] }
}
```

| Campo | Effetto |
| --- | --- |
| `build.frontendDist` | cartella degli asset di produzione (per Next in export statico: `../out`) |
| `build.devUrl` | URL del dev server durante `tauri dev` |
| `beforeBuildCommand` | comando eseguito prima di impacchettare |
| `identifier` | base per la cartella dati e l'identità del pacchetto |
| `app.security.csp` | Content Security Policy applicata dal core |
| `bundle.targets` | `nsis`, `msi`, `app`, `dmg`, `deb`, `rpm`, `appimage` |

L'`identifier` non è decorativo: Tauri lo usa per la directory di configurazione e per la WebView su Windows. Cambiarlo dopo il rilascio sposta i dati utente.

## Manager, stato ed eventi

Nel core si accede all'applicazione tramite il trait `Manager`. Da lì si ricavano finestre, si gestisce uno stato condiviso e si emettono eventi verso il frontend.

```rust
use tauri::{Manager, Emitter};
use std::sync::Mutex;

struct Contatore(Mutex<u32>);

#[tauri::command]
fn incrementa(stato: tauri::State<Contatore>, app: tauri::AppHandle) -> u32 {
    let mut c = stato.0.lock().unwrap();
    *c += 1;
    let _ = app.emit("contatore-cambiato", *c); // evento verso la WebView
    *c
}

pub fn run() {
    tauri::Builder::default()
        .manage(Contatore(Mutex::new(0)))
        .invoke_handler(tauri::generate_handler![incrementa])
        .run(tauri::generate_context!())
        .unwrap();
}
```

Lo stato gestito con `manage` è iniettato nei comandi come `State<T>`: è il modo idiomatico per non usare variabili globali. Gli eventi (`emit`, `emit_to`) sono il canale in direzione opposta ai comandi: servono per flussi asincroni come log, progressi di download o notifiche dal sistema.

## Permessi: il cambio di Tauri 2

In Tauri 1 la superficie esposta alla WebView si controllava con un elenco di API nella configurazione (`allowlist`). Tauri 2 ha sostituito quel modello con **capabilities** e **plugin**: ogni plugin dichiara i propri permessi con nomi tipo `fs:allow-read-text-file`, e il file `src-tauri/capabilities/default.json` elenca cosa può fare ogni finestra.

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default", "dialog:default", "updater:default"]
}
```

Tre regole discendono da qui: i permessi si concedono per finestra, non globalmente; un plugin installato non è utilizzabile finché il permesso non compare nella capability; il comando `invoke` di un comando custom invece non richiede permessi, perché lo scrivi tu e decidi gli argomenti. Il laboratorio di questa serie mostra un'app che fallisce con "not allowed" e si ripara aggiungendo il permesso giusto.

## Errori comuni

- **Trattare la WebView come un browser fidato**: qualunque script in pagina, incluso un XSS, può chiamare gli stessi comandi; il controllo sta nel core, non nel frontend.
- **Mettere logica di business in JavaScript "per comodità"**: scrive su file e rete senza restrizioni e ti costringe a concedere più permessi.
- **Dimenticare `generate_handler!`**: il comando esiste ma `invoke` risponde "command not found" a runtime.
- **Lasciare `"csp": null` in produzione**: senza Content Security Policy qualsiasi inject ha campo libero su tutto ciò che hai concesso.
- **Confondere `devUrl` e `frontendDist`**: in build di produzione la WebView non ha un server; se il frontend richiede SSR o API server, non funziona dentro Tauri.

## In sintesi

Tauri mette Rust al centro e usa la WebView del sistema per disegnare. Un'app è un crate con `lib.rs` che espone `run()`, una configurazione in `tauri.conf.json` e un frontend statico servito al WebView. I comandi sono il ponte controllato verso il sistema, lo stato vive nel core e i permessi si dichiarano per finestra nelle capabilities di Tauri 2. Con questi tre pezzi hai il modello mentale per leggere qualunque progetto Tauri, incluso quello di questo sito.

## Fonti

- [Tauri 2 - Start](https://v2.tauri.app/start/)
- [Tauri 2 - Concept: Architecture](https://v2.tauri.app/concept/architecture/)
- [Tauri 2 - Configuration reference](https://v2.tauri.app/reference/config/)
- [Tauri 2 - Prerequisites](https://v2.tauri.app/start/prerequisites/)
