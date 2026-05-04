const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('initiative-advance')
    .setDescription('Advance initiative to the next turn (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    try {
      await auth.ensureCampaignOwner(interaction, campaign);
      const res = db.advanceInitiative(campaign);
      const entry = res.entry || {};
      return interaction.reply({ content: `Advanced initiative to ${entry.playerName || entry.playerId || 'unknown'} (${entry.value})`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
