import { useEffect, useState } from 'react';
import { client } from '../api';
import { TableSkeleton } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButton from '../components/ExportButton';
import FilterBar from '../components/FilterBar';
import { useTableState } from '../hooks/useTableState';
import type { User } from '../types';

const PAGE_SIZE = 20;

const EXPORT_COLUMNS = [
  { key: 'id', label: 'User ID' },
  { key: 'guildId', label: 'Guild ID' },
  { key: 'displayName', label: 'Display Name' },
  { key: 'username', label: 'Username' },
  { key: 'level', label: 'Level' },
  { key: 'xp', label: 'XP' },
  { key: 'warnings', label: 'Warnings' },
];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { sortBy, sortOrder, page, search, filters, setSortBy, setPage, setSearch, removeFilter, clearFilters } =
    useTableState({ defaultSortBy: 'xp', defaultSortOrder: 'desc' });

  useEffect(() => {
    setLoading(true);
    const skip = String((page - 1) * PAGE_SIZE);
    client
      .getUsers({ query: { skip, take: String(PAGE_SIZE), q: search || undefined, sortBy: sortBy ?? undefined, sortOrder } })
      .then((res) => {
        if (res.status === 200) {
          setUsers(res.body.items);
          setTotal(res.body.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, sortBy, sortOrder]);

  const filtered = users.filter((u) => {
    for (const [field, value] of Object.entries(filters)) {
      const cell = String((u as Record<string, unknown>)[field] ?? '').toLowerCase();
      if (!cell.includes(value.toLowerCase())) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">Users</h1>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Users</h1>
      <FilterBar
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearFilters}
      >
        <input
          className="search-input"
          placeholder="Search by user ID or guild ID..."
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ExportButton data={filtered} filename="users.csv" columns={EXPORT_COLUMNS} />
      </FilterBar>
      {filtered.length === 0 ? (
        <p className="page-empty">No users found.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
              <tr>
                <th>User</th>
                <SortableHeader field="id" label="User ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="guildId" label="Guild ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="level" label="Level" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="xp" label="XP" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={`${u.id}-${u.guildId}`}>
                  <td>
                    <div className="flex items-center gap-2">
                      {u.avatar && (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div>
                        <div className="text-sm leading-tight">{u.displayName || u.username || u.id}</div>
                        {u.username && u.displayName && (
                          <div className="text-xs text-muted leading-tight">@{u.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-muted">{u.id}</td>
                  <td className="font-mono text-xs text-muted">{u.guildId}</td>
                    <td>{u.level}</td>
                    <td>{u.xp.toLocaleString()}</td>
                    <td>{u.warnings}</td>
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
