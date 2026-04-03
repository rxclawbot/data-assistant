import { useState, useMemo, useCallback, useEffect } from "react";
import { ConnectionManager } from "./components/ConnectionManager";
import { TableList } from "./components/TableList";
import { TableDetail } from "./components/TableDetail";
import { SqlGenerator } from "./components/SqlGenerator";
import { SqlResult } from "./components/SqlResult";
import { Settings } from "./components/Settings";
import { SessionList } from "./components/SessionList";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useConnections } from "./hooks/useConnections";
import { ConnectionConfig, TableMetadata, ChatMessage, AiConfig, Session, api, debug } from "./lib/api";

type AppView = "connections" | "main";

const AI_CONFIG_KEY = "data-assistant-ai-config";
const DEBUG_KEY = "data-assistant-debug";

function newSession(name: string): Session {
  return {
    id: crypto.randomUUID(),
    name,
    selected_tables: [],
    chat_messages: [],
  };
}

function getSchema(conn: ConnectionConfig): string {
  return conn.db_type === "Oracle" ? conn.username.toUpperCase() : conn.database;
}

function App() {
  const [view, setView] = useState<AppView>("connections");
  const [activeConnection, setActiveConnection] = useState<ConnectionConfig | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [currentTableMetadata, setCurrentTableMetadata] = useState<Record<string, TableMetadata>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [visibleTableDetails, setVisibleTableDetails] = useState<string[]>([]);
  const [activeDetailTable, setActiveDetailTable] = useState<string | null>(null);
  const [columnRemarks, setColumnRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  // Current session derived state
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const selectedTables = activeSession?.selected_tables ?? [];
  const chatMessages = activeSession?.chat_messages ?? [];

  // Poll for debug window existence to detect manual close
  useEffect(() => {
    if (!debugOpen) return;
    const interval = setInterval(async () => {
      const win = await WebviewWindow.getByLabel("debug");
      if (!win) {
        setDebugOpen(false);
        localStorage.setItem(DEBUG_KEY, "false");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [debugOpen]);

  const addDebugLog = (action: string, data: unknown) => {
    if (localStorage.getItem(DEBUG_KEY) !== "true") return;
    debug.log(action, data);
  };

  const { connections, saveConnection, deleteConnection, reload } = useConnections();

  // Helper to update the active session's data
  const updateActiveSession = useCallback((updater: (s: Session) => Session) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === activeSessionId ? updater(s) : s));
      // Auto-save in background
      if (activeConnection) {
        api.saveSessions(getSchema(activeConnection), next).catch(() => {});
      }
      return next;
    });
  }, [activeSessionId, activeConnection]);

  const handleConnect = async (connection: ConnectionConfig) => {
    setActiveConnection(connection);
    setCurrentTableMetadata({});
    setVisibleTableDetails([]);
    setActiveDetailTable(null);
    setColumnRemarks({});

    // Load sessions for this connection
    const schema = getSchema(connection);
    try {
      const loaded = await api.loadSessions(schema);
      setSessions(loaded);
      setActiveSessionId(loaded[0].id);
    } catch {
      const defaultSession = newSession("Session 1");
      setSessions([defaultSession]);
      setActiveSessionId(defaultSession.id);
    }

    // Load remarks for this connection's schema
    try {
      const rawRemarks = await api.loadColumnRemarks(schema);
      addDebugLog("load_column_remarks", { schema, result: rawRemarks });
      const prefixed: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawRemarks)) {
        prefixed[`${schema}.${k}`] = v;
      }
      setColumnRemarks(prefixed);
    } catch {
      // no remarks file yet, that's fine
    }

    setView("main");
  };

  const handleDisconnect = () => {
    setActiveConnection(null);
    setSessions([]);
    setActiveSessionId("");
    setCurrentTableMetadata({});
    setVisibleTableDetails([]);
    setActiveDetailTable(null);
    setColumnRemarks({});
    setView("connections");
  };

  // Session operations
  const handleNewSession = () => {
    const s = newSession(`Session ${sessions.length + 1}`);
    const next = [...sessions, s];
    setSessions(next);
    setActiveSessionId(s.id);
    setVisibleTableDetails([]);
    setActiveDetailTable(null);
    setCurrentTableMetadata({});
    if (activeConnection) {
      api.saveSessions(getSchema(activeConnection), next).catch(() => {});
    }
  };

  const handleSelectSession = (id: string) => {
    if (id === activeSessionId) return;
    // Save current session's table metadata state before switching
    setActiveSessionId(id);
    setVisibleTableDetails([]);
    setActiveDetailTable(null);
    setCurrentTableMetadata({});
  };

  const handleRenameSession = (id: string, name: string) => {
    const next = sessions.map((s) => (s.id === id ? { ...s, name } : s));
    setSessions(next);
    if (activeConnection) {
      api.saveSessions(getSchema(activeConnection), next).catch(() => {});
    }
  };

  const handleDeleteSession = (id: string) => {
    let next = sessions.filter((s) => s.id !== id);
    if (next.length === 0) {
      const s = newSession("Session 1");
      next = [s];
    }
    setSessions(next);
    if (activeSessionId === id) {
      setActiveSessionId(next[0].id);
      setVisibleTableDetails([]);
      setActiveDetailTable(null);
      setCurrentTableMetadata({});
    }
    if (activeConnection) {
      api.saveSessions(getSchema(activeConnection), next).catch(() => {});
    }
  };

  const buildTablesContext = (): string => {
    return selectedTables
      .map((tableName) => {
        const meta = currentTableMetadata[tableName];
        if (!meta) return "";
        const prefix = meta.owner ? `${meta.owner}.${meta.table_name}` : meta.table_name;
        const columns = meta.columns
          .map((c) => {
            const remarkKey = `${prefix}.${c.name}`;
            const remark = columnRemarks[remarkKey];
            const parts = [`${c.name}: ${c.data_type}`];
            if (c.key_constraint) parts.push(c.key_constraint);
            if (remark) parts.push(remark);
            return `  - ${parts.join(" | ")}`;
          })
          .join("\n");
        return `Table: ${tableName}\n${columns}`;
      })
      .join("\n\n");
  };

  const handleSelectTable = (tableName: string, metadata: TableMetadata | null) => {
    if (metadata) {
      const remarksForTable = Object.fromEntries(
        Object.entries(columnRemarks).filter(([k]) => k.startsWith(`${metadata.owner || ""}.${tableName}.`.replace(/^\./, "")))
      );
      addDebugLog("get_table_metadata", { table_name: tableName, columns: metadata.columns, owner: metadata.owner, remarks: remarksForTable });
      setCurrentTableMetadata((prev) => ({ ...prev, [tableName]: metadata }));
    }
    setVisibleTableDetails((prev) => {
      if (prev.includes(tableName)) {
        if (activeDetailTable === tableName) {
          const remaining = prev.filter((t) => t !== tableName);
          setActiveDetailTable(remaining.length > 0 ? remaining[remaining.length - 1] : null);
        }
        return prev.filter((t) => t !== tableName);
      }
      setActiveDetailTable(tableName);
      return [...prev, tableName];
    });

    // Update session's selected_tables
    if (metadata && !selectedTables.includes(tableName)) {
      updateActiveSession((s) => ({ ...s, selected_tables: [...s.selected_tables, tableName] }));
    }
  };

  const handleCloseTableDetail = (tableName: string) => {
    setVisibleTableDetails((prev) => {
      const remaining = prev.filter((t) => t !== tableName);
      if (activeDetailTable === tableName) {
        setActiveDetailTable(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
      return remaining;
    });
  };

  const tablesContext = useMemo(buildTablesContext, [selectedTables, currentTableMetadata, columnRemarks]);

  const tableDetailsData = visibleTableDetails
    .filter((name) => currentTableMetadata[name])
    .map((name) => ({ tableName: name, metadata: currentTableMetadata[name] }));

  // Sync selected tables to session when checkbox selection changes
  const handleSelectionChange = (tables: string[]) => {
    updateActiveSession((s) => ({ ...s, selected_tables: tables }));
  };

  const handleRemarkChange = useCallback(async (key: string, value: string) => {
    setColumnRemarks((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });

    const schema = activeConnection ? getSchema(activeConnection) : "";
    if (schema) {
      const prefix = `${schema}.`;
      const fileKey = key.startsWith(prefix) ? key.slice(prefix.length) : key;
      try {
        await api.saveColumnRemark(schema, fileKey, value);
        addDebugLog("save_column_remark", { schema, key: fileKey, value });
      } catch {
        // ignore save errors
      }
    }
  }, [activeConnection]);

  const handleSend = useCallback(async (query: string) => {
    const stored = localStorage.getItem(AI_CONFIG_KEY);
    if (!stored) {
      updateActiveSession((s) => ({
        ...s,
        chat_messages: [
          ...s.chat_messages,
          { role: "user", content: query },
          { role: "assistant", content: "Please configure AI settings first.", explanation: undefined },
        ],
      }));
      return;
    }

    let config: AiConfig;
    try {
      config = JSON.parse(stored);
    } catch {
      return;
    }

    const history: ChatMessage[] = chatMessages.map((m) => ({
      role: m.role,
      content: m.role === "assistant" ? `SQL:\n${m.content}${m.explanation ? `\n\nExplanation: ${m.explanation}` : ""}` : m.content,
    }));

    updateActiveSession((s) => ({
      ...s,
      chat_messages: [...s.chat_messages, { role: "user", content: query }],
    }));
    setLoading(true);

    const request = { tables_context: tablesContext, user_query: query, history };
    addDebugLog("generate_sql_request", { config: { base_url: config.base_url, model: config.model }, request });

    try {
      const response = await api.generateSql(config, request);
      addDebugLog("generate_sql_response", response);
      updateActiveSession((s) => ({
        ...s,
        chat_messages: [...s.chat_messages, { role: "assistant", content: response.sql, explanation: response.explanation }],
      }));
    } catch (err) {
      updateActiveSession((s) => ({
        ...s,
        chat_messages: [...s.chat_messages, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      }));
    } finally {
      setLoading(false);
    }
  }, [chatMessages, tablesContext, updateActiveSession]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {view === "connections" ? (
        <ConnectionManager
          connections={connections}
          onSelect={handleConnect}
          onSave={saveConnection}
          onDelete={deleteConnection}
          onReload={reload}
        />
      ) : (
        <>
          {/* Header */}
          <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Data Assistant</h1>
              {activeConnection && (
                <span className="text-sm text-gray-500">
                  Connected to: {activeConnection.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const existing = await WebviewWindow.getByLabel("debug");
                  if (existing) {
                    await existing.close();
                    setDebugOpen(false);
                    localStorage.setItem(DEBUG_KEY, "false");
                  } else {
                    const win = new WebviewWindow("debug", {
                      url: "/#/debug",
                      title: "Debug Console",
                      width: 800,
                      height: 500,
                      resizable: true,
                    });
                    win.once("tauri://created", () => {
                      setDebugOpen(true);
                      localStorage.setItem(DEBUG_KEY, "true");
                    });
                    win.once("tauri://error", (e: unknown) => {
                      console.error("Failed to create debug window:", e);
                      alert("Failed to create debug window: " + JSON.stringify(e));
                    });
                  }
                }}
                className={`px-3 py-1 text-sm border rounded ${
                  debugOpen ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : "hover:bg-gray-50"
                }`}
              >
                Debug
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left - Table List + Sessions */}
            <div className="w-64 border-r bg-white flex flex-col overflow-hidden">
              {/* Table List */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeConnection && (
                  <TableList
                    connection={activeConnection}
                    selectedTables={selectedTables}
                    onSelectionChange={handleSelectionChange}
                    onSelectTable={handleSelectTable}
                  />
                )}
              </div>
              {/* Session List */}
              <div className="h-48 border-t flex-shrink-0">
                <SessionList
                  sessions={sessions}
                  activeId={activeSessionId}
                  onSelect={handleSelectSession}
                  onNew={handleNewSession}
                  onRename={handleRenameSession}
                  onDelete={handleDeleteSession}
                />
              </div>
            </div>

            {/* Right - Table Details + Chat + Input */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Table Details Panel */}
              {tableDetailsData.length > 0 && (
                <div className="border-b shrink-0">
                  <button
                    onClick={() => setDetailCollapsed((v) => !v)}
                    className="flex items-center gap-1 w-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    <svg
                      className={`h-3 w-3 transition-transform ${detailCollapsed ? "-rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    表结构 ({tableDetailsData.length})
                    {tableDetailsData.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisibleTableDetails([]);
                          setActiveDetailTable(null);
                        }}
                        className="ml-auto px-2 py-0.5 text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded"
                        title="关闭所有"
                      >
                        全部关闭
                      </span>
                    )}
                  </button>
                  {!detailCollapsed && (
                    <div className="overflow-y-auto" style={{ maxHeight: "35vh" }}>
                      <TableDetail
                        tables={tableDetailsData}
                        activeTable={activeDetailTable}
                        onSelect={setActiveDetailTable}
                        onClose={handleCloseTableDetail}
                        remarks={columnRemarks}
                        onRemarkChange={handleRemarkChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-hidden">
                <SqlResult messages={chatMessages} />
              </div>

              {/* Input */}
              <div className="border-t p-3">
                <SqlGenerator loading={loading} onSend={handleSend} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
