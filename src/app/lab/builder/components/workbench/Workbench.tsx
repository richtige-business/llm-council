// ============================================
// LifeOS Module Builder - Workbench
// 
// Zweck: Haupt-Workbench mit Code/Preview Split (wie bolt.diy)
// Verwendet von: Builder Page
// ============================================

'use client';

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStyles } from '@/lib/theme';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import { DiffPanel } from './DiffPanel';
import { ModuleSettings } from './ModuleSettings';
import { useWorkbenchStore, type WorkbenchViewType } from '../../stores/workbench-store';
import { useFilesStore } from '../../stores/files-store';
import { useBuilderChatStore } from '../../stores/chat-store';
import { useProjectsStore } from '../../stores/projects-store';

// --------------------------------------------
// Tab Options
// --------------------------------------------

type ExtendedViewType = WorkbenchViewType | 'settings';

const tabOptions: { value: ExtendedViewType; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'preview', label: 'Preview' },
  { value: 'diff', label: 'Diff' },
  { value: 'settings', label: 'Einstellungen' },
];

// --------------------------------------------
// Animation Variants
// --------------------------------------------

// Dynamische Variants werden in der Komponente berechnet

// --------------------------------------------
// Props
// --------------------------------------------

interface WorkbenchProps {
  chatStarted: boolean;
  isStreaming?: boolean;
  isFullscreen?: boolean;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const Workbench = memo(function Workbench({
  chatStarted,
  isStreaming,
  isFullscreen = false,
}: WorkbenchProps) {
  const { 
    showWorkbench, 
    setShowWorkbench,
    currentView,
    setCurrentView,
    selectedFile,
    setSelectedFile,
  } = useWorkbenchStore();
  
  const { files } = useFilesStore();
  const currentProject = useProjectsStore(state => state.getCurrentProject());
  const projectName = currentProject?.name || 'Modul';
  const { surface, container, button, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Extended view state für Settings Tab
  const [activeTab, setActiveTab] = useState<ExtendedViewType>(currentView);
  
  // Sync mit workbench store
  useEffect(() => {
    if (activeTab === 'code' || activeTab === 'preview' || activeTab === 'diff') {
      setCurrentView(activeTab);
    }
  }, [activeTab, setCurrentView]);
  
  if (!chatStarted) {
    return null;
  }
  
  // Dynamische Animation für Fullscreen/Normal
  const workbenchVariants = {
    closed: {
      width: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
    },
    open: {
      width: isFullscreen ? '100%' : '50%',
      opacity: 1,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
    },
  };
  
  return (
    <AnimatePresence>
      {showWorkbench && (
        <motion.div
          initial="closed"
          animate="open"
          exit="closed"
          variants={workbenchVariants}
          className="h-full flex-1"
          style={{
            borderLeft: isFullscreen 
              ? 'none' 
              : designStyle === 'brutal' 
                ? '3px solid #000' 
                : `1px solid rgba(255,255,255,0.1)`,
          }}
        >
          <div 
            className="h-full flex flex-col"
            style={{ background: surfaceColor }}
          >
            {/* Header mit Tab-Navigation */}
            <div 
              className="flex items-center justify-between px-4 py-2"
              style={{
                ...surface.base,
                borderRadius: 0,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
              }}
            >
              {/* Tab Navigation */}
              <div 
                className="flex gap-1 p-1 rounded-lg"
                style={{ 
                  background: designStyle === 'brutal' 
                    ? 'rgba(0,0,0,0.1)' 
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                }}
              >
                {tabOptions.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className="relative px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      color: activeTab === tab.value ? textColor : `${textColor}60`,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                    }}
                  >
                    {activeTab === tab.value && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0"
                        style={{
                          background: designStyle === 'brutal' 
                            ? accentColor 
                            : 'rgba(255,255,255,0.1)',
                          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                          boxShadow: designStyle === 'brutal' 
                            ? '2px 2px 0 #000' 
                            : 'none',
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {tab.value === 'settings' && <Settings2 className="w-4 h-4" />}
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowWorkbench(false)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: textColor,
                  opacity: 0.4,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.4';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
              {/* Code View */}
              <motion.div
                initial={false}
                animate={{ 
                  x: activeTab === 'code' ? '0%' : '-100%',
                  opacity: activeTab === 'code' ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0"
                style={{ pointerEvents: activeTab === 'code' ? 'auto' : 'none' }}
              >
                <EditorPanel
                  files={files}
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  isStreaming={isStreaming}
                  themeStyles={{ surface, container, button, accentColor, designStyle, textColor }}
                />
              </motion.div>
              
              {/* Preview View */}
              <motion.div
                initial={false}
                animate={{ 
                  x: activeTab === 'preview' ? '0%' : activeTab === 'code' ? '100%' : '-100%',
                  opacity: activeTab === 'preview' ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0"
                style={{ pointerEvents: activeTab === 'preview' ? 'auto' : 'none' }}
              >
                <Preview
                  files={files}
                  isStreaming={isStreaming}
                  moduleName={projectName}
                  projectKey={currentProject?.id}
                  themeStyles={{ surface, container, accentColor, designStyle, textColor }}
                />
              </motion.div>

              {/* Diff View */}
              <motion.div
                initial={false}
                animate={{ 
                  x: activeTab === 'diff' ? '0%' : activeTab === 'preview' ? '100%' : '-100%',
                  opacity: activeTab === 'diff' ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0"
                style={{ pointerEvents: activeTab === 'diff' ? 'auto' : 'none' }}
              >
                <DiffPanel
                  themeStyles={{ surface, container, accentColor, designStyle, textColor }}
                />
              </motion.div>
              
              {/* Settings View */}
              <motion.div
                initial={false}
                animate={{ 
                  x: activeTab === 'settings' ? '0%' : '100%',
                  opacity: activeTab === 'settings' ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0"
                style={{ pointerEvents: activeTab === 'settings' ? 'auto' : 'none' }}
              >
                <ModuleSettings
                  moduleInfo={{ name: projectName }}
                  files={Object.fromEntries(
                    Object.entries(files).filter(([, v]) => v !== undefined)
                  ) as Record<string, { type: string; content?: string }>}
                  themeStyles={{ surface, container, button, accentColor, designStyle, textColor }}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
