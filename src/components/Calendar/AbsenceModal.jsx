import React, { useState } from 'react';
import Modal from '../UI/Modal';

const AbsenceModal = ({ isOpen, onClose, onSave, onSubmitRequest, employees, isAdmin, perms = {}, currentUser, skills = [], absences = {}, requests = [] }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'U',
    vertreter: '',
    vertreterId: '',
    remarks: '',
    employeeId: currentUser?.id || ''
  });

  // Ensure employeeId is initialized to someone other than admin if we're an admin
  React.useEffect(() => {
    if (isAdmin && formData.employeeId === 'admin') {
      const firstEmp = employees.find(e => 
        e.id !== 'admin' && 
        e.id !== 'sekretariat' && 
        e.id !== 'assistentensprecher' &&
        !e.name?.toLowerCase().includes('administrator')
      );
      if (firstEmp) {
        setFormData(prev => ({ ...prev, employeeId: firstEmp.id }));
      }
    }
  }, [isOpen, isAdmin, employees]);

  const [vertreterSearch, setVertreterSearch] = useState('');

  const [showVertreterResults, setShowVertreterResults] = useState(false);

  // Filter employees for representative search (exclude self and special roles)
  const vertreterCandidates = employees.filter(e => {
    const isSelf = e.id === formData.employeeId;
    const isSpecial = ['admin', 'sekretariat', 'assistentensprecher'].includes(e.id) || 
                      e.name?.toLowerCase().includes('administrator') ||
                      e.name?.toLowerCase().includes('assistentensprecher');
    
    if (isSelf || isSpecial) return false;

    // Filter by skill hierarchy compatibility
    const myEmp = employees.find(emp => emp.id === formData.employeeId);
    if (myEmp) {
      const mySkills = Array.isArray(myEmp.groups) ? myEmp.groups : [];
      const theirSkills = Array.isArray(e.groups) ? e.groups : [];
      
      // Get skill priority (lower index = higher skill)
      const getMinIndex = (grpIds) => {
        let min = 999;
        grpIds.forEach(gid => {
          const idx = skills.findIndex(s => s === gid || s.id === gid || s.name === gid);
          if (idx !== -1 && idx < min) min = idx;
        });
        return min;
      };

      const myBestIdx = getMinIndex(mySkills);
      const theirBestIdx = getMinIndex(theirSkills);

      // Rule 1: Shared skill
      const hasMatchingSkill = mySkills.some(s => theirSkills.includes(s));
      
      // Rule 2: Hierarchy (higher skill can represent lower skill)
      // If their best skill is at least as "high" (index <=) as my best skill
      const isHigherOrEqual = theirBestIdx <= myBestIdx;

      // Rule 3: FOA Special Rule (Assistants represent FOAs)
      const isFoaSpecial = myEmp.isExternal && !e.isExternal;

      if (!hasMatchingSkill && !isHigherOrEqual && !isFoaSpecial) return false;
    }

    return e.name?.toLowerCase().includes(vertreterSearch.toLowerCase());
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVertreterSelect = (emp) => {
    setFormData(prev => ({ 
      ...prev, 
      vertreter: emp.name, 
      vertreterId: emp.id 
    }));
    setVertreterSearch(emp.name);
    setShowVertreterResults(false);
  };

  const needsVertreter = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return true;
    const grps = Array.isArray(emp.groups) ? emp.groups : [];
    // Standard rule from V1: Chef and 'Kein Vertreter nötig' don't need representative
    if (grps.some(g => g === 'Chef' || g === 'skill_chef')) return false;
    const isOptional = grps.some(g => g === 'Kein Vertreter nötig' || g === 'skill_keinvertreternotig');
    return !isOptional;
  };

  const isVertreterRequired = needsVertreter(formData.employeeId);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Determine if this is a direct entry or a request
    const isDirect = perms.canEnterDirectly;
    const isOptional = !isVertreterRequired;

    if (!isDirect && !isOptional && !formData.vertreterId) {
      alert('Bitte einen Vertreter auswählen.');
      return;
    }

    // Build dates array
    const dates = [];
    let curr = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // --- Validation Logic (matching V1) ---
    if (!isDirect) {
        const formatDate = (dateStr) => {
            const [y, m, d] = dateStr.split('-');
            return `${d}.${m}.${y}`;
        };

        // 1. Check if Representative is available
        if (formData.vertreterId) {
            const vId = formData.vertreterId;
            const vName = formData.vertreter;
            const absentDates = [];
            const ownReqDates = [];
            const alreadyRepDates = [];
            
            for (const d of dates) {
                // Check confirmed absence
                if (absences[vId]?.[d]) {
                    absentDates.push(d);
                }
                // Check if representative has their own pending/approved request
                const vOwnReq = requests.find(r => r.empId === vId && r.dates.includes(d) && r.status !== 'rejected');
                if (vOwnReq) {
                    ownReqDates.push(d);
                }
                // Check if representative is already representing someone else
                const vAlreadyRep = requests.find(r => r.vertreterId === vId && r.dates.includes(d) && r.status !== 'rejected');
                if (vAlreadyRep) {
                    alreadyRepDates.push(d);
                }
            }

            if (absentDates.length > 0) {
                alert(`${vName} ist an folgenden Tagen bereits abwesend: ${absentDates.map(formatDate).join(', ')}.\n\nBitte teile den Zeitraum auf oder wähle einen anderen Vertreter.`);
                return;
            }
            if (ownReqDates.length > 0) {
                alert(`${vName} hat für folgende Tage bereits einen Abwesenheitsantrag gestellt: ${ownReqDates.map(formatDate).join(', ')}.\n\nBitte teile den Antrag auf.`);
                return;
            }
            if (alreadyRepDates.length > 0) {
                alert(`${vName} vertritt an folgenden Tagen bereits jemanden: ${alreadyRepDates.map(formatDate).join(', ')}.\n\nBitte wähle einen anderen Vertreter.`);
                return;
            }
        }

        // 2. Check if Requester is currently acting as a representative
        const iAmRepDates = [];
        for (const d of dates) {
            const iAmRep = requests.find(r => r.vertreterId === formData.employeeId && r.dates.includes(d) && r.status !== 'rejected');
            if (iAmRep) {
                iAmRepDates.push(d);
            }
        }
        if (iAmRepDates.length > 0) {
            alert(`Achtung: Du bist an folgenden Tagen bereits als Vertreter eingetragen/angefragt: ${iAmRepDates.map(formatDate).join(', ')}.\n\nBitte lehne diese Vertretungen erst ab oder wähle einen anderen Zeitraum.`);
            return;
        }
    }


    // Always create a request object
    const request = {
      id: 'req_' + Date.now(),
      empId: formData.employeeId,
      type: formData.type,
      text: formData.remarks,
      vertreter: formData.vertreter,
      vertreterId: formData.vertreterId,
      dates: dates,
      status: isDirect ? 'approved' : (formData.vertreterId ? 'pending_vertreter' : 'pending_admin'),
      createdAt: new Date().toISOString().split('T')[0],
      stamps: {
        submitted: {
          at: new Date().toISOString(),
          uid: currentUser.id,
          name: currentUser.stampAlias || currentUser.name
        }
      }
    };

    if (isDirect) {
      // Add auto-approval stamps for direct entry
      request.stamps.vertreter = {
        at: new Date().toISOString(),
        uid: currentUser.id,
        name: currentUser.stampAlias || currentUser.name,
        isAuto: true
      };
      request.stamps.admin = {
        at: new Date().toISOString(),
        uid: currentUser.id,
        name: currentUser.stampAlias || currentUser.name,
        isAuto: true
      };

    }
    
    if (onSubmitRequest) onSubmitRequest(request);
    
    onClose();
    // Reset form
    setFormData({
      startDate: '',
      endDate: '',
      type: 'U',
      vertreter: '',
      vertreterId: '',
      remarks: '',
      employeeId: currentUser?.id || ''
    });
    setVertreterSearch('');
  };



  return (
    <Modal isOpen={isOpen} onClose={onClose} title={perms.canEnterDirectly ? "Abwesenheit eintragen (Direkt)" : "Abwesenheit beantragen"}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {isAdmin && (
          <div className="form-group" style={{ marginBottom: 4, maxWidth: 320 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#000000' }}>Mitarbeiter</label>
            <select 
              name="employeeId" 
              value={formData.employeeId} 
              onChange={handleChange}
              style={{ 
                width: '100%', padding: '12px 16px', borderRadius: 14, 
                border: '2px solid rgba(0, 0, 0, 0.4)', background: 'white',
                color: '#000000', fontWeight: 500, outline: 'none', fontSize: '1rem', boxSizing: 'border-box'
              }}
            >
              {[...employees].filter(e => 
                e.id !== 'admin' && 
                e.id !== 'sekretariat' && 
                e.id !== 'assistentensprecher' &&
                !e.name?.toLowerCase().includes('administrator') &&
                !e.name?.toLowerCase().includes('assistentensprecher')
              ).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', boxSizing: 'border-box' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#000000' }}>Von</label>
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required 
                   style={{ width: '100%', padding: '10px 8px', borderRadius: 12, border: '2px solid rgba(0, 0, 0, 0.4)', background: 'white', color: '#000000', fontWeight: 500, fontSize: '0.9rem', boxSizing: 'border-box' }} />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: '#000000' }}>Bis</label>
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required 
                   style={{ width: '100%', padding: '10px 8px', borderRadius: 12, border: '2px solid rgba(0, 0, 0, 0.4)', background: 'white', color: '#000000', fontWeight: 500, fontSize: '0.9rem', boxSizing: 'border-box' }} />
          </div>
        </div>


        <div className="form-group" style={{ maxWidth: 320 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#000000' }}>Typ</label>
          <select name="type" value={formData.type} onChange={handleChange} 
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '2px solid rgba(0, 0, 0, 0.4)', background: 'white', color: '#000000', fontWeight: 500, fontSize: '1rem', boxSizing: 'border-box' }}>
            <option value="U">Urlaub (U)</option>
            <option value="D">Dienstreise (D)</option>
            <option value="F">Fortbildung (F)</option>
            <option value="S">Sonstiges (S)</option>
          </select>
        </div>

        {formData.type === 'D' && (
          <div style={{ 
            padding: '12px 16px', 
            background: 'rgba(254, 243, 199, 0.5)', 
            border: '1px solid #f59e0b', 
            borderRadius: 14,
            fontSize: '0.8rem',
            color: '#000000',
            fontWeight: 500,
            lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
          }}>
            <span style={{ display: 'block', marginBottom: 4, color: '#b45309' }}>⚠️ <strong>Hinweis</strong></span>
            Für Dienstreisen ist zusätzlich ein gesonderter Antrag an die Verwaltung zu stellen.
          </div>
        )}

        <div className="form-group" style={{ position: 'relative', maxWidth: 320 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#000000' }}>
            Vertreter {isVertreterRequired ? '(Pflicht)' : '(Optional)'}
          </label>
          <input 
            type="text"
            value={vertreterSearch} 
            onChange={(e) => {
              setVertreterSearch(e.target.value);
              setShowVertreterResults(true);
              if (!e.target.value) setFormData(prev => ({ ...prev, vertreter: '', vertreterId: '' }));
            }}
            onFocus={() => setShowVertreterResults(true)}
            placeholder="Kollegen suchen..."
            required={isVertreterRequired}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '2px solid rgba(0, 0, 0, 0.4)', background: 'white', color: '#000000', fontWeight: 500, fontSize: '1rem', boxSizing: 'border-box' }} 
          />
          {showVertreterResults && vertreterSearch.length > 0 && (
            <div className="glass" style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, 
              background: 'rgba(255, 255, 255, 0.95)', border: '1px solid var(--glass-border)', borderRadius: 12,
              maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              {vertreterCandidates.map(emp => (
                <div 
                  key={emp.id} 
                  onClick={() => handleVertreterSelect(emp)}
                  style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  {emp.name}
                </div>
              ))}
              {vertreterCandidates.length === 0 && (
                <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.85rem' }}>Keine Treffer</div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#000000' }}>Bemerkungen</label>
          <textarea name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Optional..."
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid rgba(0, 0, 0, 0.4)', background: 'white', color: '#000000', fontWeight: 500, minHeight: 80, fontSize: '1rem', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.2)', background: '#f1f5f9', color: '#000000', fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer' }}>Abbrechen</button>
          <button type="submit" style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            {perms.canEnterDirectly ? 'Direkt Speichern' : 'Antrag stellen'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AbsenceModal;
