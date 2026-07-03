// ============================================
// LifeOS Module Builder - Generate API Route
// 
// Zweck: API für Modul-Generierung mit Discuss/Build Modes
// Basiert auf: bolt.diy API-Struktur
// ============================================

import { 
  getModuleBuilderSystemPrompt,
  getEditModePromptExtension,
  getDiscussPrompt, 
  CONTINUE_PROMPT 
} from '@/lib/lab/llm/prompts';
import { MAX_TOKENS, MAX_RESPONSE_SEGMENTS } from '@/lib/lab/llm/constants';
import { createLLMClient } from '@/lib/llm/client';
import { DEFAULT_OPENROUTER_MODEL_ID, normalizeOpenRouterModelId } from '@/lib/llm/model-catalog';
import { createLogger } from '@/lib/logger';
import type { LLMProvider, LLMMessage, LLMClient } from '@/lib/llm/types';
import * as esbuild from 'esbuild';
import * as LucideIcons from 'lucide-react';
import type { StructuredPreviewError } from '@/lib/lab/debug/types';
import { DEFAULT_USER_ID } from '@/lib/services/user-service';
import { buildBaseContextForAgent, buildBasePromptBlock } from '@/lib/services/base-service';

const log = createLogger('ModuleBuilder');

// --------------------------------------------
// Request Types
// --------------------------------------------

interface GenerateRequest {
  messages: Array<{ role: string; content: string }>;
  chatMode?: 'build' | 'discuss';
  proMode?: boolean; // Pro Mode: Erweiterte Features (Tests, Docs, bessere Qualität)
  stream?: boolean; // Streaming Support (SSE)
  currentModule?: {
    id?: string;
    name?: string;
    files?: Array<{ path: string; content: string }>;
  } | null;
  // Erweiterte Einstellungen
  customPrompt?: {
    enabled: boolean;
    systemPrompt: string;
    constraints: string[];
    examples: string[];
  } | null;
  moduleTools?: Array<{
    name: string;
    description: string;
    parameters: Array<{ name: string; type: string; description: string; required?: boolean }>;
    canBeCalledBy: 'agents' | 'modules' | 'both';
  }>;
  moduleEvents?: Array<{
    name: string;
    description: string;
    payload: Array<{ name: string; type: string; description: string }>;
  }>;
  apiKeys?: Array<{ name: string; service: string }>;
  // LLM Provider & Model (NEU)
  llmProvider?: LLMProvider;
  llmModel?: string;
  previewErrors?: StructuredPreviewError[];
  baseContext?: {
    baseId: string;
  } | null;
}

type GenerationStatus = 'ok' | 'failed_contract' | 'failed_compile';

interface BuildProcessingResult {
  files: Array<{ path: string; content: string }>;
  patches: PatchResult[];
  moduleInfo: { id?: string; name?: string; description?: string } | null;
  options: ActionOption[] | null;
  messageText: string;
}

interface ContractValidationResult {
  files: Array<{ path: string; content: string }>;
  errors: string[];
}

interface BuildValidationResult {
  generationStatus: GenerationStatus;
  files: Array<{ path: string; content: string }>;
  validationErrors: string[];
}

interface BuildGenerationResult {
  message: string;
  files: Array<{ path: string; content: string }>;
  moduleInfo: { id?: string; name?: string; description?: string } | null;
  options: ActionOption[] | null;
  patches: PatchResult[];
  generationStatus: GenerationStatus;
  validationErrors: string[];
  attempts: number;
}

const VALID_LUCIDE_EXPORTS = new Set(Object.keys(LucideIcons));
const LUCIDE_IMPORT_REGEX = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;

// --------------------------------------------
// Helper: Dateien aus Response parsen
// Extrahiert <boltAction type="file"> Blöcke
// --------------------------------------------

interface ParsedBoltActionBlock {
  attributes: Record<string, string>;
  content: string;
}

function parseBoltActionAttributes(rawAttributes: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  let attrMatch: RegExpExecArray | null = null;
  while ((attrMatch = attrRegex.exec(rawAttributes)) !== null) {
    const [, key, doubleQuotedValue, singleQuotedValue] = attrMatch;
    attributes[key] = (doubleQuotedValue ?? singleQuotedValue ?? '').trim();
  }

  return attributes;
}

function parseBoltActionBlocks(response: string): ParsedBoltActionBlock[] {
  const blocks: ParsedBoltActionBlock[] = [];
  const actionRegex = /<boltAction\b([^>]*)>([\s\S]*?)<\/boltAction>/g;

  let match: RegExpExecArray | null = null;
  while ((match = actionRegex.exec(response)) !== null) {
    const [, rawAttributes, content] = match;
    blocks.push({
      attributes: parseBoltActionAttributes(rawAttributes),
      content,
    });
  }

  return blocks;
}

function parseFilesFromResponse(response: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  const actionBlocks = parseBoltActionBlocks(response);
  for (const block of actionBlocks) {
    const actionType = block.attributes.type;
    const filePath = block.attributes.filePath;

    if (actionType === 'file' && typeof filePath === 'string' && filePath.trim().length > 0) {
      files.push({
        path: filePath.trim(),
        content: block.content.trim(),
      });
    }
  }

  return files;
}

function normalizeGeneratedPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function isLikelyLeafPath(path: string): boolean {
  return /(^|\/)(components|widgets|hooks|store)(\/|$)/i.test(path);
}

function resolveCandidatePath(
  candidates: string[],
  paths: string[],
): string | null {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeGeneratedPath(candidate);
    if (!normalizedCandidate) continue;

    const exactMatch = paths.find(path => normalizeGeneratedPath(path) === normalizedCandidate);
    if (exactMatch) {
      return exactMatch;
    }

    const suffixMatch = paths.find((path) => {
      const normalizedPath = normalizeGeneratedPath(path);
      return normalizedPath === normalizedCandidate || normalizedPath.endsWith(`/${normalizedCandidate}`);
    });
    if (suffixMatch) {
      return suffixMatch;
    }
  }

  return null;
}

function resolveAppSourcePath(
  paths: string[],
  moduleRoot: string | null,
): string | null {
  const preferredNames = ['App.tsx', 'app.tsx', 'index.tsx', 'main.tsx', 'page.tsx', 'Page.tsx'];
  const rootCandidates: string[] = [];

  for (const name of preferredNames) {
    rootCandidates.push(name);
    if (moduleRoot) {
      rootCandidates.push(`${moduleRoot}/${name}`);
    }
  }

  const bestRootMatch = resolveCandidatePath(rootCandidates, paths);
  if (bestRootMatch && !isLikelyLeafPath(bestRootMatch)) {
    return bestRootMatch;
  }

  const nonLeafTsx = paths.find(path => /\.(tsx|jsx)$/i.test(path) && !isLikelyLeafPath(path));
  if (nonLeafTsx) {
    return nonLeafTsx;
  }

  return null;
}

// --------------------------------------------
// Patch-Typen fuer type="modify" Bloecke
// Ein Patch besteht aus search/replace Paaren pro Datei
// --------------------------------------------

interface SearchReplacePair {
  search: string;   // Exakter Code der ersetzt werden soll
  replace: string;  // Neuer Code der stattdessen stehen soll
}

interface ModifyAction {
  filePath: string;                  // Pfad zur Datei die geaendert wird
  modifications: SearchReplacePair[]; // Alle search/replace Paare fuer diese Datei
}

interface PatchResult {
  path: string;              // Datei-Pfad
  content: string;           // Gepatchter (oder unveraenderter) Dateiinhalt
  success: boolean;          // Ob ALLE Patches erfolgreich waren
  patchFailed: boolean;      // Ob mindestens ein Patch fehlgeschlagen ist
  failedPatches: number;     // Anzahl fehlgeschlagener Patches
  totalPatches: number;      // Gesamtanzahl der Patches
}

// --------------------------------------------
// Helper: type="modify" Bloecke aus LLM-Response parsen
// Extrahiert alle <boltAction type="modify"> mit <search>/<replace>
// --------------------------------------------

function parseModificationsFromResponse(response: string): ModifyAction[] {
  const modifications: ModifyAction[] = [];
  const actionBlocks = parseBoltActionBlocks(response);

  for (const block of actionBlocks) {
    if (block.attributes.type !== 'modify') continue;
    const filePath = block.attributes.filePath;
    if (!filePath) continue;
    const innerContent = block.content;

    // Alle <search>...</search> und <replace>...</replace> Paare extrahieren
    const pairs: SearchReplacePair[] = [];

    // Regex: <search>...</search> gefolgt von <replace>...</replace>
    // Erlaubt optionalen Whitespace zwischen den Bloecken
    const pairRegex = /<search>([\s\S]*?)<\/search>\s*<replace>([\s\S]*?)<\/replace>/g;

    let pairMatch;
    while ((pairMatch = pairRegex.exec(innerContent)) !== null) {
      const [, searchStr, replaceStr] = pairMatch;
      // Entferne genau eine fuehrende und eine abschliessende Newline
      // damit der User-Content exakt erhalten bleibt
      const cleanSearch = searchStr.replace(/^\n/, '').replace(/\n$/, '');
      const cleanReplace = replaceStr.replace(/^\n/, '').replace(/\n$/, '');

      if (cleanSearch.trim().length > 0) {
        pairs.push({
          search: cleanSearch,
          replace: cleanReplace,
        });
      }
    }

    if (pairs.length > 0) {
      modifications.push({
        filePath: filePath.trim(),
        modifications: pairs,
      });
    }
  }

  return modifications;
}

// --------------------------------------------
// Helper: Patches auf bestehenden Dateiinhalt anwenden
// Wendet search/replace Paare sequentiell an
// Rueckgabe: gepatchter Inhalt + Erfolgs-Infos
// --------------------------------------------

function applyPatches(
  originalContent: string,
  modifications: SearchReplacePair[],
): { content: string; success: boolean; failedPatches: number } {
  let content = originalContent;
  let failedPatches = 0;

  for (const mod of modifications) {
    // Pruefe ob der Search-String im Content vorkommt
    if (content.includes(mod.search)) {
      // Ersetze NUR das erste Vorkommen
      content = content.replace(mod.search, mod.replace);
      log.debug(`Patch angewendet (${mod.search.substring(0, 50).replace(/\n/g, '\\n')}...)`);
    } else {
      failedPatches++;
      log.warn('Search-String nicht gefunden', {
        search: mod.search.substring(0, 80).replace(/\n/g, '\\n'),
        contentLength: content.length,
      });
    }
  }

  return {
    content,
    success: failedPatches === 0,
    failedPatches,
  };
}

// --------------------------------------------
// Helper: Modify-Actions auf bestehende Dateien anwenden
// Kombiniert Parser-Ergebnis mit existierenden Dateien
// Rueckgabe: Array von PatchResults
// --------------------------------------------

function applyModificationsToFiles(
  modifications: ModifyAction[],
  existingFiles: Array<{ path: string; content: string }>,
): PatchResult[] {
  const results: PatchResult[] = [];

  // Index fuer schnellen Zugriff auf bestehende Dateien
  const fileMap = new Map<string, string>();
  for (const f of existingFiles) {
    fileMap.set(f.path, f.content);
  }

  for (const mod of modifications) {
    const existingContent = fileMap.get(mod.filePath);

    if (existingContent === undefined) {
      // Datei existiert nicht - Patch kann nicht angewendet werden
      log.warn(`Datei nicht gefunden: "${mod.filePath}" - Patches übersprungen`);
      results.push({
        path: mod.filePath,
        content: '',
        success: false,
        patchFailed: true,
        failedPatches: mod.modifications.length,
        totalPatches: mod.modifications.length,
      });
      continue;
    }

    log.debug(`Wende ${mod.modifications.length} Patches auf "${mod.filePath}" an...`);
    const { content, success, failedPatches } = applyPatches(existingContent, mod.modifications);

    results.push({
      path: mod.filePath,
      content,
      success,
      patchFailed: failedPatches > 0,
      failedPatches,
      totalPatches: mod.modifications.length,
    });
  }

  return results;
}

// --------------------------------------------
// Helper: File-Content bereinigen (Codefences entfernen)
// --------------------------------------------

function sanitizeFileContent(content: string): string {
  let cleaned = content;

  // Entferne führende ```lang (auch mit Whitespace davor/danach)
  // Fängt: "```tsx\n", "  ```typescript\n", "```\n" etc.
  cleaned = cleaned.replace(/^\s*```[a-zA-Z]*[ \t]*\r?\n?/, '');

  // Entferne abschließende ``` (auch mit Whitespace davor/danach)
  // Fängt: "\n```", "\n```  ", "```" etc.
  cleaned = cleaned.replace(/\r?\n?\s*```\s*$/, '');

  return cleaned.trim();
}

// --------------------------------------------
// Helper: Zustand create Import sicherstellen
// --------------------------------------------

function ensureZustandCreateImport(content: string): string {
  if (!content.includes('create(')) return content;

  const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]zustand['"];/;
  const match = content.match(namedImportRegex);

  if (match) {
    const importList = match[1].split(',').map(s => s.trim());
    if (!importList.includes('create')) {
      const updatedList = [...importList, 'create'].join(', ');
      return content.replace(namedImportRegex, `import { ${updatedList} } from 'zustand';`);
    }
    return content;
  }

  if (!/from\s+['"]zustand['"]/.test(content)) {
    return `import { create } from 'zustand';\n${content}`;
  }

  return content;
}

// --------------------------------------------
// Helper: Modul-Root erkennen (erstes Verzeichnis)
// --------------------------------------------

function getModuleRootFromFiles(files: Array<{ path: string; content: string }>): string | null {
  const firstSegments = files
    .map(f => f.path.split('/')[0])
    .filter(Boolean);

  if (firstSegments.length === 0) return null;
  const first = firstSegments[0];
  const isUniform = firstSegments.every(seg => seg === first);
  return isUniform ? first : null;
}

// --------------------------------------------
// Helper: Nur Files im Modul-Root erlauben
// --------------------------------------------

function filterFilesByRoot(
  files: Array<{ path: string; content: string }>,
  moduleRoot: string | null
): Array<{ path: string; content: string }> {
  if (!moduleRoot) return files;

  const allowedPrefix = `${moduleRoot}/`;
  return files.filter(file => file.path === `${moduleRoot}/module.json` || file.path.startsWith(allowedPrefix));
}

// --------------------------------------------
// Helper: Files normalisieren (Content bereinigen)
// --------------------------------------------

function normalizeFiles(files: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  return files.map(file => ({
    ...file,
    content: ensureZustandCreateImport(sanitizeFileContent(file.content)),
  }));
}

function ensureAppEntryContract(
  files: Array<{ path: string; content: string }>,
  currentModuleFiles: Array<{ path: string; content: string }>,
  moduleRoot: string | null,
): ContractValidationResult {
  const resultMap = new Map<string, string>();
  for (const file of files) {
    resultMap.set(file.path, file.content);
  }

  const currentMap = new Map<string, string>();
  for (const file of currentModuleFiles) {
    currentMap.set(file.path, file.content);
  }

  const combinedPaths = new Set<string>([
    ...Array.from(resultMap.keys()),
    ...Array.from(currentMap.keys()),
  ]);

  const detectedRoot =
    moduleRoot ||
    getModuleRootFromFiles([
      ...currentModuleFiles,
      ...files,
    ]) ||
    null;

  const appPath = detectedRoot ? `${detectedRoot}/App.tsx` : 'App.tsx';
  const allPaths = Array.from(combinedPaths);
  const validationErrors: string[] = [];

  const hasCanonicalAppTsx = allPaths.some((path) => {
    const normalized = normalizeGeneratedPath(path);
    return normalized === 'App.tsx' || normalized.endsWith('/App.tsx');
  });

  if (!hasCanonicalAppTsx) {
    const sourcePath = resolveAppSourcePath(allPaths, detectedRoot);
    const sourceContent = sourcePath
      ? (resultMap.get(sourcePath) ?? currentMap.get(sourcePath))
      : null;

    if (sourceContent && sourcePath) {
      resultMap.set(appPath, sourceContent);
      log.warn(`App.tsx fehlte im Agent-Output, Inhalt von "${sourcePath}" nach "${appPath}" übernommen`);
    } else {
      validationErrors.push('Pflichtdatei App.tsx fehlt und konnte aus keiner Root-Datei abgeleitet werden.');
      log.warn(`App.tsx fehlt und konnte nicht aus einer bestehenden Root-Datei übernommen werden: ${appPath}`);
    }
    if (sourceContent && sourcePath) {
      combinedPaths.add(appPath);
    }
  }

  const moduleJsonCandidates = [
    ...(detectedRoot ? [`${detectedRoot}/module.json`] : []),
    'module.json',
    ...Array.from(combinedPaths).filter(path => path.endsWith('/module.json')),
  ];

  let moduleJsonPath: string | null = null;
  for (const candidate of moduleJsonCandidates) {
    if (resultMap.has(candidate) || currentMap.has(candidate)) {
      moduleJsonPath = candidate;
      break;
    }
  }

  if (moduleJsonPath) {
    const currentContent = resultMap.get(moduleJsonPath) ?? currentMap.get(moduleJsonPath);
    if (currentContent) {
      try {
        const parsed = JSON.parse(currentContent);
        parsed.entry = './App.tsx';
        resultMap.set(moduleJsonPath, JSON.stringify(parsed, null, 2));
      } catch {
        validationErrors.push(`module.json ist ungültig und konnte nicht geparst werden (${moduleJsonPath}).`);
      }
    }
  } else {
    validationErrors.push('Pflichtdatei module.json fehlt.');
  }

  const appFilePath = resolveCandidatePath(
    Array.from(new Set([
      appPath,
      'App.tsx',
      ...(detectedRoot ? [`${detectedRoot}/App.tsx`] : []),
    ])),
    [...Array.from(resultMap.keys()), ...Array.from(currentMap.keys())]
  );

  const appContent = appFilePath
    ? (resultMap.get(appFilePath) ?? currentMap.get(appFilePath) ?? '')
    : '';

  if (!appContent) {
    validationErrors.push('App.tsx ist leer oder fehlt nach der Contract-Prüfung.');
  } else if (!hasRenderableRootExport(appContent)) {
    validationErrors.push('App.tsx exportiert keine renderbare Root-Komponente (default export oder export function App).');
  }

  return {
    files: Array.from(resultMap.entries()).map(([path, content]) => ({
      path,
      content,
    })),
    errors: validationErrors,
  };
}

function hasRenderableRootExport(content: string): boolean {
  const source = content.replace(/^\uFEFF/, '');

  const hasDefaultFunctionExport = /export\s+default\s+function\s+[A-Za-z_$][\w$]*\s*\(/m.test(source);
  const hasDefaultClassExport = /export\s+default\s+class\s+[A-Za-z_$][\w$]*\s*/m.test(source);
  const hasAnonymousDefaultExport = /export\s+default\s*\(/m.test(source) || /export\s+default\s*<[^>]+>/m.test(source);
  const hasNamedAppExport = /export\s+function\s+App\s*\(/m.test(source);
  const hasDefaultAppAlias = /export\s+default\s+App\b/m.test(source);
  const hasAppReExportDefault = /export\s*\{\s*App\s+as\s+default\s*\}/m.test(source);

  return (
    hasDefaultFunctionExport ||
    hasDefaultClassExport ||
    hasAnonymousDefaultExport ||
    hasNamedAppExport ||
    hasDefaultAppAlias ||
    hasAppReExportDefault
  );
}

function mergeModuleFiles(
  currentModuleFiles: Array<{ path: string; content: string }>,
  generatedFiles: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const merged = new Map<string, string>();

  for (const file of currentModuleFiles) {
    merged.set(file.path, file.content);
  }

  for (const file of generatedFiles) {
    merged.set(file.path, file.content);
  }

  return Array.from(merged.entries()).map(([path, content]) => ({ path, content }));
}

function resolveEsbuildLoader(filePath: string): esbuild.Loader | null {
  if (filePath.endsWith('.tsx')) return 'tsx';
  if (filePath.endsWith('.ts')) return 'ts';
  if (filePath.endsWith('.jsx')) return 'jsx';
  if (filePath.endsWith('.js')) return 'js';
  return null;
}

function formatEsbuildError(error: unknown, filePath: string): string {
  if (error && typeof error === 'object' && 'errors' in error) {
    const esbuildError = error as { errors?: Array<{ text?: string; location?: { line?: number; column?: number } }> };
    const first = esbuildError.errors?.[0];
    if (first?.text) {
      const line = first.location?.line;
      const column = first.location?.column;
      if (typeof line === 'number' && typeof column === 'number') {
        return `${filePath}:${line}:${column + 1} ${first.text}`;
      }
      return `${filePath}: ${first.text}`;
    }
  }

  if (error instanceof Error) {
    return `${filePath}: ${error.message}`;
  }

  return `${filePath}: Unbekannter Compile-Fehler`;
}

interface InvalidLucideImport {
  filePath: string;
  icon: string;
  line: number;
}

function findInvalidLucideImports(
  files: Array<{ path: string; content: string }>,
): InvalidLucideImport[] {
  const invalid: InvalidLucideImport[] = [];

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/i.test(file.path)) continue;
    if (!file.content.includes('lucide-react')) continue;

    let match: RegExpExecArray | null = null;
    while ((match = LUCIDE_IMPORT_REGEX.exec(file.content)) !== null) {
      const importBlock = match[1] || '';
      const specifiers = importBlock
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      for (const specifier of specifiers) {
        const withoutType = specifier.replace(/^type\s+/, '').trim();
        const iconName = withoutType.split(/\s+as\s+/i)[0]?.trim();
        if (!iconName) continue;
        if (iconName === 'default' || iconName.startsWith('*')) continue;
        if (VALID_LUCIDE_EXPORTS.has(iconName)) continue;

        const iconIndex = file.content.indexOf(iconName, match.index);
        const line = iconIndex >= 0
          ? file.content.slice(0, iconIndex).split('\n').length
          : 1;

        invalid.push({
          filePath: file.path,
          icon: iconName,
          line,
        });
      }
    }

    LUCIDE_IMPORT_REGEX.lastIndex = 0;
  }

  return invalid;
}

function validateLucideImports(files: Array<{ path: string; content: string }>): string[] {
  const invalidImports = findInvalidLucideImports(files);
  if (invalidImports.length === 0) return [];

  return invalidImports.slice(0, 8).map((entry) =>
    `${entry.filePath}:${entry.line}: Ungültiger lucide-react Export "${entry.icon}"`,
  );
}

type DeterministicFixResult = {
  files: Array<{ path: string; content: string }>;
  fixes: string[];
};

const LUCIDE_ICON_FIXES: Record<string, string> = {
  TrendingFlat: 'Minus',
  TrendingNeutral: 'Minus',
  ArrowTrendingUp: 'TrendingUp',
  ArrowTrendingDown: 'TrendingDown',
};

function applyDeterministicFixes(
  files: Array<{ path: string; content: string }>,
): DeterministicFixResult {
  let nextFiles = files.map((file) => ({ ...file }));
  const fixes: string[] = [];

  // Fix 1: bekannte fehlerhafte Lucide-Icons ersetzen
  nextFiles = nextFiles.map((file) => {
    if (!/\.(tsx?|jsx?)$/i.test(file.path) || !file.content.includes('lucide-react')) {
      return file;
    }

    let content = file.content;
    let changed = false;
    for (const [invalidIcon, replacement] of Object.entries(LUCIDE_ICON_FIXES)) {
      const iconRegex = new RegExp(`\\b${invalidIcon}\\b`, 'g');
      if (iconRegex.test(content)) {
        content = content.replace(iconRegex, replacement);
        changed = true;
      }
    }

    if (changed) {
      fixes.push(`${file.path}: bekannte ungültige Lucide-Imports ersetzt`);
      return { ...file, content };
    }
    return file;
  });

  // Fix 2: Typ-Importe aus *types* als "import type" markieren
  nextFiles = nextFiles.map((file) => {
    if (!/\.(tsx?|ts)$/i.test(file.path)) return file;

    const transformed = file.content.replace(
      /import\s*\{([^}]+)\}\s*from\s*['"](\.{1,2}\/[^'"]*types(?:\/index)?(?:\.[tj]s)?)['"];?/g,
      (full, importsRaw: string, source: string) => {
        const tokens = importsRaw
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
        if (tokens.length === 0) return full;

        const looksTypeOnly = tokens.every((token) => {
          const stripped = token.replace(/^type\s+/, '').trim();
          const importedName = stripped.split(/\s+as\s+/i)[0]?.trim() || '';
          if (!importedName) return false;
          return /^[A-Z][A-Za-z0-9_]*$/.test(importedName);
        });

        if (!looksTypeOnly) return full;
        return `import type { ${tokens.join(', ')} } from "${source}";`;
      },
    );

    if (transformed !== file.content) {
      fixes.push(`${file.path}: Typ-Importe auf "import type" umgestellt`);
      return { ...file, content: transformed };
    }

    return file;
  });

  return { files: nextFiles, fixes };
}

async function validateCompilation(
  mergedFiles: Array<{ path: string; content: string }>
): Promise<string[]> {
  const compileErrors: string[] = [];
  const codeFiles = mergedFiles.filter(file => resolveEsbuildLoader(file.path));

  for (const file of codeFiles) {
    const loader = resolveEsbuildLoader(file.path);
    if (!loader) continue;

    try {
      await esbuild.transform(file.content, {
        loader,
        format: 'esm',
        jsx: 'automatic',
        sourcemap: false,
        target: 'es2020',
        logLevel: 'silent',
      });
    } catch (error) {
      compileErrors.push(formatEsbuildError(error, file.path));
      if (compileErrors.length >= 6) break;
    }
  }

  return compileErrors;
}

async function validateBuildOutput(
  generatedFiles: Array<{ path: string; content: string }>,
  currentModuleFiles: Array<{ path: string; content: string }>,
  moduleRoot: string | null,
): Promise<BuildValidationResult> {
  const contract = ensureAppEntryContract(generatedFiles, currentModuleFiles, moduleRoot);
  if (contract.errors.length > 0) {
    return {
      generationStatus: 'failed_contract',
      files: [],
      validationErrors: contract.errors,
    };
  }

  const mergedFiles = mergeModuleFiles(currentModuleFiles, contract.files);
  const compileErrors = await validateCompilation(mergedFiles);

  if (compileErrors.length > 0) {
    return {
      generationStatus: 'failed_compile',
      files: [],
      validationErrors: compileErrors,
    };
  }

  const lucideErrors = validateLucideImports(mergedFiles);
  if (lucideErrors.length > 0) {
    return {
      generationStatus: 'failed_compile',
      files: [],
      validationErrors: lucideErrors,
    };
  }

  const uiQualityErrors = validateUiQuality(contract.files, moduleRoot);
  if (uiQualityErrors.length > 0) {
    return {
      generationStatus: 'failed_contract',
      files: [],
      validationErrors: uiQualityErrors,
    };
  }

  return {
    generationStatus: 'ok',
    files: contract.files,
    validationErrors: [],
  };
}

function extractStaticClassNames(source: string): string[] {
  const classes: string[] = [];
  const patterns = [
    /className\s*=\s*"([^"]+)"/g,
    /className\s*=\s*'([^']+)'/g,
    /className\s*=\s*`([^`$]+)`/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(source)) !== null) {
      classes.push(match[1]);
    }
  }

  return classes;
}

function validateUiQuality(
  files: Array<{ path: string; content: string }>,
  moduleRoot: string | null,
): string[] {
  const tsxFiles = files.filter((file) => /\.(tsx|jsx)$/i.test(file.path));
  if (tsxFiles.length === 0) {
    return ['UI-Qualitätscheck fehlgeschlagen: keine TSX/JSX-Dateien gefunden.'];
  }

  const appCandidates = [
    ...(moduleRoot ? [`${moduleRoot}/App.tsx`] : []),
    'App.tsx',
  ];
  const appPath = resolveCandidatePath(appCandidates, files.map((file) => file.path));
  const appContent = appPath ? files.find((file) => file.path === appPath)?.content ?? '' : '';
  if (!appContent) {
    return ['UI-Qualitätscheck fehlgeschlagen: App.tsx enthält kein renderbares Layout.'];
  }

  const allClassTokens = new Set<string>();
  const richTokens = new Set<string>();
  let classBlocks = 0;

  for (const file of tsxFiles) {
    const blocks = extractStaticClassNames(file.content);
    classBlocks += blocks.length;
    for (const block of blocks) {
      const tokens = block.split(/\s+/).map((token) => token.trim()).filter(Boolean);
      for (const token of tokens) {
        allClassTokens.add(token);
        if (
          /^(bg-gradient|from-|to-|via-|shadow|rounded-|grid|flex|gap-|space-|hover:|transition|ring-|backdrop-|animate-|border-)/.test(token)
        ) {
          richTokens.add(token);
        }
      }
    }
  }

  const hasLayoutStructure = /<main|<section|<article|grid|flex/.test(appContent);
  const uniqueClassCount = allClassTokens.size;
  const richClassCount = richTokens.size;

  const errors: string[] = [];
  if (!hasLayoutStructure) {
    errors.push('UI-Qualitätscheck: App.tsx braucht eine klare Layout-Struktur (main/section + Grid/Flex).');
  }
  if (classBlocks < 6) {
    errors.push('UI-Qualitätscheck: zu wenige Styling-Blöcke (className) für eine hochwertige UI.');
  }
  if (uniqueClassCount < 18) {
    errors.push(`UI-Qualitätscheck: zu wenige Utility-Klassen (${uniqueClassCount}/18).`);
  }
  if (richClassCount < 8) {
    errors.push(`UI-Qualitätscheck: visuelle Tiefe zu schwach (${richClassCount}/8 Rich-Styles).`);
  }

  return errors;
}

// --------------------------------------------
// Helper: Edit-Mode Prompt zusammenbauen
// Nutzt die neue getEditModePromptExtension() aus prompts.ts
// Sendet vollen Dateiinhalt fuer praezise Patches
// --------------------------------------------

function appendEditModeContext(
  systemPrompt: string,
  currentModuleFiles: Array<{ path: string; content: string }>,
  moduleRoot: string | null
): string {
  if (!currentModuleFiles || currentModuleFiles.length === 0) {
    return systemPrompt;
  }

  // Nutze die neue Prompt-Extension mit vollem Dateiinhalt
  // Dadurch kann das LLM praezise search/replace Patches erstellen
  return systemPrompt + getEditModePromptExtension(currentModuleFiles, moduleRoot);
}

// --------------------------------------------
// Helper: Modul-Info aus Response parsen
// Sucht nach module.json und extrahiert Metadaten
// --------------------------------------------

function parseModuleInfoFromResponse(response: string): { id?: string; name?: string; description?: string; icon?: string; color?: string } | null {
  const files = parseFilesFromResponse(response);
  const moduleJsonFile = files.find(file => file.path.endsWith('module.json'));

  if (moduleJsonFile) {
    try {
      const moduleJson = JSON.parse(moduleJsonFile.content.trim());
      return {
        id: moduleJson.id,
        name: moduleJson.name,
        description: moduleJson.description,
        // Icon und Farbe aus dem LLM-generierten module.json uebernehmen
        icon: moduleJson.icon,
        color: moduleJson.color,
      };
    } catch (e) {
      log.warn('Konnte module.json nicht parsen', e);
    }
  }
  
  return null;
}

// --------------------------------------------
// Helper: Actionable Options aus Response parsen
// Sucht nach <options>...</options> Block
// --------------------------------------------

interface ActionOption {
  id: string;
  label: string;
  description: string;
  buildPrompt: string;
}

function parseOptionsFromResponse(response: string): ActionOption[] | null {
  const optionsRegex = /<options>([\s\S]*?)<\/options>/;
  const match = response.match(optionsRegex);
  
  if (match) {
    try {
      const options = JSON.parse(match[1].trim());
      // Validiere dass es ein Array mit der richtigen Struktur ist
      if (Array.isArray(options) && options.length > 0) {
        const isValid = options.every(opt => 
          typeof opt.id === 'string' &&
          typeof opt.label === 'string' &&
          typeof opt.description === 'string' &&
          typeof opt.buildPrompt === 'string'
        );
        if (isValid) {
          log.debug(`${options.length} Options geparst`);
          return options;
        }
      }
    } catch (e) {
      log.warn('Konnte Options nicht parsen', e);
    }
  }
  
  return null;
}

// --------------------------------------------
// Helper: Fehler normalisieren
// Einheitliches Mapping für Sync + Streaming
// --------------------------------------------

function mapLLMError(error: unknown): { message: string; statusCode: number } {
  let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
  let statusCode = 500;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('api key') || msg.includes('api_key') || msg.includes('authentication') || msg.includes('unauthorized') || msg.includes('401')) {
      errorMessage = 'Der API-Key ist ungültig oder abgelaufen. Bitte überprüfe ANTHROPIC_API_KEY oder OPENAI_API_KEY in deiner .env.local Datei.';
      statusCode = 401;
    } else if (msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('429') || msg.includes('too many')) {
      errorMessage = 'Rate-Limit erreicht. Bitte warte 30-60 Sekunden und versuche es erneut.';
      statusCode = 429;
    } else if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('econnreset') || msg.includes('econnrefused')) {
      errorMessage = 'Verbindung zum LLM Provider fehlgeschlagen. Prüfe deine Internetverbindung.';
      statusCode = 504;
    } else if (msg.includes('model') || msg.includes('not found') || msg.includes('invalid_model')) {
      errorMessage = `Modell nicht gefunden. Prüfe ob das gewählte Modell verfügbar ist. Fehler: ${error.message}`;
      statusCode = 400;
    } else if (msg.includes('overloaded') || msg.includes('capacity') || msg.includes('529')) {
      errorMessage = 'Der LLM Provider ist überlastet. Bitte versuche es in 1-2 Minuten erneut.';
      statusCode = 503;
    } else if (msg.includes('credit') || msg.includes('billing') || msg.includes('payment') || msg.includes('insufficient')) {
      errorMessage = 'Dein API-Konto hat kein Guthaben mehr. Bitte lade Credits nach.';
      statusCode = 402;
    } else {
      errorMessage = `LLM Fehler: ${error.message}`;
    }
  }

  return { message: errorMessage, statusCode };
}

// --------------------------------------------
// Helper: Text-Message aus Response extrahieren
// Entfernt alle boltArtifact/boltAction Tags und <options>
// --------------------------------------------

function extractMessageText(response: string, hasFiles: boolean): string {
  // Entferne alle boltArtifact Blöcke (inkl. Inhalt)
  let text = response.replace(/<boltArtifact[\s\S]*?<\/boltArtifact>/g, '');
  
  // Entferne einzelne boltAction Tags (type="file" UND type="modify")
  text = text.replace(/<boltAction[\s\S]*?<\/boltAction>/g, '');
  
  // Entferne <options> Block (wird separat verarbeitet)
  text = text.replace(/<options>[\s\S]*?<\/options>/g, '');

  // Entferne Hinweise auf "vollständigen Code" im Fließtext
  text = text.replace(/Hier ist der vollständige Code[\s\S]*?(?:\n|$)/gi, '');
  text = text.replace(/Hier ist der vollständige Code[.:]?/gi, '');
  text = text.replace(/Hier ist der komplette Code[.:]?/gi, '');
  
  // Bereinige überschüssige Whitespaces
  text = text.trim();
  
  // Wenn Text leer ist aber Dateien generiert wurden
  if (!text && hasFiles) {
    return '✨ Modul wurde erfolgreich generiert!';
  }
  
  // Wenn weder Text noch Dateien
  if (!text) {
    return 'Ich konnte keine Antwort generieren. Bitte versuche es erneut.';
  }
  
  return text;
}

function processBuildResponse(
  fullResponse: string,
  currentModuleFiles: Array<{ path: string; content: string }>,
  existingModuleRoot: string | null,
): BuildProcessingResult {
  const newFiles = normalizeFiles(
    filterFilesByRoot(parseFilesFromResponse(fullResponse), existingModuleRoot)
  );

  const modifications = parseModificationsFromResponse(fullResponse);
  let patches: PatchResult[] = [];

  if (modifications.length > 0) {
    log.debug(`${modifications.length} Modify-Blöcke gefunden`);
    patches = applyModificationsToFiles(modifications, currentModuleFiles);

    for (const patch of patches) {
      if (!patch.content) continue;
      const normalizedContent = ensureZustandCreateImport(
        sanitizeFileContent(patch.content)
      );
      const alreadyInNewFiles = newFiles.some(f => f.path === patch.path);
      if (!alreadyInNewFiles) {
        newFiles.push({
          path: patch.path,
          content: normalizedContent,
        });
      }
    }

    const successCount = patches.filter(p => p.success).length;
    const failedCount = patches.filter(p => p.patchFailed).length;
    log.info(`Patch-Ergebnis: ${successCount} OK, ${failedCount} fehlgeschlagen`);
  }

  const moduleInfo = parseModuleInfoFromResponse(fullResponse);
  const options = parseOptionsFromResponse(fullResponse);
  const messageText = extractMessageText(fullResponse, newFiles.length > 0);

  return {
    files: newFiles,
    patches,
    moduleInfo,
    options,
    messageText,
  };
}

function buildValidationFailureMessage(
  status: GenerationStatus,
  validationErrors: string[],
  attempts: number,
  maxAttempts: number,
  attemptedFixes: string[],
): string {
  const title = status === 'failed_compile'
    ? 'Die Generierung enthält Compile-/Syntax-Fehler.'
    : 'Die Generierung verletzt den App.tsx-Contract.';
  const details = validationErrors.length > 0
    ? validationErrors.slice(0, 4).map(err => `- ${err}`).join('\n')
    : '- Unbekannter Validierungsfehler';

  return [
    `❌ ${title}`,
    '',
    details,
    '',
    attemptedFixes.length > 0
      ? `Versuchte Auto-Fixes:\n${attemptedFixes.map((item) => `- ${item}`).join('\n')}`
      : 'Versuchte Auto-Fixes:\n- Keine deterministischen Fixes möglich.',
    '',
    `Versuche: ${attempts}/${maxAttempts}. Es wurden keine Dateien übernommen; der letzte stabile Stand bleibt aktiv.`,
    'Bitte präzisiere den Prompt oder versuche es erneut.',
  ].join('\n');
}

function sanitizePreviewErrors(
  previewErrors: unknown,
): StructuredPreviewError[] {
  if (!Array.isArray(previewErrors)) return [];

  return previewErrors
    .filter((entry): entry is StructuredPreviewError => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<StructuredPreviewError>;
      return typeof candidate.message === 'string' && typeof candidate.timestamp === 'number';
    })
    .slice(-5);
}

function buildPreviewErrorPromptContext(previewErrors: StructuredPreviewError[]): string {
  if (previewErrors.length === 0) return '';

  const lines = previewErrors.map((error, index) => {
    const location = error.file
      ? ` (${error.file}${typeof error.line === 'number' ? `:${error.line}${typeof error.column === 'number' ? `:${error.column}` : ''}` : ''})`
      : '';
    return `${index + 1}. [${error.kind}] ${error.message}${location}`;
  });

  return [
    '<preview_debug_context>',
    'Aktuelle strukturierte Preview-Fehler aus WebContainer:',
    ...lines,
    'Diese Fehler müssen aktiv behoben werden.',
    '</preview_debug_context>',
  ].join('\n');
}

function buildRepairPrompt(
  status: GenerationStatus,
  validationErrors: string[],
  previewErrors: StructuredPreviewError[],
  attemptedFixes: string[],
): string {
  const reasonLabel = status === 'failed_compile'
    ? 'Compile-/Syntax-Fehler'
    : 'Contract-Verletzung';
  const reasons = validationErrors.length > 0
    ? validationErrors.slice(0, 6).map(err => `- ${err}`).join('\n')
    : '- Unbekannter Fehler';

  return [
    'Dein vorheriger Output war ungültig und wurde serverseitig abgelehnt.',
    `Fehlerkategorie: ${reasonLabel}`,
    'Fehlerdetails:',
    reasons,
    '',
    'Erzeuge den vollständigen boltArtifact-Output erneut und korrigiere ALLE Fehler.',
    'Pflichtregeln:',
    '- app-id/App.tsx muss existieren und eine renderbare Root-Komponente exportieren.',
    '- module.json.entry muss exakt "./App.tsx" sein.',
    '- Liefere kompilierbaren TypeScript/TSX-Code ohne Syntaxfehler.',
    '- Keine Platzhalter, keine TODO-Stubs, keine unvollständigen Template-Strings.',
    '- Erzeuge eine visuell hochwertige UI (Hero, Cards, Spacing, Hierarchie, Hover/Transition).',
    '',
    attemptedFixes.length > 0
      ? `Bisher versuchte Auto-Fixes:\n${attemptedFixes.map((item) => `- ${item}`).join('\n')}`
      : 'Bisher versuchte Auto-Fixes: keine',
    previewErrors.length > 0
      ? `\n${buildPreviewErrorPromptContext(previewErrors)}`
      : '',
  ].join('\n');
}

function appendProviderPromptExtension(systemPrompt: string, llmProvider: LLMProvider): string {
  if (llmProvider !== 'openai') return systemPrompt;

  return `${systemPrompt}

<openai_ui_quality_boost>
OPENAI-QUALITAETSMODUS (PFLICHT):
- Erzeuge KEINE primitive Basis-HTML-Oberfläche.
- App.tsx muss ein klares Layout enthalten: Hero/Header + mindestens 2 Sektionen.
- Verwende sichtbare Design-Tiefe: Kartenflächen, Radius, Schatten, Abstände, Farbhierarchie.
- Tailwind-Styling muss reichhaltig sein (Grid/Flex + Gap/Spacing + Hover/Transition).
- Verwende nicht nur "p-4 border text-xl"; baue eine moderne, produktreife UI.
- Priorisiere ein kohärentes visuelles Thema statt Minimalstruktur.
</openai_ui_quality_boost>`;
}

async function generateBuildResponseText(
  llmClient: LLMClient,
  selectedModel: string,
  messages: LLMMessage[],
  systemPrompt: string,
  onDelta?: (delta: string) => void
): Promise<string> {
  let fullResponse = '';
  let segmentCount = 0;
  let currentMessages = [...messages];

  while (segmentCount < MAX_RESPONSE_SEGMENTS) {
    segmentCount++;
    log.debug(`BUILD Segment ${segmentCount}...`);

    // In Streaming-Kontext: echte Delta-Events senden, damit der Client
    // <boltAction>-Blöcke live parsen und Code-Fenster anzeigen kann.
    if (onDelta && llmClient.stream) {
      let segmentText = '';
      for await (const delta of llmClient.stream({
        model: selectedModel,
        messages: currentMessages,
        system: systemPrompt,
        maxTokens: MAX_TOKENS,
      })) {
        segmentText += delta;
        onDelta(delta);
      }
      fullResponse += segmentText;
      break;
    }

    const response = await llmClient.generate({
      model: selectedModel,
      messages: currentMessages,
      system: systemPrompt,
      maxTokens: MAX_TOKENS,
    });

    const segmentText = response.message || '';
    fullResponse += segmentText;
    if (onDelta && segmentText) {
      onDelta(segmentText);
    }

    if (response.stopReason === 'max_tokens' && segmentCount < MAX_RESPONSE_SEGMENTS) {
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: segmentText },
        { role: 'user', content: CONTINUE_PROMPT },
      ];
    } else {
      break;
    }
  }

  return fullResponse;
}

async function runValidatedBuildGeneration(params: {
  llmClient: LLMClient;
  selectedModel: string;
  systemPrompt: string;
  filteredMessages: LLMMessage[];
  currentModuleFiles: Array<{ path: string; content: string }>;
  existingModuleRoot: string | null;
  previewErrors: StructuredPreviewError[];
  onDelta?: (delta: string) => void;
  onAttempt?: (payload: { attempt: number; maxAttempts: number; stage: string; reason?: string }) => void;
}): Promise<BuildGenerationResult> {
  const maxAttempts = 3;
  let attempts = 0;
  let requestMessages: LLMMessage[] = [...params.filteredMessages];
  let lastResult: BuildProcessingResult | null = null;
  let lastStatus: GenerationStatus = 'failed_contract';
  let lastErrors: string[] = [];
  let lastRawResponse = '';
  const attemptedFixes: string[] = [];

  while (attempts < maxAttempts) {
    attempts++;
    params.onAttempt?.({ attempt: attempts, maxAttempts, stage: 'generation' });
    const fullResponse = await generateBuildResponseText(
      params.llmClient,
      params.selectedModel,
      requestMessages,
      params.systemPrompt,
      params.onDelta
    );

    lastRawResponse = fullResponse;
    const processed = processBuildResponse(
      fullResponse,
      params.currentModuleFiles,
      params.existingModuleRoot
    );
    lastResult = processed;

    const validation = await validateBuildOutput(
      processed.files,
      params.currentModuleFiles,
      params.existingModuleRoot
    );

    if (validation.generationStatus === 'ok') {
      log.info('Build-Validierung erfolgreich', {
        attempts,
        generationStatus: 'ok',
      });
      return {
        message: processed.messageText,
        files: validation.files,
        moduleInfo: processed.moduleInfo,
        options: processed.options,
        patches: processed.patches,
        generationStatus: 'ok',
        validationErrors: [],
        attempts,
      };
    }

    const deterministic = applyDeterministicFixes(processed.files);
    if (deterministic.fixes.length > 0) {
      attemptedFixes.push(...deterministic.fixes);
      params.onAttempt?.({
        attempt: attempts,
        maxAttempts,
        stage: 'auto_fix',
        reason: deterministic.fixes[0],
      });

      const deterministicValidation = await validateBuildOutput(
        deterministic.files,
        params.currentModuleFiles,
        params.existingModuleRoot,
      );

      if (deterministicValidation.generationStatus === 'ok') {
        log.info('Build-Validierung durch deterministische Fixes erfolgreich', {
          attempts,
          fixes: deterministic.fixes.length,
        });

        return {
          message: `${processed.messageText}\n\n🔧 Auto-Debug hat bekannte Fehler automatisch korrigiert:\n${deterministic.fixes.map((item) => `- ${item}`).join('\n')}`,
          files: deterministicValidation.files,
          moduleInfo: processed.moduleInfo,
          options: processed.options,
          patches: processed.patches,
          generationStatus: 'ok',
          validationErrors: [],
          attempts,
        };
      }

      lastStatus = deterministicValidation.generationStatus;
      lastErrors = deterministicValidation.validationErrors;
    } else {
      lastStatus = validation.generationStatus;
      lastErrors = validation.validationErrors;
    }

    log.warn(`Build-Validierung fehlgeschlagen (Attempt ${attempts}/${maxAttempts})`, {
      generationStatus: lastStatus,
      firstError: lastErrors[0] || 'unknown',
    });

    if (attempts >= maxAttempts) {
      break;
    }

    const repairPrompt = buildRepairPrompt(
      lastStatus,
      lastErrors,
      params.previewErrors,
      attemptedFixes,
    );
    requestMessages = [
      ...params.filteredMessages,
      { role: 'assistant', content: lastRawResponse },
      { role: 'user', content: repairPrompt },
    ];
  }

  log.warn('Build-Validierung final fehlgeschlagen', {
    attempts,
    generationStatus: lastStatus,
    firstError: lastErrors[0] || 'unknown',
  });

  return {
    message: buildValidationFailureMessage(lastStatus, lastErrors, attempts, maxAttempts, attemptedFixes),
    files: [],
    moduleInfo: lastResult?.moduleInfo ?? null,
    options: lastResult?.options ?? null,
    patches: lastResult?.patches ?? [],
    generationStatus: lastStatus,
    validationErrors: lastErrors,
    attempts,
  };
}

// --------------------------------------------
// POST Handler
// Unterstützt 'discuss' (Planung) und 'build' (Code) Modes
// --------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequest;
    const { 
      messages, 
      chatMode = 'build', 
      proMode = false, 
      stream = false,
      currentModule,
      customPrompt,
      moduleTools = [],
      moduleEvents = [],
      apiKeys = [],
      llmProvider = 'openai', // Standard: OpenRouter ueber OpenAI-kompatiblen Client
      llmModel, // Wird basierend auf Provider gesetzt falls nicht angegeben
      previewErrors: previewErrorsRaw = [],
      baseContext = null,
    } = body;

    const shouldStream = Boolean(stream);

    // --------------------------------------------
    // Debug: Env-Status für LLM Keys
    // Zeigt nur ob Keys gesetzt sind (ohne Inhalte)
    // --------------------------------------------
    const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
    const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
    log.debug('Env Keys', { anthropic: hasAnthropicKey, openai: hasOpenAIKey });
    log.info('Anfrage erhalten', {
      chatMode,
      proMode,
      llmProvider,
      llmModel: llmModel || 'default',
      messages: messages.length,
    });

    // LLM Client erstellen
    let llmClient;
    try {
      llmClient = createLLMClient(llmProvider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return new Response(
        JSON.stringify({ 
          error: 'LLM Provider Fehler',
          message: errorMessage
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Standard-Modell basierend auf Provider setzen falls nicht angegeben
    const defaultModel = normalizeOpenRouterModelId(llmModel || DEFAULT_OPENROUTER_MODEL_ID);
    const selectedModel = normalizeOpenRouterModelId(llmModel || defaultModel);

    // Leere Messages filtern (z.B. Placeholder mit status: 'pending')
    const filteredMessages: LLMMessage[] = messages
      .filter(msg => msg.content && msg.content.trim().length > 0)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

    const previewErrors = sanitizePreviewErrors(previewErrorsRaw);
    const basePromptBlock = baseContext?.baseId
      ? buildBasePromptBlock(
          await buildBaseContextForAgent(DEFAULT_USER_ID, baseContext.baseId, {
            rowSampleLimit: 3,
            tableLimitPerModule: 8,
          })
        )
      : '';
    
    if (filteredMessages.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Keine Nachrichten',
          message: 'Bitte gib eine Nachricht ein.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------
    // Edit-Mode Kontext vorbereiten
    // --------------------------------------------

    const currentModuleFiles = currentModule?.files || [];
    const existingModuleRoot = getModuleRootFromFiles(currentModuleFiles);

    // =============================================
    // STREAMING MODE - SSE Response
    // =============================================

    if (shouldStream) {
      const encoder = new TextEncoder();

      const streamResponse = new ReadableStream({
        async start(controller) {
          // Helper: SSE Events senden
          const sendEvent = (event: string, data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`event: ${event}\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            // DISCUSS MODE - Streaming
            if (chatMode === 'discuss') {
              let systemPrompt = getDiscussPrompt();
              if (basePromptBlock) {
                systemPrompt += `\n\n${basePromptBlock}`;
              }
              let fullResponse = '';
              let streamTimedOut = false;

              if (llmClient.stream) {
                // --------------------------------------------
                // Streaming mit Timeout-Guard (verhindert Endlos-Hänger)
                // --------------------------------------------

                const streamTimeoutMs = 30000; // 30s ohne neue Tokens
                const maxStreamDurationMs = 120000; // 2 Minuten Gesamtlimit
                const streamStartedAt = Date.now();
                const iterator = llmClient.stream({
                  model: selectedModel,
                  messages: filteredMessages,
                  system: systemPrompt,
                  maxTokens: 4096,
                })?.[Symbol.asyncIterator]?.();

                if (iterator) {
                  while (true) {
                    const nextChunk = await Promise.race([
                      iterator.next(),
                      new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), streamTimeoutMs)),
                    ]);

                    if ('timeout' in nextChunk) {
                      streamTimedOut = true;
                      // Stream abbrechen wenn möglich
                      if (typeof iterator.return === 'function') {
                        try { await iterator.return(); } catch {}
                      }
                      break;
                    }

                    if (nextChunk.done) break;
                    if (Date.now() - streamStartedAt > maxStreamDurationMs) {
                      streamTimedOut = true;
                      if (typeof iterator.return === 'function') {
                        try { await iterator.return(); } catch {}
                      }
                      break;
                    }
                    const delta = nextChunk.value as string;
                    fullResponse += delta;
                    sendEvent('message_delta', { delta });
                  }
                }
              } else {
                const response = await llmClient.generate({
                  model: selectedModel,
                  messages: filteredMessages,
                  system: systemPrompt,
                  maxTokens: 4096,
                });
                fullResponse = response.message || '';
                if (fullResponse) {
                  sendEvent('message_delta', { delta: fullResponse });
                }
              }

              const options = parseOptionsFromResponse(fullResponse);
              const message = fullResponse.replace(/<options>[\s\S]*?<\/options>/g, '').trim();
              const timeoutNote = streamTimedOut ? '\n\n⚠️ Streaming-Timeout: Antwort wurde unvollständig beendet.' : '';

              sendEvent('final', { 
                message: message + timeoutNote,
                files: [],
                moduleInfo: null,
                chatMode: 'discuss',
                options,
              });

              controller.close();
              return;
            }

            // BUILD MODE - Streaming
            let systemPrompt = getModuleBuilderSystemPrompt();
            if (basePromptBlock) {
              systemPrompt += `\n\n${basePromptBlock}`;
            }
            systemPrompt = appendEditModeContext(systemPrompt, currentModuleFiles, existingModuleRoot);
            systemPrompt = appendProviderPromptExtension(systemPrompt, llmProvider);
            if (previewErrors.length > 0) {
              systemPrompt += `\n\n${buildPreviewErrorPromptContext(previewErrors)}`;
            }

            if (proMode) {
              systemPrompt += `\n\n<pro_mode_requirements>
👑 PRO MODE AKTIV - Erweiterte Code-Qualität

Du arbeitest jetzt im PRO MODE. Das bedeutet:

1. **TypeScript Strict Mode**
   - Alle Typen explizit definieren
   - Keine "any" Typen verwenden
   - Interfaces für alle Props und State

2. **Unit Tests** 
   - Erstelle eine test.ts oder test.tsx Datei
   - Verwende React Testing Library für Komponenten
   - Mindestens 3 Test-Cases pro Hauptfunktion
   - Teste Edge Cases

3. **Dokumentation**
   - Ausführliche JSDoc Kommentare für alle Funktionen
   - README.md mit Nutzungsanleitung erstellen
   - Inline-Kommentare für komplexe Logik

4. **Best Practices**
   - Error Boundaries für Fehlerbehandlung
   - Loading States und Skeleton UI
   - Accessibility (ARIA Labels)
   - Performance-Optimierung (memo, useMemo, useCallback)

5. **Code-Struktur**
   - Saubere Trennung von Logik und UI
   - Custom Hooks für wiederverwendbare Logik
   - Konstanten in separater Datei

Generiere alle diese Dateien für ein professionelles, produktionsreifes Modul!
</pro_mode_requirements>`;
            }

            if (customPrompt?.enabled && customPrompt.systemPrompt) {
              systemPrompt += `\n\n<user_custom_context>
Der User hat folgenden zusätzlichen Kontext für dieses Modul definiert:

${customPrompt.systemPrompt}
${customPrompt.constraints.length > 0 ? `
EINSCHRÄNKUNGEN:
${customPrompt.constraints.map(c => `- ${c}`).join('\n')}` : ''}
</user_custom_context>`;
            }

            if (moduleTools.length > 0) {
              systemPrompt += `\n\n<module_tools_requirement>
Dieses Modul hat TOOLS definiert, die du in die module.json einbauen MUSST:

\`\`\`json
"api": {
  "actions": [
${moduleTools.map(t => `    {
      "name": "${t.name}",
      "description": "${t.description}",
      "input": {
        "type": "object",
        "properties": {
${t.parameters.map(p => `          "${p.name}": { "type": "${p.type}", "description": "${p.description}" }`).join(',\n')}
        },
        "required": [${t.parameters.filter(p => p.required).map(p => `"${p.name}"`).join(', ')}]
      }
    }`).join(',\n')}
  ]${moduleEvents.length > 0 ? `,
  "events": [
${moduleEvents.map(e => `    {
      "name": "${e.name}",
      "description": "${e.description}"
    }`).join(',\n')}
  ]` : ''}
}
\`\`\`

Implementiere diese Actions auch im Code mit dem moduleAPI Pattern!
</module_tools_requirement>`;
            }

            if (apiKeys.length > 0) {
              systemPrompt += `\n\n<configured_api_keys>
Der User hat folgende API-Keys konfiguriert, die du in deinem Code verwenden kannst:
${apiKeys.map(k => `- ${k.name} (Service: ${k.service})`).join('\n')}

Greife auf diese Keys über das LifeOS API-Key System zu:
\`\`\`typescript
// Die Keys sind über den useModuleSettings Hook verfügbar
const apiKey = useModuleSettings('${apiKeys[0]?.service}');
\`\`\`
</configured_api_keys>`;
            }

            // Hinweis: current_module_context wird nicht mehr separat angehaengt
            // Der volle Dateiinhalt ist bereits in appendEditModeContext() enthalten

            const buildResult = await runValidatedBuildGeneration({
              llmClient,
              selectedModel,
              systemPrompt,
              filteredMessages,
              currentModuleFiles,
              existingModuleRoot,
              previewErrors,
              onDelta: (delta: string) => {
                sendEvent('message_delta', { delta });
              },
              onAttempt: (payload) => {
                sendEvent('debug_attempt', payload);
              },
            });

            sendEvent('final', {
              message: buildResult.message,
              files: buildResult.files,
              moduleInfo: buildResult.moduleInfo,
              chatMode: 'build',
              options: buildResult.options,
              generationStatus: buildResult.generationStatus,
              validationErrors: buildResult.validationErrors,
              attempts: buildResult.attempts,
              patches: buildResult.patches.length > 0 ? buildResult.patches.map(p => ({
                path: p.path,
                success: p.success,
                patchFailed: p.patchFailed,
                failedPatches: p.failedPatches,
                totalPatches: p.totalPatches,
              })) : undefined,
            });

            
            controller.close();
          } catch (streamError) {
            const { message, statusCode } = mapLLMError(streamError);
            sendEvent('error', { message, statusCode });
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // =============================================
    // DISCUSS MODE - Planung & Beratung (KEIN Code)
    // =============================================
    
    if (chatMode === 'discuss') {
      log.info('DISCUSS MODE - Verwende Planungs-Prompt');
      
      let systemPrompt = getDiscussPrompt();
      if (basePromptBlock) {
        systemPrompt += `\n\n${basePromptBlock}`;
      }
      
      const response = await llmClient.generate({
        model: selectedModel,
        messages: filteredMessages,
        system: systemPrompt,
        maxTokens: 4096,
      });
      
      const fullMessage = response.message || 'Ich konnte keine Antwort generieren.';
      
      // Parse Options aus der Antwort
      const options = parseOptionsFromResponse(fullMessage);
      
      // Entferne <options> Block aus der angezeigten Nachricht
      const message = fullMessage.replace(/<options>[\s\S]*?<\/options>/g, '').trim();
      
      log.debug(`DISCUSS Response - Länge: ${message.length}, Options: ${options?.length || 0}`);
      
      return new Response(
        JSON.stringify({ 
          message,
          files: [],
          moduleInfo: null,
          chatMode: 'discuss',
          options, // NEU: Actionable Options
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // =============================================
    // BUILD MODE - Code-Generierung mit boltArtifact
    // Pro Mode: Erweiterte Features (Tests, Docs, bessere Qualität)
    // =============================================
    
    log.info(`BUILD MODE ${proMode ? '(PRO)' : ''} - Verwende Code-Generierungs-Prompt`);
    
    // System-Prompt für Build-Mode
    let systemPrompt = getModuleBuilderSystemPrompt();
    if (basePromptBlock) {
      systemPrompt += `\n\n${basePromptBlock}`;
    }
    systemPrompt = appendEditModeContext(systemPrompt, currentModuleFiles, existingModuleRoot);
    systemPrompt = appendProviderPromptExtension(systemPrompt, llmProvider);
    if (previewErrors.length > 0) {
      systemPrompt += `\n\n${buildPreviewErrorPromptContext(previewErrors)}`;
    }
    
    // PRO MODE - Erweiterte Anforderungen hinzufügen
    if (proMode) {
      systemPrompt += `\n\n<pro_mode_requirements>
👑 PRO MODE AKTIV - Erweiterte Code-Qualität

Du arbeitest jetzt im PRO MODE. Das bedeutet:

1. **TypeScript Strict Mode**
   - Alle Typen explizit definieren
   - Keine "any" Typen verwenden
   - Interfaces für alle Props und State

2. **Unit Tests** 
   - Erstelle eine test.ts oder test.tsx Datei
   - Verwende React Testing Library für Komponenten
   - Mindestens 3 Test-Cases pro Hauptfunktion
   - Teste Edge Cases

3. **Dokumentation**
   - Ausführliche JSDoc Kommentare für alle Funktionen
   - README.md mit Nutzungsanleitung erstellen
   - Inline-Kommentare für komplexe Logik

4. **Best Practices**
   - Error Boundaries für Fehlerbehandlung
   - Loading States und Skeleton UI
   - Accessibility (ARIA Labels)
   - Performance-Optimierung (memo, useMemo, useCallback)

5. **Code-Struktur**
   - Saubere Trennung von Logik und UI
   - Custom Hooks für wiederverwendbare Logik
   - Konstanten in separater Datei

Generiere alle diese Dateien für ein professionelles, produktionsreifes Modul!
</pro_mode_requirements>`;
    }
    
    // CUSTOM PROMPT - Zusätzlicher Kontext vom User
    if (customPrompt?.enabled && customPrompt.systemPrompt) {
      systemPrompt += `\n\n<user_custom_context>
Der User hat folgenden zusätzlichen Kontext für dieses Modul definiert:

${customPrompt.systemPrompt}
${customPrompt.constraints.length > 0 ? `
EINSCHRÄNKUNGEN:
${customPrompt.constraints.map(c => `- ${c}`).join('\n')}` : ''}
</user_custom_context>`;
    }
    
    // MODULE TOOLS - Wenn Tools definiert sind, füge sie in die module.json ein
    if (moduleTools.length > 0) {
      systemPrompt += `\n\n<module_tools_requirement>
Dieses Modul hat TOOLS definiert, die du in die module.json einbauen MUSST:

\`\`\`json
"api": {
  "actions": [
${moduleTools.map(t => `    {
      "name": "${t.name}",
      "description": "${t.description}",
      "input": {
        "type": "object",
        "properties": {
${t.parameters.map(p => `          "${p.name}": { "type": "${p.type}", "description": "${p.description}" }`).join(',\n')}
        },
        "required": [${t.parameters.filter(p => p.required).map(p => `"${p.name}"`).join(', ')}]
      }
    }`).join(',\n')}
  ]${moduleEvents.length > 0 ? `,
  "events": [
${moduleEvents.map(e => `    {
      "name": "${e.name}",
      "description": "${e.description}"
    }`).join(',\n')}
  ]` : ''}
}
\`\`\`

Implementiere diese Actions auch im Code mit dem moduleAPI Pattern!
</module_tools_requirement>`;
    }
    
    // API KEYS - Wenn API Keys konfiguriert sind, erwähne sie
    if (apiKeys.length > 0) {
      systemPrompt += `\n\n<configured_api_keys>
Der User hat folgende API-Keys konfiguriert, die du in deinem Code verwenden kannst:
${apiKeys.map(k => `- ${k.name} (Service: ${k.service})`).join('\n')}

Greife auf diese Keys über das LifeOS API-Key System zu:
\`\`\`typescript
// Die Keys sind über den useModuleSettings Hook verfügbar
const apiKey = useModuleSettings('${apiKeys[0]?.service}');
\`\`\`
</configured_api_keys>`;
    }
    
    // Hinweis: current_module_context wird nicht mehr separat angehaengt
    // Der volle Dateiinhalt ist bereits in appendEditModeContext() enthalten

    const buildResult = await runValidatedBuildGeneration({
      llmClient,
      selectedModel,
      systemPrompt,
      filteredMessages,
      currentModuleFiles,
      existingModuleRoot,
      previewErrors,
    });

    return new Response(
      JSON.stringify({ 
        message: buildResult.message,
        files: buildResult.files,
        moduleInfo: buildResult.moduleInfo,
        chatMode: 'build',
        options: buildResult.options,
        generationStatus: buildResult.generationStatus,
        validationErrors: buildResult.validationErrors,
        attempts: buildResult.attempts,
        patches: buildResult.patches.length > 0 ? buildResult.patches.map(p => ({
          path: p.path,
          success: p.success,
          patchFailed: p.patchFailed,
          failedPatches: p.failedPatches,
          totalPatches: p.totalPatches,
        })) : undefined,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    log.error('API Error', error);
    const { message: errorMessage, statusCode } = mapLLMError(error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Fehler bei der Generierung',
        message: errorMessage,
        statusCode,
        // Debug-Info (nur in Development)
        ...(process.env.NODE_ENV === 'development' && error instanceof Error ? {
          debug: {
            originalError: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
          }
        } : {}),
      }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
