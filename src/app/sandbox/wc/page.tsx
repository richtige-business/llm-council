// ============================================
// LifeOS Module Builder - WebContainer Sandbox
//
// Zweck: Isolierte Preview-Umgebung mit echtem Vite Dev-Server
// Ersetzt die alte Sandbox die auf new Function() + Mocking basierte
// Nutzt WebContainers (StackBlitz) fuer echte npm-Pakete und HMR
//
// Architektur:
// 1. Boot: WebContainer starten (einmalig)
// 2. Pre-Install: npm install laeuft parallel zur LLM-Generierung
// 3. Vite: Echter Dev-Server mit Hot Module Replacement
// 4. Updates: Dateien per postMessage empfangen, Vite HMR aktualisiert
//
// Verwendet von: Preview.tsx (eingebettet als iframe)
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// --------------------------------------------
// Status-Typen fuer die WebContainer-Lifecycle
// --------------------------------------------

type WCStatus =
  | 'booting'     // WebContainer wird initialisiert
  | 'installing'  // npm install laeuft
  | 'starting'    // Vite Dev-Server startet
  | 'ready'       // Vite laeuft, bereit fuer Dateien
  | 'updating'    // Neue Dateien werden gemountet
  | 'error';      // Fehler aufgetreten

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export default function WebContainerSandboxPage() {
  // State
  const [status, setStatus] = useState<WCStatus>('booting');
  const [statusMessage, setStatusMessage] = useState('Starte Umgebung...');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef<WCStatus>('booting');
  const errorRef = useRef<string | null>(null);

  // Refs - persistent ueber Re-Renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isInstalledRef = useRef(false);
  const isBootedRef = useRef(false);
  const pendingFilesRef = useRef<Array<{ path: string; content: string }> | null>(null);
  // Merkt sich den aktuellen Entry-Point damit main.tsx nur bei Aenderung
  // neu geschrieben wird (vermeidet Vite Full-Reload)
  const currentEntryRef = useRef<string>('App.tsx');

  useEffect(() => {
    statusRef.current = status;
    errorRef.current = error;
  }, [status, error]);

  // --------------------------------------------
  // Helper: Status an Parent-Fenster melden
  // Preview.tsx hoert auf diese Messages
  // --------------------------------------------

  const reportStatus = useCallback((wcStatus: string, message?: string) => {
    try {
      window.parent.postMessage({
        type: 'WC_STATUS',
        status: wcStatus,
        message,
      }, '*');
    } catch {
      // postMessage kann fehlschlagen wenn kein Parent existiert
    }
  }, []);

  // --------------------------------------------
  // Helper: Modul-Dateien in WebContainer mounten
  // Konvertiert flache File-Liste zu WebContainer FileSystemTree
  // --------------------------------------------

  const mountModuleFiles = useCallback(async (
    files: Array<{ path: string; content: string }>,
  ) => {
    const container = containerRef.current;
    if (!container) return;

    try {
      // Dynamischer Import um SSR-Probleme zu vermeiden
      const { buildModuleFileTree } = await import('@/lib/webcontainer/templates');
      const { tree, entryFile } = buildModuleFileTree(files);

      // WICHTIG: main.tsx nur bei Entry-Aenderung schreiben!
      // main.tsx ist der Vite Entry-Point. Wenn er sich aendert,
      // macht Vite einen FULL RELOAD (schwarzer Bildschirm → Flackern).
      // Bei gleichen Dateien reicht Vite HMR fuer sanftes Update.
      if (entryFile === currentEntryRef.current) {
        // Entry-Point unveraendert: main.tsx aus dem Tree entfernen
        const srcDir = tree['src'] as { directory: Record<string, unknown> } | undefined;
        if (srcDir?.directory?.['main.tsx']) {
          delete srcDir.directory['main.tsx'];
          console.log('[WC] ⏭️ main.tsx uebersprungen (Entry unveraendert)');
        }
      } else {
        // Entry-Point hat sich geaendert: main.tsx muss neu geschrieben werden
        currentEntryRef.current = entryFile;
        console.log(`[WC] 📝 main.tsx aktualisiert (neuer Entry: ${entryFile})`);
      }

      // Dateien in den WebContainer mounten (merge mit bestehendem FS)
      await container.mount(tree);

      console.log(`[WC] ✅ ${files.length} Modul-Dateien gemountet, Entry: ${entryFile}`);
    } catch (err) {
      console.error('[WC] ❌ Mount-Fehler:', err);
      throw err;
    }
  }, []);

  // --------------------------------------------
  // Boot-Sequenz (einmalig beim Laden der Seite)
  //
  // Optimierung: npm install startet sofort mit Placeholder-App
  // Wenn der User seinen Prompt schreibt und das LLM generiert,
  // laeuft npm install bereits im Hintergrund (~15-30 Sek)
  // Sobald das Modul fertig generiert ist, sind die Pakete schon da
  // --------------------------------------------

  useEffect(() => {
    // Verhindere doppeltes Booten (React Strict Mode)
    if (isBootedRef.current) return;
    isBootedRef.current = true;

    async function boot() {
      try {
        // --------------------------------------------
        // Cross-Origin-Isolation Check
        // WebContainer benoetigt SharedArrayBuffer
        // --------------------------------------------

        if (!self.crossOriginIsolated) {
          const isolationMessage = [
            'WebContainer kann nicht starten.',
            'crossOriginIsolated=false (COEP/COOP fehlen).',
            'Bitte Hard-Refresh (Cmd+Shift+R) und Response-Header pruefen.',
          ].join(' ');

          setStatus('error');
          setError(isolationMessage);
          setStatusMessage('Fehler: COEP/COOP fehlen');
          reportStatus('error', isolationMessage);
          return;
        }

        // Schritt 1: WebContainer initialisieren
        setStatus('booting');
        setStatusMessage('Starte WebContainer...');
        reportStatus('booting', 'Starte WebContainer...');

        const { WebContainer } = await import('@webcontainer/api');
        const container = await WebContainer.boot();
        containerRef.current = container;
        console.log('[WC] ✅ WebContainer gebootet');

        // Schritt 2: Basis-Projektstruktur mounten
        setStatusMessage('Erstelle Projektstruktur...');
        const { getBaseProjectTree } = await import('@/lib/webcontainer/templates');
        await container.mount(getBaseProjectTree());
        console.log('[WC] ✅ Basis-Projekt gemountet');

        // Schritt 3: npm install (der langsame Teil)
        setStatus('installing');
        setStatusMessage('Installiere Pakete...');
        reportStatus('installing', 'Installiere React, Tailwind, Zustand, Framer Motion...');

        const installProcess = await container.spawn('npm', ['install']);

        // npm-Output fuer Debugging streamen
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('[WC npm]', data);
          },
        }));

        const exitCode = await installProcess.exit;

        if (exitCode !== 0) {
          throw new Error(`npm install fehlgeschlagen (Exit Code: ${exitCode})`);
        }

        isInstalledRef.current = true;
        console.log('[WC] ✅ npm install erfolgreich');

        // Schritt 3b: Falls waehrenddessen Modul-Dateien angekommen sind
        // Jetzt mounten, damit Vite direkt das echte Modul anzeigt
        if (pendingFilesRef.current) {
          setStatusMessage('Lade Modul...');
          await mountModuleFiles(pendingFilesRef.current);
          pendingFilesRef.current = null;
        }

        // Schritt 4: Vite Dev-Server starten
        setStatus('starting');
        setStatusMessage('Starte Dev-Server...');
        reportStatus('starting', 'Starte Vite Dev-Server...');

        const devProcess = await container.spawn('npx', ['vite', '--host']);

        // Vite-Output fuer Debugging streamen
        devProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('[WC vite]', data);
          },
        }));

        // Schritt 5: Warte auf Server-Ready Event
        // WebContainer feuert dieses Event wenn Vite auf einem Port lauscht
        container.on('server-ready', (port: number, url: string) => {
          console.log(`[WC] ✅ Dev-Server bereit: port=${port}, url=${url}`);
          setServerUrl(url);
          setStatus('ready');
          setStatusMessage('Bereit');
          reportStatus('ready');
        });

      } catch (err) {
        console.error('[WC] ❌ Fehler:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('error');
        setError(msg);
        setStatusMessage(`Fehler: ${msg}`);
        reportStatus('error', msg);
      }
    }

    boot();
  }, [reportStatus, mountModuleFiles]);

  // --------------------------------------------
  // PostMessage Handler
  // Empfaengt Modul-Dateien vom Parent (Preview.tsx)
  //
  // Message-Format:
  // { type: 'WC_MOUNT_FILES', files: Array<{path, content}> }
  // --------------------------------------------

  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      const { type, files } = event.data || {};

      if (type === 'WC_PREVIEW_ERROR') {
        const previewError = event.data?.error || {};
        const message = typeof previewError?.message === 'string'
          ? previewError.message
          : 'Unbekannter Preview-Fehler';

        setStatus('error');
        setError(message);
        reportStatus('error', message);

        try {
          window.parent.postMessage({
            type: 'WC_PREVIEW_ERROR',
            error: previewError,
          }, '*');
        } catch {
          // ignore
        }
        return;
      }

      if (type === 'WC_PREVIEW_OK') {
        setError(null);
        if (statusRef.current !== 'connecting') {
          setStatus('ready');
          reportStatus('ready');
        }
        try {
          window.parent.postMessage({ type: 'WC_PREVIEW_OK' }, '*');
        } catch {
          // ignore
        }
        return;
      }

      if (type === 'WC_PING') {
        reportStatus(statusRef.current, errorRef.current || undefined);
        return;
      }

      // Nur WC_MOUNT_FILES verarbeiten
      if (type !== 'WC_MOUNT_FILES' || !Array.isArray(files)) return;

      console.log(`[WC] 📦 ${files.length} Dateien vom Parent empfangen`);

      // Wenn npm install noch laeuft: Dateien zwischenspeichern
      // Sie werden automatisch nach dem Install gemountet (siehe Boot-Sequenz)
      if (!isInstalledRef.current) {
        console.log('[WC] ⏳ Install laeuft noch, Dateien gespeichert fuer spaeter');
        pendingFilesRef.current = files;
        reportStatus('installing', 'Installiere Pakete... (Modul wartet)');
        return;
      }

      // Dateien sofort mounten - Vite HMR aktualisiert den Preview
      // KEIN Status-Wechsel (updating→ready) hier!
      // Das wuerde den Status-Badge flackern lassen und
      // die Parent-Komponente zu erneutem Senden triggern.
      // Wir bleiben einfach auf 'ready' und lassen Vite HMR die Arbeit machen.
      try {
        await mountModuleFiles(files);
        console.log('[WC] ✅ Dateien aktualisiert (stiller Mount)');
      } catch (err) {
        console.error('[WC] ❌ Mount-Fehler:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('error');
        setError(msg);
        setStatusMessage(`Fehler: ${msg}`);
        reportStatus('error', msg);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mountModuleFiles, reportStatus]);

  // --------------------------------------------
  // Render
  // Zeigt entweder Loading-Screen oder den Vite-Preview-Iframe
  // --------------------------------------------

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#0a0a0a',
      overflow: 'hidden',
    }}>
      {/* Vite Dev-Server Preview - Sobald Server-URL verfuegbar */}
      {serverUrl ? (
        <iframe
          ref={iframeRef}
          src={serverUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="cross-origin-isolated"
        />
      ) : (
        /* Loading / Error Screen */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#888',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          gap: '0.25rem',
        }}>
          {error ? (
            /* Fehler-Anzeige */
            <>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>❌</div>
              <p style={{
                color: '#f87171',
                fontWeight: 600,
                fontSize: '0.9375rem',
                marginBottom: '0.25rem',
              }}>
                Fehler
              </p>
              <p style={{
                color: '#888',
                fontSize: '0.8125rem',
                maxWidth: '400px',
                textAlign: 'center',
                lineHeight: 1.5,
              }}>
                {error}
              </p>
              <p style={{
                color: '#555',
                fontSize: '0.75rem',
                marginTop: '1rem',
              }}>
                WebContainers erfordern Chrome, Edge oder Brave.
              </p>
            </>
          ) : (
            /* Lade-Anzeige mit Fortschritt */
            <>
              {/* Spinner */}
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(139, 92, 246, 0.2)',
                borderTop: '3px solid #8b5cf6',
                borderRadius: '50%',
                animation: 'wc-spin 1s linear infinite',
                marginBottom: '1.25rem',
              }} />

              {/* Status-Text */}
              <p style={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: '#ccc',
              }}>
                {statusMessage}
              </p>

              {/* Fortschrittsbalken fuer npm install */}
              {status === 'installing' && (
                <>
                  <div style={{
                    width: '200px',
                    height: '3px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    marginTop: '1rem',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#8b5cf6',
                      borderRadius: '2px',
                      animation: 'wc-progress 2s ease-in-out infinite',
                    }} />
                  </div>
                  <p style={{
                    color: '#555',
                    fontSize: '0.75rem',
                    marginTop: '0.75rem',
                  }}>
                    Erstmalig kann dies 15-30 Sekunden dauern...
                  </p>
                </>
              )}

              {/* Status-Schritte Anzeige */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: '1.5rem',
                fontSize: '0.6875rem',
                color: '#555',
              }}>
                <span style={{
                  color: status === 'booting' ? '#8b5cf6' :
                    ['installing', 'starting', 'ready'].includes(status) ? '#22c55e' : '#555',
                }}>
                  {['installing', 'starting', 'ready'].includes(status) ? '✓' : '○'} Boot
                </span>
                <span>→</span>
                <span style={{
                  color: status === 'installing' ? '#8b5cf6' :
                    ['starting', 'ready'].includes(status) ? '#22c55e' : '#555',
                }}>
                  {['starting', 'ready'].includes(status) ? '✓' : '○'} Install
                </span>
                <span>→</span>
                <span style={{
                  color: status === 'starting' ? '#8b5cf6' :
                    status === 'ready' ? '#22c55e' : '#555',
                }}>
                  {status === 'ready' ? '✓' : '○'} Vite
                </span>
              </div>
            </>
          )}

          {/* CSS Animationen (inline weil kein Tailwind in dieser Phase) */}
          <style>{`
            @keyframes wc-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes wc-progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
