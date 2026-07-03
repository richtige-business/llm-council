// ============================================
// LifeOSShell.tsx - Simulierte LifeOS-Umgebung für Sandbox
// 
// Zweck: Bietet eine realistische LifeOS-Shell-Simulation
//        mit Sidebar, Header und Theme für Modul-Tests
// Verwendet von: Sandbox Page
// ============================================

'use client';

import { ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';

// --------------------------------------------
// Typen für die Shell
// --------------------------------------------

interface LifeOSShellProps {
  children: ReactNode;
  moduleName?: string;
  moduleIcon?: string;
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export function LifeOSShell({ children, moduleName = 'Modul Preview' }: LifeOSShellProps) {
  // Vereinfachte Shell - KEIN Header, KEINE Sidebar
  // Das Modul ist eigenständig und füllt den gesamten Bereich
  // Die echte LifeOS-Shell wird vom System bereitgestellt

  return (
    <div className="lifeos-shell min-h-screen w-full relative overflow-auto">
      {/* ----------------------------------------
          Hintergrund - LifeOS Gradient
          ---------------------------------------- */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      />

      {/* Dekorative Blur-Elemente */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* ----------------------------------------
          Main Content Area - VOLLE FLÄCHE für das Modul
          ---------------------------------------- */}
      <main className="min-h-screen p-4">
        <div 
          className="h-full min-h-[calc(100vh-2rem)] rounded-2xl overflow-auto"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {children}
        </div>
      </main>

      {/* ----------------------------------------
          Sandbox Badge (zeigt an, dass dies eine Simulation ist)
          ---------------------------------------- */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
          style={{
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300 font-medium">Sandbox-Modus</span>
          <span className="text-purple-400/60">•</span>
          <span className="text-purple-400/60">{moduleName}</span>
        </div>
      </div>
    </div>
  );
}


