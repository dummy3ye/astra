import type { ReactNode } from 'react';

interface FilterBarProps {
  filters: Record<string, string>;
  onRemoveFilter: (field: string) => void;
  onClearAll: () => void;
  children?: ReactNode;
}

export default function FilterBar({ filters, onRemoveFilter, onClearAll, children }: FilterBarProps) {
  const entries = Object.entries(filters);

  return (
    <div className="toolbar">
      {children}
      {entries.length > 0 && (
        <div className="filter-bar">
          {entries.map(([field, value]) => (
            <span key={field} className="filter-chip">
              {field}: {value}
              <span className="filter-chip-remove" onClick={() => onRemoveFilter(field)}>
                ×
              </span>
            </span>
          ))}
          <span className="filter-clear-all" onClick={onClearAll}>
            Clear all
          </span>
        </div>
      )}
    </div>
  );
}
