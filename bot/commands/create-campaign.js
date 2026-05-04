const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-campaign')
    .setDescription('Create a new campaign')
    .addStringOption(opt => opt.setName('name').setDescription('Name of the campaign').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('name');
    try {
      const campaign = db.createCampaign(name, interaction.user.id);
      await interaction.reply({ content: `Campaign created: ${campaign.name} (id: ${campaign.id})`, ephemeral: false });
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
