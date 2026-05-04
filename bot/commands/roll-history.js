const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll-history')
    .setDescription('Show recent roll history for a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries to show (max 50)')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const limit = Math.min(interaction.options.getInteger('limit') || 20, 50);
    try {
      const history = db.getRollHistory(campaign, limit);
      if (!history.length) return interaction.reply({ content: 'No recent rolls', ephemeral: true });
      const lines = history.map(r => `${r.ts} — ${r.userName}: ${r.expr} => ${r.result.total}`);
      await interaction.reply({ content: lines.join('\n'), ephemeral: false });
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
