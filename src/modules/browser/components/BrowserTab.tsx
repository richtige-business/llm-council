// ============================================
// BrowserTab.tsx - Einzelner Browser-Tab (Screenshot-basiert)
// 
// Zweck: Rendert einen einzelnen Browser-Tab mit Screenshot
//        vom Browser Service (Puppeteer). Sendet Interaktionen
//        (Klicks, Tastatur, Scroll) an den Service.
// Verwendet von: BrowserPage.tsx
// ============================================

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { 
  Loader2,
  AlertCircle, 
  RefreshCw, 
  MousePointer2,
  Keyboard,
  ServerOff
} from 'lucide-react';
import { useBrowserStore } from '../store';
import type { BrowserTabData } from '../types';

// --------------------------------------------
// Viewport-Größe des Browser Service (muss übereinstimmen!)
// Standard: 1280x720 - wird im Browser Service konfiguriert
// --------------------------------------------
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;

// --------------------------------------------
// Komponente: BrowserTab
// Ein einzelner Browser-Tab mit Screenshot-Anzeige
// --------------------------------------------

interface BrowserTabProps {
  tab: BrowserTabData;
}

export function BrowserTab({ tab }: BrowserTabProps) {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const handleClick = useBrowserStore((state) => state.handleClick);
  const handleScroll = useBrowserStore((state) => state.handleScroll);
  const handleKeypress = useBrowserStore((state) => state.handleKeypress);
  const handleType = useBrowserStore((state) => state.handleType);
  const refreshScreenshot = useBrowserStore((state) => state.refreshScreenshot);
  const isServiceAvailable = useBrowserStore((state) => state.isServiceAvailable);
  const session = useBrowserStore((state) => state.session);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [lastClickPosition, setLastClickPosition] = useState<{x: number, y: number} | null>(null);

  // ----------------------------------------
  // Effekt: Auto-Refresh für Live-Updates
  // ----------------------------------------
  useEffect(() => {
    if (!session?.sessionId || !tab.serviceTabId || tab.isLoading || tab.hasError) {
      return;
    }

    // Auto-Refresh alle 2 Sekunden für flüssige Updates
    const interval = setInterval(() => {
      refreshScreenshot(tab.id);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [session?.sessionId, tab.serviceTabId, tab.isLoading, tab.hasError, tab.id, refreshScreenshot]);

  // ----------------------------------------
  // Berechne skalierte Koordinaten
  // Wandelt Klick-Position auf die Viewport-Größe um
  // ----------------------------------------
  const calculateScaledCoordinates = useCallback((
    clientX: number, 
    clientY: number
  ): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img) return null;

    // Bild-Rect im Viewport
    const imgRect = img.getBoundingClientRect();
    
    // Position relativ zum Bild-Element
    const relativeX = clientX - imgRect.left;
    const relativeY = clientY - imgRect.top;

    // Prüfe ob innerhalb des Bildes
    if (relativeX < 0 || relativeY < 0 || relativeX > imgRect.width || relativeY > imgRect.height) {
      return null;
    }

    // Berechne das tatsächlich angezeigte Bild (mit object-contain)
    // Das Bild behält sein Seitenverhältnis und wird zentriert
    const imgAspect = VIEWPORT_WIDTH / VIEWPORT_HEIGHT;
    const containerAspect = imgRect.width / imgRect.height;

    let renderedWidth: number;
    let renderedHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > imgAspect) {
      // Container ist breiter als das Bild - Bild wird vertikal gefüllt
      renderedHeight = imgRect.height;
      renderedWidth = imgRect.height * imgAspect;
      offsetX = (imgRect.width - renderedWidth) / 2;
    } else {
      // Container ist höher als das Bild - Bild wird horizontal gefüllt
      renderedWidth = imgRect.width;
      renderedHeight = imgRect.width / imgAspect;
      offsetY = (imgRect.height - renderedHeight) / 2;
    }

    // Prüfe ob der Klick innerhalb des gerenderten Bildes ist
    if (
      relativeX < offsetX || 
      relativeY < offsetY || 
      relativeX > offsetX + renderedWidth || 
      relativeY > offsetY + renderedHeight
    ) {
      return null;
    }

    // Koordinaten relativ zum gerenderten Bild
    const imageX = relativeX - offsetX;
    const imageY = relativeY - offsetY;

    // Skaliere auf Viewport-Größe
    const scaleX = VIEWPORT_WIDTH / renderedWidth;
    const scaleY = VIEWPORT_HEIGHT / renderedHeight;

    const scaledX = Math.round(imageX * scaleX);
    const scaledY = Math.round(imageY * scaleY);

    // Debug-Ausgabe
    console.log('Click:', { 
      clientX, clientY, 
      relativeX, relativeY,
      renderedWidth, renderedHeight,
      offsetX, offsetY,
      imageX, imageY,
      scaledX, scaledY 
    });

    return { x: scaledX, y: scaledY };
  }, []);

  // ----------------------------------------
  // Klick-Handler (NON-BLOCKING für flüssiges UI)
  // Berechnet skalierte Koordinaten und sendet an Service
  // ----------------------------------------
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !session?.sessionId || tab.hasError) return;
    
    const coords = calculateScaledCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    // Zeige Klick-Animation
    const rect = containerRef.current.getBoundingClientRect();
    setLastClickPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setLastClickPosition(null), 300);

    // Fire-and-forget: Nicht auf Response warten!
    handleClick(tab.id, coords.x, coords.y);
  }, [handleClick, tab.id, tab.hasError, session?.sessionId, calculateScaledCoordinates]);

  // ----------------------------------------
  // Doppelklick-Handler (NON-BLOCKING)
  // ----------------------------------------
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !session?.sessionId || tab.hasError) return;
    
    const coords = calculateScaledCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    // Zeige Klick-Animation
    const rect = containerRef.current.getBoundingClientRect();
    setLastClickPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setLastClickPosition(null), 300);

    // Doppelklick: Fire-and-forget
    handleClick(tab.id, coords.x, coords.y);
    setTimeout(() => handleClick(tab.id, coords.x, coords.y), 50);
  }, [handleClick, tab.id, tab.hasError, session?.sessionId, calculateScaledCoordinates]);

  // ----------------------------------------
  // Scroll-Handler (NON-BLOCKING mit Debounce)
  // ----------------------------------------
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleWheelScroll = useCallback((e: React.WheelEvent) => {
    if (!session?.sessionId || tab.hasError) return;
    
    e.preventDefault();
    
    // Scroll-Richtung und Menge
    const deltaY = Math.sign(e.deltaY) * 150;
    const deltaX = Math.sign(e.deltaX) * 150;

    // Debounce: Nur alle 100ms einen Scroll senden
    if (scrollTimeoutRef.current) return;
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
    }, 100);

    // Fire-and-forget
    handleScroll(tab.id, deltaX, deltaY);
  }, [handleScroll, tab.id, tab.hasError, session?.sessionId]);

  // ----------------------------------------
  // Tastatur-Handler (NON-BLOCKING)
  // ----------------------------------------
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!session?.sessionId || tab.hasError) return;

    // Spezielle Tasten direkt senden
    const specialKeys = ['Enter', 'Escape', 'Backspace', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'];
    
    if (specialKeys.includes(e.key)) {
      e.preventDefault();
      // Fire-and-forget
      handleKeypress(tab.id, e.key);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Einzelne Zeichen sammeln für Texteingabe
      e.preventDefault();
      setIsTyping(true);
      setTypedText(prev => prev + e.key);
    }
  }, [handleKeypress, tab.id, tab.hasError, session?.sessionId]);

  // ----------------------------------------
  // Texteingabe absenden (NON-BLOCKING)
  // ----------------------------------------
  useEffect(() => {
    if (!isTyping || !typedText) return;

    // Debounce: Warte 300ms nach letzter Eingabe
    const timeout = setTimeout(() => {
      if (typedText && session?.sessionId) {
        // Fire-and-forget
        handleType(tab.id, typedText);
        setTypedText('');
        setIsTyping(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [typedText, isTyping, handleType, tab.id, session?.sessionId]);

  // ----------------------------------------
  // Render: Fehler-Zustand
  // ----------------------------------------
  if (tab.hasError) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-red-900/20 to-black/40 p-8">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <ServerOff className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Browser Service Fehler</h3>
          <p className="text-white/60 mb-6">{tab.errorMessage || 'Ein Fehler ist aufgetreten'}</p>
          
          <div className="bg-black/30 rounded-lg p-4 text-left mb-6">
            <p className="text-xs text-white/40 mb-2">Um den Browser Service zu starten:</p>
            <code className="text-sm text-emerald-400 font-mono">
              cd ~/browser && npm run dev
            </code>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 
                       border border-white/20 rounded-xl text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Render: Lade-Zustand
  // ----------------------------------------
  if (tab.isLoading) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-black/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          <p className="text-white/60">Seite wird geladen...</p>
          <p className="text-xs text-white/40 max-w-xs text-center">{tab.url}</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Render: Kein Service verbunden
  // ----------------------------------------
  if (!isServiceAvailable || !session?.sessionId) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900/20 to-black/40 p-8">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Browser Service nicht verbunden</h3>
          <p className="text-white/60 mb-6">
            Der Browser Service muss gestartet werden, um Webseiten anzuzeigen.
          </p>
          
          <div className="bg-black/30 rounded-lg p-4 text-left mb-6">
            <p className="text-xs text-white/40 mb-2">Starte den Service mit:</p>
            <code className="text-sm text-emerald-400 font-mono block mb-2">
              cd ~/browser
            </code>
            <code className="text-sm text-emerald-400 font-mono block mb-2">
              npm install
            </code>
            <code className="text-sm text-emerald-400 font-mono block">
              npm run dev
            </code>
          </div>

          <p className="text-xs text-white/40">
            Der Service läuft dann auf http://localhost:3001
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Render: Kein Screenshot vorhanden
  // ----------------------------------------
  if (!tab.screenshot) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900/20 to-black/40">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 text-white/40" />
          <p className="text-white/60">Kein Screenshot verfügbar</p>
          <button
            onClick={() => refreshScreenshot(tab.id)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 
                       rounded-lg text-white text-sm transition-colors"
          >
            Screenshot laden
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // Render: Screenshot-Anzeige mit Interaktion
  // ----------------------------------------
  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black focus:outline-none cursor-pointer"
      onClick={handleMouseClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheelScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Browser-Ansicht"
    >
      {/* ----------------------------------------
          Screenshot-Bild
          Zeigt den aktuellen Zustand der Seite
          ---------------------------------------- */}
      <img
        ref={imgRef}
        src={tab.screenshot}
        alt={tab.title || 'Browser Screenshot'}
        className="w-full h-full object-contain select-none"
        draggable={false}
        style={{ imageRendering: 'auto' }}
      />

      {/* Loader entfernt für flüssiges UI */}

      {/* ----------------------------------------
          Klick-Animation
          Zeigt wo geklickt wurde
          ---------------------------------------- */}
      {lastClickPosition && (
        <div
          className="absolute w-8 h-8 rounded-full bg-blue-500/50 animate-ping pointer-events-none"
          style={{
            left: lastClickPosition.x - 16,
            top: lastClickPosition.y - 16,
          }}
        />
      )}

      {/* ----------------------------------------
          Typing-Indikator
          Zeigt dass Text eingegeben wird
          ---------------------------------------- */}
      {isTyping && typedText && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 
                        bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg
                        flex items-center gap-2 z-10">
          <Keyboard className="h-4 w-4 text-blue-400" />
          <span className="text-white font-mono">{typedText}</span>
          <span className="animate-pulse text-white">|</span>
        </div>
      )}

      {/* ----------------------------------------
          Interaktions-Hinweis
          Zeigt verfügbare Aktionen
          ---------------------------------------- */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 
                      px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 
                      rounded-lg text-xs text-white/40 pointer-events-none">
        <MousePointer2 className="h-3 w-3" />
        <span>Klicken</span>
        <span className="text-white/20">|</span>
        <span>Scrollen</span>
        <span className="text-white/20">|</span>
        <Keyboard className="h-3 w-3" />
        <span>Tippen</span>
      </div>

      {/* ----------------------------------------
          Screenshot-Timestamp
          Zeigt wann der Screenshot gemacht wurde
          ---------------------------------------- */}
      {tab.lastScreenshotAt && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm 
                        border border-white/10 rounded text-xs text-white/40 pointer-events-none">
          {new Date(tab.lastScreenshotAt).toLocaleTimeString('de-DE')}
        </div>
      )}
    </div>
  );
}
