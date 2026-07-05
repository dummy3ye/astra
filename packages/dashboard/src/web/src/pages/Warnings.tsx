import { useEffect, useState } from 'react';
import { client } from '../api';
import { TableSkeleton } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButton from '../components/ExportButton';
import FilterBar from '../components/FilterBar';
import { useTableState } from '../hooks/useTableState';
import type { Warning } from '../types';

const PAGE_SIZE = 20;

const EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'userId', label: 'User ID' },
  { key: 'guildId', label: 'Guild ID' },
  { key: 'reason', label: 'Reason' },
  { key: 'userLevel', label: 'User Level' },
  { key: 'userXp', label: 'User XP' },
  { key: 'createdAt', label: 'Date' },
];

export default function Warnings() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { sortBy, sortOrder, page, search, filters, dateFrom, dateTo, setSortBy, setPage, setSearch, removeFilter, clearFilters, setDateFrom, setDateTo } =
    useTableState({ defaultSortBy: 'createdAt', defaultSortOrder: 'desc' });

  useEffect(() => {
    setLoading(true);
    const skip = String((page - 1) * PAGE_SIZE);
    client
      .getWarnings({
        query: {
          skip,
          take: String(PAGE_SIZE),
          q: search || undefined,
          sortBy: sortBy ?? undefined,
          sortOrder,
          startDate: dateFrom,
          endDate: dateTo,
        },
      })
      .then((res) => {
        if (res.status === 200) {
          setWarnings(res.body.items);
          setTotal(res.body.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, sortBy, sortOrder, dateFrom, dateTo]);

  const filtered = warnings.filter((w) => {
    for (const [field, value] of Object.entries(filters)) {
      const cell = String((w as Record<string, unknown>)[field] ?? '').toLowerCase();
      if (!cell.includes(value.toLowerCase())) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">Warnings</h1>
        <TableSkeleton rows={5} cols={7} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Warnings</h1>
      <FilterBar
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearFilters}
      >
        <input
          className="search-input"
          placeholder="Search by user ID, guild ID, or reason..."
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="date"
          className="date-range-input"
          value={dateFrom ?? ''}
          onChange={(e) => setDateFrom(e.target.value || undefined)}
          title="Start date"
        />
        <input
          type="date"
          className="date-range-input"
          value={dateTo ?? ''}
          onChange={(e) => setDateTo(e.target.value || undefined)}
          title="End date"
        />
        <ExportButton data={filtered} filename="warnings.csv" columns={EXPORT_COLUMNS} />
      </FilterBar>
      {filtered.length === 0 ? (
        <p className="page-empty">No warnings recorded.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
              <tr>
                <SortableHeader field="id" label="ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <th>User</th>
                <SortableHeader field="userId" label="User ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="guildId" label="Guild ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="reason" label="Reason" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="userLevel" label="User Level" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="userXp" label="User XP" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="createdAt" label="Date" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id}>
                  <td>{w.id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {w.userAvatar && (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${w.userId}/${w.userAvatar}.png`}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div>
                        <div className="text-sm leading-tight">{w.userDisplayName || w.userName || w.userId}</div>
                        {w.userName && w.userDisplayName && (
                          <div className="text-xs text-muted leading-tight">@{w.userName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-muted">{w.userId}</td>
                  <td className="font-mono text-xs text-muted">{w.guildId}</td>
                    <td className="max-w-[300px] truncate">{w.reason}</td>
                    <td>{w.userLevel}</td>
                    <td>{w.userXp.toLocaleString()}</td>
                    <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
