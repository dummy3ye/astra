import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCommands } = vi.hoisted(() => ({
  mockCommands: [] as any[],
}));

// The event module (src/events/interaction/interactionCreate.ts) imports from '../../commands'
// which resolves to src/commands. From this test file (src/events/interaction/tests/), that's '../../../commands'
vi.mock('../../../commands', () => ({
  registeredCommands: mockCommands,
}));

import interactionCreateEvent from '../interactionCreate';

describe('interactionCreate event', () => {
  beforeEach(() => {
    mockCommands.length = 0;
  });

  it('ignores non-command interactions', async () => {
    const interaction = {
      isChatInputCommand: () => false,
    };

    await interactionCreateEvent.execute(interaction as never);
  });

  it('ignores unknown commands', async () => {
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'unknown',
    };

    await interactionCreateEvent.execute(interaction as never);
  });

  it('executes a matching command', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    mockCommands.push({ data: { name: 'ping' }, execute });

    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'ping',
    };

    await interactionCreateEvent.execute(interaction as never);

    expect(execute).toHaveBeenCalledWith(interaction);
  });

  it('replies with error message when command execution fails', async () => {
    const execute = vi
      .fn()
      .mockRejectedValue(new Error('Something went wrong'));
    mockCommands.push({ data: { name: 'ping' }, execute });

    const reply = vi.fn();
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'ping',
      replied: false,
      deferred: false,
      reply,
    };

    await interactionCreateEvent.execute(interaction as never);

    expect(reply).toHaveBeenCalledWith({
      content: 'There was an error executing this command!',
      ephemeral: true,
    });
  });

  it('sends followUp if interaction was already replied to', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('error'));
    mockCommands.push({ data: { name: 'ping' }, execute });

    const followUp = vi.fn();
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'ping',
      replied: true,
      deferred: false,
      followUp,
      reply: vi.fn(),
    };

    await interactionCreateEvent.execute(interaction as never);

    expect(followUp).toHaveBeenCalledWith({
      content: 'There was an error executing this command!',
      ephemeral: true,
    });
  });

  it('sends followUp if interaction was deferred', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('error'));
    mockCommands.push({ data: { name: 'ping' }, execute });

    const followUp = vi.fn();
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'ping',
      replied: false,
      deferred: true,
      followUp,
      reply: vi.fn(),
    };

    await interactionCreateEvent.execute(interaction as never);

    expect(followUp).toHaveBeenCalledWith({
      content: 'There was an error executing this command!',
      ephemeral: true,
    });
  });
});
