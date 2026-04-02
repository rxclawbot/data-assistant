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