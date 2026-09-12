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
async function speakText(text, langOrOnEnd, maybeOnEnd, maybeOnStart) {
  if (!text) return;

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

  // Stop any currently playing speech
  stopSpeaking();

  // Try Sarvam AI Real-Time TTS first with strict timeout
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

  try {
    const res = await fetch('/api/voice-agent/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        lang,
        speaker: 'aditya'
      }),
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.dataUrl) {
        const audio = new Audio(data.dataUrl);
        currentSarvamAudio = audio;
        audio.onplay = () => {
          if (onStart) onStart();
        };
        audio.onended = () => {
          currentSarvamAudio = null;
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          currentSarvamAudio = null;
          fallbackBrowserSpeech(text, lang, onEnd, onStart);
        };
        if (onStart) onStart();
        await audio.play();
        return;
      }
    }
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    // Network or server issue -> fallback to browser speech
  }

  // Fallback to browser synthesis
  fallbackBrowserSpeech(text, lang, onEnd, onStart);
}

function fallbackBrowserSpeech(text, lang, onEnd, onStart) {
  if (!('speechSynthesis' in window)) {
    if (onStart) onStart();
    if (onEnd) setTimeout(onEnd, 1500);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Prefer Indian voice with natural Aditya tone
  const voices = window.speechSynthesis.getVoices();
  const langCode = lang === 'en' ? 'en' : 'hi';
  const maleVoice = voices.find(v => v.lang.includes(langCode) && /aditya|rishi|male|pradeep|hemant|ravi/i.test(v.name)) ||
                    voices.find(v => v.lang.includes('IN') && /aditya|rishi|male|pradeep|hemant|ravi/i.test(v.name));
  const matchedVoice = maleVoice ||
                       voices.find(v => (lang === 'en' ? v.lang.includes('en') : v.lang.includes('hi'))) ||
                       voices.find(v => v.name.includes('India') || v.lang.includes('IN'));

  if (matchedVoice) utterance.voice = matchedVoice;

  if (onStart) {
    utterance.onstart = onStart;
  }

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
