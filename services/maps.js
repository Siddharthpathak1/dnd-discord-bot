const fs = require('fs');
const path = require('path');
const bus = require('./bus');

const MAPS_PATH = path.join(__dirname, '..', 'data', 'maps.json');

function ensure() {
  const dir = path.dirname(MAPS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(MAPS_PATH)) fs.writeFileSync(MAPS_PATH, JSON.stringify({ maps: [] }, null, 2));
}

function read() {
  ensure();
  return JSON.parse(fs.readFileSync(MAPS_PATH, 'utf8'));
}

function write(data) {
  fs.writeFileSync(MAPS_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  listMaps() {
    const db = read();
    return db.maps;
  },
  createMap(name, ownerId, imageUrl) {
    const db = read();
    const map = { id: Date.now().toString(), name, ownerId, imageUrl, tokens: [] };
    db.maps.push(map);
    write(db);
    bus.broadcast('map.create', map);
    return map;
  },
  getMap(id) {
    const db = read();
    const map = db.maps.find(m => m.id === id || m.name === id);
    if (!map) throw new Error('Map not found');
    return map;
  },
  placeToken(mapId, token) {
    const db = read();
    const map = db.maps.find(m => m.id === mapId || m.name === mapId);
    if (!map) throw new Error('Map not found');
    token.id = Date.now().toString();
    map.tokens.push(token);
    write(db);
    bus.broadcast('token.placed', { mapId: map.id, token });
    return token;
  },
  moveToken(mapId, tokenId, x, y) {
    const db = read();
    const map = db.maps.find(m => m.id === mapId || m.name === mapId);
    if (!map) throw new Error('Map not found');
    const token = map.tokens.find(t => t.id === tokenId);
    if (!token) throw new Error('Token not found');
    token.x = x;
    token.y = y;
    write(db);
    bus.broadcast('token.moved', { mapId: map.id, token });
    return token;
  },
  removeToken(mapId, tokenId) {
    const db = read();
    const map = db.maps.find(m => m.id === mapId || m.name === mapId);
    if (!map) throw new Error('Map not found');
    const idx = map.tokens.findIndex(t => t.id === tokenId);
    if (idx === -1) throw new Error('Token not found');
    const [token] = map.tokens.splice(idx, 1);
    write(db);
    bus.broadcast('token.removed', { mapId: map.id, tokenId: token.id });
    return token;
  }
};
