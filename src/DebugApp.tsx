import { useState, useEffect, useRef } from "react";
import { DebugLog } from "./lib/api";

export default function DebugApp() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel("debug-console");
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === "log") {
        setLogs((prev) => [...prev, payload]);
      } else if (type === "clear") {
        setLogs([]);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <h1 className="text-sm font-semibold">Debug Console</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{logs.length} entries</span>
          <button
            onClick={() => {
              const channel = new BroadcastChannel("debug-console");
              channel.postMessage({ type: "clear" });
              channel.close();
              setLogs([]);
            }}
            className="text-xs text-gray-400 hover:text-red-400"
          >
            Clear
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            Waiting for debug logs...
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="border border-gray-700 rounded">
                <div className="flex items-center gap-2 px-2 py-1 bg-gray-800">
                  <span className="text-gray-500">{log.time}</span>
                  <span className="text-yellow-400 font-medium">{log.action}</span>
                </div>
                <pre className="px-2 py-1 overflow-x-auto whitespace-pre-wrap break-all text-green-300">
                  {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                </pre>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
