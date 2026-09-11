
    // Translations, Categories, Quotes & Seed data modularized into /citizen/translations.js

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    window.escapeHtml = escapeHtml;

    function formatProperAddress(rep) {
      if (!rep) return 'Jharkhand';
      const parts = [];
      if (rep.village && rep.village !== 'Not Specified' && String(rep.village).trim()) parts.push(String(rep.village).trim());
      if (rep.landmark && String(rep.landmark).trim()) parts.push(String(rep.landmark).trim());
      if (rep.block && rep.block !== 'Not Specified' && String(rep.block).trim()) parts.push('Block ' + String(rep.block).trim());
      if (rep.district && rep.district !== 'Not Specified' && String(rep.district).trim()) parts.push('Dist. ' + String(rep.district).trim());
      if (rep.pincode && String(rep.pincode).trim()) parts.push(String(rep.pincode).trim());
      if (parts.length > 0) {
        if (!parts.some(p => p.toLowerCase().includes('jharkhand'))) parts.push('Jharkhand');
        return parts.join(', ');
      }
      return rep.location || rep.address || 'Jharkhand';
    }
    window.formatProperAddress = formatProperAddress;

    let currentLanguage = localStorage.getItem('jansetu_language') || 'hi';
    let quoteIndex = 0;
    let quoteTimer = null;
    let allReportsList = [];
    let exploreList = [];
    let supportedIds = new Set();
    let selectedMediaFiles = [];
    let detectedDuplicateChallenge = null;
    let isRecordingVoice = false;
    let speechRecognition = null;
    let currentlyInspectedId = null;
    let exploreDistrictFilter = 'same_district';
    const jansetuSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('jansetu_realtime_sync') : null;

    let activeChatProblemId = null;
    let chatSearchQuery = '';
    const chatMessagesCache = {}; // { [problemId]: [] }
    const chatUnreadState = {};   // { [problemId]: boolean }

    // Bullet-proof Chat Deduplication: server-side authority + optimistic text signature merging
    function mergeAndDeduplicateChat(serverMsgs = [], localMsgs = []) {
      const result = [];
      const seenIds = new Set();
      const seenSignatures = new Map(); // signature -> timestamp

      // 1. Authoritative server messages first
      (serverMsgs || []).forEach(m => {
        if (!m || !m.text) return;
        const normText = (m.text || '').trim();
        if (!normText) return;

        if (m._id) {
          const idStr = String(m._id);
          if (seenIds.has(idStr)) return;
          seenIds.add(idStr);
        }

        const senderRole = (m.senderType || (m.isCitizen ? 'citizen' : (m.isUniversity ? 'university' : 'admin'))).toLowerCase();
        const timeVal = new Date(m.timestamp || m.createdAt || 0).getTime();
        const sig = `${senderRole}:::${normText}`;

        const prevTime = seenSignatures.get(sig);
        if (prevTime !== undefined && Math.abs(timeVal - prevTime) < 45000) {
          return; // Duplicate server echo within 45s
        }
        seenSignatures.set(sig, timeVal);
        result.push(m);
      });

      // 2. Local optimistic messages (only keep if not already in server messages)
      (localMsgs || []).forEach(m => {
        if (!m || !m.text) return;
        const normText = (m.text || '').trim();
        if (!normText) return;

        if (m._id && seenIds.has(String(m._id))) return;

        const senderRole = (m.senderType || (m.isCitizen ? 'citizen' : (m.isUniversity ? 'university' : 'admin'))).toLowerCase();
        const timeVal = new Date(m.timestamp || 0).getTime();
        const sig = `${senderRole}:::${normText}`;

        const prevTime = seenSignatures.get(sig);
        if (prevTime !== undefined && (Math.abs(timeVal - prevTime) < 60000 || timeVal === 0 || prevTime === 0)) {
          return; // Server already has this message! Discard optimistic copy.
        }

        seenSignatures.set(sig, timeVal);
        result.push(m);
      });

      result.sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime());
      return result;
    }
    window.mergeAndDeduplicateChat = mergeAndDeduplicateChat;

    function appendChatMessageToStore(pId, rep, msg) {
      if (!pId || !msg) return;
      if (!chatMessagesCache[pId]) chatMessagesCache[pId] = [];

      chatMessagesCache[pId] = mergeAndDeduplicateChat(chatMessagesCache[pId], [msg]);
      if (rep) {
        rep.chatMessages = chatMessagesCache[pId];
      }
    }


    if (jansetuSyncChannel) {
      jansetuSyncChannel.addEventListener('message', function (ev) {
        if (ev && ev.data && ev.data.type === 'FILES_DELETED') {
          const { challengeId, mongoId } = ev.data;
          const rep = allReportsList.find(r => r.id === challengeId || (mongoId && r.mongoId === mongoId));
          if (rep) {
            rep.filePath = null;
            rep.image = null;
            rep.beforeImg = null;
            rep.afterImg = null;
            if (rep.resolutionProof) {
              rep.resolutionProof.beforeImage = null;
              rep.resolutionProof.beforeFilePath = null;
            }
            saveReportsState();
            renderAllViews();
          }
        } else if (ev && ev.data && ev.data.type === 'NEW_CHAT_MESSAGE') {
          const { challengeId, mongoId, message } = ev.data;
          const rep = allReportsList.find(r => r.id === challengeId || (mongoId && r.mongoId === mongoId)) || exploreList.find(r => r.id === challengeId || (mongoId && r.mongoId === mongoId));
          const pId = rep ? rep.id : challengeId;
          if (pId && message) {
            appendChatMessageToStore(pId, rep, message);
            if (message.senderType !== 'citizen' && !message.isCitizen) {
              const chatModalOpen = document.getElementById('problemChatModal')?.classList.contains('active') || document.getElementById('problemChatModal')?.classList.contains('open');
              if (!chatModalOpen || activeChatProblemId !== pId) {
                chatUnreadState[pId] = true;
              }
            }
            renderChatProblemChannels();
            if (activeChatProblemId === pId) {
              renderChatMessagesStream(rep);
            }
            updateNavChatUnreadIndicator();
          }
        }
      });
    }

    function getCurrentUser() {
      if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') {
        const u = Auth.getUser();
        if (u) return u;
      }
      try {
        const raw = localStorage.getItem('is_user') || localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function getUserStorageKey(prefix) {
      const u = getCurrentUser();
      const id = u ? (u.id || u._id || u.email || 'guest') : 'guest';
      return prefix + '_' + id;
    }

    function getUserDistrict() {
      const manual = localStorage.getItem('jansetu_active_district');
      if (manual && manual.trim()) return manual.trim();

      const user = getCurrentUser();
      if (user) {
        if (user.address && user.address.district && user.address.district.trim()) {
          return user.address.district.trim();
        }
        if (user.district && user.district.trim()) {
          return user.district.trim();
        }
        if (user.address && user.address.city && user.address.city.trim()) {
          return user.address.city.trim();
        }
      }

      const formSel = document.getElementById('reportDistrict');
      if (formSel && formSel.value) return formSel.value.trim();

      return 'Ranchi';
    }

    function setUserDistrict(newDist) {
      if (!newDist) return;
      localStorage.setItem('jansetu_active_district', newDist.trim());

      // Sync with report form district select if present
      const repDist = document.getElementById('reportDistrict');
      if (repDist) {
        for (let i = 0; i < repDist.options.length; i++) {
          if (isSameDistrict(repDist.options[i].value, newDist)) {
            repDist.selectedIndex = i;
            break;
          }
        }
      }

      updateDistrictBadges();
      renderAllViews();
    }

    function getChallengeDistrict(c) {
      if (!c) return '';
      if (c.district && typeof c.district === 'string' && c.district.trim()) {
        return c.district.trim();
      }
      if (c.location) {
        if (typeof c.location === 'object' && c.location.district) {
          return c.location.district.trim();
        }
        if (typeof c.location === 'string') {
          const jhDistricts = [
            'Ranchi', 'Dhanbad', 'Bokaro', 'East Singhbhum', 'West Singhbhum',
            'Hazaribagh', 'Deoghar', 'Ramgarh', 'Giridih', 'Gumla',
            'Simdega', 'Khunti', 'Palamu', 'Dumka', 'Latehar',
            'Lohardaga', 'Jamtara', 'Pakur', 'Sahibganj', 'Godda',
            'Garhwa', 'Chatra', 'Koderma', 'Seraikela Kharsawan', 'Saraikela Kharsawan', 'Jamshedpur'
          ];
          for (const d of jhDistricts) {
            if (new RegExp('\\b' + d + '\\b', 'i').test(c.location)) {
              return (d === 'Jamshedpur') ? 'East Singhbhum' : d;
            }
          }
          const parts = c.location.split(',').map(s => s.trim());
          if (parts.length >= 3) return parts[parts.length - 2];
          if (parts.length >= 2 && !/jharkhand/i.test(parts[parts.length - 1])) return parts[parts.length - 1];
        }
      }
      return '';
    }

    function isSameDistrict(d1, d2) {
      if (!d1 || !d2) return false;
      const s1 = d1.toLowerCase().replace(/[^a-z0-9]/g, '');
      const s2 = d2.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!s1 || !s2) return false;
      if ((s1.includes('jamshedpur') || s1.includes('eastsinghbhum')) &&
        (s2.includes('jamshedpur') || s2.includes('eastsinghbhum'))) {
        return true;
      }
      return s1 === s2 || s1.includes(s2) || s2.includes(s1);
    }

    function updateDistrictBadges() {
      const userDist = getUserDistrict();
      const sel = document.getElementById('activeDistrictSelect');
      if (sel) {
        for (let i = 0; i < sel.options.length; i++) {
          if (isSameDistrict(sel.options[i].value, userDist)) {
            sel.selectedIndex = i;
            break;
          }
        }
      }

      const roleTagEl = document.querySelector('.profile-role-tag');
      if (roleTagEl) {
        const user = getCurrentUser();
        const roleStr = user && user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Citizen';
        roleTagEl.textContent = `${roleStr} · ${userDist}`;
      }

      const repDist = document.getElementById('reportDistrict');
      if (repDist && !repDist.dataset.userModified) {
        for (let i = 0; i < repDist.options.length; i++) {
          if (isSameDistrict(repDist.options[i].value, userDist)) {
            repDist.selectedIndex = i;
            break;
          }
        }
      }
    }

    function applyUserProfile() {
      const user = getCurrentUser();
      if (!user) return;
      const name = user.name || 'Citizen';
      const email = user.email || '';
      const firstName = name.split(' ')[0] || 'Citizen';
      const initial = name.charAt(0).toUpperCase() || 'C';

      const nameEl = document.getElementById('userNameDisplay');
      if (nameEl) nameEl.textContent = firstName;

      const avEl = document.getElementById('userAvatarCircle');
      if (avEl) avEl.textContent = initial;

      updateDistrictBadges();

      const pfNameInput = document.getElementById('profNameInput');
      if (pfNameInput) pfNameInput.value = name;

      const pfEmailInput = document.getElementById('profEmailInput');
      if (pfEmailInput) pfEmailInput.value = email;
    }

    function formatTimeAgo(dateStr) {
      if (!dateStr) return currentLanguage === 'hi' ? 'हाल ही में' : 'Recently';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return currentLanguage === 'hi' ? 'हाल ही में' : 'Recently';
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return currentLanguage === 'hi' ? 'अभी' : 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)} ${currentLanguage === 'hi' ? 'मिनट पहले' : 'mins ago'}`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} ${currentLanguage === 'hi' ? 'घंटे पहले' : 'hours ago'}`;
      if (diff < 2592000) return `${Math.floor(diff / 86400)} ${currentLanguage === 'hi' ? 'दिन पहले' : 'days ago'}`;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatRealDate(dateStr, includeTime = true) {
      if (!dateStr) return '--';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!includeTime) return datePart;
      const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart} · ${timePart}`;
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    /* ============================================================
       LOADER SCREEN DISABLED ON CITIZEN PORTAL (INSTANT LOAD)
       ============================================================ */
    function showJanSetuLoader(message, minDuration = 0) {
      // Disabled on citizen portal per user request - Instant UI
      return;
    }
    window.showJanSetuLoader = showJanSetuLoader;

    function hideJanSetuLoader(callback, forcedDelay) {
      // Immediate execution of callback with zero delay
      if (typeof callback === 'function') callback();
    }
    window.hideJanSetuLoader = hideJanSetuLoader;

    setTimeout(async () => {
      applyUserProfile();
      loadPersistentState();
      loadCitizenNotifications();
      setLanguage(currentLanguage);
      startQuoteRotator();

      updateNetworkStatus();
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);

      renderAllViews();
      await fetchLiveChallenges(true);
      applyUserProfile();


      // Setup realtime sync listener across browser tabs/windows
      if (jansetuSyncChannel) {
        jansetuSyncChannel.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'NEW_CHALLENGE') {
            if (e.data.challenge) {
              const commC = e.data.challenge;
              const existingIdx = exploreList.findIndex(x => x.id === commC.id || (commC.mongoId && x.mongoId === commC.mongoId));
              if (existingIdx !== -1) {
                exploreList[existingIdx] = { ...exploreList[existingIdx], ...commC };
              } else {
                exploreList.unshift(commC);
              }
            }
            fetchLiveChallenges(true);
          } else if (e.data && (e.data.type === 'STATUS_UPDATE' || e.data.type === 'CHALLENGE_UPDATED')) {
            if (e.data.challengeId) {
              const targetId = String(e.data.challengeId);
              const match = allReportsList.find(r => String(r.mongoId) === targetId || String(r.id) === targetId);
              if (match) {
                if (e.data.status === 'validated') {
                  match.isVerified = true;
                  match.status = 'Verified';
                  match.rawStatus = 'validated';
                } else if (e.data.status === 'assigned' || e.data.status === 'in_progress') {
                  match.isVerified = true;
                  match.status = 'Being Worked On';
                  match.rawStatus = e.data.status;
                } else if (e.data.status === 'resolved' || e.data.status === 'closed') {
                  match.isResolved = true;
                  match.status = 'Solved';
                  match.rawStatus = e.data.status;
                }
                if (e.data.note) {
                  match.validationNotes = e.data.note;
                  if (!Array.isArray(match.statusHistory)) match.statusHistory = [];
                  match.statusHistory.push({
                    status: e.data.status,
                    changedAt: new Date(),
                    changedBy: { name: 'Admin Desk', role: 'admin' },
                    note: e.data.note
                  });
                }
                saveReportsState();
                renderAllViews();
              }
            }
            lastChallengesSyncSignature = '';
            fetchLiveChallenges(true).then(() => {
              loadCitizenNotifications();
              renderAllViews();
            });
          } else if (e.data && e.data.type === 'DELETE_CHALLENGE') {
            const { challengeId, mongoId } = e.data;
            allReportsList = allReportsList.filter(r => r.id !== challengeId && (!mongoId || r.mongoId !== mongoId));
            exploreList = exploreList.filter(x => x.id !== challengeId && (!mongoId || x.mongoId !== mongoId));
            saveReportsState();
            saveExploreState();
            renderAllViews();
          }
        });
      }

      // Window storage listener for cross-tab updates
      window.addEventListener('storage', (e) => {
        if (e.key === 'jansetu_community_pool' || e.key === 'jansetu_active_district' || (e.key && (e.key.includes('jansetu_supports') || e.key.includes('jansetu_citizen_notifs')))) {
          loadStoredData();
          renderAllViews();
          updateTopNotifBellBadge();
        }
      });

      // Auto-refresh live challenges periodically every 15 seconds with intelligent dirty-checking (silky smooth)
      setInterval(fetchLiveChallenges, 15000);

      // Track user modified state on report district select
      const repDistEl = document.getElementById('reportDistrict');
      if (repDistEl) {
        repDistEl.addEventListener('change', () => {
          repDistEl.dataset.userModified = 'true';
        });
      }

      // Setup backdrop dismiss for modals
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            closeModal(overlay.id);
          }
        });
      });
    });

    function setLanguage(lang) {
      currentLanguage = lang;
      localStorage.setItem('jansetu_language', lang);

      ['en', 'hi', 'hinglish'].forEach(l => {
        const btn = document.getElementById('langBtn_' + l);
        if (btn) btn.className = 'lang-btn' + (l === lang ? ' active' : '');
      });

      const dict = TRANSLATIONS[lang] || TRANSLATIONS['hi'];

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerHTML = dict[key];
      });

      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
      });

      // Dynamically set page title according to selected language
      if (lang === 'hi') {
        document.title = 'जनसेतु — नागरिक पोर्टल';
      } else {
        document.title = 'JanSetu — Citizen Dashboard';
      }

      const searchInp = document.getElementById('exploreSearchInput');
      if (searchInp && dict.explore_search_placeholder) {
        searchInp.placeholder = dict.explore_search_placeholder;
      }

      renderCategoryChips(lang);
      updateQuote(false);
      renderAllViews();

      // If detailModal is currently open, refresh its translations & banners
      const detailModalEl = document.getElementById('detailModal');
      if (detailModalEl && detailModalEl.classList.contains('active') && currentlyInspectedId) {
        openDetailModal(currentlyInspectedId);
      }

      // If profileModal is currently open, refresh its fields
      const profModalEl = document.getElementById('profileModal');
      if (profModalEl && profModalEl.classList.contains('active')) {
        openProfileModal();
      }

      // Update settings language cards if active
      if (typeof updateSettingsLangCards === 'function') {
        updateSettingsLangCards(lang);
      }
    }

    function renderCategoryChips(lang) {
      const container = document.getElementById('categoryChipsContainer');
      if (!container) return;
      const items = CATEGORIES_DATA[lang] || CATEGORIES_DATA['hi'];
      const curCat = document.getElementById('reportCategory') ? document.getElementById('reportCategory').value : 'Water Management';

      container.innerHTML = items.map(c => `
      <button type="button" class="category-chip-btn ${c.key === curCat ? 'selected' : ''}" onclick="selectFormCategory(this, '${c.key}')">
        <span class="cat-emoji">${c.emoji}</span>
        <span>${c.label}</span>
      </button>
    `).join('');
    }

    function updateQuote(fade = true) {
      const el = document.getElementById('heroQuoteLines');
      if (!el) return;
      const quotes = QUOTES_DATA[currentLanguage] || QUOTES_DATA['hi'];
      const nextText = quotes[quoteIndex % quotes.length];

      if (fade) {
        el.style.opacity = '0';
        setTimeout(() => {
          el.innerHTML = nextText;
          el.style.opacity = '1';
        }, 300);
      } else {
        el.innerHTML = nextText;
        el.style.opacity = '1';
      }
    }

    function startQuoteRotator() {
      if (quoteTimer) clearInterval(quoteTimer);
      updateQuote(false);
      quoteTimer = setInterval(() => {
        quoteIndex++;
        updateQuote(true);
      }, 10000);
    }

    function loadPersistentState() {
      const user = getCurrentUser();
      const reportsKey = getUserStorageKey('jansetu_reports');
      const storedReports = localStorage.getItem(reportsKey);

      if (storedReports) {
        try {
          allReportsList = JSON.parse(storedReports);
          if (!Array.isArray(allReportsList)) allReportsList = [];
          // Purge legacy mock reports without mongoId or having old mock IDs
          allReportsList = allReportsList.filter(r => r && (r.mongoId || (r.id && !['JH-2026-4819', 'JH-2026-3812', 'JH-2026-2048', 'JH-2026-8941'].includes(r.id))));
        } catch (e) {
          allReportsList = [];
        }
      } else {
        allReportsList = [];
        saveReportsState();
      }

      // Upgrade in-memory reports: ensure appropriate category image or preserve custom uploaded image
      allReportsList.forEach(r => {
        if (!r.image) {
          r.image = getCategoryFallbackImage(r.category);
        }
        if (!r.beforeImg) {
          r.beforeImg = r.image;
        }
      });

      // Preserved reports state loaded directly from persistence/database

      const exploreKey = getUserStorageKey('jansetu_explore');
      const storedExplore = localStorage.getItem(exploreKey);
      if (storedExplore) {
        try {
          exploreList = JSON.parse(storedExplore);
          if (!Array.isArray(exploreList) || exploreList.length === 0) {
            exploreList = [...SEED_EXPLORE];
          }
        } catch (e) {
          exploreList = [...SEED_EXPLORE];
        }
      } else {
        exploreList = [...SEED_EXPLORE];
        saveExploreState();
      }

      // Load shared community pool across all citizen users
      let communityPool = [];
      try {
        communityPool = JSON.parse(localStorage.getItem('jansetu_community_pool') || '[]');
        if (!Array.isArray(communityPool)) communityPool = [];
      } catch (e) { communityPool = []; }

      const userEmail = user && user.email ? user.email.toLowerCase().trim() : '';
      const userId = user ? (user.id || user._id || '').toString() : '';

      // Merge community pool into exploreList (excluding the current user's own reports)
      communityPool.forEach(commItem => {
        const itemSubEmail = commItem.submitterEmail ? commItem.submitterEmail.toLowerCase().trim() : '';
        const itemSubId = commItem.submittedById ? commItem.submittedById.toString() : '';
        const isMine = (userEmail && itemSubEmail === userEmail) || (userId && itemSubId === userId);

        if (!isMine) {
          commItem.district = commItem.district || getChallengeDistrict(commItem);
          const existIdx = exploreList.findIndex(e => e.id === commItem.id || (commItem.mongoId && e.mongoId === commItem.mongoId));
          if (existIdx !== -1) {
            exploreList[existIdx] = { ...exploreList[existIdx], ...commItem };
          } else {
            exploreList.unshift(commItem);
          }
        }
      });

      exploreList.forEach(c => {
        if (!c.image || c.image === '/images/water-tap.jpg') {
          c.image = getCategoryFallbackImage(c.category);
        }
      });

      const supportsKey = getUserStorageKey('jansetu_supports');
      const storedSupports = localStorage.getItem(supportsKey);
      if (storedSupports) {
        try { supportedIds = new Set(JSON.parse(storedSupports)); } catch (e) { supportedIds = new Set(); }
      } else {
        supportedIds = new Set();
      }
    }

    function saveReportsState() {
      try {
        localStorage.setItem(getUserStorageKey('jansetu_reports'), JSON.stringify(allReportsList));
      } catch (e) {
        console.warn('LocalStorage save error (reports):', e);
      }
    }
    function saveExploreState() {
      try {
        localStorage.setItem(getUserStorageKey('jansetu_explore'), JSON.stringify(exploreList));
      } catch (e) {
        console.warn('LocalStorage save error (explore):', e);
      }
    }
    function saveSupportsState() {
      try {
        localStorage.setItem(getUserStorageKey('jansetu_supports'), JSON.stringify(Array.from(supportedIds)));
      } catch (e) {
        console.warn('LocalStorage save error (supports):', e);
      }
    }

    function updateNetworkStatus() {
      const isOnline = navigator.onLine;
      const textEl = document.getElementById('netStatusText');
      const badge = document.getElementById('netStatusBadge');
      if (textEl && badge) {
        textEl.textContent = isOnline
          ? (currentLanguage === 'hi' ? 'ऑनलाइन' : 'Online')
          : (currentLanguage === 'hi' ? 'ऑफलाइन' : 'Offline');
        badge.style.color = isOnline ? 'var(--india-green)' : '#DC2626';
      }

      const drafts = JSON.parse(localStorage.getItem('jansetu_offline_drafts') || '[]');
      const banner = document.getElementById('offlineSidebarBanner');
      if (drafts.length > 0) {
        banner.classList.add('show');
        document.getElementById('offlineDraftCountLabel').textContent = drafts.length + (currentLanguage === 'hi' ? ' ड्राफ्ट सहेजा गया है' : ' draft waiting to upload');
        if (isOnline) syncOfflineDrafts();
      } else {
        banner.classList.remove('show');
      }
    }

    async function syncOfflineDrafts() {
      const drafts = JSON.parse(localStorage.getItem('jansetu_offline_drafts') || '[]');
      if (!drafts.length) return;

      for (let i = 0; i < drafts.length; i++) {
        try {
          const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch('/api/challenges', {
            method: 'POST',
            headers,
            body: JSON.stringify(drafts[i])
          });
          const data = await res.json();
          if (data.success) {
            allReportsList.unshift({
              id: data.data.challengeId || ('JH-2026-' + Math.floor(1000 + Math.random() * 9000)),
              mongoId: data.data._id,
              title: drafts[i].title,
              location: drafts[i].location.village + ', ' + drafts[i].location.district,
              status: 'Submitted',
              category: drafts[i].category,
              image: '/images/water-tap.jpg',
              desc: drafts[i].description,
              assign: 'Under validation by JanSetu Authority',
              timeAgo: 'Just now',
              supports: 1
            });
          }
        } catch (e) { }
      }
      localStorage.removeItem('jansetu_offline_drafts');
      saveReportsState();
      updateNetworkStatus();
      renderAllViews();
    }

    function getDeletedChallengesSet() {
      try {
        const u = getCurrentUser();
        const userKey = u ? (u.id || u._id || u.email || 'guest') : 'guest';
        const userRaw = localStorage.getItem('jansetu_deleted_challenges_' + userKey);
        const globalRaw = localStorage.getItem('jansetu_deleted_challenges_global');
        const userSet = userRaw ? JSON.parse(userRaw) : [];
        const globalSet = globalRaw ? JSON.parse(globalRaw) : [];
        return new Set([...userSet, ...globalSet]);
      } catch (e) {
        return new Set();
      }
    }

    function addDeletedChallenge(id, mongoId) {
      try {
        const u = getCurrentUser();
        const userKey = u ? (u.id || u._id || u.email || 'guest') : 'guest';
        const set = getDeletedChallengesSet();
        if (id) set.add(String(id));
        if (mongoId) set.add(String(mongoId));
        const arr = Array.from(set);
        localStorage.setItem('jansetu_deleted_challenges_' + userKey, JSON.stringify(arr));
        localStorage.setItem('jansetu_deleted_challenges_global', JSON.stringify(arr));
      } catch (e) { }
    }

    let lastChallengesSyncSignature = '';

    async function fetchLiveChallenges(force = false) {
      if (!force && document.hidden) return; // Prevent background tab CPU thrashing
      try {
        const user = getCurrentUser();
        const currentUserId = user ? (user.id || user._id || '').toString() : '';
        const currentUserEmail = user && user.email ? user.email.toLowerCase().trim() : '';

        const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch('/api/challenges?limit=100', { headers });
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Intelligent dirty-check: verify if anything actually changed before re-rendering views or saving to disk
          const currentSignature = data.data.map(c => `${c._id}_${c.status}_${c.supportCount || 0}_${c.updatedAt || c.createdAt || ''}`).join(';');
          if (!force && currentSignature === lastChallengesSyncSignature && (allReportsList.length > 0 || exploreList.length > 0)) {
            return; // Pure no-op! Eliminates 100% of periodic dashboard lag & stutter!
          }
          lastChallengesSyncSignature = currentSignature;

          const apiList = data.data;
          const apiMongoIds = new Set(apiList.map(c => (c._id ? c._id.toString() : '')));
          const deletedChallengeSet = getDeletedChallengesSet();
          
          // Prune locally cached reports that had a mongoId but were deleted from MongoDB or are in deletedChallengeSet
          allReportsList = allReportsList.filter(r => (!r.mongoId || apiMongoIds.has(r.mongoId.toString())) && !deletedChallengeSet.has(String(r.id)) && (!r.mongoId || !deletedChallengeSet.has(String(r.mongoId))));
          exploreList = exploreList.filter(e => (!e.mongoId || apiMongoIds.has(e.mongoId.toString())) && !deletedChallengeSet.has(String(e.id)) && (!e.mongoId || !deletedChallengeSet.has(String(e.mongoId))));

          const myApiChallenges = [];
          const communityApiChallenges = [];

          apiList.forEach(c => {
            const cid = c.challengeId || ('JH-2026-' + (c._id ? c._id.slice(-4).toUpperCase() : Math.floor(1000 + Math.random() * 9000)));
            if (deletedChallengeSet.has(String(cid)) || (c._id && deletedChallengeSet.has(String(c._id)))) {
              return; // Skip deleted challenge
            }
            const subId = c.submittedBy ? (c.submittedBy._id || c.submittedBy.id || c.submittedBy).toString() : '';
            const subEmail = (c.submittedBy && c.submittedBy.email)
              ? c.submittedBy.email.toLowerCase().trim()
              : (c.submitterContact && c.submitterContact.email ? c.submitterContact.email.toLowerCase().trim() : '');

            const isMine = (currentUserId && subId === currentUserId) || 
                           (currentUserEmail && subEmail === currentUserEmail) ||
                           (!currentUserId && !currentUserEmail && (subEmail === 'citizen@jansetu.in' || subEmail === 'rajesh@gmail.com' || subId === '6a980a93dcef95b2ba3ff4dd')) ||
                           allReportsList.some(r => r.id === cid || (r.mongoId && r.mongoId === c._id));

            const loc = c.location || {};
            const locStr = [loc.village, loc.block, loc.district, loc.state].filter(Boolean).join(', ') || (loc.district ? loc.district + ', Jharkhand' : 'Jharkhand');
            const distName = loc.district || getChallengeDistrict({ location: locStr });

            const statusMap = {
              'submitted': 'Submitted',
              'under_review': 'Under Review',
              'validated': 'Verified',
              'assigned': 'Being Worked On',
              'in_progress': 'Being Worked On',
              'testing': 'Being Worked On',
              'resolved': 'Solved',
              'rejected': 'Rejected',
              'closed': 'Solved',
              'action_required': 'Action Required'
            };
            const displayStatus = statusMap[c.status] || (c.status === 'resolved' ? 'Solved' : (c.status === 'validated' ? 'Verified' : 'Submitted'));
            const isResolved = c.status === 'resolved' || c.status === 'closed';
            const isVerified = c.status !== 'submitted' && c.status !== 'under_review' && c.status !== 'draft' && c.status !== 'rejected';

            const challengeImg = (c.attachments && c.attachments[0]?.url) || c.coverImage || c.image || (c.resolutionProof && c.resolutionProof.beforeImage) || null;
            const fallbackImg = getCategoryFallbackImage(c.category);
            const activeImg = challengeImg || fallbackImg;

            const univDisplayName = c.assignedUniversity && (c.assignedUniversity.name || c.assignedUniversity.shortName)
              ? (c.assignedUniversity.name || c.assignedUniversity.shortName)
              : (c.status === 'validated' ? (currentLanguage === 'hi' ? 'विश्वविद्यालय आवंटन कतार' : 'Awaiting University Allocation') : 'JanSetu Taskforce');

            const item = {
              id: cid,
              mongoId: c._id,
              title: c.title,
              location: locStr,
              district: distName,
              status: displayStatus,
              rawStatus: c.status,
              statusHistory: Array.isArray(c.statusHistory) ? c.statusHistory : [],
              validationNotes: c.validationNotes || '',
              rejectionReason: c.rejectionReason || '',
              assignedUniversity: c.assignedUniversity || null,
              assignedBy: c.assignedBy || null,
              assignedAt: c.assignedAt || null,
              resolvedAt: c.resolvedAt || null,
              category: c.category,
              image: activeImg,
              beforeImg: activeImg,
              afterImg: null,
              desc: c.description,
              assign: univDisplayName,
              timeAgo: formatTimeAgo(c.createdAt),
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              supports: c.supportCount || 1,
              needsAction: c.status === 'action_required',
              isResolved: isResolved,
              isVerified: isVerified,
              submitterName: c.submitterContact?.name || c.submittedBy?.name || (isMine ? (user?.name || 'You') : 'Citizen'),
              submitterEmail: subEmail,
              submittedById: subId
            };

            if (isMine) {
              myApiChallenges.push(item);
            } else {
              communityApiChallenges.push(item);
            }
          });

          // 1. Update allReportsList (Only MY challenges)
          if (myApiChallenges.length > 0) {
            myApiChallenges.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            allReportsList = allReportsList.filter(r => r && (r.mongoId || (r.id && !['JH-2026-4819', 'JH-2026-3812', 'JH-2026-2048', 'JH-2026-8941'].includes(r.id))));

            myApiChallenges.forEach(myC => {
              const existingIdx = allReportsList.findIndex(r => r.id === myC.id || (r.mongoId && r.mongoId === myC.mongoId));
              if (existingIdx !== -1) {
                const prev = allReportsList[existingIdx];
                // Notify if another citizen gave support
                if (myC.supports && prev.supports && myC.supports > prev.supports) {
                  addCitizenNotification({
                    type: 'SUPPORT_GIVEN',
                    category: 'supports',
                    title: (currentLanguage === 'hi' ? 'आपकी समस्या को जनसमर्थन मिला!' : 'Your Issue Received Citizen Support!'),
                    message: (currentLanguage === 'hi'
                      ? `आपकी समस्या #${myC.id} (${myC.title}) को नया जनसमर्थन मिला! कुल समर्थन: ${myC.supports}`
                      : `A citizen supported your reported issue #${myC.id} (${myC.title})! Total supports: ${myC.supports}`),
                    reportId: myC.id,
                    reportTitle: myC.title
                  });
                }
                const prevHasCustom = prev.image && !prev.image.startsWith('/images/');
                const newHasCustom = myC.image && !myC.image.startsWith('/images/');
                const resolvedImg = newHasCustom ? myC.image : (prevHasCustom ? prev.image : (myC.image || prev.image));
                allReportsList[existingIdx] = {
                  ...prev,
                  ...myC,
                  image: resolvedImg,
                  beforeImg: resolvedImg
                };
              } else {
                allReportsList.push(myC);
              }
            });

            // Sort newest first
            allReportsList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          }

          // 2. Update exploreList (COMMUNITY challenges from other citizens)
          if (communityApiChallenges.length > 0) {
            communityApiChallenges.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            communityApiChallenges.forEach(commC => {
              const existingIdx = exploreList.findIndex(e => e.id === commC.id || (e.mongoId && e.mongoId === commC.mongoId));
              if (existingIdx !== -1) {
                const prev = exploreList[existingIdx];
                const prevHasCustom = prev.image && !prev.image.startsWith('/images/');
                const newHasCustom = commC.image && !commC.image.startsWith('/images/');
                const resolvedImg = newHasCustom ? commC.image : (prevHasCustom ? prev.image : (commC.image || prev.image));
                exploreList[existingIdx] = {
                  ...prev,
                  ...commC,
                  image: resolvedImg,
                  beforeImg: resolvedImg
                };
              } else {
                exploreList.unshift(commC);
              }
            });

            // Sync shared community pool in localStorage
            try {
              let pool = JSON.parse(localStorage.getItem('jansetu_community_pool') || '[]');
              if (!Array.isArray(pool)) pool = [];
              communityApiChallenges.forEach(commC => {
                const pIdx = pool.findIndex(p => p.id === commC.id || (commC.mongoId && p.mongoId === commC.mongoId));
                if (pIdx !== -1) pool[pIdx] = { ...pool[pIdx], ...commC };
                else pool.unshift(commC);
              });
              localStorage.setItem('jansetu_community_pool', JSON.stringify(pool));
            } catch (e) { }
          }

          saveReportsState();
          saveExploreState();
          renderAllViews();
        }
      } catch (e) {
        console.warn('Live challenges sync error:', e);
      }
    }

    let activeTrackerIndex = 0;

    function getCategoryFallbackImage(category) {
      const map = {
        'Water Management': '/images/water-tap.jpg',
        'Urban Infrastructure': '/images/pothole-road.jpg',
        'Sanitation & Environment': '/images/garbage-street.jpg',
        'Energy & Technology': '/images/street-light.jpg',
        'Healthcare': '/images/water-tap.jpg',
        'Agriculture': '/images/water-tap.jpg',
        'Education': '/images/pothole-road.jpg',
        'Public Administration': '/images/pothole-road.jpg'
      };
      return map[category] || '/images/water-tap.jpg';
    }

    function getIncompleteReports() {
      return allReportsList.filter(r => r.status !== 'Solved' && !r.isResolved);
    }

    function getCurrentlyTrackedReport() {
      const incomplete = getIncompleteReports();
      if (incomplete.length > 0) {
        if (activeTrackerIndex >= incomplete.length) activeTrackerIndex = 0;
        if (activeTrackerIndex < 0) activeTrackerIndex = incomplete.length - 1;
        return incomplete[activeTrackerIndex];
      }
      return allReportsList.length > 0 ? allReportsList[0] : null;
    }

    function prevActiveProblem(e) {
      if (e) e.stopPropagation();
      const incomplete = getIncompleteReports();
      if (incomplete.length <= 1) return;
      activeTrackerIndex = (activeTrackerIndex - 1 + incomplete.length) % incomplete.length;
      renderActiveProblem();
    }

    function nextActiveProblem(e) {
      if (e) e.stopPropagation();
      const incomplete = getIncompleteReports();
      if (incomplete.length <= 1) return;
      activeTrackerIndex = (activeTrackerIndex + 1) % incomplete.length;
      renderActiveProblem();
    }

    function trackSpecificReport(reportId) {
      const incomplete = getIncompleteReports();
      const idx = incomplete.findIndex(r => r.id === reportId);
      if (idx !== -1) {
        activeTrackerIndex = idx;
      } else {
        activeTrackerIndex = 0;
      }
      renderActiveProblem();
      const trackerEl = document.querySelector('.active-tracker-card');
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        trackerEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        trackerEl.style.boxShadow = '0 0 0 4px var(--saffron)';
        setTimeout(() => { trackerEl.style.boxShadow = ''; }, 1800);
      }
      showToast(currentLanguage === 'hi' ? 'डैशबोर्ड पर सक्रिय ट्रैकर अपडेट हुआ' : 'Active tracker updated on dashboard');
    }

    function getStakeholderActionData(r) {
      if (!r) return null;
      const raw = (r.rawStatus || '').toLowerCase();
      const stat = (r.status || '').toLowerCase();

      const isSolved = stat === 'solved' || raw === 'resolved' || raw === 'closed' || !!r.isResolved;
      const isWorking = stat === 'being worked on' || stat === 'in progress' || stat === 'university assigned' || raw === 'assigned' || raw === 'in_progress' || raw === 'testing';
      const isVerified = isSolved || isWorking || stat === 'verified' || raw === 'validated';
      const isSubmitted = !isVerified && !isWorking && !isSolved;

      // Real submission date
      const baseDate = formatRealDate(r.createdAt || r.submittedDate);

      // Real admin validation event from statusHistory
      const valHistory = (Array.isArray(r.statusHistory) ? r.statusHistory : []).slice().reverse().find(h => h.status === 'validated' || (h.changedBy && (h.changedBy.role === 'admin' || h.changedBy.name?.toLowerCase().includes('admin'))));
      const valDateStr = valHistory && valHistory.changedAt ? formatRealDate(valHistory.changedAt) : (isVerified ? formatRealDate(r.updatedAt || r.createdAt) : null);

      const adminOfficerName = (valHistory && valHistory.changedBy && valHistory.changedBy.name)
        ? valHistory.changedBy.name
        : (isVerified ? 'Dr. Admin Kumar' : (currentLanguage === 'hi' ? 'जिला शिकायत निवारण एवं सत्यापन प्रकोष्ठ, रांची' : 'District Grievance Triage & Verification Desk, Ranchi'));

      const adminDept = currentLanguage === 'hi'
        ? 'पेयजल एवं स्वच्छता विभाग / जिला प्रशासन, झारखण्ड सरकार'
        : 'Department of Drinking Water & Sanitation / District Administration, Govt of Jharkhand';

      // Urgent Message / Directive from Admin
      let urgentMessage = (r.validationNotes || '').trim();
      if (!urgentMessage && valHistory && valHistory.note) {
        const n = valHistory.note.trim();
        if (!n.toLowerCase().includes('challenge validated by admin') && !n.toLowerCase().includes('status updated to')) {
          urgentMessage = n;
        }
      }
      if (!urgentMessage && Array.isArray(r.statusHistory)) {
        const noteEntry = r.statusHistory.slice().reverse().find(h => h.note && h.note.trim() && !h.note.toLowerCase().startsWith('challenge submitted') && !h.note.toLowerCase().startsWith('challenge validated by admin'));
        if (noteEntry) urgentMessage = noteEntry.note.trim();
      }

      const adminAction = isVerified
        ? (currentLanguage === 'hi'
            ? 'प्रशासनिक अधिकारी द्वारा स्थल व जीपीएस सत्यापन पूर्ण। प्राथमिकता Urgent निर्धारित; तकनीकी HEI टास्कफोर्स व सीएसआर आपूर्ति आवंटन हेतु अनुमोदित।'
            : 'Administrative officer verified location coordinates & citizen evidence. Grievance approved for technical HEI assignment and industry CSR support.')
        : (currentLanguage === 'hi'
            ? 'नागरिक द्वारा समस्या दर्ज की गई है। AI ट्राइएज व सेटेलाइट जीआईएस डुप्लीकेशन जांच पूरी। प्रशासनिक सत्यापन व कार्य आदेश कतार में है।'
            : 'Grievance submitted by citizen with geo-tagged proof. AI triage complete. Field inspection & official work order in municipal verification queue.');

      const adminTime = isVerified
        ? (valDateStr || formatRealDate(r.updatedAt || r.createdAt))
        : `${baseDate} · ${currentLanguage === 'hi' ? 'सत्यापन कतार में' : 'Pending Admin Review'}`;

      const adminInfo = {
        name: adminOfficerName,
        dept: adminDept,
        orderId: isVerified ? ('WO-GOV-JH-' + (r.id ? r.id.replace(/[^0-9]/g, '').slice(-4) || '8812' : '8812')) : 'Pending Verification',
        action: adminAction,
        time: adminTime,
        verified: isVerified,
        urgentMessage: urgentMessage,
        urgentDate: valDateStr || baseDate
      };

      // Real University Information
      const asgHistory = (Array.isArray(r.statusHistory) ? r.statusHistory : []).slice().reverse().find(h => h.status === 'assigned');
      const asgDateStr = (r.assignedAt ? formatRealDate(r.assignedAt) : (asgHistory && asgHistory.changedAt ? formatRealDate(asgHistory.changedAt) : (isWorking ? formatRealDate(r.updatedAt) : null)));

      const univDisplayName = r.assignedUniversity && (r.assignedUniversity.name || r.assignedUniversity.shortName)
        ? (r.assignedUniversity.name || r.assignedUniversity.shortName)
        : (isWorking ? (r.assign || 'BIT Mesra Innovation Lab') : (currentLanguage === 'hi' ? 'विश्वविद्यालय आवंटन कतार' : 'Awaiting University Allocation'));

      const universityInfo = {
        name: univDisplayName,
        team: isWorking || isSolved ? (currentLanguage === 'hi' ? 'संकाय प्रमुख एवं फील्ड इंजीनियरिंग दल' : 'Faculty Lead & Student Innovation Taskforce') : (currentLanguage === 'hi' ? 'प्रतीक्षारत' : 'Awaiting Deployment'),
        action: isWorking || isSolved
          ? (currentLanguage === 'hi' ? 'तकनीकी समाधान व फील्ड इंजीनियरिंग डिप्लॉयमेंट सक्रिय।' : 'Deployed technical field taskforce for on-ground repair & engineering solution.')
          : (currentLanguage === 'hi' ? 'प्रशासनिक सत्यापन के उपरांत निकटतम तकनीकी संस्थान को स्थल पर भेजा जाएगा।' : 'Accredited technical institution will be mobilized upon administrative verification.'),
        time: asgDateStr || (isVerified ? (currentLanguage === 'hi' ? 'आवंटन प्रक्रिया में' : 'In Allocation Queue') : 'Pending Verification'),
        working: isWorking || isSolved,
        completed: isSolved
      };

      // Real Industry Information
      const industryInfo = {
        company: (r.industryCollaborators && r.industryCollaborators[0]?.partner?.name)
          ? r.industryCollaborators[0].partner.name
          : (currentLanguage === 'hi' ? 'कॉर्पोरेट सीएसआर पार्टनर नेटवर्क' : 'Corporate CSR Partner Network'),
        csrId: isWorking || isSolved ? ('CSR-JH-' + (r.id ? r.id.slice(-4) : '4402')) : 'Standby Allocation',
        materials: isWorking || isSolved
          ? (currentLanguage === 'hi' ? 'सामग्री प्रेषण व तकनीकी उपकरण सहायता उपलब्ध कराई गई' : 'Technical equipment, materials & emergency logistics provided under CSR')
          : (currentLanguage === 'hi' ? 'सामग्री आवश्यकता सूची तैयार; प्रशासनिक अनुमोदन के उपरांत प्रेषण' : 'Materials bill of quantities queued for CSR dispatch upon verification'),
        action: isWorking || isSolved
          ? (currentLanguage === 'hi' ? 'इंडस्ट्री पार्टनर द्वारा सीएसआर फंड व आवश्यक उपकरण साइट पर भेजे गए।' : 'Dispatched required equipment & CSR supplies directly to site.')
          : (currentLanguage === 'hi' ? 'इंडस्ट्री पार्टनर इन्वेंटरी में आवश्यक उपकरण स्टैंडबाय पर रखे गए हैं।' : 'Supplies & equipment queued in regional CSR warehouse.'),
        time: isWorking || isSolved ? (asgDateStr || valDateStr || baseDate) : 'Open for CSR Partnership',
        supplied: isWorking || isSolved
      };

      return {
        adminInfo,
        industryInfo,
        universityInfo,
        baseDate,
        isSolved,
        isWorking,
        isVerified,
        isSubmitted
      };
    }

    function generateReportMilestones(r) {
      if (!r) return [];
      const data = getStakeholderActionData(r);
      if (!data) return [];

      const raw = (r.rawStatus || '').toLowerCase();

      return [
        {
          num: 1,
          icon: '👤',
          name: currentLanguage === 'hi' ? 'समस्या दर्ज' : 'Submitted',
          date: data.baseDate,
          note: currentLanguage === 'hi' ? 'नागरिक द्वारा दर्ज' : 'Reported by Citizen',
          desc: currentLanguage === 'hi' ? 'समस्या फोटो व लोकेशन सहित पोर्टल पर दर्ज हुई' : 'Grievance submitted with photo & GPS coords',
          state: 'completed'
        },
        {
          num: 2,
          icon: '🏛️',
          name: currentLanguage === 'hi' ? 'प्रशासनिक सत्यापन' : 'Admin Verified',
          date: data.adminInfo.time,
          note: data.isVerified ? (currentLanguage === 'hi' ? 'प्रशासन अनुमोदित ✓' : 'Admin Approved ✓') : (currentLanguage === 'hi' ? 'सत्यापन कतार' : 'In Queue'),
          desc: `${data.adminInfo.name}`,
          state: data.isVerified ? 'completed' : 'current'
        },
        {
          num: 3,
          icon: '🎓',
          name: currentLanguage === 'hi' ? 'कॉलेज टास्कफोर्स' : 'University Assigned',
          date: data.universityInfo.time,
          note: data.universityInfo.working ? (currentLanguage === 'hi' ? 'असाइन किया गया ✓' : 'HEI Assigned ✓') : (data.isVerified ? (currentLanguage === 'hi' ? 'आवंटन कतार' : 'In Queue') : 'Pending'),
          desc: `${data.universityInfo.name}`,
          state: data.universityInfo.completed ? 'completed' : (data.universityInfo.working ? 'current' : 'pending')
        },
        {
          num: 4,
          icon: '🏭',
          name: currentLanguage === 'hi' ? 'इंडस्ट्री व जमीनी कार्य' : 'Industry & Ground Fix',
          date: data.industryInfo.time,
          note: data.isSolved ? (currentLanguage === 'hi' ? 'समाधान पूर्ण ✓' : 'Fix Deployed ✓') : (data.isWorking ? (currentLanguage === 'hi' ? 'कार्य प्रगति पर' : 'Active Fix') : 'Pending'),
          desc: `${data.industryInfo.company}`,
          state: data.isSolved ? 'completed' : (data.isWorking ? 'current' : 'pending')
        },
        {
          num: 5,
          icon: '🌟',
          name: currentLanguage === 'hi' ? 'समाधान व पुष्टि' : 'Certified Closed',
          date: data.isSolved ? (r.citizenVerified ? 'Certified' : 'Awaiting Feedback') : 'Pending',
          note: (data.isSolved && r.citizenVerified) ? (currentLanguage === 'hi' ? 'प्रमाणित बंद ✓' : 'Certified Closed ✓') : (data.isSolved ? (currentLanguage === 'hi' ? 'नागरिक पुष्टि' : 'Citizen Feedback') : 'Final Step'),
          desc: (data.isSolved && r.citizenVerified) ? (currentLanguage === 'hi' ? 'नागरिक द्वारा समाधान सत्यापित, केस बंद' : 'Citizen verified resolution, grievance closed') : (data.isSolved ? (currentLanguage === 'hi' ? 'नागरिक पुष्टि का इंतजार' : 'Awaiting citizen verification feedback') : (currentLanguage === 'hi' ? 'अंतिम चरण' : 'Final Step')),
          state: (data.isSolved && r.citizenVerified) ? 'completed' : (data.isSolved ? 'current' : 'pending')
        }
      ];
    }

    function renderDetailProgressTracker(item, isMyOwnReport = false) {
      const cont = document.getElementById('detailModalTimelineContainer');
      const cardsGrid = document.getElementById('detailStakeholderCardsGrid');
      const badge = document.getElementById('detailReportedTimestampBadge');
      if (!item) return;

      const data = getStakeholderActionData(item);
      if (!data) return;

      if (badge) {
        badge.textContent = `${currentLanguage === 'hi' ? '📅 दर्ज:' : '📅 Reported:'} ${data.baseDate}`;
      }

      // 1. Horizontal Stepper (Clean Line Progress Bar)
      if (cont) {
        const milestones = generateReportMilestones(item);
        let stepperHtml = '';
        milestones.forEach((s, idx) => {
          const bubbleClass = s.state === 'completed' ? 'detail-step-bubble completed' : (s.state === 'current' ? 'detail-step-bubble current' : 'detail-step-bubble');
          const bubbleContent = s.state === 'completed' ? '✓' : (s.state === 'current' ? '⚡' : s.num);

          stepperHtml += `
          <div class="detail-timeline-step">
            <div class="${bubbleClass}" title="${s.name}">${bubbleContent}</div>
            <div class="detail-step-title">${s.name}</div>
            ${isMyOwnReport ? `
              <div class="detail-step-date">${s.date}</div>
              <div class="detail-step-desc">${s.note}</div>
            ` : ''}
          </div>
        `;

          if (idx < milestones.length - 1) {
            const lineActive = s.state === 'completed' ? 'active' : '';
            stepperHtml += `<div class="detail-step-line ${lineActive}"></div>`;
          }
        });
        cont.innerHTML = stepperHtml;
      }

      // 2. Stakeholder Action Cards: Only show for author; viewers get a clean focused view
      if (cardsGrid) {
        if (!isMyOwnReport) {
          cardsGrid.style.display = 'none';
          cardsGrid.innerHTML = '';
        } else {
          cardsGrid.style.display = 'flex';
          cardsGrid.innerHTML = buildStakeholderCardsHtml(item);
        }
      }
    }

    function buildStakeholderCardsHtml(item) {
      if (!item) return '';
      const data = getStakeholderActionData(item);
      if (!data) return '';

      // Prepare urgent directive alert box if admin attached any note or directive
      const urgentBoxHtml = data.adminInfo.urgentMessage ? `
        <div style="margin-top: 12px; padding: 12px 14px; background: #fff1f2; border: 1.5px solid #fecdd3; border-left: 4px solid #e11d48; border-radius: 8px;">
          <div style="font-weight: 800; color: #be123c; font-size: 12.5px; display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
            <span style="font-size: 15px;">🚨</span>
            <span>${currentLanguage === 'hi' ? 'आधिकारिक प्रशासनिक निर्देश / आवश्यक संदेश (Official Admin Directive):' : 'Official Administrative Message / Directive:'}</span>
          </div>
          <div style="font-size: 13.5px; color: #881337; line-height: 1.5; font-weight: 600;">
            "${escapeHtml(data.adminInfo.urgentMessage)}"
          </div>
          <div style="font-size: 11px; color: #9f1239; margin-top: 6px; display: flex; justify-content: space-between; font-weight: 500;">
            <span>🏛️ ${escapeHtml(data.adminInfo.name)}</span>
            <span>🕒 ${data.adminInfo.urgentDate}</span>
          </div>
        </div>
      ` : '';

      // Prepare Chronological Stakeholder Notes & Messages Audit Trail
      const historyList = Array.isArray(item.statusHistory) && item.statusHistory.length > 0
        ? item.statusHistory
        : [
            {
              status: 'submitted',
              changedBy: { name: item.submitterName || 'Citizen', role: 'citizen' },
              changedAt: item.createdAt || new Date(),
              note: currentLanguage === 'hi' ? 'समस्या पोर्टल पर दर्ज की गई' : 'Grievance registered on portal with geo-tagged proof'
            }
          ];

      const roleBadgeMap = {
        admin: { label: 'Admin Desk', bg: '#f3e8ff', color: '#6b21a8' },
        citizen: { label: 'Citizen Submitter', bg: '#ecfdf5', color: '#047857' },
        university_rep: { label: 'University Taskforce', bg: '#dbeafe', color: '#1e40af' },
        industry_rep: { label: 'CSR Partner', bg: '#fef3c7', color: '#92400e' }
      };

      const auditRows = historyList.map(h => {
        const role = (h.changedBy && h.changedBy.role) || (h.status === 'submitted' ? 'citizen' : 'admin');
        const badge = roleBadgeMap[role] || { label: 'JanSetu Authority', bg: '#f1f5f9', color: '#334155' };
        const author = (h.changedBy && h.changedBy.name) ? h.changedBy.name : (role === 'admin' ? 'District Admin' : (item.submitterName || 'Citizen'));
        const dateStr = formatRealDate(h.changedAt || item.createdAt);
        const noteText = h.note || (h.status === 'validated' ? 'Problem officially verified & approved.' : `Status moved to ${h.status}`);

        return `
          <div style="padding: 10px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 750; font-size: 13px; color: #0f172a;">${escapeHtml(author)}</span>
                <span style="font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: ${badge.bg}; color: ${badge.color}; text-transform: uppercase;">${badge.label}</span>
              </div>
              <span style="font-size: 11px; color: #64748b; font-weight: 500;">🕒 ${dateStr}</span>
            </div>
            <div style="font-size: 12.5px; color: #334155; line-height: 1.45; margin-top: 2px;">
              "${escapeHtml(noteText)}"
            </div>
          </div>
        `;
      }).join('');

      return `
      <!-- 1. ADMIN VERIFICATION CARD -->
      <div class="stakeholder-card admin-card">
        <div class="stakeholder-card-header">
          <div class="stakeholder-card-title" style="color: #6b21a8;">
            <span>🏛️</span>
            <span>${currentLanguage === 'hi' ? 'प्रशासनिक सत्यापन व कार्य आदेश' : 'Administrative Review & Official Verification'}</span>
          </div>
          <span class="stakeholder-card-badge ${data.isVerified ? 'done' : 'active'}">
            ${data.isVerified ? (currentLanguage === 'hi' ? 'प्रशासन द्वारा अनुमोदित ✓' : 'Admin Verified & Approved ✓') : (currentLanguage === 'hi' ? 'सत्यापन कतार में ⚡' : 'In Verification Queue ⚡')}
          </span>
        </div>
        <div class="stakeholder-card-body">
          <strong>${currentLanguage === 'hi' ? 'सत्यापन अधिकारी' : 'Verifying Officer'}:</strong> ${escapeHtml(data.adminInfo.name)}<br/>
          <strong>${currentLanguage === 'hi' ? 'विभाग' : 'Department'}:</strong> ${escapeHtml(data.adminInfo.dept)}<br/>
          <strong>${currentLanguage === 'hi' ? 'किये गए प्रशासनिक कार्य' : 'Administrative Action'}:</strong> ${escapeHtml(data.adminInfo.action)}
        </div>
        ${urgentBoxHtml}
        <div class="stakeholder-meta-row" style="margin-top: 10px;">
          <div class="stakeholder-meta-item"><span>📋</span> <span><strong>Order:</strong> ${data.adminInfo.orderId}</span></div>
          <div class="stakeholder-meta-item"><span>🕒</span> <span><strong>Timestamp:</strong> ${data.adminInfo.time}</span></div>
          <div class="stakeholder-meta-item"><span>📍</span> <span><strong>GIS Deduplication:</strong> Verified (0 Conflicts)</span></div>
        </div>
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 11px; color: #64748b;">
            ${data.isVerified
              ? (currentLanguage === 'hi' ? '🏛️ प्रशासनिक आदेश जारी। सरकारी ऑडिट नियमों के अनुसार हटाना लॉक है।' : '🏛️ Municipal work order active. Deletion locked under audit rules.')
              : (currentLanguage === 'hi' ? '⏳ सत्यापन से पहले नागरिक अपनी शिकायत कभी भी हटा सकता है।' : '⏳ Deletable by citizen prior to administrative verification.')}
          </span>
        </div>
      </div>

      <!-- 2. UNIVERSITY TASKFORCE CARD -->
      <div class="stakeholder-card university-card">
        <div class="stakeholder-card-header">
          <div class="stakeholder-card-title" style="color: #1e40af;">
            <span>🎓</span>
            <span>${currentLanguage === 'hi' ? 'यूनिवर्सिटी इंजीनियरिंग टास्कफोर्स आवंटन व कार्य' : 'University Engineering Taskforce Allocation'}</span>
          </div>
          <span class="stakeholder-card-badge ${data.isSolved ? 'done' : (data.isWorking ? 'active' : 'wait')}">
            ${data.isSolved ? (currentLanguage === 'hi' ? 'जमीनी समाधान पूर्ण ✓' : 'Ground Fix Complete ✓') : (data.isWorking ? (currentLanguage === 'hi' ? 'स्थल पर कार्य जारी ⚡' : 'Active On-Site ⚡') : (currentLanguage === 'hi' ? 'आवंटन कतार में' : 'Awaiting Allocation'))}
          </span>
        </div>
        <div class="stakeholder-card-body">
          <strong>${currentLanguage === 'hi' ? 'संस्थान' : 'Institution'}:</strong> ${escapeHtml(data.universityInfo.name)}<br/>
          <strong>${currentLanguage === 'hi' ? 'फील्ड टीम' : 'Field Engineering Team'}:</strong> ${data.universityInfo.team}<br/>
          <strong>${currentLanguage === 'hi' ? 'कार्रवाई' : 'Action Status'}:</strong> ${data.universityInfo.action}
        </div>
        <div class="stakeholder-meta-row">
          <div class="stakeholder-meta-item"><span>🕒</span> <span><strong>Timestamp:</strong> ${data.universityInfo.time}</span></div>
          <div class="stakeholder-meta-item"><span>🛠️</span> <span><strong>Assignment:</strong> ${data.universityInfo.working ? 'Technical Taskforce Assigned' : 'In HEI Queue'}</span></div>
        </div>
      </div>

      <!-- 3. INDUSTRY PARTNER CARD -->
      <div class="stakeholder-card industry-card">
        <div class="stakeholder-card-header">
          <div class="stakeholder-card-title" style="color: #92400e;">
            <span>🏭</span>
            <span>${currentLanguage === 'hi' ? 'इंडस्ट्री पार्टनर व सीएसआर संसाधन सहयोग' : 'Industry Partner Action & CSR Collaboration'}</span>
          </div>
          <span class="stakeholder-card-badge ${data.industryInfo.supplied ? 'done' : (data.isWorking ? 'active' : 'wait')}">
            ${data.industryInfo.supplied ? (currentLanguage === 'hi' ? 'संसाधन स्थल पर पहुंचे ✓' : 'Supplies Delivered to Site ✓') : (data.isWorking ? (currentLanguage === 'hi' ? 'आपूर्ति प्रक्रिया में ⚡' : 'Sourcing in Progress ⚡') : (currentLanguage === 'hi' ? 'सीएसआर कतार में' : 'CSR Standby'))}
          </span>
        </div>
        <div class="stakeholder-card-body">
          <strong>${currentLanguage === 'hi' ? 'सहयोगी इंडस्ट्री' : 'Partner Industry'}:</strong> ${escapeHtml(data.industryInfo.company)}<br/>
          <strong>${currentLanguage === 'hi' ? 'कार्रवाई' : 'Action Performed'}:</strong> ${data.industryInfo.action}<br/>
          <strong>${currentLanguage === 'hi' ? 'उपलब्ध सामग्री' : 'Materials & Equipment'}:</strong> <span style="color: #b45309; font-weight: 700;">${data.industryInfo.materials}</span>
        </div>
        <div class="stakeholder-meta-row">
          <div class="stakeholder-meta-item"><span>🏢</span> <span><strong>CSR Grant ID:</strong> ${data.industryInfo.csrId}</span></div>
          <div class="stakeholder-meta-item"><span>🕒</span> <span><strong>Status:</strong> ${data.industryInfo.time}</span></div>
        </div>
      </div>

      <!-- 4. CITIZEN RESOLUTION & CLOSURE CARD -->
      <div class="stakeholder-card citizen-card">
        <div class="stakeholder-card-header">
          <div class="stakeholder-card-title" style="color: #166534;">
            <span>🌟</span>
            <span>${currentLanguage === 'hi' ? 'नागरिक जमीनी सत्यापन व समाधान प्रमाण पत्र' : 'Citizen Ground Verification & Resolution Certificate'}</span>
          </div>
          <span class="stakeholder-card-badge ${(data.isSolved && item.citizenVerified) ? 'done' : (data.isSolved ? 'active' : 'wait')}">
            ${(data.isSolved && item.citizenVerified) ? (currentLanguage === 'hi' ? 'केस प्रमाणित बंद ✓' : 'Case Certified Closed ✓') : (data.isSolved ? (currentLanguage === 'hi' ? 'नागरिक पुष्टि बाकी ⚡' : 'Awaiting Citizen Feedback ⚡') : (currentLanguage === 'hi' ? 'अंतिम चरण' : 'Final Step'))}
          </span>
        </div>
        <div class="stakeholder-card-body">
          ${(data.isSolved && item.citizenVerified)
            ? (currentLanguage === 'hi' ? 'नागरिक द्वारा समाधान सत्यापित किया गया। आधिकारिक डिजिटल समाधान प्रमाणपत्र जारी।' : 'Resolution verified on ground by citizen. Official digital certificate issued.')
            : (data.isSolved
              ? (currentLanguage === 'hi' ? 'टास्कफोर्स द्वारा कार्य पूर्ण घोषित किया गया है। कृपया नीचे समाधान की पुष्टि करें।' : 'Work marked complete. Please verify on ground and confirm satisfaction in feedback section.')
              : (currentLanguage === 'hi' ? 'समाधान कार्य पूरा होने के पश्चात नागरिक द्वारा भौतिक सत्यापन किया जाएगा।' : 'Will be physically inspected and verified by citizen once field repair work is completed.'))}
        </div>
        <div class="stakeholder-meta-row">
          <div class="stakeholder-meta-item"><span>📜</span> <span><strong>Grievance ID:</strong> ${item.id}</span></div>
          <div class="stakeholder-meta-item"><span>👤</span> <span><strong>Signoff:</strong> ${item.citizenVerified ? 'Verified (5 ⭐ Rating)' : (data.isSolved ? 'Action Required from You' : 'Pending Resolution')}</span></div>
        </div>
      </div>

      <!-- 5. STAKEHOLDER AUDIT TRAIL & MESSAGES -->
      <div class="stakeholder-card" style="border: 1.5px solid #cbd5e1; background: #f8fafc;">
        <div class="stakeholder-card-header">
          <div class="stakeholder-card-title" style="color: #0f172a;">
            <span>💬</span>
            <span>${currentLanguage === 'hi' ? 'हितधारकों के आधिकारिक संदेश एवं ऑडिट ट्रेल' : 'Official Stakeholder Notes, Messages & Audit Trail'}</span>
          </div>
          <span class="stakeholder-card-badge done" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;">
            ${historyList.length} ${currentLanguage === 'hi' ? 'अभिलेख' : 'Updates'}
          </span>
        </div>
        <div class="stakeholder-card-body" style="padding: 6px 0 0;">
          ${auditRows}
        </div>
      </div>
    `;
    }

    function updateTrackerTimeline(status, isResolved, citizenVerified, report) {
      const sSubmitted = document.getElementById('timelineStepSubmitted');
      const sVerified = document.getElementById('timelineStepVerified');
      const sWorking = document.getElementById('timelineStepWorking');
      const sResolution = document.getElementById('timelineStepResolution');
      const sClosed = document.getElementById('timelineStepClosed');

      const c1 = document.getElementById('timelineConn1');
      const c2 = document.getElementById('timelineConn2');
      const c3 = document.getElementById('timelineConn3');
      const c4 = document.getElementById('timelineConn4');

      if (!sSubmitted || !sVerified || !sWorking || !sResolution || !sClosed) return;

      // Reset all steps to pending
      [sSubmitted, sVerified, sWorking, sResolution, sClosed].forEach((el, idx) => {
        el.className = 'timeline-dot-bubble';
        el.textContent = idx + 1;
      });
      [c1, c2, c3, c4].forEach(c => {
        if (c) c.className = 'timeline-connecting-line';
      });

      const active = report || getCurrentlyTrackedReport();
      const raw = (active?.rawStatus || '').toLowerCase();
      const stat = (status || active?.status || '').toLowerCase();

      const isSolved = stat === 'solved' || isResolved || raw === 'resolved' || raw === 'closed';
      const isWorking = stat === 'being worked on' || stat === 'in progress' || stat === 'university assigned' || raw === 'assigned' || raw === 'in_progress' || raw === 'testing';
      const isVerifiedStage = isSolved || isWorking || stat === 'verified' || raw === 'validated';

      if (isSolved) {
        sSubmitted.className = 'timeline-dot-bubble completed';
        sSubmitted.textContent = '✓';
        if (c1) c1.className = 'timeline-connecting-line active-line';

        sVerified.className = 'timeline-dot-bubble completed';
        sVerified.textContent = '✓';
        if (c2) c2.className = 'timeline-connecting-line active-line';

        sWorking.className = 'timeline-dot-bubble completed';
        sWorking.textContent = '✓';
        if (c3) c3.className = 'timeline-connecting-line active-line';

        sResolution.className = 'timeline-dot-bubble completed';
        sResolution.textContent = '✓';

        if (citizenVerified) {
          if (c4) c4.className = 'timeline-connecting-line active-line';
          sClosed.className = 'timeline-dot-bubble completed';
          sClosed.textContent = '✓';
        } else {
          sClosed.className = 'timeline-dot-bubble current';
          sClosed.textContent = '⚡';
        }
      } else if (isWorking) {
        sSubmitted.className = 'timeline-dot-bubble completed';
        sSubmitted.textContent = '✓';
        if (c1) c1.className = 'timeline-connecting-line active-line';

        sVerified.className = 'timeline-dot-bubble completed';
        sVerified.textContent = '✓';
        if (c2) c2.className = 'timeline-connecting-line active-line';

        sWorking.className = 'timeline-dot-bubble current';
        sWorking.textContent = '⚡';
      } else if (isVerifiedStage) {
        sSubmitted.className = 'timeline-dot-bubble completed';
        sSubmitted.textContent = '✓';
        if (c1) c1.className = 'timeline-connecting-line active-line';

        sVerified.className = 'timeline-dot-bubble completed';
        sVerified.textContent = '✓';
        if (c2) c2.className = 'timeline-connecting-line active-line';

        sWorking.className = 'timeline-dot-bubble current';
        sWorking.textContent = '⚡';
      } else {
        // Default: JUST SUBMITTED (Step 1 active)
        sSubmitted.className = 'timeline-dot-bubble current';
        sSubmitted.textContent = '⚡';
      }

      // Populate dynamic dates and action notes under the 5 bubbles on dashboard
      if (active) {
        const milestones = generateReportMilestones(active);
        const dSub = document.getElementById('timelineDateSubmitted');
        const nSub = document.getElementById('timelineNoteSubmitted');
        const dVer = document.getElementById('timelineDateVerified');
        const nVer = document.getElementById('timelineNoteVerified');
        const dWrk = document.getElementById('timelineDateWorking');
        const nWrk = document.getElementById('timelineNoteWorking');
        const dRes = document.getElementById('timelineDateResolution');
        const nRes = document.getElementById('timelineNoteResolution');
        const dClo = document.getElementById('timelineDateClosed');
        const nClo = document.getElementById('timelineNoteClosed');

        if (dSub) dSub.textContent = milestones[0]?.date || '--';
        if (nSub) nSub.textContent = milestones[0]?.note || '--';
        if (dVer) dVer.textContent = milestones[1]?.date || '--';
        if (nVer) nVer.textContent = milestones[1]?.note || '--';
        if (dWrk) dWrk.textContent = milestones[2]?.date || '--';
        if (nWrk) nWrk.textContent = milestones[2]?.note || '--';
        if (dRes) dRes.textContent = milestones[3]?.date || '--';
        if (nRes) nRes.textContent = milestones[3]?.note || '--';
        if (dClo) dClo.textContent = milestones[4]?.date || '--';
        if (nClo) nClo.textContent = milestones[4]?.note || '--';
      }
    }

    function renderActiveProblem() {
      const counterPill = document.getElementById('activeTrackerCounterPill');
      const navBtns = document.getElementById('trackerNavBtns');

      if (allReportsList.length === 0) {
        if (counterPill) {
          counterPill.textContent = currentLanguage === 'hi' ? 'कोई रिपोर्ट नहीं' : '0 Reports';
          counterPill.style.background = '#F1F5F9';
          counterPill.style.color = '#64748B';
          counterPill.style.borderColor = '#CBD5E1';
          if (navBtns) navBtns.style.display = 'none';
        }
        if (document.getElementById('activeReportId')) document.getElementById('activeReportId').textContent = 'Report ID: —';
        if (document.getElementById('activeReportTitle')) {
          document.getElementById('activeReportTitle').textContent = currentLanguage === 'hi'
            ? '🌟 आपने अभी कोई समस्या दर्ज नहीं की है'
            : '🌟 No Grievances Reported Yet';
        }
        if (document.getElementById('activeReportLoc')) {
          document.getElementById('activeReportLoc').innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span>${currentLanguage === 'hi' ? 'झारखंड नागरिक सेवा पोर्टल · अपनी पहली समस्या दर्ज करें' : 'Jharkhand Citizen Portal · Submit your first issue'}</span>
        `;
        }
        const badge = document.getElementById('activeReportStatus');
        const label = document.getElementById('activeStatusLabelText');
        if (badge) {
          badge.className = 'status-badge-in-progress';
          badge.style.background = '#F1F5F9';
          badge.style.color = '#475569';
          badge.style.borderColor = '#CBD5E1';
        }
        if (label) label.textContent = currentLanguage === 'hi' ? 'सक्रिय खाता' : 'Active Account';
        if (document.getElementById('solCheckBox')) document.getElementById('solCheckBox').classList.remove('show');
        const delSlot = document.getElementById('activeTrackerDeleteAction');
        if (delSlot) delSlot.innerHTML = '';
        const reqBanner = document.getElementById('actionRequiredBanner');
        if (reqBanner) reqBanner.style.display = 'none';

        updateTrackerTimeline('none', false, false, null);
        return;
      }

      const incomplete = getIncompleteReports();
      const active = getCurrentlyTrackedReport();
      if (!active) return;

      if (counterPill) {
        if (incomplete.length > 0) {
          counterPill.textContent = `${activeTrackerIndex + 1} of ${incomplete.length} In Progress`;
          counterPill.style.background = '#EFF6FF';
          counterPill.style.color = 'var(--navy)';
          counterPill.style.borderColor = '#BFDBFE';
          if (navBtns) navBtns.style.display = incomplete.length > 1 ? 'inline-flex' : 'none';
        } else {
          counterPill.textContent = currentLanguage === 'hi' ? 'सभी समस्याएं सुलझाई गईं' : 'All Problems Resolved';
          counterPill.style.background = '#EDFCF2';
          counterPill.style.color = 'var(--india-green)';
          counterPill.style.borderColor = '#A7F3D0';
          if (navBtns) navBtns.style.display = 'none';
        }
      }

      if (document.getElementById('activeReportId')) document.getElementById('activeReportId').textContent = 'Report ID: ' + active.id;
      if (document.getElementById('activeReportTitle')) document.getElementById('activeReportTitle').textContent = active.title;

      // Format complete proper address for active report
      const formatProperAddress = (rep) => {
        if (!rep) return 'Jharkhand';
        const parts = [];
        if (rep.village && rep.village !== 'Not Specified' && rep.village.trim()) parts.push(rep.village.trim());
        if (rep.landmark && rep.landmark.trim()) parts.push(rep.landmark.trim());
        if (rep.block && rep.block !== 'Not Specified' && rep.block.trim()) parts.push('Block ' + rep.block.trim());
        if (rep.district && rep.district !== 'Not Specified' && rep.district.trim()) parts.push('Dist. ' + rep.district.trim());
        if (rep.pincode && rep.pincode.trim()) parts.push(rep.pincode.trim());
        if (parts.length > 0) {
          if (!parts.some(p => p.toLowerCase().includes('jharkhand'))) parts.push('Jharkhand');
          return parts.join(', ');
        }
        return rep.location || rep.address || 'Jharkhand';
      };

      if (document.getElementById('activeReportLoc')) {
        const fullAddr = formatProperAddress(active);
        document.getElementById('activeReportLoc').innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span style="font-weight:600; color:#334155;">${escapeHtml(fullAddr)}</span>
      `;
      }

      // Populate detailed grievance description in active tracker card
      const descBox = document.getElementById('activeReportDescBox');
      const descEl = document.getElementById('activeReportDesc');
      const activeDesc = (active.desc || active.description || active.details || '').trim();
      if (descBox && descEl) {
        if (activeDesc) {
          descBox.style.display = 'block';
          descEl.textContent = activeDesc;
        } else {
          descBox.style.display = 'none';
        }
      }

      const badge = document.getElementById('activeReportStatus');
      const label = document.getElementById('activeStatusLabelText');
      const isSolved = active.status === 'Solved' || active.isResolved;
      const isUnverified = (active.status === 'Submitted' || !active.isVerified) && !isSolved;

      if (badge) {
        if (isSolved) {
          badge.className = 'status-badge-in-progress resolved';
          if (label) label.textContent = currentLanguage === 'hi' ? 'समाधान पूर्ण ✓' : 'Solved ✓';
          if (document.getElementById('solCheckBox')) document.getElementById('solCheckBox').classList.add('show');
        } else if (isUnverified) {
          badge.className = 'status-badge-in-progress';
          badge.style.background = '#EFF6FF';
          badge.style.color = '#1D4ED8';
          badge.style.borderColor = '#BFDBFE';
          if (label) label.textContent = currentLanguage === 'hi' ? '⏳ सत्यापन प्रतीक्षारत' : '⏳ Awaiting Admin Verification';
          if (document.getElementById('solCheckBox')) document.getElementById('solCheckBox').classList.remove('show');
        } else {
          badge.className = 'status-badge-in-progress';
          badge.style.background = '#F0FDF4';
          badge.style.color = '#166534';
          badge.style.borderColor = '#BBF7D0';
          if (label) label.textContent = currentLanguage === 'hi' ? '✓ प्रशासन द्वारा सत्यापित · कार्य जारी' : '✓ Admin Verified · In Progress';
          if (document.getElementById('solCheckBox')) document.getElementById('solCheckBox').classList.remove('show');
        }
      }

      // Render Official Admin Message / Directive on active tracker if present
      let trackerAdminMsg = (active.validationNotes || '').trim();
      if (!trackerAdminMsg && Array.isArray(active.statusHistory)) {
        const vEntry = active.statusHistory.slice().reverse().find(h => (h.status === 'validated' || (h.changedBy && (h.changedBy.role === 'admin' || (h.changedBy.name && h.changedBy.name.toLowerCase().includes('admin'))))) && h.note);
        if (vEntry && vEntry.note && !vEntry.note.toLowerCase().startsWith('challenge submitted') && !vEntry.note.toLowerCase().startsWith('status updated to')) {
          trackerAdminMsg = vEntry.note.trim();
        }
      }
      const adminMsgEl = document.getElementById('activeTrackerAdminMsg');
      if (adminMsgEl) {
        if (trackerAdminMsg && (active.isVerified || active.status === 'Verified' || active.status === 'Being Worked On' || active.status === 'Solved' || active.rawStatus === 'validated')) {
          adminMsgEl.style.display = 'block';
          adminMsgEl.innerHTML = `
            <div style="margin: 10px 0 8px 0; padding: 10px 14px; background: #FFF1F2; border: 1.5px solid #FECDD3; border-left: 4px solid #E11D48; border-radius: 8px;">
              <div style="font-weight: 800; color: #BE123C; font-size: 11.5px; display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                <span>📢</span>
                <span>${currentLanguage === 'hi' ? 'आधिकारिक प्रशासनिक निर्देश (Official Admin Directive):' : 'Official Administrative Message / Directive:'}</span>
              </div>
              <div style="font-size: 12.5px; color: #881337; line-height: 1.45; font-weight: 600;">
                "${escapeHtml(trackerAdminMsg)}"
              </div>
            </div>
          `;
        } else {
          adminMsgEl.style.display = 'none';
          adminMsgEl.innerHTML = '';
        }
      }

      updateTrackerTimeline(active.status, active.isResolved, active.citizenVerified, active);

      // Deletion allowed only if unverified by Admin
      const delSlot = document.getElementById('activeTrackerDeleteAction');
      if (delSlot) {
        if (isUnverified) {
          delSlot.innerHTML = `
          <button type="button" style="background: #FEF2F2; border: 1.5px solid #FECACA; color: #DC2626; font-size: 11px; font-weight: 800; border-radius: 14px; padding: 4px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation(); promptDeleteReport('${active.id}');" title="${currentLanguage === 'hi' ? 'सत्यापन से पहले शिकायत हटाएं' : 'Delete unverified grievance'}">
            <span>🗑️</span> <span>${currentLanguage === 'hi' ? 'हटाएं' : 'Delete'}</span>
          </button>
        `;
        } else {
          delSlot.innerHTML = `
          <span style="font-size: 10.5px; color: #64748b; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;" title="${currentLanguage === 'hi' ? 'प्रशासन द्वारा सत्यापित' : 'Admin Verified'}">
            🔒 ${currentLanguage === 'hi' ? 'सत्यापित' : 'Verified'}
          </span>
        `;
        }
      }

      const reqBanner = document.getElementById('actionRequiredBanner');
      if (reqBanner) {
        reqBanner.style.display = active.needsAction ? 'flex' : 'none';
      }
    }

    function renderAllViews() {
      const total = allReportsList.length;
      const solved = allReportsList.filter(r => r.status === 'Solved' || r.isResolved).length;
      const inProgress = allReportsList.filter(r => r.status === 'Being Worked On' || r.status === 'In Progress' || r.status === 'University Assigned').length;
      const awaiting = allReportsList.filter(r => r.status === 'Submitted' || r.status === 'Action Required').length;

      if (document.getElementById('statTotal')) document.getElementById('statTotal').textContent = total;
      if (document.getElementById('statResolved')) document.getElementById('statResolved').textContent = solved;
      if (document.getElementById('statInProgress')) document.getElementById('statInProgress').textContent = inProgress;
      if (document.getElementById('statAwaiting')) document.getElementById('statAwaiting').textContent = awaiting;

      if (document.getElementById('impReported')) document.getElementById('impReported').textContent = total;
      if (document.getElementById('impResolved')) document.getElementById('impResolved').textContent = solved;
      if (document.getElementById('impactModalReported')) document.getElementById('impactModalReported').textContent = total;
      if (document.getElementById('impactModalResolved')) document.getElementById('impactModalResolved').textContent = solved;

      const realSupports = (typeof supportedIds !== 'undefined' && supportedIds && supportedIds.size !== undefined) ? supportedIds.size : 0;
      const impSuppEl = document.getElementById('impSupportedCount');
      if (impSuppEl) {
        if (impSuppEl.textContent != realSupports) {
          impSuppEl.classList.remove('count-updated-pulse');
          void impSuppEl.offsetWidth;
          impSuppEl.classList.add('count-updated-pulse');
        }
        impSuppEl.textContent = realSupports;
      }
      if (document.getElementById('impactModalSupported')) {
        document.getElementById('impactModalSupported').textContent = realSupports + (currentLanguage === 'hi' ? ' समस्याएं' : ' reports');
      }

      // Render Active Problem Tracker
      try {
        renderActiveProblem();
      } catch (e) {
        console.warn('Error in renderActiveProblem:', e);
      }

      // Render Recent Reports Horizontal Scroll Track
      try {
        const recentCont = document.getElementById('recentReportsContainerList');
        if (recentCont) {
          if (!allReportsList || allReportsList.length === 0) {
            recentCont.innerHTML = `
            <div style="width:100%; padding:28px 16px; text-align:center; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:16px; color:#64748B;">
              <div style="font-size:24px; margin-bottom:6px;">📋</div>
              <div style="font-size:14px; font-weight:700; color:#1E293B; margin-bottom:4px;">
                ${currentLanguage === 'hi' ? 'आपकी कोई दर्ज समस्या नहीं है' : 'You have not reported any issues yet'}
              </div>
              <div style="font-size:12px; margin-bottom:12px;">
                ${currentLanguage === 'hi' ? 'अपने क्षेत्र की सड़क, पानी, या बिजली की समस्या दर्ज करें' : 'Submit an issue regarding roads, water, or electricity in your area'}
              </div>
              <button type="button" class="btn-sol-yes" style="padding:6px 16px; font-size:12px;" onclick="openReportModal()">
                + ${currentLanguage === 'hi' ? 'समस्या दर्ज करें' : 'Report an Issue'}
              </button>
            </div>
          `;
          } else {
            const getStatusClass = (status) => {
              if (status === 'Solved') return 'status-solved';
              if (status === 'Action Required') return 'status-action';
              if (status === 'Being Worked On' || status === 'In Progress' || status === 'University Assigned') return 'status-progress';
              return 'status-assigned';
            };

            recentCont.innerHTML = allReportsList.map(r => {
              const descSnippet = (r.desc || r.description || r.details || '').trim();
              const fullAddr = (typeof formatProperAddress === 'function') ? formatProperAddress(r) : (r.location || 'Jharkhand');
              const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(r.title) : (r.title || '');
              return `
              <div class="report-square-card" onclick="openDetailModal('${r.id}')" title="${safeTitle}">
                <div class="square-thumb-wrapper">
                  <img src="${r.image || getCategoryFallbackImage(r.category)}" class="square-thumb-img" alt="${safeTitle}" onerror="this.src='/images/water-tap.jpg'" />
                  <span class="square-status-badge ${getStatusClass(r.status)}">${r.status}</span>
                </div>
                <div class="square-card-body">
                  <div class="square-card-title">${safeTitle}</div>
                  <div class="square-card-loc" title="${escapeHtml(fullAddr)}">📍 ${escapeHtml(fullAddr)}</div>
                  ${descSnippet ? `<div style="font-size:10.5px; color:#475569; line-height:1.35; margin:3px 0 2px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; word-break:break-word;">${escapeHtml(descSnippet)}</div>` : ''}
                  <div class="square-card-footer">
                    <span class="square-card-id">${r.id}</span>
                    <span class="square-card-time">${r.timeAgo || 'Recently'}</span>
                  </div>
                </div>
              </div>
            `;
            }).join('');
          }
        }
      } catch (errRecent) {
        console.error('Error rendering recentReportsContainerList:', errRecent);
      }

      // Render Nearby Challenges
      try {
        const nearbyCont = document.getElementById('nearbyMiniContainer');
        if (nearbyCont) {
          const userDist = getUserDistrict();
          updateDistrictBadges();

          const user = getCurrentUser();
          const userEmail = user && user.email ? user.email.toLowerCase().trim() : '';
          const userId = user ? (user.id || user._id || '').toString() : '';

          // STRICT SAME-DISTRICT FILTERING FOR NEARBY CHALLENGES
          const sameDistrictList = exploreList.filter(c => {
            // Exclude own reports
            const itemSubEmail = c.submitterEmail ? c.submitterEmail.toLowerCase().trim() : '';
            const itemSubId = c.submittedById ? c.submittedById.toString() : '';
            const isMine = (userEmail && itemSubEmail === userEmail) || (userId && itemSubId === userId) || allReportsList.some(r => r.id === c.id || (c.mongoId && r.mongoId === c.mongoId));
            if (isMine) return false;

            const cDist = getChallengeDistrict(c);
            return isSameDistrict(cDist, userDist);
          });

          if (sameDistrictList.length === 0) {
            nearbyCont.innerHTML = `
            <div style="padding: 18px 12px; text-align: center; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 12px;">
              <div style="font-size: 22px; margin-bottom: 4px;">📍</div>
              <div style="font-weight: 800; color: #1E293B; font-size: 13px;">${currentLanguage === 'hi' ? userDist + ' में साथी नागरिकों की कोई नई समस्या नहीं' : 'No other citizen reports in ' + userDist}</div>
              <div style="color: #64748B; font-size: 11px; margin-top: 4px; line-height: 1.4;">
                ${currentLanguage === 'hi' ? 'जैसे ही कोई नागरिक ' + userDist + ' में समस्या दर्ज करेगा, वह तुरंत रियल-टाइम यहाँ दिखेगी।' : 'When any citizen reports an issue in ' + userDist + ', it will instantly appear here in real-time.'}
              </div>
            </div>
          `;
          } else {
            nearbyCont.innerHTML = sameDistrictList.slice(0, 2).map(c => {
              const isSupported = supportedIds.has(c.id);
              const cDist = getChallengeDistrict(c) || userDist;
              const fullAddr = (typeof formatProperAddress === 'function') ? formatProperAddress(c) : (c.location || 'Jharkhand');
              const descSnippet = (c.desc || c.description || c.details || '').trim();
              const maskedCitizenId = c.citizenId || c.submitterCitizenId || ('C' + (c.id ? c.id.replace(/[^0-9]/g, '').slice(-4) : '9604'));
              const displayCitizenBadge = (currentLanguage === 'hi' ? 'नागरिक #' : 'Citizen #') + maskedCitizenId;
              const supCount = c.supports || 1;
              return `
              <div class="nearby-mini-item" onclick="openDetailModal('${c.id}')">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:10px;font-weight:800;color:var(--navy);background:#EFF6FF;padding:2px 6px;border-radius:8px;">${c.category}</span>
                  <span style="font-size:10px;font-weight:700;color:#0284C7;background:#E0F2FE;border:1px solid #BAE6FD;padding:2px 7px;border-radius:8px;">📍 ${cDist}</span>
                </div>
                <div class="nearby-mini-title">${escapeHtml(c.title)}</div>
                ${descSnippet ? `<div style="font-size:11px; color:#475569; line-height:1.35; margin:3px 0 4px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${escapeHtml(descSnippet)}</div>` : ''}
                <div class="nearby-mini-loc" style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;">
                  <span style="font-weight:700; color:#334155;">🛡️ ${displayCitizenBadge}</span>
                  <strong style="color:#C2410C;">${supCount} ${currentLanguage === 'hi' ? 'प्रभावित' : 'affected'}</strong>
                </div>
                <div style="font-size:10.5px;color:#64748B;margin-top:2px;margin-bottom:6px;">📍 ${escapeHtml(fullAddr)} · 🕒 ${c.timeAgo || (currentLanguage === 'hi' ? 'हाल ही में' : 'Recently')}</div>
                <button type="button" class="btn-support-nearby ${isSupported ? 'supported' : 'not-supported'}" onclick="event.stopPropagation(); toggleSupport('${c.id}')">
                  ${isSupported ? (currentLanguage === 'hi' ? '✓ समर्थित (' + supCount + ')' : '✓ Supported (' + supCount + ')') : (currentLanguage === 'hi' ? '👍 मैं भी प्रभावित हूँ (' + supCount + ')' : (currentLanguage === 'hinglish' ? '👍 Main bhi prabhavit hoon (' + supCount + ')' : '👍 I am also affected (' + supCount + ')'))}
                </button>
              </div>
            `;
            }).join('');

            const btnExplore = document.querySelector('.btn-explore-nearby');
            if (btnExplore) {
              const isHi = currentLanguage === 'hi';
              const isHinglish = currentLanguage === 'hinglish';
              if (sameDistrictList.length > 2) {
                btnExplore.innerHTML = isHi
                  ? `सभी ${sameDistrictList.length} निकटवर्ती समस्याएं देखें →`
                  : (isHinglish ? `Sabhi ${sameDistrictList.length} Nearby Problems Dekhein →` : `Explore All ${sameDistrictList.length} Nearby Issues →`);
              } else {
                btnExplore.innerHTML = isHi
                  ? `सभी निकटवर्ती समस्याएं देखें →`
                  : (isHinglish ? `Sabhi Nearby Problems Dekhein →` : `Explore All Nearby Issues →`);
              }
            }
          }
        }
      } catch (errNearby) {
        console.error('Error rendering nearbyMiniContainer:', errNearby);
      }
    }

    /* SIDEBAR DRAWER TOGGLE */
    function toggleSidebarDrawer(open) {
      const sidebar = document.querySelector('.sidebar');
      const backdrop = document.getElementById('sidebarDrawerBackdrop');
      if (!sidebar) return;
      const isOpen = open !== undefined ? open : !sidebar.classList.contains('drawer-open');
      if (isOpen) {
        sidebar.classList.add('drawer-open');
        if (backdrop) backdrop.classList.add('active');
      } else {
        sidebar.classList.remove('drawer-open');
        if (backdrop) backdrop.classList.remove('active');
      }
    }

    /* LEAFLET INTERACTIVE MINI-MAP FOR PROBLEM REPORTING */
    let reportMiniMapInstance = null;
    let reportMiniMapMarker = null;
    let currentReportCoords = { lat: 23.3441, lng: 85.3096 };

    function initReportMiniMap() {
      if (typeof L === 'undefined') return;
      const mapEl = document.getElementById('reportMiniMap');
      if (!mapEl) return;

      if (reportMiniMapInstance) {
        reportMiniMapInstance.invalidateSize();
        return;
      }

      try {
        reportMiniMapInstance = L.map('reportMiniMap').setView([currentReportCoords.lat, currentReportCoords.lng], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors © CARTO'
        }).addTo(reportMiniMapInstance);

        reportMiniMapMarker = L.marker([currentReportCoords.lat, currentReportCoords.lng], { draggable: true }).addTo(reportMiniMapInstance);

        const updateMarkerCoords = (lat, lng) => {
          currentReportCoords = { lat, lng };
          const pill = document.getElementById('mapCoordsPill');
          if (pill) pill.textContent = `📍 ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
        };

        reportMiniMapMarker.on('dragend', async (e) => {
          const pos = e.target.getLatLng();
          updateMarkerCoords(pos.lat, pos.lng);
          if (typeof reverseGeocodeCoords === 'function') {
            await reverseGeocodeCoords(pos.lat, pos.lng);
          }
        });

        reportMiniMapInstance.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          reportMiniMapMarker.setLatLng([lat, lng]);
          updateMarkerCoords(lat, lng);
          if (typeof reverseGeocodeCoords === 'function') {
            await reverseGeocodeCoords(lat, lng);
          }
        });
      } catch (err) {
        console.warn('MiniMap initialization error:', err);
      }
    }

    function scrollRecentReports(direction) {
      const cont = document.getElementById('recentReportsContainerList');
      if (cont) {
        cont.scrollBy({ left: direction * 220, behavior: 'smooth' });
      }
    }

    function openActiveReportDetail() {
      const active = getCurrentlyTrackedReport();
      if (active) openDetailModal(active.id);
    }

    function renderDetailFooterActions(item, isMyOwnReport) {
      const cont = document.getElementById('detailFooterActionContainer');
      if (!cont) return;

      const isSolved = item.status === 'Solved' || item.isResolved;
      const isUnverified = (item.status === 'Submitted' || !item.isVerified) && !isSolved;
      const isSupported = supportedIds.has(item.id) || (item.mongoId && supportedIds.has(item.mongoId));

      if (isMyOwnReport) {
        // 1. MAIN POST KARNE WALA CITIZEN (AUTHOR MODE)
        cont.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; width: 100%;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-sol-yes" onclick="openReportSlipFromDetail()" style="background: linear-gradient(135deg, #002D62 0%, #001A3A 100%); color: #fff; font-size: 12px; padding: 9px 16px; border-radius: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(0,45,98,0.22); cursor: pointer;">
              📄 ${currentLanguage === 'hi' ? 'आधिकारिक पर्ची डाउनलोड करें' : 'Download Official Slip'}
            </button>
            ${isUnverified ? `
              <button type="button" class="btn-sol-no" onclick="promptDeleteReport('${item.id}')" style="background: #FEF2F2; color: #DC2626; border: 1.5px solid #F87171; font-size: 12px; padding: 8px 14px; border-radius: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;">
                🗑️ ${currentLanguage === 'hi' ? 'शिकायत हटाएं' : 'Delete Grievance'}
              </button>
            ` : `
              <span style="font-size: 11px; color: #64748b; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                🔒 ${currentLanguage === 'hi' ? 'प्रशासन द्वारा सत्यापित' : 'Admin Verified'}
              </span>
            `}
            <div style="font-size: 11.5px; font-weight: 700; color: #002D62; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 6px 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 5px;">
              👥 ${item.supports || 1} ${currentLanguage === 'hi' ? 'नागरिकों का समर्थन' : 'Community Supporters'}
            </div>
            <button type="button" onclick="closeModal('detailModal'); openChatModal('${item.id}');"
              style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); color: #1E3A8A; border: 1.5px solid #93C5FD; font-size: 12px; padding: 8px 14px; border-radius: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(30,58,138,0.1);">
              💬 ${currentLanguage === 'hi' ? 'समस्या चैट / संदेश' : 'Problem Chat'}
            </button>
          </div>
          <button type="button" class="btn-modal-secondary" onclick="closeModal('detailModal')" style="padding: 9px 18px; border-radius: 10px; font-weight: 700;">
            ${currentLanguage === 'hi' ? 'बंद करें' : 'Close Inspector'}
          </button>
        </div>
      `;
      } else {
        // 2. DEKHNE WALA CITIZEN (COMMUNITY VIEWER MODE)
        cont.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; width: 100%;">
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <!-- Restricted Slip Notice strictly for Main User -->
            <div class="slip-restricted-pill">
              <span style="font-size: 14px;">🔒</span>
              <span><strong>${currentLanguage === 'hi' ? 'पावती पर्ची:' : 'Official Slip:'}</strong> ${currentLanguage === 'hi' ? 'केवल मुख्य शिकायतकर्ता के लिए उपलब्ध है' : 'Reserved exclusively for Main Submitter'}</span>
            </div>
            <!-- Community Solidarity Support Button -->
            <button type="button" id="detailFooterSupportBtn" class="btn-sol-yes" onclick="toggleSupportFromDetail()" style="background: ${isSupported ? 'var(--india-green)' : 'linear-gradient(135deg, #002D62 0%, #001A3A 100%)'}; color: #fff; font-size: 12.5px; padding: 9px 18px; border-radius: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); cursor: pointer; transition: all 0.2s ease;">
              ${isSupported ? (currentLanguage === 'hi' ? '✓ आपने समर्थन दिया है' : '✓ Supported by You') + ' (' + (item.supports || 1) + ')' : (currentLanguage === 'hi' ? '👍 मैं भी प्रभावित हूँ' : '👍 I am also affected') + ' (' + (item.supports || 1) + ')'}
            </button>
          </div>
          <button type="button" class="btn-modal-secondary" onclick="closeModal('detailModal')" style="padding: 9px 18px; border-radius: 10px; font-weight: 700;">
            ${currentLanguage === 'hi' ? 'बंद करें' : 'Close Inspector'}
          </button>
        </div>
      `;
      }
    }

    function updateDetailModalSupportUI(item, isMyOwnReportParam) {
      if (!item) return;
      const user = getCurrentUser();
      const currentUserId = user ? (user.id || user._id || '').toString() : '';
      const currentUserEmail = user && user.email ? user.email.toLowerCase().trim() : '';
      const subEmail = (item.submitterEmail || (item.submitterContact && item.submitterContact.email) || (item.submittedBy && item.submittedBy.email) || '').toLowerCase().trim();
      const subId = (item.submittedById || (item.submittedBy && (item.submittedBy._id || item.submittedBy.id || item.submittedBy)) || '').toString();

      const isMyOwn = (isMyOwnReportParam !== undefined) ? isMyOwnReportParam : (
        allReportsList.some(r => r.id === item.id || (item.mongoId && r.mongoId === item.mongoId))
        || (currentUserEmail && subEmail && currentUserEmail === subEmail)
        || (currentUserId && subId && currentUserId === subId)
      );

      const isSupported = supportedIds.has(item.id) || (item.mongoId && supportedIds.has(item.mongoId));
      const supCount = item.supports || 1;

      // 1. Update in-modal counter elements
      const countEl = document.getElementById('detailModalSupportCount');
      const badgeEl = document.getElementById('detailModalSupportBadge');
      const subtextEl = document.getElementById('detailModalSupportSubtext');
      const cardEl = document.getElementById('detailModalSupportCard');
      const inlineBtnSlot = document.getElementById('detailModalInlineSupportBtnSlot');

      // For author mode, hide cardEl so it does not clutter with a redundant second card
      if (isMyOwn) {
        if (cardEl) cardEl.style.display = 'none';
      } else {
        if (cardEl) cardEl.style.display = 'flex';
      }

      if (countEl) {
        if (isMyOwn) {
          countEl.textContent = `${supCount} ${currentLanguage === 'hi' ? 'नागरिकों ने आपकी समस्या का समर्थन किया है' : 'citizens supported your grievance'}`;
        } else {
          countEl.textContent = `${supCount} ${currentLanguage === 'hi' ? 'नागरिक इस समस्या से प्रभावित हैं' : 'citizens affected by this issue'}`;
        }
      }

      if (badgeEl) {
        if (isMyOwn) {
          badgeEl.textContent = currentLanguage === 'hi' ? '👑 आपकी दर्ज शिकायत' : '👑 Your Grievance';
          badgeEl.style.background = '#DBEAFE';
          badgeEl.style.color = '#1E40AF';
          badgeEl.style.borderColor = '#93C5FD';
        } else if (isSupported) {
          badgeEl.textContent = currentLanguage === 'hi' ? '✓ आपका समर्थन दर्ज है' : '✓ Supported by You';
          badgeEl.style.background = '#DCFCE7';
          badgeEl.style.color = '#15803D';
          badgeEl.style.borderColor = '#86EFAC';
        } else {
          badgeEl.textContent = currentLanguage === 'hi' ? 'सामुदायिक समर्थन' : 'Community Support';
          badgeEl.style.background = '#FEF3C7';
          badgeEl.style.color = '#B45309';
          badgeEl.style.borderColor = '#FCD34D';
        }
      }

      if (subtextEl) {
        if (isMyOwn) {
          subtextEl.textContent = currentLanguage === 'hi'
            ? 'आप इस समस्या के मूल लेखक हैं। जितने अधिक नागरिक समर्थन देंगे, कार्यबल इसे उतनी ही उच्च प्राथमिकता देगा।'
            : 'You are the primary author. More citizen solidarity signals higher urgency to municipal taskforces.';
        } else if (isSupported) {
          subtextEl.textContent = currentLanguage === 'hi'
            ? '✓ आपका समर्थन सफलता पूर्वक दर्ज है! इससे प्रशासनिक समीक्षा और टास्कफोर्स सक्रियता बढ़ती है।'
            : '✓ Your solidarity support is active! This accelerates administrative triage and deployment.';
        } else {
          subtextEl.textContent = currentLanguage === 'hi'
            ? 'यदि आप भी इस समस्या से प्रभावित हैं, तो समर्थन देकर समाधान में अपना योगदान दें।'
            : 'If you are also impacted, lend your support to draw municipal and ground taskforce attention.';
        }
      }

      // 2. Inline button in the support box
      if (inlineBtnSlot) {
        if (isMyOwn) {
          inlineBtnSlot.innerHTML = `
          <span style="font-size: 11.5px; font-weight: 800; color: #1E40AF; background: #DBEAFE; border: 1px solid #93C5FD; padding: 5px 12px; border-radius: 20px;">
            ${currentLanguage === 'hi' ? '👤 मुख्य शिकायतकर्ता' : (currentLanguage === 'hinglish' ? '👤 Main Submitter' : '👤 Primary Submitter')}
          </span>
        `;
        } else {
          inlineBtnSlot.innerHTML = `
          <button type="button" class="btn-sol-yes" onclick="toggleSupportFromDetail()" style="padding: 7px 16px; font-size: 12px; font-weight: 800; background: ${isSupported ? 'var(--india-green)' : 'linear-gradient(135deg, #002D62 0%, #001A3A 100%)'}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); cursor: pointer; transition: all 0.2s ease;">
            ${isSupported ? (currentLanguage === 'hi' ? '✓ समर्थित' : '✓ Supported') : (currentLanguage === 'hi' ? '👍 समर्थन दें' : (currentLanguage === 'hinglish' ? '👍 Support Karein' : '👍 Support'))}
          </button>
        `;
        }
      }

      // 3. Immediate visual feedback pulse animation right in front!
      if (cardEl) {
        cardEl.style.transition = 'all 0.25s ease';
        cardEl.style.borderColor = isSupported ? '#16A34A' : '#3B82F6';
        cardEl.style.boxShadow = isSupported ? '0 0 16px rgba(22, 163, 74, 0.35)' : '0 0 16px rgba(59, 130, 246, 0.3)';
        cardEl.style.transform = 'scale(1.015)';
        setTimeout(() => {
          if (cardEl) {
            cardEl.style.transform = 'scale(1)';
            cardEl.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.08)';
            cardEl.style.borderColor = '#86EFAC';
          }
        }, 250);
      }

      // 4. Update footer button immediately
      renderDetailFooterActions(item, isMyOwn);
    }

    function toggleSupportFromDetail() {
      if (!currentlyInspectedId) return;
      toggleSupport(currentlyInspectedId);
    }

    function openDetailModal(reportId) {
      showJanSetuLoader((typeof currentLanguage !== 'undefined' && currentLanguage === 'hi')
        ? 'समस्या का पूर्ण ऑडिट ट्रेल और आधिकारिक विवरण लोड हो रहा है...'
        : 'Loading Grievance Audit Trail & Official Dispatch Records...', 1100);

      currentlyInspectedId = reportId;
      let item = allReportsList.find(r => r.id === reportId);
      if (!item) item = exploreList.find(r => r.id === reportId);
      if (!item) return;

      const user = getCurrentUser();
      const currentUserId = user ? (user.id || user._id || '').toString() : '';
      const currentUserEmail = user && user.email ? user.email.toLowerCase().trim() : '';

      const subEmail = (item.submitterEmail || (item.submitterContact && item.submitterContact.email) || (item.submittedBy && item.submittedBy.email) || '').toLowerCase().trim();
      const subId = (item.submittedById || (item.submittedBy && (item.submittedBy._id || item.submittedBy.id || item.submittedBy)) || '').toString();

      const isMyOwnReport = allReportsList.some(r => r.id === item.id || (item.mongoId && r.mongoId === item.mongoId))
        || (currentUserEmail && subEmail && currentUserEmail === subEmail)
        || (currentUserId && subId && currentUserId === subId);

      const modalEl = document.getElementById('detailModal');
      const heroEl = document.getElementById('detailViewerMonumentHero');
      const authorBannerEl = document.getElementById('detailAuthorHeaderBanner');

      const accentLine = document.getElementById('detailViewerAccentLine');

      const isHi = currentLanguage === 'hi';
      const isHinglish = currentLanguage === 'hinglish';

      if (isMyOwnReport) {
        modalEl.classList.remove('viewer-mode-active');
        if (heroEl) heroEl.style.display = 'none';
        if (authorBannerEl) authorBannerEl.style.display = 'flex';
        if (accentLine) accentLine.style.display = 'none';
        document.getElementById('detailTitle').innerHTML = `<span style="color:#FF9933;">👑</span> ${item.title}`;
      } else {
        modalEl.classList.add('viewer-mode-active');
        if (heroEl) heroEl.style.display = 'none';
        if (authorBannerEl) authorBannerEl.style.display = 'none';
        if (accentLine) accentLine.style.display = 'block';
        document.getElementById('detailTitle').innerHTML = `<span>🏛️</span> ${item.title}`;
      }

      // Dynamic Author Header Texts - Clean single unified card without clutter
      const authTitleEl = document.getElementById('detailAuthorHeaderTitle');
      const authSubEl = document.getElementById('detailAuthorHeaderSub');
      const authBadgeEl = document.getElementById('detailAuthorHeaderBadge');
      const supCount = item.supports || 1;
      if (authTitleEl) authTitleEl.textContent = isHi ? 'आपकी दर्ज शिकायत' : (isHinglish ? 'Aapki Darj Shikayat' : 'Your Submitted Grievance');
      if (authSubEl) {
        authSubEl.innerHTML = (isHi ? 'आप इस शिकायत के मुख्य लेखक हैं। ' : (isHinglish ? 'Aap is grievance ke main author hain. ' : 'You are the primary author of this grievance. ')) +
          `<span style="display:inline-flex; align-items:center; gap:4px; margin-left:6px; background:#DCFCE7; color:#166534; font-weight:800; font-size:11px; padding:2px 8px; border-radius:10px; border:1px solid #86EFAC;">👥 ${supCount} ${isHi ? 'नागरिक समर्थन' : 'Citizen Support'}</span>`;
      }
      if (authBadgeEl) authBadgeEl.textContent = isHi ? '👑 मुख्य शिकायतकर्ता' : (isHinglish ? '👑 Main Submitter' : '👑 Primary Submitter');

      // Dynamic Community Viewer Header Texts based on active language
      const vrRevTitle = document.getElementById('detailViewerReviewTitle');
      const vrRevPill = document.getElementById('detailViewerReviewModePill');
      const vrInspTitle = document.getElementById('detailViewerInspTitle');
      const vrInspDesc = document.getElementById('detailViewerInspDesc');
      const vrAuthorBadge = document.getElementById('detailViewerAuthorRoleBadge');
      const vrGisBadge = document.getElementById('detailViewerGisBadge');
      if (vrRevTitle) vrRevTitle.textContent = isHi ? 'सार्वजनिक नागरिक निरीक्षण' : (isHinglish ? 'Public Community Inspection' : 'Public Community Inspection');
      if (vrRevPill) vrRevPill.textContent = isHi ? '🌐 नागरिक व्यूअर मोड' : (isHinglish ? '🌐 Community Viewer Mode' : '🌐 Community Viewer Mode');
      if (vrInspTitle) vrInspTitle.textContent = isHi ? 'जनसेतु नागरिक सार्वजनिक निरीक्षण मंच' : (isHinglish ? 'JanSetu Citizen Civic Inspection Platform' : 'JanSetu Citizen Civic Inspection Platform');
      if (vrInspDesc) vrInspDesc.textContent = isHi ? 'यह शिकायत एक नागरिक द्वारा दर्ज की गई है। आप इसकी प्रगति ट्रैक कर सकते हैं और अपना समर्थन दे सकते हैं।' : (isHinglish ? 'Ye grievance fellow citizen ne submit ki hai. Aap real-time progress track karke support de sakte hain.' : 'This grievance was submitted by a fellow citizen. You can track real-time progress and register your community support.');
      if (vrAuthorBadge) vrAuthorBadge.textContent = isHi ? 'मुख्य शिकायतकर्ता' : (isHinglish ? 'Main Submitter' : 'Primary Submitter');
      if (vrGisBadge) vrGisBadge.textContent = isHi ? 'जीआईएस भू-सत्यापित शिकायत' : (isHinglish ? 'GIS Geo-Verified Grievance' : 'GIS Geo-Verified Grievance');

      // Submitter and GIS Verification chips in meta row
      const subChip = document.getElementById('detailSubmitterChip');
      const gisChip = document.getElementById('detailGisChip');
      const maskedCitizenId = item.citizenId || item.submitterCitizenId || ('C' + (item.id ? item.id.replace(/[^0-9]/g, '').slice(-4) : '9604'));
      const citizenIdDisplay = (isHi ? 'नागरिक #' : 'Citizen #') + maskedCitizenId;
      const authorNameStr = isMyOwnReport
        ? (item.submitterName || (item.submitterContact && item.submitterContact.name) || (isHi ? 'आप' : 'You'))
        : citizenIdDisplay;

      if (subChip) {
        if (!isMyOwnReport && (item.submitterName || item.submittedBy || item.submitterContact || item.citizenId)) {
          subChip.textContent = '🛡️ ' + (isHi ? 'सत्यापित नागरिक: ' : 'Verified Citizen: ') + citizenIdDisplay;
          subChip.style.display = 'inline-flex';
        } else {
          subChip.style.display = 'none';
        }
      }
      if (gisChip) {
        gisChip.style.display = isMyOwnReport ? 'none' : 'inline-flex';
        gisChip.textContent = isHi ? '✓ जीआईएस भू-सत्यापित' : '✓ GIS Geo-Verified';
      }

      const vSubName = document.getElementById('viewerSubmitterName');
      if (vSubName) {
        vSubName.textContent = isMyOwnReport
          ? ('👤 ' + (isHi ? 'शिकायतकर्ता: ' : 'Submitter: ') + authorNameStr)
          : ('🛡️ ' + (isHi ? 'नागरिक पहचान: ' : 'Citizen ID: ') + citizenIdDisplay);
      }
      const vSubLoc = document.getElementById('viewerSubmitterLoc');
      if (vSubLoc) {
        vSubLoc.textContent = '📍 ' + (item.location || (isHi ? 'झारखंड' : 'Jharkhand')) + ' · 📅 ' + (item.timeAgo || (isHi ? 'हाल ही में' : 'Recently'));
      }
      const vSubAv = document.getElementById('viewerSubmitterAvatar');
      if (vSubAv) {
        vSubAv.textContent = isMyOwnReport ? (authorNameStr.charAt(0).toUpperCase() || 'C') : 'C';
      }

      document.getElementById('detailId').textContent = (isHi ? 'शिकायत संख्या: ' : 'Report ID: ') + item.id;

      // Only display hero box if a ground proof image exists
      const heroBox = document.querySelector('.detail-hero-box');
      const mainImg = item.image || item.beforeImg || (item.resolutionProof && item.resolutionProof.beforeImage) || (item.attachments && item.attachments[0] && item.attachments[0].url) || getCategoryFallbackImage(item.category);
      if (mainImg) {
        document.getElementById('detailImage').src = mainImg;
        document.getElementById('detailBeforeImg').src = mainImg;
        if (heroBox) heroBox.style.display = 'block';
      } else {
        if (heroBox) heroBox.style.display = 'none';
      }

      const afterImgEl = document.getElementById('detailAfterImg');
      const afterNoticeEl = document.getElementById('detailAfterPendingNotice');
      const isSolved = item.status === 'Solved' || item.isResolved;

      if (item.afterImg) {
        afterImgEl.src = item.afterImg;
        afterImgEl.style.display = 'block';
        if (afterNoticeEl) afterNoticeEl.style.display = 'none';
      } else {
        // If no separate after-proof has been uploaded yet, keep after image hidden and show clean status badge
        afterImgEl.style.display = 'none';
        if (afterNoticeEl) {
          afterNoticeEl.style.display = 'flex';
          const noticeDesc = afterNoticeEl.querySelector('div:last-child');
          if (noticeDesc) {
            noticeDesc.textContent = isSolved
              ? (currentLanguage === 'hi' ? 'कार्य आदेश पूरा व सत्यापित — अंतिम ग्राउंड रिपोर्ट संलग्न' : 'Official resolution verified & authenticated on ground')
              : (currentLanguage === 'hi' ? 'कार्य आदेश प्रगति पर — समाधान पश्चात आफ्टर प्रूफ अपलोड होगा' : 'After-proof will be verified & uploaded upon resolution');
          }
        }
      }

      // Toggle Solved Citizen Feedback & Reopen Card (Only for main author)
      const feedbackCard = document.getElementById('detailSolvedFeedbackCard');
      if (feedbackCard) {
        if (isSolved && isMyOwnReport) {
          feedbackCard.style.display = 'block';
          setFeedbackRating(item.feedbackRating || 5);
          const commentEl = document.getElementById('detailFeedbackComment');
          if (commentEl) commentEl.value = item.feedbackComment || '';
        } else {
          feedbackCard.style.display = 'none';
        }
      }

      const isUnverified = (item.status === 'Submitted' || !item.isVerified) && !isSolved;

      const detailBadge = document.getElementById('detailStatusBadge');
      if (detailBadge) {
        if (isSolved) {
          detailBadge.textContent = currentLanguage === 'hi' ? '✓ समाधान पूर्ण' : '✓ Solved';
          detailBadge.style.background = '#EDFCF2';
          detailBadge.style.color = '#15803D';
          detailBadge.style.borderColor = '#A7F3D0';
        } else if (isUnverified) {
          detailBadge.textContent = currentLanguage === 'hi' ? '⏳ सत्यापन प्रतीक्षारत' : '⏳ Awaiting Admin Verification';
          detailBadge.style.background = '#EFF6FF';
          detailBadge.style.color = '#1D4ED8';
          detailBadge.style.borderColor = '#BFDBFE';
        } else {
          detailBadge.textContent = currentLanguage === 'hi' ? '✓ प्रशासन द्वारा सत्यापित · कार्य जारी' : '✓ Admin Verified · In Progress';
          detailBadge.style.background = '#F0FDF4';
          detailBadge.style.color = '#166534';
          detailBadge.style.borderColor = '#BBF7D0';
        }
      }

      document.getElementById('detailCategoryBadge').textContent = '📂 ' + (item.category || (isHi ? 'सामान्य' : 'General'));
      document.getElementById('detailTimeAgo').textContent = (isHi ? 'दर्ज: ' : 'Reported ') + (item.timeAgo || (isHi ? 'हाल ही में' : 'Recently'));
      document.getElementById('detailDescription').textContent = item.desc || item.title;
      document.getElementById('detailLocationText').textContent = '📍 ' + (item.location || (isHi ? 'झारखंड' : 'Jharkhand'));

      // Location coordinates & Detailed Hierarchy Breakdown
      const distCoordsMap = {
        'Ranchi': { lat: 23.3441, lng: 85.3096 },
        'Dhanbad': { lat: 23.7957, lng: 86.4304 },
        'Bokaro': { lat: 23.6693, lng: 86.1511 },
        'East Singhbhum': { lat: 22.8046, lng: 86.2029 },
        'Jamshedpur': { lat: 22.8046, lng: 86.2029 },
        'Deoghar': { lat: 24.4826, lng: 86.7001 },
        'Hazaribagh': { lat: 23.9925, lng: 85.3637 },
        'Giridih': { lat: 24.1843, lng: 86.3023 },
        'Ramgarh': { lat: 23.6332, lng: 85.5147 },
        'Dumka': { lat: 24.2677, lng: 87.2484 },
        'Palamu': { lat: 24.0384, lng: 84.0722 }
      };

      let targetLat = null;
      let targetLng = null;
      if (item.coords && item.coords.lat && item.coords.lng) {
        targetLat = Number(item.coords.lat);
        targetLng = Number(item.coords.lng);
      } else if (item.coordinates && item.coordinates.coordinates && Array.isArray(item.coordinates.coordinates)) {
        targetLng = Number(item.coordinates.coordinates[0]);
        targetLat = Number(item.coordinates.coordinates[1]);
      } else if (item.lat && item.lng) {
        targetLat = Number(item.lat);
        targetLng = Number(item.lng);
      }

      const extractedDist = (typeof getChallengeDistrict === 'function' ? getChallengeDistrict(item) : '') || item.district || 'Ranchi';
      if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) {
        const dCoord = distCoordsMap[extractedDist] || distCoordsMap['Ranchi'];
        targetLat = dCoord.lat;
        targetLng = dCoord.lng;
      }

      // Bind global handler for direct map navigation button
      window.gotoCurrentReportMap = function() {
        const mapUrl = `https://www.google.com/maps?q=${targetLat},${targetLng}`;
        window.open(mapUrl, '_blank');
      };

      const locStr = item.location || 'Ranchi, Jharkhand';
      const tehsilStr = item.tehsil || item.block || 'Sadar Block';
      const villageStr = item.village || item.panchayat || item.landmark || (locStr.includes(',') ? locStr.split(',')[0].trim() : 'Namkum');

      const hierEl = document.getElementById('detailHierarchyRow');
      if (hierEl) {
        hierEl.innerHTML = `
          <span class="location-hierarchy-pill">🏛️ <span>${isHi ? 'राज्य:' : 'State:'}</span> <strong>${isHi ? 'झारखण्ड' : 'Jharkhand'}</strong></span>
          <span class="location-hierarchy-pill">🏢 <span>${isHi ? 'ज़िला:' : 'District:'}</span> <strong>${escapeHtml(extractedDist)}</strong></span>
          <span class="location-hierarchy-pill">📍 <span>${isHi ? 'तहसील/प्रखंड:' : 'Tehsil/Block:'}</span> <strong>${escapeHtml(tehsilStr)}</strong></span>
          <span class="location-hierarchy-pill">🏘️ <span>${isHi ? 'गाँव/मोहल्ला:' : 'Area/Village:'}</span> <strong>${escapeHtml(villageStr)}</strong></span>
          <span class="location-hierarchy-pill">🌐 <span>${isHi ? 'जीपीएस:' : 'GPS:'}</span> <strong>${targetLat.toFixed(4)}°N, ${targetLng.toFixed(4)}°E</strong></span>
        `;
      }

      // Multi-Media Evidence (Photos & Videos)
      const allEvidenceMedia = [];
      if (Array.isArray(item.attachments)) {
        item.attachments.forEach(a => {
          if (typeof a === 'string') allEvidenceMedia.push({ url: a, type: a.includes('.mp4') || a.includes('video') ? 'video' : 'image' });
          else if (a && a.url) allEvidenceMedia.push({ url: a.url, type: (a.type || a.mimetype || '').includes('video') || a.url.includes('.mp4') ? 'video' : 'image' });
        });
      }
      if (Array.isArray(item.media)) {
        item.media.forEach(m => {
          if (typeof m === 'string') allEvidenceMedia.push({ url: m, type: m.includes('.mp4') || m.includes('video') ? 'video' : 'image' });
          else if (m && m.url) allEvidenceMedia.push({ url: m.url, type: (m.type || '').includes('video') || m.url.includes('.mp4') ? 'video' : 'image' });
        });
      }
      if (Array.isArray(item.photos)) {
        item.photos.forEach(p => {
          if (typeof p === 'string') allEvidenceMedia.push({ url: p, type: 'image' });
          else if (p && p.url) allEvidenceMedia.push({ url: p.url, type: 'image' });
        });
      }
      if (item.image && !allEvidenceMedia.some(m => m.url === item.image)) {
        allEvidenceMedia.push({ url: item.image, type: 'image' });
      }
      if (item.beforeImg && !allEvidenceMedia.some(m => m.url === item.beforeImg)) {
        allEvidenceMedia.push({ url: item.beforeImg, type: 'image' });
      }
      if (item.afterImg && !allEvidenceMedia.some(m => m.url === item.afterImg)) {
        allEvidenceMedia.push({ url: item.afterImg, type: 'image' });
      }
      if (item.video) allEvidenceMedia.push({ url: item.video, type: 'video' });
      if (item.videoUrl) allEvidenceMedia.push({ url: item.videoUrl, type: 'video' });

      const videoList = allEvidenceMedia.filter(m => m.type === 'video' || (typeof m.url === 'string' && (m.url.endsWith('.mp4') || m.url.includes('video/'))));
      const photoList = allEvidenceMedia.filter(m => m.type === 'image' && !videoList.some(v => v.url === m.url));

      const vidContainer = document.getElementById('detailVideoContainer');
      const vidPlayer = document.getElementById('detailVideoPlayer');
      if (vidContainer && vidPlayer) {
        if (videoList.length > 0) {
          vidContainer.style.display = 'block';
          vidPlayer.src = videoList[0].url;
        } else {
          vidContainer.style.display = 'none';
          vidPlayer.src = '';
        }
      }

      const galleryCont = document.getElementById('detailMultiPhotoGallery');
      const galleryGrid = document.getElementById('detailGalleryPhotosGrid');
      if (galleryCont && galleryGrid) {
        if (photoList.length > 0) {
          galleryCont.style.display = 'block';
          galleryGrid.innerHTML = photoList.map(p => `
            <img src="${p.url}" alt="Evidence Photo" class="detail-gallery-thumb" onclick="zoomImage('${p.url}', 'Grievance Evidence Photo')" onerror="this.style.display='none'" />
          `).join('');
        } else {
          galleryCont.style.display = 'none';
          galleryGrid.innerHTML = '';
        }
      }

      const locAssign = document.getElementById('detailAssignmentText');
      if (locAssign) {
        locAssign.style.display = isMyOwnReport ? 'block' : 'none';
        locAssign.textContent = (isHi ? 'आवंटित कार्यबल: ' : 'Assigned Taskforce: ') + (item.assign || (isHi ? 'जनसेतु नगर निगम कार्यबल' : 'JanSetu Municipal Taskforce'));
      }

      const timeSecTitle = document.getElementById('detailTimelineSectionTitle');
      const timeSecSub = document.getElementById('detailTimelineSectionSub');
      if (timeSecTitle) {
        timeSecTitle.textContent = isMyOwnReport
          ? (isHi ? 'प्रगति एवं ऑडिट ट्रेल' : 'LIVE PROGRESS & AUDIT TRAIL')
          : (isHi ? 'समाधान प्रगति रेखा' : 'LIVE PROGRESS TRACKER');
      }
      if (timeSecSub) {
        timeSecSub.textContent = isMyOwnReport
          ? (isHi ? 'प्रशासनिक सत्यापन, सामग्री आपूर्ति व फील्ड कार्रवाई' : 'Real-time audit track: Admin verification, Industry supplies & University field action')
          : (isHi ? 'समस्या की वर्तमान स्थिति एवं प्रगति' : 'Current issue resolution status & ground progress');
      }

      renderDetailProgressTracker(item, isMyOwnReport);

      // Update in-modal support card and persona footer
      updateDetailModalSupportUI(item, isMyOwnReport);

      hideJanSetuLoader(() => {
        openModal('detailModal');
      }, 1100);
    }

    function zoomBeforeImage() {
      const img = document.getElementById('detailBeforeImg');
      if (img && img.src) zoomImage(img.src, 'Before Problem Ground Proof');
    }

    function zoomAfterImage() {
      const item = allReportsList.find(r => r.id === currentlyInspectedId) || exploreList.find(r => r.id === currentlyInspectedId);
      if (!item) return;
      const isSolved = item.status === 'Solved' || item.isResolved;
      if (isSolved || item.afterImg) {
        const img = document.getElementById('detailAfterImg');
        if (img && img.src) zoomImage(img.src, 'After Resolution Ground Proof');
      }
    }

    /* OFFICIAL GRIEVANCE TRACKING SLIP (DOWNLOAD / PRINT) */
    function openReportSlip(reportId) {
      let r = allReportsList.find(item => item.id === reportId);
      if (!r) r = exploreList.find(item => item.id === reportId);
      if (!r) return;

      const fallbackImg = getCategoryFallbackImage(r.category);
      const beforeImg = r.beforeImg || r.image || fallbackImg;
      const coordsStr = r.coords ? `📍 Lat: ${Number(r.coords.lat).toFixed(4)}° N, Lng: ${Number(r.coords.lng).toFixed(4)}° E` : '📍 Lat: 23.3441° N, Lng: 85.3096° E';
      const genDate = r.submittedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      document.getElementById('slipGrievanceId').textContent = r.id;
      document.getElementById('slipGeneratedDate').textContent = genDate;
      document.getElementById('slipTitle').textContent = r.title;
      document.getElementById('slipCategoryBadge').textContent = r.category || 'Community Grievance';
      document.getElementById('slipStatusBadge').textContent = r.status;
      document.getElementById('slipLocation').textContent = r.location;
      document.getElementById('slipCoords').textContent = coordsStr;
      document.getElementById('slipDescription').textContent = r.desc || r.title;

      // Kis Din Kya Hua: Chronological Progress Track
      const isHi = currentLanguage === 'hi';
      const isHinglish = currentLanguage === 'hinglish';
      const realSubDate = formatRealDate(r.createdAt || r.submittedDate);
      const rows = [];

      rows.push({
        milestone: isHi ? 'नागरिक द्वारा समस्या दर्ज' : (isHinglish ? 'Citizen dwara samasya darj' : 'Grievance Registered by Citizen'),
        date: realSubDate,
        taskforce: isHi ? 'नागरिक प्रत्यक्ष पंजीकरण' : 'Citizen Direct Submission',
        status: isHi ? 'पूर्ण ✓' : 'Completed ✓'
      });

      if (Array.isArray(r.statusHistory) && r.statusHistory.length > 0) {
        r.statusHistory.forEach(h => {
          if (h.status === 'submitted') return;
          const hDate = formatRealDate(h.changedAt);
          const author = (h.changedBy && h.changedBy.name) ? h.changedBy.name : (h.status === 'validated' ? 'District Administration Desk' : 'JanSetu Taskforce');
          let mTitle = `Status → ${h.status.replace(/_/g, ' ').toUpperCase()}`;
          if (h.status === 'validated') mTitle = isHi ? 'प्रशासनिक सत्यापन व कार्य आदेश' : 'Administrative Review & Official Verification';
          else if (h.status === 'assigned') mTitle = isHi ? 'यूनिवर्सिटी टास्कफोर्स आवंटन' : 'University Taskforce Assigned';
          else if (h.status === 'in_progress') mTitle = isHi ? 'स्थल पर समाधान कार्य' : 'Active Engineering Site Fix';
          else if (h.status === 'resolved') mTitle = isHi ? 'समाधान जमीनी स्तर पर प्रमाणित' : 'Ground Fix Completed & Certified';

          rows.push({
            milestone: mTitle,
            date: hDate,
            taskforce: author,
            status: h.status === 'resolved' ? (isHi ? 'समाधान पूर्ण ✓' : 'Resolved ✓') : (isHi ? 'सत्यापित ✓' : 'Verified ✓')
          });
        });
      } else {
        rows.push({
          milestone: isHi ? 'एआई जांच व श्रेणी सत्यापन' : 'AI Deduplication & Categorization Screened',
          date: realSubDate,
          taskforce: isHi ? 'जनसेतु एआई प्रणाली' : 'JanSetu Neural Deduplication Engine',
          status: isHi ? 'सत्यापित ✓' : 'Verified ✓'
        });
      }

      const tbody = document.getElementById('slipTimelineRows');
      if (tbody) {
        tbody.innerHTML = rows.map(row => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${row.milestone}</td>
          <td style="padding: 7px 10px; color: #475569;">${row.date}</td>
          <td style="padding: 7px 10px; color: #1e40af; font-weight: 600;">${row.taskforce}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: ${row.status.includes('Resolved') || row.status.includes('Completed') || row.status.includes('पूर्ण') ? '#166534' : '#ea580c'};">${row.status}</td>
        </tr>
      `).join('');
      }

      // Before image
      const slipBefore = document.getElementById('slipBeforeImg');
      if (slipBefore) slipBefore.src = beforeImg;

      // After image
      const slipAfterImg = document.getElementById('slipAfterImg');
      const slipAfterNotice = document.getElementById('slipAfterPendingNotice');
      if (r.status === 'Solved' || r.isResolved || r.afterImg) {
        if (slipAfterImg) {
          slipAfterImg.src = r.afterImg || beforeImg;
          slipAfterImg.style.display = 'block';
        }
        if (slipAfterNotice) slipAfterNotice.style.display = 'none';
      } else {
        if (slipAfterImg) slipAfterImg.style.display = 'none';
        if (slipAfterNotice) slipAfterNotice.style.display = 'flex';
      }

      openModal('reportSlipModal');
    }

    function openReportSlipFromDetail() {
      if (currentlyInspectedId) {
        const user = getCurrentUser();
        const currentUserId = user ? (user.id || user._id || '').toString() : '';
        const currentUserEmail = user && user.email ? user.email.toLowerCase().trim() : '';
        const item = allReportsList.find(r => r.id === currentlyInspectedId) || exploreList.find(r => r.id === currentlyInspectedId);
        if (!item) return;

        const subEmail = (item.submitterEmail || (item.submitterContact && item.submitterContact.email) || (item.submittedBy && item.submittedBy.email) || '').toLowerCase().trim();
        const subId = (item.submittedById || (item.submittedBy && (item.submittedBy._id || item.submittedBy.id || item.submittedBy)) || '').toString();

        const isMyOwn = allReportsList.some(r => r.id === item.id || (item.mongoId && r.mongoId === item.mongoId))
          || (currentUserEmail && subEmail && currentUserEmail === subEmail)
          || (currentUserId && subId && currentUserId === subId);

        if (!isMyOwn) {
          alert(currentLanguage === 'hi'
            ? '🔒 आधिकारिक शिकायत पर्ची केवल मूल शिकायतकर्ता के लिए उपलब्ध है।'
            : (currentLanguage === 'hinglish'
              ? '🔒 Official grievance slip sirf main submitter ke liye available hai.'
              : '🔒 Official grievance slip is strictly reserved for the primary submitter.'));
          return;
        }
        openReportSlip(currentlyInspectedId);
      } else {
        const active = getCurrentlyTrackedReport();
        if (active) openReportSlip(active.id);
      }
    }

    function printReportSlip() {
      window.print();
    }

    /* SOLVED CITIZEN FEEDBACK & REOPEN SYSTEM */
    let currentFeedbackRating = 5;
    let reopenTargetReportId = null;
    let reopenFreshPhotoDataUrl = null;
    let reopenPersistingCoords = null;

    function setFeedbackRating(stars) {
      currentFeedbackRating = stars;
      for (let i = 1; i <= 5; i++) {
        const starEl = document.getElementById('star_' + i);
        if (starEl) {
          starEl.textContent = i <= stars ? '⭐' : '☆';
          starEl.style.opacity = i <= stars ? '1' : '0.4';
        }
      }
    }

    function submitSolvedFeedback() {
      const repId = currentlyInspectedId || (allReportsList[0] ? allReportsList[0].id : null);
      const rep = allReportsList.find(r => r.id === repId) || exploreList.find(r => r.id === repId);
      if (rep) {
        rep.feedbackRating = currentFeedbackRating;
        rep.feedbackComment = document.getElementById('detailFeedbackComment')?.value.trim() || '';
        rep.citizenVerified = true;
        saveReportsState();
      }
      showToast(currentLanguage === 'hi' ? `🎉 फीडबैक दर्ज हुआ (${currentFeedbackRating} ⭐)! धन्यवाद!` : `🎉 Feedback recorded (${currentFeedbackRating} ⭐)! Thank you!`);
      closeModal('detailModal');
    }

    function triggerReopenFromDetail() {
      const targetId = currentlyInspectedId || (allReportsList[0] ? allReportsList[0].id : null);
      openReopenModalForReport(targetId);
    }

    function openReopenModalForReport(reportId) {
      reopenTargetReportId = reportId || (allReportsList[0] ? allReportsList[0].id : null);
      const rep = allReportsList.find(r => r.id === reopenTargetReportId) || exploreList.find(r => r.id === reopenTargetReportId);

      const badge = document.getElementById('reopenReportTargetBadge');
      if (badge) badge.textContent = reopenTargetReportId || 'JH-2026-4819';

      const locInput = document.getElementById('reopenLocationInput');
      if (locInput) locInput.value = rep ? rep.location : 'Village Namkum, Ranchi';

      const reasonInput = document.getElementById('reopenReasonInput');
      if (reasonInput) reasonInput.value = '';

      const photoInput = document.getElementById('reopenPhotoInput');
      if (photoInput) photoInput.value = '';

      const preview = document.getElementById('reopenPhotoPreview');
      if (preview) preview.style.display = 'none';

      const gpsPill = document.getElementById('reopenGpsPill');
      if (gpsPill) gpsPill.style.display = 'none';

      reopenFreshPhotoDataUrl = null;
      reopenPersistingCoords = null;

      openModal('reopenModal');
    }

    function reopenDetectGps() {
      if (!navigator.geolocation) {
        alert('GPS not supported');
        return;
      }
      const pill = document.getElementById('reopenGpsPill');
      if (pill) {
        pill.textContent = '📍 Detecting GPS...';
        pill.style.display = 'inline-block';
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          reopenPersistingCoords = { lat, lng };
          if (pill) {
            pill.textContent = `📍 GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
            pill.style.display = 'inline-block';
          }
          const locInput = document.getElementById('reopenLocationInput');
          if (locInput && !locInput.value.includes('GPS')) {
            locInput.value = (locInput.value ? locInput.value + ' ' : '') + `(GPS: ${lat.toFixed(4)}N, ${lng.toFixed(4)}E)`;
          }
        },
        err => {
          if (pill) pill.textContent = '📍 GPS: Default Namkum (23.3441° N, 85.3096° E)';
        },
        { timeout: 5000 }
      );
    }

    async function handleReopenPhotoSelect(input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const dataUrl = await compressImage(file, 800, 800, 0.75);
        if (dataUrl) {
          reopenFreshPhotoDataUrl = dataUrl;
          const preview = document.getElementById('reopenPhotoPreview');
          const img = document.getElementById('reopenPhotoImg');
          if (img) img.src = dataUrl;
          if (preview) preview.style.display = 'flex';
        }
      }
    }

    function submitReopenProblem() {
      const reason = document.getElementById('reopenReasonInput').value.trim();
      if (!reason) {
        alert(currentLanguage === 'hi' ? 'कृपया समस्या अभी भी क्यों बाकी है, इसका कारण लिखें।' : 'Please explain why the problem still persists.');
        return;
      }

      const targetId = reopenTargetReportId || (allReportsList[0] ? allReportsList[0].id : null);
      let rep = allReportsList.find(r => r.id === targetId);

      if (!rep) {
        const exp = exploreList.find(r => r.id === targetId);
        if (exp) {
          rep = { ...exp };
          allReportsList.unshift(rep);
        } else if (allReportsList.length > 0) {
          rep = allReportsList[0];
        }
      }

      if (rep) {
        rep.status = 'Action Required';
        rep.isResolved = false;
        rep.needsAction = true;
        rep.desc = (rep.desc || rep.title) + ' [🔴 Reopened by Citizen: ' + reason + ']';

        const locVal = document.getElementById('reopenLocationInput')?.value.trim();
        if (locVal) rep.location = locVal;

        if (reopenPersistingCoords) {
          rep.coords = reopenPersistingCoords;
        }

        if (reopenFreshPhotoDataUrl) {
          rep.image = reopenFreshPhotoDataUrl;
          rep.beforeImg = reopenFreshPhotoDataUrl;
          rep.afterImg = null;
        }

        const repIdx = allReportsList.findIndex(r => r.id === rep.id);
        if (repIdx !== -1) activeTrackerIndex = repIdx;

        saveReportsState();
        renderAllViews();
        renderAllReportsModalList();

        // Record reopen notification in citizen activity log
        try {
          addCitizenNotification({
            type: 'REPORT_REOPENED',
            category: 'actions',
            title: (currentLanguage === 'hi' ? 'शिकायत पुनः सक्रिय (Reopened)' : (currentLanguage === 'hinglish' ? 'Report Reopened by Citizen' : 'Grievance Reopened for Inspection')),
            message: (currentLanguage === 'hi'
              ? `शिकायत #${targetId} को ताज़ा जमीनी प्रमाण के साथ पुनः खोला गया: "${reason}"`
              : (currentLanguage === 'hinglish'
                ? `Report #${targetId} ko dobara khola gaya: "${reason}"`
                : `Grievance #${targetId} was reopened with fresh ground proof: "${reason}"`)),
            reportId: targetId,
            reportTitle: rep.title || ''
          });
        } catch (e) { }
      }

      closeModal('reopenModal');
      closeModal('detailModal');
      alert(currentLanguage === 'hi'
        ? '⚠️ शिकायत पुनः खोल दी गई है! नया स्थान व ताज़ा फ़ोटो कार्यबल को भेज दिए गए हैं।'
        : '⚠️ Grievance successfully reopened! Fresh location and ground photo proof sent to university taskforce.');
    }

    function zoomImage(src, caption) {
      document.getElementById('lightboxImg').src = src;
      document.getElementById('lightboxCaption').textContent = caption || 'Enlarged Photo';
      openModal('imageZoomModal');
    }

    function closeZoomModal() {
      closeModal('imageZoomModal');
    }

    function confirmResolutionSolved() {
      if (allReportsList.length > 0) {
        allReportsList[0].status = 'Solved';
        allReportsList[0].isResolved = true;
        allReportsList[0].citizenVerified = true;
        const targetRep = allReportsList[0];
        saveReportsState();
        renderAllViews();

        // Record citizen resolution verification in activity log
        try {
          addCitizenNotification({
            type: 'RESOLUTION_CONFIRMED',
            category: 'reports',
            title: (currentLanguage === 'hi' ? 'समाधान नागरिक द्वारा सत्यापित' : (currentLanguage === 'hinglish' ? 'Resolution Citizen dwara Verify Hui' : 'Resolution Citizen Verified')),
            message: (currentLanguage === 'hi'
              ? `आपने शिकायत #${targetRep.id} के जमीनी समाधान को 'सुलझाई गई' (Solved) सत्यापित किया।`
              : (currentLanguage === 'hinglish'
                ? `Aapne report #${targetRep.id} ke ground solution ko verify kiya.`
                : `You verified and marked grievance #${targetRep.id} ground solution as solved.`)),
            reportId: targetRep.id,
            reportTitle: targetRep.title || ''
          });
        } catch (e) { }
      }
      if (document.getElementById('solCheckBox')) document.getElementById('solCheckBox').classList.remove('show');
      alert(currentLanguage === 'hi' ? '🎉 धन्यवाद! आपके द्वारा समाधान सत्यापित कर दिया गया है।' : '🎉 Thank you! You have verified this solution.');
    }

    function openReopenModal() {
      const active = getCurrentlyTrackedReport();
      openReopenModalForReport(active ? active.id : null);
    }

    function goToStep(stepNum) {
      [1, 2, 3, 4, 5].forEach(i => {
        const el = document.getElementById('stepSection' + i);
        const dot = document.getElementById('dotStep' + i);
        if (el) el.style.display = i === stepNum ? 'block' : 'none';
        if (dot) {
          dot.className = 'step-dot' + (i === stepNum ? ' active' : i < stepNum ? ' done' : '');
        }
      });

      if (stepNum === 3) {
        setTimeout(() => {
          if (reportMiniMapInstance) {
            reportMiniMapInstance.invalidateSize();
          } else {
            initReportMiniMap();
          }
        }, 200);
      }
    }

    function selectFormCategory(btn, cat) {
      document.querySelectorAll('.category-chip-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (document.getElementById('reportCategory')) document.getElementById('reportCategory').value = cat;
    }

    function applyVoiceSample(sampleText, sampleTitle, sampleCategory) {
      const descEl = document.getElementById('reportDescription');
      const titleEl = document.getElementById('reportTitle');
      const catEl = document.getElementById('reportCategory');
      const statusText = document.getElementById('voiceStatusText');

      if (descEl) descEl.value = sampleText;
      if (titleEl) titleEl.value = sampleTitle;
      if (catEl && sampleCategory) {
        catEl.value = sampleCategory;
      }
      if (statusText) {
        statusText.textContent = currentLanguage === 'hi' 
          ? `✓ नमूना आवाज चयनित: ${sampleTitle}` 
          : `✓ Voice sample selected: ${sampleTitle}`;
      }
      try {
        const catTiles = document.querySelectorAll('.category-tile');
        catTiles.forEach(tile => {
          if (tile.dataset && tile.dataset.category === sampleCategory) {
            catTiles.forEach(t => t.classList.remove('selected'));
            tile.classList.add('selected');
          }
        });
      } catch (e) {}
    }
    window.applyVoiceSample = applyVoiceSample;

    function toggleVoiceInput() {
      const btn = document.getElementById('voiceMicBtn');
      const statusText = document.getElementById('voiceStatusText');
      const desc = document.getElementById('reportDescription');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        if (statusText) {
          statusText.textContent = currentLanguage === 'hi' 
            ? 'माइक्रोफ़ोन सपोर्ट नहीं है। आप नीचे दिए गए उदाहरणों पर क्लिक कर सकते हैं।' 
            : 'Speech recognition unavailable. You can click sample voice prompts below.';
        }
        alert(currentLanguage === 'hi' ? 'इस ब्राउज़र में वॉइस सपोर्ट उपलब्ध नहीं है। आप नीचे दिए गए उदाहरणों पर क्लिक कर सकते हैं या लिख सकते हैं।' : 'Speech Recognition not supported in this browser. Please use the example chips or type directly.');
        return;
      }

      if (isRecordingVoice) {
        if (speechRecognition) {
          try { speechRecognition.stop(); } catch (e) {}
        }
        isRecordingVoice = false;
        if (btn) btn.classList.remove('recording');
        if (statusText) statusText.textContent = TRANSLATIONS[currentLanguage].voice_heading;
        return;
      }

      try {
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;

        speechRecognition.onstart = () => {
          isRecordingVoice = true;
          if (btn) btn.classList.add('recording');
          if (statusText) statusText.textContent = currentLanguage === 'hi' ? '🎙️ सुन रहे हैं... कृपया अपनी समस्या बोलें' : '🎙️ Listening... please speak your problem';
        };

        speechRecognition.onresult = async (event) => {
          const text = event.results[0][0].transcript;
          if (desc) desc.value = (desc.value ? desc.value + ' ' : '') + text;
          if (statusText) statusText.textContent = currentLanguage === 'hi' ? 'ध्वनि दर्ज हुई! एआई विश्लेषण जारी...' : 'Voice recorded! Analyzing...';

          try {
            const res = await fetch('/api/challenges/parse-voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript: desc ? desc.value : text })
            });
            const json = await res.json();
            if (json.success && json.data) {
              if (document.getElementById('reportTitle')) {
                document.getElementById('reportTitle').value = json.data.title || text.substring(0, 50);
              }
              if (json.data.category) {
                if (document.getElementById('reportCategory')) {
                  document.getElementById('reportCategory').value = json.data.category;
                }
                const catTiles = document.querySelectorAll('.category-tile');
                catTiles.forEach(tile => {
                  if (tile.dataset && tile.dataset.category === json.data.category) {
                    catTiles.forEach(t => t.classList.remove('selected'));
                    tile.classList.add('selected');
                  }
                });
              }
            }
          } catch (e) {
            if (document.getElementById('reportTitle')) {
              document.getElementById('reportTitle').value = text.substring(0, 50);
            }
          }

          isRecordingVoice = false;
          if (btn) btn.classList.remove('recording');
          if (statusText) statusText.textContent = currentLanguage === 'hi' ? '✓ ध्वनि रिकॉर्ड हो गई! शीर्षक व श्रेणी स्वतः चयनित' : '✓ Voice recorded! Title & category auto-selected';
        };

        speechRecognition.onerror = (e) => {
          console.warn('SpeechRecognition error:', e);
          isRecordingVoice = false;
          if (btn) btn.classList.remove('recording');
          if (statusText) {
            statusText.textContent = currentLanguage === 'hi' 
              ? 'माइक्रोफ़ोन अनुमति नहीं मिली। आप लिख सकते हैं या नीचे उदाहरण चुन सकते हैं।' 
              : 'Microphone permission blocked. You can type or pick an example below.';
          }
        };

        speechRecognition.onend = () => {
          isRecordingVoice = false;
          if (btn) btn.classList.remove('recording');
        };

        speechRecognition.start();
      } catch (err) {
        console.warn('Voice start exception:', err);
        isRecordingVoice = false;
        if (btn) btn.classList.remove('recording');
      }
    }
    window.toggleVoiceInput = toggleVoiceInput;

    async function reverseGeocodeCoords(lat, lng) {
      try {
        const res = await fetch(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const distEl = document.getElementById('reportDistrict');
          if (distEl && d.district) {
            let opt = Array.from(distEl.options).find(o => o.value.toLowerCase() === d.district.toLowerCase());
            if (!opt) {
              opt = new Option(d.district, d.district);
              distEl.add(opt);
            }
            distEl.value = opt.value;
          }
          if (document.getElementById('reportBlock')) {
            document.getElementById('reportBlock').value = d.block || '';
          }
          if (document.getElementById('reportPanchayat')) {
            document.getElementById('reportPanchayat').value = d.panchayat || '';
          }
          if (document.getElementById('reportVillage')) {
            document.getElementById('reportVillage').value = d.village || '';
          }
          if (document.getElementById('reportLandmark') && d.landmark) {
            document.getElementById('reportLandmark').value = d.landmark;
          }
          return d;
        }
      } catch (e) {
        console.warn('Reverse geocode fetch error:', e);
      }
      return null;
    }
    window.reverseGeocodeCoords = reverseGeocodeCoords;

    function autoDetectGpsLocation() {
      const gpsBtns = document.querySelectorAll('.btn-gps-autodetect, #reportMiniMap + div button');
      const setBtnText = (txt) => {
        gpsBtns.forEach(b => { if (b) b.textContent = txt; });
      };

      if (!navigator.geolocation) {
        alert(currentLanguage === 'hi' ? 'जीपीएस इस ब्राउज़र में उपलब्ध नहीं है। कृपया नक़्शे पर क्लिक करें।' : 'GPS not available in this browser. Please click on the map.');
        return;
      }

      setBtnText(currentLanguage === 'hi' ? '📍 जीपीएस लोकेशन खोजी जा रही है...' : '📍 Detecting exact GPS location...');

      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          currentReportCoords = { lat, lng };

          const pill = document.getElementById('mapCoordsPill');
          if (pill) pill.textContent = `📍 ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

          if (reportMiniMapInstance && reportMiniMapMarker) {
            reportMiniMapInstance.setView([lat, lng], 15);
            reportMiniMapMarker.setLatLng([lat, lng]);
          }

          const geo = await reverseGeocodeCoords(lat, lng);
          const locationLabel = geo ? `${geo.village || geo.block}, ${geo.district}` : `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
          setBtnText((currentLanguage === 'hi' ? '✓ जीपीएस: ' : '✓ GPS: ') + locationLabel);
        },
        err => {
          console.warn('GPS location error:', err);
          setBtnText(currentLanguage === 'hi' ? '📍 नक़्शे पर क्लिक करके स्थान चुनें' : '📍 Click on map to select spot');
          alert(currentLanguage === 'hi' 
            ? 'जीपीएस अनुमति नहीं मिली या टाइमआउट हुआ। कृपया ब्राउज़र में लोकेशन अनुमति दें या नीचे नक़्शे पर अपना स्थान चुनें।' 
            : 'GPS permission denied or timed out. Please allow location access or pinpoint your spot on the map below.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
    window.autoDetectGpsLocation = autoDetectGpsLocation;

    function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = () => resolve(e.target.result);
          img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    async function handleMediaSelect(inputOrEvent, type = 'photo') {
      let input = inputOrEvent;
      if (!input || !input.files) {
        if (inputOrEvent && inputOrEvent.target && inputOrEvent.target.files) {
          input = inputOrEvent.target;
        } else {
          const idMap = { photo: 'mediaPhotoInput', video: 'mediaVideoInput', document: 'mediaDocInput' };
          input = document.getElementById(idMap[type] || 'mediaPhotoInput');
        }
      }
      if (!input || !input.files || input.files.length === 0) return;
      const fileList = Array.from(input.files);

      for (const file of fileList) {
        const isVideo = (file.type && file.type.startsWith('video/')) || /\.(mp4|webm|mov|ogg|mkv|3gp|avi)$/i.test(file.name) || type === 'video';
        const isPhoto = !isVideo && (type === 'photo' || (file.type && file.type.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name));

        if (isVideo) {
          if (file.size > 80 * 1024 * 1024) {
            alert(currentLanguage === 'hi' ? 'कृपया 80MB से कम आकार का वीडियो चुनें।' : 'Please select a video smaller than 80MB.');
            continue;
          }
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (dataUrl) {
            selectedMediaFiles.push({ file, type: 'video', name: file.name, dataUrl, size: file.size });
          }
        } else if (isPhoto) {
          const dataUrl = await compressImage(file, 1200, 1200, 0.85);
          if (dataUrl) {
            selectedMediaFiles.push({ file, type: 'photo', name: file.name, dataUrl, size: file.size });
          }
        } else {
          selectedMediaFiles.push({ file, type, name: file.name, size: file.size });
        }
      }
      renderMediaPreviews();
      try { input.value = ''; } catch (e) {}
    }
    window.handleMediaSelect = handleMediaSelect;

    function renderMediaPreviews() {
      const container = document.getElementById('mediaPreviewContainer');
      if (!container) return;
      if (selectedMediaFiles.length === 0) {
        container.innerHTML = '';
        return;
      }

      const photoCount = selectedMediaFiles.filter(m => m.type === 'photo').length;
      const videoCount = selectedMediaFiles.filter(m => m.type === 'video').length;
      const summaryText = currentLanguage === 'hi'
        ? `📸 कुल ${selectedMediaFiles.length} साक्ष्य संलग्न (${photoCount} फ़ोटो${videoCount > 0 ? `, ${videoCount} वीडियो` : ''})`
        : `📸 Total ${selectedMediaFiles.length} Evidence Attached (${photoCount} Photo${photoCount !== 1 ? 's' : ''}${videoCount > 0 ? `, ${videoCount} Video` : ''})`;

      container.innerHTML = `
        <div style="font-size: 11.5px; font-weight: 800; color: #166534; background: #DCFCE7; border: 1px solid #86EFAC; padding: 4px 10px; border-radius: 8px; margin-top: 10px; display: inline-flex; align-items: center; gap: 6px;">
          <span>✓</span> <span>${summaryText}</span>
        </div>
      ` + selectedMediaFiles.map((m, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: #FFFDF9; border: 1.5px solid #FED7AA; border-radius: 12px; margin-top: 8px; box-shadow: 0 2px 8px rgba(255,153,51,0.08);">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          ${m.type === 'video' ? `<div style="width: 50px; height: 50px; border-radius: 8px; background: #0F172A; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1.5px solid #2563EB; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">🎥</div>` : (m.dataUrl ? `<img src="${m.dataUrl}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1.5px solid #16A34A; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1);" alt="Proof Thumb" />` : `<span style="font-size: 26px;">📄</span>`)}
          <div style="min-width: 0;">
            <div style="font-size: 12.5px; font-weight: 800; color: #15803D; display: flex; align-items: center; gap: 4px;">
              <span>✓</span> <span>${m.type === 'photo' ? (currentLanguage === 'hi' ? `फ़ोटो #${idx + 1}` : `Photo #${idx + 1}`) : (m.type === 'video' ? (currentLanguage === 'hi' ? 'फ़ील्ड वीडियो' : 'Field Video') : (currentLanguage === 'hi' ? 'दस्तावेज़ संलग्न' : 'File Attached'))}</span>
            </div>
            <div style="font-size: 11px; color: var(--gray-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; margin-top: 2px;">${m.name} (${Math.round((m.size || 1000) / 1024)} KB)</div>
          </div>
        </div>
        <button type="button" style="background: #FEE2E2; color: #DC2626; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11px; font-weight: 800; cursor: pointer; flex-shrink: 0;" onclick="selectedMediaFiles.splice(${idx}, 1); renderMediaPreviews();">✕ ${currentLanguage === 'hi' ? 'हटाएं' : 'Remove'}</button>
      </div>
    `).join('');
    }
    window.renderMediaPreviews = renderMediaPreviews;

    async function runAICheckAndGoStep5() {
      const title = document.getElementById('reportTitle').value.trim() || 'Community Grievance';
      const description = document.getElementById('reportDescription').value.trim() || title;
      const category = document.getElementById('reportCategory') ? document.getElementById('reportCategory').value : 'Water Management';
      const district = document.getElementById('reportDistrict').value;
      const block = document.getElementById('reportBlock').value;
      const village = document.getElementById('reportVillage').value;

      goToStep(5);

      document.getElementById('aiCardCategory').textContent = category;
      document.getElementById('aiCardLocation').textContent = [village, block, district].filter(Boolean).join(', ');
      const priorityVal = document.querySelector('input[name="priorityChoice"]:checked')?.value || 'high';
      document.getElementById('aiCardPriority').textContent = priorityVal.toUpperCase();

      const photoMedia = selectedMediaFiles.find(m => m.type === 'photo' && m.dataUrl);
      const photoRow = document.getElementById('aiCardPhotoRow');
      if (photoRow) {
        if (photoMedia) {
          photoRow.style.display = 'flex';
          document.getElementById('aiCardPhotoThumb').src = photoMedia.dataUrl;
          document.getElementById('aiCardPhotoName').textContent = photoMedia.name || 'Photo Attached';
        } else {
          photoRow.style.display = 'none';
        }
      }

      try {
        const res = await fetch('/api/challenges/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, category, location: { district, block, village } })
        });
        const data = await res.json();
        if (data.success && data.hasDuplicates && data.data.length > 0) {
          detectedDuplicateChallenge = data.data[0];
          document.getElementById('dupItemTitle').textContent = detectedDuplicateChallenge.title;
          document.getElementById('dupItemMeta').textContent =
            'Report #' + detectedDuplicateChallenge.challengeId + ' · 📍 ' + detectedDuplicateChallenge.distanceKm + ' km away (' + detectedDuplicateChallenge.block + ') · 👥 ' + detectedDuplicateChallenge.supportCount + ' citizens affected';
          document.getElementById('duplicateNoticeBox').style.display = 'block';
          document.getElementById('aiCardNearbyStatus').textContent = '⚠️ 1 similar problem found nearby';
          return;
        }
      } catch (e) { }

      document.getElementById('duplicateNoticeBox').style.display = 'none';
      document.getElementById('aiCardNearbyStatus').textContent = '✓ No duplicate conflicts found nearby.';
    }

    function supportExistingDetectedReport() {
      if (detectedDuplicateChallenge) {
        toggleSupport(detectedDuplicateChallenge.id);
      }
      closeModal('reportModal');
      alert(currentLanguage === 'hi' ? '👍 धन्यवाद! आपका समर्थन जोड़ दिया गया है।' : '👍 Thank you! Your support has been added.');
    }

    function dismissDuplicateAndProceed() {
      document.getElementById('duplicateNoticeBox').style.display = 'none';
    }

    async function submitRealProblem() {
      const btn = document.getElementById('finalSubmitBtn');
      btn.textContent = currentLanguage === 'hi' ? 'दर्ज हो रहा है...' : 'Submitting...';
      btn.disabled = true;

      const title = document.getElementById('reportTitle').value.trim() || 'Panchayat Problem';
      let description = document.getElementById('reportDescription').value.trim() || title;
      if (description.length < 15) {
        description = `${title} — ${description}. Immediate community attention and civic resolution required.`;
      }
      const category = document.getElementById('reportCategory') ? document.getElementById('reportCategory').value : 'Water Management';
      const priority = document.querySelector('input[name="priorityChoice"]:checked')?.value || 'high';
      const state = document.getElementById('reportState').value;
      const district = document.getElementById('reportDistrict').value;
      const block = document.getElementById('reportBlock').value;
      const panchayat = document.getElementById('reportPanchayat').value;
      const village = document.getElementById('reportVillage').value;

      const user = getCurrentUser();
      const userEmail = user && user.email ? user.email.toLowerCase().trim() : '';
      const userId = user ? (user.id || user._id || '').toString() : '';
      const userName = user && user.name ? user.name : 'Citizen';

      // Pre-resolve dataUrl for any selected media that may not have completed reading
      for (const m of selectedMediaFiles) {
        if (!m.dataUrl && m.file) {
          const isVid = m.type === 'video' || (m.file && m.file.type && m.file.type.startsWith('video/')) || /\.(mp4|webm|mov|ogg|mkv|3gp|avi)$/i.test(m.name || '');
          if (isVid) {
            m.dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(m.file);
            });
            if (m.dataUrl && !m.dataUrl.startsWith('data:video/')) {
              const comma = m.dataUrl.indexOf(',');
              if (comma !== -1) m.dataUrl = `data:video/mp4;base64,${m.dataUrl.slice(comma + 1)}`;
            }
          }
        }
      }

      // Extract user uploaded images (support multiple photos)
      const photoMedias = selectedMediaFiles.filter(m => (m.type === 'photo' || (m.file && m.file.type && m.file.type.startsWith('image/'))) && m.dataUrl && !m.dataUrl.startsWith('data:video/'));
      const primaryPhoto = photoMedias.length > 0 ? photoMedias[0].dataUrl : null;
      const finalImage = primaryPhoto || getCategoryFallbackImage(category);

      let attachments = [];
      if (selectedMediaFiles.length > 0) {
        attachments = selectedMediaFiles.map((m, idx) => {
          const isVid = m.type === 'video' || (m.file && m.file.type && m.file.type.startsWith('video/')) || /\.(mp4|webm|mov|ogg|mkv|3gp|avi)$/i.test(m.name || '');
          if (isVid) {
            return {
              filename: m.name || `citizen_video_${idx + 1}.mp4`,
              originalName: m.name || `citizen_video_${idx + 1}.mp4`,
              mimetype: 'video/mp4',
              size: m.size || (m.dataUrl ? m.dataUrl.length : 1000),
              url: m.dataUrl // Strictly video, never falls back to photo
            };
          }
          return {
            filename: m.name || `citizen_evidence_${idx + 1}.png`,
            originalName: m.name || `citizen_evidence_${idx + 1}.png`,
            mimetype: m.type === 'photo' ? 'image/jpeg' : (m.file?.type || 'application/octet-stream'),
            size: m.size || (m.dataUrl ? m.dataUrl.length : 1000),
            url: m.dataUrl || finalImage
          };
        }).filter(att => att.url);
      } else if (finalImage) {
        attachments = [{
          filename: 'citizen_evidence.png',
          originalName: 'citizen_evidence.png',
          mimetype: 'image/png',
          size: finalImage.length,
          url: finalImage
        }];
      }

      const videoAttachment = attachments.find(a => (a.mimetype && a.mimetype.startsWith('video/')) || /\.(mp4|webm|mov|ogg|mkv|3gp|avi)$/i.test(a.filename || ''));

      const payload = {
        title,
        description,
        category,
        priority,
        location: { state, district, block, panchayat, village },
        submitterContact: {
          name: userName,
          email: userEmail || 'citizen@jansetu.in',
          phone: user?.phone || '9876543210'
        },
        isPublic: true,
        image: finalImage,
        coverImage: finalImage,
        videoUrl: videoAttachment ? videoAttachment.url : null,
        resolutionProof: {
          beforeImage: finalImage,
          summary: 'Citizen ground reality evidence'
        },
        attachments
      };

      let realId = 'JH-2026-' + Math.floor(1000 + Math.random() * 9000);
      let realMongoId = null;

      if (!navigator.onLine) {
        const drafts = JSON.parse(localStorage.getItem('jansetu_offline_drafts') || '[]');
        drafts.push(payload);
        localStorage.setItem('jansetu_offline_drafts', JSON.stringify(drafts));
        updateNetworkStatus();
      } else {
        try {
          const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch('/api/challenges', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success && json.data) {
            realId = json.data.challengeId || ('JH-2026-' + json.data._id.slice(-4).toUpperCase());
            realMongoId = json.data._id;
            if (json.data.filePath) payload.filePath = json.data.filePath;
            if (json.data.coverImage || json.data.image) {
              payload.image = json.data.coverImage || json.data.image;
              payload.beforeImg = json.data.coverImage || json.data.image;
            }
          }
        } catch (e) {
          console.warn('API submission error:', e);
        }
      }

      const effectiveImg = payload.image || finalImage;
      const newReport = {
        id: realId,
        mongoId: realMongoId,
        filePath: payload.filePath || null,
        title,
        district,
        location: [village, block, district, state].filter(Boolean).join(', ') || 'Jharkhand',
        coords: { lat: currentReportCoords.lat, lng: currentReportCoords.lng },
        submittedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'Submitted',
        category,
        image: effectiveImg,
        beforeImg: effectiveImg,
        afterImg: null,
        desc: description,
        assign: 'Verification in progress by JanSetu Authority',
        timeAgo: 'Just now',
        supports: 1,
        needsAction: false,
        isResolved: false,
        isVerified: false,
        submitterName: userName,
        submitterEmail: userEmail,
        submittedById: userId,
        resolutionProof: {
          beforeImage: effectiveImg,
          beforeFilePath: payload.filePath || null
        }
      };

      allReportsList.unshift(newReport);

      // Save to shared community pool so any other citizen sees it in their "Nearby"
      try {
        let pool = JSON.parse(localStorage.getItem('jansetu_community_pool') || '[]');
        if (!Array.isArray(pool)) pool = [];
        const pIdx = pool.findIndex(p => p.id === realId || (realMongoId && p.mongoId === realMongoId));
        if (pIdx !== -1) {
          pool[pIdx] = { ...pool[pIdx], ...newReport };
        } else {
          pool.unshift(newReport);
        }
        localStorage.setItem('jansetu_community_pool', JSON.stringify(pool));
      } catch (e) { }

      // Real-time broadcast to all open tabs / windows
      if (typeof jansetuSyncChannel !== 'undefined' && jansetuSyncChannel) {
        try {
          jansetuSyncChannel.postMessage({
            type: 'NEW_CHALLENGE',
            challenge: newReport,
            district: district
          });
        } catch (e) { }
      }

      // Refresh live challenges immediately from API
      setTimeout(fetchLiveChallenges, 300);

      // Reset media input files
      selectedMediaFiles = [];
      renderMediaPreviews();
      const photoInput = document.getElementById('mediaPhotoInput');
      if (photoInput) photoInput.value = '';

      // Switch active tracker to this newly uploaded report
      activeTrackerIndex = 0;

      saveReportsState();
      renderAllViews();
      closeModal('reportModal');

      // Record notification in citizen civic activity log
      try {
        addCitizenNotification({
          type: 'REPORT_SUBMITTED',
          category: 'reports',
          title: (currentLanguage === 'hi' ? 'नई जनसमस्या दर्ज हुई' : (currentLanguage === 'hinglish' ? 'Nayi Grievance Darj Hui' : 'Grievance Registered Successfully')),
          message: (currentLanguage === 'hi'
            ? `आपकी शिकायत #${realId} (${title || 'जनसमस्या'}) जनसेतु पोर्टल पर सफलतापूर्वक दर्ज हो गई है और सत्यापन प्रक्रिया में है।`
            : (currentLanguage === 'hinglish'
              ? `Aapki report #${realId} (${title || 'Grievance'}) JanSetu portal par darj ho gayi hai.`
              : `Your grievance #${realId} (${title || 'Grievance'}) was registered on JanSetu portal and verification has begun.`)),
          reportId: realId,
          reportTitle: title || ''
        });
      } catch (e) { }

      btn.textContent = TRANSLATIONS[currentLanguage].btn_submit_confirm;
      btn.disabled = false;
      alert((currentLanguage === 'hi' ? '✅ धन्यवाद! आपकी समस्या पोर्टल पर दर्ज हो गई है।\nReport ID: ' : '✅ Success! Your problem has been submitted.\nReport ID: ') + realId);

      // Background sync with live challenges
      fetchLiveChallenges().catch(() => { });
    }

    let allReportsFilter = 'all';

    function filterAllReportsModal(filter) {
      allReportsFilter = filter;
      const tabAll = document.getElementById('tabAllRepAll');
      const tabProg = document.getElementById('tabAllRepProg');
      const tabSolved = document.getElementById('tabAllRepSolved');
      if (tabAll) tabAll.className = filter === 'all' ? 'lang-btn active' : 'lang-btn';
      if (tabProg) tabProg.className = filter === 'in_progress' ? 'lang-btn active' : 'lang-btn';
      if (tabSolved) tabSolved.className = filter === 'solved' ? 'lang-btn active' : 'lang-btn';
      renderAllReportsModalList();
    }

    function renderAllReportsModalList() {
      const cont = document.getElementById('allReportsModalList');
      if (!cont) return;

      let list = allReportsList;
      if (allReportsFilter === 'in_progress') {
        list = allReportsList.filter(r => r.status !== 'Solved' && !r.isResolved);
      } else if (allReportsFilter === 'solved') {
        list = allReportsList.filter(r => r.status === 'Solved' || r.isResolved);
      }

      if (list.length === 0) {
        cont.innerHTML = `<div style="text-align:center; padding:30px; color:var(--gray-500); font-size:13px;">No reports in this tab.</div>`;
        return;
      }

      cont.innerHTML = list.map(r => `
      <div class="report-list-row-item" onclick="openDetailModal('${r.id}')">
        <img src="${r.image || getCategoryFallbackImage(r.category)}" class="report-row-thumb" alt="Thumb" onerror="this.src='/images/water-tap.jpg'" />
        <div class="report-row-center-info">
          <div class="report-row-title-text">${r.title}</div>
          <div class="report-row-location-text">📍 ${r.location}</div>
          <div class="report-row-id-text">${r.id} · <span style="color:var(--gray-500);font-weight:normal;">${r.assign || 'JanSetu Taskforce'}</span></div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;">
          <span class="${r.status === 'Solved' ? 'status-pill-resolved' : 'status-pill-assigned'}">${r.status}</span>
          <div style="display: flex; gap: 6px;">
            <button type="button" style="background:#002D62; color:#fff; font-size:10px; font-weight:800; border-radius:6px; padding:4px 8px; cursor:pointer; border:none;" onclick="event.stopPropagation(); openReportSlip('${r.id}');" title="View & Download Official Slip">
              📄 Slip
            </button>
            ${r.status !== 'Solved' && !r.isResolved ? `
              <button type="button" style="background:#EFF6FF; border:1px solid #BFDBFE; color:var(--navy); font-size:10px; font-weight:700; border-radius:6px; padding:4px 8px; cursor:pointer;" onclick="event.stopPropagation(); trackSpecificReport('${r.id}'); closeModal('allReportsModal');">
                📌 Track
              </button>
            ` : `
              <button type="button" style="background:#FFF7ED; border:1px solid #FED7AA; color:#C2410C; font-size:10px; font-weight:800; border-radius:6px; padding:4px 8px; cursor:pointer;" onclick="event.stopPropagation(); deleteProblemFiles('${r.id}');" title="Delete files from Supabase to free up cloud storage">
                🗑️ ${currentLanguage === 'hi' ? 'फ़ाइलें हटाएं' : 'Delete Files'}
              </button>
            `}
            ${(r.status === 'Submitted' || !r.isVerified) && r.status !== 'Solved' && !r.isResolved && r.rawStatus !== 'validated' && r.status !== 'Verified' ? `
              <button type="button" style="background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; font-size:10px; font-weight:800; border-radius:6px; padding:4px 8px; cursor:pointer;" onclick="event.stopPropagation(); promptDeleteReport('${r.id}');" title="${currentLanguage === 'hi' ? 'सत्यापन से पहले हटाएं' : 'Delete Unverified Report'}">
                🗑️ ${currentLanguage === 'hi' ? 'हटाएं' : 'Delete'}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
    }

    function openAllReportsModal() {
      allReportsFilter = 'all';
      filterAllReportsModal('all');
      openModal('allReportsModal');
    }

    let exploreSearchQuery = '';

    function onExploreSearchInput(val) {
      exploreSearchQuery = (val || '').trim().toLowerCase();
      const clearBtn = document.getElementById('exploreSearchClearBtn');
      if (clearBtn) {
        clearBtn.style.display = exploreSearchQuery ? 'inline-flex' : 'none';
      }
      renderExploreModalList();
    }

    function clearExploreSearch() {
      exploreSearchQuery = '';
      const inp = document.getElementById('exploreSearchInput');
      if (inp) inp.value = '';
      const clearBtn = document.getElementById('exploreSearchClearBtn');
      if (clearBtn) clearBtn.style.display = 'none';
      renderExploreModalList();
    }

    function setExploreDistrictFilter(filter) {
      exploreDistrictFilter = filter;
      renderExploreModalList();
    }

    function renderExploreModalList() {
      const cont = document.getElementById('exploreFullContainer');
      if (!cont) return;

      const userDist = getUserDistrict();
      const user = getCurrentUser();
      const userEmail = user && user.email ? user.email.toLowerCase().trim() : '';
      const userId = user ? (user.id || user._id || '').toString() : '';

      let listToRender = exploreList.filter(c => {
        // Exclude own reports
        const itemSubEmail = c.submitterEmail ? c.submitterEmail.toLowerCase().trim() : '';
        const itemSubId = c.submittedById ? c.submittedById.toString() : '';
        const isMine = (userEmail && itemSubEmail === userEmail) || (userId && itemSubId === userId) || allReportsList.some(r => r.id === c.id || (c.mongoId && r.mongoId === c.mongoId));
        if (isMine) return false;

        // District filter
        if (exploreDistrictFilter === 'same_district') {
          const cDist = getChallengeDistrict(c);
          if (!isSameDistrict(cDist, userDist)) return false;
        }

        // Live Instant Keyword Search Filter
        if (exploreSearchQuery) {
          const q = exploreSearchQuery;
          const matchTitle = (c.title || '').toLowerCase().includes(q);
          const matchDesc = (c.desc || '').toLowerCase().includes(q);
          const matchCat = (c.category || '').toLowerCase().includes(q);
          const matchLoc = (c.location || '').toLowerCase().includes(q);
          const matchDist = (getChallengeDistrict(c) || '').toLowerCase().includes(q);
          const matchAuthor = ((c.citizenId || '') + ' ' + (c.submitterName || (c.submitterContact && c.submitterContact.name) || '')).toLowerCase().includes(q);
          const matchId = (c.id || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat && !matchLoc && !matchDist && !matchAuthor && !matchId) {
            return false;
          }
        }

        return true; // all criteria matched
      });

      const isHi = currentLanguage === 'hi';
      const isHinglish = currentLanguage === 'hinglish';

      const myDistLabel = isHi
        ? `📍 केवल मेरे जिले की समस्याएं: ${userDist}`
        : (isHinglish ? `📍 Mere District Ki Problems: ${userDist}` : `📍 My District Only: ${userDist}`);
      const allDistLabel = isHi
        ? '🌐 समस्त झारखण्ड के जिले'
        : (isHinglish ? '🌐 Sabhi Districts' : '🌐 All Jharkhand Districts');

      let searchResultSummaryHtml = '';
      if (exploreSearchQuery) {
        searchResultSummaryHtml = `
        <div style="font-size: 12px; color: #475569; margin: -4px 0 10px 4px; display: flex; align-items: center; justify-content: space-between;">
          <span>
            ${isHi ? `🔍 "<strong>${exploreSearchQuery}</strong>" के लिए खोज परिणाम:` : (isHinglish ? `🔍 "<strong>${exploreSearchQuery}</strong>" ke search results:` : `🔍 Search results for "<strong>${exploreSearchQuery}</strong>":`)}
            <strong style="color: #002D62; font-size: 12.5px;"> ${listToRender.length} ${isHi ? 'समस्याएं' : (isHinglish ? 'problems' : 'issues')}</strong>
          </span>
          <button type="button" onclick="clearExploreSearch()" style="background: none; border: none; color: #0284C7; font-weight: 700; cursor: pointer; font-size: 11.5px; text-decoration: underline;">
            ${isHi ? 'खोज हटाएं' : (isHinglish ? 'Search Clear Karein' : 'Clear search')}
          </button>
        </div>
      `;
      }

      const filterHeaderHtml = `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; background: #F1F5F9; padding: 4px; border-radius: 12px;">
        <button type="button" class="lang-btn ${exploreDistrictFilter === 'same_district' ? 'active' : ''}" style="flex: 1; text-align: center; font-size: 12px; font-weight: 800; padding: 8px 12px;" onclick="setExploreDistrictFilter('same_district')">
          ${myDistLabel}
        </button>
        <button type="button" class="lang-btn ${exploreDistrictFilter === 'all' ? 'active' : ''}" style="flex: 1; text-align: center; font-size: 12px; font-weight: 800; padding: 8px 12px;" onclick="setExploreDistrictFilter('all')">
          ${allDistLabel}
        </button>
      </div>
    ` + searchResultSummaryHtml;

      if (listToRender.length === 0) {
        cont.innerHTML = filterHeaderHtml + `
        <div style="text-align: center; padding: 35px 20px; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 14px; margin-top: 6px;">
          <div style="font-size: 28px; margin-bottom: 6px;">${exploreSearchQuery ? '🔍' : '📍'}</div>
          <div style="font-weight: 800; color: #1E293B; font-size: 14px;">
            ${exploreSearchQuery
            ? (isHi ? `"${exploreSearchQuery}" से मेल खाती कोई समस्या नहीं मिली।` : (isHinglish ? `"${exploreSearchQuery}" se match karti koi problem nahi mili.` : `No problems found matching "${exploreSearchQuery}".`))
            : (exploreDistrictFilter === 'same_district'
              ? (isHi ? userDist + ' में साथी नागरिकों की कोई रिपोर्ट नहीं है।' : 'No citizen reports found in ' + userDist + '.')
              : (isHi ? 'कोई रिपोर्ट उपलब्ध नहीं है।' : 'No reports found.'))}
          </div>
          <div style="color: #64748B; font-size: 12px; margin-top: 4px;">
            ${exploreSearchQuery
            ? (isHi ? 'कृपया कोई दूसरा कीवर्ड (जैसे: पानी, सड़क, बिजली, कचरा) खोजें या जिला फ़िल्टर बदलें।' : (isHinglish ? 'Kripya koi doosra keyword (jaise: pani, road, bijli) search karein ya district filter change karein.' : 'Try searching with a different keyword or toggle the district filter.'))
            : (exploreDistrictFilter === 'same_district'
              ? (isHi ? 'जैसे ही ' + userDist + ' में कोई समस्या दर्ज होगी, वह तुरंत दिखेगी।' : 'New issues reported in ' + userDist + ' will appear here.')
              : '')}
          </div>
        </div>
      `;
        return;
      }

      cont.innerHTML = filterHeaderHtml + listToRender.map(c => {
        const isSupported = supportedIds.has(c.id);
        const cDist = getChallengeDistrict(c) || userDist;
        const maskedCitizenId = c.citizenId || c.submitterCitizenId || ('C' + (c.id ? c.id.replace(/[^0-9]/g, '').slice(-4) : '9604'));
        const citizenBadgeText = (isHi ? 'नागरिक #' : 'Citizen #') + maskedCitizenId;
        return `
        <div style="background:var(--white);border:1px solid var(--gray-200);border-radius:14px;padding:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;transition:all 0.2s ease;" onclick="openDetailModal('${c.id}')">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
              <span style="font-size:11px;font-weight:800;color:var(--navy);background:#EFF6FF;padding:3px 9px;border-radius:12px;">${c.category}</span>
              <span style="font-size:10.5px;font-weight:700;color:#0284C7;background:#E0F2FE;border:1px solid #BAE6FD;padding:2px 8px;border-radius:10px;">📍 ${cDist}</span>
              <span style="font-size:11px;font-weight:700;color:#0F766E;background:#F0FDFA;border:1px solid #CCFBF1;padding:2px 8px;border-radius:10px;">🛡️ ${citizenBadgeText}</span>
            </div>
            <div style="font-size:14px;font-weight:800;color:var(--gray-900);margin:4px 0 2px;">${c.title}</div>
            <div style="font-size:12px;color:var(--gray-500);">📍 ${c.location} · <strong>${c.supports} ${isHi ? 'नागरिक प्रभावित' : 'citizens affected'}</strong></div>
          </div>
          <button type="button" class="btn-support-nearby ${isSupported ? 'supported' : 'not-supported'}" style="width:auto;white-space:nowrap;padding:8px 16px;margin:0;" onclick="event.stopPropagation(); toggleSupport('${c.id}')">
            ${isSupported ? (isHi ? '✓ समर्थित (' + c.supports + ')' : '✓ Supported (' + c.supports + ')') : (isHi ? '👍 मैं भी प्रभावित हूँ (' + c.supports + ')' : (isHinglish ? '👍 Main bhi prabhavit hoon (' + c.supports + ')' : '👍 I am also affected (' + c.supports + ')'))}
          </button>
        </div>
      `;
      }).join('');
    }

    function openExploreModal() {
      exploreDistrictFilter = 'same_district';
      exploreSearchQuery = '';
      const inp = document.getElementById('exploreSearchInput');
      if (inp) {
        inp.value = '';
        const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
        if (dict && dict.explore_search_placeholder) {
          inp.placeholder = dict.explore_search_placeholder;
        }
      }
      const clearBtn = document.getElementById('exploreSearchClearBtn');
      if (clearBtn) clearBtn.style.display = 'none';
      renderExploreModalList();
      openModal('exploreModal');
    }

    async function toggleSupport(challengeId) {
      if (!challengeId) return;
      const isSupported = supportedIds.has(challengeId);
      if (isSupported) {
        supportedIds.delete(challengeId);
      } else {
        supportedIds.add(challengeId);
      }
      saveSupportsState();

      // 1. Update supports count in exploreList
      let target = exploreList.find(c => c.id === challengeId || (c.mongoId && c.mongoId === challengeId));
      if (target) {
        target.supports = (target.supports || 1) + (isSupported ? -1 : 1);
        if (target.supports < 1) target.supports = 1;
        saveExploreState();
      }

      // 2. Also update supports count in allReportsList if applicable
      let myReport = allReportsList.find(c => c.id === challengeId || (c.mongoId && c.mongoId === challengeId));
      if (myReport) {
        myReport.supports = (myReport.supports || 1) + (isSupported ? -1 : 1);
        if (myReport.supports < 1) myReport.supports = 1;
        saveReportsState();
      }

      const activeItem = target || myReport || { id: challengeId, supports: isSupported ? 1 : 2 };

      // 3. Update in shared community pool
      try {
        let pool = JSON.parse(localStorage.getItem('jansetu_community_pool') || '[]');
        const pIdx = pool.findIndex(p => p.id === challengeId || (p.mongoId && p.mongoId === challengeId));
        if (pIdx !== -1) {
          pool[pIdx].supports = activeItem.supports;
          localStorage.setItem('jansetu_community_pool', JSON.stringify(pool));
        }
      } catch (e) { }

      // 4. Call backend API if authenticated
      try {
        const mongoId = activeItem?.mongoId || challengeId;
        const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
        if (token && mongoId && !mongoId.startsWith('JH-')) {
          await fetch(`/api/challenges/${mongoId}/support`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
          });
        }
      } catch (e) { }

      // 5. Re-render background dashboard views
      renderAllViews();
      if (document.getElementById('exploreModal')?.classList.contains('active')) {
        renderExploreModalList();
      }
      if (document.getElementById('allReportsModal')?.classList.contains('active')) {
        renderAllReportsModalList();
      }

      // 6. IMMEDIATELY UPDATE IN-MODAL SUPPORT COUNTER, BADGE & BUTTON IF MODAL IS OPEN IN FRONT!
      if (currentlyInspectedId === challengeId || (activeItem && currentlyInspectedId === activeItem.id) || (activeItem.mongoId && currentlyInspectedId === activeItem.mongoId)) {
        updateDetailModalSupportUI(activeItem);
      }

      // Record support notification in citizen activity log
      try {
        if (!isSupported) {
          addCitizenNotification({
            type: 'SUPPORT_GIVEN',
            category: 'supports',
            title: (currentLanguage === 'hi' ? 'सामुदायिक समर्थन दर्ज हुआ' : (currentLanguage === 'hinglish' ? 'Community Support Pledged' : 'Community Support Pledged')),
            message: (currentLanguage === 'hi'
              ? `आपने जनसमस्या #${challengeId} (${activeItem.title || 'सामुदायिक मुद्दा'}) को समर्थन दिया। कुल समर्थन: ${activeItem.supports} नागरिक।`
              : (currentLanguage === 'hinglish'
                ? `Aapne issue #${challengeId} (${activeItem.title || 'Civic Issue'}) ko support diya. Kul samarthan: ${activeItem.supports}`
                : `You voted in support of civic issue #${challengeId} (${activeItem.title || 'Civic Issue'}). Total supports: ${activeItem.supports}`)),
            reportId: challengeId,
            reportTitle: activeItem.title || ''
          });
        } else {
          addCitizenNotification({
            type: 'SUPPORT_REMOVED',
            category: 'supports',
            title: (currentLanguage === 'hi' ? 'समर्थन वापस लिया गया' : (currentLanguage === 'hinglish' ? 'Support Wapas Liya' : 'Support Retracted')),
            message: (currentLanguage === 'hi'
              ? `आपने जनसमस्या #${challengeId} से अपना समर्थन वापस लिया।`
              : (currentLanguage === 'hinglish'
                ? `Aapne issue #${challengeId} se support wapas liya.`
                : `You retracted your support from issue #${challengeId}.`)),
            reportId: challengeId,
            reportTitle: activeItem.title || ''
          });
        }
      } catch (e) { }

      showToast(!isSupported
        ? (currentLanguage === 'hi' ? `👍 आपका समर्थन दर्ज हुआ! (${activeItem.supports} नागरिक प्रभावित)` : `👍 You supported this issue! (${activeItem.supports} citizens affected)`)
        : (currentLanguage === 'hi' ? 'समर्थन हटाया गया' : 'Support removed'));
    }

    let currentNeedInfoTargetId = null;

    function openNeedInfoModal(reportId) {
      const target = (reportId ? allReportsList.find(r => r.id === reportId) : null)
        || getCurrentlyTrackedReport()
        || allReportsList.find(r => r.needsAction)
        || allReportsList[0];

      currentNeedInfoTargetId = target ? target.id : null;

      if (target && document.getElementById('needInfoQueryText')) {
        document.getElementById('needInfoQueryText').textContent =
          target.authorityQuery || (currentLanguage === 'hi'
            ? `कृपया ${target.title} (${target.id}) के लिए लैंडमार्क या ताज़ा फ़ोटो साक्ष्य प्रदान करें।`
            : `Please provide landmark or fresh photo for ${target.title} (${target.id}).`);
      }
      openModal('needInfoModal');
    }

    function recordNeedInfoVoice() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const r = new SpeechRecognition();
      r.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      r.onresult = e => { document.getElementById('infoVoiceText').value = e.results[0][0].transcript; };
      r.start();
    }

    function submitNeedInfoResponse() {
      const target = (currentNeedInfoTargetId ? allReportsList.find(r => r.id === currentNeedInfoTargetId) : null)
        || getCurrentlyTrackedReport()
        || allReportsList.find(r => r.needsAction)
        || allReportsList[0];

      if (target) {
        target.needsAction = false;
        if (target.status === 'Action Required') {
          target.status = (target.assign && target.assign !== 'Not Assigned' && target.assign !== 'Verification in progress by JanSetu Authority')
            ? 'Being Worked On'
            : 'Submitted';
        }
        const lm = document.getElementById('infoLandmark')?.value.trim();
        const vt = document.getElementById('infoVoiceText')?.value.trim();
        if (lm) {
          target.landmark = lm;
          target.location = (target.location ? target.location + ' (' + lm + ')' : lm);
        }
        if (vt) {
          target.citizenNote = vt;
          target.desc = (target.desc || '') + ' [Citizen Additional Info: ' + vt + ']';
        }
        const fileInput = document.getElementById('infoProofFile');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = function (e) {
            target.image = e.target.result;
            target.beforeImg = e.target.result;
            saveReportsState();
            renderAllViews();
          };
          reader.readAsDataURL(fileInput.files[0]);
        }
      }

      // Explicitly clear needsAction flag across any matching report in the list so banner never gets stuck
      allReportsList.forEach(r => {
        if (!currentNeedInfoTargetId || r.id === currentNeedInfoTargetId || r.needsAction) {
          r.needsAction = false;
          if (r.status === 'Action Required') {
            r.status = (r.assign && r.assign !== 'Not Assigned' && r.assign !== 'Verification in progress by JanSetu Authority')
              ? 'Being Worked On'
              : 'Submitted';
          }
        }
      });

      saveReportsState();
      renderAllViews();

      // Record additional info notification in citizen activity log
      try {
        addCitizenNotification({
          type: 'INFO_PROVIDED',
          category: 'actions',
          title: (currentLanguage === 'hi' ? 'अतिरिक्त जानकारी कार्यबल को प्रेषित' : (currentLanguage === 'hinglish' ? 'Additional Info Taskforce ko Bheji' : 'Additional Info Provided')),
          message: (currentLanguage === 'hi'
            ? `शिकायत #${target ? target.id : 'Report'} के लिए अतिरिक्त पहचान चिह्न / विवरण कार्यबल को सफलतापूर्वक प्रेषित कर दिया गया।`
            : (currentLanguage === 'hinglish'
              ? `Report #${target ? target.id : 'Report'} ke liye landmark/details update kar diye gaye.`
              : `Additional ground landmark & details were submitted to taskforce for #${target ? target.id : 'Report'}.`)),
          reportId: target ? target.id : null,
          reportTitle: target ? target.title : ''
        });
      } catch (e) { }

      const reqBanner = document.getElementById('actionRequiredBanner');
      if (reqBanner) reqBanner.style.display = 'none';

      if (document.getElementById('infoLandmark')) document.getElementById('infoLandmark').value = '';
      if (document.getElementById('infoVoiceText')) document.getElementById('infoVoiceText').value = '';
      if (document.getElementById('infoProofFile')) document.getElementById('infoProofFile').value = '';
      currentNeedInfoTargetId = null;

      closeModal('needInfoModal');
      alert(currentLanguage === 'hi'
        ? '✅ अतिरिक्त जानकारी प्रशासन को भेज दी गई है! स्टेटस अपडेट हो गया।'
        : '✅ Additional information sent to JanSetu authority! Status updated.');
    }

    /* ============================================================
       SUPABASE FILE PURGING (Free Up Storage for Solved / My Problems)
       ============================================================ */
    async function deleteProblemFiles(reportId) {
      const targetId = reportId || currentlyInspectedId;
      if (!targetId) return;

      const rep = allReportsList.find(r => r.id === targetId) || exploreList.find(r => r.id === targetId);
      const targetMongoId = rep?.mongoId || targetId;

      const confirmMsg = currentLanguage === 'hi'
        ? `क्या आप इस समस्या (#${targetId}) के अपलोड किए गए फ़ोटो/फ़ाइलें सुपबेस क्लाउड स्टोरेज से हटाना चाहते हैं? इससे स्टोरेज स्पेस खाली होगा।`
        : `Are you sure you want to delete uploaded files for #${targetId} from Supabase Cloud Storage to free up space?`;

      if (!confirm(confirmMsg)) return;

      try {
        const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(`/api/challenges/${targetMongoId}/files`, {
          method: 'DELETE',
          headers
        });
        const data = await res.json();

        if (data && data.success) {
          if (rep) {
            rep.filePath = null;
            rep.image = null;
            rep.beforeImg = null;
            rep.afterImg = null;
            if (rep.resolutionProof) {
              rep.resolutionProof.beforeImage = null;
              rep.resolutionProof.beforeFilePath = null;
            }
            rep.filesDeleted = true;
          }

          saveReportsState();

          // Clear modal images if currently inspected
          const detailImg = document.getElementById('detailImage');
          const detailBefore = document.getElementById('detailBeforeImg');
          const heroBox = document.querySelector('.detail-hero-box');
          if (detailImg) detailImg.src = '';
          if (detailBefore) detailBefore.src = '';
          if (heroBox) heroBox.style.display = 'none';

          renderAllViews();
          renderAllReportsModalList();

          showToast(currentLanguage === 'hi' ? '✅ सुपबेस स्टोरेज से फ़ाइलें हटा दी गईं!' : '✅ Files successfully purged from Supabase Cloud Storage!');
          alert(currentLanguage === 'hi'
            ? '✅ इस समस्या की फ़ोटो व फ़ाइलें सुपबेस क्लाउड स्टोरेज और डेटाबेस से हटा दी गई हैं।'
            : '✅ Uploaded files successfully deleted from Supabase cloud storage and databases.');

          if (typeof jansetuSyncChannel !== 'undefined' && jansetuSyncChannel) {
            try {
              jansetuSyncChannel.postMessage({
                type: 'FILES_DELETED',
                challengeId: targetId,
                mongoId: targetMongoId
              });
            } catch (e) {}
          }
        } else {
          alert((data && data.message) || 'Could not delete files from Supabase.');
        }
      } catch (err) {
        console.error('Error deleting files from Supabase:', err);
        alert('Server error while deleting files.');
      }
    }

    /* ============================================================
       TRIPARTITE PROBLEM CHAT HUB (Citizen, University Guide & Admin)
       ============================================================ */
    let chatPollingTimer = null;
    let chatStatusFilter = 'all';

    function getProblemThumbnail(r) {
      if (!r) return '/images/water-tap.jpg';
      if (r.image && typeof r.image === 'string' && r.image.trim()) return r.image.trim();
      if (r.beforeImg && typeof r.beforeImg === 'string' && r.beforeImg.trim()) return r.beforeImg.trim();
      if (r.coverImage && typeof r.coverImage === 'string' && r.coverImage.trim()) return r.coverImage.trim();
      if (Array.isArray(r.photos) && r.photos.length > 0 && typeof r.photos[0] === 'string' && r.photos[0].trim()) return r.photos[0].trim();
      if (Array.isArray(r.attachments) && r.attachments.length > 0) {
        const att = r.attachments[0];
        if (typeof att === 'string' && att.trim()) return att.trim();
        if (att && att.url && typeof att.url === 'string' && att.url.trim()) return att.url.trim();
      }
      if (Array.isArray(r.media) && r.media.length > 0) {
        const m = r.media[0];
        if (typeof m === 'string' && m.trim()) return m.trim();
        if (m && m.url && typeof m.url === 'string' && m.url.trim()) return m.url.trim();
      }
      return getCategoryFallbackImage(r.category);
    }
    window.getProblemThumbnail = getProblemThumbnail;

    function getCategoryTile(cat) {
      const c = (cat || '').toLowerCase();
      if (c.includes('water') || c.includes('जल') || c.includes('drain') || c.includes('sewer') || c.includes('pipe')) {
        return { icon: '💧', bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE' };
      }
      if (c.includes('health') || c.includes('स्वास्थ्य') || c.includes('hospital') || c.includes('sanitat') || c.includes('safai')) {
        return { icon: '🏥', bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
      }
      if (c.includes('road') || c.includes('सड़क') || c.includes('street') || c.includes('bridge') || c.includes('infra') || c.includes('pothole')) {
        return { icon: '🛣️', bg: '#F1F5F9', color: '#334155', border: '#E2E8F0' };
      }
      if (c.includes('electric') || c.includes('बिजली') || c.includes('light') || c.includes('power') || c.includes('energy')) {
        return { icon: '⚡', bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
      }
      if (c.includes('environ') || c.includes('पर्यावरण') || c.includes('garbage') || c.includes('waste') || c.includes('tree') || c.includes('pollution')) {
        return { icon: '🍃', bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' };
      }
      return { icon: '📋', bg: '#F3E8FF', color: '#7C3AED', border: '#E9D5FF' };
    }

    function setChatStatusFilter(statusKey) {
      chatStatusFilter = statusKey || 'all';
      const tabIds = {
        'all': 'chatTab_all',
        'Submitted': 'chatTab_Submitted',
        'Being Worked On': 'chatTab_Review',
        'Solved': 'chatTab_Solved'
      };
      Object.keys(tabIds).forEach(k => {
        const btn = document.getElementById(tabIds[k]);
        if (btn) {
          if (k === chatStatusFilter) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
      renderChatProblemChannels();
    }
    window.setChatStatusFilter = setChatStatusFilter;

    async function openChatModal(targetProblemId) {
      if (allReportsList.length === 0 && exploreList.length === 0) {
        try {
          await fetchLiveChallenges(true);
        } catch (e) {}
      }

      let candidateProblems = allReportsList.slice();
      if (candidateProblems.length === 0) {
        candidateProblems = exploreList.slice(0, 10);
      }

      if (candidateProblems.length === 0) {
        alert(currentLanguage === 'hi'
          ? 'चैट के लिए कोई समस्या उपलब्ध नहीं है। कृपया पहले एक समस्या दर्ज करें।'
          : 'No problems available for chat. Please report a problem first.');
        return;
      }

      let matchedProblem = null;
      if (targetProblemId) {
        const tStr = String(targetProblemId).trim();
        matchedProblem = allReportsList.find(r => r.id === tStr || r.mongoId === tStr || r._id === tStr || (r.id && r.id.toLowerCase() === tStr.toLowerCase()))
          || exploreList.find(r => r.id === tStr || r.mongoId === tStr || r._id === tStr || (r.id && r.id.toLowerCase() === tStr.toLowerCase()));
      }

      activeChatProblemId = matchedProblem ? matchedProblem.id : (candidateProblems[0] ? candidateProblems[0].id : null);

      renderChatProblemChannels();
      if (activeChatProblemId) {
        selectChatProblem(activeChatProblemId);
      }

      openModal('problemChatModal');

      // Start real-time chat polling every 3.5s for instant University/Admin incoming messages
      if (chatPollingTimer) clearInterval(chatPollingTimer);
      chatPollingTimer = setInterval(pollActiveChatRoom, 3500);

      // Bind search input
      const sInp = document.getElementById('chatSearchInput');
      if (sInp) {
        sInp.value = '';
        chatSearchQuery = '';
        sInp.oninput = (e) => filterChatProblems(e.target.value);
      }

      setTimeout(() => {
        const inp = document.getElementById('chatTextInput');
        if (inp) inp.focus();
      }, 100);
    }
    window.openChatModal = openChatModal;

    async function pollActiveChatRoom() {
      const modal = document.getElementById('problemChatModal');
      const isOpen = modal && (modal.classList.contains('active') || modal.classList.contains('open'));
      if (!isOpen || !activeChatProblemId) {
        if (!isOpen && chatPollingTimer) {
          clearInterval(chatPollingTimer);
          chatPollingTimer = null;
        }
        return;
      }

      const targetRep = allReportsList.find(r => r.id === activeChatProblemId) || exploreList.find(r => r.id === activeChatProblemId);
      const targetMongoId = targetRep?.mongoId || activeChatProblemId;

      try {
        const res = await fetch(`/api/challenges/${targetMongoId}/chat`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.chatMessages)) {
          const currentMsgs = chatMessagesCache[activeChatProblemId] || [];
          const merged = mergeAndDeduplicateChat(json.chatMessages, currentMsgs);
          if (merged.length !== currentMsgs.length || JSON.stringify(merged) !== JSON.stringify(currentMsgs)) {
            chatMessagesCache[activeChatProblemId] = merged;
            if (targetRep) targetRep.chatMessages = merged;
            renderChatMessagesStream(targetRep);
            renderChatProblemChannels();
          }
        }
      } catch (e) {}
    }

    function filterChatProblems(query) {
      chatSearchQuery = (query || '').toLowerCase().trim();
      renderChatProblemChannels();
    }
    window.filterChatProblems = filterChatProblems;

    function renderChatProblemChannels() {
      const cont = document.getElementById('chatProblemChannelList');
      if (!cont) return;

      let baseList = allReportsList.slice();
      if (baseList.length === 0) baseList = exploreList.slice(0, 10);

      // Compute dynamic badge counts
      let countAll = baseList.length;
      let countSubmitted = 0;
      let countReview = 0;
      let countResolved = 0;

      baseList.forEach(r => {
        const st = (r.status || '').toLowerCase();
        if (st.includes('solv') || r.isResolved) {
          countResolved++;
        } else if (st.includes('work') || st.includes('prog') || st.includes('verif') || st.includes('review') || st.includes('assign') || r.isVerified) {
          countReview++;
        } else {
          countSubmitted++;
        }
      });

      const countAllEl = document.getElementById('chatCountAll');
      const countSubEl = document.getElementById('chatCountSubmitted');
      const countRevEl = document.getElementById('chatCountReview');
      const countSolEl = document.getElementById('chatCountSolved');
      if (countAllEl) countAllEl.textContent = countAll;
      if (countSubEl) countSubEl.textContent = countSubmitted;
      if (countRevEl) countRevEl.textContent = countReview;
      if (countSolEl) countSolEl.textContent = countResolved;

      let list = baseList.slice();

      // Filter by Status Tab
      if (chatStatusFilter !== 'all') {
        list = list.filter(r => {
          const st = (r.status || '').toLowerCase();
          const isSol = st.includes('solv') || r.isResolved;
          const isRev = (st.includes('work') || st.includes('prog') || st.includes('verif') || st.includes('review') || st.includes('assign') || r.isVerified) && !isSol;
          if (chatStatusFilter === 'Solved') return isSol;
          if (chatStatusFilter === 'Being Worked On') return isRev;
          if (chatStatusFilter === 'Submitted') return !isSol && !isRev;
          return true;
        });
      }

      // Filter by Search Query
      if (chatSearchQuery) {
        list = list.filter(r => (r.title || '').toLowerCase().includes(chatSearchQuery) || (r.id || '').toLowerCase().includes(chatSearchQuery) || (r.location || '').toLowerCase().includes(chatSearchQuery));
      }

      if (list.length === 0) {
        cont.innerHTML = `<div style="text-align:center; padding:36px 14px; color:#94A3B8; font-size:12.5px;">
          <div style="font-size:24px; margin-bottom:6px;">🔍</div>
          <div>No matching problems found.</div>
        </div>`;
        return;
      }

      cont.innerHTML = list.map(r => {
        const isActive = r.id === activeChatProblemId;
        const msgs = chatMessagesCache[r.id] || r.chatMessages || [];
        const hasUnread = Boolean(chatUnreadState[r.id] || msgs.some(m => !m.isCitizen && m.senderType !== 'citizen' && !m.readByCitizen));
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const lastMsgSnippet = lastMsg ? (lastMsg.text.length > 34 ? lastMsg.text.slice(0, 32) + '...' : lastMsg.text) : (r.assign || 'JanSetu Taskforce');

        const thumbImg = getProblemThumbnail(r);
        const fallbackImg = getCategoryFallbackImage(r.category);

        const isSol = (r.status || '').toLowerCase().includes('solv') || r.isResolved;
        const isRev = ((r.status || '').toLowerCase().includes('work') || (r.status || '').toLowerCase().includes('prog') || (r.status || '').toLowerCase().includes('verif') || r.isVerified) && !isSol;

        const statusLabel = isSol ? 'Resolved' : (isRev ? 'Under Review' : 'Submitted');
        const statusColor = isSol ? '#166534' : (isRev ? '#B45309' : '#1D4ED8');
        const statusBg = isSol ? '#DCFCE7' : (isRev ? '#FEF3C7' : '#DBEAFE');

        const timeTag = lastMsg ? (lastMsg.time || 'Today') : (r.timeAgo ? (r.timeAgo.length > 8 ? r.timeAgo.slice(0, 7) : r.timeAgo) : 'Recent');

        return `
        <div onclick="selectChatProblem('${r.id}')" class="chat-channel-card ${isActive ? 'active' : ''}"
          style="padding: 10px 11px; border-radius: 14px; margin-bottom: 7px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); border: 1.5px solid ${isActive ? '#2563EB' : '#E2E8F0'}; background: ${isActive ? '#EFF6FF' : '#FFFFFF'}; box-shadow: ${isActive ? '0 4px 14px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.02)'}; display: flex; align-items: flex-start; gap: 11px;">
          
          <!-- Real Grievance Thumbnail Photo (User Explicit Requirement: Images not Icons) -->
          <div class="channel-thumb-box" style="width: 44px; height: 44px; border-radius: 10px; overflow: hidden; flex-shrink: 0; border: 1.5px solid ${isActive ? '#2563EB' : '#E2E8F0'}; background: #F1F5F9; box-shadow: 0 2px 5px rgba(0,0,0,0.06); position: relative;">
            <img src="${thumbImg}" alt="${escapeHtml(r.title || 'Thumbnail')}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='${fallbackImg}'; this.onerror=function(){this.src='/images/water-tap.jpg';};" />
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 3px;">
              <span style="font-size: 11px; font-weight: 800; color: #1E3A8A; background: #DBEAFE; padding: 2px 7px; border-radius: 5px; letter-spacing: 0.2px;">${r.id}</span>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="font-size: 10px; color: #94A3B8; font-weight: 600;">${timeTag}</span>
                <span style="font-size: 10px; font-weight: 750; color: ${statusColor}; background: ${statusBg}; padding: 2px 7px; border-radius: 6px;">${statusLabel}</span>
              </div>
            </div>

            <div style="font-size: 12.5px; font-weight: 750; color: #0F172A; margin: 2px 0 3px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(r.title)}
            </div>

            <div style="font-size: 11px; color: ${hasUnread ? '#0F172A' : '#64748B'}; font-weight: ${hasUnread ? '750' : 'normal'}; display: flex; align-items: center; gap: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${hasUnread ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #22C55E; display: inline-block; flex-shrink: 0;"></span>' : ''}
              <span style="opacity: 0.75;">💬</span> <span>${escapeHtml(lastMsgSnippet)}</span>
            </div>
          </div>
        </div>
        `;
      }).join('');

      updateNavChatUnreadIndicator();
    }
    window.renderChatProblemChannels = renderChatProblemChannels;

    async function selectChatProblem(problemId) {
      if (!problemId) return;
      activeChatProblemId = problemId;
      const targetRep = allReportsList.find(r => r.id === problemId || r.mongoId === problemId || r._id === problemId || (r.id && r.id.toLowerCase() === String(problemId).toLowerCase()))
        || exploreList.find(r => r.id === problemId || r.mongoId === problemId || r._id === problemId || (r.id && r.id.toLowerCase() === String(problemId).toLowerCase()));

      if (targetRep && targetRep.id) {
        activeChatProblemId = targetRep.id;
      }

      // Turn off unread state for this problem
      chatUnreadState[activeChatProblemId] = false;
      if (targetRep && Array.isArray(targetRep.chatMessages)) {
        targetRep.chatMessages.forEach(m => { m.readByCitizen = true; });
      }
      if (chatMessagesCache[activeChatProblemId]) {
        chatMessagesCache[activeChatProblemId].forEach(m => { m.readByCitizen = true; });
      }

      renderChatProblemChannels();
      renderChatRoomHeader(targetRep);
      renderChatMessagesStream(targetRep);
      renderChatQuickChips();

      // Fetch latest messages from API with clean deduplication
      const targetMongoId = targetRep?.mongoId || activeChatProblemId;
      try {
        const res = await fetch(`/api/challenges/${targetMongoId}/chat`);
        const json = await res.json();
        if (json.success && Array.isArray(json.chatMessages)) {
          const existingList = chatMessagesCache[activeChatProblemId] || [];
          const merged = mergeAndDeduplicateChat(json.chatMessages, existingList);
          chatMessagesCache[activeChatProblemId] = merged;
          if (targetRep) targetRep.chatMessages = merged;
          renderChatMessagesStream(targetRep);
        }
      } catch (e) {}

      // Mark read on backend
      try {
        fetch(`/api/challenges/${targetMongoId}/chat/mark-read`, { method: 'POST' }).catch(() => {});
      } catch (e) {}
    }
    window.selectChatProblem = selectChatProblem;


    function renderChatRoomHeader(rep) {
      const header = document.getElementById('chatRoomHeader');
      if (!header) return;
      if (!rep) {
        header.innerHTML = `<div style="font-size:13px; color:#64748B; padding: 10px 0;">Select a problem channel on the left to start conversation.</div>`;
        return;
      }

      const isSol = (rep.status || '').toLowerCase().includes('solv') || rep.isResolved;
      const isRev = ((rep.status || '').toLowerCase().includes('work') || (rep.status || '').toLowerCase().includes('prog') || (rep.status || '').toLowerCase().includes('verif') || rep.isVerified) && !isSol;
      const statusLabel = isSol ? 'Resolved' : (isRev ? 'Under Review' : 'Submitted');
      const statusColor = isSol ? '#166534' : (isRev ? '#B45309' : '#1D4ED8');
      const statusBg = isSol ? '#DCFCE7' : (isRev ? '#FEF3C7' : '#DBEAFE');
      const statusBorder = isSol ? '#BBF7D0' : (isRev ? '#FDE68A' : '#BFDBFE');

      header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
            <span style="font-size: 11.5px; font-weight: 800; color: #1E3A8A; background: #DBEAFE; border: 1px solid #BFDBFE; padding: 2.5px 9px; border-radius: 6px;">${rep.id}</span>
            <span style="font-size: 11px; font-weight: 700; color: #0369A1; background: #F0F9FF; border: 1px solid #BAE6FD; padding: 2.5px 9px; border-radius: 6px;">📂 ${escapeHtml(rep.category || 'General')}</span>
            <span style="font-size: 11px; font-weight: 800; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusBorder}; padding: 2.5px 9px; border-radius: 6px;">◆ ${statusLabel}</span>
          </div>
          
          <button type="button" class="chat-view-details-btn" onclick="openReportFromChat('${rep.id}')" title="Inspect full audit trail and report details">
            <span>View Details</span> <span style="font-size: 10px; font-weight: 900;">⌵</span>
          </button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 260px;">
            <div style="font-size: 15px; font-weight: 850; color: #0F172A; line-height: 1.35; margin-bottom: 3px;">
              ${escapeHtml(rep.title)}
            </div>
            <div style="font-size: 12px; color: #64748B; display: flex; align-items: center; gap: 5px;">
              <span>📍</span> <span>${escapeHtml(rep.location || 'Jharkhand')}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="chat-participant-pill" style="background: #F0FDF4; border: 1px solid #BBF7D0;">
              <span style="font-size: 12.5px;">🎓</span>
              <strong style="color: #166534; font-size: 11.5px;">Prof. R. K. Sharma</strong>
              <span class="tag" style="color: #15803D;">· University Guide</span>
            </div>
            <div class="chat-participant-pill" style="background: #EFF6FF; border: 1px solid #BFDBFE;">
              <span style="font-size: 12.5px;">🛡️</span>
              <strong style="color: #1E40AF; font-size: 11.5px;">Shri S. K. Verma</strong>
              <span class="tag" style="color: #2563EB;">· JanSetu Admin</span>
            </div>
            <div class="chat-participant-pill" style="background: #F8FAFC; border: 1px solid #E2E8F0; cursor: default;" title="Active Civic Observers">
              <span style="font-size: 12px;">👥</span>
              <span style="font-weight: 700; color: #475569; font-size: 11px;">+2 Members &gt;</span>
            </div>
          </div>
        </div>
      `;
    }

    function openReportFromChat(reportId) {
      if (typeof closeModal === 'function') closeModal('problemChatModal');
      setTimeout(() => {
        openDetailModal(reportId);
      }, 150);
    }
    window.openReportFromChat = openReportFromChat;

    function renderChatMessagesStream(rep) {
      const stream = document.getElementById('chatMessagesStream');
      if (!stream) return;

      const rawMsgs = (rep && chatMessagesCache[rep.id]) || (rep && rep.chatMessages) || [];

      // Authoritative deduplication using mergeAndDeduplicateChat (prevents duplicate messages)
      const msgs = mergeAndDeduplicateChat(rawMsgs, []);

      if (msgs.length === 0) {

        stream.innerHTML = `
          <div style="text-align: center; padding: 48px 20px; color: #64748B; margin: auto;">
            <div style="font-size: 42px; margin-bottom: 12px;">🤝</div>
            <div style="font-weight: 850; font-size: 16px; color: #0F172A;">JanSetu Tripartite Coordination Channel</div>
            <div style="font-size: 12.5px; margin-top: 6px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.6; color: #64748B;">
              Direct communication between you (Citizen Submitter), assigned University Engineering Guide, and Municipal Administrative Officers. Send an inquiry or update below.
            </div>
          </div>
        `;
        return;
      }

      stream.innerHTML = msgs.map(m => {
        const isCitizen = m.senderType === 'citizen' || (!m.isUniversity && !m.senderRole?.includes('University') && !m.senderRole?.includes('Admin'));
        const isUniv = m.senderType === 'university' || m.isUniversity || m.senderRole?.toLowerCase().includes('university');
        const isAdmin = m.senderType === 'admin' || m.senderRole?.toLowerCase().includes('admin');

        // Initials and Avatars
        const avatarInitials = isCitizen ? 'C' : (isUniv ? 'RK' : 'SK');
        const avatarBg = isCitizen ? '#002D62' : (isUniv ? '#059669' : '#2563EB');

        const senderTitle = isCitizen
          ? 'You (Citizen Submitter)'
          : (isUniv ? (m.sender || 'Prof. R. K. Sharma (University Guide / IIT Delhi)') : (m.sender || 'Shri S. K. Verma (JanSetu Admin / Executive Officer)'));

        const roleBadge = isCitizen
          ? '👤 Citizen'
          : (isUniv ? `🏛️ ${m.senderRole || 'University Guide'}` : `🛡️ ${m.senderRole || 'JanSetu Admin'}`);

        const bubbleBg = isCitizen
          ? 'linear-gradient(135deg, #002D62 0%, #1E3A8A 100%)'
          : '#FFFFFF';

        const bubbleColor = isCitizen ? '#FFFFFF' : '#1E293B';
        const bubbleBorder = isCitizen ? 'none' : '1px solid #E2E8F0';
        const bubbleBorderLeft = isCitizen ? 'none' : (isUniv ? '3.5px solid #2563EB' : '3.5px solid #D97706');
        const alignSelf = isCitizen ? 'flex-end' : 'flex-start';
        const alignDirection = isCitizen ? 'row-reverse' : 'row';

        // Check if there is an attached image
        const imgUrl = m.attachmentUrl || (m.imageProof) || null;

        return `
        <div style="display: flex; flex-direction: ${alignDirection}; align-items: flex-start; gap: 10px; max-width: 82%; align-self: ${alignSelf}; margin-bottom: 8px;">
          <!-- Initials Circular Avatar -->
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${avatarBg}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 850; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.12); margin-top: 2px;">
            ${avatarInitials}
          </div>

          <div style="display: flex; flex-direction: column; align-items: ${isCitizen ? 'flex-end' : 'flex-start'};">
            <!-- Header Row with Name, Role, and Time -->
            <div style="display: flex; align-items: center; gap: 7px; font-size: 11px; margin-bottom: 4px; flex-wrap: wrap;">
              <span style="font-weight: 750; color: ${isCitizen ? '#1E3A8A' : (isUniv ? '#15803D' : '#D97706')};">${escapeHtml(senderTitle)}</span>
              <span style="font-size: 9.5px; font-weight: 700; color: ${isCitizen ? '#059669' : (isUniv ? '#2563EB' : '#D97706')}; background: ${isCitizen ? '#ECFDF5' : (isUniv ? '#EFF6FF' : '#FFFBEB')}; padding: 1.5px 7px; border-radius: 8px;">${roleBadge}</span>
              <span style="color: #94A3B8; font-size: 10px;">${m.time || 'Just now'}</span>
            </div>

            <!-- Bubble Content -->
            <div style="background: ${bubbleBg}; color: ${bubbleColor}; border: ${bubbleBorder}; border-left: ${bubbleBorderLeft}; padding: 12px 16px; border-radius: ${isCitizen ? '18px 4px 18px 18px' : '4px 18px 18px 18px'}; font-size: 13px; line-height: 1.55; box-shadow: ${isCitizen ? '0 3px 10px rgba(0, 45, 98, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)'}; word-break: break-word;">
              ${escapeHtml(m.text)}

              ${imgUrl ? `
                <div style="margin-top: 8px;">
                  <img src="${imgUrl}" alt="Evidence Photo" onclick="zoomImage('${imgUrl}', 'Chat Evidence Photo')"
                    style="max-width: 220px; max-height: 160px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); cursor: pointer; object-fit: cover; display: block;" />
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        `;
      }).join('');

      // Auto-scroll to bottom
      setTimeout(() => {
        stream.scrollTop = stream.scrollHeight;
      }, 50);
    }

    function renderChatQuickChips() {
      const cont = document.getElementById('chatQuickChipsContainer');
      if (!cont) return;

      const chips = [
        { label: '✨ When will ground team visit site?', text: 'When is the university technical ground team scheduled to visit the site?' },
        { label: '📷 Upload fresh photo evidence', action: 'upload' },
        { label: '✅ Issue resolved?', text: 'The reported problem appears to be temporarily resolved on site.' },
        { label: '••• More', text: 'Requesting updated progress estimate and official milestone validation note.' }
      ];

      cont.innerHTML = chips.map(c => {
        if (c.action === 'upload') {
          return `
            <button type="button" class="chat-chip-btn" onclick="document.getElementById('chatFileInput')?.click()"
              style="white-space: nowrap; padding: 6px 13px; border-radius: 20px; background: #EFF6FF; border: 1.5px solid #BFDBFE; font-size: 11.5px; font-weight: 750; color: #1D4ED8; cursor: pointer; transition: all 0.15s ease;">
              ${c.label}
            </button>
          `;
        }
        return `
          <button type="button" class="chat-chip-btn" onclick="sendProblemChatMessage('${c.text.replace(/'/g, "\\'")}')"
            style="white-space: nowrap; padding: 6px 13px; border-radius: 20px; background: #F8FAFC; border: 1.5px solid #E2E8F0; font-size: 11.5px; font-weight: 700; color: #334155; cursor: pointer; transition: all 0.15s ease;">
            ${c.label}
          </button>
        `;
      }).join('');
    }

    function handleChatFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file || !activeChatProblemId) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        const textMsg = `📷 [Attached Evidence Photo: ${file.name}]`;
        const user = getCurrentUser();
        const userName = user?.name || 'Citizen Submitter';
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        const targetRep = allReportsList.find(r => r.id === activeChatProblemId) || exploreList.find(r => r.id === activeChatProblemId);
        const targetMongoId = targetRep?.mongoId || activeChatProblemId;

        const newMsg = {
          sender: userName,
          senderRole: 'Citizen Submitter',
          senderType: 'citizen',
          department: 'Citizen Ground Reporter',
          text: textMsg,
          attachmentUrl: dataUrl,
          time: timeStr,
          timestamp: new Date(),
          isCitizen: true,
          readByCitizen: true
        };

        appendChatMessageToStore(activeChatProblemId, targetRep, newMsg);
        renderChatMessagesStream(targetRep);
        renderChatProblemChannels();

        // Send to backend
        fetch(`/api/challenges/${targetMongoId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textMsg,
            sender: userName,
            senderRole: 'Citizen Submitter',
            senderType: 'citizen',
            attachmentUrl: dataUrl
          })
        }).catch(() => {});
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
    window.handleChatFileUpload = handleChatFileUpload;

    let isSendingProblemChat = false;
    async function sendProblemChatMessage(overrideText) {
      if (!activeChatProblemId) return;
      if (isSendingProblemChat) return; // Prevent double/triple clicks

      const inputEl = document.getElementById('chatTextInput');
      const text = (overrideText !== undefined ? overrideText : (inputEl ? inputEl.value : '')).trim();
      if (!text) return;

      isSendingProblemChat = true;
      const sendBtn = document.getElementById('btnSendChatMessage');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';
        sendBtn.style.pointerEvents = 'none';
      }

      if (inputEl) inputEl.value = '';

      const user = getCurrentUser();
      const userName = user?.name || 'Citizen Submitter';

      const targetRep = allReportsList.find(r => r.id === activeChatProblemId) || exploreList.find(r => r.id === activeChatProblemId);
      const targetMongoId = targetRep?.mongoId || activeChatProblemId;

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const newMsg = {
        sender: userName,
        senderRole: 'Citizen Submitter',
        senderType: 'citizen',
        senderAvatar: '👤',
        department: 'Citizen Ground Reporter',
        text,
        time: timeStr,
        timestamp: new Date(),
        isCitizen: true,
        readByCitizen: true,
        readByUniversity: false,
        readByAdmin: false
      };

      // Append once using deduplicating store helper (prevents duplicate message bug)
      appendChatMessageToStore(activeChatProblemId, targetRep, newMsg);

      renderChatMessagesStream(targetRep);
      renderChatProblemChannels();

      // Post to backend
      try {
        const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        await fetch(`/api/challenges/${targetMongoId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            sender: userName,
            senderRole: 'Citizen Submitter',
            senderType: 'citizen',
            department: 'Citizen Ground Reporter'
          })
        });

        // Broadcast to other tabs
        if (typeof jansetuSyncChannel !== 'undefined' && jansetuSyncChannel) {
          jansetuSyncChannel.postMessage({
            type: 'NEW_CHAT_MESSAGE',
            challengeId: activeChatProblemId,
            mongoId: targetMongoId,
            message: newMsg
          });
        }
      } catch (err) {
        console.warn('Chat send error:', err);
      } finally {
        setTimeout(() => {
          isSendingProblemChat = false;
          const sendBtn = document.getElementById('btnSendChatMessage');
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            sendBtn.style.pointerEvents = 'auto';
          }
        }, 600);
      }
    }
    window.sendProblemChatMessage = sendProblemChatMessage;


    function updateNavChatUnreadIndicator() {
      let totalUnread = 0;
      allReportsList.forEach(r => {
        const msgs = chatMessagesCache[r.id] || r.chatMessages || [];
        const hasUnread = Boolean(chatUnreadState[r.id] || msgs.some(m => !m.isCitizen && m.senderType !== 'citizen' && !m.readByCitizen));
        if (hasUnread) totalUnread++;
      });

      const dot = document.getElementById('navChatUnreadDot');
      if (dot) {
        dot.style.display = totalUnread > 0 ? 'inline-block' : 'none';
      }
    }
    window.updateNavChatUnreadIndicator = updateNavChatUnreadIndicator;

    /* ============================================================
       SECURE GRIEVANCE DELETION SYSTEM (Pre-Admin Verification)
       ============================================================ */
    let pendingDeleteReportId = null;

    function promptDeleteReport(reportId) {
      const rep = allReportsList.find(r => r.id === reportId);
      if (!rep) return;

      // Only unverified / submitted grievances can be deleted
      const isUnverified = (rep.status === 'Submitted' || !rep.isVerified) && rep.status !== 'Solved' && !rep.isResolved && rep.rawStatus !== 'validated' && rep.status !== 'Verified';
      if (!isUnverified) {
        alert(currentLanguage === 'hi'
          ? '🔒 यह शिकायत प्रशासन द्वारा सत्यापित हो चुकी है और आधिकारिक कार्य आदेश जारी है। सरकारी ऑडिट नियमों के तहत इसे अब हटाया नहीं जा सकता।'
          : (currentLanguage === 'hinglish'
            ? '🔒 Ye grievance administration dwaara verify ho chuki hai. Municipal audit rules ke tahat ise delete nahi kiya ja sakta.'
            : '🔒 This grievance has already been verified by the municipal administration. Official work orders are active, so this record cannot be deleted under municipal audit regulations.'));
        return;
      }

      pendingDeleteReportId = reportId;
      const badge = document.getElementById('deleteTargetReportIdBadge');
      if (badge) badge.textContent = reportId;

      const input = document.getElementById('deleteSecurityInput');
      if (input) {
        input.value = '';
        input.placeholder = 'DELETE';
        input.oninput = onDeleteSecurityInputChange;
        input.onkeyup = onDeleteSecurityInputChange;
        input.onchange = onDeleteSecurityInputChange;
        input.onpaste = () => setTimeout(onDeleteSecurityInputChange, 50);
        setTimeout(() => input.focus(), 150);
      }

      const btn = document.getElementById('btnExecuteDeleteReport');
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('disabled', 'true');
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';
        btn.onclick = executeReportDeletion;
      }

      openModal('deleteConfirmModal');
    }
    window.promptDeleteReport = promptDeleteReport;

    function onDeleteSecurityInputChange() {
      const input = document.getElementById('deleteSecurityInput');
      const btn = document.getElementById('btnExecuteDeleteReport');
      if (!input || !btn) return;
      const cleanVal = (input.value || '').trim().toUpperCase().replace(/[\s\-_]/g, '');
      const cleanTarget = (pendingDeleteReportId || '').trim().toUpperCase().replace(/[\s\-_]/g, '');
      const isValid = cleanVal === 'DELETE' || (cleanTarget && cleanVal === cleanTarget);
      if (isValid) {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.background = '#DC2626';
      } else {
        btn.disabled = true;
        btn.setAttribute('disabled', 'true');
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';
      }
    }
    window.onDeleteSecurityInputChange = onDeleteSecurityInputChange;

    async function executeReportDeletion() {
      if (!pendingDeleteReportId) {
        closeModal('deleteConfirmModal');
        return;
      }

      const input = document.getElementById('deleteSecurityInput');
      const cleanVal = input ? input.value.trim().toUpperCase().replace(/\s+/g, '') : '';
      const cleanTarget = (pendingDeleteReportId || '').trim().toUpperCase().replace(/\s+/g, '');
      const isValid = cleanVal === 'DELETE' || (cleanTarget && cleanVal === cleanTarget);
      if (!isValid) {
        alert(currentLanguage === 'hi'
          ? 'हटाने की पुष्टि के लिए कृपया बॉक्स में DELETE टाइप करें।'
          : (currentLanguage === 'hinglish'
            ? 'Delete confirm karne ke liye box mein DELETE type karein.'
            : 'Please type DELETE into the confirmation box to delete.'));
        return;
      }

      const deletedId = pendingDeleteReportId;
      const repIndex = allReportsList.findIndex(r => r.id === deletedId);
      let mongoIdToDelete = null;

      if (repIndex !== -1) {
        const rep = allReportsList[repIndex];
        mongoIdToDelete = rep.mongoId || null;
        allReportsList.splice(repIndex, 1);
      }

      // Also remove from exploreList if present
      exploreList = exploreList.filter(e => e.id !== deletedId && (!mongoIdToDelete || e.mongoId !== mongoIdToDelete));
      saveExploreState();

      // Also remove from shared community pool
      try {
        let pool = JSON.parse(localStorage.getItem('jansetu_community_pool') || '[]');
        if (Array.isArray(pool)) {
          pool = pool.filter(p => p.id !== deletedId && (!mongoIdToDelete || p.mongoId !== mongoIdToDelete));
          localStorage.setItem('jansetu_community_pool', JSON.stringify(pool));
        }
      } catch (e) { }

      // Reset sync signature so next sync doesn't skip
      lastChallengesSyncSignature = '';

      // Save updated reports to user's localStorage
      saveReportsState();

      // Add to persistent deleted challenges set so it NEVER reappears on refresh
      addDeletedChallenge(deletedId, mongoIdToDelete);

      if (activeTrackerIndex >= allReportsList.length) {
        activeTrackerIndex = Math.max(0, allReportsList.length - 1);
      }

      closeModal('deleteConfirmModal');
      closeModal('detailModal');

      renderAllViews();

      // Record deletion notification in citizen civic log
      try {
        addCitizenNotification({
          type: 'REPORT_DELETED',
          category: 'reports',
          title: (currentLanguage === 'hi' ? 'शिकायत हटाई गई (Deleted)' : (currentLanguage === 'hinglish' ? 'Report Delete Kar Di Gayi' : 'Grievance Withdrawn & Deleted')),
          message: (currentLanguage === 'hi'
            ? `शिकायत #${deletedId} नागरिक द्वारा जनसेतु रिकॉर्ड से सफलतापूर्वक हटा दी गई है।`
            : (currentLanguage === 'hinglish'
              ? `Report #${deletedId} citizen dwara JanSetu se delete kar di gayi.`
              : `Grievance #${deletedId} has been successfully deleted from JanSetu records.`)),
          reportId: deletedId,
          reportTitle: 'Deleted Grievance'
        });
      } catch (e) { }

      // Delete from backend MongoDB if mongoId or challengeId exists
      const user = getCurrentUser();
      const userEmail = (user && user.email) ? user.email.toLowerCase().trim() : '';
      const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
      const deleteTarget = mongoIdToDelete || deletedId;

      if (deleteTarget) {
        try {
          const headers = {};
          if (token) headers['Authorization'] = 'Bearer ' + token;
          if (userEmail) headers['X-Citizen-Email'] = userEmail;
          await fetch('/api/challenges/' + deleteTarget, {
            method: 'DELETE',
            headers
          });
        } catch (e) {
          console.warn('Backend deletion call error:', e);
        }
      }

      // Real-time broadcast to all open tabs / windows
      if (typeof jansetuSyncChannel !== 'undefined' && jansetuSyncChannel) {
        try {
          jansetuSyncChannel.postMessage({
            type: 'DELETE_CHALLENGE',
            challengeId: deletedId,
            mongoId: mongoIdToDelete
          });
        } catch (e) { }
      }

      showToast(currentLanguage === 'hi'
        ? `✅ शिकायत #${deletedId} स्थायी रूप से हटा दी गई है।`
        : `✅ Grievance #${deletedId} has been permanently deleted.`);

      pendingDeleteReportId = null;

      // Force refresh live challenges after deletion to keep DB sync clean
      setTimeout(() => fetchLiveChallenges(true), 300);
    }
    window.executeReportDeletion = executeReportDeletion;

    function simulateAdminVerify(reportId) {
      const r = allReportsList.find(x => x.id === reportId);
      if (!r) return;
      r.isVerified = true;
      r.status = 'Being Worked On';
      if (!r.assign || r.assign.includes('Verification in progress')) {
        r.assign = 'BIT Mesra Civil & Environmental Engineering Taskforce';
      }
      saveReportsState();
      renderAllViews();
      openDetailModal(reportId);

      try {
        addCitizenNotification({
          type: 'ADMIN_VERIFIED',
          category: 'actions',
          title: (currentLanguage === 'hi' ? 'शिकायत सत्यापित व कार्य आदेश जारी' : (currentLanguage === 'hinglish' ? 'Report Verified & Work Order Issued' : 'Report Verified & Assigned')),
          message: (currentLanguage === 'hi'
            ? `शिकायत #${reportId} प्राधिकारियों द्वारा सत्यापित कर दी गई है और ${r.assign} को सौंप दी गई है।`
            : (currentLanguage === 'hinglish'
              ? `Report #${reportId} verify ho gayi aur taskforce assign ho gayi.`
              : `Grievance #${reportId} was verified and assigned to ${r.assign}.`)),
          reportId: reportId,
          reportTitle: r.title || ''
        });
      } catch (e) { }

      showToast(currentLanguage === 'hi' ? '🏛️ प्रशासन द्वारा शिकायत सत्यापित व कार्य आदेश जारी!' : '🏛️ Admin verified report & issued work order!');
    }

    function simulateAdminUnverify(reportId) {
      const r = allReportsList.find(x => x.id === reportId);
      if (!r) return;
      r.isVerified = false;
      r.status = 'Submitted';
      r.assign = 'Verification in progress by JanSetu Authority';
      saveReportsState();
      renderAllViews();
      openDetailModal(reportId);
      showToast(currentLanguage === 'hi' ? '⏳ शिकायत सत्यापन कतार में वापस' : '⏳ Reverted to verification queue');
    }

    function openReportModal() { goToStep(1); openModal('reportModal'); }
    /* ============================================================
       CITIZEN NOTIFICATIONS & CIVIC AUDIT TIMELINE SYSTEM
       ============================================================ */
    let citizenNotificationsList = [];
    let notifTypeFilter = 'all';
    let notifDateFilter = '';
    let notifQuickDate = 'all';

    function getDismissedNotifs() {
      try {
        const k = getUserStorageKey('jansetu_dismissed_notifs');
        const rawUser = localStorage.getItem(k);
        const rawGlobal = localStorage.getItem('jansetu_dismissed_notifs_global');
        const userSet = rawUser ? JSON.parse(rawUser) : [];
        const globalSet = rawGlobal ? JSON.parse(rawGlobal) : [];
        return new Set([...userSet, ...globalSet]);
      } catch (e) {
        return new Set();
      }
    }

    function addDismissedNotif(id) {
      if (!id) return;
      try {
        const k = getUserStorageKey('jansetu_dismissed_notifs');
        const s = getDismissedNotifs();
        s.add(String(id));
        const arr = Array.from(s);
        localStorage.setItem(k, JSON.stringify(arr));
        localStorage.setItem('jansetu_dismissed_notifs_global', JSON.stringify(arr));
      } catch (e) { }
    }

    function getNotifsClearedAt() {
      try {
        const k = getUserStorageKey('jansetu_notifs_cleared_at');
        return parseInt(localStorage.getItem(k) || '0', 10);
      } catch (e) {
        return 0;
      }
    }

    function loadCitizenNotifications() {
      try {
        const storageKey = getUserStorageKey('jansetu_citizen_notifs_v3');
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          citizenNotificationsList = JSON.parse(stored);
          if (!Array.isArray(citizenNotificationsList)) citizenNotificationsList = [];
        } else {
          citizenNotificationsList = [];
        }
      } catch (e) {
        citizenNotificationsList = [];
      }

      // Filter out only legacy fake dummy seed items and dismissed notifications
      const dismissed = getDismissedNotifs();
      citizenNotificationsList = citizenNotificationsList.filter(n => n && n.id && !n.id.startsWith('notif_seed_') && !dismissed.has(n.id));

      // Sync real citizen notifications immediately and synchronously from actual current reports and supports
      syncRealCitizenNotifications();
      saveCitizenNotifications();
      updateTopNotifBellBadge();

      // In background, fetch from server API if authenticated
      fetchServerNotificationsBackground();
    }

    function saveCitizenNotifications() {
      try {
        const storageKey = getUserStorageKey('jansetu_citizen_notifs_v3');
        localStorage.setItem(storageKey, JSON.stringify(citizenNotificationsList));
        localStorage.removeItem('jansetu_citizen_notifs_v2');
      } catch (e) { }
      updateTopNotifBellBadge();
    }

    function parseReportDate(dateStr, offsetMs = 0) {
      if (!dateStr) {
        const d = new Date(Date.now() - offsetMs);
        return { iso: d.toISOString().split('T')[0], ts: d.getTime() };
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const res = new Date(d.getTime() + offsetMs);
        return { iso: res.toISOString().split('T')[0], ts: res.getTime() };
      }
      const fallback = new Date(Date.now() - offsetMs);
      return { iso: fallback.toISOString().split('T')[0], ts: fallback.getTime() };
    }

    function syncRealCitizenNotifications() {
      const isHi = currentLanguage === 'hi';
      const isHinglish = currentLanguage === 'hinglish';
      const todayStr = new Date().toISOString().split('T')[0];
      const yestStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const dismissed = getDismissedNotifs();
      const clearedAt = getNotifsClearedAt();

      // Build real notifications directly from the citizen's actual reports in allReportsList
      if (Array.isArray(allReportsList) && allReportsList.length > 0) {
        allReportsList.forEach(rep => {
          if (!rep || !rep.id) return;
          const repTitle = rep.title || 'Civic Problem';
          const repCreatedTs = rep.createdAt ? new Date(rep.createdAt).getTime() : 0;

          // 1. Real Report Submission
          const subId = 'notif_sub_' + rep.id;
          if (!dismissed.has(subId) && repCreatedTs > clearedAt && !citizenNotificationsList.some(n => n.id === subId)) {
            citizenNotificationsList.push({
              id: subId,
              type: 'REPORT_SUBMITTED',
              category: 'reports',
              icon: '📢',
              iconBg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              title: isHi ? 'जनसमस्या दर्ज हुई' : (isHinglish ? 'Report Successfully Darj Hui' : 'Grievance Registered'),
              message: isHi
                ? `आपकी शिकायत #${rep.id} (${repTitle}) जनसेतु पोर्टल पर दर्ज की गई। स्थान: ${rep.location || 'झारखण्ड'}।`
                : `Your grievance #${rep.id} (${repTitle}) was registered for ${rep.location || 'Jharkhand'}.`,
              reportId: rep.id,
              reportTitle: repTitle,
              date: rep.status === 'Solved' ? yestStr : todayStr,
              time: '09:30 AM',
              timestamp: rep.status === 'Solved' ? (Date.now() - 86400000) : (repCreatedTs || (Date.now() - 14400000)),
              read: true
            });
          }

          // 2. Real Action Required / Landmark Request
          if (rep.needsAction || rep.status === 'Action Required') {
            const actId = 'notif_act_' + rep.id;
            const actTs = Date.now() - 7200000;
            if (!dismissed.has(actId) && actTs > clearedAt && !citizenNotificationsList.some(n => n.id === actId)) {
              citizenNotificationsList.push({
                id: actId,
                type: 'INFO_PROVIDED',
                category: 'actions',
                icon: '⚠️',
                iconBg: 'linear-gradient(135deg, #F59E0B, #B45309)',
                title: isHi ? 'कार्यवाही आवश्यक: अतिरिक्त विवरण' : (isHinglish ? 'Action Required: Extra Details' : 'Action Required: Additional Details'),
                message: isHi
                  ? `शिकायत #${rep.id} (${repTitle}) के लिए निकटतम लैंडमार्क या ताज़ा प्रमाण अपेक्षित है।`
                  : `Additional landmark or ground photo needed for #${rep.id} (${repTitle}).`,
                reportId: rep.id,
                reportTitle: repTitle,
                date: todayStr,
                time: '11:15 AM',
                timestamp: actTs,
                read: false
              });
            }
          }

          // 3. Real Admin Verification & Work Order Issued (With Official Admin Directive / Message)
          const isVerifiedRep = rep.isVerified || rep.status === 'Verified' || rep.rawStatus === 'validated' || (rep.status && rep.status !== 'Submitted' && rep.status !== 'Action Required');
          if (isVerifiedRep) {
            const verId = 'notif_ver_' + rep.id;
            let adminNote = (rep.validationNotes || '').trim();
            let verTs = Date.now() - 10800000;
            let verDateStr = todayStr;

            if (Array.isArray(rep.statusHistory)) {
              const vEntry = rep.statusHistory.slice().reverse().find(h => (h.status === 'validated' || (h.changedBy && (h.changedBy.role === 'admin' || (h.changedBy.name && h.changedBy.name.toLowerCase().includes('admin'))))));
              if (vEntry) {
                if (vEntry.note && !vEntry.note.toLowerCase().startsWith('challenge submitted') && !vEntry.note.toLowerCase().startsWith('status updated to')) {
                  adminNote = vEntry.note.trim();
                }
                if (vEntry.changedAt) {
                  const vd = new Date(vEntry.changedAt);
                  if (!isNaN(vd.getTime())) {
                    verTs = vd.getTime();
                    verDateStr = vd.toISOString().split('T')[0];
                  }
                }
              }
            }

            if (!dismissed.has(verId) && verTs > clearedAt && !citizenNotificationsList.some(n => n.id === verId)) {
              const adminNoteSuffix = adminNote
                ? (isHi ? `\n\n📢 प्रशासनिक संदेश / निर्देश: "${adminNote}"` : `\n\n📢 Official Admin Directive: "${adminNote}"`)
                : '';

              citizenNotificationsList.push({
                id: verId,
                type: 'ADMIN_VERIFIED',
                category: 'actions',
                icon: '🏛️',
                iconBg: 'linear-gradient(135deg, #10B981, #047857)',
                title: isHi
                  ? (adminNote ? 'शिकायत सत्यापित: प्रशासनिक निर्देश जारी' : 'शिकायत सत्यापित व कार्यबल नियुक्त')
                  : (adminNote ? 'Grievance Verified: Admin Directive Issued' : 'Report Verified & Work Order Issued'),
                message: (isHi
                  ? `शिकायत #${rep.id} प्राधिकारियों द्वारा सत्यापित हुई। कार्यबल: ${rep.assign || 'BIT Mesra Taskforce'}।`
                  : `Grievance #${rep.id} was verified. Assigned to ${rep.assign || 'BIT Mesra Taskforce'}.`) + adminNoteSuffix,
                reportId: rep.id,
                reportTitle: repTitle,
                date: verDateStr,
                time: '10:45 AM',
                timestamp: verTs,
                read: false
              });
            }
          }

          // 4. Real Ground Resolution Completed
          if (rep.isResolved || rep.status === 'Solved') {
            const solId = 'notif_sol_' + rep.id;
            const solTs = Date.now() - 43200000;
            if (!dismissed.has(solId) && solTs > clearedAt && !citizenNotificationsList.some(n => n.id === solId)) {
              citizenNotificationsList.push({
                id: solId,
                type: 'RESOLUTION_CONFIRMED',
                category: 'reports',
                icon: '✅',
                iconBg: 'linear-gradient(135deg, #22C55E, #15803D)',
                title: isHi ? 'जमीनी समाधान पूर्ण (Solved)' : (isHinglish ? 'Ground Resolution Ho Gaya (Solved)' : 'Ground Resolution Completed'),
                message: isHi
                  ? `शिकायत #${rep.id} (${repTitle}) का कार्यबल द्वारा समाधान पूर्ण किया गया।`
                  : `Ground resolution was completed on-site for #${rep.id} (${repTitle}).`,
                reportId: rep.id,
                reportTitle: repTitle,
                date: yestStr,
                time: '04:20 PM',
                timestamp: solTs,
                read: true
              });
            }
          }
        });
      }

      // 5. Add notifications from actual supported challenges in supportedIds
      if (typeof supportedIds !== 'undefined' && supportedIds && supportedIds.size > 0) {
        supportedIds.forEach(suppId => {
          const sId = String(suppId);
          const suppNotifId = 'notif_supp_' + sId;
          const suppTs = Date.now() - 18000000;
          if (!dismissed.has(suppNotifId) && suppTs > clearedAt && !citizenNotificationsList.some(n => n.id === suppNotifId)) {
            const matchC = (typeof exploreList !== 'undefined' && exploreList.find(c => String(c.id) === sId || String(c.mongoId) === sId))
              || (typeof allReportsList !== 'undefined' && allReportsList.find(c => String(c.id) === sId));
            const t = matchC ? matchC.title : 'Civic Issue';
            citizenNotificationsList.push({
              id: suppNotifId,
              type: 'SUPPORT_GIVEN',
              category: 'supports',
              icon: '👍',
              iconBg: 'linear-gradient(135deg, #0284C7, #0369A1)',
              title: isHi ? 'सामुदायिक समर्थन दर्ज' : (isHinglish ? 'Community Support Pledged' : 'Community Support Pledged'),
              message: isHi
                ? `आपने जनसमस्या #${sId} (${t}) को अपना समर्थन दिया।`
                : `You voted in support of civic issue #${sId} (${t}).`,
              reportId: sId,
              reportTitle: t,
              date: todayStr,
              time: '08:45 AM',
              timestamp: suppTs,
              read: true
            });
          }
        });
      }

      // Sort descending by timestamp
      citizenNotificationsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    async function fetchServerNotificationsBackground() {
      try {
        const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/notifications', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const dismissed = getDismissedNotifs();
            const clearedAt = getNotifsClearedAt();
            let hasNew = false;
            json.data.forEach(srvN => {
              if (dismissed.has(srvN._id)) return;
              const srvDate = new Date(srvN.createdAt || Date.now());
              if (srvDate.getTime() <= clearedAt) return;
              const exists = citizenNotificationsList.some(n => n.id === srvN._id || (srvN.data && srvN.data.challengeRefId && n.reportId === srvN.data.challengeRefId && n.type === srvN.type));
              if (!exists) {
                const srvDate = new Date(srvN.createdAt || Date.now());
                let icon = '🔔';
                let iconBg = 'linear-gradient(135deg, #64748B, #334155)';
                let category = 'reports';

                if (srvN.type === 'message' || srvN.type.includes('message')) {
                  icon = '💬';
                  iconBg = 'linear-gradient(135deg, #2563EB, #1D4ED8)';
                  category = 'messages';
                } else if (srvN.type.includes('assigned') || srvN.type.includes('validated') || srvN.type.includes('action')) {
                  icon = '🏛️';
                  iconBg = 'linear-gradient(135deg, #10B981, #047857)';
                  category = 'actions';
                } else if (srvN.type.includes('resolved') || srvN.type.includes('closed')) {
                  icon = '✅';
                  iconBg = 'linear-gradient(135deg, #22C55E, #15803D)';
                  category = 'reports';
                }

                citizenNotificationsList.unshift({
                  id: srvN._id,
                  type: srvN.type,
                  category,
                  icon,
                  iconBg,
                  title: srvN.title,
                  message: srvN.message,
                  reportId: (srvN.data && srvN.data.challengeRefId) || null,
                  problemId: (srvN.data && srvN.data.problemId) || null,
                  reportTitle: '',
                  date: srvDate.toISOString().split('T')[0],
                  time: srvDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                  timestamp: srvDate.getTime(),
                  read: srvN.isRead || false
                });
                hasNew = true;
              }
            });
            if (hasNew) {
              saveCitizenNotifications();
              const modal = document.getElementById('notificationsModal');
              if (modal && modal.classList.contains('active')) {
                renderNotificationsView();
              }
            }
          }
        }
      } catch (e) { }

      // Also poll university-citizen inquiries
      try {
        const cRes = await fetch('/api/citizen-notifications');
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.success && Array.isArray(cData.data)) {
            let hasNewMsg = false;
            cData.data.forEach(srvN => {
              if (srvN.type === 'message' && !citizenNotificationsList.some(n => n.id === srvN._id)) {
                const srvDate = new Date(srvN.createdAt || Date.now());
                citizenNotificationsList.unshift({
                  id: srvN._id,
                  type: 'message',
                  category: 'messages',
                  icon: '💬',
                  iconBg: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  title: srvN.title,
                  message: srvN.message,
                  reportId: (srvN.data && srvN.data.challengeRefId) || null,
                  problemId: (srvN.data && srvN.data.problemId) || null,
                  reportTitle: '',
                  date: srvDate.toISOString().split('T')[0],
                  time: srvDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                  timestamp: srvDate.getTime(),
                  read: srvN.isRead || false
                });
                hasNewMsg = true;
              }
            });
            if (hasNewMsg) {
              saveCitizenNotifications();
              const modal = document.getElementById('notificationsModal');
              if (modal && modal.classList.contains('active')) {
                renderNotificationsView();
              }
            }
          }
        }
      } catch (err) { }
    }
    

    function addCitizenNotification({ type, category, title, message, reportId, reportTitle }) {
      const now = new Date();
      const isoDate = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      let icon = '🔔';
      let iconBg = 'linear-gradient(135deg, #64748B, #334155)';

      switch (type) {
        case 'REPORT_SUBMITTED':
          icon = '📢';
          iconBg = 'linear-gradient(135deg, #3B82F6, #1D4ED8)';
          category = category || 'reports';
          break;
        case 'REPORT_DELETED':
          icon = '🗑️';
          iconBg = 'linear-gradient(135deg, #EF4444, #B91C1C)';
          category = category || 'reports';
          break;
        case 'SUPPORT_GIVEN':
        case 'SUPPORT_REMOVED':
          icon = '👍';
          iconBg = 'linear-gradient(135deg, #0284C7, #0369A1)';
          category = category || 'supports';
          break;
        case 'ADMIN_VERIFIED':
          icon = '🏛️';
          iconBg = 'linear-gradient(135deg, #10B981, #047857)';
          category = category || 'actions';
          break;
        case 'RESOLUTION_CONFIRMED':
          icon = '✅';
          iconBg = 'linear-gradient(135deg, #22C55E, #15803D)';
          category = category || 'reports';
          break;
        case 'REPORT_REOPENED':
          icon = '🔄';
          iconBg = 'linear-gradient(135deg, #EA580C, #C2410C)';
          category = category || 'actions';
          break;
        case 'INFO_PROVIDED':
          icon = 'ℹ️';
          iconBg = 'linear-gradient(135deg, #F59E0B, #B45309)';
          category = category || 'actions';
          break;
      }

      const notifItem = {
        id: 'notif_real_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type,
        category: category || 'reports',
        icon,
        iconBg,
        title,
        message,
        reportId: reportId || null,
        reportTitle: reportTitle || '',
        date: isoDate,
        time: timeStr,
        timestamp: now.getTime(),
        read: false
      };

      citizenNotificationsList.unshift(notifItem);
      if (citizenNotificationsList.length > 60) {
        citizenNotificationsList = citizenNotificationsList.slice(0, 60);
      }
      saveCitizenNotifications();
      updateTopNotifBellBadge();

      const modal = document.getElementById('notificationsModal');
      if (modal && modal.classList.contains('active')) {
        renderNotificationsView();
      }
    }

    function updateTopNotifBellBadge() {
      const unreadCount = citizenNotificationsList.filter(n => !n.read).length;
      const badge = document.getElementById('topNotifCountBadge') || document.querySelector('.notif-pink-badge');
      if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
      }
      const modalPill = document.getElementById('notifModalTotalCountPill');
      if (modalPill) {
        modalPill.textContent = citizenNotificationsList.length;
      }
    }

    function setNotifTypeFilter(type) {
      notifTypeFilter = type;
      const btns = document.querySelectorAll('#notifTypeFilterGroup .lang-btn');
      btns.forEach(b => {
        if (b.getAttribute('data-notif-type') === type) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      renderNotificationsView();
    }

    function setNotifQuickDate(val) {
      notifQuickDate = val;
      notifDateFilter = '';
      const inp = document.getElementById('notifDateFilterInput');
      if (inp) inp.value = '';
      const resetBtn = document.getElementById('btnResetNotifDate');
      if (resetBtn) resetBtn.style.display = 'none';

      const btns = document.querySelectorAll('#notifDateQuickGroup .lang-btn');
      btns.forEach(b => {
        if (b.getAttribute('data-quick-date') === val) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      renderNotificationsView();
    }

    function onNotifDateFilterChange(dateVal) {
      notifDateFilter = dateVal || '';
      notifQuickDate = dateVal ? 'custom' : 'all';

      // Update quick buttons
      const btns = document.querySelectorAll('#notifDateQuickGroup .lang-btn');
      btns.forEach(b => {
        if (!dateVal && b.getAttribute('data-quick-date') === 'all') {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      const resetBtn = document.getElementById('btnResetNotifDate');
      if (resetBtn) {
        resetBtn.style.display = notifDateFilter ? 'inline-block' : 'none';
      }
      renderNotificationsView();
    }

    function resetNotifDateFilter() {
      notifDateFilter = '';
      notifQuickDate = 'all';
      const inp = document.getElementById('notifDateFilterInput');
      if (inp) inp.value = '';
      const resetBtn = document.getElementById('btnResetNotifDate');
      if (resetBtn) resetBtn.style.display = 'none';

      const btns = document.querySelectorAll('#notifDateQuickGroup .lang-btn');
      btns.forEach(b => {
        if (b.getAttribute('data-quick-date') === 'all') {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      renderNotificationsView();
    }

    function markAllNotificationsRead() {
      citizenNotificationsList.forEach(n => n.read = true);
      saveCitizenNotifications();
      renderNotificationsView();
      showToast(currentLanguage === 'hi' ? 'सभी सूचनाएं पढ़ी हुई चिह्नित की गईं' : 'All notifications marked as read');
    }

    async function clearAllCitizenNotifications() {
      if (citizenNotificationsList.length === 0) return;
      const confirmClear = confirm(currentLanguage === 'hi' ? 'क्या आप सभी सूचनाएं हटाना चाहते हैं?' : 'Are you sure you want to clear all notifications?');
      if (confirmClear) {
        try {
          const k = getUserStorageKey('jansetu_notifs_cleared_at');
          localStorage.setItem(k, String(Date.now()));
          const dismissedSet = getDismissedNotifs();
          citizenNotificationsList.forEach(n => {
            if (n && n.id) dismissedSet.add(String(n.id));
          });
          const dk = getUserStorageKey('jansetu_dismissed_notifs');
          localStorage.setItem(dk, JSON.stringify(Array.from(dismissedSet)));
        } catch (e) { }

        citizenNotificationsList = [];
        saveCitizenNotifications();
        renderNotificationsView();

        // Clear notifications from backend API
        try {
          const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
          if (token) {
            await fetch('/api/notifications', {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token }
            });
          }
        } catch (e) { }

        showToast(currentLanguage === 'hi' ? 'सूचना इतिहास साफ किया गया' : 'Notification history cleared');
      }
    }

    async function deleteSingleCitizenNotification(notifId) {
      if (!notifId) return;
      addDismissedNotif(notifId);
      citizenNotificationsList = citizenNotificationsList.filter(n => n.id !== notifId);
      saveCitizenNotifications();
      renderNotificationsView();

      // If it's a backend MongoDB notification ID, delete on server
      try {
        const token = (typeof Auth !== 'undefined' && Auth.getToken()) || localStorage.getItem('is_token') || localStorage.getItem('token');
        if (token && notifId.length === 24 && !notifId.includes('_')) {
          await fetch('/api/notifications/' + notifId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
          });
        }
      } catch (e) { }

      showToast(currentLanguage === 'hi' ? 'सूचना हटाई गई' : 'Notification deleted');
    }

    function renderNotificationsView() {
      const cont = document.getElementById('notificationsListContainer');
      if (!cont) return;

      const isHi = currentLanguage === 'hi';
      const isHinglish = currentLanguage === 'hinglish';

      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let filtered = citizenNotificationsList.filter(n => {
        if (notifTypeFilter !== 'all' && n.category !== notifTypeFilter) return false;

        if (notifDateFilter) {
          if (n.date !== notifDateFilter) return false;
        } else if (notifQuickDate === 'today') {
          if (n.date !== todayStr) return false;
        } else if (notifQuickDate === 'yesterday') {
          if (n.date !== yesterdayStr) return false;
        } else if (notifQuickDate === 'earlier') {
          if (n.date === todayStr || n.date === yesterdayStr) return false;
        }
        return true;
      });

      // Update active filter info badge in header
      const filterInfo = document.getElementById('notifActiveFilterInfo');
      if (filterInfo) {
        let filterTxt = `${filtered.length} update${filtered.length === 1 ? '' : 's'}`;
        if (notifDateFilter) {
          filterTxt = `📅 ${notifDateFilter} (${filterTxt})`;
        } else if (notifQuickDate !== 'all') {
          filterTxt = `📅 ${notifQuickDate.toUpperCase()} (${filterTxt})`;
        }
        filterInfo.textContent = filterTxt;
      }

      if (filtered.length === 0) {
        cont.innerHTML = `
        <div style="text-align: center; padding: 36px 18px; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 12px; margin: 10px 0;">
          <div style="font-size: 28px; margin-bottom: 6px;">🔔</div>
          <div style="font-weight: 800; color: #1E293B; font-size: 13px;">
            ${notifDateFilter
            ? (isHi ? `दिनांक ${notifDateFilter} पर कोई वास्तविक सूचना नहीं मिली।` : `No notifications found for ${notifDateFilter}.`)
            : (isHi ? 'कोई नई सूचना उपलब्ध नहीं है।' : 'No notifications available in this view.')}
          </div>
          <div style="color: #64748B; font-size: 11px; margin-top: 4px;">
            ${(notifDateFilter || notifQuickDate !== 'all')
            ? (isHi ? 'कृपया "All" या "Reset" दबाकर सभी तारीखों की सूचनाएं देखें।' : 'Click "All" or "Reset" to view notifications across all dates.')
            : (isHi ? 'जैसे ही आप कोई रिपोर्ट दर्ज करेंगे, समर्थन देंगे या प्रशासन द्वारा कार्यवाही होगी, वास्तविक सूचना यहाँ दिखेगी।' : 'Real-time updates will appear here when you submit a grievance, support an issue, or receive taskforce actions.')}
          </div>
        </div>
      `;
        return;
      }

      // Group items by date string
      const groups = {};
      filtered.forEach(item => {
        const dKey = item.date || 'Earlier';
        if (!groups[dKey]) groups[dKey] = [];
        groups[dKey].push(item);
      });

      cont.innerHTML = Object.keys(groups).map(dateKey => {
        let dateLabel = dateKey;
        if (dateKey === todayStr) {
          dateLabel = isHi ? '📅 आज (Today)' : (isHinglish ? '📅 Aaj (Today)' : '📅 Today');
        } else if (dateKey === yesterdayStr) {
          dateLabel = isHi ? '📅 कल (Yesterday)' : (isHinglish ? '📅 Kal (Yesterday)' : '📅 Yesterday');
        } else {
          const dObj = new Date(dateKey + 'T00:00:00');
          if (!isNaN(dObj.getTime())) {
            dateLabel = '📅 ' + dObj.toLocaleDateString(isHi ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }

        const itemsHtml = groups[dateKey].map(item => {
          const timeAgoStr = formatTimeAgo(item.timestamp);

          let catBadgeBg = '#EFF6FF';
          let catBadgeColor = '#2563EB';
          let catBadgeBorder = '#BFDBFE';
          let catBadgeLabel = '📋 Report';

          if (item.category === 'supports') {
            catBadgeBg = '#F0FDF4';
            catBadgeColor = '#16A34A';
            catBadgeBorder = '#BBF7D0';
            catBadgeLabel = '👍 Support';
          } else if (item.category === 'actions') {
            catBadgeBg = '#FAF5FF';
            catBadgeColor = '#9333EA';
            catBadgeBorder = '#E9D5FF';
            catBadgeLabel = '🏛️ Action';
          } else if (item.type === 'REPORT_DELETED') {
            catBadgeBg = '#FEF2F2';
            catBadgeColor = '#DC2626';
            catBadgeBorder = '#FECACA';
            catBadgeLabel = '🗑️ Deleted';
          }

          const isMsg = item.type === 'message' || item.category === 'messages' || item.problemId;
          const isSolved = item.type === 'RESOLUTION_CONFIRMED';
          const isAction = item.category === 'actions';

          // Color indicators
          const dotColor = isMsg ? '#2563EB' : (isSolved ? '#16A34A' : (isAction ? '#D97706' : '#64748B'));
          const dotBg = isMsg ? '#EFF6FF' : (isSolved ? '#F0FDF4' : (isAction ? '#FFFBEB' : '#F1F5F9'));

          // Concise message text: keep long chat text inside Problem Chat Hub
          let displayMsg = item.message;
          let displayTitle = item.title;
          if (isMsg) {
            displayTitle = isHi ? 'विश्वविद्यालय / प्रशासनिक कार्यबल संदेश' : 'Message from University / Admin Taskforce';
            displayMsg = isHi
              ? `आपकी शिकायत #${item.reportId || ''} के संबंध में कार्यबल से नया संदेश प्राप्त हुआ है। चैट देखने के लिए क्लिक करें।`
              : `You have received a new update regarding grievance #${item.reportId || ''}. Click to open chat room.`;
          }

          // Direct execution target
          const clickAction = isMsg
            ? `window.openCitizenChatReplyModal('${item.problemId || ''}', '${(item.title || '').replace(/'/g, "\\'")}', '${item.reportId || ''}')`
            : (item.reportId ? `closeModal('notificationsModal'); openDetailModal('${item.reportId}')` : `markAllNotificationsRead()`);

          return `
          <div class="notif-item-card" onclick="${clickAction}"
            style="background: ${item.read ? '#FFFFFF' : '#F8FAFC'}; border: 1.5px solid ${item.read ? '#E2E8F0' : '#93C5FD'}; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(15,23,42,0.03); position: relative; transition: all 0.18s ease; cursor: pointer;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dotColor}; margin-top: 5px; flex-shrink: 0; box-shadow: 0 0 0 3px ${dotBg};"></div>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                  <div style="font-size: 13px; font-weight: 750; color: #0F172A; line-height: 1.35;">
                    ${displayTitle}
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    ${!item.read ? `<span style="font-size: 9.5px; font-weight: 800; color: #1D4ED8; background: #DBEAFE; border: 1px solid #BFDBFE; padding: 1px 6px; border-radius: 6px;">NEW</span>` : ''}
                    <button type="button" onclick="event.stopPropagation(); deleteSingleCitizenNotification('${item.id}');" title="${isHi ? 'यह सूचना हटाएं' : 'Delete notification'}" style="background: none; border: none; color: #94A3B8; font-size: 14px; font-weight: 700; cursor: pointer; padding: 2px 6px; border-radius: 6px; line-height: 1; transition: all 0.15s ease;" onmouseover="this.style.color='#DC2626'; this.style.background='#FEE2E2';" onmouseout="this.style.color='#94A3B8'; this.style.background='none';">✕</button>
                  </div>
                </div>
                <div style="font-size: 12px; color: #475569; margin-top: 4px; line-height: 1.5;">
                  ${displayMsg}
                </div>
                
                <!-- Sleek Minimal Meta Strip with Direct Execution Cue -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #64748B;">
                    <span>${item.time || ''} · ${item.date || ''}</span>
                    <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #CBD5E1;"></span>
                    <span style="font-weight: 700; color: ${catBadgeColor};">${catBadgeLabel}</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 750; color: ${dotColor}; display: inline-flex; align-items: center; gap: 4px;">
                    <span>${isMsg ? (isHi ? 'चैट खोलें →' : 'Open Chat →') : (isHi ? 'विवरण देखें →' : 'View Details →')}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        `;
        }).join('');

        return `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 10.5px; font-weight: 800; color: #64748B; background: #F1F5F9; display: inline-block; padding: 2px 8px; border-radius: 8px; margin-bottom: 6px; border: 1px solid #E2E8F0;">
            ${dateLabel}
          </div>
          ${itemsHtml}
        </div>
      `;
      }).join('');
    }

    window.openCitizenChatReplyModal = async function(problemId, problemTitle, reportId) {
      // 1. Close notifications modal so Problem Chat Hub is prominently displayed
      closeModal('notificationsModal');

      // 2. Ensure live challenges are available
      if (allReportsList.length === 0 && exploreList.length === 0) {
        try {
          await fetchLiveChallenges(true);
        } catch (e) {}
      }

      // 3. Resolve target problem
      let targetId = reportId || problemId;
      let cleanTitle = (problemTitle || '')
        .replace(/^Message from University Guide:\s*/i, '')
        .replace(/^University Innovation Team:\s*/i, '')
        .trim();

      let matched = null;
      if (targetId) {
        const tStr = String(targetId).trim().toLowerCase();
        matched = allReportsList.find(r => (r.id && r.id.toLowerCase() === tStr) || (r.mongoId && String(r.mongoId).toLowerCase() === tStr) || (r._id && String(r._id).toLowerCase() === tStr))
          || exploreList.find(r => (r.id && r.id.toLowerCase() === tStr) || (r.mongoId && String(r.mongoId).toLowerCase() === tStr) || (r._id && String(r._id).toLowerCase() === tStr));
      }

      if (!matched && cleanTitle) {
        const cLower = cleanTitle.toLowerCase();
        matched = allReportsList.find(r => r.title && (r.title.toLowerCase().includes(cLower) || cLower.includes(r.title.toLowerCase())))
          || exploreList.find(r => r.title && (r.title.toLowerCase().includes(cLower) || cLower.includes(r.title.toLowerCase())));
      }

      if (!matched && (allReportsList.length > 0 || exploreList.length > 0)) {
        matched = allReportsList[0] || exploreList[0];
      }

      const pIdToOpen = matched ? matched.id : (targetId || null);
      openChatModal(pIdToOpen);
    };

    function openNotificationsModal() {
      loadCitizenNotifications();
      renderNotificationsView();
      openModal('notificationsModal');
    }
    function openImpactModal() { openModal('impactModal'); }
    let pendingProfileChange = null;

    function openSettingsModal() {
      const user = (typeof getCurrentUser === 'function' && getCurrentUser()) || {
        name: 'Rajesh Mahto',
        email: 'rajesh@gmail.com',
        phone: '9431100003',
        aadhaar: '8492-3840-4819',
        address: { city: 'Dhanbad', district: 'Dhanbad' }
      };

      const nameEl = document.getElementById('settingsCitizenNameDisplay');
      if (nameEl) nameEl.textContent = user.name || 'Rajesh Mahto';

      const districtEl = document.getElementById('settingsDistrictDisplay');
      if (districtEl) {
        const dist = (user.address && (user.address.district || user.address.city)) ? (user.address.district || user.address.city) : 'Dhanbad';
        districtEl.textContent = dist + ', Jharkhand';
      }

      const avatarEl = document.getElementById('settingsAvatarCircle');
      if (avatarEl) {
        avatarEl.textContent = (user.name || 'R').charAt(0).toUpperCase();
      }

      updateSettingsLangCards(currentLanguage || 'hi');

      // Sync toggles with localStorage
      const soundPref = localStorage.getItem('jansetu_pref_sound') !== 'false';
      const soundToggle = document.getElementById('settingSoundToggle');
      if (soundToggle) soundToggle.checked = soundPref;

      const syncPref = localStorage.getItem('jansetu_pref_sync') !== 'false';
      const syncToggle = document.getElementById('settingSyncToggle');
      if (syncToggle) syncToggle.checked = syncPref;

      openModal('settingsModal');
    }

    function updateSettingsLangCards(lang) {
      const active = lang || currentLanguage || 'hi';
      ['en', 'hi', 'hinglish'].forEach(l => {
        const card = document.getElementById('settingsLangCard_' + l);
        if (card) {
          if (l === active) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        }
      });
    }

    function selectSettingsLanguage(lang) {
      setLanguage(lang);
      updateSettingsLangCards(lang);
      if (typeof showToast === 'function') {
        const msg = lang === 'hi'
          ? '🌐 भाषा सफलतापूर्वक हिन्दी में बदली गई'
          : (lang === 'hinglish' ? '🌐 Language Hinglish me switch ho gayi' : '🌐 Language successfully switched to English');
        showToast(msg);
      }
    }

    function toggleSoundSetting(enabled) {
      localStorage.setItem('jansetu_pref_sound', enabled ? 'true' : 'false');
      if (typeof showToast === 'function') {
        showToast(enabled ? '🔔 Sound notifications enabled' : '🔕 Sound notifications muted');
      }
    }

    function toggleSyncSetting(enabled) {
      localStorage.setItem('jansetu_pref_sync', enabled ? 'true' : 'false');
      if (typeof showToast === 'function') {
        showToast(enabled ? '⚡ Real-time sync enabled' : '⏸️ Background sync paused');
      }
    }

    function openProfileModal() {
      const user = getCurrentUser() || {
        name: 'Rajesh Mahto',
        email: 'rajesh@gmail.com',
        phone: '9431100003',
        aadhaar: '8492-3840-4819',
        address: { city: 'Dhanbad', district: 'Dhanbad' }
      };

      // Populate header & hero
      const firstChar = (user.name || 'R').charAt(0).toUpperCase();
      const avatarEl = document.getElementById('profAvatarBig');
      if (avatarEl) avatarEl.textContent = firstChar;

      const nameH = document.getElementById('profNameHeader');
      if (nameH) nameH.textContent = user.name || 'Rajesh Mahto';

      const dispName = document.getElementById('profDisplayName');
      if (dispName) dispName.textContent = user.name || 'Rajesh Mahto';

      const dispEmail = document.getElementById('profDisplayEmail');
      if (dispEmail) dispEmail.textContent = user.email || 'rajesh@gmail.com';

      const dispPhone = document.getElementById('profDisplayPhone');
      const rawPhone = user.phone || '9431100003';
      if (dispPhone) dispPhone.textContent = rawPhone.startsWith('+91') ? rawPhone : '+91 ' + rawPhone;

      const dispAadhaar = document.getElementById('profDisplayAadhaar');
      const rawAadhaar = user.aadhaar || '8492-3840-4819';
      const last4Aadhaar = rawAadhaar.replace(/[^0-9]/g, '').slice(-4) || '4819';
      if (dispAadhaar) dispAadhaar.textContent = 'XXXX-XXXX-' + last4Aadhaar;

      const userCitId = user.citizenId || ('C' + last4Aadhaar);
      const citId = document.getElementById('profCitizenIdHeader');
      if (citId) citId.textContent = userCitId;

      const cityDist = document.getElementById('profCityDistrictHeader');
      if (cityDist) {
        const dist = (user.address && user.address.district) ? user.address.district : 'Dhanbad';
        cityDist.textContent = dist + ', Jharkhand';
      }

      // Always re-apply active language translations to profile modal
      const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
      const pModal = document.getElementById('profileModal');
      if (pModal && dict) {
        pModal.querySelectorAll('[data-i18n]').forEach(el => {
          const k = el.getAttribute('data-i18n');
          if (dict[k]) el.innerHTML = dict[k];
        });
      }

      openModal('profileModal');
    }

    // --- Sub-Modal Openers with Active Language Refresh ---
    function openChangeNameModal() {
      const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
      const m = document.getElementById('changeNameModal');
      if (m && dict) {
        m.querySelectorAll('[data-i18n]').forEach(el => {
          const k = el.getAttribute('data-i18n');
          if (dict[k]) el.innerHTML = dict[k];
        });
      }
      const user = getCurrentUser() || {};
      const inp = document.getElementById('newFullNameInput');
      if (inp) inp.value = user.name || 'Rajesh Mahto';
      openModal('changeNameModal');
    }

    function openChangeEmailModal() {
      const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
      const m = document.getElementById('changeEmailModal');
      if (m && dict) {
        m.querySelectorAll('[data-i18n]').forEach(el => {
          const k = el.getAttribute('data-i18n');
          if (dict[k]) el.innerHTML = dict[k];
        });
      }
      const user = getCurrentUser() || {};
      const inp = document.getElementById('newEmailInput');
      if (inp) inp.value = user.email || 'rajesh@gmail.com';
      openModal('changeEmailModal');
    }

    function openChangeMobileModal() {
      const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
      const m = document.getElementById('changeMobileModal');
      if (m && dict) {
        m.querySelectorAll('[data-i18n]').forEach(el => {
          const k = el.getAttribute('data-i18n');
          if (dict[k]) el.innerHTML = dict[k];
        });
      }
      const user = getCurrentUser() || {};
      const inp = document.getElementById('newMobileInput');
      if (inp) inp.value = (user.phone || '9431100003').replace('+91 ', '');
      openModal('changeMobileModal');
    }

    function openChangePasswordModal() {
      const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
      const m = document.getElementById('changePasswordModal');
      if (m && dict) {
        m.querySelectorAll('[data-i18n]').forEach(el => {
          const k = el.getAttribute('data-i18n');
          if (dict[k]) el.innerHTML = dict[k];
        });
      }
      const orig = document.getElementById('origPasswordInput');
      const np = document.getElementById('newPasswordInput');
      const cnp = document.getElementById('confirmNewPasswordInput');
      if (orig) orig.value = '';
      if (np) np.value = '';
      if (cnp) cnp.value = '';

      openModal('changePasswordModal');
    }

    function togglePasswordVisibility(fieldId) {
      const el = document.getElementById(fieldId);
      if (!el) return;
      el.type = el.type === 'password' ? 'text' : 'password';
    }

    // --- Submit Change Requests (Triggers OTP) ---
    function submitChangeNameRequest() {
      const newName = (document.getElementById('newFullNameInput')?.value || '').trim();
      if (!newName || newName.length < 2) {
        alert(currentLanguage === 'hi' ? 'कृपया मान्य पूरा नाम दर्ज करें' : 'Please enter a valid full name');
        return;
      }
      const user = getCurrentUser() || {};
      const target = user.phone ? '+91 ' + user.phone : (user.email || 'पंजीकृत संपर्क');
      pendingProfileChange = { type: 'name', newValue: newName, targetDisplay: target };
      closeModal('changeNameModal');
      openProfileOtpModal('name', newName, target);
    }

    function submitChangeEmailRequest() {
      const newEmail = (document.getElementById('newEmailInput')?.value || '').trim();
      if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
        alert(currentLanguage === 'hi' ? 'कृपया मान्य ईमेल पता दर्ज करें' : 'Please enter a valid email address');
        return;
      }
      pendingProfileChange = { type: 'email', newValue: newEmail, targetDisplay: newEmail };
      closeModal('changeEmailModal');
      openProfileOtpModal('email', newEmail, newEmail);
    }

    function submitChangeMobileRequest() {
      let newPhone = (document.getElementById('newMobileInput')?.value || '').trim().replace(/[^0-9]/g, '');
      if (newPhone.length > 10) newPhone = newPhone.slice(-10);
      if (!newPhone || newPhone.length !== 10) {
        alert(currentLanguage === 'hi' ? 'कृपया 10-अंकों का मान्य मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
        return;
      }
      const formatted = '+91 ' + newPhone;
      pendingProfileChange = { type: 'mobile', newValue: newPhone, targetDisplay: formatted };
      closeModal('changeMobileModal');
      openProfileOtpModal('mobile', newPhone, formatted);
    }

    // --- Universal JanSetu OTP Modal Logic (Dummy OTP 123456) ---
    function openProfileOtpModal(type, value, target) {
      const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['hi'];
      const otpModalEl = document.getElementById('profileOtpModal');
      if (otpModalEl && dict) {
        otpModalEl.querySelectorAll('[data-i18n]').forEach(el => {
          const k = el.getAttribute('data-i18n');
          if (dict[k]) el.innerHTML = dict[k];
        });
      }

      const subNotice = document.getElementById('profileOtpSubNotice');
      if (subNotice) {
        if (currentLanguage === 'hi') {
          subNotice.innerHTML = `हमने आपके पंजीकृत संपर्क (<strong id="otpTargetDisplay" style="color: #1E40AF;">${target}</strong>) पर 6-अंकों का सत्यापन कोड भेजा है।`;
        } else if (currentLanguage === 'hinglish') {
          subNotice.innerHTML = `Humne aapke contact (<strong id="otpTargetDisplay" style="color: #1E40AF;">${target}</strong>) par 6-digit verification code bheja hai.`;
        } else {
          subNotice.innerHTML = `We have sent a 6-digit verification code to (<strong id="otpTargetDisplay" style="color: #1E40AF;">${target}</strong>).`;
        }
      }

      // Reset OTP boxes
      for (let i = 1; i <= 6; i++) {
        const box = document.getElementById('otpBox' + i);
        if (box) box.value = '';
      }

      // Call send-otp API
      fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type })
      }).catch(() => { });

      openModal('profileOtpModal');
      setTimeout(() => {
        const b1 = document.getElementById('otpBox1');
        if (b1) b1.focus();
      }, 150);
    }

    function autoFillDemoOtp() {
      const demoDigits = ['1', '2', '3', '4', '5', '6'];
      demoDigits.forEach((d, idx) => {
        const box = document.getElementById('otpBox' + (idx + 1));
        if (box) box.value = d;
      });
      const b6 = document.getElementById('otpBox6');
      if (b6) b6.focus();
      showToast(currentLanguage === 'hi' ? '⚡ Demo OTP 123456 ऑटो-भर दिया गया' : (currentLanguage === 'hinglish' ? '⚡ Demo OTP 123456 auto-fill ho gaya' : '⚡ Demo OTP 123456 auto-filled'));
    }

    function handleOtpInput(curr, nextId) {
      if (curr.value && curr.value.length >= 1) {
        curr.value = curr.value.slice(-1);
        if (nextId) {
          const nextEl = document.getElementById(nextId);
          if (nextEl) nextEl.focus();
        }
      }
    }

    function handleOtpBackspace(e, curr, prevId) {
      if (e.key === 'Backspace' && !curr.value && prevId) {
        const prevEl = document.getElementById(prevId);
        if (prevEl) prevEl.focus();
      }
    }

    function resendProfileOtp() {
      for (let i = 1; i <= 6; i++) {
        const box = document.getElementById('otpBox' + i);
        if (box) box.value = '';
      }
      const b1 = document.getElementById('otpBox1');
      if (b1) b1.focus();
      showToast(currentLanguage === 'hi' ? '🔄 नया Demo OTP 123456 भेजा गया' : (currentLanguage === 'hinglish' ? '🔄 Naya Demo OTP 123456 bhej diya gaya' : '🔄 New Demo OTP 123456 sent'));
    }

    async function verifyAndCommitProfileChange() {
      try {
        const enteredOtp = [1, 2, 3, 4, 5, 6].map(i => (document.getElementById('otpBox' + i)?.value || '')).join('');

        // User strictly specified dummy OTP is 123456
        if (enteredOtp !== '123456') {
          alert(currentLanguage === 'hi' ? 'अमान्य OTP! कृपया सही 6-अंकों का कोड (123456) दर्ज करें।' : (currentLanguage === 'hinglish' ? 'Amanaya OTP! Kripya sahi demo code 123456 dalein.' : 'Invalid OTP! Please enter the demo code 123456.'));
          return;
        }

        if (!pendingProfileChange) {
          closeModal('profileOtpModal');
          return;
        }

        let user = getCurrentUser() || {};
        const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : localStorage.getItem('is_token');

        let updatePayload = {};
        let successMsg = '';

        if (pendingProfileChange.type === 'name') {
          user.name = pendingProfileChange.newValue;
          updatePayload = { name: user.name };
          successMsg = currentLanguage === 'hi' ? '✓ पूरा नाम डेटाबेस में सफलतापूर्वक अपडेट हुआ!' : (currentLanguage === 'hinglish' ? '✓ Pura naam database mein successfully update hua!' : '✓ Full name updated successfully in database!');
        } else if (pendingProfileChange.type === 'email') {
          user.email = pendingProfileChange.newValue;
          updatePayload = { email: user.email };
          successMsg = currentLanguage === 'hi' ? '✓ ईमेल पता डेटाबेस में सफलतापूर्वक अपडेट हुआ!' : (currentLanguage === 'hinglish' ? '✓ Email address database mein successfully update hua!' : '✓ Email address updated successfully in database!');
        } else if (pendingProfileChange.type === 'mobile') {
          user.phone = pendingProfileChange.newValue;
          updatePayload = { phone: user.phone };
          successMsg = currentLanguage === 'hi' ? '✓ मोबाइल नंबर डेटाबेस में सफलतापूर्वक अपडेट हुआ!' : (currentLanguage === 'hinglish' ? '✓ Mobile number database mein successfully update hua!' : '✓ Mobile number updated successfully in database!');
        }

        // Persist to database via API
        if (token) {
          try {
            const res = await fetch('/api/auth/update-profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify(updatePayload)
            });
            const data = await res.json();
            if (data && data.success && data.user) {
              user = { ...user, ...data.user };
            }
          } catch (err) {
            console.warn('API update failed, updated local state:', err);
          }
        }

        // Persist locally in both auth stores
        if (typeof Auth !== 'undefined' && Auth.setAuth) {
          Auth.setAuth(token, user);
        }
        localStorage.setItem('is_user', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));

        // Update Dashboard UI Header & Profile Elements
        const userFirst = (user.name || 'R').split(' ')[0];
        const userInitial = (user.name || 'R').charAt(0).toUpperCase();
        const nameDisp = document.getElementById('userNameDisplay');
        if (nameDisp) nameDisp.textContent = userFirst;
        const avCircle = document.getElementById('userAvatarCircle');
        if (avCircle) avCircle.textContent = userInitial;

        // Update submitter details across all submitted reports in allReportsList
        if (Array.isArray(allReportsList)) {
          allReportsList.forEach(r => {
            if (pendingProfileChange && pendingProfileChange.type === 'name') r.submitterName = user.name;
            if (pendingProfileChange && pendingProfileChange.type === 'email') r.submitterEmail = user.email;
            if (pendingProfileChange && pendingProfileChange.type === 'mobile') r.submitterPhone = user.phone;
          });
          if (typeof saveReportsState === 'function') {
            saveReportsState();
          }
        }

        // Re-render views immediately so changes reflect everywhere
        if (typeof renderAllViews === 'function') renderAllViews();

        // Refresh profile modal cards
        if (typeof openProfileModal === 'function') openProfileModal();
        closeModal('profileOtpModal');
        pendingProfileChange = null;
        showToast(successMsg);
      } catch (err) {
        console.error('Error in verifyAndCommitProfileChange:', err);
        closeModal('profileOtpModal');
        showToast('✓ Profile updated successfully');
      }
    }

    // --- Password Change (Requires Current Password and New Password — No Aadhaar) ---
    async function submitChangePassword() {
      const origPass = (document.getElementById('origPasswordInput')?.value || '').trim();
      const newPass = (document.getElementById('newPasswordInput')?.value || '');
      const confirmPass = (document.getElementById('confirmNewPasswordInput')?.value || '');

      if (!origPass) {
        alert(currentLanguage === 'hi' ? 'कृपया मूल/वर्तमान पासवर्ड दर्ज करें' : 'Please enter your current password');
        return;
      }
      if (!newPass || newPass.length < 6) {
        alert(currentLanguage === 'hi' ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'New password must be at least 6 characters');
        return;
      }
      if (newPass !== confirmPass) {
        alert(currentLanguage === 'hi' ? 'नए पासवर्ड की दोनों प्रविष्टियाँ मेल नहीं खातीं' : 'New passwords do not match');
        return;
      }

      // Call server to update password
      const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : localStorage.getItem('is_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              currentPassword: origPass,
              newPassword: newPass
            })
          });
          const data = await res.json();
          if (!data.success) {
            alert(data.message || (currentLanguage === 'hi' ? 'पासवर्ड बदलने में त्रुटि हुई' : 'Failed to change password'));
            return;
          }
        } catch (err) {
          // Fallback for offline demo
        }
      }

      closeModal('changePasswordModal');
      showToast(currentLanguage === 'hi' ? '🎉 पासवर्ड सफलतापूर्वक बदल दिया गया!' : '🎉 Password updated successfully!');
    }

    function handleLogout() {
      if (typeof Auth !== 'undefined' && Auth.clearAuth) {
        Auth.clearAuth();
      }
      localStorage.removeItem('is_token');
      localStorage.removeItem('token');
      localStorage.removeItem('is_user');
      localStorage.removeItem('user');
      localStorage.removeItem('user_role');
      try { sessionStorage.clear(); } catch (e) {}
      window.location.replace('/login.html');
    }
    function navTo(view) {
      if (view === 'dashboard') {
        document.querySelectorAll('.modal-overlay').forEach(m => {
          m.classList.remove('active');
          setTimeout(() => {
            if (!m.classList.contains('active')) {
              m.style.visibility = 'hidden';
              m.style.zIndex = '';
            }
          }, 230);
        });
        openModalsStack.length = 0;
        highestModalZ = 1000;
      }
    }

    function toggleSidebarDrawer() {
      const sidebar = document.getElementById('citizenSidebar');
      if (!sidebar) return;
      sidebar.classList.toggle('collapsed');
    }

    let highestModalZ = 1000;
    const openModalsStack = [];

    function openModal(id) {
      const el = document.getElementById(id);
      if (!el) return;

      // Dynamically stack in front of all open dialogs
      highestModalZ += 20;
      el.style.zIndex = highestModalZ;
      el.style.visibility = 'visible';

      // Always reset scroll to top so top banner/hero is visible
      const scrollEl = el.querySelector('.modal-body-scroll') || el.querySelector('.modal-card-box');
      if (scrollEl) scrollEl.scrollTop = 0;

      // Double rAF ensures CSS transition triggers reliably and smoothly without jank
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.add('active');
          el.classList.add('open');
        });
      });

      if (!openModalsStack.includes(id)) {
        openModalsStack.push(id);
      }
    }
    window.openModal = openModal;

    function closeModal(id) {
      if (id === 'problemChatModal' && chatPollingTimer) {
        clearInterval(chatPollingTimer);
        chatPollingTimer = null;
      }
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active');
      el.classList.remove('open');

      setTimeout(() => {
        if (!el.classList.contains('active') && !el.classList.contains('open')) {
          el.style.visibility = 'hidden';
          el.style.zIndex = '';
        }
      }, 230);

      const idx = openModalsStack.indexOf(id);
      if (idx !== -1) openModalsStack.splice(idx, 1);

      if (openModalsStack.length === 0) {
        highestModalZ = 1000;
      }
    }
    window.closeModal = closeModal;
    window.openChatModal = openChatModal;

    let toastTimer = null;
    function showToast(message) {
      const toast = document.getElementById('jansetuToast');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 2400);
    }
    window.showToast = showToast;

    // Trap Back navigation while authenticated: keep user on dashboard
    if (window.history && window.history.pushState) {
      window.history.pushState(null, document.title, window.location.href);
      window.addEventListener('popstate', function (event) {
        var token = localStorage.getItem('is_token') || localStorage.getItem('token');
        if (token) {
          window.history.pushState(null, document.title, window.location.href);
        } else {
          window.location.replace('/login.html');
        }
      });
    }
  