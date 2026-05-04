const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const DEFAULT_BASE_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';

function isConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

async function chatJson({ system, user, schemaHint }) {
  if (!isConfigured()) return null;

  const response = await fetch(`${DEFAULT_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.9,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${user}\n\nReturn JSON only. ${schemaHint || ''}` }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI request failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI response was empty');
  return extractJson(content);
}

function fallbackCampaign({ theme, level, partySize, tone }) {
  const tag = theme || 'mystery';
  return {
    name: `The ${tag[0].toUpperCase()}${tag.slice(1)} Below`,
    summary: `A ${tone || 'dark'} campaign built for a level ${level || 1} party of ${partySize || 4} characters.`,
    hook: `A strange signal, ruin, or threat tied to ${tag} pulls the party into a dangerous new frontier.`,
    regions: [
      { name: 'Frontier Hub', type: 'hub', notes: 'A safe place to gear up, take jobs, and meet allies.' },
      { name: 'Outer Wastes', type: 'wilds', notes: 'Exploration, travel hazards, and scouting encounters.' },
      { name: 'Ruined Depths', type: 'ruins', notes: 'Ancient machinery, hidden lore, and hostile patrols.' }
    ],
    factions: [
      { name: 'The Wardens', goal: 'Hold the line and protect the settlement.' },
      { name: 'The Hollow Kin', goal: 'Survive in the dark and defend their territory.' }
    ],
    starterEncounters: [
      'Escort a supply caravan across dangerous terrain.',
      'Investigate a strange signal coming from the ruins.',
      'Clear out a nest threatening the frontier hub.'
    ],
    trailer: `In the shadows beneath the world, heroes are needed. ${theme ? `The tale of ${theme} begins now.` : 'Their legend begins in darkness.'}`
  };
}

function fallbackTrailer({ campaignName, summary }) {
  return {
    title: `${campaignName || 'The Next Adventure'} — Cinematic Trailer`,
    trailer: [
      'The camera glides through darkness.',
      `A world waits below the surface: ${summary || 'danger, mystery, and lost power.'}`,
      'Steel doors groan open. Torches flare. Shadows move.',
      'This is where legends are forged.'
    ],
    callToAction: 'Gather your party. The depths are calling.'
  };
}

function fallbackCharacter({ name, className, level }) {
  const levelValue = Number(level) || 2;
  return {
    name: name || 'Generated Hero',
    level: levelValue,
    class: className || 'Fighter',
    ancestry: 'Human',
    background: 'Dungeon Delver',
    alignment: 'Any good or neutral',
    personality: 'Curious, brave, and a little reckless',
    abilityScores: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    hp: 10 + levelValue * 6,
    ac: 14,
    equipment: ['Weapon of choice', 'Travel gear', 'Rations', 'Torch'],
    features: [`Level ${levelValue} class features`, 'One signature combat trick', 'One exploration specialty']
  };
}

async function generateCampaign({ theme, level, partySize, tone, style }) {
  const system = 'You are a veteran tabletop RPG campaign designer. Output concise JSON only.';
  const user = [
    'Create a campaign starter package for a Discord D&D bot.',
    `Theme: ${theme || 'any'}`,
    `Level range: ${level || '1-3'}`,
    `Party size: ${partySize || 4}`,
    `Tone: ${tone || 'epic dark fantasy'}`,
    `Style: ${style || 'cinematic, imaginative, adventurous'}`,
    'Include: name, summary, hook, regions (hub/wilds/ruins/dungeon), factions, starterEncounters, trailer, and a short intro line for the DM.'
  ].join('\n');

  try {
    const result = await chatJson({
      system,
      user,
      schemaHint: 'Expected keys: name, summary, hook, regions[], factions[], starterEncounters[], trailer, introLine.'
    });
    if (result) return result;
  } catch (error) {
    // Fall back to a local generator if the AI API is unavailable or returns invalid JSON.
  }
  return fallbackCampaign({ theme, level, partySize, tone });
}

async function generateTrailer({ campaignName, summary, hook, vibe }) {
  const system = 'You write cinematic trailers for tabletop RPG campaigns. Output concise JSON only.';
  const user = [
    `Campaign name: ${campaignName || 'Untitled Adventure'}`,
    `Summary: ${summary || 'An exciting new campaign.'}`,
    `Hook: ${hook || 'Adventure awaits below.'}`,
    `Vibe: ${vibe || 'cinematic, ominous, heroic'}`,
    'Generate title, trailer as an array of 4-6 short lines, and a callToAction.'
  ].join('\n');

  try {
    const result = await chatJson({
      system,
      user,
      schemaHint: 'Expected keys: title, trailer (array of strings), callToAction.'
    });
    if (result) return result;
  } catch (error) {
    // fall back below
  }
  return fallbackTrailer({ campaignName, summary, hook, vibe });
}

async function generateCharacter({ name, className, level, ancestry, background, tone }) {
  const system = 'You design D&D character sheets for players. Output concise JSON only.';
  const user = [
    `Character name: ${name || 'Unnamed Hero'}`,
    `Class: ${className || 'Fighter'}`,
    `Level: ${level || 2}`,
    `Ancestry: ${ancestry || 'Human'}`,
    `Background: ${background || 'Adventurer'}`,
    `Tone: ${tone || 'heroic'} `,
    'Generate level-appropriate ability scores, AC, HP, personality, equipment, and 3 simple features or tactics.'
  ].join('\n');

  try {
    const result = await chatJson({
      system,
      user,
      schemaHint: 'Expected keys: name, level, class, ancestry, background, alignment, personality, abilityScores, hp, ac, equipment, features.'
    });
    if (result) return result;
  } catch (error) {
    // fall back below
  }
  return fallbackCharacter({ name, className, level, ancestry, background, tone });
}

module.exports = {
  isConfigured,
  generateCampaign,
  generateTrailer,
  generateCharacter
};
