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
        🎙️
      </div>
      <div className="floating-label-box">
        <div className="floating-label-main" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>JanSetu Voice AI</span>
          <span className="pulse-badge-live" />
        </div>
        <span className="floating-label-sub">बोलकर रिपोर्ट करें</span>
      </div>
    </button>
  );
}
