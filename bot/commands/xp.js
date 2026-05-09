const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

function xpForLevel(level) {
  return Math.max(0, (level - 1) * 300);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('View or award XP in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('XP to add (optional)')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const amount = interaction.options.getInteger('amount');
    try {
      if (amount !== null) {
        const total = db.addXP(campaign, interaction.user.id, amount);
        const level = Math.floor(total / 300) + 1;
        return interaction.reply({ content: `Added ${amount} XP for ${interaction.user.username}. Total: ${total} XP (Level ${level})`, ephemeral: false });
      }
      const total = db.getXP(campaign, interaction.user.id);
      const level = Math.floor(total / 300) + 1;
      return interaction.reply({ content: `${interaction.user.username}: ${total} XP (Level ${level}, next at ${xpForLevel(level + 1)} XP)`, ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
