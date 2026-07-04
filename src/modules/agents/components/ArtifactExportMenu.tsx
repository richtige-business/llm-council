// ============================================
// ArtifactExportMenu.tsx - Vorschau + "Als PDF/DOCX/HTML" Download-Button
//
// Zweck: Kleines Dropdown, das ein CouncilRunData in ein
//        ArtifactDocument uebersetzt, als interaktive HTML-Vorschau
//        oeffnet oder als PDF/DOCX/HTML herunterlaedt.
// Verwendet von: CouncilChatBar.tsx (MainHistoryPanel), Artifacts-Seite
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, File as FileIcon, Code2, Eye } from 'lucide-react';
import type { CouncilRunData, CouncilSeatMemberData } from '../types';
import {
  buildArtifactDocument,
  buildArtifactHtml,
  downloadArtifactAsDocx,
  downloadArtifactAsHtml,
  downloadArtifactAsPdf,
} from '../lib/artifact-export';

interface ArtifactExportMenuProps {
  run: CouncilRunData;
  seatMembers: CouncilSeatMemberData[];
  accentColor?: string;
}

type ExportFormat = 'preview' | 'pdf' | 'docx' | 'html';

export function ArtifactExportMenu({ run, seatMembers, accentColor = '#94a3b8' }: ArtifactExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleExport = async (format: ExportFormat) => {
    setBusy(format);
    try {
      const document = buildArtifactDocument(run, seatMembers);
      if (format === 'preview') {
        const html = buildArtifactHtml(document);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else if (format === 'pdf') {
        await downloadArtifactAsPdf(document);
      } else if (format === 'docx') {
        await downloadArtifactAsDocx(document);
      } else {
        downloadArtifactAsHtml(document);
      }
      setOpen(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Als Dokument herunterladen"
        aria-label="Als Dokument herunterladen"
        className="flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-100"
        style={{ color: accentColor, opacity: 0.7 }}
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-10 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#15181f] shadow-xl"
        >
          <button
            type="button"
            onClick={() => handleExport('preview')}
            disabled={busy !== null}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" />
            {busy === 'preview' ? 'Öffne…' : 'Vorschau öffnen'}
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={busy !== null}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            {busy === 'pdf' ? 'Exportiere…' : 'Als PDF'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('docx')}
            disabled={busy !== null}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <FileIcon className="h-3.5 w-3.5" />
            {busy === 'docx' ? 'Exportiere…' : 'Als DOCX'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('html')}
            disabled={busy !== null}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <Code2 className="h-3.5 w-3.5" />
            {busy === 'html' ? 'Exportiere…' : 'Als HTML'}
          </button>
        </div>
      )}
    </div>
  );
}
