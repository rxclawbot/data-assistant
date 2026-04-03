use serde::{Deserialize, Serialize};
use mysql::prelude::Queryable;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub key_constraint: Option<String>,  // PK, FK, UK, or None
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
    password: &str,
    table_name: &str,
) -> Result<TableMetadata, String> {
    use oracle::Connection;
    use std::collections::HashMap;

    let dsn = crate::db::connection::build_oracle_conn_str(config);

    let conn = Connection::connect(&config.username, password, &dsn)
        .map_err(|e| format!("Oracle connection failed: {}", e))?;

    let sql = format!(
        "SELECT owner, table_name, column_name, data_type, data_length, data_precision, data_scale, nullable, column_id \
         FROM all_tab_columns \
         WHERE table_name = upper(:table_name) AND owner = upper(:owner) \
         ORDER BY column_id"
    );
    let rows = conn.query(&sql, &[&table_name.to_uppercase(), &config.username.to_uppercase()])
        .map_err(|e| format!("Failed to query columns: {}", e))?;

    // Query constraints: PK ('P'), FK ('R'), UK ('U')
    let constraint_sql = "SELECT acc.column_name, ac.constraint_type \
         FROM all_cons_columns acc \
         JOIN all_constraints ac ON acc.constraint_name = ac.constraint_name AND acc.owner = ac.owner \
         WHERE acc.table_name = upper(:table_name) AND acc.owner = upper(:owner)";
    let constraint_rows = conn.query(constraint_sql, &[&table_name.to_uppercase(), &config.username.to_uppercase()])
        .map_err(|e| format!("Failed to query constraints: {}", e))?;

    let mut constraint_map: HashMap<String, String> = HashMap::new();
    for row_result in constraint_rows {
        let row = row_result.map_err(|e| format!("Failed to read constraint row: {}", e))?;
        let col_name: String = row.get(0).map_err(|e| format!("Failed to get column_name: {}", e))?;
        let constraint_type: String = row.get(1).map_err(|e| format!("Failed to get constraint_type: {}", e))?;
        let key_label = match constraint_type.as_str() {
            "P" => "PK",
            "R" => "FK",
            "U" => "UK",
            _ => continue,
        };
        constraint_map.insert(col_name.to_uppercase(), key_label.to_string());
    }

    let mut columns = Vec::new();
    let mut table_name_db = String::new();
    let mut owner = String::new();
    for row_result in rows {
        let row = row_result.map_err(|e| format!("Failed to read row: {}", e))?;
        owner = row.get(0).map_err(|e| format!("Failed to get owner: {}", e))?;
        table_name_db = row.get(1).map_err(|e| format!("Failed to get table_name: {}", e))?;
        let name: String = row.get(2).map_err(|e| format!("Failed to get column_name: {}", e))?;
        let data_type: String = row.get(3).map_err(|e| format!("Failed to get data_type: {}", e))?;
        let data_length: Option<u32> = row.get::<_, Option<u32>>(4).ok().and_then(|x| x);
        let data_precision: Option<u32> = row.get::<_, Option<u32>>(5).ok().and_then(|x| x);
        let data_scale: Option<u32> = row.get::<_, Option<u32>>(6).ok().and_then(|x| x);
        let nullable: String = row.get(7).map_err(|e| format!("Failed to get nullable: {}", e))?;

        let data_type_formatted = if data_type == "NUMBER" && data_precision.is_some() && data_scale.is_some() {
            format!("{}({}, {})", data_type, data_precision.unwrap(), data_scale.unwrap())
        } else if data_type == "NUMBER" && data_precision.is_some() {
            format!("{}({})", data_type, data_precision.unwrap())
        } else if data_type == "VARCHAR2" || data_type == "CHAR" {
            format!("{}({})", data_type, data_length.unwrap_or(0))
        } else {
            data_type.clone()
        };

        let char_max_len = if data_type == "VARCHAR2" || data_type == "CHAR" {
            data_length
        } else {
            None
        };

        let key_constraint = constraint_map.get(&name.to_uppercase()).cloned();

        columns.push(ColumnInfo {
            name,
            data_type: data_type_formatted,
            nullable: nullable == "Y",
            key_constraint,
            default_value: None,
            character_maximum_length: char_max_len,
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
    _password: &str,
    _table_name: &str,
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
    let mut conn = pool.get_conn().map_err(|e| format!("Failed to get connection: {}", e))?;

    // Query column metadata
    let query = "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, \
                 CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE \
                 FROM information_schema.COLUMNS \
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? \
                 ORDER BY ORDINAL_POSITION";

    let result = conn.exec_map(query, (&config.database, table_name), |mut row: mysql::Row| {
        // Positional access: COLUMN_NAME=0, DATA_TYPE=1, IS_NULLABLE=2, COLUMN_KEY=3,
        // COLUMN_DEFAULT=4, CHARACTER_MAXIMUM_LENGTH=5, NUMERIC_PRECISION=6, NUMERIC_SCALE=7
        let name: String = row.take(0).unwrap_or_default();
        let data_type: String = row.take(1).unwrap_or_default();
        let nullable: String = row.take(2).unwrap_or_default();
        let key_type: Option<String> = row.take(3);
        let default_value: Option<String> = row.take(4);
        let char_max_len: Option<u32> = row.take(5);
        let num_precision: Option<u32> = row.take(6);
        let num_scale: Option<u32> = row.take(7);
        ColumnInfo {
            name,
            data_type,
            nullable: nullable == "YES",
            key_constraint: match key_type.as_deref() {
                Some("PRI") => Some("PK".to_string()),
                Some("UNI") => Some("UK".to_string()),
                Some("MUL") => Some("FK".to_string()),
                _ => None,
            },
            default_value,
            character_maximum_length: char_max_len,
            numeric_precision: num_precision,
            numeric_scale: num_scale,
        }
    }).map_err(|e| format!("Failed to query columns: {}", e))?;

    Ok(TableMetadata {
        table_name: table_name.to_string(),
        owner: Some(config.database.clone()),
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

#[tauri::command(rename_all = "snake_case")]
pub async fn get_table_metadata(
    config: crate::db::connection::ConnectionConfig,
    table_name: String,
) -> Result<TableMetadata, String> {
    let decrypted_password = crate::crypto::decrypt(&config.password_encrypted)
        .map_err(|e| format!("Failed to decrypt password: {}", e))?;

    match config.db_type {
        crate::db::connection::DatabaseType::Oracle => {
            get_oracle_table_metadata(&config, &decrypted_password, &table_name)
        }
        crate::db::connection::DatabaseType::MySQL => {
            get_mysql_table_metadata(&config, &table_name, &decrypted_password)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_column_info_serialize() {
        let col = ColumnInfo {
            name: "ID".to_string(),
            data_type: "NUMBER(10)".to_string(),
            nullable: false,
            key_constraint: Some("PK".to_string()),
            default_value: None,
            character_maximum_length: None,
            numeric_precision: Some(10),
            numeric_scale: Some(0),
        };
        let json = serde_json::to_string(&col).expect("serialize failed");
        assert!(json.contains("\"name\":\"ID\""));
        assert!(json.contains("\"key_constraint\":\"PK\""));
    }

    #[test]
    fn test_table_metadata_serialize() {
        let meta = TableMetadata {
            table_name: "EMPLOYEES".to_string(),
            owner: Some("SYSTEM".to_string()),
            columns: vec![
                ColumnInfo {
                    name: "ID".to_string(),
                    data_type: "NUMBER".to_string(),
                    nullable: false,
                    key_constraint: Some("PK".to_string()),
                    default_value: None,
                    character_maximum_length: None,
                    numeric_precision: None,
                    numeric_scale: None,
                },
                ColumnInfo {
                    name: "NAME".to_string(),
                    data_type: "VARCHAR2(100)".to_string(),
                    nullable: true,
                    key_constraint: None,
                    default_value: None,
                    character_maximum_length: Some(100),
                    numeric_precision: None,
                    numeric_scale: None,
                },
            ],
        };
        let json = serde_json::to_string(&meta).expect("serialize failed");
        assert!(json.contains("\"table_name\":\"EMPLOYEES\""));
        assert!(json.contains("\"owner\":\"SYSTEM\""));
        assert!(json.contains("\"columns\":"));
    }
}