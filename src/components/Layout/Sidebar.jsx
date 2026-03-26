import React from 'react';
import { Calendar, ClipboardList, Users, ShieldCheck, Settings, Bell, ChevronsLeftRight, Download, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { PLANER_PROFILES } from '../../config/planerConfig';

const Sidebar = ({ activeTab, onTabChange, planerType, onPlanerSwitch, isAdmin, perms, badgeCount, currentUser, onOpenICal, isCollapsed, onToggleCollapse }) => {
  const profile = PLANER_PROFILES[planerType];
  
  const navItems = [
    { id: 'calendar', label: 'Kalender', icon: Calendar },
    { id: 'requests', label: 'Anfragen', icon: Bell, badge: badgeCount },
    ...(perms.canSeeSummary ? [{ id: 'summary', label: 'Zusammenfassung', icon: ClipboardList }] : []),
    ...(perms.canAdminEmployees ? [{ id: 'employees', label: 'Mitarbeiter', icon: Users }] : []),
    ...(perms.canAdminSkills ? [{ id: 'skills', label: 'Skills', icon: ShieldCheck }] : []),
    ...(isAdmin && planerType !== 'oa' ? [{ id: 'areas', label: 'Bereiche', icon: ChevronsLeftRight }] : []),
    ...(perms.canICalExport ? [{ id: 'ical', label: 'iCal Export', icon: Download }] : []),
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  return (
    <aside 
      className="sidebar glass" 
      onClick={onToggleCollapse}
      style={{ 
        '--primary': profile.primaryColor,
        width: isCollapsed ? '80px' : '260px',
        borderRight: '1px solid var(--glass-border)',
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(32px)',
        zIndex: 150,
        transition: 'width 0.3s ease-in-out',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
    >
      <div 
        className="sidebar-header" 
        style={{ 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
          padding: isCollapsed ? '24px 0' : '24px',
          flexDirection: isCollapsed ? 'column' : 'row',
          gap: isCollapsed ? '16px' : '0',
          cursor: 'pointer'
        }}
      >
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%' }}
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
        >
          <div style={{ 
            padding: '8px', 
            background: 'rgba(255, 255, 255, 0.2)', 
            borderRadius: '12px', 
            color: 'var(--primary)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            cursor: 'pointer'
          }}>
            {isCollapsed ? <Menu size={20} /> : <Calendar size={24} strokeWidth={3} />}
          </div>
          {!isCollapsed && (
            <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              {profile.id === 'oa' ? 'OA' : 'AA'}
            </span>
          )}
        </div>
        
        {/* Only Admin/Sekretariat can switch profiles */}
        {perms.canSwitchPlaner && !isCollapsed && (
          <button 
            onClick={(e) => { e.stopPropagation(); onPlanerSwitch(); }}
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
      <nav className="sidebar-nav" style={{ cursor: 'pointer', flex: 1 }}>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            title={isCollapsed ? item.label : ''}
            style={{ 
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '12px 0' : '12px 24px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (item.id === 'ical') {
                onOpenICal();
              } else {
                onTabChange(item.id);
              }
            }}
          >
            <item.icon size={20} />
            {!isCollapsed && <span>{item.label}</span>}
            {item.badge > 0 && !isCollapsed && <span className="badge" style={{ marginLeft: 'auto' }}>{item.badge}</span>}
            {item.badge > 0 && isCollapsed && <span className="badge" style={{ position: 'absolute', top: 4, right: 12, scale: '0.8' }}>{item.badge}</span>}
          </div>
        ))}
      </nav>
      <div 
        style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>{profile.title}</span>
            <span style={{ opacity: 0.7 }}>v2.2.0</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
