import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../command';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true,
      ephemeral: true,
    });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({ content: `Pong, replied in ${latency}ms` });
  },
};
