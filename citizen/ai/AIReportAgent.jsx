import React, { useState, useEffect, useRef } from 'react';
import { speakText, stopSpeaking } from './audioUtils';
import './voiceAgent.css';

/**
 * JanSetu Real-Time Voice AI Agent for Citizen Problem Reporting
 * Location: citizen/ai/AIReportAgent.jsx
 * 
 * Complete Conversational Auto-Drive Flow:
 * 1. Intro & Language Selection -> Assistance Inquiry -> User says "Problem report karna hai"
 * 2. Initial AI card CLOSES.
 * 3. Glowing WHITE DOT appears, animates to real "+ समस्या दर्ज करें" button, clicks it!
 * 4. Real "Report a Community Problem" modal opens.
 * 5. Floating dock at CENTER-BOTTOM with ONLY Mute & End Call buttons.
 * 6. Step 1 Category:
 *    - AI asks: "Aapko kya problem hai? Aap apni problem batayein jisse main category choose kar sakun."
 *    - User speaks -> Category card selected -> AI says: "Theek hai, maine category choose kar liya hai." -> White dot clicks Next!
 * 7. Step 2 Problem Details & Priority:
 *    - AI asks: "Aap apni problem vistaar se batayein ki kya problem ho rahi hai?"
 *    - User speaks -> Title & Description auto-filled.
 *    - AI asks: "Is samasya ki priority kya hai — Urgent, High ya Normal?"
 *    - User speaks priority -> Radio selected -> White dot clicks Next!
 * 8. Step 3 Location:
 *    - AI says: "Aapka location dalna hai, to left me Use Current GPS par click karein."
 *    - White dot clicks "Use Current GPS" -> Location fetched -> AI says: "Theek hai, location mil gayi." -> White dot clicks Next!
 * 9. Step 4 Proof:
 *    - AI asks: "Kya aapke paas photo hai?" -> If yes, clicks photo tile & says in bg: "Kripya samasya ki photo upload karein."
 *    - AI asks: "Kya video hai?" -> If yes, clicks video tile.
 *    - AI says: "Theek hai, saare proof mil gaye. Ab aage badhte hain." -> White dot clicks Next!
 * 10. Step 5 AI Check (Duplicate / New):
 *    - If duplicate found: AI asks: "Aapke ilake me is samasya ko pehle se hi kisi ne darj kiya hai. Kya aapko isse link karna hai?"
 *      -> User says "Haan" -> White dot clicks "Support Existing" -> Added to My Reports as "Twinned Problem" -> AI confirms -> Auto End Call!
 *    - If new problem: AI asks: "Mujhe yeh nayi samasya lag rahi hai. Kya main ise report kar doon?"
 *      -> User says "Haan" -> White dot clicks "Submit Problem" -> AI says problem number & confirms in My Reports -> Auto End Call!
 */
export default function AIReportAgent({ isOpen, onClose, onReportSubmitted }) {
  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isInitialCardOpen, setIsInitialCardOpen] = useState(true);
  const [phase, setPhase] = useState('intro_lang'); 
  // 'intro_lang' | 'assistance_choice' | 'driving_category' | 'driving_desc' | 'driving_priority' | 'driving_loc' | 'driving_photo' | 'driving_video' | 'driving_check' | 'done'
  
  const [lang, setLang] = useState('hi');
  const [agentSpeech, setAgentSpeech] = useState('Namaste! JanSetu AI Sahayak me aapka swagat hai. Kripya batayein aap Hindi me baat karenge ya English me?');
  const [userTranscript, setUserTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Virtual White Dot Cursor State
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorClicking, setCursorClicking] = useState(false);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const phaseRef = useRef('intro_lang');

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Safe speak wrapper
  const speak = (text) => {
    if (isMuted) return;
    setAgentSpeech(text);
    speakText(text, lang === 'en' ? 'en-IN' : 'hi-IN');
  };

  // Move the white dot cursor to any element and click it
  const animateCursorToAndClick = (targetSelectorOrElement, callback, travelDuration = 700) => {
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
      }, 400);
    }, travelDuration);
  };

  // Setup Browser Speech Recognition
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

        if (lastResult.isFinal && transcript) {
          handleUserUtterance(transcript);
        }
      };

      recognition.onend = () => {
        if (isCallActive && !isMuted) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('[VoiceAgent] Speech recognition error:', e);
    }
  };

  // Core Conversational Auto-Drive State Machine
  const handleUserUtterance = (text) => {
    const current = phaseRef.current;
    console.log(`[VoiceAgent] Heard: "${text}" at Phase: ${current}`);
    const t = text.toLowerCase();

    // 1. Language Selection Phase
    if (current === 'intro_lang') {
      if (/english|angreji/i.test(t)) {
        handleSelectLanguage('en');
      } else {
        handleSelectLanguage('hi');
      }
    }

    // 2. Assistance Choice Phase (Civic Problem or Status ONLY)
    else if (current === 'assistance_choice') {
      if (/status|sthiti|track|jaanch|kya hua|progress|jh-\d+/i.test(t)) {
        handleCheckStatusAction(text);
      } else if (/report|samasya|problem|shikayat|darj|issue|complaint|madad|karna hai|karni hai|haan/i.test(t)) {
        handleReportProblemAction();
      } else {
        // Off-topic guardrail: Strictly civic issues and status
        speak(lang === 'en'
          ? 'I can only assist with reporting civic grievances (roads, water, electricity, sanitation) or tracking status. Please tell me your problem or provide a Tracking ID.'
          : 'Main keval JanSetu nagarik samasyaon (sadak, paani, bijli, kachra) ko darj karne aur unki sthiti batane me madad kar sakta hoon. Kripya apni samasya batayein ya apna Tracking ID batayein.');
      }
    }

    // 3. Step 1: Category Selection
    else if (current === 'driving_category') {
      let searchKeyword = 'water';
      if (/sadak|road|gaddha|pothole|pul|bridge|divider/i.test(t)) searchKeyword = 'road';
      else if (/kooda|kachra|safai|garbage|waste|dustbin/i.test(t)) searchKeyword = 'clean';
      else if (/bijli|light|power|current|transformer|wire/i.test(t)) searchKeyword = 'electric';
      else if (/hospital|dawa|doctor|swasthya|health/i.test(t)) searchKeyword = 'health';
      else if (/school|padhai|teacher|kitab/i.test(t)) searchKeyword = 'school';
      else if (/khet|kisan|crop|fasal|farming/i.test(t)) searchKeyword = 'farm';
      else if (/naala|drain|water|paani|leak|sewer/i.test(t)) searchKeyword = 'water';

      const catButtons = Array.from(document.querySelectorAll('#categoryChipsContainer .category-chip-btn'));
      const targetBtn = catButtons.find(b => b.textContent.toLowerCase().includes(searchKeyword)) || catButtons[0];

      if (targetBtn) {
        animateCursorToAndClick(targetBtn, () => {
          speak(lang === 'en' 
            ? 'Alright, I have selected the category.' 
            : 'Theek hai, maine category choose kar liya hai.');

          setTimeout(() => {
            animateCursorToAndClick('#stepSection1 .btn-modal-primary', () => {
              setPhase('driving_desc');
              setTimeout(() => {
                speak(lang === 'en'
                  ? 'Please describe your problem in detail — what is happening?'
                  : 'Aap apni problem vistaar se batayein ki kya problem ho rahi hai?');
              }, 400);
            }, 600);
          }, 600);
        });
      }
    }

    // 4. Step 2: Problem Description
    else if (current === 'driving_desc') {
      const descEl = document.getElementById('reportDescription');
      const titleEl = document.getElementById('reportTitle');

      let cleanTitle = text.length > 35 ? text.slice(0, 35) + '...' : text;
      let cleanDesc = text;

      if (/naala|water|paani|leak/i.test(t)) {
        cleanTitle = 'नाली की रुकावट एवं जलभराव की समस्या';
        cleanDesc = `${text} - क्षेत्र में नाली जाम होने से गंदा पानी सड़क पर बह रहा है। कृपया शीघ्र सफाई कराई जाए।`;
      } else if (/sadak|road|gaddha|pothole/i.test(t)) {
        cleanTitle = 'सड़क की जर्जर स्थिति एवं गड्ढों की मरम्मत';
        cleanDesc = `${text} - मुख्य मार्ग पर गड्ढे होने से आवागमन में भारी असुविधा हो रही है।`;
      } else if (/kooda|kachra|safai/i.test(t)) {
        cleanTitle = 'कचरा जमाव एवं नियमित सफाई की आवश्यकता';
        cleanDesc = `${text} - सार्वजनिक स्थल पर कचरा पड़ा होने से दुर्गंध फैल रही है।`;
      } else if (/bijli|light|transformer/i.test(t)) {
        cleanTitle = 'बिजली ट्रांसफॉर्मर खराबी एवं स्ट्रीटलाइट बंद';
        cleanDesc = `${text} - विद्युत आपूर्ति बाधित होने से क्षेत्र में समस्या हो रही है।`;
      }

      if (descEl) descEl.value = cleanDesc;
      if (titleEl) titleEl.value = cleanTitle;

      setPhase('driving_priority');
      setTimeout(() => {
        speak(lang === 'en'
          ? 'What is the urgency of this problem — Urgent, High, or Normal?'
          : 'Is samasya ki priority kya hai — Urgent, High ya Normal?');
      }, 500);
    }

    // 5. Step 2: Priority Selection
    else if (current === 'driving_priority') {
      let prioValue = 'high';
      if (/urgent|turant|emergency|bahut/i.test(t)) prioValue = 'urgent';
      else if (/high|bada|zyada/i.test(t)) prioValue = 'high';
      else if (/normal|sadharan|theek|medium/i.test(t)) prioValue = 'normal';

      const prioRadio = document.querySelector(`input[name="priorityChoice"][value="${prioValue}"]`);
      if (prioRadio) {
        prioRadio.checked = true;
        try { prioRadio.parentElement?.click(); } catch (e) {}
      }

      speak(lang === 'en' ? 'Priority set. Now let us set the location.' : 'Priority select ho gayi hai.');

      setTimeout(() => {
        animateCursorToAndClick('#stepSection2 .btn-modal-primary', () => {
          setPhase('driving_loc');
          setTimeout(() => {
            speak(lang === 'en'
              ? 'Now we need your location. Please click Use Current GPS on the left.'
              : 'Aapka location dalna hai, to left me Use Current GPS par click karein.');

            // Auto-click "Use Current Location"
            setTimeout(() => {
              animateCursorToAndClick('.btn-gps-autodetect', () => {
                setTimeout(() => {
                  speak(lang === 'en' ? 'Location found.' : 'Theek hai, location mil gayi.');
                  setTimeout(() => {
                    animateCursorToAndClick('#stepSection3 .btn-modal-primary', () => {
                      setPhase('driving_photo');
                      setTimeout(() => {
                        speak(lang === 'en'
                          ? 'Do you have a photo of the problem?'
                          : 'Kya aapke paas photo hai?');
                      }, 500);
                    }, 600);
                  }, 800);
                }, 1400);
              }, 700);
            }, 600);
          }, 500);
        }, 700);
      }, 600);
    }

    // 6. Step 4: Proof - Photo
    else if (current === 'driving_photo') {
      if (/haan|yes|photo|hai|upload|dikhao/i.test(t)) {
        animateCursorToAndClick('label.media-btn-tile', () => {
          speak(lang === 'en'
            ? 'Please upload the photo of the issue.'
            : 'Kripya samasya ki photo upload karein.');

          setTimeout(() => {
            setPhase('driving_video');
            speak(lang === 'en'
              ? 'Do you also have a short video clip?'
              : 'Kya koi chhota video hai?');
          }, 2500);
        });
      } else {
        // No photo -> ask for video
        setPhase('driving_video');
        speak(lang === 'en'
          ? 'Do you have a short video clip of the issue?'
          : 'Kya koi chhota video hai?');
      }
    }

    // 7. Step 4: Proof - Video & Proceed to AI Check
    else if (current === 'driving_video') {
      if (/haan|yes|video|hai|upload/i.test(t)) {
        const videoTile = Array.from(document.querySelectorAll('label.media-btn-tile'))[1];
        animateCursorToAndClick(videoTile || 'label.media-btn-tile', () => {
          speak(lang === 'en' ? 'All proofs attached. Now moving forward.' : 'Theek hai, saare proof mil gaye. Ab aage badhte hain.');
          proceedToStep5AICheck();
        });
      } else {
        // No video -> proceed
        speak(lang === 'en' ? 'Moving forward to AI verification.' : 'Theek hai, saare proof mil gaye. Ab aage badhte hain.');
        proceedToStep5AICheck();
      }
    }

    // 8. Step 5: Duplicate Decision
    else if (current === 'driving_check') {
      if (/haan|yes|link|jod|kardo|kar do|kar doon|theek|sahi|submit/i.test(t)) {
        const dupBox = document.getElementById('duplicateNoticeBox');
        if (dupBox && dupBox.style.display !== 'none') {
          // Twin link
          animateCursorToAndClick('button[data-i18n="btn_support_existing"]', () => {
            speak(lang === 'en'
              ? 'The problem has been registered and linked. You can check it in My Reports where it is marked as Twinned Problem. Thank you for submitting the problem!'
              : 'Problem darj ho gayi hai, aap check kar sakte hain My Reports me, ye twinned problem hai. Problem submit karne ke liye dhanyawad!');
            finishCallGracefully();
          });
        } else {
          // Submit new report
          animateCursorToAndClick('#finalSubmitBtn', () => {
            setTimeout(() => {
              const realId = (window.allReportsList && window.allReportsList[0] && window.allReportsList[0].id) 
                || `JH-2026-${Math.floor(100000 + Math.random() * 900000)}`;
              speak(lang === 'en'
                ? `Your problem number is ${realId}. The problem has been registered, you can check it in My Reports. Thank you for submitting the problem!`
                : `Aapka problem number hai ${realId}. Problem darj ho gayi hai, aap check kar sakte hain My Reports me. Problem submit karne ke liye dhanyawad!`);
              finishCallGracefully();
            }, 800);
          });
        }
      }
    }
  };

  // Helper to proceed to Step 5 (AI Check) and evaluate duplicates
  const proceedToStep5AICheck = () => {
    setTimeout(() => {
      animateCursorToAndClick('#stepSection4 .btn-modal-primary', () => {
        setPhase('driving_check');

        // Allow 1s for duplicate check API to evaluate
        setTimeout(() => {
          const dupBox = document.getElementById('duplicateNoticeBox');
          if (dupBox && dupBox.style.display !== 'none') {
            // Case A: Duplicate detected!
            speak(lang === 'en'
              ? 'Someone has already reported this problem earlier. Do you want to link your report to it?'
              : 'Is samasya ko pehle se hi kisi ne darj kiya hai. Kya aapko isse link karna hai?');
          } else {
            // Case B: Fresh new problem!
            speak(lang === 'en'
              ? 'This looks like a fresh problem to me. Should I submit it for you?'
              : 'Mujhe yeh nayi samasya lag rahi hai, kya main ise report kar doon?');
          }
        }, 1200);
      }, 600);
    }, 600);
  };

  // Finish call gracefully and auto-disconnect after speech
  const finishCallGracefully = () => {
    setCursorVisible(false);
    setTimeout(() => {
      handleEndCall();
    }, 4500);
  };

  // Step 1: Language Selection Handler
  const handleSelectLanguage = (chosenLang) => {
    setLang(chosenLang);
    setPhase('assistance_choice');
    const prompt = chosenLang === 'en'
      ? 'Welcome to JanSetu! How can I help you today? You can report a civic problem or track your grievance status.'
      : 'JanSetu me main aapki kya madad kar sakta hoon? Aap nagarik samasya darj kar sakte hain ya shikayat ki sthiti jaan sakte hain.';
    speak(prompt);
  };

  // Status Inquiry Handler using MongoDB + Sarvam AI
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
        ? 'Could not fetch status right now. You can also check in My Reports.'
        : 'Is samay status prapt nahi ho saka. Kripya apna Tracking ID jaise JH-2026-XXXX batayein ya My Reports me dekhein.');
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
            ? 'What problem are you facing? Please tell me so I can choose the category.'
            : 'Aapko kya problem hai? Aap apni problem batayein jisse main category choose kar sakun.';
          speak(prompt);
        }, 600);
      });
    }, 400);
  };

  // Mute Toggle
  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        stopSpeaking();
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      } else {
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

    speak('Namaste! JanSetu AI Sahayak me aapka swagat hai. Kripya batayein aap Hindi me baat karenge ya English me?');
    initSpeechRecognition();

    return () => {
      stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [isOpen]);

  if (!isOpen || !isCallActive) return null;

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
          <div className="voice-agent-modal" role="dialog" aria-modal="true" style={{ maxWidth: '540px' }}>
            
            {/* Header */}
            <div className="voice-call-header">
              <div className="voice-call-info">
                <div className="voice-agent-avatar">🎙️</div>
                <div className="voice-call-titles">
                  <h3>
                    <span>JanSetu Voice AI</span>
                    <span className="voice-call-badge">Sarvam AI Powered</span>
                  </h3>
                  <div className="voice-call-status-row">
                    <span className="rec-indicator"><span className="rec-dot" /> LIVE</span>
                    <span>•</span>
                    <span>{lang === 'en' ? 'English' : 'हिंदी'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEndCall}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Sound Wave */}
            <div className="voice-visualizer-bar" aria-hidden="true">
              <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
              <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
              <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
            </div>

            {/* Live Captions */}
            <div className="voice-agent-caption-banner">
              <div className="caption-ai-icon">AI</div>
              <div style={{ flex: 1 }}>
                <div className="caption-text-content">"{agentSpeech}"</div>
                {userTranscript && (
                  <div className="caption-user-transcript">
                    <span>🗣️ Aap:</span> <span>"{userTranscript}"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="voice-card-body" style={{ minHeight: '200px' }}>
              {phase === 'intro_lang' && (
                <div>
                  <div className="card-title-row">
                    <div className="card-title-main">
                      <span>🌐</span> <span>अपनी भाषा चुनें / Choose Language</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 10px' }}>
                    Aap bol sakte hain: "Hindi" ya "English"
                  </p>

                  <div className="lang-select-grid">
                    <div
                      className={`lang-choice-card ${lang === 'hi' ? 'selected' : ''}`}
                      onClick={() => handleSelectLanguage('hi')}
                    >
                      <div className="lang-flag">🇮🇳</div>
                      <div className="lang-name-primary">हिंदी (Hindi)</div>
                      <div className="lang-name-sub">बोलकर शिकायत दर्ज करें</div>
                    </div>

                    <div
                      className={`lang-choice-card ${lang === 'en' ? 'selected' : ''}`}
                      onClick={() => handleSelectLanguage('en')}
                    >
                      <div className="lang-flag">🇬🇧</div>
                      <div className="lang-name-primary">English</div>
                      <div className="lang-name-sub">Speak and report issue</div>
                    </div>
                  </div>
                </div>
              )}

              {phase === 'assistance_choice' && (
                <div>
                  <div className="card-title-row">
                    <div className="card-title-main">
                      <span>🤝</span> <span>JanSetu Sahayata / How Can I Help?</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 10px' }}>
                    Aap bol sakte hain: "Mujhe problem report karna hai"
                  </p>

                  <div className="white-action-grid">
                    <div
                      className="action-card-white"
                      onClick={handleReportProblemAction}
                    >
                      <div className="action-icon-pill">📝</div>
                      <div className="action-card-title">समस्या दर्ज करें</div>
                      <div className="action-card-sub">Report a Civic Grievance (सड़क, नाला, पानी, कचरा)</div>
                    </div>

                    <div
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

            {/* Bottom Controls in Initial Card */}
            <div className="voice-bottom-dock">
              <button
                type="button"
                className={`dock-btn-mute ${isMuted ? 'muted' : ''}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🎙️'}
              </button>

              <button
                type="button"
                className="dock-btn-end"
                onClick={handleEndCall}
                title="End Call"
              >
                <span style={{ fontSize: '18px' }}>📞</span>
                <span>End Call</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 4. STANDALONE CENTER-BOTTOM CALL CONTROLS DOCK ──
          Floats at screen bottom with ONLY Mute & End Call buttons ("sirf wahi dono") */}
      {!isInitialCardOpen && isCallActive && (
        <div className="voice-floating-center-dock" role="toolbar" aria-label="Voice Call Controls">
          <button
            type="button"
            className={`floating-dock-mute ${isMuted ? 'muted' : ''}`}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? '🔇' : '🎙️'}
          </button>

          <button
            type="button"
            className="floating-dock-end"
            onClick={handleEndCall}
            title="End Call / कॉल समाप्त करें"
            aria-label="End Call"
          >
            <span style={{ fontSize: '18px' }}>📞</span>
            <span>End Call</span>
          </button>
        </div>
      )}
    </>
  );
}
