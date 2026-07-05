interface SortableHeaderProps {
  field: string;
  label: string;
  currentSortBy?: string;
  currentSortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export default function SortableHeader({
  field,
  label,
  currentSortBy,
  currentSortOrder,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSortBy === field;
  const arrow =
    isActive && currentSortOrder === 'asc' ? ' ▲' :
    isActive && currentSortOrder === 'desc' ? ' ▼' :
    '';

  return (
    <th
      className={`sort-header${isActive ? ` sort-${currentSortOrder}` : ''}`}
      onClick={() => onSort(field)}
    >
      {label}{arrow}
    </th>
  );
}
