import React, { useState } from 'react';
import { Check, X, Trash2, FileText, Clock, User, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';

const RequestsView = ({ 
  requests = [], 
  employees = [], 
  currentUser, 
  isAdmin, 
  onApprove, 
  onReject, 
  onDelete 
}) => {
  const [filter, setFilter] = useState('open'); // 'all', 'open', 'approved', 'rejected'
  const [subTab, setSubTab] = useState('meine'); // 'meine', 'vertreter'

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
    if (filter === 'open') return r.status.startsWith('pending');
    if (filter === 'approved') return r.status === 'approved';
    if (filter === 'rejected') return r.status === 'rejected';
    return true;
  });

  const cuId = currentUser?.id;
  
  // Tab logic for non-admins
  const vertreterReqs = filteredRequests.filter(r => r.vertreterId === cuId && r.status === 'pending_vertreter');
  const meineReqs = filteredRequests.filter(r => r.empId === cuId);

  const displayRequests = isAdmin 
    ? filteredRequests.sort((a, b) => b.id.localeCompare(a.id))
    : (subTab === 'meine' ? meineReqs : vertretenReqs).sort((a, b) => b.id.localeCompare(a.id));

  const getEmpName = (id) => employees.find(e => e.id === id)?.name || id;

  const formatDateRange = (dates) => {
    if (!dates || dates.length === 0) return '';
    const from = dates[0];
    const to = dates[dates.length - 1];
    return from === to ? from : `${from} bis ${to}`;
  };

  const renderCard = (req) => {
    const isPendingVertreterForMe = req.vertreterId === cuId && req.status === 'pending_vertreter';
    const isPendingAdmin = isAdmin && req.status === 'pending_admin';
    const canApprove = isPendingVertreterForMe || isPendingAdmin;

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
            <button className="btn-pdf" title="PDF herunterladen (In Vorbereitung)">
              <FileText size={16} />
              <span>PDF</span>
            </button>
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
          <h2 style={{ margin: 0 }}>Anträge</h2>
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
        </div>

        {!isAdmin && (
          <div className="requests-tabs">
            <button 
              className={`requests-tab ${subTab === 'meine' ? 'active' : ''}`}
              onClick={() => setSubTab('meine')}
            >
              Meine Anträge
            </button>
            <button 
              className={`requests-tab ${subTab === 'vertreter' ? 'active' : ''}`}
              onClick={() => setSubTab('vertreter')}
            >
              Vertretungen {vertreterReqs.length > 0 && <span className="tab-badge">{vertreterReqs.length}</span>}
            </button>
          </div>
        )}
      </div>

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
