'use client';

// ============================================
// TrainingPage.tsx - AI Training Center Hub
// 
// Zweck: Root-Orchestrator fuer Entry-Screen, Bereichsauswahl
//        und die neuen bereichsspezifischen Workspaces
// Verwendet von: /training Route
// ============================================

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTrainingStore } from '../store';
import {
  TRAINING_DEFAULT_WORKSPACE_TAB,
  TRAINING_SUBMODE_DEFAULT_TAB,
  TRAINING_SUBMODE_INFO,
  TRAINING_SUBMODES_BY_CATEGORY,
} from '../constants';
import type {
  AgentTrainingSubmode,
  AgentWorkspaceTab,
  DatasetStudioSubmode,
  DatasetWorkspaceTab,
  LLMTrainingSubmode,
  LLMWorkspaceTab,
  TrainingCategory,
  TrainingSubmode,
  TrainingWorkspaceTab,
} from '../types';
import { AgentTrainingWorkspace } from './agent/AgentTrainingWorkspace';
import { DatasetStudioWorkspace } from './dataset/DatasetStudioWorkspace';
import { LLMTrainingWorkspace } from './llm/LLMTrainingWorkspace';
import { TrainingEntryScreen } from './TrainingEntryScreen';
import { TrainingModeSelector } from './TrainingModeSelector';

// --------------------------------------------
// Query-Parameter Helfer
// Validieren und mappen URL-Werte auf den Hub-State
// --------------------------------------------

function isValidCategory(value: string | null): value is TrainingCategory {
  return value === 'llm' || value === 'agent' || value === 'dataset';
}

function isValidSubmode(
  category: TrainingCategory,
  value: string | null
): value is TrainingSubmode {
  if (!value) return false;
  return TRAINING_SUBMODES_BY_CATEGORY[category].includes(value as TrainingSubmode);
}

function isValidWorkspaceTab(
  category: TrainingCategory,
  value: string | null
): value is TrainingWorkspaceTab {
  if (!value) return false;

  const allowedTabs: Record<TrainingCategory, string[]> = {
    llm: ['overview', 'models', 'runs', 'eval', 'sandbox'],
    agent: ['overview', 'learning', 'policies', 'runs', 'replay', 'eval'],
    dataset: ['sources', 'transforms', 'quality', 'versions', 'exports'],
  };

  return allowedTabs[category].includes(value);
}

// --------------------------------------------
// Hauptkomponente
// Orchestriert Hub-State, URL-Sync und Datenladen
// --------------------------------------------

export function TrainingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    models,
    datasets,
    jobs,
    sessions,
    activeCategory,
    activeSubmode,
    activeWorkspaceTab,
    lastCategory,
    setActiveCategory,
    setActiveSubmode,
    setActiveWorkspaceTab,
    resetHubNavigation,
    setModels,
    setDatasets,
    setJobs,
    setSessions,
    modelsLoading,
    datasetsLoading,
    jobsLoading,
    sessionsLoading,
    setModelsLoading,
    setDatasetsLoading,
    setJobsLoading,
    setSessionsLoading,
    error,
    setError,
  } = useTrainingStore();

  // --------------------------------------------
  // Daten laden
  // --------------------------------------------

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch('/api/training/models');
      const data = await res.json();
      if (data.models) {
        setModels(data.models);
      }
    } catch (err) {
      setError('Fehler beim Laden der Modelle');
      console.error(err);
    } finally {
      setModelsLoading(false);
    }
  }, [setModels, setModelsLoading, setError]);

  const loadDatasets = useCallback(async () => {
    setDatasetsLoading(true);
    try {
      const res = await fetch('/api/training/datasets');
      const data = await res.json();
      if (data.datasets) {
        setDatasets(data.datasets);
      }
    } catch (err) {
      setError('Fehler beim Laden der Datasets');
      console.error(err);
    } finally {
      setDatasetsLoading(false);
    }
  }, [setDatasets, setDatasetsLoading, setError]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch('/api/training/jobs');
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (err) {
      setError('Fehler beim Laden der Jobs');
      console.error(err);
    } finally {
      setJobsLoading(false);
    }
  }, [setJobs, setJobsLoading, setError]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/training/sandbox');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      setError('Fehler beim Laden der Sessions');
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  }, [setSessions, setSessionsLoading, setError]);

  // --------------------------------------------
  // URL -> Store Synchronisierung
  // Query-Parameter stellen Entry, Selector und Workspace wieder her
  // --------------------------------------------

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const modeParam = searchParams.get('mode');
    const tabParam = searchParams.get('tab');

    if (!categoryParam) {
      resetHubNavigation();
      return;
    }

    if (!isValidCategory(categoryParam)) {
      resetHubNavigation();
      router.replace(pathname);
      return;
    }

    const nextCategory = categoryParam;
    setActiveCategory(nextCategory);

    if (!modeParam) {
      setActiveSubmode(null);
      setActiveWorkspaceTab(TRAINING_DEFAULT_WORKSPACE_TAB[nextCategory]);
      return;
    }

    if (!isValidSubmode(nextCategory, modeParam)) {
      setActiveSubmode(null);
      setActiveWorkspaceTab(TRAINING_DEFAULT_WORKSPACE_TAB[nextCategory]);
      router.replace(`${pathname}?category=${nextCategory}`);
      return;
    }

    const nextSubmode = modeParam;
    setActiveSubmode(nextSubmode);

    const nextTab = isValidWorkspaceTab(nextCategory, tabParam)
      ? tabParam
      : TRAINING_SUBMODE_DEFAULT_TAB[nextSubmode];

    setActiveWorkspaceTab(nextTab);
  }, [
    pathname,
    resetHubNavigation,
    router,
    searchParams,
    setActiveCategory,
    setActiveSubmode,
    setActiveWorkspaceTab,
  ]);

  // --------------------------------------------
  // Daten laden anhand des aktuellen Bereichs
  // So wird das Laden kontextuell und nicht mehr komplett global
  // --------------------------------------------

  useEffect(() => {
    if (activeCategory === 'llm') {
      void loadModels();
      void loadDatasets();
      void loadJobs();
      void loadSessions();
    }

    if (activeCategory === 'dataset') {
      void loadDatasets();
    }
  }, [activeCategory, loadDatasets, loadJobs, loadModels, loadSessions]);

  // --------------------------------------------
  // Navigation
  // Zentrale Hilfsfunktionen fuer Bereich, Submode und Tabs
  // --------------------------------------------

  const navigateToQueryState = useCallback(
    (
      category: TrainingCategory | null,
      submode: TrainingSubmode | null = null,
      tab: TrainingWorkspaceTab | null = null
    ) => {
      if (!category) {
        resetHubNavigation();
        router.replace(pathname);
        return;
      }

      setActiveCategory(category);

      const params = new URLSearchParams();
      params.set('category', category);

      if (submode) {
        setActiveSubmode(submode);
        params.set('mode', submode);
      } else {
        setActiveSubmode(null);
      }

      const nextTab =
        tab ||
        (submode
          ? TRAINING_SUBMODE_DEFAULT_TAB[submode]
          : TRAINING_DEFAULT_WORKSPACE_TAB[category]);

      setActiveWorkspaceTab(nextTab);
      params.set('tab', nextTab);

      router.replace(`${pathname}?${params.toString()}`);
    },
    [
      pathname,
      resetHubNavigation,
      router,
      setActiveCategory,
      setActiveSubmode,
      setActiveWorkspaceTab,
    ]
  );

  const handleSelectCategory = useCallback(
    (category: TrainingCategory) => {
      navigateToQueryState(category, null, TRAINING_DEFAULT_WORKSPACE_TAB[category]);
    },
    [navigateToQueryState]
  );

  const handleSelectSubmode = useCallback(
    (submode: TrainingSubmode) => {
      const info = TRAINING_SUBMODE_INFO[submode];
      navigateToQueryState(info.category, submode, TRAINING_SUBMODE_DEFAULT_TAB[submode]);
    },
    [navigateToQueryState]
  );

  const handleBackToHub = useCallback(() => {
    navigateToQueryState(null);
  }, [navigateToQueryState]);

  const handleBackToModes = useCallback(() => {
    if (!activeCategory) {
      navigateToQueryState(null);
      return;
    }

    navigateToQueryState(activeCategory, null, TRAINING_DEFAULT_WORKSPACE_TAB[activeCategory]);
  }, [activeCategory, navigateToQueryState]);

  const handleChangeWorkspaceTab = useCallback(
    (tab: TrainingWorkspaceTab) => {
      if (!activeCategory) return;
      navigateToQueryState(activeCategory, activeSubmode, tab);
    },
    [activeCategory, activeSubmode, navigateToQueryState]
  );

  const currentLLMTab = useMemo<LLMWorkspaceTab>(() => {
    if (activeCategory !== 'llm') return 'overview';
    return (
      (activeWorkspaceTab as LLMWorkspaceTab) ||
      (TRAINING_DEFAULT_WORKSPACE_TAB.llm as LLMWorkspaceTab)
    );
  }, [activeCategory, activeWorkspaceTab]);

  const currentAgentTab = useMemo<AgentWorkspaceTab>(() => {
    if (activeCategory !== 'agent') return 'overview';
    return (activeWorkspaceTab as AgentWorkspaceTab) || 'overview';
  }, [activeCategory, activeWorkspaceTab]);

  const currentDatasetTab = useMemo<DatasetWorkspaceTab>(() => {
    if (activeCategory !== 'dataset') return 'sources';
    return (activeWorkspaceTab as DatasetWorkspaceTab) || 'sources';
  }, [activeCategory, activeWorkspaceTab]);

  // --------------------------------------------
  // Render
  // Rendert je nach Navigationsebene Entry, Selector oder Workspace
  // --------------------------------------------

  if (!activeCategory) {
    return (
      <TrainingEntryScreen
        lastCategory={lastCategory}
        onSelectCategory={handleSelectCategory}
      />
    );
  }

  if (!activeSubmode) {
    return (
      <TrainingModeSelector
        category={activeCategory}
        onBack={handleBackToHub}
        onSelectSubmode={handleSelectSubmode}
      />
    );
  }

  if (activeCategory === 'llm') {
    return (
      <LLMTrainingWorkspace
        submode={activeSubmode as LLMTrainingSubmode}
        activeTab={currentLLMTab}
        models={models}
        datasets={datasets}
        jobs={jobs}
        sessions={sessions}
        modelsLoading={modelsLoading}
        datasetsLoading={datasetsLoading}
        jobsLoading={jobsLoading}
        sessionsLoading={sessionsLoading}
        error={error}
        onChangeTab={handleChangeWorkspaceTab as (tab: LLMWorkspaceTab) => void}
        onBackToModes={handleBackToModes}
        onBackToHub={handleBackToHub}
        onRefreshModels={loadModels}
        onRefreshDatasets={loadDatasets}
        onRefreshJobs={loadJobs}
        onRefreshSessions={loadSessions}
        onClearError={() => setError(null)}
      />
    );
  }

  if (activeCategory === 'dataset') {
    return (
      <DatasetStudioWorkspace
        submode={activeSubmode as DatasetStudioSubmode}
        activeTab={currentDatasetTab}
        datasets={datasets}
        datasetsLoading={datasetsLoading}
        onChangeTab={handleChangeWorkspaceTab as (tab: DatasetWorkspaceTab) => void}
        onBackToModes={handleBackToModes}
        onBackToHub={handleBackToHub}
        onRefreshDatasets={loadDatasets}
      />
    );
  }

  return (
    <AgentTrainingWorkspace
      submode={activeSubmode as AgentTrainingSubmode}
      activeTab={currentAgentTab}
      onChangeTab={handleChangeWorkspaceTab as (tab: AgentWorkspaceTab) => void}
      onBackToModes={handleBackToModes}
      onBackToHub={handleBackToHub}
    />
  );
}

