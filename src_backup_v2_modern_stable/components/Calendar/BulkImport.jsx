import React, { useState } from 'react';

const BulkImport = ({ isOpen, employees }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      margin: '0 20px 20px 20px',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Format:</label>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            TT.MM.YY [bis TT.MM.YY] Art [Vertreter: Name]
          </div>
          <textarea 
            placeholder="z.B.: 01.01.26 bis 05.01.26 Urlaub Vertreter: Max Mustermann"
            style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }} 
          />
        </div>
        <div style={{ width: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Import für:</label>
          <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <option>Mitarbeiter wählen...</option>
            {employees.map(emp => <option key={emp.id}>{emp.name}</option>)}
          </select>
          <button 
            style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700 }}
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
