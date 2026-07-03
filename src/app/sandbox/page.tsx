// ============================================
// Sandbox Page - Isolierte LifeOS-Umgebung für Module-Preview
// 
// Zweck: Läuft in einem iframe und führt generierte Module
//        in einer sicheren, isolierten Umgebung aus.
//        Zeigt das Modul in einer simulierten LifeOS-Shell mit
//        Sidebar, Header und Theme-System.
// Verwendet von: SandboxPreview-Komponente im Module Builder
// ============================================

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { SandboxProvider } from './components/SandboxProvider';
import { DynamicModuleLoader } from './components/DynamicModuleLoader';
import { LifeOSShell } from './components/LifeOSShell';

// --------------------------------------------
// Typen für PostMessage-Kommunikation
// --------------------------------------------

interface ModuleFile {
  path: string;
  content: string;
}

interface ModuleData {
  files: ModuleFile[];
  moduleName: string;
  compiledCode?: string;
}

interface SandboxMessage {
  type: 'LOAD_MODULE' | 'LOAD_COMPILED_MODULE' | 'UPDATE_THEME' | 'RESET' | 'GET_STATE';
  payload?: ModuleData | { theme: string } | unknown;
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export default function SandboxPage() {
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [compiledCode, setCompiledCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // --------------------------------------------
  // PostMessage Handler
  // Empfängt Nachrichten vom Parent (Module Builder)
  // --------------------------------------------
  
  const handleMessage = useCallback((event: MessageEvent) => {
    // Sicherheitscheck: Nur Nachrichten von der eigenen Domain akzeptieren
    if (event.origin !== window.location.origin) {
      return;
    }

    const message = event.data as SandboxMessage;
    
    if (!message || typeof message.type !== 'string') {
      return;
    }

    console.log('[Sandbox] Nachricht empfangen:', message.type);

    switch (message.type) {
      case 'LOAD_MODULE':
        // Legacy: Uncompiliertes Modul (wird lokal kompiliert)
        if (message.payload) {
          setError(null);
          setCompiledCode(null);
          setModuleData(message.payload as ModuleData);
        }
        break;
        
      case 'LOAD_COMPILED_MODULE':
        // Neuer Weg: Bereits kompilierter Code
        if (message.payload) {
          const payload = message.payload as ModuleData;
          console.log('[Sandbox] Empfange kompilierten Code');
          setError(null);
          setCompiledCode(payload.compiledCode || null);
          setModuleData(payload);
        }
        break;
        
      case 'RESET':
        setModuleData(null);
        setCompiledCode(null);
        setError(null);
        break;
        
      case 'GET_STATE':
        // Sende aktuellen State zurück an Parent
        window.parent.postMessage({
          type: 'SANDBOX_STATE',
          payload: {
            isReady,
            hasModule: !!moduleData,
            hasCompiledCode: !!compiledCode,
            error,
          },
        }, window.location.origin);
        break;
        
      default:
        console.warn('[Sandbox] Unbekannte Nachricht:', message.type);
    }
  }, [isReady, moduleData, compiledCode, error]);

  // --------------------------------------------
  // Event Listener registrieren
  // --------------------------------------------
  
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    
    // Signalisiere Parent dass Sandbox bereit ist
    setIsReady(true);
    window.parent.postMessage({
      type: 'SANDBOX_READY',
      payload: { timestamp: Date.now() },
    }, '*');
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  // --------------------------------------------
  // Error Handler für Module-Fehler
  // --------------------------------------------
  
  const handleModuleError = useCallback((err: Error) => {
    console.error('[Sandbox] Modul-Fehler:', err);
    setError(err.message);
    
    // Informiere Parent über Fehler
    window.parent.postMessage({
      type: 'SANDBOX_ERROR',
      payload: { error: err.message, stack: err.stack },
    }, window.location.origin);
  }, []);

  // --------------------------------------------
  // Success Handler wenn Modul geladen
  // --------------------------------------------
  
  const handleModuleLoaded = useCallback(() => {
    console.log('[Sandbox] Modul erfolgreich geladen');
    
    window.parent.postMessage({
      type: 'SANDBOX_MODULE_LOADED',
      payload: { moduleName: moduleData?.moduleName },
    }, window.location.origin);
  }, [moduleData]);

  // --------------------------------------------
  // Render
  // --------------------------------------------
  
  return (
    <SandboxProvider>
      <LifeOSShell moduleName={moduleData?.moduleName || 'Modul Preview'}>
        {/* Fehleranzeige */}
        {error && (
          <div className="p-4 m-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-slideUp">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <span className="text-xl">⚠️</span>
              <strong>Modul-Fehler</strong>
            </div>
            <pre className="text-sm text-red-300 whitespace-pre-wrap overflow-auto max-h-40">
              {error}
            </pre>
            <button
              onClick={() => setError(null)}
              className="mt-3 px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              Fehler ausblenden
            </button>
          </div>
        )}

        {/* Warte-Zustand - Zeigt simuliertes Dashboard */}
        {!moduleData && !error && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="text-5xl mb-4 animate-pulse">🧪</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              LifeOS Sandbox bereit
            </h2>
            <p className="text-sm text-white/60 max-w-md">
              Warte auf Modul-Code vom Builder. Dein Modul wird hier in einer 
              simulierten LifeOS-Umgebung mit Mock-Daten angezeigt.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-white/40">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Verbunden mit Module Builder</span>
            </div>
            
            {/* Feature-Hinweise */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              <FeatureCard 
                icon="🎨" 
                title="Echtes Theme" 
                description="Nutzt das LifeOS Design-System"
              />
              <FeatureCard 
                icon="📊" 
                title="Mock-Daten" 
                description="Realistische Test-Daten verfügbar"
              />
              <FeatureCard 
                icon="🔄" 
                title="Live-Reload" 
                description="Änderungen werden sofort sichtbar"
              />
            </div>
          </div>
        )}

        {/* Modul-Anzeige in LifeOS Shell */}
        {moduleData && !error && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/60">Lade Modul...</p>
                </div>
              </div>
            }
          >
            <div className="animate-fadeIn">
              <DynamicModuleLoader
                compiledCode={compiledCode || undefined}
                files={moduleData.files}
                moduleName={moduleData.moduleName}
                onError={handleModuleError}
                onLoaded={handleModuleLoaded}
              />
            </div>
          </Suspense>
        )}
      </LifeOSShell>
    </SandboxProvider>
  );
}

// --------------------------------------------
// Feature Card Komponente für Warte-Zustand
// --------------------------------------------

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div 
      className="p-4 rounded-xl text-left"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-medium text-white mb-1">{title}</h3>
      <p className="text-xs text-white/50">{description}</p>
    </div>
  );
}

