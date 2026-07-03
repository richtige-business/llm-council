// ============================================
// AgentsSpatialOverlayHost.tsx - Overlay-Flaechen ueber dem Raum
//
// Zweck: Positioniert route-spezifische Inhalte als Panels
//        ueber der persistente 3D-Szene des Agents-Moduls.
//        Chat deckt den 3D-Raum komplett ab. Settings/Tasks
//        beginnen unterhalb des isolierten Orbs (oberes Drittel frei).
// Verwendet von: AgentsModuleShell
// ============================================

'use client';

import type { ReactNode } from 'react';
import { useBackgroundImage, useBackgroundType, useSolidBackground } from '@/lib/store/app-store';
import { useThemeStyles } from '@/lib/theme';
import type { AgentsSpatialMode } from '../../spatial-types';

interface AgentsSpatialOverlayHostProps {
  mode: AgentsSpatialMode;
  children?: ReactNode;
}

function resolvePanelClasses(mode: AgentsSpatialMode): string {
  if (mode === 'tasks') {
    return 'mx-auto h-full w-full max-w-[980px]';
  }

  return 'mx-auto h-full w-full max-w-[980px]';
}

export function AgentsSpatialOverlayHost({
  mode,
  children,
}: AgentsSpatialOverlayHostProps) {
  const backgroundImage = useBackgroundImage();
  const backgroundType = useBackgroundType();
  const solidBackground = useSolidBackground();
  const { container } = useThemeStyles();

  // Gleiche Glass-Optik wie AgentHierarchySidebar: reines container.base
  // (kein enforceMinRgbaAlpha — der wuerde z. B. 0.12 → 0.42 aufhellen).
  const tasksSettingsPanelStyle = container.base;

  if (!children || mode === 'idle' || mode === 'groups' || mode === 'group' || mode === 'council') {
    return null;
  }

  // Chat: volle Flaeche mit System-Hintergrund (verdeckt 3D-Raum komplett)
  if (mode === 'chat') {
    return (
      <div
        className="pointer-events-auto absolute inset-0 z-40 flex flex-col bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundType === 'image' ? `url(${backgroundImage})` : 'none',
          backgroundColor: backgroundType === 'solid' ? solidBackground : '#020617',
        }}
      >
        {children}
      </div>
    );
  }

  // Settings / Tasks: Panel beginnt unterhalb des isolierten Orbs + Label
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[28%] z-40 px-4 pb-4 md:px-5 md:pb-5">
      <div className={resolvePanelClasses(mode)}>
        <div
          className={`pointer-events-auto flex h-full min-h-0 flex-col ${
            mode === 'settings' ? 'overflow-visible' : 'overflow-hidden'
          }`}
          style={tasksSettingsPanelStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
