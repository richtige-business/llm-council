// ============================================
// route.ts - Module Activation API
// 
// Zweck: Schreibt generierte Module ins Dateisystem
//        Registriert Module für die Nutzung in LifeOS
// Verwendet von: ModulePreview Component
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import * as LucideIcons from 'lucide-react';

// --------------------------------------------
// Konstanten
// --------------------------------------------

const MODULES_DIR = path.join(process.cwd(), 'src', 'modules');
const VALID_LUCIDE_EXPORTS = new Set(Object.keys(LucideIcons));
const LUCIDE_IMPORT_REGEX = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;

interface GeneratedFile {
  path: string;
  content: string;
}

interface InvalidLucideImport {
  filePath: string;
  icon: string;
  line: number;
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

// Erstellt ein Verzeichnis rekursiv
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignoriere wenn Verzeichnis bereits existiert
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// Schreibt eine Datei und erstellt ggf. Verzeichnisse
async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, content, 'utf-8');
}

function findInvalidLucideImports(files: GeneratedFile[]): InvalidLucideImport[] {
  const invalid: InvalidLucideImport[] = [];

  for (const file of files) {
    if (!file?.content || typeof file.content !== 'string') continue;
    if (!/\.(tsx?|jsx?)$/i.test(file.path)) continue;
    if (!file.content.includes('lucide-react')) continue;

    let match: RegExpExecArray | null;
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

        const searchStart = match.index;
        const iconIndex = file.content.indexOf(iconName, searchStart);
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

// --------------------------------------------
// POST Handler - Modul aktivieren
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { module } = body;

    if (!module || !module.id || !module.files) {
      return NextResponse.json(
        { error: 'Module data required' },
        { status: 400 }
      );
    }

    const moduleFiles: GeneratedFile[] = Array.isArray(module.files) ? module.files : [];

    // Vor dem Schreiben validieren: ungültige Lucide-Icons sind eine häufige
    // Ursache für weißen Screen / Runtime-Fehler nach dem Publish.
    const invalidLucideImports = findInvalidLucideImports(moduleFiles);
    if (invalidLucideImports.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid lucide-react imports',
          message: `Ungültige Lucide-Icons gefunden (${invalidLucideImports.length}). Bitte ersetze diese Icons durch gültige Exports aus lucide-react.`,
          invalidImports: invalidLucideImports,
        },
        { status: 422 }
      );
    }

    const moduleId = module.id;
    const requestedBaseId = typeof module.baseId === 'string' ? module.baseId.trim() : '';
    const modulePath = path.join(MODULES_DIR, moduleId);

    // Prüfe ob Modul bereits existiert
    try {
      await fs.access(modulePath);
      // Modul existiert bereits - frage nach Überschreibung
      const overwrite = body.overwrite;
      if (!overwrite) {
        return NextResponse.json(
          { 
            error: 'Module already exists',
            exists: true,
            message: `Ein Modul mit der ID "${moduleId}" existiert bereits. Möchtest du es überschreiben?`
          },
          { status: 409 }
        );
      }
      // Lösche existierendes Modul
      await fs.rm(modulePath, { recursive: true });
    } catch {
      // Modul existiert nicht - gut
    }

    // Erstelle Modul-Verzeichnis
    await ensureDir(modulePath);

    // Schreibe alle Dateien
    // Wichtig: Module-Root-Prefix strippen (z.B. "expense-tracker/App.tsx" → "App.tsx")
    // Damit die Dateien direkt unter src/modules/{moduleId}/ landen
    const writtenFiles: string[] = [];
    
    // Gemeinsamen Root-Prefix erkennen (erstes Verzeichnissegment aller Dateien)
    const firstSegments = moduleFiles
      .map((f: { path: string }) => f.path.split('/')[0])
      .filter(Boolean);
    const hasCommonRoot = firstSegments.length > 0 
      && firstSegments.every((s: string) => s === firstSegments[0])
      && moduleFiles.some((f: { path: string }) => f.path.includes('/'));
    const moduleRoot = hasCommonRoot ? firstSegments[0] : null;
    
    for (const file of moduleFiles) {
      // Module-Root-Prefix entfernen falls vorhanden
      let relativePath = file.path;
      if (moduleRoot && relativePath.startsWith(moduleRoot + '/')) {
        relativePath = relativePath.slice(moduleRoot.length + 1);
      }
      
      const filePath = path.join(modulePath, relativePath);
      await writeFile(filePath, file.content);
      writtenFiles.push(relativePath);
    }

    // Erstelle/Aktualisiere module.json falls nicht vorhanden
    const moduleJsonPath = path.join(modulePath, 'module.json');
    const hasModuleJson = moduleFiles.some(
      (f: { path: string }) => f.path === 'module.json'
    );
    
    if (!hasModuleJson) {
      // Visibility aus dem Request holen (default: private)
      const visibility = body.visibility || 'private';
      
      const moduleJson = {
        id: module.id,
        name: module.name,
        description: module.description,
        version: module.version || '1.0.0',
        icon: module.icon || 'Blocks',
        category: module.category || 'productivity',
        author: 'User (Lab Generated)',
        kernelVersion: '>=0.1.0',
        permissions: module.permissions || ['storage.read.self', 'storage.write.self'],
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        visibility, // 'private' oder 'public'
        generatedBy: 'LifeOS Module Builder',
        ...(requestedBaseId ? { baseId: requestedBaseId } : {}),
        tools: module.tools?.map((t: { id: string; name: string; description: string }) => ({
          id: t.id,
          name: t.name,
          description: t.description,
        })) || [],
      };
      
      await writeFile(moduleJsonPath, JSON.stringify(moduleJson, null, 2));
      writtenFiles.push('module.json');
    } else if (requestedBaseId) {
      // Wenn module.json vom Generator kommt, Base-Zuordnung dennoch erzwingen,
      // damit Publish immer in der gewählten Base landet.
      try {
        const existingModuleJsonContent = await fs.readFile(moduleJsonPath, 'utf-8');
        const existingModuleJson = JSON.parse(existingModuleJsonContent);
        const nextModuleJson = {
          ...existingModuleJson,
          baseId: requestedBaseId,
        };
        if (existingModuleJson?.baseId !== requestedBaseId) {
          await writeFile(moduleJsonPath, JSON.stringify(nextModuleJson, null, 2));
          if (!writtenFiles.includes('module.json')) {
            writtenFiles.push('module.json');
          }
        }
      } catch {
        // Falls module.json unlesbar ist, keine harte Fehlersituation verursachen.
      }
    }

    // Aktualisiere die dynamische Module-Registry
    // Hier könnten wir eine zentrale Registry-Datei aktualisieren
    const registryPath = path.join(MODULES_DIR, '_registry.json');
    let registry: { modules: string[] } = { modules: [] };
    
    try {
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      registry = JSON.parse(registryContent);
    } catch {
      // Registry existiert nicht - erstelle neue
    }
    
    if (!registry.modules.includes(moduleId)) {
      registry.modules.push(moduleId);
      await writeFile(registryPath, JSON.stringify(registry, null, 2));
    }

    return NextResponse.json({
      success: true,
      moduleId,
      modulePath: `src/modules/${moduleId}`,
      writtenFiles,
      message: `Modul "${module.name}" wurde erfolgreich aktiviert!`,
      nextSteps: [
        'Das Modul ist jetzt unter /[moduleId] erreichbar',
        'Es erscheint automatisch in der Sidebar',
        'Der Dev-Server muss eventuell neu gestartet werden',
      ],
    });

  } catch (error) {
    console.error('Module activation error:', error);
    return NextResponse.json(
      { 
        error: 'Module activation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// GET Handler - Liste aktivierter Module
// --------------------------------------------

export async function GET() {
  try {
    const registryPath = path.join(MODULES_DIR, '_registry.json');
    
    try {
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(registryContent);
      
      // Lade Details für jedes Modul
      const modules = await Promise.all(
        registry.modules.map(async (moduleId: string) => {
          const moduleJsonPath = path.join(MODULES_DIR, moduleId, 'module.json');
          try {
            const moduleContent = await fs.readFile(moduleJsonPath, 'utf-8');
            return JSON.parse(moduleContent);
          } catch {
            return { id: moduleId, error: 'Could not load module.json' };
          }
        })
      );
      
      return NextResponse.json({ modules });
    } catch {
      return NextResponse.json({ modules: [] });
    }
  } catch (error) {
    console.error('Module list error:', error);
    return NextResponse.json(
      { error: 'Failed to list modules' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE Handler - Modul deaktivieren
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('id');

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID required' },
        { status: 400 }
      );
    }

    const modulePath = path.join(MODULES_DIR, moduleId);

    // Prüfe ob Modul existiert
    try {
      await fs.access(modulePath);
    } catch {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Lösche Modul-Verzeichnis
    await fs.rm(modulePath, { recursive: true });

    // Aktualisiere Registry
    const registryPath = path.join(MODULES_DIR, '_registry.json');
    try {
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(registryContent);
      registry.modules = registry.modules.filter((m: string) => m !== moduleId);
      await writeFile(registryPath, JSON.stringify(registry, null, 2));
    } catch {
      // Registry nicht gefunden - ignorieren
    }

    return NextResponse.json({
      success: true,
      message: `Modul "${moduleId}" wurde deaktiviert und gelöscht.`,
    });

  } catch (error) {
    console.error('Module deactivation error:', error);
    return NextResponse.json(
      { 
        error: 'Module deactivation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

