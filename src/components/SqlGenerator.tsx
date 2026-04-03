import { useState, KeyboardEvent } from "react";

interface SqlGeneratorProps {
  loading: boolean;
  onSend: (query: string) => void;
}

export function SqlGenerator({ loading, onSend }: SqlGeneratorProps) {
  const [query, setQuery] = useState("");

  const handleSend = () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setQuery("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Show all users who placed orders in the last 30 days (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!query.trim() || loading}
          className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 whitespace-nowrap"
        >
          {loading ? "Generating..." : "Generate SQL"}
        </button>
      </div>
    </div>
  );
}
