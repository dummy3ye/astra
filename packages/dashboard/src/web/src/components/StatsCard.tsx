interface Props {
  label: string;
  value: number | string;
  sub?: string;
}

export default function StatsCard({ label, value, sub }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
