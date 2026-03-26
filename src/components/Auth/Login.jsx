import React, { useState, useEffect } from 'react';
import { KeyRound, User, Lock, Search, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

const Login = ({ onLogin, initialMasterKey, binId, planerType }) => {
  const [masterKey, setMasterKey] = useState(initialMasterKey || '');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMasterKeyValid, setIsMasterKeyValid] = useState(!!initialMasterKey);

  // Load employees when master key is entered
  useEffect(() => {
    if (masterKey.length >= 20) {
      validateMasterKey();
    }
  }, [masterKey, binId, planerType]);

  const validateMasterKey = async () => {
    if (!binId) return;
    setIsLoading(true);
    setError('');
    try {
      // 1. Fetch main bin (ASS or OA)
      const response = await fetch(`${APP_CONFIG.API_URL}/${binId}/latest`, {
        headers: { 'X-Master-Key': masterKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        let emps = data.record.employees || [];
        
        // 2. If it's the assistant planer, also fetch FOAs from OA bin
        if (planerType === 'ass' && binId === APP_CONFIG.ASS_BIN_ID) {
          try {
            const oaResponse = await fetch(`${APP_CONFIG.API_URL}/${APP_CONFIG.OA_BIN_ID}/latest`, {
              headers: { 'X-Master-Key': masterKey }
            });
            if (oaResponse.ok) {
              const oaData = await oaResponse.json();
              const foas = (oaData.record.employees || []).filter(emp => {
                const grps = Array.isArray(emp.groups) ? emp.groups : (emp.group ? [emp.group] : []);
                return grps.some(g => g && String(g).toLowerCase().includes('funktionsoberarzt'));
              }).map(f => ({ ...f, _isCrossProfile: true }));

              // Merge FOAs (only if not already in list)
              foas.forEach(f => {
                if (!emps.find(e => e.id === f.id)) emps.push(f);
              });
            }
          } catch (e) {
            console.warn("FOA fetch failed during login", e);
          }
        }
        
        setEmployees(emps);
        setIsMasterKeyValid(true);
        localStorage.setItem('jsonbin_key', masterKey);
      } else {
        setIsMasterKeyValid(false);
        setError('Master Key ungültig');
      }
    } catch (err) {
      setError('Verbindungsfehler');
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
      masterKey: masterKey
    });
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
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

        <form onSubmit={handleLogin} className="login-form">
          {/* Master Key Section */}
          <div className="input-group">
            <label><KeyRound size={16} /> Planer-Code (Master Key)</label>
            <input 
              type="password" 
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="Eingeben..."
              className={isMasterKeyValid ? 'valid' : ''}
            />
          </div>

          {isMasterKeyValid && (
            <>
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
                    {filteredEmployees.map(emp => (
                      <div 
                        key={emp.id}
                        className={`user-item ${selectedUser?.id === emp.id ? 'active' : ''}`}
                        onClick={() => setSelectedUser(emp)}
                      >
                        {emp.name}
                      </div>
                    ))}
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
            </>
          )}

          {error && <div className="login-error">{error}</div>}

          <button 
            type="submit" 
            className="login-submit"
            disabled={!selectedUser || isLoading}
          >
            {isLoading ? 'Lädt...' : 'Einloggen'}
          </button>
        </form>
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
