// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockGetUsers = vi.hoisted(() => vi.fn());

vi.mock('../../api', () => ({
  client: {
    getUsers: mockGetUsers,
  },
}));

import Users from '../Users';

describe('Users page', () => {
  beforeEach(() => {
    mockGetUsers.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetUsers.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>,
    );
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders user list on success', async () => {
    mockGetUsers.mockResolvedValue({
      status: 200,
      body: {
        items: [
          { id: 'u1', guildId: 'g1', xp: 1500, level: 5, warnings: 2, username: 'user1', displayName: 'User1' },
        ],
        total: 1,
      },
    });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Users')).toBeInTheDocument();
    expect(await screen.findByText('u1')).toBeInTheDocument();
    expect(await screen.findByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no users', async () => {
    mockGetUsers.mockResolvedValue({ status: 200, body: { items: [], total: 0 } });

    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No users found.')).toBeInTheDocument();
  });
});
