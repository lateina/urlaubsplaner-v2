import React from 'react';

const Tooltip = ({ x, y, visible, content }) => {
  if (!visible || !content) return null;

  const renderContent = () => {
    if (typeof content !== 'string') return content;
    
    return content.split('\n').map((line, i) => {
      if (line === '---') return <hr key={i} style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.2)', margin: '4px 0' }} />;
      
      // Basic bold parsing
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i}>
          {parts.map((part, pi) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pi}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const showLeft = x > windowWidth * 0.6;

  return (
    <div style={{
      position: 'fixed',
      top: y + 15,
      left: showLeft ? x - 15 : x + 15,
      transform: showLeft ? 'translateX(-100%)' : 'none',
      maxWidth: 'min(calc(100vw - 40px), 300px)',
      background: 'rgba(15, 23, 42, 0.95)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '0.75rem',
      zIndex: 2000,
      pointerEvents: 'none',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.1)',
      lineHeight: '1.4'
    }}>

      {renderContent()}
    </div>
  );
};

export default Tooltip;
