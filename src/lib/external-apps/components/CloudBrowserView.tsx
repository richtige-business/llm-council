// ============================================
// CloudBrowserView.tsx - Cloud-Browser fuer externe Apps
//
// Zweck: Startet Stream-Session und rendert den WebRTC-Viewer
//        fuer universelles Web-App-Embedding
// Verwendet von: TabContent.tsx
// ============================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  SESSION_IDLE_TIMEOUT,
  SESSION_READY_TIMEOUT,
  SESSION_POLL_INTERVAL,
} from '../constants';
import { useExternalStreamStore } from '../stream-store';
import { useExternalAppViewActionsStore } from '../view-actions-store';
import { StreamUnavailable } from './StreamUnavailable';

interface CloudBrowserViewProps {
  moduleId: string;
  appName: string;
  targetUrl: string;
}

export function CloudBrowserView({
  moduleId,
  appName,
  targetUrl,
}: CloudBrowserViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const resizeRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamResolution, setStreamResolution] = useState('1600x900x24');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createSession = useExternalStreamStore((s) => s.createSession);
  const refreshSession = useExternalStreamStore((s) => s.refreshSession);
  const destroySession = useExternalStreamStore((s) => s.destroySession);
  const touchSession = useExternalStreamStore((s) => s.touchSession);
  const session = useExternalStreamStore((s) => s.activeSessions[moduleId]);
  const registerActions = useExternalAppViewActionsStore((s) => s.registerActions);
  const clearActions = useExternalAppViewActionsStore((s) => s.clearActions);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const updateResolution = () => {
      const rawWidth = Math.max(960, Math.round(containerRef.current?.clientWidth || 1600));
      const rawHeight = Math.max(640, Math.round(containerRef.current?.clientHeight || 900));
      const nextWidth = Math.round(rawWidth / 32) * 32;
      const nextHeight = Math.round(rawHeight / 32) * 32;
      setStreamResolution(`${nextWidth}x${nextHeight}x24`);
    };

    updateResolution();

    const observer = new ResizeObserver(() => updateResolution());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeRestartTimerRef.current) {
        clearTimeout(resizeRestartTimerRef.current);
      }
    };
  }, []);

  const initializeStream = useCallback(async () => {
    setErrorMessage(null);
    setIsReady(false);
    try {
      await createSession(moduleId, targetUrl, true, streamResolution);

      const startedAt = Date.now();
      while (Date.now() - startedAt < SESSION_READY_TIMEOUT && mountedRef.current) {
        const refreshed = await refreshSession(moduleId);
        if (refreshed && (refreshed.status === 'ready' || refreshed.status === 'active')) {
          setIsReady(true);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, SESSION_POLL_INTERVAL));
      }

      setErrorMessage('Stream konnte nicht rechtzeitig gestartet werden.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Stream konnte nicht gestartet werden.'
      );
    }
  }, [createSession, moduleId, refreshSession, streamResolution, targetUrl]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      void destroySession(moduleId, true);
      setIsReady(false);
    }, SESSION_IDLE_TIMEOUT);
  }, [destroySession, moduleId]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => {
      void initializeStream();
    }, 0);
    resetIdleTimer();
    return () => {
      window.clearTimeout(timer);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      mountedRef.current = false;
      void destroySession(moduleId, true);
    };
  }, [destroySession, initializeStream, moduleId, resetIdleTimer]);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'mousedown', 'wheel'];
    const onActivity = () => {
      touchSession(moduleId);
      resetIdleTimer();
    };

    for (const eventName of events) {
      window.addEventListener(eventName, onActivity);
    }

    const onVisibility = () => {
      if (document.hidden) {
        void destroySession(moduleId, true);
        setIsReady(false);
      } else {
        void initializeStream();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [destroySession, initializeStream, moduleId, resetIdleTimer, touchSession]);

  useEffect(() => {
    registerActions(moduleId, {
      reload: () => initializeStream(),
    });

    return () => clearActions(moduleId);
  }, [clearActions, initializeStream, moduleId, registerActions]);

  useEffect(() => {
    if (!session || !session.resolution || session.resolution === streamResolution) {
      return;
    }

    if (resizeRestartTimerRef.current) {
      clearTimeout(resizeRestartTimerRef.current);
    }

    resizeRestartTimerRef.current = setTimeout(() => {
      void initializeStream();
    }, 600);

    return () => {
      if (resizeRestartTimerRef.current) {
        clearTimeout(resizeRestartTimerRef.current);
      }
    };
  }, [initializeStream, session, streamResolution]);

  const viewerUrl = useMemo(() => session?.viewerUrl || '', [session?.viewerUrl]);
  const isConnected = Boolean(isReady && session && viewerUrl);

  if (errorMessage) {
    return (
      <StreamUnavailable
        appName={appName}
        targetUrl={targetUrl}
        message={errorMessage}
        onRetry={() => void initializeStream()}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative flex h-full min-h-0 flex-col overflow-hidden bg-black">
      {!isConnected && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm text-white/70">Starte Cloud-Browser fuer {appName}...</p>
            <p className="text-xs text-white/40">App-Fenster wird vorbereitet</p>
          </div>
        </div>
      )}

      {viewerUrl ? (
        <div className="flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-black">
          <iframe
            src={viewerUrl}
            className="h-[104%] w-[104%] border-0 bg-black"
            title={`${appName} - Cloud Browser`}
            allow="autoplay; clipboard-read; clipboard-write; fullscreen"
            onLoad={() => {
              setIsReady(true);
              touchSession(moduleId);
              resetIdleTimer();
            }}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      )}
    </div>
  );
}
