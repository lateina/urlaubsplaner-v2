import React, { useState, useEffect, useMemo } from 'react';
import { History, Download, RefreshCw, Search, Filter, ShieldCheck, User, Calendar as CalendarIcon, ArrowRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { auditService, AUDIT_ACTIONS } from '../../services/auditService';

const ACTION_COLORS = {
  [AUDIT_ACTIONS.REQUEST_APPROVE]: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'Genehmigt' },
  [AUDIT_ACTIONS.REQUEST_REJECT]: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: 'Abgelehnt' },
  [AUDIT_ACTIONS.REQUEST_SUBMIT]: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Eingereicht' },
  [AUDIT_ACTIONS.REPRESENTATIVE_CHANGE]: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', label: 'Vertreter geändert' },
  [AUDIT_ACTIONS.UNDO_REVERT]: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', label: 'Rückgängig (Undo)' },
  [AUDIT_ACTIONS.CALENDAR_ABSENCE_SAVE]: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: 'Kalender: Gespeichert' },
  [AUDIT_ACTIONS.CALENDAR_ABSENCE_DELETE]: { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa', label: 'Kalender: Gelöscht' }
};

const AuditTrailView = ({ employees = [], planerType = 'all' }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedDays, setSelectedDays] = useState('30'); // '7', '30', '90', 'ALL'

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.fetchLogs({ max: 300 });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by days
    if (selectedDays !== 'ALL') {
      const days = parseInt(selectedDays, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(log => {
        if (!log.createdAt) return true;
        return new Date(log.createdAt) >= cutoff;
      });
    }

    // Filter by action
    if (selectedAction !== 'ALL') {
      result = result.filter(log => log.action === selectedAction);
    }

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(log => {
        const actorName = log.actor?.name?.toLowerCase() || '';
        const targetName = log.target?.empName?.toLowerCase() || '';
        const actionLabel = log.actionLabel?.toLowerCase() || '';
        const period = log.target?.period?.toLowerCase() || '';
        const detailsStr = JSON.stringify(log.details || {}).toLowerCase();
        return (
          actorName.includes(q) ||
          targetName.includes(q) ||
          actionLabel.includes(q) ||
          period.includes(q) ||
          detailsStr.includes(q)
        );
      });
    }

    return result;
  }, [logs, selectedDays, selectedAction, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = auditService.exportToCSV(filteredLogs);
    if (!csvContent) {
      alert('Keine Protokolleinträge zum Exportieren vorhanden.');
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Audit_Trail_Urlaubsplaner_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <History size={24} style={{ color: '#475569' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                Revisionssicherer Audit Trail
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                <ShieldCheck size={14} />
                <span>Append-Only Protokoll (Manipulationssicher in Firestore)</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadLogs}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#475569'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Aktualisieren
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <Download size={14} />
            CSV Export
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Suchen nach Mitarbeiter, Admin, Aktion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} style={{ color: '#64748b' }} />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: 'white',
              color: '#334155'
            }}
          >
            <option value="ALL">Alle Aktionen</option>
            <option value={AUDIT_ACTIONS.REQUEST_APPROVE}>Genehmigt</option>
            <option value={AUDIT_ACTIONS.REQUEST_REJECT}>Abgelehnt</option>
            <option value={AUDIT_ACTIONS.REQUEST_SUBMIT}>Eingereicht</option>
            <option value={AUDIT_ACTIONS.REPRESENTATIVE_CHANGE}>Vertreter geändert</option>
            <option value={AUDIT_ACTIONS.CALENDAR_ABSENCE_SAVE}>Kalender: Gespeichert</option>
            <option value={AUDIT_ACTIONS.CALENDAR_ABSENCE_DELETE}>Kalender: Gelöscht</option>
            <option value={AUDIT_ACTIONS.UNDO_REVERT}>Undo (Rückgängig)</option>
          </select>

          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              background: 'white',
              color: '#334155'
            }}
          >
            <option value="7">Letzte 7 Tage</option>
            <option value="30">Letzte 30 Tage</option>
            <option value="90">Letzte 90 Tage</option>
            <option value="ALL">Gesamter Zeitraum</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
          {filteredLogs.length} Einträge
        </div>
      </div>

      {/* Log list */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#2563eb' }} />
            <span>Lade Protokolldaten aus Firestore...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <History size={40} style={{ margin: '0 auto 12px auto', display: 'block', color: '#cbd5e1' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#475569' }}>Keine Protokolleinträge gefunden</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              {searchTerm || selectedAction !== 'ALL' || selectedDays !== 'ALL'
                ? 'Passen Sie die Filter an, um Einträge zu sehen.'
                : 'Bisher wurden noch keine protokollierten Aktionen erfasst.'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px', width: '150px' }}>Zeitpunkt</th>
                <th style={{ padding: '12px 16px', width: '170px' }}>Aktion</th>
                <th style={{ padding: '12px 16px', width: '180px' }}>Benutzer (Wer)</th>
                <th style={{ padding: '12px 16px', width: '200px' }}>Betroffener</th>
                <th style={{ padding: '12px 16px' }}>Details & Begründung</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const conf = ACTION_COLORS[log.action] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: log.actionLabel || log.action };
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                    {/* Timestamp */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.8rem', verticalAlign: 'top' }}>
                      {formatDate(log.createdAt)}
                    </td>

                    {/* Action badge */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: conf.bg,
                          color: conf.text,
                          border: `1px solid ${conf.border}`
                        }}
                      >
                        {log.action === AUDIT_ACTIONS.UNDO_REVERT && <RotateCcw size={11} />}
                        {conf.label}
                      </span>
                    </td>

                    {/* Actor */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} style={{ color: '#94a3b8' }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {log.actor?.name || log.actor?.uid || 'System'}
                        </span>
                      </div>
                      {log.actor?.role && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', paddingLeft: '19px' }}>
                          {log.actor.role}
                        </div>
                      )}
                    </td>

                    {/* Target */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {log.target?.empName || log.target?.empId || '—'}
                      </div>
                      {log.target?.period && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          <CalendarIcon size={11} />
                          <span>{log.target.period}</span>
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {log.actionLabel && log.actionLabel !== conf.label && (
                        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                          {log.actionLabel}
                        </div>
                      )}

                      {/* Changed values */}
                      {log.details?.previousVertreter && log.details?.newVertreter && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', margin: '2px 0' }}>
                          <span>Vertreter:</span>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{log.details.previousVertreter}</span>
                          <ArrowRight size={11} />
                          <span style={{ fontWeight: 600, color: '#0369a1' }}>{log.details.newVertreter}</span>
                        </div>
                      )}

                      {log.details?.reason && (
                        <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '2px' }}>
                          <strong>Grund:</strong> {log.details.reason}
                        </div>
                      )}

                      {log.details?.note && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          <strong>Notiz:</strong> {log.details.note}
                        </div>
                      )}

                      {log.details?.revertedAction && (
                        <div style={{ fontSize: '0.78rem', color: '#6b21a8', marginTop: '2px' }}>
                          <strong>Wiederhergestellt:</strong> {log.details.revertedAction}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditTrailView;
