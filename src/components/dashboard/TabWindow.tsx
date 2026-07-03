// ============================================
// TabWindow.tsx - Fenster-Komponente für Tabs
// 
// Zweck: Rendert ein verschiebbares, resizables Fenster
//        mit mehreren Tabs (wie Safari/Chrome)
// Verwendet von: Dashboard (page.tsx)
// ============================================

'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Minus, Square, X, Maximize2, Plus, Calendar, Mail, Globe, Monitor, CheckSquare, MessageSquare, Dumbbell, BookOpen, FlaskConical, Blocks, FileText, RefreshCw } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppStore, type TabWindow as TabWindowType } from '@/lib/store/app-store';
import { useModuleRegistry } from '@/lib/modules';
import { useExternalAppViewActionsStore } from '@/lib/external-apps/view-actions-store';
import { TabContent } from './TabContent';
import { useThemeStyles } from '@/lib/theme';
import { getModuleHexColor } from '@/lib/modules/colors';

// --------------------------------------------
// resolveTabIcon - Dynamischer Icon-Resolver fuer TabWindow
// Loest Lucide-Icons aus module.icon auf, mit Typ-spezifischen Fallbacks.
// Gibt null zurueck wenn ein HTTP-Bild verwendet werden soll.
// --------------------------------------------

type TabIconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function resolveTabIcon(iconName: string | undefined, moduleId?: string): TabIconType {
  if (moduleId?.startsWith('dashboard-file:')) return FileText;
  const icons = LucideIcons as unknown as Record<string, TabIconType>;
  if (iconName && !iconName.startsWith('http') && icons[iconName]) return icons[iconName];
  if (iconName && !iconName.startsWith('http')) {
    const pascal = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    if (icons[pascal]) return icons[pascal];
  }
  if (moduleId?.startsWith('native-')) return Monitor;
  if (moduleId?.startsWith('webapp-')) return Globe;
  return Blocks;
}

function renderResolvedTabIcon(
  iconName: string | undefined,
  moduleId: string,
  className: string,
  style?: React.CSSProperties
) {
  const Icon = resolveTabIcon(iconName, moduleId);
  return <Icon className={className} style={style} />;
}

// Modul-Farben via getModuleHexColor() (src/lib/modules/colors.ts)

// --------------------------------------------
// Komponente: TabWindow
// Ein Fenster mit mehreren Tabs
// --------------------------------------------

interface TabWindowProps {
  tab: TabWindowType;
  boundsRef: React.RefObject<HTMLDivElement | null>;
}

export function TabWindow({ tab, boundsRef }: TabWindowProps) {
  const t = useTranslations();
  const WORKSPACE_SIDE_PADDING = 28;
  const WORKSPACE_TOP_OFFSET = 68;
  const WORKSPACE_TOP_GAP = 4;
  const WORKSPACE_BOTTOM_OFFSET = 92;
  const TAB_ASPECT_RATIO = 16 / 9;

  const getWorkspaceRect = useCallback(() => {
    const containerWidth = boundsRef.current?.clientWidth || window.innerWidth;
    const containerHeight = boundsRef.current?.clientHeight || window.innerHeight;
    const availableWidth = Math.max(400, containerWidth - WORKSPACE_SIDE_PADDING * 2);
    const availableHeight = Math.max(320, containerHeight - WORKSPACE_TOP_OFFSET - WORKSPACE_TOP_GAP - WORKSPACE_BOTTOM_OFFSET);

    let width = availableWidth;
    let height = width / TAB_ASPECT_RATIO;

    if (height > availableHeight) {
      height = availableHeight;
      width = height * TAB_ASPECT_RATIO;
    }

    const roundedWidth = Math.round(Math.max(400, width));
    const roundedHeight = Math.round(Math.max(320, height));
    const x = Math.round((containerWidth - roundedWidth) / 2);
    const y = WORKSPACE_TOP_OFFSET + WORKSPACE_TOP_GAP;

    return { x, y, width: roundedWidth, height: roundedHeight };
  }, [boundsRef, TAB_ASPECT_RATIO]);

  // Store-Selektoren
  const openTabs = useAppStore((state) => state.openTabs);
  const activeTabId = useAppStore((state) => state.activeTabId);
  const tabBackground = useAppStore((state) => state.tabBackground);
  const minimizeTab = useAppStore((state) => state.minimizeTab);
  const maximizeTab = useAppStore((state) => state.maximizeTab);
  const restoreTab = useAppStore((state) => state.restoreTab);
  const closeTab = useAppStore((state) => state.closeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const updateTabPosition = useAppStore((state) => state.updateTabPosition);
  const updateTabSize = useAppStore((state) => state.updateTabSize);
  const addTabToWindow = useAppStore((state) => state.addTabToWindow);
  const switchTabInWindow = useAppStore((state) => state.switchTabInWindow);
  const closeTabInWindow = useAppStore((state) => state.closeTabInWindow);

  // Theme
  const { designStyle } = useThemeStyles();

  // Module Registry für Titel
  const modules = useModuleRegistry((state) => state.modules);
  const availableModules = useMemo(() => {
    const extraTabModules = [
      { id: 'calendar', name: t('tabWindow.calendar'), icon: Calendar, color: '#10B981' },
      { id: 'inbox', name: t('tabWindow.inbox'), icon: Mail, color: '#3B82F6' },
      { id: 'browser', name: t('tabWindow.browser'), icon: Globe, color: '#8B5CF6' },
      { id: 'todo-list', name: t('tabWindow.tasks'), icon: CheckSquare, color: '#F59E0B' },
      { id: 'agents', name: 'Agents', icon: MessageSquare, color: '#8B5CF6' },
      { id: 'training', name: t('tabWindow.training'), icon: Dumbbell, color: '#EF4444' },
      { id: 'library', name: t('tabWindow.library'), icon: BookOpen, color: '#6366F1' },
      { id: 'lab', name: t('tabWindow.lab'), icon: FlaskConical, color: '#14B8A6' },
    ];
    const iconMap = LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
    const registryEntries = modules.map((mod) => ({
      id: mod.id,
      name: mod.name,
      icon: iconMap[mod.icon] || Blocks,
      color: getModuleHexColor(mod.id),
    }));

    const existing = new Set(registryEntries.map((entry) => entry.id));
    const extras = extraTabModules.filter((entry) => !existing.has(entry.id));

    return [...registryEntries, ...extras];
  }, [modules, t]);

  const getModuleName = (moduleId: string, tabTitle?: string) => {
    if (moduleId.startsWith('dashboard-file:') && tabTitle) return tabTitle;
    const mod = modules.find(m => m.id === moduleId);
    return mod?.name || availableModules.find(m => m.id === moduleId)?.name || tabTitle || moduleId;
  };

  const isActive = activeTabId === tab.id;
  
  // Aktives Tab im Fenster
  const windowTabs = tab.tabs || [{ id: tab.id, moduleId: tab.moduleId, title: tab.title }];
  const activeTabIndex = tab.activeTabIndex ?? 0;
  const activeWindowTab = windowTabs[activeTabIndex] || windowTabs[0];
  const activeModuleId = activeWindowTab?.moduleId || tab.moduleId;
  
  const activeModuleMeta = modules.find((m) => m.id === activeModuleId);
  const activeHasImage = activeModuleMeta?.icon?.startsWith('http');
  const activeViewActions = useExternalAppViewActionsStore(
    (state) => state.actionsByModuleId[activeModuleId]
  );

  // Refs und State
  const rndRef = useRef<Rnd>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: tab.position.x, y: tab.position.y });
  const [maximizedSize, setMaximizedSize] = useState({ width: tab.size.width, height: tab.size.height });
  const [maximizedPosition, setMaximizedPosition] = useState({ x: tab.position.x, y: tab.position.y });

  // Maximized: Fenster auf volle Größe des Containers setzen
  useEffect(() => {
    if (tab.isMaximized && rndRef.current) {
      const { width, height, x, y } = getWorkspaceRect();
      rndRef.current.updateSize({ width, height });
      rndRef.current.updatePosition({ x, y });
    }
  }, [tab.isMaximized, getWorkspaceRect]);

  useEffect(() => {
    if (!tab.isMaximized) {
      return;
    }

    const updateViewportSize = () => {
      const { width, height, x, y } = getWorkspaceRect();
      setMaximizedSize({ width, height });
      setMaximizedPosition({ x, y });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, [tab.isMaximized, getWorkspaceRect]);

  const handleClick = () => {
    if (!isActive) setActiveTab(tab.id);
  };

  const handleDragStart = () => {
    setDragPosition({ x: tab.position.x, y: tab.position.y });
    setIsDragging(true);
  };

  // Während des Ziehens: Position mit Obergrenze y=0 aktualisieren
  const handleDrag = (_e: unknown, d: { x: number; y: number }) => {
    const clampedY = Math.max(0, d.y);
    setDragPosition({ x: d.x, y: clampedY });
  };

  const handleDragStop = (_e: unknown, d: { x: number; y: number }) => {
    setIsDragging(false);
    if (!tab.isMaximized) {
      const clampedY = Math.max(0, d.y);
      updateTabPosition(tab.id, { x: d.x, y: clampedY });
    }
  };

  const handleResizeStop = (
    _e: unknown,
    _direction: unknown,
    ref: HTMLElement,
    _delta: unknown,
    position: { x: number; y: number }
  ) => {
    if (!tab.isMaximized) {
      updateTabSize(tab.id, {
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height),
      });
      updateTabPosition(tab.id, { x: position.x, y: Math.max(0, position.y) });
    }
  };

  // Position und Größe - während Drag lokalen State verwenden
  const isCarouselLayout = openTabs.length > 1;
  const activeWindowIndex = openTabs.findIndex((entry) => entry.id === activeTabId);
  const currentWindowIndex = openTabs.findIndex((entry) => entry.id === tab.id);
  const offsetFromActive = activeWindowIndex >= 0 && currentWindowIndex >= 0
    ? currentWindowIndex - activeWindowIndex
    : 0;

  const baseWidth = tab.isMaximized ? maximizedSize.width : tab.size.width;
  const baseHeight = tab.isMaximized ? maximizedSize.height : tab.size.height;
  const baseX = tab.isMaximized ? maximizedPosition.x : tab.position.x;
  const baseY = tab.isMaximized ? maximizedPosition.y : tab.position.y;

  const carouselStepX = Math.round(baseWidth * 0.78);
  const carouselPosition = {
    x: baseX + offsetFromActive * carouselStepX,
    y: baseY,
  };
  const carouselSize = { width: baseWidth, height: baseHeight };

  const position = isCarouselLayout
    ? carouselPosition
    : tab.isMaximized
      ? maximizedPosition
      : isDragging
        ? dragPosition
        : tab.position;
  const size = isCarouselLayout
    ? carouselSize
    : tab.isMaximized
      ? maximizedSize
      : tab.size;

  const minimizedHeight = 40;
  const finalHeight = tab.isMinimized ? minimizedHeight : size.height;

  // Resizing ist immer aktiviert, außer wenn minimiert oder maximiert
  const canResize = !isCarouselLayout && !tab.isMinimized && !tab.isMaximized;

  return (
    <Rnd
      ref={rndRef}
      size={{ width: size.width, height: finalHeight }}
      position={position}
      minWidth={400}
      minHeight={tab.isMinimized ? minimizedHeight : 300}
      // Keine bounds - Fenster kann überall hin bewegt werden
      disableDragging={isCarouselLayout || tab.isMinimized || tab.isMaximized}
      enableResizing={canResize ? {
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true,
      } : false}
      resizeHandleStyles={{
        top: { cursor: 'ns-resize', height: '8px', top: '-4px' },
        bottom: { cursor: 'ns-resize', height: '8px', bottom: '-4px' },
        left: { cursor: 'ew-resize', width: '8px', left: '-4px' },
        right: { cursor: 'ew-resize', width: '8px', right: '-4px' },
        topLeft: { cursor: 'nwse-resize', width: '12px', height: '12px', top: '-6px', left: '-6px' },
        topRight: { cursor: 'nesw-resize', width: '12px', height: '12px', top: '-6px', right: '-6px' },
        bottomLeft: { cursor: 'nesw-resize', width: '12px', height: '12px', bottom: '-6px', left: '-6px' },
        bottomRight: { cursor: 'nwse-resize', width: '12px', height: '12px', bottom: '-6px', right: '-6px' },
      }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      style={{
        zIndex: isCarouselLayout ? 100 + (openTabs.length - Math.abs(offsetFromActive)) : tab.zIndex,
        pointerEvents: 'auto',
      }}
      dragHandleClassName="tab-titlebar"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: isCarouselLayout ? (Math.abs(offsetFromActive) > 2 ? 0 : offsetFromActive === 0 ? 1 : 0.82) : 1,
          scale: isCarouselLayout ? (offsetFromActive === 0 ? 1 : 0.9) : 1,
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={handleClick}
        className="h-full w-full overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: tabBackground || 'rgba(20, 20, 28, 0.98)',
          backdropFilter: 'blur(40px)',
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: isActive
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 20px 40px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* ----------------------------------------
            Titlebar mit Window Controls
            ---------------------------------------- */}
        <div
          className="tab-titlebar flex h-10 items-center justify-between px-3 shrink-0"
          style={{
            background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Links: Window Controls (macOS Style) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              data-agent-button={`window-close-${activeModuleId}`}
              className="flex h-3 w-3 items-center justify-center rounded-full transition-all group"
              style={{ background: '#ff5f57' }}
              title="Schließen"
            >
              <X className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); minimizeTab(tab.id); }}
              className="flex h-3 w-3 items-center justify-center rounded-full transition-all group"
              style={{ background: '#febc2e' }}
              title="Minimieren"
            >
              <Minus className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (tab.isMaximized) {
                  restoreTab(tab.id);
                } else {
                  maximizeTab(tab.id);
                }
              }}
              className="flex h-3 w-3 items-center justify-center rounded-full transition-all group"
              style={{ background: '#28c840' }}
              title={tab.isMaximized ? 'Wiederherstellen' : 'Maximieren'}
            >
              {tab.isMaximized ? (
                <Maximize2 className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
              ) : (
                <Square className="h-2 w-2 text-black/60 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>

          {/* Mitte: Aktuelles Modul (wenn nur 1 Tab) */}
          {windowTabs.length === 1 && (
            <div className="flex items-center gap-2 flex-1 justify-center px-4">
              {activeHasImage ? (
                <img src={activeModuleMeta!.icon} alt={getModuleName(activeModuleId, tab.title)} className="h-4 w-4 rounded-[3px] object-cover" />
              ) : (
                renderResolvedTabIcon(
                  activeModuleMeta?.icon,
                  activeModuleId,
                  'h-4 w-4 text-white/70',
                  { color: getModuleHexColor(activeModuleId) }
                )
              )}
              <span className="text-sm font-medium text-white/80 truncate">
                {getModuleName(activeModuleId, tab.title)}
              </span>
            </div>
          )}
          
          {/* Spacer wenn mehrere Tabs */}
          {windowTabs.length > 1 && <div className="flex-1" />}

          {/* Rechts: Modul-Aktionen + Neuer Tab Button */}
          <div className="flex items-center shrink-0 relative gap-1">
            {activeViewActions?.reload && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void activeViewActions.reload?.();
                }}
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/10"
                title="Ansicht neu laden"
              >
                <RefreshCw className="h-3.5 w-3.5 text-white/60" />
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
              className="flex h-6 w-6 items-center justify-center hover:bg-white/10 rounded-md transition-colors"
              title="Neuen Tab hinzufügen"
            >
              <Plus className="h-4 w-4 text-white/60" />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[9998]"
                    onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full right-0 mt-1.5 py-1.5 rounded-lg z-[9999] min-w-[180px]"
                    style={{
                      background: 'rgba(30, 30, 40, 0.98)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {availableModules.map((mod) => {
                      const ModIcon = mod.icon;
                      return (
                        <button
                          key={mod.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            addTabToWindow(tab.id, mod.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/10"
                        >
                          <ModIcon className="h-4 w-4" style={{ color: mod.color }} />
                          <span className="text-sm text-white/90">{mod.name}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ----------------------------------------
            Tab-Leiste (nur bei mehreren Tabs)
            ---------------------------------------- */}
        {windowTabs.length > 1 && (
          <div 
            className="flex items-center gap-1 px-2 py-1 shrink-0 overflow-x-auto"
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {windowTabs.map((wTab, index) => {
              const tabModuleMeta = modules.find((m) => m.id === wTab.moduleId);
              const tabHasImage = tabModuleMeta?.icon?.startsWith('http');
              const TabIcon = resolveTabIcon(tabModuleMeta?.icon, wTab.moduleId);
              const tabColor = getModuleHexColor(wTab.moduleId);
              const isActiveTab = index === activeTabIndex;
              
              return (
                <div
                  key={wTab.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    switchTabInWindow(tab.id, index);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all group min-w-0 ${
                    isActiveTab ? 'bg-white/15' : 'hover:bg-white/08'
                  }`}
                  style={{
                    borderBottom: isActiveTab ? `2px solid ${tabColor}` : '2px solid transparent',
                  }}
                >
                  {tabHasImage ? (
                    <img src={tabModuleMeta!.icon} alt={wTab.title || wTab.moduleId} className="h-3.5 w-3.5 shrink-0 rounded-[2px] object-cover" />
                  ) : (
                    <TabIcon 
                      className="h-3.5 w-3.5 shrink-0" 
                      style={{ color: isActiveTab ? tabColor : 'rgba(255,255,255,0.5)' }} 
                    />
                  )}
                  <span 
                    className="text-xs font-medium truncate max-w-[100px]"
                    style={{ color: isActiveTab ? 'white' : 'rgba(255,255,255,0.6)' }}
                  >
                    {getModuleName(wTab.moduleId, wTab.title)}
                  </span>
                  
                  {/* Tab schliessen Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTabInWindow(tab.id, index);
                    }}
                    data-agent-button={`window-close-${wTab.moduleId}`}
                    className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all ml-1"
                  >
                    <X className="h-3 w-3 text-white/60" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ----------------------------------------
            Content Area
            ---------------------------------------- */}
        {!tab.isMinimized && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabContent moduleId={activeModuleId} />
          </div>
        )}
      </motion.div>
    </Rnd>
  );
}
