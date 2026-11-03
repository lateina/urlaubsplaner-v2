import React from 'react';
import { User, LogOut, RotateCcw } from 'lucide-react';

const Header = ({ user, onLogout, isSaving, isAdmin, canUndo, undoLabel, onUndo }) => {
  return (
    <header className="header glass" style={{ 
      height: 'calc(var(--header-h) + env(safe-area-inset-top))',
      paddingTop: 'env(safe-area-inset-top)',
      paddingLeft: 'calc(env(safe-area-inset-left) + 20px)',
      paddingRight: 'calc(env(safe-area-inset-right) + 20px)',
      paddingBottom: 'var(--header-pb)',
      display: 'flex', 
      alignItems: 'var(--header-align)', 
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid var(--glass-border)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      boxSizing: 'border-box'
    }}>
      <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="header-user-icon" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
          <User size={20} />
        </div>
        <div className="header-user-info">
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.name || 'Mitarbeiter'}</div>
          {isSaving ? (
            <div className="header-user-status" style={{ 
              fontSize: '0.7rem', 
              color: '#3b82f6', 
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ 
                width: 6, height: 6, borderRadius: '50%', background: '#3b82f6',
                animation: 'pulse 1s infinite alternate'
              }}></span>
              Speichere...
            </div>
          ) : (
            <div className="header-user-status" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Status: Online</div>
          )}
        </div>
      </div>

      
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isAdmin && canUndo && (
          <button
            onClick={onUndo}
            title={undoLabel ? `Rückgängig: ${undoLabel} (Cmd+Z)` : 'Letzte Aktion rückgängig machen (Cmd+Z)'}
            style={{
              border: '1px solid rgba(147, 51, 234, 0.3)',
              background: 'rgba(243, 232, 255, 0.75)',
              backdropFilter: 'blur(12px)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#7c3aed',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.15)',
              transition: 'all 0.2s ease'
            }}
          >
            <RotateCcw size={14} />
            <span>Rückgängig{undoLabel ? `: ${undoLabel}` : ''}</span>
          </button>
        )}

        <button 
          className="nav-item" 
          onClick={onLogout}
          style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
        >
          <LogOut size={20} className="logout-icon" />
          <span className="logout-text">Abmelden</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
