import { useState } from "react";
import { ConnectionConfig, api } from "../lib/api";
import { useConnections } from "../hooks/useConnections";

interface ConnectionFormProps {
  onSave: (config: ConnectionConfig) => Promise<void>;
  onTest: (config: ConnectionConfig) => Promise<boolean>;
}

function ConnectionForm({ onSave, onTest }: ConnectionFormProps) {
  const [form, setForm] = useState<Partial<ConnectionConfig>>({
    name: "",
    db_type: "Oracle",
    host: "localhost",
    port: 1521,
    username: "",
    password_encrypted: [],
    database: "",
    oracle_sid: "",
    oracle_service_name: "",
  });
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDbTypeChange = (db_type: "Oracle" | "MySQL") => {
    setForm((f) => ({
      ...f,
      db_type,
      port: db_type === "Oracle" ? 1521 : 3306,
    }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const config = buildConfig();
      const result = await onTest(config);
      setTestResult(result);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = buildConfig();
      await onSave(config);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const buildConfig = (): ConnectionConfig => {
    const id = crypto.randomUUID();
    const passwordBytes = password.split("").map((c) => c.charCodeAt(0));
    return {
      id,
      name: form.name || "",
      db_type: form.db_type || "Oracle",
      host: form.host || "",
      port: form.port || (form.db_type === "Oracle" ? 1521 : 3306),
      username: form.username || "",
      password_encrypted: passwordBytes,
      database: form.database || "",
      oracle_sid: form.oracle_sid,
      oracle_service_name: form.oracle_service_name,
    } as ConnectionConfig;
  };

  const resetForm = () => {
    setForm({
      name: "",
      db_type: "Oracle",
      host: "localhost",
      port: 1521,
      username: "",
      password_encrypted: [],
      database: "",
      oracle_sid: "",
      oracle_service_name: "",
    });
    setPassword("");
    setTestResult(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">Add Connection</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Connection Name</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="My Oracle DB"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Database Type</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.db_type}
            onChange={(e) => handleDbTypeChange(e.target.value as "Oracle" | "MySQL")}
          >
            <option value="Oracle">Oracle</option>
            <option value="MySQL">MySQL</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Host</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.host}
            onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
            placeholder="localhost"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Port</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={form.port}
            onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="system"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Database</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={form.database}
            onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
            placeholder={form.db_type === "Oracle" ? "Database name" : "Database name"}
          />
        </div>
        {form.db_type === "Oracle" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Oracle SID</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.oracle_sid}
                onChange={(e) => setForm((f) => ({ ...f, oracle_sid: e.target.value }))}
                placeholder="ORCL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Oracle Service Name</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={form.oracle_service_name}
                onChange={(e) => setForm((f) => ({ ...f, oracle_service_name: e.target.value }))}
                placeholder="myservice.mycompany.com"
              />
            </div>
          </>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
        {testResult === true && (
          <span className="text-green-600 text-sm">Connection successful!</span>
        )}
        {testResult === false && (
          <span className="text-red-600 text-sm">Connection failed.</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.host || !form.username}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-auto"
        >
          {saving ? "Saving..." : "Save Connection"}
        </button>
      </div>
    </div>
  );
}

interface ConnectionCardProps {
  connection: ConnectionConfig;
  onDelete: (id: string) => Promise<void>;
  onConnect: (connection: ConnectionConfig) => void;
}

function ConnectionCard({ connection, onDelete, onConnect }: ConnectionCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(connection.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold">{connection.name}</h3>
        <p className="text-sm text-gray-600">
          {connection.db_type} - {connection.host}:{connection.port}
        </p>
        <p className="text-sm text-gray-500">Database: {connection.database}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onConnect(connection)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Connect
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

interface ConnectionManagerProps {
  onConnect?: (connection: ConnectionConfig) => void;
}

export function ConnectionManager({ onConnect }: ConnectionManagerProps) {
  const { connections, loading, error, saveConnection, deleteConnection, reload } = useConnections();

  const handleTest = async (config: ConnectionConfig): Promise<boolean> => {
    return api.testConnection(config);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading connections...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Connection Manager</h1>
        <button
          onClick={reload}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4">
          {error}
        </div>
      )}

      <ConnectionForm onSave={saveConnection} onTest={handleTest} />

      <h2 className="text-lg font-semibold mb-3">Saved Connections</h2>
      {connections.length === 0 ? (
        <p className="text-gray-500">No saved connections yet.</p>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onDelete={deleteConnection}
              onConnect={onConnect || (() => {})}
            />
          ))}
        </div>
      )}
    </div>
  );
}
