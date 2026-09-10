import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Edit3, Mail, MapPin, CheckCircle2, ChevronRight,
  FolderKanban, CheckCircle, Users, Award, Plus,
  Lightbulb, ShieldCheck, Star, Sparkles, Hexagon,
  Settings, Bell, User, Lock, ArrowRight, Search,
  Download, X, ExternalLink, Camera, Key, Check,
  Share2, Copy, Eye, Sliders, Volume2, Smartphone, Shield, Printer
} from 'lucide-react';

/* ── Default Mock Contributions ── */
const defaultContributions = [
  { id: 1, title: 'Smart Waste Management System', category: 'Civil & Environment', role: 'Infrastructure | Faculty Guide', status: 'In Progress', progress: 75, date: '15 Aug 2026', img: '#16A34A', teamSize: 5 },
  { id: 2, title: 'Flood Alert & Evacuation System', category: 'Disaster Management', role: 'Disaster Management | Mentor', status: 'Prototype', progress: 50, date: '10 Aug 2026', img: '#D97706', teamSize: 4 },
  { id: 3, title: 'Real-time Public Transport Tracking', category: 'Smart City & IoT', role: 'Smart City | Faculty Guide', status: 'Submitted', progress: 90, date: '28 Jul 2025', img: '#2563EB', teamSize: 6 },
  { id: 4, title: 'Smart Campus Energy Monitor', category: 'Sustainability', role: 'Sustainability | Mentor', status: 'Deployed', progress: 100, date: '12 Jun 2025', img: '#059669', teamSize: 4 }
];

/* ══════════════════════════════════════════
   PROFILE PAGE
   ══════════════════════════════════════════ */
export default function Profile({ defaultTab, defaultSettingsSubTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Main Navigation Tabs (URL reactive)
  const getInitialTab = () => {
    const tab = searchParams.get('tab') || defaultTab;
    if (tab && ['contributions', 'certificates', 'journey', 'settings'].includes(tab.toLowerCase())) {
      return tab.toLowerCase();
    }
    return 'contributions';
  };

  const getInitialSubTab = () => {
    const sub = searchParams.get('sub') || defaultSettingsSubTab;
    if (sub) {
      const match = ['Preferences', 'Notifications', 'Account', 'Privacy'].find(
        s => s.toLowerCase() === sub.toLowerCase()
      );
      if (match) return match;
    }
    return 'Preferences';
  };

  const [mainTab, setMainTab] = useState(getInitialTab);
  const [contributionFilter, setContributionFilter] = useState('All');
  const [settingsTab, setSettingsTab] = useState(getInitialSubTab);

  // User Profile Initial State Helper
  const getInitialUser = () => {
    try {
      const stored = localStorage.getItem('is_user') || localStorage.getItem('user');
      const cached = localStorage.getItem('jan_user_profile');
      const parsedCached = cached ? JSON.parse(cached) : {};
      if (stored) {
        const u = JSON.parse(stored);
        const initials = u.name ? u.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'U';
        const uid = u.universityIdString || u.uniqueId || u.facultyId || parsedCached.uniqueId || 'U1001';
        return {
          name: u.name || 'University Representative',
          initials,
          avatarUrl: localStorage.getItem('jan_user_avatar') || u.avatar || '',
          email: u.email || '',
          phone: u.phone || '+91 98765 43210',
          role: u.designation || 'Faculty Member & Civic Project Guide',
          department: u.department || 'Department of Engineering & Technology',
          institution: u.institution || u.organization || 'University Partner',
          location: 'New Delhi, India',
          office: 'Academic Block, Room 402',
          facultyId: uid,
          uniqueId: uid,
          universityIdString: uid,
          bio: 'Using technology and education to build inclusive, sustainable engineering solutions for pressing civic and national challenges.',
          stats: {
            projectsGuided: 12,
            problemsSolved: 7,
            mentorshipSessions: 18,
            certificatesEarned: 6
          },
          preferences: {
            projectUpdates: true,
            mentorshipMessages: true,
            platformAnnouncements: true,
            weeklyDigest: true
          },
          ...parsedCached
        };
      }
    } catch (e) {}
    return {
      name: 'Faculty Representative',
      initials: 'FR',
      avatarUrl: '',
      email: '',
      phone: '+91 98765 43210',
      role: 'Faculty Member & Civic Project Guide',
      department: 'Department of Computer Science and Engineering',
      institution: 'Indian Institute of Technology Delhi',
      location: 'New Delhi, India',
      office: 'Bharti School of Telecom, Room 402',
      facultyId: 'U1001',
      uniqueId: 'U1001',
      universityIdString: 'U1001',
      bio: 'Using technology and education to build inclusive, sustainable engineering solutions for pressing civic and national challenges.',
      stats: {
        projectsGuided: 12,
        problemsSolved: 7,
        mentorshipSessions: 18,
        certificatesEarned: 6
      },
      preferences: {
        projectUpdates: true,
        mentorshipMessages: true,
        platformAnnouncements: true,
        weeklyDigest: true
      }
    };
  };

  const initialUser = getInitialUser();
  const [user, setUser] = useState(initialUser);

  // Skills
  const [skills, setSkills] = useState([
    'Computer Vision', 'Machine Learning', 'IoT Systems', 'Data Analytics',
    'System Design', 'Sustainability', 'Mentoring', 'Research & Development'
  ]);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Certificates & Projects
  const [certificates, setCertificates] = useState([]);
  const [projects, setProjects] = useState(defaultContributions);
  const [viewCertModal, setViewCertModal] = useState(null);

  // Edit Mode Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('jan_lang') || 'en');

  // Account Settings Forms
  const [accountEmail, setAccountEmail] = useState(initialUser.email || '');
  const [accountPhone, setAccountPhone] = useState(initialUser.phone || '');
  const [accountOffice, setAccountOffice] = useState(initialUser.office || '');
  const [accountDept, setAccountDept] = useState(initialUser.department || '');

  // Password Update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Channels Settings
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [audioNotifs, setAudioNotifs] = useState(true);

  // Privacy Settings
  const [privacyPublic, setPrivacyPublic] = useState(true);
  const [privacyMentorship, setPrivacyMentorship] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // ── Tab Selection Helper ──
  const handleSelectTab = (tabKey) => {
    setMainTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // ── Sync URL Search Params & Tab Changes ──
  useEffect(() => {
    const tabParam = searchParams.get('tab') || defaultTab;
    if (tabParam && ['contributions', 'certificates', 'journey', 'settings'].includes(tabParam.toLowerCase())) {
      const normalizedTab = tabParam.toLowerCase();
      setMainTab(normalizedTab);
      const sub = searchParams.get('sub') || defaultSettingsSubTab;
      if (sub) {
        const match = ['Preferences', 'Notifications', 'Account', 'Privacy'].find(
          s => s.toLowerCase() === sub.toLowerCase()
        );
        if (match) setSettingsTab(match);
      }
      if (normalizedTab === 'settings') {
        setTimeout(() => {
          const anchor = document.getElementById('prof-tabs-section');
          if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  }, [searchParams, defaultTab, defaultSettingsSubTab, location.search]);

  // ── Listen for custom event switch-profile-tab from TopHeader ──
  useEffect(() => {
    const handleSwitchTab = (e) => {
      if (e.detail?.tab) {
        const targetTab = e.detail.tab.toLowerCase();
        setMainTab(targetTab);
        setSearchParams({ tab: targetTab });
        if (e.detail.sub) {
          const match = ['Preferences', 'Notifications', 'Account', 'Privacy'].find(
            s => s.toLowerCase() === e.detail.sub.toLowerCase()
          );
          if (match) setSettingsTab(match);
        }
        setTimeout(() => {
          const anchor = document.getElementById('prof-tabs-section');
          if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    };
    window.addEventListener('switch-profile-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-profile-tab', handleSwitchTab);
  }, [setSearchParams]);

  // ── Fetch Profile, Projects & Certificates ──
  useEffect(() => {
    // Check localStorage cached profile
    try {
      const cached = localStorage.getItem('jan_user_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(prev => ({ ...prev, ...parsed }));
        if (parsed.email) setAccountEmail(parsed.email);
        if (parsed.phone) setAccountPhone(parsed.phone);
        if (parsed.office) setAccountOffice(parsed.office);
      }
      const savedAvatar = localStorage.getItem('jan_user_avatar');
      if (savedAvatar) {
        setUser(prev => ({ ...prev, avatarUrl: savedAvatar }));
      }
      const savedSkills = localStorage.getItem('jan_user_skills');
      if (savedSkills) {
        setSkills(JSON.parse(savedSkills));
      }
    } catch (e) {}

    // Fetch from backend with user email & token
    const token = localStorage.getItem('is_token') || localStorage.getItem('token') || '';
    let emailParam = '';
    try {
      const u = JSON.parse(localStorage.getItem('is_user') || localStorage.getItem('user') || '{}');
      if (u.email) emailParam = `?email=${encodeURIComponent(u.email)}`;
    } catch(e) {}

    fetch(`/api/user${emailParam}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-user-email': user.email || ''
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error && data.name) {
          const savedAvatar = localStorage.getItem('jan_user_avatar');
          const uid = data.uniqueId || data.universityIdString || data.facultyId || user.uniqueId || 'U1001';
          setUser(prev => ({
            ...prev,
            ...data,
            facultyId: uid,
            uniqueId: uid,
            universityIdString: uid,
            avatarUrl: savedAvatar || data.avatarUrl || prev.avatarUrl
          }));
          if (data.email) setAccountEmail(data.email);
          if (data.phone) setAccountPhone(data.phone);
          if (data.department) setAccountDept(data.department);
          if (data.office) setAccountOffice(data.office);
        }
      })
      .catch(() => {});

    // Fetch projects for contributions
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p, idx) => ({
            id: p._id || idx,
            title: p.title,
            category: p.category || 'Civic Infrastructure',
            role: 'Faculty Guide & Mentor',
            status: p.status || 'In Progress',
            progress: p.status === 'Deployed' ? 100 : p.status === 'Prototype' ? 60 : 35,
            date: new Date(p.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            img: p.status === 'Deployed' ? '#16A34A' : p.status === 'Prototype' ? '#D97706' : '#2563EB',
            teamSize: p.team?.length || 4
          }));
          setProjects(mapped);
          setUser(prev => ({
            ...prev,
            stats: { ...prev.stats, projectsGuided: Math.max(prev.stats?.projectsGuided || 12, data.length) }
          }));
        }
      })
      .catch(() => {});

    // Fetch certificates
    fetch('/api/certificates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCertificates(data);
          setUser(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              certificatesEarned: Math.max(prev.stats?.certificatesEarned || 6, data.length)
            }
          }));
        }
      })
      .catch(() => {});
  }, []);

  // ── Profile Edit Handlers ──
  const handleEditClick = () => {
    setEditForm({
      name: user.name,
      role: user.role,
      department: user.department,
      institution: user.institution,
      location: user.location,
      office: user.office || accountOffice,
      phone: user.phone || accountPhone,
      email: user.email || accountEmail,
      bio: user.bio
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const initials = (editForm.name || user.name)
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const updatedUser = { ...user, ...editForm, initials };
      setUser(updatedUser);
      setIsEditing(false);

      // Save locally
      localStorage.setItem('jan_user_profile', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('profile-update', { detail: updatedUser }));

      // Push to backend
      const token = localStorage.getItem('is_token') || localStorage.getItem('token') || '';
      const res = await fetch(`/api/user/${user._id || 'default'}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-user-email': user.email || ''
        },
        body: JSON.stringify(updatedUser)
      });
      await res.json();
      import('../utils/toast').then(m => m.toast('Faculty profile updated successfully!', 'success'));
    } catch (err) {
      import('../utils/toast').then(m => m.toast('Profile saved locally!', 'info'));
    }
  };

  // ── Avatar Upload Handler ──
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        import('../utils/toast').then(m => m.toast('Image must be under 5MB', 'error'));
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const newAvatar = reader.result;
        setUser(prev => ({ ...prev, avatarUrl: newAvatar }));
        localStorage.setItem('jan_user_avatar', newAvatar);
        window.dispatchEvent(new CustomEvent('profile-update', { detail: { ...user, avatarUrl: newAvatar } }));

        try {
          await fetch(`/api/user/${user._id || 'default'}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: newAvatar })
          });
        } catch (err) {}

        import('../utils/toast').then(m => m.toast('Profile avatar updated!', 'success'));
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Skill Management ──
  const handleAddSkillSubmit = (e) => {
    if (e) e.preventDefault();
    if (newSkillInput && newSkillInput.trim()) {
      const trimmed = newSkillInput.trim();
      if (!skills.includes(trimmed)) {
        const updated = [...skills, trimmed];
        setSkills(updated);
        localStorage.setItem('jan_user_skills', JSON.stringify(updated));
        import('../utils/toast').then(m => m.toast(`Added "${trimmed}" to research skills`, 'success'));
        fetch(`/api/user/${user._id || 'default'}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills: updated })
        }).catch(() => {});
      } else {
        import('../utils/toast').then(m => m.toast('Skill already listed', 'info'));
      }
      setNewSkillInput('');
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = skills.filter(s => s !== skillToRemove);
    setSkills(updated);
    localStorage.setItem('jan_user_skills', JSON.stringify(updated));
    import('../utils/toast').then(m => m.toast(`Removed "${skillToRemove}"`, 'info'));
    fetch(`/api/user/${user._id || 'default'}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: updated })
    }).catch(() => {});
  };

  // ── Language Toggle ──
  const handleLanguageToggle = (lang) => {
    setCurrentLang(lang);
    localStorage.setItem('jan_lang', lang);
    localStorage.setItem('lang', lang);
    window.dispatchEvent(new CustomEvent('lang-change', { detail: lang }));
    window.dispatchEvent(new Event('storage'));
    import('../utils/toast').then(m => m.toast(`Language preference set to ${lang === 'hi' ? 'Hindi (हिंदी)' : 'English'}`, 'info'));
  };

  // ── Notification Preference Toggle ──
  const handleTogglePref = async (key) => {
    const newVal = !user.preferences?.[key];
    const newPrefs = { ...(user.preferences || {}), [key]: newVal };
    setUser(prev => ({ ...prev, preferences: newPrefs }));
    try {
      await fetch(`/api/user/${user._id || 'default'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPrefs })
      });
      import('../utils/toast').then(m => m.toast('Preference updated', 'success'));
    } catch (err) {}
  };

  // ── Update Account Credentials ──
  const handleSaveCredentials = async () => {
    const updatedUser = {
      ...user,
      email: accountEmail,
      phone: accountPhone,
      office: accountOffice,
      department: accountDept
    };
    setUser(updatedUser);
    localStorage.setItem('jan_user_profile', JSON.stringify(updatedUser));
    window.dispatchEvent(new CustomEvent('profile-update', { detail: updatedUser }));

    try {
      const token = localStorage.getItem('is_token') || localStorage.getItem('token') || '';
      await fetch(`/api/user/${user._id || 'default'}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-user-email': user.email || ''
        },
        body: JSON.stringify({ email: accountEmail, phone: accountPhone, office: accountOffice, department: accountDept })
      });
    } catch (err) {}
    import('../utils/toast').then(m => m.toast('Institutional credentials saved!', 'success'));
  };

  // ── Password Change ──
  const handleUpdatePassword = () => {
    if (!currentPassword) {
      import('../utils/toast').then(m => m.toast('Please enter your current password', 'error'));
      return;
    }
    if (newPassword.length < 6) {
      import('../utils/toast').then(m => m.toast('New password must be at least 6 characters', 'error'));
      return;
    }
    if (newPassword !== confirmPassword) {
      import('../utils/toast').then(m => m.toast('Passwords do not match', 'error'));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    import('../utils/toast').then(m => m.toast('Password successfully updated!', 'success'));
  };

  // ── Share Profile ──
  const handleShareProfile = () => {
    const url = `${window.location.origin}/university#/profile`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      import('../utils/toast').then(m => m.toast('Profile URL copied to clipboard!', 'success'));
    } else {
      import('../utils/toast').then(m => m.toast('Profile URL: ' + url, 'info'));
    }
  };

  // ── Filtered Contributions ──
  const displayedContributions = projects.length > 0 ? projects : defaultContributions;
  const filteredContributions = displayedContributions.filter(p => {
    if (contributionFilter === 'All') return true;
    if (contributionFilter === 'Faculty Guide') return p.role.includes('Faculty Guide');
    if (contributionFilter === 'Mentor') return p.role.includes('Mentor');
    if (contributionFilter === 'Team Member') return p.role.includes('Team');
    return true;
  });

  // ── Default Certificates Data ──
  const effectiveCertificates = certificates.length > 0 ? certificates : [
    {
      _id: 'c-101',
      certificateId: 'JS-DEL-2026-0042',
      projectTitle: 'Smart Waste Management System',
      recipientName: user.name || 'Dr. Rohan Mehta',
      recipientRole: 'Faculty Guide & Lead Mentor',
      university: 'Indian Institute of Technology Delhi',
      issueDate: '12 Jun 2026',
      authority: 'National Civic Innovation Directorate',
      signatory: 'Prof. K. Sharma',
      status: 'Verified Deployment'
    },
    {
      _id: 'c-102',
      certificateId: 'JS-DEL-2026-0089',
      projectTitle: 'Smart Campus Energy Monitor',
      recipientName: user.name || 'Dr. Rohan Mehta',
      recipientRole: 'Faculty Guide & Sustainability Chair',
      university: 'Indian Institute of Technology Delhi',
      issueDate: '10 Aug 2026',
      authority: 'Ministry of Education & JanSetu',
      signatory: 'Prof. K. Sharma',
      status: 'Verified Deployment'
    }
  ];

  return (
    <div className="profile-page animate-in">
      
      {/* ── HERO BANNER ── */}
      <div className="prof-hero">
        <div className="prof-hero-content">
          <div className="prof-hero-left">
            <div className="prof-breadcrumbs">Home &nbsp;›&nbsp; Faculty Profile & Civic Credentials</div>
            <h1 className="prof-hero-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              My Profile
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '3px 10px', borderRadius: 20, border: '1px solid #86EFAC' }}>
                Verified Faculty
              </span>
            </h1>
            <p className="prof-hero-subtitle">
              Manage your academic credentials, mentor track, verified civic impact certificates, and national innovation index.
            </p>
          </div>
          
          <div className="prof-hero-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <div className="prof-quote">
              <span className="prof-quote-mark">“</span>
              <div>
                <div className="prof-quote-text">Education is the most powerful<br/>weapon to change the nation.</div>
                <div className="prof-quote-author">— Dr. A.P.J. Abdul Kalam</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleShareProfile}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #CBD5E1',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  color: '#334155', cursor: 'pointer', backdropFilter: 'blur(4px)'
                }}
              >
                <Share2 style={{ width: 13, height: 13 }} /> Share Profile
              </button>
              <button
                onClick={handleEditClick}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#0F172A', border: 'none', color: 'white',
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,23,42,0.2)'
                }}
              >
                <Edit3 style={{ width: 13, height: 13 }} /> Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Monument SVG Silhouette */}
        <div className="prof-monuments">
          <svg viewBox="0 0 400 100" fill="none" style={{ height: 100, opacity: 0.85 }}>
            <path d="M50 90 L50 60 Q70 20 90 60 L90 90 Z" fill="#E8E8E8" />
            <rect x="40" y="50" width="4" height="40" fill="#E8E8E8" />
            <rect x="96" y="50" width="4" height="40" fill="#E8E8E8" />
            <rect x="180" y="20" width="40" height="70" rx="2" fill="#D4C494" />
            <path d="M185 90 L185 50 Q200 30 215 50 L215 90" fill="#F0E8D0" />
            <path d="M300 90 L305 10 L315 10 L320 90 Z" fill="#C28464" />
          </svg>
        </div>
        <div className="prof-tricolor-swoosh" />
      </div>

      {/* ── MAIN 2-COLUMN GRID ── */}
      <div className="prof-grid">
        
        {/* ════ LEFT COLUMN: IDENTITY & CREDENTIALS ════ */}
        <div className="prof-col-left" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Identity Card */}
          <div className="prof-card profile-card" style={{ position: 'relative' }}>
            {!isEditing ? (
              <button className="prof-edit-btn" onClick={handleEditClick} style={{ position: 'absolute', top: 20, right: 20 }}>
                <Edit3 style={{ width: 13, height: 13 }} /> Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                >
                  Save
                </button>
              </div>
            )}
            
            {/* Avatar & Basic Info */}
            <div className="prof-user-info">
              <div className="prof-avatar">
                <label title="Click to upload new avatar image" style={{ cursor: 'pointer', display: 'block', position: 'relative' }}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      style={{ width: 86, height: 86, borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563EB', display: 'block' }}
                    />
                  ) : (
                    <div className="prof-avatar-img">
                      {user.initials || 'RM'}
                    </div>
                  )}
                  <div className="prof-avatar-badge" title="Upload new photo">
                    <Camera style={{ width: 13, height: 13 }} />
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </label>
              </div>
              
              <div className="prof-details">
                {!isEditing ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 className="prof-name" style={{ margin: 0 }}>
                        {user.name}
                        <CheckCircle2 className="prof-verified" title="Verified Institutional Faculty" />
                      </h2>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                        color: '#FFFFFF',
                        padding: '3px 9px',
                        borderRadius: 6,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                      }}>
                        <Key style={{ width: 11, height: 11 }} /> ID: {user.uniqueId || user.universityIdString || user.facultyId || 'U1001'}
                      </span>
                    </div>
                    <div className="prof-role">{user.role}</div>
                    <div className="prof-dept">{user.department}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      {user.institution}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    <input
                      value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 700 }}
                      placeholder="Full Name"
                    />
                    <input
                      value={editForm.role || ''}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                      placeholder="Designation / Role"
                    />
                    <input
                      value={editForm.department || ''}
                      onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5 }}
                      placeholder="Department"
                    />
                    <input
                      value={editForm.institution || ''}
                      onChange={e => setEditForm({ ...editForm, institution: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5 }}
                      placeholder="Institution / University"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Direct Contact Metadata */}
            <div className="prof-contact" style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginBottom: 16 }}>
              {!isEditing ? (
                <>
                  <span><Mail style={{ width: 13, height: 13, color: '#2563EB', flexShrink: 0 }} /> {user.email}</span>
                  <span><Smartphone style={{ width: 13, height: 13, color: '#16A34A', flexShrink: 0 }} /> {user.phone || accountPhone}</span>
                  <span><MapPin style={{ width: 13, height: 13, color: '#DC2626', flexShrink: 0 }} /> {user.location} • {user.office || accountOffice}</span>
                  <span style={{ fontSize: 11.5, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Key style={{ width: 13, height: 13, color: '#2563EB', flexShrink: 0 }} /> University ID: <strong style={{ color: '#0F172A', background: '#F1F5F9', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.03em', border: '1px solid #E2E8F0' }}>{user.uniqueId || user.universityIdString || user.facultyId || 'U1001'}</strong>
                  </span>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    value={editForm.email || ''}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5 }}
                    placeholder="Official Email"
                  />
                  <input
                    value={editForm.phone || ''}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5 }}
                    placeholder="Contact Number"
                  />
                  <input
                    value={editForm.location || ''}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 11.5 }}
                    placeholder="Location / City"
                  />
                </div>
              )}
            </div>

            {/* Academic Bio / Mission */}
            <div className="prof-bio-quote">
              <span className="prof-quote-icon">“</span>
              {!isEditing ? (
                <p>{user.bio}</p>
              ) : (
                <textarea
                  value={editForm.bio || ''}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, minHeight: 70 }}
                  placeholder="Your Academic Mission / Civic Research Focus"
                />
              )}
            </div>
          </div>

          {/* Skills & Domain Expertise Card */}
          <div className="prof-card">
            <div className="prof-card-header">
              <h3 className="prof-card-title">Skills & Research Domains</h3>
              {!isAddingSkill && (
                <button
                  onClick={() => setIsAddingSkill(true)}
                  style={{
                    background: 'none', border: 'none', color: '#2563EB',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <Plus style={{ width: 13, height: 13 }} /> Add Skill
                </button>
              )}
            </div>

            <div className="prof-skills-container">
              <div className="prof-skills-list">
                {skills.map((s, idx) => (
                  <span key={idx} className="prof-skill-pill">
                    {s}
                    <X
                      size={12}
                      style={{ cursor: 'pointer', color: '#94A3B8', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                      onClick={() => handleRemoveSkill(s)}
                      title={`Remove ${s}`}
                    />
                  </span>
                ))}

                {/* Inline Add Skill Chip */}
                {isAddingSkill ? (
                  <form onSubmit={handleAddSkillSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type skill & press Enter"
                      value={newSkillInput}
                      onChange={e => setNewSkillInput(e.target.value)}
                      style={{
                        padding: '5px 10px', borderRadius: 20, border: '1.5px solid #2563EB',
                        fontSize: 11.5, outline: 'none', width: 160
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        width: 26, height: 26, borderRadius: '50%', background: '#2563EB',
                        color: 'white', border: 'none', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer'
                      }}
                    >
                      <Check style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingSkill(false); setNewSkillInput(''); }}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', background: '#E2E8F0',
                        color: '#64748B', border: 'none', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer'
                      }}
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </form>
                ) : (
                  <span className="prof-skill-pill add" onClick={() => setIsAddingSkill(true)}>
                    <Plus style={{ width: 12, height: 12 }} /> Add Skill
                  </span>
                )}
              </div>

              {/* AI Skill Match Widget */}
              <div className="prof-ai-suggest">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lightbulb style={{ width: 15, height: 15, color: '#D97706' }} />
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#92400E' }}>AI Skill Match</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: 10, border: '1px solid #FDE68A' }}>
                    94% Fit
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: '#B45309', lineHeight: 1.45, margin: 0 }}>
                  Your faculty profile matches <strong>94%</strong> of newly arrived urban disaster, IoT & sustainable infrastructure civic challenges.
                </p>
                <a
                  href="/university#/browse-problems"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, color: '#2563EB',
                    marginTop: 8, textDecoration: 'none'
                  }}
                >
                  Explore Matching Problems <ArrowRight style={{ width: 12, height: 12 }} />
                </a>
              </div>
            </div>
          </div>

          {/* Honors & Accreditations Card */}
          <div className="prof-card">
            <div className="prof-card-header">
              <h3 className="prof-card-title">Honors & Innovation Badges</h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>Verified (4)</span>
            </div>

            <div className="prof-badges-grid">
              <div className="prof-badge-card">
                <div className="prof-bc-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <Award style={{ width: 22, height: 22 }} />
                </div>
                <div className="prof-bc-title">Faculty Mentor<br/>Excellence</div>
                <div className="prof-bc-year">2026 • Gold Medal</div>
              </div>

              <div className="prof-badge-card">
                <div className="prof-bc-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                  <ShieldCheck style={{ width: 22, height: 22 }} />
                </div>
                <div className="prof-bc-title">Deployed Solution<br/>Contributor</div>
                <div className="prof-bc-year">2026 • Ground Impact</div>
              </div>

              <div className="prof-badge-card">
                <div className="prof-bc-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                  <Hexagon style={{ width: 22, height: 22 }} />
                </div>
                <div className="prof-bc-title">Sustainability<br/>Champion</div>
                <div className="prof-bc-year">2026 • Eco Innovation</div>
              </div>

              <div className="prof-badge-card">
                <div className="prof-bc-icon" style={{ background: '#F3E8FF', color: '#9333EA' }}>
                  <Star style={{ width: 22, height: 22 }} />
                </div>
                <div className="prof-bc-title">Top 5%<br/>Civic Guide</div>
                <div className="prof-bc-year">2026 • National Rank</div>
              </div>
            </div>
          </div>

        </div>

        {/* ════ RIGHT COLUMN: METRICS & TABBED WORKSPACE ════ */}
        <div className="prof-col-right" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Top Impact Stats Grid */}
          <div className="prof-stats-grid">
            <div className="prof-stat-box">
              <div className="prof-stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                <FolderKanban style={{ width: 20, height: 20 }} />
              </div>
              <div className="prof-stat-val">{user.stats?.projectsGuided || 12}</div>
              <div className="prof-stat-label">Projects Guided</div>
              <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>+2 active this month</div>
            </div>

            <div className="prof-stat-box">
              <div className="prof-stat-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
                <CheckCircle style={{ width: 20, height: 20 }} />
              </div>
              <div className="prof-stat-val">{user.stats?.problemsSolved || 7}</div>
              <div className="prof-stat-label">Problems Solved</div>
              <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 700, marginTop: 4 }}>100% verified ground trial</div>
            </div>

            <div className="prof-stat-box">
              <div className="prof-stat-icon" style={{ background: '#FFEDD5', color: '#EA580C' }}>
                <Users style={{ width: 20, height: 20 }} />
              </div>
              <div className="prof-stat-val">{user.stats?.mentorshipSessions || 18}</div>
              <div className="prof-stat-label">Mentorship Sessions</div>
              <div style={{ fontSize: 10, color: '#EA580C', fontWeight: 700, marginTop: 4 }}>4.9/5.0 Student Rating</div>
            </div>

            <div className="prof-stat-box">
              <div className="prof-stat-icon" style={{ background: '#F3E8FF', color: '#9333EA' }}>
                <Award style={{ width: 20, height: 20 }} />
              </div>
              <div className="prof-stat-val">{Math.max(user.stats?.certificatesEarned || 6, effectiveCertificates.length)}</div>
              <div className="prof-stat-label">Certificates Issued</div>
              <div style={{ fontSize: 10, color: '#9333EA', fontWeight: 700, marginTop: 4 }}>Govt. & Hub verified</div>
            </div>
          </div>

          {/* Main Segmented Tabs */}
          <div className="prof-main-tabs" id="prof-tabs-section">
            <button
              className={`prof-main-tab ${mainTab === 'contributions' ? 'active' : ''}`}
              onClick={() => handleSelectTab('contributions')}
            >
              <FolderKanban style={{ width: 16, height: 16 }} />
              Civic Contributions
              <span className="prof-tab-chip">{filteredContributions.length}</span>
            </button>

            <button
              className={`prof-main-tab ${mainTab === 'certificates' ? 'active' : ''}`}
              onClick={() => handleSelectTab('certificates')}
            >
              <Award style={{ width: 16, height: 16 }} />
              Deployment Certificates
              <span className="prof-tab-chip">{effectiveCertificates.length}</span>
            </button>

            <button
              className={`prof-main-tab ${mainTab === 'journey' ? 'active' : ''}`}
              onClick={() => handleSelectTab('journey')}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Impact Journey
            </button>

            <button
              className={`prof-main-tab ${mainTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleSelectTab('settings')}
            >
              <Settings style={{ width: 16, height: 16 }} />
              Settings & Security
            </button>
          </div>

          {/* ════ TAB 1: CIVIC CONTRIBUTIONS ════ */}
          {mainTab === 'contributions' && (
            <div className="prof-card">
              <div className="prof-card-header">
                <div>
                  <h3 className="prof-card-title">My Guided Projects & Solutions</h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                    Active civic projects, student teams mentored, and ongoing engineering solutions.
                  </p>
                </div>
                <a href="/university#/my-projects" className="prof-link">
                  Open Project Workspace <ChevronRight style={{ width: 14, height: 14 }} />
                </a>
              </div>

              {/* Filter Pills */}
              <div className="prof-filter-pills">
                {['All', 'Faculty Guide', 'Mentor', 'Team Member'].map(f => (
                  <button
                    key={f}
                    className={`prof-filter-pill ${contributionFilter === f ? 'active' : ''}`}
                    onClick={() => setContributionFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Projects List */}
              <div className="prof-project-list">
                {filteredContributions.map(p => (
                  <div
                    key={p.id}
                    className="prof-project-item"
                    onClick={() => window.location.href = '/university#/my-projects'}
                    title="Click to view project details in Project Workspace"
                  >
                    <div className="prof-pi-img" style={{ background: p.img || '#2563EB' }}>
                      <FolderKanban style={{ width: 22, height: 22 }} />
                    </div>

                    <div className="prof-pi-details">
                      <h4 className="prof-pi-title">{p.title}</h4>
                      <div className="prof-pi-role">
                        {p.category} &nbsp;•&nbsp; <strong>{p.role}</strong>
                      </div>
                      
                      {/* Progress Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, maxWidth: 260 }}>
                        <div style={{ flex: 1, height: 5, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${p.progress}%`, height: '100%', background: p.status === 'Deployed' ? '#16A34A' : '#2563EB', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>{p.progress}%</span>
                      </div>
                    </div>

                    <div className="prof-pi-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span className={`prof-badge ${p.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {p.status}
                      </span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.teamSize} Student Members</span>
                    </div>

                    <div className="prof-pi-date">
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>Last Active</div>
                      <div style={{ fontWeight: 700, color: '#334155' }}>{p.date}</div>
                    </div>

                    <ChevronRight style={{ width: 16, height: 16, color: '#94A3B8' }} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                <a
                  href="/university#/browse-problems"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, color: '#2563EB',
                    textDecoration: 'none', background: '#EFF6FF', padding: '8px 16px',
                    borderRadius: 8, border: '1px solid #BFDBFE'
                  }}
                >
                  <Plus style={{ width: 14, height: 14 }} /> Guide a New Problem Statement
                </a>
              </div>
            </div>
          )}

          {/* ════ TAB 2: DEPLOYMENT CERTIFICATES ════ */}
          {mainTab === 'certificates' && (
            <div className="prof-card">
              <div className="prof-card-header">
                <div>
                  <h3 className="prof-card-title">Official Deployment Certificates</h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                    Government & University authenticated recognition for successfully deployed ground solutions.
                  </p>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '4px 14px', borderRadius: 20, border: '1px solid #86EFAC' }}>
                  {effectiveCertificates.length} Issued & Verified
                </span>
              </div>

              {/* Certificate Verification Banner */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Award style={{ width: 20, height: 20 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Cryptographically Verified Accreditation</div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>Each certificate carries an official Ministry & University cryptographic hash valid for NAAC/NIRF innovation audits.</div>
                </div>
              </div>

              {/* Certificates List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {effectiveCertificates.map((cert, idx) => (
                  <div
                    key={cert._id || idx}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', background: '#FFFFFF', border: '1.5px solid #E2E8F0',
                      borderRadius: 14, transition: 'all 0.2s ease', gap: 16
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#C8B560'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(200,181,96,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Award style={{ width: 26, height: 26 }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Outfit', fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>
                          {cert.projectTitle}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                          {cert.recipientRole || 'Lead Innovator'} &nbsp;•&nbsp; {cert.university || 'IIT Delhi'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 6 }}>
                            Verified Deployment
                          </span>
                          <span style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'monospace' }}>
                            ID: {cert.certificateId || `JS-DEL-2026-00${idx + 42}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => setViewCertModal(cert)}
                        style={{
                          background: '#2563EB', color: 'white', border: 'none',
                          borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                        }}
                      >
                        <Award style={{ width: 14, height: 14 }} /> View & Print Certificate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ TAB 3: IMPACT JOURNEY ════ */}
          {mainTab === 'journey' && (
            <div className="prof-card">
              <div className="prof-card-header">
                <div>
                  <h3 className="prof-card-title">National Civic Impact Journey</h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                    Your milestone track from institutional induction to ground municipal deployment.
                  </p>
                </div>
                <a href="/university#/my-projects" className="prof-link">
                  Detailed Milestones <ArrowRight style={{ width: 13, height: 13 }} />
                </a>
              </div>

              <div className="prof-timeline">
                <div className="prof-tl-track">
                  <div className="prof-tl-fill" style={{ width: '100%' }} />
                </div>
                <div className="prof-tl-steps">
                  <div className="prof-tl-step">
                    <div className="prof-tl-icon" style={{ background: '#10B981', color: 'white', borderColor: '#10B981' }}>
                      <CheckCircle style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="prof-tl-title">Joined Network</div>
                    <div className="prof-tl-date">1 Aug 2026</div>
                    <div className="prof-tl-desc">Registered faculty guide<br/>at JanSetu National Hub</div>
                  </div>

                  <div className="prof-tl-step">
                    <div className="prof-tl-icon" style={{ background: '#3B82F6', color: 'white', borderColor: '#3B82F6' }}>
                      <Search style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="prof-tl-title">Problem Picked</div>
                    <div className="prof-tl-date">10 Aug 2026</div>
                    <div className="prof-tl-desc">Guided Early Flood<br/>Warning & IoT System</div>
                  </div>

                  <div className="prof-tl-step">
                    <div className="prof-tl-icon" style={{ background: '#F97316', color: 'white', borderColor: '#F97316' }}>
                      <Lightbulb style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="prof-tl-title">Prototype Gate</div>
                    <div className="prof-tl-date">5 Sep 2026</div>
                    <div className="prof-tl-desc">Approved student team<br/>working model trial</div>
                  </div>

                  <div className="prof-tl-step">
                    <div className="prof-tl-icon" style={{ background: '#8B5CF6', color: 'white', borderColor: '#8B5CF6' }}>
                      <Shield style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="prof-tl-title">Municipal Trial</div>
                    <div className="prof-tl-date">15 Oct 2026</div>
                    <div className="prof-tl-desc">Completed field testing<br/>in Municipal Ward 12</div>
                  </div>

                  <div className="prof-tl-step">
                    <div className="prof-tl-icon" style={{ background: '#16A34A', color: 'white', borderColor: '#16A34A' }}>
                      <Sparkles style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="prof-tl-title">Ground Deployment</div>
                    <div className="prof-tl-date">20 Nov 2026</div>
                    <div className="prof-tl-desc">Deployed municipal solution<br/>Awarded Deployment Cert</div>
                  </div>
                </div>
              </div>

              <div className="prof-trail-quote" style={{ marginTop: 20 }}>
                <span className="ptq-mark">“</span>
                <p>
                  "Small ideas, when nurtured through rigorous engineering, create massive, transformative change across our nation."
                </p>
              </div>
            </div>
          )}

          {/* ════ TAB 4: SETTINGS & SECURITY ════ */}
          {mainTab === 'settings' && (
            <div className="prof-card">
              <div className="prof-card-header">
                <div>
                  <h3 className="prof-card-title">Profile Settings & Account Security</h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                    Manage alert channels, language preferences, institutional credentials, and access keys.
                  </p>
                </div>
              </div>

              <div className="prof-settings-layout">
                {/* Vertical Sub-Navigation */}
                <div className="prof-settings-nav">
                  <button
                    className={`prof-s-nav-item ${settingsTab === 'Preferences' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('Preferences')}
                  >
                    <Sliders style={{ width: 15, height: 15 }} /> Preferences
                  </button>
                  <button
                    className={`prof-s-nav-item ${settingsTab === 'Notifications' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('Notifications')}
                  >
                    <Bell style={{ width: 15, height: 15 }} /> Notifications
                  </button>
                  <button
                    className={`prof-s-nav-item ${settingsTab === 'Account' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('Account')}
                  >
                    <User style={{ width: 15, height: 15 }} /> Institutional Account
                  </button>
                  <button
                    className={`prof-s-nav-item ${settingsTab === 'Privacy' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('Privacy')}
                  >
                    <Lock style={{ width: 15, height: 15 }} /> Privacy & Security
                  </button>
                </div>

                {/* Sub-Tab Content */}
                <div className="prof-settings-content">
                  
                  {/* Preferences Sub-Tab */}
                  {settingsTab === 'Preferences' && (
                    <div>
                      <div className="prof-s-row">
                        <div>
                          <div className="prof-s-label">Platform Language</div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Choose display language for dashboard and navigation</div>
                        </div>
                        <div className="prof-lang-toggle">
                          <button
                            className={currentLang === 'en' ? 'active' : ''}
                            onClick={() => handleLanguageToggle('en')}
                          >
                            English
                          </button>
                          <button
                            className={currentLang === 'hi' ? 'active' : ''}
                            onClick={() => handleLanguageToggle('hi')}
                          >
                            हिंदी
                          </button>
                        </div>
                      </div>

                      <div className="prof-s-section-title">Automatic Activity Notifications</div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <FolderKanban style={{ width: 16, height: 16, color: '#2563EB' }} />
                          <div>
                            <div>Project Milestones & Submission Alerts</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Receive notification when teams upload prototype gates</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${user.preferences?.projectUpdates ? 'active' : ''}`}
                          onClick={() => handleTogglePref('projectUpdates')}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Users style={{ width: 16, height: 16, color: '#EA580C' }} />
                          <div>
                            <div>Mentorship Invites & Queries</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Direct messages from students and municipal officers</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${user.preferences?.mentorshipMessages ? 'active' : ''}`}
                          onClick={() => handleTogglePref('mentorshipMessages')}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Bell style={{ width: 16, height: 16, color: '#9333EA' }} />
                          <div>
                            <div>National Platform Announcements</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Grand challenges and hackathon invitations</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${user.preferences?.platformAnnouncements ? 'active' : ''}`}
                          onClick={() => handleTogglePref('platformAnnouncements')}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Mail style={{ width: 16, height: 16, color: '#16A34A' }} />
                          <div>
                            <div>Weekly Civic Impact Digest</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Summary of campus ranking, badges, and deployed solutions</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${user.preferences?.weeklyDigest ? 'active' : ''}`}
                          onClick={() => handleTogglePref('weeklyDigest')}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notifications Channels Sub-Tab */}
                  {settingsTab === 'Notifications' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="prof-s-section-title">Delivery Channels</div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Bell style={{ width: 16, height: 16, color: '#2563EB' }} />
                          <div>
                            <div>Browser Push Notifications</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Real-time alerts when JanSetu tab is open</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${pushNotifs ? 'active' : ''}`}
                          onClick={() => { setPushNotifs(!pushNotifs); import('../utils/toast').then(m => m.toast(!pushNotifs ? 'Browser notifications enabled' : 'Browser notifications muted', 'info')); }}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Mail style={{ width: 16, height: 16, color: '#16A34A' }} />
                          <div>
                            <div>High Priority Email Alerts</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Forward urgent review requests to {accountEmail}</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${emailNotifs ? 'active' : ''}`}
                          onClick={() => { setEmailNotifs(!emailNotifs); import('../utils/toast').then(m => m.toast(!emailNotifs ? 'Email alerts enabled' : 'Email alerts muted', 'info')); }}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Smartphone style={{ width: 16, height: 16, color: '#EA580C' }} />
                          <div>
                            <div>Emergency SMS Alerts</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Critical disaster mitigation and early flood warnings</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${smsNotifs ? 'active' : ''}`}
                          onClick={() => { setSmsNotifs(!smsNotifs); import('../utils/toast').then(m => m.toast(!smsNotifs ? 'SMS alerts activated' : 'SMS alerts disabled', 'info')); }}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Volume2 style={{ width: 16, height: 16, color: '#9333EA' }} />
                          <div>
                            <div>In-App Sound Notifications</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Play soft sound when badge or stage approval arrives</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${audioNotifs ? 'active' : ''}`}
                          onClick={() => { setAudioNotifs(!audioNotifs); import('../utils/toast').then(m => m.toast(!audioNotifs ? 'Sound alerts enabled' : 'Sound alerts muted', 'info')); }}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Account Credentials Sub-Tab */}
                  {settingsTab === 'Account' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="prof-s-section-title">Institutional Account Details</div>

                      {/* Unique University ID banner */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1.5px solid #BFDBFE',
                        borderRadius: 10,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Official University ID (Unique Login ID)
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A8A', marginTop: 3, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{user.uniqueId || user.universityIdString || user.facultyId || 'U1001'}</span>
                            <span style={{ fontSize: 10, background: '#DCFCE7', color: '#15803D', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                              Verified
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
                            Use this unique ID starting with <strong>U</strong> or your registered email to log into JanSetu.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(user.uniqueId || user.universityIdString || 'U1001');
                            import('../utils/toast').then(m => m.toast('University ID copied to clipboard!', 'success'));
                          }}
                          style={{
                            padding: '7px 12px',
                            background: '#EFF6FF',
                            border: '1px solid #93C5FD',
                            borderRadius: 6,
                            color: '#1D4ED8',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Copy style={{ width: 13, height: 13 }} /> Copy
                        </button>
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Institutional Email
                        </label>
                        <input
                          type="email"
                          value={accountEmail}
                          onChange={e => setAccountEmail(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Registered Contact Phone
                        </label>
                        <input
                          type="text"
                          value={accountPhone}
                          onChange={e => setAccountPhone(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Academic Department
                        </label>
                        <input
                          type="text"
                          value={accountDept}
                          onChange={e => setAccountDept(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                          Faculty Office / Lab Address
                        </label>
                        <input
                          type="text"
                          value={accountOffice}
                          onChange={e => setAccountOffice(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12.5 }}
                        />
                      </div>

                      <button
                        onClick={handleSaveCredentials}
                        className="prof-btn-primary"
                        style={{ alignSelf: 'flex-start', marginTop: 6 }}
                      >
                        <CheckCircle style={{ width: 14, height: 14 }} /> Save Credentials
                      </button>
                    </div>
                  )}

                  {/* Privacy & Security Sub-Tab */}
                  {settingsTab === 'Privacy' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="prof-s-section-title">Privacy Controls</div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Users style={{ width: 16, height: 16, color: '#2563EB' }} />
                          <div>
                            <div>Public Faculty Directory Listing</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Allow other universities and municipal departments to find your profile</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${privacyPublic ? 'active' : ''}`}
                          onClick={() => setPrivacyPublic(!privacyPublic)}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <ShieldCheck style={{ width: 16, height: 16, color: '#16A34A' }} />
                          <div>
                            <div>Allow Industry Mentors to Connect</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Receive corporate CSR collaboration proposals</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${privacyMentorship ? 'active' : ''}`}
                          onClick={() => setPrivacyMentorship(!privacyMentorship)}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      <div className="prof-s-toggle-row">
                        <div className="prof-s-t-left">
                          <Lock style={{ width: 16, height: 16, color: '#7C3AED' }} />
                          <div>
                            <div>Two-Factor Authentication (2FA)</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>Secure institutional login with OTP authentication</div>
                          </div>
                        </div>
                        <div
                          className={`prof-toggle ${twoFactorAuth ? 'active' : ''}`}
                          onClick={() => {
                            setTwoFactorAuth(!twoFactorAuth);
                            import('../utils/toast').then(m => m.toast(!twoFactorAuth ? 'Two-Factor Authentication enabled!' : '2FA disabled', 'info'));
                          }}
                        >
                          <div className="prof-t-knob" />
                        </div>
                      </div>

                      {/* Password Change Form */}
                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, marginTop: 4 }}>
                        <div className="prof-s-section-title">Change Password</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
                          <input
                            type="password"
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            style={{ padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                          />
                          <input
                            type="password"
                            placeholder="New Password (min 6 chars)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            style={{ padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                          />
                          <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            style={{ padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                          />
                          <button
                            onClick={handleUpdatePassword}
                            style={{
                              alignSelf: 'flex-start', background: '#0F172A', color: 'white',
                              border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12,
                              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                            }}
                          >
                            <Key style={{ width: 13, height: 13 }} /> Update Password
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════
         HIGH-RESOLUTION CERTIFICATE MODAL
         ══════════════════════════════════════════ */}
      {viewCertModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 99999, padding: 20
          }}
          onClick={() => setViewCertModal(null)}
        >
          <div
            id="printable-certificate"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFDF9', borderRadius: 20, width: '100%', maxWidth: 740,
              padding: '40px 48px', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '6px double #C8B560', position: 'relative', textAlign: 'center',
              boxSizing: 'border-box'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setViewCertModal(null)}
              className="cert-no-print"
              style={{
                position: 'absolute', top: 16, right: 16, background: '#F1F5F9',
                border: 'none', borderRadius: '50%', width: 32, height: 32,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748B'
              }}
              title="Close Certificate"
            >
              <X style={{ width: 18, height: 18 }} />
            </button>

            {/* National Tricolor Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, height: 4, width: 100, margin: '0 auto 16px' }}>
              <div style={{ flex: 1, background: '#FF9933', borderRadius: 2 }} />
              <div style={{ flex: 1, background: '#D4AF37', borderRadius: 2 }} />
              <div style={{ flex: 1, background: '#138808', borderRadius: 2 }} />
            </div>

            {/* Hub Header */}
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, color: '#78350F', textTransform: 'uppercase', marginBottom: 4 }}>
              JanSetu National University Innovation Hub
            </div>
            <div style={{ fontSize: 11, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Ministry of Education • Government of India
            </div>

            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Certificate of Civic Deployment Excellence
            </h2>
            <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 20 }}>
              Recognizing verified engineering impact for community civic resolution
            </div>

            {/* Certificate Body */}
            <div style={{ margin: '18px 0', padding: '18px 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, color: '#64748B' }}>This is proudly conferred to</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4, marginBottom: 2 }}>
                {viewCertModal.recipientName || user.name}
              </div>
              <div style={{ fontSize: 12.5, color: '#2563EB', fontWeight: 700 }}>
                {viewCertModal.recipientRole || 'Faculty Guide & Lead Mentor'} • {viewCertModal.university || user.institution}
              </div>

              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, maxWidth: 540, margin: '16px auto 0' }}>
                For successfully guiding the technical research, architecture, prototype gate evaluation, and verified municipal deployment for:
              </p>

              <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginTop: 8, fontFamily: 'Outfit' }}>
                "{viewCertModal.projectTitle}"
              </div>

              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
                Under the National Citizen Innovation Bridge Initiative • Deployed on {viewCertModal.issueDate || '12 Jun 2026'}
              </div>
            </div>

            {/* Official Signatures & Seal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '0 24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Brush Script MT, cursive', fontSize: 22, color: '#0F172A', height: 28 }}>
                  {user.name || 'Faculty Guide'}
                </div>
                <div style={{ width: 130, height: 1, background: '#94A3B8', margin: '4px auto' }} />
                <div style={{ fontSize: 10.5, color: '#475569', fontWeight: 700 }}>Faculty Guide</div>
                <div style={{ fontSize: 9.5, color: '#94A3B8' }}>{user.institution || 'University Hub'}</div>
              </div>

              {/* Gold Embossed Seal */}
              <div style={{ width: 62, height: 62, borderRadius: '50%', border: '2.5px solid #C8B560', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFDF5', boxShadow: '0 4px 12px rgba(200,181,96,0.25)' }}>
                <Award style={{ width: 28, height: 28, color: '#D97706' }} />
                <span style={{ fontSize: 7.5, fontWeight: 800, color: '#92400E', letterSpacing: 0.5, textTransform: 'uppercase' }}>VERIFIED</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Brush Script MT, cursive', fontSize: 22, color: '#0F172A', height: 28 }}>
                  Prof. K. Sharma
                </div>
                <div style={{ width: 130, height: 1, background: '#94A3B8', margin: '4px auto' }} />
                <div style={{ fontSize: 10.5, color: '#475569', fontWeight: 700 }}>National Director</div>
                <div style={{ fontSize: 9.5, color: '#94A3B8' }}>JanSetu Innovation Council</div>
              </div>
            </div>

            {/* Serialized Verification Code */}
            <div style={{ marginTop: 22, fontSize: 10, color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'monospace' }}>
              Certificate ID: {viewCertModal.certificateId || 'JS-DEL-2026-0042-VERIFIED'} • Cryptographic Authenticity Verified
            </div>

            {/* Actions (Hidden on Print) */}
            <div className="cert-no-print" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => {
                  window.print();
                  import('../utils/toast').then(m => m.toast('Printing official certificate...', 'info'));
                }}
                className="prof-btn-primary"
                style={{ padding: '9px 18px', fontSize: 12.5 }}
              >
                <Printer style={{ width: 14, height: 14 }} /> Print / Save as PDF
              </button>
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${window.location.origin}/university#/profile?cert=${viewCertModal._id || 'c-1'}`);
                    import('../utils/toast').then(m => m.toast('Certificate verification link copied!', 'success'));
                  }
                }}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1',
                  background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: '#334155', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <Copy style={{ width: 13, height: 13 }} /> Copy Verification Link
              </button>
              <button
                onClick={() => setViewCertModal(null)}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1',
                  background: '#F1F5F9', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
