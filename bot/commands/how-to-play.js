const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('how-to-play')
    .setDescription('Step-by-step guide to play using the DND bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('How to Play — Tavern Master (Step-by-step)')
      .setColor(0x2b6cb0)
      .setDescription('A full walkthrough for running a session with the bot. Use the slash menu for parameter help.')
      .addFields(
        { name: '1) DM Setup', value: 'Create the campaign: `/create-campaign <name>` — the creator becomes the campaign owner (DM).', inline: false },
        { name: '2) Players Join', value: 'Players run `/join-campaign <id|name>` to join the campaign roster.', inline: false },
        { name: '3) Roles', value: 'Players can self-assign with `/role choose <name>` or use `/role auto` if the server setup supports it. DM can map roles with `/assign-role` (Manage Roles required).', inline: false },
        { name: '4) Visual Play', value: 'DM can create a map with `/map-create <name> <image>`, list maps with `/map-list`, place tokens with `/map-place`, move them with `/map-move`, and remove them with `/map-remove`. The browser viewer shows the map and live token updates.', inline: false },
        { name: '5) Initiative & Turns', value: 'Players add initiative with `/initiative <campaign> [value]`. DM advances turns with `/initiative-advance <campaign>` and can clear with `/initiative-clear <campaign>`. The viewer highlights the active turn.', inline: false },
        { name: '6) Combat Rolls', value: 'Use `/roll <expr> [mode] [campaign]` for attacks, damage, saves, and checks. Example modes include advantage and disadvantage.', inline: false },
        { name: '7) HP & Conditions', value: 'Set or view HP with `/hp <campaign> [value]`. Manage conditions with `/condition-add`, `/condition-remove`, and `/condition-list`.', inline: false },
        { name: '8) Table Tracking', value: 'View the last rolls with `/roll-history <campaign>`, check player status with `/list-players <campaign>`, and export campaign data with `/export-campaign` (DM-only).', inline: false },
        { name: '9) AI Content', value: 'Use `/ai-campaign` to generate a brand-new campaign, `/ai-trailer` for a cinematic trailer, and `/ai-character` for a level-based character sheet.', inline: false },
        { name: '10) Campaign Tools', value: 'DMs can create a starter game with `/campaign-seed lumenreach-depths`, then use `/help-dnd` for the command reference and `/how-to-play` for this walkthrough.', inline: false },
        { name: 'Quick Examples', value: '`/roll 2d6+3` — damage\n`/roll 1d20 advantage` — attack with advantage\n`/initiative Lumenreach 14` — add initiative\n`/hp Lumenreach 18` — set HP to 18\n`/map-create Lumen1 https://.../cavern.jpg` — create a map', inline: false },
        { name: 'Starter Hook (use for your session)', value: 'Lumenreach Depths: Miners discovered a ruined steampunk city below the earth. Mutated creatures and automaton murder-bots threaten the surface. The Order established an outpost — they need adventurers to clear nests and reclaim the depths.', inline: false }
      )
      .setFooter({ text: 'See /help-dnd for the full command list. The map viewer updates live when maps and tokens change.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
