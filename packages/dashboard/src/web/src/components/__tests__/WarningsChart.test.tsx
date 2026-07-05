// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WarningsChart from '../WarningsChart';

const mockBar = vi.hoisted(() => vi.fn(() => <div data-testid="bar-chart" />));

vi.mock('react-chartjs-2', () => ({
  Bar: mockBar,
}));

describe('WarningsChart', () => {
  it('renders title and chart', () => {
    const data = [
      { date: '2025-06-25', count: 3 },
      { date: '2025-06-26', count: 1 },
    ];
    render(<WarningsChart data={data} />);
    expect(screen.getByText('Warnings (7 Days)')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    render(<WarningsChart data={[]} />);
    expect(screen.getByText('Warnings (7 Days)')).toBeInTheDocument();
  });
});
