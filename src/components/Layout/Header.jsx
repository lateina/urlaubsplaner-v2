import React from 'react';
import { User, LogOut } from 'lucide-react';

const Header = ({ user, onLogout }) => {
  return (
    <header className="header glass" style={{ 
      height: 'var(--header-h)', 
      padding: '0 20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--glass-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '50%', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
          <User size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.name || 'Mitarbeiter'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Status: Online</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          className="nav-item" 
          onClick={onLogout}
          style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
        >
          <LogOut size={20} />
          <span>Abmelden</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
