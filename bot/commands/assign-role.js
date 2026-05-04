const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const auth = require('../../services/auth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-role')
    .setDescription('Assign a role for a campaign (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    .addUserOption(opt => opt.setName('user').setDescription('User to assign').setRequired(true))
    .addStringOption(opt => opt.setName('role').setDescription('Role name to assign').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    const user = interaction.options.getUser('user');
    const roleName = interaction.options.getString('role');
    try {
      const c = await auth.ensureCampaignOwner(interaction, campaign);
      db.setRoleForUser(campaign, user.id, roleName);
      return interaction.reply({ content: `Assigned role '${roleName}' to ${user.username} for campaign ${c.name}`, ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
