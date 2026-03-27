import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { generateCalendarDays } from '../../data/mockData';
import { Plus, ArrowDown } from 'lucide-react';
import TimeNavigation from './TimeNavigation';
import AbsenceModal from './AbsenceModal';
import BulkImport from './BulkImport';
import Tooltip from '../UI/Tooltip';
import { MONTH_AREA_MAPPING, MONTH_AREA_ORDER, getAreaColor } from '../../config/rotationConfig';

const CalendarView = ({ 
  planerType,
  employees = [], 
  absences = {}, 
  requests = [],
  onSaveAbsences, 
  onSubmitRequest,
  isAdmin, 
  currentUser, 
  groupColors = {}, 
  rotationData = [], 
  skills = [], 
  areaOrder = null,
  actionRequiredCount = 0,
  vacationStats = {},
  onUpdateAdminData,
  perms = {}
}) => {
  const effectiveAreaOrder = areaOrder || MONTH_AREA_ORDER;
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false, content: '' });
  const [todayIndicator, setTodayIndicator] = useState(false);
  const [mode, setMode] = useState('U');
  const [dragArt, setDragArt] = useState('');
  const [dragVertreter, setDragVertreter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartVal, setDragStartVal] = useState(null); // 'set' or 'clear'
  const [draggedDates, setDraggedDates] = useState([]);
  const [draggedEmpId, setDraggedEmpId] = useState(null);
  const [lastDraggedDate, setLastDraggedDate] = useState(null);
  const [tempAbsences, setTempAbsences] = useState(null);
  const tempAbsencesRef = useRef(null);
  const [sortMode, setSortMode] = useState('skill'); 

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact = windowWidth < 1200;
  const NAME_W = isCompact ? 140 : 250;
  const CELL_H = isCompact ? 55 : 48;
  const VALIDATION_H = planerType === 'oa' ? 32 : 0;
  const HEADER_H = 60 + VALIDATION_H;
  const CELL_W = 30;

  useEffect(() => {
    document.documentElement.style.setProperty('--name-w', `${NAME_W}px`);
    document.documentElement.style.setProperty('--cell-h', `${CELL_H}px`);
  }, [NAME_W, CELL_H]);

  const formatDisplayName = (name = '') => {
    if (!isCompact) return name;
    const truncate = (str, max) => str.length > max ? str.substring(0, max - 1) + '…' : str;
    const MAX_LAST = 10; 

    if (name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      if (parts.length < 2) return truncate(name, MAX_LAST);
      return `${truncate(parts[0], MAX_LAST)}, ${parts[1].charAt(0)}.`;
    }
    const parts = name.split(' ').map(p => p.trim());
    if (parts.length < 2) return truncate(name, MAX_LAST);
    return `${parts[0].charAt(0)}. ${truncate(parts[parts.length - 1], MAX_LAST)}`;
  };

  const formatSkillName = (name = '') => {
    return name
      .replace(/Funktionsoberarzt/gi, 'FOA')
      .replace(/Oberarzt/gi, 'OA')
      .replace(/Fachärztin|Facharzt/gi, 'FA')
      .replace(/Assistenzärztin|Assistenzarzt/gi, 'AA');
  };

  const days = useMemo(() => generateCalendarDays(), []);
  const parentRef = useRef();

  // COVERAGE VALIDATION (V1 Logic)
  const coverageMap = useMemo(() => {
    if (planerType !== 'oa') return {};
    const map = {};
    
    days.forEach(day => {
      if (day.isWeekend || day.holiday) return;
      
      const pres = employees.filter(e => 
        e.id !== 'admin' && 
        e.id !== 'sekretariat' && 
        !e._isCrossProfile &&
        !absences[e.id]?.[day.dateStr]
      );
      
      const has = (e, sId) => {
        const grps = Array.isArray(e.groups) ? e.groups : (e.group ? [e.group] : []);
        return grps.some(g => g === sId || g === `skill_${sId.toLowerCase()}`);
      };

      const issues = [];
      if (!pres.some(e => has(e, 'TAVI'))) issues.push('TAVI');
      if (!pres.some(e => has(e, 'Privat'))) issues.push('Privat');
      if (!pres.some(e => has(e, 'TEER'))) issues.push('TEER');
      if (pres.filter(e => has(e, 'Herzkatheter')).length < 3) issues.push('HK');
      if (!pres.some(e => has(e, 'Echo'))) issues.push('Echo');
      if (pres.filter(e => has(e, 'EPU')).length < 2) issues.push('EPU');
      
      if (issues.length > 0) map[day.dateStr] = issues;
    });
    return map;
  }, [days, employees, absences, planerType]);

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: days.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CELL_W,
    overscan: 10,
  });

  const virtualCols = colVirtualizer.getVirtualItems();

  const [forcedMonthIndex, setForcedMonthIndex] = useState(-1);

  // Determine active month for rotation sorting
  // Use forced index if available (e.g. after clicking a month button) to avoid sorting lag
  // Use scrollOffset for precise detection (bypassing virtualizer overscan)
  const activeMonthIndex = forcedMonthIndex !== -1 
    ? forcedMonthIndex 
    : Math.floor((colVirtualizer.scrollOffset + (0.5 * CELL_W)) / CELL_W);
  
  const activeMonthStr = useMemo(() => {
    const index = Math.min(Math.max(0, activeMonthIndex), days.length - 1);
    const activeDay = days[index];
    if (!activeDay) return '';
    const date = new Date(activeDay.dateStr);
    return `month_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [activeMonthIndex, days]);

  // Reset forced month after some time to allow natural scrolling to take over again
  // Increased to 2 seconds to ensure smooth scroll has reached the target
  useEffect(() => {
    if (forcedMonthIndex !== -1) {
      const timer = setTimeout(() => setForcedMonthIndex(-1), 2000);
      return () => clearTimeout(timer);
    }
  }, [forcedMonthIndex]);

  // Pre-calculate assignments for the active month for performance
  const empAreaMap = useMemo(() => {
    if (!rotationData || rotationData.length === 0 || !activeMonthStr) return {};
    
    // 1. Calculate Quarter Range (Current and Following Quarter)
    const now = new Date();
    const currY = now.getFullYear();
    const currM = now.getMonth(); // 0-11
    const currQ = Math.floor(currM / 3); // 0-3
    
    // Valid months for current and next quarter (exactly 6 months from start of current quarter)
    const qMonths = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(currY, currQ * 3 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      qMonths.push(`${y}_${String(m).padStart(2, '0')}`);
      qMonths.push(`${y}_${m}`); 
      qMonths.push(`${y}-${String(m).padStart(2, '0')}`); // Also support YYYY-MM
    }

    const monthNum = activeMonthStr.replace('month_', '');
    if (!qMonths.includes(monthNum)) return {};

    const monthRecords = rotationData.filter(a => {
      const mId = String(a.monat_id || a.mi || '');
      const mNum = activeMonthStr.replace('month_', '');
      const mNumNoZero = mNum.replace('_0', '_');
      const mNumDash = mNum.replace('_', '-');
      
      return mId === activeMonthStr || mId === mNum || mId === mNumNoZero || mId === mNumDash;
    });
    
    const map = {};
    monthRecords.forEach(r => {
      const empId = String(r.mitarbeiter_id || r.mi_id || r.ei || r.employee_id);
      const areaId = (r.ai || r.bi || r.area_id || '').toLowerCase();
      if (empId && areaId) {
        // CONFLICT RESOLUTION: Use priority from MONTH_AREA_ORDER
        const currentIdx = MONTH_AREA_ORDER.indexOf(areaId);
        const existingIdx = map[empId] ? MONTH_AREA_ORDER.indexOf(map[empId]) : 999;
        
        if (!map[empId] || (currentIdx !== -1 && currentIdx < (existingIdx === -1 ? 999 : existingIdx))) {
          map[empId] = areaId;
        }
      }
    });
    return map;
  }, [rotationData, activeMonthStr]);

  const getEmpArea = (empId) => empAreaMap[String(empId)] || 'none';

  const getSkillName = (id) => {
    if (!id) return '';
    const skillObj = skills.find(s => s.id === id);
    return skillObj ? skillObj.name : id;
  };

  const getSkillColor = (id) => {
    if (!id) return '#e2e8f0';
    
    // 1. Direct ID match
    if (groupColors[id]) return groupColors[id];
    
    // 2. Resolve Name and check color by name
    const sName = getSkillName(id);
    if (sName && sName !== id && groupColors[sName]) return groupColors[sName];
    
    // 3. Selective name-based fallback (for station mapping strings like "Station 18A")
    const areaName = MONTH_AREA_MAPPING[id];
    if (areaName && groupColors[areaName]) return groupColors[areaName];

    // 4. Aggressive match (strip prefixes for better matching against legacy/default keys)
    const idBase = String(id).replace(/^(skill_|station)/i, '');
    const trimmed = idBase.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const match = Object.entries(groupColors).find(([k]) => {
      const kBase = String(k).replace(/^(skill_|station)/i, '');
      const kClean = kBase.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return kClean === trimmed;
    });
    
    return match ? match[1] : '#e2e8f0';
  };

  const getEmployeePriorityInfo = (emp) => {
    const grps = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
    if (grps.length === 0) return { idx: 999, id: 'none' };
    
    let minIdx = 999;
    let bestSkillId = 'none';
    
    grps.forEach(g => {
      const idx = skills.findIndex(s => {
        const sId = typeof s === 'object' ? s.id : s;
        const sName = typeof s === 'object' ? s.name : s;
        return sId === g || sName === g;
      });
      if (idx !== -1 && idx < minIdx) {
        minIdx = idx;
        bestSkillId = g;
      }
    });
    return { idx: minIdx, id: bestSkillId };
  };

  const getEmployeeColor = (emp) => {
    const best = getEmployeePriorityInfo(emp);
    if (best.id === 'none') return '#e2e8f0';
    return getSkillColor(best.id);
  };

  // Sort employees
  const sortedEmployees = useMemo(() => {
    const getSortName = (n) => {
      if (!n) return '';
      let clean = n.replace(/^Dr\.\s+/i, ''); 
      if (clean.includes(',')) return clean; 
      const parts = clean.trim().split(/\s+/);
      return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : clean;
    };

    const baseFiltered = [...employees].filter(emp => 
      emp.id !== 'admin' && 
      emp.id !== 'sekretariat' && 
      emp.id !== 'assistentensprecher' &&
      !emp.name?.toLowerCase().includes('administrator') &&
      !emp.name?.toLowerCase().includes('assistentensprecher') &&
      emp.active !== false
    );

    if (sortMode === 'rotation') {
      return baseFiltered.sort((a, b) => {
        const areaA = getEmpArea(a.id);
        const areaB = getEmpArea(b.id);
        const idxA = effectiveAreaOrder.indexOf(areaA) === -1 ? 999 : effectiveAreaOrder.indexOf(areaA);
        const idxB = effectiveAreaOrder.indexOf(areaB) === -1 ? 999 : effectiveAreaOrder.indexOf(areaB);
        
        if (idxA !== idxB) return idxA - idxB;
        return getSortName(a.name).localeCompare(getSortName(b.name));
      });
    }

    if (sortMode === 'skill') {
      return baseFiltered.sort((a, b) => {
        const infoA = getEmployeePriorityInfo(a);
        const infoB = getEmployeePriorityInfo(b);
        
        if (infoA.idx !== infoB.idx) return infoA.idx - infoB.idx;
        return getSortName(a.name).localeCompare(getSortName(b.name));
      });
    }

    // Standard mode: Purely alphabetical
    return baseFiltered.sort((a, b) => {
      return getSortName(a.name).localeCompare(getSortName(b.name));
    });
  }, [employees, sortMode, activeMonthStr, rotationData, skills, groupColors]);

  const rowVirtualizer = useVirtualizer({
    count: sortedEmployees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CELL_H,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Auto-reset illegal sort modes for profile
  useEffect(() => {
    if (planerType === 'oa' && sortMode === 'rotation') {
      setSortMode('skill');
    }
  }, [planerType, sortMode]);

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToCol = (index) => {
    setForcedMonthIndex(index);
    const offset = colVirtualizer.getOffsetForIndex(index, 'start')[0];
    if (parentRef.current) {
      parentRef.current.scrollTo({
        left: Math.max(0, offset),
        behavior: 'smooth'
      });
    }
  };

  const scrollToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const index = days.findIndex(d => d.dateStr === todayStr);
    if (index !== -1 && parentRef.current) {
      setForcedMonthIndex(index);
      const offset = colVirtualizer.getOffsetForIndex(index, 'start')[0];
      parentRef.current.scrollTo({
        left: Math.max(0, offset),
        behavior: 'smooth'
      });
      setTodayIndicator(true);
      setTimeout(() => setTodayIndicator(false), 3000);
    }
  };

  const handleSaveAbsence = (formData) => {
    const newAbsences = { ...absences };
    const empId = formData.employeeId;
    if (!newAbsences[empId]) newAbsences[empId] = {};
    
    let curr = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    while (curr <= end) {
      const dStr = curr.toISOString().split('T')[0];
      newAbsences[empId][dStr] = {
        type: formData.type,
        text: formData.remarks,
        vertreter: formData.vertreter,
        vertreterId: formData.vertreterId
      };
      curr.setDate(curr.getDate() + 1);
    }
    if (onSaveAbsences) onSaveAbsences(newAbsences);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging && draggedEmpId) {
        if (dragStartVal === 'set' && draggedDates.length > 0) {
          const vName = dragVertreter;
          const vId = employees.find(e => e.name === vName)?.id || '';
          
          const sorted = [...draggedDates].sort();
        const minD = sorted[0];
        const maxD = sorted[sorted.length - 1];
        
        const fmt = (d) => {
          if (!d || !d.includes('-')) return d;
          const [y, m, day] = d.split('-');
          return `${day}.${m}.${y}`;
        };
        
        const rangeStr = minD === maxD ? fmt(minD) : `${fmt(minD)} bis ${fmt(maxD)}`;
        
        if (window.confirm(`Soll für diesen Eintrag (${rangeStr}) eine Karte zur PO-Übertragung erstellt werden?`)) {
          const stamp = { 
            at: new Date().toISOString(), 
            uid: currentUser.id, 
            name: currentUser.stampAlias || currentUser.name 
          };
          
          onSubmitRequest({
            id: 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            empId: draggedEmpId,
            type: mode,
            text: dragArt,
            vertreter: vName,
            vertreterId: vId,
            dates: sorted,
            status: 'approved',
            stamps: {
              submitted: stamp,
              vertreter: { ...stamp, isAuto: true },
              admin: { ...stamp, isAuto: true }
            }
          });
        }
        if (onSaveAbsences && tempAbsencesRef.current) {
          onSaveAbsences(tempAbsencesRef.current);
        }
      }
      setIsDragging(false);
      setDraggedDates([]);
      setDraggedEmpId(null);
      setLastDraggedDate(null);
      setTempAbsences(null);
      tempAbsencesRef.current = null;
    }
  };
  window.addEventListener('mouseup', handleMouseUp);
  return () => window.removeEventListener('mouseup', handleMouseUp);
}, [isDragging, tempAbsences, onSaveAbsences, dragStartVal, draggedDates, draggedEmpId, dragVertreter, dragArt, mode, employees, currentUser, onSubmitRequest]);


  const handleCellDragTouch = (e, empId, dateStr) => {
    if (!isAdmin) return;
    if (e.pointerType !== 'mouse') return;
    
    const existing = absences[empId]?.[dateStr];
    const initialAction = existing ? 'clear' : 'set';
    
    setDragStartVal(initialAction);
    setIsDragging(true);
    setDraggedDates([dateStr]);
    setDraggedEmpId(empId);
    setLastDraggedDate(dateStr);
    const initialAbsences = { ...absences };
    setTempAbsences(initialAbsences); 
    tempAbsencesRef.current = initialAbsences;
    applyDraggedAbsence(empId, dateStr, initialAction, initialAbsences);
  };

  const applyDraggedAbsence = (empId, dateStr, forcedAction = null, baseAbsences = null) => {
    const action = forcedAction || dragStartVal;
    if (!action) return;

    setTempAbsences(prev => {
      const newAbsences = prev || baseAbsences || { ...absences };
      if (!newAbsences[empId]) newAbsences[empId] = {};
      
      const targetDates = [dateStr];

      // INTERPOLATION: Fill gaps if we skipped dates during drag
      if (lastDraggedDate && lastDraggedDate !== dateStr) {
        const start = new Date(lastDraggedDate < dateStr ? lastDraggedDate : dateStr);
        const end = new Date(lastDraggedDate < dateStr ? dateStr : lastDraggedDate);
        let curr = new Date(start);
        curr.setDate(curr.getDate() + 1);
        while (curr < end) {
          targetDates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
      }

      targetDates.forEach(dStr => {
        if (action === 'set') {
          setDraggedDates(p => p.includes(dStr) ? p : [...p, dStr]);
          newAbsences[empId][dStr] = {
            type: mode,
            text: dragArt,
            vertreter: dragVertreter,
            status: 'confirmed'
          };
        } else if (action === 'clear') {
          if (newAbsences[empId][dStr]) {
            delete newAbsences[empId][dStr];
          }
        }
      });

      const result = { ...newAbsences };
      tempAbsencesRef.current = result;
      return result;
    });

    setLastDraggedDate(dateStr);
  };

  const handleEditQuota = (emp) => {
    if (!isAdmin && currentUser?.id !== emp.id) {
      alert('Stopp! Nur der Admin oder der Mitarbeiter selbst können das Urlaubskontingent ändern.');
      return;
    }
    const stats = vacationStats[emp.id] || { total: 0, quota: 30 };
    const val = prompt(`Jahresurlaub für ${emp.name || emp.id} (Tage):`, stats.quota);
    if (val === null) return;
    const num = parseInt(val);
    if (isNaN(num) || num < 0) { alert('Ungültige Zahl.'); return; }
    
    const newEmployees = employees.map(e => {
       if (e.id === emp.id) return { ...e, vacationQuota: num };
       return e;
    });
    if (onUpdateAdminData) onUpdateAdminData({ employees: newEmployees });
  };

  const handleMouseEnter = (e, day, emp) => {
    let lines = [];
    
    // 1. Absence or Request Info
    if (emp) {
      const absence = absences[emp.id]?.[day.dateStr];
      const pendingReq = !absence && requests.find(r => 
        r.empId === emp.id && 
        r.dates.includes(day.dateStr) && 
        r.status.startsWith('pending')
      );

      const target = absence || pendingReq;
      if (target) {
        const typeLabel = { U: 'Urlaub', V: 'Urlaub', D: 'Dienstreise', F: 'Fortbildung', S: 'Sonstiges', T: 'Sonstiges' };
        const statusLabel = { 
          pending_vertreter: 'Vertreter-Zustimmung ausstehend', 
          pending_admin: 'LOA-Freigabe ausstehend' 
        };
        
        const dateFmt = day.dateStr && day.dateStr.includes('-') 
          ? (() => { const [y, m, d] = day.dateStr.split('-'); return `${d}.${m}.${y}`; })()
          : day.dateStr;
        
        lines.push(`**${emp.name} (${dateFmt})**`);

        const typeText = typeLabel[target.type] || target.type;
        lines.push(`**${typeText}${target.text ? ': ' + target.text : ''}**`);

        // Find matching request for approval stamp
        const req = requests.find(r => r.empId === emp.id && r.dates.includes(day.dateStr) && r.status === 'approved');
        if (req && req.stamps?.admin) {
          lines.push(`Genehmigt von: ${req.stamps.admin.name}`);
        }
        
        if (pendingReq) {
          lines.push(`*(${statusLabel[pendingReq.status]})*`);
        }

        
        if (target.vertreter) {
          lines.push(`Vertreter: ${target.vertreter}`);
        }
        lines.push('---');
      }
    }

    // 2. Calendar Info
    if (day.holiday) lines.push(day.holiday);
    if (day.ferienName) lines.push(day.ferienName);
    if (day.congressName) lines.push(day.congressName);

    if (lines.length > 0) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        content: lines.join('\n')
      });
    }
  };

  const handleMouseMove = (e) => {
    setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="calendar-view-root" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tooltip {...tooltip} />
      
      <AbsenceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={onSaveAbsences}
        onSubmitRequest={onSubmitRequest}
        employees={employees.filter(e => !e._isCrossProfile)}
        isAdmin={isAdmin}
        perms={perms}
        currentUser={currentUser}
        skills={skills}
        absences={absences}
        requests={requests}
        vacationStats={vacationStats}
      />


      {(perms.canBulkImport || perms.canDeleteAbsences) && (
        <div className="calendar-toolbar glass" style={{ 
          padding: '12px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          zIndex: 110,
          margin: '12px',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {perms.canBulkImport && (
              <button 
                className="nav-item-btn" 
                onClick={() => setIsBulkOpen(!isBulkOpen)}
                style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', padding: '8px 12px', background: isBulkOpen ? 'var(--bg-main)' : 'white', borderRadius: '8px', cursor: 'pointer' }}
              >
                Bulk Import
              </button>
            )}
            
            <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }}></div>
            
            {perms.canDeleteAbsences && (
              <div className="segmented-control glass" style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.3)', padding: '3px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                {['U', 'D', 'F', 'S'].map(m => (
                  <button 
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: '6px 12px', borderWidth: 0, borderRadius: '6px',
                      background: mode === m ? 'white' : 'transparent',
                      boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      fontSize: '0.8rem', fontWeight: 700,
                      color: mode === m ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {perms.canDeleteAbsences && (
              <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Grund (Art)" 
                  value={dragArt} 
                  onChange={e => setDragArt(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '120px' }}
                />
                <input 
                  type="text" 
                  placeholder="Vertreter" 
                  value={dragVertreter} 
                  onChange={e => setDragVertreter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '120px' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <BulkImport isOpen={isBulkOpen} employees={employees} />

      <TimeNavigation 
        days={days} 
        onScrollToCol={scrollToCol} 
        onNavigate={(dir) => {
          if (parentRef.current) {
            parentRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
          }
        }}
        activeMonthKey={(() => {
          // Use a smaller offset (1.5 cells) to match the new scrollToCol behavior (-1 cell)
          const visibleIndex = Math.floor((colVirtualizer.scrollOffset + (1.5 * CELL_W)) / CELL_W);
          const day = days[Math.min(Math.max(0, visibleIndex), days.length - 1)];
          return day ? `${day.year}-${day.month}` : null;
        })()}
        onScrollToToday={scrollToToday}
        sortMode={sortMode}
        planerType={planerType}
        onToggleSort={() => {
          if (sortMode === 'standard') setSortMode('skill');
          else if (sortMode === 'skill') {
            if (planerType === 'oa') setSortMode('standard');
            else setSortMode('rotation');
          }
          else setSortMode('standard');
        }}
        onOpenEntryModal={() => setIsModalOpen(true)}
        showEntryButton={isAdmin}
        onSave={() => onSaveAbsences && onSaveAbsences()}
      />


      <div 
        ref={parentRef} 
        className="grid-container" 
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          position: 'relative',
          background: 'var(--bg-main)' 
        }}
      >
        <div style={{
          height: `${rowVirtualizer.getTotalSize() + HEADER_H + 100}px`, // Added 100px buffer for mobile nav
          width: `${colVirtualizer.getTotalSize() + NAME_W}px`,
          position: 'relative'
        }}>
          
          {/* 1. STICKY DATE HEADERS (TOP) */}
          <div style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 100, 
            height: HEADER_H, 
            width: `${colVirtualizer.getTotalSize() + NAME_W}px`,
            background: 'white'
          }}>
            {/* CORNER */}
            <div style={{ 
              position: 'sticky', 
              top: 0, 
              left: 0, 
              zIndex: 110, 
              width: NAME_W, 
              height: 60, 
              background: '#f1f5f9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold', 
              borderRight: '2px solid var(--border)', 
              borderBottom: '2px solid var(--border)',
              borderTop: 'none',
              borderLeft: 'none'
            }}>
              Mitarbeiter
            </div>

            {/* HEADER ITEMS */}
            {virtualCols.map((vCol) => {
              const day = days[vCol.index];
              const isToday = day.dateStr === new Date().toISOString().split('T')[0];
              const bgColor = day.holiday ? '#fee2e2' : day.isCongress ? '#f3e8ff' : day.isWeekend ? '#f8fafc' : 'white';
              
              return (
                <div 
                  key={vCol.key} 
                  className={`cell header-item`} 
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: vCol.start + NAME_W,
                    width: vCol.size, 
                    height: 60, 
                    background: bgColor,
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '2px solid var(--border)',
                    borderTop: 'none',
                    borderLeft: 'none'
                  }}
                >
                  {day.isFerien && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#84cc16' }}></div>
                  )}
                  <div style={{ textAlign: 'center', lineHeight: 1.2, paddingTop: todayIndicator && isToday ? 20 : 0 }}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{['So','Mo','Di','Mi','Do','Fr','Sa'][new Date(day.dateStr).getDay()]}</div>
                    <strong style={{ fontSize: '0.8rem' }}>{day.day}.</strong>
                    {todayIndicator && isToday && (
                      <div style={{
                        position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                        color: '#ef4444', animation: 'bounce 0.5s infinite alternate', zIndex: 200, textShadow: '0 0 4px white'
                      }}>
                        <ArrowDown size={18} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* COVERAGE VALIDATION ROW */}
            {planerType === 'oa' && (
              <div style={{ 
                position: 'absolute', 
                top: 60, 
                left: 0, 
                width: '100%',
                height: VALIDATION_H,
                background: 'white',
                borderBottom: '2px solid var(--border)'
              }}>
                <div className="cell name-item" style={{ 
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 110, 
                  width: NAME_W, 
                  height: VALIDATION_H, 
                  background: '#f1f5f9', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 12px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#64748b',
                  borderRight: '2px solid var(--border)',
                  textTransform: 'uppercase',
                  borderTop: 'none'
                }}>
                  Besetzungs-Check
                </div>
                {virtualCols.map(vCol => {
                  const day = days[vCol.index];
                  const issues = coverageMap[day.dateStr];
                  const hasIssues = issues && issues.length > 0;
                  const bgColor = day.holiday ? '#fff1f2' : day.isCongress ? '#f0f9ff' : day.isWeekend ? '#f8fafc' : 'white';
                  
                  return (
                    <div 
                      key={`val-${vCol.key}`}
                      onMouseEnter={(e) => {
                        if (hasIssues) {
                          setTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            visible: true,
                            content: `**Fehlende Besetzung:**\n${issues.join(', ')}`
                          });
                        }
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: vCol.start + NAME_W,
                        width: vCol.size,
                        height: VALIDATION_H,
                        background: hasIssues ? '#fee2e2' : bgColor,
                        borderRight: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: hasIssues ? 'help' : 'default',
                        boxSizing: 'border-box'
                      }}
                    >
                      {hasIssues && (
                        <div style={{ 
                          fontSize: '1rem', 
                          fontWeight: 900, 
                          color: '#ef4444',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textShadow: '0 0 2px white'
                        }}>
                          !
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. ROWS (Names + Body Cells) */}
          {virtualRows.map((vRow) => {
            const emp = sortedEmployees[vRow.index];
            if (!emp) return null;
            return (
              <div 
                key={vRow.key} 
                style={{ 
                  position: 'absolute', 
                  top: vRow.start + HEADER_H, 
                  left: 0, 
                  width: '100%', 
                  height: vRow.size,
                  display: 'flex' 
                }}
              >
                {/* NAME CELL (Sticky Left) */}
                <div className="cell name-item" style={{ 
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 90, 
                  width: NAME_W, 
                  height: vRow.size, 
                  background: 'white', 
                  borderRight: '2px solid var(--border)', 
                  borderBottom: '2px solid var(--border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 12px',
                  flexShrink: 0,
                  borderLeft: `6px solid ${(() => {
                    if (sortMode === 'rotation') {
                      const areaId = getEmpArea(emp.id);
                      // Try ID first, then Display Name
                      const colorFromId = getSkillColor(areaId);
                      if (colorFromId && colorFromId !== '#e2e8f0') return colorFromId;
                      
                      const areaName = MONTH_AREA_MAPPING[areaId] || areaId;
                      const customColor = getSkillColor(areaName);
                      if (customColor && customColor !== '#e2e8f0') return customColor;
                      
                      return getAreaColor(areaId);
                    }
                    return getEmployeeColor(emp);
                  })()}`,
                  borderTop: (() => {
                    if (sortMode === 'standard') return 'none';
                    const prevEmp = sortedEmployees[vRow.index - 1];
                    
                    const currentAreaId = getEmpArea(emp.id);
                    const grps = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
                    const skillId = grps[0] || '';
                    
                    const prevAreaId = prevEmp ? getEmpArea(prevEmp.id) : null;
                    const prevGrps = prevEmp ? (Array.isArray(prevEmp.groups) ? prevEmp.groups : [prevEmp.group]) : [];
                    const prevSkillId = prevGrps[0] || '';

                    const hasChanged = sortMode === 'rotation' 
                      ? (vRow.index === 0 || currentAreaId !== prevAreaId)
                      : (vRow.index === 0 || skillId !== prevSkillId);

                    if (hasChanged) {
                      const color = sortMode === 'rotation' 
                        ? (() => {
                            const cId = getSkillColor(currentAreaId);
                            if (cId && cId !== '#e2e8f0') return cId;
                            const currentAreaName = MONTH_AREA_MAPPING[currentAreaId] || currentAreaId;
                            const cName = getSkillColor(currentAreaName);
                            return (cName && cName !== '#e2e8f0') ? cName : getAreaColor(currentAreaId);
                          })()
                        : getEmployeeColor(emp);
                      return `1px solid ${color}88`;
                    }
                    return 'none';
                  })()
                }}>
                  <div style={{ width: '100%', overflow: 'hidden', height: '100%', position: 'relative' }}>
                    {/* AREA Label (Always Left) */}
                    {(() => {
                      if (planerType === 'oa') return null;
                      const areaId = getEmpArea(emp.id);
                      const isRotation = sortMode === 'rotation';
                      const prevEmp = isRotation ? sortedEmployees[vRow.index - 1] : null;
                      const isFirstInArea = !prevEmp || getEmpArea(prevEmp.id) !== areaId;
                      
                      // Show if it's explicitly the header or if it's individual in non-rotation mode
                      if ((isRotation && isFirstInArea) || !isRotation) {
                        const areaName = MONTH_AREA_MAPPING[areaId] || areaId;
                        const customColor = (() => {
                          const cId = getSkillColor(areaId);
                          if (cId && cId !== '#e2e8f0') return cId;
                          return getSkillColor(areaName);
                        })();
                        
                        const color = (customColor && customColor !== '#e2e8f0') ? customColor : getAreaColor(areaId);
                        
                        return (
                          <div style={{ 
                            position: 'absolute', top: 2, left: 0, fontSize: '0.55rem', 
                            color: color === '#e2e8f0' ? '#64748b' : color, 
                            fontWeight: 800, whiteSpace: 'nowrap', textTransform: 'uppercase',
                            maxWidth: isCompact ? '80%' : '60%', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {MONTH_AREA_MAPPING[areaId] || (isRotation ? 'Ohne Bereich' : '')}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* SKILL Label (Always Right) */}
                    {(() => {
                      const best = getEmployeePriorityInfo(emp);
                      const skillId = best.id;
                      
                      const isSkillSort = sortMode === 'skill';
                      const prevEmp = isSkillSort ? sortedEmployees[vRow.index - 1] : null;
                      const prevBest = prevEmp ? getEmployeePriorityInfo(prevEmp) : { id: 'none' };
                      const prevSkillId = prevBest.id;
                      const isFirstInSkill = !prevEmp || prevSkillId !== skillId;

                      if ((isSkillSort && isFirstInSkill) || !isSkillSort) {
                        const color = getEmployeeColor(emp);
                        return (
                          <div style={{ 
                            position: 'absolute', top: (isCompact && planerType !== 'oa') ? 12 : 6, right: 0, fontSize: '0.55rem', 
                            color: color === '#e2e8f0' ? '#64748b' : color, 
                            fontWeight: 800, textTransform: 'uppercase', opacity: 0.9,
                            maxWidth: isCompact ? '80%' : '40%', overflow: 'hidden', textAlign: 'right',
                            display: '-webkit-box',
                            WebkitLineClamp: isCompact ? 1 : 2,
                            WebkitBoxOrient: 'vertical',
                            whiteSpace: 'normal',
                            lineHeight: '1.2'
                          }}>
                            {formatSkillName(getSkillName(skillId))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0, 
                      marginTop: (isCompact && planerType !== 'oa') ? '24px' : '15px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        fontWeight: 700, 
                        fontSize: isCompact ? '0.8125rem' : '0.875rem', 
                        whiteSpace: isCompact ? 'normal' : 'nowrap', 
                        maxWidth: '100%',
                        overflow: 'hidden', 
                        display: '-webkit-box',
                        WebkitLineClamp: isCompact ? 2 : 1,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.1'
                      }}>
                        {formatDisplayName(emp.name || emp.id)}
                      </div>

                      {/* V1 Vacation Badge */}
                      {(() => {
                        let stats = vacationStats[emp.id] || { total: 0, quota: 30 };
                        
                        // REAL-TIME: If dragging this employee, calculate live total from tempAbsences
                        if (isDragging && draggedEmpId === emp.id && tempAbsences) {
                          const year = new Date().getFullYear();
                          const vacationDates = new Set();
                          const empAbsences = tempAbsences[emp.id] || {};
                          
                          // 1. From temporary drag state
                          Object.entries(empAbsences).forEach(([dateStr, entry]) => {
                            if (!dateStr.startsWith(String(year))) return;
                            const type = typeof entry === 'object' ? entry.type : entry;
                            if (type === 'U' || type === 'V') {
                              const d = days.find(day => day.dateStr === dateStr);
                              if (d && !d.isWeekend && !d.holiday) {
                                vacationDates.add(dateStr);
                              }
                            }
                          });

                          // 2. From pending requests (not yet in tempAbsences)
                          requests.filter(r => 
                            r.empId === emp.id && 
                            r.status.startsWith('pending') && 
                            (r.type === 'U' || r.type === 'V')
                          ).forEach(r => {
                            r.dates.forEach(dateStr => {
                              if (!dateStr.startsWith(String(year))) return;
                              if (empAbsences[dateStr]) return; 
                              const d = days.find(day => day.dateStr === dateStr);
                              if (d && !d.isWeekend && !d.holiday) {
                                vacationDates.add(dateStr);
                              }
                            });
                          });

                          stats = { ...stats, total: vacationDates.size };
                        }

                        const over = stats.total > stats.quota;
                        const canEdit = isAdmin || currentUser === emp.id;
                        
                        return (
                          <div className="vac-badge" style={{ fontSize: '0.7rem', marginTop: '-2px' }}>
                            <span style={{ color: over ? '#ef4444' : '#3b82f6', fontWeight: 800 }}>{stats.total}</span>
                            <span style={{ color: '#94a3b8', margin: '0 1px' }}>/</span>
                            <span 
                              className={`vac-quota ${canEdit ? 'editable' : ''}`} 
                              onClick={() => handleEditQuota(emp)}
                              title={canEdit ? 'Klicken zum Ändern' : ''}
                              style={{ 
                                cursor: canEdit ? 'pointer' : 'default',
                                borderBottom: canEdit ? '1px dashed #94a3b8' : 'none'
                              }}
                            >
                              {stats.quota}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Visual Header Label (Absolute Top Left of First in Group) */}
                {(() => {
                  if (sortMode === 'standard') return null;
                  const prevEmp = sortedEmployees[vRow.index - 1];
                  
                  const isRotation = sortMode === 'rotation';
                  const areaId = getEmpArea(emp.id);
                  const grps = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
                  const skillId = grps[0] || '';

                  const prevAreaId = prevEmp ? getEmpArea(prevEmp.id) : null;
                  const prevGrps = prevEmp ? (Array.isArray(prevEmp.groups) ? prevEmp.groups : [prevEmp.group]) : [];
                  const prevSkillId = prevGrps[0] || '';

                  const isFirst = isRotation 
                    ? (vRow.index === 0 || areaId !== prevAreaId)
                    : (vRow.index === 0 || skillId !== prevSkillId);

                  if (isFirst) {
                    const label = isRotation ? (MONTH_AREA_MAPPING[areaId] || areaId) : getSkillName(skillId);
                    const color = isRotation 
                      ? (() => {
                          const cId = getSkillColor(areaId);
                          if (cId && cId !== '#e2e8f0') return cId;
                          return getAreaColor(areaId);
                        })()
                      : getSkillColor(skillId);
                    
                    return (
                      <div style={{ 
                        position: 'absolute', top: 0, left: 6, 
                        fontSize: '0.55rem', color: color === '#e2e8f0' ? '#64748b' : color, 
                        fontWeight: 900, background: 'white', padding: '0 4px',
                        zIndex: 10, borderRadius: '4px', textTransform: 'uppercase',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: `${color}44`,
                        transform: 'translateY(-50%)'
                      }}>
                        {label || 'Ohne Bereich'}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* BODY CELLS (Absolute relative to Row) */}
                {virtualCols.map((vCol) => {
                  const day = days[vCol.index];
                  const currentAbsences = tempAbsences || absences;
                  const absence = currentAbsences[emp.id]?.[day.dateStr];
                  const pendingReq = !absence && requests.find(r => 
                    r.empId === emp.id && r.dates.includes(day.dateStr) && r.status.startsWith('pending')
                  );

                  const bgColor = day.holiday ? '#fff1f2' : day.isCongress ? '#f0f9ff' : day.isWeekend ? '#f8fafc' : 'white';

                  return (
                    <div 
                      key={`${vRow.key}-${vCol.key}`} 
                      className={`cell body-item ${(() => {
                        if (absence) {
                          const t = absence.type;
                          return (t === 'U' || t === 'V') ? 'status-vacation' : t === 'D' ? 'status-trip' : t === 'F' ? 'status-training' : 'status-custom';
                        }
                        if (pendingReq) {
                          return pendingReq.status === 'pending_vertreter' ? 'status-pending-vertreter' : 'status-pending-admin';
                        }
                        return '';
                      })()}`} 
                      onMouseEnter={(e) => {
                        handleMouseEnter(e, day, emp);
                        if (isDragging) applyDraggedAbsence(emp.id, day.dateStr);
                      }}
                      onPointerDown={(e) => handleCellDragTouch(e, emp.id, day.dateStr)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: vCol.start + NAME_W, 
                        width: vCol.size, 
                        height: vRow.size, 
                        background: (absence || pendingReq) ? undefined : (day.isCongress ? '#f3e8ff' : bgColor), 
                        borderRight: '1px solid var(--border)', 
                        borderBottom: '1px solid var(--border)',
                        borderTop: 'none',
                        borderLeft: 'none',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        opacity: emp._isCrossProfile ? 0.7 : 1,
                        cursor: isAdmin ? 'crosshair' : 'default'
                      }}
                    >
                      {absence?.text && <span className="cell-text">{absence.text}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
