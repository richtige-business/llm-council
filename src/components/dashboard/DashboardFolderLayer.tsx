// ============================================
// DashboardFolderLayer.tsx - Dashboard Explorer Layer
//
// Zweck: Rendert Dashboard-Ordner und -Dateien im Desktop-Stil
//        inkl. mehrerer Finder-Fenster (Spawn neben Icon), Drag-and-Drop.
// Verwendet von: Home-Dashboard, Base-Dashboards
// ============================================

'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Folder,
  FolderPlus,
  HardDriveUpload,
  Loader2,
  Minus,
  Music4,
  Pencil,
  Plus,
  Square,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { Rnd } from 'react-rnd';
import {
  collectDroppedDesktopFiles,
  pickDesktopDirectoryFiles,
  readSelectedFiles,
} from './dashboard-import';
import {
  useDashboardFolders,
  type DashboardDocument,
  type DashboardFolder,
  type DashboardSurfaceType,
} from './useDashboardFolders';

// --------------------------------------------
// Konstanten fuer Icon-Abmessungen
// Eng am sichtbaren Inhalt, damit die Hitbox passt
// --------------------------------------------

const ICON_W = 82;
const ICON_H = 94;
const CONTEXT_MENU_W = 300;
const CONTEXT_MENU_EDGE = 16;
const DASHBOARD_DOCUMENT_DRAG_MIME = 'application/x-lifeos-dashboard-document';
const DASHBOARD_FOLDER_DRAG_MIME = 'application/x-lifeos-dashboard-folder';

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultFinderPosition() {
  return {
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2 - 410) : 200,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.07) : 60,
  };
}

// --------------------------------------------
// Finder-Fenster: Standardbreite und Spawn nahe Icon
// --------------------------------------------

function getFinderDefaultWidthPx() {
  return typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.7, 600) : 600;
}

const FINDER_SPAWN_GAP_PX = 14;
const FINDER_VIEWPORT_PAD_PX = 12;
/** Geschaetzte Mindesthoehe fuer Spawn-Clamping (Titelleiste + Content) */
const FINDER_SPAWN_MIN_HEIGHT_ESTIMATE = 340;

/**
 * Berechnet fixed-Viewport-Position fuer ein neues Finder-Fenster
 * rechts (oder links) neben dem Dashboard-Ordner-Icon.
 */
function computeFinderSpawnNearFolderIcon(
  folder: DashboardFolder,
  boundsRect: DOMRect | null
): { x: number; y: number } {
  if (!boundsRect || typeof window === 'undefined') {
    return getDefaultFinderPosition();
  }
  const finderW = getFinderDefaultWidthPx();
  const iw = folder.width || ICON_W;
  const ih = folder.height || ICON_H;
  const iconLeft = boundsRect.left + folder.x;
  const iconTop = boundsRect.top + folder.y;
  let x = iconLeft + iw + FINDER_SPAWN_GAP_PX;
  let y = iconTop;
  if (x + finderW + FINDER_VIEWPORT_PAD_PX > window.innerWidth) {
    x = iconLeft - finderW - FINDER_SPAWN_GAP_PX;
  }
  if (x < FINDER_VIEWPORT_PAD_PX) {
    x = FINDER_VIEWPORT_PAD_PX;
  }
  if (y + FINDER_SPAWN_MIN_HEIGHT_ESTIMATE + FINDER_VIEWPORT_PAD_PX > window.innerHeight) {
    y = Math.max(
      FINDER_VIEWPORT_PAD_PX,
      window.innerHeight - FINDER_SPAWN_MIN_HEIGHT_ESTIMATE - FINDER_VIEWPORT_PAD_PX
    );
  }
  if (y < FINDER_VIEWPORT_PAD_PX) y = FINDER_VIEWPORT_PAD_PX;
  return { x: Math.round(x), y: Math.round(y) };
}

interface FinderWindowState {
  /** Eindeutige ID dieser Fenster-Instanz (mehrere Fenster pro Ordner moeglich) */
  instanceId: string;
  /** Aktuell angezeigter Ordner (Navigation im Fenster) */
  folderId: string;
  x: number;
  y: number;
}

function newFinderInstanceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface DashboardFolderLayerProps {
  surfaceType: DashboardSurfaceType;
  surfaceId: string;
  boundsRef: RefObject<HTMLDivElement | null>;
  editable?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
}

// --------------------------------------------
// Datei-Icon je nach MIME-Typ
// --------------------------------------------

function matchesFileMime(mimeType: string, prefix: string) {
  return mimeType.toLowerCase().startsWith(prefix);
}

function FileSymbol({ document, size = 'normal' }: { document: DashboardDocument; size?: 'normal' | 'small' }) {
  const cls = size === 'small' ? 'h-5 w-5 text-white/88' : 'h-7 w-7 text-white/92';
  const sw = 1.8;

  if (matchesFileMime(document.mimeType, 'image/')) return <FileImage className={cls} strokeWidth={sw} />;
  if (matchesFileMime(document.mimeType, 'video/')) return <Video className={cls} strokeWidth={sw} />;
  if (matchesFileMime(document.mimeType, 'audio/')) return <Music4 className={cls} strokeWidth={sw} />;
  if (document.mimeType.includes('json') || document.mimeType.includes('javascript') || document.mimeType.includes('typescript'))
    return <FileCode2 className={cls} strokeWidth={sw} />;
  if (document.mimeType.includes('zip') || document.mimeType.includes('compressed'))
    return <FileArchive className={cls} strokeWidth={sw} />;
  return <FileText className={cls} strokeWidth={sw} />;
}

// --------------------------------------------
// Root-Ordner-Icon (auf dem Dashboard)
// --------------------------------------------

function RootFolderIcon({
  folder,
  onRename,
  onDelete,
  onOpen,
}: {
  folder: DashboardFolder;
  onRename: (folder: DashboardFolder) => void;
  onDelete: (folderId: string) => void;
  onOpen: (folderId: string) => void;
}) {
  return (
    <div
      data-dashboard-folder
      onDoubleClick={() => onOpen(folder.id)}
      className="group relative flex h-full w-full cursor-grab flex-col items-center active:cursor-grabbing"
    >
      <div className="absolute right-0 top-0 z-10 flex items-center gap-1 opacity-0 transition duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onRename(folder)}
          className="rounded-full border border-white/12 bg-black/40 p-1 text-white/70 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:text-white"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(folder.id)}
          className="rounded-full border border-white/12 bg-black/40 p-1 text-white/70 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:text-white"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="flex w-full justify-center">
        <div className="relative h-[54px] w-[70px] drop-shadow-[0_14px_22px_rgba(0,0,0,0.24)]">
          <div
            className="absolute left-2 top-0 h-[13px] w-[26px] rounded-t-[8px] rounded-br-[6px]"
            style={{ background: `linear-gradient(180deg, ${folder.color}f0 0%, ${folder.color}cf 100%)` }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[44px] rounded-[13px]"
            style={{
              background: `linear-gradient(180deg, ${folder.color} 0%, ${folder.color}dd 56%, ${folder.color}c8 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -7px 12px rgba(0,0,0,0.08), 0 14px 24px -22px ${folder.color}`,
            }}
          >
            <div className="absolute inset-x-2 top-1 h-[5px] rounded-full bg-white/30 blur-[1px]" />
            <div className="absolute inset-0 rounded-[13px] ring-1 ring-white/20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pt-1">
            <Folder className="h-6 w-6 text-white/92" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      <div className="mt-1 flex w-full justify-center">
        <p className="line-clamp-2 max-w-full break-words text-center text-[0.78rem] font-semibold leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.72)]">
          {folder.name}
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------
// Root-Datei-Icon (auf dem Dashboard)
// --------------------------------------------

function RootDocumentIcon({
  document,
  onDelete,
  onOpen,
}: {
  document: DashboardDocument;
  onDelete: (documentId: string) => void;
  onOpen: (document: DashboardDocument) => void;
}) {
  return (
    <div
      className="group relative flex h-full w-full cursor-grab flex-col items-center active:cursor-grabbing"
      onDoubleClick={() => onOpen(document)}
    >
      <div className="absolute right-0 top-0 z-10 opacity-0 transition duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onDelete(document.id)}
          className="rounded-full border border-white/12 bg-black/40 p-1 text-white/70 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:text-white"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>

      <div className="relative h-[54px] w-[42px] rounded-[12px] bg-white/90 shadow-[0_14px_22px_rgba(0,0,0,0.24)]">
        <div className="absolute right-0 top-0 h-[12px] w-[12px] rounded-bl-[8px] rounded-tr-[12px] bg-white/70" />
        <div className="absolute inset-0 rounded-[12px] ring-1 ring-black/8" />
        <div className="absolute inset-0 flex items-center justify-center pt-1">
          <FileSymbol document={document} />
        </div>
      </div>

      <div className="mt-1 flex w-full justify-center">
        <p className="line-clamp-2 max-w-full break-words text-center text-[0.75rem] font-medium leading-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.72)]">
          {document.name}
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------
// Finder-Fenster: Mini Folder-Icon fuer das Grid
// --------------------------------------------

function FinderFolderItem({
  folder,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  folder: DashboardFolder;
  onOpen: (folderId: string) => void;
  onDragStart: (folder: DashboardFolder, event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(folder.id)}
      draggable
      onDragStart={(event) => onDragStart(folder, event)}
      onDragEnd={onDragEnd}
      className="group flex w-[86px] flex-col items-center rounded-xl p-2 transition hover:bg-white/[0.06] active:bg-white/[0.09]"
    >
      <div className="relative h-[48px] w-[62px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)]">
        <div
          className="absolute left-2 top-0 h-[12px] w-[22px] rounded-t-[7px] rounded-br-[5px]"
          style={{ background: `linear-gradient(180deg, ${folder.color}f0 0%, ${folder.color}cf 100%)` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[38px] rounded-[11px]"
          style={{
            background: `linear-gradient(180deg, ${folder.color} 0%, ${folder.color}dd 56%, ${folder.color}c8 100%)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -6px 10px rgba(0,0,0,0.07)`,
          }}
        >
          <div className="absolute inset-x-2 top-1 h-[4px] rounded-full bg-white/30 blur-[0.5px]" />
          <div className="absolute inset-0 rounded-[11px] ring-1 ring-white/18" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pt-1">
          <Folder className="h-5 w-5 text-white/92" strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 w-full break-words text-center text-[0.72rem] font-medium leading-tight text-white/90">
        {folder.name}
      </p>
    </button>
  );
}

// --------------------------------------------
// Finder-Fenster: Mini File-Icon fuer das Grid
// --------------------------------------------

function FinderFileItem({
  document,
  onDelete,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  document: DashboardDocument;
  onDelete: (documentId: string) => void;
  onOpen: (document: DashboardDocument) => void;
  onDragStart: (document: DashboardDocument, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className="group relative flex w-[86px] cursor-default flex-col items-center rounded-xl p-2 transition hover:bg-white/[0.06]"
      onDoubleClick={() => onOpen(document)}
      draggable
      onDragStart={(event) => onDragStart(document, event)}
      onDragEnd={onDragEnd}
    >
      <div className="absolute right-1 top-1 z-10 opacity-0 transition duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onDelete(document.id)}
          className="rounded-full border border-white/12 bg-black/40 p-0.5 text-white/60 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:text-white"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="relative h-[48px] w-[38px] rounded-[10px] bg-white/90 shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
        <div className="absolute right-0 top-0 h-[10px] w-[10px] rounded-bl-[7px] rounded-tr-[10px] bg-white/70" />
        <div className="absolute inset-0 rounded-[10px] ring-1 ring-black/8" />
        <div className="absolute inset-0 flex items-center justify-center pt-0.5">
          <FileSymbol document={document} size="small" />
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 w-full break-words text-center text-[0.72rem] font-medium leading-tight text-white/90">
        {document.name}
      </p>
    </div>
  );
}

// ============================================
// FilePreviewWindow – schwebendes Vorschau-Fenster
// Zeigt Datei-Inhalt je nach MIME-Typ nativ an
// ============================================

function formatFileBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilePreviewWindowProps {
  document: DashboardDocument;
  stackOffset: number;
  onClose: () => void;
}

function FilePreviewContent({ document }: { document: DashboardDocument & { contentText?: string | null; contentBase64?: string | null } }) {
  const lc = document.mimeType.toLowerCase();

  // PDF: nativer Browser-Viewer via iframe
  if (lc === 'application/pdf' && document.contentBase64) {
    const src = `data:application/pdf;base64,${document.contentBase64}`;
    return (
      <iframe
        src={src}
        className="h-full w-full border-0"
        title={document.name}
      />
    );
  }

  // Bilder
  if (lc.startsWith('image/') && document.contentBase64) {
    const src = `data:${document.mimeType};base64,${document.contentBase64}`;
    return (
      <div className="flex h-full items-center justify-center overflow-auto bg-black/20 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={document.name} className="max-h-full max-w-full rounded-xl object-contain shadow-xl" />
      </div>
    );
  }

  // Text / Code
  if (document.contentText && (lc.startsWith('text/') || lc.includes('json') || lc.includes('javascript') || lc.includes('typescript') || lc.includes('xml') || lc.includes('html') || lc.includes('css') || lc.includes('markdown'))) {
    const isCode = !lc.startsWith('text/plain');
    return (
      <div className="h-full overflow-auto">
        <pre className={`whitespace-pre-wrap break-words p-6 text-sm leading-relaxed ${isCode ? 'font-mono text-emerald-300/90' : 'font-sans text-white/85'}`}>
          {document.contentText}
        </pre>
      </div>
    );
  }

  // Fallback: Metadaten
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <FileSymbol document={document} size="normal" />
      <div className="text-center">
        <p className="text-base font-semibold text-white">{document.name}</p>
        <p className="mt-1 text-sm text-white/50">{document.mimeType}</p>
        <p className="mt-0.5 text-sm text-white/35">{formatFileBytes(document.sizeBytes)}</p>
      </div>
      <p className="max-w-xs text-center text-xs text-white/30">
        Vorschau fuer diesen Dateityp ist nicht verfuegbar.
      </p>
    </div>
  );
}

type DocumentWithContent = DashboardDocument & {
  contentText?: string | null;
  contentBase64?: string | null;
  sizeBytes: number;
};

function FilePreviewWindow({ document: doc, stackOffset, onClose }: FilePreviewWindowProps) {
  const [loaded, setLoaded] = useState<DocumentWithContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch(`/api/dashboard-documents/${encodeURIComponent(doc.id)}`)
      .then((r) => r.json())
      .then((data: { success: boolean; document: DocumentWithContent; message?: string }) => {
        if (!data.success) throw new Error(data.message || 'Fehler beim Laden');
        setLoaded(data.document);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Fehler'))
      .finally(() => setIsLoading(false));
  }, [doc.id]);

  const defaultW = 720;
  const defaultH = 520;
  const offsetX = stackOffset * 28;
  const offsetY = stackOffset * 28;
  const startX = typeof window !== 'undefined' ? Math.round((window.innerWidth - defaultW) / 2) + offsetX : 200 + offsetX;
  const startY = typeof window !== 'undefined' ? Math.round((window.innerHeight - defaultH) / 2) + offsetY : 120 + offsetY;

  return (
    <Rnd
      default={{ x: startX, y: startY, width: defaultW, height: defaultH }}
      minWidth={340}
      minHeight={260}
      dragHandleClassName="file-preview-title-bar"
      style={{ position: 'fixed', zIndex: 99999 }}
      enableResizing={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.13] bg-[#1c1c1e]/[0.96] shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-[60px]">
        {/* Titelleiste */}
        <div className="file-preview-title-bar flex cursor-grab items-center gap-3 border-b border-white/[0.08] px-4 py-2.5 active:cursor-grabbing">
          <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onClose}
              className="group flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)] transition hover:brightness-110"
              aria-label="Schliessen"
            >
              <X className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
            </button>
            <div className="group flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]">
              <Minus className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
            </div>
            <div className="group flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]">
              <Square className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <FileSymbol document={doc} size="small" />
            <span className="truncate text-sm font-medium text-white/80">{doc.name}</span>
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Inhalt */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-white/40" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
              <FileText className="h-12 w-12 text-white/30" />
              <p className="text-sm text-white/55">{error}</p>
            </div>
          ) : loaded ? (
            <FilePreviewContent document={loaded} />
          ) : null}
        </div>
      </div>
    </Rnd>
  );
}

// ============================================
// Haupt-Komponente
// ============================================

export function DashboardFolderLayer({
  surfaceType,
  surfaceId,
  boundsRef,
  editable = true,
}: DashboardFolderLayerProps) {
  const {
    folders,
    documents,
    createFolder,
    updateFolder,
    deleteFolder,
    updateDocument,
    deleteDocument,
    importEntries,
  } = useDashboardFolders(surfaceType, surfaceId);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draftName, setDraftName] = useState('Neuer Ordner');
  const [draftColor, setDraftColor] = useState('#60a5fa');
  /** Mehrere Finder-Fenster gleichzeitig; Reihenfolge = Stacking (hinten nach vorne) */
  const [finderWindows, setFinderWindows] = useState<FinderWindowState[]>([]);
  const [isExternalDropActive, setIsExternalDropActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  /** Welches Finder-Fenster gerade als Drop-Ziel fuer externe Files highlightet */
  const [isWindowDropActiveId, setIsWindowDropActiveId] = useState<string | null>(null);
  const [draggingDashboardItemId, setDraggingDashboardItemId] = useState<string | null>(null);
  // Geoeffnete Datei-Vorschau-Fenster (mehrere gleichzeitig moeglich)
  const [openDocuments, setOpenDocuments] = useState<DashboardDocument[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  /** DOM je Finder-Instanz fuer Treffertests (Drag auf offenes Fenster) */
  const finderWindowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const rootFileInputRef = useRef<HTMLInputElement>(null);
  const folderFileInputRef = useRef<HTMLInputElement>(null);
  /** Zielordner fuer versteckten File-Input (+ Toolbar) */
  const folderImportTargetIdRef = useRef<string | null>(null);

  useEffect(() => setIsMounted(true), []);

  // Datei-Vorschau-Fenster oeffnen (kein Navbar-Tab)
  const handleOpenDocument = (doc: DashboardDocument) => {
    setOpenDocuments((prev) => {
      if (prev.find((d) => d.id === doc.id)) return prev;
      return [...prev, doc];
    });
  };

  const handleCloseDocument = (docId: string) => {
    setOpenDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleFinderDocumentDragStart = (
    document: DashboardDocument,
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DASHBOARD_DOCUMENT_DRAG_MIME, document.id);
    setDraggingDashboardItemId(`document:${document.id}`);
  };

  const handleFinderFolderDragStart = (
    folder: DashboardFolder,
    event: React.DragEvent<HTMLButtonElement>
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DASHBOARD_FOLDER_DRAG_MIME, folder.id);
    setDraggingDashboardItemId(`folder:${folder.id}`);
  };

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const rootFolders = useMemo(() => folders.filter((f) => !f.parentFolderId), [folders]);
  const rootDocuments = useMemo(() => documents.filter((d) => !d.folderId), [documents]);

  // Finder-Fenster schliessen, wenn der angezeigte Ordner nicht mehr existiert
  useEffect(() => {
    const validIds = new Set(folders.map((f) => f.id));
    setFinderWindows((prev) => prev.filter((w) => validIds.has(w.folderId)));
  }, [folders]);

  const openFinderFromRootFolder = (openedFolderId: string) => {
    const folder = folderById.get(openedFolderId);
    const boundsRect = boundsRef.current?.getBoundingClientRect() ?? null;
    const pos = folder ? computeFinderSpawnNearFolderIcon(folder, boundsRect) : getDefaultFinderPosition();
    setFinderWindows((prev) => [
      ...prev,
      { instanceId: newFinderInstanceId(), folderId: openedFolderId, x: pos.x, y: pos.y },
    ]);
  };

  const closeFinderWindow = (instanceId: string) => {
    setFinderWindows((prev) => prev.filter((w) => w.instanceId !== instanceId));
    finderWindowRefs.current.delete(instanceId);
    setIsWindowDropActiveId((id) => (id === instanceId ? null : id));
  };

  const bringFinderToFront = (instanceId: string) => {
    setFinderWindows((prev) => {
      const idx = prev.findIndex((w) => w.instanceId === instanceId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.push(item);
      return next;
    });
  };

  const updateFinderPosition = (instanceId: string, x: number, y: number) => {
    setFinderWindows((prev) => prev.map((w) => (w.instanceId === instanceId ? { ...w, x, y } : w)));
  };

  const setFinderBrowseFolder = (instanceId: string, nextFolderId: string) => {
    setFinderWindows((prev) => prev.map((w) => (w.instanceId === instanceId ? { ...w, folderId: nextFolderId } : w)));
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      setContextMenu(null);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu || !panelRef.current || !boundsRef.current) return;

    const rafId = window.requestAnimationFrame(() => {
      const bounds = boundsRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!bounds || !panel) return;

      const maxX = Math.max(CONTEXT_MENU_EDGE, bounds.width - panel.offsetWidth - CONTEXT_MENU_EDGE);
      const maxY = Math.max(CONTEXT_MENU_EDGE, bounds.height - panel.offsetHeight - CONTEXT_MENU_EDGE);
      const nextX = clampNumber(contextMenu.x, CONTEXT_MENU_EDGE, maxX);
      const nextY = clampNumber(contextMenu.y, CONTEXT_MENU_EDGE, maxY);

      if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
        setContextMenu({ x: nextX, y: nextY });
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [boundsRef, contextMenu]);

  // --------------------------------------------
  // Drag-and-Drop und Rechtsklick auf dem Dashboard
  // --------------------------------------------

  useEffect(() => {
    const element = boundsRef.current;
    if (!element || !editable) return;

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'button, a, input, textarea, select, [data-dashboard-folder], [data-dashboard-file], [data-dashboard-window], [data-no-dashboard-context]'
        )
      ) return;

      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      setDraftName('Neuer Ordner');
      setDraftColor('#60a5fa');
      const maxX = Math.max(CONTEXT_MENU_EDGE, bounds.width - CONTEXT_MENU_W - CONTEXT_MENU_EDGE);
      setContextMenu({
        x: clampNumber(event.clientX - bounds.left, CONTEXT_MENU_EDGE, maxX),
        y: Math.max(CONTEXT_MENU_EDGE, event.clientY - bounds.top),
      });
    };

    const handleDragOver = (event: DragEvent) => {
      const types = Array.from(event.dataTransfer?.types || []);
      const isExternalFileDrag = types.includes('Files');
      const isInternalDashboardDrag =
        types.includes(DASHBOARD_DOCUMENT_DRAG_MIME) || types.includes(DASHBOARD_FOLDER_DRAG_MIME);
      if (!isExternalFileDrag && !isInternalDashboardDrag) return;
      if ((event.target as HTMLElement | null)?.closest('[data-dashboard-window]')) return;
      event.preventDefault();
      setIsExternalDropActive(isExternalFileDrag);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.currentTarget !== event.target) return;
      setIsExternalDropActive(false);
    };

    const handleDrop = async (event: DragEvent) => {
      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;
      if ((event.target as HTMLElement | null)?.closest('[data-dashboard-window]')) return;
      event.preventDefault();
      setIsExternalDropActive(false);
      const internalDocumentId = dataTransfer.getData(DASHBOARD_DOCUMENT_DRAG_MIME);
      const internalFolderId = dataTransfer.getData(DASHBOARD_FOLDER_DRAG_MIME);

      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      const hoveredFolder = rootFolders.find(
        (f) => x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height
      );

      if (internalDocumentId) {
        void updateDocument(internalDocumentId, {
          x: hoveredFolder ? 0 : Math.max(12, x),
          y: hoveredFolder ? 0 : Math.max(12, y),
          folderId: hoveredFolder?.id || null,
        });
        setDraggingDashboardItemId(null);
        return;
      }

      if (internalFolderId) {
        void updateFolder(internalFolderId, {
          x: hoveredFolder ? 0 : Math.max(12, x),
          y: hoveredFolder ? 0 : Math.max(12, y),
          parentFolderId: hoveredFolder?.id || null,
        });
        setDraggingDashboardItemId(null);
        return;
      }

      if (!dataTransfer.types.includes('Files')) return;
      const payloadFiles = await collectDroppedDesktopFiles(dataTransfer);
      if (payloadFiles.length === 0) return;

      await importEntries({
        files: payloadFiles,
        x: Math.max(12, x),
        y: Math.max(12, y),
        parentFolderId: hoveredFolder?.id || null,
      });
    };

    element.addEventListener('contextmenu', handleContextMenu);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);
    return () => {
      element.removeEventListener('contextmenu', handleContextMenu);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [boundsRef, editable, importEntries, rootFolders, updateDocument, updateFolder]);

  const surfaceLabel = useMemo(
    () => (surfaceType === 'base' ? 'dieser Base' : 'dem Haupt-Dashboard'),
    [surfaceType]
  );

  // --------------------------------------------
  // Drop-Target-Erkennung (Ordner auf Ordner ziehen)
  // --------------------------------------------

  const isFolderDescendant = (folderId: string, potentialChildId: string) => {
    let cursor = folderById.get(potentialChildId) || null;
    while (cursor) {
      if (cursor.parentFolderId === folderId) return true;
      cursor = cursor.parentFolderId ? folderById.get(cursor.parentFolderId) || null : null;
    }
    return false;
  };

  const resolveDropTargetFolder = (draggedId: string, nextX: number, nextY: number, w: number, h: number) => {
    const cx = nextX + w / 2;
    const cy = nextY + h / 2;
    return rootFolders.find((f) => {
      if (f.id === draggedId) return false;
      if (isFolderDescendant(draggedId, f.id)) return false;
      return cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height;
    });
  };

  const resolveFileDropTarget = (nextX: number, nextY: number, w: number, h: number) => {
    const cx = nextX + w / 2;
    const cy = nextY + h / 2;
    return rootFolders.find((f) => cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height);
  };

  // --------------------------------------------
  // Aktionen
  // --------------------------------------------

  const handleCreateRootFolder = async () => {
    if (!contextMenu) return;
    await createFolder({
      name: draftName,
      color: draftColor,
      x: Math.max(12, contextMenu.x),
      y: Math.max(12, contextMenu.y),
      width: ICON_W,
      height: ICON_H,
      parentFolderId: null,
    });
    setContextMenu(null);
  };

  const handleImportAtContext = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const payloadFiles = await readSelectedFiles(Array.from(files));
    const fallbackX = contextMenu ? Math.max(12, contextMenu.x) : 24;
    const fallbackY = contextMenu ? Math.max(12, contextMenu.y) : 24;
    await importEntries({ files: payloadFiles, x: fallbackX, y: fallbackY, parentFolderId: null });
    setContextMenu(null);
  };

  const handleDirectoryImportAtContext = async () => {
    try {
      const payloadFiles = await pickDesktopDirectoryFiles();
      if (payloadFiles.length === 0) return;
      const fallbackX = contextMenu ? Math.max(12, contextMenu.x) : 24;
      const fallbackY = contextMenu ? Math.max(12, contextMenu.y) : 24;
      await importEntries({ files: payloadFiles, x: fallbackX, y: fallbackY, parentFolderId: null });
      setContextMenu(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      window.alert(error instanceof Error ? error.message : 'Ordner konnte nicht geladen werden.');
    }
  };

  const handleRenameFolder = (folder: DashboardFolder) => {
    const nextName = window.prompt('Ordnername aktualisieren', folder.name);
    if (nextName === null) return;
    void updateFolder(folder.id, { name: nextName });
  };

  const handleCreateSubfolder = async (parentFolderId: string) => {
    const parent = folderById.get(parentFolderId);
    if (!parent) return;
    const folderName = window.prompt('Name fuer den Unterordner', 'Neuer Ordner');
    if (!folderName) return;
    await createFolder({
      name: folderName,
      color: parent.color,
      parentFolderId: parent.id,
      x: 0,
      y: 0,
      width: ICON_W,
      height: ICON_H,
    });
  };

  const handleWindowDrop = async (event: React.DragEvent<HTMLDivElement>, parentFolderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExternalDropActive(false);
    setIsWindowDropActiveId(null);

    const dt = event.dataTransfer;
    const internalDocumentId = dt.getData(DASHBOARD_DOCUMENT_DRAG_MIME);
    const internalFolderId = dt.getData(DASHBOARD_FOLDER_DRAG_MIME);

    // Intern: Datei oder Ordner aus einem Finder-Fenster in ein anderes (oder dasselbe) legen
    if (internalDocumentId) {
      setDraggingDashboardItemId(null);
      void updateDocument(internalDocumentId, {
        folderId: parentFolderId,
        x: 0,
        y: 0,
      });
      return;
    }

    if (internalFolderId) {
      setDraggingDashboardItemId(null);
      if (internalFolderId === parentFolderId) return;
      // Ziel liegt im Teilbaum des gezogenen Ordners -> Zyklus vermeiden
      if (isFolderDescendant(internalFolderId, parentFolderId)) return;
      void updateFolder(internalFolderId, {
        parentFolderId,
        x: 0,
        y: 0,
      });
      return;
    }

    const payloadFiles = await collectDroppedDesktopFiles(dt);
    if (payloadFiles.length === 0) return;
    await importEntries({ files: payloadFiles, parentFolderId, x: 0, y: 0 });
  };

  const handleDirectoryImportIntoFolder = async (parentFolderId: string) => {
    const parent = folderById.get(parentFolderId);
    if (!parent) return;
    try {
      const payloadFiles = await pickDesktopDirectoryFiles();
      if (payloadFiles.length === 0) return;
      await importEntries({ files: payloadFiles, parentFolderId: parent.id, x: 0, y: 0 });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      window.alert(error instanceof Error ? error.message : 'Ordner konnte nicht geladen werden.');
    }
  };

  const handleFolderLevelImport = async (files: FileList | null, parentFolderId: string | null) => {
    if (!parentFolderId || !files || files.length === 0) return;
    const payloadFiles = await readSelectedFiles(Array.from(files));
    await importEntries({ files: payloadFiles, parentFolderId, x: 0, y: 0 });
  };

  /**
   * Welches geoeffnete Finder-Fenster liegt unter der Mitte des gezogenen Root-Icons (von oben nach unten)?
   */
  const resolveOpenWindowTargetFolder = (
    nextX: number,
    nextY: number,
    w: number,
    h: number,
    draggedFolderId?: string
  ) => {
    if (!boundsRef.current) return null;
    const bounds = boundsRef.current.getBoundingClientRect();
    const cx = bounds.left + nextX + w / 2;
    const cy = bounds.top + nextY + h / 2;

    for (let i = finderWindows.length - 1; i >= 0; i--) {
      const fw = finderWindows[i];
      const el = finderWindowRefs.current.get(fw.instanceId);
      if (!el) continue;
      const windowBounds = el.getBoundingClientRect();
      const inside =
        cx >= windowBounds.left &&
        cx <= windowBounds.right &&
        cy >= windowBounds.top &&
        cy <= windowBounds.bottom;
      if (!inside) continue;
      if (draggedFolderId) {
        if (draggedFolderId === fw.folderId) continue;
        if (isFolderDescendant(draggedFolderId, fw.folderId)) continue;
      }
      return fw.folderId;
    }
    return null;
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Drop-Overlay */}
      <AnimatePresence>
        {isExternalDropActive ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-[12] rounded-[2rem] border border-dashed border-white/25 bg-white/[0.05] backdrop-blur-[2px]"
          >
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl border border-white/12 bg-black/35 px-4 py-2 text-sm font-medium text-white/90 shadow-xl backdrop-blur-xl">
                Dateien oder Ordner hier ablegen
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Root-Ordner */}
      {rootFolders.map((folder) => (
        <Rnd
          key={folder.id}
          bounds="parent"
          size={{ width: ICON_W, height: ICON_H }}
          position={{ x: folder.x, y: folder.y }}
          enableResizing={false}
          onDragStart={() => setDraggingDashboardItemId(`folder:${folder.id}`)}
          onDragStop={(_event, data) => {
            const openWindowTargetId = resolveOpenWindowTargetFolder(data.x, data.y, ICON_W, ICON_H, folder.id);
            const target = resolveDropTargetFolder(folder.id, data.x, data.y, ICON_W, ICON_H);
            void updateFolder(folder.id, {
              x: openWindowTargetId || target ? 0 : data.x,
              y: openWindowTargetId || target ? 0 : data.y,
              parentFolderId: openWindowTargetId || target?.id || null,
            });
            setDraggingDashboardItemId(null);
          }}
          style={{
            pointerEvents: 'auto',
            zIndex: draggingDashboardItemId === `folder:${folder.id}` ? 100002 : 8,
          }}
        >
          <RootFolderIcon
            folder={folder}
            onRename={handleRenameFolder}
            onDelete={(id) => void deleteFolder(id)}
            onOpen={openFinderFromRootFolder}
          />
        </Rnd>
      ))}

      {/* Root-Dateien */}
      {rootDocuments.map((doc) => (
        <Rnd
          key={doc.id}
          bounds="parent"
          size={{ width: ICON_W, height: ICON_H }}
          position={{ x: doc.x, y: doc.y }}
          enableResizing={false}
          onDragStart={() => setDraggingDashboardItemId(`document:${doc.id}`)}
          onDragStop={(_event, data) => {
            const openWindowTargetId = resolveOpenWindowTargetFolder(data.x, data.y, ICON_W, ICON_H);
            const target = resolveFileDropTarget(data.x, data.y, ICON_W, ICON_H);
            void updateDocument(doc.id, {
              x: openWindowTargetId || target ? 0 : data.x,
              y: openWindowTargetId || target ? 0 : data.y,
              folderId: openWindowTargetId || target?.id || null,
            });
            setDraggingDashboardItemId(null);
          }}
          style={{
            pointerEvents: 'auto',
            zIndex: draggingDashboardItemId === `document:${doc.id}` ? 100002 : 8,
          }}
        >
          <div data-dashboard-file>
            <RootDocumentIcon document={doc} onDelete={(id) => void deleteDocument(id)} onOpen={handleOpenDocument} />
          </div>
        </Rnd>
      ))}

      {/* ============================================
          Finder-Fenster – mehrere Instanzen, verschiebbar via Rnd
          ============================================ */}
      {isMounted && finderWindows.length > 0
        ? createPortal(
            <>
              <AnimatePresence mode="sync">
                {finderWindows.map((fw) => {
                  const currentFolder = folderById.get(fw.folderId);
                  if (!currentFolder) return null;

                  const folderBreadcrumb: DashboardFolder[] = [];
                  let crumb: DashboardFolder | null = currentFolder;
                  while (crumb) {
                    folderBreadcrumb.unshift(crumb);
                    crumb = crumb.parentFolderId ? folderById.get(crumb.parentFolderId) || null : null;
                  }

                  const currentChildFolders = folders
                    .filter((f) => f.parentFolderId === fw.folderId)
                    .sort((a, b) => a.name.localeCompare(b.name));
                  const currentDocuments = documents
                    .filter((d) => d.folderId === fw.folderId)
                    .sort((a, b) => a.name.localeCompare(b.name));
                  const currentItemCount = currentChildFolders.length + currentDocuments.length;
                  const finderW = getFinderDefaultWidthPx();

                  return (
                    <motion.div
                      key={fw.instanceId}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{ position: 'fixed', inset: 0, zIndex: 99998, pointerEvents: 'none' }}
                    >
                      <Rnd
                        data-dashboard-window
                        data-finder-instance={fw.instanceId}
                        default={{
                          x: fw.x,
                          y: fw.y,
                          width: finderW,
                          height: 'auto' as unknown as number,
                        }}
                        position={{ x: fw.x, y: fw.y }}
                        onDragStart={() => bringFinderToFront(fw.instanceId)}
                        onDrag={(_e, d) => updateFinderPosition(fw.instanceId, d.x, d.y)}
                        onDragStop={(_e, d) => updateFinderPosition(fw.instanceId, d.x, d.y)}
                        minWidth={480}
                        minHeight={300}
                        enableResizing={{
                          top: false,
                          right: true,
                          bottom: true,
                          left: true,
                          topRight: false,
                          bottomRight: true,
                          bottomLeft: true,
                          topLeft: false,
                        }}
                        dragHandleClassName="finder-title-bar"
                        cancel=".finder-no-drag"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <div
                          ref={(el) => {
                            if (el) finderWindowRefs.current.set(fw.instanceId, el);
                            else finderWindowRefs.current.delete(fw.instanceId);
                          }}
                          onMouseDown={() => bringFinderToFront(fw.instanceId)}
                          onDragOver={(e) => {
                            const types = Array.from(e.dataTransfer.types);
                            const allowFiles = types.includes('Files');
                            const allowInternal =
                              types.includes(DASHBOARD_DOCUMENT_DRAG_MIME) ||
                              types.includes(DASHBOARD_FOLDER_DRAG_MIME);
                            if (!allowFiles && !allowInternal) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setIsExternalDropActive(false);
                            setIsWindowDropActiveId(fw.instanceId);
                          }}
                          onDragLeave={(e) => {
                            const el = finderWindowRefs.current.get(fw.instanceId);
                            if (!el?.contains(e.relatedTarget as Node | null)) {
                              setIsWindowDropActiveId((cur) => (cur === fw.instanceId ? null : cur));
                            }
                          }}
                          onDrop={(e) => void handleWindowDrop(e, fw.folderId)}
                          className={`flex h-full flex-col overflow-hidden rounded-[1.6rem] border bg-[#1c1c1e]/[0.96] shadow-[0_32px_100px_rgba(0,0,0,0.6),0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-[60px] ${
                            isWindowDropActiveId === fw.instanceId
                              ? 'border-white/35 ring-1 ring-white/20'
                              : 'border-white/[0.13]'
                          }`}
                        >
                          {/* Titelleiste – Drag-Handle */}
                          <div
                            className="finder-title-bar flex cursor-grab select-none items-center gap-3 border-b border-white/[0.08] px-4 py-2.5 active:cursor-grabbing"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div
                              className="finder-no-drag flex cursor-default items-center gap-2"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => closeFinderWindow(fw.instanceId)}
                                className="group flex h-[13px] w-[13px] cursor-pointer items-center justify-center rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)] transition hover:brightness-110"
                                aria-label="Schliessen"
                              >
                                <X className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
                              </button>
                              <div className="group flex h-[13px] w-[13px] cursor-default items-center justify-center rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]">
                                <Minus className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
                              </div>
                              <div className="group flex h-[13px] w-[13px] cursor-default items-center justify-center rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]">
                                <Square className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
                              </div>
                            </div>

                            <div className="flex min-w-0 flex-1 items-center justify-center gap-1 text-[0.82rem] text-white/70">
                              <button
                                type="button"
                                onClick={() => closeFinderWindow(fw.instanceId)}
                                className="shrink-0 cursor-pointer transition hover:text-white"
                              >
                                Dashboard
                              </button>
                              {folderBreadcrumb.map((folder) => (
                                <span key={folder.id} className="inline-flex items-center gap-1">
                                  <ChevronRight className="h-3 w-3 shrink-0 text-white/35" />
                                  <button
                                    type="button"
                                    onClick={() => setFinderBrowseFolder(fw.instanceId, folder.id)}
                                    className={`cursor-pointer truncate transition hover:text-white ${
                                      folder.id === currentFolder.id ? 'font-semibold text-white' : ''
                                    }`}
                                  >
                                    {folder.name}
                                  </button>
                                </span>
                              ))}
                            </div>

                            <div
                              className="finder-no-drag flex shrink-0 cursor-pointer items-center gap-1.5"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => void handleCreateSubfolder(fw.folderId)}
                                title="Neuer Unterordner"
                                className="rounded-lg p-1.5 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                <FolderPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDirectoryImportIntoFolder(fw.folderId)}
                                title="Ordner importieren"
                                className="rounded-lg p-1.5 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                <Folder className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  folderImportTargetIdRef.current = fw.folderId;
                                  folderFileInputRef.current?.click();
                                }}
                                title="Dateien importieren"
                                className="rounded-lg p-1.5 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 280 }}>
                            {currentItemCount > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {currentChildFolders.map((folder) => (
                                  <FinderFolderItem
                                    key={folder.id}
                                    folder={folder}
                                    onOpen={(folderId) => setFinderBrowseFolder(fw.instanceId, folderId)}
                                    onDragStart={handleFinderFolderDragStart}
                                    onDragEnd={() => setDraggingDashboardItemId(null)}
                                  />
                                ))}
                                {currentDocuments.map((doc) => (
                                  <FinderFileItem
                                    key={doc.id}
                                    document={doc}
                                    onDelete={(id) => void deleteDocument(id)}
                                    onOpen={handleOpenDocument}
                                    onDragStart={handleFinderDocumentDragStart}
                                    onDragEnd={() => setDraggingDashboardItemId(null)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 text-white/40">
                                <HardDriveUpload className="h-10 w-10" strokeWidth={1.4} />
                                <div className="text-center">
                                  <p className="text-sm font-medium text-white/55">Ordner ist leer</p>
                                  <p className="mt-1 text-xs text-white/35">
                                    Dateien oder Ordner hierher ziehen, oder ueber + importieren
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Rnd>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <input
                ref={folderFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const targetFolderId = folderImportTargetIdRef.current;
                  folderImportTargetIdRef.current = null;
                  void handleFolderLevelImport(event.target.files, targetFolderId);
                  event.target.value = '';
                }}
              />
            </>,
            document.body
          )
        : null}

      {/* ============================================
          Datei-Vorschau-Fenster (schwebend, kein Tab)
          ============================================ */}
      {isMounted && openDocuments.length > 0
        ? createPortal(
            <>
              {openDocuments.map((doc, idx) => (
                <FilePreviewWindow
                  key={doc.id}
                  document={doc}
                  stackOffset={idx}
                  onClose={() => handleCloseDocument(doc.id)}
                />
              ))}
            </>,
            document.body
          )
        : null}

      {/* Rechtsklick-Kontextmenue */}
      <AnimatePresence>
        {contextMenu ? (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="pointer-events-auto absolute z-[20] w-[300px] rounded-2xl border border-white/15 bg-[#050816]/94 p-3 shadow-2xl backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-white/70" />
                <p className="text-sm font-semibold text-white">Dashboard Explorer</p>
              </div>
              <button
                type="button"
                onClick={() => setContextMenu(null)}
                className="rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-xs text-white/65">
              Ordnername
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
              />
            </label>

            <label className="mt-3 block text-xs text-white/65">
              Farbe
              <input
                type="color"
                value={draftColor}
                onChange={(event) => setDraftColor(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-white/5 p-1"
              />
            </label>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => void handleCreateRootFolder()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Leeren Ordner erstellen
              </button>
              <button
                type="button"
                onClick={() => void handleDirectoryImportAtContext()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Folder className="h-3.5 w-3.5" />
                Ordner importieren
              </button>
              <button
                type="button"
                onClick={() => rootFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <FileText className="h-3.5 w-3.5" />
                Dateien importieren
              </button>
            </div>

            <p className="mt-3 text-center text-[11px] text-white/35">
              Ordner vom Desktop direkt auf {surfaceLabel} ziehen
            </p>

            <input
              ref={rootFileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleImportAtContext(event.target.files);
                event.target.value = '';
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
