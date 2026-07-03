// ============================================
// AddToSidebarDropdown.tsx - Base-Auswahl beim Sidebar-Hinzufügen
//
// Zweck: Dropdown beim +-Button auf Module-Karten
//        User waehlt zu welcher Base das Modul hinzugefuegt wird
//        oder "Nicht zugeordnet". Alle Optionen fuegen zur Sidebar hinzu.
// Verwendet von: ModuleCard.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, Minus } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useBaseStore } from '@/lib/bases/store';
import { useAppStore } from '@/lib/store/app-store';

// --------------------------------------------
// Props
// --------------------------------------------

interface AddToSidebarDropdownProps {
  moduleId: string;
  onOpenChange?: (open: boolean) => void;
  /** Ob das Modul bereits in der Sidebar ist */
  isInSidebar: boolean;
  /** Ob das Modul zur Sidebar hinzugefuegt werden kann */
  canAddToSidebar: boolean;
  designStyle?: 'glass' | 'brutal' | 'neo';
  surfaceColor?: string;
  accentColor?: string;
  textColor?: string;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function AddToSidebarDropdown({
  moduleId,
  onOpenChange,
  isInSidebar,
  canAddToSidebar,
  designStyle = 'glass',
  surfaceColor = 'rgba(15, 23, 42, 0.95)',
  accentColor = '#8b5cf6',
  textColor = '#ffffff',
}: AddToSidebarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bases = useBaseStore((s) => s.bases);
  const assignModuleToBase = useBaseStore((s) => s.assignModuleToBase);
  const removeModuleFromBase = useBaseStore((s) => s.removeModuleFromBase);
  const getBaseByModuleId = useBaseStore((s) => s.getBaseByModuleId);
  const addSidebarModule = useAppStore((s) => s.addSidebarModule);
  const removeSidebarModule = useAppStore((s) => s.removeSidebarModule);

  const currentBase = getBaseByModuleId(moduleId);

  const handleSelect = (baseId: string | null) => {
    if (baseId) {
      assignModuleToBase(moduleId, baseId);
    } else {
      removeModuleFromBase(moduleId);
    }
    addSidebarModule(moduleId);
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleRemove = () => {
    removeSidebarModule(moduleId);
    removeModuleFromBase(moduleId);
    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Klick ausserhalb schliesst
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const portal = document.getElementById('add-to-sidebar-dropdown-portal');
      if (portal?.contains(target)) return;
      setIsOpen(false);
      onOpenChange?.(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onOpenChange, triggerRef]);

  if (!canAddToSidebar) return null;

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="add-to-sidebar-dropdown-portal"
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[9999] min-w-[200px] py-1 rounded-lg shadow-xl"
          style={{
            background: surfaceColor,
            border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: designStyle === 'brutal' ? '4px 4px 0 #000' : '0 10px 40px rgba(0,0,0,0.4)',
            top: triggerRef.current
              ? triggerRef.current.getBoundingClientRect().bottom + 4
              : 0,
            left: triggerRef.current
              ? triggerRef.current.getBoundingClientRect().left
              : 0,
          }}
        >
          <p className="px-3 py-2 text-xs" style={{ color: textColor, opacity: 0.6 }}>
            Zu Base hinzufuegen
          </p>
          {bases.map((base) => (
            <button
              key={base.id}
              onClick={() => handleSelect(base.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-white/10"
              style={{
                color: currentBase?.id === base.id ? accentColor : textColor,
              }}
            >
              <Folder className="w-4 h-4 shrink-0" style={{ color: base.color }} />
              <span>{base.name}</span>
              {currentBase?.id === base.id && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
          <button
            onClick={() => handleSelect(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-white/10"
            style={{
              color: !currentBase ? accentColor : textColor,
            }}
          >
            <Folder className="w-4 h-4 shrink-0 opacity-50" />
            <span>Nicht zugeordnet</span>
            {!currentBase && <span className="ml-auto text-xs">✓</span>}
          </button>
          {isInSidebar && (
            <>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={handleRemove}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-red-500/20"
                style={{ color: '#f87171' }}
              >
                <Minus className="w-4 h-4 shrink-0" />
                <span>Aus Sidebar entfernen</span>
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => {
            const next = !prev;
            onOpenChange?.(next);
            return next;
          });
        }}
        className="flex items-center justify-center p-1.5 rounded-full transition-all hover:scale-110"
        style={{
          background: isInSidebar ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          color: isInSidebar ? '#f87171' : accentColor,
        }}
      >
        <Plus className="w-4 h-4" />
      </button>
      {createPortal(dropdownContent, document.body)}
    </>
  );
}
