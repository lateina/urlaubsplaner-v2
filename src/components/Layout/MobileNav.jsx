import React, { useState } from 'react';
import { Calendar, Bell, Users, Settings, ClipboardList, ShieldCheck, Download, MoreHorizontal, LayoutGrid } from 'lucide-react';

const MobileNav = ({ activeTab, onTabChange, badgeCount, isAdmin, perms, onOpenICal }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const primaryItems = [
    { id: 'calendar', icon: Calendar, label: 'Planer' },
    { id: 'requests', icon: Bell, label: 'Anfragen', badge: badgeCount },
  ];

  const secondaryItems = [
    ...(perms?.canSeeSummary ? [{ id: 'summary', icon: ClipboardList, label: 'Report' }] : []),
    ...(perms?.canAdminEmployees ? [{ id: 'employees', icon: Users, label: 'Mitarbeiter' }] : []),
    ...(perms?.canAdminSkills ? [{ id: 'skills', icon: ShieldCheck, label: 'Skills' }] : []),
    ...(perms?.canICalExport ? [{ id: 'ical', icon: Download, label: 'iCal Export' }] : []),
    { id: 'settings', icon: Settings, label: 'Einstellungen' }
  ];

  const handleItemClick = (id) => {
    if (id === 'ical') {
      onOpenICal();
    } else {
      onTabChange(id);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.1)' }}
        />
      )}
      
      {isMenuOpen && (
        <div className="glass" style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
          right: '16px',
          width: '240px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(32px)',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          zIndex: 200,
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {secondaryItems.map(item => (
            <div 
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-main)',
                background: activeTab === item.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                fontWeight: 600
              }}
            >
              <item.icon size={20} />
              <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

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
        borderTop: '1px solid var(--glass-border)',
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(24px)'
      }}>
        {primaryItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => {
              onTabChange(item.id);
              setIsMenuOpen(false);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: activeTab === item.id && !isMenuOpen ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '0.65rem',
              position: 'relative',
              flex: 1
            }}
          >
            <item.icon size={24} />
            {item.badge > 0 && (
              <span className="badge" style={{ position: 'absolute', top: -4, right: '25%' }}>
                {item.badge}
              </span>
            )}
            <span style={{ fontWeight: 700 }}>{item.label}</span>
          </div>
        ))}

        <div 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            color: isMenuOpen ? 'var(--primary)' : 'var(--text-secondary)',
            fontSize: '0.65rem',
            position: 'relative',
            flex: 1
          }}
        >
          <LayoutGrid size={24} />
          <span style={{ fontWeight: 700 }}>Mehr</span>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
