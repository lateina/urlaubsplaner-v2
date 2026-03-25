import React from 'react';

const TimeNavigation = ({ days, onScrollToCol, activeMonthKey, onNavigate }) => {
  // Extract unique years and their first column index
  const years = [];
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  days.forEach((day, index) => {
    // Collect Years
    const year = day.year;
    if (!years.find(y => y.year === year)) {
      years.push({ year, index });
    }
    // Collect Months (for current year)
    const monthKey = `${year}-${day.month}`;
    if (!months.find(m => m.key === monthKey)) {
      months.push({ key: monthKey, name: monthNames[day.month], index, year });
    }
  });

  const activeYear = activeMonthKey?.split('-')[0];
  const filteredMonths = months.filter(m => String(m.year) === activeYear);

  return (
    <div style={{ background: 'white', borderBottom: '1px solid var(--border)' }}>
      {/* Year Row */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
        {years.map(y => {
          const isActive = String(y.year) === activeYear;
          return (
            <button 
              key={y.year} 
              onClick={() => {
                const currentMonth = parseInt(activeMonthKey?.split('-')[1] || '0');
                const targetIndex = days.findIndex(d => d.year === y.year && d.month === currentMonth);
                if (targetIndex !== -1) onScrollToCol(targetIndex);
              }}
              className="nav-item"
              style={{ 
                padding: '4px 12px', 
                background: isActive ? 'var(--primary)' : 'var(--bg-main)', 
                color: isActive ? 'white' : 'var(--text-main)',
                border: 'none', 
                borderRadius: '6px', 
                fontSize: '0.75rem', 
                fontWeight: 700 
              }}
            >
              {y.year}
            </button>
          );
        })}

        {/* Heritage Arrows */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: '24px', alignItems: 'center' }}>
          <button 
            onClick={() => onNavigate(-1)}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center'
            }}
            title="Zurück / Nach links"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12H4M10 18l-6-6 6-6"/>
            </svg>
          </button>
          <button 
            onClick={() => onNavigate(1)}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center'
            }}
            title="Vor / Nach rechts"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16M14 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Month Row */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px 20px', overflowX: 'auto' }}>
        {filteredMonths.map(m => {
          const isActive = m.key === activeMonthKey;
          return (
            <button 
              key={m.key} 
              onClick={() => onScrollToCol(m.index)}
              className="nav-item"
              style={{ 
                padding: '4px 10px', 
                background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent', 
                border: '1px solid transparent', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 400
              }}
            >
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeNavigation;
