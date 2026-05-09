const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Show your inventory in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    try {
      const items = db.getInventory(campaign, interaction.user.id);
      const text = items.length ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : 'Inventory is empty.';
      return interaction.reply({ content: text, ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
