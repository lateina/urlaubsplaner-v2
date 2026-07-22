import React, { useState } from 'react';
import { Trash2, UserPlus, Save, AlertTriangle, Search, ChevronRight } from 'lucide-react';

const EmployeeAdmin = ({ employees, skills, onSave, perms = {}, vacationStats = {}, planerType = 'oa' }) => {
  const [editingEmployees, setEditingEmployees] = useState(employees);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [search, setSearch] = useState('');

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

  const selectedEmp = editingEmployees.find(e => e.id === selectedEmpId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px', marginBottom: '100px', height: 'calc(100vh - 140px)' }}>

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
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mitarbeiter suchen..."
                  style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>
              <button 
                onClick={handleAddEmployee}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 16px', 
                  background: 'white', border: '1px solid var(--border)', borderRadius: '6px',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', width: '100%'
                }}
              >
                <UserPlus size={16} /> Neuer Mitarbeiter
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {visibleEmployees.map(emp => {
                const isSelected = selectedEmpId === emp.id;
                
                // Check warnings
                const today = new Date();
                const isMidYear = today.getMonth() >= 6;
                const stats = vacationStats[emp.id] || { used: 0, quota: 30 };
                const lowUsage = (stats.used || 0) < ((stats.quota || 30) / 2);
                const showWarning = isMidYear && lowUsage && emp.active !== false && emp.id !== 'admin' && emp.id !== 'sekretariat';

                return (
                  <div 
                    key={emp.id}
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
                        {showWarning && <AlertTriangle size={14} color="#eab308" title={`Wenig Urlaub verplant (${stats.used}/${stats.quota})`} />}
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
