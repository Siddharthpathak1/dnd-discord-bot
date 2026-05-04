const { SlashCommandBuilder } = require('discord.js');
const maps = require('../../services/maps');

module.exports = {
  data: new SlashCommandBuilder().setName('map-list').setDescription('List available maps'),
  async execute(interaction) {
    try {
      const list = maps.listMaps();
      if (!list.length) return interaction.reply({ content: 'No maps found.', ephemeral: true });
      const lines = list.map(m => `${m.name} — id: ${m.id}`);
      await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: 'Error listing maps: ' + e.message, ephemeral: true });
    }
  }
};
