const mapSelect = document.getElementById('mapSelect');
const campaignSelect = document.getElementById('campaignSelect');
const mapImage = document.getElementById('mapImage');
const tokensDiv = document.getElementById('tokens');
const eventsDiv = document.getElementById('events');
const initiativeDiv = document.getElementById('initiative');
const toggleGrid = document.getElementById('toggleGrid');
let currentMap = null;
let currentCampaign = null;

function fetchMaps() {
  return fetch('/api/maps').then(r => r.json());
}

function loadMap(map) {
  currentMap = map;
  mapImage.src = map.imageUrl;
  renderTokens(map.tokens || []);
}

function renderTokens(tokens) {
  tokensDiv.innerHTML = '';
  tokens.forEach(t => {
    const el = document.createElement('div');
    el.className = 'token';
    el.style.left = (t.x || 0) + '%';
    el.style.top = (t.y || 0) + '%';
    el.innerText = t.name;
    if (t.image) {
      el.style.backgroundImage = `url(${t.image})`;
      el.style.backgroundSize = 'cover';
    }
    tokensDiv.appendChild(el);
  });
}

function addEventLine(text) {
  const p = document.createElement('div');
  p.textContent = text;
  eventsDiv.prepend(p);
}

function renderInitiative(data) {
  const list = data.initiative || [];
  if (!list.length) {
    initiativeDiv.innerHTML = '<div class="muted">No initiative yet</div>';
    return;
  }
  initiativeDiv.innerHTML = '';
  list.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'turn' + (index === data.currentTurnIndex ? ' active' : '');
    row.textContent = `${index + 1}. ${entry.playerName || entry.playerId} — ${entry.value}`;
    initiativeDiv.appendChild(row);
  });
}

fetchMaps().then(list => {
  mapSelect.innerHTML = '';
  list.forEach(m => mapSelect.appendChild(new Option(`${m.name} (${m.id})`, m.id)));
  if (list.length) loadMap(list[0]);
});

fetch('/api/campaigns').then(r => r.json()).then(list => {
  campaignSelect.innerHTML = '';
  campaignSelect.appendChild(new Option('Select campaign', ''));
  list.forEach(c => campaignSelect.appendChild(new Option(`${c.name} (${c.id})`, c.id)));
});

mapSelect.addEventListener('change', () => {
  fetch(`/api/maps/${mapSelect.value}`).then(r => r.json()).then(loadMap);
});

campaignSelect.addEventListener('change', () => {
  if (!campaignSelect.value) return;
  currentCampaign = campaignSelect.value;
  fetch(`/api/campaigns/${campaignSelect.value}/initiative`).then(r => r.json()).then(renderInitiative);
});

toggleGrid.addEventListener('click', () => {
  document.getElementById('mapWrap').classList.toggle('grid');
});

// SSE events
const es = new EventSource('/events');
es.addEventListener('token.placed', e => {
  const data = JSON.parse(e.data);
  addEventLine(`Token placed: ${data.token.name} on map ${data.mapId}`);
  if (currentMap && currentMap.id === data.mapId) {
    currentMap.tokens.push(data.token);
    renderTokens(currentMap.tokens);
  }
});
es.addEventListener('token.moved', e => {
  const data = JSON.parse(e.data);
  addEventLine(`Token moved: ${data.token.name} -> ${data.token.x},${data.token.y}`);
  if (currentMap && currentMap.id === data.mapId) {
    const idx = currentMap.tokens.findIndex(t => t.id === data.token.id);
    if (idx !== -1) currentMap.tokens[idx] = data.token;
    renderTokens(currentMap.tokens);
  }
});
es.addEventListener('token.removed', e => {
  const data = JSON.parse(e.data);
  addEventLine(`Token removed: ${data.tokenId} on ${data.mapId}`);
  if (currentMap && currentMap.id === data.mapId) {
    currentMap.tokens = (currentMap.tokens || []).filter(t => t.id !== data.tokenId);
    renderTokens(currentMap.tokens);
  }
});

es.addEventListener('initiative.updated', e => {
  const data = JSON.parse(e.data);
  addEventLine(`Initiative updated for campaign ${data.campaignId}`);
  if (currentCampaign && data.campaignId === currentCampaign) renderInitiative(data);
});
