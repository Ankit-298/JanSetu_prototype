/**
 * JanSetu Civic Analytics & University Data Loader
 * High-performance, premium circular rotating spinner animation
 * Supports programmatic dismiss (wait until backend fetch completes)
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
        background: rgba(8, 18, 38, 0.82);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
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
        border: 2px solid rgba(255, 153, 51, 0.4);
        border-radius: 24px;
        padding: 30px 36px 26px;
        width: 90%;
        max-width: 420px;
        box-shadow: 0 28px 70px rgba(0, 45, 98, 0.42), 0 6px 24px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        position: relative;
        overflow: hidden;
        transform: scale(0.92) translateY(14px);
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

      /* ─── Circular Rotating Spinner Stage ─── */
      .jansetu-civic-stage {
        position: relative;
        width: 96px;
        height: 96px;
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* Outer rotating decorative dotted ring */
      .civic-chakra-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px dashed rgba(0, 45, 98, 0.25);
        animation: civicChakraSpin 12s linear infinite;
      }
      /* Main circular spinner: rotating circular gradient arc */
      .civic-circle-spinner {
        position: absolute;
        width: 88px;
        height: 88px;
        border-radius: 50%;
        border: 4px solid transparent;
        border-top-color: #FF9933;
        border-right-color: #002D62;
        border-bottom-color: #138808;
        border-left-color: transparent;
        animation: civicCircleSpin 1s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        filter: drop-shadow(0 0 10px rgba(255, 153, 51, 0.35));
      }
      /* Secondary glowing reverse inner ring */
      .civic-circle-inner-ring {
        position: absolute;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: #002D62;
        border-bottom-color: #FF9933;
        animation: civicCircleSpinReverse 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      /* Center JanSetu Emblem */
      .civic-chakra-center {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #002D62;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 45, 98, 0.45);
        position: relative;
        z-index: 2;
        animation: civicLogoPulse 2.2s ease-in-out infinite;
      }
      .civic-chakra-center img {
        width: 36px;
        height: 36px;
        object-fit: contain;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
      }

      @keyframes civicCircleSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes civicCircleSpinReverse {
        0% { transform: rotate(360deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes civicChakraSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes civicLogoPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
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
        margin-bottom: 14px;
      }
      .jansetu-civic-status-msg {
        font-size: 13px;
        font-weight: 700;
        color: #1E293B;
        min-height: 22px;
        line-height: 1.4;
        margin-bottom: 14px;
        max-width: 340px;
      }

      /* ─── Below Circular Spinner: "Loading..." badge ─── */
      .jansetu-civic-loading-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #EFF6FF;
        border: 1.5px solid #BFDBFE;
        padding: 6px 16px;
        border-radius: 20px;
        margin-bottom: 14px;
      }
      .civic-micro-spinner {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #BFDBFE;
        border-top-color: #2563EB;
        animation: civicCircleSpin 0.75s linear infinite;
      }
      .civic-loading-label {
        font-size: 12.5px;
        font-weight: 800;
        color: #1E40AF;
        letter-spacing: 0.2px;
      }
      .civic-dots-anim span {
        display: inline-block;
        animation: civicDotBlink 1.4s infinite both;
      }
      .civic-dots-anim span:nth-child(2) { animation-delay: 0.2s; }
      .civic-dots-anim span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes civicDotBlink {
        0%, 80%, 100% { opacity: 0; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-2px); }
      }

      .jansetu-civic-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 10.5px;
        font-weight: 700;
        color: #64748B;
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
          <div class="civic-circle-spinner"></div>
          <div class="civic-circle-inner-ring"></div>
          <div class="civic-chakra-center">
            <img src="/jansetu-logo.png" alt="JanSetu" onerror="this.src='/citizen/jansetu-logo.png'; this.onerror=null;" />
          </div>
        </div>
        <div class="jansetu-civic-brand-title">Jan<span class="saffron">Setu</span> · जन<span class="green">सेतु</span></div>
        <div class="jansetu-civic-brand-sub">झारखण्ड सरकार · Government of Jharkhand</div>
        <div class="jansetu-civic-status-msg" id="jansetuCivicStatusMsg">
          Connecting to database & loading civic intelligence data...
        </div>
        <div class="jansetu-civic-loading-pill">
          <div class="civic-micro-spinner"></div>
          <span class="civic-loading-label"><span id="jansetuCivicLoadingText">Loading</span><span class="civic-dots-anim"><span>.</span><span>.</span><span>.</span></span></span>
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
  let safetyTimeout = null;

  /**
   * Hide JanSetu Civic Loader
   * @param {Function} callback Optional callback
   */
  function hideJanSetuCivicLoader(callback) {
    const loader = document.getElementById(LOADER_ID);
    if (!loader) return;
    if (loaderDismissTimer) clearTimeout(loaderDismissTimer);
    if (safetyTimeout) clearTimeout(safetyTimeout);

    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.classList.remove('active');
      loader.classList.remove('fade-out');
      if (typeof callback === 'function') callback();
    }, 280);
  }

  /**
   * Show Enhanced JanSetu Civic Circular Analytics Loader
   * @param {string} message Custom message
   * @param {number|object} optionsOrDuration Duration in ms or options object { autoDismiss: false, durationMs: 1500, label: 'Submitting problem' }
   * @param {Function} callback Function to execute after loading completes
   */
  function showJanSetuCivicLoader(message, optionsOrDuration = null, callback = null) {
    const loader = createLoaderElement();
    const statusMsg = document.getElementById('jansetuCivicStatusMsg');
    const loadingText = document.getElementById('jansetuCivicLoadingText');

    if (statusMsg && message) {
      statusMsg.textContent = message;
    }

    if (loadingText) {
      if (optionsOrDuration && typeof optionsOrDuration === 'object' && optionsOrDuration.label) {
        loadingText.textContent = optionsOrDuration.label;
      } else {
        loadingText.textContent = 'Loading';
      }
    }

    loader.classList.remove('fade-out');
    loader.classList.add('active');

    if (loaderDismissTimer) clearTimeout(loaderDismissTimer);
    if (safetyTimeout) clearTimeout(safetyTimeout);

    let durationMs = null;
    let autoDismiss = false;

    if (typeof optionsOrDuration === 'number') {
      durationMs = optionsOrDuration;
      autoDismiss = durationMs > 0;
    } else if (optionsOrDuration && typeof optionsOrDuration === 'object') {
      autoDismiss = optionsOrDuration.autoDismiss === true;
      durationMs = optionsOrDuration.durationMs || (autoDismiss ? 1500 : null);
    }

    if (autoDismiss && durationMs) {
      loaderDismissTimer = setTimeout(() => {
        hideJanSetuCivicLoader(callback);
      }, durationMs);
    } else {
      // Safety auto-dismiss after 20 seconds so user is never stuck forever if internet fails completely
      safetyTimeout = setTimeout(() => {
        hideJanSetuCivicLoader(callback);
      }, 20000);
    }
  }

  window.showJanSetuCivicLoader = showJanSetuCivicLoader;
  window.hideJanSetuCivicLoader = hideJanSetuCivicLoader;
})();
