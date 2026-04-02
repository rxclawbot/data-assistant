use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub key_type: Option<String>,  // PRI, UNI, MUL, or None
    pub default_value: Option<String>,
    pub character_maximum_length: Option<u32>,
    pub numeric_precision: Option<u32>,
    pub numeric_scale: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TableMetadata {
    pub table_name: String,
    pub owner: Option<String>,
    pub columns: Vec<ColumnInfo>,
}

#[cfg(feature = "oracle-mysql")]
fn get_oracle_table_metadata(
    config: &crate::db::connection::ConnectionConfig,
    table_name: &str,
    password: &str,
) -> Result<TableMetadata, String> {
    use oracle::Connection;

    let oracle_sid = config.oracle_sid.as_deref().unwrap_or("ORCL");
    let dsn = format!(
        "//{}:{}/{}",
        config.host, config.port, config.oracle_sid.as_ref().unwrap_or(&oracle_sid.to_string())
    );

    let conn = Connection::connect(&config.username, password, &dsn)
        .map_err(|e| format!("Oracle connection failed: {}", e))?;

    // Query column metadata from all_tab_columns
    let mut stmt = conn
        .prepare(&format!(
            "SELECT owner, table_name, column_name, data_type, data_length, data_precision, data_scale, nullable, column_id \
             FROM all_tab_columns \
             WHERE table_name = upper(:table_name) AND owner = upper(:owner) \
             ORDER BY column_id"
        ))
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt.query([table_name.to_uppercase(), config.username.to_uppercase()])
        .map_err(|e| format!("Failed to query columns: {}", e))?;

    let mut columns = Vec::new();
    for row_result in rows {
        let row = row_result.map_err(|e| format!("Failed to read row: {}", e))?;
        let owner: String = row.get(0).map_err(|e| format!("Failed to get owner: {}", e))?;
        let table_name_db: String = row.get(1).map_err(|e| format!("Failed to get table_name: {}", e))?;
        let name: String = row.get(2).map_err(|e| format!("Failed to get column_name: {}", e))?;
        let data_type: String = row.get(3).map_err(|e| format!("Failed to get data_type: {}", e))?;
        let data_length: Option<u32> = row.get(4).map_err(|_| None);
        let data_precision: Option<u32> = row.get(5).map_err(|_| None);
        let data_scale: Option<u32> = row.get(6).map_err(|_| None);
        let nullable: String = row.get(7).map_err(|e| format!("Failed to get nullable: {}", e))?;

        columns.push(ColumnInfo {
            name,
            data_type: if data_type == "NUMBER" && data_precision.is_some() && data_scale.is_some() {
                format!("{}({}, {})", data_type, data_precision.unwrap(), data_scale.unwrap())
            } else if data_type == "NUMBER" && data_precision.is_some() {
                format!("{}({})", data_type, data_precision.unwrap())
            } else if data_type == "VARCHAR2" || data_type == "CHAR" {
                format!("{}({})", data_type, data_length.unwrap_or(0))
            } else {
                data_type
            },
            nullable: nullable == "Y",
            key_type: None,  // Oracle requires separate query for keys
            default_value: None,
            character_maximum_length: if data_type == "VARCHAR2" || data_type == "CHAR" {
                data_length
            } else {
                None
            },
            numeric_precision: data_precision,
            numeric_scale: data_scale,
        });
    }

    conn.close().ok();
    Ok(TableMetadata {
        table_name: table_name_db,
        owner: Some(owner),
        columns,
    })
}

#[cfg(not(feature = "oracle-mysql"))]
fn get_oracle_table_metadata(
    _config: &crate::db::connection::ConnectionConfig,
    _table_name: &str,
    _password: &str,
) -> Result<TableMetadata, String> {
    Err("Oracle driver not available. Compile with --features oracle-mysql".to_string())
}

#[cfg(feature = "oracle-mysql")]
fn get_mysql_table_metadata(
    config: &crate::db::connection::ConnectionConfig,
    table_name: &str,
    password: &str,
) -> Result<TableMetadata, String> {
    use mysql::Pool;

    let opts = mysql::OptsBuilder::new()
        .ip_or_hostname(Some(&config.host))
        .tcp_port(config.port)
        .user(Some(&config.username))
        .pass(Some(password))
        .db_name(Some(&config.database));

    let pool = Pool::new(opts).map_err(|e| format!("MySQL connection failed: {}", e))?;
    let conn = pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;

    // Query column metadata
    let query = "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, \
                 CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE \
                 FROM information_schema.COLUMNS \
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? \
                 ORDER BY ORDINAL_POSITION";

    let result = conn.query_map(query, [&config.database, table_name], |name, data_type, nullable, key_type, default_value, char_max_len, num_precision, num_scale| {
        ColumnInfo {
            name,
            data_type,
            nullable: nullable == "YES",
            key_type: if key_type.is_empty() { None } else { Some(key_type) },
            default_value: default_value,
            character_maximum_length: char_max_len,
            numeric_precision: num_precision,
            numeric_scale: num_scale,
        }
    }).map_err(|e| format!("Failed to query columns: {}", e))?;

    conn.close().ok();
    Ok(TableMetadata {
        table_name: table_name.to_string(),
        owner: None,
        columns: result,
    })
}

#[cfg(not(feature = "oracle-mysql"))]
fn get_mysql_table_metadata(
    _config: &crate::db::connection::ConnectionConfig,
    _table_name: &str,
    _password: &str,
) -> Result<TableMetadata, String> {
    Err("MySQL driver not available. Compile with --features oracle-mysql".to_string())
}

#[tauri::command]
pub async fn get_table_metadata(
    config: crate::db::connection::ConnectionConfig,
    table_name: String,
) -> Result<TableMetadata, String> {
    let decrypted_password = crate::crypto::decrypt(&config.password_encrypted)
        .map_err(|e| format!("Failed to decrypt password: {}", e))?;

    match config.db_type {
        crate::db::connection::DatabaseType::Oracle => {
            get_oracle_table_metadata(&config, &table_name, &decrypted_password)
        }
        crate::db::connection::DatabaseType::MySQL => {
            get_mysql_table_metadata(&config, &table_name, &decrypted_password)
        }
    }
}