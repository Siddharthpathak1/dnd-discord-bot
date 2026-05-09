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
        { name: 'Voice & Live', value: '/listen start|stop|status <campaign?> — have the bot join voice, transcribe, and auto-resolve actions (requires DEEPGRAM_API_KEY and AI_API_KEY)', inline: false },
        { name: 'AI Tools', value: '/ai-campaign <theme> [level] [party] [tone] — generate a new campaign\n/ai-trailer <campaign> [vibe] — generate a cinematic trailer\n/ai-character [name] [class] [level] [ancestry] [background] — generate a character sheet', inline: false },
        { name: 'Fun Systems', value: '/xp <campaign> [amount] — view or award XP\n/inventory <campaign> — view your loot\n/loot-add <campaign> <player> <item> — DM-only add an item to a player\n/quest-board <campaign> [quest] [status] — list or add quests\n/npc-create <campaign> <name> — create an NPC\n/npc-talk <campaign> <npc> <message> — talk to an NPC\n/random-encounter <campaign> — generate a scene\n/session-recap <campaign> — generate a story recap\n/award-title <campaign> <title> — DM-only award a title', inline: false },
        { name: 'Admin & Export', value: '/export-campaign — DM-only export campaign JSON\n/campaign-seed <theme> — DM-only create a starter seeded campaign\n/how-to-play — step-by-step guide', inline: false }
      )
      .setFooter({ text: 'Use the slash menu for parameter help • DM-only commands require campaign ownership or DM role' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
