const db = require('./db');
const { PermissionFlagsBits } = require('discord.js');

class AuthError extends Error {}

/**
 * Ensure the interaction user is the owner of the campaign, OR a server admin, OR has a DM role.
 * Returns the campaign object on success.
 * Throws AuthError if not authorized or campaign not found.
 */
async function ensureCampaignOwner(interaction, campaignNameOrId) {
  const campaign = db.getCampaign(campaignNameOrId);
  if (!campaign) throw new AuthError('Campaign not found');

  // Server-level admin override
  try {
    if (interaction.guild && interaction.member && interaction.member.permissions) {
      if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return campaign;
    }
  } catch (e) {
    // ignore
  }

  // Role-based DM override
  if (memberHasRole(interaction, 'DM') || memberHasRole(interaction, 'Dungeon Master')) return campaign;

  if (interaction.user.id !== campaign.ownerId) throw new AuthError('Only the campaign owner (or a server admin/DM role) can perform this action');
  return campaign;
}

/**
 * Ensure the interaction user can manage maps.
 * Allows server admins and users with DM or Dungeon Master roles.
 */
function ensureMapManager(interaction) {
  try {
    if (interaction.guild && interaction.member && interaction.member.permissions) {
      if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    }
  } catch (e) {
    // ignore
  }

  if (memberHasRole(interaction, 'DM') || memberHasRole(interaction, 'Dungeon Master')) return true;
  throw new AuthError('Only a server admin or DM can manage maps');
}

/**
 * Check if interaction member has a role with the given name.
 */
function memberHasRole(interaction, roleName) {
  if (!interaction.guild || !interaction.member) return false;
  return interaction.member.roles.cache.some(r => r.name === roleName);
}

module.exports = { ensureCampaignOwner, ensureMapManager, memberHasRole, AuthError };
