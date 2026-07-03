// ============================================
// AddCustomUrlDialog.tsx - Dialog fuer eigene Web-App URLs
//
// Zweck: User kann beliebige URL als externe App hinzufuegen
// Verwendet von: Library Page
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { Globe, Plus, X } from 'lucide-react';

interface AddCustomUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; url: string }) => void;
}

function deriveNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const base = hostname.split('.')[0] || hostname;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Externe App';
  }
}

export function AddCustomUrlDialog({
  isOpen,
  onClose,
  onSubmit,
}: AddCustomUrlDialogProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const suggestedName = useMemo(() => deriveNameFromUrl(url), [url]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#12121a]/95 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Eigene Web-App hinzufuegen
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">Name (optional)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={suggestedName}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/20"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              try {
                const parsed = new URL(url.trim());
                const resolvedName = (name.trim() || deriveNameFromUrl(parsed.toString())).slice(0, 60);
                if (!resolvedName) {
                  setError('Bitte einen gueltigen Namen eingeben.');
                  return;
                }
                onSubmit({ name: resolvedName, url: parsed.toString() });
                setUrl('');
                setName('');
                setError(null);
                onClose();
              } catch {
                setError('Bitte eine gueltige URL mit https:// eingeben.');
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/30"
          >
            <Plus className="h-4 w-4" />
            <Globe className="h-4 w-4" />
            Hinzufuegen
          </button>
        </div>
      </div>
    </div>
  );
}
