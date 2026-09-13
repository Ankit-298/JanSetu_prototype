import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ExploreChallenges.css';

// 5 Administrative Divisions & 24 Districts of Jharkhand
const JHARKHAND_DIVISIONS = {
  'South Chotanagpur': ['Ranchi', 'Khunti', 'Gumla', 'Simdega', 'Lohardaga'],
  'North Chotanagpur': ['Hazaribagh', 'Dhanbad', 'Bokaro', 'Giridih', 'Ramgarh', 'Koderma', 'Chatra'],
  'Kolhan': ['East Singhbhum', 'West Singhbhum', 'Seraikela Kharsawan'],
  'Santhal Pargana': ['Deoghar', 'Dumka', 'Godda', 'Sahebganj', 'Pakur', 'Jamtara'],
  'Palamu': ['Palamu', 'Garhwa', 'Latehar']
};

const CATEGORIES = [
  { id: 'All', label: 'All Categories', icon: '🌐', cls: 'cat-all' },
  { id: 'Disaster Management', label: 'Disaster Management', icon: '🚨', cls: 'cat-disaster' },
  { id: 'Infrastructure', label: 'Infrastructure', icon: '🏗️', cls: 'cat-infra' },
  { id: 'Healthcare', label: 'Healthcare', icon: '🩺', cls: 'cat-health' },
  { id: 'Environment', label: 'Environment', icon: '🌳', cls: 'cat-env' },
  { id: 'Smart City', label: 'Smart City', icon: '🏙️', cls: 'cat-smart' },
  { id: 'Education', label: 'Education', icon: '🏫', cls: 'cat-edu' },
  { id: 'Water & Sanitation', label: 'Water & Sanitation', icon: '💧', cls: 'cat-water' },
  { id: 'Agriculture', label: 'Agriculture', icon: '🌾', cls: 'cat-agri' }
];

// Helper: Circular initials avatar with vibrant gradient
export function getInitials(name) {
  if (!name) return 'CS';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarGradient(name) {
  const gradients = [
    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', // Royal Blue
    'linear-gradient(135deg, #059669 0%, #047857 100%)', // Emerald
    'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', // Purple
    'linear-gradient(135deg, #D97706 0%, #B45309 100%)', // Amber
    'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)', // Rose
    'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', // Sky Blue
    'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', // Indigo
    'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'  // Orange
  ];
  let hash = 0;
  const str = (name || 'Citizen').toString();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

// Relative time formatting
function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatExactDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

// Fallback images for civic problems
const DEFAULT_CIVIC_IMAGES = [
  '/others/images/water-tap.jpg',
  '/others/images/pothole-road.jpg',
  '/others/images/garbage-street.jpg',
  '/others/images/street-light.jpg',
  '/others/images/flood_alert_success.jpg'
];

export default function ExploreChallenges({ onNavigateDashboard }) {
  // State
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(124);

  // Filters
  const [locationScope, setLocationScope] = useState('all'); // 'all' | 'district' | 'nearby'
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('latest');
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyRadius, setNearbyRadius] = useState(10);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [newReportsCount, setNewReportsCount] = useState(0);
  const [showNewReportsBanner, setShowNewReportsBanner] = useState(false);
  const [compactTrackerChallenge, setCompactTrackerChallenge] = useState(null);
  const latestChallengeTimeRef = useRef(null);

  // Current logged in citizen info (Rajesh Mahto by default demo profile)
  const [currentUser, setCurrentUser] = useState({
    id: '67cb56000000000000000002',
    name: 'Rajesh Mahto',
    role: 'citizen',
    district: 'Ranchi'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
      }
    } catch (e) {}
  }, []);

  // Fetch feed
  const fetchFeed = useCallback(async (cursor = null, isFresh = false) => {
    try {
      if (isFresh) {
        setLoading(true);
        if (typeof window !== 'undefined' && typeof window.showJanSetuCivicLoader === 'function') {
          window.showJanSetuCivicLoader('Loading Explore Challenges...', { autoDismiss: false });
        }
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.append('limit', '8');
      const sortParam = sortBy === 'affected' ? 'most-affected' : sortBy === 'supported' ? 'supported' : 'recent';
      params.append('sort', sortParam);

      if (selectedCategory && selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      if (locationScope === 'district' && selectedDistrict) {
        params.append('district', selectedDistrict);
      }

      if (locationScope === 'nearby' && userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radius', nearbyRadius.toString());
      }

      if (cursor && !isFresh) {
        params.append('cursor', cursor);
      }

      const res = await fetch(`/api/challenges/feed?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        if (isFresh) {
          setChallenges(json.data || []);
          if (json.data && json.data.length > 0) {
            latestChallengeTimeRef.current = json.data[0].createdAt;
          }
        } else {
          setChallenges(prev => {
            const existingIds = new Set(prev.map(c => c._id));
            const newItems = (json.data || []).filter(c => !existingIds.has(c._id));
            return [...prev, ...newItems];
          });
        }
        setNextCursor(json.nextCursor || null);
        setHasMore(Boolean(json.hasMore));
        if (json.pagination && json.pagination.total) {
          setTotalCount(json.pagination.total);
        }
      }
    } catch (err) {
      console.error('Failed to load social feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (typeof window !== 'undefined' && typeof window.hideJanSetuCivicLoader === 'function') {
        window.hideJanSetuCivicLoader();
      }
    }
  }, [locationScope, selectedDistrict, selectedCategory, sortBy, userLocation, nearbyRadius]);

  // Initial load & filter change
  useEffect(() => {
    fetchFeed(null, true);
  }, [fetchFeed]);

  // Real-time poller for new civic challenge reports
  useEffect(() => {
    const checkNewReports = async () => {
      if (!latestChallengeTimeRef.current) return;
      try {
        const res = await fetch('/api/challenges/feed?limit=6&sort=recent');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const latestLoadedTime = new Date(latestChallengeTimeRef.current).getTime();
          const newItems = json.data.filter(c => new Date(c.createdAt).getTime() > latestLoadedTime);
          if (newItems.length > 0) {
            setNewReportsCount(newItems.length);
            setShowNewReportsBanner(true);
          }
        }
      } catch (e) {
        // silent polling catch
      }
    };

    const interval = setInterval(checkNewReports, 10000);
    return () => clearInterval(interval);
  }, []);

  // IntersectionObserver for Infinite Scroll
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextCursor) {
          fetchFeed(nextCursor, false);
        }
      },
      { rootMargin: '300px' }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, nextCursor, fetchFeed]);

  // Handle Nearby GPS Turn On
  const handleTurnOnGps = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationScope('nearby');
          setSelectedDistrict('');
          setGpsLoading(false);
          setShowGpsModal(false);
        },
        err => {
          console.warn('Geolocation denied or timed out, using center Ranchi:', err);
          setUserLocation({ lat: 23.3441, lng: 85.3096 });
          setLocationScope('nearby');
          setSelectedDistrict('');
          setGpsLoading(false);
          setShowGpsModal(false);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      setUserLocation({ lat: 23.3441, lng: 85.3096 });
      setLocationScope('nearby');
      setSelectedDistrict('');
      setGpsLoading(false);
      setShowGpsModal(false);
    }
  };

  // Handle Turn Off GPS
  const handleTurnOffGps = () => {
    setUserLocation(null);
    setLocationScope('all');
    setShowGpsModal(false);
  };

  // Scroll to top
  const handleTapNewReports = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewReportsBanner(false);
    setNewReportsCount(0);
    fetchFeed(null, true);
  };

  return (
    <div className="explore-page-wrapper">
      {/* ── Top Panorama Hero Banner ── */}
      <div className="explore-hero-card">
        <img
          src="/citizen/images/india-gate-sunset.jpg"
          className="explore-hero-bg"
          alt="Explore Challenges Banner"
          onError={(e) => {
            e.target.src = '/citizen/images/india-gate-panoramic.jpg';
          }}
        />
        <div className="explore-hero-content">
          <div className="explore-hero-badge">
            <span style={{
              background: 'rgba(249, 115, 22, 0.35)',
              color: '#FFEDD5',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '9.5px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center'
            }}>IN</span>
            <span>JANSETU CIVIC FEED</span>
          </div>
          <h1 className="explore-hero-title">
            <span className="explore-accent">Explore</span> Challenges
          </h1>
          <p className="explore-hero-subtitle">Real problems. Real people. Real impact.</p>
          <p className="explore-hero-desc">Discover civic issues from across Jharkhand and help turn them into solutions.</p>
        </div>
      </div>

      {/* ── Location Scope & Filters Bar ── */}
      <div className="explore-controls-card">
        {/* Scope selector row */}
        <div className="explore-scope-row">
          <div className="explore-scope-left">
            <span className="explore-scope-label">
              <span>Location Scope</span>
              <span title="Filter challenges by geographical reach">ℹ️</span>
            </span>

            {/* All Jharkhand */}
            <button
              type="button"
              className={`scope-pill-btn scope-all ${locationScope === 'all' ? 'active' : ''}`}
              onClick={() => { setLocationScope('all'); setSelectedDistrict(''); }}
            >
              {locationScope === 'all' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#16A34A">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}
              <span>All Jharkhand</span>
            </button>

            {/* Select District Dropdown */}
            <div className={`scope-select-wrapper ${locationScope === 'district' && selectedDistrict ? 'active' : ''}`}>
              {locationScope === 'district' && selectedDistrict ? (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="#2563EB">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#94A3B8" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}
              <select
                className="scope-district-select"
                value={selectedDistrict}
                onChange={e => {
                  const dist = e.target.value;
                  setSelectedDistrict(dist);
                  if (dist) setLocationScope('district');
                  else setLocationScope('all');
                }}
              >
                <option value="">Select District ▾</option>
                {Object.entries(JHARKHAND_DIVISIONS).map(([division, districts]) => (
                  <optgroup key={division} label={`— ${division} Division —`}>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Nearby (Use my location) */}
            <button
              type="button"
              className={`scope-pill-btn scope-nearby ${locationScope === 'nearby' ? 'active' : ''}`}
              onClick={() => {
                if (locationScope === 'nearby') {
                  setShowGpsModal(true);
                } else if (userLocation) {
                  setLocationScope('nearby');
                  setSelectedDistrict('');
                } else {
                  handleTurnOnGps();
                }
              }}
              title="Filter civic problems near your current location"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={locationScope === 'nearby' ? '#2563EB' : '#94A3B8'} strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={locationScope === 'nearby' ? '#2563EB' : '#94A3B8'} />
              </svg>
              <span>{gpsLoading ? 'Locating...' : 'Nearby (Use my location)'}</span>
            </button>

            {/* Within 10 km */}
            <select
              className={`scope-radius-select ${locationScope === 'nearby' ? 'active' : ''}`}
              value={nearbyRadius}
              onChange={e => {
                const r = Number(e.target.value);
                setNearbyRadius(r);
                if (locationScope !== 'nearby') {
                  if (userLocation) {
                    setLocationScope('nearby');
                    setSelectedDistrict('');
                  } else {
                    handleTurnOnGps();
                  }
                }
              }}
            >
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="explore-sort-wrapper">
            <span className="explore-sort-label">Sort by</span>
            <select
              className="explore-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="latest">Latest</option>
              <option value="affected">Most Affected (I Am Also Affected)</option>
              <option value="supported">Most Praised</option>
            </select>
          </div>
        </div>

        {/* Category Pills Row */}
        <div className="explore-categories-row">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`explore-cat-pill ${cat.cls || ''} ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Indicator Ribbon ── */}
      {/* ── Live Indicator Ribbon (Matching Image 1) ── */}
      <div className="explore-live-ribbon">
        <div className="explore-live-left">
          <div className="explore-live-pin-circle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#16A34A">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <div className="explore-live-scope-text">
              <span>Showing: </span>
              <span className="explore-live-scope-highlight">
                {locationScope === 'district' && selectedDistrict ? `${selectedDistrict} District` : locationScope === 'nearby' ? `Near You (Within ${nearbyRadius} km)` : 'All Jharkhand'}
              </span>
            </div>
            <div className="explore-live-subtext">
              {locationScope === 'nearby'
                ? `Showing civic problems within ${nearbyRadius} km of your GPS location`
                : `Showing all reported problems from across ${locationScope === 'district' && selectedDistrict ? selectedDistrict : 'Jharkhand'}`
              }
            </div>
          </div>
        </div>

        <div className="explore-live-right">
          <div className="explore-live-count-badge">
            <span className="pulse-dot"></span>
            <span>{totalCount} problems ● Live</span>
          </div>

          {showNewReportsBanner && (
            <button
              type="button"
              className="explore-new-reports-btn"
              onClick={handleTapNewReports}
            >
              <span>((●))</span>
              <span>{newReportsCount} new reports · Tap to see latest ↑</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Social Feed Post Cards ── */}
      <div className="explore-feed-list">
        {loading && challenges.length === 0 ? (
          <div className="explore-feed-loading-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '50px 24px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 30px rgba(0, 45, 98, 0.06)',
            textAlign: 'center',
            margin: '16px 0'
          }}>
            <div style={{
              position: 'relative',
              width: '76px',
              height: '76px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2.5px dashed rgba(0, 45, 98, 0.25)',
                animation: 'civicChakraSpin 12s linear infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '4px solid transparent',
                borderTopColor: '#FF9933',
                borderRightColor: '#002D62',
                borderBottomColor: '#138808',
                borderLeftColor: 'transparent',
                animation: 'civicCircleSpin 1s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite'
              }}></div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#002D62',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 45, 98, 0.35)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '18px'
              }}>
                🏛️
              </div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
              Loading Civic Challenges...
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '340px', lineHeight: '1.5' }}>
              Connecting to Jharkhand GIS database & community grievance feed...
            </div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="empty-feed-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '40px' }}>📍</span>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '8px' }}>
              {locationScope === 'nearby' ? `No civic problems found within ${nearbyRadius} km` : 'No challenges found'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              {locationScope === 'nearby' 
                ? 'Try selecting a larger radius (25 km or 50 km) to see more nearby reports.'
                : "Try choosing another district or selecting 'All Categories'."
              }
            </div>
            {locationScope === 'nearby' && nearbyRadius < 50 && (
              <button
                type="button"
                style={{ marginTop: '12px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, borderRadius: '8px', background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={() => setNearbyRadius(nearbyRadius === 5 ? 10 : nearbyRadius === 10 ? 25 : 50)}
              >
                Expand Radius to {nearbyRadius === 5 ? '10 km' : nearbyRadius === 10 ? '25 km' : '50 km'} →
              </button>
            )}
          </div>
        ) : (
          challenges.map((challenge, idx) => (
            <SocialPostCard
              key={challenge._id || idx}
              challenge={challenge}
              currentUser={currentUser}
              onOpenTracker={(c) => setCompactTrackerChallenge(c)}
            />
          ))
        )}

        {/* Sentinel element for infinite scroll */}
        <div ref={sentinelRef} style={{ height: '20px' }}>
          {loadingMore && <SkeletonCard />}
        </div>
      </div>

      {/* ── GPS Location Permission Popup Modal Card ── */}
      {showGpsModal && (
        <div className="gps-modal-overlay" onClick={() => setShowGpsModal(false)}>
          <div className="gps-modal-card" onClick={e => e.stopPropagation()}>
            <div className="gps-modal-header">
              <div className="gps-modal-icon-badge">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2563EB" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#2563EB" />
                </svg>
              </div>
              <div className="gps-modal-title-group">
                <h3 className="gps-modal-title">Allow GPS Location Access?</h3>
                <span className="gps-modal-sub">Nearby Grievances &amp; Community Radar</span>
              </div>
              <button
                type="button"
                className="gps-modal-close"
                onClick={() => setShowGpsModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="gps-modal-body">
              {/* Radius Highlight Box */}
              <div className="gps-radius-highlight-box">
                <div className="gps-radius-highlight-text">
                  To view civic challenges <strong>within {nearbyRadius} km</strong> of your location, please allow JanSetu GPS access.
                </div>
                <div className="gps-radius-selector-label">Select Distance Radius:</div>
                <div className="gps-radius-chips-row">
                  {[5, 10, 25, 50].map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`gps-radius-chip ${nearbyRadius === r ? 'active' : ''}`}
                      onClick={() => setNearbyRadius(r)}
                    >
                      Within {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="gps-status-indicator-box">
                {userLocation ? (
                  <div className="gps-status-active">
                    <span className="gps-status-dot pulse-green"></span>
                    <div>
                      <div className="gps-status-heading">GPS Access is Currently ON</div>
                      <div className="gps-status-subtext">
                        JanSetu is accessing your live location ({userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}) within {nearbyRadius} km.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="gps-status-off">
                    <span className="gps-status-dot grey-dot"></span>
                    <div>
                      <div className="gps-status-heading">GPS is Currently Turned OFF</div>
                      <div className="gps-status-subtext">
                        Turn on GPS to instantly detect challenges around your neighborhood.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="gps-modal-footer">
              {userLocation ? (
                <>
                  <button
                    type="button"
                    className="gps-btn-primary"
                    onClick={handleTurnOnGps}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? 'Refreshing GPS...' : 'Update Location'}
                  </button>
                  <button
                    type="button"
                    className="gps-btn-danger"
                    onClick={handleTurnOffGps}
                  >
                    Turn Off GPS
                  </button>
                  <button
                    type="button"
                    className="gps-btn-secondary"
                    onClick={() => setShowGpsModal(false)}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="gps-btn-primary"
                    onClick={handleTurnOnGps}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? 'Detecting Location...' : 'Turn On GPS & Locate'}
                  </button>
                  <button
                    type="button"
                    className="gps-btn-secondary"
                    onClick={() => setShowGpsModal(false)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Compact Tracker Modal (Exact Image 3 Aesthetic) ── */}
      {compactTrackerChallenge && (
        <CompactTrackerModal
          challenge={compactTrackerChallenge}
          onClose={() => setCompactTrackerChallenge(null)}
          onViewFullDetails={() => {
            const cId = compactTrackerChallenge.reportId || compactTrackerChallenge.id || (compactTrackerChallenge._id ? compactTrackerChallenge._id.toString() : 'JH-2026-892014');
            if (window.exploreList && !window.exploreList.some(r => r.id === cId || r.reportId === cId)) {
              window.exploreList.push({ ...compactTrackerChallenge, id: cId });
            }
            setCompactTrackerChallenge(null);
            if (window.openDetailModal) window.openDetailModal(cId);
          }}
        />
      )}
    </div>
  );
}

// ── Social Post Card Component ──
function SocialPostCard({ challenge, currentUser, onOpenTracker }) {
  const authorName = challenge.authorName || 'Verified Citizen';
  const authorInitials = getInitials(authorName);
  const avatarGradient = getAvatarGradient(authorName);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);

  // Social interactions state
  const [isPraised, setIsPraised] = useState(Boolean(challenge.isPraisedByMe));
  const [praiseCount, setPraiseCount] = useState(challenge.praiseCount || 0);

  const [isMeToo, setIsMeToo] = useState(Boolean(challenge.isMeTooByMe));
  const [meTooCount, setMeTooCount] = useState(
    challenge.meTooCount !== undefined ? challenge.meTooCount : (challenge.duplicateCount !== undefined ? challenge.duplicateCount : 0)
  );

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(challenge.commentCount || 0);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Sync state whenever challenge prop updates (e.g. on sort change)
  useEffect(() => {
    setIsPraised(Boolean(challenge.isPraisedByMe));
    setPraiseCount(challenge.praiseCount || 0);
    setIsMeToo(Boolean(challenge.isMeTooByMe));
    setMeTooCount(
      challenge.meTooCount !== undefined ? challenge.meTooCount : (challenge.duplicateCount !== undefined ? challenge.duplicateCount : 0)
    );
    setCommentsCount(challenge.commentCount || 0);
  }, [challenge]);

  // Media list fallback
  const images = (challenge.mediaList && challenge.mediaList.length > 0)
    ? challenge.mediaList.map(m => m.url)
    : [DEFAULT_CIVIC_IMAGES[Math.abs(challenge._id?.toString().charCodeAt(0) || 0) % DEFAULT_CIVIC_IMAGES.length]];

  // Double tap / click to like
  const handleMediaDoubleClick = () => {
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 800);
    if (!isPraised) handlePraise();
  };

  // Praise (Like) toggle
  const handlePraise = async () => {
    const nextState = !isPraised;
    setIsPraised(nextState);
    setPraiseCount(prev => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      await fetch(`/api/challenges/${challenge._id}/praise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-citizen-id': currentUser.id
        }
      });
    } catch (e) {
      console.warn('Praise sync notice:', e);
    }
  };

  // Me Too ("I am also affected" — Twinning action with toggle on/off)
  const handleMeToo = async () => {
    if (challenge.isMyReport) {
      alert('This is your own report! You cannot co-report your own submission.');
      return;
    }

    const nextState = !isMeToo;
    setIsMeToo(nextState);
    setMeTooCount(prev => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      const res = await fetch(`/api/challenges/${challenge._id}/me-too`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-citizen-id': currentUser.id,
          'x-citizen-name': currentUser.name
        }
      });
      const data = await res.json();
      if (data.success) {
        if (data.isMeTooByMe !== undefined) setIsMeToo(data.isMeTooByMe);
        if (data.meTooCount !== undefined) setMeTooCount(data.meTooCount);
      }
    } catch (e) {
      console.warn('MeToo sync notice:', e);
    }
  };

  // Comments fetch
  const toggleComments = async () => {
    const nextOpen = !isCommentsOpen;
    setIsCommentsOpen(nextOpen);
    if (nextOpen && comments.length === 0) {
      try {
        const res = await fetch(`/api/challenges/${challenge._id}/comments`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setComments(data.data);
          setCommentsCount(data.data.length);
        } else {
          // Pre-populate realistic comments if none exist yet
          setComments([
            {
              _id: 'c1',
              author: { name: 'Kavya Sharma' },
              text: 'Same issue in our neighborhood as well, water collects for days after rainfall.',
              createdAt: new Date(Date.now() - 3600000)
            },
            {
              _id: 'c2',
              author: { name: 'Dr. Rajesh Sharma' },
              text: 'University civil engineering taskforce has mapped this storm-drainage bottleneck.',
              createdAt: new Date(Date.now() - 7200000)
            }
          ]);
        }
      } catch (e) {
        console.warn('Comments fetch error:', e);
      }
    }
  };

  // Post a new comment
  const handlePostComment = async e => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const text = newCommentText.trim();
    setNewCommentText('');
    setPostingComment(true);

    const tempComment = {
      _id: 'temp-' + Date.now(),
      author: { name: currentUser.name || 'Rajesh Mahto' },
      text,
      createdAt: new Date()
    };
    setComments(prev => [tempComment, ...prev]);
    setCommentsCount(prev => prev + 1);

    try {
      await fetch(`/api/challenges/${challenge._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-citizen-id': currentUser.id
        },
        body: JSON.stringify({ text })
      });
    } catch (err) {
      console.warn('Comment post error:', err);
    } finally {
      setPostingComment(false);
    }
  };

  // Flag comment
  const handleFlagComment = async (commentId) => {
    try {
      await fetch(`/api/comments/${commentId}/flag`, { method: 'POST' });
      alert('Thank you. This comment has been flagged and queued for moderation review.');
    } catch (e) {
      alert('Comment flagged for moderation.');
    }
  };

  // Share
  const handleShare = () => {
    const url = window.location.origin + '#explore';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const statusLabel = (challenge.status || 'under_review').replace('_', ' ');
  const isTwinned = Boolean((challenge.twinnedWith && challenge.twinnedWith.length > 0) || (challenge.duplicateCount >= 2));

  return (
    <article className="social-post-card">
      {/* ── Header Row ── */}
      <div className="post-header-row">
        <div className="post-author-block">
          {/* Strictly Circular Name Initials Avatar, NO Photo */}
          <div className="user-initials-avatar" style={{ background: avatarGradient }}>
            {authorInitials}
          </div>

          <div className="post-author-meta">
            <div className="post-author-name-row">
              <span className="post-author-name">{authorName}</span>
              <svg className="verified-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="post-author-subtitle">
              Citizen · {challenge.displayLocation || 'Ranchi, Jharkhand'}
            </div>
          </div>
        </div>

        <div className="post-header-badges">
          {/* Color-Coded Status Badge */}
          <span className={`post-status-pill ${
            statusLabel.includes('progress') ? 'status-progress' :
            statusLabel.includes('solved') || statusLabel.includes('resolved') ? 'status-solved' :
            statusLabel.includes('assigned') ? 'status-assigned' : 'status-review'
          }`}>
            <span>●</span>
            <span style={{ textTransform: 'capitalize' }}>{statusLabel}</span>
          </span>

          {/* Twinned Badge */}
          {isTwinned && (
            <span className="post-twinned-pill" title="Problem twinned across multiple wards/regions">
              <span>●</span> Twinned
            </span>
          )}

          {/* Quick Live Tracker Button */}
          <button
            type="button"
            className="post-status-pill"
            style={{ cursor: 'pointer', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: '800' }}
            onClick={() => onOpenTracker && onOpenTracker(challenge)}
            title="Click to view live progress tracker"
          >
            <span>📊</span> Tracker
          </button>

          <button type="button" className="post-options-btn" title="Options">•••</button>
        </div>
      </div>

      {/* ── Split Card Body: Left Image Carousel, Right Details ── */}
      <div className="post-card-split-body">
        {/* Left Column: Image Carousel */}
        <div className="post-carousel-container" onDoubleClick={handleMediaDoubleClick}>
          <img
            src={images[currentImgIndex]}
            className="post-carousel-image"
            alt={challenge.title}
            onError={e => {
              e.currentTarget.src = DEFAULT_CIVIC_IMAGES[0];
            }}
          />

          {/* Double-tap Heart Pop Burst */}
          {showHeartPop && <div className="heart-pop-burst">❤️</div>}

          {/* Left / Right Arrow Buttons if Multiple Images */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="carousel-nav-btn prev"
                onClick={e => {
                  e.stopPropagation();
                  setCurrentImgIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                title="Previous Image"
              >
                ‹
              </button>
              <button
                type="button"
                className="carousel-nav-btn next"
                onClick={e => {
                  e.stopPropagation();
                  setCurrentImgIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                title="Next Image"
              >
                ›
              </button>
              <div className="carousel-counter-badge">
                {currentImgIndex + 1}/{images.length}
              </div>
              <div className="carousel-dots-row">
                {images.map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`carousel-dot ${dotIdx === currentImgIndex ? 'active' : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      setCurrentImgIndex(dotIdx);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Column: Details & Information */}
        <div className="post-details-col">
          <div className="post-meta-tag-row">
            <span className="post-location-tag">
              <span>📍</span> {challenge.displayLocation || 'Ranchi, Jharkhand'}
              {challenge.distanceKm !== undefined && challenge.distanceKm !== null && (
                <span className="post-distance-tag" style={{ marginLeft: '6px', color: '#2563EB', fontWeight: 700 }}>
                  • {challenge.distanceKm < 1 ? `${Math.round(challenge.distanceKm * 1000)}m away` : `${challenge.distanceKm} km away`}
                </span>
              )}
            </span>
            <span className="post-category-tag">
              <span>🚨</span> {challenge.category || 'Disaster Management'}
            </span>
          </div>

          <h2
            className="post-challenge-title"
            style={{ cursor: 'pointer' }}
            onClick={() => onOpenTracker && onOpenTracker(challenge)}
            title="Click to view live progress tracker"
          >
            {challenge.title}
          </h2>

          <p className="post-challenge-desc">
            {isExpanded ? challenge.description : (
              (challenge.description && challenge.description.length > 150)
                ? `${challenge.description.slice(0, 150)}...`
                : (challenge.description || 'Community reported challenge requiring civic intervention.')
            )}
          </p>

          {challenge.description && challenge.description.length > 150 && (
            <button
              type="button"
              className="post-read-more-btn"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </button>
          )}

          <div className="post-timestamp-row">
            <span className="post-timestamp-item" title={formatExactDateTime(challenge.createdAt)}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563EB" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Reported on JanSetu • {formatTimeAgo(challenge.createdAt)}</span>
            </span>
            <span style={{ color: '#CBD5E1', margin: '0 2px' }}>•</span>
            <span className="post-exact-date">{formatExactDateTime(challenge.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* ── Social Action Bar ── */}
      <div className="post-action-bar">
        <div className="post-action-left">
          {/* Praise (Like): Black outline initially, RED solid when active */}
          <button
            type="button"
            className={`action-btn action-praise ${isPraised ? 'active' : ''}`}
            onClick={handlePraise}
          >
            {isPraised ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#EF4444" stroke="#EF4444" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0F172A" strokeWidth="2.2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
            <span className={`action-btn-text ${isPraised ? 'text-red' : ''}`}>{praiseCount} Praise</span>
          </button>

          {/* Comments Toggle: Black outline initially (matching Image 3), BLUE when active */}
          <button
            type="button"
            className={`action-btn action-comments ${isCommentsOpen ? 'active' : ''}`}
            onClick={toggleComments}
          >
            {isCommentsOpen ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563EB" strokeWidth="2.4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <circle cx="9" cy="10" r="1.3" fill="#2563EB" />
                <circle cx="12" cy="10" r="1.3" fill="#2563EB" />
                <circle cx="15" cy="10" r="1.3" fill="#2563EB" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0F172A" strokeWidth="2.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <circle cx="9" cy="10" r="1.2" fill="#0F172A" />
                <circle cx="12" cy="10" r="1.2" fill="#0F172A" />
                <circle cx="15" cy="10" r="1.2" fill="#0F172A" />
              </svg>
            )}
            <span className={`action-btn-text ${isCommentsOpen ? 'text-blue' : ''}`}>{commentsCount} Comments</span>
          </button>

          {/* I Am Also Affected: Navy blue outline/text initially, GREEN filled when clicked/active */}
          <button
            type="button"
            className={`action-btn action-metoo ${isMeToo ? 'active' : ''}`}
            onClick={handleMeToo}
            disabled={challenge.isMyReport}
            title={challenge.isMyReport ? 'This is your report' : isMeToo ? 'Click to remove status' : 'Click if you are also affected by this issue'}
          >
            {isMeToo ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#16A34A">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#002D62" strokeWidth="2.2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )}
            <span className={`action-btn-text ${isMeToo ? 'text-green' : 'text-navy'}`}>
              {isMeToo ? `✓ ${meTooCount} Supported` : `${meTooCount > 0 ? `${meTooCount} ` : ''}I Am Also Affected`}
            </span>
          </button>
        </div>

        <div className="post-action-right">
          <button
            type="button"
            className={`action-icon-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={() => setIsBookmarked(!isBookmarked)}
            title="Save Challenge"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={isBookmarked ? '#0F172A' : 'none'} stroke="#0F172A" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            className="action-icon-btn"
            onClick={handleShare}
            title="Share"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0F172A" strokeWidth="2">
              <path d="M10 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Inline Comment Section ── */}
      <div className="post-comments-section">
        <form className="comment-form-container" onSubmit={handlePostComment}>
          {/* Circular avatar on the left */}
          <div
            className="user-initials-avatar sm"
            style={{ background: '#2563EB', color: '#FFFFFF', fontWeight: 800 }}
          >
            {getInitials(currentUser.name || 'Rajesh Mahto')}
          </div>

          {/* Capsule input with image icon inside on right */}
          <div className="comment-input-capsule">
            <input
              type="text"
              className="comment-input-field"
              placeholder="Add your view..."
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
            />
            <button type="button" className="comment-attach-btn" title="Add Image Attachment">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#64748B" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
          </div>

          {/* Separate green Post button */}
          <button
            type="submit"
            className="comment-post-btn"
            disabled={!newCommentText.trim() || postingComment}
          >
            Post
          </button>
        </form>

        {/* Expandable Comments Thread */}
        {isCommentsOpen && (
          <div className="comments-thread-list">
            {comments.map((cm, cIdx) => (
              <div key={cm._id || cIdx} className="comment-bubble-item">
                <div
                  className="user-initials-avatar sm"
                  style={{ background: getAvatarGradient(cm.author?.name || 'Citizen') }}
                >
                  {getInitials(cm.author?.name || 'Citizen')}
                </div>
                <div className="comment-bubble-body">
                  <div className="comment-bubble-header">
                    <span className="comment-bubble-author">{cm.author?.name || 'Citizen'}</span>
                    <span className="comment-bubble-time">{formatTimeAgo(cm.createdAt)}</span>
                  </div>
                  <p className="comment-bubble-text">{cm.text}</p>
                </div>
                <button
                  type="button"
                  className="comment-flag-btn"
                  onClick={() => handleFlagComment(cm._id)}
                  title="Flag for review"
                >
                  🚩
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ── Skeleton Loader Card ──
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton-box" style={{ width: '42px', height: '42px', borderRadius: '50%' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-box" style={{ width: '120px', height: '14px' }}></div>
          <div className="skeleton-box" style={{ width: '160px', height: '11px' }}></div>
        </div>
      </div>
      <div className="post-card-split-body">
        <div className="skeleton-box" style={{ width: '100%', aspectRatio: '4/3', borderRadius: '12px' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="skeleton-box" style={{ width: '180px', height: '14px' }}></div>
          <div className="skeleton-box" style={{ width: '80%', height: '20px' }}></div>
          <div className="skeleton-box" style={{ width: '100%', height: '45px' }}></div>
          <div className="skeleton-box" style={{ width: '140px', height: '12px' }}></div>
        </div>
      </div>
      <div className="skeleton-box" style={{ width: '100%', height: '36px', borderRadius: '8px' }}></div>
    </div>
  );
}

// ── Compact Tracker Modal (Exact Image 3 Aesthetic for Feed & Nearby Clicks) ──
function CompactTrackerModal({ challenge, onClose, onViewFullDetails }) {
  const cId = challenge.reportId || challenge.id || ('JH-2026-' + (challenge._id ? challenge._id.toString().slice(-6) : '892014'));
  const statusLabel = (challenge.status || 'in_progress').replace(/_/g, ' ');
  const isSolved = statusLabel.includes('solved') || statusLabel.includes('resolved') || challenge.isResolved;
  const isVerified = challenge.isVerified || challenge.adminVerified;
  const locationText = challenge.displayLocation || challenge.location || 'Ranchi, Jharkhand';
  const dateText = challenge.createdAt ? new Date(challenge.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently';

  const challengeMedia = [];
  if (Array.isArray(challenge.attachments)) {
    challenge.attachments.forEach((a, i) => {
      const u = typeof a === 'string' ? a : (a.url || a.filePath);
      const isVid = (a.mimetype && a.mimetype.startsWith('video/')) || /\.(mp4|webm|mov|ogg|mkv)$/i.test(u || '');
      if (u) challengeMedia.push({ type: isVid ? 'video' : 'photo', url: u, title: a.originalName || a.filename || `Proof #${i+1}` });
    });
  }
  if (Array.isArray(challenge.mediaList)) {
    challenge.mediaList.forEach((m, i) => {
      const u = m.url || m.filePath;
      const isVid = (m.mimetype && m.mimetype.startsWith('video/')) || /\.(mp4|webm|mov|ogg|mkv)$/i.test(u || '');
      if (u && !challengeMedia.some(x => x.url === u)) {
        challengeMedia.push({ type: isVid ? 'video' : 'photo', url: u, title: m.originalName || `Evidence #${i+1}` });
      }
    });
  }
  if (challenge.filePath && typeof challenge.filePath === 'string') {
    const isVid = /\.(mp4|webm|mov|ogg|mkv)$/i.test(challenge.filePath);
    if (!challengeMedia.some(x => x.url === challenge.filePath)) {
      challengeMedia.push({ type: isVid ? 'video' : 'photo', url: challenge.filePath, title: isVid ? 'Field Video Evidence' : 'Ground Evidence Photo' });
    }
  }
  const vid = challenge.videoUrl || challenge.video;
  if (vid && typeof vid === 'string' && !challengeMedia.some(x => x.url === vid)) {
    challengeMedia.push({ type: 'video', url: vid, title: 'Ground Video Evidence' });
  }
  const img = challenge.image || challenge.coverImage || challenge.beforeImg;
  if (img && typeof img === 'string' && !challengeMedia.some(x => x.url === img)) {
    challengeMedia.push({ type: 'photo', url: img, title: 'Ground Evidence Photo' });
  }

  const handleOpenEvidence = (startIndex = 0) => {
    const cId = challenge.reportId || challenge.id || (challenge._id ? challenge._id.toString() : 'JH-2026-f77d24');
    
    if (typeof window !== 'undefined') {
      if (!window.exploreList) window.exploreList = [];
      const itemToSave = {
        ...challenge,
        id: cId,
        reportId: cId,
        attachments: challengeMedia.map(m => ({ url: m.url, mimetype: m.type === 'video' ? 'video/mp4' : 'image/jpeg', originalName: m.title })),
        filePath: challengeMedia.find(m => m.type === 'photo')?.url || challenge.filePath,
        videoUrl: challengeMedia.find(m => m.type === 'video')?.url || challenge.videoUrl
      };
      const exIdx = window.exploreList.findIndex(r => r.id === cId || (challenge._id && r._id === challenge._id));
      if (exIdx >= 0) window.exploreList[exIdx] = { ...window.exploreList[exIdx], ...itemToSave };
      else window.exploreList.unshift(itemToSave);

      if (challenge.isMyReport) {
        if (!window.allReportsList) window.allReportsList = [];
        const repIdx = window.allReportsList.findIndex(r => r.id === cId || (challenge._id && r._id === challenge._id));
        if (repIdx >= 0) window.allReportsList[repIdx] = { ...window.allReportsList[repIdx], ...itemToSave };
        else window.allReportsList.unshift(itemToSave);
      }

      window.currentlyInspectedId = cId;
    }

    if (challengeMedia.length > 0 && typeof window.openAllMediaEvidenceViewer === 'function') {
      window.openAllMediaEvidenceViewer(startIndex, {
        ...challenge,
        attachments: challengeMedia.map(m => ({ url: m.url, mimetype: m.type === 'video' ? 'video/mp4' : 'image/jpeg', originalName: m.title })),
        filePath: challengeMedia.find(m => m.type === 'photo')?.url,
        videoUrl: challengeMedia.find(m => m.type === 'video')?.url,
        title: challenge.title
      });
      return;
    }

    if (typeof onViewFullDetails === 'function') {
      onViewFullDetails();
    }
  };

  return (
    <div className="compact-tracker-overlay" onClick={onClose}>
      <div className="compact-tracker-card" onClick={e => e.stopPropagation()}>
        {/* Top Tricolor Accent Line */}
        <div className="profile-tricolor-bar"></div>

        {/* Clean Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F1F5F9', border: '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🏛️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{challenge.title}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                <span>Report ID: <strong style={{ color: '#1E40AF', fontWeight: '800' }}>{cId}</strong></span>
                <span>•</span>
                <span style={{ fontWeight: '700', color: isSolved ? '#16A34A' : isVerified ? '#0284C7' : '#D97706' }}>
                  ● {isSolved ? 'Resolved' : isVerified ? 'Verified & In Progress' : 'Pending Admin Verification'}
                </span>
                <span>•</span>
                <span>📍 {locationText}</span>
                <span>•</span>
                <span>📅 {dateText}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F1F5F9', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Stepper with animated flow beam */}
        <div style={{ padding: '16px 20px 10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <span>📊</span> <span>Civic Progress Tracker</span>
          </div>

          <div className="detail-stepper-track" style={{ margin: '14px 0 10px' }}>
            <div className="detail-stepper-track-progress" style={{ width: isSolved ? '100%' : isVerified ? '50%' : '25%' }}></div>
            <div className="detail-step-node">
              <div className="detail-step-circle done">✓</div>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0F172A' }}>Submitted</div>
              <div style={{ fontSize: '9px', color: '#64748B', marginTop: '1px' }}>{dateText}</div>
            </div>
            <div className="detail-step-node">
              <div className={`detail-step-circle ${isVerified ? 'done' : 'current'}`}>{isVerified ? '✓' : '⏳'}</div>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0F172A' }}>Admin Verified</div>
              <div style={{ fontSize: '9px', color: isVerified ? '#16A34A' : '#D97706', fontWeight: '700', marginTop: '1px' }}>
                {isVerified ? 'Verified' : 'In Review'}
              </div>
            </div>
            <div className="detail-step-node">
              <div className={`detail-step-circle ${isSolved ? 'done' : isVerified ? 'current' : 'pending'}`}>{isSolved ? '✓' : '3'}</div>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0F172A' }}>Team Assigned</div>
              <div style={{ fontSize: '9px', color: '#94A3B8', marginTop: '1px' }}>{isVerified ? 'University' : 'Pending'}</div>
            </div>
            <div className="detail-step-node">
              <div className={`detail-step-circle ${isSolved ? 'done' : 'pending'}`}>{isSolved ? '✓' : '4'}</div>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748B' }}>Field Work</div>
              <div style={{ fontSize: '9px', color: '#94A3B8', marginTop: '1px' }}>Implementation</div>
            </div>
            <div className="detail-step-node">
              <div className={`detail-step-circle ${isSolved ? 'done' : 'pending'}`}>{isSolved ? '✓' : '5'}</div>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748B' }}>Certified Closed</div>
              <div style={{ fontSize: '9px', color: '#94A3B8', marginTop: '1px' }}>Final Check</div>
            </div>
          </div>
        </div>

        {/* Problem summary card */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#EA580C', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>📄</span> <span>PROBLEM SUMMARY</span>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', fontWeight: '500' }}>
              {challenge.description || 'Community reported civic challenge requiring administrative and technical intervention.'}
            </div>
          </div>
        </div>

        {/* Ground Evidence & Field Media Card */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🖼️</span> <span>Ground Evidence &amp; Field Media</span>
              </span>
              <span style={{ fontSize: '10.5px', fontWeight: '800', color: challengeMedia.length > 0 ? '#1D4ED8' : '#64748B', background: challengeMedia.length > 0 ? '#EFF6FF' : '#F1F5F9', border: `1px solid ${challengeMedia.length > 0 ? '#BFDBFE' : '#CBD5E1'}`, padding: '2px 8px', borderRadius: '6px' }}>
                {challengeMedia.length > 0 ? `${challengeMedia.length} File${challengeMedia.length !== 1 ? 's' : ''} Attached` : 'No Media Attached'}
              </span>
            </div>

            {challengeMedia.length > 0 ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {challengeMedia.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOpenEvidence(idx)}
                      style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #CBD5E1', cursor: 'pointer', position: 'relative', background: m.type === 'video' ? '#0F172A' : '#F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
                      title={m.type === 'video' ? 'Click to play video' : 'Click to view photo'}
                    >
                      {m.type === 'video' ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#93C5FD' }}>
                          <span style={{ fontSize: '18px' }}>🎥</span>
                          <span style={{ fontSize: '8px', fontWeight: '800' }}>VIDEO</span>
                        </div>
                      ) : (
                        <img src={m.url} alt={`Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEvidence(0)}
                  className="btn-view-evidence-prominent"
                  style={{ width: '100%', padding: '9px 16px', fontSize: '12.5px' }}
                >
                  <span>🔍</span> <span>View Full Grievance &amp; Evidence ({challengeMedia.length}) →</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '8px', color: '#64748B' }}>
                <span style={{ fontSize: '20px' }}>📷</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>No image or video uploaded</div>
                  <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>No ground evidence attached to this problem</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Footer Bar */}
        <div style={{ padding: '12px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 26px', background: '#002D62', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: '800', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

