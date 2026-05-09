const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');
const ai = require('../../services/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc-create')
    .setDescription('Create an NPC for a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('NPC name').setRequired(true))
    .addStringOption(opt => opt.setName('role').setDescription('Role or job'))
    .addStringOption(opt => opt.setName('vibe').setDescription('Personality or vibe')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const name = interaction.options.getString('name');
    const role = interaction.options.getString('role') || 'mysterious contact';
    const vibe = interaction.options.getString('vibe') || 'interesting and memorable';
    try {
      await auth.ensureCampaignOwner(interaction, campaign);
      const npc = await ai.generateCharacter({ name, className: role, level: 1, ancestry: 'Unknown', background: vibe, tone: vibe });
      db.addNpc(campaign, { name: npc.name || name, role, vibe, portrait: null, notes: npc.personality || vibe, dialogue: npc.features || [], createdBy: interaction.user.username });
      return interaction.reply({ content: `NPC created for ${campaign}: ${name}`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
