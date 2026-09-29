#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn ping() ->  String {
    "Il Santo Grahal è pronto".to_string()
}

fn main() {
    tauri::Builder::default()
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .invoke_handler(tauri::generate_handler![ping])
            .run(tauri::generate_context!())
            .expect("Errore durante l'avvio del Il Santo Grahal");
}
