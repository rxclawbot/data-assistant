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

export interface TableInfo { name: string; owner?: string; }
export interface ColumnInfo { name: string; data_type: string; nullable: boolean; key_constraint?: string; default_value?: string; }
export interface TableMetadata { table_name: string; owner?: string; columns: ColumnInfo[]; }
export interface AiConfig { base_url: string; api_key: string; model: string; }
export interface SqlGenerationRequest { tables_context: string; user_query: string; }
export interface SqlGenerationResponse { sql: string; explanation?: string; }

export const api = {
  testConnection: (config: ConnectionConfig) => invoke<boolean>("test_connection", { config }),
  getTables: (config: ConnectionConfig) => invoke<TableInfo[]>("get_tables", { config }),
  getTableMetadata: (config: ConnectionConfig, tableName: string) => invoke<TableMetadata>("get_table_metadata", { config, tableName }),
  saveConnection: (config: ConnectionConfig) => invoke<void>("save_connection", { config }),
  loadConnections: () => invoke<ConnectionConfig[]>("load_connections"),
  deleteConnection: (id: string) => invoke<void>("delete_connection", { id }),
  generateSql: (config: AiConfig, request: SqlGenerationRequest) => invoke<SqlGenerationResponse>("generate_sql", { config, request }),
  encryptPassword: (password: string) => invoke<number[]>("encrypt_password_command", { password }),
};
