'use client';

// ============================================
// TrainingWorkspaceShell.tsx - Gemeinsame Huelle fuer Workspaces
//
// Zweck: Stellt Header, Breadcrumb, Navigation und Workspace-Tabs
//        fuer LLM Training, Agent Training und Dataset Studio bereit
// Verwendet von: Alle Training-Workspaces
// ============================================

import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { TRAINING_CATEGORY_INFO, TRAINING_SUBMODE_INFO } from '../constants';
import type { TrainingCategory, TrainingSubmode, TrainingWorkspaceTab } from '../types';
import { TrainingIcon } from './TrainingIcon';

// --------------------------------------------
// Props
// --------------------------------------------

interface WorkspaceTabOption {
  id: TrainingWorkspaceTab;
  name: string;
  icon: string;
}

interface TrainingWorkspaceShellProps {
  category: TrainingCategory;
  submode: TrainingSubmode | null;
  title: string;
  description: string;
  tabs: WorkspaceTabOption[];
  activeTab: TrainingWorkspaceTab | null;
  onTabChange: (tab: TrainingWorkspaceTab) => void;
  onBackToModes: () => void;
  onBackToHub: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

// --------------------------------------------
// Gemeinsame Workspace-Huelle
// Macht die einzelnen Bereiche visuell konsistent
// --------------------------------------------

export function TrainingWorkspaceShell({
  category,
  submode,
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  onBackToModes,
  onBackToHub,
  children,
  actions,
}: TrainingWorkspaceShellProps) {
  const { surface, container, designStyle, textColor } = useThemeStyles();
  const categoryInfo = TRAINING_CATEGORY_INFO[category];
  const submodeInfo = submode ? TRAINING_SUBMODE_INFO[submode] : null;

  return (
    <div className="flex h-full flex-col overflow-hidden p-4 md:p-6">
      {/* --------------------------------------------
          Header
          Fasst Breadcrumb, Titel und Actions zusammen
         -------------------------------------------- */}
      <div
        className="mb-4 overflow-hidden p-4 md:p-5"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium" style={{ color: textColor }}>
              <button
                type="button"
                onClick={onBackToHub}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 opacity-70 transition-opacity hover:opacity-100"
                style={{ background: 'rgba(255, 255, 255, 0.08)' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Übersicht
              </button>
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              <button
                type="button"
                onClick={onBackToModes}
                className="rounded-full px-3 py-1 opacity-70 transition-opacity hover:opacity-100"
                style={{ background: 'rgba(255, 255, 255, 0.08)' }}
              >
                {categoryInfo.name}
              </button>
              {submodeInfo ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  <span className="rounded-full px-3 py-1" style={{ background: `${submodeInfo.color}18`, color: submodeInfo.color }}>
                    {submodeInfo.name}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${categoryInfo.color} 0%, ${categoryInfo.color}bb 100%)`,
                  borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                  boxShadow: `0 12px 24px ${categoryInfo.color}33`,
                }}
              >
                <TrainingIcon iconName={categoryInfo.icon} className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold" style={{ color: textColor }}>
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm opacity-70" style={{ color: textColor }}>
                  {description}
                </p>
              </div>
            </div>
          </div>

          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </div>

      {/* --------------------------------------------
          Tab-Navigation
          Steuert die Teilansichten im jeweiligen Workspace
         -------------------------------------------- */}
      <div
        className="mb-4 flex flex-wrap gap-2 p-2"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all"
              style={{
                background: isActive ? `${categoryInfo.color}18` : 'transparent',
                color: isActive ? categoryInfo.color : textColor,
                opacity: isActive ? 1 : 0.72,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
              }}
            >
              <TrainingIcon iconName={tab.icon} className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------
          Inhalt
          Der eigentliche Workspace wird als Slot gerendert
         -------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
