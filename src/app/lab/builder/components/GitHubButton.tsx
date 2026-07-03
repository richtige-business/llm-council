// ============================================
// GitHubButton - GitHub-Verbindung für Module
// 
// Zweck: Ermöglicht Git Push/Pull für Module
// Verwendet von: ProjectChatPage Header
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Github, ChevronDown, GitBranch, Upload, Download, LogOut } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useGitHubConnection } from '@/lib/stores/githubConnection';

// --------------------------------------------
// Komponente
// --------------------------------------------

export function GitHubButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  
  const { 
    container, 
    surface, 
    button: buttonStyle, 
    accentColor, 
    textColor,
    designStyle 
  } = useThemeStyles();
  
  const { 
    isConnected, 
    user, 
    connect, 
    disconnect 
  } = useGitHubConnection();
  
  // Client-only rendering für Portal
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Button-Position aktualisieren
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isOpen]);
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-github-popup]') && !target.closest('[data-github-button]')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);
  
  // --------------------------------------------
  // Popup Content
  // --------------------------------------------
  
  const PopupContent = () => {
    if (!buttonRect) return null;
    
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 99998,
          }}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Popup */}
        <div
          data-github-popup
          className="fixed w-72 rounded-xl p-4"
          style={{
            top: buttonRect.bottom + 8,
            right: window.innerWidth - buttonRect.right,
            zIndex: 99999,
            background: designStyle === 'brutal' 
              ? 'rgba(30,30,30,0.98)'
              : 'rgba(30,30,40,0.85)',
            backdropFilter: designStyle !== 'brutal' ? 'blur(24px) saturate(180%)' : 'none',
            border: designStyle === 'brutal'
              ? '2px solid #000'
              : '1px solid rgba(255,255,255,0.18)',
            boxShadow: designStyle === 'brutal'
              ? '4px 4px 0 #000'
              : `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${accentColor}20`,
          }}
        >
          {isConnected && user ? (
            <>
              {/* Connected State */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                {user.avatar_url && (
                  <img 
                    src={user.avatar_url} 
                    alt={user.login}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium" style={{ color: textColor }}>
                    {user.name || user.login}
                  </p>
                  <p className="text-xs opacity-60" style={{ color: textColor }}>
                    @{user.login}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                  onClick={() => {
                    // TODO: Implement push
                    console.log('Push to GitHub');
                  }}
                >
                  <Upload className="w-4 h-4" />
                  <span>Push to GitHub</span>
                </button>
                
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                  onClick={() => {
                    // TODO: Implement pull
                    console.log('Pull from GitHub');
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>Pull from GitHub</span>
                </button>
                
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/10 text-red-400"
                  onClick={() => {
                    disconnect();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Trennen</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <div className="text-center">
                <Github className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: textColor }} />
                <p className="mb-4 opacity-80" style={{ color: textColor }}>
                  Verbinde mit GitHub für Git Push/Pull
                </p>
                <button
                  className="w-full py-2 rounded-lg font-medium transition-all"
                  style={{
                    ...buttonStyle.primary,
                    background: accentColor,
                  }}
                  onClick={() => {
                    connect();
                    setIsOpen(false);
                  }}
                >
                  Mit GitHub verbinden
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  };
  
  // --------------------------------------------
  // Render
  // --------------------------------------------
  
  return (
    <>
      <button
        ref={buttonRef}
        data-github-button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
        style={{
          ...buttonStyle.base,
          color: textColor,
        }}
      >
        <Github className="w-4 h-4" />
        <span className="text-sm">
          {isConnected ? user?.login : 'GitHub'}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Portal für Popup */}
      {mounted && isOpen && createPortal(<PopupContent />, document.body)}
    </>
  );
}
