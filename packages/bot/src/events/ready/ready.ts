import { Client } from 'discord.js';
import { Event } from '../event';

const readyEvent: Event<'clientReady'> = {
  name: 'clientReady',
  once: true,
  execute: async (client: Client<true>) => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  },
};

export default readyEvent;
