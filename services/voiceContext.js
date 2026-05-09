/**
 * Multi-Speaker Voice Context Manager
 * Tracks active speakers, maps audio to users, maintains party context
 */

class VoiceContextManager {
  constructor() {
    this.activeSpeakers = new Map(); // campaignId -> {userId, userName, role, stats, lastSpokeAt}
    this.speechQueue = new Map(); // campaignId -> [{ userId, text, timestamp }]
    this.partyContext = new Map(); // campaignId -> {players: [], npcs: []}
  }

  /**
   * Register a speaker in a campaign
   * Called when we detect a user speaking
   * @param {string} campaignId
   * @param {string} userId
   * @param {string} userName
   * @param {Object} userStats - Player stats from DB
   */
  registerSpeaker(campaignId, userId, userName, userStats = {}) {
    if (!this.activeSpeakers.has(campaignId)) {
      this.activeSpeakers.set(campaignId, new Map());
    }

    const speakers = this.activeSpeakers.get(campaignId);
    speakers.set(userId, {
      userId,
      userName,
      role: userStats.role || 'Adventurer',
      hp: userStats.hp || 100,
      xp: userStats.xp || 0,
      level: Math.floor((userStats.xp || 0) / 1000) + 1,
      class: userStats.class || 'Unknown',
      lastSpokeAt: new Date()
    });
  }

  /**
   * Get speaker context (role, stats, level)
   * @param {string} campaignId
   * @param {string} userId
   */
  getSpeakerContext(campaignId, userId) {
    if (!this.activeSpeakers.has(campaignId)) return null;
    return this.activeSpeakers.get(campaignId).get(userId) || null;
  }

  /**
   * Get all active speakers in campaign (sorted by last spoken)
   * @param {string} campaignId
   */
  getActiveSpeakers(campaignId) {
    if (!this.activeSpeakers.has(campaignId)) return [];
    const speakers = Array.from(this.activeSpeakers.get(campaignId).values());
    return speakers.sort((a, b) => b.lastSpokeAt - a.lastSpokeAt);
  }

  /**
   * Queue speech for processing (handles multiple simultaneous speakers)
   * @param {string} campaignId
   * @param {string} userId
   * @param {string} text
   * @returns {number} Queue position
   */
  queueSpeech(campaignId, userId, text) {
    if (!this.speechQueue.has(campaignId)) {
      this.speechQueue.set(campaignId, []);
    }

    const queue = this.speechQueue.get(campaignId);
    const entry = {
      userId,
      text,
      timestamp: new Date(),
      processed: false
    };
    queue.push(entry);
    return queue.length - 1;
  }

  /**
   * Get next unprocessed speech from queue
   * @param {string} campaignId
   */
  getNextSpeech(campaignId) {
    const queue = this.speechQueue.get(campaignId) || [];
    return queue.find(s => !s.processed) || null;
  }

  /**
   * Mark speech as processed
   * @param {string} campaignId
   * @param {number} index
   */
  markSpeechProcessed(campaignId, index) {
    const queue = this.speechQueue.get(campaignId) || [];
    if (queue[index]) {
      queue[index].processed = true;
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(campaignId) {
    const queue = this.speechQueue.get(campaignId) || [];
    return queue.filter(s => !s.processed).length;
  }

  /**
   * Clear processed queue entries
   */
  clearProcessedQueue(campaignId) {
    const queue = this.speechQueue.get(campaignId) || [];
    this.speechQueue.set(campaignId, queue.filter(s => !s.processed));
  }

  /**
   * Set party context (all players and NPCs in campaign)
   * @param {string} campaignId
   * @param {Array} players - Player objects from DB
   * @param {Array} npcs - NPC objects from DB
   */
  setPartyContext(campaignId, players = [], npcs = []) {
    this.partyContext.set(campaignId, {
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        hp: p.hp,
        maxHp: p.maxHp || 100,
        role: p.role || 'Adventurer',
        xp: p.xp || 0,
        level: Math.floor((p.xp || 0) / 1000) + 1
      })),
      npcs: npcs.map(n => ({
        id: n.id,
        name: n.name,
        hp: n.hp || 30,
        role: n.role || 'Enemy'
      }))
    });
  }

  /**
   * Get party context for AI prompt
   * @param {string} campaignId
   */
  getPartyContext(campaignId) {
    return this.partyContext.get(campaignId) || { players: [], npcs: [] };
  }

  /**
   * Build rich AI prompt with full party context
   * @param {string} campaignId
   * @param {string} userId
   * @param {string} speech
   */
  buildAIPrompt(campaignId, userId, speech) {
    const speaker = this.getSpeakerContext(campaignId, userId);
    const party = this.getPartyContext(campaignId);
    const queueSize = this.getQueueSize(campaignId);

    if (!speaker) return null;

    const playersList = party.players
      .map(p => `- ${p.name} (Level ${p.level} ${p.role}): HP ${p.hp}/${p.maxHp}`)
      .join('\n');

    const npcsList = party.npcs
      .map(n => `- ${n.name}: HP ${n.hp}`)
      .join('\n');

    const prompt = `You are a D&D Dungeon Master AI interpreting live voice combat.

SPEAKER: ${speaker.userName}
SPEAKER ROLE: ${speaker.role} (Level ${speaker.level})
SPEAKER HP: ${speaker.hp}/100
SPEAKER CLASS: ${speaker.class}

PARTY STATUS:
${playersList || '(no players)'}

ENEMIES/NPCS:
${npcsList || '(no enemies)'}

SPEAKER SAID: "${speech}"

${queueSize > 0 ? `⚠️ NOTE: ${queueSize} other actions queued - keep this action brief and focused.` : ''}

TASK: Interpret the combat action and generate outcome.

RULES:
1. Use SPEAKER's stats for modifiers (e.g., Fighter attacks get STR bonus)
2. If healing spell, use WIS or INT based on class
3. Generate realistic damage/healing based on class abilities
4. Always identify the target from speech
5. Return ONLY valid JSON

RESPONSE FORMAT:
{
  "action": "attack|heal|spell|dodge|unclear",
  "target": "target name or null",
  "hit": true,
  "damage": 0,
  "healing": 0,
  "critical": false,
  "modifierUsed": "STR|DEX|WIS|INT|CON",
  "rollExplanation": "e.g., 1d20+3 (STR mod)",
  "xpReward": 0,
  "narrative": "Brief description of what happens"
}`;

    return prompt;
  }

  /**
   * Get speaker identifier for logging/display
   * @param {string} campaignId
   * @param {string} userId
   */
  getSpeakerIdentifier(campaignId, userId) {
    const speaker = this.getSpeakerContext(campaignId, userId);
    if (!speaker) return userId;
    return `${speaker.userName} (${speaker.role} Lv${speaker.level})`;
  }

  /**
   * Clear all context for campaign
   * @param {string} campaignId
   */
  clearCampaign(campaignId) {
    this.activeSpeakers.delete(campaignId);
    this.speechQueue.delete(campaignId);
    this.partyContext.delete(campaignId);
  }
}

module.exports = new VoiceContextManager();
