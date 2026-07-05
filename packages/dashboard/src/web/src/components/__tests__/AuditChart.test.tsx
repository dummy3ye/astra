// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuditChart from '../AuditChart';

// Mock Chart.js to avoid canvas rendering issues in jsdom
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart" />,
}));

describe('AuditChart', () => {
  it('renders title and chart', () => {
    const breakdown = [
      { action: 'ban', count: 5 },
      { action: 'kick', count: 3 },
    ];
    render(<AuditChart breakdown={breakdown} />);
    expect(screen.getByText('Audit Actions')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });

  it('renders nothing when breakdown is empty', () => {
    const { container } = render(<AuditChart breakdown={[]} />);
    expect(screen.getByText('Audit Actions')).toBeInTheDocument();
    expect(container.querySelector('.chart-container')).toBeInTheDocument();
  });
});
