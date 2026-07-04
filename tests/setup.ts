// ============================================
// setup.ts - Globales Test-Setup
//
// Zweck: Erweitert Vitest mit jest-dom Matchern
//        und setzt globale Mocks
// Verwendet von: Alle Tests (automatisch via vitest.config.ts)
// ============================================

import '@testing-library/jest-dom/vitest';

// Fallback Storage fuer Testumgebungen ohne vollstaendiges localStorage
const fallbackStorage: Storage = (() => {
  let memory: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in memory ? memory[key] : null),
    setItem: (key: string, value: string) => {
      memory[key] = value;
    },
    removeItem: (key: string) => {
      delete memory[key];
    },
    clear: () => {
      memory = {};
    },
    key: (index: number) => Object.keys(memory)[index] ?? null,
    get length() {
      return Object.keys(memory).length;
    },
  };
})();

const currentStorage = globalThis.localStorage as Partial<Storage> | undefined;
const hasValidStorage =
  typeof currentStorage?.getItem === 'function' &&
  typeof currentStorage?.setItem === 'function' &&
  typeof currentStorage?.removeItem === 'function';

if (!hasValidStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: fallbackStorage,
    configurable: true,
  });
}
