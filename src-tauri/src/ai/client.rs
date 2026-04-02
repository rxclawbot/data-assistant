use reqwest::Client;
use serde_json::json;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AiConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SqlGenerationRequest {
    pub tables_context: String,
    pub user_query: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SqlGenerationResponse {
    pub sql: String,
    pub explanation: Option<String>,
}

pub async fn generate_sql(
    config: &AiConfig,
    tables_context: &str,
    user_query: &str,
) -> Result<SqlGenerationResponse, String> {
    let client = Client::new();
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
        tables_context
    );

    let request_body = json!({
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ],
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
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }

    let parsed: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let sql = parsed["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("Invalid response format")?
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
    generate_sql(
        &config,
        &request.tables_context,
        &request.user_query,
    )
    .await
}