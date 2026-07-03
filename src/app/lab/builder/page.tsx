// ============================================
// LifeOS Module Builder - Neues Modul (Startseite)
//
// Zweck:
// - Direkter Einstieg ins Bauen (Chat)
// - Projekte statt Vorschlagskarten anzeigen
// - Vorschlaege als animierter Placeholder in der Chatbar
// ============================================

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  Folder,
  ChevronRight,
  FileCode,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useThemeStyles } from '@/lib/theme';
import { useProjectsStore, type BuilderProject } from './stores/projects-store';
import { useBaseStore } from '@/lib/bases/store';

// Components
import { ChatInput } from './components/chat';
import { GitHubButton } from './components';

interface PromptSuggestion {
  id: string;
  text: string;
  category: string;
}

const PLACEHOLDER_FALLBACKS = [
  'Erstelle ein Habit-Tracker Modul mit Streaks und Wochenzielen',
  'Baue einen Ausgaben-Tracker mit Kategorien und Monatsbudget',
  'Erstelle ein Kontakte-CRM mit Follow-up Erinnerungen',
  'Baue ein Meeting-Prep Modul mit Agenda und Action Items',
  'Erstelle ein Dashboard mit Tageszielen, Terminen und Fokusfenstern',
  'Baue ein Notiz-Modul mit Markdown, Tags und Suche',
];

const STATUS_CONFIG: Record<BuilderProject['status'], { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: '#f59e0b' },
  building: { label: 'In Arbeit', color: '#3b82f6' },
  completed: { label: 'Fertig', color: '#22c55e' },
  published: { label: 'Veröffentlicht', color: '#8b5cf6' },
};

function formatProjectDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function BuilderNewModulePage() {
  const router = useRouter();
  const themeStyles = useThemeStyles();
  const { surface, container, accentColor, designStyle, surfaceColor, textColor } = themeStyles;

  // Store
  const { projects, createProject } = useProjectsStore();
  const bases = useBaseStore((state) => state.bases);
  const createBase = useBaseStore((state) => state.createBase);
  const updateBase = useBaseStore((state) => state.updateBase);

  // State
  const [promptInput, setPromptInput] = useState('');
  const [chatMode, setChatMode] = useState<'build' | 'discuss' | 'pro'>('build');
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('Erstelle ein Modul für...');
  const [buildForBase, setBuildForBase] = useState<'yes' | 'no'>('no');
  const [baseFlowMode, setBaseFlowMode] = useState<'existing' | 'new'>('existing');
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [existingBaseDescription, setExistingBaseDescription] = useState('');
  const [newBaseName, setNewBaseName] = useState('');
  const [newBaseDescription, setNewBaseDescription] = useState('');
  const [baseValidationError, setBaseValidationError] = useState<string | null>(null);

  const selectedBase = useMemo(
    () => bases.find((base) => base.id === selectedBaseId),
    [bases, selectedBaseId]
  );

  useEffect(() => {
    if (buildForBase !== 'yes') return;
    if (baseFlowMode !== 'existing') return;
    if (selectedBase) {
      setExistingBaseDescription(selectedBase.description || '');
    }
  }, [buildForBase, baseFlowMode, selectedBase]);

  useEffect(() => {
    if (bases.length === 0 && baseFlowMode === 'existing') {
      setBaseFlowMode('new');
    }
  }, [bases.length, baseFlowMode]);

  // Prompt absenden - erstellt neues Projekt und navigiert DIREKT
  const handlePromptSubmit = useCallback(() => {
    if (!promptInput.trim()) return;

    const prompt = promptInput.trim();
    let finalPrompt = prompt;
    let baseBinding:
      | {
          enabled: boolean;
          baseId: string;
          baseName: string;
          baseDescription: string;
          source: 'existing' | 'new';
        }
      | undefined;

    if (buildForBase === 'yes') {
      if (baseFlowMode === 'existing') {
        if (!selectedBase) {
          setBaseValidationError('Bitte waehle eine bestehende Base aus.');
          return;
        }
        const description = existingBaseDescription.trim();
        if (!description) {
          setBaseValidationError('Die Base-Beschreibung darf nicht leer sein.');
          return;
        }
        if (description !== selectedBase.description.trim()) {
          updateBase(selectedBase.id, { description });
        }

        baseBinding = {
          enabled: true,
          baseId: selectedBase.id,
          baseName: selectedBase.name,
          baseDescription: description,
          source: 'existing',
        };
        finalPrompt = `${prompt} (fuer die ${selectedBase.name} Base)`;
      } else {
        const name = newBaseName.trim();
        const description = newBaseDescription.trim();
        if (!name) {
          setBaseValidationError('Bitte gib einen Namen fuer die neue Base ein.');
          return;
        }
        if (!description) {
          setBaseValidationError('Bitte gib eine Beschreibung fuer die neue Base ein.');
          return;
        }
        const baseId = createBase({
          name,
          description,
        });
        baseBinding = {
          enabled: true,
          baseId,
          baseName: name,
          baseDescription: description,
          source: 'new',
        };
        finalPrompt = `${prompt} (fuer die ${name} Base)`;
        setNewBaseName('');
        setNewBaseDescription('');
      }
    }

    setBaseValidationError(null);
    let projectName = 'Neues Modul';

    const nameMatch = prompt.match(
      /(?:Erstelle|Baue|Mache|Füge).*?(?:ein(?:en)?|für)\s+([A-Za-zÄÖÜäöü\-]+(?:\s+[A-Za-zÄÖÜäöü\-]+)?)/i
    );
    if (nameMatch) {
      projectName = nameMatch[1]
        .replace(/(?:modul|module|tracker|app)/gi, '')
        .trim()
        .replace(/^\w/, (char) => char.toUpperCase());
      if (projectName.length > 2) {
        projectName = `${projectName} Modul`;
      } else {
        projectName = 'Neues Modul';
      }
    }

    const id = createProject(projectName, finalPrompt, { baseBinding });
    setPromptInput('');
    router.push(`/lab/builder/${id}?prompt=${encodeURIComponent(finalPrompt)}&mode=${chatMode}`);
  }, [
    baseFlowMode,
    buildForBase,
    chatMode,
    createBase,
    createProject,
    existingBaseDescription,
    newBaseDescription,
    newBaseName,
    promptInput,
    router,
    selectedBase,
    updateBase,
  ]);

  // Vorschlaege aus der DB laden (randomisiert durch API)
  useEffect(() => {
    let isMounted = true;

    const loadPromptSuggestions = async () => {
      try {
        const response = await fetch('/api/lab/prompt-suggestions?limit=30', {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: { suggestions?: PromptSuggestion[] } = await response.json();
        const loadedSuggestions = Array.isArray(data.suggestions)
          ? data.suggestions
              .map((item) => item.text?.trim())
              .filter((text): text is string => Boolean(text))
          : [];

        if (isMounted && loadedSuggestions.length > 0) {
          setPromptSuggestions(loadedSuggestions);
        }
      } catch (error) {
        console.error('Builder-Vorschläge konnten nicht geladen werden:', error);
      }
    };

    loadPromptSuggestions();

    return () => {
      isMounted = false;
    };
  }, []);

  const rotatingSuggestions = useMemo(
    () => (promptSuggestions.length > 0 ? promptSuggestions : PLACEHOLDER_FALLBACKS),
    [promptSuggestions]
  );

  // Token-fuer-Token Typing + Deleting Animation fuer Placeholder
  useEffect(() => {
    if (rotatingSuggestions.length === 0) {
      setAnimatedPlaceholder('Erstelle ein Modul für...');
      return;
    }

    let suggestionIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;

      const currentSuggestion = rotatingSuggestions[suggestionIndex] ?? '';

      if (!isDeleting) {
        charIndex = Math.min(charIndex + 1, currentSuggestion.length);
        setAnimatedPlaceholder(currentSuggestion.slice(0, charIndex));

        if (charIndex >= currentSuggestion.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, 1300);
          return;
        }

        timeoutId = setTimeout(tick, 40);
        return;
      }

      charIndex = Math.max(charIndex - 1, 0);
      setAnimatedPlaceholder(currentSuggestion.slice(0, charIndex));

      if (charIndex === 0) {
        isDeleting = false;
        suggestionIndex = (suggestionIndex + 1) % rotatingSuggestions.length;
        timeoutId = setTimeout(tick, 260);
        return;
      }

      timeoutId = setTimeout(tick, 18);
    };

    setAnimatedPlaceholder('');
    timeoutId = setTimeout(tick, 450);

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [rotatingSuggestions]);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [projects]
  );

  const latestProjects = useMemo(() => sortedProjects.slice(0, 6), [sortedProjects]);

  // Projekte zählen
  const projectsCount = projects.length;
  const publishedCount = projects.filter((project) => project.status === 'published').length;

  return (
    <div 
      className="fixed inset-0 z-20 flex flex-col overflow-hidden"
      data-agent-panel="lab-root"
      style={{
        background: surfaceColor,
        backdropFilter: designStyle === 'glass' ? 'blur(20px)' : 'none',
      }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 h-14"
        style={{
          ...container.base,
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
      >
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/lab"
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{
                color: textColor,
                opacity: 0.6,
              }}
              title="Zurück zum Lab"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : `0 4px 12px ${accentColor}40`,
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold" style={{ color: textColor }}>
                  Neues Modul
                </h1>
                <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                  Beschreibe deine Idee
                </p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <GitHubButton />
            <Link
              href="/lab/builder/projects"
              data-agent-button="builder-open-projects"
              className="flex items-center gap-2 px-3 py-1.5 transition-all text-xs hover:scale-105"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                color: textColor,
              }}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>
                {projectsCount} Projekte • {publishedCount} Veröffentlicht
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content: Zentrierter Chat */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Hero Icon + Text */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 mb-4 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
            borderRadius: designStyle === 'brutal' ? '1rem' : '1.25rem',
            boxShadow: designStyle === 'brutal' ? '4px 4px 0 #000' : `0 8px 30px ${accentColor}40`,
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
          }}
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: textColor }}
        >
          Neues Modul erstellen
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm mb-6 text-center"
          style={{ color: textColor, opacity: 0.6 }}
        >
          Beschreibe dein Modul und ich generiere den Code für dich.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="w-full max-w-xl mb-3 rounded-xl p-4"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
          }}
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: textColor, opacity: 0.75 }}>
            Base-Kontext
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm" style={{ color: textColor, opacity: 0.85 }}>
              Baust du das Modul fuer eine Base?
            </span>
            <button
              type="button"
              onClick={() => setBuildForBase('yes')}
              className="px-2.5 py-1 text-xs rounded-full"
              style={{
                background: buildForBase === 'yes' ? accentColor : 'rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              Ja
            </button>
            <button
              type="button"
              onClick={() => {
                setBuildForBase('no');
                setBaseValidationError(null);
              }}
              className="px-2.5 py-1 text-xs rounded-full"
              style={{
                background: buildForBase === 'no' ? accentColor : 'rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              Nein
            </button>
          </div>

          {buildForBase === 'yes' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBaseFlowMode('existing')}
                  className="px-2.5 py-1 text-xs rounded-full"
                  style={{
                    background: baseFlowMode === 'existing' ? accentColor : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    opacity: bases.length > 0 ? 1 : 0.45,
                  }}
                  disabled={bases.length === 0}
                >
                  Bestehende Base
                </button>
                <button
                  type="button"
                  onClick={() => setBaseFlowMode('new')}
                  className="px-2.5 py-1 text-xs rounded-full"
                  style={{
                    background: baseFlowMode === 'new' ? accentColor : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}
                >
                  Neue Base erstellen
                </button>
              </div>

              {baseFlowMode === 'existing' ? (
                <div className="space-y-2">
                  <select
                    value={selectedBaseId}
                    onChange={(event) => {
                      setSelectedBaseId(event.target.value);
                      setBaseValidationError(null);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: textColor,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <option value="">Base auswaehlen...</option>
                    {bases.map((base) => (
                      <option key={base.id} value={base.id}>
                        {base.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={existingBaseDescription}
                    onChange={(event) => {
                      setExistingBaseDescription(event.target.value);
                      setBaseValidationError(null);
                    }}
                    rows={3}
                    placeholder="Base-Beschreibung (Pflicht)"
                    className="w-full rounded-lg px-3 py-2 text-sm resize-y"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: textColor,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    value={newBaseName}
                    onChange={(event) => {
                      setNewBaseName(event.target.value);
                      setBaseValidationError(null);
                    }}
                    placeholder="Name der neuen Base"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: textColor,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                  <textarea
                    value={newBaseDescription}
                    onChange={(event) => {
                      setNewBaseDescription(event.target.value);
                      setBaseValidationError(null);
                    }}
                    rows={3}
                    placeholder="Beschreibung der neuen Base (Pflicht)"
                    className="w-full rounded-lg px-3 py-2 text-sm resize-y"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: textColor,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {baseValidationError && (
            <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>
              {baseValidationError}
            </p>
          )}
        </motion.div>

        {/* Chat Input mit Build/Discuss/Pro Mode */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xl mb-4"
        >
          <ChatInput
            value={promptInput}
            onChange={setPromptInput}
            onSubmit={handlePromptSubmit}
            placeholder={animatedPlaceholder || 'Erstelle ein Modul für...'}
            themeStyles={{ surface, container, accentColor, designStyle, textColor }}
            chatMode={chatMode}
            onChatModeChange={setChatMode}
          />
        </motion.div>

        {/* Projekte statt Vorschlagskarten */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-4xl"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h2
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: textColor, opacity: 0.9 }}
            >
              <Clock className="w-4 h-4" />
              Zuletzt bearbeitete Projekte
            </h2>
            <Link
              href="/lab/builder/projects"
              data-agent-button="builder-open-projects"
              className="text-xs flex items-center gap-1 transition-opacity hover:opacity-100"
              style={{ color: textColor, opacity: 0.65 }}
            >
              Alle anzeigen
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {latestProjects.length === 0 ? (
            <div
              className="px-4 py-6 text-center"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                color: textColor,
                opacity: 0.7,
              }}
            >
              Noch keine Projekte vorhanden. Starte oben mit einem Prompt.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {latestProjects.map((project, index) => {
                const status = STATUS_CONFIG[project.status];
                const filesCount = Object.keys(project.files || {}).length;

                return (
                  <motion.button
                    key={project.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 + index * 0.04 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => router.push(`/lab/builder/${project.id}`)}
                    className="text-left px-4 py-3 transition-all"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.75rem' : '0.9rem',
                      color: textColor,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="font-medium truncate">{project.name || 'Unbenanntes Projekt'}</div>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: `${status.color}22`,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div
                      className="text-xs truncate mb-2"
                      style={{ color: textColor, opacity: 0.58 }}
                    >
                      {project.description || 'Keine Beschreibung'}
                    </div>

                    <div
                      className="flex items-center justify-between text-[11px]"
                      style={{ color: textColor, opacity: 0.45 }}
                    >
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5" />
                        {filesCount} Dateien
                      </span>
                      <span>{formatProjectDate(project.updatedAt)}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
