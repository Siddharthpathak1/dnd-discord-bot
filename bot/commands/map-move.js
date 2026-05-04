const { SlashCommandBuilder } = require('discord.js');
const maps = require('../../services/maps');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map-move')
    .setDescription('Move a token on a map')
    .addStringOption(opt => opt.setName('map').setDescription('Map id or name').setRequired(true))
    .addStringOption(opt => opt.setName('token').setDescription('Token id').setRequired(true))
    .addNumberOption(opt => opt.setName('x').setDescription('X percent (0-100)').setRequired(true))
    .addNumberOption(opt => opt.setName('y').setDescription('Y percent (0-100)').setRequired(true)),
  async execute(interaction) {
    const map = interaction.options.getString('map');
    const tokenId = interaction.options.getString('token');
    const x = interaction.options.getNumber('x');
    const y = interaction.options.getNumber('y');
    try {
      auth.ensureMapManager(interaction);
      const token = maps.moveToken(map, tokenId, x, y);
      await interaction.reply({ content: `Moved token ${token.name} to ${x},${y}`, ephemeral: true });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      await interaction.reply({ content: 'Error moving token: ' + err.message, ephemeral: true });
    }
  }
};
