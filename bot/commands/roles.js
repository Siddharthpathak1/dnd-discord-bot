const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Choose or let the bot assign a role')
    .addStringOption(opt => opt.setName('action').setDescription('assign or choose').setRequired(true).addChoices(
      { name: 'auto', value: 'auto' },
      { name: 'choose', value: 'choose' }
    ))
    .addStringOption(opt => opt.setName('role').setDescription('Role name to choose')),
  async execute(interaction) {
    const action = interaction.options.getString('action');
    const roleName = interaction.options.getString('role');
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });

    if (action === 'auto') {
      // simple heuristic: create or use a role named "Player"
      let role = guild.roles.cache.find(r => r.name === 'Player');
      if (!role) {
        try {
          role = await guild.roles.create({ name: 'Player', reason: 'D&D player role' });
        } catch (err) {
          return interaction.reply({ content: `Could not create role: ${err.message}`, ephemeral: true });
        }
      }
      try {
        await interaction.member.roles.add(role);
        return interaction.reply({ content: `You were given the role: ${role.name}`, ephemeral: false });
      } catch (err) {
        return interaction.reply({ content: `Could not assign role: ${err.message}`, ephemeral: true });
      }
    }

    if (action === 'choose') {
      if (!roleName) return interaction.reply({ content: 'Please provide a role name to choose.', ephemeral: true });
      let role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        try {
          role = await guild.roles.create({ name: roleName, reason: 'D&D custom role' });
        } catch (err) {
          return interaction.reply({ content: `Could not create role: ${err.message}`, ephemeral: true });
        }
      }
      try {
        await interaction.member.roles.add(role);
        return interaction.reply({ content: `You were given the role: ${role.name}`, ephemeral: false });
      } catch (err) {
        return interaction.reply({ content: `Could not assign role: ${err.message}`, ephemeral: true });
      }
    }

    return interaction.reply({ content: 'Unknown action', ephemeral: true });
  }
};
