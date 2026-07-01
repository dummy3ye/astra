import { Client } from 'discord.js';

let client: Client | null = null;

export function setClient(c: Client) {
  client = c;
}

export function getClient(): Client {
  if (!client) {
    throw new Error('Client has not been set yet!');
  }
  return client;
}
