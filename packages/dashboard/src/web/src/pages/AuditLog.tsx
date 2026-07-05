import { useEffect, useState } from 'react';
import { client } from '../api';
import { TableSkeleton } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import SortableHeader from '../components/SortableHeader';
import ExportButton from '../components/ExportButton';
import FilterBar from '../components/FilterBar';
import { useTableState } from '../hooks/useTableState';
import { AuditActions } from '@astra/shared';
import type { AuditEntry } from '../types';

const PAGE_SIZE = 20;

const ACTION_OPTIONS = Object.values(AuditActions);

const EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'guildId', label: 'Guild ID' },
  { key: 'action', label: 'Action' },
  { key: 'targetId', label: 'Target ID' },
  { key: 'targetName', label: 'Target Name' },
  { key: 'moderatorId', label: 'Moderator ID' },
  { key: 'moderatorName', label: 'Moderator Name' },
  { key: 'reason', label: 'Reason' },
  { key: 'createdAt', label: 'Date' },
];

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { sortBy, sortOrder, page, search, filters, dateFrom, dateTo, setSortBy, setPage, setSearch, setFilter, removeFilter, clearFilters, setDateFrom, setDateTo } =
    useTableState({ defaultSortBy: 'createdAt', defaultSortOrder: 'desc' });

  const actionFilter = filters['action'] ?? '';

  useEffect(() => {
    setLoading(true);
    const skip = String((page - 1) * PAGE_SIZE);
    client
      .getAuditLog({
        query: {
          skip,
          take: String(PAGE_SIZE),
          q: search || undefined,
          sortBy: sortBy ?? undefined,
          sortOrder,
          startDate: dateFrom,
          endDate: dateTo,
          action: actionFilter || undefined,
        },
      })
      .then((res) => {
        if (res.status === 200) {
          setLogs(res.body.items);
          setTotal(res.body.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, sortBy, sortOrder, dateFrom, dateTo, actionFilter]);

  const filtered = logs.filter((l) => {
    for (const [field, value] of Object.entries(filters)) {
      if (field === 'action') continue;
      const cell = String((l as Record<string, unknown>)[field] ?? '').toLowerCase();
      if (!cell.includes(value.toLowerCase())) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">Audit Log</h1>
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Audit Log</h1>
      <FilterBar
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearFilters}
      >
        <input
          className="search-input"
          placeholder="Search by target ID, action, or guild ID..."
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="search-input"
          style={{ maxWidth: '160px' }}
          value={actionFilter}
          onChange={(e) => setFilter('action', e.target.value)}
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
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
        <ExportButton data={filtered} filename="audit-log.csv" columns={EXPORT_COLUMNS} />
      </FilterBar>
      {filtered.length === 0 ? (
        <p className="page-empty">No audit entries found.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
              <tr>
                <SortableHeader field="id" label="ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="guildId" label="Guild ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="action" label="Action" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="targetName" label="Target" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="moderatorName" label="Moderator" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="reason" label="Reason" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="createdAt" label="Date" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td className="font-mono text-xs text-muted">{l.guildId}</td>
                  <td>
                    <span
                      className={`badge ${l.action === 'ban' ? 'badge-danger' : 'badge-info'}`}
                    >
                      {l.action}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div className="text-sm leading-tight">{l.targetName || l.targetId}</div>
                      {l.targetName && (
                        <div className="text-xs text-muted leading-tight">{l.targetId}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="text-sm leading-tight">{l.moderatorName || l.moderatorId || '-'}</div>
                      {l.moderatorName && l.moderatorId && (
                        <div className="text-xs text-muted leading-tight">{l.moderatorId}</div>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[300px] truncate">{l.reason || '-'}</td>
                  <td>{new Date(l.createdAt).toLocaleDateString()}</td>
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
