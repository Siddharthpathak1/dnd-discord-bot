const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const voiceListener = require('../../services/voiceListener');
const voiceInterpreter = require('../../services/voiceInterpreter');
const voiceContext = require('../../services/voiceContext');
const bus = require('../../services/bus');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listen')
    .setDescription('Control voice channel listening for combat automation')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start listening in your current voice channel')
        .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('stop')
        .setDescription('Stop listening in a campaign')
        .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check listening status')
        .addStringOption(opt => opt.setName('campaign').setDescription('Campaign id or name (optional)'))
    ),
  
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const campaignInput = interaction.options.getString('campaign');

      if (subcommand === 'start') {
        return handleStartListening(interaction, campaignInput);
      } else if (subcommand === 'stop') {
        return handleStopListening(interaction, campaignInput);
      } else if (subcommand === 'status') {
        return handleStatus(interaction, campaignInput);
      }
    } catch (err) {
      console.error('Error in listen command:', err);
      return interaction.reply({
        content: `Error: ${err.message}`,
        ephemeral: true
      });
    }
  }
};

async function handleStartListening(interaction, campaignInput) {
  try {
    const campaign = db.getCampaign(campaignInput);
    if (!campaign) {
      return interaction.reply({
        content: 'Campaign not found',
        ephemeral: true
      });
    }

    // Verify user is DM
    if (campaign.ownerId !== interaction.user.id) {
      return interaction.reply({
        content: 'Only the DM can start voice listening',
        ephemeral: true
      });
    }

    // Check if user is in a voice channel
    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: '❌ You must be in a voice channel to start listening',
        ephemeral: true
      });
    }

    const voiceChannel = interaction.member.voice.channel;

    // Check if already listening
    if (voiceListener.isListeningTo(campaign.id)) {
      return interaction.reply({
        content: `✅ Already listening in this campaign in ${voiceChannel.name}`,
        ephemeral: false
      });
    }

    // Defer the response since joining voice can take a moment
    await interaction.deferReply({ ephemeral: false });

    // Initialize campaign context (set up all players, NPCs, speaker tracking)
    voiceInterpreter.initializeCampaignContext(campaign.id);
    
    // Broadcast party context to web viewers
    const party = voiceContext.getPartyContext(campaign.id);
    bus.broadcast('voice.campaign.initialized', {
      campaignId: campaign.id,
      campaignName: campaign.name,
      playerCount: party.players.length,
      npcCount: party.npcs.length,
      players: party.players.map(p => ({ name: p.name, level: p.level, role: p.role })),
      timestamp: new Date().toISOString()
    });

    // Join voice channel
    const connection = await voiceListener.joinVoiceChannel(voiceChannel, campaign.id);

    // Register speech handler
    voiceListener.onSpeech(campaign.id, async (userId, userName, transcribedText) => {
      try {
        // Minimum transcript length
        if (transcribedText.length < 3) return;

        const speakerIdentifier = voiceContext.getSpeakerIdentifier(campaign.id, userId);
        console.log(`[${campaign.name}] ${speakerIdentifier}: ${transcribedText}`);

        // Get queue info
        const queueSize = voiceContext.getQueueSize(campaign.id);
        const queueNotice = queueSize > 0 ? ` (${queueSize} actions queued)` : '';

        // Broadcast transcription to players with speaker context
        bus.broadcast('voice.transcribed', {
          campaignId: campaign.id,
          userId,
          userName,
          speakerIdentifier,
          text: transcribedText,
          queuePosition: queueSize,
          timestamp: new Date().toISOString()
        });

        // Interpret the speech
        const action = await voiceInterpreter.interpretCombatAction(
          transcribedText,
          campaign.id,
          userId,
          userName
        );

        // Apply the combat action if valid
        if (action.action !== 'unclear' && action.action !== 'unknown') {
          const result = await voiceInterpreter.applyCombatAction(
            action,
            campaign.id,
            userId,
            userName
          );

          if (result.applied) {
            // Broadcast action results with full context
            bus.broadcast('voice.action.applied', {
              campaignId: campaign.id,
              userId,
              userName,
              speakerIdentifier,
              action: action.action,
              rollExplanation: action.rollExplanation,
              narrative: action.narrative,
              results: result.results.map(r => ({
                type: r.type,
                target: r.target,
                amount: r.amount,
                rollExplanation: r.rollExplanation
              })),
              timestamp: new Date().toISOString()
            });
          } else {
            // Broadcast narrative even if no game state changed
            bus.broadcast('voice.narrative', {
              campaignId: campaign.id,
              userId,
              userName,
              speakerIdentifier,
              narrative: action.narrative,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error('Error processing voice action:', err.message);
        bus.broadcast('voice.error', {
          campaignId: campaign.id,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Setup periodic status broadcasts
    const statusInterval = setInterval(() => {
      if (!voiceListener.isListeningTo(campaign.id)) {
        clearInterval(statusInterval);
        voiceContext.clearCampaign(campaign.id);
        return;
      }

      const activeSpeakers = voiceContext.getActiveSpeakers(campaign.id);
      bus.broadcast('voice.status', {
        campaignId: campaign.id,
        activeSpeakers: activeSpeakers.slice(0, 3).map(s => ({
          name: s.userName,
          role: s.role,
          level: s.level,
          lastSpokeAt: s.lastSpokeAt
        })),
        queueSize: voiceContext.getQueueSize(campaign.id),
        timestamp: new Date().toISOString()
      });
    }, 30000); // Update every 30 seconds

    return interaction.editReply({
      content: `🎤 **Started listening in ${voiceChannel.name} for campaign "${campaign.name}"**\n\n👥 **Party Tracking Active:**\n${party.players.map(p => `- ${p.name} (${p.role} Lv${p.level}): ${p.hp}/${p.maxHp} HP`).join('\n')}\n\n📝 **How It Works:**\n- Players speak naturally in voice chat\n- AI interprets their intent (attack/heal/spell/dodge)\n- Uses each player's stats and role to determine modifiers\n- Damage/healing auto-applies to HP\n- XP auto-awards with level-up detection\n- Queue handles multiple simultaneous actions\n\n✋ Type \`/listen stop\` when done.`
    });
  } catch (err) {
    console.error('Error starting listening:', err);
    if (interaction.deferred) {
      return interaction.editReply({
        content: `Error starting listening: ${err.message}`
      });
    } else {
      return interaction.reply({
        content: `Error starting listening: ${err.message}`,
        ephemeral: true
      });
    }
  }
}

async function handleStopListening(interaction, campaignInput) {
  try {
    const campaign = db.getCampaign(campaignInput);
    if (!campaign) {
      return interaction.reply({
        content: 'Campaign not found',
        ephemeral: true
      });
    }

    if (!voiceListener.isListeningTo(campaign.id)) {
      return interaction.reply({
        content: `Not currently listening in campaign "${campaign.name}"`,
        ephemeral: true
      });
    }

    voiceListener.leaveVoiceChannel(campaign.id);
    voiceContext.clearCampaign(campaign.id); // Clean up context

    return interaction.reply({
      content: `🔇 Stopped listening in campaign "${campaign.name}"`
    });
  } catch (err) {
    console.error('Error stopping listening:', err);
    return interaction.reply({
      content: `Error stopping listening: ${err.message}`,
      ephemeral: true
    });
  }
}

async function handleStatus(interaction, campaignInput) {
  try {
    const activeCampaigns = voiceListener.getActiveCampaigns();

    if (campaignInput) {
      const campaign = db.getCampaign(campaignInput);
      if (!campaign) {
        return interaction.reply({
          content: 'Campaign not found',
          ephemeral: true
        });
      }

      const isListening = voiceListener.isListeningTo(campaign.id);
      return interaction.reply({
        content: isListening
          ? `🎤 **Listening:** Campaign "${campaign.name}" is currently listening in voice chat`
          : `🔇 **Not Listening:** Campaign "${campaign.name}" is not listening`,
        ephemeral: false
      });
    }

    if (activeCampaigns.length === 0) {
      return interaction.reply({
        content: '🔇 No campaigns are currently listening',
        ephemeral: false
      });
    }

    const campaignNames = activeCampaigns
      .map(cid => {
        const c = db.getCampaign(cid);
        return c ? c.name : cid;
      })
      .join(', ');

    return interaction.reply({
      content: `🎤 **Listening in:** ${campaignNames}`,
      ephemeral: false
    });
  } catch (err) {
    console.error('Error checking status:', err);
    return interaction.reply({
      content: `Error: ${err.message}`,
      ephemeral: true
    });
  }
}
