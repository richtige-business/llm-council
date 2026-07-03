// ============================================
// TabContent.tsx - Modul-Content Renderer für Tabs
// 
// Zweck: Rendert den Inhalt eines Moduls innerhalb eines Tabs
//        Lädt die echte Modul-Komponente (z.B. CalendarPage)
// Verwendet von: TabWindow.tsx
// ============================================

'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Blocks, Loader2 } from 'lucide-react';
import { useModuleRegistry } from '@/lib/modules';

// --------------------------------------------
// Dynamische Modul-Komponenten
// Hier werden die echten Modul-Ansichten importiert
// --------------------------------------------

import { CalendarPage } from '@/modules/calendar/components';
import { InboxPage } from '@/modules/inbox/components';
import { BrowserPage } from '@/modules/browser/components';
import { AgentsPage } from '@/modules/agents/components';
import { CloudBrowserView, isWebAppModule } from '@/lib/external-apps';
import { DashboardFileViewer } from './DashboardFileViewer';

// Prefix fuer Dashboard-Dateien: moduleId = "dashboard-file:<documentId>"
const DASHBOARD_FILE_PREFIX = 'dashboard-file:';

  // Mapping von Modul-IDs zu ihren Hauptkomponenten
const MODULE_COMPONENTS: Record<string, React.ComponentType> = {
  calendar: CalendarPage,
  inbox: InboxPage,
  browser: BrowserPage,
  // Web-Apps (webapp-*) und externe Apps (extapp-*) siehe unten
};

// --------------------------------------------
// Komponente: TabContent
// Rendert den Modul-Content
// --------------------------------------------

interface TabContentProps {
  moduleId: string;
}

export function TabContent({ moduleId }: TabContentProps) {
  const t = useTranslations();
  const moduleEntry = useModuleRegistry((state) => 
    state.modules.find((m) => m.id === moduleId)
  );

  const isDashboardFile = moduleId.startsWith(DASHBOARD_FILE_PREFIX);
  const dashboardDocId = isDashboardFile
    ? moduleId.slice(DASHBOARD_FILE_PREFIX.length)
    : '';

  // --------------------------------------------
  // Dashboard-Dateien: moduleId "dashboard-file:<id>" erkennen
  // --------------------------------------------
  if (isDashboardFile) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <DashboardFileViewer documentId={dashboardDocId} />
      </div>
    );
  }

  // --------------------------------------------
  // Externe Apps: Cloud-Browser-Streaming (WebRTC Browser Container)
  // --------------------------------------------
  if (moduleEntry?.externalApp) {
    const targetUrl = moduleEntry.externalApp.userUrl || moduleEntry.externalApp.url;

    return (
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      }>
        <div className="h-full min-h-0 overflow-hidden">
          <CloudBrowserView moduleId={moduleId} appName={moduleEntry.name} targetUrl={targetUrl} />
        </div>
      </Suspense>
    );
  }

  // --------------------------------------------
  // Web-App Module: webapp-* IDs – gleicher Cloud-Browser wie extapp-*
  // --------------------------------------------
  if (isWebAppModule(moduleId) && moduleEntry?.route) {
    return (
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      }>
        <div className="h-full min-h-0 overflow-hidden">
          <CloudBrowserView
            moduleId={moduleId}
            appName={moduleEntry.name}
            targetUrl={moduleEntry.route}
          />
        </div>
      </Suspense>
    );
  }

  const ModuleComponent = MODULE_COMPONENTS[moduleId];

  // --------------------------------------------
  // Agents laeuft im Dashboard-Tab mit lokalem Modus,
  // damit Chat, Tasks und Settings im Fenster bleiben.
  // --------------------------------------------
  if (moduleId === 'agents') {
    return (
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      }>
        <div className="h-full min-h-0 overflow-hidden">
          <AgentsPage navigationScope="embedded" initialMode="chat" />
        </div>
      </Suspense>
    );
  }

  // Modul nicht gefunden
  if (!moduleEntry) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          className="max-w-md rounded-3xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
            <Blocks className="h-10 w-10 text-white/60" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-white">
            {t('library.moduleNotFound')}
          </h1>
          <p className="text-white/60">
            {t('modules.moduleDoesNotExist', { moduleId })}
          </p>
        </motion.div>
      </div>
    );
  }

  // Wenn keine Komponente vorhanden, Fallback zeigen
  if (!ModuleComponent) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Blocks className="mx-auto h-16 w-16 text-white/40 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">{moduleEntry.name}</h2>
          <p className="text-white/60">{t('modules.automaticTabView')}</p>
        </div>
      </div>
    );
  }

  // Echte Modul-Komponente rendern
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    }>
      <div className="h-full min-h-0 overflow-hidden">
        <ModuleComponent />
      </div>
    </Suspense>
  );
}
