const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const bus = require('../../services/bus');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hp')
    .setDescription('Set or show HP in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addIntegerOption(opt => opt.setName('value').setDescription('HP value to set (optional)'))
    .addUserOption(opt => opt.setName('player').setDescription('Player to set HP for (optional, DM only)')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const value = interaction.options.getInteger('value');
    const targetPlayer = interaction.options.getUser('player');
    
    try {
      const campaigns = db.listCampaigns();
      const c = campaigns.find(x => x.id === campaign || x.name === campaign);
      if (!c) return interaction.reply({ content: 'Campaign not found', ephemeral: true });
      
      // Determine whose HP we're checking/setting
      const targetId = targetPlayer?.id || interaction.user.id;
      const targetName = targetPlayer?.username || interaction.user.username;
      
      // If targeting someone else, verify DM or privileged user
      if (targetPlayer && targetId !== interaction.user.id) {
        const isDM = c.ownerId === interaction.user.id;
        if (!isDM) return interaction.reply({ content: 'Only DM can set other players\' HP', ephemeral: true });
      }
      
      // Show HP
      if (value === null) {
        const player = c.players.find(p => p.id === targetId);
        if (!player) return interaction.reply({ content: `${targetName} is not in this campaign`, ephemeral: true });
        return interaction.reply({ content: `${targetName} HP: ${player.hp ?? 'unknown'}`, ephemeral: false });
      }
      
      // Set HP
      const previousHP = c.players.find(p => p.id === targetId)?.hp ?? 0;
      const player = db.setHP(c.id, targetId, value);
      
      // Broadcast HP change
      bus.broadcast('hp.changed', {
        campaignId: c.id,
        playerId: targetId,
        playerName: player.name || targetName,
        previousHP,
        currentHP: value,
        setBy: interaction.user.username,
        timestamp: new Date().toISOString()
      });
      
      return interaction.reply({ content: `Set HP for ${player.name || targetName} to ${player.hp} (was ${previousHP})`, ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
