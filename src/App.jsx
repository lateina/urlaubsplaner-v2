import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import MobileNav from './components/Layout/MobileNav';
import CalendarView from './components/Calendar/CalendarView';
import RequestsView from './components/Requests/RequestsView';
import EmployeeAdmin from './components/Admin/EmployeeAdmin';
import CategoryAdmin from './components/Admin/SkillAdmin';
import AbsenceSummary from './components/Admin/AbsenceSummary';
import ICalExportModal from './components/Admin/ICalExportModal';
import InstallPrompt from './components/UI/InstallPrompt';
import Login from './components/Auth/Login';
import { apiService } from './services/apiService';
import { APP_CONFIG } from './config/appConfig';
import { PLANER_PROFILES, DEFAULT_PROFILE } from './config/planerConfig';
import { ROTATION_BIN_ID, MONTH_AREA_MAPPING, MONTH_AREA_ORDER } from './config/rotationConfig';
import { getSpecialDayInfo } from './utils/calendarUtils';
import './styles/layout.css';

const DEFAULT_GROUP_COLORS = {
  // Stationen (IDs aus rotationConfig.js)
  'station18a': '#3b82f6',
  'station18b': '#3b82f6',
  'station19a': '#6366f1',
  'station19b': '#6366f1',
  'notaufnahme': '#14b8a6',
  'echolabor': '#06b6d4',
  'hkl': '#8b5cf6',
  'cpu': '#f59e0b',
  'hfu': '#ef4444',
  
  // Skills (IDs generiert aus Namen)
  'skill_chef': '#ef4444',
  'skill_privat': '#84cc16',
  'skill_keinvertreternotig': '#6b7280',
  'skill_funktionsoberarzt': '#475569',
  'skill_tavi': '#10b981',
  'skill_teer': '#f59e0b',
  'skill_herzkatheter': '#8b5cf6',
  'skill_echo': '#06b6d4',
  'skill_interventionellesecho': '#10b981', // Das grüne Echo
  'skill_epu': '#ec4899',
  'skill_intensiv': '#6366f1',
  'skill_pneumo': '#14b8a6',
  'skill_ambulanz': '#84cc16'
};

const LEGACY_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const App = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [auth, setAuth] = useState(() => {
    // Detect planerType early for storage key name spacing
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    let effectiveType = p;
    if (!PLANER_PROFILES[effectiveType]) {
      const path = window.location.pathname;
      if (path.includes('assistenz.html')) effectiveType = 'ass';
      else if (path.includes('index.html') || path.endsWith('/')) effectiveType = 'oa';
      else effectiveType = localStorage.getItem('planer_type') || DEFAULT_PROFILE;
    }

    const savedKey = localStorage.getItem(`${effectiveType}_jsonbin_key`) || localStorage.getItem('jsonbin_key') || '';
    const savedUser = localStorage.getItem(`${effectiveType}_logged_user`);
    const savedProfile = localStorage.getItem(`${effectiveType}_auth_profile`);
    
    return { 
      user: savedUser ? JSON.parse(savedUser) : null, 
      masterKey: savedKey, 
      isAuthenticated: !!(savedKey && savedUser),
      authProfile: savedProfile 
    };
  });

  const [appData, setAppData] = useState({ 
    employees: [], 
    absences: {}, 
    requests: [],
    skills: [], 
    groupColors: DEFAULT_GROUP_COLORS,
    rotationData: [],
    vacationStats: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isICalModalOpen, setIsICalModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Detect planer type from filename or localStorage (no forced URL params for PWA stability)
  const [planerType, setPlanerType] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (PLANER_PROFILES[p]) {
      localStorage.setItem('planer_type', p);
      return p;
    }

    // Fallback: check the path
    const path = window.location.pathname;
    if (path.includes('assistenz.html')) return 'ass';
    if (path.includes('index.html') || path.endsWith('/')) return 'oa';

    const saved = localStorage.getItem('planer_type');
    return PLANER_PROFILES[saved] ? saved : DEFAULT_PROFILE;
  });

  const binId = planerType === 'oa' ? APP_CONFIG.OA_BIN_ID : APP_CONFIG.ASS_BIN_ID;

  // Sync planerType to localStorage and body classes (ignore URL for PWA)
  useEffect(() => {
    localStorage.setItem('planer_type', planerType);
    document.body.classList.remove('planer-ass', 'planer-oa');
    document.body.classList.add(`planer-${planerType}`);
    
    // iPhone detection for specialized styling
    const isIPHONE = /iPhone/.test(navigator.userAgent) && !window.MSStream;
    if (isIPHONE) {
      document.body.classList.add('is-iphone');
    }

    // Dynamic theme color update for PWA title bar (macOS/Android)
    const color = planerType === 'oa' ? '#f3e8ff' : '#dbeafe';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  }, [planerType]);


  // Auto-collapse sidebar in landscape on mobile-sized screens
  useEffect(() => {
    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobileSize = window.innerWidth <= 950;
      if (isLandscape && isMobileSize) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial load check

  useEffect(() => {
    if (auth.masterKey && auth.isAuthenticated) {
      loadData(auth.masterKey);
    }
  }, [planerType, auth.isAuthenticated]);

  const loadData = useCallback(async (key) => {
    setIsLoading(true);
    setError(null);
    const profile = PLANER_PROFILES[planerType];
    try {
      const data = await apiService.load(binId, key);
      let employees = data.employees || [];
      let absences = data.state || {}; // In the bin it's called "state"

      // --- Healing Logic: Detect if absences was overwritten by a single formData object ---
      if (absences && absences.startDate && absences.employeeId) {
        console.warn('Absences data was corrupted (overwritten by a form). Healing...');
        const formData = absences;
        const healed = {};
        const dates = [];
        let curr = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
        healed[formData.employeeId] = {};
        dates.forEach(d => {
          healed[formData.employeeId][d] = {
            type: formData.type || 'U',
            text: formData.remarks || '',
            status: 'confirmed'
          };
        });
        absences = healed;
      }
      // --- End Healing Logic ---

      let requests = data.requests || data.__REQUESTS__ || []; // Try both names
      let skills = (data.skills && data.skills.length > 0) ? data.skills : (profile.defaultSkills || []);
      let groupColors = { 
        ...DEFAULT_GROUP_COLORS, 
        ...(profile.defaultColors || {}),
        ...(data.groupColors || {}) 
      };
      let status = data.status || data.__STATUS__ || absences.__STATUS__ || {};
      let areaOrder = data.areaOrder || null;

      // Cross-fetch FOAs if this is the Resident Planner
      if (planerType === 'ass') {
        try {
          const oaData = await apiService.load(APP_CONFIG.OA_BIN_ID, key);
          const foas = (oaData.employees || []).filter(emp => {
            const grps = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
            // LEGACY MATCH: Be flexible with naming (case-insensitive "funktionsoberarzt")
            return grps.some(g => g && String(g).toLowerCase().includes('funktionsoberarzt'));
          }).map(f => ({ 
            ...f, 
            groups: ['skill_funktionsoberarzt'], // Force ONLY FOA skill in resident view for correct color/sort
            _isCrossProfile: true 
          }));

          // Merge FOAs (only if not already present by ID)
          foas.forEach(f => {
            if (!employees.find(e => e.id === f.id)) {
              employees.push(f);
              if (oaData.state?.[f.id]) {
                absences[f.id] = oaData.state[f.id];
              }
            }
          });

          // Ensure "Funktionsoberarzt" is at the TOP of the skills list for residents
          const foaIdx = skills.findIndex(s => {
            const name = typeof s === 'object' ? s.name : s;
            return name && String(name).toLowerCase().includes('funktionsoberarzt');
          });
          
          if (foaIdx === -1) {
             const foaSkill = { id: 'skill_funktionsoberarzt', name: 'Funktionsoberarzt' };
             skills.unshift(foaSkill); // Put at the very top
          } else if (foaIdx > 0) {
             // Move existing one to the top
             const [item] = skills.splice(foaIdx, 1);
             skills.unshift(item);
          }
        } catch (e) {
          console.warn("Could not cross-load FOAs from OA bin", e);
        }
      }

      // Load rotation data silently
      let rotations = [];
      try {
        rotations = await apiService.load(ROTATION_BIN_ID, key);
      } catch (e) { console.warn("Rotation data load failed", e); }

      const migratedSkills = skills.map(s => {
        if (typeof s === 'object' && s.id) return s;
        return { 
          id: `skill_${String(s).toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`, 
          name: String(s) 
        };
      });
      
      const migratedEmployees = employees.map(emp => {
        const groups = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
        const migratedGroups = groups.map(g => {
          if (g?.startsWith?.('skill_')) return g;
          const skillObj = migratedSkills.find(s => s.name === g);
          return skillObj ? skillObj.id : g;
        });
        return { ...emp, groups: migratedGroups, group: undefined };
      });

      const migratedColors = {};
      const combinedGroupColors = { ...DEFAULT_GROUP_COLORS, ...groupColors };
      Object.entries(combinedGroupColors).forEach(([key, color]) => {
        if (key.startsWith('skill_') || key.startsWith('station')) {
          migratedColors[key] = color;
        } else {
          const skillObj = migratedSkills.find(s => s.name === key);
          if (skillObj) {
            migratedColors[skillObj.id] = color;
          } else {
            migratedColors[key] = color;
          }
        }
      });
      
      const finalStats = updateVacationStats(absences, migratedEmployees, data.vacationStats || {});

      setAppData({
        employees: migratedEmployees,
        absences: absences,
        requests: requests,
        skills: migratedSkills,
        groupColors: migratedColors,
        rotationData: rotations || [],
        areaOrder: areaOrder,
        status: status,
        vacationStats: finalStats
      });
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Daten.');
      setAuth(prev => ({ ...prev, isAuthenticated: false }));
    } finally {
      setIsLoading(false);
    }
  }, [binId, planerType]);

  const handleLogin = (loginData) => {
    localStorage.setItem(`${planerType}_logged_user`, JSON.stringify(loginData.user));
    localStorage.setItem(`${planerType}_auth_profile`, planerType);
    localStorage.setItem(`${planerType}_jsonbin_key`, loginData.masterKey);
    
    setAuth({
      user: loginData.user,
      masterKey: loginData.masterKey,
      isAuthenticated: true,
      authProfile: planerType
    });
    // Load data will happen automatically via useEffect
  };


  const handleLogout = () => {
    localStorage.removeItem(`${planerType}_logged_user`);
    localStorage.removeItem(`${planerType}_auth_profile`);
    setAuth(prev => ({ ...prev, user: null, isAuthenticated: false, authProfile: null }));
    // We keep jsonbin_key for convenience, but it's now namespaced too
    window.location.reload();
  };


  const calculateVacationUsed = (empId, absences, year = 2026) => {
    let count = 0;
    const empAbsences = absences[empId] || {};
    
    Object.entries(empAbsences).forEach(([dateStr, entry]) => {
      // Basic type check
      const type = typeof entry === 'object' ? entry.type : entry;
      const status = typeof entry === 'object' ? entry.status : 'confirmed';
      
      if (!dateStr.startsWith(String(year))) return;
      if (status === 'rejected') return;
      
      if (type === 'U' || type === 'V') {
        const d = new Date(dateStr);
        const dow = d.getDay();
        const isWeekend = (dow === 0 || dow === 6);
        const { holiday } = getSpecialDayInfo(dateStr);
        if (!isWeekend && !holiday) {
          count++;
        }
      }
    });
    return count;
  };

  const updateVacationStats = (newAbsences, employees = null, currentStats = null) => {
    const targetEmployees = employees || appData.employees;
    const statsToUpdate = currentStats || appData.vacationStats;
    const newStats = { ...statsToUpdate };
    const year = 2026; 
    
    targetEmployees.forEach(emp => {
      const used = calculateVacationUsed(emp.id, newAbsences, year);
      const currentQuota = emp.vacationQuota ?? (statsToUpdate[emp.id]?.quota ?? 30);
      newStats[emp.id] = { total: used, quota: currentQuota };
    });
    return newStats;
  };

  // Helper to save entire state
  const saveAllData = async (newData) => {
    setIsLoading(true);
    try {
      const storagePayload = {
        ...newData,
        state: newData.absences, // Sync back to "state" key in bin
        __REQUESTS__: newData.requests // Sync back to legacy key too just in case
      };
      // Remove cross-profile employees from saving
      if (storagePayload.employees) {
        storagePayload.employees = storagePayload.employees.filter(e => !e._isCrossProfile);
      }
      
      await apiService.save(binId, auth.masterKey, storagePayload);
      setAppData(newData);
    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAbsence = async (newAbsences) => {
    let finalAbsences = newAbsences;
    
    // Detect if this is formData from AbsenceModal (single update) or a full object
    // formData has startDate and employeeId, while full absences object is keyed by employeeId
    if (newAbsences && typeof newAbsences === 'object' && newAbsences.startDate && newAbsences.employeeId) {
      const formData = newAbsences;
      finalAbsences = { ...appData.absences };
      
      const dates = [];
      let curr = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }

      if (!finalAbsences[formData.employeeId]) finalAbsences[formData.employeeId] = {};
      dates.forEach(d => {
        finalAbsences[formData.employeeId][d] = {
          type: formData.type,
          text: formData.remarks || '',
          status: 'confirmed'
        };
      });
    }

    const updatedStats = updateVacationStats(finalAbsences);
    await saveAllData({ ...appData, absences: finalAbsences, vacationStats: updatedStats });
  };


  const handleSubmitRequest = async (request) => {
    let updatedAbsences = appData.absences;
    
    // If request is pre-approved (direct Admin entry), also update absences
    if (request.status === 'approved') {
      updatedAbsences = { ...appData.absences };
      if (!updatedAbsences[request.empId]) updatedAbsences[request.empId] = {};
      request.dates.forEach(date => {
        updatedAbsences[request.empId][date] = {
          type: request.type,
          text: request.text,
          vertreter: request.vertreter,
          vertreterId: request.vertreterId,
          status: 'confirmed'
        };
      });
    }

    const updatedRequests = [...appData.requests, request];
    const updatedStats = updateVacationStats(updatedAbsences);
    
    await saveAllData({ 
      ...appData, 
      requests: updatedRequests, 
      absences: updatedAbsences,
      vacationStats: updatedStats
    });
  };


  const handleApproveRequest = async (reqId, byType) => {
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    const request = { ...appData.requests[reqIndex] };
    const updatedRequests = [...appData.requests];

    if (byType === 'vertreter') {
      request.status = 'pending_admin';
      request.stamps = { ...request.stamps, vertreter: makeStamp(auth.user) };
      updatedRequests[reqIndex] = request;
      await saveAllData({ ...appData, requests: updatedRequests });
    } else if (byType === 'admin') {
      request.status = 'approved';
      request.stamps = { ...request.stamps, admin: makeStamp(auth.user) };
      
      // Also add to absences
      const newAbsences = { ...appData.absences };
      if (!newAbsences[request.empId]) newAbsences[request.empId] = {};
      request.dates.forEach(date => {
        newAbsences[request.empId][date] = {
          type: request.type,
          text: request.text,
          vertreter: request.vertreter,
          vertreterId: request.vertreterId,
          status: 'confirmed'
        };
      });
      
      updatedRequests[reqIndex] = request;
      const updatedStats = updateVacationStats(newAbsences);
      await saveAllData({ 
        ...appData, 
        requests: updatedRequests, 
        absences: newAbsences,
        vacationStats: updatedStats
      });
    }
  };

  const handleRejectRequest = async (reqId, byType, note) => {
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    const request = { ...appData.requests[reqIndex] };
    request.status = 'rejected';
    request.rejectedBy = byType;
    request.rejectionNote = note;
    request.stamps = { ...request.stamps, rejected: makeStamp(auth.user) };

    const updatedRequests = [...appData.requests];
    updatedRequests[reqIndex] = request;
    await saveAllData({ ...appData, requests: updatedRequests });
  };

  const handleDeleteRequest = async (reqId) => {
    const updatedRequests = appData.requests.filter(r => r.id !== reqId);
    await saveAllData({ ...appData, requests: updatedRequests });
  };
  const handleMarkPODone = async (reqId, checked, shortcut) => {
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    const request = { ...appData.requests[reqIndex] };
    if (checked) {
      request.stamps = { 
        ...request.stamps, 
        po: { 
          at: new Date().toISOString(), 
          by: auth.user.id, 
          name: auth.user.name, 
          shortcut: shortcut 
        } 
      };
    } else {
      if (request.stamps) {
        const { po, ...otherStamps } = request.stamps;
        request.stamps = otherStamps;
      }
    }

    const updatedRequests = [...appData.requests];
    updatedRequests[reqIndex] = request;
    await saveAllData({ ...appData, requests: updatedRequests });
  };

  const makeStamp = (user) => ({
    at: new Date().toISOString(),
    uid: user?.id,
    name: user?.stampAlias || user?.name,

    ua: navigator.userAgent
  });

  const handleUpdateAdminData = async (newData) => {
    const nextAppData = { ...appData, ...newData };
    if (newData.employees || newData.absences) {
      nextAppData.vacationStats = updateVacationStats(nextAppData.absences, nextAppData.employees, nextAppData.vacationStats);
    }
    await saveAllData(nextAppData);
    alert('Erfolgreich gespeichert!');
  };

  const isFullAdmin = auth.user?.id === 'admin';
  const isSekretariat = auth.user?.id === 'sekretariat';
  const isSpokesperson = auth.user?.id === 'assistentensprecher' || auth.user?.role === 'assistentensprecher';
  const isAdmin = isFullAdmin || isSekretariat || isSpokesperson;

  const perms = {
    canAdminEmployees: isFullAdmin || isSpokesperson,
    canAdminSkills: isFullAdmin || isSpokesperson,
    canAdminAreas: isFullAdmin || isSpokesperson,
    canSeeSummary: isFullAdmin || isSekretariat || isSpokesperson,
    canBulkImport: isFullAdmin,
    canRequestAbsence: true,
    canICalExport: isFullAdmin || isSekretariat,
    canEnterDirectly: isFullAdmin,
    canDeleteAbsences: isFullAdmin,
    canSwitchPlaner: isFullAdmin || isSekretariat,
    forcePlanerAss: isSpokesperson,
    canEditSpecialAccounts: isFullAdmin,
    canSeePOKarte: isFullAdmin || isSekretariat,
    canShowCalendarEntry: !isSekretariat
  };




  // Force Assistentenplaner for spokesperson
  useEffect(() => {
    if (perms.forcePlanerAss && planerType !== 'ass') {
      setPlanerType('ass');
    }
  }, [perms.forcePlanerAss, planerType]);

  // Authorization check: prevent non-admins from switching planners via URL
  useEffect(() => {
    if (auth.isAuthenticated && !perms.canSwitchPlaner && auth.authProfile) {
      if (planerType !== auth.authProfile) {
        console.warn(`Unauthorized access attempt to ${planerType}. Redirecting to ${auth.authProfile}.`);
        setPlanerType(auth.authProfile);
      }
    }
  }, [auth.isAuthenticated, auth.authProfile, planerType, perms.canSwitchPlaner]);

  const poPendingCount = appData.requests.filter(r => r.status === 'approved' && !r.stamps?.po).length;

  const actionRequiredCount = appData.requests.filter(r => {
    if (isAdmin) return r.status === 'pending_admin';
    return r.status === 'pending_vertreter' && r.vertreterId === auth.user?.id;
  }).length + (perms.canSeePOKarte ? poPendingCount : 0);


  const togglePlaner = () => {
    if (!isAdmin) return;
    const next = planerType === 'ass' ? 'oa' : 'ass';
    setPlanerType(next);
    // We NO LONGER modify the URL here to keep PWAs stable.
    // The state and localStorage change will handle the profile switch.
  };


  const profile = PLANER_PROFILES[planerType];

  if (!auth.isAuthenticated) {
    return <Login onLogin={handleLogin} initialMasterKey={auth.masterKey} binId={binId} planerType={planerType} />;
  }

  const renderContent = () => {
    if (isLoading && appData.employees.length === 0) {
      return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-spinner">Lade Daten...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'calendar':
        return (
          <CalendarView 
            planerType={planerType}
            employees={appData.employees} 
            absences={appData.absences}
            requests={appData.requests}
            onSaveAbsences={handleSaveAbsence}
            onSubmitRequest={handleSubmitRequest}
            isAdmin={isAdmin}
            currentUser={auth.user}
            groupColors={appData.groupColors}
            rotationData={appData.rotationData}
            skills={appData.skills}
            areaOrder={appData.areaOrder}
            actionRequiredCount={actionRequiredCount}
            vacationStats={appData.vacationStats}
            onUpdateAdminData={handleUpdateAdminData}
            perms={perms}
          />
        );
      case 'requests':
        return (
          <RequestsView 
            requests={appData.requests}
            employees={appData.employees}
            currentUser={auth.user}
            isAdmin={isAdmin}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onDelete={handleDeleteRequest}
            onMarkPODone={handleMarkPODone}
            perms={perms}
            planerType={planerType}
          />


        );
      case 'summary':
        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'transparent' }}>
            <AbsenceSummary 
              employees={appData.employees} 
              absences={appData.absences} 
              status={appData.status} 
            />
          </div>
        );
      case 'employees':
        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'transparent' }}>
            <EmployeeAdmin 
              employees={appData.employees} 
              skills={appData.skills} 
              onSave={(newList) => handleUpdateAdminData({ employees: newList })} 
              perms={perms}
            />

          </div>
        );
      case 'skills':
        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'transparent' }}>
            <CategoryAdmin 
              title="Skills verwalten"
              type="skills"
              items={appData.skills} 
              employees={appData.employees} 
              groupColors={appData.groupColors}
              palette={LEGACY_PALETTE}
              onSave={(newData) => handleUpdateAdminData(newData)} 
            />
          </div>
        );
      case 'areas':
        if (planerType === 'oa' || !perms.canAdminAreas) return null;

        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'transparent' }}>
            <CategoryAdmin 
              title="Rotationsbereiche verwalten"
              type="areas"
              canEdit={false}
              items={(appData.areaOrder || MONTH_AREA_ORDER).map(id => ({ id, name: MONTH_AREA_MAPPING[id] || id }))}
              groupColors={appData.groupColors}
              palette={LEGACY_PALETTE}
              onSave={(newData) => handleUpdateAdminData({ 
                groupColors: newData.groupColors,
                areaOrder: newData.areaOrder 
              })} 
            />
          </div>
        );
      case 'settings':
        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '40px', background: 'transparent' }}>
            <h2 style={{ marginBottom: '24px' }}>Einstellungen</h2>
            <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', background: '#f8fafc' }}>
               <p>Hier können Sie globale Einstellungen für den Planer vornehmen.</p>
               <button 
                 onClick={handleLogout}
                 style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginTop: '20px' }}
               >
                 Abmelden
               </button>
            </div>
          </div>
        )
      default:
        return null;
    }

  };

  return (
    <div className="app-shell" style={{ '--primary': profile.primaryColor }}>
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        planerType={planerType}
        onPlanerSwitch={togglePlaner}
        isAdmin={isAdmin}
        perms={perms}
        onLogout={handleLogout}
        currentUser={auth.user}
        badgeCount={actionRequiredCount}
        onOpenICal={() => setIsICalModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className="main-content">
        <Header user={auth.user} onLogout={handleLogout} />
        
        <div className="view-container">
          {error ? (
            <div className="error-banner">{error} <button onClick={() => loadData(auth.masterKey)}>Erneut versuchen</button></div>
          ) : renderContent()}
        </div>

        <MobileNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          badgeCount={actionRequiredCount}
          isAdmin={isAdmin}
          perms={perms}
          onOpenICal={() => setIsICalModalOpen(true)}
        />
        <InstallPrompt />
      </main>
      {/* Modals & Overlays */}
      <ICalExportModal 
        isOpen={isICalModalOpen} 
        onClose={() => setIsICalModalOpen(false)}
        absences={appData.absences}
        employees={appData.employees}
        perms={perms}
      />
    </div>
  );
};

const PlaceholderView = ({ title, description }) => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'
  }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
    <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>{title}</h2>
    <p>{description}</p>
  </div>
);

export default App;
