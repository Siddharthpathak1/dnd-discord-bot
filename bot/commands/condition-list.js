const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('condition-list')
    .setDescription('List conditions for a player in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addUserOption(opt => opt.setName('player').setDescription('Player to show conditions for').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const player = interaction.options.getUser('player');
    try {
      const conditions = db.listConditions(campaign, player.id);
      return interaction.reply({ content: `${player.username} conditions: ${conditions.join(', ') || 'none'}`, ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
