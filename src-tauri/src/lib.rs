#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Libreria condivisa: registra plugin, stato della cache e comandi IPC dell'app.
mod cache;

use tauri::Manager;

// Comando di prova usato per verificare che il bridge Tauri risponda.
#[tauri::command]
fn ping() -> String {
    "Il Santo Grahal è pronto!".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Log applicativi a livello Info.
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        // Necessario per riavviare l'app dopo un aggiornamento.
        .plugin(tauri_plugin_process::init())
        // Controllo e installazione degli aggiornamenti firmati.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Lo stato della cache vive per tutta la durata dell'app.
            app.manage(cache::CacheState::from_env());
            Ok(())
        })
        // Comandi esposti al frontend tramite invoke.
        .invoke_handler(tauri::generate_handler![
            ping,
            cache::cache_get,
            cache::cache_set,
            cache::cache_del,
            cache::cache_health,
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio de Il Santo Grahal");
}
