import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  breakdown: { action: string; count: number }[];
}

const COLORS = [
  '#ec4899', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#a855f7', '#ef4444',
  '#14b8a6', '#f59e0b', '#8b5cf6',
];

export default function AuditChart({ breakdown }: Props) {
  const data = {
    labels: breakdown.map((b) => b.action),
    datasets: [
      {
        data: breakdown.map((b) => b.count),
        backgroundColor: COLORS.slice(0, breakdown.length),
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#a1a1aa', padding: 12 },
      },
    },
  };

  return (
    <div className="chart-container">
      <h3 className="section-title">Audit Actions</h3>
      <div className="chart-wrapper">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
