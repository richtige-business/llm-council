'use client';

import { ORCHESTRATION_MODES } from '../constants';
import type { OrchestrationMode } from '../types';

interface OrchestrationModeIndicatorProps {
  activeMode?: OrchestrationMode;
  forcedMode?: OrchestrationMode;
  reasoning?: string;
  accentColor?: string;
}

export function OrchestrationModeIndicator({
  activeMode,
  forcedMode,
  reasoning,
  accentColor = '#8B5CF6',
}: OrchestrationModeIndicatorProps) {
  if (!activeMode && !forcedMode) {
    return null;
  }

  const effectiveMode = activeMode || forcedMode;
  const effectiveConfig = effectiveMode ? ORCHESTRATION_MODES[effectiveMode] : null;
  const helperText = reasoning?.trim() || effectiveConfig?.description || '';
  const statusLabel = activeMode ? 'Aktiv' : 'Vorgemerkt';

  return (
    <div className="mt-1 flex min-w-0 flex-col gap-1">
      {effectiveConfig && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: `${accentColor}20`,
              color: accentColor,
            }}
            title={effectiveConfig.description}
          >
            {statusLabel}: {effectiveConfig.label}
          </span>
        </div>
      )}
      {helperText && (
        <p className="truncate text-[10px] text-white/45" title={helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
}
