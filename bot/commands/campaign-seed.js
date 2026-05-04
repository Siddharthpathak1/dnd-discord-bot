const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');
const starter = require('../../data/campaigns/lumenreach-depths.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('campaign-seed')
    .setDescription('Create a starter campaign from a built-in template')
    .addStringOption(opt => opt.setName('template').setDescription('Template name').setRequired(true).addChoices({ name: 'Lumenreach Depths', value: 'lumenreach-depths' })),
  async execute(interaction) {
    const template = interaction.options.getString('template');
    try {
      auth.ensureMapManager(interaction);
      if (template !== 'lumenreach-depths') throw new Error('Unknown template');
      const campaign = db.createCampaign(starter.name, interaction.user.id, {
        hook: starter.hook,
        summary: starter.summary,
        starter: starter
      });
      return interaction.reply({ content: `Starter campaign created: ${campaign.name} (id: ${campaign.id})`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
