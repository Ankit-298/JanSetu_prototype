import React from 'react';
import './voiceAgent.css';

/**
 * Floating AI Trigger Button in the lower-right corner of the citizen portal
 */
export default function AIFloatingTrigger({ onOpen }) {
  return (
    <button
      type="button"
      className="voice-floating-trigger"
      onClick={onOpen}
      title="JanSetu Voice AI — बोलकर समस्या दर्ज करें"
      aria-label="Open JanSetu Voice AI Agent"
    >
      <div className="floating-icon-orb">
        {/* Crisp Bold SVG Microphone matching target design */}
        <svg
          className="floating-mic-svg"
          viewBox="0 0 24 24"
          fill="none"
        >
          {/* Solid filled capsule mic body */}
          <rect x="8.5" y="2" width="7" height="11.5" rx="3.5" fill="#FFFFFF" />
          {/* Cradle */}
          <path d="M4.5 10a7.5 7.5 0 0 0 15 0" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          {/* Stem & base */}
          <line x1="12" y1="17.5" x2="12" y2="21.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="8" y1="21.5" x2="16" y2="21.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="pulse-badge-live orb-dot" />
      </div>

      <div className="floating-label-box">
        <div className="floating-label-main">
          <span>JanSetu Voice AI</span>
        </div>
        <span className="floating-label-sub">बोलकर रिपोर्ट करें</span>
      </div>

      <div className="floating-arrow-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="floating-chevron-svg">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}
