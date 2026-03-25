import React from 'react';
import { User, LogOut } from 'lucide-react';

const Header = ({ user }) => {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: '8px', background: 'var(--bg-main)', borderRadius: '50%', color: 'var(--primary)' }}>
          <User size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user?.name || 'Mitarbeiter'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Eingeloggt</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="nav-item" style={{ border: 'none', background: 'transparent' }}>
          <LogOut size={20} />
          <span>Abmelden</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
