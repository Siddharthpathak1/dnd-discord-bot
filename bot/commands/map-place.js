const { SlashCommandBuilder } = require('discord.js');
const maps = require('../../services/maps');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map-place')
    .setDescription('Place a token on a map')
    .addStringOption(opt => opt.setName('map').setDescription('Map id or name').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Token name').setRequired(true))
    .addNumberOption(opt => opt.setName('x').setDescription('X percent (0-100)').setRequired(true))
    .addNumberOption(opt => opt.setName('y').setDescription('Y percent (0-100)').setRequired(true))
    .addStringOption(opt => opt.setName('image').setDescription('Token image URL')),
  async execute(interaction) {
    const map = interaction.options.getString('map');
    const name = interaction.options.getString('name');
    const x = interaction.options.getNumber('x');
    const y = interaction.options.getNumber('y');
    const image = interaction.options.getString('image') || null;
    try {
      const token = maps.placeToken(map, { ownerId: interaction.user.id, name, x, y, image });
      await interaction.reply({ content: `Placed token ${token.name} (id: ${token.id}) at ${x},${y}`, ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: 'Error placing token: ' + e.message, ephemeral: true });
    }
  }
};
