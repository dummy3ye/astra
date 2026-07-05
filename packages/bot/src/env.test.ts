import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('parses valid environment variables', async () => {
    vi.stubEnv('DISCORD_TOKEN', 'valid-token');
    vi.stubEnv('CLIENT_ID', '12345');
    vi.stubEnv('DATABASE_URL', 'file:custom.db');

    const { env } = await import('./env');

    expect(env.DISCORD_TOKEN).toBe('valid-token');
    expect(env.CLIENT_ID).toBe('12345');
    expect(env.DATABASE_URL).toBe('file:custom.db');
  });

  it('uses default DATABASE_URL when not set', async () => {
    vi.stubEnv('DISCORD_TOKEN', 'token');
    vi.stubEnv('CLIENT_ID', '12345');
    delete process.env.DATABASE_URL;

    const { env } = await import('./env');

    expect(env.DATABASE_URL).toBe('file:./dev.db');
  });

  it('exits when DISCORD_TOKEN is missing', async () => {
    vi.stubEnv('DISCORD_TOKEN', '');
    vi.stubEnv('CLIENT_ID', '12345');

    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(async () => {
      await import('./env');
    }).rejects.toThrow('process.exit called');

    expect(exitMock).toHaveBeenCalledWith(1);
    exitMock.mockRestore();
  });

  it('exits when CLIENT_ID is missing', async () => {
    vi.stubEnv('DISCORD_TOKEN', 'token');
    vi.stubEnv('CLIENT_ID', '');

    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(async () => {
      await import('./env');
    }).rejects.toThrow('process.exit called');

    expect(exitMock).toHaveBeenCalledWith(1);
    exitMock.mockRestore();
  });
});
