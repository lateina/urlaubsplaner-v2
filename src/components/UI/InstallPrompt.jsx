import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Download } from 'lucide-react';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. Check if already installed / in standalone mode
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 2. Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // 3. Handle Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Show iOS prompt automatically if not standalone
    if (ios && !localStorage.getItem('pwa_prompt_dismissed')) {
      // Delay slightly for better UX
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="glass" 
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        left: '20px',
        right: '20px',
        zIndex: 1000,
        padding: '20px',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(32px)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <button 
        onClick={dismissPrompt}
        style={{ 
          position: 'absolute', 
          top: '12px', 
          right: '12px', 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-secondary)',
          cursor: 'pointer'
        }}
      >
        <X size={20} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '12px', 
          background: 'var(--primary)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)'
        }}>
          <Download size={24} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            App installieren
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Für das beste Erlebnis als App speichern
          </p>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(var(--primary-rgb), 0.05)', 
        padding: '12px', 
        borderRadius: '16px',
        fontSize: '0.85rem',
        color: 'var(--text-main)',
        lineHeight: '1.4'
      }}>
        {isIOS ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>1.</span>
              <span>Tippe auf das **Teilen-Icon** <Share size={16} style={{ verticalAlign: 'middle', display: 'inline' }} /></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>2.</span>
              <span>Wähle **"Zum Home-Bildschirm"** <PlusSquare size={16} style={{ verticalAlign: 'middle', display: 'inline' }} /></span>
            </div>
          </div>
        ) : (
          <span>Klicke auf den Button unten, um den Urlaubsplaner auf deinem Gerät zu installieren.</span>
        )}
      </div>

      {!isIOS && deferredPrompt && (
        <button 
          onClick={handleInstallClick}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--primary)',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Jetzt installieren
        </button>
      )}
    </div>
  );
};

export default InstallPrompt;
