import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../lib/api";

interface SqlResultProps {
  messages: ChatMessage[];
  onDelete: (messageId: string) => void;
  onRegenerate: () => void;
  onEdit: (messageId: string, newContent: string) => void;
}

export function SqlResult({ messages, onDelete, onRegenerate, onEdit }: SqlResultProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Enter a query below to generate SQL
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
      {messages.map((msg, i) => {
        const isUser = msg.role === "user";
        const isLastAssistant = !isUser && i === messages.length - 1;

        return isUser ? (
          <div
            key={msg.id}
            className="flex flex-col items-end gap-1"
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              {editingId === msg.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white text-black rounded px-2 py-1 text-sm resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { onEdit(msg.id, editContent); setEditingId(null); }}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
            {hoveredId === msg.id && editingId !== msg.id && (
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                  className="p-1 bg-white rounded shadow text-gray-600 hover:bg-gray-100 text-xs"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1 bg-white rounded shadow text-gray-600 hover:bg-gray-100 text-xs"
                  title="Delete"
                >
                  🗑️
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="p-1 bg-white rounded shadow text-gray-600 hover:bg-gray-100 text-xs"
                  title="Copy"
                >
                  📋
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            key={msg.id}
            className="flex flex-col items-start gap-1"
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {msg.explanation && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2">
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{msg.explanation}</p>
              </div>
            )}
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">SQL</span>
                {hoveredId === msg.id && (
                  <div className="flex gap-1">
                    {isLastAssistant && (
                      <button
                        onClick={onRegenerate}
                        className="p-1 bg-gray-100 rounded shadow text-gray-600 hover:bg-gray-200 text-xs"
                        title="Regenerate"
                      >
                        🔄
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(msg.id)}
                      className="p-1 bg-gray-100 rounded shadow text-gray-600 hover:bg-gray-200 text-xs"
                      title="Delete"
                    >
                      🗑️
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="p-1 bg-gray-100 rounded shadow text-gray-600 hover:bg-gray-200 text-xs"
                      title="Copy"
                    >
                      📋
                    </button>
                  </div>
                )}
              </div>
              <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
                {msg.content}
              </pre>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
