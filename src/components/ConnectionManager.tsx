import { useState } from "react";
import { ConnectionConfig, api } from "../lib/api";

interface ConnectionFormProps {
  initialData?: ConnectionConfig;
  onSave: (config: ConnectionConfig) => Promise<void>;
  onTest: (config: ConnectionConfig) => Promise<boolean>;
  onCancel: () => void;
}

function ConnectionForm({ initialData, onSave, onTest, onCancel }: ConnectionFormProps) {
  const isEditing = !!initialData;

  type FormState = Omit<Partial<ConnectionConfig>, "password_encrypted"> & { password?: string };
  const [form, setForm] = useState<FormState>(
    initialData
      ? {
          name: initialData.name,
          db_type: initialData.db_type,
          host: initialData.host,
          port: initialData.port,
          username: initialData.username,
          database: initialData.database,
          oracle_sid: initialData.oracle_sid || "",
          oracle_service_name: initialData.oracle_service_name || "",
        }
      : {
          name: "",
          db_type: "Oracle",
          host: "localhost",
          port: 1521,
          username: "",
          password: "",
          database: "",
          oracle_sid: "",
          oracle_service_name: "",
        }
  );
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
      const config = await buildConfig();
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
      const config = await buildConfig();
      await onSave(config);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const buildConfig = async (): Promise<ConnectionConfig> => {
    const id = initialData?.id || crypto.randomUUID();
    let encrypted: number[];
    if (password) {
      encrypted = await api.encryptPassword(password);
    } else if (initialData?.password_encrypted) {
      encrypted = initialData.password_encrypted;
    } else {
      encrypted = await api.encryptPassword("");
    }
    return {
      id,
      name: form.name || "",
      db_type: form.db_type || "Oracle",
      host: form.host || "",
      port: form.port || (form.db_type === "Oracle" ? 1521 : 3306),
      username: form.username || "",
      password_encrypted: encrypted,
      database: form.database || "",
      oracle_sid: form.oracle_sid || undefined,
      oracle_service_name: form.oracle_service_name || undefined,
    } as ConnectionConfig;
  };

  const resetForm = () => {
    setForm({
      name: "",
      db_type: "Oracle",
      host: "localhost",
      port: 1521,
      username: "",
      database: "",
      oracle_sid: "",
      oracle_service_name: "",
    });
    setPassword("");
    setTestResult(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEditing ? "Edit Connection" : "Add Connection"}
      </h2>
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
          <label className="block text-sm font-medium mb-1">
            Password {isEditing && "(leave blank to keep current)"}
          </label>
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
          <div>
            <label className="block text-sm font-medium mb-1">Oracle Service Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={form.oracle_service_name}
              onChange={(e) => setForm((f) => ({ ...f, oracle_service_name: e.target.value }))}
              placeholder="myservice.mycompany.com or ORCL"
            />
          </div>
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
          {saving ? "Saving..." : isEditing ? "Update Connection" : "Save Connection"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface ConnectionCardProps {
  connection: ConnectionConfig;
  onEdit: (connection: ConnectionConfig) => void;
  onDelete: (id: string) => Promise<void>;
  onConnect: (connection: ConnectionConfig) => void;
}

function ConnectionCard({ connection, onEdit, onDelete, onConnect }: ConnectionCardProps) {
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
          onClick={() => onEdit(connection)}
          className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
        >
          Edit
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
  connections: ConnectionConfig[];
  onSelect: (connection: ConnectionConfig) => void;
  onSave: (config: ConnectionConfig) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReload?: () => void;
}

export function ConnectionManager({ connections, onSelect, onSave, onDelete, onReload }: ConnectionManagerProps) {
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleTest = async (config: ConnectionConfig): Promise<boolean> => {
    return api.testConnection(config);
  };

  const handleEdit = (connection: ConnectionConfig) => {
    setEditingConnection(connection);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingConnection(null);
    setShowForm(false);
  };

  const handleSave = async (config: ConnectionConfig) => {
    await onSave(config);
    handleCancel();
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Connection Manager</h1>
        <div className="flex gap-2">
          {onReload && (
            <button
              onClick={onReload}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Refresh
            </button>
          )}
          {!showForm && (
            <button
              onClick={() => { setEditingConnection(null); setShowForm(true); }}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Connection
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <ConnectionForm
          initialData={editingConnection || undefined}
          onSave={handleSave}
          onTest={handleTest}
          onCancel={handleCancel}
        />
      )}

      <h2 className="text-lg font-semibold mb-3">Saved Connections</h2>
      {connections.length === 0 ? (
        <p className="text-gray-500">No saved connections yet.</p>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onEdit={handleEdit}
              onDelete={onDelete}
              onConnect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
