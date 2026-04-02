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

  useEffect(() => { loadConnections(); }, []);

  const saveConnection = async (config: ConnectionConfig) => {
    await api.saveConnection(config);
    await loadConnections();
  };

  const deleteConnection = async (id: string) => {
    await api.deleteConnection(id);
    await loadConnections();
  };

  return { connections, loading, error, saveConnection, deleteConnection, reload: loadConnections };
}
