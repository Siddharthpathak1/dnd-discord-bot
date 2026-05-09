const { SlashCommandBuilder } = require('discord.js');
const dice = require('../../services/dice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice, e.g., 1d20+5 or 2d6')
    .addStringOption(opt => opt.setName('expr').setDescription('Dice expression').setRequired(true))
    .addStringOption(opt => opt.setName('mode').setDescription('adv or dis (only for d20)').addChoices(
      { name: 'normal', value: 'normal' },
      { name: 'advantage', value: 'adv' },
      { name: 'disadvantage', value: 'dis' }
    ))
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name (optional)'))
    .addStringOption(opt => opt.setName('damage-type').setDescription('Type of roll: damage, heal, or description').addChoices(
      { name: 'damage', value: 'damage' },
      { name: 'heal', value: 'heal' }
    ))
    .addUserOption(opt => opt.setName('target').setDescription('Target for damage/heal (optional)'))
    .addBooleanOption(opt => opt.setName('is-crit').setDescription('Mark as critical hit (optional)')),
  async execute(interaction) {
    const expr = interaction.options.getString('expr');
    const mode = interaction.options.getString('mode');
    const campaign = interaction.options.getString('campaign');
    const damageType = interaction.options.getString('damage-type');
    const target = interaction.options.getUser('target');
    const isCrit = interaction.options.getBoolean('is-crit') || false;
    
    try {
      const res = dice.rollDice(expr, { advantage: mode === 'normal' ? null : mode });
      const resultText = res.rolls ? `Roll ${expr}: ${res.rolls.join(', ')} ${res.mod ? ('+' + res.mod) : ''} = **${res.total}**` : `Result: **${res.total}**`;
      
      let fullResponse = resultText;
      
      // Auto-apply damage/heal if target and campaign are specified
      if (campaign && target && damageType) {
        try {
          const combat = require('../../services/combat');
          const db = require('../../services/db');
          
          if (damageType === 'damage') {
            const result = await combat.applyDamage(campaign, target.id, res.total, {
              attacker: interaction.user.username,
              isCrit: isCrit,
              weaponName: expr
            });
            fullResponse += `\n\n⚔️ **Damage Applied!**\n${target.username} takes **${res.total}** damage!`;
            if (result.isDefeated) {
              fullResponse += `\n💀 ${target.username} has been defeated!`;
            } else {
              fullResponse += `\nHP: ${result.previousHP} → **${result.currentHP}**`;
            }
          } else if (damageType === 'heal') {
            const result = await combat.applyHeal(campaign, target.id, res.total, {
              healer: interaction.user.username
            });
            fullResponse += `\n\n✨ **Healing Applied!**\n${target.username} heals for **${result.healAmount}** HP!`;
            fullResponse += `\nHP: ${result.previousHP} → **${result.currentHP}**`;
          }
        } catch (err) {
          console.error('Combat automation error:', err.message);
          fullResponse += `\n⚠️ Combat update failed: ${err.message}`;
        }
      }
      
      await interaction.reply({ content: fullResponse, ephemeral: false });
      
      // Log roll to DB
      if (campaign) {
        try {
          const db = require('../../services/db');
          await db.logRoll(campaign, {
            userId: interaction.user.id,
            userName: interaction.user.username,
            expr,
            mode: mode || 'normal',
            damageType: damageType || null,
            targetId: target?.id || null,
            targetName: target?.username || null,
            isCrit,
            result: res,
            ts: new Date().toISOString()
          });
        } catch (err) {
          console.error('Could not log roll to DB:', err.message);
        }
      }
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
