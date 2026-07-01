import './env'; // Validate env at startup
import { REST, Routes } from 'discord.js';
import { env } from './env';
import { loadCommands } from './commands';

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

(async () => {
  try {
    const commands = await loadCommands();
    console.log(
      `Started refreshing ${commands.length} application (/) command(s).`
    );

    await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
      body: commands.map((c) => c.data.toJSON()),
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
