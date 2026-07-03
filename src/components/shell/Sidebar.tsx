// ============================================
// Sidebar.tsx - Hauptnavigation der Anwendung
// 
// Zweck: Floating Sidebar mit Modul-Navigation
//        Module oben, System-Links unten
//        Verwendet Theme-System für dynamisches Styling
// Verwendet von: Shell.tsx
// ============================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import * as LucideIcons from 'lucide-react';
import { 
  Home, 
  Blocks, 
  FlaskConical, 
  Library, 
  X,
  Settings,
  MessageSquare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore, USER_STATUS_OPTIONS } from '@/lib/store/app-store';
import { useModuleRegistry } from '@/lib/modules/registry';
import { useThemeStyles } from '@/lib/theme';
import { useBaseStore, DEFAULT_NAVBAR_MODULE_IDS } from '@/lib/bases/store';
// Web-App Module werden per ID-Prefix erkannt (webapp-*)
import type { ComponentType } from 'react';
import type { Module } from '@/types';

// Postfach, Kalender, Browser erscheinen nicht in "Einzelmodule" (immer im Hub)
const EXCLUDED_FROM_EINZELMODULE = ['inbox', 'calendar', 'browser'] as const;

// --------------------------------------------
// resolveIcon - Robuster Icon-Resolver
// Liest den Icon-Namen aus dem Modul (z.B. "Calendar", "Mail")
// und gibt die passende Lucide-Komponente zurueck.
// Fallback-Kette: Exakter Name → PascalCase-Versuch → Blocks
// --------------------------------------------

function resolveIcon(iconName: string | undefined): ComponentType<{ className?: string }> {
  if (!iconName || iconName.startsWith('http')) return Blocks;
  const icons = LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>;
  if (icons[iconName]) return icons[iconName];
  // PascalCase-Versuch (z.B. "calendar" → "Calendar")
  const pascal = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  if (icons[pascal]) return icons[pascal];
  return Blocks;
}

// --------------------------------------------
// getModuleIcon - Bestimmt das richtige Icon fuer ein Modul
// Beruecksichtigt den Modul-Typ (Native/Web/LifeOS) fuer sinnvolle Fallbacks
// --------------------------------------------

function getModuleIcon(module: Module | undefined): ComponentType<{ className?: string }> {
  if (!module) return Blocks;
  // Web-Apps → Globe als Fallback (wenn kein Bild-Icon vorhanden)
  if (module.id.startsWith('webapp-')) {
    return module.icon && !module.icon.startsWith('http')
      ? resolveIcon(module.icon)
      : (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>).Globe || Blocks;
  }
  // Standard LifeOS Module
  return resolveIcon(module.icon);
}

// --------------------------------------------
// SidebarModuleIcon - Icon-Komponente mit Bild-Fallback
// Nutzt useState fuer fehlgeschlagene Bilder,
// sodass bei Fehler das Lucide-Icon gezeigt wird.
// --------------------------------------------

function SidebarModuleIcon({
  moduleEntry,
  hasImageIcon,
  moduleName,
  FallbackIcon,
}: {
  moduleEntry: Module | undefined;
  hasImageIcon: boolean;
  moduleName: string;
  FallbackIcon: ComponentType<{ className?: string }>;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (hasImageIcon && moduleEntry && !imgFailed) {
    return (
      <img
        src={moduleEntry.icon}
        alt={moduleName}
        className="h-5 w-5 rounded-[4px] object-cover block"
        style={{ display: 'block' }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <FallbackIcon className="h-5 w-5" />;
}

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const sidebarModules = useAppStore((state) => state.sidebarModules);
  const modules = useModuleRegistry((state) => state.modules);
  const bases = useBaseStore((state) => state.bases);
  const cleanupMissingModules = useBaseStore((state) => state.cleanupMissingModules);
  
  // User Profile für den Header
  const userProfile = useAppStore((state) => state.userProfile);
  
  // Chat Tab System - um beim Modulwechsel den Agent zu wechseln
  const ensureChatTabExists = useAppStore((state) => state.ensureChatTabExists);
  
  // Status-Farbe aus den Optionen holen
  const statusColor = USER_STATUS_OPTIONS.find(s => s.id === userProfile.status)?.color || '#22c55e';
  
  const baseAssignedModuleIds = useMemo(() => {
    return new Set(bases.flatMap((base) => base.moduleIds));
  }, [bases]);

  // Module sind sichtbar, wenn sie manuell fuer die Sidebar aktiviert sind
  // oder wenn sie bereits einer Base zugeordnet sind.
  const visibleModules = useMemo(() => {
    return modules.filter(
      (module) => sidebarModules.includes(module.id) || baseAssignedModuleIds.has(module.id)
    );
  }, [modules, sidebarModules, baseAssignedModuleIds]);
  const [collapsedBases, setCollapsedBases] = useState<Record<string, boolean>>({});
  const [dashboardCollapsed, setDashboardCollapsed] = useState(true); // Dropdown standardmaessig zugeklappt

  useEffect(() => {
    if (modules.length === 0) {
      return;
    }
    cleanupMissingModules(modules.map((module) => module.id));
  }, [cleanupMissingModules, modules]);

  const visibleAppModules = useMemo(() => {
    return visibleModules
      .filter((module) => module.id !== 'agents')
      .sort((a, b) => a.order - b.order);
  }, [visibleModules]);

  const visibleModuleMap = useMemo(() => {
    return new Map(visibleAppModules.map((module) => [module.id, module]));
  }, [visibleAppModules]);

  const groupedBases = useMemo(() => {
    return bases.map((base) => ({
      ...base,
      moduleIds: base.moduleIds.filter((moduleId) => visibleModuleMap.has(moduleId)),
    }));
  }, [bases, visibleModuleMap]);

  const assignedModuleIds = useMemo(() => {
    return new Set(groupedBases.flatMap((base) => base.moduleIds));
  }, [groupedBases]);

  const unassignedModules = useMemo(() => {
    const excluded = new Set<string>(EXCLUDED_FROM_EINZELMODULE);
    return visibleAppModules.filter(
      (module) => !assignedModuleIds.has(module.id) && !excluded.has(module.id)
    );
  }, [assignedModuleIds, visibleAppModules]);
  
  // Theme-Styles für dynamisches Design (inkl. textColor!)
  const { container, navItem, button, accentColor, designStyle, textColor } = useThemeStyles();

  // --------------------------------------------
  // System Navigation Items
  // Werden UNTEN in der Sidebar angezeigt
  // (Bibliothek, Lab, Einstellungen)
  // Dashboard wurde zu Hub verschoben
  // --------------------------------------------
  
  const systemNavItems = [
    { href: '/library', icon: Library, label: t('shell.library') },
    { href: '/lab', icon: FlaskConical, label: 'Lab' },
    { href: '/settings', icon: Settings, label: t('shell.settings') },
  ];

  // Sidebar schließen nach Navigation
  const handleNavClick = () => {
    setSidebarOpen(false);
  };
  
  // Handler für Modul-Navigation: Sidebar schließen + Agent-Tab vorbereiten
  const handleModuleNavClick = (moduleId: string) => {
    setSidebarOpen(false);
    // Agent-Tab für dieses Modul vorbereiten (ohne Chat zu öffnen!)
    // Das sorgt dafür, dass der Tab existiert wenn der User den Chat öffnet
    ensureChatTabExists(moduleId);
  };

  const toggleBase = (baseId: string) => {
    setCollapsedBases((prev) => ({
      ...prev,
      [baseId]: !(prev[baseId] ?? true),
    }));
  };

  const renderModuleLink = (moduleId: string, moduleName: string) => {
    const isActive = pathname === `/${moduleId}` || pathname.startsWith(`/${moduleId}/`);
    
    // Modul-Eintrag aus der Registry holen
    const moduleEntry = modules.find(m => m.id === moduleId);
    
    // Icon-Typ bestimmen:
    // 1. URL (http...) → Echtes App-Icon als <img> (native Apps)
    // 2. Lucide-Name (z.B. "Calendar") → Dynamisch aufloesen
    // 3. Fallback → Typ-spezifisch (Monitor/Globe/Blocks)
    const hasImageIcon = moduleEntry?.icon?.startsWith('http');
    const Icon = getModuleIcon(moduleEntry);

    return (
      <Link
        key={moduleId}
        href={`/${moduleId}`}
        onClick={() => handleModuleNavClick(moduleId)}
        data-agent-tab={moduleId}
      >
        <motion.div
          className="flex items-center gap-3 px-4 py-3 transition-all"
          style={{
            ...navItem.base,
            ...(isActive ? navItem.active : {}),
            color: textColor,
            opacity: isActive ? 1 : 0.7,
          }}
          whileHover={{
            x: 4,
            opacity: 1,
          }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Echtes App-Icon (Bild) oder dynamisch aufgeloestes Lucide-Icon */}
          <SidebarModuleIcon
            moduleEntry={moduleEntry}
            hasImageIcon={!!hasImageIcon}
            moduleName={moduleName}
            FallbackIcon={Icon}
          />
          <span className="font-medium">{moduleName}</span>
        </motion.div>
      </Link>
    );
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* ----------------------------------------
              Backdrop - Klick schließt Sidebar
              ---------------------------------------- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998]"
            onClick={() => setSidebarOpen(false)}
          />

          {/* ----------------------------------------
              Floating Sidebar Panel
              Dynamisches Styling basierend auf Theme
              Höchster z-index - liegt über allem (Tabs, Widgets, etc.)
              ---------------------------------------- */}
          <motion.aside
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            data-agent-panel="shell-sidebar"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-6 top-6 bottom-6 z-[9999] flex w-72 flex-col overflow-hidden"
            style={{
              ...container.base,
              // Inset-Shadow nur bei Glassmorphism
              boxShadow: designStyle === 'glass' 
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                : container.base.boxShadow,
            }}
          >
            {/* ----------------------------------------
                Header mit Profil (statt Logo)
                Klickbar - öffnet Profilseite
                ---------------------------------------- */}
            <div className="flex items-center justify-between p-5">
              <Link
                href="/profile"
                onClick={handleNavClick}
                className="flex-1 group"
              >
                <motion.div 
                  className="flex items-center gap-3"
                  whileHover={{ x: 2 }}
                >
                  {/* Avatar - Bild oder Initialen */}
                  <div 
                    className="relative h-11 w-11 flex-shrink-0 overflow-hidden"
                    style={{
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '50%',
                      border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                      boxShadow: designStyle === 'brutal' 
                        ? '3px 3px 0 #000' 
                        : `0 4px 15px ${accentColor}30`,
                    }}
                  >
                    {userProfile.avatar ? (
                      // Avatar-Bild vorhanden
                      <img 
                        src={userProfile.avatar} 
                        alt={userProfile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // Keine Avatar - zeige Initialen
                      <div 
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                        }}
                      >
                        <span className="text-lg font-semibold text-white">
                          {userProfile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Online-Status Indikator */}
                    <div 
                      className="absolute bottom-0 right-0 h-3 w-3 border-2"
                      style={{
                        backgroundColor: statusColor,
                        borderRadius: '50%',
                        borderColor: designStyle === 'brutal' ? '#000' : 'rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                  
                  {/* Name & Status */}
                  <div className="flex-1 min-w-0">
                    <h1 
                      className="font-semibold drop-shadow-sm truncate group-hover:opacity-80 transition-opacity" 
                      style={{ color: textColor }}
                    >
                      {userProfile.name}
                    </h1>
                    <p 
                      className="text-xs flex items-center gap-1.5 truncate" 
                      style={{ color: textColor, opacity: 0.6 }}
                    >
                      <span 
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor }}
                      />
                      {USER_STATUS_OPTIONS.find(s => s.id === userProfile.status)?.name || 'Online'}
                    </p>
                  </div>
                  
                  {/* Hover-Indikator */}
                  <ChevronRight 
                    className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" 
                    style={{ color: textColor }}
                  />
                </motion.div>
              </Link>
              
              {/* Close Button - verwendet Theme-Textfarbe */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center transition-all ml-2"
                style={{
                  ...button.base,
                  borderRadius: designStyle === 'brutal' ? '0.375rem' : '9999px',
                  color: textColor,
                  opacity: 0.7,
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* ----------------------------------------
                Hub Section - OBEN (freistehend)
                Dashboard mit Dropdown (Postfach, Kalender, Browser)
                Agents als direkter Link (ohne Untermenü)
                ---------------------------------------- */}
            <div className="p-4">
              <div className="space-y-1">
                {/* Dashboard – mit Dropdown wie Bases */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-4 py-2">
                    <Link
                      href="/"
                      onClick={handleNavClick}
                      className="group flex-1"
                    >
                      <motion.div
                        className="flex items-center gap-3"
                        style={{ color: textColor, opacity: pathname === '/' ? 1 : 0.75 }}
                        whileHover={{ x: 2, opacity: 1 }}
                      >
                        <Home className="h-5 w-5" />
                        <span className="font-medium">{t('shell.dashboard')}</span>
                      </motion.div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDashboardCollapsed((prev) => !prev)}
                      aria-label={`${t('shell.dashboard')} aufklappen`}
                      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ color: textColor, opacity: 0.75 }}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${dashboardCollapsed ? '-rotate-90' : 'rotate-0'}`}
                      />
                    </button>
                  </div>
                  <AnimatePresence>
                    {!dashboardCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1 pl-2">
                          {DEFAULT_NAVBAR_MODULE_IDS.map((moduleId) => {
                            const moduleEntry = modules.find((m) => m.id === moduleId);
                            if (!moduleEntry) return null;
                            return renderModuleLink(moduleEntry.id, moduleEntry.name);
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Agents – ein Zeile, direkt zum Workspace (Unterseiten nur in-app) */}
                <div className="px-4 py-2">
                  <Link
                    href="/agents"
                    onClick={() => handleModuleNavClick('agents')}
                    data-agent-tab="agents"
                    className="group block"
                  >
                    <motion.div
                      className="flex items-center gap-3"
                      style={{
                        color: textColor,
                        opacity: pathname === '/agents' || pathname.startsWith('/agents/') ? 1 : 0.75,
                      }}
                      whileHover={{ x: 2, opacity: 1 }}
                    >
                      <MessageSquare className="h-5 w-5 shrink-0" />
                      <span className="font-medium">Agents</span>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Divider zwischen Hub und Module */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* ----------------------------------------
                Module Section - MITTE
                Alle installierten Apps/Module
                Chat wird hier nicht angezeigt (ist bereits im Hub)
                Verwendet Theme-Textfarbe!
                ---------------------------------------- */}
            <nav className="flex-1 overflow-y-auto p-4">
              {/* Module Header */}
              <h3 
                className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: textColor, opacity: 0.4 }}
              >
                {t('shell.bases')}
              </h3>
              
              {/* Nur Module anzeigen, die in sidebarModules sind (ohne Chat - der ist im Hub) */}
              {visibleAppModules.length > 0 ? (
                <div className="space-y-3">
                  {groupedBases.map((base) => {
                    const isCollapsed = collapsedBases[base.id] ?? true;
                    const isBaseDashboardActive =
                      pathname === `/bases/${base.id}` || pathname.startsWith(`/bases/${base.id}/`);
                    return (
                    <div key={base.id} className="space-y-1">
                      <div className="flex items-center justify-between px-4 py-2">
                        <Link
                          href={`/bases/${base.id}`}
                          onClick={handleNavClick}
                          className="group flex-1"
                        >
                          <span
                            className="text-xs font-semibold uppercase tracking-wider transition-all group-hover:font-bold group-hover:opacity-100"
                            style={{
                              color: textColor,
                              opacity: isBaseDashboardActive ? 1 : 0.75,
                            }}
                          >
                            {base.name}
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleBase(base.id)}
                          aria-label={`Base ${base.name} aufklappen`}
                          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ color: textColor, opacity: 0.75 }}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </button>
                      </div>

                      {!isCollapsed && base.moduleIds.length > 0 && (
                        <div className="space-y-1">
                          {base.moduleIds.map((moduleId) => {
                            const moduleEntry = visibleModuleMap.get(moduleId);
                            if (!moduleEntry) return null;
                            return renderModuleLink(moduleEntry.id, moduleEntry.name);
                          })}
                        </div>
                      )}
                    </div>
                  )})}

                  {unassignedModules.length > 0 && (
                    <div className="space-y-1">
                      <div
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: textColor, opacity: 0.5 }}
                      >
                        {t('shell.singleModules')}
                      </div>
                      {unassignedModules.map((module) => renderModuleLink(module.id, module.name))}
                    </div>
                  )}
                </div>
              ) : (
                // Hinweis wenn keine Module installiert
                <div className="px-4 py-6 text-center">
                  <Blocks className="mx-auto h-8 w-8 mb-2" style={{ color: textColor, opacity: 0.2 }} />
                  <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
                    Keine Module installiert
                  </p>
                  <Link
                    href="/library"
                    onClick={handleNavClick}
                    className="mt-2 inline-block text-sm transition-colors"
                    style={{ color: accentColor }}
                  >
                    → {t('shell.library')} öffnen
                  </Link>
                </div>
              )}
            </nav>

            {/* Divider vor System-Section */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* ----------------------------------------
                System Section - UNTEN
                Dashboard, Bibliothek, Lab, Einstellungen
                Verwendet Theme-Textfarbe!
                ---------------------------------------- */}
            <div className="p-4">
              <h3 
                className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: textColor, opacity: 0.4 }}
              >
                System
              </h3>
              
              <div className="space-y-1">
                {systemNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      data-agent-tab={
                        item.href === '/library'
                          ? 'library'
                          : item.href === '/lab'
                            ? 'lab'
                            : item.href === '/settings'
                              ? 'settings'
                              : undefined
                      }
                    >
                      <motion.div
                        className="flex items-center gap-3 px-4 py-3 transition-all"
                        style={{
                          ...navItem.base,
                          ...(isActive ? navItem.active : {}),
                          color: textColor,
                          opacity: isActive ? 1 : 0.7,
                        }}
                        whileHover={{ 
                          x: 4,
                          opacity: 1,
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
