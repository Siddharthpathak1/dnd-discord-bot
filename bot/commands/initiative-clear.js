const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('initiative-clear')
    .setDescription('Clear initiative order for a campaign (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    try {
      await auth.ensureCampaignOwner(interaction, campaign);
      db.clearInitiative(campaign);
      return interaction.reply({ content: `Cleared initiative for campaign ${campaign}`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
