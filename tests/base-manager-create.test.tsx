import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BaseManager } from '@/components/system/BaseManager';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';

vi.mock('@/lib/theme', () => ({
  useThemeStyles: () => ({
    container: { base: {} },
    input: { base: {} },
    accentColor: '#8b5cf6',
    designStyle: 'glass',
    textColor: '#ffffff',
    surfaceColor: 'rgba(255,255,255,0.1)',
  }),
}));

describe('BaseManager', () => {
  beforeEach(() => {
    useBaseStore.setState({ bases: [] });
    useModuleRegistry.setState({ modules: [], deletedModuleIds: [], isLoading: false, error: null });
  });

  it('erstellt eine Base per Button-Klick', () => {
    render(<BaseManager />);

    fireEvent.change(screen.getByPlaceholderText('Neue Base erstellen (z.B. ERP, Personal)'), {
      target: { value: 'ERP' },
    });
    fireEvent.change(screen.getByPlaceholderText('Base-Beschreibung (Pflicht)'), {
      target: { value: 'ERP Beschreibung' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Base erstellen/i }));

    const bases = useBaseStore.getState().bases;
    expect(bases).toHaveLength(1);
    expect(bases[0]?.name).toBe('ERP');
  });
});
