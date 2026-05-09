const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loot-add')
    .setDescription('Add loot to a player inventory (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addUserOption(opt => opt.setName('player').setDescription('Player to receive loot').setRequired(true))
    .addStringOption(opt => opt.setName('item').setDescription('Loot item').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const player = interaction.options.getUser('player');
    const item = interaction.options.getString('item');
    try {
      await auth.ensureCampaignOwner(interaction, campaign);
      const items = db.addInventoryItem(campaign, player.id, item);
      return interaction.reply({ content: `Added ${item} to ${player.username}. Inventory now has ${items.length} item(s).`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
