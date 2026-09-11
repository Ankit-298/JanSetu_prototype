
import React, { useEffect } from 'react';
import './adminstyle.css';

function App() {
  useEffect(() => {
    // Dynamically load scripts after component mounts
    const loadScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    loadScript('/js/utils.js');
    loadScript('/admin/jansetu-civic-loader.js');
    setTimeout(() => {
      loadScript('/js/pan-india-heatmap.js');
      setTimeout(() => loadScript('/admin/admin.js'), 200);
    }, 200);
  }, []);

  return (
    <>
      
  {/* Fixed Background Canvas with Indian Heritage & Flag Watermarks (Zero Lag / GPU Smooth) */}
  <div className="fixed-canvas-bg">
    {/* Ashoka Chakra Watermark */}
    <svg style={{"position":"absolute","top":"40px","right":"60px","width":"340px","height":"340px","opacity":"0.045","pointerEvents":"none"}}
      viewBox="0 0 100 100" fill="none" stroke="#002D62">
      <circle cx="50" cy="50" r="45" stroke-width="2.5" />
      <circle cx="50" cy="50" r="10" stroke-width="2.5" />
      <circle cx="50" cy="50" r="3" fill="#002D62" />
      <g stroke-width="1.5">
        <line x1="50" y1="5" x2="50" y2="95" />
        <line x1="5" y1="50" x2="95" y2="50" />
        <line x1="18.18" y1="18.18" x2="81.82" y2="81.82" />
        <line x1="18.18" y1="81.82" x2="81.82" y2="18.18" />
        <line x1="32.7" y1="8.4" x2="67.3" y2="91.6" />
        <line x1="8.4" y1="32.7" x2="91.6" y2="67.3" />
        <line x1="67.3" y1="8.4" x2="32.7" y2="91.6" />
        <line x1="91.6" y1="32.7" x2="8.4" y2="67.3" />
        <line x1="41.3" y1="5.8" x2="58.7" y2="94.2" />
        <line x1="5.8" y1="41.3" x2="94.2" y2="58.7" />
        <line x1="58.7" y1="5.8" x2="41.3" y2="94.2" />
        <line x1="94.2" y1="41.3" x2="5.8" y2="58.7" />
      </g>
    </svg>

    {/* Indian Architectural Heritage Watermark Silhouette (Lal Qila / India Gate) */}
    <svg style={{"position":"absolute","bottom":"20px","left":"40px","width":"420px","height":"140px","opacity":"0.04","pointerEvents":"none"}}
      viewBox="0 0 300 100" fill="#002D62">
      <path
        d="M10 90 L10 50 L20 40 L30 50 L30 90 Z M40 90 L40 30 L55 15 L70 30 L70 90 Z M80 90 L80 40 L90 30 L100 40 L100 90 Z M110 90 L110 20 L130 5 L150 20 L150 90 Z M160 90 L160 40 L170 30 L180 40 L180 90 Z M190 90 L190 30 L205 15 L220 30 L220 90 Z M230 90 L230 50 L240 40 L250 50 L250 90 Z M120 90 A20 20 0 0 1 140 90 Z" />
    </svg>

    {/* Ashoka Lion Capital Emblem Watermark */}
    <svg style={{"position":"absolute","bottom":"100px","right":"80px","width":"180px","height":"180px","opacity":"0.035","pointerEvents":"none"}}
      viewBox="0 0 100 100" fill="#FF9933">
      <circle cx="50" cy="30" r="20" />
      <path d="M30 50 L70 50 L65 75 L35 75 Z M35 78 L65 78 L70 90 L30 90 Z" />
    </svg>
  </div>

  <div className="app-layout">
    {/* ROYAL NAVY SIDEBAR WITH MONUMENT WATERMARK (CITIZEN.HTML SYSTEM) */}
    <aside className="sidebar" id="sidebar">
    <div className="sidebar-monument-bg"></div>
    <div className="sidebar-navy-scrim"></div>
    <div className="sidebar-tricolor-ribbon"></div>

    <div className="sidebar-brand-wrapper">
      <a className="sidebar-brand" href="#overview" onClick={() => { showSection('overview') }}>
        <svg className="brand-icon-svg" viewBox="0 0 48 48" fill="none">
          <circle cx="16" cy="14" r="6" fill="#FF9933" />
          <path d="M7 32C7 25 12 21 17 21C22 21 27 25 27 32" stroke="#FF9933" stroke-width="4" stroke-linecap="round" />
          <circle cx="24" cy="12" r="6" fill="#002D62" />
          <path d="M15 30C15 23 20 19 25 19C30 19 35 23 35 30" stroke="#002D62" stroke-width="4" stroke-linecap="round" />
          <circle cx="32" cy="14" r="6" fill="#138808" />
          <path d="M23 32C23 25 28 21 33 21C38 21 43 25 43 32" stroke="#138808" stroke-width="4" stroke-linecap="round" />
        </svg>
        <div className="brand-text-block">
          <span className="brand-title"><span className="brand-saffron">Jan</span><span className="brand-green">Setu</span></span>
          <span className="brand-tagline">ADMIN COMMAND CENTER</span>
        </div>
      </a>
      <button type="button" className="sidebar-collapse-btn" id="sidebarCollapseBtn" onClick={() => { toggleSidebar() }} title="Toggle Navigation Drawer">
        <svg viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>

    <div className="admin-pill">
      <div className="admin-pill-dot"></div>
      <div className="admin-pill-text">🛡️ Admin Command</div>
      <div className="admin-pill-name" id="sidebarName">Dr. Admin</div>
    </div>

    <nav className="sidebar-menu">
      <div className="nav-section-label">Command Center</div>
      <button className="nav-item active" id="nav-overview" onClick={() => { showSection('overview') }}>
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Overview</span>
      </button>

      <div className="nav-section-label">Challenge Operations</div>
      <button className="nav-item" id="nav-challenges" onClick={() => { showSection('challenges') }}>
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>All Challenges</span>
        <span className="nav-badge" id="pendingCountBadge" style={{"display":"none"}}>0</span>
      </button>
      <button className="nav-item" id="nav-pending" onClick={() => { showSection('pending') }}>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Pending Validation</span>
        <span className="nav-badge red" id="pendingValidBadge" style={{"display":"none"}}>0</span>
      </button>
      <button className="nav-item" id="nav-aimatching" onClick={() => { showSection('aimatching') }}>
        <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>AI Matching</span>
      </button>
      <button className="nav-item" id="nav-assigned" onClick={() => { showSection('assigned') }}>
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        <span>Assigned</span>
      </button>
      <button className="nav-item" id="nav-sla" onClick={() => { showSection('sla') }}>
        <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Overdue / Escalated</span>
        <span className="nav-badge red" id="overdueNavBadge" style={{"display":"none"}}>0</span>
      </button>
      <button className="nav-item" id="nav-resolved" onClick={() => { showSection('resolved') }}>
        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Resolved</span>
      </button>

      <div className="nav-section-label">Network & Partners</div>
      <button className="nav-item" id="nav-users" onClick={() => { showSection('users') }}>
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <span>Citizens</span>
      </button>
      <button className="nav-item" id="nav-universities" onClick={() => { showSection('universities') }}>
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        <span>Universities</span>
      </button>
      <button className="nav-item" id="nav-industry" onClick={() => { showSection('industry') }}>
        <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        <span>Industry / CSR</span>
      </button>

      <div className="nav-section-label">Intelligence</div>
      <button className="nav-item" id="nav-analytics" onClick={() => { showSection('analytics') }}>
        <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span>Impact Analytics</span>
      </button>
      <button className="nav-item" id="nav-heatmap" onClick={() => { showSection('heatmap') }}>
        <svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        <span>District Heatmap</span>
      </button>

      <div className="nav-section-label">Governance</div>
      <button className="nav-item" id="nav-notifications" onClick={() => { showSection('notifications') }}>
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span>Notifications</span>
        <span className="nav-badge" id="notifNavBadge" style={{"display":"none"}}>0</span>
      </button>
      <button className="nav-item" id="nav-activity" onClick={() => { showSection('activity') }}>
        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span>Activity Log</span>
      </button>
    </nav>

    <div className="sidebar-footer">
      <div className="sidebar-user">
        <div className="sidebar-avatar" id="sidebarAvatar">A</div>
        <div>
          <div className="sidebar-uname" id="sidebarNameFull">Administrator</div>
          <div className="sidebar-urole">State Admin · Jharkhand</div>
        </div>
      </div>
      <button className="btn-logout" onClick={() => { logout() }}>
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Logout</span>
      </button>
    </div>
  </aside>

  {/* Floating Drawer Reopen Tab (Always visible if drawer is collapsed) */}
  <button type="button" className="drawer-floating-toggle" id="drawerFloatingToggle" onClick={() => { toggleSidebar() }} title="Expand Navigation Drawer">
    <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
  </button>

  {/* MAIN VIEWPORT */}
  <div className="main-viewport">

    {/* 176px TOP PANORAMA MONUMENT BANNER (RASHTRAPATI BHAVAN / CENTRAL VISTA TWILIGHT) */}
    <header className="top-panorama-wrapper">
      <div className="panorama-monument-layer">
        <img src="/admin/images/admin-monument-banner.jpg" className="panorama-monument-photo" alt="Rashtrapati Bhavan Central Vista" onerror="this.src='images/admin-monument-banner.jpg'" />
        <div className="panorama-monument-scrim"></div>
      </div>

      <div className="panorama-top-row">
        <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
          <button type="button" className="drawer-open-btn" onClick={() => { toggleSidebar() }} title="Toggle Navigation Drawer">
            <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="gov-badge-tag">
            <span style={{"width":"7px","height":"7px","borderRadius":"50%","background":"#FF9933"}}></span>
            <span>Government of Jharkhand · Societal Innovation Command</span>
          </div>
        </div>

        <div className="panorama-actions-right">
          <div className="heritage-flag-pill">
            <span style={{"fontSize":"14px"}}>🇮🇳</span>
            <span>सत्यमेव जयते · झारखण्ड</span>
          </div>

          <div className="admin-live-badge">
            <span className="admin-live-badge-dot"></span>
            <span>Live Admin</span>
          </div>

          <button className="notif-bell-btn" onClick={() => { showSection('notifications') }} title="Notifications">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span className="notif-pink-badge" id="topbarNotifDot" style={{"display":"none"}}>0</span>
          </button>

          <div className="profile-pill" onClick={() => { showSection('overview') }}>
            <div className="profile-avatar-circle" id="topbarAvatar">A</div>
            <div className="profile-text-meta">
              <span className="profile-name" id="topbarName">Admin</span>
              <span className="profile-role-tag">Command Center</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panorama-hero-row">
        <div className="hero-quote-container">
          <div>
            <div className="hero-quote-lines" id="welcomeName">JanSetu Command Center — Welcome, Dr. Admin</div>
            <div className="hero-quote-sub">Real-time civic challenge governance, university R&D matching & industry CSR acceleration across Jharkhand.</div>
          </div>
        </div>

        <div className="hero-action-buttons">
          <button className="btn-hero-action btn-hero-orange" onClick={() => { showSection('pending') }}>
            <span>✓</span> Review Pending
          </button>
          <button className="btn-hero-action btn-hero-glass" onClick={() => { showSection('aimatching') }}>
            <span>⚡</span> AI Matching
          </button>
          <button className="btn-hero-action btn-hero-glass" onClick={() => { showSection('heatmap') }}>
            <span>🗺️</span> Heatmap
          </button>
        </div>
      </div>
    </header>

    <div className="page-content">
      {/* OVERVIEW */}
      <div id="section-overview" className="dashboard-section active">
        <div className="metrics-grid" id="adminMetrics">
          <div className="skeleton" style={{"height":"110px"}}></div><div className="skeleton" style={{"height":"110px"}}></div>
          <div className="skeleton" style={{"height":"110px"}}></div><div className="skeleton" style={{"height":"110px"}}></div>
        </div>
        <div className="grid-2">
          <div className="chart-container"><div className="chart-header"><div><div className="chart-title">Submission Trends</div><div className="chart-subtitle">Monthly challenges submitted</div></div></div><div className="chart-body"><canvas id="trendChart"></canvas></div></div>
          <div className="chart-container"><div className="chart-header"><div><div className="chart-title">Status Distribution</div><div className="chart-subtitle">Current pipeline</div></div></div><div className="chart-body"><canvas id="statusChart"></canvas></div></div>
        </div>
        <div className="grid-2" style={{"marginTop":"20px"}}>
          <div className="card">
            <div className="card-header"><div><div className="card-title">Pending Validation</div><div className="card-subtitle">Challenges awaiting review</div></div><button onClick={() => { showSection('pending') }} className="btn btn-ghost btn-sm">View All</button></div>
            <div className="card-body" id="pendingChallengesList"><div className="skeleton" style={{"height":"60px","marginBottom":"8px"}}></div><div className="skeleton" style={{"height":"60px"}}></div></div>
          </div>
          <div className="card">
            <div className="card-header"><div><div className="card-title">University Rankings</div><div className="card-subtitle">By performance score</div></div></div>
            <div className="card-body" id="univLeaderboard"><div className="skeleton" style={{"height":"50px","marginBottom":"8px"}}></div><div className="skeleton" style={{"height":"50px"}}></div></div>
          </div>
        </div>
        <div className="chart-container" style={{"marginTop":"20px"}}><div className="chart-header"><div><div className="chart-title">Category Distribution</div><div className="chart-subtitle">Challenges by domain</div></div></div><div className="chart-body"><canvas id="categoryBarChart"></canvas></div></div>

      </div>
      {/* ALL CHALLENGES */}
      <div id="section-challenges" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">All Challenges</div><div className="section-subtitle">Review, validate, assign and monitor challenges</div></div><div><button onClick={() => { exportChallenges() }} className="btn btn-ghost btn-sm">&#11015; Export CSV</button></div></div>
        <div className="filter-bar">
          <div className="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" className="search-input" placeholder="Search challenges..." id="adminChallengeSearch" oninput="debounceLoadChallenges()" /></div>
          <select className="filter-select" id="adminStatusFilter" onChange={(e) => { loadAdminChallenges() }}>
            <option value="">All Statuses</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option>
            <option value="validated">Validated</option><option value="assigned">Assigned</option><option value="in_progress">In Progress</option>
            <option value="testing">Testing</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option><option value="escalated">Escalated</option>
          </select>
          <select className="filter-select" id="adminCategoryFilter" onChange={(e) => { loadAdminChallenges() }}>
            <option value="">All Categories</option><option>Education</option><option>Healthcare</option><option>Agriculture</option>
            <option>Water Management</option><option>Sanitation &amp; Environment</option><option>Rural Livelihoods</option>
            <option>Accessibility</option><option>Urban Infrastructure</option><option>Public Administration</option><option>Energy &amp; Technology</option>
          </select>
          <select className="filter-select" id="adminPriorityFilter" onChange={(e) => { loadAdminChallenges() }}>
            <option value="">All Priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
        <div className="table-container">
          <table className="table" id="challengesTable">
            <thead><tr><th>ID / Title</th><th>Category</th><th>Priority</th><th>Status</th><th>District</th><th>Submitter</th><th>Assigned To</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody id="challengesTableBody"><tr><td colspan="9" style={{"textAlign":"center","padding":"40px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></td></tr></tbody>
          </table>
        </div>
        <div id="adminChallengesPagination" style={{"marginTop":"16px","display":"flex","gap":"6px","justifyContent":"center"}}></div>
      </div>
      {/* PENDING VALIDATION */}
      <div id="section-pending" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Pending Validation</div><div className="section-subtitle">New challenges awaiting admin review and AI quality analysis</div></div></div>
        <div className="table-container">
          <table className="table"><thead><tr><th>ID / Title</th><th>Category</th><th>Priority</th><th>District</th><th>Quality Score</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody id="pendingTableBody"><tr><td colspan="7" style={{"textAlign":"center","padding":"40px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></td></tr></tbody></table>
        </div>
      </div>
      {/* AI MATCHING CENTER */}
      <div id="section-aimatching" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">&#9889; AI Matching Center</div><div className="section-subtitle">AI-powered university and industry partner recommendations for validated challenges</div></div></div>
        <div className="grid-2" style={{"alignItems":"start"}}>
          <div>
            <div className="card" style={{"marginBottom":"16px"}}>
              <div className="card-header"><div><div className="card-title">Validated Challenges</div><div className="card-subtitle">Click a challenge to see AI recommendations</div></div></div>
              <div className="card-body" id="aiMatchingChallengeList">
                <div className="skeleton" style={{"height":"80px","marginBottom":"10px"}}></div><div className="skeleton" style={{"height":"80px","marginBottom":"10px"}}></div><div className="skeleton" style={{"height":"80px"}}></div>
              </div>
            </div>
          </div>
          <div id="aiMatchingPanel">
            <div style={{"padding":"40px","textAlign":"center","background":"white","borderRadius":"18px","border":"1px solid var(--gray-200)"}}>
              <div style={{"fontSize":"48px","marginBottom":"12px"}}>&#9889;</div>
              <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gray-900)","marginBottom":"6px"}}>Select a Challenge</div>
              <div style={{"fontSize":"13px","color":"var(--gray-400)"}}>Click any challenge on the left to see AI-powered matching analysis</div>
            </div>
          </div>
        </div>
      </div>
      {/* ASSIGNED */}
      <div id="section-assigned" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Assigned Challenges</div><div className="section-subtitle">Active challenges assigned to universities</div></div></div>
        <div className="table-container"><table className="table"><thead><tr><th>ID / Title</th><th>Category</th><th>University</th><th>Status</th><th>Deadline</th><th>Days Left</th><th>Actions</th></tr></thead>
        <tbody id="assignedTableBody"><tr><td colspan="7" style={{"textAlign":"center","padding":"40px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></td></tr></tbody></table></div>
      </div>
      {/* SLA */}
      <div id="section-sla" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">&#9888; SLA Monitoring</div><div className="section-subtitle">Overdue and escalated challenges requiring immediate action</div></div></div>
        <div className="metrics-grid" style={{"gridTemplateColumns":"repeat(3,1fr)"}} id="slaMetrics">
          <div className="skeleton" style={{"height":"100px"}}></div><div className="skeleton" style={{"height":"100px"}}></div><div className="skeleton" style={{"height":"100px"}}></div>
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Overdue Challenges</div><div className="card-subtitle">Requires immediate action</div></div></div>
          <div id="slaList"><div className="skeleton" style={{"height":"70px","margin":"16px 22px 8px"}}></div><div className="skeleton" style={{"height":"70px","margin":"0 22px 16px"}}></div></div>
        </div>
      </div>
      {/* RESOLVED */}
      <div id="section-resolved" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">&#9989; Resolved Challenges</div><div className="section-subtitle">Successfully completed challenges</div></div></div>
        <div className="table-container"><table className="table"><thead><tr><th>ID / Title</th><th>Category</th><th>University</th><th>Resolved On</th><th>Impact Score</th><th>Actions</th></tr></thead>
        <tbody id="resolvedTableBody"><tr><td colspan="6" style={{"textAlign":"center","padding":"40px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></td></tr></tbody></table></div>
      </div>
      {/* CITIZENS */}
      <div id="section-users" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Citizens</div><div className="section-subtitle">Manage platform users and their permissions</div></div></div>
        <div className="filter-bar">
          <div className="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" className="search-input" placeholder="Search users..." id="userSearch" oninput="debounceLoadUsers()" /></div>
          <select className="filter-select" id="userRoleFilter" onChange={(e) => { loadUsers() }}><option value="">All Roles</option><option value="citizen">Citizen</option><option value="university_rep">University Rep</option><option value="industry_rep">Industry Rep</option><option value="admin">Admin</option></select>
        </div>
        <div className="table-container"><table className="table"><thead><tr><th>User</th><th>Role</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody id="usersTableBody"><tr><td colspan="6" style={{"textAlign":"center","padding":"40px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></td></tr></tbody></table></div>
        <div id="usersPagination" style={{"marginTop":"16px","display":"flex","gap":"6px","justifyContent":"center"}}></div>
      </div>
      {/* UNIVERSITIES */}
      <div id="section-universities" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Universities</div><div className="section-subtitle">Partner universities — capacity, expertise and performance data</div></div></div>
        <div className="grid-auto" id="univGrid"><div className="skeleton" style={{"height":"320px"}}></div><div className="skeleton" style={{"height":"320px"}}></div><div className="skeleton" style={{"height":"320px"}}></div></div>
      </div>
      {/* INDUSTRY */}
      <div id="section-industry" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Industry / CSR Partners</div><div className="section-subtitle">Industry collaborators — CSR budget, capabilities and availability</div></div></div>
        <div className="grid-auto" id="industryGrid"><div className="skeleton" style={{"height":"320px"}}></div><div className="skeleton" style={{"height":"320px"}}></div></div>
      </div>
      {/* IMPACT ANALYTICS */}
      <div id="section-analytics" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Impact Analytics</div><div className="section-subtitle">Comprehensive platform performance and outcome metrics</div></div></div>
        <div className="kpi-section">
          <div className="kpi-section-title">&#128202; Platform Impact</div>
          <div className="kpi-row">
            <div className="kpi-card"><div className="kpi-num" id="kpi-reported">&#8212;</div><div className="kpi-lbl">Problems Reported</div></div>
            <div className="kpi-card"><div className="kpi-num" id="kpi-validated">&#8212;</div><div className="kpi-lbl">Problems Validated</div></div>
            <div className="kpi-card"><div className="kpi-num" id="kpi-solved">&#8212;</div><div className="kpi-lbl">Problems Solved</div></div>
            <div className="kpi-card"><div className="kpi-num" id="kpi-impacted">3.2M</div><div className="kpi-lbl">People Impacted</div><div className="kpi-sub">Estimated reach</div></div>
          </div>
          <div className="kpi-row">
            <div className="kpi-card"><div className="kpi-num" id="kpi-univs">&#8212;</div><div className="kpi-lbl">Universities</div></div>
            <div className="kpi-card"><div className="kpi-num" id="kpi-industry">&#8212;</div><div className="kpi-lbl">Industry Partners</div></div>
            <div className="kpi-card"><div className="kpi-num">186</div><div className="kpi-lbl">Successful Pilots</div></div>
            <div className="kpi-card"><div className="kpi-num">4.4/5</div><div className="kpi-lbl">Citizen Satisfaction</div><div className="kpi-sub">Avg rating</div></div>
          </div>
        </div>
        <div className="kpi-section">
          <div className="kpi-section-title">&#9889; Efficiency</div>
          <div className="kpi-row">
            <div className="kpi-card"><div className="kpi-num">1.8</div><div className="kpi-lbl">Avg Validation Time</div><div className="kpi-sub">days</div></div>
            <div className="kpi-card"><div className="kpi-num">4.2</div><div className="kpi-lbl">Avg Matching Time</div><div className="kpi-sub">minutes (AI)</div></div>
            <div className="kpi-card"><div className="kpi-num" id="kpi-res-time">&#8212;</div><div className="kpi-lbl">Avg Resolution Time</div><div className="kpi-sub">days</div></div>
            <div className="kpi-card"><div className="kpi-num">87%</div><div className="kpi-lbl">AI Recommendation Accuracy</div></div>
          </div>
        </div>
        <div className="grid-2">
          <div className="chart-container"><div className="chart-header"><div><div className="chart-title">Monthly Trends</div><div className="chart-subtitle">Submissions vs Resolutions</div></div></div><div className="chart-body"><canvas id="analyticsLineChart"></canvas></div></div>
          <div className="chart-container"><div className="chart-header"><div><div className="chart-title">Domain Distribution</div><div className="chart-subtitle">Challenges by category</div></div></div><div className="chart-body"><canvas id="analyticsDoughnutChart"></canvas></div></div>
        </div>
        <div className="chart-container" style={{"marginTop":"20px"}}><div className="chart-header"><div><div className="chart-title">University Performance</div><div className="chart-subtitle">Assigned vs Resolved per university</div></div></div><div className="chart-body"><canvas id="univPerfChart"></canvas></div></div>
        <div className="card" style={{"marginTop":"20px"}}>
          <div className="card-header"><div><div className="card-title">&#128293; High Impact Challenges</div><div className="card-subtitle">Ranked by impact score</div></div></div>
          <div className="card-body" id="highImpactList"><div className="skeleton" style={{"height":"50px","marginBottom":"8px"}}></div><div className="skeleton" style={{"height":"50px"}}></div></div>
        </div>
      </div>
      {/* PAN-INDIA & DISTRICT HEATMAP */}
      <div id="section-heatmap" className="dashboard-section">
        <div className="section-header">
          <div>
            <div className="section-title">🗺️ Pan-India & District Civic Heatmap</div>
            <div className="section-subtitle">Select any Indian state from the dropdown to zoom in and analyze district-level challenges, density & priority hotspots.</div>
          </div>
          <div className="heatmap-legend">
            <div className="hm-legend-item"><div className="hm-dot" style={{"background":"#DC2626"}}></div>High Priority</div>
            <div className="hm-legend-item"><div className="hm-dot" style={{"background":"#D97706"}}></div>Medium</div>
            <div className="hm-legend-item"><div className="hm-dot" style={{"background":"#059669"}}></div>Low / Resolved</div>
          </div>
        </div>

        <div className="heatmap-toolbar">
          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            <span style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","whiteSpace":"nowrap"}}>📍 Select State:</span>
            <select id="adminStateSelect" className="form-control" style={{"minWidth":"260px","fontWeight":"750"}}>
              <option value="ALL" selected>🇮🇳 All India (Overview & State Clusters)</option>
              <option value="Jharkhand">Jharkhand (24 Districts Focus)</option>
            </select>
          </div>

          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            <span style={{"fontSize":"13px","fontWeight":"800","color":"var(--gray-600)","whiteSpace":"nowrap"}}>Domain:</span>
            <select id="adminMapCategoryFilter" className="form-control" style={{"minWidth":"180px","fontWeight":"600"}}>
              <option value="">All Categories</option>
              <option>Water Management</option>
              <option>Healthcare</option>
              <option>Agriculture</option>
              <option>Education</option>
              <option>Sanitation & Environment</option>
              <option>Rural Livelihoods</option>
              <option>Urban Infrastructure</option>
              <option>Energy & Technology</option>
            </select>
          </div>

          <div style={{"marginLeft":"auto","display":"flex","gap":"8px","alignItems":"center"}}>
            <span className="badge badge-navy" style={{"fontSize":"11px"}}>28 States & UTs</span>
            <span className="badge badge-green" style={{"fontSize":"11px"}}>Real-Time Sync</span>
          </div>
        </div>

        <div className="grid-2" style={{"alignItems":"start"}}>
          <div id="jharkhand-heatmap"></div>
          <div className="card" id="districtDetailPanel">
            <div className="card-body" style={{"textAlign":"center","padding":"40px"}}>
              <div style={{"fontSize":"40px","marginBottom":"10px"}}>🗺️</div>
              <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--gray-900)"}}>Select a State or Click a District</div>
              <div style={{"fontSize":"13px","color":"var(--gray-400)","marginTop":"4px"}}>Click any cluster on the map or select from the dropdown to view real-time civic intelligence.</div>
            </div>
          </div>
        </div>
      </div>
      {/* NOTIFICATIONS */}
      <div id="section-notifications" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">&#128276; Notifications Center</div><div className="section-subtitle">Platform alerts and broadcast messaging</div></div></div>
        <div className="grid-2" style={{"alignItems":"start"}}>
          <div>
            <div className="card" style={{"marginBottom":"20px"}}>
              <div className="card-header"><div><div className="card-title">Pending Actions</div><div className="card-subtitle" id="notifCountLabel">Loading...</div></div></div>
              <div id="notificationsList"><div className="skeleton" style={{"height":"60px","margin":"16px 22px 8px"}}></div><div className="skeleton" style={{"height":"60px","margin":"0 22px 16px"}}></div></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div><div className="card-title">&#128227; Send Broadcast</div><div className="card-subtitle">Notify specific user groups</div></div></div>
            <div className="card-body">
              <div className="broadcast-form">
                <div className="form-group">
                  <div className="form-label">Audience</div>
                  <div className="br-radio-group">
                    <div className="br-radio"><input type="radio" name="audience" id="aud-all" value="all" checked /><label htmlFor="aud-all">All Users</label></div>
                    <div className="br-radio"><input type="radio" name="audience" id="aud-citizens" value="citizen" /><label htmlFor="aud-citizens">Citizens</label></div>
                    <div className="br-radio"><input type="radio" name="audience" id="aud-univ" value="university_rep" /><label htmlFor="aud-univ">Universities</label></div>
                    <div className="br-radio"><input type="radio" name="audience" id="aud-ind" value="industry_rep" /><label htmlFor="aud-ind">Industry</label></div>
                  </div>
                </div>
                <div className="form-group"><label className="form-label" htmlFor="broadcastTitle">Title</label><input type="text" className="form-control" id="broadcastTitle" placeholder="Notification title..." /></div>
                <div className="form-group"><label className="form-label" htmlFor="broadcastMsg">Message</label><textarea className="broadcast-ta" id="broadcastMsg" placeholder="Type your broadcast message here..."></textarea></div>
                <button onClick={() => { sendBroadcast() }} className="btn btn-primary" style={{"width":"100%"}}>&#10148; Send Notification</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ACTIVITY LOG */}
      <div id="section-activity" className="dashboard-section">
        <div className="section-header"><div><div className="section-title">Activity / Audit Log</div><div className="section-subtitle">All platform events, admin decisions, and system actions</div></div></div>
        <div className="card">
          <div id="activityLogList"><div className="skeleton" style={{"height":"60px","margin":"16px 22px 8px"}}></div><div className="skeleton" style={{"height":"60px","margin":"0 22px 8px"}}></div><div className="skeleton" style={{"height":"60px","margin":"0 22px 16px"}}></div></div>
        </div>
      </div>
    </div>
  </div>
</div>
{/* CHALLENGE DETAIL MODAL */}
<div className="modal-overlay" id="challengeActionModal">
  <div className="modal modal-lg">
    <div className="modal-header"><div><div className="modal-title" id="caTitle">Challenge Details</div><div className="modal-subtitle" id="caSubtitle"></div></div><button className="modal-close" onClick={() => { closeModal('challengeActionModal') }}>&#10005;</button></div>
    <div className="modal-body" id="caBody"><div style={{"textAlign":"center","padding":"40px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></div></div>
    <div className="modal-footer" id="caFooter"></div>
  </div>
</div>
{/* AI ASSIGN MODAL */}
<div className="modal-overlay" id="assignModal">
  <div className="modal modal-sm">
    <div className="modal-header"><div><div className="modal-title">&#129302; AI-Assisted Assignment</div><div className="modal-subtitle" id="assignModalSubtitle">AI recommends the best match</div></div><button className="modal-close" onClick={() => { closeModal('assignModal') }}>&#10005;</button></div>
    <div className="modal-body" id="assignModalBody"><div style={{"textAlign":"center","padding":"30px"}}><div className="spinner" style={{"margin":"0 auto"}}></div></div></div>
    <div className="modal-footer" id="assignModalFooter"><button onClick={() => { closeModal('assignModal') }} className="btn btn-ghost">Cancel</button></div>
  </div>
</div>
{/* ASSIGN INDUSTRY MODAL */}
<div className="modal-overlay" id="assignIndustryModal">
  <div className="modal modal-sm">
    <div className="modal-header"><div><div className="modal-title">&#127970; Assign Industry Partner</div></div><button className="modal-close" onClick={() => { closeModal('assignIndustryModal') }}>&#10005;</button></div>
    <div className="modal-body">
      <div className="form-group"><label className="form-label">Select Industry Partner *</label><select className="form-control" id="assignIndSelect"><option value="">-- Choose Partner --</option></select></div>
      <div className="form-group"><label className="form-label">Role</label><select className="form-control" id="assignIndRole"><option value="funder">Funder</option><option value="mentor">Mentor</option><option value="co_developer">Co-Developer</option><option value="pilot_partner">Pilot Partner</option></select></div>
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" id="assignIndNotes" rows="3" placeholder="Any special instructions..."></textarea></div>
    </div>
    <div className="modal-footer"><button onClick={() => { closeModal('assignIndustryModal') }} className="btn btn-ghost">Cancel</button><button onClick={() => { confirmAssignIndustry() }} className="btn btn-primary" id="assignIndConfirmBtn">Assign</button></div>
  </div>
</div>
<div id="adminToast" style={{"display":"none","position":"fixed","bottom":"24px","left":"50%","transform":"translateX(-50%)","background":"#0f172a","color":"white","padding":"10px 22px","borderRadius":"30px","fontSize":"13px","fontWeight":"700","zIndex":"9999","boxShadow":"0 10px 30px rgba(0,0,0,0.3)","alignItems":"center","gap":"8px","pointerEvents":"none","border":"1px solid rgba(255,255,255,0.15)"}}></div>
<script src="/js/utils.js"></script>
<script src="/js/pan-india-heatmap.js"></script>
<script src="/admin/admin.js"></script>

    </>
  );
}

export default App;
