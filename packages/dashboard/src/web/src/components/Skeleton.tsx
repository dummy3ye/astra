import { useEffect, useState } from 'react';

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="skeleton"
      style={{ width, height: 14, borderRadius: 4 }}
    />
  );
}

export function SkeletonBlock({ width = '100%', height = 40 }: { width?: string; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 8 }}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="stat-card">
      <SkeletonLine width="60%" />
      <div style={{ height: 8 }} />
      <SkeletonBlock width="40%" height={32} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrapper">
      <table className="data-table skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <SkeletonLine width="60%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <SkeletonLine width={`${40 + Math.random() * 40}%`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="chart-container">
      <SkeletonLine width="40%" />
      <div style={{ height: 16 }} />
      <SkeletonBlock height={220} />
    </div>
  );
}

export function useDelayedLoading(delay = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return showSkeleton;
}
