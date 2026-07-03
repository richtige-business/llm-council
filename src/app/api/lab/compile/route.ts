// ============================================
// API: Sandbox Code Compiler
// 
// Zweck: Kompiliert TypeScript/JSX zu JavaScript für die Sandbox
// Verwendet: esbuild für schnelle Server-seitige Kompilierung
// ============================================

import { NextResponse } from 'next/server';
import * as esbuild from 'esbuild';
import { createLogger } from '@/lib/logger';

const log = createLogger('Compiler');

// --------------------------------------------
// Virtual File System Plugin für esbuild
// Ermöglicht Kompilierung ohne echte Dateien
// --------------------------------------------

interface ModuleFile {
  path: string;
  content: string;
}

// --------------------------------------------
// Helper: Named-Import vs Default-Export korrigieren
// --------------------------------------------

function hasNamedExport(content: string, name: string): boolean {
  const exportConst = new RegExp(`export\\s+(const|function|class)\\s+${name}\\b`);
  const exportList = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`);
  return exportConst.test(content) || exportList.test(content);
}

function hasDefaultExport(content: string): boolean {
  return /export\s+default\s+/.test(content);
}

function resolveLocalImportPath(importer: string, importPath: string, files: ModuleFile[]): string | null {
  const importerDir = importer.replace(/\/[^/]+$/, '');
  const resolvedPath = resolvePath(importerDir, importPath);
  const fileSet = new Set(files.map((f) => f.path.replace(/^\/+/, '')));

  for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
    const fullPath = resolvedPath + ext;
    if (fileSet.has(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

function normalizeLocalImports(files: ModuleFile[]): ModuleFile[] {
  return files.map((file) => {
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"](\.{1,2}\/[^'"]+)['"];?/g;
    let content = file.content;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(file.content)) !== null) {
      const namedImports = match[1].split(',').map((s) => s.trim()).filter(Boolean);
      const importPath = match[2];

      // Nur einfache Fälle: genau ein Named Import
      if (namedImports.length !== 1) continue;

      const importName = namedImports[0].replace(/\s+as\s+.+$/, '');
      const resolved = resolveLocalImportPath(file.path, importPath, files);
      if (!resolved) continue;

      const targetFile = files.find((f) => f.path.replace(/^\/+/, '') === resolved);
      if (!targetFile) continue;

      if (!hasNamedExport(targetFile.content, importName) && hasDefaultExport(targetFile.content)) {
        // Ersetze Named Import durch Default Import
        const replacement = `import ${importName} from '${importPath}';`;
        content = content.replace(match[0], replacement);
      }
    }

    return { ...file, content };
  });
}

// --------------------------------------------
// Helper: Modul-Root erkennen (erstes Verzeichnis)
// --------------------------------------------

function getModuleRootFromFiles(files: ModuleFile[]): string | null {
  const firstSegments = files
    .map((file) => file.path.split('/')[0])
    .filter(Boolean);

  if (firstSegments.length === 0) return null;
  const first = firstSegments[0];
  const isUniform = firstSegments.every((seg) => seg === first);
  return isUniform ? first : null;
}

// --------------------------------------------
// Helper: File-Content bereinigen (Markdown-Codefences entfernen)
// SAFETY NET: Auch wenn generate/route.ts dies tut,
// fangen wir hier nochmals alles ab
// --------------------------------------------

function sanitizeFileContent(content: string): string {
  let cleaned = content;

  // Entferne führende ```lang (inkl. Leerzeilen danach)
  cleaned = cleaned.replace(/^\s*```[a-zA-Z]*[ \t]*\r?\n?/, '');

  // Entferne abschließende ``` (inkl. Leerzeilen davor)
  cleaned = cleaned.replace(/\r?\n?\s*```\s*$/, '');

  return cleaned.trim();
}

// --------------------------------------------
// Helper: Alle Files vor Kompilierung bereinigen
// --------------------------------------------

function sanitizeAllFiles(files: ModuleFile[]): ModuleFile[] {
  return files.map(file => {
    // Nur Code-Dateien sanitizen, nicht module.json
    if (file.path.endsWith('.json')) return file;

    const sanitized = sanitizeFileContent(file.content);
    if (sanitized !== file.content) {
      log.debug(`Codefences entfernt aus: ${file.path}`);
    }
    return { ...file, content: sanitized };
  });
}

function createVirtualFsPlugin(files: ModuleFile[], moduleRoot: string | null): esbuild.Plugin {
  // Erstelle Lookup-Map für schnellen Zugriff
  const fileMap = new Map<string, string>();
  
  for (const file of files) {
    // Normalisiere Pfade
    const normalizedPath = file.path.replace(/^\/+/, '');
    fileMap.set(normalizedPath, file.content);
    
    // Auch mit führendem Slash
    fileMap.set('/' + normalizedPath, file.content);
    
    // Auch nur der Dateiname
    const fileName = file.path.split('/').pop() || '';
    fileMap.set(fileName, file.content);
    
    // Ohne Erweiterung
    const withoutExt = fileName.replace(/\.(tsx?|jsx?)$/, '');
    fileMap.set(withoutExt, file.content);
  }
  
  log.debug('VirtualFS Registrierte Pfade', Array.from(fileMap.keys()));
  
  return {
    name: 'virtual-fs',
    setup(build) {
      // Löse alle Imports auf
      build.onResolve({ filter: /.*/ }, (args) => {
        const path = args.path;
        
        // Externe Module - nicht kompilieren
        const externalModules = [
          'react', 
          'react-dom', 
          'react/jsx-runtime',
          'zustand', 
          'framer-motion', 
          'lucide-react',
          '@/lib/theme',
          '@/lib/utils',
        ];
        
        if (externalModules.some(m => path === m || path.startsWith(m + '/'))) {
          return { path, external: true };
        }

        // Alias: "@/" auf Modul-Root mappen (z.B. "@/components/Foo")
        if (path.startsWith('@/')) {
          const aliasPath = path.replace(/^@\//, '');
          const rootPrefix = moduleRoot ? `${moduleRoot}/` : '';
          const resolvedAlias = `${rootPrefix}${aliasPath}`;
          
          for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
            const fullPath = resolvedAlias + ext;
            if (fileMap.has(fullPath)) {
              log.debug(`VirtualFS Resolved alias: ${path} -> ${fullPath}`);
              return { path: fullPath, namespace: 'virtual' };
            }
          }
        }
        
        // Lokale Imports aus Virtual FS
        if (path.startsWith('./') || path.startsWith('../')) {
          // Relativer Import - basierend auf importer
          const importerDir = args.importer ? args.importer.replace(/\/[^/]+$/, '') : '';
          const resolvedPath = resolvePath(importerDir, path);
          
          // Versuche verschiedene Erweiterungen
          for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
            const fullPath = resolvedPath + ext;
            if (fileMap.has(fullPath)) {
              log.debug(`VirtualFS Resolved: ${path} -> ${fullPath}`);
              return { path: fullPath, namespace: 'virtual' };
            }
          }
          
          // Versuche auch ohne directory prefix
          const baseName = path.split('/').pop() || '';
          for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
            if (fileMap.has(baseName + ext)) {
              log.debug(`VirtualFS Resolved by basename: ${path} -> ${baseName + ext}`);
              return { path: baseName + ext, namespace: 'virtual' };
            }
          }
        }
        
        // Prüfe ob es eine virtuelle Datei ist (ohne ./)
        for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
          const fullPath = path + ext;
          if (fileMap.has(fullPath)) {
            log.debug(`VirtualFS Direct match: ${path} -> ${fullPath}`);
            return { path: fullPath, namespace: 'virtual' };
          }
        }
        
        log.debug(`VirtualFS External/Unknown: ${path}`);
        // Unbekannter Import - als external markieren
        return { path, external: true };
      });
      
      // Lade Inhalte aus Virtual FS
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
        const content = fileMap.get(args.path);
        
        if (content !== undefined) {
          // Bestimme Loader basierend auf Erweiterung
          const ext = args.path.split('.').pop() || '';
          const loader = ext === 'tsx' || ext === 'jsx' ? 'tsx' : 
                        ext === 'ts' ? 'ts' : 
                        ext === 'json' ? 'json' : 'js';
          
          return { contents: content, loader };
        }
        
        return { contents: '', loader: 'js' };
      });
    },
  };
}

// Pfad-Auflösung für relative Imports
function resolvePath(base: string, relative: string): string {
  const baseParts = base.split('/').filter(Boolean);
  const relativeParts = relative.split('/').filter(Boolean);
  
  for (const part of relativeParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }
  
  return baseParts.join('/');
}

// --------------------------------------------
// POST Handler - Kompiliert Code für Sandbox
// --------------------------------------------

export async function POST(request: Request) {
  try {
    const { files, entryPoint } = await request.json();
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Keine Dateien vorhanden' }, { status: 400 });
    }

    // 1) Codefences entfernen (Safety Net)
    const sanitizedFiles = sanitizeAllFiles(files);

    // 2) Lokale Imports normalisieren (Named vs Default)
    const normalizedFiles = normalizeLocalImports(sanitizedFiles);
    
    // Modul-Root erkennen (falls vorhanden)
    const moduleRoot = getModuleRootFromFiles(normalizedFiles);
    
    // Finde Entry Point - priorisiere bekannte Namen, dann jede .tsx/.jsx Datei
    const entryPriority = ['Page.tsx', 'Widget.tsx', 'App.tsx', 'index.tsx', 'main.tsx'];
    
    let entry = entryPoint;
    
    if (!entry) {
      // Versuche priorisierte Entry-Points
      for (const priorityName of entryPriority) {
        const found = normalizedFiles.find((f: ModuleFile) => f.path.endsWith(priorityName));
        if (found) {
          entry = found.path;
          break;
        }
      }
    }
    
    // Fallback: Jede .tsx oder .jsx Datei (nicht module.json etc.)
    if (!entry) {
      const tsxFile = normalizedFiles.find((f: ModuleFile) => 
        (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) && 
        !f.path.includes('module.json')
      );
      entry = tsxFile?.path;
    }
    
    if (!entry) {
      return NextResponse.json({ 
        error: 'Keine Komponenten-Datei (.tsx/.jsx) gefunden',
        files: files.map((f: ModuleFile) => f.path),
      }, { status: 400 });
    }
    
    log.debug('Entry point', entry);
    log.debug('Files', normalizedFiles.map((f: ModuleFile) => f.path));
    
    // Finde Entry-Point Datei
    const entryFile = normalizedFiles.find((f: ModuleFile) => f.path.includes(entry));
    if (!entryFile) {
      return NextResponse.json({ 
        error: `Entry point ${entry} nicht in files gefunden`,
      }, { status: 400 });
    }
    
    // Kompiliere mit esbuild - verwende CJS-Format für einfacheres Execution
    // WICHTIG: Wir verwenden jsx: 'transform' (Classic) statt 'automatic'
    // Das generiert React.createElement() statt jsx() aus react/jsx-runtime
    // So vermeiden wir das "Invalid Hook Call" Problem mit mehreren React-Kopien
    const result = await esbuild.build({
      stdin: {
        contents: entryFile.content,
        resolveDir: '/',
        loader: 'tsx',
        sourcefile: entry,
      },
      plugins: [createVirtualFsPlugin(normalizedFiles, moduleRoot)],
      bundle: true,
      write: false,
      format: 'cjs',  // CommonJS für module.exports
      target: 'es2020',
      jsx: 'transform',  // CLASSIC Transform - verwendet React.createElement
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      minify: false, // Nicht minifizieren für besseres Debugging
      sourcemap: false,
      // Verhindere dass esbuild 'eval' als Variablennamen verwendet
      keepNames: true,
      external: [
        'react', 
        'react-dom', 
        // NICHT mehr: 'react/jsx-runtime' - wird nicht mehr verwendet!
        'zustand', 
        'zustand/middleware',
        'framer-motion', 
        'lucide-react',
        '@/lib/theme',
        '@/lib/utils',
      ],
      define: {
        'process.env.NODE_ENV': '"development"',
      },
      // Verhindere dass esbuild 'eval' verwendet
      legalComments: 'none',
    });
    
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(e => e.text).join('\n');
      log.error('Kompilierungsfehler', errorMessages);
      return NextResponse.json({ 
        error: 'Kompilierungsfehler',
        details: errorMessages,
      }, { status: 400 });
    }
    
    // Extrahiere kompilierten Code
    const compiledCode = result.outputFiles?.[0]?.text || '';
    
    if (!compiledCode) {
      return NextResponse.json({ 
        error: 'Kompilierung ergab keinen Output',
      }, { status: 400 });
    }
    
    log.info('Kompilierung erfolgreich', { outputSize: compiledCode.length });
    
    // Extrahiere Modul-Name aus module.json
    let moduleName = 'GeneratedModule';
    const moduleJson = files.find((f: ModuleFile) => f.path.endsWith('module.json'));
    if (moduleJson) {
      try {
        const moduleData = JSON.parse(moduleJson.content);
        moduleName = moduleData.name || moduleName;
      } catch (e) {
        log.warn('module.json nicht parsebar', e);
      }
    }
    
    return NextResponse.json({
      success: true,
      compiledCode,
      moduleName,
      entryPoint: entry,
    });
    
  } catch (error) {
    log.error('Kompilierungs-Fehler', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Kompilierungsfehler',
    }, { status: 500 });
  }
}

