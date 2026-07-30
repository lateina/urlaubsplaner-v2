import React, { useState, useEffect, useRef } from 'react';
import { Trash2, UserPlus, Save, AlertTriangle, Search, ChevronRight, Download } from 'lucide-react';

const EmployeeAdmin = ({ employees, skills, onSave, perms = {}, vacationStats = {}, planerType = 'oa' }) => {
  const [editingEmployees, setEditingEmployees] = useState(employees);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [search, setSearch] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [importQueue, setImportQueue] = useState([]);
  const [currentImport, setCurrentImport] = useState(null);

  const handleStartImport = async () => {
    setIsImporting(true);
    try {
      const { firestoreService } = await import('../../services/firestoreService');
      const planerEmployees = await firestoreService.loadPlanerEmployees();
      
      const today = new Date();
      // Only set time to 00:00:00 for accurate date comparison
      today.setHours(0, 0, 0, 0);
      
      const sixMonthsFromNow = new Date(today);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      const newEmployees = planerEmployees.filter(pe => {
        // Bereits importiert?
        if (editingEmployees.some(e => e.id === pe.mitarbeiter_id)) return false;
        
        // Hat Enddatum in der Vergangenheit?
        if (pe.enddatum) {
          const end = new Date(pe.enddatum);
          end.setHours(0, 0, 0, 0);
          if (end < today) return false;
        }
        
        // Liegt Startdatum mehr als 6 Monate in der Zukunft?
        if (pe.startdatum) {
          const start = new Date(pe.startdatum);
          start.setHours(0, 0, 0, 0);
          if (start > sixMonthsFromNow) return false;
        }
        
        return true;
      });
      
      if (newEmployees.length === 0) {
        alert('Alle Mitarbeiter aus Planer570 sind bereits importiert.');
        setIsImporting(false);
        return;
      }
      
      setImportQueue(newEmployees);
      setCurrentImport(newEmployees[0]);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Laden der Planer570 Mitarbeiter.');
      setIsImporting(false);
    }
  };

  const handleNextImport = (role) => {
    if (currentImport) {
      if (role) { // Wenn nicht übersprungen
        let newGroups = [];
        let newRole = 'User';
        
        if (role === 'FOA') {
          newRole = 'Oberarzt';
          newGroups.push('skill_funktionsoberarzt');
        } else if (role === 'OA') {
          newRole = 'Oberarzt';
        }

        const newEmp = {
          id: currentImport.mitarbeiter_id,
          name: currentImport.mitarbeiter_name,
          email: '',
          pin: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          groups: newGroups,
          active: true,
          role: newRole,
          entryDate: currentImport.startdatum || '',
          exitDate: currentImport.enddatum || ''
        };
        
        setEditingEmployees(prev => [...prev, newEmp]);
      }
      
      const nextIndex = importQueue.findIndex(e => e.mitarbeiter_id === currentImport.mitarbeiter_id) + 1;
      if (nextIndex < importQueue.length) {
        setCurrentImport(importQueue[nextIndex]);
      } else {
        setCurrentImport(null);
        setImportQueue([]);
        setIsImporting(false);
        alert('Import abgeschlossen! Bitte denken Sie daran, am Ende "Speichern" zu klicken.');
      }
    }
  };


  const handleAddField = (id, field, value) => {
    setEditingEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  const handleToggleGroup = (id, group) => {
    setEditingEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const currentGroups = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
      const newGroups = currentGroups.includes(group)
        ? currentGroups.filter(g => g !== group)
        : [...currentGroups, group];
      return { ...emp, groups: newGroups, group: undefined };
    }));
  };

  const handleAddEmployee = () => {
    const maxId = editingEmployees.reduce((max, e) => { 
      if (e.id.startsWith('emp_')) { 
        const num = parseInt(e.id.replace('emp_', ''), 10); 
        return !isNaN(num) && num > max ? num : max; 
      } 
      return max; 
    }, 0);
    
    const newId = `emp_${String(maxId + 1).padStart(5, '0')}`;
    const newEmp = {
      id: newId,
      name: 'Neuer Mitarbeiter',
      email: '',
      pin: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
      groups: [],
      active: true,
      role: 'User',
      entryDate: '',
      exitDate: ''
    };
    setEditingEmployees([...editingEmployees, newEmp]);
    setSelectedEmpId(newId);
  };

  const handleDeleteEmployee = (id) => {
    if (confirm('Mitarbeiter wirklich löschen?')) {
      setEditingEmployees(prev => prev.map(e => e.id === id ? { ...e, active: false, _deleted: true } : e));
      if (selectedEmpId === id) setSelectedEmpId(null);
    }
  };

  const getSortName = (n) => {
    if (!n) return '';
    let clean = n.replace(/^Dr\.\s+/i, ''); 
    if (clean.includes(',')) return clean; 
    const parts = clean.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : clean;
  };

  const visibleEmployees = editingEmployees
    .filter(e => {
      if (e._deleted) return false;
      
      const isSpecial = e.id === 'admin' || e.id === 'sekretariat';
      const isFOA = Array.isArray(e.groups) && e.groups.includes('skill_funktionsoberarzt');

      // In the Assistant (AA) Planer, hide OA's and Special Accounts to keep it clean
      if (planerType === 'ass') {
        if (e.role === 'Oberarzt' && !isFOA) return false;
        if (isSpecial) return false;
      } else {
        // In OA Planer, hide special accounts unless permitted
        if (isSpecial && !perms.canEditSpecialAccounts) return false;
      }

      if (search) {
        if (!e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const nameA = getSortName(a.name);
      const nameB = getSortName(b.name);
      return nameA.localeCompare(nameB);
    });

  const handleSaveAll = () => {
    onSave(editingEmployees.filter(e => !e._deleted));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
          if (e.target.id !== 'emp-search-input') {
            return;
          }
        }
        
        e.preventDefault();
        if (visibleEmployees.length === 0) return;
        
        const currentIndex = visibleEmployees.findIndex(emp => emp.id === selectedEmpId);
        
        if (e.key === 'ArrowDown') {
          if (currentIndex < visibleEmployees.length - 1) {
            setSelectedEmpId(visibleEmployees[currentIndex + 1].id);
          } else if (currentIndex === -1) {
            setSelectedEmpId(visibleEmployees[0].id);
          }
        } else if (e.key === 'ArrowUp') {
          if (currentIndex > 0) {
            setSelectedEmpId(visibleEmployees[currentIndex - 1].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleEmployees, selectedEmpId]);

  useEffect(() => {
    if (selectedEmpId) {
      const el = document.getElementById(`emp-item-${selectedEmpId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedEmpId]);

  const selectedEmp = editingEmployees.find(e => e.id === selectedEmpId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px', marginBottom: '100px', height: 'calc(100vh - 140px)' }}>

      {/* Import Modal */}
      {currentImport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Mitarbeiter importieren</h3>
            <p>Möchten Sie <strong>{currentImport.mitarbeiter_name}</strong> in den Urlaubsplaner übernehmen?</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Qualifikation (Planer570): {currentImport.qualifikation || '-'}</p>
            
            <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="importRole" value="AA" defaultChecked={!(currentImport.qualifikation || '').toLowerCase().includes('oberarzt') && !(currentImport.qualifikation || '').toLowerCase().includes('oa')} />
                Assistenzarzt / User
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="importRole" value="OA" defaultChecked={(currentImport.qualifikation || '').toLowerCase().includes('oberarzt') && !(currentImport.qualifikation || '').toLowerCase().includes('funktions')} />
                Oberarzt
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="importRole" value="FOA" defaultChecked={(currentImport.qualifikation || '').toLowerCase().includes('funktionsoberarzt')} />
                Funktionsoberarzt (erscheint in beiden Planern)
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => handleNextImport(null)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Überspringen
              </button>
              <button 
                onClick={() => {
                  const role = document.querySelector('input[name="importRole"]:checked').value;
                  handleNextImport(role);
                }}
                style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Importieren
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass" style={{ 
        background: 'rgba(255, 255, 255, 0.45)', 
        borderRadius: '24px', 
        border: '1px solid var(--glass-border)', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.3)', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Mitarbeiter verwalten</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleSaveAll}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
                background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Save size={16} /> Speichern
            </button>
          </div>
        </div>
      
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar - Employee List */}
          <div style={{ 
            width: '300px', 
            borderRight: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(241, 245, 249, 0.5)'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  id="emp-search-input"
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mitarbeiter suchen..."
                  style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleAddEmployee}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', 
                    background: 'white', border: '1px solid var(--border)', borderRadius: '6px',
                    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', flex: 1
                  }}
                >
                  <UserPlus size={16} /> Neuer
                </button>
                <button 
                  onClick={handleStartImport}
                  disabled={isImporting}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', 
                    background: 'white', border: '1px solid var(--border)', borderRadius: '6px',
                    fontSize: '0.85rem', fontWeight: 600, cursor: isImporting ? 'not-allowed' : 'pointer', flex: 1,
                    opacity: isImporting ? 0.6 : 1
                  }}
                >
                  <Download size={16} /> Import
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {visibleEmployees.map(emp => {
                const isSelected = selectedEmpId === emp.id;
                return (
                  <div 
                    key={emp.id}
                    id={`emp-item-${emp.id}`}
                    onClick={() => setSelectedEmpId(emp.id)}
                    style={{ 
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? 'white' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                      opacity: emp.active === false ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.name || '(Ohne Namen)'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.id}</span>
                    </div>
                    {isSelected && <ChevronRight size={16} color="var(--primary)" />}
                  </div>
                );
              })}
              {visibleEmployees.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                  Keine Mitarbeiter gefunden.
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'white' }}>
            {selectedEmp ? (
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Check warnings for selected employee */}
                {(() => {
                  const today = new Date();
                  const isMidYear = today.getMonth() >= 6;
                  const stats = vacationStats[selectedEmp.id] || { total: 0, quota: 30 };
                  const lowUsage = (stats.total || 0) < ((stats.quota || 30) / 2);
                  const showWarning = isMidYear && lowUsage && selectedEmp.active !== false && selectedEmp.id !== 'admin' && selectedEmp.id !== 'sekretariat';
                  
                  if (showWarning) {
                    return (
                      <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#854d0e' }}>
                        <AlertTriangle size={20} />
                        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                          Warnung: Weniger als 50% des Jahresurlaubs verplant ({stats.total} von {stats.quota} Tagen).
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Mitarbeiter Details</h2>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 12px', background: selectedEmp.active !== false ? '#ecfdf5' : '#fef2f2', border: `1px solid ${selectedEmp.active !== false ? '#a7f3d0' : '#fecaca'}`, borderRadius: '20px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedEmp.active !== false}
                      onChange={(e) => handleAddField(selectedEmp.id, 'active', e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: selectedEmp.active !== false ? '#059669' : '#dc2626' }}>
                      {selectedEmp.active !== false ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  {/* Base Info Group */}
                  <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Basisdaten</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Name</label>
                        <input 
                          type="text" 
                          value={selectedEmp.name} 
                          onChange={(e) => handleAddField(selectedEmp.id, 'name', e.target.value)}
                          style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>System ID</label>
                        <input 
                          type="text" 
                          value={selectedEmp.id} 
                          onChange={(e) => handleAddField(selectedEmp.id, 'id', e.target.value)}
                          readOnly={selectedEmp.id === 'admin' || selectedEmp.id === 'sekretariat'}
                          style={{ padding: '10px 12px', border: '1px solid transparent', borderRadius: '8px', fontSize: '0.95rem', background: (selectedEmp.id === 'admin' || selectedEmp.id === 'sekretariat') ? '#e2e8f0' : 'white', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Email</label>
                        <input 
                          type="email" 
                          value={selectedEmp.email || ''} 
                          onChange={(e) => handleAddField(selectedEmp.id, 'email', e.target.value)}
                          style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Signatur (Alias)</label>
                        <input 
                          type="text" 
                          value={selectedEmp.stampAlias || ''} 
                          onChange={(e) => handleAddField(selectedEmp.id, 'stampAlias', e.target.value)}
                          style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates & Security Group */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Zugehörigkeit</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Eintrittsdatum</label>
                          <input 
                            type="date" 
                            value={selectedEmp.entryDate || ''} 
                            onChange={(e) => handleAddField(selectedEmp.id, 'entryDate', e.target.value)}
                            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Austrittsdatum</label>
                          <input 
                            type="date" 
                            value={selectedEmp.exitDate || ''} 
                            onChange={(e) => handleAddField(selectedEmp.id, 'exitDate', e.target.value)}
                            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Sicherheit</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>PIN-Code</label>
                        <input 
                          type="text" 
                          value={selectedEmp.pin || ''} 
                          onChange={(e) => handleAddField(selectedEmp.id, 'pin', e.target.value)}
                          style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.95rem', maxWidth: '150px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skills/Groups Group */}
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase' }}>Bereiche & Gruppen</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {skills.map(skill => {
                        const skillId = typeof skill === 'object' ? skill.id : skill;
                        const skillName = typeof skill === 'object' ? skill.name : skill;
                        const isAssigned = (Array.isArray(selectedEmp.groups) ? selectedEmp.groups.includes(skillId) : selectedEmp.group === skillId);
                        return (
                          <label 
                            key={skillId}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                              background: isAssigned ? 'var(--primary)' : 'white',
                              border: `1px solid ${isAssigned ? 'var(--primary)' : 'var(--border)'}`,
                              borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer',
                              color: isAssigned ? 'white' : '#475569',
                              transition: 'all 0.2s',
                              fontWeight: isAssigned ? 600 : 400
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isAssigned}
                              onChange={() => handleToggleGroup(selectedEmp.id, skillId)}
                              style={{ display: 'none' }}
                            />
                            {skillName}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Footer Actions */}
                {selectedEmp.id !== 'admin' && (
                  <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => handleDeleteEmployee(selectedEmp.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
                        background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px',
                        fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={18} /> Mitarbeiter Löschen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <UserPlus size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Kein Mitarbeiter ausgewählt</h3>
                <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Bitte wählen Sie links einen Mitarbeiter aus oder erstellen Sie einen neuen.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAdmin;
