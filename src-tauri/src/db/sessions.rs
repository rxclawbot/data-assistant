use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub selected_tables: Vec<String>,
    #[serde(default)]
    pub chat_messages: Vec<ChatMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub explanation: Option<String>,
}

fn get_sessions_dir() -> PathBuf {
    let base = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.config", h)))
        .unwrap_or_else(|_| ".".to_string());
    let path = PathBuf::from(base).join("DataAssistant").join("sessions");
    std::fs::create_dir_all(&path).expect("Failed to create sessions directory");
    path
}

fn get_sessions_file_path(schema: &str) -> PathBuf {
    get_sessions_dir().join(format!("{}.json", schema))
}

fn new_default_session() -> Session {
    Session {
        id: generate_id(),
        name: "Session 1".to_string(),
        selected_tables: Vec::new(),
        chat_messages: Vec::new(),
    }
}

fn generate_id() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}{:03}", now.as_secs(), now.subsec_millis())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn load_sessions(schema: String) -> Result<Vec<Session>, String> {
    let path = get_sessions_file_path(&schema);
    if path.exists() {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        let sessions: Vec<Session> = serde_json::from_str(&content).unwrap_or_default();
        if sessions.is_empty() {
            Ok(vec![new_default_session()])
        } else {
            Ok(sessions)
        }
    } else {
        Ok(vec![new_default_session()])
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_sessions(
    schema: String,
    sessions: Vec<Session>,
) -> Result<(), String> {
    let path = get_sessions_file_path(&schema);
    let content = serde_json::to_string_pretty(&sessions)
        .map_err(|e| format!("Failed to serialize sessions: {}", e))?;
    std::fs::write(&path, content).map_err(|e| format!("Failed to write sessions file: {}", e))
}
