import { getSpecialDayInfo } from '../utils/calendarUtils';

/**
 * Generates the master list of calendar days for the grid
 * @returns {Array} List of day objects
 */
export const generateCalendarDays = () => {
  const years = [2026, 2027, 2028];
  const days = [];
  
  years.forEach(y => {
    const d = new Date(y, 0, 1);
    while (d.getFullYear() === y) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const { holiday, ferienName, congressName } = getSpecialDayInfo(dateStr);
      
      days.push({
        dateStr,
        day: d.getDate(),
        month: d.getMonth(),
        year: y,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        holiday,
        isFerien: !!ferienName,
        ferienName,
        isCongress: !!congressName,
        congressName
      });
      d.setDate(d.getDate() + 1);
    }
  });

  return days;
};

// Legacy support for testing if needed, but not used in production
export const generateMockData = () => {
  const days = generateCalendarDays();
  return { employees: [], days, absences: {} };
};
