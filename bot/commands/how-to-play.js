const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('how-to-play')
    .setDescription('Step-by-step guide to play using the DND bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('How to Play — Tavern Master (Step-by-step)')
      .setColor(0x2b6cb0)
      .setDescription('A concise walkthrough for running a session with the bot. Use the slash menu for parameter help.')
      .addFields(
        { name: '1) DM Setup', value: 'Create the campaign: `/create-campaign <name>` — the creator becomes the campaign owner (DM).', inline: false },
        { name: '2) Players Join', value: 'Players run `/join-campaign <id|name>` to join the campaign roster.', inline: false },
        { name: '3) Roles', value: 'Let players pick with `/role choose <name>` or DM maps roles with `/assign-role` (requires Manage Roles permission).', inline: false },
        { name: '4) Prepare Encounter', value: 'DM creates a viewer map with `/map-create` and can place tokens with `/map-place`. The browser viewer at the bot URL shows the map live.', inline: false },
        { name: '5) Initiative & Turns', value: 'Players add initiative with `/initiative <campaign> [value]`. DM advances turns with `/initiative-advance <campaign>` and can clear with `/initiative-clear <campaign>`.', inline: false },
        { name: '6) Rolling', value: 'Rolls use `/roll <expr> [mode] [campaign]` (examples below). Include the campaign to log the roll.', inline: false },
        { name: '7) HP & Conditions', value: 'Set or view HP with `/hp <campaign> [value]`. Use `/condition-add`, `/condition-remove`, `/condition-list` to manage conditions.', inline: false },
        { name: '8) Logs & Export', value: 'View roll history with `/roll-history <campaign>` and export campaign data as JSON with `/export-campaign` (DM-only).', inline: false },
        { name: 'Quick Examples', value: '`/roll 2d6+3` — damage\n`/roll 1d20 advantage` — attack with advantage\n`/hp Lumenreach 18` — set HP to 18', inline: false },
        { name: 'Starter Hook (use for your session)', value: 'Lumenreach Depths: Miners discovered a ruined steampunk city below the earth. Mutated creatures and automaton murder-bots threaten the surface. The Order established an outpost — they need adventurers to clear nests and reclaim the depths.', inline: false }
      )
      .setFooter({ text: 'See /help-dnd for the full command list. The map viewer updates live when maps and tokens change.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
