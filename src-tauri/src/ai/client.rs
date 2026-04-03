use reqwest::Client;
use serde_json::json;
use std::time::Duration;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AiConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SqlGenerationRequest {
    pub tables_context: String,
    pub user_query: String,
    pub history: Option<Vec<ChatMessage>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SqlGenerationResponse {
    pub sql: String,
    pub explanation: Option<String>,
}

pub async fn generate_sql(
    config: &AiConfig,
    request: &SqlGenerationRequest,
) -> Result<SqlGenerationResponse, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let url = format!("{}/chat/completions", config.base_url.trim_end_matches('/'));

    let system_prompt = format!(
        "You are a SQL expert. Given the following database table structures, \
         write optimal SQL queries based on user requests.\n\n\
         Database Schema:\n{}\n\n\
         Rules:\n\
         1. Only write SELECT queries (no INSERT, UPDATE, DELETE)\n\
         2. Use proper JOIN syntax\n\
         3. Add comments for complex logic\n\
         4. Return only the SQL query without explanation",
        request.tables_context
    );

    let mut messages: Vec<serde_json::Value> = vec![
        json!({"role": "system", "content": system_prompt}),
    ];

    // Append conversation history
    if let Some(ref history) = request.history {
        for msg in history {
            messages.push(json!({
                "role": msg.role,
                "content": msg.content
            }));
        }
    }

    // Current user query
    messages.push(json!({"role": "user", "content": &request.user_query}));

    let request_body = json!({
        "model": config.model,
        "messages": messages,
        "temperature": 0.1
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await
            .map_err(|e| format!("Failed to read error response: {}", e))?;
        return Err(format!("API error {}: {}", status, text));
    }

    let body = response.text().await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let parsed: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse response: {} | body: {}", e, &body[..body.len().min(500)]))?;

    let choices = parsed["choices"].as_array()
        .ok_or("Response missing 'choices' array")?;
    let first_choice = choices.first()
        .ok_or("Response 'choices' array is empty")?;
    let message = first_choice.get("message")
        .ok_or("Response missing 'message' object")?;
    let content = message.get("content")
        .ok_or("Response missing 'content' field")?;
    let sql = content.as_str()
        .ok_or("Response 'content' is not a string")?
        .trim()
        .to_string();

    Ok(SqlGenerationResponse {
        sql,
        explanation: None,
    })
}

#[tauri::command]
pub async fn generate_sql_command(
    config: AiConfig,
    request: SqlGenerationRequest,
) -> Result<SqlGenerationResponse, String> {
    generate_sql(&config, &request).await
}
