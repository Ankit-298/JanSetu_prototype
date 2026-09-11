/**
 * JanSetu Civic Analytics Loader
 * State-of-the-art, high-performance loading animation for Analytics, Charts & Civic Data Streams
 * Duration: 1.2 - 1.5s max (Smooth auto-dismiss)
 */

(function() {
  const LOADER_ID = 'jansetuCivicAnalyticsLoader';

  function injectLoaderStyles() {
    if (document.getElementById('jansetu-civic-loader-styles')) return;
    const style = document.createElement('style');
    style.id = 'jansetu-civic-loader-styles';
    style.textContent = `
      .jansetu-civic-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(8, 18, 38, 0.78);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.28s ease;
        will-change: opacity, transform;
      }
      .jansetu-civic-backdrop.active {
        opacity: 1;
        visibility: visible;
      }
      .jansetu-civic-backdrop.fade-out {
        opacity: 0;
        visibility: hidden;
      }
      .jansetu-civic-card {
        background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
        border: 2px solid rgba(255, 153, 51, 0.35);
        border-radius: 22px;
        padding: 26px 32px 22px;
        width: 90%;
        max-width: 420px;
        box-shadow: 0 24px 64px rgba(0, 45, 98, 0.38), 0 4px 20px rgba(0,0,0,0.12);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        position: relative;
        overflow: hidden;
        transform: scale(0.94) translateY(12px);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .jansetu-civic-backdrop.active .jansetu-civic-card {
        transform: scale(1) translateY(0);
      }
      .jansetu-civic-ribbon {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4.5px;
        background: linear-gradient(90deg, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%);
      }
      .jansetu-civic-stage {
        position: relative;
        width: 76px;
        height: 76px;
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .civic-chakra-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2.5px dashed #002D62;
        animation: civicChakraSpin 4s linear infinite;
      }
      .civic-chakra-glow {
        position: absolute;
        width: 88%;
        height: 88%;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: #FF9933;
        border-bottom-color: #138808;
        animation: civicChakraSpinReverse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      .civic-chakra-center {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: #002D62;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0, 45, 98, 0.35);
        position: relative;
        z-index: 2;
      }
      .civic-chakra-center img {
        width: 32px;
        height: 32px;
        object-fit: contain;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
      }
      @keyframes civicChakraSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes civicChakraSpinReverse {
        0% { transform: rotate(360deg); }
        100% { transform: rotate(0deg); }
      }
      .jansetu-civic-brand-title {
        font-size: 17px;
        font-weight: 900;
        color: #002D62;
        letter-spacing: -0.3px;
        line-height: 1.2;
        margin-bottom: 2px;
      }
      .jansetu-civic-brand-title span.saffron { color: #EA580C; }
      .jansetu-civic-brand-title span.green { color: #16A34A; }
      .jansetu-civic-brand-sub {
        font-size: 11px;
        font-weight: 700;
        color: #64748B;
        margin-bottom: 12px;
      }
      .jansetu-civic-status-msg {
        font-size: 12.5px;
        font-weight: 750;
        color: #1E293B;
        min-height: 22px;
        line-height: 1.4;
        margin-bottom: 12px;
      }
      .jansetu-civic-progress-track {
        width: 100%;
        height: 6px;
        background: #E2E8F0;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        margin-bottom: 12px;
      }
      .jansetu-civic-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #FF9933 0%, #002D62 50%, #138808 100%);
        border-radius: 8px;
        transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 0 10px rgba(0, 45, 98, 0.4);
      }
      .jansetu-civic-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #F1F5F9;
        border: 1px solid #CBD5E1;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 10.5px;
        font-weight: 700;
        color: #475569;
      }
    `;
    document.head.appendChild(style);
  }

  function createLoaderElement() {
    let el = document.getElementById(LOADER_ID);
    if (el) return el;
    injectLoaderStyles();

    el = document.createElement('div');
    el.id = LOADER_ID;
    el.className = 'jansetu-civic-backdrop';
    el.innerHTML = `
      <div class="jansetu-civic-card">
        <div class="jansetu-civic-ribbon"></div>
        <div class="jansetu-civic-stage">
          <div class="civic-chakra-ring"></div>
          <div class="civic-chakra-glow"></div>
          <div class="civic-chakra-center">
            <img src="/jansetu-logo.png" alt="JanSetu" onerror="this.src='/citizen/jansetu-logo.png'; this.onerror=null;" />
          </div>
        </div>
        <div class="jansetu-civic-brand-title">Jan<span class="saffron">Setu</span> · जन<span class="green">सेतु</span></div>
        <div class="jansetu-civic-brand-sub">झारखण्ड सरकार · Government of Jharkhand</div>
        <div class="jansetu-civic-status-msg" id="jansetuCivicStatusMsg">
          डेटाबेस से विश्लेषिकी एवं चार्ट डेटा लोड हो रहा है...
        </div>
        <div class="jansetu-civic-progress-track">
          <div class="jansetu-civic-progress-fill" id="jansetuCivicProgressFill"></div>
        </div>
        <div class="jansetu-civic-badge">
          <span>🔒</span>
          <span>Civic Intelligence Stream · 256-Bit SSL Encrypted</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  let loaderDismissTimer = null;

  /**
   * Show Enhanced JanSetu Civic Analytics Loader
   * @param {string} message Custom message (optional)
   * @param {number} durationMs Max 1-2s (default: 1300ms)
   * @param {Function} callback Function to execute after loading completes
   */
  function showJanSetuCivicLoader(message, durationMs = 1300, callback) {
    const loader = createLoaderElement();
    const statusMsg = document.getElementById('jansetuCivicStatusMsg');
    const fill = document.getElementById('jansetuCivicProgressFill');

    if (statusMsg && message) {
      statusMsg.textContent = message;
    }

    loader.classList.remove('fade-out');
    loader.classList.add('active');

    if (fill) {
      fill.style.width = '0%';
      fill.style.transition = `width ${durationMs / 1000}s cubic-bezier(0.16, 1, 0.3, 1)`;
      setTimeout(() => {
        fill.style.width = '100%';
      }, 50);
    }

    if (loaderDismissTimer) clearTimeout(loaderDismissTimer);
    loaderDismissTimer = setTimeout(() => {
      loader.classList.add('fade-out');
      setTimeout(() => {
        loader.classList.remove('active');
        loader.classList.remove('fade-out');
        if (fill) fill.style.width = '0%';
        if (typeof callback === 'function') callback();
      }, 250);
    }, durationMs);
  }

  window.showJanSetuCivicLoader = showJanSetuCivicLoader;
})();
