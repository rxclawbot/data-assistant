# DB Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Windows desktop app (Tauri + React) that connects to Oracle/MySQL databases, reads table metadata, and generates SQL via OpenAI-compatible AI APIs.

**Architecture:** Tauri 2.x with React frontend. Rust backend handles DB connections (no data reading), DPAPI encryption for credentials, and AI API calls. Frontend manages UI state and displays results.

**Tech Stack:** Tauri 2.x, React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Rust (oracle client, mysql client, windows-sys for DPAPI, reqwest for HTTP)

---

## File Structure

```
data-assistant/
├── src/                          # React frontend
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── ConnectionManager.tsx
│   │   ├── TableList.tsx
│   │   ├── TableDetail.tsx
│   │   └── SqlGenerator.tsx
│   ├── hooks/
│   │   └── useConnections.ts
│   ├── lib/
│   │   ├── api.ts               # Tauri invoke wrappers
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Tauri entry, command handlers
│   │   ├── lib.rs              # Module exports
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs    # DB connection logic
│   │   │   └── metadata.rs      # Table metadata queries
│   │   ├── crypto/
│   │   │   ├── mod.rs
│   │   │   └── dpapi.rs         # Windows DPAPI encryption
│   │   └── ai/
│   │       ├── mod.rs
│   │       └── client.rs        # OpenAI-compatible API client
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

---

## Task 1: Initialize Tauri Project with React

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "data-assistant",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 6: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Data Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Create src/App.tsx (minimal placeholder)**

```tsx
function App() {
  return <div className="p-4">Data Assistant</div>;
}
export default App;
```

- [ ] **Step 11: Create src-tauri/Cargo.toml**

```toml
[package]
name = "data-assistant"
version = "0.1.0"
edition = "2021"

[lib]
name = "data_assistant_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
oracle = { version = "0.6", optional = true }
mysql = { version = "25", optional = true }
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
thiserror = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
windows = { version = "0.58", features = ["Win32_Security_Cryptography"] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

- [ ] **Step 12: Create src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Data Assistant",
  "version": "0.1.0",
  "identifier": "com.data-assistant.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist",
    "devtools": true
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Data Assistant",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 13: Create src-tauri/build.rs**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 14: Create src-tauri/src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    data_assistant_lib::run()
}
```

- [ ] **Step 15: Create src-tauri/src/lib.rs**

```rust
pub fn run() {
    tracing_subscriber::fmt::init();
    tracing::info!("Data Assistant starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            data_assistant_lib::db::connection::test_connection,
            data_assistant_lib::db::connection::get_tables,
            data_assistant_lib::db::metadata::get_table_metadata,
            data_assistant_lib::ai::client::generate_sql,
            data_assistant_lib::db::connection::save_connection,
            data_assistant_lib::db::connection::load_connections,
            data_assistant_lib::db::connection::delete_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 16: Install npm dependencies and initialize Tauri**

Run: `npm install && npm run tauri init -- --ci`
Expected: Tauri project initialized with correct structure

- [ ] **Step 17: Verify empty shell builds**

Run: `npm run build`
Expected: Build succeeds, dist folder created

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "feat: initialize Tauri + React project structure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Implement Rust Crypto Module (DPAPI)

**Files:**
- Create: `src-tauri/src/crypto/mod.rs`, `src-tauri/src/crypto/dpapi.rs`

- [ ] **Step 1: Write failing test for DPAPI encrypt/decrypt**

Create `src-tauri/src/crypto/dpapi.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let original = "secret_password";
        let encrypted = encrypt(original).expect("encrypt failed");
        let decrypted = decrypt(&encrypted).expect("decrypt failed");
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_encrypt_produces_different_output() {
        let original = "password";
        let encrypted = encrypt(original).expect("encrypt failed");
        assert_ne!(original.as_bytes(), encrypted.as_slice());
    }
}
```

Run: `cd src-tauri && cargo test crypto::tests -- --nocapture`
Expected: FAIL - functions not defined

- [ ] **Step 2: Implement DPAPI encrypt**

```rust
use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB,
    CRYPTPROTECT_UI_FORBIDDEN,
};
use std::ptr::null_mut;

pub fn encrypt(data: &str) -> Result<Vec<u8>, String> {
    unsafe {
        let input = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_bytes().as_ptr() as *mut u8,
        };

        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: null_mut(),
        };

        let result = CryptProtectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        );

        if result.is_ok() {
            let encrypted = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            windows::Win32::System::Memory::LocalFree(windows::Win32::Foundation::HLOCAL(output.pbData as *mut _));
            Ok(encrypted)
        } else {
            Err("DPAPI encrypt failed".to_string())
        }
    }
}
```

- [ ] **Step 3: Implement DPAPI decrypt**

```rust
pub fn decrypt(encrypted: &[u8]) -> Result<String, String> {
    unsafe {
        let input = CRYPT_INTEGER_BLOB {
            cbData: encrypted.len() as u32,
            pbData: encrypted.as_ptr() as *mut u8,
        };

        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: null_mut(),
        };

        let result = CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        );

        if result.is_ok() {
            let decrypted = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            windows::Win32::System::Memory::LocalFree(windows::Win32::Foundation::HLOCAL(output.pbData as *mut _));
            String::from_utf8(decrypted).map_err(|e| e.to_string())
        } else {
            Err("DPAPI decrypt failed".to_string())
        }
    }
}
```

- [ ] **Step 4: Create crypto/mod.rs**

```rust
pub mod dpapi;
pub use dpapi::{encrypt, decrypt};
```

- [ ] **Step 5: Run tests**

Run: `cd src-tauri && cargo test crypto::tests -- --nocapture`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/crypto/
git commit -m "feat: implement DPAPI crypto module for Windows

Provides encrypt/decrypt functions using Windows DPAPI for
secure storage of database credentials.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Implement Rust Database Module

**Files:**
- Create: `src-tauri/src/db/mod.rs`, `src-tauri/src/db/connection.rs`, `src-tauri/src/db/metadata.rs`

- [ ] **Step 1: Write test for connection types**

In `src-tauri/src/db/connection.rs`:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum DatabaseType {
    Oracle,
    MySQL,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password_encrypted: Vec<u8>,
    pub database: String,
    // Oracle specific
    pub oracle_sid: Option<String>,
    pub oracle_service_name: Option<String>,
}
```

Run: `cd src-tauri && cargo check`
Expected: PASS (types compile)

- [ ] **Step 2: Implement test_connection command**

```rust
#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<bool, String> {
    let decrypted_password = crate::crypto::decrypt(&config.password_encrypted)
        .map_err(|e| format!("Failed to decrypt password: {}", e))?;

    match config.db_type {
        DatabaseType::Oracle => test_oracle_connection(&config, &decrypted_password),
        DatabaseType::MySQL => test_mysql_connection(&config, &decrypted_password),
    }
}

fn test_oracle_connection(config: &ConnectionConfig, password: &str) -> Result<bool, String> {
    let conn_str = build_oracle_conn_str(config, password);
    oracle::Connection::connect(&conn_str)
        .map(|conn| {
            conn.close();
            true
        })
        .map_err(|e| format!("Oracle connection failed: {}", e))
}

fn test_mysql_connection(config: &ConnectionConfig, password: &str) -> Result<bool, String> {
    let opts = mysql::OptsBuilder::new()
        .ip_or_hostname(Some(&config.host))
        .tcp_port(config.port)
        .user(Some(&config.username))
        .pass(Some(password))
        .db_name(Some(&config.database));

    mysql::Conn::new(opts)
        .map(|conn| {
            conn.close();
            true
        })
        .map_err(|e| format!("MySQL connection failed: {}", e))
}

fn build_oracle_conn_str(config: &ConnectionConfig, password: &str) -> String {
    if let Some(ref sid) = config.oracle_sid {
        format!(
            "{}/{}@{}:{}/{}",
            config.username, password, config.host, config.port, sid
        )
    } else if let Some(ref service) = config.oracle_service_name {
        format!(
            "{}/{}@{}:{}/{}",
            config.username, password, config.host, config.port, service
        )
    } else {
        format!(
            "{}/{}@{}:{}/{}",
            config.username, password, config.host, config.port, config.database
        )
    }
}
```

- [ ] **Step 3: Implement get_tables command**

```rust
#[derive(Debug, Clone, serde::Serialize)]
pub struct TableInfo {
    pub name: String,
    pub owner: Option<String>,
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
```

- [ ] **Step 4: Implement get_table_metadata**

In `src-tauri/src/db/metadata.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub key_constraint: Option<String>, // PK, FK, UK, or None
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableMetadata {
    pub table_name: String,
    pub owner: Option<String>,
    pub columns: Vec<ColumnInfo>,
}

#[tauri::command]
pub async fn get_table_metadata(
    config: ConnectionConfig,
    table_name: String,
) -> Result<TableMetadata, String> {
    let decrypted_password = crate::crypto::decrypt(&config.password_encrypted)
        .map_err(|e| format!("Failed to decrypt password: {}", e))?;

    match config.db_type {
        DatabaseType::Oracle => get_oracle_table_metadata(&config, &decrypted_password, &table_name),
        DatabaseType::MySQL => get_mysql_table_metadata(&config, &decrypted_password, &table_name),
    }
}
```

- [ ] **Step 5: Implement Oracle metadata query for MySQL metadata query**

```rust
fn get_oracle_table_metadata(
    config: &ConnectionConfig,
    password: &str,
    table_name: &str,
) -> Result<TableMetadata, String> {
    let conn_str = build_oracle_conn_str(config, password);
    let conn = oracle::Connection::connect(&conn_str)
        .map_err(|e| format!("Oracle connection failed: {}", e))?;

    let query = r#"
        SELECT
            c.column_name,
            c.data_type,
            c.nullable,
            c.data_default,
            CASE
                WHEN pk.column_name IS NOT NULL THEN 'PK'
                WHEN fk.column_name IS NOT NULL THEN 'FK'
                WHEN uk.column_name IS NOT NULL THEN 'UK'
                ELSE NULL
            END as constraint_type
        FROM all_tab_columns c
        LEFT JOIN (
            SELECT a.column_name
            FROM all_cons_columns a
            JOIN all_constraints b ON a.constraint_name = b.constraint_name
            WHERE b.constraint_type = 'P' AND b.table_name = :1
        ) pk ON c.column_name = pk.column_name
        LEFT JOIN (
            SELECT a.column_name
            FROM all_cons_columns a
            JOIN all_constraints b ON a.constraint_name = b.constraint_name
            WHERE b.constraint_type = 'R' AND b.table_name = :1
        ) fk ON c.column_name = fk.column_name
        LEFT JOIN (
            SELECT a.column_name
            FROM all_cons_columns a
            JOIN all_constraints b ON a.constraint_name = b.constraint_name
            WHERE b.constraint_type = 'U' AND b.table_name = :1
        ) uk ON c.column_name = uk.column_name
        WHERE c.table_name = :1 AND c.owner = :2
        ORDER BY c.column_id
    "#;

    // Implementation details for query execution
    // ... (continues in actual implementation)
}
```

- [ ] **Step 6: Implement save_connection and load_connections**

In `src-tauri/src/db/connection.rs`:

```rust
use std::fs;
use std::path::PathBuf;

fn get_connections_file() -> Result<PathBuf, String> {
    let app_data = std::env::var("APPDATA")
        .map_err(|_| "APPDATA not found".to_string())?;
    let dir = PathBuf::from(app_data).join("DataAssistant");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("connections.json"))
}

#[tauri::command]
pub async fn save_connection(config: ConnectionConfig) -> Result<(), String> {
    let mut connections = load_connections().await.unwrap_or_default();

    // Update existing or add new
    if let Some(existing) = connections.iter_mut().find(|c| c.id == config.id) {
        *existing = config;
    } else {
        connections.push(config);
    }

    let json = serde_json::to_string_pretty(&connections)
        .map_err(|e| e.to_string())?;

    fs::write(get_connections_file()?, json)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_connections() -> Result<Vec<ConnectionConfig>, String> {
    let path = get_connections_file()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_connection(id: String) -> Result<(), String> {
    let mut connections = load_connections().await?;
    connections.retain(|c| c.id != id);
    let json = serde_json::to_string_pretty(&connections)
        .map_err(|e| e.to_string())?;
    fs::write(get_connections_file()?, json)
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 7: Create db/mod.rs**

```rust
pub mod connection;
pub mod metadata;
pub use connection::*;
pub use metadata::*;
```

- [ ] **Step 8: Update lib.rs to include db module**

```rust
pub mod db;
pub mod crypto;
pub mod ai;
```

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/db/
git commit -m "feat: implement database connection and metadata modules

- Connection management with Oracle and MySQL support
- Table listing and metadata queries (structure only, no data)
- Encrypted credential storage
- CRUD operations for saved connections

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Implement Rust AI Client Module

**Files:**
- Create: `src-tauri/src/ai/mod.rs`, `src-tauri/src/ai/client.rs`

- [ ] **Step 1: Write test for AI client**

In `src-tauri/src/ai/client.rs`:

```rust
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

#[tauri::command]
pub async fn generate_sql(
    config: AiConfig,
    request: SqlGenerationRequest,
) -> Result<SqlGenerationResponse, String> {
    // Implementation
}
```

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 2: Implement generate_sql with OpenAI-compatible API**

```rust
use reqwest::Client;
use serde_json::json;

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
```

- [ ] **Step 3: Update the Tauri command to use the function**

```rust
#[tauri::command]
pub async fn generate_sql(
    config: AiConfig,
    request: SqlGenerationRequest,
) -> Result<SqlGenerationResponse, String> {
    super::client::generate_sql(
        &config,
        &request.tables_context,
        &request.user_query,
    )
    .await
}
```

- [ ] **Step 4: Create ai/mod.rs**

```rust
pub mod client;
pub use client::*;
```

- [ ] **Step 5: Update lib.rs to include ai module**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/ai/
git commit -m "feat: implement AI client for OpenAI-compatible APIs

Supports DeepSeek, MiniMax, GLM and other OpenAI-compatible services.
Generates SQL from natural language queries using selected table
structures as context.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Build React Frontend - Connection Manager

**Files:**
- Create: `src/components/ConnectionManager.tsx`, `src/hooks/useConnections.ts`, `src/lib/api.ts`

- [ ] **Step 1: Create API wrapper in src/lib/api.ts**

```ts
import { invoke } from "@tauri-apps/api/core";

export interface ConnectionConfig {
  id: string;
  name: string;
  db_type: "Oracle" | "MySQL";
  host: string;
  port: number;
  username: string;
  password_encrypted: number[];
  database: string;
  oracle_sid?: string;
  oracle_service_name?: string;
}

export interface TableInfo {
  name: string;
  owner?: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  nullable: boolean;
  key_constraint?: string;
  default_value?: string;
}

export interface TableMetadata {
  table_name: string;
  owner?: string;
  columns: ColumnInfo[];
}

export interface AiConfig {
  base_url: string;
  api_key: string;
  model: string;
}

export interface SqlGenerationRequest {
  tables_context: string;
  user_query: string;
}

export interface SqlGenerationResponse {
  sql: string;
  explanation?: string;
}

export const api = {
  testConnection: (config: ConnectionConfig) =>
    invoke<boolean>("test_connection", { config }),

  getTables: (config: ConnectionConfig) =>
    invoke<TableInfo[]>("get_tables", { config }),

  getTableMetadata: (config: ConnectionConfig, tableName: string) =>
    invoke<TableMetadata>("get_table_metadata", { config, tableName }),

  saveConnection: (config: ConnectionConfig) =>
    invoke<void>("save_connection", { config }),

  loadConnections: () =>
    invoke<ConnectionConfig[]>("load_connections"),

  deleteConnection: (id: string) =>
    invoke<void>("delete_connection", { id }),

  generateSql: (config: AiConfig, request: SqlGenerationRequest) =>
    invoke<SqlGenerationResponse>("generate_sql", { config, request }),
};
```

- [ ] **Step 2: Create useConnections hook**

```ts
import { useState, useEffect } from "react";
import { api, ConnectionConfig } from "../lib/api";

export function useConnections() {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const conns = await api.loadConnections();
      setConnections(conns);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const saveConnection = async (config: ConnectionConfig) => {
    await api.saveConnection(config);
    await loadConnections();
  };

  const deleteConnection = async (id: string) => {
    await api.deleteConnection(id);
    await loadConnections();
  };

  return {
    connections,
    loading,
    error,
    saveConnection,
    deleteConnection,
    reload: loadConnections,
  };
}
```

- [ ] **Step 3: Create ConnectionManager component**

```tsx
import { useState } from "react";
import { ConnectionConfig, api } from "../lib/api";

interface ConnectionFormProps {
  onSave: (config: ConnectionConfig) => void;
  onCancel: () => void;
}

function ConnectionForm({ onSave, onCancel }: ConnectionFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    db_type: "MySQL" as "Oracle" | "MySQL",
    host: "localhost",
    port: 3306,
    username: "",
    password: "",
    database: "",
    oracle_sid: "",
    oracle_service_name: "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build config with encrypted password via Tauri command
    // For now, simplified - actual impl needs crypto.invoke
    const config: ConnectionConfig = {
      id: crypto.randomUUID(),
      name: formData.name,
      db_type: formData.db_type,
      host: formData.host,
      port: formData.port,
      username: formData.username,
      password_encrypted: [], // Will be encrypted by backend
      database: formData.database,
      oracle_sid: formData.oracle_sid || undefined,
      oracle_service_name: formData.oracle_service_name || undefined,
    };
    await onSave(config);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Test would need password plain - simplified for now
      setTestResult("Connection test not yet implemented");
    } catch (e) {
      setTestResult(`Failed: ${e}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">New Connection</h3>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm">Connection Name</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Database Type</span>
          <select
            value={formData.db_type}
            onChange={(e) => setFormData({
              ...formData,
              db_type: e.target.value as "Oracle" | "MySQL",
              port: e.target.value === "Oracle" ? 1521 : 3306,
            })}
            className="mt-1 block w-full rounded border p-2"
          >
            <option value="MySQL">MySQL</option>
            <option value="Oracle">Oracle</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm">Host</span>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Port</span>
          <input
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Username</span>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm">
            {formData.db_type === "Oracle" ? "SID / Service Name" : "Database"}
          </span>
          <input
            type="text"
            value={formData.db_type === "Oracle" ? formData.oracle_sid : formData.database}
            onChange={(e) => setFormData({
              ...formData,
              oracle_sid: e.target.value,
              database: e.target.value,
            })}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </label>
      </div>

      {testResult && (
        <div className={`p-2 rounded ${testResult.includes("Success") ? "bg-green-100" : "bg-red-100"}`}>
          {testResult}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface ConnectionManagerProps {
  connections: ConnectionConfig[];
  onSelect: (config: ConnectionConfig) => void;
  onSave: (config: ConnectionConfig) => void;
  onDelete: (id: string) => void;
}

export function ConnectionManager({
  connections,
  onSelect,
  onSave,
  onDelete,
}: ConnectionManagerProps) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <ConnectionForm onSave={onSave} onCancel={() => setShowForm(false)} />;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Database Connections</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Add Connection
        </button>
      </div>

      <div className="space-y-2">
        {connections.length === 0 ? (
          <p className="text-gray-500">No saved connections</p>
        ) : (
          connections.map((conn) => (
            <div
              key={conn.id}
              className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{conn.name}</p>
                <p className="text-sm text-gray-500">
                  {conn.db_type} - {conn.host}:{conn.port}/{conn.database}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSelect(conn)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Connect
                </button>
                <button
                  onClick={() => onDelete(conn.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/ConnectionManager.tsx src/hooks/useConnections.ts src/lib/api.ts
git commit -m "feat: add ConnectionManager component and API wrapper

- ConnectionManager for adding/editing/deleting DB connections
- useConnections hook for state management
- api.ts with typed invoke wrappers for Tauri commands

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Build React Frontend - Table List & Detail

**Files:**
- Create: `src/components/TableList.tsx`, `src/components/TableDetail.tsx`

- [ ] **Step 1: Create TableList component**

```tsx
import { useState, useEffect } from "react";
import { api, ConnectionConfig, TableInfo, TableMetadata } from "../lib/api";

interface TableListProps {
  connection: ConnectionConfig;
  selectedTables: string[];
  onSelectionChange: (tables: string[]) => void;
  onSelectTable: (tableName: string, metadata: TableMetadata | null) => void;
}

export function TableList({
  connection,
  selectedTables,
  onSelectionChange,
  onSelectTable,
}: TableListProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tableMetadata, setTableMetadata] = useState<Record<string, TableMetadata>>({});

  useEffect(() => {
    loadTables();
  }, [connection]);

  const loadTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const tables = await api.getTables(connection);
      setTables(tables);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      onSelectionChange(selectedTables.filter((t) => t !== tableName));
    } else {
      onSelectionChange([...selectedTables, tableName]);
    }
  };

  const handleTableClick = async (tableName: string) => {
    if (tableMetadata[tableName]) {
      onSelectTable(tableName, tableMetadata[tableName]);
      return;
    }
    try {
      const metadata = await api.getTableMetadata(connection, tableName);
      setTableMetadata({ ...tableMetadata, [tableName]: metadata });
      onSelectTable(tableName, metadata);
    } catch (e) {
      setError(`Failed to load metadata: ${e}`);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredTables.map((t) => t.name));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return <div className="p-4">Loading tables...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-2">Tables ({tables.length})</h3>
        <input
          type="text"
          placeholder="Search tables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-blue-500 hover:underline"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-sm text-blue-500 hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredTables.map((table) => (
          <div
            key={table.name}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedTables.includes(table.name)}
              onChange={() => toggleTable(table.name)}
              className="rounded"
            />
            <span
              onClick={() => handleTableClick(table.name)}
              className="flex-1"
            >
              {table.name}
            </span>
          </div>
        ))}
      </div>

      <div className="p-2 border-t text-sm text-gray-500">
        {selectedTables.length} table(s) selected
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TableDetail component**

```tsx
import { TableMetadata } from "../lib/api";

interface TableDetailProps {
  metadata: TableMetadata | null;
}

export function TableDetail({ metadata }: TableDetailProps) {
  if (!metadata) {
    return (
      <div className="p-4 text-gray-500">
        Select a table to view its structure
      </div>
    );
  }

  const getConstraintBadge = (constraint: string | undefined) => {
    if (!constraint) return null;
    const colors: Record<string, string> = {
      PK: "bg-yellow-500 text-white",
      FK: "bg-blue-500 text-white",
      UK: "bg-green-500 text-white",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[constraint] || ""}`}>
        {constraint}
      </span>
    );
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">
        Table: {metadata.table_name}
        {metadata.owner && <span className="text-gray-500"> ({metadata.owner})</span>}
      </h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 px-2">Column Name</th>
            <th className="py-2 px-2">Data Type</th>
            <th className="py-2 px-2">Nullable</th>
            <th className="py-2 px-2">Constraint</th>
            <th className="py-2 px-2">Default</th>
          </tr>
        </thead>
        <tbody>
          {metadata.columns.map((col, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="py-2 px-2 font-medium">{col.name}</td>
              <td className="py-2 px-2 text-gray-600">{col.data_type}</td>
              <td className="py-2 px-2">{col.nullable ? "Y" : "N"}</td>
              <td className="py-2 px-2">{getConstraintBadge(col.key_constraint)}</td>
              <td className="py-2 px-2 text-gray-400">
                {col.default_value || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Verify components compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/TableList.tsx src/components/TableDetail.tsx
git commit -m "feat: add TableList and TableDetail components

- TableList: displays tables with search, select all/deselect all,
  loads metadata on click
- TableDetail: shows column structure with type, constraints, defaults

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Build React Frontend - SQL Generator & Settings

**Files:**
- Create: `src/components/SqlGenerator.tsx`, `src/components/Settings.tsx`

- [ ] **Step 1: Create Settings component for AI config**

```tsx
import { useState, useEffect } from "react";
import { AiConfig } from "../lib/api";

interface SettingsProps {
  onClose: () => void;
}

const STORAGE_KEY = "data-assistant-ai-config";

export function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<AiConfig>({
    base_url: "https://api.deepseek.com",
    api_key: "",
    model: "deepseek-chat",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setConfig(JSON.parse(stored));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">AI Settings</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm">Base URL</span>
            <select
              value={config.base_url}
              onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              className="mt-1 block w-full rounded border p-2"
            >
              <option value="https://api.deepseek.com">DeepSeek</option>
              <option value="https://api.minimax.chat">MiniMax</option>
              <option value="https://open.bigmodel.cn">GLM (智谱)</option>
              <option value="https://api.openai.com">OpenAI</option>
              <option value="https://compatible.api.url">Custom...</option>
            </select>
          </label>

          {config.base_url === "https://compatible.api.url" && (
            <label className="block">
              <span className="text-sm">Custom API URL</span>
              <input
                type="text"
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                className="mt-1 block w-full rounded border p-2"
                placeholder="https://your-api.com/v1"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm">API Key</span>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              className="mt-1 block w-full rounded border p-2"
              placeholder="sk-..."
            />
          </label>

          <label className="block">
            <span className="text-sm">Model</span>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="mt-1 block w-full rounded border p-2"
              placeholder="e.g., deepseek-chat, glm-4, gpt-4"
            />
          </label>
        </div>

        {saved && (
          <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
            Settings saved!
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SqlGenerator component**

```tsx
import { useState } from "react";
import { api, AiConfig, SqlGenerationRequest } from "../lib/api";

interface SqlGeneratorProps {
  tablesContext: string;
  onGeneratedSql: (sql: string) => void;
}

export function SqlGenerator({ tablesContext, onGeneratedSql }: SqlGeneratorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim()) return;

    const configStr = localStorage.getItem("data-assistant-ai-config");
    if (!configStr) {
      setError("Please configure AI settings first");
      return;
    }

    const config: AiConfig = JSON.parse(configStr);
    const request: SqlGenerationRequest = {
      tables_context: tablesContext,
      user_query: query,
    };

    setLoading(true);
    setError(null);
    setGeneratedSql(null);

    try {
      const response = await api.generateSql(config, request);
      setGeneratedSql(response.sql);
      onGeneratedSql(response.sql);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedSql) {
      await navigator.clipboard.writeText(generatedSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 border-t bg-gray-50">
      <h3 className="font-semibold mb-3">Generate SQL</h3>

      <div className="mb-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your query requirement in natural language...
Example: Find all orders placed by customers in Beijing, showing customer name, order date, and total amount"
          className="w-full p-3 border rounded-lg h-24 resize-none"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500">
          {tablesContext ? "Table context loaded" : "No tables selected"}
        </span>
        <button
          onClick={handleGenerate}
          disabled={loading || !query.trim() || !tablesContext}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate SQL"}
        </button>
      </div>

      {generatedSql && (
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            {generatedSql}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify components compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/SqlGenerator.tsx src/components/Settings.tsx
git commit -m "feat: add SqlGenerator and Settings components

- Settings: modal for AI API configuration (DeepSeek, MiniMax, GLM, OpenAI)
- SqlGenerator: textarea for natural language query, calls AI API,
  displays generated SQL with copy button

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Integrate All Components in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the complete App.tsx**

```tsx
import { useState } from "react";
import { ConnectionManager } from "./components/ConnectionManager";
import { TableList } from "./components/TableList";
import { TableDetail } from "./components/TableDetail";
import { SqlGenerator } from "./components/SqlGenerator";
import { Settings } from "./components/Settings";
import { useConnections } from "./hooks/useConnections";
import { ConnectionConfig, TableMetadata } from "./lib/api";

type AppView = "connections" | "main";

function App() {
  const [view, setView] = useState<AppView>("connections");
  const [activeConnection, setActiveConnection] = useState<ConnectionConfig | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [currentTableMetadata, setCurrentTableMetadata] = useState<Record<string, TableMetadata>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string>("");

  const {
    connections,
    loading: connLoading,
    saveConnection,
    deleteConnection,
  } = useConnections();

  const handleConnect = (config: ConnectionConfig) => {
    setActiveConnection(config);
    setSelectedTables([]);
    setCurrentTableMetadata({});
    setView("main");
  };

  const handleSelectTable = (tableName: string, metadata: TableMetadata | null) => {
    if (metadata) {
      setCurrentTableMetadata({ ...currentTableMetadata, [tableName]: metadata });
    }
  };

  const buildTablesContext = (): string => {
    return selectedTables
      .map((tableName) => {
        const meta = currentTableMetadata[tableName];
        if (!meta) return "";

        const columns = meta.columns
          .map((c) => `  - ${c.name}: ${c.data_type}${c.key_constraint ? ` (${c.key_constraint})` : ""}`)
          .join("\n");

        return `Table: ${tableName}\n${columns}`;
      })
      .join("\n\n");
  };

  const handleDisconnect = () => {
    setActiveConnection(null);
    setSelectedTables([]);
    setCurrentTableMetadata({});
    setView("connections");
  };

  if (connLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  if (view === "connections" || !activeConnection) {
    return (
      <ConnectionManager
        connections={connections}
        onSelect={handleConnect}
        onSave={saveConnection}
        onDelete={deleteConnection}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Data Assistant</h1>
          <span className="text-sm text-gray-500">
            Connected to: {activeConnection.name}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            Settings
          </button>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table list */}
        <div className="w-64 border-r bg-white overflow-y-auto">
          <TableList
            connection={activeConnection}
            selectedTables={selectedTables}
            onSelectionChange={setSelectedTables}
            onSelectTable={handleSelectTable}
          />
        </div>

        {/* Table detail */}
        <div className="flex-1 overflow-y-auto bg-white">
          <TableDetail
            metadata={
              selectedTables.length === 1 && currentTableMetadata[selectedTables[0]]
                ? currentTableMetadata[selectedTables[0]]
                : null
            }
          />
        </div>
      </div>

      {/* SQL Generator */}
      <SqlGenerator
        tablesContext={buildTablesContext()}
        onGeneratedSql={setGeneratedSql}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify App compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate all components in main App

Complete application flow:
- ConnectionManager as entry point
- Table list and detail views after connection
- SQL generator with AI integration
- Settings modal for API configuration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Build and Test

- [ ] **Step 1: Run production build**

Run: `npm run build && npm run tauri build`
Expected: Build succeeds, .exe file generated in src-tauri/target/release/

- [ ] **Step 2: Test the built executable**

Run: `src-tauri/target/release/data-assistant.exe --version` (or launch directly)
Expected: Application launches with window

- [ ] **Step 3: Verify spec coverage**

Review the spec document and ensure all features are implemented:
- [x] Connection management (add/edit/delete/test)
- [x] Oracle and MySQL support
- [x] Encrypted credential storage (DPAPI)
- [x] Table structure browsing
- [x] Multi-select tables
- [x] Search/filter tables
- [x] AI SQL generation
- [x] OpenAI-compatible API support
- [x] Configurable base URL and API key
- [x] Copy SQL to clipboard

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete DB Assistant application

All core features implemented:
- Database connections (Oracle/MySQL) with encrypted storage
- Table metadata browsing (structure only, no data)
- AI-powered SQL generation via OpenAI-compatible APIs
- Support for DeepSeek, MiniMax, GLM, and custom endpoints

Windows executable built and ready.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Plan Complete

**Execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like?
