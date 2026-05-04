const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help-dnd').setDescription('Show DND bot help and commands'),
  async execute(interaction) {
    const helpText = [
      '/create-campaign <name> — create a campaign',
      '/list-campaigns — list campaigns',
      '/join-campaign <id|name> — join a campaign',
      '/role auto|choose <name?> — assign or choose a Discord role',
      '/roll <expr> [mode] [campaign] — roll dice; optional campaign logs the roll',
      '/roll-history <campaign> — view recent rolls',
      '/initiative <campaign> [value] — add or show initiative',
      '/initiative-advance <campaign> — DM-only advance initiative',
      '/initiative-clear <campaign> — DM-only clear initiative',
      '/hp <campaign> [value] — set or show your HP',
      '/condition-add/remove/list — manage player conditions (add/remove DM-only)',
      '/assign-role — DM-only assign a role mapping for a campaign',
      '/export-campaign — DM-only export campaign JSON',
      '/list-players <campaign> — list players and their HP/conditions'
    ].join('\n');
    await interaction.reply({ content: 'DND Bot Commands:\n' + helpText, ephemeral: true });
  }
};
