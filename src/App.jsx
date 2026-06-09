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
import LegalModal from './components/UI/LegalModal';
import Login from './components/Auth/Login';
import BugReportModal from './components/UI/BugReportModal';
import { apiService } from './services/apiService';
import { firestoreService } from './services/firestoreService';
import { db, auth as firebaseAuth } from './config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { APP_CONFIG } from './config/appConfig';
import { PLANER_PROFILES, DEFAULT_PROFILE } from './config/planerConfig';
import { Toaster, toast } from 'react-hot-toast';
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

const OA_ONLY_IDS = new Set([
  'skill_chef', 'skill_privat', 'skill_tavi', 'skill_teer', 'skill_herzkatheter', 
  'skill_echo', 'skill_epu', 'skill_intensiv', 'skill_pneumo', 'skill_ambulanz',
  'skill_interventionellesecho'
]);
const ASS_ONLY_IDS = new Set([
  'skill_intermits', 'skill_notaufnahme', 'skill_fremdrotation', 'skill_kardiologie'
]);
const SHARED_SKILL_IDS = new Set([
  'skill_funktionsoberarzt', 'skill_keinvertreternotig'
]);

const App = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenBugReport = () => setIsBugModalOpen(true);
    window.addEventListener('open-bug-report', handleOpenBugReport);
    return () => window.removeEventListener('open-bug-report', handleOpenBugReport);
  }, []);
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
      isAuthenticated: !!savedUser, // Key is now optional/automatic
      authProfile: savedProfile
    };
  });

  // Standalone Firebase Auth (Anonymous) for Firestore access
  useEffect(() => {
    signInAnonymously(firebaseAuth).catch(err => {
      console.error("Firebase Anonymous Login failed:", err);
    });
  }, []);

  const [appData, setAppData] = useState({
    employees: [],
    fullEmployeeList: [], // NEW: Store everything from JSONBin
    fullSkillList: [],    // NEW: Store everything from JSONBin
    absences: {},
    requests: [],
    skills: [],
    groupColors: DEFAULT_GROUP_COLORS,
    rotationData: [],
    vacationStats: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isICalModalOpen, setIsICalModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
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
    if (auth.isAuthenticated) {
      loadData();
    }
  }, [planerType, auth.isAuthenticated]);
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const profile = PLANER_PROFILES[planerType];

    try {
      // Start all Firestore queries in parallel immediately to speed up loading
      const configPromise = firestoreService.loadConfig();
      const fsAbsencesPromise = firestoreService.loadAbsences(planerType);
      const fsRequestsAssPromise = firestoreService.loadRequests('ass');
      const fsRequestsOaPromise = firestoreService.loadRequests('oa');
      const fsOAAbsencesPromise = (planerType === 'ass') ? firestoreService.loadAbsences('oa') : Promise.resolve({});
      const fsRotationPromise = firestoreService.loadRotation();

      // 1. Await Config (needed for jsonbin fallback key)
      const fsConfig = await configPromise;
      const sourceData = fsConfig || {};
      
      // Determine the key to use (Firestore config > Auth state > localStorage)
      const effectiveKey = sourceData.jsonbin_key || auth.masterKey || localStorage.getItem(`${planerType}_jsonbin_key`);

      // 2. Await Parallel Fetches for the rest
      const [rotationsRaw, fsAbsences, fsRequestsAss, fsRequestsOa, fsOAAbsences] = await Promise.all([
        fsRotationPromise.catch(e => { console.warn("Rotation fetch failed", e); return null; }),
        fsAbsencesPromise.catch(e => { console.error("Firestore absences fetch failed", e); return {}; }),
        fsRequestsAssPromise.catch(e => { console.error("Firestore ass requests fetch failed", e); return []; }),
        fsRequestsOaPromise.catch(e => { console.error("Firestore oa requests fetch failed", e); return []; }),
        fsOAAbsencesPromise.catch(e => { console.error("Firestore OA absences fetch failed", e); return {}; })
      ]);

      let rotations = rotationsRaw;
      if (!rotations || rotations.length === 0) {
        console.warn("Rotation not found in Firestore distributions/monatsverteilung, trying JSONBin fallback...");
        rotations = effectiveKey ? await apiService.load(ROTATION_BIN_ID, effectiveKey).catch(e => []) : [];
      }

      // Combine requests from both profile streams
      const fsRequests = [...fsRequestsAss, ...fsRequestsOa];

      // 2. Determine source of truth (Now purely Firestore config)
      
      // 1. Aggressive Deduplication of all source employees
      const rawEmployees = sourceData.employees || sourceData.mitarbeiter || [];
      const uniqueRawMap = new Map();
      rawEmployees.forEach(emp => {
        if (!emp || !emp.id) return;
        if (!uniqueRawMap.has(emp.id)) {
            uniqueRawMap.set(emp.id, emp);
        } else {
            // Merge if duplicate found in source
            const existing = uniqueRawMap.get(emp.id);
            if (emp.groups) existing.groups = Array.from(new Set([...(existing.groups || []), ...(emp.groups || [])]));
            if (emp.role === 'Oberarzt') existing.role = 'Oberarzt';
        }
      });
      const allEmployees = Array.from(uniqueRawMap.values());

      let groupColors = {
        ...DEFAULT_GROUP_COLORS,
        ...(profile.defaultColors || {}),
        ...(sourceData.groupColors || {})
      };
      let ass_areaOrder = sourceData.ass_areaOrder || [];
      let oa_areaOrder = sourceData.oa_areaOrder || [];
      
      // Dynamic Skill Order per profile
      const storedOrder = sourceData[`${planerType}_skillOrder`] || [];
      const defaultOrder = profile.displayOrder || [];
      const skillOrder = storedOrder.length > 0 ? storedOrder : defaultOrder;
      
      // Merge absences and requests (Requests prefer Firestore)
      let absences = fsAbsences;
      let requests = fsRequests;

      // If we loaded from JSONBin but Firestore was empty, we'll want to migrate on next save
      if (!fsConfig && auth.user?.role === 'Administrator') {
        console.log('[Migration] Firestore config empty. Will migrate on next admin change.');
      }

      let profileEmployees = [];
      let crossEmployees = [];

      if (planerType === 'oa') {
        profileEmployees = allEmployees.filter(emp => 
          emp.role === 'Oberarzt' || 
          emp.id === 'admin' || 
          emp.id === 'sekretariat' ||
          emp.id === 'maier' ||
          (Array.isArray(emp.groups) && emp.groups.includes('skill_funktionsoberarzt')) ||
          emp.isOberarzt === true // legacy flag
        );
      } else {
        // Assistant Planner
        profileEmployees = allEmployees.filter(emp => {
          const groups = Array.isArray(emp.groups) ? emp.groups : [];
          const isFOA = groups.includes('skill_funktionsoberarzt');
          
          // Hide system users from AA table
          if (emp.id === 'admin' || emp.id === 'sekretariat') return false;

          // Show if NOT an OA, OR if it's a FOA (who should be in both)
          return (emp.role !== 'Oberarzt' && emp.id !== 'maier' && !emp.isOberarzt) || isFOA;
        });

        // OAs as Cross-Profile
        crossEmployees = allEmployees.filter(emp => 
          emp.role === 'Oberarzt' || emp.id === 'maier' || emp.isOberarzt === true
        ).map(f => {
          const grps = Array.isArray(f.groups) ? f.groups : (f.group ? [f.group] : []);
          const isFoa = grps.some(g => g && String(g).toLowerCase().includes('funktionsoberarzt'));
          return {
            ...f,
            groups: isFoa ? Array.from(new Set([...grps, 'skill_funktionsoberarzt'])) : grps,
            _isCrossProfile: true,
            _isCrossProfileFoa: isFoa,
            _isCrossProfileOa: !isFoa
          };
        });

      }

      // Combine and deduplicate by ID to prevent UI duplicates
      const employeeMap = new Map();
      [...profileEmployees, ...crossEmployees].forEach(emp => {
        if (!emp.id) return;
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, emp);
        } else {
          // Merge cross-profile flags into existing entry
          const existing = employeeMap.get(emp.id);
          if (emp._isCrossProfile) {
            existing._isCrossProfile = true;
            if (emp._isCrossProfileOa) existing._isCrossProfileOa = true;
            if (emp._isCrossProfileFoa) existing._isCrossProfileFoa = true;
          }
        }
      });
      let employees = Array.from(employeeMap.values());

      // Safe, unified merge of absences based on employee's primary profile type
      const cleanAbsences = {};
      employees.forEach(emp => {
        const primaryType = getEmployeeProfileType(emp.id, allEmployees);
        if (planerType === 'ass') {
          if (primaryType === 'oa') {
            // OAs and FOAs should load their absences from the OA stream
            cleanAbsences[emp.id] = fsOAAbsences[emp.id] || {};
          } else {
            // Regular assistants from the ASS stream
            cleanAbsences[emp.id] = fsAbsences[emp.id] || {};
          }
        } else {
          // In OA planner, fsAbsences is already the OA stream
          cleanAbsences[emp.id] = fsAbsences[emp.id] || {};
        }
      });
      absences = cleanAbsences;

      // 2. Skill Logic
      const dbSkills = Array.isArray(sourceData.skills) ? sourceData.skills : [];
      const profileDefaults = profile.defaultSkills || [];
      
      // Use DB skills if available, fall back to defaults only on first run (empty DB)
      const hasDbSkills = dbSkills.length > 0;
      const rawSkillSource = hasDbSkills ? dbSkills : profileDefaults;

      // Apply type-correction + dedup to ALL skills in DB
      const skillIdsSeen = new Set();
      const correctedFullSkillPool = rawSkillSource
        .filter(s => s && (s.id || s.name))
        .map(s => {
          const skillObj = typeof s === 'object' ? s : { name: String(s) };
          const id = skillObj.id || `skill_${String(skillObj.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`;
          let t = skillObj.planerType;
          if (SHARED_SKILL_IDS.has(id)) t = 'shared';
          else if (OA_ONLY_IDS.has(id)) t = 'oa';
          else if (ASS_ONLY_IDS.has(id)) t = 'ass';
          else if (!t) t = planerType;
          return { ...skillObj, id, planerType: t };
        })
        .filter(s => {
          if (skillIdsSeen.has(s.id)) return false;
          skillIdsSeen.add(s.id);
          return true;
        });

      // Profile-specific view (filter to current profile)
      const profileDefaultIds = new Set(profileDefaults.map(s => s.id));
      const allSkills = correctedFullSkillPool.filter(s => {
        const id = s.id;
        const t = s.planerType;
        if (SHARED_SKILL_IDS.has(id)) return true;
        if (planerType === 'oa' && OA_ONLY_IDS.has(id)) return true;
        if (planerType === 'ass' && ASS_ONLY_IDS.has(id)) return true;
        return t === planerType || (!hasDbSkills && profileDefaultIds.has(id));
      });

      // Sort by skillOrder
      const sortedSkills = allSkills.sort((a, b) => {
        const idxA = skillOrder.indexOf(a.id) !== -1 ? skillOrder.indexOf(a.id) :
                     (skillOrder.indexOf(a.name) !== -1 ? skillOrder.indexOf(a.name) : 999);
        const idxB = skillOrder.indexOf(b.id) !== -1 ? skillOrder.indexOf(b.id) :
                     (skillOrder.indexOf(b.name) !== -1 ? skillOrder.indexOf(b.name) : 999);
        return idxA - idxB;
      });

      // Already type-corrected and deduped above
      const migratedSkills = sortedSkills;

      const migratedEmployees = employees.map(emp => {
        const groups = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
        const migratedGroups = groups.map(g => {
          if (g?.startsWith?.('skill_')) return g;
          const skillObj = migratedSkills.find(s => s.name === g);
          return skillObj ? skillObj.id : g;
        });
        return { ...emp, groups: migratedGroups };
      });

      // 4. Update State
      setAppData({
        employees: migratedEmployees,
        fullEmployeeList: allEmployees,
        jsonbin_key: sourceData.jsonbin_key,
        skills: correctedFullSkillPool,  // ALL skills, tagged oa/ass/shared
        absences,
        requests,
        groupColors,
        rotationData: (Array.isArray(rotations) ? rotations : rotations?.rotations) || sourceData.rotationData || [],
        status: sourceData.status,
        ass_areaOrder: ass_areaOrder.length > 0 ? ass_areaOrder : PLANER_PROFILES.ass.areaOrder,
        oa_areaOrder: oa_areaOrder.length > 0 ? oa_areaOrder : PLANER_PROFILES.oa.areaOrder,
        ass_skillOrder: sourceData.ass_skillOrder || [],
        oa_skillOrder: sourceData.oa_skillOrder || [],
        settings: sourceData.settings || {},
        vacationStats: updateVacationStats(absences, migratedEmployees, sourceData.vacationStats || {}, requests)
      });
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Daten.');
      // setAuth(prev => ({ ...prev, isAuthenticated: false })); // Don't logout on data fetch error
    } finally {
      setIsLoading(false);
    }
  }, [binId, planerType]);


  const handleLogin = (loginData) => {
    localStorage.setItem(`${planerType}_logged_user`, JSON.stringify(loginData.user));
    localStorage.setItem(`${planerType}_auth_profile`, planerType);
    if (loginData.masterKey && loginData.masterKey !== 'STORED_IN_FIRESTORE') {
      localStorage.setItem(`${planerType}_jsonbin_key`, loginData.masterKey);
    }

    setAuth({
      user: loginData.user,
      masterKey: loginData.masterKey === 'STORED_IN_FIRESTORE' ? auth.masterKey : loginData.masterKey,
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


  const calculateVacationUsed = (empId, absences = {}, year = new Date().getFullYear(), requests = []) => {
    const vacationDates = new Set();
    const empAbsences = (absences && absences[empId]) || {};

    // 1. From confirmed absences
    Object.entries(empAbsences).forEach(([dateStr, entry]) => {
      if (!dateStr.startsWith(String(year))) return;
      const type = typeof entry === 'object' ? entry.type : entry;
      const status = typeof entry === 'object' ? entry.status : 'confirmed';

      if (status === 'rejected') return;

      if (type === 'U' || type === 'V') {
        const { holiday } = getSpecialDayInfo(dateStr);
        const d = new Date(dateStr);
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        if (!isWeekend && !holiday) {
          vacationDates.add(dateStr);
        }
      }
    });

    // 2. From pending requests (not yet in absences)
    requests.filter(r =>
      r.empId === empId &&
      r.status.startsWith('pending') &&
      (r.type === 'U' || r.type === 'V')
    ).forEach(r => {
      r.dates.forEach(dateStr => {
        if (!dateStr.startsWith(String(year))) return;
        const { holiday } = getSpecialDayInfo(dateStr);
        const d = new Date(dateStr);
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        if (!isWeekend && !holiday) {
          vacationDates.add(dateStr);
        }
      });
    });

    return vacationDates.size;
  };

  const updateVacationStats = (newAbsences, employees = null, currentStats = null, requests = null) => {
    const targetEmployees = employees || appData.employees;
    const statsToUpdate = currentStats || appData.vacationStats;
    const targetRequests = requests || appData.requests;
    const newStats = { ...statsToUpdate };
    const year = new Date().getFullYear();

    targetEmployees.forEach(emp => {
      const used = calculateVacationUsed(emp.id, newAbsences, year, targetRequests);
      const currentQuota = emp.vacationQuota ?? 30;
      newStats[emp.id] = { total: used, quota: currentQuota };
    });
    return newStats;
  };

  // Helper to save entire state
  const pruneOldRequests = (reqs) => {
    if (!Array.isArray(reqs)) return [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Keep all pending/approved, but filter old rejected/cancelled
    let filtered = reqs.filter(r => {
      if (r.status === 'pending' || r.status === 'approved' || r.status === 'pending_vertreter') return true;

      const stampDate = r.stamps?.admin?.at || r.stamps?.submitted?.at;
      if (!stampDate) return true; // Keep if no date info

      const date = new Date(stampDate);
      return date >= ninetyDaysAgo;
    });

    // If still too many, keep only the most recent 400
    if (filtered.length > 400) {
      filtered.sort((a, b) => {
        const dateA = a.stamps?.submitted?.at || '';
        const dateB = b.stamps?.submitted?.at || '';
        return dateB.localeCompare(dateA);
      });
      filtered = filtered.slice(0, 400);
    }

    return filtered;
  };

  const getEmployeeProfileType = (empId, currentEmployees) => {
    const list = currentEmployees || appData.fullEmployeeList || appData.employees || [];
    const emp = list.find(e => e.id === empId);
    if (!emp) return planerType;
    const isFOA = Array.isArray(emp.groups) && emp.groups.includes('skill_funktionsoberarzt');
    return (emp.role === 'Oberarzt' || emp.isOberarzt === true || isFOA) ? 'oa' : 'ass';
  };


  const saveAllData = async (dataToSave) => {
    setIsLoading(true);
    
    // Final safety deduplication for EVERYTHING we save to config
    const dedupe = (list) => {
        if (!Array.isArray(list)) return [];
        const map = new Map();
        list.forEach(item => { 
            if (!item) return;
            const id = item.id || (typeof item === 'string' ? item : null);
            if (id) map.set(id, item); 
        });
        return Array.from(map.values());
    };

    try {
      const { absences, requests } = dataToSave;

      // 1. Save Employees and Config to Firestore (MUST BE FULL LIST)
      const firestorePayload = {
        employees: dedupe(dataToSave.fullEmployeeList || dataToSave.employees || []),
        jsonbin_key: dataToSave.jsonbin_key || appData.jsonbin_key,
        skills: dataToSave.skills || appData.skills || [],
        groupColors: dataToSave.groupColors || appData.groupColors,
        ass_areaOrder: dataToSave.ass_areaOrder || appData.ass_areaOrder || [],
        oa_areaOrder: dataToSave.oa_areaOrder || appData.oa_areaOrder || [],
        settings: dataToSave.settings || appData.settings,
        ass_skillOrder: dataToSave.ass_skillOrder || appData.ass_skillOrder || [],
        oa_skillOrder: dataToSave.oa_skillOrder || appData.oa_skillOrder || [],
        vacationStats: dataToSave.vacationStats || appData.vacationStats || {},
      };
      
      await firestoreService.saveConfig(firestorePayload);

      // JSONBin backup removed here. Firestore is now the primary source of truth.

      // 3. Save Absences to Firestore
      const savePromises = Object.entries(absences).map(([eid, dates]) =>
        firestoreService.saveAbsence(getEmployeeProfileType(eid, firestorePayload.employees), eid, dates)
      );

      // 4. Save Requests to Firestore
      const reqPromises = requests.map(req => firestoreService.saveRequest(getEmployeeProfileType(req.empId, firestorePayload.employees), req));

      await Promise.all([...savePromises, ...reqPromises]);

      console.log('[Unified Save] Firestore (Config/Calendar/Requests) updated.');
      setAppData(dataToSave);
    } catch (err) {
      console.error('[Unified Save Error]:', err);
      alert(`Speichern fehlgeschlagen! (${err.message})`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAbsence = async (newAbsences) => {
    if (!isAdmin) return;

    let finalAbsences = newAbsences || { ...appData.absences };

    // Detect if this is formData from AbsenceModal (single update) or a full object
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
        const existing = finalAbsences[formData.employeeId][d] || {};
        finalAbsences[formData.employeeId][d] = {
          ...existing,
          type: formData.type,
          text: formData.remarks || '',
          status: 'confirmed',
          updatedAt: new Date().toISOString()
        };
      });

    }

    // Detect deleted absence days and update or delete their corresponding approved requests
    const updatedRequestsMap = new Map(); // reqId -> updatedRequestClone
    let hasDeletedDays = false;

    Object.entries(appData.absences).forEach(([empId, oldDates]) => {
      const newDates = finalAbsences[empId] || {};
      Object.keys(oldDates).forEach(dateStr => {
        // If it was present in oldDates but is NOT present in newDates, it has been deleted
        if (!newDates[dateStr]) {
          hasDeletedDays = true;
          // Find matching approved request that contains this date
          const matchingReq = appData.requests.find(r => 
            r.empId === empId && 
            r.status === 'approved' && 
            Array.isArray(r.dates) && 
            r.dates.includes(dateStr)
          );

          if (matchingReq) {
            // Get or create the cloned request in our working map
            if (!updatedRequestsMap.has(matchingReq.id)) {
              updatedRequestsMap.set(matchingReq.id, {
                ...matchingReq,
                dates: [...matchingReq.dates]
              });
            }
            
            const clonedReq = updatedRequestsMap.get(matchingReq.id);
            // Remove the deleted date from this request's dates array
            clonedReq.dates = clonedReq.dates.filter(d => d !== dateStr);
          }
        }
      });
    });

    let nextRequests = [...appData.requests];
    const savePromises = [];
    const deletePromises = [];

    updatedRequestsMap.forEach((clonedReq, reqId) => {
      const targetPlanerType = getEmployeeProfileType(clonedReq.empId);
      
      if (clonedReq.dates.length === 0) {
        // 1. If no dates are left, delete the request completely
        console.log(`[Auto-Delete Request] Deleting empty request: ${reqId}`);
        nextRequests = nextRequests.filter(r => r.id !== reqId);
        
        deletePromises.push(
          firestoreService.deleteRequest(reqId).catch(err => 
            console.error(`Failed to delete request ${reqId} from Firestore:`, err)
          )
        );
      } else {
        // 2. If dates are still left, update the request with the remaining dates in Firestore and state
        console.log(`[Auto-Update Request] Updating request ${reqId} with remaining dates:`, clonedReq.dates);
        const reqIndex = nextRequests.findIndex(r => r.id === reqId);
        if (reqIndex !== -1) {
          nextRequests[reqIndex] = clonedReq;
        }
        
        savePromises.push(
          firestoreService.saveRequest(targetPlanerType, clonedReq).catch(err => 
            console.error(`Failed to update request ${reqId} in Firestore:`, err)
          )
        );
      }
    });

    // Execute Firestore operations in background
    if (savePromises.length > 0 || deletePromises.length > 0) {
      Promise.all([...savePromises, ...deletePromises]);
    }

    const updatedStats = updateVacationStats(finalAbsences, appData.employees, appData.vacationStats, nextRequests);
    const nextDataToSave = { ...appData, absences: finalAbsences, requests: nextRequests, vacationStats: updatedStats };
    
    setAppData(nextDataToSave);
    saveAllDataSideEffect(nextDataToSave);

    if (hasDeletedDays) {
      toast.success('Urlaub erfolgreich gelöscht', {
        position: 'bottom-center',
        duration: 3000
      });
    }
  };

  // Dedicated side effect for saving to API without re-triggering setAppData recursively or causing race conditions
  const saveAllDataSideEffect = async (newData) => {
    setIsSaving(true);
    try {
      // 1. Config (only update vacationStats)
      await firestoreService.saveConfig({ vacationStats: newData.vacationStats });

      // 2. Firestore (Absences)
      // Optimization: Only update the changed employee if possible, but here we keep and use bulk save for safety
      const promises = Object.entries(newData.absences).map(([eid, dates]) =>
        firestoreService.saveAbsence(getEmployeeProfileType(eid), eid, dates)
      );
      await Promise.all(promises);

    } catch (err) {
      console.error('Speichern fehlgeschlagen:', err);
      firestoreService.logError({
        message: err.message || 'Speichern fehlgeschlagen',
        stack: err.stack,
        context: 'saveAllDataSideEffect',
        user: resolvedUser ? `${resolvedUser.id} (${resolvedUser.name})` : 'Unbekannt'
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleSubmitRequest = async (request) => {
    setIsLoading(true);
    try {
      const type = getEmployeeProfileType(request.empId);
      
      // 1. Generate request ID if not exists
      const reqId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const savedRequest = {
        ...request,
        id: reqId,
        planerType: type,
        lastUpdated: new Date().toISOString()
      };

      // 2. Save ONLY the individual request to Firestore
      await firestoreService.saveRequest(type, savedRequest);

      // 3. Handle absences if pre-approved (Admin direct entry)
      let updatedAbsences = appData.absences;
      if (savedRequest.status === 'approved') {
        updatedAbsences = { ...appData.absences };
        if (!updatedAbsences[savedRequest.empId]) updatedAbsences[savedRequest.empId] = {};
        savedRequest.dates.forEach(date => {
          updatedAbsences[savedRequest.empId][date] = {
            type: savedRequest.type,
            text: savedRequest.text,
            vertreter: savedRequest.vertreter,
            vertreterId: savedRequest.vertreterId,
            status: 'confirmed'
          };
        });
        await firestoreService.saveAbsence(type, savedRequest.empId, updatedAbsences[savedRequest.empId]);
      }

      // 4. Update the requests list locally in state
      const updatedRequests = [...appData.requests];
      const existingReqIndex = updatedRequests.findIndex(r => r.id === reqId);
      if (existingReqIndex !== -1) {
        updatedRequests[existingReqIndex] = savedRequest;
      } else {
        updatedRequests.push(savedRequest);
      }

      const updatedStats = updateVacationStats(updatedAbsences, appData.employees, appData.vacationStats, updatedRequests);

      setAppData(prev => ({
        ...prev,
        requests: updatedRequests,
        absences: updatedAbsences,
        vacationStats: updatedStats
      }));

      // 5. If it was an admin pre-approving, trigger background JSONBin sync
      if (savedRequest.status === 'approved') {
        const nextAppData = {
          ...appData,
          requests: updatedRequests,
          absences: updatedAbsences,
          vacationStats: updatedStats
        };
        firestoreService.saveConfig({ vacationStats: nextAppData.vacationStats }).catch(e => console.error("Background config save failed:", e));
      }

    } catch (err) {
      console.error('[Submit Request Error]:', err);
      alert(`Speichern fehlgeschlagen! (${err.message})`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleApproveRequest = async (reqId, byType) => {
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    setIsLoading(true);
    try {
      const request = { ...appData.requests[reqIndex] };
      const updatedRequests = [...appData.requests];

      if (byType === 'vertreter') {
        request.status = request.supervisorId ? 'pending_supervisor' : 'pending_admin';
        request.stamps = { ...request.stamps, vertreter: makeStamp(auth.user) };
        updatedRequests[reqIndex] = request;

        await firestoreService.saveRequest(getEmployeeProfileType(request.empId), request);
        setAppData(prev => {
          const newRequests = [...prev.requests];
          const idx = newRequests.findIndex(r => r.id === reqId);
          if (idx !== -1) newRequests[idx] = request;
          return { ...prev, requests: newRequests };
        });

      } else if (byType === 'supervisor') {
        request.status = 'pending_admin';
        request.stamps = { ...request.stamps, supervisor: makeStamp(auth.user) };
        updatedRequests[reqIndex] = request;

        await firestoreService.saveRequest(getEmployeeProfileType(request.empId), request);
        setAppData(prev => {
          const newRequests = [...prev.requests];
          const idx = newRequests.findIndex(r => r.id === reqId);
          if (idx !== -1) newRequests[idx] = request;
          return { ...prev, requests: newRequests };
        });

      } else if (byType === 'admin') {
        request.status = 'approved';
        request.stamps = { ...request.stamps, admin: makeStamp(auth.user) };

        const newAbsences = { ...appData.absences };
        if (!newAbsences[request.empId]) newAbsences[request.empId] = {};
        request.dates.forEach(date => {
          newAbsences[request.empId][date] = {
            type: request.type,
            text: request.text,
            vertreter: request.vertreter,
            vertreterId: request.vertreterId,
            status: 'confirmed',
            uid: request.id,
            updatedAt: new Date().toISOString()
          };
        });

        updatedRequests[reqIndex] = request;
        const updatedStats = updateVacationStats(newAbsences);
        
        const promises = [
          firestoreService.saveRequest(getEmployeeProfileType(request.empId), request),
          firestoreService.saveAbsence(getEmployeeProfileType(request.empId), request.empId, newAbsences[request.empId])
        ];
        
        await Promise.all(promises);

        setAppData(prev => {
          const newRequests = [...prev.requests];
          const idx = newRequests.findIndex(r => r.id === reqId);
          if (idx !== -1) newRequests[idx] = request;
          
          const nextAppData = {
            ...prev,
            requests: newRequests,
            absences: { ...prev.absences, [request.empId]: newAbsences[request.empId] }
          };
          nextAppData.vacationStats = updateVacationStats(nextAppData.absences, prev.employees, prev.vacationStats, nextAppData.requests);
          
          // Hybrid save background sync
          firestoreService.saveConfig({ vacationStats: nextAppData.vacationStats }).catch(e => console.error("Background save failed:", e));

          return nextAppData;
        });
      }
    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async (reqId, byType, note) => {
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    setIsLoading(true);
    try {
      const request = { ...appData.requests[reqIndex] };
      request.status = 'rejected';
      request.rejectedBy = byType;
      request.rejectionNote = note;
      request.stamps = { ...request.stamps, rejected: makeStamp(auth.user) };

      const updatedRequests = [...appData.requests];
      updatedRequests[reqIndex] = request;
      
      await firestoreService.saveRequest(planerType, request);
      setAppData(prev => {
        const newRequests = [...prev.requests];
        const idx = newRequests.findIndex(r => r.id === reqId);
        if (idx !== -1) newRequests[idx] = request;
        return { ...prev, requests: newRequests };
      });
    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequest = async (reqId) => {
    setIsLoading(true);
    try {
      await firestoreService.deleteRequest(reqId);
      setAppData(prev => ({
        ...prev,
        requests: prev.requests.filter(r => r.id !== reqId)
      }));
    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen: ' + err.message);
      setIsLoading(false);
    }
  };

  const handleUpdateRequest = async (reqId, updates) => {
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    setIsLoading(true);
    try {
      const request = { ...appData.requests[reqIndex], ...updates };

      // Ensure stamps property is initialized
      if (!request.stamps) request.stamps = {};

      // Handle resetting notified flags for email notifications based on status change
      if (!request.notified) request.notified = {};
      if (updates.status === 'pending_supervisor') {
        request.notified.pending_supervisor = false;
        request.notified.pending_admin = false;
        request.notified.approved = false;
        delete request.stamps.supervisor;
        delete request.stamps.admin;
      } else if (updates.status === 'pending_vertreter') {
        request.notified.pending_vertreter = false;
        request.notified.pending_supervisor = false;
        request.notified.pending_admin = false;
        request.notified.approved = false;
        delete request.stamps.vertreter;
        delete request.stamps.supervisor;
        delete request.stamps.admin;
      }

      const updatedRequests = [...appData.requests];
      updatedRequests[reqIndex] = request;

      await firestoreService.saveRequest(planerType, request);
      
      let nextAbsences = appData.absences;
      if (appData.requests[reqIndex].status === 'approved' && updates.status && updates.status !== 'approved') {
          // It was approved, but now demoted to pending. We must remove it from absences.
          if (nextAbsences[request.empId]) {
              const empAbsences = { ...nextAbsences[request.empId] };
              let changed = false;
              request.dates.forEach(date => {
                 if (empAbsences[date] && empAbsences[date].uid === request.id) {
                     delete empAbsences[date];
                     changed = true;
                 }
              });
              if (changed) {
                  nextAbsences = { ...nextAbsences, [request.empId]: empAbsences };
                  await firestoreService.saveAbsence(getEmployeeProfileType(request.empId), request.empId, empAbsences);
              }
          }
      }

      setAppData(prev => {
        const newRequests = [...prev.requests];
        const idx = newRequests.findIndex(r => r.id === reqId);
        if (idx !== -1) newRequests[idx] = request;
        return { ...prev, requests: newRequests, absences: nextAbsences };
      });

    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleMarkPODone = async (reqId, checked, shortcut, newRemainingDays = null) => {
    // We need to find the request in the current state to start with
    const reqIndex = appData.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;

    setIsLoading(true);
    try {
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

      // 1. Save Request to Firestore using the CORRECT planerType for the employee
      const targetPlanerType = getEmployeeProfileType(request.empId);
      await firestoreService.saveRequest(targetPlanerType, request);

      // 2. Update state using functional update to avoid race conditions
      setAppData(prev => {
        const newRequests = prev.requests.map(r => r.id === reqId ? request : r);
        let nextData = { ...prev, requests: newRequests };

        // Handle Quota Update if provided
        if (checked && newRemainingDays !== null) {
          const stats = prev.vacationStats[request.empId] || { total: 0, quota: 30 };
          const newQuota = newRemainingDays + stats.total;
          
          const newFullList = prev.fullEmployeeList.map(e => {
            if (e.id === request.empId) return { ...e, vacationQuota: newQuota };
            return e;
          });

          nextData.fullEmployeeList = newFullList;
          // Re-filter employees for the UI view
          nextData.employees = newFullList.filter(emp => {
            if (planerType === 'oa') {
              return emp.role === 'Oberarzt' || emp.id === 'admin' || emp.id === 'sekretariat' || emp.id === 'maier' || emp.isOberarzt === true;
            } else {
              const groups = Array.isArray(emp.groups) ? emp.groups : [];
              const isFOA = groups.includes('skill_funktionsoberarzt');
              return (emp.role !== 'Oberarzt' && emp.id !== 'maier' && !emp.isOberarzt) || isFOA;
            }
          });

          // Recalculate stats
          nextData.vacationStats = updateVacationStats(nextData.absences, nextData.fullEmployeeList, nextData.vacationStats);
          
          // Trigger config update in background (don't await it here for UI snappiness if possible, or await if safety is paramount)
          // For now we keep it awaited to match previous logic but it's a candidate for improvement
          firestoreService.saveConfig({ vacationStats: nextData.vacationStats }).catch(e => console.error("Config save failed:", e));
        }

        return nextData;
      });

    } catch (err) {
      console.error(err);
      alert('Speichern fehlgeschlagen: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resolvedUser = appData.employees.find(e => e.id === auth.user?.id) || auth.user;

  const makeStamp = (user) => {
    const latest = appData.employees.find(e => e.id === user?.id) || user;
    return {
      at: new Date().toISOString(),
      uid: latest?.id,
      name: latest?.stampAlias || latest?.name,
      ua: navigator.userAgent
    };
  };

  const handleUpdateAdminData = async (newData) => {
    let finalData = { ...newData };

    // If we are updating employees, merge subset into fullEmployeeList
    if (newData.employees) {
      const otherEmps = appData.fullEmployeeList.filter(emp => {
        // Keep employees that were NOT in the current view's subset
        return !newData.employees.some(ne => ne.id === emp.id);
      });
      
      // Filter out cross-profile flags before saving
      const cleanNewEmployees = newData.employees.map(e => {
          const { _isCrossProfile, _isCrossProfileOa, _isCrossProfileFoa, ...clean } = e;
          return clean;
      });

      // Final Deduplication
      const merged = [...otherEmps, ...cleanNewEmployees];
      const uniqueMerged = [];
      const seenIds = new Set();
      for (const e of merged) {
        if (!e.id || seenIds.has(e.id)) continue;
        seenIds.add(e.id);
        uniqueMerged.push(e);
      }
      finalData.employees = uniqueMerged;
    }

    // Same for skills
    if (newData.skills) {
      // newData.skills = editor list for THIS profile only
      const newSkillIds = new Set(newData.skills.map(s => s.id));

      // Start from full tagged list
      const skillMap = new Map();
      appData.skills.forEach(s => skillMap.set(s.id, { ...s }));

      // Remove skills of this profile that the user deleted
      skillMap.forEach((s, id) => {
        const t = s.planerType || 'shared';
        const belongsToThisProfile = t === planerType ||
          (planerType === 'oa' && OA_ONLY_IDS.has(id)) ||
          (planerType === 'ass' && ASS_ONLY_IDS.has(id));
        if (belongsToThisProfile && !SHARED_SKILL_IDS.has(id) && !newSkillIds.has(id)) {
          skillMap.delete(id);
        }
      });

      // Update or add skills from editor
      newData.skills.forEach(s => {
        const existing = skillMap.get(s.id);
        const isShared = SHARED_SKILL_IDS.has(s.id) || (existing?.planerType === 'shared');
        let finalType = planerType;
        if (isShared) finalType = 'shared';
        else if (existing?.planerType) finalType = existing.planerType;
        else if (OA_ONLY_IDS.has(s.id)) finalType = 'oa';
        else if (ASS_ONLY_IDS.has(s.id)) finalType = 'ass';
        skillMap.set(s.id, { ...existing, ...s, planerType: finalType });
      });

      finalData.skills = Array.from(skillMap.values()); // Full tagged list
      finalData[`${planerType}_skillOrder`] = newData.skills.map(s => s.id);
    }

    const nextAppData = { ...appData, ...finalData };
    if (finalData.employees) {
        nextAppData.employees = finalData.employees.filter(emp => {
            if (planerType === 'oa') {
                return emp.role === 'Oberarzt' || emp.id === 'admin' || emp.id === 'sekretariat' || emp.id === 'maier' || emp.isOberarzt === true;
            } else {
                const groups = Array.isArray(emp.groups) ? emp.groups : [];
                const isFOA = groups.includes('skill_funktionsoberarzt');
                return (emp.role !== 'Oberarzt' && emp.id !== 'maier' && !emp.isOberarzt) || isFOA;
            }
        });
        nextAppData.fullEmployeeList = finalData.employees;
    }
    // No fullSkillList needed anymore – appData.skills is the full tagged list

    if (finalData.employees || finalData.absences) {
      nextAppData.vacationStats = updateVacationStats(nextAppData.absences, nextAppData.fullEmployeeList, nextAppData.vacationStats);
    }
    
    // Optimistic UI update to prevent CategoryAdmin's useEffect from snapping back to old state during isLoading
    setAppData(nextAppData);
    
    await saveAllData(nextAppData);
    alert('Erfolgreich gespeichert!');
  };

  const isFullAdmin = auth.user?.id === 'admin';
  const isSekretariat = auth.user?.id === 'sekretariat';
  const isSpokesperson = auth.user?.id === 'assistentensprecher' || auth.user?.role === 'assistentensprecher';
  const isAdmin = isFullAdmin || isSekretariat || isSpokesperson;
  const isCalendarAdmin = isFullAdmin || isSekretariat;

  const perms = {
    canAdminEmployees: isFullAdmin || isSekretariat || isSpokesperson,
    canAdminSkills: isFullAdmin || isSekretariat || isSpokesperson,
    canAdminAreas: isFullAdmin || isSekretariat || isSpokesperson,
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
    canShowCalendarEntry: !isSekretariat,
    canDeleteRequests: isFullAdmin,
    canApproveRequests: isFullAdmin
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

  const poPendingCount = appData.requests.filter(r => r.planerType === planerType && r.status === 'approved' && !r.stamps?.po).length;

  const actionRequiredCount = appData.requests.filter(r => {
    if (r.planerType !== planerType) return false;
    if (isAdmin) return r.status === 'pending_admin';
    return r.status === 'pending_vertreter' && r.vertreterId === resolvedUser?.id;
  }).length + (perms.canSeePOKarte ? poPendingCount : 0);


  const togglePlaner = () => {
    if (!isAdmin) return;
    if (isSaving) {
      if (!window.confirm('Es wird gerade noch gespeichert. Möchten Sie trotzdem den Planer wechseln? (Möglicher Datenverlust)')) {
        return;
      }
    }
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

    // Filter full tagged skill list to current profile's skills
    const skillOrder = appData[`${planerType}_skillOrder`] || [];
    const profileSkills = (appData.skills || [])
      .filter(s => {
        const id = s.id;
        const t = s.planerType;
        if (SHARED_SKILL_IDS.has(id)) return true;
        if (planerType === 'oa' && OA_ONLY_IDS.has(id)) return true;
        if (planerType === 'ass' && ASS_ONLY_IDS.has(id)) return true;
        return t === planerType;
      })
      .sort((a, b) => {
        const iA = skillOrder.indexOf(a.id) !== -1 ? skillOrder.indexOf(a.id) : 999;
        const iB = skillOrder.indexOf(b.id) !== -1 ? skillOrder.indexOf(b.id) : 999;
        return iA - iB;
      });

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
            currentUser={resolvedUser}
            groupColors={appData.groupColors}
            rotationData={appData.rotationData}
            skills={profileSkills}
            allSkills={appData.skills}
            areaOrder={appData[`${planerType}_areaOrder`]}
            displayOrder={profile.displayOrder || []}
            actionRequiredCount={actionRequiredCount}
            vacationStats={appData.vacationStats}
            onUpdateAdminData={handleUpdateAdminData}
            perms={perms}
            isCalendarAdmin={isCalendarAdmin}
          />
        );
      case 'requests':
        return (
          <RequestsView
            requests={appData.requests}
            employees={appData.fullEmployeeList}
            currentUser={resolvedUser}
            isAdmin={isAdmin}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onDelete={handleDeleteRequest}
            onMarkPODone={handleMarkPODone}
            onUpdateRequest={handleUpdateRequest}
            perms={perms}
            vacationStats={appData.vacationStats}
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
              skills={profileSkills}
              vacationStats={appData.vacationStats}
              onSave={(newList) => handleUpdateAdminData({ employees: newList })}
              perms={perms}
              planerType={planerType}
            />

          </div>
        );
      case 'skills':
        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'transparent' }}>
            <CategoryAdmin
              title="Skills verwalten"
              type="skills"
              items={profileSkills}
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
              items={(appData[`${planerType}_areaOrder`] || MONTH_AREA_ORDER).map(id => ({ id, name: MONTH_AREA_MAPPING[id] || id }))}
              groupColors={appData.groupColors}
              palette={LEGACY_PALETTE}
              onSave={(newData) => handleUpdateAdminData({
                groupColors: newData.groupColors,
                [`${planerType}_areaOrder`]: newData.areaOrder
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
        onOpenLegal={() => setIsLegalModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSaving={isSaving}
      />

      <main className="main-content">
        <Header user={auth.user} onLogout={handleLogout} isSaving={isSaving} />

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
          onOpenLegal={() => setIsLegalModalOpen(true)}
        />
        <InstallPrompt />
      </main>
      {/* Modals & Overlays */}
      <ICalExportModal
        isOpen={isICalModalOpen}
        onClose={() => setIsICalModalOpen(false)}
        absences={appData.absences}
        employees={appData.employees}
        requests={appData.requests}
        onSaveAbsences={handleSaveAbsence}
        perms={perms}
        planerType={planerType}
      />
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
      <Toaster />
      <BugReportModal 
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        currentUser={resolvedUser}
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
