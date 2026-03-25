import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import { generateICalBlob, downloadBlob } from '../../utils/icalUtils';
import { Calendar, Users, Download, CheckSquare, Square } from 'lucide-react';

const ICalExportModal = ({ isOpen, onClose, absences, employees }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Default date range: current year
  useEffect(() => {
    const year = new Date().getFullYear();
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
    
    // Default: all active employees
    setSelectedIds(employees.filter(e => e.active !== false).map(e => e.id));
  }, [isOpen, employees]);

  if (!isOpen) return null;

  const handleToggleAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map(e => e.id));
    }
  };

  const handleToggleEmp = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (!startDate || !endDate || startDate > endDate) {
      alert('Bitte einen gültigen Zeitraum auswählen.');
      return;
    }
    if (selectedIds.length === 0) {
      alert('Bitte mindestens einen Mitarbeiter auswählen.');
      return;
    }

    const blob = generateICalBlob(absences, employees, startDate, endDate, selectedIds);
    if (!blob) {
      alert('Keine genehmigten Abwesenheiten im gewählten Zeitraum gefunden.');
      return;
    }

    downloadBlob(blob, `export_${startDate}_bis_${endDate}.ics`);
    onClose();
  };

  // Sort employees by last name for better usability, excluding admin roles
  const sortedEmployees = employees
    .filter(emp => 
      emp.id !== 'admin' && 
      emp.id !== 'sekretariat' && 
      emp.id !== 'assistentensprecher' &&
      !emp.name?.toLowerCase().includes('administrator') &&
      !emp.name?.toLowerCase().includes('assistentensprecher')
    )
    .sort((a, b) => {
      const lastA = (a.name || '').split(' ').pop();
      const lastB = (b.name || '').split(' ').pop();
      return lastA.localeCompare(lastB, 'de');
    });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="iCal Kalenderexport">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Date Range Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, marginBottom: 6, color: '#000000' }}>
              Export von
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ 
                width: '100%', padding: '12px 10px', borderRadius: '12px', 
                border: '1px solid rgba(0, 0, 0, 0.4)', background: 'white',
                color: '#000000', fontWeight: 800, outline: 'none',
                boxSizing: 'border-box', fontSize: '0.9rem'
              }} 
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, marginBottom: 6, color: '#000000' }}>
              Bis
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ 
                width: '100%', padding: '12px 10px', borderRadius: '12px', 
                border: '1px solid rgba(0, 0, 0, 0.4)', background: 'white',
                color: '#000000', fontWeight: 800, outline: 'none',
                boxSizing: 'border-box', fontSize: '0.9rem'
              }} 
            />
          </div>
        </div>

        {/* Employee Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 900, color: '#000000' }}>
              Mitarbeiter auswählen
            </label>
            <button 
              onClick={handleToggleAll}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              {selectedIds.length === employees.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
          </div>
          
          <div className="glass" style={{ 
            maxHeight: '220px', overflowY: 'auto', padding: '8px', 
            borderRadius: '16px', background: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid var(--glass-border)'
          }}>
            {sortedEmployees.map(emp => (
              <div 
                key={emp.id}
                onClick={() => handleToggleEmp(emp.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                  cursor: 'pointer', borderRadius: '10px', transition: 'background 0.2s',
                  background: selectedIds.includes(emp.id) ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
                }}
              >
                {selectedIds.includes(emp.id) ? (
                  <CheckSquare size={18} color="var(--primary)" />
                ) : (
                  <Square size={18} color="#94a3b8" />
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: selectedIds.includes(emp.id) ? 700 : 500, color: '#0f172a' }}>
                  {emp.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleExport}
          style={{ 
            marginTop: '8px', width: '100%', padding: '16px', borderRadius: '14px', 
            border: 'none', background: 'var(--primary)', color: 'white', 
            fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Download size={20} />
          <span>.ics Datei exportieren</span>
        </button>
      </div>
    </Modal>
  );
};

export default ICalExportModal;
