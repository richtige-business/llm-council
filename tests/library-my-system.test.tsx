import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LibraryPage from '@/app/library/page';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => {
        return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
          <div {...props}>{children}</div>
        );
      },
    }
  ),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/lib/theme', () => ({
  useThemeStyles: () => ({
    surface: { base: {} },
    container: { base: {} },
    input: { base: {} },
    accentColor: '#8b5cf6',
    designStyle: 'glass',
    surfaceColor: 'rgba(255,255,255,0.1)',
    textColor: '#ffffff',
  }),
}));

type MarketplaceState = {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  installedModules: string[];
  wishlist: string[];
};

const marketplaceState: MarketplaceState = {
  viewMode: 'grid',
  setViewMode: vi.fn(),
  installedModules: [],
  wishlist: [],
};

vi.mock('@/lib/marketplace/store', () => ({
  useMarketplaceStore: <T,>(selector: (state: MarketplaceState) => T): T => selector(marketplaceState),
}));

vi.mock('@/lib/marketplace/mock-data', () => ({
  MARKETPLACE_MODULES: [],
  getFeaturedModules: () => [],
  getTrendingModules: () => [],
  getNewModules: () => [],
  getModulesByType: () => [],
}));

vi.mock('@/components/marketplace', () => ({
  ModuleCard: () => <div data-testid="module-card" />,
  TrendingCarousel: () => <div data-testid="trending-carousel" />,
}));

vi.mock('@/components/system/BaseManager', () => ({
  BaseManager: () => <div data-testid="base-manager">BaseManager</div>,
}));

describe('Library - Mein System', () => {
  beforeEach(() => {
    marketplaceState.viewMode = 'grid';
    marketplaceState.installedModules = [];
    marketplaceState.wishlist = [];
    useBaseStore.setState({ bases: [] });
    useModuleRegistry.setState({ modules: [], deletedModuleIds: [], isLoading: false, error: null });
  });

  it('zeigt den Mein System Tab als Standard und rendert BaseManager', () => {
    render(<LibraryPage />);

    expect(screen.getAllByText('Mein System').length).toBeGreaterThan(0);
    expect(screen.getByTestId('base-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('module-card')).not.toBeInTheDocument();
  });
});
