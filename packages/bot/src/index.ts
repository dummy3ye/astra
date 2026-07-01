import './env'; // Validate env at startup — crashes early with descriptive errors if invalid
import { Client, GatewayIntentBits } from 'discord.js';
import { env } from './env';
import { loadCommands } from './commands';
import { loadAndRegisterEvents } from './events';
import { setClient } from './utils/clientInstance';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Make the client globally accessible (e.g. for the auditLog service)
setClient(client);

(async () => {
  // Dynamically load all commands from the commands directory
  const commands = await loadCommands();
  console.log(`[commands] Loaded ${commands.length} command(s).`);

  // Dynamically register all events from the events directory
  await loadAndRegisterEvents(client);

  // Login with the validated token
  await client.login(env.DISCORD_TOKEN);
})();
