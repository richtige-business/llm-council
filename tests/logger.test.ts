// ============================================
// logger.test.ts - Tests für das Logger-System
//
// Zweck: Prüft dass der Logger korrekt funktioniert
// Verwendet von: npm run test
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, logger } from '@/lib/logger';

describe('Logger', () => {
  // Spies innerhalb von beforeEach erstellen, damit sie frisch sind
  let logSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------
  // Factory-Funktion
  // --------------------------------------------

  it('erstellt Logger mit Kontext-Name', () => {
    const log = createLogger('TestModule');
    expect(log).toBeDefined();
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  it('Default-Logger ist vorhanden', () => {
    expect(logger).toBeDefined();
  });

  // --------------------------------------------
  // Logging-Methoden
  // --------------------------------------------

  it('debug() ruft console.log auf', () => {
    const log = createLogger('Test');
    log.debug('Hallo Welt');
    expect(logSpy).toHaveBeenCalledTimes(1);
    // Prüfe dass der Kontext im Output enthalten ist
    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toContain('[Test]');
    expect(logMessage).toContain('Hallo Welt');
  });

  it('info() ruft console.info auf', () => {
    const log = createLogger('InfoTest');
    log.info('Information');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const logMessage = infoSpy.mock.calls[0][0];
    expect(logMessage).toContain('[InfoTest]');
  });

  it('warn() ruft console.warn auf', () => {
    const log = createLogger('WarnTest');
    log.warn('Warnung');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logMessage = warnSpy.mock.calls[0][0];
    expect(logMessage).toContain('[WarnTest]');
  });

  it('error() ruft console.error auf', () => {
    const log = createLogger('ErrorTest');
    log.error('Fehler aufgetreten');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const logMessage = errorSpy.mock.calls[0][0];
    expect(logMessage).toContain('[ErrorTest]');
  });

  // --------------------------------------------
  // Daten-Parameter
  // --------------------------------------------

  it('übergibt zusätzliche Daten an console', () => {
    const log = createLogger('DataTest');
    const testData = { key: 'value', count: 42 };
    log.info('Mit Daten', testData);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    // Zweiter Parameter sollte die Daten sein
    expect(infoSpy.mock.calls[0][1]).toEqual(testData);
  });

  it('funktioniert ohne Daten-Parameter', () => {
    const log = createLogger('NoDataTest');
    log.info('Ohne Daten');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    // Sollte nur einen Parameter haben (die formatierte Nachricht)
    expect(infoSpy.mock.calls[0].length).toBe(1);
  });

  // --------------------------------------------
  // Timestamp-Format
  // --------------------------------------------

  it('enthält einen Timestamp im Log', () => {
    const log = createLogger('TimestampTest');
    log.info('Test');
    const logMessage = infoSpy.mock.calls[0][0];
    // Timestamp Format: HH:MM:SS.mmm (z.B. [14:23:05.123])
    expect(logMessage).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
  });
});
