const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ai = require('../../services/ai');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-character')
    .setDescription('Generate a level-based character sheet with AI')
    .addStringOption(opt => opt.setName('name').setDescription('Character name'))
    .addStringOption(opt => opt.setName('class').setDescription('Class, e.g. Fighter, Wizard, Rogue'))
    .addIntegerOption(opt => opt.setName('level').setDescription('Character level').setMinValue(1).setMaxValue(20))
    .addStringOption(opt => opt.setName('ancestry').setDescription('Ancestry or species'))
    .addStringOption(opt => opt.setName('background').setDescription('Background'))
    .addStringOption(opt => opt.setName('tone').setDescription('Tone, e.g. heroic, edgy, noble, goofy')),

  async execute(interaction) {
    const name = interaction.options.getString('name') || 'Generated Hero';
    const className = interaction.options.getString('class') || 'Fighter';
    const level = interaction.options.getInteger('level') || 2;
    const ancestry = interaction.options.getString('ancestry') || 'Human';
    const background = interaction.options.getString('background') || 'Adventurer';
    const tone = interaction.options.getString('tone') || 'heroic';

    await interaction.deferReply({ ephemeral: false });

    try {
      const sheet = await ai.generateCharacter({ name, className, level, ancestry, background, tone });
      const abilities = sheet.abilityScores || {};
      const embed = new EmbedBuilder()
        .setTitle(`${sheet.name || name} — Level ${sheet.level || level} ${sheet.class || className}`)
        .setColor(0x2563eb)
        .setDescription(`${sheet.ancestry || ancestry} • ${sheet.background || background} • ${sheet.alignment || 'Unaligned'}`)
        .addFields(
          { name: 'Personality', value: sheet.personality || 'No personality returned', inline: false },
          { name: 'Stats', value: `STR ${abilities.str || '?'} | DEX ${abilities.dex || '?'} | CON ${abilities.con || '?'} | INT ${abilities.int || '?'} | WIS ${abilities.wis || '?'} | CHA ${abilities.cha || '?'}`, inline: false },
          { name: 'Combat', value: `HP ${sheet.hp || '?'} | AC ${sheet.ac || '?'}`, inline: true },
          { name: 'Equipment', value: (sheet.equipment || []).join('\n').slice(0, 1024) || 'None', inline: true },
          { name: 'Features', value: (sheet.features || []).map(f => `• ${f}`).join('\n').slice(0, 1024) || 'None', inline: false }
        )
        .setFooter({ text: 'Use this as a starting sheet or inspiration for a real character' });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return interaction.editReply({ content: `Error generating character: ${error.message}` });
    }
  }
};
