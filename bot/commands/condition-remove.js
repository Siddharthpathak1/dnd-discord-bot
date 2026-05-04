const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('condition-remove')
    .setDescription('Remove a condition from a player in a campaign (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addUserOption(opt => opt.setName('player').setDescription('Player to remove condition from').setRequired(true))
    .addStringOption(opt => opt.setName('condition').setDescription('Condition name').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const player = interaction.options.getUser('player');
    const condition = interaction.options.getString('condition');
    try {
      await auth.ensureCampaignOwner(interaction, campaign);
      const conditions = db.removeCondition(campaign, player.id, condition);
      return interaction.reply({ content: `Updated conditions for ${player.username}: ${conditions.join(', ') || 'none'}`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
