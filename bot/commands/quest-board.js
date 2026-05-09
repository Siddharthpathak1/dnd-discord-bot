const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest-board')
    .setDescription('Create or list quests for a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addStringOption(opt => opt.setName('quest').setDescription('Quest text (optional)'))
    .addStringOption(opt => opt.setName('status').setDescription('active, completed, or secret')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const quest = interaction.options.getString('quest');
    const status = interaction.options.getString('status') || 'active';
    try {
      if (quest) {
        await auth.ensureCampaignOwner(interaction, campaign);
        db.addQuest(campaign, { text: quest, status, createdBy: interaction.user.username, ts: new Date().toISOString() });
        return interaction.reply({ content: `Quest added to ${campaign}: ${quest}`, ephemeral: false });
      }
      const quests = db.getQuests(campaign);
      if (!quests.length) return interaction.reply({ content: 'No quests on the board yet.', ephemeral: true });
      const lines = quests.map((q, index) => `${index + 1}. [${q.status || 'active'}] ${q.text}`);
      return interaction.reply({ content: lines.join('\n'), ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
