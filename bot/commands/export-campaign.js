const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('export-campaign')
    .setDescription('Export campaign data as JSON (DM only)')
    .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true)),
  async execute(interaction) {
    const campaign = interaction.options.getString('campaign');
    try {
      const c = await require('../../services/auth').ensureCampaignOwner(interaction, campaign);
      const exportData = db.exportCampaign(campaign);
      await interaction.reply({ content: 'Exporting campaign data (attached).', files: [{ attachment: Buffer.from(JSON.stringify(exportData, null, 2)), name: `${exportData.name || exportData.id}.json` }], ephemeral: false });
    } catch (err) {
      if (err && err.name === 'AuthError') return interaction.reply({ content: err.message, ephemeral: true });
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
