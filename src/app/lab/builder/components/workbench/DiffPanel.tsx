// ============================================
// DiffPanel - Code-Diff zwischen Iterationen
// 
// Zweck: Zeigt Änderungen zwischen zwei Snapshots
// Verwendet von: Workbench (Tab "Diff")
// ============================================

'use client';

import { memo, useMemo, useState } from 'react';
import { FilePlus, FileMinus, FileDiff } from 'lucide-react';
import { useWorkbenchStore, type FileSnapshot } from '../../stores/workbench-store';

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

interface DiffPanelProps {
  themeStyles?: ThemeStyles;
}

// --------------------------------------------
// Diff-Typen
// --------------------------------------------

type FileDiffType = 'added' | 'modified' | 'removed' | 'unchanged';

interface FileDiffEntry {
  path: string;
  type: FileDiffType;
  prevContent?: string;
  nextContent?: string;
}

// --------------------------------------------
// Helper: FileMap -> Content Map
// --------------------------------------------

function toContentMap(files: FileSnapshot['files']): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, entry] of Object.entries(files)) {
    if (entry?.type === 'file') {
      map[path] = entry.content || '';
    }
  }
  return map;
}

// --------------------------------------------
// Helper: Diff berechnen (line-based, simpel)
// --------------------------------------------

function buildFileDiff(prevFiles: FileSnapshot['files'], nextFiles: FileSnapshot['files']): FileDiffEntry[] {
  const prevMap = toContentMap(prevFiles);
  const nextMap = toContentMap(nextFiles);
  const allPaths = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)]);
  const diffs: FileDiffEntry[] = [];

  for (const path of Array.from(allPaths).sort()) {
    const prevContent = prevMap[path];
    const nextContent = nextMap[path];

    if (prevContent === undefined && nextContent !== undefined) {
      diffs.push({ path, type: 'added', nextContent });
    } else if (prevContent !== undefined && nextContent === undefined) {
      diffs.push({ path, type: 'removed', prevContent });
    } else if (prevContent !== nextContent) {
      diffs.push({ path, type: 'modified', prevContent, nextContent });
    } else {
      diffs.push({ path, type: 'unchanged', prevContent, nextContent });
    }
  }

  return diffs;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const DiffPanel = memo(function DiffPanel({ themeStyles }: DiffPanelProps) {
  const snapshots = useWorkbenchStore((state) => state.fileSnapshots);
  const { 
    surface, 
    accentColor = '#8b5cf6', 
    designStyle = 'glass', 
    textColor = '#ffffff' 
  } = themeStyles || {};

  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const prevSnapshot = snapshots[snapshots.length - 2];
  const nextSnapshot = snapshots[snapshots.length - 1];

  const fileDiffs = useMemo(() => {
    if (!prevSnapshot || !nextSnapshot) return [];
    return buildFileDiff(prevSnapshot.files, nextSnapshot.files);
  }, [prevSnapshot, nextSnapshot]);

  const selectedDiff = fileDiffs.find((f) => f.path === selectedFile) || fileDiffs[0];
  const prevLines = selectedDiff?.prevContent?.split('\n') || [];
  const nextLines = selectedDiff?.nextContent?.split('\n') || [];
  const maxLines = Math.max(prevLines.length, nextLines.length);

  if (!prevSnapshot || !nextSnapshot) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileDiff className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: textColor }} />
          <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
            Noch kein Diff verfuegbar
          </p>
          <p className="text-xs mt-1" style={{ color: textColor, opacity: 0.4 }}>
            Erstelle zwei Iterationen, um Aenderungen zu sehen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Datei-Liste */}
      <div 
        className="w-64 flex-shrink-0 overflow-y-auto"
        style={{
          background: surface?.base?.background || 'rgba(0,0,0,0.2)',
          borderRight: designStyle === 'brutal' 
            ? '2px solid #000' 
            : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="p-3 border-b border-white/10">
          <p className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
            {prevSnapshot.label} → {nextSnapshot.label}
          </p>
          <p className="text-[11px]" style={{ color: textColor, opacity: 0.4 }}>
            {new Date(nextSnapshot.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="p-2 space-y-1">
          {fileDiffs
            .filter((f) => f.type !== 'unchanged')
            .map((file) => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                className="w-full text-left px-3 py-2 rounded-md text-xs transition-colors"
                style={{
                  background: selectedDiff?.path === file.path ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: textColor,
                }}
              >
                <div className="flex items-center gap-2">
                  {file.type === 'added' && <FilePlus className="w-3 h-3 text-green-400" />}
                  {file.type === 'removed' && <FileMinus className="w-3 h-3 text-red-400" />}
                  {file.type === 'modified' && <FileDiff className="w-3 h-3 text-yellow-400" />}
                  <span className="truncate">{file.path.split('/').pop()}</span>
                </div>
                <p className="text-[10px] mt-1 opacity-60 truncate">{file.path}</p>
              </button>
            ))}
        </div>
      </div>

      {/* Diff-Ansicht */}
      <div className="flex-1 overflow-auto">
        {!selectedDiff ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
              Keine Aenderungen gefunden
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0 text-xs font-mono">
            {/* Vorher */}
            <div className="border-r border-white/10">
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <span style={{ color: textColor, opacity: 0.6 }}>Vorher</span>
              </div>
              <div className="px-3 py-2">
                {Array.from({ length: maxLines }).map((_, i) => {
                  const line = prevLines[i] ?? '';
                  const changed = line !== (nextLines[i] ?? '');
                  return (
                    <div
                      key={`prev-${i}`}
                      className="whitespace-pre-wrap"
                      style={{
                        background: changed ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                        color: `${textColor}CC`,
                      }}
                    >
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Nachher */}
            <div>
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <span style={{ color: textColor, opacity: 0.6 }}>Nachher</span>
              </div>
              <div className="px-3 py-2">
                {Array.from({ length: maxLines }).map((_, i) => {
                  const line = nextLines[i] ?? '';
                  const changed = line !== (prevLines[i] ?? '');
                  return (
                    <div
                      key={`next-${i}`}
                      className="whitespace-pre-wrap"
                      style={{
                        background: changed ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        color: `${textColor}CC`,
                      }}
                    >
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
