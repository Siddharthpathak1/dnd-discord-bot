const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../services/db');
const ai = require('../../services/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc-talk')
    .setDescription('Talk to an NPC in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addStringOption(opt => opt.setName('npc').setDescription('NPC name').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('What you say').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const npcName = interaction.options.getString('npc');
    const message = interaction.options.getString('message');
    try {
      const npcs = db.getNpcs(campaign);
      const npc = npcs.find(n => String(n.name).toLowerCase() === npcName.toLowerCase());
      if (!npc) return interaction.reply({ content: `NPC not found: ${npcName}`, ephemeral: true });

      const reply = await ai.generateNpcReply({ npc, message, campaignName: campaign });
      const embed = new EmbedBuilder()
        .setTitle(reply.title || `${npc.name} replies`)
        .setDescription(reply.reply || `${npc.name} looks at you carefully. "Interesting."`)
        .setFooter({ text: `${npc.role || 'NPC'} • ${campaign}` });

      return interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
