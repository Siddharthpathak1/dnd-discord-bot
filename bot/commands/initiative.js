const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('initiative')
    .setDescription('Add or show initiative')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addIntegerOption(opt => opt.setName('value').setDescription('Initiative value to add (optional)')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const value = interaction.options.getInteger('value');
    try {
      if (value !== null) {
        await db.addInitiative(campaign, { playerId: interaction.user.id, value });
        return interaction.reply({ content: `Added initiative ${value} for ${interaction.user.username}`, ephemeral: false });
      }
      const campaigns = db.listCampaigns();
      const c = campaigns.find(x => x.id === campaign || x.name === campaign);
      if (!c) return interaction.reply({ content: 'Campaign not found', ephemeral: true });
      if (!c.initiative.length) return interaction.reply({ content: 'No initiative entries', ephemeral: true });
      const lines = c.initiative.map(i => `${i.playerId}: ${i.value}`);
      return interaction.reply({ content: lines.join('\n'), ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
