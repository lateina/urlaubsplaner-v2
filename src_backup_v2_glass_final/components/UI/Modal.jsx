import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }}>
      <div className="glass" style={{
        background: 'rgba(255, 255, 255, 0.5)',
        width: '100%',
        maxWidth: 500,
        borderRadius: '24px',
        boxShadow: '0 20px 50px -12px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)'
      }}>
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}>&times;</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
