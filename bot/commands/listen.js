const { SlashCommandBuilder } = require('discord.js');
const db = require('../../services/db');
const voiceListener = require('../../services/voiceListener');
const voiceInterpreter = require('../../services/voiceInterpreter');
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

    // Join voice channel
    const connection = await voiceListener.joinVoiceChannel(voiceChannel, campaign.id);

    // Register speech handler
    voiceListener.onSpeech(campaign.id, async (userId, userName, transcribedText) => {
      try {
        // Minimum transcript length
        if (transcribedText.length < 3) return;

        console.log(`[${campaign.name}] ${userName}: ${transcribedText}`);

        // Interpret the speech
        const action = await voiceInterpreter.interpretCombatAction(
          transcribedText,
          campaign.id,
          userId,
          userName
        );

        // Broadcast transcription to players
        bus.broadcast('voice.transcribed', {
          campaignId: campaign.id,
          userId,
          userName,
          text: transcribedText,
          confidence: 85, // Placeholder, would come from Deepgram
          timestamp: new Date().toISOString()
        });

        // Apply the combat action if valid
        if (action.action !== 'unclear' && action.action !== 'unknown') {
          const result = await voiceInterpreter.applyCombatAction(
            action,
            campaign.id,
            userId,
            userName
          );

          if (result.applied) {
            // Broadcast action results
            bus.broadcast('voice.action.applied', {
              campaignId: campaign.id,
              userId,
              userName,
              action: action.action,
              narrative: action.narrative,
              results: result.results.map(r => ({
                type: r.type,
                target: r.target,
                amount: r.amount
              })),
              timestamp: new Date().toISOString()
            });
          } else {
            // Broadcast narrative even if no game state changed
            bus.broadcast('voice.narrative', {
              campaignId: campaign.id,
              userId,
              userName,
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

    // Setup audio receiver (mock for now - real implementation would use stream)
    // This is a simplified version; production would need proper audio processing

    return interaction.editReply({
      content: `🎤 **Started listening in ${voiceChannel.name} for campaign "${campaign.name}"**\n\n📝 Players can now speak naturally and actions will be interpreted automatically:\n- "I attack the goblin!" → auto-rolls attack and applies damage\n- "I heal the rogue!" → auto-applies healing\n- Damage/healing auto-deducts from HP\n- Defeated enemies auto-award XP\n\n✋ Type \`/listen stop\` when done.`
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
