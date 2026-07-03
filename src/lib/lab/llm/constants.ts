// ============================================
// LifeOS Module Builder - LLM Constants
// 
// Zweck: Konstanten für die LLM-Integration
// Portiert von: bolt.diy
// ============================================

// --------------------------------------------
// Token-Limits
// --------------------------------------------

// Maximum tokens für Response-Generierung
// Claude 3.5 Sonnet unterstützt bis zu 200k context, 8k output
export const MAX_TOKENS = 8192;

// Maximale Anzahl an Response-Segmenten (für Continue-Prompt)
export const MAX_RESPONSE_SEGMENTS = 3;

// --------------------------------------------
// File Types
// --------------------------------------------

export interface File {
  type: 'file';
  content: string;
  isBinary?: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

// --------------------------------------------
// Ignore Patterns für Context
// --------------------------------------------

export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yml',
];

// --------------------------------------------
// Module Builder spezifische Konstanten
// --------------------------------------------

// Arbeitsverzeichnis für Module
export const MODULE_WORK_DIR = 'src/modules';

// Erlaubte HTML-Elemente in Responses
export const ALLOWED_HTML_ELEMENTS = [
  'a', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 
  'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'ins', 'kbd', 
  'li', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'source', 
  'span', 'strike', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 
  'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'var',
];

// Tag-Name für Modifikationen (wie bolt.diy)
export const MODIFICATIONS_TAG_NAME = 'bolt_file_modifications';



