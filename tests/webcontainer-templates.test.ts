// ============================================
// webcontainer-templates.test.ts - Tests fuer Preview FileTree Builder
//
// Zweck: Verhindert dass der Preview auf dem Placeholder haengen bleibt,
// wenn Entry oder Datei-Pfade inkonsistent sind.
// ============================================

import { describe, it, expect } from 'vitest';
import { buildModuleFileTree, getBaseProjectTree } from '@/lib/webcontainer/templates';

describe('buildModuleFileTree()', () => {
  it('waehlt eine vorhandene TSX-Datei als Fallback, wenn module.json ungueltig ist', () => {
    const { entryFile } = buildModuleFileTree([
      { path: 'sample-module/module.json', content: '{ invalid json' },
      { path: 'sample-module/index.tsx', content: 'export default function App(){ return null; }' },
      { path: 'sample-module/store/state.ts', content: 'export const x = 1;' },
    ]);

    expect(entryFile).toBe('index.tsx');
  });

  it('verwendet die echte Komponente auch bei gemischten Root-Pfaden', () => {
    const { entryFile } = buildModuleFileTree([
      {
        path: 'module.json',
        content: JSON.stringify({ id: 'x', name: 'X', icon: 'Box', entry: './App.tsx' }),
      },
      { path: 'sample-module/App.tsx', content: 'export default function App(){ return null; }' },
      { path: 'types.ts', content: 'export type Id = string;' },
    ]);

    expect(entryFile).toBe('sample-module/App.tsx');
  });

  it('normalisiert fuehrende Slashes ohne leeres Verzeichnis im Tree', () => {
    const { tree, entryFile } = buildModuleFileTree([
      {
        path: '/sample-module/module.json',
        content: JSON.stringify({ id: 'x', name: 'X', icon: 'Box', entry: './App.tsx' }),
      },
      { path: '/sample-module/App.tsx', content: 'export default function App(){ return null; }' },
    ]);

    const srcDir = (tree['src'] as { directory: Record<string, unknown> }).directory;
    expect(Object.keys(srcDir)).not.toContain('');
    expect(entryFile).toBe('App.tsx');
  });

  it('bevorzugt App.tsx statt Komponenten-Datei bei gemischten Root-Pfaden', () => {
    const { entryFile } = buildModuleFileTree([
      {
        path: 'module.json',
        content: JSON.stringify({ id: 'x', name: 'X', icon: 'Box', entry: './App.tsx' }),
      },
      {
        path: 'sample-app/components/Widget.tsx',
        content: 'export default function Widget(){ return null; }',
      },
      {
        path: 'sample-app/App.tsx',
        content: 'export default function App(){ return null; }',
      },
      {
        path: 'types.ts',
        content: 'export type Expense = { id: string };',
      },
    ]);

    expect(entryFile).toBe('sample-app/App.tsx');
  });

  it('ignoriert fehlerhaften component-entry aus module.json wenn App.tsx vorhanden ist', () => {
    const { entryFile } = buildModuleFileTree([
      {
        path: 'budget-app/module.json',
        content: JSON.stringify({
          id: 'budget-app',
          name: 'Budget App',
          icon: 'Wallet',
          entry: './components/ExpenseCard.tsx',
        }),
      },
      {
        path: 'budget-app/components/ExpenseCard.tsx',
        content: 'export default function ExpenseCard({ expense }: { expense: { id: string } }) { return <div>{expense.id}</div>; }',
      },
      {
        path: 'budget-app/App.tsx',
        content: 'export default function App() { return <div>Ready</div>; }',
      },
    ]);

    expect(entryFile).toBe('App.tsx');
  });
});

describe('getBaseProjectTree()', () => {
  it('liefert lokales Tailwind-Setup ohne externes CDN', () => {
    const tree = getBaseProjectTree();
    const packageJson = JSON.parse(
      ((tree['package.json'] as { file: { contents: string } }).file.contents)
    );
    const srcDir = (tree['src'] as { directory: Record<string, unknown> }).directory;
    const mainTsx = ((srcDir['main.tsx'] as { file: { contents: string } }).file.contents);
    const indexCss = ((srcDir['index.css'] as { file: { contents: string } }).file.contents);

    expect(packageJson.devDependencies['@tailwindcss/vite']).toBeDefined();
    expect(packageJson.devDependencies['tailwindcss']).toBeDefined();
    expect(mainTsx).toContain(`import './index.css';`);
    expect(indexCss).toContain(`@import "tailwindcss";`);
    expect(mainTsx).toContain('resolveRootComponent');
    expect(mainTsx).toContain('Kein renderbarer Export gefunden');
    expect(mainTsx).not.toContain('Fallback-Vorschau aktiv');
    expect(mainTsx).not.toContain('exportedComponents[0]');
  });
});
