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
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  const { connections, saveConnection, deleteConnection, reload } = useConnections();

  const handleConnect = (connection: ConnectionConfig) => {
    setActiveConnection(connection);
    setSelectedTables([]);
    setCurrentTableMetadata({});
    setSelectedTableName(null);
    setView("main");
  };

  const handleDisconnect = () => {
    setActiveConnection(null);
    setSelectedTables([]);
    setCurrentTableMetadata({});
    setSelectedTableName(null);
    setView("connections");
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

  const handleSelectTable = (tableName: string, metadata: TableMetadata | null) => {
    setSelectedTableName(tableName);
    if (metadata) {
      setCurrentTableMetadata((prev) => ({ ...prev, [tableName]: metadata }));
    }
  };

  const tablesContext = buildTablesContext();

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
            {/* Table List - Left Panel */}
            <div className="w-64 border-r bg-white overflow-y-auto">
              {activeConnection && (
                <TableList
                  connection={activeConnection}
                  selectedTables={selectedTables}
                  onSelectionChange={setSelectedTables}
                  onSelectTable={handleSelectTable}
                />
              )}
            </div>

            {/* Table Detail - Right Panel */}
            <div className="flex-1 overflow-y-auto bg-white">
              <TableDetail
                metadata={selectedTableName ? currentTableMetadata[selectedTableName] || null : null}
              />
            </div>
          </div>

          {/* SQL Generator - Bottom */}
          <div className="border-t bg-white p-4">
            <SqlGenerator
              tablesContext={tablesContext}
              onGeneratedSql={() => {}}
            />
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
