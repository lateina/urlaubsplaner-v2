/**
 * Utility for generating iCalendar (.ics) files from absences.
 * Clusters consecutive days with the same employee, type, and remarks into single events.
 */

export const generateICalBlob = (absencesByEmp, employees, startDate, endDate, selectedEmpIds) => {
  const events = [];
  const typeLabels = { 'U': 'Urlaub', 'D': 'Dienstreise', 'F': 'Fortbildung', 'S': 'Sonstiges', 'V': 'V-Dienst' };
  const filterStart = new Date(startDate);
  const filterEnd = new Date(endDate);
  filterEnd.setHours(23, 59, 59, 999);

  selectedEmpIds.forEach(empId => {
    const empName = employees.find(e => e.id === empId)?.name || empId;
    const empState = absencesByEmp[empId] || {};
    const dates = Object.keys(empState)
      .filter(d => {
        const date = new Date(d);
        const status = empState[d].status;
        const isNotPending = !status || (status !== 'pending_vertreter' && status !== 'pending_admin');
        return date >= filterStart && date <= filterEnd && isNotPending;
      })
      .sort();

    if (dates.length === 0) return;

    let currentEvent = null;

    dates.forEach(dateStr => {
      const val = empState[dateStr];
      const date = new Date(dateStr);

      if (!currentEvent) {
        currentEvent = { 
          empName, 
          type: val.type, 
          text: val.text || '', 
          vertreter: val.vertreter || '', 
          start: new Date(date), 
          end: new Date(date) 
        };
      } else {
        const expectedNextDay = new Date(currentEvent.end);
        expectedNextDay.setDate(expectedNextDay.getDate() + 1);
        const expectedStr = expectedNextDay.toISOString().split('T')[0];

        if (expectedStr === dateStr && 
            currentEvent.type === val.type && 
            currentEvent.text === (val.text || '') && 
            currentEvent.vertreter === (val.vertreter || '')) {
          currentEvent.end = new Date(date);
        } else {
          events.push(currentEvent);
          currentEvent = { 
            empName, 
            type: val.type, 
            text: val.text || '', 
            vertreter: val.vertreter || '', 
            start: new Date(date), 
            end: new Date(date) 
          };
        }
      }
    });

    if (currentEvent) events.push(currentEvent);
  });

  if (events.length === 0) return null;

  const formatDateICal = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Urlaubsplaner//DE\r\nCALSCALE:GREGORIAN\r\n";

  events.forEach(ev => {
    icsContent += "BEGIN:VEVENT\r\n";
    icsContent += `UID:${ev.empName.replace(/\s+/g, '')}-${formatDateICal(ev.start)}@urlaubsplaner\r\n`;
    icsContent += `DTSTAMP:${timestamp}\r\n`;
    icsContent += `DTSTART;VALUE=DATE:${formatDateICal(ev.start)}\r\n`;
    
    const endExclusive = new Date(ev.end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    icsContent += `DTEND;VALUE=DATE:${formatDateICal(endExclusive)}\r\n`;
    
    let summary = `${typeLabels[ev.type] || 'Abwesenheit'} - ${ev.empName}`;
    if (ev.text) summary += ` (${ev.text})`;
    icsContent += `SUMMARY:${summary}\r\n`;
    
    let description = `Mitarbeiter: ${ev.empName}\\nArt: ${typeLabels[ev.type] || 'Abwesenheit'}`;
    if (ev.text) description += `\\nBeschreibung: ${ev.text}`;
    if (ev.vertreter) description += `\\nVertreter: ${ev.vertreter}`;
    icsContent += `DESCRIPTION:${description}\r\n`;
    
    icsContent += "END:VEVENT\r\n";
  });

  icsContent += "END:VCALENDAR";

  return new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
