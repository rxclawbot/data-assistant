use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

fn get_remarks_dir() -> PathBuf {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.config", h)))
        .unwrap_or_else(|_| ".".to_string());
    let path = PathBuf::from(base).join("DataAssistant").join("remarks");
    std::fs::create_dir_all(&path).expect("Failed to create remarks directory");
    path
}

fn get_remarks_file_path(schema: &str) -> PathBuf {
    get_remarks_dir().join(format!("{}.json", schema))
}

fn load_remarks_from_file(schema: &str) -> HashMap<String, String> {
    let path = get_remarks_file_path(schema);
    if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

fn save_remarks_to_file(schema: &str, remarks: &HashMap<String, String>) -> Result<(), String> {
    let path = get_remarks_file_path(schema);
    let content = serde_json::to_string_pretty(remarks)
        .map_err(|e| format!("Failed to serialize remarks: {}", e))?;
    std::fs::write(&path, content).map_err(|e| format!("Failed to write remarks file: {}", e))?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn load_column_remarks(schema: String) -> Result<HashMap<String, String>, String> {
    Ok(load_remarks_from_file(&schema))
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_column_remark(
    schema: String,
    key: String,
    value: String,
) -> Result<(), String> {
    let mut remarks = load_remarks_from_file(&schema);
    if value.is_empty() {
        remarks.remove(&key);
    } else {
        remarks.insert(key, value);
    }
    save_remarks_to_file(&schema, &remarks)
}
