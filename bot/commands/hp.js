const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hp')
    .setDescription('Set or show HP for yourself in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addIntegerOption(opt => opt.setName('value').setDescription('HP value to set (optional)')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const value = interaction.options.getInteger('value');
    try {
      const campaigns = db.listCampaigns();
      const c = campaigns.find(x => x.id === campaign || x.name === campaign);
      if (!c) return interaction.reply({ content: 'Campaign not found', ephemeral: true });
      if (value === null) {
        const player = c.players.find(p => p.id === interaction.user.id);
        if (!player) return interaction.reply({ content: 'You are not in this campaign', ephemeral: true });
        return interaction.reply({ content: `${interaction.user.username} HP: ${player.hp ?? 'unknown'}`, ephemeral: false });
      }
      const player = db.setHP(c.id, interaction.user.id, value);
      return interaction.reply({ content: `Set HP for ${player.name || interaction.user.username} to ${player.hp}`, ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
