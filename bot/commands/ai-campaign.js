const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ai = require('../../services/ai');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-campaign')
    .setDescription('Generate a new campaign with AI')
    .addStringOption(opt => opt.setName('theme').setDescription('Campaign theme or hook').setRequired(true))
    .addIntegerOption(opt => opt.setName('level').setDescription('Recommended starting level'))
    .addIntegerOption(opt => opt.setName('party').setDescription('Recommended party size'))
    .addStringOption(opt => opt.setName('tone').setDescription('Tone, like heroic, spooky, or grimdark')),

  async execute(interaction) {
    const theme = interaction.options.getString('theme');
    const level = interaction.options.getInteger('level') || 1;
    const party = interaction.options.getInteger('party') || 4;
    const tone = interaction.options.getString('tone') || 'cinematic fantasy';

    await interaction.deferReply({ ephemeral: false });

    try {
      const generated = await ai.generateCampaign({ theme, level, partySize: party, tone });
      const desiredName = generated.name || theme;
      const campaignName = db.listCampaigns().some(c => c.name === desiredName) ? `${desiredName} ${Date.now().toString().slice(-4)}` : desiredName;
      const campaign = db.createCampaign(campaignName, interaction.user.id, {
        summary: generated.summary,
        hook: generated.hook,
        regions: generated.regions || [],
        factions: generated.factions || [],
        starterEncounters: generated.starterEncounters || [],
        trailer: generated.trailer || '',
        introLine: generated.introLine || '',
        aiGenerated: true,
        aiSource: ai.isConfigured() ? 'ai-api' : 'fallback'
      });

      const embed = new EmbedBuilder()
        .setTitle(`AI Campaign Created: ${campaign.name}`)
        .setColor(0x7c3aed)
        .setDescription(generated.summary || 'AI-generated campaign')
        .addFields(
          { name: 'Hook', value: generated.hook || 'No hook returned', inline: false },
          { name: 'Starter Trailer', value: (generated.trailer || 'No trailer returned').slice(0, 1024), inline: false },
          { name: 'Regions', value: (generated.regions || []).map(r => `• ${r.name} (${r.type})`).join('\n').slice(0, 1024) || 'None', inline: false },
          { name: 'Factions', value: (generated.factions || []).map(f => `• ${f.name}: ${f.goal}`).join('\n').slice(0, 1024) || 'None', inline: false },
          { name: 'Starter Encounters', value: (generated.starterEncounters || []).map(e => `• ${e}`).join('\n').slice(0, 1024) || 'None', inline: false }
        )
        .setFooter({ text: `Saved as campaign id ${campaign.id} • Use /help-dnd and /how-to-play to run it` });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ content: `Error generating campaign: ${error.message}` });
    }
  }
};
