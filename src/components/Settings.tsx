import { useState, useEffect } from "react";
import { AiConfig } from "../lib/api";

interface SettingsProps {
  onClose: () => void;
}

const BASE_URLS = [
  { label: "DeepSeek", value: "https://api.deepseek.com" },
  { label: "MiniMax", value: "https://api.minimax.chat" },
  { label: "GLM", value: "https://open.bigmodel.cn" },
  { label: "OpenAI", value: "https://api.openai.com" },
  { label: "Custom", value: "" },
];

const STORAGE_KEY = "data-assistant-ai-config";

const defaultConfig: AiConfig = {
  base_url: "https://api.deepseek.com",
  api_key: "",
  model: "deepseek-chat",
};

export function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<AiConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultConfig;
      }
    }
    return defaultConfig;
  });

  const [selectedBaseUrl, setSelectedBaseUrl] = useState(() => {
    const match = BASE_URLS.find((b) => b.value === config.base_url);
    return match ? config.base_url : "Custom";
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleBaseUrlChange = (value: string) => {
    setSelectedBaseUrl(value);
    if (value !== "Custom") {
      setConfig((c) => ({ ...c, base_url: value }));
    }
  };

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!config.api_key.trim()) {
      setError("API key is required");
      return;
    }
    if (!config.base_url.trim()) {
      setError("Base URL is required");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">AI Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Base URL
            </label>
            <select
              value={selectedBaseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {BASE_URLS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            {selectedBaseUrl === "Custom" && (
              <input
                type="text"
                value={config.base_url}
                onChange={(e) => {
                  setConfig((c) => ({ ...c, base_url: e.target.value }));
                  setError("");
                }}
                placeholder="https://api.example.com"
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => {
                setConfig((c) => ({ ...c, api_key: e.target.value }));
                setError("");
              }}
              placeholder="Enter your API key"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Model
            </label>
            <input
              type="text"
              value={config.model}
              onChange={(e) =>
                setConfig((c) => ({ ...c, model: e.target.value }))
              }
              placeholder="deepseek-chat"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveSuccess}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-green-600"
          >
            {saveSuccess ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
