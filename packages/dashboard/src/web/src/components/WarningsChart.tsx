import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  data: { date: string; count: number }[];
}

export default function WarningsChart({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: 'Warnings',
        data: data.map((d) => d.count),
        backgroundColor: '#6366f1',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#a1a1aa' },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#a1a1aa', stepSize: 1 },
        grid: { color: '#27272a' },
      },
    },
  };

  return (
    <div className="chart-container">
      <h3 className="section-title">Warnings (7 Days)</h3>
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
