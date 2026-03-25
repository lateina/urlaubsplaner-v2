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
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: 500,
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
