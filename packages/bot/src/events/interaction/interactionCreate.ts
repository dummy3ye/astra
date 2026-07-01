import { ChatInputCommandInteraction, Interaction } from 'discord.js';
import { registeredCommands } from '../../commands';
import { Event } from '../event';

const interactionCreateEvent: Event<'interactionCreate'> = {
  name: 'interactionCreate',
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = registeredCommands.find(
      (c) => c.data.name === interaction.commandName
    );
    if (!command) return;

    try {
      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      console.error(error);
      const errorMsg = {
        content: 'There was an error executing this command!',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
  },
};

export default interactionCreateEvent;
