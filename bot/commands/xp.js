const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const bus = require('../../services/bus');

function xpForLevel(level) {
  return Math.max(0, (level - 1) * 1000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('View or award XP in a campaign')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('XP to add (optional)'))
    .addUserOption(opt => opt.setName('player').setDescription('Player to award XP to (optional, DM only)')),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const amount = interaction.options.getInteger('amount');
    const targetPlayer = interaction.options.getUser('player');
    
    try {
      const campaigns = db.listCampaigns();
      const c = campaigns.find(x => x.id === campaign || x.name === campaign);
      if (!c) return interaction.reply({ content: 'Campaign not found', ephemeral: true });
      
      // Determine whose XP we're checking/awarding
      const targetId = targetPlayer?.id || interaction.user.id;
      const targetName = targetPlayer?.username || interaction.user.username;
      
      // If targeting someone else, verify DM
      if (targetPlayer && targetId !== interaction.user.id) {
        const isDM = c.ownerId === interaction.user.id;
        if (!isDM) return interaction.reply({ content: 'Only DM can award XP to other players', ephemeral: true });
      }
      
      // Award XP
      if (amount !== null) {
        const previousXP = db.getXP(campaign, targetId);
        const total = db.addXP(campaign, targetId, amount);
        const previousLevel = Math.floor(previousXP / 1000) + 1;
        const level = Math.floor(total / 1000) + 1;
        const leveledUp = level > previousLevel;
        
        // Broadcast XP award
        bus.broadcast('xp.awarded', {
          campaignId: c.id,
          playerId: targetId,
          playerName: targetName,
          xpAwarded: amount,
          previousXP,
          currentXP: total,
          currentLevel: previousLevel,
          newLevel: level,
          leveledUp,
          awardedBy: interaction.user.username,
          timestamp: new Date().toISOString()
        });
        
        let response = `Added ${amount} XP for ${targetName}. Total: ${total} XP (Level ${level})`;
        if (leveledUp) {
          response += ` 🎉 **LEVEL UP!**`;
        }
        return interaction.reply({ content: response, ephemeral: false });
      }
      
      // Show XP
      const total = db.getXP(campaign, targetId);
      const level = Math.floor(total / 1000) + 1;
      return interaction.reply({ content: `${targetName}: ${total} XP (Level ${level}, next at ${xpForLevel(level + 1)} XP)`, ephemeral: false });
    } catch (err) {
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
