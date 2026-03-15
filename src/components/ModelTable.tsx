'use client';

interface ModelTableProps {
  data: Record<string, unknown>[];
  columns: { key: string; label: string; render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }[];
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
}

export default function ModelTable({ data, columns, onEdit, onDelete }: ModelTableProps) {
  const hasActions = onEdit || onDelete;

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">No models found</p>
      </div>
    );
  }

  const getValue = (obj: Record<string, unknown>, key: string): unknown => {
    return key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-secondary border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
            {hasActions && (
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-surface-hover transition-colors duration-150">
              <td className="px-4 py-3 text-text-muted font-mono text-xs">{index + 1}</td>
              {columns.map((col) => {
                const value = getValue(row, col.key);
                return (
                  <td key={col.key} className="px-4 py-3 text-text-primary">
                    {col.render ? col.render(value, row) : renderValue(value)}
                  </td>
                );
              })}
              {hasActions && (
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(index)}
                        className="text-text-muted hover:text-primary-600 transition-colors duration-200
                                   cursor-pointer p-1 rounded hover:bg-primary-50"
                        title="Edit model"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(index)}
                        className="text-text-muted hover:text-error transition-colors duration-200
                                   cursor-pointer p-1 rounded hover:bg-red-50"
                        title="Delete model"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-text-muted italic">null</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (typeof value === 'number') {
    return <span className="font-mono text-xs">{value.toLocaleString()}</span>;
  }
  if (typeof value === 'object') {
    return <span className="text-text-muted text-xs font-mono">{JSON.stringify(value).substring(0, 60)}…</span>;
  }
  const str = String(value);
  if (str.length > 60) {
    return <span title={str}>{str.substring(0, 57)}…</span>;
  }
  return str;
}
