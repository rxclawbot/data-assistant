import { TableMetadata } from "../lib/api";

interface TableDetailProps {
  metadata: TableMetadata | null;
}

export function TableDetail({ metadata }: TableDetailProps) {
  if (!metadata) {
    return (
      <div className="p-4 text-gray-500">
        Select a table to view its structure
      </div>
    );
  }

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
    <div className="p-4">
      <h3 className="font-semibold mb-4">
        Table: {metadata.table_name}
        {metadata.owner && <span className="text-gray-500"> ({metadata.owner})</span>}
      </h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 px-2">Column Name</th>
            <th className="py-2 px-2">Data Type</th>
            <th className="py-2 px-2">Nullable</th>
            <th className="py-2 px-2">Constraint</th>
            <th className="py-2 px-2">Default</th>
          </tr>
        </thead>
        <tbody>
          {metadata.columns.map((col, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="py-2 px-2 font-medium">{col.name}</td>
              <td className="py-2 px-2 text-gray-600">{col.data_type}</td>
              <td className="py-2 px-2">{col.nullable ? "Y" : "N"}</td>
              <td className="py-2 px-2">{getConstraintBadge(col.key_constraint)}</td>
              <td className="py-2 px-2 text-gray-400">
                {col.default_value || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}