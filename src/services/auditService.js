import { collection, addDoc, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../config/firebase';

const AUDIT_COLL = 'up_audit_log';

export const AUDIT_ACTIONS = {
  REQUEST_SUBMIT: 'REQUEST_SUBMIT',
  REQUEST_APPROVE: 'REQUEST_APPROVE',
  REQUEST_REJECT: 'REQUEST_REJECT',
  REQUEST_EDIT: 'REQUEST_EDIT',
  REPRESENTATIVE_CHANGE: 'REPRESENTATIVE_CHANGE',
  CALENDAR_ABSENCE_SAVE: 'CALENDAR_ABSENCE_SAVE',
  CALENDAR_ABSENCE_DELETE: 'CALENDAR_ABSENCE_DELETE',
  UNDO_REVERT: 'UNDO_REVERT'
};

export const auditService = {
  /**
   * Writes an immutable audit entry to up_audit_log
   */
  async logEvent({ actor, action, actionLabel, target, details = {} }) {
    try {
      const now = new Date();
      const entry = {
        createdAt: now.toISOString(),
        timestamp: now.getTime(),
        actor: {
          uid: actor?.uid || actor?.id || 'unknown',
          name: actor?.name || 'Unbekannt',
          role: actor?.role || 'Mitarbeiter',
          planerType: actor?.planerType || 'all'
        },
        action: action || 'UNKNOWN_ACTION',
        actionLabel: actionLabel || action || 'Aktion durchgeführt',
        target: {
          empId: target?.empId || target?.id || '',
          empName: target?.empName || target?.name || '',
          dates: Array.isArray(target?.dates) ? target.dates : [],
          period: target?.period || ''
        },
        details: JSON.parse(JSON.stringify(details || {}))
      };

      await addDoc(collection(db, AUDIT_COLL), entry);
      return entry;
    } catch (error) {
      console.error('[AuditService] Failed to write audit log:', error);
      // Non-blocking: we log to console but don't crash app flow
      return null;
    }
  },

  /**
   * Fetches recent audit logs with optional filters
   */
  async fetchLogs(options = {}) {
    const { max = 200 } = options;
    try {
      // In Firestore, ordering by createdAt descending requires minimal indexing
      const q = query(
        collection(db, AUDIT_COLL),
        orderBy('createdAt', 'desc'),
        firestoreLimit(max)
      );
      const snapshot = await getDocs(q);
      const logs = [];
      snapshot.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      return logs;
    } catch (error) {
      console.warn('[AuditService] Query with orderBy failed, attempting fallback query:', error);
      // Fallback: fetch without orderBy in case index is not built yet, then sort in memory
      try {
        const fallbackSnap = await getDocs(collection(db, AUDIT_COLL));
        const logs = [];
        fallbackSnap.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() });
        });
        return logs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, max);
      } catch (fallbackErr) {
        console.error('[AuditService] Fallback fetch failed:', fallbackErr);
        return [];
      }
    }
  },

  /**
   * Exports an array of audit logs to CSV string (with UTF-8 BOM for Excel)
   */
  exportToCSV(logs) {
    if (!logs || logs.length === 0) return '';
    const headers = [
      'Zeitpunkt',
      'Aktion',
      'Benutzer',
      'Rolle',
      'Betroffener Mitarbeiter',
      'Zeitraum',
      'Details'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map(log => {
      const dateFormatted = log.createdAt ? new Date(log.createdAt).toLocaleString('de-DE') : '';
      const actorInfo = `${log.actor?.name || log.actor?.uid || ''}`;
      const targetEmp = log.target?.empName || log.target?.empId || '';
      const period = log.target?.period || (log.target?.dates ? log.target.dates.join(', ') : '');
      const detailsSummary = Object.entries(log.details || {})
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('; ');

      return [
        escapeCSV(dateFormatted),
        escapeCSV(log.actionLabel || log.action),
        escapeCSV(actorInfo),
        escapeCSV(log.actor?.role || ''),
        escapeCSV(targetEmp),
        escapeCSV(period),
        escapeCSV(detailsSummary)
      ].join(';');
    });

    // \uFEFF is UTF-8 Byte Order Mark for Excel compatibility
    return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  }
};
