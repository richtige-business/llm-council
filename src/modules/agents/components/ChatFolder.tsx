// ============================================
// ChatFolder.tsx - Ordner-Komponente für Agents-Modul
// 
// Zweck: Rendert einen Ordner in der Chat-History-Sidebar
//        Mit Farbe, Name und Konversations-Anzahl
// Verwendet von: ChatHistorySidebar.tsx
// ============================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, ChevronDown, ChevronRight, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useAgentsStore } from '../store';
import type { ChatFolderData } from '../types';

// --------------------------------------------
// Komponente: ChatFolder
// Ein Ordner für Chat-Konversationen
// --------------------------------------------

interface ChatFolderProps {
  folder: ChatFolderData;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ChatFolder({ folder, isExpanded, onToggle }: ChatFolderProps) {
  const deleteFolder = useAgentsStore((state) => state.deleteFolder);
  const updateFolder = useAgentsStore((state) => state.updateFolder);
  
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  // Ordner umbenennen
  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      updateFolder(folder.id, { name: editName.trim() });
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  // Ordner löschen
  const handleDelete = () => {
    if (confirm(`Ordner "${folder.name}" wirklich löschen?`)) {
      deleteFolder(folder.id);
    }
    setShowMenu(false);
  };

  return (
    <div className="mb-0.5">
      <div className="flex items-center gap-1.5 group">
        {/* Expand/Collapse Button */}
        <button
          onClick={onToggle}
          className="flex h-5 w-5 items-center justify-center text-white/40 hover:text-white/60 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        {/* Ordner-Icon mit Farbe */}
        <div
          className="flex h-4 w-4 items-center justify-center"
          style={{ color: folder.color || '#3b82f6' }}
        >
          <Folder className="h-3.5 w-3.5" />
        </div>

        {/* Ordner-Name (editierbar) */}
        {isEditing ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(folder.name);
                setIsEditing(false);
              }
            }}
            className="flex-1 rounded px-1.5 py-0.5 text-xs text-white bg-white/10 border border-white/20 focus:outline-none focus:border-white/40"
            autoFocus
          />
        ) : (
          <button
            onClick={onToggle}
            className="flex-1 text-left text-xs text-white/60 hover:text-white transition-colors truncate"
          >
            {folder.name}
          </button>
        )}

        {/* Konversations-Anzahl */}
        <span className="text-[10px] text-white/30">
          {folder.conversationIds.length}
        </span>

        {/* Menu-Button */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-6 z-20 w-36 rounded-lg bg-black/90 backdrop-blur-sm border border-white/10 shadow-xl py-1"
              >
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Umbenennen
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Löschen
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
