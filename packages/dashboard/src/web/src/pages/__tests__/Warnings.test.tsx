// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetWarnings = vi.hoisted(() => vi.fn());

vi.mock('../../api', () => ({
  client: {
    getWarnings: mockGetWarnings,
  },
}));

import Warnings from '../Warnings';

describe('Warnings page', () => {
  beforeEach(() => {
    mockGetWarnings.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetWarnings.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <Warnings />
      </MemoryRouter>
    );
    expect(screen.getByText('Warnings')).toBeInTheDocument();
  });

  it('renders warning list on success', async () => {
    mockGetWarnings.mockResolvedValue({
      status: 200,
      body: {
        items: [
          {
            id: 1,
            userId: 'u1',
            guildId: 'g1',
            reason: 'spam',
            createdAt: new Date().toISOString(),
            userLevel: 3,
            userXp: 800,
            userName: 'u1',
            userDisplayName: 'u1',
          },
        ],
        total: 1,
      },
    });

    render(
      <MemoryRouter>
        <Warnings />
      </MemoryRouter>
    );

    expect(await screen.findByText('Warnings')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('u1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows empty state when no warnings', async () => {
    mockGetWarnings.mockResolvedValue({
      status: 200,
      body: { items: [], total: 0 },
    });

    render(
      <MemoryRouter>
        <Warnings />
      </MemoryRouter>
    );

    expect(
      await screen.findByText('No warnings recorded.')
    ).toBeInTheDocument();
  });
});
