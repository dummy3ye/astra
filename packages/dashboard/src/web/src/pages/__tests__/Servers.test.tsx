// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetServers = vi.hoisted(() => vi.fn());

vi.mock('../../api', () => ({
  client: {
    getServers: mockGetServers,
  },
}));

import Servers from '../Servers';

describe('Servers page', () => {
  beforeEach(() => {
    mockGetServers.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetServers.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <Servers />
      </MemoryRouter>
    );
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });

  it('renders server list on success', async () => {
    mockGetServers.mockResolvedValue({
      status: 200,
      body: [
        {
          guildId: 'g1',
          name: 'My Server',
          memberCount: 50,
          warningCount: 5,
          blockLinks: true,
          blockedWords: 'bad',
          warnTimeoutThreshold: 3,
          warnBanThreshold: 5,
          levelRoles: 2,
        },
      ],
    });

    render(
      <MemoryRouter>
        <Servers />
      </MemoryRouter>
    );

    expect(await screen.findByText('Servers')).toBeInTheDocument();
    expect(await screen.findByText('g1')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no servers', async () => {
    mockGetServers.mockResolvedValue({ status: 200, body: [] });

    render(
      <MemoryRouter>
        <Servers />
      </MemoryRouter>
    );

    expect(await screen.findByText('No servers found.')).toBeInTheDocument();
  });
});
