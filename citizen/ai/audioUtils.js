/**
 * Audio Utilities for JanSetu Voice AI Agent
 * Location: citizen/ai/audioUtils.js
 * 
 * Supports:
 * - 16kHz PCM Web Audio API streaming
 * - Text-to-Speech synthesis in Hindi / Hinglish with female Indian voice
 * - Browser speech recognition fallback
 */

class AudioStreamer {
  constructor(ws) {
    this.ws = ws;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isMuted = false;
  }

  async start() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send binary PCM frame
        this.ws.send(pcm16.buffer);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      return true;
    } catch (err) {
      console.warn('Microphone access warning:', err);
      return false;
    }
  }

  setMute(muteState) {
    this.isMuted = Boolean(muteState);
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(t => {
        t.enabled = !this.isMuted;
      });
    }
  }

  stop() {
    if (this.processor) {
      try { this.processor.disconnect(); } catch (e) {}
      this.processor = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }
}

let currentSarvamAudio = null;

/**
 * Speak text in Hindi / English using Sarvam AI Bulbul V3 with browser fallback
 */
async function speakText(text, langOrOnEnd, maybeOnEnd) {
  if (!text) return;

  let lang = 'hi';
  let onEnd = null;

  if (typeof langOrOnEnd === 'string') {
    lang = langOrOnEnd.startsWith('en') ? 'en' : 'hi';
    onEnd = maybeOnEnd;
  } else if (typeof langOrOnEnd === 'function') {
    onEnd = langOrOnEnd;
  }

  // Stop any currently playing speech
  stopSpeaking();

  // Try Sarvam AI Real-Time TTS first
  try {
    const res = await fetch('/api/voice-agent/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        lang,
        speaker: 'aditya'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.dataUrl) {
        const audio = new Audio(data.dataUrl);
        currentSarvamAudio = audio;
        audio.onended = () => {
          currentSarvamAudio = null;
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          currentSarvamAudio = null;
          fallbackBrowserSpeech(text, lang, onEnd);
        };
        await audio.play();
        return;
      }
    }
  } catch (e) {
    // Network or server issue -> fallback
  }

  // Fallback to browser synthesis
  fallbackBrowserSpeech(text, lang, onEnd);
}

function fallbackBrowserSpeech(text, lang, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) setTimeout(onEnd, 1500);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
  utterance.rate = 1.0;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => (lang === 'en' ? v.lang.includes('en') : v.lang.includes('hi'))) ||
                       voices.find(v => v.name.includes('India') || v.lang.includes('IN'));

  if (matchedVoice) utterance.voice = matchedVoice;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any current speech synthesis
 */
function stopSpeaking() {
  if (currentSarvamAudio) {
    try {
      currentSarvamAudio.pause();
      currentSarvamAudio.currentTime = 0;
    } catch (e) {}
    currentSarvamAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export {
  AudioStreamer,
  speakText,
  stopSpeaking
};
