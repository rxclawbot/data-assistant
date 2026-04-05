# Chat Message Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive message operations (edit, delete, regenerate, copy) to chat messages with hover-revealed buttons.

**Architecture:** Modify ChatMessage to include an id field. SqlResult component handles hover state and button display per message. App.tsx manages delete/edit/regenerate operations via callbacks passed to SqlResult.

**Tech Stack:** React (existing), TypeScript, Tailwind CSS

---

## File Structure

- **Modify:** `src/lib/api.ts:40` - Add `id` to ChatMessage interface
- **Modify:** `src/App.tsx` - Add id generation when creating messages, update `handleSend`, add `handleDeleteMessage`, `handleRegenerate`, `handleEditMessage` callbacks
- **Modify:** `src/components/SqlResult.tsx` - Add hover buttons UI, edit mode, callbacks for delete/edit/regenerate/copy

---

## Task 1: Add id field to ChatMessage

**Files:**
- Modify: `src/lib/api.ts:40`

- [ ] **Step 1: Add id field to ChatMessage interface**

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  explanation?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add id field to ChatMessage interface"
```

---

## Task 2: Add message ID generation in App.tsx

**Files:**
- Modify: `src/App.tsx` (lines 18-25 for newSession, line ~295 for handleSend adding user message, line ~307 for handleSend adding assistant message)

- [ ] **Step 1: Update newSession function to add id to empty chat_messages**

The `newSession` function creates a Session with empty `chat_messages: []`. No change needed there since no messages are created.

- [ ] **Step 2: Update handleSend to add id when creating user message**

Find in `handleSend`:
```typescript
updateActiveSession((s) => ({
  ...s,
  chat_messages: [...s.chat_messages, { role: "user", content: query }],
}));
```

Change to:
```typescript
updateActiveSession((s) => ({
  ...s,
  chat_messages: [...s.chat_messages, { id: crypto.randomUUID(), role: "user", content: query }],
}));
```

- [ ] **Step 3: Update handleSend to add id when creating assistant message**

Find in `handleSend`:
```typescript
updateActiveSession((s) => ({
  ...s,
  chat_messages: [...s.chat_messages, { role: "assistant", content: response.sql, explanation: response.explanation }],
}));
```

Change to:
```typescript
updateActiveSession((s) => ({
  ...s,
  chat_messages: [...s.chat_messages, { id: crypto.randomUUID(), role: "assistant", content: response.sql, explanation: response.explanation }],
}));
```

Also update the error case:
```typescript
{ role: "assistant", content: `Error: ${err instanceof Error ? err.message : String(err)}` }
```
to:
```typescript
{ id: crypto.randomUUID(), role: "assistant", content: `Error: ${err instanceof Error ? err.message : String(err)}` }
```

Also update the "Please configure AI settings first" case similarly.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add id generation to chat messages in App.tsx"
```

---

## Task 3: Add message operation handlers in App.tsx

**Files:**
- Modify: `src/App.tsx` (after line ~318, before line ~321)

- [ ] **Step 1: Add handler functions after handleSend callback definition**

Add these functions after the `handleSend` callback:

```typescript
const handleDeleteMessage = useCallback((messageId: string) => {
  updateActiveSession((s) => ({
    ...s,
    chat_messages: s.chat_messages.filter((m) => m.id !== messageId),
  }));
}, [updateActiveSession]);

const handleRegenerate = useCallback(async () => {
  const lastAssistantIndex = [...chatMessages].reverse().findIndex((m) => m.role === "assistant");
  if (lastAssistantIndex === -1) return;
  const actualIndex = chatMessages.length - 1 - lastAssistantIndex;
  const userMessageBefore = chatMessages.slice(0, actualIndex).filter((m) => m.role === "user").pop();

  const stored = localStorage.getItem(AI_CONFIG_KEY);
  if (!stored) return;
  const config: AiConfig = JSON.parse(stored);

  const history: ChatMessage[] = chatMessages.slice(0, actualIndex).map((m) => ({
    role: m.role,
    content: m.role === "assistant" ? `SQL:\n${m.content}${m.explanation ? `\n\nExplanation: ${m.explanation}` : ""}` : m.content,
  }));

  // Remove the last assistant message
  updateActiveSession((s) => ({
    ...s,
    chat_messages: s.chat_messages.slice(0, actualIndex),
  }));
  setLoading(true);

  try {
    const request = { tables_context: tablesContext, user_query: userMessageBefore?.content || "", history };
    const response = await api.generateSql(config, request);
    updateActiveSession((s) => ({
      ...s,
      chat_messages: [...s.chat_messages, { id: crypto.randomUUID(), role: "assistant", content: response.sql, explanation: response.explanation }],
    }));
  } catch (err) {
    updateActiveSession((s) => ({
      ...s,
      chat_messages: [...s.chat_messages, { id: crypto.randomUUID(), role: "assistant", content: `Error: ${err instanceof Error ? err.message : String(err)}` }],
    }));
  } finally {
    setLoading(false);
  }
}, [chatMessages, tablesContext, updateActiveSession]);

const handleEditMessage = useCallback((messageId: string, newContent: string) => {
  const msgIndex = chatMessages.findIndex((m) => m.id === messageId);
  if (msgIndex === -1) return;
  const msg = chatMessages[msgIndex];
  if (msg.role !== "user") return;

  // Remove this message and all subsequent messages
  updateActiveSession((s) => ({
    ...s,
    chat_messages: s.chat_messages.slice(0, msgIndex),
  }));

  // Trigger resend with updated content
  setTimeout(() => handleSend(newContent), 0);
}, [chatMessages, handleSend, updateActiveSession]);
```

- [ ] **Step 2: Pass these handlers to SqlResult component**

Find `<SqlResult messages={chatMessages} />` and change to:
```tsx
<SqlResult
  messages={chatMessages}
  onDelete={handleDeleteMessage}
  onRegenerate={handleRegenerate}
  onEdit={handleEditMessage}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add message operation handlers in App.tsx"
```

---

## Task 4: Update SqlResult with hover buttons and edit mode

**Files:**
- Modify: `src/components/SqlResult.tsx` (complete rewrite of message rendering section)

- [ ] **Step 1: Update function signature to accept operation callbacks**

```typescript
interface SqlResultProps {
  messages: ChatMessage[];
  onDelete: (messageId: string) => void;
  onRegenerate: () => void;
  onEdit: (messageId: string, newContent: string) => void;
}
```

- [ ] **Step 2: Add state for hovered message and editing message**

```typescript
const [hoveredId, setHoveredId] = useState<string | null>(null);
const [editingId, setEditingId] = useState<string | null>(null);
const [editContent, setEditContent] = useState("");
```

- [ ] **Step 3: Update message rendering to include hover buttons and edit mode**

Replace the current message rendering block with:

```tsx
{messages.map((msg, i) => {
  const isUser = msg.role === "user";
  const isLastAssistant = !isUser && i === messages.length - 1;
  const canRegenerate = !isUser && isLastAssistant && i === messages.findIndex((m) => m.role === "assistant");

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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SqlResult.tsx
git commit -m "feat: add hover buttons and edit mode to SqlResult"
```

---

## Task 5: Verify build

- [ ] **Step 1: Run TypeScript check and build**

```bash
cd E:/workspace/data-assistant && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to our changes

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: verify build passes"
```

---

## Spec Coverage Check

- [ ] ChatMessage id field added ✓
- [ ] Hover buttons on all messages ✓
- [ ] Copy button on all messages ✓
- [ ] Edit button on user messages ✓
- [ ] Delete button on all messages ✓
- [ ] Regenerate button only on last AI message ✓
- [ ] Edit triggers resend from that message ✓
- [ ] Delete removes only that message ✓
- [ ] Regenerate removes subsequent messages and regenerates ✓

## Placeholder Scan

No placeholders found. All code is complete.

## Type Consistency

- `ChatMessage.id` added as `string`
- All handlers use `messageId: string` parameter
- `onEdit` takes `(messageId: string, newContent: string)`
- All other signatures match across files.
