const { SlashCommandBuilder } = require('discord.js');
const maps = require('../../services/maps');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map-create')
    .setDescription('Create a named map for a campaign')
    .addStringOption(opt => opt.setName('name').setDescription('Map name').setRequired(true))
    .addStringOption(opt => opt.setName('image').setDescription('Image URL for the map').setRequired(true)),
  async execute(interaction) {
    const name = interaction.options.getString('name');
    const image = interaction.options.getString('image');
    try {
      auth.ensureMapManager(interaction);
      const map = maps.createMap(name, interaction.user.id, image);
      await interaction.reply({ content: `Map created: ${map.name} (id: ${map.id})`, ephemeral: true });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      await interaction.reply({ content: 'Error creating map: ' + err.message, ephemeral: true });
    }
  }
};
