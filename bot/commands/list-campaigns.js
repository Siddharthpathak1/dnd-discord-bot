const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder().setName('list-campaigns').setDescription('List campaigns'),
  async execute(interaction) {
    const campaigns = db.listCampaigns();
    if (!campaigns.length) return interaction.reply({ content: 'No campaigns found.', ephemeral: true });
    const lines = campaigns.map(c => `• ${c.name} (id: ${c.id}) — ${c.players.length} players`);
    await interaction.reply({ content: lines.join('\n'), ephemeral: false });
  }
};
