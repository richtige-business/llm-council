// ============================================
// vitest.config.ts - Test-Konfiguration
//
// Zweck: Konfiguriert Vitest für Unit- und Integrationstests
// Verwendet von: npm run test
// ============================================

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Umgebung: jsdom für React-Komponenten
    environment: 'jsdom',
    
    // Globale Setup-Dateien (z.B. für jest-dom Matcher)
    setupFiles: ['./tests/setup.ts'],
    
    // Glob-Patterns für Testdateien
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    
    // Ausschlüsse
    exclude: ['node_modules', 'Module-Builder', '.next'],
    
    // Coverage-Konfiguration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.*', 'src/**/types.*'],
    },
  },
  
  resolve: {
    alias: {
      // @/-Alias wie in tsconfig.json
      '@': path.resolve(__dirname, './src'),
    },
  },
});
