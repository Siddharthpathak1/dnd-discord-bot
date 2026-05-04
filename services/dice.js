function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function defaultRng() { return Math.random(); }

function parseDice(expr) {
  expr = expr.replace(/\s+/g, '');
  const m = expr.match(/^([0-9]*)d([0-9]+)([+-][0-9]+)?$/i);
  if (!m) throw new Error('Invalid dice expression');
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const mod = m[3] ? parseInt(m[3], 10) : 0;
  return { count, sides, mod };
}

function rollDice(expr, opts = {}) {
  const rng = opts.rng || defaultRng;
  const adv = opts.advantage || null; // 'adv' or 'dis'
  if ((expr === 'd20' || expr === '1d20') && adv) {
    // advantage/disadvantage: roll two d20s
    const r1 = randInt(rng, 1, 20);
    const r2 = randInt(rng, 1, 20);
    const chosen = adv === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2);
    return { total: chosen, rolls: [r1, r2], chosen };
  }

  const { count, sides, mod } = parseDice(expr);
  const rolls = [];
  for (let i = 0; i < count; i++) rolls.push(randInt(rng, 1, sides));
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  return { total, rolls, mod };
}

module.exports = { parseDice, rollDice };
