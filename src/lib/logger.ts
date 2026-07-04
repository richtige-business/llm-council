// ============================================
// logger.ts - Zentrales Logging-System
//
// Zweck: Ersetzt console.log mit strukturiertem Logging
//        Kann pro Umgebung konfiguriert werden
// Verwendet von: Alle Server- und Client-Dateien
// ============================================

// --------------------------------------------
// Log-Level Definitionen
// --------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// --------------------------------------------
// Konfiguration
// In Produktion: nur warn + error
// In Development: alles
// --------------------------------------------

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';

// --------------------------------------------
// Farben für Terminal-Ausgabe (Server-Side)
// --------------------------------------------

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️ ',
  warn: '⚠️ ',
  error: '❌',
};

// --------------------------------------------
// Logger-Klasse
// --------------------------------------------

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  // Prüft ob ein Level ausgegeben werden soll
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
  }

  // Formatiert die Log-Nachricht
  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    return `${LEVEL_PREFIX[level]} [${timestamp}] [${this.context}] ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    if (data !== undefined) {
      console.log(this.format('debug', message), data);
    } else {
      console.log(this.format('debug', message));
    }
  }

  info(message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;
    if (data !== undefined) {
      console.info(this.format('info', message), data);
    } else {
      console.info(this.format('info', message));
    }
  }

  warn(message: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;
    if (data !== undefined) {
      console.warn(this.format('warn', message), data);
    } else {
      console.warn(this.format('warn', message));
    }
  }

  error(message: string, data?: unknown): void {
    if (!this.shouldLog('error')) return;
    if (data !== undefined) {
      console.error(this.format('error', message), data);
    } else {
      console.error(this.format('error', message));
    }
  }
}

// --------------------------------------------
// Factory: Erstellt Logger mit Kontext
// --------------------------------------------

export function createLogger(context: string): Logger {
  return new Logger(context);
}

// --------------------------------------------
// Default-Logger (für schnelle Nutzung)
// --------------------------------------------

export const logger = new Logger('App');
