import { useEffect, useMemo, useState } from 'react';
import { client } from '../api';
import { TableSkeleton } from '../components/Skeleton';
import SortableHeader from '../components/SortableHeader';
import ExportButton from '../components/ExportButton';
import FilterBar from '../components/FilterBar';
import { useTableState } from '../hooks/useTableState';
import type { Server } from '../types';

const EXPORT_COLUMNS = [
  { key: 'guildId', label: 'Guild ID' },
  { key: 'name', label: 'Name' },
  { key: 'memberCount', label: 'Members' },
  { key: 'warningCount', label: 'Warnings' },
  { key: 'blockLinks', label: 'Link Block' },
  { key: 'blockedWords', label: 'Blocked Words' },
  { key: 'warnTimeoutThreshold', label: 'Timeout At' },
  { key: 'warnBanThreshold', label: 'Ban At' },
  { key: 'levelRoles', label: 'Level Roles' },
];

const SORTABLE_COLUMNS: Record<string, (s: Server) => string | number | boolean | null | undefined> = {
  guildId: (s) => s.guildId,
  name: (s) => s.name ?? s.guildId,
  memberCount: (s) => s.memberCount,
  warningCount: (s) => s.warningCount,
  blockLinks: (s) => s.blockLinks,
  blockedWords: (s) => s.blockedWords ?? '',
  warnTimeoutThreshold: (s) => s.warnTimeoutThreshold ?? -1,
  warnBanThreshold: (s) => s.warnBanThreshold ?? -1,
  levelRoles: (s) => s.levelRoles,
};

export default function Servers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const { sortBy, sortOrder, search, filters, setSortBy, setSearch, removeFilter, clearFilters } =
    useTableState({ defaultSortBy: 'name' });

  useEffect(() => {
    client
      .getServers({ query: { sortBy: sortBy ?? undefined, sortOrder } })
      .then((res) => { if (res.status === 200) setServers(res.body); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...servers];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.guildId.toLowerCase().includes(q) ||
          (s.name ?? '').toLowerCase().includes(q),
      );
    }

    for (const [field, value] of Object.entries(filters)) {
      const v = value.toLowerCase();
      result = result.filter((s) => {
        const cell = SORTABLE_COLUMNS[field]?.(s);
        return String(cell ?? '').toLowerCase().includes(v);
      });
    }

    if (sortBy && SORTABLE_COLUMNS[sortBy]) {
      const accessor = SORTABLE_COLUMNS[sortBy];
      result.sort((a, b) => {
        const av = accessor(a) ?? '';
        const bv = accessor(b) ?? '';
        const cmp = typeof av === 'string'
          ? (av as string).localeCompare(String(bv))
          : Number(av) - Number(bv);
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [servers, sortBy, sortOrder, search, filters]);

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">Servers</h1>
        <TableSkeleton rows={5} cols={8} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Servers</h1>
      <FilterBar
        filters={filters}
        onRemoveFilter={removeFilter}
        onClearAll={clearFilters}
      >
        <input
          className="search-input"
          placeholder="Search by name or guild ID..."
          defaultValue={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ExportButton data={filtered} filename="servers.csv" columns={EXPORT_COLUMNS} />
      </FilterBar>
      {filtered.length === 0 ? (
        <p className="page-empty">No servers found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader field="name" label="Server" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="guildId" label="Guild ID" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="memberCount" label="Members" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="warningCount" label="Warnings" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="blockLinks" label="Link Block" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="blockedWords" label="Blocked Words" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="warnTimeoutThreshold" label="Timeout At" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="warnBanThreshold" label="Ban At" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
                <SortableHeader field="levelRoles" label="Level Roles" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={setSortBy} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.guildId}>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.icon && (
                        <img
                          src={`https://cdn.discordapp.com/icons/${s.guildId}/${s.icon}.png`}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span>{s.name || s.guildId}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-muted">{s.guildId}</td>
                  <td>{s.memberCount}</td>
                  <td>{s.warningCount}</td>
                  <td>
                    <span
                      className={`badge ${s.blockLinks ? 'badge-active' : 'badge-inactive'}`}
                    >
                      {s.blockLinks ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate">
                    {s.blockedWords || '-'}
                  </td>
                  <td>{s.warnTimeoutThreshold ?? '-'}</td>
                  <td>{s.warnBanThreshold ?? '-'}</td>
                  <td>{s.levelRoles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
