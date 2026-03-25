import React, { useState } from 'react';

const BulkImport = ({ isOpen, employees }) => {
  if (!isOpen) return null;

  return (
    <div className="glass" style={{
      background: 'rgba(255, 255, 255, 0.25)',
      padding: '24px',
      margin: '12px 20px 20px 20px',
      borderRadius: '24px',
      border: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(32px)'
    }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Format:</label>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            TT.MM.YY [bis TT.MM.YY] Art [Vertreter: Name]
          </div>
          <textarea 
            placeholder="z.B.: 01.01.26 bis 05.01.26 Urlaub Vertreter: Max Mustermann"
            style={{ 
              width: '100%', minHeight: '80px', padding: '14px 16px', 
              borderRadius: '14px', border: '1px solid var(--glass-border)', 
              fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.15)',
              color: '#0f172a'
            }} 
          />
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Import für:</label>
          <select style={{ 
            width: '100%', padding: '12px 14px', borderRadius: '14px', 
            border: '1px solid var(--glass-border)', 
            background: 'rgba(255, 255, 255, 0.15)', color: '#0f172a'
          }}>
            <option>Mitarbeiter wählen...</option>
            {employees.map(emp => <option key={emp.id}>{emp.name}</option>)}
          </select>
          <button 
            style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}
            onClick={() => alert('Bulk Import Simulation gestartet...')}
          >
            Importieren
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
