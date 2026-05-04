const assert = require('assert');
const dice = require('../services/dice');

function fixedRngFactory(seq) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i++;
    return v;
  };
}

function testParse() {
  const p = dice.parseDice('2d6+3');
  assert.strictEqual(p.count, 2);
  assert.strictEqual(p.sides, 6);
  assert.strictEqual(p.mod, 3);
}

function testRollSimple() {
  const rng = fixedRngFactory([0.0, 0.5]); // will produce 1 and 4 for d6
  const r = dice.rollDice('2d6+3', { rng });
  assert.strictEqual(Array.isArray(r.rolls), true);
  assert.strictEqual(r.rolls.length, 2);
  assert.strictEqual(typeof r.total, 'number');
}

function testAdvantage() {
  // rng returning 0.1 -> 3, 0.9 -> 19 for d20
  const rng = fixedRngFactory([0.1, 0.9]);
  const r = dice.rollDice('1d20', { rng, advantage: 'adv' });
  assert.strictEqual(r.rolls.length, 2);
  assert.strictEqual(r.chosen, Math.max(r.rolls[0], r.rolls[1]));
}

function runAll() {
  testParse();
  testRollSimple();
  testAdvantage();
  console.log('All dice tests passed');
}

module.exports = { runAll };
