const { Deepgram } = require('@deepgram/sdk');

let deepgram = null;

/**
 * Initialize Deepgram client (lazy initialization)
 */
function getDeepgramClient() {
  if (!deepgram) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ DEEPGRAM_API_KEY not set. Voice transcription will not work.');
      return null;
    }
    deepgram = new Deepgram({ apiKey });
  }
  return deepgram;
}

/**
 * Transcribe audio buffer to text
 * @param {Buffer} audioBuffer - Audio data
 * @returns {Promise<{text: string, confidence: number}>}
 */
async function transcribeAudio(audioBuffer) {
  try {
    const client = getDeepgramClient();
    if (!client) {
      return { text: '', confidence: 0, error: 'Deepgram not configured' };
    }

    // Deepgram prefers base64 for some operations
    const base64Audio = audioBuffer.toString('base64');
    
    const response = await client.transcription.preRecorded(
      {
        buffer: audioBuffer,
        mimetype: 'audio/wav'
      },
      {
        model: 'nova-2',
        language: 'en',
        punctuate: true,
        diarize: true, // Distinguish speakers
        smart_format: true,
        interim_results: false
      }
    );

    if (!response?.result?.results?.channels?.[0]?.alternatives?.[0]) {
      return { text: '', confidence: 0 };
    }

    const alternative = response.result.results.channels[0].alternatives[0];
    const transcript = alternative.transcript || '';
    const confidence = alternative.confidence || 0;

    return {
      text: transcript.trim(),
      confidence: Math.round(confidence * 100),
      words: alternative.words || []
    };
  } catch (err) {
    console.error('Deepgram transcription error:', err.message);
    return {
      text: '',
      confidence: 0,
      error: err.message
    };
  }
}

/**
 * Transcribe real-time audio stream (for live listening)
 * @param {Stream} audioStream
 * @param {Function} onTranscript - (text, confidence, isFinal) => void
 */
async function transcribeStream(audioStream, onTranscript) {
  try {
    const client = getDeepgramClient();
    if (!client) {
      console.warn('Deepgram not configured');
      return;
    }

    // Create live connection with Deepgram
    const liveTranscription = await client.listen.live({
      model: 'nova-2',
      language: 'en',
      punctuate: true,
      diarize: true,
      smart_format: true,
      vad: true // Voice activity detection to reduce noise
    });

    // Forward audio stream
    audioStream.pipe(liveTranscription);

    // Handle incoming transcriptions
    liveTranscription.on('transcriptReceived', (message) => {
      if (message?.channel?.alternatives?.[0]) {
        const alt = message.channel.alternatives[0];
        const text = alt.transcript || '';
        const confidence = alt.confidence || 0;
        const isFinal = !message.is_final;
        
        if (text) {
          onTranscript(text, Math.round(confidence * 100), isFinal);
        }
      }
    });

    liveTranscription.on('error', (err) => {
      console.error('Live transcription error:', err.message);
    });

    return liveTranscription;
  } catch (err) {
    console.error('Failed to start live transcription:', err.message);
    throw err;
  }
}

module.exports = {
  getDeepgramClient,
  transcribeAudio,
  transcribeStream
};
