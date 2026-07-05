import { useEffect, useState } from 'react';
import StatsCard from '../components/StatsCard';
import AuditChart from '../components/AuditChart';
import WarningsChart from '../components/WarningsChart';
import { StatsCardSkeleton, ChartSkeleton } from '../components/Skeleton';
import { client } from '../api';
import type { Stats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .getStats()
      .then((res) => {
        if (res.status === 200) setStats(res.body);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">Overview</h1>
        <div className="stats-grid">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <div className="charts-row">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="page-error">Failed to load dashboard data.</div>;
  }

  return (
    <div className="page">
      <h1 className="page-title">Overview</h1>

      <div className="stats-grid">
        <StatsCard label="Total Users" value={stats.totalUsers} />
        <StatsCard label="Servers" value={stats.totalServers} />
        <StatsCard label="Warnings" value={stats.totalWarnings} />
        <StatsCard label="Bans" value={stats.totalBans} />
      </div>

      <div className="charts-row">
        {stats.auditActionBreakdown.length > 0 && (
          <AuditChart breakdown={stats.auditActionBreakdown} />
        )}
        {stats.warningsByDay.length > 0 && (
          <WarningsChart data={stats.warningsByDay} />
        )}
      </div>

      {stats.recentWarnings.length > 0 && (
        <section className="section">
          <h2 className="section-title">Recent Warnings</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentWarnings.map((w) => (
                  <tr key={w.id}>
                    <td className="font-mono text-xs">{w.userId}</td>
                    <td>{w.reason}</td>
                    <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
