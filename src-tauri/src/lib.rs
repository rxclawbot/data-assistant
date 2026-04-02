pub mod ai;
pub mod crypto;
pub mod db;

pub fn run() {
    tracing_subscriber::fmt::init();
    tracing::info!("Data Assistant starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            ai::client::generate_sql_command,
            db::connection::test_connection,
            db::connection::get_tables,
            db::metadata::get_table_metadata,
            db::connection::save_connection,
            db::connection::load_connections,
            db::connection::delete_connection,
            crypto::dpapi::encrypt_password_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}