const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../services/db');
const ai = require('../../services/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session-recap')
    .setDescription('Generate or view a recap for a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true)),
  async execute(interaction) {
    const campaignRef = interaction.options.getString('campaign');
    try {
      const campaign = db.getCampaign(campaignRef);
      if (!campaign) return interaction.reply({ content: 'Campaign not found', ephemeral: true });

      const latestRolls = db.getRollHistory(campaignRef, 5).map(r => `${r.userName}: ${r.expr} -> ${r.result?.total ?? 'n/a'}`).join('; ');
      const latestQuest = (campaign.quests || []).slice(-1)[0]?.text || 'No quests yet.';
      const summary = await ai.generateRecap({
        campaignName: campaign.name,
        summary: campaign.summary || campaign.hook || '',
        recentEvents: `Recent rolls: ${latestRolls || 'none'}. Latest quest: ${latestQuest}`
      });
      const embed = new EmbedBuilder()
        .setTitle(summary.title || `Previously on ${campaign.name}`)
        .setColor(0x14b8a6)
        .setDescription(summary.recap || 'The party pressed onward through the darkness.')
        .addFields({ name: 'Next Step', value: summary.nextStep || 'Continue the adventure.', inline: false });
      db.addRecap(campaignRef, { text: summary.recap || '', ts: new Date().toISOString(), generatedBy: 'ai' });
      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
