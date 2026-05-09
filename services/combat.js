const db = require('./db');
const bus = require('./bus');
const ai = require('./ai');

/**
 * Apply damage to a target's HP and handle death/recovery automatically
 * @param {string} campaignId - Campaign ID
 * @param {string} targetId - Target user ID
 * @param {number} damageAmount - Damage to apply
 * @param {object} context - Additional context { attacker, weaponName, isCrit, etc }
 * @returns {object} Result with HP, isDefeated, etc
 */
async function applyDamage(campaignId, targetId, damageAmount, context = {}) {
  const campaign = db.getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  
  const target = campaign.players.find(p => p.id === targetId);
  if (!target) throw new Error('Target not found');
  
  const currentHP = target.hp ?? 100; // default to 100 if not set
  const newHP = Math.max(0, currentHP - damageAmount);
  
  // Update HP
  db.setHP(campaignId, targetId, newHP);
  
  const isDefeated = newHP <= 0;
  const isCriticalHit = context.isCrit || false;
  
  // Broadcast damage event to web viewers
  const damageEvent = {
    campaignId,
    targetId,
    targetName: target.name,
    damageAmount,
    attackerName: context.attacker || 'Unknown',
    previousHP: currentHP,
    currentHP: newHP,
    isDefeated,
    isCriticalHit,
    weaponName: context.weaponName || 'Attack',
    timestamp: new Date().toISOString()
  };
  
  bus.broadcast('damage.applied', damageEvent);
  
  // Auto-check for death/unconscious
  if (isDefeated) {
    // Add unconscious condition if not already present
    if (!target.conditions || !target.conditions.includes('Unconscious')) {
      try {
        db.addCondition(campaignId, targetId, 'Unconscious');
      } catch (err) {
        console.error('Could not add Unconscious condition:', err.message);
      }
    }
    
    // Broadcast defeat event
    bus.broadcast('player.defeated', {
      campaignId,
      playerId: targetId,
      playerName: target.name,
      finalHP: newHP,
      defeatedBy: context.attacker || 'Unknown'
    });
  }
  
  return {
    success: true,
    targetId,
    targetName: target.name,
    previousHP: currentHP,
    currentHP: newHP,
    damageAmount,
    isDefeated,
    weaponName: context.weaponName || 'Attack'
  };
}

/**
 * Award XP to a player and check for level-ups automatically
 * @param {string} campaignId - Campaign ID
 * @param {string} userId - User ID
 * @param {number} xpAmount - XP to award
 * @returns {object} Result with new XP, levelUp info, etc
 */
async function awardXP(campaignId, userId, xpAmount) {
  const campaign = db.getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  
  const player = campaign.players.find(p => p.id === userId);
  if (!player) throw new Error('Player not found');
  
  const currentXP = db.getXP(campaignId, userId);
  const newXP = currentXP + xpAmount;
  
  // Simple level calc: every 1000 XP = 1 level
  const currentLevel = Math.floor(currentXP / 1000) + 1;
  const newLevel = Math.floor(newXP / 1000) + 1;
  const leveledUp = newLevel > currentLevel;
  
  // Update XP
  db.addXP(campaignId, userId, xpAmount);
  
  // Broadcast XP award event
  const xpEvent = {
    campaignId,
    playerId: userId,
    playerName: player.name,
    xpAwarded: xpAmount,
    previousXP: currentXP,
    currentXP: newXP,
    currentLevel,
    newLevel,
    leveledUp,
    timestamp: new Date().toISOString()
  };
  
  bus.broadcast('xp.awarded', xpEvent);
  
  // If leveled up, broadcast level-up event
  if (leveledUp) {
    bus.broadcast('player.levelup', {
      campaignId,
      playerId: userId,
      playerName: player.name,
      newLevel,
      xp: newXP,
      timestamp: new Date().toISOString()
    });
  }
  
  return {
    success: true,
    playerId: userId,
    playerName: player.name,
    xpAwarded: xpAmount,
    newXP,
    currentLevel,
    newLevel,
    leveledUp
  };
}

/**
 * AI-driven combat resolution: attacker rolls, AI calculates hit/miss/crit,
 * auto-applies damage, awards XP on kill, all broadcast real-time
 * @param {string} campaignId - Campaign ID
 * @param {string} attackerId - Attacker user ID
 * @param {string} targetId - Target user ID
 * @param {number} attackRoll - Attack roll result (e.g., 1d20+5)
 * @param {number} targetAC - Target AC (default 10)
 * @returns {object} Combat resolution result
 */
async function aiResolveAttack(campaignId, attackerId, targetId, attackRoll, targetAC = 10) {
  const campaign = db.getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  
  const attacker = campaign.players.find(p => p.id === attackerId);
  const target = campaign.players.find(p => p.id === targetId);
  
  if (!attacker || !target) throw new Error('Attacker or target not found');
  
  // Determine hit/miss/crit
  const isCrit = attackRoll >= 20;
  const isMiss = attackRoll < targetAC;
  let damageRoll = 0;
  let combatMessage = '';
  
  if (isCrit) {
    combatMessage = `🎯 **CRITICAL HIT!** ${attacker.name} rolled **${attackRoll}** vs AC ${targetAC}!`;
    damageRoll = Math.floor(Math.random() * 8) + 1 + Math.floor(Math.random() * 8) + 1; // 2d8 for crit
  } else if (isMiss) {
    combatMessage = `❌ **MISS!** ${attacker.name} rolled **${attackRoll}**, but needed ${targetAC}!`;
    damageRoll = 0;
  } else {
    combatMessage = `✅ **HIT!** ${attacker.name} rolled **${attackRoll}** vs AC ${targetAC}!`;
    damageRoll = Math.floor(Math.random() * 6) + 1; // 1d6 normal damage
  }
  
  // Apply damage automatically if hit
  let damageResult = null;
  if (damageRoll > 0) {
    damageResult = await applyDamage(campaignId, targetId, damageRoll, {
      attacker: attacker.name,
      weaponName: 'Attack',
      isCrit: isCrit
    });
  }
  
  // If target is defeated, auto-award XP
  if (damageResult?.isDefeated) {
    await awardXP(campaignId, attackerId, 100); // Standard 100 XP per kill
  }
  
  return {
    success: true,
    attackerId,
    targetId,
    attackRoll,
    targetAC,
    hit: !isMiss,
    crit: isCrit,
    damage: damageRoll,
    message: combatMessage,
    damageResult
  };
}

/**
 * Heal a player's HP (reverse of damage)
 * @param {string} campaignId - Campaign ID
 * @param {string} targetId - Target user ID
 * @param {number} healAmount - HP to restore
 * @param {object} context - Additional context { healer, spellName, etc }
 * @returns {object} Result with HP change
 */
async function applyHeal(campaignId, targetId, healAmount, context = {}) {
  const campaign = db.getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  
  const target = campaign.players.find(p => p.id === targetId);
  if (!target) throw new Error('Target not found');
  
  const currentHP = target.hp ?? 100;
  const maxHP = context.maxHP || 100; // TODO: track max HP per player
  const newHP = Math.min(maxHP, currentHP + healAmount);
  const actualHeal = newHP - currentHP;
  
  // Update HP
  db.setHP(campaignId, targetId, newHP);
  
  // Remove Unconscious if HP > 0
  if (newHP > 0 && target.conditions && target.conditions.includes('Unconscious')) {
    try {
      db.removeCondition(campaignId, targetId, 'Unconscious');
    } catch (err) {
      console.error('Could not remove Unconscious condition:', err.message);
    }
  }
  
  // Broadcast heal event
  const healEvent = {
    campaignId,
    targetId,
    targetName: target.name,
    healAmount: actualHeal,
    healer: context.healer || 'Unknown',
    previousHP: currentHP,
    currentHP: newHP,
    spellName: context.spellName || 'Heal',
    timestamp: new Date().toISOString()
  };
  
  bus.broadcast('heal.applied', healEvent);
  
  return {
    success: true,
    targetId,
    targetName: target.name,
    previousHP: currentHP,
    currentHP: newHP,
    healAmount: actualHeal,
    spellName: context.spellName || 'Heal'
  };
}

module.exports = {
  applyDamage,
  awardXP,
  aiResolveAttack,
  applyHeal
};
