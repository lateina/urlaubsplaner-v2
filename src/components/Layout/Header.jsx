import React from 'react';
import { User, LogOut } from 'lucide-react';

const Header = ({ user, onLogout }) => {
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
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
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
