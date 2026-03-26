/**
 * Profiles for different versions of the Urlaubsplaner
 */
export const PLANER_PROFILES = {
  ass: {
    id: 'ass',
    title: 'Abwesenheitsplaner für Assistenzärzte',
    primaryColor: '#3b82f6', // Client blue
    secondaryColor: '#eff6ff',
    icon: 'Users',
    defaultSkills: [
      { id: 'skill_station5052', name: 'Station 50-52' },
      { id: 'skill_intermits', name: 'Interm/ITS' },
      { id: 'skill_notaufnahme', name: 'Notaufnahme' },
      { id: 'skill_fremdrotation', name: 'Fremdrotation' },
      { id: 'skill_kardiologie', name: 'Kardiologie' },
      { id: 'skill_funktionsoberarzt', name: 'Funktionsoberarzt' },
      { id: 'skill_keinvertreternotig', name: 'Kein Vertreter nötig' }
    ],
    defaultColors: {
      'Station 50-52': '#3b82f6',
      'Interm/ITS': '#6366f1',
      'Notaufnahme': '#14b8a6',
      'Fremdrotation': '#8b5cf6',
      'Kardiologie': '#06b6d4',
      'Funktionsoberarzt': '#475569',
      'Chef': '#ef4444',
      'Privat': '#84cc16',
      'Kein Vertreter nötig': '#6b7280'
    }
  },
  oa: {
    id: 'oa',
    title: 'Abwesenheitsplaner für Oberärzte',
    primaryColor: '#8b5cf6', // Soft purple
    secondaryColor: '#f5f3ff',
    icon: 'ShieldCheck',
    defaultSkills: [
      { id: 'skill_chef', name: 'Chef' },
      { id: 'skill_privat', name: 'Privat' },
      { id: 'skill_tavi', name: 'TAVI' },
      { id: 'skill_teer', name: 'TEER' },
      { id: 'skill_herzkatheter', name: 'Herzkatheter' },
      { id: 'skill_echo', name: 'Echo' },
      { id: 'skill_epu', name: 'EPU' },
      { id: 'skill_intensiv', name: 'Intensiv' },
      { id: 'skill_pneumo', name: 'Pneumo' },
      { id: 'skill_ambulanz', name: 'Ambulanz' },
      { id: 'skill_funktionsoberarzt', name: 'Funktionsoberarzt' },
      { id: 'skill_keinvertreternotig', name: 'Kein Vertreter nötig' }
    ],
    defaultColors: {
      'Chef': '#ef4444',
      'Privat': '#3b82f6',
      'TAVI': '#10b981',
      'TEER': '#f59e0b',
      'Herzkatheter': '#8b5cf6',
      'Echo': '#06b6d4',
      'EPU': '#ec4899',
      'Intensiv': '#6366f1',
      'Pneumo': '#14b8a6',
      'Ambulanz': '#84cc16',
      'Funktionsoberarzt': '#475569',
      'Kein Vertreter nötig': '#6b7280'
    }
  }
};

export const DEFAULT_PROFILE = 'ass';
