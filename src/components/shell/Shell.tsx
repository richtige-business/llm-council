'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/lib/store/app-store';
import { AgentCursor } from '@/lib/agent/computer-use/AgentCursor';
import { useThemeStyles } from '@/lib/theme';
import { initializeModuleRegistry } from '@/lib/modules/registry';
import { SandboxOverlay } from '@/components/agent/SandboxOverlay';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const backgroundImage = useAppStore((state) => state.backgroundImage);
  const backgroundType = useAppStore((state) => state.backgroundType);
  const solidBackground = useAppStore((state) => state.solidBackground);
  const pathname = usePathname();
  
  // Theme-Styles
  const { surface, designStyle, surfaceColor, textColor, accentColor, buttonTextColor } = useThemeStyles();
  
  // Prüfen ob wir im Chat-Modul sind (dort wird die Chatbar ausgeblendet)
  const isChatModule = pathname === '/agents' || pathname.startsWith('/agents/') || pathname === '/chat' || pathname.startsWith('/chat/');
  
  // Sandbox hat keine Shell-Elemente (läuft im iframe)
  const isSandbox = pathname === '/sandbox' || pathname.startsWith('/sandbox/');
  const isDashboardSurface = pathname === '/' || pathname.startsWith('/bases/');

  // Browser-History-Swipe (2-Finger links/rechts) auf Dashboard-Seiten deaktivieren,
  // damit kein Wechsel zwischen Modulen/Bases ausgelöst wird.
  useEffect(() => {
    if (isSandbox || !isDashboardSurface) {
      return;
    }

    const handlePopState = () => {
      // Erzwinge Verbleib auf der aktuellen Dashboard-Route.
      window.history.pushState({ llmCouncilNoSwipe: true }, '', window.location.href);
    };

    // Sentinel-State, damit Back/Forward-Gesten nicht zur vorherigen Route wechseln.
    window.history.pushState({ llmCouncilNoSwipe: true }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSandbox, isDashboardSurface, pathname]);

  // Initialisiere Module Registry beim ersten Laden
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeModuleRegistry().catch(console.error);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, setSidebarOpen, sidebarOpen]);

  // Sandbox hat keine Shell-Elemente (läuft im iframe)
  if (isSandbox) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ overscrollBehaviorX: 'none', touchAction: 'pan-y' }}
    >
      {/* Background - Image or Solid Color */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ 
          backgroundImage: backgroundType === 'image' ? `url(${backgroundImage})` : 'none',
          backgroundColor: backgroundType === 'solid' ? solidBackground : 'transparent',
        }}
      >
        {/* Subtle vignette overlay - nur bei Bildern */}
        {backgroundType === 'image' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
        )}
      </div>

      {/* Sidebar Trigger - small pill at left edge with accent color */}
      <button
        onClick={toggleSidebar}
        data-agent-button="open-sidebar"
        className="fixed left-0 top-1/2 z-30 -translate-y-1/2 px-1.5 py-6 transition-all hover:px-2.5 hover:brightness-110"
        style={{
          background: accentColor,
          backdropFilter: designStyle === 'glass' ? 'blur(10px)' : 'none',
          borderRadius: designStyle === 'brutal' 
            ? '0 0.5rem 0.5rem 0' 
            : designStyle === 'neo'
            ? '0 1rem 1rem 0'
            : '0 9999px 9999px 0',
          border: designStyle === 'brutal' ? '2px solid #000' : 'none',
          borderLeft: 'none',
          boxShadow: designStyle === 'brutal' 
            ? '3px 3px 0 #000' 
            : `0 4px 15px ${accentColor}40`,
        }}
        title="Module öffnen (⌘B)"
      >
        <svg
          width="8"
          height="14"
          viewBox="0 0 8 14"
          fill="none"
          style={{ color: buttonTextColor }}
        >
          <path
            d="M1 1L7 7L1 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      {/* Volle Höhe - das Orb ist jetzt draggable und begrenzt nichts mehr */}
      <main
        className="relative w-full h-full overflow-y-auto"
        style={{ overscrollBehaviorX: 'none', touchAction: 'pan-y' }}
      >
        {children}
      </main>

      {/* Agent Cursor - visueller Cursor für Computer Use */}
      <AgentCursor />
      
      {/* Sandbox Overlay - Teaching Mode UI */}
      <SandboxOverlay />
    </div>
  );
}
