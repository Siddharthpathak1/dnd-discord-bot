const { SlashCommandBuilder } = require('discord.js');
const maps = require('../../services/maps');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map-remove')
    .setDescription('Remove a token from a map')
    .addStringOption(opt => opt.setName('map').setDescription('Map id or name').setRequired(true))
    .addStringOption(opt => opt.setName('token').setDescription('Token id').setRequired(true)),
  async execute(interaction) {
    const map = interaction.options.getString('map');
    const tokenId = interaction.options.getString('token');
    try {
      auth.ensureMapManager(interaction);
      const token = maps.removeToken(map, tokenId);
      await interaction.reply({ content: `Removed token ${token.name}`, ephemeral: true });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      await interaction.reply({ content: 'Error removing token: ' + err.message, ephemeral: true });
    }
  }
};
