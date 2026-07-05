// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetStats = vi.hoisted(() => vi.fn());

vi.mock('../../api', () => ({
  client: {
    getStats: mockGetStats,
  },
}));

import Dashboard from '../Dashboard';

describe('Dashboard page', () => {
  beforeEach(() => {
    mockGetStats.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetStats.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders stats and charts on success', async () => {
    mockGetStats.mockResolvedValue({
      status: 200,
      body: {
        totalUsers: 100,
        totalServers: 5,
        totalWarnings: 20,
        totalBans: 8,
        recentWarnings: [
          { id: 1, userId: 'u1', reason: 'spam', createdAt: new Date().toISOString() },
        ],
        auditActionBreakdown: [{ action: 'ban', count: 5 }],
        warningsByDay: [{ date: '2025-06-25', count: 2 }],
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(await screen.findByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Recent Warnings')).toBeInTheDocument();
  });

  it('shows error state when API returns 500', async () => {
    mockGetStats.mockResolvedValue({ status: 500, body: { error: 'fail' } });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Failed to load dashboard data.')).toBeInTheDocument();
  });

  it('shows error state on network failure', async () => {
    mockGetStats.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Failed to load dashboard data.')).toBeInTheDocument();
  });

  it('hides recent warnings section when empty', async () => {
    mockGetStats.mockResolvedValue({
      status: 200,
      body: {
        totalUsers: 0, totalServers: 0, totalWarnings: 0, totalBans: 0,
        recentWarnings: [],
        auditActionBreakdown: [],
        warningsByDay: [],
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    await screen.findByText('Overview');
    expect(screen.queryByText('Recent Warnings')).not.toBeInTheDocument();
  });
});
