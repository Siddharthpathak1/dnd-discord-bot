const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('award-title')
    .setDescription('Award a title to the campaign (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addStringOption(opt => opt.setName('title').setDescription('Title to award').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const title = interaction.options.getString('title');
    try {
      await auth.ensureCampaignOwner(interaction, campaign);
      db.addTitle(campaign, title);
      return interaction.reply({ content: `Title awarded for ${campaign}: ${title}`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
