const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ai = require('../../services/ai');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-trailer')
    .setDescription('Generate a cinematic trailer for a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addStringOption(opt => opt.setName('vibe').setDescription('Trailer vibe, e.g. dark, epic, mysterious')),

  async execute(interaction) {
    const campaignRef = interaction.options.getString('campaign');
    const vibe = interaction.options.getString('vibe') || 'cinematic, ominous, heroic';

    try {
      const campaign = db.getCampaign(campaignRef);
      if (!campaign) return interaction.reply({ content: 'Campaign not found', ephemeral: true });

      await interaction.deferReply({ ephemeral: false });
      const generated = await ai.generateTrailer({
        campaignName: campaign.name,
        summary: campaign.summary || campaign.hook || '',
        hook: campaign.hook || '',
        vibe
      });

      const embed = new EmbedBuilder()
        .setTitle(generated.title || `${campaign.name} — Trailer`)
        .setColor(0x0f766e)
        .setDescription((generated.trailer || []).join('\n'))
        .addFields({ name: 'Call To Action', value: generated.callToAction || 'Gather the party.', inline: false })
        .setFooter({ text: `For ${campaign.name}` });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: `Error generating trailer: ${error.message}` });
      }
      return interaction.reply({ content: `Error generating trailer: ${error.message}`, ephemeral: true });
    }
  }
};
