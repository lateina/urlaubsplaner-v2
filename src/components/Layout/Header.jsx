import React from 'react';
import { User, LogOut } from 'lucide-react';

const Header = ({ user, onLogout }) => {
  return (
    <header className="header glass" style={{ 
      height: '54px', 
      margin: 'calc(env(safe-area-inset-top) + 12px) calc(env(safe-area-inset-right) + 16px) 12px calc(env(safe-area-inset-left) + 16px)',
      padding: '0 24px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      position: 'sticky',
      top: 'calc(env(safe-area-inset-top) + 12px)',
      zIndex: 100,
      borderRadius: '24px',
      border: '1px solid var(--glass-border)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
    }}>
      <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="header-user-icon" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
          <User size={20} />
        </div>
        <div className="header-user-info">
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.name || 'Mitarbeiter'}</div>
          <div className="header-user-status" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Status: Online</div>
        </div>
      </div>

      
      <div style={{ display: 'flex', gap: 12 }}>
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
