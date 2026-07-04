import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Module } from '@/types';
import { Sidebar } from '@/components/shell/Sidebar';
import { useAppStore } from '@/lib/store/app-store';
import { useModuleRegistry } from '@/lib/modules/registry';
import { useBaseStore } from '@/lib/bases/store';

let pathnameMock = '/calendar';

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

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/lib/theme', () => ({
  useThemeStyles: () => ({
    container: { base: {} },
    navItem: { base: {}, active: {} },
    button: { base: {} },
    accentColor: '#8b5cf6',
    designStyle: 'glass',
    textColor: '#ffffff',
  }),
}));

function createMockModule(id: string, name: string, order: number): Module {
  return {
    id,
    name,
    description: `${name} module`,
    version: '1.0.0',
    icon: 'Blocks',
    category: 'productivity',
    tools: [],
    widgets: [],
    isActive: true,
    order,
  };
}

describe('Sidebar Base-Gruppierung', () => {
  beforeEach(() => {
    cleanup();
    pathnameMock = '/calendar';

    useAppStore.setState({
      sidebarOpen: true,
      sidebarModules: ['calendar', 'inbox', 'browser'],
      userProfile: {
        name: 'User',
        avatar: null,
        bio: '',
        status: 'online',
      },
    });

    useModuleRegistry.setState({
      modules: [
        createMockModule('calendar', 'Kalender', 1),
        createMockModule('inbox', 'Inbox', 2),
        createMockModule('browser', 'Browser', 3),
      ],
      deletedModuleIds: [],
      isLoading: false,
      error: null,
    });

    useBaseStore.setState({
      bases: [
        {
          id: 'base-erp',
          name: 'ERP',
          description: '',
          icon: 'Folder',
          color: '#8b5cf6',
          moduleIds: ['calendar', 'inbox'],
          dashboard: { widgets: [], layout: 'grid', columns: 3, quickModuleIds: [], activeWidgetIds: [], orbColor: '#0ea5e9' },
          automationIds: [],
          backgroundImage: '',
          accessMembers: [],
          connections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  });

  it('zeigt Bases gruppiert, Header nur mit Namen und Einzelmodule separat', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'ERP' })).toBeInTheDocument();
    expect(screen.queryByText(/ERP\s*\(\d+\)/)).not.toBeInTheDocument();

    expect(screen.queryByText('Kalender')).not.toBeInTheDocument();
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument();

    expect(screen.queryByText('Einzelmodule')).not.toBeInTheDocument();
    expect(screen.queryByText('Browser')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Base ERP aufklappen' }));

    expect(screen.getByText('Kalender')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.queryByText('Browser')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Base ERP aufklappen' }));

    expect(screen.queryByText('Kalender')).not.toBeInTheDocument();
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Browser')).not.toBeInTheDocument();
  });

  it('bereinigt Base-Zuordnungen nicht, solange keine Module geladen sind', () => {
    useModuleRegistry.setState({
      modules: [],
      deletedModuleIds: [],
      isLoading: false,
      error: null,
    });

    render(<Sidebar />);

    expect(useBaseStore.getState().bases[0]?.moduleIds).toEqual(['calendar', 'inbox']);
  });

  it('zeigt Base-Module auch dann, wenn sie nicht in sidebarModules enthalten sind', () => {
    useAppStore.setState({
      sidebarOpen: true,
      sidebarModules: ['calendar'],
      userProfile: {
        name: 'User',
        avatar: null,
        bio: '',
        status: 'online',
      },
    });

    useModuleRegistry.setState({
      modules: [
        createMockModule('calendar', 'Kalender', 1),
        createMockModule('training', 'Training', 2),
      ],
      deletedModuleIds: [],
      isLoading: false,
      error: null,
    });

    useBaseStore.setState({
      bases: [
        {
          id: 'base-business',
          name: 'Business',
          description: '',
          icon: 'Folder',
          color: '#8b5cf6',
          moduleIds: ['training'],
          dashboard: { widgets: [], layout: 'grid', columns: 3, quickModuleIds: [], activeWidgetIds: [], orbColor: '#0ea5e9' },
          automationIds: [],
          backgroundImage: '',
          accessMembers: [],
          connections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Base Business aufklappen' }));
    expect(screen.getByText('Training')).toBeInTheDocument();
  });
});
