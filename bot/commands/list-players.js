const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-players')
    .setDescription('List players in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    try {
      const players = db.listPlayers(campaign);
      if (!players.length) return interaction.reply({ content: 'No players in campaign.', ephemeral: true });
      const lines = players.map(p => {
        const xp = p.xp ?? 0;
        const level = Math.floor(xp / 300) + 1;
        const inventoryCount = (p.inventory || []).length;
        return `${p.name || p.id} — HP: ${p.hp ?? 'unknown'} — XP: ${xp} (Lv ${level}) — Items: ${inventoryCount} — Conditions: ${(p.conditions||[]).join(', ') || 'none'}`;
      });
      return interaction.reply({ content: lines.join('\n'), ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
