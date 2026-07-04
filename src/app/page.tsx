'use client';

import { useEffect } from 'react';
import { AgentsModuleShell } from '@/modules/agents/components/AgentsModuleShell';
import { useAppStore } from '@/lib/store/app-store';
import { useAgentsStore } from '@/modules/agents/store';
import { useAgentsSpatialStore } from '@/modules/agents/spatial-store';

const STANDALONE_BACKGROUND = '/system-wallpapers/council-dusk.svg';
const STANDALONE_ACCENT = '#4f8cff';
const STANDALONE_SURFACE = '#10233f';
const STANDALONE_TEXT = '#f5f9ff';

export default function HomePage() {
  const setTheme = useAppStore((state) => state.setTheme);
  const setDesignStyle = useAppStore((state) => state.setDesignStyle);
  const setAccentColor = useAppStore((state) => state.setAccentColor);
  const setSurfaceColor = useAppStore((state) => state.setSurfaceColor);
  const setTextColor = useAppStore((state) => state.setTextColor);
  const setBackgroundImage = useAppStore((state) => state.setBackgroundImage);
  const setBackgroundType = useAppStore((state) => state.setBackgroundType);
  const setSolidBackground = useAppStore((state) => state.setSolidBackground);

  const setHubView = useAgentsSpatialStore((state) => state.setHubView);
  const ensureCouncilDraft = useAgentsStore((state) => state.ensureCouncilDraft);
  const councils = useAgentsStore((state) => state.councils);
  const activeCouncilDraftId = useAgentsStore((state) => state.activeCouncilDraftId);
  const openCouncil = useAgentsStore((state) => state.openCouncil);
  const activeCouncilDraftName = useAgentsStore((state) => state.activeCouncilDraftName);
  const setActiveCouncilDraftName = useAgentsStore((state) => state.setActiveCouncilDraftName);

  useEffect(() => {
    setTheme('dark');
    setDesignStyle('neo');
    setAccentColor(STANDALONE_ACCENT);
    setSurfaceColor(STANDALONE_SURFACE);
    setTextColor(STANDALONE_TEXT);
    setBackgroundType('solid');
    setBackgroundImage(STANDALONE_BACKGROUND);
    setSolidBackground('#081120');
    setHubView('councils');
  }, [
    setAccentColor,
    setBackgroundImage,
    setBackgroundType,
    setDesignStyle,
    setHubView,
    setSolidBackground,
    setSurfaceColor,
    setTextColor,
    setTheme,
  ]);

  useEffect(() => {
    if (activeCouncilDraftId) {
      return;
    }

    if (councils.length > 0) {
      openCouncil(councils[0].id);
      return;
    }

    const nextDraftId = ensureCouncilDraft();

    const normalizedName = activeCouncilDraftName.trim() || 'LLM Council';
    if (activeCouncilDraftName !== normalizedName) {
      setActiveCouncilDraftName(normalizedName);
    }

    window.requestAnimationFrame(() => {
      const state = useAgentsStore.getState();
      if (state.activeCouncilDraftId !== nextDraftId) {
        return;
      }

      state.setActiveCouncilDraftName(normalizedName);
      state.syncActiveCouncilDraft();
    });
  }, [
    activeCouncilDraftId,
    activeCouncilDraftName,
    councils,
    ensureCouncilDraft,
    openCouncil,
    setActiveCouncilDraftName,
  ]);

  return <AgentsModuleShell modeOverride="council" />;
}
