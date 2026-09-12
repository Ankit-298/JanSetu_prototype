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

let currentSpeechId = 0;
let currentSarvamAudio = null;
let activeAbortController = null;

/**
 * Speak text in Hindi / English using Sarvam AI Bulbul V3 with browser fallback.
 * Strictly guarantees that only ONE voice ever plays at a time.
 */
async function speakText(text, langOrOnEnd, maybeOnEnd, maybeOnStart) {
  if (!text || !text.trim()) return;

  // Immediately kill any currently playing audio or speech synthesis
  stopSpeaking();

  const thisSpeechId = ++currentSpeechId;

  let lang = 'hi';
  let onEnd = null;
  let onStart = null;

  if (typeof langOrOnEnd === 'string') {
    lang = langOrOnEnd.startsWith('en') ? 'en' : 'hi';
    onEnd = maybeOnEnd;
    onStart = maybeOnStart;
  } else if (typeof langOrOnEnd === 'function') {
    onEnd = langOrOnEnd;
    onStart = maybeOnEnd;
  }

  // Network fetch with dedicated AbortController
  const controller = new AbortController();
  activeAbortController = controller;

  // Generous 4000ms timeout for Sarvam AI TTS (prevents false aborts that trigger duplicate browser speech)
  const timeoutId = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, 4000);

  try {
    const res = await fetch('/api/voice-agent/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        lang,
        speaker: 'aditya'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // If another speech was triggered while fetch was in flight, abort and discard!
    if (thisSpeechId !== currentSpeechId) return;

    if (res.ok) {
      const data = await res.json();
      if (thisSpeechId !== currentSpeechId) return;

      if (data.dataUrl) {
        // Ensure browser speech synthesis is completely stopped
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (currentSarvamAudio) {
          try { currentSarvamAudio.pause(); currentSarvamAudio.src = ''; } catch (e) {}
          currentSarvamAudio = null;
        }

        const audio = new Audio(data.dataUrl);
        currentSarvamAudio = audio;

        audio.onplay = () => {
          if (thisSpeechId === currentSpeechId && onStart) onStart();
        };
        audio.onended = () => {
          if (thisSpeechId === currentSpeechId) {
            currentSarvamAudio = null;
            if (onEnd) onEnd();
          }
        };
        audio.onerror = () => {
          if (thisSpeechId === currentSpeechId) {
            currentSarvamAudio = null;
            console.warn('[VoiceAgent] Sarvam audio playback error');
            if (onEnd) onEnd();
          }
        };

        if (thisSpeechId === currentSpeechId) {
          if (onStart) onStart();
          try {
            await audio.play();
          } catch (playErr) {
            console.warn('[VoiceAgent] Audio play error:', playErr);
            if (thisSpeechId === currentSpeechId && onEnd) onEnd();
          }
          return;
        }
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[VoiceAgent] TTS API error:', e.message || e);
    if (thisSpeechId === currentSpeechId && onEnd) onEnd();
    return;
  }

  // User requirement: "demo bole hi nhi api wala hi bole"
  // Demo browser speech synthesis is completely disabled — ONLY Sarvam API voice is allowed!
  if (thisSpeechId === currentSpeechId && onEnd) {
    onEnd();
  }
}

/**
 * Stop any current speech synthesis or audio playback immediately
 */
function stopSpeaking() {
  currentSpeechId++;

  if (activeAbortController) {
    try { activeAbortController.abort(); } catch (e) {}
    activeAbortController = null;
  }

  if (currentSarvamAudio) {
    try {
      currentSarvamAudio.pause();
      currentSarvamAudio.currentTime = 0;
      currentSarvamAudio.src = '';
    } catch (e) {}
    currentSarvamAudio = null;
  }

  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
}

export {
  AudioStreamer,
  speakText,
  stopSpeaking
};
