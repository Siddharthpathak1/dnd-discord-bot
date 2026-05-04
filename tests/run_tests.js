const diceTests = require('./dice.test');

try {
  diceTests.runAll();
  process.exit(0);
} catch (err) {
  console.error('Tests failed:', err);
  process.exit(1);
}
