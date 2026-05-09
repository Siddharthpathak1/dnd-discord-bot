const ai = require('./ai');
const db = require('./db');
const voiceContext = require('./voiceContext');

/**
 * Interpret player speech and determine game actions (damage, heal, XP, etc)
 * Uses AI to understand natural language commands and game context
 */

/**
 * Initialize party context for a campaign (call when listening starts)
 * @param {string} campaignId
 */
function initializeCampaignContext(campaignId) {
  try {
    const campaign = db.getCampaign(campaignId);
    if (!campaign) return;

    // Set up all players and NPCs
    voiceContext.setPartyContext(
      campaignId,
      campaign.players || [],
      campaign.npcs || []
    );

    // Register all players as potential speakers
    (campaign.players || []).forEach(player => {
      voiceContext.registerSpeaker(campaignId, player.id, player.name, {
        hp: player.hp,
        xp: player.xp,
        role: player.role,
        class: player.class
      });
    });
  } catch (err) {
    console.error('Error initializing campaign context:', err.message);
  }
}

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

    // Register/update speaker with current stats
    voiceContext.registerSpeaker(campaignId, userId, userName, {
      hp: player.hp,
      xp: player.xp,
      role: player.role,
      class: player.class
    });

    // Queue the speech (handles multiple simultaneous speakers)
    const queuePosition = voiceContext.queueSpeech(campaignId, userId, transcribedText);

    // Build rich AI prompt with party context and speaker stats
    const prompt = voiceContext.buildAIPrompt(campaignId, userId, transcribedText);

    if (!prompt) {
      return {
        action: 'unknown',
        narrative: 'Could not build combat context.',
        error: 'Missing speaker context'
      };
    }

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
    result.modifierUsed = result.modifierUsed || 'Unknown';
    result.rollExplanation = result.rollExplanation || '';
    result.queuePosition = queuePosition;

    // Mark as processed
    voiceContext.markSpeechProcessed(campaignId, queuePosition);

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
 * Uses party context for better accuracy
 * @param {string} targetName - Name mentioned in speech
 * @param {string} campaignId
 * @returns {Object} { id, name, type: "player"|"npc"|"unknown" }
 */
function resolveTarget(targetName, campaignId) {
  if (!targetName) return { id: null, name: null, type: 'unknown' };

  const party = voiceContext.getPartyContext(campaignId);
  const targetLower = targetName.toLowerCase();

  // Check players (fuzzy match)
  const playerMatch = party.players.find(p =>
    p.name.toLowerCase().includes(targetLower) ||
    targetLower.includes(p.name.toLowerCase().split(' ')[0])
  );
  if (playerMatch) {
    return { id: playerMatch.id, name: playerMatch.name, type: 'player' };
  }

  // Check NPCs (fuzzy match)
  const npcMatch = party.npcs.find(n =>
    n.name.toLowerCase().includes(targetLower) ||
    targetLower.includes(n.name.toLowerCase().split(' ')[0])
  );
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
      const target = resolveTarget(action.target, campaignId);
      
      if (target.type !== 'unknown' && target.id) {
        if (target.type === 'player') {
          const damageResult = await combat.applyDamage(campaignId, target.id, action.damage, {
            attacker: attackerName,
            weaponName: action.modifierUsed ? `${action.modifierUsed} Attack` : 'attack',
            isCrit: action.critical
          });
          results.push({
            type: 'damage',
            target: target.name,
            amount: action.damage,
            result: damageResult,
            rollExplanation: action.rollExplanation
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
      const target = resolveTarget(action.target, campaignId);
      
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
  initializeCampaignContext,
  interpretCombatAction,
  resolveTarget,
  applyCombatAction
};
