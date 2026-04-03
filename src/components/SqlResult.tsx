import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../lib/api";

interface SqlResultProps {
  messages: ChatMessage[];
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

export function SqlResult({ messages }: SqlResultProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

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
      {messages.map((msg, i) =>
        msg.role === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="max-w-[80%] rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              {msg.content}
            </div>
          </div>
        ) : (
          <div key={i} className="flex flex-col gap-2">
            {msg.explanation && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2">
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{msg.explanation}</p>
              </div>
            )}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">SQL</span>
                <CopyButton text={msg.content} />
              </div>
              <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
                {msg.content}
              </pre>
            </div>
          </div>
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
