import { useCallback } from 'react';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
}

export default function ExportButton({
  data,
  filename,
  columns,
}: ExportButtonProps) {
  const handleExport = useCallback(() => {
    const header = columns.map((c) => `"${c.label}"`).join(',');
    const rows = data.map((row) =>
      columns.map((c) => `"${String(row[c.key] ?? '')}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, filename, columns]);

  return (
    <button
      className="export-btn"
      onClick={handleExport}
      disabled={data.length === 0}
    >
      Export CSV
    </button>
  );
}
