const { createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

/**
 * Voice Listener - Manages voice channel connection and audio capture
 * Emits audio chunks to be processed by transcription service
 */
class VoiceListener {
  constructor() {
    this.connections = new Map(); // campaignId -> VoiceConnection
    this.audioStreams = new Map(); // campaignId -> AudioStream
    this.isListening = new Map(); // campaignId -> boolean
    this.eventEmitters = new Map(); // campaignId -> EventEmitter for callbacks
  }

  /**
   * Join a voice channel and start listening
   * @param {VoiceChannel} voiceChannel
      * @param {string} campaignId
   * @returns {Promise<VoiceConnection>}
   */
  async joinVoiceChannel(voiceChannel, campaignId) {
    try {
      if (this.connections.has(campaignId)) {
        console.log(`Already listening in campaign ${campaignId}`);
        return this.connections.get(campaignId);
      }

      const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
      
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
      });

      // Handle connection states
      connection.on('stateChange', (oldState, newState) => {
        console.log(`Voice connection state changed: ${oldState.status} → ${newState.status}`);
        if (newState.status === VoiceConnectionStatus.Destroyed) {
          this.connections.delete(campaignId);
          this.isListening.delete(campaignId);
        }
      });

      // Wait for connection to be ready
      await entersState(connection, VoiceConnectionStatus.Ready, 10e3);
      
      this.connections.set(campaignId, connection);
      this.isListening.set(campaignId, true);
      
      console.log(`✅ Joined voice channel for campaign ${campaignId}`);
      return connection;
    } catch (err) {
      console.error('Failed to join voice channel:', err.message);
      throw err;
    }
  }

  /**
   * Leave a voice channel
   * @param {string} campaignId
   */
  leaveVoiceChannel(campaignId) {
    const connection = this.connections.get(campaignId);
    if (connection) {
      connection.destroy();
      this.connections.delete(campaignId);
      this.isListening.delete(campaignId);
      console.log(`✅ Left voice channel for campaign ${campaignId}`);
    }
  }

  /**
   * Register a callback for receiving transcribed speech
   * @param {string} campaignId
   * @param {Function} callback - (userId, transcribedText, userId) => Promise
   */
  onSpeech(campaignId, callback) {
    if (!this.eventEmitters.has(campaignId)) {
      this.eventEmitters.set(campaignId, {});
    }
    this.eventEmitters.get(campaignId).onSpeech = callback;
  }

  /**
   * Internal: emit speech event to callback
   * @param {string} campaignId
   * @param {string} userId
   * @param {string} transcribedText
   */
  async _emitSpeech(campaignId, userId, userName, transcribedText) {
    const callbacks = this.eventEmitters.get(campaignId);
    if (callbacks && callbacks.onSpeech) {
      try {
        await callbacks.onSpeech(userId, userName, transcribedText);
      } catch (err) {
        console.error(`Error in onSpeech callback: ${err.message}`);
      }
    }
  }

  /**
   * Check if listening in a campaign
   */
  isListeningTo(campaignId) {
    return this.isListening.get(campaignId) || false;
  }

  /**
   * Get all active listening campaigns
   */
  getActiveCampaigns() {
    return Array.from(this.isListening.entries())
      .filter(([_, isActive]) => isActive)
      .map(([campaignId, _]) => campaignId);
  }
}

module.exports = new VoiceListener();
