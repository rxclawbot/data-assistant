import { useState } from "react";
import { AiConfig, SqlGenerationRequest, api } from "../lib/api";

interface SqlGeneratorProps {
  tablesContext: string;
  onGeneratedSql: (sql: string) => void;
}

const STORAGE_KEY = "data-assistant-ai-config";

function loadConfig(): AiConfig | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function SqlGenerator({ tablesContext, onGeneratedSql }: SqlGeneratorProps) {
  const [query, setQuery] = useState("");
  const [generatedSql, setGeneratedSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isDisabled = !query.trim() || !tablesContext.trim();

  const handleGenerate = async () => {
    const config = loadConfig();
    if (!config) {
      setError("Please configure AI settings first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const request: SqlGenerationRequest = {
        tables_context: tablesContext,
        user_query: query,
      };
      const response = await api.generateSql(config, request);
      setGeneratedSql(response.sql);
      onGeneratedSql(response.sql);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Natural Language Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Show all users who placed orders in the last 30 days"
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isDisabled || loading}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {loading ? "Generating..." : "Generate SQL"}
      </button>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {generatedSql && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Generated SQL
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? (
                <>
                  <svg
                    className="h-3 w-3 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
            {generatedSql}
          </pre>
        </div>
      )}
    </div>
  );
}
