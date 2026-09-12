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
            fallbackBrowserSpeech(text, lang, onEnd, onStart, thisSpeechId);
          }
        };

        if (thisSpeechId === currentSpeechId) {
          if (onStart) onStart();
          try {
            await audio.play();
          } catch (playErr) {
            if (thisSpeechId === currentSpeechId) {
              fallbackBrowserSpeech(text, lang, onEnd, onStart, thisSpeechId);
            }
          }
          return;
        }
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
    // If superseded by a newer utterance or aborted, DO NOT fall back!
    if (thisSpeechId !== currentSpeechId) return;
  }

  // Fallback to browser synthesis ONLY if this is still the active speech
  if (thisSpeechId === currentSpeechId) {
    fallbackBrowserSpeech(text, lang, onEnd, onStart, thisSpeechId);
  }
}

function fallbackBrowserSpeech(text, lang, onEnd, onStart, thisSpeechId) {
  if (thisSpeechId !== currentSpeechId) return;
  if (!('speechSynthesis' in window)) {
    if (onStart) onStart();
    if (onEnd) setTimeout(onEnd, 1200);
    return;
  }

  // Cancel any lingering queued speech synthesis
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

  utterance.onstart = () => {
    if (thisSpeechId === currentSpeechId && onStart) onStart();
  };

  utterance.onend = () => {
    if (thisSpeechId === currentSpeechId && onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (thisSpeechId === currentSpeechId && onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
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
