// ============================================
// LifeOS Module Builder - Preview Panel (WebContainer)
//
// Zweck: Live-Vorschau des generierten Moduls via WebContainer
//        Nutzt einen echten Vite Dev-Server statt new Function() Sandbox
//        Alle npm-Pakete werden real installiert (kein Mocking!)
//
// Architektur:
//   Preview.tsx → iframe /sandbox/wc → WebContainer → Vite Dev-Server
//   Kommunikation via postMessage (WC_MOUNT_FILES / WC_STATUS)
//
// Verwendet von: Workbench
// ============================================

'use client';

import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Bot,
  BotOff,
  Package,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/app-store';
import type { FileMap, FileEntry } from '../../stores/files-store';
import { useWorkbenchStore } from '../../stores/workbench-store';
import type { StructuredPreviewError } from '@/lib/lab/debug/types';

const SHARED_PREVIEW_IFRAME_ID = 'lifeos-shared-preview-iframe';
const SHARED_PREVIEW_PARKING_ID = 'lifeos-shared-preview-parking';

function ensureSharedPreviewParking(): HTMLDivElement {
  let parking = document.getElementById(SHARED_PREVIEW_PARKING_ID) as HTMLDivElement | null;
  if (parking) return parking;

  parking = document.createElement('div');
  parking.id = SHARED_PREVIEW_PARKING_ID;
  parking.style.position = 'fixed';
  parking.style.width = '1px';
  parking.style.height = '1px';
  parking.style.opacity = '0';
  parking.style.pointerEvents = 'none';
  parking.style.overflow = 'hidden';
  parking.style.left = '-9999px';
  parking.style.top = '-9999px';
  document.body.appendChild(parking);
  return parking;
}

function ensureSharedPreviewIframe(): HTMLIFrameElement {
  let iframe = document.getElementById(SHARED_PREVIEW_IFRAME_ID) as HTMLIFrameElement | null;
  if (iframe) return iframe;

  iframe = document.createElement('iframe');
  iframe.id = SHARED_PREVIEW_IFRAME_ID;
  iframe.src = '/sandbox/wc';
  iframe.className = 'w-full h-full border-0 bg-gray-900';
  iframe.setAttribute('allow', 'cross-origin-isolated');
  iframe.setAttribute('title', 'WebContainer Preview');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  ensureSharedPreviewParking().appendChild(iframe);
  return iframe;
}

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  container?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface PreviewProps {
  files: FileMap;
  isStreaming?: boolean;
  themeStyles?: ThemeStyles;
  moduleName?: string;
  projectKey?: string;
}

// --------------------------------------------
// Device Presets
// --------------------------------------------

type DeviceType = 'desktop' | 'tablet' | 'mobile';

// --------------------------------------------
// Sandbox Status
// Erweitert um WebContainer-spezifische Zustaende
// --------------------------------------------

type SandboxStatus =
  | 'connecting'  // Iframe laedt, WebContainer bootet
  | 'installing'  // npm install laeuft
  | 'starting'    // Vite startet
  | 'ready'       // Vite laeuft, bereit fuer Dateien
  | 'loading'     // Dateien werden gemountet
  | 'success'     // Modul wird angezeigt
  | 'error';      // Fehler aufgetreten

// --------------------------------------------
// Komponente
// --------------------------------------------

export const Preview = memo(function Preview({
  files,
  isStreaming,
  themeStyles,
  moduleName = 'Modul',
  projectKey,
}: PreviewProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const isIsolated = typeof window !== 'undefined' ? window.crossOriginIsolated : null;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeMountRef = useRef<HTMLDivElement>(null);
  const lastSentFilesRef = useRef<string>('');
  const prevProjectKeyRef = useRef<string | undefined>(projectKey);

  // Intelligence Orb - Versteckt im Preview-Modus
  const hideIntelligenceOrb = useAppStore((state) => state.hideIntelligenceOrb);
  const setHideIntelligenceOrb = useAppStore((state) => state.setHideIntelligenceOrb);
  const pushPreviewError = useWorkbenchStore((state) => state.pushPreviewError);
  const clearPreviewErrors = useWorkbenchStore((state) => state.clearPreviewErrors);
  const lastPreviewError = useWorkbenchStore((state) => state.lastPreviewError);

  useEffect(() => {
    setHideIntelligenceOrb(true);
    return () => setHideIntelligenceOrb(false);
  }, [setHideIntelligenceOrb]);

  // --------------------------------------------
  // Shared Iframe Mounting
  // Reused dieselbe Sandbox-Instanz zwischen Projektwechseln
  // --------------------------------------------

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!iframeMountRef.current) return;

    const sharedIframe = ensureSharedPreviewIframe();
    iframeMountRef.current.appendChild(sharedIframe);
    iframeRef.current = sharedIframe;

    // Handshake: bestehende Sandbox soll aktuellen Status erneut senden
    const ping = () => {
      try {
        sharedIframe.contentWindow?.postMessage({ type: 'WC_PING' }, '*');
      } catch {
        // ignore
      }
    };

    ping();
    let attempts = 0;
    const pingInterval = window.setInterval(() => {
      attempts += 1;
      ping();
      if (attempts >= 5) {
        window.clearInterval(pingInterval);
      }
    }, 500);

    return () => {
      window.clearInterval(pingInterval);
      const parking = ensureSharedPreviewParking();
      if (sharedIframe.parentElement !== parking) {
        parking.appendChild(sharedIframe);
      }
    };
  }, []);

  // --------------------------------------------
  // Projektwechsel: Shared Sandbox hart neu starten
  // Verhindert Alt-Dateien zwischen Projekten
  // --------------------------------------------

  useEffect(() => {
    const previousProjectKey = prevProjectKeyRef.current;
    prevProjectKeyRef.current = projectKey;

    if (!iframeRef.current) return;
    if (!previousProjectKey || !projectKey) return;
    if (previousProjectKey === projectKey) return;

    console.log(`[Preview] Projektwechsel: ${previousProjectKey} -> ${projectKey}, starte Sandbox neu`);
    lastSentFilesRef.current = '';
    iframeRef.current.src = '/sandbox/wc';
  }, [projectKey]);

  useEffect(() => {
    clearPreviewErrors();
  }, [projectKey, clearPreviewErrors]);

  const isolationError = isIsolated === false
    ? 'WebContainer kann nicht starten: crossOriginIsolated=false. Bitte die gesamte Seite hart neu laden (Cmd+Shift+R), damit COEP/COOP Header greifen.'
    : null;

  const {
    surface,
    accentColor = '#8b5cf6',
    designStyle = 'glass',
    textColor = '#ffffff'
  } = themeStyles || {};
  const effectiveError = error || isolationError;

  // --------------------------------------------
  // Datei-Array und Hash memoizen
  // Verhindert unnoetige Re-Renders und Re-Sends
  // --------------------------------------------

  const fileArray = useMemo(() =>
    Object.entries(files)
      .filter(([, entry]) => entry?.type === 'file')
      .map(([path, entry]) => ({
        path,
        content: (entry as FileEntry).content,
      })),
    [files]
  );

  // Hash ueber Datei-Inhalte fuer Duplikat-Erkennung
  const filesHash = useMemo(() => JSON.stringify(fileArray), [fileArray]);

  // Gibt es eine Hauptkomponente (.tsx/.jsx)?
  const hasComponentFile = useMemo(() =>
    fileArray.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx')),
    [fileArray]
  );

  // Pfad-Key fuer Struktur-Aenderungen im aktuellen Projekt
  const filePathsKey = useMemo(() =>
    fileArray.map(f => f.path).sort().join(','),
    [fileArray]
  );

  // --------------------------------------------
  // Refs fuer stabile Funktions-Referenzen
  // --------------------------------------------

  const sandboxStatusRef = useRef<SandboxStatus>(sandboxStatus);
  const prevFilePathsRef = useRef<string>('');

  useEffect(() => {
    sandboxStatusRef.current = sandboxStatus;
  }, [sandboxStatus]);

  // --------------------------------------------
  // Struktur-Aenderung erkennen
  // Bei neuem Datei-Set: Hash zuruecksetzen
  // --------------------------------------------

  useEffect(() => {
    if (prevFilePathsRef.current !== '' && prevFilePathsRef.current !== filePathsKey) {
      console.log('[Preview] Projektwechsel erkannt, resette Hash');
      lastSentFilesRef.current = '';
    }
    prevFilePathsRef.current = filePathsKey;
  }, [filePathsKey]);

  // --------------------------------------------
  // Force-Send Funktion (fuer manuellen Refresh)
  // Der automatische Send passiert im useEffect weiter unten
  // --------------------------------------------

  const forceSendFiles = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !hasComponentFile) return;
    if (isIsolated !== true) return;

    console.log('[Preview] 🔄 Force-Send:', fileArray.map(f => f.path));
    lastSentFilesRef.current = filesHash;

    iframeRef.current.contentWindow.postMessage({
      type: 'WC_MOUNT_FILES',
      files: fileArray,
    }, '*');
  }, [isIsolated, hasComponentFile, fileArray, filesHash]);

  // --------------------------------------------
  // PostMessage Handler fuer WebContainer-Status
  // Empfaengt Status-Updates von der Sandbox-Seite
  // --------------------------------------------

  useEffect(() => {
    const handleSandboxMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message.type !== 'string') return;

      if (message.type === 'WC_PREVIEW_ERROR') {
        const incoming = message.error as Partial<StructuredPreviewError> | undefined;
        const structuredError: StructuredPreviewError = {
          kind: incoming?.kind || 'unknown',
          message: incoming?.message || 'Unbekannter Preview-Fehler',
          file: incoming?.file,
          line: incoming?.line,
          column: incoming?.column,
          stack: incoming?.stack,
          componentStack: incoming?.componentStack,
          availableExports: incoming?.availableExports,
          timestamp: typeof incoming?.timestamp === 'number' ? incoming.timestamp : Date.now(),
        };

        pushPreviewError(structuredError);
        setSandboxStatus('error');
        setError(structuredError.message);
        return;
      }

      if (message.type === 'WC_PREVIEW_OK') {
        setError(null);
        if (sandboxStatusRef.current !== 'connecting') {
          setSandboxStatus('ready');
        }
        return;
      }

      // WebContainer Status-Updates
      if (message.type === 'WC_STATUS') {
        const wcStatus = message.status as string;

        switch (wcStatus) {
          case 'booting':
            setSandboxStatus('connecting');
            break;
          case 'installing':
            setSandboxStatus('installing');
            break;
          case 'starting':
            setSandboxStatus('starting');
            break;
          case 'ready':
            setSandboxStatus('ready');
            setError(null);
            break;
          case 'updating':
            // Ignorieren - stiller Mount ohne Status-Wechsel
            // Verhindert Flackern des Status-Badges
            break;
          case 'error':
            setSandboxStatus('error');
            setError(message.message || 'WebContainer-Fehler');
            break;
        }
      }
    };

    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, [pushPreviewError]);

  // --------------------------------------------
  // Auto-Update: Dateien an Sandbox senden
  // Einfache Logik: Sende wenn ALLE Bedingungen erfuellt sind
  // Der Hash in sendFilesToSandbox verhindert Doppel-Sends
  // --------------------------------------------

  useEffect(() => {
    // Alle Bedingungen muessen erfuellt sein
    if (!hasComponentFile) return;
    if (isIsolated !== true) return;
    if (sandboxStatus === 'connecting' || sandboxStatus === 'error') return;
    if (lastSentFilesRef.current === filesHash) return;

    // Debounce: 500ms nach letzter Aenderung
    const timeout = setTimeout(() => {
      if (!iframeRef.current?.contentWindow) return;

      console.log('[Preview] 📤 Sende Dateien an WebContainer:', fileArray.map(f => f.path));
      lastSentFilesRef.current = filesHash;

      iframeRef.current.contentWindow.postMessage({
        type: 'WC_MOUNT_FILES',
        files: fileArray,
      }, '*');
    }, 500);

    return () => clearTimeout(timeout);
  }, [filesHash, hasComponentFile, sandboxStatus, isIsolated, fileArray]);

  // --------------------------------------------
  // Manuelles Refresh
  // Erzwingt erneutes Senden der Dateien
  // --------------------------------------------

  const handleRefresh = useCallback(() => {
    const status = sandboxStatusRef.current;
    if (status === 'ready' || status === 'loading') {
      // Leichter Refresh: Dateien neu senden
      lastSentFilesRef.current = '';
      forceSendFiles();
    } else {
      // Harter Refresh: Iframe komplett neu laden
      lastSentFilesRef.current = '';
      if (iframeRef.current) {
        iframeRef.current.src = '/sandbox/wc';
        setSandboxStatus('connecting');
      }
    }
  }, [forceSendFiles]);

  const handleHardReload = useCallback(() => {
    // COEP/COOP werden nur bei einem echten Document-Reload aktiv.
    // Ein iframe-Reload reicht nicht aus, wenn man per Client-Navigation
    // in den Builder gekommen ist.
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  // --------------------------------------------
  // Status-Anzeige
  // Erweitert um WebContainer-spezifische Zustaende
  // --------------------------------------------

  const renderStatusIcon = () => {
    switch (sandboxStatus) {
      case 'connecting':
        return <WifiOff className="w-3 h-3 text-yellow-500 animate-pulse" />;
      case 'installing':
        return <Package className="w-3 h-3 text-purple-400 animate-pulse" />;
      case 'starting':
        return <Zap className="w-3 h-3 text-blue-400 animate-pulse" />;
      case 'ready':
        return <Wifi className="w-3 h-3 text-blue-400" />;
      case 'loading':
        return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (sandboxStatus) {
      case 'connecting':
        return 'Starte...';
      case 'installing':
        return 'Installiere Pakete...';
      case 'starting':
        return 'Starte Vite...';
      case 'ready':
        return hasComponentFile ? 'Bereit' : 'Warte auf Code';
      case 'loading':
        return 'Aktualisiere...';
      case 'success':
        return 'Live';
      case 'error':
        return 'Fehler';
    }
  };

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: surface?.base?.background || 'rgba(0,0,0,0.2)',
          borderBottom: designStyle === 'brutal'
            ? '2px solid #000'
            : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: textColor }}>
            Live Preview
          </span>

          {/* Status Badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
            style={{
              background: sandboxStatus === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : sandboxStatus === 'ready'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : sandboxStatus === 'installing'
                    ? 'rgba(139, 92, 246, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
              color: sandboxStatus === 'error'
                ? '#fca5a5'
                : sandboxStatus === 'ready'
                  ? '#86efac'
                  : sandboxStatus === 'installing'
                    ? '#c4b5fd'
                    : `${textColor}99`,
            }}
          >
            {renderStatusIcon()}
            <span>{getStatusText()}</span>
          </div>

          {lastPreviewError && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
              }}
              title={lastPreviewError.message}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Debug: {lastPreviewError.kind}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Device Switcher */}
          <div
            className="flex items-center p-1"
            style={{
              background: surface?.base?.background || 'rgba(255,255,255,0.05)',
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            }}
          >
            {(['mobile', 'tablet', 'desktop'] as DeviceType[]).map((deviceType) => (
              <button
                key={deviceType}
                onClick={() => setDevice(deviceType)}
                className="p-1.5 rounded transition-colors"
                style={{
                  background: device === deviceType
                    ? designStyle === 'brutal' ? accentColor : 'rgba(255,255,255,0.1)'
                    : 'transparent',
                  color: device === deviceType ? textColor : `${textColor}66`,
                }}
                title={deviceType === 'mobile' ? 'Mobil' : deviceType === 'tablet' ? 'Tablet' : 'Desktop'}
              >
                {deviceType === 'mobile' && <Smartphone className="w-4 h-4" />}
                {deviceType === 'tablet' && <Tablet className="w-4 h-4" />}
                {deviceType === 'desktop' && <Monitor className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={sandboxStatus === 'connecting'}
            className="p-1.5 rounded transition-colors disabled:opacity-50 hover:bg-white/10"
            style={{
              color: `${textColor}66`,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
            title="Neu laden"
          >
            <RefreshCw className={cn('w-4 h-4', sandboxStatus === 'loading' && 'animate-spin')} />
          </button>

          {/* Open in new tab */}
          <button
            onClick={() => window.open('/sandbox/wc', '_blank')}
            className="p-1.5 rounded transition-colors hover:bg-white/10"
            style={{
              color: `${textColor}66`,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
            title="In neuem Tab oeffnen"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Intelligence Orb Toggle */}
          <button
            onClick={() => setHideIntelligenceOrb(!hideIntelligenceOrb)}
            className="p-1.5 rounded transition-colors hover:bg-white/10"
            style={{
              color: hideIntelligenceOrb ? `${textColor}66` : accentColor,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
            title={hideIntelligenceOrb ? 'Chat-Orb einblenden' : 'Chat-Orb ausblenden'}
          >
            {hideIntelligenceOrb ? <BotOff className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div
        className="flex-1 flex items-center justify-center p-0 overflow-hidden"
        style={{ background: 'rgba(26,26,46,0.8)' }}
      >
        {/* Error Overlay */}
        {effectiveError && (
          <div
            className="absolute inset-4 z-10 flex items-center justify-center pointer-events-none"
          >
            <div
              className="p-4 rounded-xl max-w-md text-center pointer-events-auto"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
              <p className="text-red-300 text-sm">{effectiveError}</p>
              <button
                onClick={isIsolated === false ? handleHardReload : handleRefresh}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
              >
                {isIsolated === false ? 'Seite neu laden' : 'Erneut versuchen'}
              </button>
            </div>
          </div>
        )}

        {/* WebContainer Sandbox iframe */}
        <motion.div
          key={device}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'relative overflow-hidden',
            device === 'mobile' && 'w-[375px] h-[667px]',
            device === 'tablet' && 'w-[768px] h-[600px]',
            device === 'desktop' && 'w-full h-full'
          )}
          style={{
            borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
            boxShadow: designStyle === 'brutal'
              ? '6px 6px 0 #000'
              : '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: designStyle === 'brutal' ? '3px solid #000' : 'none',
          }}
        >
          {/* WebContainer-basiertes Sandbox iframe (shared instance) */}
          <div ref={iframeMountRef} className="w-full h-full" />

          {/* Warte-Overlay: Noch keine Dateien generiert */}
          {!hasComponentFile && !isStreaming && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
            >
              <div className="text-center">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: textColor }} />
                <p className="text-sm" style={{ color: `${textColor}99` }}>
                  Starte eine Generierung
                </p>
                <p className="text-xs mt-1" style={{ color: `${textColor}66` }}>
                  um die Live-Vorschau zu sehen
                </p>
              </div>
            </div>
          )}

          {/* Streaming-Overlay: LLM generiert gerade */}
          {isStreaming && !hasComponentFile && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">🏗️</div>
                <p style={{ color: textColor }}>Modul wird generiert...</p>
                <p className="text-xs mt-2" style={{ color: `${textColor}66` }}>
                  {fileArray.length} Datei{fileArray.length !== 1 ? 'en' : ''} bisher
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
});
