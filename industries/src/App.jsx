
import React, { useEffect } from 'react';
import './industrystyle.css';

function App() {
  useEffect(() => {
    const loadScript = (src) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    };

    // Load scripts exactly like in industry.html
    loadScript('https://checkout.razorpay.com/v1/checkout.js');
    setTimeout(() => {
      loadScript('/js/utils.js');
      setTimeout(() => {
        loadScript('/js/pan-india-heatmap.js');
        setTimeout(() => loadScript('/js/dashboard/industry.js'), 200);
      }, 200);
    }, 200);
  }, []);

  return (
    <>
      
  {/* Fixed Background Canvas with Indian Heritage & Flag Watermarks (Zero Lag / GPU Smooth) */}
  <div className="fixed-canvas-background fixed-canvas-bg">
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

<div className="dashboard-layout app-layout">
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
          <span className="brand-tagline">INDUSTRY & CSR PORTAL</span>
        </div>
      </a>
      <button type="button" className="sidebar-collapse-btn" onClick={() => { toggleSidebar() }} title="Toggle Navigation Drawer">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
    </div>

    <div className="industry-pill">
      <div className="industry-pill-dot"></div>
      <div className="industry-pill-text">🏢 CSR & Industry</div>
      <div className="industry-pill-name" id="sidebarName">Vikram Sinha</div>
    </div>
    <nav className="sidebar-nav">
      <div className="sidebar-section-label">Navigation</div>
      <a href="/" className="sidebar-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span className="sidebar-link-text">Public Feed</span>
      </a>
     
      <div className="sidebar-section-label">Dashboard</div>
      <a className="sidebar-link active" id="nav-overview" onClick={() => { showSection('overview') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span className="sidebar-link-text">Overview</span>
      </a>

      <a className="sidebar-link" id="nav-explore" onClick={() => { showSection('explore') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span className="sidebar-link-text">Explore Challenges</span>
      </a>
      <a className="sidebar-link" id="nav-roi" onClick={() => { showSection('roi') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-8 8"/><path d="M16 16V8H8"/></svg>
        <span className="sidebar-link-text">Opportunity & ROI</span>
      </a>
      <a className="sidebar-link" id="nav-collaborations" onClick={() => { showSection('collaborations') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        <span className="sidebar-link-text">Collaborations</span>
      </a>
      <a className="sidebar-link" id="nav-impact" onClick={() => { showSection('impact') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span className="sidebar-link-text">Impact & Analytics</span>
      </a>
      <a className="sidebar-link" id="nav-heatmap" onClick={() => { showSection('heatmap') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        <span className="sidebar-link-text">Pan-India Heatmap</span>
      </a>
      <a className="sidebar-link" id="nav-notifications" onClick={() => { showSection('notifications') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span className="sidebar-link-text">Notifications</span>
        <span className="sidebar-badge notif-badge-count" style={{"display":"none"}}>0</span>
      </a>
      <a className="sidebar-link" id="nav-profile" onClick={() => { showSection('profile') }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        <span className="sidebar-link-text">Partner Profile</span>
      </a>
    </nav>
    <div className="sidebar-footer">
      <div className="sidebar-user">
        <div className="sidebar-user-avatar" id="sidebarAvatar">I</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name" id="sidebarName">Industry Rep</div>
          <div className="sidebar-user-role">Industry Partner</div>
        </div>
      </div>
      <button onClick={() => { logout() }} className="sidebar-link" style={{"width":"100%","color":"var(--danger)","marginTop":"8px"}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span className="sidebar-link-text">Logout</span>
      </button>
    </div>
  </aside>

  {/* Floating Drawer Reopen Tab (Always visible if drawer is collapsed) */}
  <button type="button" className="drawer-floating-toggle" id="drawerFloatingToggle" onClick={() => { toggleSidebar() }} title="Expand Navigation Drawer">
    <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
  </button>

  <div className="sidebar-overlay" id="sidebarOverlay" onClick={() => { closeMobileSidebar() }}></div>

  <main className="main-content main-viewport" id="mainContent">
    {/* 176px TOP PANORAMA MONUMENT BANNER (LIGHT THEME - CITIZEN.HTML SYSTEM) */}
    <header className="top-panorama-wrapper">
      <div className="panorama-monument-layer">
        <img src="/industries/images/industry-monument-banner.jpg" className="panorama-monument-photo" alt="Indian Architectural Heritage - Industry &amp; CSR" onError={(e) => { this.src='images/industry-monument-banner.jpg' }} />
        <div className="panorama-monument-scrim"></div>
      </div>

      <div className="panorama-top-row">
        <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
          <button type="button" className="drawer-open-btn" onClick={() => { toggleSidebar() }} title="Toggle Navigation Drawer">
            <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="gov-badge-tag">
            <span style={{"width":"7px","height":"7px","borderRadius":"50%","background":"#FF9933"}}></span>
            <span>Government of Jharkhand · Industry &amp; CSR Portal</span>
          </div>
        </div>

        <div className="panorama-actions-right">
          <div className="heritage-flag-pill">
            <span style={{"fontSize":"14px"}}>🇮🇳</span>
            <span>सत्यमेव जयते · झारखण्ड</span>
          </div>

          <div className="industry-live-badge">
            <span className="industry-live-badge-dot"></span>
            <span>Active Partner</span>
          </div>

          <button className="notif-bell-btn" onClick={() => { showSection('notifications') }} title="Notifications">
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span className="notif-pink-badge" id="topbarNotifDot" style={{"display":"none"}}>0</span>
          </button>

          <div className="profile-pill" onClick={() => { showSection('profile') }}>
            <div className="profile-avatar-circle" id="topbarAvatar">VS</div>
            <div className="profile-text-meta">
              <span className="profile-name" id="topbarName">Vikram Sinha</span>
              <span className="profile-role-tag">Industry &amp; CSR Partner</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panorama-hero-row">
        <div className="hero-quote-container">
          <div>
            <div className="hero-quote-lines" id="welcomeGreeting">Industry &amp; CSR Portal — <span id="welcomeName">Welcome, Vikram!</span></div>
            <div className="hero-quote-sub">Discover university projects solving societal challenges across Jharkhand. Fund, mentor, pilot, and scale impactful innovations.</div>
          </div>
        </div>

        <div className="hero-action-buttons">
          <button className="btn-hero-action btn-hero-orange" onClick={() => { showSection('explore') }}>
            <span>🚀</span> Explore Projects
          </button>
          <button className="btn-hero-action btn-hero-glass" onClick={() => { showSection('collaborations') }}>
            <span>🤝</span> My Collaborations
          </button>
          <button className="btn-hero-action btn-hero-glass" onClick={() => { showSection('heatmap') }}>
            <span>🗺️</span> Pan-India Map
          </button>
        </div>
      </div>
    </header>

    <div className="page-content">

      {/* ── OVERVIEW ── */}
      <div id="section-overview" className="dashboard-section">

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header"><div className="metric-icon" style={{"background":"var(--primary-50)"}}><span style={{"fontSize":"18px"}}>📋</span></div></div>
            <div className="metric-value" id="m-total-projects">0</div>
            <div className="metric-label">Active Projects</div>
          </div>
          <div className="metric-card">
            <div className="metric-header"><div className="metric-icon" style={{"background":"var(--accent-50)"}}><span style={{"fontSize":"18px"}}>🤝</span></div></div>
            <div className="metric-value" id="m-collaborations">12</div>
            <div className="metric-label">Collaborations Supported</div>
          </div>
          <div className="metric-card">
            <div className="metric-header"><div className="metric-icon" style={{"background":"#f3e8ff"}}><span style={{"fontSize":"18px"}}>🏛️</span></div></div>
            <div className="metric-value" id="m-univs">5</div>
            <div className="metric-label">University Partners</div>
          </div>
          <div className="metric-card">
            <div className="metric-header"><div className="metric-icon" style={{"background":"#fef3c7"}}><span style={{"fontSize":"18px"}}>💰</span></div></div>
            <div className="metric-value" id="m-funding">₹25L</div>
            <div className="metric-label">CSR Impact Generated</div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="chart-container">
            <div className="chart-header"><div><div className="chart-title">Challenges by Domain</div></div></div>
            <div className="chart-body"><canvas id="industryCatChart"></canvas></div>
          </div>
          <div className="card">
            <div className="card-header" style={{"padding":"20px 24px 0"}}><div style={{"fontWeight":"700","fontSize":"16px","color":"var(--gray-900)"}}>Featured Innovations</div></div>
            <div className="card-body" id="featuredProjects">
              <div className="skeleton skeleton-card" style={{"height":"60px","marginBottom":"8px"}}></div>
              <div className="skeleton skeleton-card" style={{"height":"60px","marginBottom":"8px"}}></div>
            </div>
          </div>
        </div>

      </div>

      {/* ── EXPLORE CHALLENGES ── */}
      <div id="section-explore" className="dashboard-section" style={{"display":"none"}}>
        <div style={{"marginBottom":"24px"}}><h2 style={{"fontSize":"22px","fontWeight":"800","color":"var(--gray-900)"}}>Explore Challenges & Projects</h2><div style={{"fontSize":"13px","color":"var(--gray-400)"}}>Browse active university projects seeking industry mentorship and CSR collaboration</div></div>
        <div className="filter-bar">
          <div className="search-bar" style={{"flex":"1","minWidth":"200px"}}>
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search projects..." id="indSearch" oninput="loadExploreChallenges()" />
          </div>
          <select className="filter-select" id="indCategoryFilter" onChange={(e) => { loadExploreChallenges() }}>
            <option value="">All Categories</option>
            <option>Education</option><option>Healthcare</option><option>Agriculture</option>
            <option>Water Management</option><option>Sanitation & Environment</option>
            <option>Rural Livelihoods</option><option>Accessibility</option>
            <option>Urban Infrastructure</option><option>Energy & Technology</option>
          </select>
        </div>
        <div id="indChallengesGrid" style={{"display":"flex","flexDirection":"column","gap":"16px"}}></div>
      </div>

      {/* ── CHALLENGE DETAILS ── */}
      <div id="section-challenge-details" className="dashboard-section" style={{"display":"none"}}>
        <div id="challengeDetailsContainer" className="challenge-details-container">
          {/* Populated dynamically by openChallengeDetails() */}
        </div>
      </div>

      {/* ── COLLABORATIONS ── */}
      <div id="section-collaborations" className="dashboard-section" style={{"display":"none"}}>
        <div style={{"marginBottom":"24px"}}><h2 style={{"fontSize":"22px","fontWeight":"800","color":"var(--gray-900)"}}>My Collaborations</h2><div style={{"fontSize":"13px","color":"var(--gray-400)"}}>Projects your organization has partnered with or funded</div></div>
        
        {/* Pending Collaboration Requests (from localStorage) */}
        <div id="pendingCollabSection" style={{"marginBottom":"28px"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"10px","marginBottom":"14px"}}>
            <span style={{"fontSize":"18px"}}>⏳</span>
            <h3 style={{"fontSize":"17px","fontWeight":"750","color":"var(--gray-900)","margin":"0"}}>Pending Collaboration Requests</h3>
            <span className="badge" id="pendingRequestsCountBadge" style={{"background":"#fef3c7","color":"#92400e","borderColor":"#fde68a"}}>0 Pending</span>
          </div>
          <div id="pendingCollabList" style={{"display":"flex","flexDirection":"column","gap":"12px"}}></div>
        </div>

        {/* Active Partnerships */}
        <div style={{"display":"flex","alignItems":"center","gap":"10px","marginBottom":"14px"}}>
          <span style={{"fontSize":"18px"}}>🤝</span>
          <h3 style={{"fontSize":"17px","fontWeight":"750","color":"var(--gray-900)","margin":"0"}}>Active Partnerships</h3>
        </div>
        <div id="collabList" style={{"display":"flex","flexDirection":"column","gap":"16px"}}></div>
      </div>

      {/* ── PROJECT COLLABORATION WORKSPACE ── */}
      <div id="section-project-workspace" className="dashboard-section" style={{"display":"none"}}>
        <div id="projectWorkspaceContainer" className="workspace-container">
          {/* Populated dynamically by renderProjectWorkspace() */}
        </div>
      </div>

      {/* ── INDUSTRY OPPORTUNITY & ROI CENTER ── */}
      <div id="section-roi" className="dashboard-section" style={{"display":"none"}}>
        <div id="opportunityRoiContainer" className="roi-container">
          {/* Populated dynamically by renderOpportunityRoiCenter() */}
        </div>
      </div>

      {/* ── INDUSTRY IMPACT & ANALYTICS ── */}
      <div id="section-impact" className="dashboard-section" style={{"display":"none"}}>
        <div id="impactAnalyticsContainer" className="impact-container">
          {/* Populated dynamically by renderImpactAnalytics() */}
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <div id="section-notifications" className="dashboard-section" style={{"display":"none"}}>
        <div style={{"marginBottom":"24px"}}><h2 style={{"fontSize":"22px","fontWeight":"800","color":"var(--gray-900)"}}>Notifications</h2></div>
        <div className="card"><div className="card-body" id="indNotifList"><div className="skeleton skeleton-card" style={{"height":"70px","marginBottom":"10px"}}></div></div></div>
      </div>

      {/* ── PAN-INDIA & DISTRICT HEATMAP ── */}
      <div id="section-heatmap" className="dashboard-section" style={{"display":"none"}}>
        <div className="section-header" style={{"marginBottom":"18px","display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"12px"}}>
          <div>
            <h2 style={{"fontSize":"22px","fontWeight":"800","color":"var(--gray-900)","margin":"0","display":"flex","alignItems":"center","gap":"8px"}}>
              <span>🗺️</span> Pan-India & District CSR Innovation Heatmap
            </h2>
            <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"4px"}}>
              Discover regional innovation gaps, district-level challenge clusters & high-impact CSR opportunities across Indian states.
            </div>
          </div>
          <div className="heatmap-legend" style={{"display":"flex","alignItems":"center","gap":"14px","background":"#ffffff","padding":"8px 16px","borderRadius":"12px","border":"1px solid var(--gray-200)","boxShadow":"var(--shadow-sm)"}}>
            <div className="hm-legend-item" style={{"display":"flex","alignItems":"center","gap":"6px","fontSize":"12px","fontWeight":"700","color":"var(--gray-700)"}}><div className="hm-dot" style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#DC2626"}}></div>High Priority / Urgent</div>
            <div className="hm-legend-item" style={{"display":"flex","alignItems":"center","gap":"6px","fontSize":"12px","fontWeight":"700","color":"var(--gray-700)"}}><div className="hm-dot" style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#D97706"}}></div>Medium Priority</div>
            <div className="hm-legend-item" style={{"display":"flex","alignItems":"center","gap":"6px","fontSize":"12px","fontWeight":"700","color":"var(--gray-700)"}}><div className="hm-dot" style={{"width":"10px","height":"10px","borderRadius":"50%","background":"#059669"}}></div>Low / Active R&D</div>
          </div>
        </div>

        <div className="heatmap-toolbar" style={{"display":"flex","alignItems":"center","gap":"14px","background":"#ffffff","padding":"14px 18px","borderRadius":"14px","border":"1px solid var(--gray-200)","marginBottom":"18px","flexWrap":"wrap","boxShadow":"var(--shadow-sm)"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            <span style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","whiteSpace":"nowrap"}}>📍 Select State:</span>
            <select id="industryStateSelect" className="form-control" style={{"minWidth":"260px","fontWeight":"750"}}>
              <option value="ALL">🇮🇳 All India (Overview & State Clusters)</option>
              <option value="Jharkhand" selected>Jharkhand (24 Districts Focus)</option>
            </select>
          </div>

          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            <span style={{"fontSize":"13px","fontWeight":"800","color":"var(--gray-600)","whiteSpace":"nowrap"}}>Domain:</span>
            <select id="industryMapCategoryFilter" className="form-control" style={{"minWidth":"180px","fontWeight":"600"}}>
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
            <span className="badge" style={{"background":"#EFF6FF","color":"#1E40AF","border":"1px solid #DBEAFE","fontSize":"11px","fontWeight":"750","padding":"4px 10px","borderRadius":"20px"}}>28 States & UTs</span>
            <span className="badge" style={{"background":"#DCFCE7","color":"#15803D","border":"1px solid #BBF7D0","fontSize":"11px","fontWeight":"750","padding":"4px 10px","borderRadius":"20px"}}>Live CSR Sync</span>
          </div>
        </div>

        <div className="grid-2" style={{"display":"grid","gridTemplateColumns":"1.6fr 1fr","gap":"20px","alignItems":"start"}}>
          <div id="industry-india-map" style={{"height":"540px","minHeight":"540px","width":"100%","borderRadius":"16px","boxShadow":"var(--shadow-md)","border":"1.5px solid var(--gray-200)","overflow":"hidden","background":"#f8fafc"}}></div>
          <div className="card" id="industryDistrictDetailPanel" style={{"borderRadius":"16px","border":"1px solid var(--gray-200)","background":"#ffffff","boxShadow":"var(--shadow-sm)"}}>
            <div className="card-body" style={{"textAlign":"center","padding":"40px"}}>
              <div style={{"fontSize":"40px","marginBottom":"10px"}}>🗺️</div>
              <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--gray-900)"}}>Select a State or Click a District</div>
              <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"4px"}}>Click any state cluster on the Pan-India map or choose from the dropdown to inspect district CSR funding opportunities.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROFILE ── */}
      <div id="section-profile" className="dashboard-section" style={{"display":"none"}}>
        <div className="profile-container">
          
          {/* Page Header */}
          <div className="profile-page-header">
            <div>
              <div className="profile-page-title">Partner Profile</div>
              <div className="profile-page-subtitle">Manage your organization's expertise, capabilities and collaboration preferences.</div>
            </div>
            <div style={{"display":"flex","gap":"10px","alignItems":"center"}}>
              <button type="button" className="btn btn-ghost" onClick={() => { cancelProfileEdit() }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => { saveIndustryProfile() }} style={{"display":"flex","alignItems":"center","gap":"7px"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Save Profile
              </button>
            </div>
          </div>

          {/* Hero Identity Card */}
          <div className="profile-identity-card">
            <div className="profile-identity-main">
              <div className="profile-avatar-box" id="identityAvatar">🏭</div>
              <div>
                <div className="profile-identity-name" id="identityCompanyName">Organization Name</div>
                <div className="profile-identity-meta">
                  <span className="badge badge-assigned" id="identityIndustryType">Industry</span>
                  <span>•</span>
                  <span id="identityLocation" style={{"display":"inline-flex","alignItems":"center","gap":"4px"}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Jharkhand</span>
                  </span>
                  <span>•</span>
                  <span className="badge badge-resolved" style={{"background":"var(--accent-50)","color":"var(--accent)","borderColor":"var(--accent-100)"}}>✓ Verified Partner</span>
                </div>
                <div className="profile-identity-desc" id="identityDescription">
                  Supporting higher education institutions and innovators in Jharkhand through corporate social responsibility, mentorship programs, student funding, and direct deployment partnerships.
                </div>
              </div>
            </div>

            {/* Profile Completion Progress */}
            <div className="profile-completion-card">
              <div className="completion-header">
                <span>Profile Completion</span>
                <span className="completion-percent-text" id="identityCompletionText">0%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" id="identityProgressBar" style={{"width":"0%"}}></div>
              </div>
              <div className="completion-subtext" id="identityCompletionHint">Complete all sections for AI matching</div>
            </div>
          </div>

          {/* Section 1: Organization Information */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>🏢</span> Organization Information
                </div>
                <div className="profile-section-subtitle">Basic details and public profile information about your enterprise</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="profCompanyName">Organization / Company Name <span className="required">*</span></label>
                  <input type="text" id="profCompanyName" className="form-control" placeholder="e.g., Tata Steel Foundation or ABC Technologies" oninput="onProfileFieldChange()" />
                  <div className="form-error" id="errCompanyName" style={{"display":"none"}}>Organization name is required</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="profIndustryType">Industry Type <span className="required">*</span></label>
                  <select id="profIndustryType" className="form-control" onChange={(e) => { onProfileFieldChange() }}>
                    <option value="">Select Industry Type</option>
                    <option value="Technology">Technology</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Energy">Energy</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Finance">Finance</option>
                    <option value="IT Services">IT Services</option>
                    <option value="MSME">MSME</option>
                    <option value="Startup">Startup</option>
                    <option value="CSR Organization">CSR Organization</option>
                    <option value="Research & Innovation">Research & Innovation</option>
                  </select>
                  <div className="form-error" id="errIndustryType" style={{"display":"none"}}>Please select an industry type</div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="profLocation">Operational Base / Location <span className="required">*</span></label>
                  <input type="text" id="profLocation" className="form-control" placeholder="e.g., Ranchi, Jharkhand" oninput="onProfileFieldChange()" />
                  <div className="form-error" id="errLocation" style={{"display":"none"}}>Location is required</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="profWebsite">Official Website</label>
                  <input type="url" id="profWebsite" className="form-control" placeholder="https://example.com" oninput="onProfileFieldChange()" />
                </div>
              </div>

              <div className="form-group" style={{"marginBottom":"0"}}>
                <label className="form-label" htmlFor="profDescription">Organization Description <span className="required">*</span></label>
                <textarea id="profDescription" className="form-control" rows="3" placeholder="Briefly describe your company's core focus, societal mission, and how you engage with regional innovators..." oninput="onProfileFieldChange()"></textarea>
                <div className="form-error" id="errDescription" style={{"display":"none"}}>Please provide a brief description</div>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Expertise */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>💡</span> Technical Expertise
                </div>
                <div className="profile-section-subtitle">Select the areas in which your organization has technical expertise</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div className="tags-container" id="expertiseTagsContainer">
                {/* Dynamic active tags rendered here */}
              </div>

              <div style={{"display":"flex","gap":"10px","marginBottom":"18px","maxWidth":"520px"}}>
                <input type="text" id="customExpertiseInput" className="form-control" placeholder="Add custom skill / domain..." onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomExpertise();}" />
                <button type="button" className="btn btn-primary" onClick={() => { addCustomExpertise() }} style={{"whiteSpace":"nowrap","display":"flex","alignItems":"center","gap":"6px"}}>
                  <span>+</span> Add Expertise
                </button>
              </div>

              <div className="suggestion-label">Suggested Technical Areas (Click to add):</div>
              <div className="suggestions-container" id="suggestedExpertiseContainer">
                {/* Suggested chips rendered here */}
              </div>
            </div>
          </div>

          {/* Section 3: Collaboration Capabilities */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>🤝</span> Collaboration Capabilities
                </div>
                <div className="profile-section-subtitle">How can your organization contribute? Select all that apply</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div className="selectable-grid" id="capabilitiesGrid">
                {/* 11 Selectable Capability Cards */}
              </div>
            </div>
          </div>

          {/* Section 4: Funding & Resources */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>💰</span> Available Resources
                </div>
                <div className="profile-section-subtitle">Specify operational resource capacity for AI matching with university projects</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="resFundingCapacity">Funding / Grant Capacity</label>
                  <select id="resFundingCapacity" className="form-control" onChange={(e) => { onProfileFieldChange() }}>
                    <option value="Not Available">Not Available</option>
                    <option value="Up to ₹1 Lakh">Up to ₹1 Lakh</option>
                    <option value="₹1–5 Lakh">₹1–5 Lakh</option>
                    <option value="₹5–10 Lakh">₹5–10 Lakh</option>
                    <option value="₹10–50 Lakh">₹10–50 Lakh</option>
                    <option value="₹50 Lakh+">₹50 Lakh+</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="resPrototypingCapability">Prototyping Capability</label>
                  <select id="resPrototypingCapability" className="form-control" onChange={(e) => { onProfileFieldChange() }}>
                    <option value="None">None</option>
                    <option value="Basic">Basic (Lab / Workshop support)</option>
                    <option value="Intermediate">Intermediate (Custom fabrication & toolkits)</option>
                    <option value="Advanced">Advanced (Full engineering, CNC, cleanrooms)</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{"marginBottom":"0"}}>
                <div className="form-group">
                  <label className="form-label" htmlFor="resFieldTestingCapability">Field Testing Capability</label>
                  <select id="resFieldTestingCapability" className="form-control" onChange={(e) => { onProfileFieldChange() }}>
                    <option value="No">No</option>
                    <option value="Limited">Limited (Selected sites / conditional)</option>
                    <option value="Yes">Yes (Full industrial / field testing grounds)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="resDeploymentCapability">Deployment Capability</label>
                  <select id="resDeploymentCapability" className="form-control" onChange={(e) => { onProfileFieldChange() }}>
                    <option value="No">No</option>
                    <option value="Limited">Limited (Pilot assistance)</option>
                    <option value="Yes">Yes (Enterprise rollout & supply chain)</option>
                  </select>
                </div>
              </div>

              <div style={{"display":"flex","alignItems":"center","gap":"10px","marginTop":"16px","padding":"12px 16px","background":"var(--primary-50)","borderRadius":"var(--radius-md)","border":"1px solid var(--primary-100)"}}>
                <span style={{"fontSize":"16px"}}>ℹ️</span>
                <span style={{"fontSize":"12.5px","color":"var(--primary-dark)","lineHeight":"1.5"}}>
                  <strong>Resource Matching Guarantee:</strong> These parameters are solely used to intelligently align your organization with appropriate challenge scales. No financial billing or payments are executed here.
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: CSR & Social Impact Focus */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>🌱</span> CSR & Social Impact Focus
                </div>
                <div className="profile-section-subtitle">Select the societal areas your organization is interested in supporting</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div className="pills-grid" id="csrFocusGrid">
                {/* CSR Focus Pills */}
              </div>
            </div>
          </div>

          {/* Section 6: Geographic Preference */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>📍</span> Preferred Collaboration Locations
                </div>
                <div className="profile-section-subtitle">Define the geographic boundary for on-ground project partnerships</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div className="radio-grid" id="geographicPrefGrid">
                {/* Anywhere in Jharkhand, Selected Districts, Remote / Online, On-site only, Hybrid */}
              </div>

              {/* Conditional District Selector */}
              <div className="districts-box" id="districtsContainer" style={{"display":"none"}}>
                <div className="districts-header">
                  <div><strong>Select Jharkhand Districts:</strong> (<span id="districtCount">0</span> selected)</div>
                  <div style={{"display":"flex","gap":"8px"}}>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { toggleAllDistricts(true) }}>Select All</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { toggleAllDistricts(false) }}>Clear</button>
                  </div>
                </div>
                <div className="pills-grid" id="districtsGrid">
                  {/* 24 Districts */}
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Collaboration Preferences */}
          <div className="profile-section-card">
            <div className="profile-section-header">
              <div>
                <div className="profile-section-title">
                  <span style={{"fontSize":"18px"}}>🎯</span> Collaboration Preferences
                </div>
                <div className="profile-section-subtitle">Set your organization's criteria for partner types and maturity stages</div>
              </div>
            </div>
            <div className="profile-section-body">
              <div style={{"marginBottom":"20px"}}>
                <label className="form-label" style={{"marginBottom":"10px"}}>Preferred Partner Types</label>
                <div className="selectable-grid" id="preferredPartnersGrid">
                  {/* Universities, Startups, MSMEs, etc. */}
                </div>
              </div>

              <div>
                <label className="form-label" style={{"marginBottom":"10px"}}>Preferred Project Maturity Stages</label>
                <div className="selectable-grid" id="preferredStagesGrid">
                  {/* Research, Ideation, Prototype, Pilot Testing, Deployment, Scale-up */}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="profile-actions-bar">
            <div className="ai-badge-note">
              <span className="ai-badge-icon">AI Ready</span>
              <span>Profile data is formatted for automated match scoring against regional problem statements.</span>
            </div>
            <div style={{"display":"flex","gap":"12px"}}>
              <button type="button" className="btn btn-ghost" onClick={() => { cancelProfileEdit() }}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={() => { saveIndustryProfile() }} style={{"display":"flex","alignItems":"center","gap":"8px","padding":"10px 24px"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Save Profile
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  </main>
</div>

{/* Collaborate on this Challenge Modal */}
<div className="modal-overlay" id="partnerModal">
  <div className="modal" style={{"maxWidth":"680px","borderRadius":"var(--radius-xl)","overflow":"hidden"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Collaborate on this Challenge</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Tell the university how your organization can contribute.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('partnerModal') }}>✕</button>
    </div>
    <div className="collab-modal-body">
      {/* Challenge Summary banner */}
      <div style={{"padding":"12px 16px","background":"var(--primary-50)","borderRadius":"var(--radius-md)","border":"1px solid var(--primary-100)","marginBottom":"20px","display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"8px"}}>
        <div>
          <div style={{"fontSize":"11px","fontWeight":"700","color":"var(--primary)","textTransform":"uppercase","letterSpacing":"0.5px"}} id="collabModalChallengeId">CHALLENGE</div>
          <div style={{"fontSize":"14px","fontWeight":"750","color":"var(--gray-900)","marginTop":"2px"}} id="partnerProjectTitle">Challenge Title</div>
        </div>
        <div id="collabModalUniversity" style={{"fontSize":"12px","color":"var(--gray-600)","background":"white","padding":"4px 10px","borderRadius":"var(--radius-full)","border":"1px solid var(--gray-200)","fontWeight":"600"}}>HEI Partner</div>
      </div>

      {/* STEP 1: Select Contribution */}
      <div className="collab-step-title">
        <span className="collab-step-num">1</span>
        <span>Select Your Organization's Contribution <span style={{"color":"var(--danger)"}}>*</span></span>
      </div>
      <div style={{"fontSize":"12px","color":"var(--gray-500)","marginBottom":"10px"}}>Choose at least one way your enterprise wishes to collaborate:</div>
      <div className="collab-card-grid" id="modalContributionGrid">
        {/* 9 Selectable Contribution Cards rendered by JS */}
      </div>
      <div className="form-error" id="errContributions" style={{"display":"none","marginBottom":"14px"}}>Please select at least one contribution type</div>

      {/* STEP 2: Funding Details (Conditional) */}
      <div id="conditionalFundingPanel" className="conditional-panel" style={{"display":"none"}}>
        <div className="collab-step-title" style={{"marginBottom":"6px"}}>
          <span className="collab-step-num">2</span>
          <span>Funding & CSR Allocation</span>
        </div>
        <div style={{"fontSize":"12px","color":"var(--gray-500)","marginBottom":"12px"}}>Specify the proposed grant scale and instrument (proposal only, no payment transaction):</div>
        <div className="form-row" style={{"marginBottom":"0"}}>
          <div className="form-group" style={{"marginBottom":"0"}}>
            <label className="form-label" htmlFor="collabFundingAmount">Proposed Funding Amount (₹) <span className="required">*</span></label>
            <input type="number" id="collabFundingAmount" className="form-control" placeholder="e.g. 250000" min="1000" step="5000" />
            <div className="form-error" id="errFundingAmount" style={{"display":"none"}}>Please enter a valid funding amount</div>
          </div>
          <div className="form-group" style={{"marginBottom":"0"}}>
            <label className="form-label" htmlFor="collabFundingType">Funding Type</label>
            <select id="collabFundingType" className="form-control">
              <option value="CSR">CSR Innovation Grant</option>
              <option value="Direct Project Funding">Direct Project Funding</option>
              <option value="Sponsorship">Student & Lab Sponsorship</option>
              <option value="Equipment Support">Equipment & Hardware Support</option>
              <option value="Other">Other Institutional Grant</option>
            </select>
          </div>
        </div>
      </div>

      {/* STEP 3: Mentorship Details (Conditional) */}
      <div id="conditionalMentorshipPanel" className="conditional-panel" style={{"display":"none"}}>
        <div className="collab-step-title" style={{"marginBottom":"6px"}}>
          <span className="collab-step-num">3</span>
          <span>Mentor Expertise Areas</span>
        </div>
        <div style={{"fontSize":"12px","color":"var(--gray-500)","marginBottom":"10px"}}>Select domain areas where your mentors will provide guidance:</div>
        <div className="pills-grid" id="modalMentorshipPills">
          {/* Mentorship expertise pills rendered by JS */}
        </div>
      </div>

      {/* STEP 4: Collaboration Message */}
      <div className="collab-step-title">
        <span className="collab-step-num">4</span>
        <span>Message to University <span style={{"color":"var(--danger)"}}>*</span></span>
      </div>
      <div className="form-group" style={{"marginBottom":"18px"}}>
        <textarea className="form-control" id="partnerMessage" rows="3" placeholder="Explain how your organization can support this project, available testbeds/facilities, or expectations for the partnership..."></textarea>
        <div className="form-error" id="errPartnerMessage" style={{"display":"none"}}>Please provide a collaboration message</div>
      </div>

      {/* STEP 5: Expected Timeline */}
      <div className="collab-step-title">
        <span className="collab-step-num">5</span>
        <span>Expected Collaboration Duration</span>
      </div>
      <div className="duration-pills-grid" id="modalDurationGrid">
        {/* Duration pills: < 1 Month, 1–3 Months, 3–6 Months, 6–12 Months, 12+ Months */}
      </div>

      {/* STEP 6: Contact Person */}
      <div className="collab-step-title">
        <span className="collab-step-num">6</span>
        <span>Industry Contact Representative</span>
      </div>
      <div className="form-row" style={{"marginBottom":"10px"}}>
        <div className="form-group" style={{"marginBottom":"0"}}>
          <label className="form-label" htmlFor="collabContactName">Contact Name <span className="required">*</span></label>
          <input type="text" id="collabContactName" className="form-control" placeholder="Contact Representative" />
          <div className="form-error" id="errContactName" style={{"display":"none"}}>Contact name is required</div>
        </div>
        <div className="form-group" style={{"marginBottom":"0"}}>
          <label className="form-label" htmlFor="collabContactDesignation">Designation</label>
          <input type="text" id="collabContactDesignation" className="form-control" placeholder="e.g. CSR Lead / VP Tech" />
        </div>
      </div>
      <div className="form-row" style={{"marginBottom":"0"}}>
        <div className="form-group" style={{"marginBottom":"0"}}>
          <label className="form-label" htmlFor="collabContactEmail">Work Email <span className="required">*</span></label>
          <input type="email" id="collabContactEmail" className="form-control" placeholder="email@company.com" />
          <div className="form-error" id="errContactEmail" style={{"display":"none"}}>Valid email is required</div>
        </div>
        <div className="form-group" style={{"marginBottom":"0"}}>
          <label className="form-label" htmlFor="collabContactPhone">Phone Number</label>
          <input type="tel" id="collabContactPhone" className="form-control" placeholder="e.g. 9876543210" />
        </div>
      </div>

    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
      <div style={{"fontSize":"12px","color":"var(--gray-500)"}}>Saved to industryCollaborationRequests</div>
      <div style={{"display":"flex","gap":"10px"}}>
        <button onClick={() => { closeModal('partnerModal') }} className="btn btn-ghost">Cancel</button>
        <button onClick={() => { submitPartnerInterest() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
          <span>📨</span> Send Collaboration Request
        </button>
      </div>
    </div>
  </div>
</div>

{/* Modal: Update Project Progress */}
<div className="modal-overlay" id="updateProgressModal">
  <div className="modal-container" style={{"maxWidth":"560px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Update Project Progress & Stage</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Update the current lifecycle stage and milestone completion percentage.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('updateProgressModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div className="form-group">
        <label className="form-label" htmlFor="progLifecycleStage">Current Lifecycle Stage <span className="required">*</span></label>
        <select id="progLifecycleStage" className="form-control">
          <option value="Problem Identified">1. Problem Identified</option>
          <option value="University Assigned">2. University Assigned</option>
          <option value="Solution Proposal">3. Solution Proposal</option>
          <option value="Industry Collaboration">4. Industry Collaboration</option>
          <option value="Prototype Development">5. Prototype Development</option>
          <option value="Field Testing">6. Field Testing</option>
          <option value="Community Feedback">7. Community Feedback</option>
          <option value="Improvement">8. Improvement</option>
          <option value="Deployment">9. Deployment</option>
          <option value="Impact Tracking">10. Impact Tracking</option>
        </select>
      </div>
      <div className="form-group">
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"6px"}}>
          <label className="form-label" htmlFor="progPercentInput" style={{"marginBottom":"0"}}>Overall Progress Completion (%) <span className="required">*</span></label>
          <span id="progPercentVal" style={{"fontWeight":"800","fontSize":"15px","color":"var(--primary)"}}>65%</span>
        </div>
        <input type="range" id="progPercentSlider" min="0" max="100" step="5" value="65" className="form-control" style={{"cursor":"pointer","accentColor":"var(--primary)","height":"8px","padding":"0"}} oninput="document.getElementById('progPercentVal').textContent = this.value + '%'; document.getElementById('progPercentInput').value = this.value" />
        <div style={{"marginTop":"6px","display":"flex","alignItems":"center","gap":"10px"}}>
          <input type="number" id="progPercentInput" min="0" max="100" value="65" className="form-control" style={{"width":"90px"}} oninput="document.getElementById('progPercentVal').textContent = this.value + '%'; document.getElementById('progPercentSlider').value = this.value" />
          <span style={{"fontSize":"12px","color":"var(--gray-500)"}}>Enter exact completion percentage (0 - 100%)</span>
        </div>
      </div>
      <div className="form-group" style={{"marginBottom":"0"}}>
        <label className="form-label" htmlFor="progDescription">Update Description / Activity Log Note <span className="required">*</span></label>
        <textarea id="progDescription" className="form-control" rows="3" placeholder="e.g. Completed telemetry hardware integration and bench trials at 42°C. Starting field deployment prep."></textarea>
        <div className="form-error" id="errProgDescription" style={{"display":"none"}}>Please provide a brief description of the progress update</div>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end","gap":"10px"}}>
      <button onClick={() => { closeModal('updateProgressModal') }} className="btn btn-ghost">Cancel</button>
      <button onClick={() => { saveProjectProgress() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
        <span>💾</span> Save Progress
      </button>
    </div>
  </div>
</div>

{/* Modal: Update Prototype Status */}
<div className="modal-overlay" id="updatePrototypeModal">
  <div className="modal-container" style={{"maxWidth":"560px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Update Prototype Status</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Log technical versioning, development milestones, and hardware notes.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('updatePrototypeModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="protoVersionInput">Prototype Version <span className="required">*</span></label>
          <input type="text" id="protoVersionInput" className="form-control" placeholder="e.g. Prototype V1.3" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="protoStageSelect">Prototype Stage</label>
          <select id="protoStageSelect" className="form-control">
            <option value="Design & Architecture">Design & Architecture</option>
            <option value="Bench Development">Bench Development</option>
            <option value="Prototype Assembly">Prototype Assembly</option>
            <option value="Pilot Prototype">Pilot Prototype</option>
            <option value="Field Testing">Field Testing</option>
            <option value="Ready for Deployment">Ready for Deployment</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="protoProgressInput">Technical Readiness Progress (%)</label>
        <input type="number" id="protoProgressInput" min="0" max="100" className="form-control" placeholder="e.g. 70" />
      </div>
      <div className="form-group" style={{"marginBottom":"0"}}>
        <label className="form-label" htmlFor="protoNotesInput">Technical Architecture Notes & Specifications <span className="required">*</span></label>
        <textarea id="protoNotesInput" className="form-control" rows="4" placeholder="Describe component changes, sensor calibrations, firmware versions, or lab bench observations..."></textarea>
        <div className="form-error" id="errProtoNotes" style={{"display":"none"}}>Please enter technical notes</div>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end","gap":"10px"}}>
      <button onClick={() => { closeModal('updatePrototypeModal') }} className="btn btn-ghost">Cancel</button>
      <button onClick={() => { savePrototypeStatus() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
        <span>🛠️</span> Update Prototype
      </button>
    </div>
  </div>
</div>

{/* Modal: Add Field Test Result */}
<div className="modal-overlay" id="addTestResultModal">
  <div className="modal-container" style={{"maxWidth":"580px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Log Field Testing Result</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Record on-ground pilot performance, community feedback, and issues.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('addTestResultModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="testLocationInput">Testing Location / Hamlet <span className="required">*</span></label>
          <input type="text" id="testLocationInput" className="form-control" placeholder="e.g. Latehar District, Cluster B" />
          <div className="form-error" id="errTestLocation" style={{"display":"none"}}>Location is required</div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="testDateInput">Test Date</label>
          <input type="date" id="testDateInput" className="form-control" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="testParticipantsInput">Participants / Sample Size</label>
          <input type="text" id="testParticipantsInput" className="form-control" placeholder="e.g. 50 households / 1 PHC Clinic" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="testSuccessRateInput">Success Rate (%) <span className="required">*</span></label>
          <input type="number" id="testSuccessRateInput" min="0" max="100" className="form-control" placeholder="e.g. 85" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="testResultSelect">Overall Outcome</label>
        <select id="testResultSelect" className="form-control">
          <option value="Completed - Passed">Completed - Passed</option>
          <option value="Completed - Conditional Pass">Completed - Conditional Pass</option>
          <option value="Iterating on Issues">Iterating on Issues</option>
          <option value="Scheduled">Scheduled</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="testIssuesInput">Issues Identified / Remediation</label>
        <textarea id="testIssuesInput" className="form-control" rows="2" placeholder="e.g. Sensor battery discharge under overcast skies, cable routing needs weatherproofing..."></textarea>
      </div>
      <div className="form-group" style={{"marginBottom":"0"}}>
        <label className="form-label" htmlFor="testFeedbackInput">Community Feedback & Observations</label>
        <textarea id="testFeedbackInput" className="form-control" rows="2" placeholder="e.g. Positive community reaction to continuous night lighting; villagers requested additional mobile charging node."></textarea>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end","gap":"10px"}}>
      <button onClick={() => { closeModal('addTestResultModal') }} className="btn btn-ghost">Cancel</button>
      <button onClick={() => { saveFieldTestResult() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
        <span>🧪</span> Save Test Result
      </button>
    </div>
  </div>
</div>

{/* Modal: Upload Project Document */}
<div className="modal-overlay" id="uploadDocModal">
  <div className="modal-container" style={{"maxWidth":"520px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Upload Project Document</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Attach project agreements, specifications, reports, or test data.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('uploadDocModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div className="form-group">
        <label className="form-label" htmlFor="docTitleInput">Document Title <span className="required">*</span></label>
        <input type="text" id="docTitleInput" className="form-control" placeholder="e.g. Field Trial Phase 1 Telemetry Report" />
        <div className="form-error" id="errDocTitle" style={{"display":"none"}}>Document title is required</div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="docTypeSelect">Document Type</label>
        <select id="docTypeSelect" className="form-control">
          <option value="Solution Proposal">Solution Proposal</option>
          <option value="Technical Requirements">Technical Requirements</option>
          <option value="Prototype Specification">Prototype Specification</option>
          <option value="Testing Report">Testing Report</option>
          <option value="Project Agreement">Project Agreement</option>
          <option value="Field Observation Notes">Field Observation Notes</option>
          <option value="Other">Other Technical Annexure</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="docUploaderInput">Uploaded By</label>
        <input type="text" id="docUploaderInput" className="form-control" placeholder="e.g. Industry Technical Lead" />
      </div>
      <div className="form-group" style={{"marginBottom":"0"}}>
        <label className="form-label" htmlFor="docFileInput">Select File (PDF, DOCX, XLSX, ZIP)</label>
        <input type="file" id="docFileInput" className="form-control" style={{"padding":"8px 12px"}} />
        <div style={{"fontSize":"11px","color":"var(--gray-400)","marginTop":"4px"}}>Prototype mode: local selection simulation (persisted in browser storage)</div>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end","gap":"10px"}}>
      <button onClick={() => { closeModal('uploadDocModal') }} className="btn btn-ghost">Cancel</button>
      <button onClick={() => { saveProjectDocument() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
        <span>📎</span> Upload Document
      </button>
    </div>
  </div>
</div>

{/* Modal: Generate Impact Report */}
<div className="modal-overlay" id="impactReportModal">
  <div className="modal-container" style={{"maxWidth":"760px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Industry Impact & CSR Audit Report</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Formal social accountability summary for CSR directors and institutional authorities.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('impactReportModal') }}>✕</button>
    </div>
    <div className="modal-body" id="impactReportPrintArea" style={{"padding":"24px","maxHeight":"75vh","overflowY":"auto"}}>
      {/* Populated dynamically by generateImpactReport() */}
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
      <div style={{"fontSize":"12px","color":"var(--gray-500)"}}>Generated via JanSetu Platform • SIH 2026 Problem 26043</div>
      <div style={{"display":"flex","gap":"10px"}}>
        <button onClick={() => { closeModal('impactReportModal') }} className="btn btn-ghost">Close</button>
        <button onClick={() => { printImpactReport() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
          <span>🖨️</span> Print / Save PDF
        </button>
      </div>
    </div>
  </div>
</div>

{/* Modal: Add Industry Technical Feedback */}
<div className="modal-overlay" id="addIndustryFeedbackModal">
  <div className="modal-container" style={{"maxWidth":"540px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Add Industry Review & Feedback</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Provide industry technical advisory and evaluation for the university project team.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('addIndustryFeedbackModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="feedReviewerName">Reviewer Name <span className="required">*</span></label>
          <input type="text" id="feedReviewerName" className="form-control" value="Vikram Sinha" placeholder="Your name" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="feedReviewerRole">Organization / Role</label>
          <input type="text" id="feedReviewerRole" className="form-control" value="Industry Mentor & Technical Lead (ABC Technologies)" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="feedRatingSelect">Overall Technical Rating <span className="required">*</span></label>
        <select id="feedRatingSelect" className="form-control">
          <option value="5">★★★★★ 5/5 - Outstanding Progress</option>
          <option value="4" selected>★★★★☆ 4/5 - Strong Engineering & Validated Prototype</option>
          <option value="3">★★★☆☆ 3/5 - Satisfactory with Iterations Required</option>
          <option value="2">★★☆☆☆ 2/5 - Major Technical Gaps</option>
          <option value="1">★☆☆☆☆ 1/5 - Unsatisfactory</option>
        </select>
      </div>
      <div className="form-group" style={{"marginBottom":"0"}}>
        <label className="form-label" htmlFor="feedCommentText">Technical Feedback & Recommendations <span className="required">*</span></label>
        <textarea id="feedCommentText" className="form-control" rows="4" placeholder="e.g., The prototype demonstrates promising sensor integration. Improve battery efficiency before field deployment..."></textarea>
        <div className="form-error" id="errFeedComment" style={{"display":"none"}}>Please enter your feedback comments</div>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end","gap":"10px"}}>
      <button onClick={() => { closeModal('addIndustryFeedbackModal') }} className="btn btn-ghost">Cancel</button>
      <button onClick={() => { submitIndustryFeedback() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
        <span>⭐</span> Submit Feedback
      </button>
    </div>
  </div>
</div>

{/* Modal: Post Project Update / Communication */}
<div className="modal-overlay" id="postProjectUpdateModal">
  <div className="modal-container" style={{"maxWidth":"540px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Post Project Update</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Share an update, technical note, or request with the university project team.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('postProjectUpdateModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div className="form-group">
        <label className="form-label" htmlFor="updateSenderSelect">Posting As</label>
        <select id="updateSenderSelect" className="form-control">
          <option value="Industry Mentor (Vikram Sinha)">Industry Mentor (Vikram Sinha)</option>
          <option value="Technical Expert (Arjun Mehta)">Technical Expert (Arjun Mehta)</option>
          <option value="ABC Technologies CSR Desk">ABC Technologies CSR Desk</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="updateMessageText">Message / Discussion Note <span className="required">*</span></label>
        <textarea id="updateMessageText" className="form-control" rows="3" placeholder="e.g., Please share the updated prototype documentation before the weekly sync."></textarea>
        <div className="form-error" id="errUpdateMessage" style={{"display":"none"}}>Message text cannot be empty</div>
      </div>
      <div className="form-group" style={{"marginBottom":"0"}}>
        <label className="form-label" htmlFor="updateAttachmentName">Attachment Name (Optional)</label>
        <input type="text" id="updateAttachmentName" className="form-control" placeholder="e.g. telemetry_calibration_spec_v1.pdf" />
        <div style={{"fontSize":"11.5px","color":"var(--gray-400)","marginTop":"4px"}}>Prototype mode: local simulated attachment name</div>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end","gap":"10px"}}>
      <button onClick={() => { closeModal('postProjectUpdateModal') }} className="btn btn-ghost">Cancel</button>
      <button onClick={() => { submitProjectUpdate() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
        <span>📨</span> Post Update
      </button>
    </div>
  </div>
</div>

{/* Modal: Project Collaboration Status Report */}
<div className="modal-overlay" id="projectReportModal">
  <div className="modal-container" style={{"maxWidth":"800px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Project Collaboration Comprehensive Report</div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Summary report for university faculty, student leads, and industry CSR directors.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('projectReportModal') }}>✕</button>
    </div>
    <div className="modal-body" id="projectReportPrintArea" style={{"padding":"24px","maxHeight":"75vh","overflowY":"auto"}}>
      {/* Populated dynamically by openProjectReportModal() */}
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
      <div style={{"fontSize":"12px","color":"var(--gray-500)"}}>JanSetu • SIH 2026 Problem 26043</div>
      <div style={{"display":"flex","gap":"10px"}}>
        <button onClick={() => { closeModal('projectReportModal') }} className="btn btn-ghost">Close</button>
        <button onClick={() => { printProjectReport() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
          <span>🖨️</span> Print / Save PDF
        </button>
      </div>
    </div>
  </div>
</div>

{/* Modal: Prototype Telemetry & Live Monitor */}
<div className="modal-overlay" id="viewPrototypeModal">
  <div className="modal-container" style={{"maxWidth":"720px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
          <div className="modal-title" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Smart Irrigation Prototype v1.0 — Live Telemetry</div>
          <span className="badge badge-assigned" style={{"fontSize":"11px"}}>● LIVE STREAM</span>
        </div>
        <div style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>IoT soil moisture sensing and automated solenoid valve control test bench.</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('viewPrototypeModal') }}>✕</button>
    </div>
    <div className="modal-body" style={{"padding":"22px 24px"}}>
      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"12px","marginBottom":"18px"}}>
        <div style={{"padding":"14px","background":"#f8fafc","border":"1px solid var(--gray-200)","borderRadius":"var(--radius-md)","textAlign":"center"}}>
          <div style={{"fontSize":"11px","fontWeight":"700","color":"var(--gray-500)"}}>SOIL MOISTURE</div>
          <div style={{"fontSize":"22px","fontWeight":"850","color":"#059669","marginTop":"4px"}} id="protoMoistureVal">42%</div>
          <div style={{"fontSize":"11px","color":"#059669","marginTop":"2px"}}>Optimal Threshold</div>
        </div>
        <div style={{"padding":"14px","background":"#f8fafc","border":"1px solid var(--gray-200)","borderRadius":"var(--radius-md)","textAlign":"center"}}>
          <div style={{"fontSize":"11px","fontWeight":"700","color":"var(--gray-500)"}}>SOIL TEMP</div>
          <div style={{"fontSize":"22px","fontWeight":"850","color":"#1a56db","marginTop":"4px"}}>28.4°C</div>
          <div style={{"fontSize":"11px","color":"var(--gray-500)","marginTop":"2px"}}>Ambient Ambient</div>
        </div>
        <div style={{"padding":"14px","background":"#f8fafc","border":"1px solid var(--gray-200)","borderRadius":"var(--radius-md)","textAlign":"center"}}>
          <div style={{"fontSize":"11px","fontWeight":"700","color":"var(--gray-500)"}}>VALVE STATUS</div>
          <div style={{"fontSize":"16px","fontWeight":"850","color":"#b45309","marginTop":"8px"}} id="protoValveStatus">CLOSED (Idle)</div>
          <div style={{"fontSize":"11px","color":"var(--gray-500)","marginTop":"2px"}}>Auto-scheduled</div>
        </div>
        <div style={{"padding":"14px","background":"#f8fafc","border":"1px solid var(--gray-200)","borderRadius":"var(--radius-md)","textAlign":"center"}}>
          <div style={{"fontSize":"11px","fontWeight":"700","color":"var(--gray-500)"}}>BATTERY / SOLAR</div>
          <div style={{"fontSize":"22px","fontWeight":"850","color":"#059669","marginTop":"4px"}}>88%</div>
          <div style={{"fontSize":"11px","color":"#059669","marginTop":"2px"}}>Solar Charging</div>
        </div>
        <div style={{"padding":"14px","background":"#f8fafc","border":"1px solid var(--gray-200)","borderRadius":"var(--radius-md)","textAlign":"center"}}>
          <div style={{"fontSize":"11px","fontWeight":"700","color":"var(--gray-500)"}}>LoRaWAN RSSI</div>
          <div style={{"fontSize":"20px","fontWeight":"850","color":"#1a56db","marginTop":"4px"}}>-92 dBm</div>
          <div style={{"fontSize":"11px","color":"#059669","marginTop":"2px"}}>Strong Signal</div>
        </div>
      </div>

      <div style={{"background":"#0f172a","color":"#e2e8f0","borderRadius":"var(--radius-md)","padding":"16px","fontFamily":"monospace","fontSize":"12px","lineHeight":"1.6","marginBottom":"16px","maxHeight":"160px","overflowY":"auto"}}>
        <div style={{"color":"#38bdf8"}}>[2026-09-07 16:20:01] Gateway RX: Node 0x7229 - RSSI: -92dBm, SNR: 8.5dB</div>
        <div style={{"color":"#4ade80"}}>[2026-09-07 16:20:01] Sensor Telemetry: VWC=42.1%, T=28.4C, Batt=4.12V (88%)</div>
        <div style={{"color":"#facc15"}}>[2026-09-07 16:20:02] Rule Engine: Soil moisture within target range [35% - 55%]. Valve remains CLOSED.</div>
        <div style={{"color":"#e2e8f0"}}>[2026-09-07 16:20:02] MQTT Publish -&gt; topic "jharkhand/ranchi/irrigation/telemetry" [OK]</div>
      </div>

      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","background":"#f8fafc","padding":"12px 16px","borderRadius":"var(--radius-md)","border":"1px solid var(--gray-200)"}}>
        <span style={{"fontSize":"13px","fontWeight":"650","color":"var(--gray-700)"}}>Simulate Manual Test Valve Pulse (5 seconds):</span>
        <button className="btn btn-sm btn-outline-primary" onClick={() => { simulateValvePulse() }} id="btnSimValve">
          ⚡ Trigger Valve Pulse
        </button>
      </div>
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"14px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"flex-end"}}>
      <button onClick={() => { closeModal('viewPrototypeModal') }} className="btn btn-primary">Done</button>
    </div>
  </div>
</div>

{/* Modal: Document Viewer Preview */}
<div className="modal-overlay" id="documentPreviewModal">
  <div className="modal-container" style={{"maxWidth":"680px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div className="modal-title" id="docPreviewModalTitle" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Document Viewer</div>
        <div id="docPreviewModalSub" style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>Project Documentation • JanSetu Repository</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('documentPreviewModal') }}>✕</button>
    </div>
    <div className="modal-body" id="docPreviewModalBody" style={{"padding":"24px","maxHeight":"70vh","overflowY":"auto","fontSize":"13.5px","color":"var(--gray-700)","lineHeight":"1.6"}}>
      {/* Populated dynamically by viewDocument() */}
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
      <div style={{"fontSize":"12px","color":"var(--gray-500)"}}>Digital Verification Certified</div>
      <div style={{"display":"flex","gap":"10px"}}>
        <button onClick={() => { closeModal('documentPreviewModal') }} className="btn btn-ghost">Close</button>
        <button onClick={() => { triggerDocDownloadFromModal() }} className="btn btn-primary" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
          <span>⬇️</span> Download File
        </button>
      </div>
    </div>
  </div>
</div>

{/* Modal: Opportunity Detailed Analysis Breakdown */}
<div className="modal-overlay" id="opportunityAnalysisModal">
  <div className="modal-container" style={{"maxWidth":"760px"}}>
    <div className="modal-header" style={{"background":"#fafbfc","padding":"20px 24px","borderBottom":"1px solid var(--gray-200)"}}>
      <div>
        <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
          <div className="modal-title" id="oppModalTitle" style={{"fontSize":"18px","fontWeight":"800","color":"var(--gray-900)"}}>Opportunity Score Breakdown</div>
          <span className="badge badge-resolved" id="oppModalScoreBadge" style={{"fontSize":"12px","fontWeight":"800"}}>96/100</span>
        </div>
        <div id="oppModalSub" style={{"fontSize":"13px","color":"var(--gray-500)","marginTop":"3px"}}>CSR & Industry Strategic Fit Multi-Pillar Analysis</div>
      </div>
      <button className="modal-close" onClick={() => { closeModal('opportunityAnalysisModal') }}>✕</button>
    </div>
    <div className="modal-body" id="oppModalBody" style={{"padding":"24px","maxHeight":"75vh","overflowY":"auto"}}>
      {/* Populated dynamically by openOpportunityAnalysisModal() */}
    </div>
    <div className="modal-footer" style={{"background":"#fafbfc","padding":"16px 24px","borderTop":"1px solid var(--gray-200)","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
      <div style={{"fontSize":"12px","color":"var(--gray-500)"}}>SIH 2026 Problem Statement 26043 • JanSetu AI Scoring</div>
      <div style={{"display":"flex","gap":"10px"}} id="oppModalFooterActions">
        <button onClick={() => { closeModal('opportunityAnalysisModal') }} className="btn btn-ghost">Close</button>
      </div>
    </div>
  </div>
</div>

<div id="toast-container"></div>




    </>
  );
}

export default App;
