import React, { useState, useEffect, useRef } from 'react';
import { speakText, stopSpeaking } from './audioUtils';
import './voiceAgent.css';

/**
 * JanSetu Real-Time Voice AI Agent for Citizen Problem Reporting
 * Location: citizen/ai/AIReportAgent.jsx
 * 
 * Powered by Sarvam 105B Tool-Calling Engine over Node.js WebSocket.
 * Real-time Speaking / Listening / Processing visual state dock indicator.
 */
export default function AIReportAgent({ isOpen, onClose, onReportSubmitted }) {
  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isInitialCardOpen, setIsInitialCardOpen] = useState(true);
  const [phase, setPhase] = useState('intro_lang'); 
  // 'intro_lang' | 'assistance_choice' | 'driving_category' | 'driving_desc' | 'driving_priority' | 'driving_loc' | 'driving_photo' | 'driving_video' | 'driving_check' | 'done'
  
  const [lang, setLang] = useState('hi');
  const [agentSpeech, setAgentSpeech] = useState('Hi, main JanSetu AI hoon. Aap kis bhasha me baat karna chahenge?');
  const [userTranscript, setUserTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Real-time voice state: 'speaking' | 'listening' | 'processing' | 'muted'
  const [voiceStatus, setVoiceStatus] = useState('speaking');

  // Virtual White Dot Cursor State
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorClicking, setCursorClicking] = useState(false);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const phaseRef = useRef('intro_lang');
  const isMutedRef = useRef(false);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Safe speak wrapper with real-time speaking / listening state transitions
  const speak = (text) => {
    if (isMutedRef.current || !text) return;
    setAgentSpeech(text);
    setVoiceStatus('speaking');
    speakText(
      text,
      lang === 'en' ? 'en-IN' : 'hi-IN',
      () => {
        if (!isMutedRef.current) setVoiceStatus('listening');
      },
      () => {
        if (!isMutedRef.current) setVoiceStatus('speaking');
      }
    );
  };

  // Move the white dot cursor to any element and click it (snappy 300-350ms duration)
  const animateCursorToAndClick = (targetSelectorOrElement, callback, travelDuration = 350) => {
    const el = typeof targetSelectorOrElement === 'string' 
      ? document.querySelector(targetSelectorOrElement) 
      : targetSelectorOrElement;
    
    if (!el) {
      if (callback) callback();
      return;
    }

    const rect = el.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    setCursorVisible(true);
    setCursorPos({ x: targetX, y: targetY });

    setTimeout(() => {
      setCursorClicking(true);
      el.classList.add('ai-target-highlighted');

      setTimeout(() => {
        setCursorClicking(false);
        el.classList.remove('ai-target-highlighted');
        try { el.click(); } catch (e) {}
        if (callback) callback();
      }, 180);
    }, travelDuration);
  };

  // Connect to Node.js WebSocket Server
  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/voice-agent`;
      console.log(`[VoiceAgent] Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🎙️ [VoiceAgent] Connected to real-time WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleSocketMessage(msg);
        } catch (e) {
          console.warn('[VoiceAgent] Socket parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('🎙️ [VoiceAgent] WebSocket closed');
      };

      ws.onerror = (err) => {
        console.error('🎙️ [VoiceAgent] WebSocket error:', err);
      };

      socketRef.current = ws;
    } catch (err) {
      console.error('[VoiceAgent] Could not connect WebSocket:', err);
    }
  };

  // Send message safely to WebSocket
  const sendSocketMessage = (payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  // Send GPS location event to server
  const sendLocationCaptured = () => {
    const latEl = document.getElementById('reportLat') || document.getElementById('geoLat');
    const lngEl = document.getElementById('reportLng') || document.getElementById('geoLng');
    const distEl = document.getElementById('reportDistrict');
    const addrEl = document.getElementById('reportAddress') || document.getElementById('reportLocality');

    const lat = latEl && latEl.value ? parseFloat(latEl.value) : 23.3441;
    const lng = lngEl && lngEl.value ? parseFloat(lngEl.value) : 85.3096;
    const district = distEl && distEl.value ? distEl.value : 'Ranchi';
    const address = addrEl && addrEl.value ? addrEl.value : 'Jharkhand';

    sendSocketMessage({
      type: 'location_captured',
      location: { lat, lng, district, address }
    });
  };

  // Handle incoming tool calls and server events
  const handleSocketMessage = (msg) => {
    console.log('[VoiceAgent] Received server message:', msg);
    const { type } = msg;

    // 1. Agent Utterance / Spoken Output
    if (type === 'agent_utterance') {
      if (msg.text) {
        speak(msg.text);
      }
    }

    // 2. Select Category (Tool: save_problem_details)
    else if (type === 'select_category') {
      const catKey = msg.category || 'Urban Infrastructure';
      const catButtons = Array.from(document.querySelectorAll('#categoryChipsContainer .category-chip-btn'));
      const targetBtn = catButtons.find(b => {
        const oc = b.getAttribute('onclick') || '';
        return oc.toLowerCase().includes(catKey.toLowerCase());
      }) || catButtons.find(b => b.textContent.toLowerCase().includes(catKey.toLowerCase())) || catButtons[0];

      if (targetBtn) {
        animateCursorToAndClick(targetBtn, () => {
          setTimeout(() => {
            animateCursorToAndClick('#stepSection1 .btn-modal-primary', () => {
              setPhase('driving_desc');
            }, 250);
          }, 200);
        }, 300);
      }
    }

    // 3. Fill Details (Tool: save_problem_details)
    else if (type === 'fill_details') {
      const descEl = document.getElementById('reportDescription');
      const titleEl = document.getElementById('reportTitle');
      if (descEl && msg.description) descEl.value = msg.description;
      if (titleEl && msg.title) titleEl.value = msg.title;

      const prio = msg.priority || 'high';
      const prioRadio = document.querySelector(`input[name="priorityChoice"][value="${prio}"]`);
      const prioTarget = prioRadio ? (prioRadio.parentElement || prioRadio) : null;

      if (prioTarget) {
        animateCursorToAndClick(prioTarget, () => {
          if (prioRadio) prioRadio.checked = true;
          setTimeout(() => {
            animateCursorToAndClick('#stepSection2 .btn-modal-primary', () => {
              setPhase('driving_loc');
              // Auto-click GPS
              setTimeout(() => {
                animateCursorToAndClick('.btn-gps-autodetect', () => {
                  setTimeout(() => {
                    sendLocationCaptured();
                  }, 350);
                }, 300);
              }, 250);
            }, 250);
          }, 200);
        }, 300);
      }
    }

    // 4. Advance Step (Tool: advance_to_step)
    else if (type === 'advance_step') {
      const step = msg.step;
      if (step === 'photo') {
        animateCursorToAndClick('#stepSection3 .btn-modal-primary', () => {
          setPhase('driving_photo');
        }, 250);
      } else if (step === 'video') {
        setPhase('driving_video');
      } else if (step === 'check') {
        animateCursorToAndClick('#stepSection4 .btn-modal-primary', () => {
          setPhase('driving_check');
        }, 250);
      } else if (step === 'done') {
        finishCallGracefully();
      }
    }

    // 5. Duplicate Found
    else if (type === 'duplicate_found') {
      setPhase('driving_check');
      const dupBox = document.getElementById('duplicateNoticeBox');
      if (dupBox) dupBox.style.display = 'block';
    }

    // 6. Submission Confirmed
    else if (type === 'submission_confirmed') {
      const trackingId = msg.trackingId || 'JH-2026-CONFIRMED';
      speak(`Aapka problem number hai ${trackingId}. Problem safaltapoorvak darj ho gayi hai, aap check kar sakte hain My Reports me. Dhanyawad!`);
      if (onReportSubmitted) onReportSubmitted(trackingId);
      finishCallGracefully();
    }

    // 7. Twin Linked
    else if (type === 'twin_linked') {
      const trackingId = msg.trackingId;
      speak(`Problem pehle se darj shikayat ke sath safaltapoorvak link ho gayi hai. Tracking ID hai: ${trackingId}. Dhanyawad!`);
      if (onReportSubmitted) onReportSubmitted(trackingId);
      finishCallGracefully();
    }
  };

  // Setup Browser Speech Recognition to feed WebSocket
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === 'en' ? 'en-IN' : 'hi-IN';

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.trim();
        setUserTranscript(transcript);

        if (!isMutedRef.current) {
          setVoiceStatus('processing');
        }

        if (lastResult.isFinal && transcript) {
          handleUserUtterance(transcript);
        }
      };

      recognition.onend = () => {
        if (isCallActive && !isMutedRef.current) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('[VoiceAgent] Speech recognition error:', e);
    }
  };

  // User Utterance Handler (Forward to LLM WebSocket instead of regex tree)
  const handleUserUtterance = (text) => {
    const current = phaseRef.current;
    console.log(`[VoiceAgent] Spoken: "${text}" at Phase: ${current}`);
    const t = text.toLowerCase();

    // 1. Language Selection Phase (Click spoken card)
    if (current === 'intro_lang') {
      const isEnglish = /english|inglish|angrezi|angreji/i.test(t);
      if (isEnglish) {
        animateCursorToAndClick('#langCardEn', () => {
          handleSelectLanguage('en');
        }, 300);
      } else {
        animateCursorToAndClick('#langCardHi', () => {
          handleSelectLanguage('hi');
        }, 300);
      }
      return;
    }

    // 2. Assistance Choice Phase
    if (current === 'assistance_choice') {
      if (/status|sthiti|track|jaanch|kya hua|progress|jh-\d+/i.test(t)) {
        animateCursorToAndClick('#actionCardStatus', () => {
          handleCheckStatusAction(text);
        }, 300);
      } else {
        animateCursorToAndClick('#actionCardReport', () => {
          handleReportProblemAction();
        }, 300);
      }
      return;
    }

    // 3. Photo Phase
    if (current === 'driving_photo') {
      if (/haan|yes|photo|hai|upload|dikhao/i.test(t)) {
        animateCursorToAndClick('label.media-btn-tile', () => {
          speak(lang === 'en' ? 'Please upload the photo.' : 'Kripya samasya ki photo upload karein.');
          setTimeout(() => {
            sendSocketMessage({ type: 'photo_uploaded', url: '/uploads/sample_voice_evidence.jpg' });
          }, 1200);
        }, 300);
      } else {
        sendSocketMessage({ type: 'evidence_skipped' });
      }
      return;
    }

    // 4. Video Phase
    if (current === 'driving_video') {
      if (/haan|yes|video|hai|upload/i.test(t)) {
        const videoTile = Array.from(document.querySelectorAll('label.media-btn-tile'))[1];
        animateCursorToAndClick(videoTile || 'label.media-btn-tile', () => {
          sendSocketMessage({ type: 'video_uploaded', url: '/uploads/sample_voice_video.mp4' });
        }, 300);
      } else {
        sendSocketMessage({ type: 'evidence_skipped' });
      }
      return;
    }

    // 5. Duplicate Check / Final Submit Phase
    if (current === 'driving_check') {
      if (/haan|yes|link|jod|kardo|kar do|theek|sahi|submit/i.test(t)) {
        const dupBox = document.getElementById('duplicateNoticeBox');
        if (dupBox && dupBox.style.display !== 'none') {
          animateCursorToAndClick('button[data-i18n="btn_support_existing"]', () => {
            sendSocketMessage({ type: 'twin_decision', decision: 'link' });
          }, 300);
        } else {
          animateCursorToAndClick('#finalSubmitBtn', () => {
            sendSocketMessage({ type: 'confirm_submission' });
          }, 300);
        }
      }
      return;
    }

    // Otherwise, set processing state and forward to Sarvam LLM via WebSocket
    setVoiceStatus('processing');
    sendSocketMessage({
      type: 'user_utterance',
      text
    });
  };

  // Finish call gracefully and auto-disconnect after speech
  const finishCallGracefully = () => {
    setCursorVisible(false);
    setTimeout(() => {
      handleEndCall();
    }, 3500);
  };

  // Step 1: Language Selection Handler
  const handleSelectLanguage = (chosenLang) => {
    setLang(chosenLang);
    if (typeof window !== 'undefined' && typeof window.setLanguage === 'function') {
      try { window.setLanguage(chosenLang); } catch (e) {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current.lang = chosenLang === 'en' ? 'en-IN' : 'hi-IN';
      try { recognitionRef.current.start(); } catch (e) {}
    }
    sendSocketMessage({ type: 'select_language', lang: chosenLang });
    setPhase('assistance_choice');
    const prompt = chosenLang === 'en'
      ? 'Great! How can I help you today? You can report a new problem or check an existing one.'
      : 'Bahut accha! Batayiye, main aapki kya madad kar sakti hoon? Aap nayi samasya report kar sakte hain ya purani shikayat ki sthiti jaanch sakte hain.';
    speak(prompt);
  };

  // Status Inquiry Handler using MongoDB
  const handleCheckStatusAction = async (text = '') => {
    speak(lang === 'en' ? 'Checking your grievance records...' : 'Aapki shikayat ki sthiti jaanch rahe hain...');
    try {
      const matchId = text.match(/JH-\d{4}-\d+/i) || text.match(/\d{4,6}/);
      const res = await fetch('/api/voice-agent/status-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: matchId ? matchId[0] : null,
          citizenEmail: 'citizen@jansetu.in'
        })
      });
      const data = await res.json();
      if (data.speech) {
        speak(data.speech);
      }
    } catch (e) {
      speak(lang === 'en'
        ? 'Could not fetch status right now. You can check in My Reports.'
        : 'Is samay status prapt nahi ho saka. Kripya apna Tracking ID jaise JH-2026-XXXX batayein.');
    }
  };

  // Step 2: "Report Problem" trigger
  const handleReportProblemAction = () => {
    setIsInitialCardOpen(false);
    setPhase('driving_category');

    setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setCursorVisible(true);

    // Animate white dot to "+ समस्या दर्ज करें" button and open real modal
    setTimeout(() => {
      animateCursorToAndClick('.btn-report-hero, .btn-sidebar-report', () => {
        setTimeout(() => {
          const prompt = lang === 'en'
            ? 'Please describe your problem in detail. What is happening and where?'
            : 'Aapko kya samasya aa rahi hai? Batayiye, main sun rahi hoon.';
          speak(prompt);
        }, 300);
      }, 300);
    }, 200);
  };

  // Mute Toggle
  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        stopSpeaking();
        setVoiceStatus('muted');
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      } else {
        setVoiceStatus('listening');
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
      }
      return next;
    });
  };

  // End Call / Disconnect
  const handleEndCall = () => {
    stopSpeaking();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
      socketRef.current = null;
    }
    setCursorVisible(false);
    setIsCallActive(false);
    onClose();
  };

  // Initialize Session
  useEffect(() => {
    if (!isOpen) {
      handleEndCall();
      return;
    }

    setIsCallActive(true);
    setIsInitialCardOpen(true);
    setPhase('intro_lang');
    setCallDuration(0);
    setCursorVisible(false);

    timerRef.current = setInterval(() => {
      setCallDuration(p => p + 1);
    }, 1000);

    // Connect to WebSocket relay
    connectWebSocket();

    speak('Hi! Main JanSetu AI hoon. Aap kis bhasha me baat karna chahenge — Hindi ya English?');
    initSpeechRecognition();

    return () => {
      stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) {}
      }
    };
  }, [isOpen]);

  if (!isOpen || !isCallActive) return null;

  // Render Live Status Pill between Mute and End Call
  const renderStatusPill = () => {
    const currentStatus = isMuted ? 'muted' : voiceStatus;

    return (
      <div className={`floating-dock-status-pill ${currentStatus}`}>
        <div className={`status-wave-animation ${currentStatus}`}>
          <span className="wave-line w1" />
          <span className="wave-line w2" />
          <span className="wave-line w3" />
          <span className="wave-line w4" />
        </div>
        <div className="status-label-box">
          <span className="status-badge-text">
            {isMuted ? 'Muted' : (
              voiceStatus === 'speaking' ? 'Speaking...' :
              voiceStatus === 'processing' ? 'Processing...' : 'Listening...'
            )}
          </span>
          <span className="status-badge-sub">
            {isMuted ? 'Mic band hai' : (
              voiceStatus === 'speaking' ? 'AI bol rahi hai' :
              voiceStatus === 'processing' ? 'Samajh rahi hoon...' : 'Aap boliye...'
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── 1. ANTIGRAVITY BLUE GLOWING SCREEN PERIMETER AURA ── */}
      <div className="antigravity-voice-overlay" aria-hidden="true" />

      {/* ── 2. ANIMATED GLOWING WHITE DOT VIRTUAL CURSOR ── */}
      {cursorVisible && (
        <div
          className="ai-virtual-cursor-container"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`
          }}
        >
          <div className="ai-cursor-white-dot">
            <div className={`ai-cursor-ripple-ring ${cursorClicking ? 'clicking' : ''}`} />
          </div>
        </div>
      )}

      {/* ── 3. INITIAL DIALOGUE CARD (STEPS 1 & 2 ONLY - CLOSES ON REPORT ACTION) ── */}
      {isInitialCardOpen && (
        <div className="voice-agent-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleEndCall(); }}>
          <div className="voice-agent-modal-v2" role="dialog" aria-modal="true">
            
            {/* Top Navy Glassmorphism Header */}
            <div className="voice-header-v2">
              <div className="voice-header-left">
                <div className="voice-header-avatar-wrap">
                  <div className="voice-header-avatar-orb">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="rgba(255,255,255,0.2)"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </div>
                  <span className="voice-header-live-dot" />
                </div>

                <div className="voice-header-title-group">
                  <div className="voice-header-main-row">
                    <span className="voice-header-title">JanSetu Voice AI</span>
                    <span className="voice-header-powered-badge">SARVAM AI POWERED</span>
                  </div>
                  <div className="voice-header-sub-row">
                    <span className="voice-header-live-indicator"><span className="live-pulse-dot" /> Live</span>
                    <span className="voice-header-divider">|</span>
                    <span className="voice-header-tag">बोलकर रिपोर्ट करें</span>
                  </div>
                </div>
              </div>

              <div className="voice-header-right">
                <div className="header-visualizer-block">
                  <div className="header-soundwave-bars" aria-hidden="true">
                    <span className="h-bar hb1" />
                    <span className="h-bar hb2" />
                    <span className="h-bar hb3" />
                    <span className="h-bar hb4" />
                    <span className="h-bar hb5" />
                    <span className="h-bar hb6" />
                    <span className="h-bar hb7" />
                    <span className="h-bar hb8" />
                    <span className="h-bar hb9" />
                    <span className="h-bar hb10" />
                  </div>
                  <div className="header-slogan-wrap">
                    <span className="header-slogan-text">Aapki aawaaz, Behtar Jharkhand</span>
                    <svg className="tricolor-curve" viewBox="0 0 130 6" fill="none">
                      <path d="M2 3 Q65 6 128 3" stroke="url(#tricolorGrad)" strokeWidth="3" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="tricolorGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#FF9933" />
                          <stop offset="50%" stopColor="#FFFFFF" />
                          <stop offset="100%" stopColor="#138808" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="header-window-actions">
                  <button
                    type="button"
                    className="header-ctrl-btn"
                    onClick={() => setIsInitialCardOpen(false)}
                    title="Minimize"
                    aria-label="Minimize"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="header-ctrl-btn"
                    onClick={handleEndCall}
                    title="Close Call"
                    aria-label="Close Call"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* White Interior Body */}
            <div className="voice-modal-interior">
              {/* AI Greeting / Transcript Speech Bubble */}
              <div className="voice-speech-bubble-row">
                <div className="voice-speech-ai-avatar">AI</div>
                <div className="voice-speech-bubble-content">
                  <div className="voice-speech-bubble-greeting">
                    <strong>Hi! Main JanSetu AI hoon.</strong>
                  </div>
                  <div className="voice-speech-bubble-prompt">
                    Aap kis bhasha me baat karna chahenge?
                  </div>
                  {userTranscript && (
                    <div className="voice-speech-user-preview">
                      <span className="user-icon">🗣️</span>
                      <span className="user-quote">"{userTranscript}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Content: Language Choice vs Assistance Choice */}
              {phase === 'intro_lang' && (
                <div className="voice-lang-section">
                  <div className="voice-section-title-wrap">
                    <div className="voice-section-title">
                      <span className="globe-icon">🌐</span>
                      <span>अपनी भाषा चुनें / Choose Language</span>
                    </div>
                    <div className="voice-section-subtitle">
                      Aap bol sakte hain: "Hindi" ya "English"
                    </div>
                  </div>

                  <div className="voice-lang-cards-grid">
                    {/* Hindi Card with India Gate Monument Silhouette */}
                    <div
                      id="langCardHi"
                      className={`voice-lang-card ${lang === 'hi' ? 'selected' : ''}`}
                      onClick={() => handleSelectLanguage('hi')}
                    >
                      {lang === 'hi' && (
                        <div className="voice-card-check-badge">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}

                      <div className="voice-lang-card-main">
                        <div className="voice-country-badge">IN</div>
                        <div className="voice-lang-texts">
                          <div className="voice-lang-primary-title">हिंदी (Hindi)</div>
                          <div className="voice-lang-desc">बोलकर शिकायत दर्ज करें</div>
                        </div>
                      </div>

                      {/* Monument Landmark Watermark Graphic */}
                      <svg className="watermark-monument" viewBox="0 0 120 120" fill="currentColor" aria-hidden="true">
                        <path d="M15 110 h90 v-6 h-8 v-10 h4 v-4 h-4 v-4 h2 v-3 h-84 v3 h2 v4 h-4 v4 h4 v10 h-8 z M25 83 h70 v-6 h-6 v-40 h4 v-6 h-8 v-6 h-50 v6 h-8 v6 h4 v40 h-6 z M42 83 h36 v-28 c0 -10 -8 -18 -18 -18 s-18 8 -18 18 v28 z M35 25 h50 v-4 h-6 v-3 h-38 v3 h-6 z" />
                      </svg>
                    </div>

                    {/* English Card with Classical Monument Silhouette */}
                    <div
                      id="langCardEn"
                      className={`voice-lang-card ${lang === 'en' ? 'selected' : ''}`}
                      onClick={() => handleSelectLanguage('en')}
                    >
                      {lang === 'en' && (
                        <div className="voice-card-check-badge">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}

                      <div className="voice-lang-card-main">
                        <div className="voice-country-badge">GB</div>
                        <div className="voice-lang-texts">
                          <div className="voice-lang-primary-title">English</div>
                          <div className="voice-lang-desc">Speak and report issue</div>
                        </div>
                      </div>

                      {/* Classical Memorial Monument Watermark */}
                      <svg className="watermark-monument" viewBox="0 0 120 120" fill="currentColor" aria-hidden="true">
                        <path d="M20 110 h80 v-4 h-6 v-28 h6 v-4 h-80 v4 h6 v28 h-6 z M32 74 h6 v28 h-6 z M44 74 h6 v28 h-6 z M56 74 h6 v28 h-6 z M68 74 h6 v28 h-6 z M80 74 h6 v28 h-6 z M22 70 h76 l-38 -20 z M50 50 h20 c0 -11 -4 -20 -10 -20 s-10 9 -10 20 z M59 18 h2 v12 h-2 z" />
                      </svg>
                    </div>
                  </div>

                  {/* Trust & Feature Badges Strip */}
                  <div className="voice-trust-badges-strip">
                    <div className="trust-badge-item">
                      <div className="trust-badge-icon secure">🛡️</div>
                      <div className="trust-badge-text-wrap">
                        <div className="trust-badge-title">100% Secure</div>
                        <div className="trust-badge-sub">Your voice is safe</div>
                      </div>
                    </div>

                    <div className="trust-badge-item">
                      <div className="trust-badge-icon fast">⚡</div>
                      <div className="trust-badge-text-wrap">
                        <div className="trust-badge-title">Fast & Easy</div>
                        <div className="trust-badge-sub">Just speak</div>
                      </div>
                    </div>

                    <div className="trust-badge-item">
                      <div className="trust-badge-icon impact">👥</div>
                      <div className="trust-badge-text-wrap">
                        <div className="trust-badge-title">For a Better Jharkhand</div>
                        <div className="trust-badge-sub">Your voice creates change</div>
                      </div>
                    </div>

                    <div className="trust-badge-item">
                      <div className="trust-badge-icon available">🍃</div>
                      <div className="trust-badge-text-wrap">
                        <div className="trust-badge-title">Available 24×7</div>
                        <div className="trust-badge-sub">Always here to help</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {phase === 'assistance_choice' && (
                <div className="voice-assistance-section">
                  <div className="voice-section-title-wrap">
                    <div className="voice-section-title">
                      <span className="globe-icon">🤝</span>
                      <span>JanSetu Sahayata / How Can I Help?</span>
                    </div>
                    <div className="voice-section-subtitle">
                      Aap bol sakte hain: "Mujhe problem report karna hai"
                    </div>
                  </div>

                  <div className="white-action-grid">
                    <div
                      id="actionCardReport"
                      className="action-card-white"
                      onClick={handleReportProblemAction}
                    >
                      <div className="action-icon-pill">📝</div>
                      <div className="action-card-title">समस्या दर्ज करें</div>
                      <div className="action-card-sub">Report a Civic Grievance (सड़क, नाला, पानी, कचरा)</div>
                    </div>

                    <div
                      id="actionCardStatus"
                      className="action-card-white"
                      onClick={() => handleCheckStatusAction('status')}
                    >
                      <div className="action-icon-pill" style={{ background: '#FEF3C7', color: '#D97706' }}>🔍</div>
                      <div className="action-card-title">स्थिति जांचें</div>
                      <div className="action-card-sub">Track Existing Report (Status & Action taken)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Dark Navy Dock: Mute on left, Real-time Visualizer in center, Wide Red End Call on right */}
            <div className="voice-bottom-dock-v2">
              {/* Left: Circular Mute Button with glowing ring */}
              <button
                type="button"
                className={`dock-btn-round-mute ${isMuted ? 'muted' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="2" y1="2" x2="22" y2="22" stroke="#EF4444" strokeWidth="2.5" />
                    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" stroke="#FFFFFF" />
                    <path d="M5 10v2a7 7 0 0 0 12 5" stroke="#FFFFFF" />
                    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" stroke="#FFFFFF" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" stroke="#FFFFFF" />
                    <line x1="12" y1="19" x2="12" y2="22" stroke="#FFFFFF" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </button>

              {/* Center: Dynamic Visualizer Capsule with Glowing Emerald Waves, Text, and Divider */}
              <div className={`dock-center-visualizer ${isMuted ? 'muted' : voiceStatus}`}>
                <div className="dock-wave-bars-anim" aria-hidden="true">
                  <span className="dw-bar dw1" />
                  <span className="dw-bar dw2" />
                  <span className="dw-bar dw3" />
                  <span className="dw-bar dw4" />
                  <span className="dw-bar dw5" />
                  <span className="dw-bar dw6" />
                  <span className="dw-bar dw7" />
                </div>
                
                <div className="dock-status-info">
                  <span className="dock-status-heading">
                    {isMuted ? 'Mic Muted' : (
                      voiceStatus === 'speaking' ? 'Speaking...' :
                      voiceStatus === 'processing' ? 'Thinking...' : "I'm listening..."
                    )}
                  </span>
                  <span className="dock-status-subtext">
                    {isMuted ? 'Mic band hai' : (
                      voiceStatus === 'speaking' ? 'AI bol rahi hai' :
                      voiceStatus === 'processing' ? 'Samajh rahi hoon...' : 'Aap boliye...'
                    )}
                  </span>
                </div>

                <div className="dock-status-divider" aria-hidden="true" />
              </div>

              {/* Right: Wide Rounded Pill End Call Button */}
              <button
                type="button"
                className="floating-dock-end-btn"
                onClick={handleEndCall}
                title="End Call"
                aria-label="End Call"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="end-call-phone-icon">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 3.97c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-.99-1.09z" transform="rotate(135 12 12)"/>
                </svg>
                <span className="end-call-text">End Call</span>
              </button>
            </div>

            {/* Elegant Tagline at Bottom */}
            <div className="voice-card-footer-tagline">
              <span className="tagline-line" />
              <span className="tagline-text">Chhoti Baat Nahi, Bada Badlav</span>
              <span className="tagline-line" />
            </div>

          </div>
        </div>
      )}

      {/* ── 4. STANDALONE CENTER-BOTTOM CALL CONTROLS DOCK (AS SHOWN IN USER IMAGE) ── */}
      {!isInitialCardOpen && isCallActive && (
        <div className="voice-floating-center-dock" role="toolbar" aria-label="Voice Call Controls">
          {/* Left: Circular Mute Button with glowing ring */}
          <button
            type="button"
            className={`floating-dock-mute ${isMuted ? 'muted' : ''}`}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="2" y1="2" x2="22" y2="22" stroke="#EF4444" strokeWidth="2.5" />
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" stroke="#FFFFFF" />
                <path d="M5 10v2a7 7 0 0 0 12 5" stroke="#FFFFFF" />
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" stroke="#FFFFFF" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" stroke="#FFFFFF" />
                <line x1="12" y1="19" x2="12" y2="22" stroke="#FFFFFF" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}
          </button>

          {/* Center: Recessed Dark Capsule with Glowing Green Waves, Text & Divider */}
          <div className={`floating-dock-status-pill ${isMuted ? 'muted' : voiceStatus}`}>
            <div className="dock-wave-bars-anim" aria-hidden="true">
              <span className="dw-bar dw1" />
              <span className="dw-bar dw2" />
              <span className="dw-bar dw3" />
              <span className="dw-bar dw4" />
              <span className="dw-bar dw5" />
              <span className="dw-bar dw6" />
              <span className="dw-bar dw7" />
            </div>

            <div className="dock-status-info">
              <span className="dock-status-heading">
                {isMuted ? 'Mic Muted' : (
                  voiceStatus === 'speaking' ? 'Speaking...' :
                  voiceStatus === 'processing' ? 'Thinking...' : "I'm listening..."
                )}
              </span>
              <span className="dock-status-subtext">
                {isMuted ? 'Mic band hai' : (
                  voiceStatus === 'speaking' ? 'AI bol rahi hai' :
                  voiceStatus === 'processing' ? 'Samajh rahi hoon...' : 'Aap boliye...'
                )}
              </span>
            </div>

            <div className="dock-status-divider" aria-hidden="true" />
          </div>

          {/* Right: Wide Rounded Pill End Call Button */}
          <button
            type="button"
            className="floating-dock-end-btn"
            onClick={handleEndCall}
            title="End Call"
            aria-label="End Call"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="end-call-phone-icon">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 3.97c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-.99-1.09z" transform="rotate(135 12 12)"/>
            </svg>
            <span className="end-call-text">End Call</span>
          </button>
        </div>
      )}
    </>
  );
}

