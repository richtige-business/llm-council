// ============================================
// StreamUnavailable.tsx - Fallback fuer Stream-Ausfall
//
// Zweck: Zeigt eine klare Fehlermeldung, wenn der
//        Cloud-Stream-Service nicht erreichbar ist
// Verwendet von: CloudBrowserView
// ============================================

'use client';

import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

interface StreamUnavailableProps {
  appName: string;
  targetUrl: string;
  message?: string | null;
  onRetry?: () => void;
}

export function StreamUnavailable({
  appName,
  targetUrl,
  message,
  onRetry,
}: StreamUnavailableProps) {
  return (
    <div className="flex h-full items-center justify-center bg-black/60 backdrop-blur-xl p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20">
          <AlertTriangle className="h-7 w-7 text-amber-300" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">
          {appName} ist gerade nicht erreichbar
        </h3>
        <p className="mb-6 text-sm text-white/70">
          {message ||
            'Der Cloud-Streaming-Service konnte nicht erreicht werden. Du kannst die App direkt im Browser oeffnen oder es gleich erneut versuchen.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/30"
          >
            <ExternalLink className="h-4 w-4" />
            Im Browser oeffnen
          </a>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    </div>
  );
}
