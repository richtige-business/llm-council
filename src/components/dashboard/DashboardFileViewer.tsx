// ============================================
// DashboardFileViewer.tsx - Datei-Vorschau in Tabs
//
// Zweck: Zeigt Dashboard-Dateien als Vorschau innerhalb
//        des Tab-Systems (Text, Bilder, Code, Fallback).
// Verwendet von: TabContent.tsx (via moduleId "dashboard-file:*")
// ============================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Loader2,
  Music4,
  Video,
} from 'lucide-react';

interface DashboardFileData {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  contentText: string | null;
  contentBase64: string | null;
  source: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MimeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cls = className || 'h-10 w-10 text-white/50';
  const lc = mimeType.toLowerCase();
  if (lc.startsWith('image/')) return <FileImage className={cls} />;
  if (lc.startsWith('video/')) return <Video className={cls} />;
  if (lc.startsWith('audio/')) return <Music4 className={cls} />;
  if (lc.includes('json') || lc.includes('javascript') || lc.includes('typescript'))
    return <FileCode2 className={cls} />;
  if (lc.includes('zip') || lc.includes('compressed')) return <FileArchive className={cls} />;
  return <FileText className={cls} />;
}

// --------------------------------------------
// Text-Vorschau (Plain Text, JSON, Code)
// --------------------------------------------

function TextPreview({ content, mimeType }: { content: string; mimeType: string }) {
  const isCode =
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('xml') ||
    mimeType.includes('html') ||
    mimeType.includes('css') ||
    mimeType.includes('markdown');

  return (
    <div className="h-full overflow-auto">
      <pre
        className={`whitespace-pre-wrap break-words p-6 text-sm leading-relaxed ${
          isCode
            ? 'font-mono text-emerald-300/90'
            : 'font-sans text-white/85'
        }`}
      >
        {content}
      </pre>
    </div>
  );
}

// --------------------------------------------
// Bild-Vorschau
// --------------------------------------------

function ImagePreview({ base64, mimeType, name }: { base64: string; mimeType: string; name: string }) {
  const src = `data:${mimeType};base64,${base64}`;
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-black/20 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="max-h-full max-w-full rounded-xl object-contain shadow-xl"
      />
    </div>
  );
}

// --------------------------------------------
// Generischer Fallback
// --------------------------------------------

function GenericPreview({ file }: { file: DashboardFileData }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <MimeIcon mimeType={file.mimeType} className="h-20 w-20 text-white/30" />
      <div className="text-center">
        <p className="text-lg font-semibold text-white">{file.name}</p>
        <p className="mt-1 text-sm text-white/50">{file.mimeType}</p>
        <p className="mt-1 text-sm text-white/40">{formatBytes(file.sizeBytes)}</p>
        {file.relativePath ? (
          <p className="mt-2 text-xs text-white/30">{file.relativePath}</p>
        ) : null}
      </div>
      <p className="max-w-sm text-center text-xs text-white/35">
        Vorschau fuer diesen Dateityp ist nicht verfuegbar.
      </p>
    </div>
  );
}

// ============================================
// Haupt-Komponente
// ============================================

export function DashboardFileViewer({ documentId }: { documentId: string }) {
  const [file, setFile] = useState<DashboardFileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dashboard-documents/${encodeURIComponent(documentId)}`
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Datei konnte nicht geladen werden.');
      }
      setFile(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datei konnte nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void fetchFile();
  }, [fetchFile]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <motion.div
        className="flex h-full flex-col items-center justify-center gap-4 p-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <FileText className="h-14 w-14 text-white/30" />
        <p className="text-sm text-white/60">{error || 'Datei nicht gefunden.'}</p>
      </motion.div>
    );
  }

  const lc = file.mimeType.toLowerCase();

  if (file.contentText && (lc.startsWith('text/') || lc.includes('json') || lc.includes('javascript') || lc.includes('typescript') || lc.includes('xml') || lc.includes('html') || lc.includes('css') || lc.includes('markdown'))) {
    return <TextPreview content={file.contentText} mimeType={file.mimeType} />;
  }

  if (file.contentBase64 && lc.startsWith('image/')) {
    return <ImagePreview base64={file.contentBase64} mimeType={file.mimeType} name={file.name} />;
  }

  return <GenericPreview file={file} />;
}
