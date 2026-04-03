import { useState, useRef, useEffect } from "react";
import { Session } from "../lib/api";

interface SessionListProps {
  sessions: Session[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function SessionList({ sessions, activeId, onSelect, onNew, onRename, onDelete }: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

  const handleDoubleClick = (session: Session) => {
    setEditingId(session.id);
    setEditName(session.name);
  };

  const handleContextMenu = (e: React.MouseEvent, session: Session) => {
    e.preventDefault();
    setContextMenu({ id: session.id, x: e.clientX, y: e.clientY });
  };

  const handleRenameFinish = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-gray-500">Sessions</span>
        <button
          onClick={onNew}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="新建 Session"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            onDoubleClick={() => handleDoubleClick(s)}
            onContextMenu={(e) => handleContextMenu(e, s)}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm ${
              s.id === activeId ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            {editingId === s.id ? (
              <input
                className="flex-1 px-1 py-0.5 text-sm border rounded"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameFinish}
                onKeyDown={(e) => e.key === "Enter" && handleRenameFinish()}
                autoFocus
              />
            ) : (
              <>
                <span className="flex-1 truncate">{s.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.id);
                    }}
                    className="text-gray-300 hover:text-red-500 text-xs leading-none"
                    title="删除"
                  >
                    ×
                  </button>
              </>
            )}
          </div>
        ))}
      </div>
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border rounded shadow-md py-1 text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full text-left px-4 py-1.5 hover:bg-gray-100 whitespace-nowrap"
            onClick={() => {
              const session = sessions.find((s) => s.id === contextMenu.id);
              if (session) handleDoubleClick(session);
              setContextMenu(null);
            }}
          >
            重命名
          </button>
        </div>
      )}
    </div>
  );
}
