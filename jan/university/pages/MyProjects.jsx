import { useState, useEffect } from 'react';
import {
  Briefcase, AlertTriangle, Hourglass, Leaf,
  Plus, Search, Building2, MapPin, GraduationCap,
  CalendarDays, MoreHorizontal, CheckCircle, Clock,
  Upload, FileText, Image as ImageIcon, BookOpen,
  ChevronLeft, ChevronRight, FileArchive, Video, ArrowRight,
  Award, Check, X, ExternalLink, MessageSquare, Send,
  Download, Sparkles, ShieldCheck, ThumbsUp, Star,
  Activity, Zap, Droplets, Trash2, Edit3, Users, Filter, Calendar
} from 'lucide-react';

/* ── Fallback Projects ── */
const defaultProjects = [
  {
    _id: 'p-1',
    id: 'p-1',
    title: 'Smart Waste Management System',
    stage: 'In Progress',
    status: 'In Progress',
    progress: 1,
    type: 'Infrastructure',
    loc: 'New Delhi, Delhi',
    team: ['Arjun Sharma', 'Priya Kumar', 'Rahul Mehra', 'Sneha Tiwari'],
    teamSize: 4,
    mentor: { name: 'Dr. Rohan Mehta', org: 'IIT Delhi', initials: 'RM' },
    description: 'AI & IoT based system to monitor waste levels in real-time and optimize collection routes for municipalities.',
    milestones: [
      { name: 'proposal', title: '1. Project Proposal & Architecture', status: 'approved', fileUrl: '/uploads/proposal_v1.pdf', approvedAt: '10 Jan 2025' },
      { name: 'prototype', title: '2. Working Prototype', status: 'pending_review', fileUrl: '/uploads/prototype_specs.pdf', uploadedAt: '15 Feb 2025' },
      { name: 'report', title: '3. Final Report & Verification', status: 'pending' },
      { name: 'video', title: '4. Demo Video & Deployment Plan', status: 'pending' }
    ],
    deadlines: [
      { title: 'Prototype Validation Review', date: '18 Sep 2026', tag: '8 days left', isLight: false },
      { title: 'Faculty Mentor Progress Evaluation', date: '30 Sep 2026', tag: '20 days left', isLight: true }
    ],
    discussion: [
      { sender: 'Dr. Rohan Mehta', role: 'Faculty Mentor', text: 'Please ensure edge firmware includes fallback caching if GSM connectivity drops.', time: 'Yesterday, 4:15 PM', isMentor: true },
      { sender: 'Arjun Sharma', role: 'Team Lead', text: 'Yes Sir! We implemented SQLite on-device storage with auto-sync when network returns.', time: 'Today, 10:30 AM', isMentor: false }
    ],
    selected: true
  }
];

/* ── Domain Badges Helper ── */
const getCategoryDetails = (type = '') => {
  const norm = (type || '').toLowerCase();
  if (norm.includes('health') || norm.includes('opd') || norm.includes('hospital') || norm.includes('medical')) {
    return { label: 'Healthcare', icon: Activity, bg: 'linear-gradient(135deg, #10B981, #059669)', pillBg: '#ECFDF5', pillColor: '#059669', badgeColor: '#10B981' };
  }
  if (norm.includes('disaster') || norm.includes('flood') || norm.includes('hazard') || norm.includes('evacuat')) {
    return { label: 'Disaster Management', icon: AlertTriangle, bg: 'linear-gradient(135deg, #F97316, #EA580C)', pillBg: '#FFF7ED', pillColor: '#C2410C', badgeColor: '#F97316' };
  }
  if (norm.includes('infrastruct') || norm.includes('waste') || norm.includes('road') || norm.includes('pothole') || norm.includes('transport')) {
    return { label: 'Infrastructure', icon: Building2, bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)', pillBg: '#EFF6FF', pillColor: '#1D4ED8', badgeColor: '#2563EB' };
  }
  if (norm.includes('environ') || norm.includes('water') || norm.includes('soil') || norm.includes('air') || norm.includes('green') || norm.includes('clean')) {
    return { label: 'Environmental Science', icon: Leaf, bg: 'linear-gradient(135deg, #16A34A, #15803D)', pillBg: '#F0FDF4', pillColor: '#166534', badgeColor: '#16A34A' };
  }
  if (norm.includes('energy') || norm.includes('solar') || norm.includes('power') || norm.includes('smart') || norm.includes('iot')) {
    return { label: 'Smart City & IoT', icon: Zap, bg: 'linear-gradient(135deg, #6366F1, #4F46E5)', pillBg: '#EEF2FF', pillColor: '#4338CA', badgeColor: '#6366F1' };
  }
  if (norm.includes('edu') || norm.includes('skill') || norm.includes('learn')) {
    return { label: 'Education', icon: GraduationCap, bg: 'linear-gradient(135deg, #F59E0B, #D97706)', pillBg: '#FEF3C7', pillColor: '#92400E', badgeColor: '#F59E0B' };
  }
  return { label: type || 'Civic Tech', icon: Sparkles, bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', pillBg: '#EFF6FF', pillColor: '#1E40AF', badgeColor: '#3B82F6' };
};

const STAGES = ['Assigned', 'In Progress', 'Prototype', 'Submitted', 'Deployed'];

/* ══════════════════════════════════════════
   MY PROJECTS PAGE
   ══════════════════════════════════════════ */
export default function MyProjects() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [projects, setProjects] = useState(defaultProjects);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deploymentCelebration, setDeploymentCelebration] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  // Form states
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    description: '',
    type: 'Infrastructure',
    loc: 'New Delhi, Delhi',
    team: 'Arjun Sharma, Priya Kumar, Rahul Mehra',
    mentorName: 'Dr. Rohan Mehta',
    mentorOrg: 'IIT Delhi'
  });

  const [editProjectData, setEditProjectData] = useState({
    title: '',
    description: '',
    type: 'Infrastructure',
    loc: 'New Delhi, Delhi',
    stage: 'Assigned',
    team: '',
    mentorName: '',
    mentorOrg: ''
  });

  const [newDeadlineData, setNewDeadlineData] = useState({
    title: '',
    date: '25 Sep 2026',
    tag: 'Milestone'
  });

  // Mini Calendar State & Dynamic Generator
  const [calDate, setCalDate] = useState(new Date(2026, 8, 1)); // September 2026

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const parseDeadlineDate = (dateStr) => {
    if (!dateStr) return null;
    const m = String(dateStr).trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIdx = months.findIndex(mon => m[2].toLowerCase().startsWith(mon));
      const year = parseInt(m[3], 10);
      if (monthIdx !== -1) {
        return new Date(year, monthIdx, day);
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getCalendarCells = (deadlines) => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon, 1=Tue ... 6=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        type: 'prev',
        dateStr: `${daysInPrevMonth - i} ${monthNames[(month + 11) % 12].slice(0, 3)} ${month === 0 ? year - 1 : year}`
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = year === 2026 && month === 8 && d === 9; // Sep 9, 2026

      const matchingDeadlines = (deadlines || []).filter(dl => {
        const pDate = parseDeadlineDate(dl.date);
        return pDate && pDate.getFullYear() === year && pDate.getMonth() === month && pDate.getDate() === d;
      });

      const hasEvent = matchingDeadlines.length > 0;
      const isLightEvent = matchingDeadlines.some(dl => dl.isLight);

      cells.push({
        day: d,
        type: 'current',
        isToday,
        hasEvent,
        isLightEvent,
        deadlines: matchingDeadlines,
        dateStr: `${d} ${monthNames[month].slice(0, 3)} ${year}`
      });
    }

    // Next month leading days to complete the 7-day row
    const rem = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= rem; i++) {
      cells.push({
        day: i,
        type: 'next',
        dateStr: `${i} ${monthNames[(month + 1) % 12].slice(0, 3)} ${month === 11 ? year + 1 : year}`
      });
    }

    return cells;
  };

  const getDeadlineDisplayInfo = (dl) => {
    let daysBadge = dl.tag || 'Milestone';
    const targetDate = parseDeadlineDate(dl.date);
    if (targetDate) {
      const now = new Date(2026, 8, 9); // current date Sep 9, 2026
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 1) daysBadge = `${diffDays} days left`;
      else if (diffDays === 1) daysBadge = 'Due Tomorrow';
      else if (diffDays === 0) daysBadge = 'Due Today';
      else if (diffDays < 0) daysBadge = `${Math.abs(diffDays)}d overdue`;
    }

    let sub = 'Academic Project Milestone';
    const lowerTitle = (dl.title || '').toLowerCase();
    if (lowerTitle.includes('prototype')) {
      sub = 'Stage: Prototype • Verification & Lab Testing';
    } else if (lowerTitle.includes('mentor') || lowerTitle.includes('progress') || lowerTitle.includes('evaluation')) {
      sub = 'Faculty Mentor Review • Milestone Assessment';
    } else if (lowerTitle.includes('proposal')) {
      sub = 'Proposal Submission • Architecture Approval';
    } else if (lowerTitle.includes('deploy') || lowerTitle.includes('final')) {
      sub = 'Final Field Deployment • Civic Evaluation';
    } else if (dl.sub) {
      sub = dl.sub;
    } else if (dl.tag && !dl.tag.includes('left')) {
      sub = `${dl.tag} Deliverable`;
    }

    return { daysBadge, sub };
  };

  // Discussion forum state
  const [discussionMessages, setDiscussionMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');

  // Fetch projects from backend
  const fetchProjects = (targetProjectId) => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(prev => {
            const currentSelectedId = targetProjectId || prev.find(p => p.selected)?._id || prev.find(p => p.selected)?.id;
            const hasMatch = currentSelectedId && data.some(p => String(p._id || p.id) === String(currentSelectedId));
            return data.map(p => ({
              ...p,
              selected: hasMatch ? String(p._id || p.id) === String(currentSelectedId) : (p === data[0])
            }));
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || params.get('status');
    const pId = params.get('projectId');
    if (tab) {
      const lower = tab.toLowerCase();
      if (lower === 'history') setStatusFilter('History');
      else if (lower === 'deployed') setStatusFilter('Deployed');
      else if (lower === 'active') setStatusFilter('Active');
      else if (lower === 'at risk' || lower === 'atrisk') setStatusFilter('At Risk');
      else if (lower === 'all') setStatusFilter('All');
    }
    fetchProjects(pId);
  }, []);

  const selectedProject = projects.find(p => p.selected) || projects[0] || {};
  const currentProjectId = selectedProject._id || selectedProject.id;

  // Sync discussion forum with selectedProject
  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.discussion && selectedProject.discussion.length > 0) {
        setDiscussionMessages(selectedProject.discussion);
      } else {
        setDiscussionMessages([
          { sender: 'Dr. Rohan Mehta', role: 'Faculty Mentor', text: 'Team, please review the architecture deliverable and verify telemetry latency before prototype review.', time: 'Yesterday, 4:15 PM', isMentor: true },
          { sender: (selectedProject.team?.[0] || 'Team Lead'), role: 'Innovator', text: 'Yes Sir, we have optimized the telemetry interval and added local failover buffering.', time: 'Today, 10:30 AM', isMentor: false }
        ]);
      }
    }
  }, [selectedProject?._id, selectedProject?.id]);

  // Milestones list normalized
  const milestonesList = selectedProject.milestones && selectedProject.milestones.length > 0
    ? selectedProject.milestones
    : [
        { name: 'proposal', title: '1. Project Proposal & Architecture', status: selectedProject.stage === 'Assigned' ? 'pending' : 'approved', fileUrl: '/uploads/proposal.pdf' },
        { name: 'prototype', title: '2. Working Prototype', status: selectedProject.stage === 'In Progress' ? 'pending_review' : (selectedProject.stage === 'Assigned' ? 'pending' : 'approved'), fileUrl: '/uploads/prototype.pdf' },
        { name: 'report', title: '3. Final Report & Verification', status: selectedProject.stage === 'Prototype' ? 'pending' : (selectedProject.stage === 'Submitted' || selectedProject.stage === 'Deployed' ? 'approved' : 'missing') },
        { name: 'video', title: '4. Demo Video & Deployment Plan', status: selectedProject.stage === 'Deployed' ? 'approved' : 'missing' }
      ];

  // Stage progress index (0: Assigned, 1: In Progress, 2: Prototype, 3: Submitted, 4: Deployed)
  const currentStageName = selectedProject.stage || selectedProject.status || 'Assigned';
  const stageIndex = Math.max(0, STAGES.indexOf(currentStageName));

  // Handle stage/status update
  const handleUpdateStatus = async (newStage, newProgress) => {
    try {
      setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? {
        ...p,
        progress: newProgress,
        stage: newStage,
        status: newStage
      } : p));

      await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress, stage: newStage, status: newStage })
      });
      import('../utils/toast').then(m => m.toast(`Project stage updated to ${newStage}`, 'success'));
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to update project', 'error'));
    }
  };

  // Delete project
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => {
        const next = prev.filter(p => (p._id || p.id) !== id);
        if (next.length > 0 && !next.some(p => p.selected)) next[0].selected = true;
        return next;
      });
      import('../utils/toast').then(m => m.toast('Project deleted successfully', 'success'));
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to delete project', 'error'));
    }
  };

  // Duplicate / Fork project
  const handleDuplicate = async (id) => {
    try {
      const res = await fetch(`/api/problems/${id}/fork`, { method: 'POST' });
      const newP = await res.json();
      if (newP.project) {
        setProjects(prev => [newP.project, ...prev.map(p => ({ ...p, selected: false }))]);
        import('../utils/toast').then(m => m.toast('Project forked & duplicated successfully!', 'success'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Duplicate completed', 'success'));
    }
  };

  // Upload deliverable
  const handleFileUpload = async (milestoneName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', milestoneName);

    try {
      const res = await fetch(`/api/projects/${currentProjectId}/milestones/${encodeURIComponent(milestoneName)}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => {
          if ((p._id || p.id) === currentProjectId) {
            const currentMs = p.milestones || [];
            const exists = currentMs.some(m => m.name === milestoneName || m.title === milestoneName);
            const updated = exists
              ? currentMs.map(m => (m.name === milestoneName || m.title === milestoneName) ? { ...m, status: 'pending_review', fileUrl: data.fileUrl } : m)
              : [...currentMs, { name: milestoneName, title: milestoneName, status: 'pending_review', fileUrl: data.fileUrl }];
            return { ...p, milestones: updated };
          }
          return p;
        }));
        import('../utils/toast').then(m => m.toast(`${milestoneName} uploaded and submitted for mentor review!`, 'success'));
      }
    } catch (err) {
      import('../utils/toast').then(m => m.toast('Upload failed', 'error'));
    }
  };

  // Mentor approves milestone deliverable
  const handleApproveMilestone = async (milestoneName) => {
    try {
      const res = await fetch(`/api/projects/${currentProjectId}/milestones/${encodeURIComponent(milestoneName)}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: selectedProject.mentor?.name || 'Faculty Mentor' })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => {
          if ((p._id || p.id) === currentProjectId) {
            const updatedMs = (p.milestones || []).map(m =>
              (m.name === milestoneName || m.title === milestoneName) ? { ...m, status: 'approved', approvedAt: new Date().toLocaleDateString() } : m
            );
            return {
              ...p,
              stage: data.stage || p.stage,
              status: data.stage || p.status,
              milestones: updatedMs
            };
          }
          return p;
        }));
        import('../utils/toast').then(m => m.toast(`Milestone approved! Project advanced to ${data.stage || 'next stage'}.`, 'success'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to approve milestone', 'error'));
    }
  };

  // Mentor requests revision
  const handleRejectMilestone = async (milestoneName) => {
    const feedback = window.prompt('Enter revision instructions for the student team:', 'Please refine the architecture specs and test data.');
    if (!feedback) return;

    try {
      const res = await fetch(`/api/projects/${currentProjectId}/milestones/${encodeURIComponent(milestoneName)}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => {
          if ((p._id || p.id) === currentProjectId) {
            const updatedMs = (p.milestones || []).map(m =>
              (m.name === milestoneName || m.title === milestoneName) ? { ...m, status: 'needs_revision', feedback } : m
            );
            return { ...p, milestones: updatedMs };
          }
          return p;
        }));
        import('../utils/toast').then(m => m.toast('Revision feedback sent to team', 'info'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to send revision feedback', 'error'));
    }
  };

  // Mark as Deployed (Executes 4 simultaneous triggers)
  const handleDeployProject = async () => {
    if (!window.confirm('Deploy this verified solution to real-world impact? This will:\n1. Auto-create a Battle-Tested Resource in Library\n2. Issue official Certificates to all team members\n3. Notify citizen in Central System\n4. Award +500 Leaderboard Points to your University.')) return;

    try {
      const res = await fetch(`/api/projects/${currentProjectId}/deploy`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? {
          ...p,
          stage: 'Deployed',
          status: 'Deployed',
          progress: 4,
          isBattleTested: true,
          certificatesIssued: true
        } : p));
        setDeploymentCelebration(data);
        import('../utils/toast').then(m => m.toast('🎉 Solution Deployed! 4-fold impact triggers executed.', 'success'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Deployment failed', 'error'));
    }
  };

  // Citizen feedback
  const handleAddCitizenFeedback = async () => {
    const comment = window.prompt('Enter Citizen feedback review:', 'The automated sensor alert successfully notified our ward team during testing.');
    if (!comment) return;

    try {
      const res = await fetch(`/api/projects/${currentProjectId}/citizen-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? { ...p, citizenFeedback: data.citizenFeedback } : p));
        import('../utils/toast').then(m => m.toast('Citizen feedback recorded successfully!', 'success'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to record feedback', 'error'));
    }
  };

  // Persistent Discussion Send
  const handleSendMessage = async () => {
    if (!newMsgText.trim()) return;
    const text = newMsgText.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localMsg = {
      sender: 'Dr. Rohan Mehta',
      role: 'Faculty Mentor',
      text,
      time: timeNow,
      isMentor: true
    };
    
    setDiscussionMessages(prev => [...prev, localMsg]);
    setNewMsgText('');

    try {
      const res = await fetch(`/api/projects/${currentProjectId}/discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localMsg)
      });
      const data = await res.json();
      if (data.success && data.discussion) {
        setDiscussionMessages(data.discussion);
        setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? { ...p, discussion: data.discussion } : p));
      }
    } catch (err) {
      console.error('Discussion error:', err);
    }
  };

  // Add Deadline
  const handleAddDeadline = async () => {
    if (!newDeadlineData.title) return alert('Please enter deadline title');
    try {
      const res = await fetch(`/api/projects/${currentProjectId}/deadlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeadlineData)
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? { ...p, deadlines: data.deadlines } : p));
        setShowDeadlineModal(false);
        setNewDeadlineData({ title: '', date: '25 Sep 2026', tag: 'Milestone' });
        import('../utils/toast').then(m => m.toast('Milestone deadline added!', 'success'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to add deadline', 'error'));
    }
  };

  // Delete Deadline
  const handleDeleteDeadline = async (idx, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this milestone deadline?')) return;
    try {
      const res = await fetch(`/api/projects/${currentProjectId}/deadlines/${idx}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? { ...p, deadlines: data.deadlines } : p));
        import('../utils/toast').then(m => m.toast('Deadline removed', 'info'));
      }
    } catch (e) {
      import('../utils/toast').then(m => m.toast('Failed to delete deadline', 'error'));
    }
  };

  // Accurate Stat Counters (No fake || 1 fallbacks)
  const activeCount = projects.filter(p => p.stage !== 'Deployed' && p.status !== 'Deployed').length;
  const atRiskCount = projects.filter(p => p.status === 'At Risk' || (p.milestones || []).some(m => m.status === 'needs_revision')).length;
  const pendingReviewCount = projects.filter(p => p.stage === 'Submitted' || (p.milestones || []).some(m => m.status === 'pending_review')).length;
  const deployedCount = projects.filter(p => p.stage === 'Deployed' || p.status === 'Deployed' || p.status === 'resolved').length;

  // Filter projects list
  const filteredProjects = projects.filter(p => {
    const isDeployed = p.stage === 'Deployed' || p.status === 'Deployed' || p.status === 'resolved';
    const isAtRisk = p.status === 'At Risk' || (p.milestones || []).some(m => m.status === 'needs_revision');

    const matchStatus = statusFilter === 'All'
      ? true
      : statusFilter === 'Active'
      ? !isDeployed && !isAtRisk
      : statusFilter === 'At Risk'
      ? isAtRisk
      : isDeployed;

    const matchSearch = searchQuery
      ? (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.loc || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchStatus && matchSearch;
  });

  const selectedCategory = getCategoryDetails(selectedProject.type);

  // Context-aware stage action button
  const renderStageActionButton = () => {
    const stage = selectedProject.stage || selectedProject.status || 'Assigned';
    switch (stage) {
      case 'Assigned':
        return (
          <button
            className="mp-btn-primary"
            style={{ background: '#2563EB', borderColor: '#2563EB', padding: '7px 14px' }}
            onClick={() => handleUpdateStatus('In Progress', 1)}
            title="Advance project to In Progress stage"
          >
            <ArrowRight style={{ width: 14, height: 14 }} /> Start Work → In Progress
          </button>
        );
      case 'In Progress':
        return (
          <button
            className="mp-btn-primary"
            style={{ background: '#7C3AED', borderColor: '#7C3AED', padding: '7px 14px' }}
            onClick={() => handleUpdateStatus('Prototype', 2)}
            title="Advance project to Prototype stage"
          >
            <Sparkles style={{ width: 14, height: 14 }} /> Advance to Prototype
          </button>
        );
      case 'Prototype':
        return (
          <button
            className="mp-btn-primary"
            style={{ background: '#EA580C', borderColor: '#EA580C', padding: '7px 14px' }}
            onClick={() => handleUpdateStatus('Submitted', 3)}
            title="Submit completed prototype for faculty mentor review"
          >
            <Send style={{ width: 14, height: 14 }} /> Submit for Mentor Review
          </button>
        );
      case 'Submitted':
        return (
          <button
            className="mp-btn-primary"
            style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', borderColor: '#16A34A', padding: '7px 16px', boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}
            onClick={handleDeployProject}
            title="Deploy verified solution to civic impact"
          >
            <Sparkles style={{ width: 14, height: 14 }} /> 🎉 Deploy Solution
          </button>
        );
      case 'Deployed':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#DCFCE7', color: '#16A34A', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '1px solid #86EFAC' }}>
              <CheckCircle style={{ width: 14, height: 14 }} /> Live on Ground
            </span>
            <button
              className="mp-btn-outline"
              style={{ padding: '6px 12px', fontSize: 11 }}
              onClick={() => setActiveTab('Impact')}
            >
              View Impact →
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const projectDeadlines = (selectedProject.deadlines && selectedProject.deadlines.length > 0)
    ? selectedProject.deadlines
    : [
        { title: 'Prototype Validation Review', date: '18 Sep 2026', tag: '8 days left', isLight: false },
        { title: 'Faculty Mentor Progress Evaluation', date: '30 Sep 2026', tag: '20 days left', isLight: true }
      ];

  return (
    <div className="mp-container animate-in">
      
      {/* ── Hero Section ── */}
      <div className="mp-hero">
        <div className="mp-hero-content">
          <div className="mp-hero-left">
            <h1 className="mp-hero-title">My Active <span style={{ color: '#F97316' }}>Projec</span><span style={{ color: '#16A34A' }}>ts</span></h1>
            <p className="mp-hero-subtitle">Track milestones, mentor reviews, deliverables and real-world deployment impact.</p>
          </div>
          <div className="mp-hero-right">
            <div className="mp-quote-box">
              <span className="mp-quote-mark">“</span>
              <div className="mp-quote-text">
                Solutions for today,<br/>
                <strong>Stronger communities for tomorrow.</strong>
                <span className="mp-quote-attr">— JanSetu Innovation</span>
              </div>
              <span className="mp-quote-mark right">”</span>
            </div>
            <div className="mp-viksit-logo">
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>Viksit Bharat</span>
              <span style={{ fontSize: 10, color: '#2563EB', fontWeight: 600 }}>Through Innovation</span>
              <div style={{ display: 'flex', height: 2, width: 40, marginTop: 4 }}>
                <div style={{ flex: 1, background: '#FF9933' }} />
                <div style={{ flex: 1, background: 'white' }} />
                <div style={{ flex: 1, background: '#138808' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Monument Decorative */}
        <div className="mp-hero-monument">
          <svg viewBox="0 0 300 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: 120, opacity: 0.9 }}>
            <rect x="115" y="30" width="70" height="80" rx="2" fill="#C8B560" />
            <path d="M125 110 L125 60 Q150 40 175 60 L175 110" fill="#F0E8D0" stroke="#C8B560" strokeWidth="1" />
            <rect x="110" y="24" width="80" height="8" rx="2" fill="#DDD4BC" />
            <ellipse cx="150" cy="24" rx="10" ry="14" fill="#C8B560" />
            <path d="M20 110 L20 70 L30 70 L30 60 L40 60 L40 70 L80 70 L80 60 L90 60 L90 70 L100 70 L100 110 Z" fill="#D28F75" />
            <path d="M210 110 L210 80 Q230 40 250 80 L250 110 Z" fill="#E8E8E8" stroke="#D0D0D0" />
            <rect x="200" y="60" width="4" height="50" fill="#E8E8E8" />
            <rect x="256" y="60" width="4" height="50" fill="#E8E8E8" />
          </svg>
        </div>
      </div>

      {/* ── Stats Row (Accurate Dynamic Numbers) ── */}
      <div className="mp-stats-row">
        <div className="mp-stat-card">
          <div className="mp-stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}><Briefcase style={{ width: 20, height: 20 }} /></div>
          <div>
            <div className="mp-stat-val">{activeCount}</div>
            <div className="mp-stat-title">Active Projects</div>
            <div className="mp-stat-desc" style={{ color: '#0284C7' }}>Building in progress</div>
          </div>
        </div>
        <div className="mp-stat-card" style={{ borderBottomColor: atRiskCount > 0 ? '#EF4444' : 'transparent' }}>
          <div className="mp-stat-icon" style={{ background: atRiskCount > 0 ? '#FEF2F2' : '#F8FAFC', color: atRiskCount > 0 ? '#EF4444' : '#94A3B8' }}><AlertTriangle style={{ width: 20, height: 20 }} /></div>
          <div>
            <div className="mp-stat-val" style={{ color: atRiskCount > 0 ? '#EF4444' : '#1E293B' }}>{atRiskCount}</div>
            <div className="mp-stat-title">At Risk</div>
            <div className="mp-stat-desc" style={{ color: atRiskCount > 0 ? '#EF4444' : '#94A3B8' }}>{atRiskCount > 0 ? 'Needs attention' : 'Healthy status'}</div>
          </div>
        </div>
        <div className="mp-stat-card" style={{ borderBottomColor: pendingReviewCount > 0 ? '#F97316' : 'transparent' }}>
          <div className="mp-stat-icon" style={{ background: pendingReviewCount > 0 ? '#FFF7ED' : '#F8FAFC', color: pendingReviewCount > 0 ? '#F97316' : '#94A3B8' }}><Hourglass style={{ width: 20, height: 20 }} /></div>
          <div>
            <div className="mp-stat-val">{pendingReviewCount}</div>
            <div className="mp-stat-title">Pending Mentor Review</div>
            <div className="mp-stat-desc" style={{ color: pendingReviewCount > 0 ? '#F97316' : '#94A3B8' }}>{pendingReviewCount > 0 ? 'Action required' : 'All reviews clear'}</div>
          </div>
        </div>
        <div className="mp-stat-card" style={{ borderBottomColor: '#16A34A' }}>
          <div className="mp-stat-icon" style={{ background: '#ECFDF5', color: '#16A34A' }}><Leaf style={{ width: 20, height: 20 }} /></div>
          <div>
            <div className="mp-stat-val">{deployedCount}</div>
            <div className="mp-stat-title">Deployed Solutions</div>
            <div className="mp-stat-desc" style={{ color: '#16A34A' }}>Proven ground impact</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout Grid ── */}
      <div className="mp-grid">
        
        {/* Left Column - Project List */}
        <div className="mp-col-left">
          <div className="mp-list-header">
            <h2 className="mp-list-title">My Projects</h2>
            <button className="mp-btn-primary" onClick={() => setShowNewModal(true)}>
              <Plus style={{ width: 14, height: 14 }} /> New Project
            </button>
          </div>

          {/* Upgraded Pill Chips */}
          <div className="mp-filter-pills">
            <button className={`mp-pill ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
              All <span className="mp-pill-count">{projects.length}</span>
            </button>
            <button className={`mp-pill ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => setStatusFilter('Active')}>
              Active <span className="mp-pill-count">{activeCount}</span>
            </button>
            <button className={`mp-pill ${statusFilter === 'At Risk' ? 'active' : ''}`} onClick={() => setStatusFilter('At Risk')}>
              At Risk <span className="mp-pill-count">{atRiskCount}</span>
            </button>
            <button className={`mp-pill ${statusFilter === 'Deployed' ? 'active' : ''}`} onClick={() => setStatusFilter('Deployed')}>
              Deployed <span className="mp-pill-count">{deployedCount}</span>
            </button>
            <button className={`mp-pill ${statusFilter === 'History' ? 'active' : ''}`} onClick={() => setStatusFilter('History')}>
              History <span className="mp-pill-count">{deployedCount}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="mp-search-box">
            <Search style={{ width: 15, height: 15, color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by title, domain, or location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Project List */}
          <div className="mp-project-list">
            {filteredProjects.map(p => {
              const isSel = (p._id || p.id) === currentProjectId;
              const displayStage = p.stage || p.status || 'Assigned';
              const pCat = getCategoryDetails(p.type);
              const CatIcon = pCat.icon;

              return (
                <div
                  key={p._id || p.id}
                  className={`mp-project-item ${isSel ? 'selected' : ''}`}
                  onClick={() => {
                    setProjects(prev => prev.map(proj => ({ ...proj, selected: (proj._id || proj.id) === (p._id || p.id) })));
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    {/* Domain Icon Badge */}
                    <div className="mp-pi-badge-icon" style={{ background: pCat.bg }}>
                      <CatIcon style={{ width: 18, height: 18, color: 'white' }} />
                    </div>
                    <span className={`mp-status-badge ${displayStage.toLowerCase().replace(/\s+/g, '-')}`}>
                      {displayStage}
                    </span>
                  </div>
                  <h3 className="mp-pi-title">{p.title}</h3>
                  <div className="mp-pi-meta">
                    <span><Building2 style={{ width: 12, height: 12, color: '#94A3B8' }} /> {p.type || 'Innovation Project'}</span>
                    <span><MapPin style={{ width: 12, height: 12, color: '#94A3B8' }} /> {p.loc || 'New Delhi, Delhi'}</span>
                  </div>
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 16px', background: 'white', borderRadius: 12, border: '1px dashed #CBD5E1', color: '#94A3B8', fontSize: 12 }}>
                No projects match current filter.
              </div>
            )}
          </div>

          <div className="mp-bottom-promo">
            <h4 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', lineHeight: 1.2, position: 'relative', zIndex: 2 }}>
              From Campus Ideas<br/>to a Cleaner, Greener,<br/>Stronger India.
            </h4>
            <div style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.3, width: 120, height: 120 }}>
              <svg viewBox="0 0 100 100" fill="#2563EB"><path d="M50 10 L60 30 L90 30 L65 50 L75 80 L50 60 L25 80 L35 50 L10 30 L40 30 Z" /></svg>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 10, width: 40, height: 3, display: 'flex' }}>
              <div style={{ flex: 1, background: '#FF9933' }} />
              <div style={{ flex: 1, background: 'white' }} />
              <div style={{ flex: 1, background: '#138808' }} />
            </div>
          </div>
        </div>

        {/* Middle Column - Project Details & Workflow */}
        <div className="mp-col-mid">
          
          <div className="mp-detail-header">
            <div style={{ display: 'flex', gap: 18 }}>
              
              {/* Modern Glass Domain Badge Box */}
              <div className="mp-dh-badge-box" style={{ background: selectedCategory.bg }}>
                <selectedCategory.icon style={{ width: 28, height: 28, color: 'white', marginBottom: 12 }} />
                <span className="mp-dh-cat-chip">{selectedCategory.label}</span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 className="mp-dh-title">{selectedProject.title || 'Select a Project'}</h2>
                    <span className={`mp-status-badge ${(selectedProject.stage || selectedProject.status || 'assigned').toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedProject.stage || selectedProject.status || 'Assigned'}
                    </span>
                    {selectedProject.isBattleTested && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#16A34A', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, border: '1px solid #86EFAC' }}>
                        <ShieldCheck style={{ width: 12, height: 12 }} /> Battle-Tested
                      </span>
                    )}
                  </div>

                  {/* Context-Aware Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                    {renderStageActionButton()}

                    <button
                      className="mp-btn-outline"
                      style={{ padding: '7px 14px' }}
                      onClick={() => {
                        setEditProjectData({
                          title: selectedProject.title,
                          description: selectedProject.description || '',
                          type: selectedProject.type || 'Infrastructure',
                          loc: selectedProject.loc || 'New Delhi, Delhi',
                          stage: selectedProject.stage || selectedProject.status || 'Assigned',
                          team: (selectedProject.team || []).join(', '),
                          mentorName: selectedProject.mentor?.name || 'Dr. Rohan Mehta',
                          mentorOrg: selectedProject.mentor?.org || 'IIT Delhi'
                        });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit3 style={{ width: 13, height: 13 }} /> Edit Project
                    </button>

                    <button className="mp-btn-icon" onClick={() => setShowDropdown(!showDropdown)}>
                      <MoreHorizontal style={{ width: 16, height: 16 }} />
                    </button>

                    {showDropdown && (
                      <div style={{ position: 'absolute', top: 38, right: 0, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.15)', zIndex: 60, minWidth: 180, overflow: 'hidden' }}>
                        <button style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: '#1E293B', fontSize: 12, fontWeight: 600 }} onClick={() => { setShowDropdown(false); handleDuplicate(currentProjectId); }}>
                          Duplicate / Fork
                        </button>
                        <button style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: '#1E293B', fontSize: 12, fontWeight: 600 }} onClick={() => { setShowDropdown(false); handleDeployProject(); }}>
                          Deploy Solution
                        </button>
                        <button style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: '#EF4444', fontSize: 12, fontWeight: 600 }} onClick={() => { setShowDropdown(false); handleDelete(currentProjectId); }}>
                          Delete Project
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mp-dh-meta">
                  <span><Building2 style={{ width: 14, height: 14, color: '#64748B' }} /> {selectedProject.type || 'Infrastructure'}</span>
                  <span><MapPin style={{ width: 14, height: 14, color: '#64748B' }} /> {selectedProject.loc || 'New Delhi, Delhi'}</span>
                  <span><Users style={{ width: 14, height: 14, color: '#64748B' }} /> Team: {(selectedProject.team || []).join(', ') || 'Lead Innovators'}</span>
                </div>
                
                <p className="mp-dh-desc">
                  {selectedProject.description || 'Engineering innovation developed by student researchers addressing verified civic challenges.'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mp-tabs">
              {['Overview', 'Submissions', 'Activity', 'Discussion', 'Impact'].map(t => (
                <button
                  key={t}
                  className={`mp-tab ${activeTab === t ? 'active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB 1: OVERVIEW ── */}
          {activeTab === 'Overview' && (
            <>
              {/* Milestone Timeline Card */}
              <div className="mp-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h3 className="mp-card-title">Project Milestone Timeline</h3>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      Current Stage: <strong style={{ color: '#2563EB' }}>{currentStageName}</strong> (Step {stageIndex + 1} of 5)
                    </div>
                  </div>
                  {selectedProject.stage === 'Deployed' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#DCFCE7', padding: '6px 14px', borderRadius: 8, border: '1px solid #86EFAC' }}>
                      <CheckCircle style={{ width: 16, height: 16, color: '#16A34A' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>Solution Fully Deployed</span>
                    </div>
                  ) : (
                    <div className="mp-milestone-alert">
                      <Clock style={{ width: 14, height: 14, color: '#F97316' }} />
                      <div>
                        <div style={{ fontSize: 9, color: '#64748B' }}>Next milestone target</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#F97316' }}>Active Stage</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mp-timeline">
                  <div className="mp-timeline-track">
                    <div className="mp-timeline-fill" style={{ width: `${Math.min(100, Math.max(10, stageIndex * 25))}%` }} />
                  </div>
                  
                  <div className="mp-timeline-steps">
                    {/* Step 1: Assigned */}
                    <div className={`mp-t-step ${stageIndex >= 0 ? (stageIndex > 0 ? 'complete' : 'active') : ''}`}>
                      <div className="mp-t-dot">
                        {stageIndex > 0 ? <CheckCircle style={{ width: 14, height: 14 }} /> : <span style={{ fontSize: 11, fontWeight: 800 }}>1</span>}
                      </div>
                      <div className="mp-t-label">Assigned</div>
                      <div className="mp-t-date">Initial Stage</div>
                      <div className="mp-t-sub">Team Set</div>
                      <button className="mp-t-btn text-only" onClick={() => setActiveTab('Submissions')}>View</button>
                    </div>

                    {/* Step 2: In Progress */}
                    <div className={`mp-t-step ${stageIndex >= 1 ? (stageIndex > 1 ? 'complete' : 'active') : ''}`}>
                      <div className="mp-t-dot">
                        {stageIndex > 1 ? <CheckCircle style={{ width: 14, height: 14 }} /> : <span style={{ fontSize: 11, fontWeight: 800 }}>2</span>}
                      </div>
                      <div className="mp-t-label">In Progress</div>
                      <div className="mp-t-date">Architecture</div>
                      <div className="mp-t-sub">Deliverables</div>
                      {stageIndex === 0 ? (
                        <button className="mp-t-btn primary" onClick={() => handleUpdateStatus('In Progress', 1)}>Start</button>
                      ) : (
                        <button className="mp-t-btn text-only" onClick={() => setActiveTab('Submissions')}>View</button>
                      )}
                    </div>

                    {/* Step 3: Prototype */}
                    <div className={`mp-t-step ${stageIndex >= 2 ? (stageIndex > 2 ? 'complete' : 'active') : ''}`}>
                      <div className="mp-t-dot">
                        {stageIndex > 2 ? <CheckCircle style={{ width: 14, height: 14 }} /> : <span style={{ fontSize: 11, fontWeight: 800 }}>3</span>}
                      </div>
                      <div className="mp-t-label">Prototype</div>
                      <div className="mp-t-date">Field Model</div>
                      <div className="mp-t-sub">Validation</div>
                      {stageIndex === 1 ? (
                        <button className="mp-t-btn primary" onClick={() => handleUpdateStatus('Prototype', 2)}>Build</button>
                      ) : stageIndex === 2 ? (
                        <button className="mp-t-btn primary" onClick={() => handleUpdateStatus('Submitted', 3)}>Submit</button>
                      ) : (
                        <button className="mp-t-btn text-only" onClick={() => setActiveTab('Submissions')}>View</button>
                      )}
                    </div>

                    {/* Step 4: Submitted */}
                    <div className={`mp-t-step ${stageIndex >= 3 ? (stageIndex > 3 ? 'complete' : 'active') : ''}`}>
                      <div className="mp-t-dot">
                        {stageIndex > 3 ? <CheckCircle style={{ width: 14, height: 14 }} /> : <span style={{ fontSize: 11, fontWeight: 800 }}>4</span>}
                      </div>
                      <div className="mp-t-label">Submitted</div>
                      <div className="mp-t-date">Final Review</div>
                      <div className="mp-t-sub">Mentor Gate</div>
                      {stageIndex === 3 ? (
                        <button className="mp-t-btn primary" style={{ background: '#16A34A' }} onClick={handleDeployProject}>Deploy</button>
                      ) : (
                        <button className="mp-t-btn text-only" onClick={() => setActiveTab('Submissions')}>View</button>
                      )}
                    </div>

                    {/* Step 5: Deployed */}
                    <div className={`mp-t-step ${stageIndex >= 4 ? 'complete' : ''}`}>
                      <div className="mp-t-dot" style={stageIndex >= 4 ? { background: '#16A34A', borderColor: '#16A34A', color: 'white' } : {}}>
                        {stageIndex >= 4 ? <Sparkles style={{ width: 14, height: 14 }} /> : <span style={{ fontSize: 11, fontWeight: 800 }}>5</span>}
                      </div>
                      <div className="mp-t-label">Deployed</div>
                      <div className="mp-t-date">Civic Impact</div>
                      <div className="mp-t-sub">Certificates</div>
                      {stageIndex >= 4 ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#16A34A' }}>Live 🎉</span>
                      ) : (
                        <button className="mp-t-btn secondary" onClick={handleDeployProject}>Deploy</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestone Submission & Mentor Review Gate */}
              <div className="mp-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 className="mp-card-title">Milestone Submission & Mentor Approval Gate</h3>
                    <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Upload deliverable artifacts. Mentors review deliverables and advance project stages.
                    </p>
                  </div>
                  {stageIndex === 3 && (
                    <button className="mp-btn-primary" style={{ background: '#16A34A', borderColor: '#16A34A' }} onClick={handleDeployProject}>
                      <Sparkles style={{ width: 14, height: 14 }} /> Deploy Solution
                    </button>
                  )}
                </div>

                <div className="mp-submission-grid">
                  {milestonesList.map((m, idx) => {
                    const isApproved = m.status === 'approved';
                    const isPendingReview = m.status === 'pending_review';
                    const isNeedsRev = m.status === 'needs_revision';
                    const isMissing = !isApproved && !isPendingReview && !isNeedsRev && m.status === 'missing';

                    return (
                      <div key={idx} className={`mp-sub-box ${isPendingReview ? 'active' : ''} ${isMissing ? 'disabled' : ''}`}>
                        <div className="mp-sb-header">
                          <span className="mp-sb-title">{m.title || `Milestone ${idx + 1}`}</span>
                          <span className={`mp-sb-status ${isApproved ? 'complete' : isPendingReview ? 'pending' : isNeedsRev ? 'missing' : 'missing'}`}>
                            {isApproved && <><CheckCircle style={{ width: 12, height: 12 }} /> Approved</>}
                            {isPendingReview && <><Clock style={{ width: 12, height: 12 }} /> Pending Mentor Review</>}
                            {isNeedsRev && <><AlertTriangle style={{ width: 12, height: 12, color: '#EF4444' }} /> Revision Requested</>}
                            {isMissing && <><AlertTriangle style={{ width: 12, height: 12 }} /> Upcoming</>}
                            {!isApproved && !isPendingReview && !isNeedsRev && !isMissing && <>Ready to Submit</>}
                          </span>
                        </div>

                        {/* File preview info if uploaded */}
                        {m.fileUrl && (
                          <div className="mp-sb-file" style={{ background: '#F8FAFC', padding: 8, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                            <FileText style={{ width: 20, height: 20, color: '#2563EB', flexShrink: 0 }} />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                {m.fileUrl.split('/').pop()}
                              </div>
                              <div style={{ fontSize: 9, color: '#64748B' }}>Deliverable artifact uploaded</div>
                            </div>
                          </div>
                        )}

                        {/* Revision feedback banner */}
                        {isNeedsRev && m.feedback && (
                          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, padding: '6px 8px', marginBottom: 12, fontSize: 10, color: '#B91C1C' }}>
                            <strong>Mentor note:</strong> {m.feedback}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
                          {m.fileUrl && (
                            <button
                              className="mp-btn-outline"
                              style={{ width: '100%' }}
                              onClick={() => {
                                if (m.fileUrl.startsWith('http')) window.open(m.fileUrl, '_blank');
                                else setPreviewFile(m);
                              }}
                            >
                              <ExternalLink style={{ width: 12, height: 12 }} /> View Deliverable
                            </button>
                          )}

                          {/* Mentor review gate actions if pending review */}
                          {isPendingReview && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="mp-btn-primary"
                                style={{ flex: 1, background: '#16A34A', borderColor: '#16A34A', padding: '6px 8px', fontSize: 10 }}
                                onClick={() => handleApproveMilestone(m.name || m.title)}
                              >
                                <Check style={{ width: 12, height: 12 }} /> Approve
                              </button>
                              <button
                                className="mp-btn-outline"
                                style={{ flex: 1, color: '#EF4444', borderColor: '#FCA5A5', padding: '6px 8px', fontSize: 10 }}
                                onClick={() => handleRejectMilestone(m.name || m.title)}
                              >
                                <X style={{ width: 12, height: 12 }} /> Revise
                              </button>
                            </div>
                          )}

                          {/* Upload / Re-upload button */}
                          {(!isApproved || isNeedsRev) && (
                            <label className="mp-btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }}>
                              <Upload style={{ width: 12, height: 12, marginRight: 4 }} />
                              {m.fileUrl ? 'Re-upload File' : 'Upload Deliverable'}
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                onChange={e => handleFileUpload(m.name || m.title, e)}
                              />
                            </label>
                          )}

                          {isApproved && (
                            <div style={{ textAlign: 'center', fontSize: 10, color: '#16A34A', fontWeight: 700, padding: 4 }}>
                              ✓ Verified by Faculty Mentor
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Details Card */}
              <div className="mp-card">
                <h3 className="mp-card-title" style={{ marginBottom: 16 }}>Project Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Problem Statement</h4>
                    <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                      {selectedProject.description || 'Urban communities face critical infrastructure and sustainability challenges. This capstone engineering team builds verified technical solutions with measurable ground impact.'}
                    </p>
                  </div>
                  <div className="mp-details-meta">
                    <div className="mp-dm-row">
                      <span className="mp-dm-label"><FileArchive style={{ width: 14, height: 14 }} /> Category</span>
                      <span className="mp-dm-val">{selectedProject.type || 'Infrastructure'}</span>
                    </div>
                    <div className="mp-dm-row">
                      <span className="mp-dm-label"><MapPin style={{ width: 14, height: 14 }} /> Location</span>
                      <span className="mp-dm-val">{selectedProject.loc || 'New Delhi, Delhi'}</span>
                    </div>
                    <div className="mp-dm-row">
                      <span className="mp-dm-label"><GraduationCap style={{ width: 14, height: 14 }} /> Faculty Mentor</span>
                      <span className="mp-dm-val">{selectedProject.mentor?.name || 'Dr. Rohan Mehta'} ({selectedProject.mentor?.org || 'IIT Delhi'})</span>
                    </div>
                    <div className="mp-dm-row">
                      <span className="mp-dm-label"><CalendarDays style={{ width: 14, height: 14 }} /> Status</span>
                      <span className="mp-dm-val" style={{ color: '#2563EB' }}>{currentStageName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── TAB 2: SUBMISSIONS ── */}
          {activeTab === 'Submissions' && (
            <div className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 className="mp-card-title">All Project Submissions & Artifacts</h3>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Repository of code repositories, schematics, and verification reports.</p>
                </div>
                <label className="mp-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Upload style={{ width: 14, height: 14 }} /> Upload New Artifact
                  <input type="file" style={{ display: 'none' }} onChange={e => handleFileUpload('Ad-hoc Deliverable', e)} />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {milestonesList.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText style={{ width: 22, height: 22, color: '#2563EB' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{m.title || `Milestone ${idx + 1}`}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          Status: <strong style={{ color: m.status === 'approved' ? '#16A34A' : '#F97316' }}>{m.status || 'Pending'}</strong> • {m.fileUrl ? m.fileUrl.split('/').pop() : 'No file uploaded yet'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {m.fileUrl && (
                        <button className="mp-btn-outline" onClick={() => setPreviewFile(m)}>
                          <ExternalLink style={{ width: 12, height: 12 }} /> View
                        </button>
                      )}
                      {m.status === 'pending_review' && (
                        <button className="mp-btn-primary" style={{ background: '#16A34A', borderColor: '#16A34A' }} onClick={() => handleApproveMilestone(m.name || m.title)}>
                          <Check style={{ width: 12, height: 12 }} /> Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: ACTIVITY ── */}
          {activeTab === 'Activity' && (
            <div className="mp-card">
              <h3 className="mp-card-title" style={{ marginBottom: 16 }}>Project Activity Trail</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles style={{ width: 14, height: 14 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Project Initialized & Team Assigned</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Problem assigned to {selectedProject.team?.join(', ') || 'Lead Innovators'}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Stage 1: Assigned</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GraduationCap style={{ width: 14, height: 14 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Faculty Mentor Assigned</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{selectedProject.mentor?.name || 'Dr. Rohan Mehta'} joined as technical guide.</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{selectedProject.mentor?.org || 'IIT Delhi'}</div>
                  </div>
                </div>

                {selectedProject.stage === 'Deployed' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Award style={{ width: 14, height: 14 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>🎉 Real-world Deployment Completed!</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Verified Battle-Tested blueprint created and certificates issued to all innovators.</div>
                      <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700, marginTop: 2 }}>Live on Ground</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: DISCUSSION (Persistent MongoDB) ── */}
          {activeTab === 'Discussion' && (
            <div className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 className="mp-card-title">Project Discussion & Mentor Forum</h3>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Real-time communication between faculty guide and student research team.</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '3px 8px', borderRadius: 12 }}>
                  ● Connected Live
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {discussionMessages.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: msg.isMentor ? '#F8FAFC' : 'white', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: msg.isMentor ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'linear-gradient(135deg, #10B981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      {(msg.sender || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <div>
                          <strong style={{ fontSize: 12, color: '#1E293B' }}>{msg.sender}</strong>
                          <span style={{ fontSize: 10, color: msg.isMentor ? '#2563EB' : '#10B981', marginLeft: 6, fontWeight: 700 }}>{msg.role}</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>{msg.time}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.45, margin: 0 }}>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Type a message or instruction for team and faculty guide..."
                  value={newMsgText}
                  onChange={e => setNewMsgText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: 12, outline: 'none' }}
                />
                <button className="mp-btn-primary" onClick={handleSendMessage} style={{ padding: '8px 18px' }}>
                  <Send style={{ width: 14, height: 14 }} /> Send
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 5: IMPACT (Stage 7) ── */}
          {activeTab === 'Impact' && (
            <div className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 className="mp-card-title">Real-World Community Impact (Stage 7)</h3>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Live field impact metrics, citizen ratings, and feedback tracking.</p>
                </div>
                <button className="mp-btn-primary" onClick={handleAddCitizenFeedback}>
                  <Plus style={{ width: 14, height: 14 }} /> Record Citizen Feedback
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#ECFDF5', padding: 16, borderRadius: 10, border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>Target Ward Location</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#047857', marginTop: 4 }}>{selectedProject.loc || 'New Delhi, Delhi'}</div>
                </div>
                <div style={{ background: '#EFF6FF', padding: 16, borderRadius: 10, border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF' }}>Community Beneficiaries</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1D4ED8', marginTop: 4 }}>12,400+ Citizens</div>
                </div>
                <div style={{ background: '#FFFBEB', padding: 16, borderRadius: 10, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>Citizen Satisfaction</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#B45309', marginTop: 4 }}>4.9 / 5.0 ⭐</div>
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 12 }}>Citizen Feedback & Reviews</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(selectedProject.citizenFeedback && selectedProject.citizenFeedback.length > 0) ? (
                  selectedProject.citizenFeedback.map((fb, i) => (
                    <div key={i} style={{ padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ display: 'flex', color: '#F59E0B' }}>
                          {[...Array(fb.rating || 5)].map((_, idx) => (
                            <Star key={idx} style={{ width: 12, height: 12, fill: '#F59E0B' }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: '#64748B' }}>• Verified Citizen Resident</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>{fb.comment}</p>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontSize: 12, border: '1px dashed #E2E8F0', borderRadius: 8 }}>
                    No citizen feedback recorded yet. Click "+ Record Citizen Feedback" to add field review data.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Sidebar */}
        <div className="mp-col-right">
          
          {/* Upcoming Deadlines Card */}
          <div className="mp-card" style={{ padding: '20px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="mp-card-title" style={{ fontSize: 15 }}>Upcoming Deadlines</h3>
              <button
                className="mp-add-dl-btn"
                onClick={() => setShowDeadlineModal(true)}
              >
                <Plus style={{ width: 12, height: 12 }} /> Add
              </button>
            </div>

            {/* Mini Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
              <button
                onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}
                title="Previous Month"
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <span>{monthNames[calDate.getMonth()]} {calDate.getFullYear()}</span>
              <button
                onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748B' }}
                title="Next Month"
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Mini Calendar Grid */}
            <div className="mp-cal-grid">
              <div className="mp-cal-head">Mon</div>
              <div className="mp-cal-head">Tue</div>
              <div className="mp-cal-head">Wed</div>
              <div className="mp-cal-head">Thu</div>
              <div className="mp-cal-head">Fri</div>
              <div className="mp-cal-head">Sat</div>
              <div className="mp-cal-head">Sun</div>
              
              {getCalendarCells(projectDeadlines).map((cell, cIdx) => {
                const isCurrent = cell.type === 'current';
                let cellClass = 'mp-cal-day';
                if (!isCurrent) cellClass += ' old';
                else if (cell.isToday) cellClass += ' today';
                else if (cell.hasEvent) {
                  cellClass += cell.isLightEvent ? ' event-light' : ' event';
                }

                const tooltipTitle = cell.deadlines?.length > 0
                  ? cell.deadlines.map(d => `${d.title} (${d.date})`).join('\n')
                  : (cell.isToday ? 'Today (Sep 9, 2026)' : `Click to set deadline on ${cell.dateStr}`);

                return (
                  <div
                    key={cIdx}
                    className={cellClass}
                    title={tooltipTitle}
                    onClick={() => {
                      if (isCurrent) {
                        setNewDeadlineData({
                          title: '',
                          date: cell.dateStr,
                          tag: 'Milestone'
                        });
                        setShowDeadlineModal(true);
                      }
                    }}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>

            {/* Dynamic Events List */}
            <div className="mp-event-list">
              {projectDeadlines.length === 0 ? (
                <div style={{ padding: '16px 10px', textAlign: 'center', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1', fontSize: 11, color: '#64748B' }}>
                  No milestone deadlines scheduled.<br />
                  <button
                    onClick={() => setShowDeadlineModal(true)}
                    style={{ marginTop: 8, border: 'none', background: '#2563EB', color: '#FFFFFF', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add First Deadline
                  </button>
                </div>
              ) : (
                projectDeadlines.map((dl, idx) => {
                  const { daysBadge, sub } = getDeadlineDisplayInfo(dl);
                  const isLight = dl.isLight || daysBadge.includes('2') || daysBadge.includes('3') || daysBadge.includes('20');

                  return (
                    <div key={idx} className={`mp-event-item ${isLight ? 'light' : ''}`}>
                      <div className="mp-ei-top">
                        <div className="mp-ei-date">
                          <Calendar style={{ width: 13, height: 13, color: isLight ? '#D97706' : '#EF4444' }} />
                          {dl.date}
                        </div>
                        <div className="mp-ei-actions">
                          <span className={`mp-ei-tag ${isLight ? 'light' : ''}`}>
                            <Clock style={{ width: 10, height: 10 }} />
                            {daysBadge}
                          </span>
                          <button
                            className="mp-dl-del-btn"
                            title="Delete deadline"
                            onClick={(e) => handleDeleteDeadline(idx, e)}
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="mp-ei-title">{dl.title}</div>
                        <div className="mp-ei-sub">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLight ? '#F59E0B' : '#EF4444', flexShrink: 0 }} />
                          {sub}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Deliverables Card */}
          <div className="mp-card" style={{ padding: '20px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="mp-card-title" style={{ fontSize: 15 }}>Recent Deliverables</h3>
              <button
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setActiveTab('Submissions')}
              >
                View All <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
            
            <div className="mp-recent-list">
              <div className="mp-recent-item" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('Submissions')}>
                <div className="mp-ri-icon pdf"><FileText style={{ width: 16, height: 16 }} /></div>
                <div>
                  <div className="mp-ri-name">architecture_spec_v2.pdf</div>
                  <div className="mp-ri-proj">{selectedProject.title}</div>
                  <div className="mp-ri-time">Verified deliverable</div>
                </div>
              </div>
              <div className="mp-recent-item" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('Submissions')}>
                <div className="mp-ri-icon img"><ImageIcon style={{ width: 16, height: 16 }} /></div>
                <div>
                  <div className="mp-ri-name">hardware_schematics.png</div>
                  <div className="mp-ri-proj">{selectedProject.title}</div>
                  <div className="mp-ri-time">CAD & Circuit models</div>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Library Banner */}
          <div className="mp-resource-banner">
            <BookOpen style={{ width: 24, height: 24, color: '#16A34A', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#064E3B', fontWeight: 500, lineHeight: 1.5 }}>
              Deployed solutions feed the<br/>
              <strong>Resource Library</strong> — so more teams across India can build on your success.
            </p>
          </div>

        </div>

      </div>

      {/* ── NEW PROJECT MODAL ── */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 28, borderRadius: 16, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B' }}>Create New Innovation Project</h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. AI Pothole Detection and Road Safety System"
                  value={newProjectData.title}
                  onChange={e => setNewProjectData({ ...newProjectData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea
                  placeholder="Briefly describe the civic challenge and technical architecture..."
                  value={newProjectData.description}
                  onChange={e => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12, minHeight: 70 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Discipline / Domain</label>
                  <select
                    value={newProjectData.type}
                    onChange={e => setNewProjectData({ ...newProjectData, type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  >
                    <option value="Healthcare">Healthcare</option>
                    <option value="Disaster Management">Disaster Management</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Environmental Science">Environmental Science</option>
                    <option value="Smart City">Smart City & IoT</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Location</label>
                  <input
                    type="text"
                    value={newProjectData.loc}
                    onChange={e => setNewProjectData({ ...newProjectData, loc: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Student Team Members (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="Arjun Sharma, Priya Kumar, Rahul Mehra"
                  value={newProjectData.team}
                  onChange={e => setNewProjectData({ ...newProjectData, team: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Faculty Mentor Name</label>
                  <input
                    type="text"
                    value={newProjectData.mentorName}
                    onChange={e => setNewProjectData({ ...newProjectData, mentorName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Mentor Institution</label>
                  <input
                    type="text"
                    value={newProjectData.mentorOrg}
                    onChange={e => setNewProjectData({ ...newProjectData, mentorOrg: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowNewModal(false)} style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newProjectData.title) return alert('Please enter project title');
                  try {
                    const teamArray = newProjectData.team ? newProjectData.team.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const res = await fetch('/api/projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: newProjectData.title,
                        description: newProjectData.description,
                        type: newProjectData.type,
                        loc: newProjectData.loc,
                        team: teamArray,
                        teamSize: teamArray.length || 4,
                        mentor: {
                          name: newProjectData.mentorName || 'Dr. Rohan Mehta',
                          org: newProjectData.mentorOrg || 'IIT Delhi',
                          initials: (newProjectData.mentorName || 'RM').split(' ').map(w => w[0]).join('').slice(0, 2)
                        }
                      })
                    });
                    const data = await res.json();
                    if (data.project) {
                      setProjects(prev => [data.project, ...prev.map(p => ({ ...p, selected: false }))]);
                    }
                    setShowNewModal(false);
                    setNewProjectData({
                      title: '',
                      description: '',
                      type: 'Infrastructure',
                      loc: 'New Delhi, Delhi',
                      team: 'Arjun Sharma, Priya Kumar, Rahul Mehra',
                      mentorName: 'Dr. Rohan Mehta',
                      mentorOrg: 'IIT Delhi'
                    });
                    import('../utils/toast').then(m => m.toast('New project created and initialized!', 'success'));
                  } catch (e) {
                    import('../utils/toast').then(m => m.toast('Failed to create project', 'error'));
                  }
                }}
                className="mp-btn-primary"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROJECT MODAL ── */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 28, borderRadius: 16, width: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B' }}>Edit Project Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Project Title</label>
                <input
                  type="text"
                  value={editProjectData.title}
                  onChange={e => setEditProjectData({ ...editProjectData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea
                  value={editProjectData.description}
                  onChange={e => setEditProjectData({ ...editProjectData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12, minHeight: 70 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Project Stage</label>
                  <select
                    value={editProjectData.stage}
                    onChange={e => setEditProjectData({ ...editProjectData, stage: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Domain / Type</label>
                  <select
                    value={editProjectData.type}
                    onChange={e => setEditProjectData({ ...editProjectData, type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  >
                    <option value="Healthcare">Healthcare</option>
                    <option value="Disaster Management">Disaster Management</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Environmental Science">Environmental Science</option>
                    <option value="Smart City">Smart City & IoT</option>
                    <option value="Education">Education</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Location</label>
                  <input
                    type="text"
                    value={editProjectData.loc}
                    onChange={e => setEditProjectData({ ...editProjectData, loc: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Faculty Mentor Name</label>
                  <input
                    type="text"
                    value={editProjectData.mentorName}
                    onChange={e => setEditProjectData({ ...editProjectData, mentorName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Student Team Members</label>
                <input
                  type="text"
                  value={editProjectData.team}
                  onChange={e => setEditProjectData({ ...editProjectData, team: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  const teamArr = editProjectData.team ? editProjectData.team.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const payload = {
                    title: editProjectData.title,
                    description: editProjectData.description,
                    type: editProjectData.type,
                    loc: editProjectData.loc,
                    stage: editProjectData.stage,
                    status: editProjectData.stage,
                    team: teamArr,
                    teamSize: teamArr.length || 4,
                    mentor: {
                      name: editProjectData.mentorName || 'Dr. Rohan Mehta',
                      org: editProjectData.mentorOrg || 'IIT Delhi',
                      initials: (editProjectData.mentorName || 'RM').split(' ').map(w => w[0]).join('').slice(0, 2)
                    }
                  };

                  await fetch(`/api/projects/${currentProjectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  setProjects(prev => prev.map(p => (p._id || p.id) === currentProjectId ? {
                    ...p,
                    ...payload,
                    progress: STAGES.indexOf(editProjectData.stage)
                  } : p));

                  setShowEditModal(false);
                  import('../utils/toast').then(m => m.toast('Project details saved successfully', 'success'));
                }}
                className="mp-btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD DEADLINE MODAL ── */}
      {showDeadlineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 24, borderRadius: 14, width: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>Add Milestone Deadline</h3>
              <button onClick={() => setShowDeadlineModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Milestone / Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Edge Hardware Prototype Review"
                  value={newDeadlineData.title}
                  onChange={e => setNewDeadlineData({ ...newDeadlineData, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Target Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 25 Sep 2026"
                    value={newDeadlineData.date}
                    onChange={e => setNewDeadlineData({ ...newDeadlineData, date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Priority Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Critical, Review"
                    value={newDeadlineData.tag}
                    onChange={e => setNewDeadlineData({ ...newDeadlineData, tag: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowDeadlineModal(false)} style={{ padding: '7px 14px', border: '1px solid #CBD5E1', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleAddDeadline} className="mp-btn-primary" style={{ padding: '7px 14px' }}>
                Add Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 6 DEPLOYMENT CELEBRATION MODAL ── */}
      {deploymentCelebration && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 560, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '2px solid #86EFAC', textAlign: 'center', position: 'relative' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sparkles style={{ width: 32, height: 32 }} />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
              🎉 Solution Successfully Deployed!
            </h2>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' }}>
              Congratulations to team <strong>{(selectedProject.team || []).join(', ') || 'Lead Innovators'}</strong>. Your engineering solution has crossed the campus gate into verified real-world civic impact!
            </p>

            {/* 4 Impact cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck style={{ width: 16, height: 16, color: '#16A34A' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Battle-Tested Resource</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Auto-published to JanSetu Library with verified blueprint.</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Award style={{ width: 16, height: 16, color: '#2563EB' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Official Certificates</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Issued to all team members, viewable in Profile.</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ThumbsUp style={{ width: 16, height: 16, color: '#D97706' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Citizen Loop Closed</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Citizen submitter notified to test & leave reviews.</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles style={{ width: 16, height: 16, color: '#9333EA' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>+500 Innovation Points</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Awarded to University Leaderboard score.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <a href="/university#/profile" className="mp-btn-primary" style={{ textDecoration: 'none' }}>
                <Award style={{ width: 14, height: 14 }} /> View Certificates in Profile
              </a>
              <a href="/university#/resources" className="mp-btn-outline" style={{ textDecoration: 'none' }}>
                <BookOpen style={{ width: 14, height: 14 }} /> Browse Resource Library
              </a>
              <button onClick={() => setDeploymentCelebration(null)} style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILE PREVIEW MODAL ── */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div style={{ background: 'white', borderRadius: 12, width: 480, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ width: 20, height: 20, color: '#2563EB' }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{previewFile.title || 'Deliverable Document'}</h3>
              </div>
              <button onClick={() => setPreviewFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#1E293B', fontWeight: 600, marginBottom: 6 }}>
                File Path: <span style={{ color: '#2563EB', wordBreak: 'break-all' }}>{previewFile.fileUrl}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
                Status: <strong style={{ color: previewFile.status === 'approved' ? '#16A34A' : '#F97316' }}>{previewFile.status}</strong>
                <br/>
                This file is stored in JanSetu server repository. Click below to view or trigger document download.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setPreviewFile(null)} style={{ padding: '8px 16px', border: '1px solid #CBD5E1', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Close
              </button>
              <a
                href={previewFile.fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="mp-btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <Download style={{ width: 14, height: 14 }} /> Download Document
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
