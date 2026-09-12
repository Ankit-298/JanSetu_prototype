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

// Client-Side In-Memory Audio Cache for 0ms Zero-Latency Instant Playback
const clientAudioCache = new Map();

// Web Audio API Context & Analyser for Live Waveform Sync
let sharedAudioCtx = null;
let analyserNode = null;
let audioFrequencyData = null;

/**
 * Pre-warm browser audio subsystem on initial user interaction (unlocks mobile audio policy)
 */
function prewarmAudio() {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
        analyserNode = sharedAudioCtx.createAnalyser();
        analyserNode.fftSize = 64;
        audioFrequencyData = new Uint8Array(analyserNode.frequencyBinCount);
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    silent.play().then(() => silent.pause()).catch(() => {});
  } catch (e) {}
}

/**
 * Get real-time audio amplitude/volume (0 to 1) for live waveform visualization sync
 */
function getAudioVolume() {
  if (!analyserNode || !audioFrequencyData || !currentSarvamAudio || currentSarvamAudio.paused) {
    return 0;
  }
  try {
    analyserNode.getByteFrequencyData(audioFrequencyData);
    let total = 0;
    for (let i = 0; i < audioFrequencyData.length; i++) {
      total += audioFrequencyData[i];
    }
    const avg = total / audioFrequencyData.length;
    return Math.min(1, avg / 128); // Normalized 0 to 1
  } catch (e) {
    return 0;
  }
}

/**
 * Pre-fetch next step speech in the background so it plays in 0ms when citizen reaches that step
 */
async function prefetchSpeech(text, lang = 'hi') {
  if (!text || !text.trim()) return;
  const clean = text.trim();
  const cacheKey = `${lang}_aditya_${clean}`;
  if (clientAudioCache.has(cacheKey)) return;

  try {
    const res = await fetch('/api/voice-agent/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        lang,
        speaker: 'aditya'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.dataUrl) {
        clientAudioCache.set(cacheKey, data.dataUrl);
      }
    }
  } catch (e) {}
}

/**
 * Speak text in Hindi / English using Sarvam AI Bulbul V3 (Aditya tone).
 * 0ms instant playback when cached, with strict single-voice exclusivity.
 */
async function speakText(text, langOrOnEnd, maybeOnEnd, maybeOnStart) {
  if (!text || !text.trim()) return;

  // Immediately kill any currently playing audio
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

  const cleanText = text.trim();
  const cacheKey = `${lang}_aditya_${cleanText}`;

  // Helper to play an audio URL with analyser and lifecycle hooks
  const playDataUrl = async (dataUrl) => {
    if (thisSpeechId !== currentSpeechId) return;

    if (currentSarvamAudio) {
      try { currentSarvamAudio.pause(); currentSarvamAudio.src = ''; } catch (e) {}
      currentSarvamAudio = null;
    }

    const audio = new Audio(dataUrl);
    currentSarvamAudio = audio;

    // Connect to Web Audio API Analyser for Live Waveform Sync
    try {
      if (!sharedAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          sharedAudioCtx = new AudioCtx();
          analyserNode = sharedAudioCtx.createAnalyser();
          analyserNode.fftSize = 64;
          audioFrequencyData = new Uint8Array(analyserNode.frequencyBinCount);
        }
      }
      if (sharedAudioCtx && analyserNode) {
        const source = sharedAudioCtx.createMediaElementSource(audio);
        source.connect(analyserNode);
        analyserNode.connect(sharedAudioCtx.destination);
        if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
      }
    } catch (ctxErr) {}

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
        console.warn('[VoiceAgent] Audio playback error');
        if (onEnd) onEnd();
      }
    };

    if (thisSpeechId === currentSpeechId) {
      if (onStart) onStart();
      try {
        await audio.play();
      } catch (err) {
        console.warn('[VoiceAgent] Play error:', err);
        if (thisSpeechId === currentSpeechId && onEnd) onEnd();
      }
    }
  };

  // 1. INSTANT 0ms CACHE HIT: If already pre-fetched or spoken earlier
  if (clientAudioCache.has(cacheKey)) {
    await playDataUrl(clientAudioCache.get(cacheKey));
    return;
  }

  // 2. Network fetch with dedicated AbortController
  const controller = new AbortController();
  activeAbortController = controller;

  // Timeout for Sarvam AI TTS
  const timeoutId = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, 4500);

  try {
    const res = await fetch('/api/voice-agent/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
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
        // Cache dataUrl for next time
        clientAudioCache.set(cacheKey, data.dataUrl);
        await playDataUrl(data.dataUrl);
        return;
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[VoiceAgent] TTS API error:', e.message || e);
    if (thisSpeechId === currentSpeechId && onEnd) onEnd();
    return;
  }

  // Demo voice is completely disabled per requirement
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
  stopSpeaking,
  prefetchSpeech,
  prewarmAudio,
  getAudioVolume
};
