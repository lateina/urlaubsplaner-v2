import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Search, Lock } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';

const Login = ({ onLogin, binId, planerType }) => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load employees from Firestore on mount
  useEffect(() => {
    loadEmployees();
  }, [planerType]);

  const loadEmployees = async () => {
    setIsLoading(true);
    setError('');
    try {
      const config = await firestoreService.loadConfig();
      if (!config || !config.employees) {
        throw new Error('Keine Mitarbeiterdaten gefunden');
      }

      let emps = config.employees;

      // Add cross-profile employees for Assistant view if needed
      if (planerType === 'ass') {
        // We include everyone in the main config for now as they are already merged in Firestore
      }
      
      setEmployees(emps);
    } catch (err) {
      console.error('Login Load Error:', err);
      setError('Fehler beim Laden der Mitarbeiter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    if (selectedUser.pin && String(selectedUser.pin) !== pin) {
      setError('Falscher PIN');
      return;
    }
    
    onLogin({
      user: selectedUser,
      masterKey: 'STORED_IN_FIRESTORE' // Signal that key is handled via config
    });
  };

  const filteredEmployees = employees.filter(emp => {
    if (emp.active === false) return false;
    
    if (emp.exitDate) {
      const today = new Date().toISOString().split('T')[0];
      if (emp.exitDate < today) return false;
    }

    const isSystemUser = ['admin', 'sekretariat'].includes(emp.id) || 
                         emp.name?.toLowerCase().includes('administrator') || 
                         emp.name?.toLowerCase().includes('sekretariat');

    const groups = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
    const isFOA = groups.includes('skill_funktionsoberarzt') || groups.some(g => String(g).toLowerCase().includes('funktionsoberarzt'));
    const isOA = emp.role === 'Oberarzt' || emp.isOberarzt === true || isFOA;
    const isMaier = emp.id === 'maier';

    if (planerType === 'oa') {
      // In OA Planer: show only OAs, system users, FOAs, and maier
      if (!isOA && !isSystemUser && !isMaier) return false;
    } else {
      // In ASS Planer: show only Assistenten and FOAs. System users shouldn't be in the regular list,
      // but they need to log in to ASS planner too to manage it! 
      // Wait, if Admin needs to log into ASS planer, they MUST be visible.
      if (!isSystemUser && isOA && !isFOA && !isMaier) return false;
    }
    
    return emp.name.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const getSortName = (n) => {
      if (!n) return '';
      let clean = n.replace(/^Dr\.\s+/i, '');
      if (clean.includes(',')) return clean;
      const parts = clean.trim().split(/\s+/);
      return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : n;
    };
    return getSortName(a.name).localeCompare(getSortName(b.name));
  });

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <ShieldCheck size={48} color={planerType === 'oa' ? '#8b5cf6' : '#3b82f6'} />
          <h2>{planerType === 'oa' ? 'Abwesenheitsplaner für Oberärzte' : 'Abwesenheitsplaner für Assistenzärzte'}</h2>
          <p>Bitte melden Sie sich an</p>
        </div>

        {isLoading ? (
          <div className="login-loading">
            <div className="spinner"></div>
            <p>Lade Mitarbeiter...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            {/* User Selection */}
            <div className="input-group">
              <label><User size={16} /> Mitarbeiter</label>
              <div className="user-search-wrapper">
                <div className="search-input-box">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Suchen..."
                  />
                </div>
                <div className="user-list">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(emp => (
                      <div 
                        key={emp.id}
                        className={`user-item ${selectedUser?.id === emp.id ? 'active' : ''}`}
                        onClick={() => setSelectedUser(emp)}
                      >
                        {emp.name}
                      </div>
                    ))
                  ) : (
                    <div className="user-item empty">Keine Mitarbeiter gefunden</div>
                  )}
                </div>
              </div>
            </div>

            {/* PIN Section */}
            {selectedUser && (
              <div className="input-group animate-fade-in">
                <label><Lock size={16} /> PIN oder Code</label>
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Eingeben..."
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="login-error">
                {error}
                <button type="button" onClick={loadEmployees} className="retry-btn">Wiederholen</button>
              </div>
            )}

            <button 
              type="submit" 
              className="login-submit"
              disabled={!selectedUser || isLoading}
            >
              {isLoading ? 'Lädt...' : 'Einloggen'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .login-overlay {
          position: fixed;
          inset: 0;
          background: rgba(241, 245, 249, 0.95);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .login-card {
          background: white;
          padding: 40px;
          border-radius: 24px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.1);
          border: 1px solid var(--border);
        }
        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .login-header h2 {
          margin: 10px 0 5px;
          font-size: 1.5rem;
          color: #1e293b;
        }
        .login-header p {
          color: #64748b;
          font-size: 0.9rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .input-group input {
          padding: 12px 16px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .input-group input:focus {
          border-color: var(--primary);
          outline: none;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .input-group input.valid {
          border-color: #10b881;
          background: rgba(16, 185, 129, 0.05);
        }
        .user-search-wrapper {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .search-input-box {
          position: relative;
          border-bottom: 2px solid #e2e8f0;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }
        .search-input-box input {
          width: 100%;
          border: none !important;
          padding: 10px 10px 10px 36px;
          font-size: 0.9rem;
        }
        .user-list {
          max-height: 150px;
          overflow-y: auto;
          background: #fafafa;
        }
        .user-item {
          padding: 10px 16px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .user-item:hover {
          background: #f1f5f9;
        }
        .user-item.active {
          background: var(--primary);
          color: white;
          font-weight: 600;
        }
        .login-submit {
          margin-top: 10px;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: var(--primary);
          color: white;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.1s, opacity 0.2s;
        }
        .login-submit:active {
          transform: scale(0.98);
        }
        .login-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .login-error {
          color: #ef4444;
          font-size: 0.8rem;
          text-align: center;
          font-weight: 600;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
