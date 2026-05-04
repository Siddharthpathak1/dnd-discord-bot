const fs = require('fs');
const path = require('path');
const bus = require('./bus');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensure() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ campaigns: [], users: [] }, null, 2));
}

function read() {
  ensure();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  listCampaigns() {
    const db = read();
    return db.campaigns;
  },
  createCampaign(name, ownerId, extra = {}) {
    const db = read();
    if (db.campaigns.find(c => c.name === name)) throw new Error('Campaign already exists');
    const campaign = { id: Date.now().toString(), name, ownerId, players: [], initiative: [], notes: [], rolls: [], roles: {}, ...extra };
    db.campaigns.push(campaign);
    write(db);
    return campaign;
  },
  joinCampaign(campaignName, userId, userName) {
    const db = read();
    const campaign = db.campaigns.find(c => c.name === campaignName || c.id === campaignName);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.players.find(p => p.id === userId)) campaign.players.push({ id: userId, name: userName, hp: null, conditions: [] });
    write(db);
    return campaign;
  },
  addInitiative(campaignId, entry) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error('Campaign not found');
    campaign.initiative.push(entry);
    write(db);
    bus.broadcast('initiative.updated', { campaignId: campaign.id, initiative: campaign.initiative, currentTurnIndex: campaign.currentTurnIndex || 0 });
    return campaign.initiative;
  },
  advanceInitiative(campaignNameOrId) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.initiative || !campaign.initiative.length) throw new Error('No initiative entries');
    if (typeof campaign.currentTurnIndex !== 'number') campaign.currentTurnIndex = 0;
    campaign.currentTurnIndex = (campaign.currentTurnIndex + 1) % campaign.initiative.length;
    write(db);
    bus.broadcast('initiative.updated', { campaignId: campaign.id, initiative: campaign.initiative, currentTurnIndex: campaign.currentTurnIndex });
    return { index: campaign.currentTurnIndex, entry: campaign.initiative[campaign.currentTurnIndex] };
  },
  clearInitiative(campaignNameOrId) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    campaign.initiative = [];
    campaign.currentTurnIndex = 0;
    write(db);
    bus.broadcast('initiative.updated', { campaignId: campaign.id, initiative: [], currentTurnIndex: 0 });
    return campaign;
  },
  setHP(campaignId, userId, hp) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error('Campaign not found');
    const player = campaign.players.find(p => p.id === userId);
    if (!player) throw new Error('Player not in campaign');
    player.hp = hp;
    write(db);
    return player;
  }
  ,
  logRoll(campaignNameOrId, entry) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.rolls) campaign.rolls = [];
    campaign.rolls.push(entry);
    // keep last 200
    if (campaign.rolls.length > 200) campaign.rolls = campaign.rolls.slice(-200);
    write(db);
    return campaign.rolls;
  },
  getRollHistory(campaignNameOrId, limit = 20) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return (campaign.rolls || []).slice(-limit).reverse();
  },
  exportCampaign(campaignNameOrId) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return campaign;
  }
  ,
  addCondition(campaignNameOrId, userId, condition) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    const player = campaign.players.find(p => p.id === userId);
    if (!player) throw new Error('Player not in campaign');
    if (!player.conditions) player.conditions = [];
    if (!player.conditions.includes(condition)) player.conditions.push(condition);
    write(db);
    return player.conditions;
  },
  removeCondition(campaignNameOrId, userId, condition) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    const player = campaign.players.find(p => p.id === userId);
    if (!player) throw new Error('Player not in campaign');
    player.conditions = (player.conditions || []).filter(c => c !== condition);
    write(db);
    return player.conditions;
  },
  listConditions(campaignNameOrId, userId) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    const player = campaign.players.find(p => p.id === userId);
    if (!player) throw new Error('Player not in campaign');
    return player.conditions || [];
  },
  listPlayers(campaignNameOrId) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return campaign.players || [];
  }
  ,
  getCampaign(campaignNameOrId) {
    const db = read();
    return db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId) || null;
  },
  setRoleForUser(campaignNameOrId, userId, roleName) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.roles) campaign.roles = {};
    campaign.roles[userId] = roleName;
    write(db);
    return campaign.roles;
  },
  getRoleForUser(campaignNameOrId, userId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return (campaign.roles || {})[userId] || null;
  },
  getInitiative(campaignNameOrId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return { initiative: campaign.initiative || [], currentTurnIndex: campaign.currentTurnIndex || 0 };
  }
};
