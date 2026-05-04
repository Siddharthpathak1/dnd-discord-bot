const { SlashCommandBuilder } = require('discord.js');
const maps = require('../../services/maps');

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
      const token = maps.removeToken(map, tokenId);
      await interaction.reply({ content: `Removed token ${token.name}`, ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: 'Error removing token: ' + e.message, ephemeral: true });
    }
  }
};
