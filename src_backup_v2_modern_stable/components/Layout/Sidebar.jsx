import React from 'react';
import { Calendar, ClipboardList, Users, ShieldCheck, Settings, Bell, ChevronsLeftRight } from 'lucide-react';
import { PLANER_PROFILES } from '../../config/planerConfig';

const Sidebar = ({ activeTab, onTabChange, planerType, onPlanerSwitch, isAdmin, badgeCount }) => {
  const profile = PLANER_PROFILES[planerType];
  
  const navItems = [
    { id: 'calendar', label: 'Kalender', icon: Calendar },
    { id: 'requests', label: 'Anfragen', icon: Bell, badge: badgeCount },
    { id: 'summary', label: 'Zusammenfassung', icon: ClipboardList },
    ...(isAdmin ? [
      { id: 'employees', label: 'Mitarbeiter', icon: Users },
      { id: 'skills', label: 'Skills', icon: ShieldCheck },
      ...(planerType !== 'oa' ? [{ id: 'areas', label: 'Bereiche', icon: ChevronsLeftRight }] : [])
    ] : []),
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  return (
    <aside className="sidebar" style={{ '--primary': profile.primaryColor }}>
      <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={28} strokeWidth={3} />
          <span>{profile.id === 'oa' ? 'OA' : 'Assistent'}</span>
        </div>
        
        {/* Only Admin can switch profiles manually */}
        {isAdmin && (
          <button 
            onClick={onPlanerSwitch}
            title="Planer wechseln"
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: 'var(--text-secondary)', padding: 4, display: 'flex' 
            }}
          >
            <ChevronsLeftRight size={18} />
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.badge && <span className="badge" style={{ marginLeft: 'auto' }}>{item.badge}</span>}
          </div>
        ))}
      </nav>
      <div style={{ padding: '20px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {profile.title} • v2.2.0
      </div>
    </aside>
  );
};

export default Sidebar;
