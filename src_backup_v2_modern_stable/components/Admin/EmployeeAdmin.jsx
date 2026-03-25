import React, { useState } from 'react';
import { Trash2, UserPlus, Save } from 'lucide-react';

const EmployeeAdmin = ({ employees, skills, onSave }) => {
  const [editingEmployees, setEditingEmployees] = useState(employees);
  const [sortBy, setBy] = useState('id'); // 'id' or 'name'

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
      name: '',
      email: '',
      pin: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
      groups: [],
      active: true,
      role: 'User'
    };
    setEditingEmployees([...editingEmployees, newEmp]);
  };

  const handleDeleteEmployee = (id) => {
    if (confirm('Mitarbeiter wirklich löschen?')) {
      setEditingEmployees(prev => prev.map(e => e.id === id ? { ...e, active: false, _deleted: true } : e));
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
    .filter(e => !e._deleted && e.id !== 'admin' && e.id !== 'sekretariat')
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = getSortName(a.name);
        const nameB = getSortName(b.name);
        return nameA.localeCompare(nameB);
      }
      return a.id.localeCompare(b.id);
    });

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '100px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Mitarbeiterliste</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleAddEmployee}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
              background: 'white', border: '1px solid var(--border)', borderRadius: '6px',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <UserPlus size={16} /> Neu
          </button>
          <button 
            onClick={() => onSave(editingEmployees.filter(e => !e._deleted))}
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
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#64748b' }}>
              <th 
                onClick={() => setBy('id')}
                style={{ padding: '12px 16px', fontWeight: 700, cursor: 'pointer', background: sortBy === 'id' ? '#e2e8f0' : 'transparent' }}
              >
                ID {sortBy === 'id' && '↓'}
              </th>
              <th 
                onClick={() => setBy('name')}
                style={{ padding: '12px 16px', fontWeight: 700, cursor: 'pointer', background: sortBy === 'name' ? '#e2e8f0' : 'transparent' }}
              >
                Name {sortBy === 'name' && '↓'}
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>PIN</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Gruppen / Bereiche</th>
              <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Aktiv</th>
              <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 16px' }}>
                  <input 
                    type="text" 
                    value={emp.id} 
                    onChange={(e) => handleAddField(emp.id, 'id', e.target.value)}
                    readOnly={emp.id === 'admin'}
                    style={{ 
                      width: '80px', padding: '6px', border: '1px solid transparent', borderRadius: '4px',
                      background: emp.id === 'admin' ? '#f1f5f9' : 'transparent',
                      outline: 'none'
                    }}
                  />
                </td>
                <td style={{ padding: '8px 16px' }}>
                  <input 
                    type="text" 
                    value={emp.name} 
                    onChange={(e) => handleAddField(emp.id, 'name', e.target.value)}
                    placeholder="Name eingeben..."
                    style={{ 
                      width: '180px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}
                  />
                </td>
                <td style={{ padding: '8px 16px' }}>
                  <input 
                    type="text" 
                    value={emp.pin || ''} 
                    onChange={(e) => handleAddField(emp.id, 'pin', e.target.value)}
                    style={{ 
                      width: '60px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px',
                      fontSize: '0.85rem', textAlign: 'center'
                    }}
                  />
                </td>
                <td style={{ padding: '8px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                    {skills.map(skill => {
                      const skillId = typeof skill === 'object' ? skill.id : skill;
                      const skillName = typeof skill === 'object' ? skill.name : skill;
                      const isAssigned = (Array.isArray(emp.groups) ? emp.groups.includes(skillId) : emp.group === skillId);
                      return (
                        <label 
                          key={skillId}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px',
                            background: isAssigned ? '#eff6ff' : '#f8fafc',
                            border: `1px solid ${isAssigned ? 'var(--primary)' : '#e2e8f0'}`,
                            borderRadius: '12px', fontSize: '0.7rem', cursor: 'pointer',
                            color: isAssigned ? 'var(--primary)' : '#64748b'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isAssigned}
                            onChange={() => handleToggleGroup(emp.id, skillId)}
                            style={{ display: 'none' }}
                          />
                          {skillName}
                        </label>
                      );
                    })}
                  </div>
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={emp.active !== false}
                    onChange={(e) => handleAddField(emp.id, 'active', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                  {emp.id !== 'admin' && (
                    <button 
                      onClick={() => handleDeleteEmployee(emp.id)}
                      style={{ 
                        color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '4px', borderRadius: '4px'
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeAdmin;
