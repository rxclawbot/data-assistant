pub mod ai;

pub fn run() {
    tracing_subscriber::fmt::init();
    tracing::info!("Data Assistant starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            data_assistant_lib::ai::client::generate_sql_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
