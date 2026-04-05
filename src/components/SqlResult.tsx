import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../lib/api";

interface SqlResultProps {
  messages: ChatMessage[];
  onDelete: (messageId: string) => void;
  onRegenerate: () => void;
  onEdit: (messageId: string, newContent: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
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
            className="flex justify-end"
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => { setHoveredId(null); }}
          >
            <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white relative">
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
                      onClick={() => { setEditingId(null); }}
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
              {hoveredId === msg.id && editingId !== msg.id && (
                <div className="flex gap-1 absolute bottom-full right-0 mb-1">
                  <button
                    onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                    className="p-1 bg-white rounded shadow text-gray-600 hover:bg-gray-100"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(msg.id)}
                    className="p-1 bg-white rounded shadow text-gray-600 hover:bg-gray-100"
                    title="Delete"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="p-1 bg-white rounded shadow text-gray-600 hover:bg-gray-100"
                    title="Copy"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            key={msg.id}
            className="flex flex-col gap-2"
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {msg.explanation && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2">
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{msg.explanation}</p>
              </div>
            )}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">SQL</span>
                <div className="flex gap-1">
                  {hoveredId === msg.id && (
                    <>
                      {isLastAssistant && (
                        <button
                          onClick={onRegenerate}
                          className="p-1 bg-gray-100 rounded shadow text-gray-600 hover:bg-gray-200"
                          title="Regenerate"
                        >
                          🔄
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(msg.id)}
                        className="p-1 bg-gray-100 rounded shadow text-gray-600 hover:bg-gray-200"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="p-1 bg-gray-100 rounded shadow text-gray-600 hover:bg-gray-200"
                    title="Copy"
                  >
                    📋
                  </button>
                </div>
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
