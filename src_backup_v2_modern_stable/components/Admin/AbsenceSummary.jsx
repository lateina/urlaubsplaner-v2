import React, { useMemo } from 'react';

const AbsenceSummary = ({ employees = [], absences = {}, status = {} }) => {
  console.log('AbsenceSummary Render:', { empCount: employees.length, absCount: Object.keys(absences).length });

  const formatRange = (start, end) => {
    const fmt = d => { 
      if (!d) return '';
      const parts = d.split('-');
      if (parts.length < 3) return d;
      const [y, m, day] = parts; 
      return `${day}.${m}.`; 
    };
    
    const datePart = (start.date === end.date) ? fmt(start.date) : `${fmt(start.date)} - ${fmt(end.date)}`;
    const typeMap = { 
      'U': 'Urlaub', 
      'V': 'Urlaub', 
      'D': 'Dienstreise', 
      'F': 'Fortbildung', 
      'T': 'Sonstiges', 
      'S': 'Sonstiges' 
    };
    const t = typeMap[start.val?.type] || 'Abwesend';
    return `${datePart} (${t}${start.val?.text ? `: ${start.val.text}` : ''})`;
  };

  const fullSummary = useMemo(() => {
    const list = [];
    if (!employees || employees.length === 0) return 'Keine Mitarbeiterdaten vorhanden.';

    const sortedEmployees = [...employees].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    sortedEmployees.forEach(emp => {
      if (emp.id === 'admin' || emp.id === 'sekretariat' || emp.active === false || !absences[emp.id]) return;
      
      const empAbsences = absences[emp.id];
      const entries = Object.keys(empAbsences)
        .sort()
        .map(d => ({ date: d, val: empAbsences[d] }))
        .filter(entry => entry.val && entry.val.status !== 'rejected');
      
      if (entries.length === 0) return;
      
      const ranges = []; 
      let rStart = entries[0], rEnd = entries[0];
      
      for (let i = 1; i < entries.length; i++) {
        const curr = entries[i];
        const prevDate = new Date(rEnd.date);
        prevDate.setDate(prevDate.getDate() + 1);
        const nextDayStr = prevDate.toISOString().split('T')[0];
        
        if (nextDayStr === curr.date && rEnd.val?.type === curr.val?.type && (rEnd.val?.text || '') === (curr.val?.text || '')) { 
          rEnd = curr; 
        } else { 
          ranges.push(formatRange(rStart, rEnd)); 
          rStart = curr; rEnd = curr; 
        }
      }
      ranges.push(formatRange(rStart, rEnd));
      list.push(`${emp.name}: ${ranges.join(', ')}`);
    });
    return list.length > 0 ? list.join('\n') : 'Keine Abwesenheiten gefunden.';
  }, [employees, absences]);

  const statusSummary = useMemo(() => {
    const list = [];
    if (!employees || employees.length === 0) return '';
    const sortedEmployees = [...employees].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    sortedEmployees.forEach(emp => {
      if (emp.id === 'admin' || emp.id === 'sekretariat' || emp.active === false) return;
      if (status && status[emp.id]) {
        list.push(`Mitarbeiter ${emp.name} fertig`);
      }
    });
    return list.join('\n');
  }, [employees, status]);

  if (employees.length === 0) return <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>Warte auf Mitarbeiterdaten...</div>;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '30px', 
      padding: '10px',
      background: 'white',
      minHeight: '800px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>1. Export Zusammenfassung (Absenzen)</h3>
           <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' }}>V1 Parität</span>
        </div>
        <textarea 
          readOnly 
          value={fullSummary} 
          placeholder="Generiere Zusammenfassung..."
          style={{ 
            height: '450px', 
            width: '100%', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '2px solid #e2e8f0', 
            fontFamily: '"Courier New", Courier, monospace', 
            fontSize: '0.9rem', 
            lineHeight: '1.6', 
            resize: 'vertical', 
            background: '#ffffff', 
            color: '#334155',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            outline: 'none'
          }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>2. Status Zusammenfassung (Fertigmeldungen)</h3>
        <textarea 
          readOnly 
          value={statusSummary || 'Keine Fertigmeldungen vorhanden.'} 
          style={{ 
            height: '150px', 
            width: '100%', 
            padding: '16px', 
            borderRadius: '12px', 
            border: '2px solid #e2e8f0', 
            fontFamily: '"Courier New", Courier, monospace', 
            fontSize: '0.9rem', 
            resize: 'none', 
            background: '#ffffff', 
            color: '#334155',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            outline: 'none'
          }} 
        />
      </div>
    </div>
  );
};

export default AbsenceSummary;
