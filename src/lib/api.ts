import { invoke } from "@tauri-apps/api/core";

export interface DebugLog {
  time: string;
  action: string;
  data: unknown;
}

const debugChannel = new BroadcastChannel("debug-console");

export const debug = {
  log: (action: string, data: unknown) => {
    debugChannel.postMessage({
      type: "log",
      payload: { time: new Date().toLocaleTimeString(), action, data } as DebugLog,
    });
  },
  clear: () => {
    debugChannel.postMessage({ type: "clear" });
  },
};

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

export interface TableInfo { name: string; owner?: string; }
export interface ColumnInfo { name: string; data_type: string; nullable: boolean; key_constraint?: string; default_value?: string; }
export interface TableMetadata { table_name: string; owner?: string; columns: ColumnInfo[]; }
export interface AiConfig { base_url: string; api_key: string; model: string; }
export interface ChatMessage { role: "user" | "assistant"; content: string; explanation?: string; }
export interface SqlGenerationRequest { tables_context: string; user_query: string; history?: ChatMessage[]; }
export interface SqlGenerationResponse { sql: string; explanation?: string; }

export interface Session {
  id: string;
  name: string;
  selected_tables: string[];
  chat_messages: ChatMessage[];
}

export const api = {
  testConnection: (config: ConnectionConfig) => invoke<boolean>("test_connection", { config }),
  getTables: (config: ConnectionConfig) => invoke<TableInfo[]>("get_tables", { config }),
  getTableMetadata: (config: ConnectionConfig, tableName: string) => invoke<TableMetadata>("get_table_metadata", { config, table_name: tableName }),
  saveConnection: (config: ConnectionConfig) => invoke<void>("save_connection", { config }),
  loadConnections: () => invoke<ConnectionConfig[]>("load_connections"),
  deleteConnection: (id: string) => invoke<void>("delete_connection", { id }),
  generateSql: (config: AiConfig, request: SqlGenerationRequest) => invoke<SqlGenerationResponse>("generate_sql_command", { config, request }),
  encryptPassword: (password: string) => invoke<number[]>("encrypt_password_command", { password }),
  loadColumnRemarks: (schema: string) => invoke<Record<string, string>>("load_column_remarks", { schema }),
  saveColumnRemark: (schema: string, key: string, value: string) => invoke<void>("save_column_remark", { schema, key, value }),
  loadSessions: (schema: string) => invoke<Session[]>("load_sessions", { schema }),
  saveSessions: (schema: string, sessions: Session[]) => invoke<void>("save_sessions", { schema, sessions }),
};
