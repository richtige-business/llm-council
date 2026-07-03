// ============================================
// BrowserPage.tsx - Haupt-Browser-Komponente
// 
// Zweck: Hauptansicht des Browser-Moduls
//        Verwaltet Tabs und rendert BrowserToolbar + BrowserTab
// Verwendet von: TabContent.tsx (wenn Browser-Modul als Tab geöffnet wird)
// ============================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, ServerOff, RefreshCw } from 'lucide-react';
import { useBrowserStore } from '../store';
import { BrowserToolbar } from './BrowserToolbar';
import { BrowserTab } from './BrowserTab';
import { BROWSER_MODULE_INFO } from '../constants';
import { ModuleSettingsButton } from '@/components/agent';

// --------------------------------------------
// Komponente: BrowserPage
// Hauptansicht des Browsers
// --------------------------------------------

export function BrowserPage() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const createTab = useBrowserStore((state) => state.createTab);
  const initSession = useBrowserStore((state) => state.initSession);
  const checkServiceHealth = useBrowserStore((state) => state.checkServiceHealth);
  const isServiceAvailable = useBrowserStore((state) => state.isServiceAvailable);
  const session = useBrowserStore((state) => state.session);

  // ----------------------------------------
  // Lokaler State für Initialisierung
  // ----------------------------------------
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // ----------------------------------------
  // Auto-Retry: Alle 5 Sekunden prüfen ob der Service gestartet wurde
  // Stoppt automatisch wenn Service erreichbar ist
  // ----------------------------------------
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const startAutoRetry = useCallback(() => {
    // Bereits laufendes Interval stoppen
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }
    retryIntervalRef.current = setInterval(async () => {
      const isHealthy = await checkServiceHealth();
      setRetryCount((prev) => prev + 1);
      if (isHealthy) {
        // Service ist da - Interval stoppen und Session initialisieren
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
        setInitError(null);
        setIsInitializing(true);
        await initSession();
        const currentTabs = useBrowserStore.getState().tabs;
        if (currentTabs.length === 0) {
          await createTab();
        }
        setIsInitializing(false);
      }
    }, 5000);
  }, [checkServiceHealth, initSession, createTab]);

  // Cleanup: Interval beim Unmount stoppen
  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, []);

  // ----------------------------------------
  // Effekt: Session initialisieren beim Mount
  // Prüft Service-Verfügbarkeit und startet Session
  // ----------------------------------------
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setIsInitializing(true);
        setInitError(null);

        // 1. Prüfe ob Browser Service erreichbar ist
        const isHealthy = await checkServiceHealth();
        
        if (!mounted) return;

        if (!isHealthy) {
          setInitError('Browser Service nicht erreichbar. Bitte starte den Service.');
          setIsInitializing(false);
          // Auto-Retry starten damit wir erkennen wenn der Service gestartet wird
          startAutoRetry();
          return;
        }

        // 2. Session initialisieren (oder bestehende wiederverwenden)
        await initSession();
        
        if (!mounted) return;

        // 3. Ersten Tab erstellen wenn keine vorhanden
        const currentTabs = useBrowserStore.getState().tabs;
        if (currentTabs.length === 0) {
          await createTab();
        }

        setIsInitializing(false);
        
      } catch (error) {
        console.error('[BrowserPage] Initialisierung fehlgeschlagen:', error);
        if (mounted) {
          setInitError('Verbindung zum Browser Service fehlgeschlagen');
          setIsInitializing(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []); // Nur einmal beim Mount

  // ----------------------------------------
  // Effekt: Tab erstellen wenn Session da aber keine Tabs
  // ----------------------------------------
  useEffect(() => {
    if (session?.sessionId && tabs.length === 0 && !isInitializing) {
      createTab();
    }
  }, [session?.sessionId, tabs.length, createTab, isInitializing]);

  // Aktueller aktiver Tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // ----------------------------------------
  // Retry-Handler für erneuten Verbindungsversuch
  // ----------------------------------------
  const handleRetry = async () => {
    setIsInitializing(true);
    setInitError(null);

    const isHealthy = await checkServiceHealth();
    
    if (!isHealthy) {
      setInitError('Browser Service nicht erreichbar. Bitte starte den Service.');
      setIsInitializing(false);
      return;
    }

    await initSession();
    
    const currentTabs = useBrowserStore.getState().tabs;
    if (currentTabs.length === 0) {
      await createTab();
    }

    setIsInitializing(false);
  };

  // ----------------------------------------
  // Render: Initialisierung läuft
  // ----------------------------------------
  if (isInitializing) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black/70 backdrop-blur-2xl">
        <div className="flex flex-col items-center gap-4 p-8">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          <h3 className="text-lg font-medium text-white">Browser wird initialisiert...</h3>
          <p className="text-sm text-white/60">Verbindung zum Browser Service wird hergestellt</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Render: Fehler bei Initialisierung
  // ----------------------------------------
  if (initError || !isServiceAvailable) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black/70 backdrop-blur-2xl p-8">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 max-w-md text-center">
          <ServerOff className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Browser Service nicht verbunden</h3>
          <p className="text-white/60 mb-6">
            {initError || 'Der Browser Service muss gestartet werden, um Webseiten anzuzeigen.'}
          </p>
          
          <div className="bg-black/30 rounded-lg p-4 text-left mb-6">
            <p className="text-xs text-white/40 mb-2">Starte den Service mit:</p>
            <code className="text-sm text-emerald-400 font-mono block mb-2">
              cd browser-service
            </code>
            <code className="text-sm text-emerald-400 font-mono block mb-2">
              npm install
            </code>
            <code className="text-sm text-emerald-400 font-mono block">
              npm run dev
            </code>
          </div>

          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 
                       border border-white/20 rounded-xl text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut verbinden
          </button>
          
          {/* Auto-Retry Indikator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-xs text-white/50">
              Automatische Erkennung aktiv – warte auf Service...
            </p>
          </div>
          
          <p className="text-xs text-white/40 mt-2">
            Der Service läuft dann auf http://localhost:3001
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Render: Hauptansicht
  // ----------------------------------------
  return (
    <div className="flex h-full flex-col overflow-hidden bg-black/60 backdrop-blur-xl" data-agent-panel="browser-root">
      {/* ----------------------------------------
          Browser Toolbar
          Navigationsleiste mit Adressleiste
          ---------------------------------------- */}
      {activeTab && (
        <BrowserToolbar tabId={activeTab.id} />
      )}

      {/* ----------------------------------------
          Browser Tab Content
          Zeigt den aktiven Tab mit Screenshot
          ---------------------------------------- */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <BrowserTab tab={activeTab} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              <p className="text-white/60">Tab wird erstellt...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Agent Settings Button */}
      <ModuleSettingsButton
        moduleId={BROWSER_MODULE_INFO.id}
        moduleName={BROWSER_MODULE_INFO.name}
        moduleColor={BROWSER_MODULE_INFO.color}
      />
    </div>
  );
}


