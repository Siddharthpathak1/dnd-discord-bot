const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help-dnd').setDescription('Show DND bot help and commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Tavern Master — DND Bot Commands')
      .setColor(0x6b3fa0)
      .setDescription('A compact reference for available commands. Use the slash (/) menu in Discord for argument hints.')
      .addFields(
        { name: 'Campaigns', value: '/create-campaign <name> — create a campaign\n/list-campaigns — list campaigns\n/join-campaign <id|name> — join a campaign', inline: false },
        { name: 'Roles', value: '/role auto|choose <name?> — assign or choose a Discord role\n/assign-role — DM-only map roles for a campaign', inline: false },
        { name: 'Rolling', value: '/roll <expr> [mode] [campaign] — roll dice (e.g. 2d6+3)\n/roll-history <campaign> — view recent rolls', inline: false },
        { name: 'Combat & Tracking', value: '/initiative <campaign> [value] — add or show initiative\n/initiative-advance <campaign> — DM-only advance initiative\n/initiative-clear <campaign> — DM-only clear initiative\n/hp <campaign> [value] — set or show your HP', inline: false },
        { name: 'Conditions & Players', value: '/condition-add/remove/list — manage player conditions (add/remove DM-only)\n/list-players <campaign> — list players and their HP/conditions', inline: false },
        { name: 'Visuals & Maps', value: '/map-create <name> <image> — create a viewer map\n/map-list — list maps\n/map-place /map-move /map-remove — manage tokens on the map', inline: false },
        { name: 'Admin & Export', value: '/export-campaign — DM-only export campaign JSON\n/how-to-play — step-by-step guide', inline: false }
      )
      .setFooter({ text: 'Use the slash menu for parameter help • DM-only commands require campaign ownership or DM role' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
