import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.45)', // Standard dark overlay
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20
      }}
    >

      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass modal-card" 
        style={{
          background: 'rgba(255, 255, 255, 0.05)',

        width: '95%',
        maxWidth: 520,
        maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)',
        borderRadius: '28px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(30px)', // High blur ONLY inside the modal
        border: '1px solid rgba(255, 255, 255, 0.4)',
        position: 'relative'
      }}>
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#000000', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#000000', display: 'flex', fontWeight: 900 }}>&times;</button>
        </div>
        <div style={{ padding: 28, overflowY: 'auto', overflowX: 'hidden', maxHeight: '90vh', background: 'transparent' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
