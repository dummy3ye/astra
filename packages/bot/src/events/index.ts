import fs from 'fs';
import path from 'path';
import { Client } from 'discord.js';
import { Event } from './event';

function getEventFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests') {
        files.push(...getEventFiles(fullPath));
      }
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.js') &&
      entry.name !== 'index.ts' &&
      entry.name !== 'index.js' &&
      entry.name !== 'event.ts' &&
      entry.name !== 'event.js'
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function loadAndRegisterEvents(client: Client): Promise<void> {
  const eventsPath = __dirname;
  const files = getEventFiles(eventsPath);

  for (const filePath of files) {
    const eventModule = await import(filePath);
    const event: Event = eventModule.default;

    if (!event || !event.name || typeof event.execute !== 'function') {
      console.warn(`[events] Skipping invalid event module: ${filePath}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    console.log(`[events] Registered event: ${event.name}`);
  }
}
