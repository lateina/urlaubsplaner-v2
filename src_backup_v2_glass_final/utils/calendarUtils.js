/**
 * Ported Bavarian holiday calculation and hardcoded holiday/congress data
 */

export const getBavarianHolidays = (year) => {
  const getEaster = (year) => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };
  const easter = getEaster(year);
  const add = (d, n) => { 
    let r = new Date(d); 
    r.setDate(r.getDate() + n); 
    return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`; 
  };
  
  return {
    [`${year}-01-01`]: 'Neujahr', 
    [`${year}-01-06`]: 'Hl. 3 Könige', 
    [`${year}-05-01`]: 'Tag der Arbeit', 
    [`${year}-08-15`]: 'Mariä Himmelfahrt', 
    [`${year}-10-03`]: 'Tag d. dt. Einheit', 
    [`${year}-11-01`]: 'Allerheiligen', 
    [`${year}-12-25`]: '1. Weihnachtstag', 
    [`${year}-12-26`]: '2. Weihnachtstag',
    [add(easter, -2)]: 'Karfreitag', 
    [add(easter, 1)]: 'Ostermontag', 
    [add(easter, 39)]: 'Christi Himmelfahrt', 
    [add(easter, 50)]: 'Pfingstmontag', 
    [add(easter, 60)]: 'Fronleichnam'
  };
};

export const SCHOOL_HOLIDAYS = [
  { start: '2026-01-01', end: '2026-01-05', name: 'Weihnachtsferien' }, 
  { start: '2026-02-16', end: '2026-02-20', name: 'Winterferien' }, 
  { start: '2026-03-30', end: '2026-04-10', name: 'Osterferien' }, 
  { start: '2026-05-26', end: '2026-06-05', name: 'Pfingstferien' }, 
  { start: '2026-08-03', end: '2026-09-14', name: 'Sommerferien' }, 
  { start: '2026-11-02', end: '2026-11-06', name: 'Herbstferien' }, 
  { start: '2026-12-24', end: '2027-01-08', name: 'Weihnachtsferien' }, 
  { start: '2027-02-08', end: '2027-02-12', name: 'Winterferien' }, 
  { start: '2027-03-22', end: '2027-04-02', name: 'Osterferien' }, 
  { start: '2027-05-18', end: '2027-05-28', name: 'Pfingstferien' }, 
  { start: '2027-08-02', end: '2027-09-13', name: 'Sommerferien' }, 
  { start: '2027-11-02', end: '2027-11-05', name: 'Herbstferien' }, 
  { start: '2027-12-24', end: '2028-01-07', name: 'Weihnachtsferien' }
];

export const CONGRESSES = [
  { start: '2026-04-08', end: '2026-04-11', name: '92. Jahrestagung der DGK' },
  { start: '2027-03-31', end: '2027-04-03', name: '93. Jahrestagung der DGK' },
  { start: '2026-09-24', end: '2026-09-26', name: 'DGK Herztage' },
  { start: '2026-08-28', end: '2026-08-31', name: 'ESC Kongress' },
  { start: '2027-08-27', end: '2027-08-30', name: 'ESC Kongress' }
];

export const getSpecialDayInfo = (dateStr) => {
  const year = parseInt(dateStr.split('-')[0]);
  const holidays = getBavarianHolidays(year);
  
  const holiday = holidays[dateStr];
  const ferien = SCHOOL_HOLIDAYS.find(h => dateStr >= h.start && dateStr <= h.end);
  const congress = CONGRESSES.find(c => dateStr >= c.start && dateStr <= c.end);
  
  return {
    holiday,
    ferienName: ferien ? ferien.name : null,
    congressName: congress ? congress.name : null,
  };
};
