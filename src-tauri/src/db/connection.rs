use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use mysql::prelude::Queryable;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DatabaseType {
    Oracle,
    MySQL,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password_encrypted: Vec<u8>,
    pub database: String,
    pub oracle_sid: Option<String>,
    pub oracle_service_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub owner: Option<String>,
}

/// Build Oracle connection string using priority: oracle_service_name > oracle_sid > database
pub fn build_oracle_conn_str(config: &ConnectionConfig) -> String {
    let service = config
        .oracle_service_name
        .as_deref()
        .or(config.oracle_sid.as_deref())
        .unwrap_or(&config.database);
    format!("//{}:{}/{}", config.host, config.port, service)
}

fn get_connections_file_path(app: &tauri::App) -> PathBuf {
    let app_data = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    std::fs::create_dir_all(&app_data).expect("Failed to create app data directory");
    app_data.join("connections.json")
}

fn get_connection_file_path() -> PathBuf {
    // For commands that don't have app access, use environment variable or default
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.config", h)))
        .unwrap_or_else(|_| ".".to_string());
    let path = PathBuf::from(base).join("DataAssistant");
    std::fs::create_dir_all(&path).expect("Failed to create DataAssistant directory");
    path.join("connections.json")
}

fn load_connections_from_file() -> Vec<ConnectionConfig> {
    let path = get_connection_file_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path).expect("Failed to read connections file");
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    }
}

fn save_connections_to_file(connections: &[ConnectionConfig]) -> Result<(), String> {
    let path = get_connection_file_path();
    let content = serde_json::to_string_pretty(connections).map_err(|e| format!("Failed to serialize connections: {}", e))?;
    std::fs::write(&path, content).map_err(|e| format!("Failed to write connections file: {}", e))?;
    Ok(())
}

#[cfg(feature = "oracle-mysql")]
fn test_oracle_connection(config: &ConnectionConfig, password: &str) -> Result<bool, String> {
    use oracle::Connection;

    let dsn = build_oracle_conn_str(config);

    Connection::connect(&config.username, password, &dsn)
        .map(|conn| {
            conn.close().ok();
            true
        })
        .map_err(|e| format!("Oracle connection failed: {}", e))
}

#[cfg(not(feature = "oracle-mysql"))]
fn test_oracle_connection(_config: &ConnectionConfig, _password: &str) -> Result<bool, String> {
    Err("Oracle driver not available. Compile with --features oracle-mysql".to_string())
}

#[cfg(feature = "oracle-mysql")]
fn test_mysql_connection(config: &ConnectionConfig, password: &str) -> Result<bool, String> {
    use mysql::Pool;

    let opts = mysql::OptsBuilder::new()
        .ip_or_hostname(Some(&config.host))
        .tcp_port(config.port)
        .user(Some(&config.username))
        .pass(Some(password))
        .db_name(Some(&config.database));

    Pool::new(opts)
        .map(|pool| {
            pool.get_conn().map(|_conn| {
                // Connection successful; pool manages connection lifecycle
                true
            }).map_err(|e| format!("MySQL query failed: {}", e))
        })
        .map_err(|e| format!("MySQL connection failed: {}", e))
        .and_then(|r| r)
}

#[cfg(not(feature = "oracle-mysql"))]
fn test_mysql_connection(_config: &ConnectionConfig, _password: &str) -> Result<bool, String> {
    Err("MySQL driver not available. Compile with --features oracle-mysql".to_string())
}

#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<bool, String> {
    let decrypted_password = crate::crypto::decrypt(&config.password_encrypted)
        .map_err(|e| format!("Failed to decrypt password: {}", e))?;

    match config.db_type {
        DatabaseType::Oracle => test_oracle_connection(&config, &decrypted_password),
        DatabaseType::MySQL => test_mysql_connection(&config, &decrypted_password),
    }
}

#[cfg(feature = "oracle-mysql")]
fn get_oracle_tables(config: &ConnectionConfig, password: &str) -> Result<Vec<TableInfo>, String> {
    use oracle::Connection;

    let dsn = build_oracle_conn_str(config);

    let conn = Connection::connect(&config.username, password, &dsn)
        .map_err(|e| format!("Oracle connection failed: {}", e))?;

    let mut tables = Vec::new();
    let sql = "SELECT owner, table_name FROM all_tables WHERE owner = :owner ORDER BY owner, table_name";
    let rows = conn.query(sql, &[&config.username.to_uppercase()])
        .map_err(|e| format!("Failed to query tables: {}", e))?;

    for row_result in rows {
        let row = row_result.map_err(|e| format!("Failed to read row: {}", e))?;
        let owner: String = row.get(0).map_err(|e| format!("Failed to get owner: {}", e))?;
        let name: String = row.get(1).map_err(|e| format!("Failed to get table name: {}", e))?;
        tables.push(TableInfo {
            name,
            owner: Some(owner),
        });
    }

    conn.close().ok();
    Ok(tables)
}

#[cfg(not(feature = "oracle-mysql"))]
fn get_oracle_tables(_config: &ConnectionConfig, _password: &str) -> Result<Vec<TableInfo>, String> {
    Err("Oracle driver not available. Compile with --features oracle-mysql".to_string())
}

#[cfg(feature = "oracle-mysql")]
fn get_mysql_tables(config: &ConnectionConfig, password: &str) -> Result<Vec<TableInfo>, String> {
    use mysql::Pool;

    let opts = mysql::OptsBuilder::new()
        .ip_or_hostname(Some(&config.host))
        .tcp_port(config.port)
        .user(Some(&config.username))
        .pass(Some(password))
        .db_name(Some(&config.database));

    let pool = Pool::new(opts).map_err(|e| format!("MySQL connection failed: {}", e))?;
    let mut conn = pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;

    let query = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME";
    let result = conn.exec_map(query, (&config.database,), |name: String| {
        TableInfo {
            name,
            owner: None,
        }
    }).map_err(|e| format!("Failed to query tables: {}", e))?;

    Ok(result)
}

#[cfg(not(feature = "oracle-mysql"))]
fn get_mysql_tables(_config: &ConnectionConfig, _password: &str) -> Result<Vec<TableInfo>, String> {
    Err("MySQL driver not available. Compile with --features oracle-mysql".to_string())
}

#[tauri::command]
pub async fn get_tables(config: ConnectionConfig) -> Result<Vec<TableInfo>, String> {
    let decrypted_password = crate::crypto::decrypt(&config.password_encrypted)
        .map_err(|e| format!("Failed to decrypt password: {}", e))?;

    match config.db_type {
        DatabaseType::Oracle => get_oracle_tables(&config, &decrypted_password),
        DatabaseType::MySQL => get_mysql_tables(&config, &decrypted_password),
    }
}

#[tauri::command]
pub async fn save_connection(config: ConnectionConfig) -> Result<(), String> {
    let mut connections = load_connections_from_file();

    // Check if connection with same id exists and update, otherwise add
    if let Some(existing) = connections.iter_mut().find(|c| c.id == config.id) {
        *existing = config;
    } else {
        connections.push(config);
    }

    save_connections_to_file(&connections)
}

#[tauri::command]
pub async fn load_connections() -> Result<Vec<ConnectionConfig>, String> {
    Ok(load_connections_from_file())
}

#[tauri::command]
pub async fn delete_connection(id: String) -> Result<(), String> {
    let mut connections = load_connections_from_file();
    connections.retain(|c| c.id != id);
    save_connections_to_file(&connections)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_oracle_conn_str_service_name() {
        let config = ConnectionConfig {
            id: "1".to_string(),
            name: "Test".to_string(),
            db_type: DatabaseType::Oracle,
            host: "localhost".to_string(),
            port: 1521,
            username: "user".to_string(),
            password_encrypted: vec![],
            database: "db".to_string(),
            oracle_sid: None,
            oracle_service_name: Some("myservice".to_string()),
        };
        let conn_str = build_oracle_conn_str(&config);
        assert_eq!(conn_str, "//localhost:1521/myservice");
    }

    #[test]
    fn test_build_oracle_conn_str_sid() {
        let config = ConnectionConfig {
            id: "1".to_string(),
            name: "Test".to_string(),
            db_type: DatabaseType::Oracle,
            host: "dbhost".to_string(),
            port: 1521,
            username: "user".to_string(),
            password_encrypted: vec![],
            database: "ORCL".to_string(),
            oracle_sid: Some("ORCL".to_string()),
            oracle_service_name: None,
        };
        let conn_str = build_oracle_conn_str(&config);
        assert_eq!(conn_str, "//dbhost:1521/ORCL");
    }

    #[test]
    fn test_build_oracle_conn_str_fallback_to_database() {
        let config = ConnectionConfig {
            id: "1".to_string(),
            name: "Test".to_string(),
            db_type: DatabaseType::Oracle,
            host: "dbhost".to_string(),
            port: 1521,
            username: "user".to_string(),
            password_encrypted: vec![],
            database: "defaultdb".to_string(),
            oracle_sid: None,
            oracle_service_name: None,
        };
        let conn_str = build_oracle_conn_str(&config);
        assert_eq!(conn_str, "//dbhost:1521/defaultdb");
    }

    #[test]
    fn test_connection_config_serde_roundtrip() {
        let config = ConnectionConfig {
            id: "test-id".to_string(),
            name: "My Oracle".to_string(),
            db_type: DatabaseType::Oracle,
            host: "localhost".to_string(),
            port: 1521,
            username: "system".to_string(),
            password_encrypted: vec![1, 2, 3, 4],
            database: "ORCL".to_string(),
            oracle_sid: Some("ORCL".to_string()),
            oracle_service_name: None,
        };
        let json = serde_json::to_string(&config).expect("serialize failed");
        let deserialized: ConnectionConfig = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(deserialized.id, config.id);
        assert_eq!(deserialized.name, config.name);
        assert_eq!(deserialized.db_type, config.db_type);
        assert_eq!(deserialized.host, config.host);
        assert_eq!(deserialized.port, config.port);
        assert_eq!(deserialized.password_encrypted, vec![1, 2, 3, 4]);
    }
}