import { useState } from "react";
import { TableMetadata } from "../lib/api";

interface TableDetailProps {
  tables: { tableName: string; metadata: TableMetadata }[];
  activeTable: string | null;
  onSelect: (tableName: string) => void;
  onClose: (tableName: string) => void;
  remarks: Record<string, string>;
  onRemarkChange: (key: string, value: string) => void;
}

export function TableDetail({ tables, activeTable, onSelect, onClose, remarks, onRemarkChange }: TableDetailProps) {
  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Click a table name to view its structure
      </div>
    );
  }

  const active = tables.find((t) => t.tableName === activeTable) || tables[0];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b bg-gray-50 overflow-x-auto">
        {tables.map(({ tableName }) => (
          <div
            key={tableName}
            className={`flex items-center gap-1 px-3 py-2 text-sm border-r cursor-pointer whitespace-nowrap ${
              active.tableName === tableName
                ? "bg-white border-b-2 border-b-blue-500 text-blue-600 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => onSelect(tableName)}
          >
            <span>{tableName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tableName);
              }}
              className="text-gray-400 hover:text-red-500 ml-1"
              title="Close"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <ColumnTable
          metadata={active.metadata}
          tableKeyPrefix={`${active.metadata.owner ? active.metadata.owner + "." : ""}${active.metadata.table_name}`}
          remarks={remarks}
          onRemarkChange={onRemarkChange}
        />
      </div>
    </div>
  );
}

type RemarkMode = "logic-delete" | "dict" | "custom";

interface RemarkPopoverProps {
  remarkKey: string;
  currentValue: string;
  onSave: (key: string, value: string) => void;
  onClose: () => void;
}

function RemarkPopover({ remarkKey, currentValue, onSave, onClose }: RemarkPopoverProps) {
  // Determine initial mode from existing value
  const detectMode = (): RemarkMode => {
    if (currentValue.startsWith("逻辑删除：")) return "logic-delete";
    if (currentValue.startsWith("状态字典：")) return "dict";
    if (currentValue) return "custom";
    return "logic-delete";
  };

  const [mode, setMode] = useState<RemarkMode>(detectMode);

  // Parse existing logic delete value: "逻辑删除：0=有效，1=删除"
  const parseLogicDelete = () => {
    const match = currentValue.match(/^逻辑删除：(.+)$/);
    if (!match) return [{ value: "0", meaning: "有效" }, { value: "1", meaning: "删除" }];
    return match[1].split("，").map((s) => {
      const [v, m] = s.split("=");
      return { value: v || "", meaning: m || "" };
    });
  };

  // Parse existing dict value: "状态字典：1=待审核，2=已通过"
  const parseDict = () => {
    const match = currentValue.match(/^状态字典：(.+)$/);
    if (!match) return [{ key: "", value: "" }];
    const pairs = match[1].split("，").map((s) => {
      const [k, v] = s.split("=");
      return { key: k || "", value: v || "" };
    });
    return pairs.length > 0 ? pairs : [{ key: "", value: "" }];
  };

  const [logicDeletePairs, setLogicDeletePairs] = useState(parseLogicDelete);
  const [dictPairs, setDictPairs] = useState(parseDict);
  const [customText, setCustomText] = useState(currentValue);

  const handleSave = () => {
    let remark = "";
    if (mode === "logic-delete") {
      const parts = logicDeletePairs
        .filter((p) => p.value && p.meaning)
        .map((p) => `${p.value}=${p.meaning}`);
      if (parts.length) remark = `逻辑删除：${parts.join("，")}`;
    } else if (mode === "dict") {
      const parts = dictPairs
        .filter((p) => p.key && p.value)
        .map((p) => `${p.key}=${p.value}`);
      if (parts.length) remark = `状态字典：${parts.join("，")}`;
    } else {
      remark = customText.trim();
    }
    onSave(remarkKey, remark);
    onClose();
  };

  const handleDelete = () => {
    onSave(remarkKey, "");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-4 w-96"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Mode tabs */}
      <div className="flex gap-1 mb-3 border-b pb-2">
        {[
          { id: "logic-delete" as RemarkMode, label: "逻辑删除" },
          { id: "dict" as RemarkMode, label: "字典" },
          { id: "custom" as RemarkMode, label: "自定义" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`px-2 py-1 text-xs rounded ${
              mode === tab.id
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logic delete mode */}
      {mode === "logic-delete" && (
        <div className="space-y-1.5">
          {logicDeletePairs.map((pair, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={pair.value}
                onChange={(e) => {
                  const next = [...logicDeletePairs];
                  next[i] = { ...next[i], value: e.target.value };
                  setLogicDeletePairs(next);
                }}
                placeholder="值"
                className="w-16 border rounded px-2 py-1 text-xs"
              />
              <span className="text-gray-400 text-xs">=</span>
              <input
                type="text"
                value={pair.meaning}
                onChange={(e) => {
                  const next = [...logicDeletePairs];
                  next[i] = { ...next[i], meaning: e.target.value };
                  setLogicDeletePairs(next);
                }}
                placeholder="含义"
                className="flex-1 border rounded px-2 py-1 text-xs"
              />
              {logicDeletePairs.length > 1 && (
                <button
                  onClick={() => setLogicDeletePairs(logicDeletePairs.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setLogicDeletePairs([...logicDeletePairs, { value: "", meaning: "" }])}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            + 添加值
          </button>
        </div>
      )}

      {/* Dict mode */}
      {mode === "dict" && (
        <div className="space-y-1.5">
          {dictPairs.map((pair, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={pair.key}
                onChange={(e) => {
                  const next = [...dictPairs];
                  next[i] = { ...next[i], key: e.target.value };
                  setDictPairs(next);
                }}
                placeholder="键"
                className="w-16 border rounded px-2 py-1 text-xs"
              />
              <span className="text-gray-400 text-xs">=</span>
              <input
                type="text"
                value={pair.value}
                onChange={(e) => {
                  const next = [...dictPairs];
                  next[i] = { ...next[i], value: e.target.value };
                  setDictPairs(next);
                }}
                placeholder="值"
                className="flex-1 border rounded px-2 py-1 text-xs"
              />
              {dictPairs.length > 1 && (
                <button
                  onClick={() => setDictPairs(dictPairs.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setDictPairs([...dictPairs, { key: "", value: "" }])}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            + 添加键值对
          </button>
        </div>
      )}

      {/* Custom mode */}
      {mode === "custom" && (
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="输入备注说明"
          rows={3}
          className="w-full border rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      {/* Actions */}
      <div className="flex justify-between mt-3 pt-2 border-t">
        <button
          onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-700"
        >
          删除备注
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function ColumnTable({
  metadata,
  tableKeyPrefix,
  remarks,
  onRemarkChange,
}: {
  metadata: TableMetadata;
  tableKeyPrefix: string;
  remarks: Record<string, string>;
  onRemarkChange: (key: string, value: string) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const getConstraintBadge = (constraint: string | undefined) => {
    if (!constraint) return null;
    const colors: Record<string, string> = {
      PK: "bg-yellow-500 text-white",
      FK: "bg-blue-500 text-white",
      UK: "bg-green-500 text-white",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[constraint] || ""}`}>
        {constraint}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="px-3 py-2 text-xs text-gray-500 border-b">
        {metadata.owner && <span>{metadata.owner}.</span>}
        <span className="font-medium text-gray-700">{metadata.table_name}</span>
        <span className="ml-2">{metadata.columns.length} columns</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b bg-gray-50">
            <th className="py-1.5 px-3 whitespace-nowrap">Column</th>
            <th className="py-1.5 px-3 whitespace-nowrap">Type</th>
            <th className="py-1.5 px-3 whitespace-nowrap">Null</th>
            <th className="py-1.5 px-3 whitespace-nowrap">Key</th>
            <th className="py-1.5 px-3 whitespace-nowrap">Default</th>
            <th className="py-1.5 px-3 whitespace-nowrap">Remark</th>
          </tr>
        </thead>
        <tbody>
          {metadata.columns.map((col, idx) => {
            const remarkKey = `${tableKeyPrefix}.${col.name}`;
            const remark = remarks[remarkKey] || "";
            const isEditing = editingKey === remarkKey;

            return (
              <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="py-1.5 px-3 font-medium whitespace-nowrap">{col.name}</td>
                <td className="py-1.5 px-3 text-gray-600 whitespace-nowrap">{col.data_type}</td>
                <td className="py-1.5 px-3">{col.nullable ? "Y" : "N"}</td>
                <td className="py-1.5 px-3">{getConstraintBadge(col.key_constraint)}</td>
                <td className="py-1.5 px-3 text-gray-400 whitespace-nowrap">{col.default_value || "-"}</td>
                <td className="py-1.5 px-3 min-w-[120px] relative">
                  <span
                    onClick={() => setEditingKey(isEditing ? null : remarkKey)}
                    className="cursor-pointer text-xs block min-h-[1.25rem]"
                    title="Click to edit remark"
                  >
                    {remark ? (
                      <span className="text-gray-600">{remark}</span>
                    ) : (
                      <span className="text-gray-400 hover:text-gray-600">+ add</span>
                    )}
                  </span>
                  {isEditing && (
                    <RemarkPopover
                      remarkKey={remarkKey}
                      currentValue={remark}
                      onSave={onRemarkChange}
                      onClose={() => setEditingKey(null)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
