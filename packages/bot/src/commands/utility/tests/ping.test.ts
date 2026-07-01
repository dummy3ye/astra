import { describe, it, expect, vi } from 'vitest';
import { pingCommand } from '../ping';

describe('pingCommand', () => {
  it('has the correct command name', () => {
    expect(pingCommand.data.name).toBe('ping');
  });

  it('replies with Pong and latency info', async () => {
    const reply = vi.fn().mockResolvedValue({ createdTimestamp: 1000 });
    const editReply = vi.fn();
    await pingCommand.execute({
      createdTimestamp: 991,
      reply,
      editReply,
    } as never);

    expect(reply).toHaveBeenCalledWith({
      content: 'Pinging...',
      fetchReply: true,
      ephemeral: true,
    });
    expect(editReply).toHaveBeenCalledWith({ content: 'Pong, replied in 9ms' });
  });
});
