'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Rnd } from 'react-rnd';
import { useTranslations } from 'next-intl';
import * as LucideIcons from 'lucide-react';
import { LayoutGrid, Plus, Type, X, ChevronDown } from 'lucide-react';
import { getModuleGradient } from '@/lib/modules/colors';
import { useThemeStyles } from '@/lib/theme';
import { useBaseStore, DEFAULT_NAVBAR_MODULE_IDS } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';
import {
  useAppStore,
  DEFAULT_GREETING_SETTINGS,
  DEFAULT_NAVBAR_SETTINGS,
  GREETING_FONTS,
  TEXT_COLORS,
  defaultBackgrounds,
} from '@/lib/store/app-store';
import { TabWindow } from '@/components/dashboard/TabWindow';
import { DashboardFolderLayer } from '@/components/dashboard/DashboardFolderLayer';
import { ModuleSettingsButton } from '@/components/agent';
import { useExternalStreamStore } from '@/lib/external-apps';
import type { Module } from '@/types';

type BaseWidgetDefinition = {
  id: string;
  moduleId: string;
  name: string;
};

// Modul-Farben via getModuleGradient() (src/lib/modules/colors.ts)

// Dynamischer Icon-Resolver: Lucide-Name → Komponente, mit Fallback
function getIconComponent(iconName: string, moduleId?: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  if (iconName.startsWith('http')) {
    // HTTP-URLs werden separat als <img> gerendert
    return moduleId?.startsWith('native-')
      ? (LucideIcons.Monitor as unknown as React.ComponentType<{ className?: string; style?: React.CSSProperties }>)
      : (LucideIcons.Blocks as unknown as React.ComponentType<{ className?: string; style?: React.CSSProperties }>);
  }
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  if (icons[iconName]) return icons[iconName];
  const pascal = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  if (icons[pascal]) return icons[pascal];
  return LucideIcons.Blocks as unknown as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export default function BaseDashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const baseId = params.baseId as string;

  const { accentColor, textColor, designStyle, container, surfaceColor } = useThemeStyles();
  const base = useBaseStore((state) => state.bases.find((entry) => entry.id === baseId));
  const updateBase = useBaseStore((state) => state.updateBase);
  const assignModuleToBase = useBaseStore((state) => state.assignModuleToBase);
  const removeModuleFromBase = useBaseStore((state) => state.removeModuleFromBase);
  const modules = useModuleRegistry((state) => state.modules);
  const prewarmSessions = useExternalStreamStore((state) => state.prewarmSessions);

  const greetingSettings = useAppStore((state) => state.greetingSettings);
  const navbarSettings = useAppStore((state) => state.navbarSettings);
  const openTab = useAppStore((state) => state.openTab);
  const openTabs = useAppStore((state) => state.openTabs);
  const updateGreetingSettings = useAppStore((state) => state.updateGreetingSettings);
  const updateNavbarSettings = useAppStore((state) => state.updateNavbarSettings);

  const [editMode, setEditMode] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [showModulePicker, setShowModulePicker] = useState(false);
  const [readyBackgroundUrl, setReadyBackgroundUrl] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const backgroundImage = base?.backgroundImage || defaultBackgrounds[1]?.url || defaultBackgrounds[0]?.url || '';

  const moduleMap = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);
  const baseModules = useMemo(() => {
    if (!base) return [];
    return base.moduleIds
      .map((moduleId) => moduleMap.get(moduleId))
      .filter((module): module is Module => Boolean(module));
  }, [base, moduleMap]);

  useEffect(() => {
    const entries = baseModules
      .filter((module) => Boolean(module.externalApp))
      .map((module) => ({
        moduleId: module.id,
        targetUrl: module.externalApp?.userUrl || module.externalApp?.url || module.route || '',
      }))
      .filter((entry) => Boolean(entry.targetUrl));

    if (entries.length === 0) return;
    void prewarmSessions(entries);
  }, [baseModules, prewarmSessions]);

  useEffect(() => {
    if (!backgroundImage) {
      return;
    }

    let active = true;

    const img = new Image();
    img.onload = () => {
      if (active) {
        setReadyBackgroundUrl(backgroundImage);
      }
    };
    img.onerror = () => {
      if (active) {
        setReadyBackgroundUrl(backgroundImage);
      }
    };
    img.src = backgroundImage;

    if (img.complete) {
      Promise.resolve().then(() => {
        if (active) {
          setReadyBackgroundUrl(backgroundImage);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [backgroundImage]);

  if (!base) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: textColor }}>
            {t('bases.baseNotFound')}
          </h1>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ background: accentColor }}
          >
            {t('library.backToLibrary')}
          </Link>
        </div>
      </div>
    );
  }

  const dashboardConfig = {
    quickModuleIds: base.dashboard?.quickModuleIds ?? [],
    activeWidgetIds: base.dashboard?.activeWidgetIds ?? [],
  };

  const updateDashboard = (updates: Partial<typeof dashboardConfig>) => {
    updateBase(base.id, {
      dashboard: {
        ...base.dashboard,
        ...dashboardConfig,
        ...updates,
      },
    });
  };

  const toggleWidget = (widgetId: string) => {
    const current = dashboardConfig.activeWidgetIds;
    const next = current.includes(widgetId)
      ? current.filter((id) => id !== widgetId)
      : [...current, widgetId];
    updateDashboard({ activeWidgetIds: next });
  };

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const localizedBaseWidgets: BaseWidgetDefinition[] = [
    { id: 'upcoming-events', moduleId: 'calendar', name: t('dashboard.nextEvents') },
    { id: 'mini-calendar', moduleId: 'calendar', name: t('dashboard.miniCalendar') },
    { id: 'inbox-unread', moduleId: 'inbox', name: t('dashboard.unreadMessages') },
    { id: 'inbox-recent', moduleId: 'inbox', name: t('dashboard.recentMessages') },
  ];

  const availableWidgets = localizedBaseWidgets.filter((widget) => base.moduleIds.includes(widget.moduleId));

  const widgetsByModule = availableWidgets.reduce((acc, widget) => {
    if (!acc[widget.moduleId]) {
      acc[widget.moduleId] = [];
    }
    acc[widget.moduleId].push(widget);
    return acc;
  }, {} as Record<string, BaseWidgetDefinition[]>);

  // Immer Postfach, Kalender, Browser zuerst; danach ALLE der Base zugewiesenen Module.
  // quickModuleIds bleibt als Legacy-/Fallback-Feld erhalten, darf aber keine
  // Base-Module aus der Navbar ausschließen.
  const navbarModuleIds = Array.from(
    new Set([
      ...DEFAULT_NAVBAR_MODULE_IDS,
      ...base.moduleIds,
      ...dashboardConfig.quickModuleIds,
    ])
  );

  const visibleNavbarModules = navbarModuleIds
    .map((moduleId) => moduleMap.get(moduleId))
    .filter((module): module is Module => Boolean(module));

  const navbarHeight = navbarSettings?.height ?? DEFAULT_NAVBAR_SETTINGS.height;
  const iconPlacement = navbarSettings?.iconPlacement ?? DEFAULT_NAVBAR_SETTINGS.iconPlacement;
  const iconContainerSize = Math.max(28, Math.min((navbarHeight - 12) * 0.8, 64));
  const iconSize = iconContainerSize * 0.5;
  const gap = Math.max(4, (navbarHeight - 40) * 0.15);
  const borderRadius = iconContainerSize * 0.25;
  const totalItems = visibleNavbarModules.length;
  const iconRowWidth = (totalItems * iconContainerSize) + ((totalItems - 1) * gap);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const maxWidth = Math.max(320, viewportWidth - 40);
  const minRequiredWidth = Math.max(120, Math.min(iconRowWidth + 24, maxWidth));
  const navbarWidth = minRequiredWidth;

  const greetingY = (greetingSettings?.y ?? DEFAULT_GREETING_SETTINGS.y) + 8;
  const floatingDefaultY = greetingY + 106;
  const floatingStartX = Math.max(20, (viewportWidth - iconRowWidth) / 2);
  const floatingContextPrefix = `base:${base.id}`;
  const floatingPositions = navbarSettings?.floatingPositions ?? {};

  return (
    <div
      ref={dashboardRef}
      className="relative h-full w-full overflow-y-auto"
      data-agent-panel="dashboard-root"
    >
      <div className="absolute inset-0" style={{ background: '#020617' }} />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: readyBackgroundUrl === backgroundImage ? 1 : 0,
          transition: 'opacity 220ms ease',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/30 to-black/45" />
      <DashboardFolderLayer surfaceType="base" surfaceId={base.id} boundsRef={dashboardRef} editable />

      <div className="relative z-10 min-h-full px-6 pb-28 pt-6">
        <div className="mb-6 flex items-center justify-end">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setEditMode((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 transition-all"
            style={{
              background: editMode ? accentColor : surfaceColor,
              color: textColor,
              border: designStyle === 'brutal'
                ? '2px solid #000'
                : designStyle === 'neo'
                ? 'none'
                : '1px solid rgba(255,255,255,0.15)',
              boxShadow: designStyle === 'brutal'
                ? '3px 3px 0 #000'
                : designStyle === 'neo'
                ? '4px 4px 8px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.05)'
                : 'none',
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              backdropFilter: designStyle === 'glass' ? 'blur(20px)' : 'none',
            }}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="text-sm font-medium">
              {editMode ? t('common.done') : t('common.customize')}
            </span>
          </motion.button>
        </div>

        {iconPlacement === 'floating' ? (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {visibleNavbarModules.map((module, index) => {
              const Icon = getIconComponent(module.icon || 'Blocks', module.id);
              const hasImg = module.icon?.startsWith('http');
              const gradient = getModuleGradient(module.id);
              const positionKey = `${floatingContextPrefix}:module:${module.id}`;
              const position = floatingPositions[positionKey] ?? {
                x: floatingStartX + (index * (iconContainerSize + gap)),
                y: floatingDefaultY,
              };

              return (
                <Rnd
                  key={positionKey}
                  size={{ width: iconContainerSize, height: iconContainerSize }}
                  position={position}
                  bounds="parent"
                  disableDragging={!editMode}
                  enableResizing={false}
                  onDragStop={(e, d) => {
                    updateNavbarSettings({
                      floatingPositions: {
                        ...floatingPositions,
                        [positionKey]: { x: d.x, y: d.y },
                      },
                    });
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.04 }}
                    className="group relative flex h-full w-full items-center justify-center"
                    style={{
                      borderRadius: `${borderRadius}px`,
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => !editMode && openTab(module.id)}
                      data-agent-button={`dashboard-open-${module.id}`}
                      className={`relative flex h-full w-full items-center justify-center transition-all ${
                        editMode ? 'cursor-move' : 'cursor-pointer hover:scale-110'
                      }`}
                    >
                      {hasImg ? (
                        <img src={module.icon} alt={module.name} className="absolute inset-0 h-full w-full object-cover" style={{ display: 'block', transform: 'scale(1.08)' }} />
                      ) : (
                        <>
                          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ borderRadius: `${borderRadius}px` }} />
                          <Icon className="relative text-white drop-shadow-sm" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
                        </>
                      )}
                    </button>
                  </motion.div>
                </Rnd>
              );
            })}

          </div>
        ) : (
          <div className="fixed left-1/2 top-2 z-10 -translate-x-1/2 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0, width: navbarWidth }}
              transition={{ delay: 0.2, width: { type: 'spring', stiffness: 300, damping: 30 } }}
              style={{ pointerEvents: 'auto' }}
            >
              <Rnd
                size={{ width: navbarWidth, height: navbarHeight }}
                minWidth={minRequiredWidth}
                maxWidth={maxWidth}
                minHeight={40}
                maxHeight={120}
                disableDragging={true}
                enableResizing={editMode ? {
                  top: false,
                  right: false,
                  bottom: false,
                  left: false,
                  topRight: true,
                  bottomRight: true,
                  bottomLeft: true,
                  topLeft: true,
                } : false}
                onResizeStop={(e, direction, ref) => {
                  updateNavbarSettings({
                    height: parseInt(ref.style.height, 10),
                  });
                }}
                style={{ position: 'relative', pointerEvents: 'auto' }}
                resizeHandleStyles={{
                  topRight: { cursor: 'ne-resize', width: '14px', height: '14px' },
                  bottomRight: { cursor: 'se-resize', width: '14px', height: '14px' },
                  bottomLeft: { cursor: 'sw-resize', width: '14px', height: '14px' },
                  topLeft: { cursor: 'nw-resize', width: '14px', height: '14px' },
                }}
              >
                <div
                  className={`flex h-full items-center justify-center px-3 ${editMode ? 'ring-2 ring-blue-500/50 ring-offset-1 ring-offset-transparent' : ''}`}
                  style={{
                    background: surfaceColor,
                    backdropFilter: designStyle === 'glass' ? 'blur(40px) saturate(180%)' : 'none',
                    WebkitBackdropFilter: designStyle === 'glass' ? 'blur(40px) saturate(180%)' : 'none',
                    borderBottom: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.15)',
                    borderLeft: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.15)',
                    borderRight: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.15)',
                    borderTop: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                    boxShadow: designStyle === 'brutal'
                      ? '4px 4px 0 #000'
                      : designStyle === 'neo'
                      ? '0 8px 16px rgba(0,0,0,0.3), 0 -2px 8px rgba(255,255,255,0.05) inset'
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  {editMode && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-white shadow-lg">
                      <span className="text-[10px] font-medium">Navbar</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center" style={{ gap: `${gap}px` }}>
                    {visibleNavbarModules.map((module, index) => {
                      const Icon = getIconComponent(module.icon || 'Blocks', module.id);
                      const hasImg = module.icon?.startsWith('http');
                      const gradient = getModuleGradient(module.id);

                      return (
                        <motion.div
                          key={module.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                        >
                          <button
                            onClick={() => !editMode && openTab(module.id)}
                            data-agent-button={`dashboard-open-${module.id}`}
                            className="group relative flex items-center justify-center transition-all cursor-pointer hover:scale-110"
                            style={{
                              width: `${iconContainerSize}px`,
                              height: `${iconContainerSize}px`,
                              borderRadius: `${borderRadius}px`,
                              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                              overflow: 'hidden',
                              background: hasImg ? 'transparent' : undefined,
                            }}
                          >
                            {hasImg ? (
                              <img src={module.icon} alt={module.name} className="absolute inset-0 h-full w-full object-cover" style={{ display: 'block', transform: 'scale(1.08)' }} />
                            ) : (
                              <>
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} style={{ borderRadius: `${borderRadius}px` }} />
                                <Icon className="relative text-white drop-shadow-sm" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} />
                              </>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}

                    {/* ----------------------------------------
                        Edit Mode: Modul hinzufügen Button
                        Öffnet die Bibliothek für neue Module
                        ---------------------------------------- */}
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => setShowModulePicker(true)}
                        className="relative flex items-center justify-center transition-all hover:opacity-90"
                        style={{
                          width: `${iconContainerSize}px`,
                          height: `${iconContainerSize}px`,
                          borderRadius: `${borderRadius}px`,
                          border: `1px dashed ${accentColor}80`,
                          background: designStyle === 'glass'
                            ? 'rgba(255,255,255,0.08)'
                            : surfaceColor,
                          boxShadow: designStyle === 'brutal'
                            ? '3px 3px 0 #000'
                            : '0 4px 15px rgba(0, 0, 0, 0.2)',
                          color: textColor,
                        }}
                        title="Modul hinzufügen"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Rnd>
            </motion.div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: `${greetingY}px` }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 text-center"
          >
            <h1
              className="font-light tracking-tight drop-shadow-lg leading-none"
              style={{
                color: greetingSettings?.textColor || DEFAULT_GREETING_SETTINGS.textColor,
                textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                fontFamily: greetingSettings?.fontFamily || DEFAULT_GREETING_SETTINGS.fontFamily,
                fontSize: '78px',
              }}
            >
              {base.name} Base
            </h1>
            <Link
              href={`/bases/${base.id}/connections`}
              className="pointer-events-auto mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-300/45 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100"
            >
              Connections öffnen
            </Link>
          </motion.div>
        </div>

        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-32 right-6 z-30 max-h-[60vh] w-80 overflow-y-auto p-4"
              style={{
                ...container.base,
                background: designStyle === 'glass' ? 'rgba(0, 0, 0, 0.85)' : container.base.background,
              }}
            >
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 font-medium text-white">
                  <Type className="h-4 w-4" />
                  Begrüßung
                </h3>

                <div className="mb-4">
                  <p className="mb-2 text-xs text-white/50">Textfarbe</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => updateGreetingSettings({ textColor: color.value })}
                        className={`relative h-7 w-7 rounded-lg transition-all hover:scale-110 ${
                          greetingSettings.textColor === color.value
                            ? 'ring-2 ring-white ring-offset-1 ring-offset-black/50'
                            : 'ring-1 ring-white/20'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs text-white/50">Schriftart</p>
                  <select
                    value={GREETING_FONTS.find((f) => f.value === greetingSettings.fontFamily)?.id || 'system'}
                    onChange={(e) => {
                      const font = GREETING_FONTS.find((f) => f.id === e.target.value);
                      if (font) {
                        updateGreetingSettings({ fontFamily: font.value });
                      }
                    }}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                  >
                    {GREETING_FONTS.map((font) => (
                      <option key={font.id} value={font.id} className="bg-gray-900">
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-xs text-white/50">Icons Position</p>
                  <label className="mb-1 flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={iconPlacement === 'navbar'}
                      onChange={() => updateNavbarSettings({ iconPlacement: 'navbar' })}
                      className="h-4 w-4 accent-blue-500"
                    />
                    In Navbar
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={iconPlacement === 'floating'}
                      onChange={() => updateNavbarSettings({ iconPlacement: 'floating' })}
                      className="h-4 w-4 accent-blue-500"
                    />
                    Freistehend
                  </label>
                  <p className="mt-2 text-[11px] text-white/50">
                    Freistehend: Standardmäßig unter dem Base-Titel, im Edit-Mode frei per Drag & Drop.
                  </p>
                </div>
              </div>

              <div className="mb-4 h-px bg-white/10" />

              <h3 className="mb-4 font-medium text-white">Widgets hinzufügen</h3>

              <div className="space-y-2">
                {Object.entries(widgetsByModule).map(([moduleId, moduleWidgets]) => {
                  const moduleEntry = baseModules.find((m) => m.id === moduleId);
                  if (!moduleEntry) return null;

                  const ModuleIcon = getIconComponent(moduleEntry.icon || 'Blocks');
                  const gradient = getModuleGradient(moduleId);
                  const isExpanded = expandedModules[moduleId] ?? true;
                  const activeCount = moduleWidgets.filter((w) => dashboardConfig.activeWidgetIds.includes(w.id)).length;

                  return (
                    <div key={moduleId} className="overflow-hidden rounded-xl border border-white/5">
                      <button
                        onClick={() => toggleModuleExpand(moduleId)}
                        className="flex w-full items-center gap-3 p-3 transition-colors hover:bg-white/5"
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
                          <ModuleIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-white">{moduleEntry.name}</p>
                          <p className="text-xs text-white/50">
                            {moduleWidgets.length} Widget{moduleWidgets.length !== 1 ? 's' : ''} • {activeCount} aktiv
                          </p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-white/5 bg-white/[0.02]"
                          >
                            <div className="space-y-1 p-2">
                              {moduleWidgets.map((widget) => {
                                const isActive = dashboardConfig.activeWidgetIds.includes(widget.id);

                                return (
                                  <button
                                    key={widget.id}
                                    onClick={() => toggleWidget(widget.id)}
                                    className={`flex w-full items-center gap-3 rounded-lg p-2.5 transition-colors ${
                                      isActive
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-md ${
                                      isActive ? 'bg-blue-500' : 'bg-white/10'
                                    }`}>
                                      {isActive ? (
                                        <X className="h-3.5 w-3.5 text-white" />
                                      ) : (
                                        <Plus className="h-3.5 w-3.5 text-white/60" />
                                      )}
                                    </div>
                                    <span className="text-sm">{widget.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-white/40">
                Im Edit-Mode: Widgets auswählen und Begrüßung anpassen.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: '8rem',
            zIndex: 20,
          }}
        >
          {openTabs.map((tab) => (
            <TabWindow key={tab.id} tab={tab} boundsRef={dashboardRef} />
          ))}
        </div>

        <ModuleSettingsButton
          moduleId={`base:${base.id}`}
          moduleName={`${base.name} Base`}
          moduleColor={base.color || accentColor}
        />

        {/* ----------------------------------------
            Edit Mode: Modul-Picker Modal
            Zeigt alle registrierten Module
            ---------------------------------------- */}
        <AnimatePresence>
          {editMode && showModulePicker && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black"
                onClick={() => setShowModulePicker(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 p-4"
                style={{
                  ...container.base,
                  background: designStyle === 'glass' ? 'rgba(0, 0, 0, 0.85)' : container.base.background,
                }}
              >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-white font-medium">Module hinzufügen</h3>
                  <button
                    type="button"
                    onClick={() => setShowModulePicker(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modul-Liste */}
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                  {modules.map((module) => {
                    const isAssigned = base.moduleIds.includes(module.id);
                    const Icon = getIconComponent(module.icon || 'Blocks');
                    const gradient = getModuleGradient(module.id);
                    return (
                      <div
                        key={module.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 p-3"
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{module.name}</p>
                          <p className="text-xs text-white/50">{module.description || 'Kein Beschreibungstext'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAssigned) {
                              removeModuleFromBase(module.id, base.id);
                              return;
                            }
                            assignModuleToBase(module.id, base.id);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            isAssigned ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {isAssigned ? 'Entfernen' : 'Hinzufügen'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
