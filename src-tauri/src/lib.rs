#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cache;

use tauri::Manager;

#[tauri::command]
fn ping() -> String {
    "Il Santo Grahal è pronto!".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            app.manage(cache::CacheState::from_env());
            Ok(())
        })
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
