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
    const campaign = {
      id: Date.now().toString(),
      name,
      ownerId,
      players: [],
      initiative: [],
      notes: [],
      rolls: [],
      roles: {},
      quests: [],
      npcs: [],
      titles: [],
      recaps: [],
      inventory: {},
      xp: {},
      ...extra
    };
    db.campaigns.push(campaign);
    write(db);
    return campaign;
  },
  joinCampaign(campaignName, userId, userName) {
    const db = read();
    const campaign = db.campaigns.find(c => c.name === campaignName || c.id === campaignName);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.players.find(p => p.id === userId)) campaign.players.push({ id: userId, name: userName, hp: null, conditions: [], xp: 0, inventory: [] });
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
  },
  setXP(campaignNameOrId, userId, xp) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.xp) campaign.xp = {};
    campaign.xp[userId] = xp;
    const player = campaign.players.find(p => p.id === userId);
    if (player) player.xp = xp;
    write(db);
    return xp;
  },
  addXP(campaignNameOrId, userId, amount) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.xp) campaign.xp = {};
    const current = Number(campaign.xp[userId] || 0);
    const next = current + Number(amount || 0);
    campaign.xp[userId] = next;
    const player = campaign.players.find(p => p.id === userId);
    if (player) player.xp = next;
    write(db);
    return next;
  },
  getXP(campaignNameOrId, userId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return Number((campaign.xp || {})[userId] || 0);
  },
  setInventory(campaignNameOrId, userId, items) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.inventory) campaign.inventory = {};
    campaign.inventory[userId] = items;
    const player = campaign.players.find(p => p.id === userId);
    if (player) player.inventory = items;
    write(db);
    return items;
  },
  addInventoryItem(campaignNameOrId, userId, item) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.inventory) campaign.inventory = {};
    if (!campaign.inventory[userId]) campaign.inventory[userId] = [];
    campaign.inventory[userId].push(item);
    const player = campaign.players.find(p => p.id === userId);
    if (player) player.inventory = campaign.inventory[userId];
    write(db);
    return campaign.inventory[userId];
  },
  getInventory(campaignNameOrId, userId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return (campaign.inventory || {})[userId] || [];
  },
  addQuest(campaignNameOrId, quest) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.quests) campaign.quests = [];
    campaign.quests.push(quest);
    write(db);
    return campaign.quests;
  },
  getQuests(campaignNameOrId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return campaign.quests || [];
  },
  addNpc(campaignNameOrId, npc) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.npcs) campaign.npcs = [];
    campaign.npcs.push(npc);
    write(db);
    return campaign.npcs;
  },
  getNpcs(campaignNameOrId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return campaign.npcs || [];
  },
  addTitle(campaignNameOrId, title) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.titles) campaign.titles = [];
    campaign.titles.push(title);
    write(db);
    return campaign.titles;
  },
  getTitles(campaignNameOrId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return campaign.titles || [];
  },
  addRecap(campaignNameOrId, recap) {
    const db = read();
    const campaign = db.campaigns.find(c => c.id === campaignNameOrId || c.name === campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    if (!campaign.recaps) campaign.recaps = [];
    campaign.recaps.push(recap);
    if (campaign.recaps.length > 20) campaign.recaps = campaign.recaps.slice(-20);
    write(db);
    return campaign.recaps;
  },
  getRecaps(campaignNameOrId) {
    const campaign = this.getCampaign(campaignNameOrId);
    if (!campaign) throw new Error('Campaign not found');
    return campaign.recaps || [];
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
