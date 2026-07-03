// ============================================
// BrowserToolbar.tsx - Browser-Navigationsleiste
// 
// Zweck: Zeigt Adressleiste, Navigation-Buttons (← → ⟳)
//        und Tab-Verwaltung
// Verwendet von: BrowserPage.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Plus, X, Loader2, CheckCircle, ServerOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBrowserStore } from '../store';

// --------------------------------------------
// Komponente: BrowserToolbar
// Navigationsleiste für den Browser
// --------------------------------------------

interface BrowserToolbarProps {
  tabId: string;
}

export function BrowserToolbar({ tabId }: BrowserToolbarProps) {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const navigate = useBrowserStore((state) => state.navigate);
  const goBack = useBrowserStore((state) => state.goBack);
  const goForward = useBrowserStore((state) => state.goForward);
  const reload = useBrowserStore((state) => state.reload);
  const createTab = useBrowserStore((state) => state.createTab);
  const closeTab = useBrowserStore((state) => state.closeTab);
  const switchTab = useBrowserStore((state) => state.switchTab);
  const updateTab = useBrowserStore((state) => state.updateTab);
  const session = useBrowserStore((state) => state.session);
  const isServiceAvailable = useBrowserStore((state) => state.isServiceAvailable);

  // Aktueller Tab aus dem Store holen
  const currentTab = tabs.find(t => t.id === tabId);
  const [urlInput, setUrlInput] = useState(currentTab?.url || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // URL-Input aktualisieren wenn Tab wechselt
  useEffect(() => {
    if (currentTab) {
      setUrlInput(currentTab.url);
    }
  }, [currentTab?.url, tabId]);

  // Enter-Taste in Adressleiste: Navigieren
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      navigate(tabId, urlInput.trim());
    }
  };

  return (
    <div className="border-b border-white/10">
      <div 
        className="flex items-center gap-2 p-2"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
      {/* ----------------------------------------
          Status-Indikator: Browser Service
          ---------------------------------------- */}
      <div className="flex items-center" title={isServiceAvailable ? 'Browser Service verbunden' : 'Browser Service nicht verbunden'}>
        {currentTab?.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        ) : isServiceAvailable && session?.sessionId ? (
          <CheckCircle className="h-4 w-4 text-emerald-400" />
        ) : (
          <ServerOff className="h-4 w-4 text-amber-400" />
        )}
      </div>
      {/* ----------------------------------------
          Navigation Buttons (← → ⟳)
          ---------------------------------------- */}
      <div className="flex items-center gap-1">
        {/* Zurück-Button */}
        <button
          onClick={() => goBack(tabId)}
          disabled={!currentTab?.canGoBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Vorwärts-Button */}
        <button
          onClick={() => goForward(tabId)}
          disabled={!currentTab?.canGoForward}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Vorwärts"
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Neu laden-Button */}
        <button
          onClick={() => reload(tabId)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          title="Neu laden"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>

      {/* ----------------------------------------
          Adressleiste
          Zeigt aktuelle URL und ermöglicht Navigation
          ---------------------------------------- */}
      <form onSubmit={handleUrlSubmit} className="flex-1">
        <input
          ref={inputRef}
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={() => {
            // URL zurücksetzen wenn Fokus verloren geht (ohne zu navigieren)
            if (currentTab) {
              setUrlInput(currentTab.url);
            }
          }}
          className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 focus:bg-white/15"
          placeholder="URL eingeben oder suchen..."
          data-agent-input="browser-url"
        />
      </form>

      {/* ----------------------------------------
          Tab-Buttons
          Zeigt alle offenen Tabs und ermöglicht Wechsel
          ---------------------------------------- */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              tab.id === activeTabId
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Favicon oder Standard-Icon */}
            <div className="h-3 w-3 rounded bg-white/20" />
            <span className="max-w-[100px] truncate">{tab.title}</span>
            
            {/* Tab schließen (nur wenn mehr als ein Tab offen) */}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </motion.button>
        ))}

        {/* Neuer Tab-Button */}
        <button
          onClick={() => createTab()}
          data-agent-button="browser-new-tab"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          title="Neuer Tab"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      </div>
    </div>
  );
}

