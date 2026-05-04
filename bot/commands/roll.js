const { SlashCommandBuilder } = require('discord.js');
const dice = require('../../services/dice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice, e.g., 1d20+5 or 2d6')
    .addStringOption(opt => opt.setName('expr').setDescription('Dice expression').setRequired(true))
    .addStringOption(opt => opt.setName('mode').setDescription('adv or dis (only for d20)').addChoices(
      { name: 'normal', value: 'normal' },
      { name: 'advantage', value: 'adv' },
      { name: 'disadvantage', value: 'dis' }
    ))
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name (optional)')),
  async execute(interaction) {
    const expr = interaction.options.getString('expr');
    const mode = interaction.options.getString('mode');
    try {
      const res = dice.rollDice(expr, { advantage: mode === 'normal' ? null : mode });
      const campaign = interaction.options.getString('campaign');
      const resultText = res.rolls ? `Roll ${expr}: ${res.rolls.join(', ')} ${res.mod ? ('+' + res.mod) : ''} = **${res.total}**` : `Result: **${res.total}**`;
      await interaction.reply({ content: resultText, ephemeral: false });
      if (campaign) {
        try {
          const db = require('../../services/db');
          await db.logRoll(campaign, {
            userId: interaction.user.id,
            userName: interaction.user.username,
            expr,
            mode: mode || 'normal',
            result: res,
            ts: new Date().toISOString()
          });
        } catch (err) {
          // non-fatal: log to console
          console.error('Could not log roll to DB:', err.message);
        }
      }
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
