// ============================================
// DynamicModuleLoader - Lädt und rendert kompilierte Module
// 
// Zweck: Führt den serverseitig kompilierten JavaScript-Code aus
//        und rendert die generierte Komponente
// Verwendet von: Sandbox Page
// ============================================

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useSandboxStores } from './SandboxProvider';
import { createModuleAPI, moduleRegistry } from '@/lib/lab/module-runtime';

// --------------------------------------------
// Typen
// --------------------------------------------

interface ModuleFile {
  path: string;
  content: string;
}

interface DynamicModuleLoaderProps {
  compiledCode?: string;
  files?: ModuleFile[];
  moduleName: string;
  onError: (error: Error) => void;
  onLoaded: () => void;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function DynamicModuleLoader({
  compiledCode,
  files,
  moduleName,
  onError,
  onLoaded,
}: DynamicModuleLoaderProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const themeStyles = useThemeStyles();
  const sandboxStores = useSandboxStores();

  // --------------------------------------------
  // Globale Dependencies für den kompilierten Code
  // Diese werden als "require" Mock bereitgestellt
  // --------------------------------------------
  
  const moduleCache = useMemo(() => {
    // ============================================
    // ZUSTAND MOCK - Verwendet useSyncExternalStore
    // Das ist der offizielle Weg für externe Stores in React 18+
    // KEIN useState/useEffect in der Store-Implementierung!
    // ============================================
    
    type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    type GetState<T> = () => T;
    type Subscribe = (listener: () => void) => () => void;
    type StoreApi<T> = {
      setState: SetState<T>;
      getState: GetState<T>;
      subscribe: Subscribe;
      destroy: () => void;
    };
    type StateCreator<T> = (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => T;
    
    // createStore unterstützt BEIDE Zustand-Syntaxen:
    // 1. create((set) => ({ ... }))  - Direkt
    // 2. create()((set) => ({ ... })) - TypeScript-Style mit Typen
    function createStore<T extends object>(createState?: StateCreator<T> | T) {
      // Wenn kein Argument gegeben, gib eine Funktion zurück die den StateCreator erwartet
      // Das ermöglicht: create<State>()((set) => ({ ... }))
      if (createState === undefined) {
        return (actualCreateState: StateCreator<T>) => createStoreImpl<T>(actualCreateState);
      }
      
      // Direkte Verwendung: create((set) => ({ ... }))
      return createStoreImpl<T>(createState);
    }
    
    function createStoreImpl<T extends object>(
      createState: StateCreator<T> | T
    ): ((<U>(selector?: (state: T) => U) => U) & StoreApi<T>) {
      
      let state: T;
      const listeners = new Set<() => void>();
      
      const setState: SetState<T> = (partial, replace) => {
        const nextState = typeof partial === 'function' 
          ? (partial as (state: T) => Partial<T>)(state) 
          : partial;
        
        if (!Object.is(nextState, state)) {
          state = replace 
            ? (nextState as T) 
            : { ...state, ...nextState };
          // Benachrichtige alle Listener (ohne previousState - useSyncExternalStore braucht das nicht)
          listeners.forEach((listener) => listener());
        }
      };
      
      const getState: GetState<T> = () => state;
      
      // Subscribe-Funktion für useSyncExternalStore
      const subscribe: Subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };
      
      const destroy = () => {
        listeners.clear();
      };
      
      const api: StoreApi<T> = { setState, getState, subscribe, destroy };
      
      // Initialisiere den State
      if (typeof createState === 'function') {
        state = (createState as StateCreator<T>)(setState, getState, api);
      } else if (createState !== undefined) {
        state = createState;
      } else {
        state = {} as T;
      }
      
      // Der Hook - OHNE useSyncExternalStore
      // Wir verwenden stattdessen useState + useEffect für Subscriptions
      // Das ist der klassische Zustand-Ansatz vor React 18
      const useStore = <U = T>(selector?: (state: T) => U): U => {
        // Prüfe ob wir in einem React-Render sind
        // React's internals zeigen an ob ein Render aktiv ist
        const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        const dispatcher = ReactInternals?.ReactCurrentDispatcher?.current;
        
        // Wenn kein Dispatcher (außerhalb von Komponente), gib State direkt zurück
        if (!dispatcher || dispatcher.readContext === undefined) {
          const result = selector ? selector(getState()) : getState();
          return result as U;
        }
        
        // Innerhalb einer Komponente - verwende useState + useEffect
        const [, forceUpdate] = React.useState({});
        const stateRef = React.useRef<U | T>(undefined as U | T);
        const selectorRef = React.useRef(selector);
        selectorRef.current = selector;
        
        React.useEffect(() => {
          const unsubscribe = subscribe(() => {
            const nextState = selectorRef.current 
              ? selectorRef.current(getState()) 
              : getState();
            
            if (!Object.is(stateRef.current, nextState)) {
              stateRef.current = nextState;
              forceUpdate({});
            }
          });
          return unsubscribe;
        }, []);
        
        const currentState = getState();
        const result = selector ? selector(currentState) : currentState;
        stateRef.current = result;
        return result as U;
      };
      
      // API-Methoden anhängen
      useStore.getState = getState;
      useStore.setState = setState;
      useStore.subscribe = subscribe;
      useStore.destroy = destroy;
      
      return useStore as ((<U>(selector?: (state: T) => U) => U) & StoreApi<T>);
    };

    // Persist Middleware - Simplifiziert
    const persist = <T extends object>(
      config: StateCreator<T>,
      options: { name: string; partialize?: (state: T) => Partial<T> }
    ): StateCreator<T> => {
      return (set, get, api) => {
        const wrappedSet: SetState<T> = (partial, replace) => {
          set(partial, replace);
          console.log(`[persist] ${options.name}:`, get());
        };
        return config(wrappedSet, get, api);
      };
    };

    // ============================================
    // REACT MODULE - Alle Exports von EINER Instanz
    // WICHTIG: __esModule + default für CJS-Interop
    // ============================================
    
    // React als CJS-kompatibles Modul bereitstellen
    // esbuild CJS-Output prüft __esModule für Default-Import-Handling
    const reactModule: Record<string, unknown> = { __esModule: true, default: React };
    for (const key of Object.getOwnPropertyNames(React)) {
      if (key !== '__esModule' && key !== 'default') {
        reactModule[key] = (React as Record<string, unknown>)[key];
      }
    }
    
    return {
      // React - VOLLSTÄNDIG mit __esModule + default für CJS-Interop
      'react': reactModule,
      
      // React JSX Runtime (falls esbuild automatic JSX nutzt)
      'react/jsx-runtime': {
        jsx: React.createElement,
        jsxs: React.createElement,
        Fragment: React.Fragment,
        __esModule: true,
      },
      
      'react/jsx-dev-runtime': {
        jsxDEV: React.createElement,
        Fragment: React.Fragment,
        __esModule: true,
      },
      
      // React DOM (für Kompatibilität)
      'react-dom': {
        default: { createPortal: (_children: unknown) => null, render: () => {} },
        createPortal: (_children: unknown) => null,
        render: () => {},
        __esModule: true,
      },
      
      'react-dom/client': {
        createRoot: () => ({ render: () => {}, unmount: () => {} }),
        hydrateRoot: () => ({ render: () => {}, unmount: () => {} }),
        __esModule: true,
      },
      
      // Framer Motion - VOLLSTÄNDIG mit allen gängigen Exports
      'framer-motion': {
        motion,
        AnimatePresence,
        // Hooks
        useAnimation: () => ({ start: () => Promise.resolve(), stop: () => {} }),
        useInView: () => false,
        useScroll: () => ({ scrollY: 0, scrollYProgress: 0, scrollX: 0, scrollXProgress: 0 }),
        useMotionValue: (initial: number = 0) => ({ get: () => initial, set: () => {}, on: () => () => {} }),
        useTransform: () => ({ get: () => 0, set: () => {} }),
        useSpring: () => ({ get: () => 0, set: () => {} }),
        useMotionTemplate: () => '',
        useAnimationControls: () => ({ start: () => Promise.resolve(), stop: () => {} }),
        useReducedMotion: () => false,
        // Komponenten
        LazyMotion: ({ children }: { children: React.ReactNode }) => children,
        LayoutGroup: ({ children }: { children: React.ReactNode }) => children,
        // Aliase
        m: motion,
        domAnimation: {},
        domMax: {},
        // esbuild CJS-Interop
        default: { motion, AnimatePresence },
        __esModule: true,
      },
      
      // Lucide Icons - Vollständiges Icon-Set
      'lucide-react': {
        ...LucideIcons,
        default: LucideIcons,
        __esModule: true,
      },
      
      // Zustand (Hauptmodul)
      'zustand': {
        create: createStore,
        default: createStore,
        __esModule: true,
      },
      
      // Zustand Middleware (persist, devtools, etc.)
      // Diese Middleware-Funktionen wrappen den StateCreator
      'zustand/middleware': {
        // persist: Simuliert Persistenz (in Sandbox ohne echten Storage)
        persist,
        // devtools: Transparenter Passthrough (keine Redux DevTools in Sandbox)
        devtools: <T,>(config: T, _options?: unknown) => config,
        // subscribeWithSelector: Transparenter Passthrough
        subscribeWithSelector: <T,>(config: T) => config,
        // combine: Transparenter Passthrough
        combine: <T,>(config: T) => config,
        // redux: Transparenter Passthrough
        redux: <T,>(config: T) => config,
        // immer: Transparenter Passthrough (kein Immer in Sandbox)
        immer: <T,>(config: T) => config,
        default: { persist },
        __esModule: true,
      },
      
      // LifeOS Utilities - OPTIONAL für Module die Theme nutzen wollen
      // Module haben 100% kreative Freiheit und müssen Theme nicht verwenden!
      '@/lib/theme': {
        useThemeStyles: () => ({
          // Original Theme-Styles zuerst, dann Defaults überschreiben falls nötig
          ...themeStyles,
          // Fallback-Defaults falls themeStyles unvollständig
          surface: themeStyles.surface || { base: {} },
          container: themeStyles.container || { base: {} },
          accentColor: themeStyles.accentColor || '#8b5cf6',
          designStyle: themeStyles.designStyle || 'glass',
          textColor: themeStyles.textColor || '#ffffff',
          buttonTextColor: themeStyles.buttonTextColor || '#ffffff',
        }),
        __esModule: true,
      },
      
      '@/lib/utils': {
        cn,
        __esModule: true,
      },
    };
  }, [themeStyles]);

  // --------------------------------------------
  // Kompilierten Code ausführen
  // --------------------------------------------
  
  const executeCompiledCode = useCallback(() => {
    if (!compiledCode) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('[DynamicModuleLoader] Führe kompilierten Code aus');
      
      // ============================================
      // KRITISCH: Setze React als GLOBALE Variable
      // So gibt es definitiv nur EINE React-Instanz
      // ============================================
      
      // Setze React und alle Dependencies auf window (global)
      const win = window as unknown as Record<string, unknown>;
      win.React = React;
      win.__SANDBOX_REACT__ = React;
      win.__SANDBOX_FRAMER__ = { motion, AnimatePresence };
      win.__SANDBOX_LUCIDE__ = LucideIcons;
      win.__SANDBOX_ZUSTAND__ = moduleCache['zustand'];
      win.__SANDBOX_ZUSTAND_MW__ = moduleCache['zustand/middleware'];
      win.__SANDBOX_THEME__ = moduleCache['@/lib/theme'];
      win.__SANDBOX_UTILS__ = moduleCache['@/lib/utils'];
      
      // ============================================
      // MODULE API für Inter-Modul-Kommunikation
      // Ermöglicht Modulen, Actions zu registrieren
      // ============================================
      
      // Erstelle Module-ID aus moduleName (kebab-case)
      const moduleId = moduleName.toLowerCase().replace(/\s+/g, '-');
      
      // Entferne alte Registrierungen dieses Moduls
      moduleRegistry.unregisterModule(moduleId);
      
      // Erstelle neue API für dieses Modul
      const moduleAPI = createModuleAPI(moduleId);
      win.__moduleAPI = moduleAPI;
      win.__MODULE_ID__ = moduleId;
      
      console.log(`[DynamicModuleLoader] Module API erstellt für: ${moduleId}`);
      
      // ============================================
      // PROXY FACTORY - Für unbekannte Module
      // Statt {} zurückzugeben (was zu "undefined" Fehlern führt),
      // erstelle einen Proxy der Stub-Komponenten zurückgibt.
      // So crasht das Modul nicht, sondern zeigt Platzhalter.
      // ============================================
      
      const createModuleProxy = (modName: string): unknown => {
        const proxyCache: Record<string, unknown> = {};
        return new Proxy({} as Record<string | symbol, unknown>, {
          get(_target, prop: string | symbol) {
            if (typeof prop === 'symbol') return undefined;
            if (prop === '__esModule') return true;
            if (prop === 'then') return undefined; // Nicht als Promise behandeln
            
            // Cache Stubs um Referenzgleichheit zu gewährleisten
            if (proxyCache[prop]) return proxyCache[prop];
            
            // Erstelle Stub-Komponente die visuell zeigt was fehlt
            const displayName = `${modName}/${String(prop)}`;
            const StubComponent = React.forwardRef(function SandboxStub(
              props: Record<string, unknown>, 
              ref: React.Ref<HTMLDivElement>
            ) {
              return React.createElement('div', {
                ref,
                'data-sandbox-stub': displayName,
                style: { 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  border: '1px dashed rgba(251,191,36,0.5)', 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  fontSize: '10px', 
                  color: 'rgba(251,191,36,0.8)',
                  background: 'rgba(251,191,36,0.05)',
                },
                ...(typeof props === 'object' && props !== null ? (() => {
                  // Nur sichere HTML-Attribute durchlassen
                  const safe: Record<string, unknown> = {};
                  for (const [k, v] of Object.entries(props)) {
                    if (['className', 'style', 'id', 'title', 'onClick'].includes(k)) {
                      safe[k] = v;
                    }
                  }
                  return safe;
                })() : {}),
              }, `⚠ ${displayName}`);
            });
            StubComponent.displayName = `Stub(${displayName})`;
            proxyCache[prop] = StubComponent;
            return StubComponent;
          }
        });
      };
      
      // Require-Funktion die IMMER die gleichen globalen Instanzen zurückgibt
      // Bei unbekannten Modulen: Proxy mit Stub-Komponenten statt {}
      const requireFn = (reqModuleName: string): unknown => {
        // Prüfe ob wir das Modul im Cache haben
        const cached = moduleCache[reqModuleName];
        if (cached !== undefined) {
          return cached;
        }
        
        // Spezial: zustand Subpaths (zustand/shallow, zustand/traditional, etc.)
        if (reqModuleName.startsWith('zustand/')) {
          console.warn(`[Sandbox] Zustand-Subpath "${reqModuleName}" → Passthrough`);
          return { 
            __esModule: true,
            default: <T,>(x: T) => x, // Transparenter Passthrough
          };
        }
        
        // Spezial: @/ Pfade die nicht aufgelöst wurden
        // (lokale Module-Imports die esbuild als external markiert hat)
        if (reqModuleName.startsWith('@/') || reqModuleName.startsWith('./') || reqModuleName.startsWith('../')) {
          console.warn(`[Sandbox] Unaufgelöster lokaler Import: "${reqModuleName}" → Stub`);
          return createModuleProxy(reqModuleName);
        }
        
        // Unbekanntes externes Modul
        console.warn(`[Sandbox] ⚠️ Unbekanntes Modul: "${reqModuleName}" → Stub-Proxy`);
        return createModuleProxy(reqModuleName);
      };
      
      // Erstelle CommonJS-kompatible Umgebung
      const moduleObj = { exports: {} as Record<string, unknown> };
      
      const customConsole = {
        log: (...args: unknown[]) => console.log('[Module]', ...args),
        warn: (...args: unknown[]) => console.warn('[Module]', ...args),
        error: (...args: unknown[]) => console.error('[Module]', ...args),
        info: (...args: unknown[]) => console.info('[Module]', ...args),
      };
      
      // ============================================
      // FACTORY - Kompilierten Code ausführen
      // React wird als Parameter UND global gesetzt
      // ============================================
      
      // eslint-disable-next-line no-new-func
      const factory = new Function(
        'require',
        'module', 
        'exports',
        'console',
        'React',  // React als Parameter UND global verfügbar
        compiledCode
      );
      
      // Übergebe React - jetzt ist es sowohl Parameter als auch auf window
      factory(
        requireFn, 
        moduleObj, 
        moduleObj.exports, 
        customConsole,
        React  // Direkt das importierte React, nicht aus moduleCache
      );
      
      console.log('[DynamicModuleLoader] Module.exports keys:', Object.keys(moduleObj.exports));
      
      // Finde die Hauptkomponente
      const exports = moduleObj.exports;
      
      // Suche nach default export oder benannten Exports
      let ModuleComponent: React.ComponentType | null = null;
      
      if (typeof exports.default === 'function') {
        ModuleComponent = exports.default as React.ComponentType;
        console.log('[DynamicModuleLoader] ✅ Default-Export Komponente gefunden');
      } else {
        // Suche nach einer Funktion die mit Großbuchstaben beginnt (Komponente)
        for (const key of Object.keys(exports)) {
          const value = exports[key];
          if (typeof value === 'function' && /^[A-Z]/.test(key)) {
            ModuleComponent = value as React.ComponentType;
            console.log(`[DynamicModuleLoader] ✅ Named-Export Komponente "${key}" gefunden`);
            break;
          }
        }
      }
      
      if (!ModuleComponent) {
        const exportKeys = Object.keys(exports).join(', ') || '(leer)';
        throw new Error(
          `Keine Komponente im Modul gefunden.\n` +
          `Gefundene Exports: ${exportKeys}\n` +
          `Tipp: Stelle sicher dass die Hauptkomponente als "export default" exportiert wird.`
        );
      }
      
      setComponent(() => ModuleComponent);
      setLoading(false);
      onLoaded();
      
    } catch (err) {
      console.error('[DynamicModuleLoader] ❌ Fehler:', err);
      setLoading(false);
      
      // Verbesserte Fehlermeldung
      let errorMessage = err instanceof Error ? err.message : String(err);
      
      // Spezielle Hinweise bei bekannten Fehlern
      if (errorMessage.includes('Element type is invalid')) {
        errorMessage += '\n\nDies bedeutet dass eine Komponente im generierten Code "undefined" ist.\n' +
          'Mögliche Ursachen:\n' +
          '• Ein importiertes Paket ist in der Sandbox nicht verfügbar\n' +
          '• Ein Icon-Name existiert nicht in lucide-react\n' +
          '• Ein Import-Pfad konnte nicht aufgelöst werden';
      }
      
      if (errorMessage.includes('is not a function')) {
        errorMessage += '\n\nDies deutet auf Markdown-Codefences im generierten Code hin.\n' +
          'Bitte generiere das Modul erneut.';
      }
      
      onError(err instanceof Error ? new Error(errorMessage) : new Error(errorMessage));
    }
  }, [compiledCode, moduleCache, moduleName, onError, onLoaded]);

  // Bei Code-Änderungen neu ausführen
  useEffect(() => {
    executeCompiledCode();
  }, [executeCompiledCode]);

  // --------------------------------------------
  // Render
  // --------------------------------------------
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p className="text-white/60">Führe Modul aus...</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-white/60">Keine Komponente gefunden</p>
        </div>
      </div>
    );
  }

  // Error Boundary als Wrapper
  return (
    <ErrorBoundary onError={onError}>
      <div className="p-4">
        <Component />
      </div>
    </ErrorBoundary>
  );
}

// --------------------------------------------
// Error Boundary Komponente
// Fängt Render-Fehler ab
// --------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Fehler gefangen:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <span className="text-xl">⚠️</span>
            <strong>Render-Fehler</strong>
          </div>
          <pre className="text-sm text-red-300 whitespace-pre-wrap overflow-auto max-h-60">
            {this.state.error?.message}
          </pre>
          {this.state.error?.stack && (
            <details className="mt-2">
              <summary className="text-xs text-red-400/60 cursor-pointer">
                Stack Trace
              </summary>
              <pre className="text-xs text-red-300/60 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
