const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ai = require('../../services/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random-encounter')
    .setDescription('Generate a random encounter for a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addStringOption(opt => opt.setName('tone').setDescription('Tone for the encounter')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const tone = interaction.options.getString('tone') || 'tense, cinematic';
    try {
      const generated = await ai.generateEncounter({ campaignName: campaign, tone });
      const embed = new EmbedBuilder()
        .setTitle(generated.title || `Random Encounter: ${campaign}`)
        .setColor(0xdc2626)
        .setDescription(generated.encounter || 'A hostile force emerges from the darkness.')
        .addFields(
          { name: 'Tone', value: tone, inline: true },
          { name: 'Complication', value: generated.complication || 'Add one hard choice, one hidden threat, and one environmental hazard.', inline: false },
          { name: 'Reward', value: generated.reward || 'Useful loot, clues, or an opportunity to push forward.', inline: false }
        );
      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
