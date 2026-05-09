const ai = require('./ai');
const db = require('./db');

/**
 * Interpret player speech and determine game actions (damage, heal, XP, etc)
 * Uses AI to understand natural language commands and game context
 */

/**
 * Parse player speech and determine combat actions
 * @param {string} transcribedText - What the player said
 * @param {string} campaignId - Campaign ID
 * @param {string} userId - User ID of speaker
 * @param {string} userName - User name of speaker
 * @returns {Promise<Object>} { action, target, amount, narrative, xp }
 */
async function interpretCombatAction(transcribedText, campaignId, userId, userName) {
  try {
    const campaign = db.getCampaign(campaignId);
    if (!campaign) {
      return {
        action: 'unknown',
        error: 'Campaign not found',
        narrative: 'Campaign not found.'
      };
    }

    const player = campaign.players.find(p => p.id === userId);
    if (!player) {
      return {
        action: 'unknown',
        error: 'Player not in campaign',
        narrative: 'You are not in this campaign.'
      };
    }

    // Build campaign context for AI
    const otherPlayers = campaign.players
      .filter(p => p.id !== userId)
      .map(p => `- ${p.name}: HP ${p.hp || 100}, Level ${Math.floor((p.xp || 0) / 1000) + 1}`)
      .join('\n');

    const npcs = (campaign.npcs || [])
      .slice(0, 5)
      .map(n => `- ${n.name}: ${n.role || 'NPC'}, HP ${n.hp || 30}`)
      .join('\n');

    // AI prompt for combat interpretation
    const prompt = `You are a D&D Dungeon Master AI. A player just spoke in voice chat during combat.
    
PLAYER SPEECH: "${transcribedText}"
PLAYER NAME: ${userName}
PLAYER HP: ${player.hp || 100}

CAMPAIGN CONTEXT:
Other Players:
${otherPlayers || '(none)'}

NPCs/Enemies:
${npcs || '(none)'}

TASK: Interpret the player's spoken intent and generate a D&D combat outcome.

RULES:
1. If player intends to ATTACK: generate a hit/miss (roll 1d20 vs AC 12 default)
2. If player intends to HEAL: generate heal amount (1d8+2 typical for healing spell)
3. If player intends to CAST SPELL: determine spell effect and damage/healing
4. If player intends to DODGE/DEFEND: no damage dealt this turn
5. If speech is unclear or OOC: respond with action: "unclear"

DETERMINE:
- action: "attack" | "heal" | "spell" | "dodge" | "unclear"
- target: Name of enemy/player (or null if no valid target)
- hit: true/false (only for attacks)
- damage: 0-20 (only for attacks/spells that deal damage)
- healing: 0-20 (only for heals/spells that restore HP)
- critical: true/false (true if player rolled 20 or said "crit")
- xpReward: 0-100 (only if enemy defeated)
- narrative: 1-2 sentence description of what happens (max 100 chars)

RETURN ONLY VALID JSON (no markdown, no explanation):
{
  "action": "attack|heal|spell|dodge|unclear",
  "target": "enemy name or null",
  "hit": true,
  "damage": 8,
  "healing": 0,
  "critical": false,
  "xpReward": 0,
  "narrative": "Your sword strikes true! The goblin takes 8 damage."
}`;

    // Call AI with combat context
    const aiResponse = await ai.generateResponse(prompt);
    
    // Parse JSON response
    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', aiResponse);
      return {
        action: 'unknown',
        narrative: 'I didn\'t quite understand that. Try again!',
        error: 'AI parsing failed'
      };
    }

    // Validate response
    result.action = result.action || 'unclear';
    result.target = result.target || null;
    result.hit = result.hit !== false;
    result.damage = Math.max(0, Math.min(20, result.damage || 0));
    result.healing = Math.max(0, Math.min(20, result.healing || 0));
    result.critical = result.critical === true;
    result.xpReward = Math.max(0, result.xpReward || 0);
    result.narrative = (result.narrative || 'An action was taken.').substring(0, 150);

    return result;
  } catch (err) {
    console.error('Error interpreting combat action:', err.message);
    return {
      action: 'unknown',
      narrative: 'There was an error processing your action.',
      error: err.message
    };
  }
}

/**
 * Determine who the player is attacking/healing based on name mention
 * @param {string} targetName - Name mentioned in speech
 * @param {Array} players - Array of player objects
 * @param {Array} npcs - Array of NPC objects
 * @returns {Object} { id, name, type: "player"|"npc"|"unknown" }
 */
function resolveTarget(targetName, players, npcs) {
  if (!targetName) return { id: null, name: null, type: 'unknown' };

  const targetLower = targetName.toLowerCase();

  // Check players
  const playerMatch = players.find(p => p.name.toLowerCase().includes(targetLower));
  if (playerMatch) {
    return { id: playerMatch.id, name: playerMatch.name, type: 'player' };
  }

  // Check NPCs
  const npcMatch = npcs.find(n => n.name.toLowerCase().includes(targetLower));
  if (npcMatch) {
    return { id: npcMatch.id, name: npcMatch.name, type: 'npc' };
  }

  return { id: null, name: targetName, type: 'unknown' };
}

/**
 * Apply combat action result (damage, heal, XP)
 * @param {Object} action - Result from interpretCombatAction
 * @param {string} campaignId
 * @param {string} attackerId
 * @param {string} attackerName
 * @returns {Promise<Object>} { applied: boolean, results: Array }
 */
async function applyCombatAction(action, campaignId, attackerId, attackerName) {
  const results = [];

  try {
    if (!action || action.action === 'unclear' || action.action === 'dodge') {
      return { applied: false, results, narrative: action.narrative };
    }

    const combat = require('./combat');
    const campaign = db.getCampaign(campaignId);

    // Handle attacks with damage
    if (action.action === 'attack' && action.target && action.damage > 0) {
      const target = resolveTarget(action.target, campaign.players, campaign.npcs || []);
      
      if (target.type !== 'unknown' && target.id) {
        if (target.type === 'player') {
          const damageResult = await combat.applyDamage(campaignId, target.id, action.damage, {
            attacker: attackerName,
            weaponName: 'attack',
            isCrit: action.critical
          });
          results.push({
            type: 'damage',
            target: target.name,
            amount: action.damage,
            result: damageResult
          });

          // Award XP if target defeated
          if (damageResult.isDefeated && action.xpReward > 0) {
            const xpResult = await combat.awardXP(campaignId, attackerId, action.xpReward);
            results.push({
              type: 'xp',
              amount: action.xpReward,
              result: xpResult
            });
          }
        }
      }
    }

    // Handle heals
    if ((action.action === 'heal' || action.action === 'spell') && action.healing > 0) {
      const target = resolveTarget(action.target, campaign.players, campaign.npcs || []);
      
      if (target.type === 'player' && target.id) {
        const healResult = await combat.applyHeal(campaignId, target.id, action.healing, {
          healer: attackerName,
          spellName: 'healing spell'
        });
        results.push({
          type: 'heal',
          target: target.name,
          amount: action.healing,
          result: healResult
        });
      }
    }

    return {
      applied: results.length > 0,
      results,
      narrative: action.narrative
    };
  } catch (err) {
    console.error('Error applying combat action:', err.message);
    return {
      applied: false,
      results,
      error: err.message,
      narrative: 'There was an error applying that action.'
    };
  }
}

module.exports = {
  interpretCombatAction,
  resolveTarget,
  applyCombatAction
};
