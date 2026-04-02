pub mod ai;
pub mod db;

pub fn run() {
    tracing_subscriber::fmt::init();
    tracing::info!("Data Assistant starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            data_assistant_lib::ai::client::generate_sql_command,
            data_assistant_lib::db::connection::test_connection,
            data_assistant_lib::db::connection::get_tables,
            data_assistant_lib::db::metadata::get_table_metadata,
            data_assistant_lib::db::connection::save_connection,
            data_assistant_lib::db::connection::load_connections,
            data_assistant_lib::db::connection::delete_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}