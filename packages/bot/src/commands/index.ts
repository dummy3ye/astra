import fs from 'fs';
import path from 'path';
import { Command } from './command';

export let registeredCommands: Command[] = [];

function getCommandFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests') {
        files.push(...getCommandFiles(fullPath));
      }
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.js') &&
      entry.name !== 'index.ts' &&
      entry.name !== 'index.js' &&
      entry.name !== 'command.ts' &&
      entry.name !== 'command.js'
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function loadCommands(): Promise<Command[]> {
  const loadedCommands: Command[] = [];
  const commandsPath = __dirname;
  const files = getCommandFiles(commandsPath);

  for (const filePath of files) {
    const commandModule = await import(filePath);
    const command =
      commandModule.default ||
      Object.values(commandModule).find(
        (val) =>
          val && typeof val === 'object' && 'data' in val && 'execute' in val
      );

    if (command) {
      loadedCommands.push(command as Command);
    }
  }

  registeredCommands = loadedCommands;
  return loadedCommands;
}
