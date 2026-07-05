// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetAuditLog = vi.hoisted(() => vi.fn());

vi.mock('../../api', () => ({
  client: {
    getAuditLog: mockGetAuditLog,
  },
}));

import AuditLog from '../AuditLog';

describe('AuditLog page', () => {
  beforeEach(() => {
    mockGetAuditLog.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetAuditLog.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>
    );
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('renders audit entries on success', async () => {
    mockGetAuditLog.mockResolvedValue({
      status: 200,
      body: {
        items: [
          {
            id: 1,
            guildId: 'g1',
            action: 'ban',
            targetId: 'u1',
            targetName: 'u1',
            moderatorId: 'm1',
            moderatorName: 'Mod1',
            reason: 'violation',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    });

    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>
    );

    expect(await screen.findByText('Audit Log')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByText('g1')).toBeInTheDocument();
    expect(screen.getAllByText('ban')).toHaveLength(2);
  });

  it('shows empty state when no entries', async () => {
    mockGetAuditLog.mockResolvedValue({
      status: 200,
      body: { items: [], total: 0 },
    });

    render(
      <MemoryRouter>
        <AuditLog />
      </MemoryRouter>
    );

    expect(
      await screen.findByText('No audit entries found.')
    ).toBeInTheDocument();
  });
});
