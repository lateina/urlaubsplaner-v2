import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../UI/Modal';
import { User, Calendar, Plus, Trash2, AlertTriangle, CheckCircle2, Split, Clock, ArrowRight } from 'lucide-react';

const EditRepresentativesModal = ({
  isOpen,
  onClose,
  request,
  employees = [],
  absences = {},
  requests = [],
  rotationData = [],
  onSave
}) => {
  if (!isOpen || !request) return null;

  const dates = useMemo(() => request.dates || [], [request]);
  const minDate = dates.length > 0 ? dates[0] : '';
  const maxDate = dates.length > 0 ? dates[dates.length - 1] : '';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.`;
  };

  const formatYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const addDays = (dateStr, n) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + n);
    return formatYMD(date);
  };

  const getDatesBetween = (fromStr, toStr) => {
    if (!fromStr || !toStr || fromStr > toStr) return [];
    const res = [];
    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const [ty, tm, td] = toStr.split('-').map(Number);
    let curr = new Date(fy, fm - 1, fd);
    const end = new Date(ty, tm - 1, td);
    while (curr <= end) {
      res.push(formatYMD(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return res;
  };

  // Initial state setup
  const hasExistingSplit = Array.isArray(request.substitutes) && request.substitutes.length > 1;

  const [mode, setMode] = useState(hasExistingSplit ? 'split' : 'single');
  const [singleVertreterId, setSingleVertreterId] = useState(
    request.vertreter === 'Kein Vertreter nötig' ? 'none' : (request.vertreterId || '')
  );
  const [singleVertreterName, setSingleVertreterName] = useState(
    request.vertreter === 'Kein Vertreter nötig' ? 'Kein Vertreter nötig' : (request.vertreter || '')
  );

  const [segments, setSegments] = useState(() => {
    if (Array.isArray(request.substitutes) && request.substitutes.length > 0) {
      return request.substitutes.map((s, idx) => ({
        id: 'seg_' + idx + '_' + Date.now(),
        from: s.from || minDate,
        to: s.to || maxDate,
        vertreterId: s.vertreter === 'Kein Vertreter nötig' ? 'none' : (s.vertreterId || ''),
        vertreter: s.vertreter || ''
      }));
    }
    return [
      {
        id: 'seg_init_' + Date.now(),
        from: minDate,
        to: maxDate,
        vertreterId: request.vertreter === 'Kein Vertreter nötig' ? 'none' : (request.vertreterId || ''),
        vertreter: request.vertreter || ''
      }
    ];
  });

  const [approvalOption, setApprovalOption] = useState(
    request.status === 'approved' ? 'direct' : 'restart'
  );

  // Sync state when request prop changes
  useEffect(() => {
    if (!request) return;
    const isSplit = Array.isArray(request.substitutes) && request.substitutes.length > 1;
    setMode(isSplit ? 'split' : 'single');
    setSingleVertreterId(request.vertreter === 'Kein Vertreter nötig' ? 'none' : (request.vertreterId || ''));
    setSingleVertreterName(request.vertreter === 'Kein Vertreter nötig' ? 'Kein Vertreter nötig' : (request.vertreter || ''));

    if (Array.isArray(request.substitutes) && request.substitutes.length > 0) {
      setSegments(request.substitutes.map((s, idx) => ({
        id: 'seg_' + idx + '_' + Date.now(),
        from: s.from || (request.dates ? request.dates[0] : ''),
        to: s.to || (request.dates ? request.dates[request.dates.length - 1] : ''),
        vertreterId: s.vertreter === 'Kein Vertreter nötig' ? 'none' : (s.vertreterId || ''),
        vertreter: s.vertreter || ''
      })));
    } else {
      setSegments([
        {
          id: 'seg_init_' + Date.now(),
          from: request.dates ? request.dates[0] : '',
          to: request.dates ? request.dates[request.dates.length - 1] : '',
          vertreterId: request.vertreter === 'Kein Vertreter nötig' ? 'none' : (request.vertreterId || ''),
          vertreter: request.vertreter || ''
        }
      ]);
    }
    setApprovalOption(request.status === 'approved' ? 'direct' : 'restart');
  }, [request]);

  const candidateEmployees = useMemo(() => {
    return employees
      .filter(e => e.id !== request.empId && e.active !== false)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [employees, request.empId]);

  const requesterEmp = employees.find(e => e.id === request.empId);

  // Dynamic check: Is the employee in Labor/Forschungsfrei for the ENTIRE requested period?
  const isLaborPeriod = useMemo(() => {
    if (!request?.empId || !minDate || !maxDate) return false;
    if (maxDate < minDate) return false;
    if (!rotationData || rotationData.length === 0) return false;

    const [fy, fm, fd] = minDate.split('-').map(Number);
    const [ty, tm, td] = maxDate.split('-').map(Number);
    let curr = new Date(fy, fm - 1, fd);
    const end = new Date(ty, tm - 1, td);

    const months = new Set();
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      months.add(`${y}_${m}`);
      curr.setDate(curr.getDate() + 1);
    }
    if (months.size === 0) return false;

    for (const mStr of months) {
      const mNoZero = mStr.replace('_0', '_');
      const hasLabor = rotationData.some(r => {
        const mId = String(r.monat_id || r.mi || '').replace('month_', '').replace('-', '_');
        const empId = String(r.mitarbeiter_id || r.mi_id || r.ei || r.employee_id);
        const areaId = (r.ai || r.bi || r.area_id || '').replace(/_/g, '').toLowerCase();

        const matchesMonth = (mId === mStr || mId === mNoZero);
        const matchesEmp = (empId === String(request.empId));
        const isLabor = (areaId === 'labor' || (areaId.includes('labor') && !areaId.includes('echo') && !areaId.includes('schlaf')));

        return matchesMonth && matchesEmp && isLabor;
      });

      if (!hasLabor) return false;
    }

    return true;
  }, [request?.empId, minDate, maxDate, rotationData]);

  // Conflict detector
  const checkConflicts = (vId, dateList) => {
    if (!vId || vId === 'none' || !dateList || dateList.length === 0) return [];
    const repEmp = employees.find(e => e.id === vId);
    const conflicts = [];

    for (const d of dateList) {
      if (absences[vId]?.[d]) {
        conflicts.push({ date: d, reason: 'Selbst abwesend' });
        continue;
      }
      const ownReq = requests.find(r => r.empId === vId && r.dates?.includes(d) && r.status !== 'rejected');
      if (ownReq) {
        conflicts.push({ date: d, reason: 'Eigener Antrag' });
        continue;
      }
      const existingReps = requests.filter(r => r.vertreterId === vId && r.dates?.includes(d) && r.status !== 'rejected' && r.id !== request.id);
      if (existingReps.length > 0) {
        if (existingReps.length >= 2) {
          conflicts.push({ date: d, reason: 'Bereits 2x Vertretung' });
        } else {
          const reqIsEpu = requesterEmp && ((requesterEmp.role === 'Oberarzt' || requesterEmp.isOberarzt || (requesterEmp.groups || []).includes('skill_funktionsoberarzt')) && (requesterEmp.groups || []).includes('skill_epu'));
          const otherEmp = employees.find(e => e.id === existingReps[0].empId);
          const otherIsEpu = otherEmp && ((otherEmp.role === 'Oberarzt' || otherEmp.isOberarzt || (otherEmp.groups || []).includes('skill_funktionsoberarzt')) && (otherEmp.groups || []).includes('skill_epu'));
          const vertreterIsEpu = repEmp && (repEmp.groups || []).includes('skill_epu');
          if (!reqIsEpu || !otherIsEpu || !vertreterIsEpu) {
            conflicts.push({ date: d, reason: 'Bereits andere Vertretung' });
          }
        }
      }
    }
    return conflicts;
  };

  // Single mode conflicts
  const singleConflicts = useMemo(() => {
    return checkConflicts(singleVertreterId, dates);
  }, [singleVertreterId, dates, absences, requests]);

  // Segment operations
  const handleAddSegment = () => {
    if (segments.length === 0) {
      setSegments([{ id: 'seg_' + Date.now(), from: minDate, to: maxDate, vertreterId: '', vertreter: '' }]);
      return;
    }

    const lastSeg = segments[segments.length - 1];
    if (lastSeg.to < maxDate) {
      const nextFrom = addDays(lastSeg.to, 1);
      setSegments(prev => [
        ...prev,
        { id: 'seg_' + Date.now(), from: nextFrom, to: maxDate, vertreterId: '', vertreter: '' }
      ]);
    } else {
      // Split the last segment in half
      const segDates = getDatesBetween(lastSeg.from, lastSeg.to);
      if (segDates.length >= 2) {
        const midIdx = Math.floor(segDates.length / 2) - 1;
        const midDate = segDates[midIdx];
        const nextFrom = segDates[midIdx + 1];

        setSegments(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...lastSeg, to: midDate };
          updated.push({
            id: 'seg_' + Date.now(),
            from: nextFrom,
            to: lastSeg.to,
            vertreterId: '',
            vertreter: ''
          });
          return updated;
        });
      } else {
        alert('Der letzte Abschnitt umfasst nur einen einzelnen Tag und kann nicht weiter geteilt werden.');
      }
    }
  };

  const handleUpdateSegment = (id, field, value) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (field === 'vertreterId') {
        if (value === 'none') {
          return { ...s, vertreterId: 'none', vertreter: 'Kein Vertreter nötig' };
        }
        const emp = candidateEmployees.find(e => e.id === value);
        return { ...s, vertreterId: value, vertreter: emp ? emp.name : '' };
      }
      return { ...s, [field]: value };
    }));
  };

  const handleRemoveSegment = (id) => {
    if (segments.length <= 1) return;
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  // Splitting validation
  const splittingValidation = useMemo(() => {
    if (mode !== 'split') return { valid: true, errors: [], warnings: [] };
    const errors = [];
    const warnings = [];

    const sorted = [...segments].sort((a, b) => a.from.localeCompare(b.from));

    // Check bounds
    if (sorted.length > 0) {
      if (sorted[0].from > minDate) {
        errors.push(`Beginn vor ${formatDate(sorted[0].from)} nicht abgedeckt (Startdatum ist ${formatDate(minDate)})`);
      }
      if (sorted[sorted.length - 1].to < maxDate) {
        errors.push(`Zeitraum nach ${formatDate(sorted[sorted.length - 1].to)} nicht abgedeckt (Enddatum ist ${formatDate(maxDate)})`);
      }
    }

    for (let i = 0; i < sorted.length; i++) {
      const seg = sorted[i];
      if (!seg.from || !seg.to) {
        errors.push(`Abschnitt ${i + 1}: Datumsbereich unvollständig.`);
        continue;
      }
      if (seg.from > seg.to) {
        errors.push(`Abschnitt ${i + 1}: 'Von' liegt nach 'Bis'.`);
      }
      if (seg.from < minDate || seg.to > maxDate) {
        errors.push(`Abschnitt ${i + 1} liegt außerhalb des Antragszeitraums.`);
      }
      if (!seg.vertreterId) {
        errors.push(`Abschnitt ${i + 1}: Bitte einen Vertreter wählen.`);
      }

      // Check gap or overlap with next segment
      if (i < sorted.length - 1) {
        const nextSeg = sorted[i + 1];
        if (seg.to >= nextSeg.from) {
          errors.push(`Überschneidung zwischen Abschnitt ${i + 1} (${formatDate(seg.from)}-${formatDate(seg.to)}) und Abschnitt ${i + 2} (${formatDate(nextSeg.from)}-${formatDate(nextSeg.to)}).`);
        } else {
          const expectedNext = addDays(seg.to, 1);
          if (nextSeg.from > expectedNext) {
            errors.push(`Lücke zwischen Abschnitt ${i + 1} und ${i + 2} (${formatDate(expectedNext)} bis ${formatDate(addDays(nextSeg.from, -1))}).`);
          }
        }
      }

      // Conflicts for this segment
      const segDates = getDatesBetween(seg.from, seg.to);
      const confs = checkConflicts(seg.vertreterId, segDates);
      if (confs.length > 0) {
        warnings.push(`Abschnitt ${i + 1} (${seg.vertreter}): Konflikt an ${confs.length} Tag(en) (${confs.slice(0, 2).map(c => formatDate(c.date)).join(', ')}${confs.length > 2 ? '...' : ''}).`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, [mode, segments, minDate, maxDate, candidateEmployees, absences, requests]);

  // Handle Save
  const handleSave = () => {
    if (mode === 'single') {
      if (!singleVertreterId) {
        alert('Bitte wählen Sie einen Vertreter oder "Kein Vertreter nötig" aus.');
        return;
      }
      if (singleConflicts.length > 0) {
        const conflictMsg = singleConflicts.map(c => `${formatDate(c.date)}: ${c.reason}`).join('\n');
        const proceed = confirm(`Achtung: Der gewählte Vertreter hat an folgenden Tagen Konflikte:\n${conflictMsg}\n\nTrotzdem fortfahren?`);
        if (!proceed) return;
      }

      const isNone = singleVertreterId === 'none';
      const updates = {
        vertreterId: isNone ? null : singleVertreterId,
        vertreter: isNone ? 'Kein Vertreter nötig' : singleVertreterName,
        substitutes: null
      };

      if (approvalOption === 'restart') {
        const nextStatus = isNone ? (request.supervisorId ? 'pending_supervisor' : 'pending_admin') : 'pending_vertreter';
        updates.status = nextStatus;
        updates.stamps = {
          ...(request.stamps || {}),
          vertreter: null,
          supervisor: null,
          admin: null
        };
        updates.notified = {
          ...(request.notified || {}),
          pending_vertreter: false,
          pending_supervisor: false,
          pending_admin: false,
          approved: false
        };
      } else {
        updates.status = 'approved';
      }

      onSave(request.id, updates);
      onClose();

    } else {
      // Split mode
      if (!splittingValidation.valid) {
        alert('Bitte beheben Sie vor dem Speichern folgende Fehler:\n\n• ' + splittingValidation.errors.join('\n• '));
        return;
      }

      if (splittingValidation.warnings.length > 0) {
        const proceed = confirm('Es gibt Vertretungskonflikte:\n\n• ' + splittingValidation.warnings.join('\n• ') + '\n\nTrotzdem speichern?');
        if (!proceed) return;
      }

      const sorted = [...segments].sort((a, b) => a.from.localeCompare(b.from));
      const formattedSubstitutes = sorted.map(s => {
        const isNone = s.vertreterId === 'none';
        return {
          from: s.from,
          to: s.to,
          dates: getDatesBetween(s.from, s.to),
          vertreterId: isNone ? null : s.vertreterId,
          vertreter: isNone ? 'Kein Vertreter nötig' : s.vertreter
        };
      });

      const summaryParts = formattedSubstitutes.map(s => `${s.vertreter} (${formatShortDate(s.from)}-${formatShortDate(s.to)})`);
      const summaryText = summaryParts.join(' / ');

      const updates = {
        vertreterId: formattedSubstitutes[0]?.vertreterId || null,
        vertreter: summaryText,
        substitutes: formattedSubstitutes
      };

      if (approvalOption === 'restart') {
        const allNone = formattedSubstitutes.every(s => !s.vertreterId);
        const nextStatus = allNone ? (request.supervisorId ? 'pending_supervisor' : 'pending_admin') : 'pending_vertreter';
        updates.status = nextStatus;
        updates.stamps = {
          ...(request.stamps || {}),
          vertreter: null,
          supervisor: null,
          admin: null
        };
        updates.notified = {
          ...(request.notified || {}),
          pending_vertreter: false,
          pending_supervisor: false,
          pending_admin: false,
          approved: false
        };
      } else {
        updates.status = 'approved';
      }

      onSave(request.id, updates);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vertretung anpassen (Admin)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '480px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Antrags-Kurzinfo */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                {requesterEmp?.name || request.empName || 'Mitarbeiter'}
              </span>
              {isLaborPeriod && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: '#e0e7ff',
                  color: '#3730a3',
                  border: '1px solid #c7d2fe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  🔬 Labor / Forschung
                </span>
              )}
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: request.status === 'approved' ? '#dcfce7' : '#fef3c7',
              color: request.status === 'approved' ? '#166534' : '#92400e'
            }}>
              {request.status === 'approved' ? 'Genehmigt' : 'Ausstehend'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
            <Calendar size={14} />
            <span>Zeitraum: <strong>{formatDate(minDate)}</strong> bis <strong>{formatDate(maxDate)}</strong> ({dates.length} Tage)</span>
          </div>
          {isLaborPeriod && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #c7d2fe', fontSize: '0.78rem', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>ℹ️ Mitarbeiter ist im Zeitraum forschungsfrei (Labor). Keine Vertretung zwingend nötig.</span>
            </div>
          )}
        </div>

        {/* Modus-Auswahl: Segmented Control */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#1e293b' }}>
            Vertretungsmodus
          </label>
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '12px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setMode('single')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: mode === 'single' ? '#ffffff' : 'transparent',
                color: mode === 'single' ? '#0f172a' : '#64748b',
                fontWeight: mode === 'single' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: mode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <User size={15} />
              Einheitlicher Vertreter
            </button>
            <button
              type="button"
              onClick={() => setMode('split')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: mode === 'split' ? '#ffffff' : 'transparent',
                color: mode === 'split' ? '#0f172a' : '#64748b',
                fontWeight: mode === 'split' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: mode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Split size={15} />
              Zeitlich aufteilen (Splitting)
            </button>
          </div>
        </div>

        {/* MODUS 1: Einheitlicher Vertreter */}
        {mode === 'single' && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#1e293b' }}>
                Vertreter für den gesamten Zeitraum
              </label>
              <select
                value={singleVertreterId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSingleVertreterId(val);
                  if (val === 'none') {
                    setSingleVertreterName('Kein Vertreter nötig');
                  } else {
                    const emp = candidateEmployees.find(c => c.id === val);
                    setSingleVertreterName(emp ? emp.name : '');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Bitte Vertreter auswählen --</option>
                <option value="none">Kein Vertreter nötig</option>
                {candidateEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {singleConflicts.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', color: '#991b1b', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Vertretungskonflikt ({singleConflicts.length} Tag(e)):</strong>
                  <div style={{ marginTop: '2px' }}>
                    {singleConflicts.slice(0, 3).map(c => `${formatDate(c.date)} (${c.reason})`).join(', ')}
                    {singleConflicts.length > 3 ? ` und ${singleConflicts.length - 3} weitere...` : ''}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#7f1d1d' }}>
                    💡 Tipp: Nutzen Sie "Zeitlich aufteilen", um nur die unkritischen Tage zuzuweisen.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODUS 2: Aufgeteilte Vertretung (Splitting) */}
        {mode === 'split' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                Zeitabschnitte ({segments.length})
              </span>
              <button
                type="button"
                onClick={handleAddSegment}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Abschnitt hinzufügen
              </button>
            </div>

            {/* Liste der Abschnitte */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {segments.map((seg, idx) => {
                const segDates = getDatesBetween(seg.from, seg.to);
                const segConflicts = checkConflicts(seg.vertreterId, segDates);

                return (
                  <div
                    key={seg.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Abschnitt {idx + 1} {seg.from && seg.to && `(${segDates.length} Tag${segDates.length !== 1 ? 'e' : ''})`}
                      </span>
                      {segments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSegment(seg.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Abschnitt löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Datumsbereich von - bis */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>Von</label>
                        <input
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={seg.from}
                          onChange={(e) => handleUpdateSegment(seg.id, 'from', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '16px', color: '#94a3b8' }}>
                        <ArrowRight size={14} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>Bis</label>
                        <input
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={seg.to}
                          onChange={(e) => handleUpdateSegment(seg.id, 'to', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* Vertreter Auswahl */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '2px' }}>Vertreter für diesen Abschnitt</label>
                      <select
                        value={seg.vertreterId}
                        onChange={(e) => handleUpdateSegment(seg.id, 'vertreterId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">-- Vertreter wählen --</option>
                        <option value="none">Kein Vertreter nötig</option>
                        {candidateEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Konfliktwarnung für diesen Abschnitt */}
                    {segConflicts.length > 0 && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 8px', fontSize: '0.75rem', color: '#991b1b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                        <span>Konflikt: {seg.vertreter} an {segConflicts.map(c => formatDate(c.date)).join(', ')} ({segConflicts[0].reason})</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Validierungs-Hinweise */}
            {!splittingValidation.valid && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', color: '#be123c' }}>
                <strong>Bitte beachten:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {splittingValidation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Admin-Entscheidung: Genehmigungsstatus */}
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
            Genehmigungsstatus & Freigabe
          </span>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: approvalOption === 'direct' ? '#f0fdf4' : '#ffffff',
            border: approvalOption === 'direct' ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}>
            <input
              type="radio"
              name="approvalOption"
              value="direct"
              checked={approvalOption === 'direct'}
              onChange={() => setApprovalOption('direct')}
              style={{ marginTop: '3px' }}
            />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Direkt übernehmen (Admin-Zuweisung)</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px', lineHeight: 1.35 }}>
                {request.status === 'approved'
                  ? 'Status bleibt "Genehmigt". Kalendereinträge werden sofort tagesgenau aktualisiert. Keine erneuten Bestätigungs-E-Mails.'
                  : 'Wird sofort als "Genehmigt" markiert und in den Kalender übertragen.'}
              </div>
            </div>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: approvalOption === 'restart' ? '#fefce8' : '#ffffff',
            border: approvalOption === 'restart' ? '1.5px solid #eab308' : '1px solid #cbd5e1',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}>
            <input
              type="radio"
              name="approvalOption"
              value="restart"
              checked={approvalOption === 'restart'}
              onChange={() => setApprovalOption('restart')}
              style={{ marginTop: '3px' }}
            />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#a16207', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Freigabeprozess neu anstoßen</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px', lineHeight: 1.35 }}>
                Status wird auf "Vertreter-Zustimmung ausstehend" zurückgesetzt. Die benannten Vertreter müssen der Vertretung zustimmen.
              </div>
            </div>
          </label>
        </div>

        {/* Buttons: Abbrechen / Speichern */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              background: '#f1f5f9',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--primary, #2563eb)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            Speichern & Übernehmen
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default EditRepresentativesModal;