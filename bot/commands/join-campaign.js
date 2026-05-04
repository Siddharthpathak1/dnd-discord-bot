const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join-campaign')
    .setDescription('Join a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign name or id').setRequired(true)),
  async execute(interaction) {
    const campaignName = interaction.options.getString('campaign');
    try {
      const campaign = db.joinCampaign(campaignName, interaction.user.id, interaction.user.username);
      await interaction.reply({ content: `Joined campaign ${campaign.name}`, ephemeral: false });
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
