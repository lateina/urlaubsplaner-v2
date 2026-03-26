import React, { useState } from 'react';
import { Check, X, Trash2, FileText, Clock, User, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';


const RequestsView = ({ 
  requests = [], 
  employees = [], 
  currentUser, 
  isAdmin, 
  onApprove, 
  onReject, 
  onDelete,
  onMarkPODone,
  perms = {}
}) => {
  const [filter, setFilter] = useState('open'); // 'all', 'open', 'approved', 'rejected', 'po_pending'
  const [subTab, setSubTab] = useState('meine'); // 'meine', 'vertreter', 'admin_list', 'po_transfer'

  // Initialize subTab correctly for admins
  React.useEffect(() => {
    if (isAdmin && subTab === 'meine') {
      setSubTab('admin_list');
    }
  }, [isAdmin]);

  const typeLabel = { U: 'Urlaub', D: 'Dienstreise', F: 'Fortbildung', S: 'Sonstiges' };
  const statusLabel = {
    pending_vertreter: 'Vertreter-Zustimmung ausstehend',
    pending_admin: 'Leitender OA-Freigabe ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt'
  };

  const statusColor = {
    pending_vertreter: '#f59e0b',
    pending_admin: '#6366f1',
    approved: '#10b981',
    rejected: '#ef4444'
  };

  const filteredRequests = requests.filter(r => {
    if (subTab === 'po_transfer') return r.status === 'approved' && !r.stamps?.po;
    if (filter === 'open') return r.status.startsWith('pending');
    if (filter === 'approved') return r.status === 'approved';
    if (filter === 'rejected') return r.status === 'rejected';
    return true;
  });

  const cuId = currentUser?.id;
  
  // Tab logic for non-admins
  const vertreterReqs = requests.filter(r => r.vertreterId === cuId && (r.status === 'pending_vertreter' || r.status === 'pending_admin' || r.status === 'approved'));
  const meineReqs = requests.filter(r => r.empId === cuId);
  const poPendingReqs = requests.filter(r => r.status === 'approved' && !r.stamps?.po);

  const displayRequests = isAdmin 
    ? filteredRequests.sort((a, b) => b.id.localeCompare(a.id))
    : (subTab === 'meine' ? meineReqs : vertreterReqs).sort((a, b) => b.id.localeCompare(a.id));

  const getEmpName = (id) => employees.find(e => e.id === id)?.name || id;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const formatDateRange = (dates) => {
    if (!dates || dates.length === 0) return '';
    const from = formatDate(dates[0]);
    const to = formatDate(dates[dates.length - 1]);
    return from === to ? from : `${from} bis ${to}`;
  };


  const [poShortcut, setPoShortcut] = useState(localStorage.getItem('po_shortcut') || '');

  const renderCard = (req) => {
    const isPendingVertreterForMe = req.vertreterId === cuId && req.status === 'pending_vertreter';
    const isPendingAdmin = isAdmin && req.status === 'pending_admin';
    const canApprove = isPendingVertreterForMe || isPendingAdmin;
    const showPOCheckbox = subTab === 'po_transfer' || (isAdmin && req.status === 'approved');

    return (
      <div key={req.id} className="request-card">
        <div className="request-card-header">
          <div className="request-card-user">
            <User size={16} />
            <span>{getEmpName(req.empId)}</span>
          </div>
          <span className="request-card-status" style={{ backgroundColor: `${statusColor[req.status]}15`, color: statusColor[req.status] }}>
            {statusLabel[req.status]}
          </span>
        </div>

        <div className="request-card-body">
          <div className="request-info-row">
            <CalendarIcon size={14} />
            <span>{formatDateRange(req.dates)}</span>
          </div>
          <div className="request-info-row">
            <Clock size={14} />
            <span>{typeLabel[req.type] || req.type} {req.text ? `(${req.text})` : ''}</span>
          </div>
          {req.vertreter && (
            <div className="request-info-row">
              <User size={14} />
              <span>Vertreter: {req.vertreter}</span>
            </div>
          )}
          {req.rejectionNote && (
            <div className="request-info-row rejection-note">
              <MessageSquare size={14} />
              <span>Grund: {req.rejectionNote}</span>
            </div>
          )}
          {/* All Stamps Audit Trail */}
          <div className="request-stamps-trail" style={{ gridColumn: 'span 2', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {req.stamps?.submitted && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                <span>Beantragt von {req.stamps.submitted.name} am {formatDate(req.stamps.submitted.at.split('T')[0])}</span>
              </div>
            )}
            {req.stamps?.vertreter && (
              <div style={{ fontSize: '0.75rem', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={12} />
                <span>Vertretung zugestimmt von {req.stamps.vertreter.name} am {formatDate(req.stamps.vertreter.at.split('T')[0])} {req.stamps.vertreter.isAuto ? '(Autom.)' : ''}</span>
              </div>
            )}
            {req.stamps?.admin && (
              <div style={{ fontSize: '0.75rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={12} />
                <span>Genehmigt von {req.stamps.admin.name} am {formatDate(req.stamps.admin.at.split('T')[0])} {req.stamps.admin.isAuto ? '(Autom.)' : ''}</span>
              </div>
            )}
            {req.stamps?.po && (
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Check size={12} />
                <span>In PO eingetragen von {req.stamps.po.shortcut} am {formatDate(req.stamps.po.at.split('T')[0])}</span>
              </div>
            )}
            {req.status === 'rejected' && req.stamps?.rejected && (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={12} />
                <span>Abgelehnt von {req.stamps.rejected.name} am {formatDate(req.stamps.rejected.at.split('T')[0])}</span>
              </div>
            )}
          </div>
        </div>

        <div className="request-card-actions">
          {canApprove && (
            <>
              <button 
                className="btn-approve" 
                onClick={() => onApprove(req.id, isPendingVertreterForMe ? 'vertreter' : 'admin')}
              >
                <Check size={16} />
                <span>{isPendingVertreterForMe ? 'Zustimmen' : 'Genehmigen'}</span>
              </button>
              <button 
                className="btn-reject" 
                onClick={() => {
                  const note = prompt('Grund für Ablehnung?');
                  if (note !== null) onReject(req.id, isPendingVertreterForMe ? 'vertreter' : 'admin', note);
                }}
              >
                <X size={16} />
                <span>Ablehnen</span>
              </button>
            </>
          )}
          
          {req.status === 'approved' && (
            <button 
              className="btn-pdf" 
              title="PO Karte PDF"
              onClick={() => generateAndDownloadPDF(req, employees)}
            >
              <FileText size={16} />
              <span>PDF</span>
            </button>
          )}


          {showPOCheckbox && perms.canSeePOKarte && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', padding: '0 8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>In PO?</label>
                  <input 
                    type="checkbox" 
                    checked={!!req.stamps?.po}
                    onChange={(e) => {
                        let shortcut = poShortcut;
                        if (e.target.checked && !shortcut) {
                            shortcut = prompt('Bitte Ihr Kürzel eingeben:');
                            if (shortcut) {
                                shortcut = shortcut.toUpperCase();
                                setPoShortcut(shortcut);
                                localStorage.setItem('po_shortcut', shortcut);
                            } else {
                                return;
                            }
                        }
                        onMarkPODone(req.id, e.target.checked, shortcut);
                    }}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
              </div>
          )}

          {isAdmin && (
            <button className="btn-delete" onClick={() => { if(confirm('Antrag wirklich löschen?')) onDelete(req.id); }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="requests-view">
      <div className="requests-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Anträge</h2>
          {subTab !== 'po_transfer' && (
            <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="status-filter-select"
            >
                <option value="all">Alle</option>
                <option value="open">Offen</option>
                <option value="approved">Genehmigt</option>
                <option value="rejected">Abgelehnt</option>
            </select>
          )}
        </div>

        <div className="requests-tabs glass" style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
          {isAdmin ? (
            <>
              <button 
                className={`requests-tab ${subTab === 'admin_list' ? 'active' : ''}`}
                onClick={() => setSubTab('admin_list')}
                style={{ padding: '8px 16px', borderRadius: '10px' }}
              >
                Antrags-Management
              </button>
              {perms.canSeePOKarte && (
                <button 
                  className={`requests-tab ${subTab === 'po_transfer' ? 'active' : ''}`}
                  onClick={() => setSubTab('po_transfer')}
                  style={{ padding: '8px 16px', borderRadius: '10px' }}
                >
                  PO-Übertragung {poPendingReqs.length > 0 && <span className="tab-badge">{poPendingReqs.length}</span>}
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                className={`requests-tab ${subTab === 'meine' ? 'active' : ''}`}
                onClick={() => setSubTab('meine')}
                style={{ padding: '8px 16px', borderRadius: '10px' }}
              >
                Meine Anträge
              </button>
              <button 
                className={`requests-tab ${subTab === 'vertreter' ? 'active' : ''}`}
                onClick={() => setSubTab('vertreter')}
                style={{ padding: '8px 16px', borderRadius: '10px' }}
              >
                Vertretungen {vertreterReqs.filter(r => r.status === 'pending_vertreter').length > 0 && (
                  <span className="tab-badge">{vertreterReqs.filter(r => r.status === 'pending_vertreter').length}</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {subTab === 'po_transfer' && (
          <div style={{ marginBottom: 16 }}>
              <div className="glass" style={{ padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, maxWidth: 300 }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Kürzel:</label>
                  <input 
                    type="text" 
                    value={poShortcut} 
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPoShortcut(val);
                        localStorage.setItem('po_shortcut', val);
                    }}
                    placeholder="Eigener Name..."
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)' }}
                  />
              </div>
          </div>
      )}

      <div className="requests-list">
        {displayRequests.length > 0 ? (
          displayRequests.map(renderCard)
        ) : (
          <div className="empty-state">
            <Clock size={48} />
            <p>Keine Anträge gefunden.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsView;

