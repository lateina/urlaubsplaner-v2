import React from 'react';
import { Calendar, Bell, Users, Settings } from 'lucide-react';

const MobileNav = ({ activeTab, onTabChange, badgeCount, isAdmin }) => {
  const items = [
    { id: 'calendar', icon: Calendar, label: 'Planer' },
    { id: 'requests', icon: Bell, label: 'Anfragen', badge: badgeCount },
    isAdmin ? { id: 'employees', icon: Users, label: 'Admin' } : { id: 'settings', icon: Settings, label: 'Profil' }
  ];

  return (
    <nav className="mobile-nav glass" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 200,
      borderTop: '1px solid var(--glass-border)'
    }}>
      {items.map((item) => (
        <div 
          key={item.id}
          onClick={() => onTabChange(item.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: activeTab === item.id ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '0.65rem',
            position: 'relative',
          }}
        >
          <item.icon size={24} />
          {item.badge && (
            <span className="badge" style={{ position: 'absolute', top: -4, right: -4 }}>
              {item.badge}
            </span>
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </nav>
  );
};

export default MobileNav;
