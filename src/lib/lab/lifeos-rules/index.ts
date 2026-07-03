// ============================================
// lifeos-rules/index.ts - System-geschützte Modul-Regeln
// 
// Zweck: Verwaltet unveränderliche Kernregeln für Module
//        Diese Dateien dürfen vom Agent NICHT verändert werden
// ============================================

// --------------------------------------------
// Geschützte Pfade (unveränderlich)
// --------------------------------------------

/**
 * Diese Pfade sind IMMER gesperrt und können nicht entsperrt werden.
 * Sie werden automatisch bei jedem Modul erstellt.
 */
export const SYSTEM_PROTECTED_PATHS = [
  '.lifeos',
  '.lifeos/RULES.md',
  '.lifeos/DESIGN_SYSTEM.md',
] as const;

/**
 * Prüft ob ein Pfad system-geschützt ist
 */
export function isSystemProtectedPath(path: string): boolean {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
  return SYSTEM_PROTECTED_PATHS.some(protectedPath => 
    normalizedPath === protectedPath || 
    normalizedPath.startsWith(protectedPath + '/')
  );
}

// --------------------------------------------
// Template-Dateien für neue Module
// --------------------------------------------

export interface LifeOSRulesFile {
  path: string;
  content: string;
  description: string;
}

// Inline-Content für RULES.md
const RULES_MD_CONTENT = `# LifeOS Module Rules

> ⚠️ **UNVERÄNDERLICH** - Diese Datei darf NICHT modifiziert werden!

## 1. Pflicht-Struktur

Jedes LifeOS-Modul **MUSS** folgende Dateien enthalten:

### \`module.json\` (Pflichtfelder)

\`\`\`json
{
  "id": "kebab-case-id",
  "name": "Anzeigename",
  "icon": "LucideIconName",
  "entry": "./App.tsx"
}
\`\`\`

### \`README.md\`

Dokumentation mit Beschreibung, Features und Entwickler-Infos.

## 2. Design-System (Pflicht!)

\`\`\`typescript
import { useThemeStyles } from '@/lib/theme';

const { container, surface, button, accentColor, textColor, designStyle } = useThemeStyles();
\`\`\`

## 3. Verbotene Patterns

❌ NIEMALS:
- \`background: "white"\` oder \`color: "#333"\`
- Feste \`border-radius\` ohne \`designStyle\` Check

✅ IMMER:
- \`background: surfaceColor\`
- \`borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem'\`

## 4. Die 3 Design-Stile

| Stil | Charakteristik |
|------|----------------|
| \`glass\` | Blur, Transparenz, weiche Shadows |
| \`brutal\` | Schwarze Borders, harte Shadows |
| \`neo\` | Dual-Shadows, keine Borders |

---

*LifeOS Module System v1.0*
`;

// Inline-Content für DESIGN_SYSTEM.md
const DESIGN_SYSTEM_MD_CONTENT = `# LifeOS Design System Reference

> 🔒 **UNVERÄNDERLICH** - Referenz für das Theme-System

## Quick Reference

\`\`\`typescript
import { useThemeStyles } from '@/lib/theme';

const {
  container,     // Hauptcontainer
  surface,       // Cards, Panels
  button,        // Buttons
  input,         // Inputs
  accentColor,   // User's Hauptfarbe
  textColor,     // Textfarbe
  designStyle,   // "glass" | "brutal" | "neo"
} = useThemeStyles();
\`\`\`

## Komponenten-Patterns

### Container
\`\`\`tsx
<div style={container.base}>{/* Content */}</div>
\`\`\`

### Surface (Cards)
\`\`\`tsx
<div style={surface.base}>
  <h2 style={{ color: textColor }}>Titel</h2>
</div>
\`\`\`

### Buttons
\`\`\`tsx
<button style={button.primary}>Speichern</button>
\`\`\`

### Conditional Styling
\`\`\`tsx
<div style={{
  ...surface.base,
  borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
}}>
\`\`\`

---

*LifeOS Design System v1.0*
`;

/**
 * Die .lifeos/ Dateien die bei jedem Modul erstellt werden
 */
export const LIFEOS_RULES_FILES: LifeOSRulesFile[] = [
  {
    path: '.lifeos/RULES.md',
    content: RULES_MD_CONTENT,
    description: 'Unveränderliche Kernregeln für das Modul',
  },
  {
    path: '.lifeos/DESIGN_SYSTEM.md',
    content: DESIGN_SYSTEM_MD_CONTENT,
    description: 'Design-System Referenz-Dokumentation',
  },
];

/**
 * Generiert alle .lifeos/ Dateien für ein neues Modul
 */
export function generateLifeOSRulesFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  
  for (const file of LIFEOS_RULES_FILES) {
    files[file.path] = file.content;
  }
  
  return files;
}

// --------------------------------------------
// README Template Generator
// --------------------------------------------

export interface ModuleInfo {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  version?: string;
  category?: string;
  author?: string;
  features?: string[];
}

/**
 * Generiert eine README.md für ein Modul
 */
export function generateModuleReadme(moduleInfo: ModuleInfo): string {
  const features = moduleInfo.features || ['Automatisch generiert mit LifeOS Module Builder'];
  
  return `# ${moduleInfo.name}

> LifeOS Module v${moduleInfo.version || '1.0.0'}

## 📋 Beschreibung

${moduleInfo.description || 'Ein LifeOS-Modul.'}

## 🚀 Features

${features.map(f => `- ${f}`).join('\n')}

## 🛠️ Installation

Dieses Modul ist Teil des LifeOS-Ökosystems und wird automatisch installiert.

## 📖 Verwendung

Öffne das Modul über die LifeOS Sidebar oder das Dashboard.

## 🔧 Für Entwickler

### Technologie-Stack

- React 18 + TypeScript
- Zustand (State Management)
- LifeOS Theme System
- Framer Motion (Animationen)

### Lokale Entwicklung

\`\`\`bash
# Repository klonen
git clone [repo-url]
cd ${moduleInfo.id}

# In LifeOS einbinden
# Das Modul wird automatisch erkannt
\`\`\`

### Struktur

\`\`\`
${moduleInfo.id}/
├── .lifeos/           # Kernregeln (nicht ändern!)
│   ├── RULES.md
│   └── DESIGN_SYSTEM.md
├── module.json        # Modul-Manifest
├── README.md          # Diese Datei
└── src/               # Dein Code
    └── ...
\`\`\`

## ⚠️ LifeOS Regeln

Dieses Modul folgt den LifeOS-Kernregeln:

- ✅ Verwendet das Theme-System
- ✅ Keine hardcoded Farben
- ✅ Kompatibel mit allen Design-Stilen (glass, brutal, neo)

Siehe \`.lifeos/RULES.md\` für Details.

## 📄 Lizenz

Erstellt mit [LifeOS Module Builder](https://lifeos.app)

---

*Automatisch generiert am ${new Date().toLocaleDateString('de-DE')}*
`;
}

// --------------------------------------------
// Validierung
// --------------------------------------------

export interface ValidationError {
  type: 'error' | 'warning';
  path?: string;
  message: string;
}

/**
 * Validiert ein Modul vor dem Push
 */
export function validateModuleForGitHub(
  files: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _moduleInfo?: ModuleInfo
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  // 1. module.json Pflicht
  if (!files['module.json']) {
    errors.push({
      type: 'error',
      path: 'module.json',
      message: 'module.json fehlt - Pflichtdatei für jedes Modul',
    });
  } else {
    try {
      const manifest = JSON.parse(files['module.json']);
      
      if (!manifest.id) {
        errors.push({ type: 'error', path: 'module.json', message: 'Pflichtfeld "id" fehlt' });
      }
      if (!manifest.name) {
        errors.push({ type: 'error', path: 'module.json', message: 'Pflichtfeld "name" fehlt' });
      }
      if (!manifest.icon) {
        errors.push({ type: 'error', path: 'module.json', message: 'Pflichtfeld "icon" fehlt' });
      }
      if (!manifest.entry) {
        errors.push({ type: 'error', path: 'module.json', message: 'Pflichtfeld "entry" fehlt' });
      }
    } catch {
      errors.push({
        type: 'error',
        path: 'module.json',
        message: 'module.json ist kein gültiges JSON',
      });
    }
  }
  
  // 2. README.md Empfehlung
  if (!files['README.md']) {
    errors.push({
      type: 'warning',
      path: 'README.md',
      message: 'README.md fehlt - wird automatisch generiert',
    });
  }
  
  // 3. .lifeos/ Ordner prüfen
  const hasLifeOSRules = Object.keys(files).some(path => path.startsWith('.lifeos/'));
  if (!hasLifeOSRules) {
    errors.push({
      type: 'warning',
      path: '.lifeos/',
      message: '.lifeos/ Ordner fehlt - wird automatisch hinzugefügt',
    });
  }
  
  // 4. Theme-System Verwendung prüfen
  const codeFiles = Object.entries(files).filter(([path]) => 
    path.endsWith('.tsx') || path.endsWith('.ts')
  );
  
  const hasThemeImport = codeFiles.some(([, content]) => 
    content.includes('useThemeStyles') || content.includes('@/lib/theme')
  );
  
  if (codeFiles.length > 0 && !hasThemeImport) {
    errors.push({
      type: 'warning',
      message: 'Theme-System wird nicht verwendet - empfohlen für Kompatibilität mit allen Design-Stilen',
    });
  }
  
  // 5. Hardcoded Farben prüfen (nur Warnung)
  const hasHardcodedColors = codeFiles.some(([, content]) => 
    /background:\s*['"](?:white|black|#[0-9a-f]{3,6})['"]/.test(content) ||
    /color:\s*['"]#[0-9a-f]{3,6}['"]/.test(content)
  );
  
  if (hasHardcodedColors) {
    errors.push({
      type: 'warning',
      message: 'Hardcoded Farben gefunden - nutze stattdessen das Theme-System',
    });
  }
  
  return {
    valid: errors.filter(e => e.type === 'error').length === 0,
    errors,
  };
}

/**
 * Fügt fehlende .lifeos/ Dateien und README hinzu
 */
export function ensureRequiredFiles(
  files: Record<string, string>,
  moduleInfo?: ModuleInfo
): Record<string, string> {
  const result = { ...files };
  
  // .lifeos/ Dateien hinzufügen falls fehlend
  const lifeosFiles = generateLifeOSRulesFiles();
  for (const [path, content] of Object.entries(lifeosFiles)) {
    if (!result[path]) {
      result[path] = content;
    }
  }
  
  // README generieren falls fehlend
  if (!result['README.md'] && moduleInfo) {
    result['README.md'] = generateModuleReadme(moduleInfo);
  }
  
  return result;
}
