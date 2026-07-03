// ============================================
// LifeOS Module Builder - WebContainer Templates
//
// Zweck: Template-Dateien fuer das Vite-Projekt im WebContainer
// Erstellt die Basis-Projektstruktur mit React + lokalem Tailwind
// Verwendet von: /sandbox/wc (WebContainer Sandbox-Seite)
// ============================================

// --------------------------------------------
// WebContainer FileSystemTree Typen
// Eigene Definition um SSR-Kompatibilitaet sicherzustellen
// (kein direkter Import von @webcontainer/api noetig)
// --------------------------------------------

interface WCFile {
  file: { contents: string };
}

interface WCDirectory {
  directory: Record<string, WCFile | WCDirectory>;
}

// Kompatibel mit @webcontainer/api FileSystemTree
export type FileSystemTree = Record<string, WCFile | WCDirectory>;

function normalizePath(rawPath: string): string {
  return rawPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// --------------------------------------------
// Basis package.json fuer das Preview-Projekt
// Minimale Dependencies fuer schnelles npm install
// Tailwind laeuft lokal ueber @tailwindcss/vite
// --------------------------------------------

const BASE_PACKAGE_JSON = {
  name: 'lifeos-module-preview',
  private: true,
  type: 'module',
  scripts: {
    dev: 'vite --host',
  },
  dependencies: {
    'react': '^19.2.3',
    'react-dom': '^19.2.3',
    'zustand': '^5.0.10',
    'framer-motion': '^12.26.2',
    'lucide-react': '^0.562.0',
    'clsx': '^2.1.1',
    'tailwind-merge': '^3.4.0',
  },
  devDependencies: {
    '@tailwindcss/vite': '^4.1.12',
    '@vitejs/plugin-react': '^4.3.0',
    'tailwindcss': '^4.1.12',
    'vite': '^5.4.0',
  },
};

// --------------------------------------------
// Vite Config
// React Plugin + @/ Alias fuer LifeOS-Imports
// --------------------------------------------

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
`;

// --------------------------------------------
// index.html
// Dunkler Hintergrund passend zum LifeOS-Design
// --------------------------------------------

const INDEX_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Module Preview</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-gray-950 text-white min-h-screen">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

// --------------------------------------------
// Basis CSS fuer lokale Tailwind-Utilities
// Plus Theme-Token-Mapping fuer shadcn-aehnliche Klassen
// --------------------------------------------

const BASE_INDEX_CSS = `@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 262.1 83.3% 57.8%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 262.1 83.3% 57.8%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 263.4 70% 50.4%;
  --primary-foreground: 210 40% 98%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 263.4 70% 50.4%;
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
}

html, body, #root {
  min-height: 100%;
}
`;

// --------------------------------------------
// Mock: @/lib/theme
// Stellt useThemeStyles() bereit wenn Module den LifeOS-Theme importieren
// --------------------------------------------

const THEME_MOCK = `// Mock fuer @/lib/theme - LifeOS Theme-Styles
export function useThemeStyles() {
  return {
    surface: {
      base: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
      },
    },
    button: {
      base: {
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.75rem',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        color: '#fff',
      },
      primary: {
        background: '#8b5cf6',
        color: '#fff',
        borderRadius: '0.75rem',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        border: 'none',
      },
    },
    container: {
      base: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1rem',
      },
    },
    input: {
      base: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        color: '#fff',
      },
    },
    accentColor: '#8b5cf6',
    textColor: '#ffffff',
    surfaceColor: '#0a0a0a',
    designStyle: 'glass',
  };
}

export default { useThemeStyles };
`;

// --------------------------------------------
// Mock: @/lib/utils
// Stellt cn() bereit (Tailwind Classname-Merger)
// --------------------------------------------

const UTILS_MOCK = `// Mock fuer @/lib/utils - Utility-Funktionen
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default { cn };
`;

// --------------------------------------------
// Placeholder App
// Wird angezeigt bis echte Modul-Dateien ankommen
// Zeigt dem User dass die Umgebung bereit ist
// --------------------------------------------

const PLACEHOLDER_APP = `import React from 'react';

export default function App() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: '#555',
      fontFamily: 'system-ui, sans-serif',
      background: '#0a0a0a',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
        <p style={{ fontSize: '0.875rem' }}>Warte auf Modul...</p>
      </div>
    </div>
  );
}
`;

// --------------------------------------------
// main.tsx Generator
// Erstellt den Entry-Point der die App-Komponente importiert und rendert
// Wird bei jedem Modul-Update neu generiert
// --------------------------------------------

function generateMainTsx(entryFile: string): string {
  // Entferne Datei-Endung fuer den Import-Pfad
  const importPath = './' + entryFile.replace(/\.(tsx|jsx|ts|js)$/, '');

  return `import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';

type AnyComponent = React.ComponentType<Record<string, unknown>>;
type ModuleRecord = Record<string, unknown>;

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Preview Runtime Error]', error);
    reportPreviewError('runtime', error, {
      componentStack: errorInfo?.componentStack || '',
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111827',
          color: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '1rem',
        }}>
          <div style={{
            maxWidth: '720px',
            width: '100%',
            background: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            borderRadius: '12px',
            padding: '1rem',
          }}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#fca5a5' }}>
              Runtime-Fehler im Modul
            </h2>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#d1d5db' }}>
              {this.state.error.message}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ROOT_EXPORT_NAMES = ['App', 'Page', 'Root', 'Widget', 'Module', 'Main'] as const;
const MAX_SYNC_UPDATES_PER_TICK = 120;

let syncUpdateCount = 0;
let resetScheduled = false;

const setterGuardCache = new WeakMap<Function, Function>();
const dispatchGuardCache = new WeakMap<Function, Function>();

function scheduleSyncCounterReset() {
  if (resetScheduled) return;
  resetScheduled = true;
  queueMicrotask(() => {
    syncUpdateCount = 0;
    resetScheduled = false;
  });
}

function canRunSyncUpdate() {
  scheduleSyncCounterReset();
  if (syncUpdateCount >= MAX_SYNC_UPDATES_PER_TICK) {
    console.warn(
      '[Preview Guard] Zu viele synchrone State-Updates erkannt. Ein Update wurde verworfen, um eine Endlosschleife zu verhindern.',
    );
    return false;
  }
  syncUpdateCount += 1;
  return true;
}

function guardSetter<S>(setter: React.Dispatch<React.SetStateAction<S>>): React.Dispatch<React.SetStateAction<S>> {
  const cached = setterGuardCache.get(setter);
  if (cached) {
    return cached as React.Dispatch<React.SetStateAction<S>>;
  }

  const guarded: React.Dispatch<React.SetStateAction<S>> = (value) => {
    if (!canRunSyncUpdate()) return;
    setter(value);
  };

  setterGuardCache.set(setter, guarded as unknown as Function);
  return guarded;
}

function guardDispatch<A>(dispatch: React.Dispatch<A>): React.Dispatch<A> {
  const cached = dispatchGuardCache.get(dispatch);
  if (cached) {
    return cached as React.Dispatch<A>;
  }

  const guarded: React.Dispatch<A> = (action) => {
    if (!canRunSyncUpdate()) return;
    dispatch(action);
  };

  dispatchGuardCache.set(dispatch, guarded as unknown as Function);
  return guarded;
}

const originalUseState = React.useState.bind(React);
const originalUseReducer = React.useReducer.bind(React);

// Preview-only Schutz gegen Endlosschleifen in AI-generierten Komponenten.
(React as typeof React & {
  useState: typeof React.useState;
  useReducer: typeof React.useReducer;
}).useState = function patchedUseState<S>(
  initialState: S | (() => S),
) {
  const tuple = originalUseState(initialState);
  const state = tuple[0];
  const setter = tuple[1];
  return [state, guardSetter(setter)] as [S, React.Dispatch<React.SetStateAction<S>>];
};

(React as typeof React & {
  useReducer: typeof React.useReducer;
}).useReducer = function patchedUseReducer<S, A>(
  reducer: React.Reducer<S, A>,
  initialArg: S,
  init?: (arg: S) => S,
) {
  const tuple = init
    ? originalUseReducer(reducer, initialArg, init)
    : originalUseReducer(reducer, initialArg);
  const state = tuple[0];
  const dispatch = tuple[1];
  return [state, guardDispatch(dispatch)] as [S, React.Dispatch<A>];
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Preview root element (#root) fehlt');
}

const root = createRoot(rootElement);

function extractLocation(message: string): { file?: string; line?: number; column?: number } {
  const locationMatch = message.match(/([\\w./-]+\\.(?:tsx?|jsx?|css|json)):(\\d+):(\\d+)/);
  if (!locationMatch) return {};
  const [, file, line, column] = locationMatch;
  return {
    file,
    line: Number.parseInt(line, 10),
    column: Number.parseInt(column, 10),
  };
}

function postPreviewEvent(payload: Record<string, unknown>) {
  try {
    window.parent?.postMessage(payload, '*');
  } catch {
    // ignore postMessage errors in preview sandbox
  }
}

function reportPreviewError(
  kind: 'runtime' | 'import' | 'entry_contract' | 'unknown',
  errorLike: unknown,
  extra: Record<string, unknown> = {},
) {
  const message = errorLike instanceof Error
    ? errorLike.message
    : typeof errorLike === 'string'
      ? errorLike
      : 'Unbekannter Preview-Fehler';
  const stack = errorLike instanceof Error ? errorLike.stack : undefined;
  const location = extractLocation(message);

  postPreviewEvent({
    type: 'WC_PREVIEW_ERROR',
    error: {
      kind,
      message,
      stack,
      ...location,
      ...extra,
      timestamp: Date.now(),
    },
  });
}

function reportPreviewOk() {
  postPreviewEvent({ type: 'WC_PREVIEW_OK', timestamp: Date.now() });
}

function renderErrorCard(title: string, description: string, borderColor: string, titleColor: string, footer?: string) {
  root.render(
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111827',
      color: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '1rem',
    }}>
      <div style={{
        maxWidth: '720px',
        width: '100%',
        background: 'rgba(17, 24, 39, 0.92)',
        border: \`1px solid \${borderColor}\`,
        borderRadius: '12px',
        padding: '1rem',
      }}>
        <h2 style={{ margin: 0, fontSize: '1rem', color: titleColor }}>
          {title}
        </h2>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#d1d5db' }}>
          {description}
        </p>
        {footer ? (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
            {footer}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function resolveRootComponent(moduleRecord: ModuleRecord): AnyComponent | null {
  const defaultExport = moduleRecord.default;
  if (typeof defaultExport === 'function') {
    const fnName = (defaultExport as Function).name || 'default';
    const acceptsProps = (defaultExport as Function).length > 0;
    const looksLikeRoot = ROOT_EXPORT_NAMES.includes(fnName as typeof ROOT_EXPORT_NAMES[number]) || fnName === 'default';
    if (!acceptsProps || looksLikeRoot) {
      return defaultExport as AnyComponent;
    }
  }

  for (const name of ROOT_EXPORT_NAMES) {
    const candidate = moduleRecord[name];
    if (typeof candidate === 'function') {
      return candidate as AnyComponent;
    }
  }

  return null;
}

async function loadAndRender() {
  try {
    const loadedModule = (await import('${importPath}')) as ModuleRecord;
    const availableExports = Object.keys(loadedModule).filter(key => key !== '__esModule');
    const resolvedRootComponent = resolveRootComponent(loadedModule);

    if (!resolvedRootComponent) {
      reportPreviewError('entry_contract', 'Kein renderbarer Export gefunden', { availableExports });
      renderErrorCard(
        'Kein renderbarer Export gefunden',
        'Bitte exportiere eine Root-Komponente (z. B. export default function App() oder export function App()).',
        'rgba(245, 158, 11, 0.35)',
        '#fcd34d',
        \`Gefundene Exports: \${availableExports.join(', ') || 'keine'}\`
      );
      return;
    }

    const App = resolvedRootComponent;
    root.render(
      <PreviewErrorBoundary>
        <App />
      </PreviewErrorBoundary>
    );
    reportPreviewOk();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Preview Import Error]', error);
    reportPreviewError('import', error);
    renderErrorCard(
      'Build-/Import-Fehler im Modul',
      message,
      'rgba(239, 68, 68, 0.45)',
      '#fca5a5'
    );
  }
}

void loadAndRender();
`;
}

// --------------------------------------------
// Basis-Projektstruktur erstellen
// Wird beim ersten Boot gemountet (vor Modul-Dateien)
// Enthaelt Placeholder-App damit Vite direkt starten kann
// npm install kann sofort laufen (parallel zur LLM-Generierung)
// --------------------------------------------

export function getBaseProjectTree(): FileSystemTree {
  return {
    'package.json': {
      file: { contents: JSON.stringify(BASE_PACKAGE_JSON, null, 2) },
    },
    'vite.config.ts': {
      file: { contents: VITE_CONFIG },
    },
    'index.html': {
      file: { contents: INDEX_HTML },
    },
    'src': {
      directory: {
        'index.css': {
          file: { contents: BASE_INDEX_CSS },
        },
        'main.tsx': {
          file: { contents: generateMainTsx('App.tsx') },
        },
        'App.tsx': {
          file: { contents: PLACEHOLDER_APP },
        },
        'lib': {
          directory: {
            'theme.ts': {
              file: { contents: THEME_MOCK },
            },
            'utils.ts': {
              file: { contents: UTILS_MOCK },
            },
          },
        },
      },
    },
  };
}

// --------------------------------------------
// Modul-Dateien in FileSystemTree konvertieren
// Streift den Module-Root-Prefix ab (z.B. "counter-app/")
// Legt alle Dateien unter src/ an
// Generiert main.tsx mit korrektem Entry-Import
// --------------------------------------------

export function buildModuleFileTree(
  moduleFiles: Array<{ path: string; content: string }>,
): { tree: FileSystemTree; entryFile: string } {
  const normalizedFiles = moduleFiles
    .map(file => ({
      path: normalizePath(file.path),
      content: file.content,
    }))
    .filter(file => file.path.length > 0);

  // Entry-Point aus module.json ermitteln
  let configuredEntry: string | null = null;
  const moduleJson = normalizedFiles.find(f => f.path.endsWith('module.json'));
  if (moduleJson) {
    try {
      const parsed = JSON.parse(moduleJson.content);
      if (typeof parsed.entry === 'string' && parsed.entry.trim().length > 0) {
        configuredEntry = normalizePath(parsed.entry);
      }
    } catch {
      // module.json nicht parsebar, Standard verwenden
    }
  }

  // Module-Root erkennen (erstes gemeinsames Verzeichnis)
  // z.B. "counter-app" wenn alle Dateien mit "counter-app/" beginnen
  const firstSegments = normalizedFiles
    .filter(f => !f.path.endsWith('module.json') && !f.path.endsWith('README.md'))
    .map(f => f.path.split('/')[0])
    .filter(Boolean);
  const moduleRoot =
    firstSegments.length > 0 && firstSegments.every(s => s === firstSegments[0])
      ? firstSegments[0]
      : null;

  // src/ Verzeichnis aufbauen
  const srcTree: Record<string, WCFile | WCDirectory> = {};
  const mountedPaths: string[] = [];

  for (const file of normalizedFiles) {
    // module.json und README.md ueberspringen (nicht fuer Vite relevant)
    if (file.path.endsWith('module.json')) continue;
    if (file.path.endsWith('README.md')) continue;

    // Module-Root-Prefix entfernen
    let relativePath = file.path;
    if (moduleRoot && relativePath.startsWith(moduleRoot + '/')) {
      relativePath = relativePath.slice(moduleRoot.length + 1);
    }

    // Verschachtelte Verzeichnisstruktur aufbauen
    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length === 0) {
      continue;
    }
    let current = srcTree;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = { directory: {} };
      }
      current = (current[parts[i]] as WCDirectory).directory;
    }

    // Datei einfuegen
    const fileName = parts[parts.length - 1];
    current[fileName] = {
      file: { contents: file.content },
    };
    mountedPaths.push(parts.join('/'));
  }

  const mountedSet = new Set(mountedPaths);

  const resolveEntryFile = (): string => {
    const fallbackPriority = ['App.tsx', 'app.tsx', 'index.tsx', 'main.tsx', 'page.tsx', 'Page.tsx', 'Widget.tsx'];
    const isLikelyLeafPath = (path: string) =>
      /(^|\/)(components|widgets|hooks|store)(\/|$)/i.test(path);

    const withExtensionVariants = (candidate: string): string[] => {
      const normalized = normalizePath(candidate);
      if (!normalized) return [];
      if (/\.[a-zA-Z0-9]+$/.test(normalized)) return [normalized];
      return [
        normalized,
        `${normalized}.tsx`,
        `${normalized}.jsx`,
        `${normalized}.ts`,
        `${normalized}.js`,
      ];
    };

    const scoreMatch = (path: string): number => {
      const lowerPath = path.toLowerCase();
      let score = path.split('/').filter(Boolean).length * 10;
      if (lowerPath.includes('/components/')) score += 40;
      if (lowerPath.includes('/widgets/')) score += 30;
      if (lowerPath.includes('/hooks/')) score += 25;
      if (lowerPath.includes('/store/')) score += 20;
      return score;
    };

    const pickBestMatch = (matches: string[]): string | null => {
      if (matches.length === 0) return null;
      const sorted = [...matches].sort((a, b) => {
        const scoreDiff = scoreMatch(a) - scoreMatch(b);
        if (scoreDiff !== 0) return scoreDiff;
        return a.localeCompare(b);
      });
      return sorted[0];
    };

    const resolveCandidate = (candidate: string): string | null => {
      const variants = withExtensionVariants(candidate);

      for (const variant of variants) {
        if (mountedSet.has(variant)) {
          return variant;
        }
      }

      for (const variant of variants) {
        const suffixMatches = mountedPaths.filter(path => path.endsWith(`/${variant}`));
        const bestSuffixMatch = pickBestMatch(suffixMatches);
        if (bestSuffixMatch) {
          return bestSuffixMatch;
        }
      }

      return null;
    };

    const resolveConfiguredEntry = (): string | null => {
      if (!configuredEntry) return null;

      const configuredCandidates: string[] = [configuredEntry];
      if (configuredEntry.startsWith('src/')) {
        configuredCandidates.push(configuredEntry.slice(4));
      }
      if (moduleRoot) {
        configuredCandidates.push(`${moduleRoot}/${configuredEntry}`);
      }
      const baseName = configuredEntry.split('/').pop();
      if (baseName) {
        configuredCandidates.push(baseName);
      }

      for (const candidate of dedupe(configuredCandidates.map(normalizePath).filter(Boolean))) {
        const resolved = resolveCandidate(candidate);
        if (resolved) {
          return resolved;
        }
      }

      return null;
    };

    const resolvePreferredRootEntry = (): string | null => {
      const rootCandidates: string[] = [];
      for (const fileName of fallbackPriority) {
        rootCandidates.push(fileName);
        if (moduleRoot) {
          rootCandidates.push(`${moduleRoot}/${fileName}`);
        }
      }

      for (const candidate of dedupe(rootCandidates.map(normalizePath).filter(Boolean))) {
        const resolved = resolveCandidate(candidate);
        if (resolved) {
          return resolved;
        }
      }

      return null;
    };

    const configuredResolved = resolveConfiguredEntry();
    const preferredRoot = resolvePreferredRootEntry();

    if (configuredResolved) {
      if (!isLikelyLeafPath(configuredResolved)) {
        return configuredResolved;
      }
      if (preferredRoot) return preferredRoot;
    }

    if (preferredRoot) {
      return preferredRoot;
    }

    return 'App.tsx';
  };

  const entryFile = resolveEntryFile();

  // Mock-Dateien fuer @/lib/theme und @/lib/utils einfuegen
  // Aber nur wenn das Modul keine eigenen Versionen mitliefert
  if (!srcTree['lib']) {
    srcTree['lib'] = { directory: {} };
  }
  const libDir = (srcTree['lib'] as WCDirectory).directory;
  if (!libDir['theme.ts']) {
    libDir['theme.ts'] = { file: { contents: THEME_MOCK } };
  }
  if (!libDir['utils.ts']) {
    libDir['utils.ts'] = { file: { contents: UTILS_MOCK } };
  }

  // main.tsx mit korrektem Entry-Import generieren
  const mainTsx = generateMainTsx(entryFile);

  return {
    tree: {
      'src': {
        directory: {
          ...srcTree,
          'main.tsx': {
            file: { contents: mainTsx },
          },
        },
      },
    },
    entryFile,
  };
}
