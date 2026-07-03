// ============================================
// ChatSidebar.tsx - Chat-Sidebar mit History und Folders
// 
// Zweck: Linke Sidebar im Chat-Modul
//        Zeigt Chat-History, Ordner und ermöglicht neue Chats
// Verwendet von: ChatPage.tsx
// ============================================

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, FolderPlus, MoreVertical } from 'lucide-react';
import { useChatStore } from '../store';
import { ChatFolder } from './ChatFolder';
import { FOLDER_COLORS } from '../constants';
import type { ChatConversation, ChatFolderData } from '../types';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: ChatSidebar
// Linke Sidebar mit Chat-History und Ordnern
// --------------------------------------------

export function ChatSidebar() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const conversations = useChatStore((state) => state.conversations);
  const folders = useChatStore((state) => state.folders);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const createConversation = useChatStore((state) => state.createConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const createFolder = useChatStore((state) => state.createFolder);
  const moveConversationToFolder = useChatStore((state) => state.moveConversationToFolder);

  // Theme-Styles
  const { surface, button, accentColor, textColor, designStyle } = useThemeStyles();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Konversationen ohne Ordner
  const conversationsWithoutFolder = useMemo(() => {
    return conversations.filter(conv => !conv.folderId);
  }, [conversations]);

  // Konversationen nach Ordner gruppieren
  const conversationsByFolder = useMemo(() => {
    const grouped: Record<string, ChatConversation[]> = {};
    folders.forEach(folder => {
      grouped[folder.id] = conversations.filter(conv => conv.folderId === folder.id);
    });
    return grouped;
  }, [conversations, folders]);

  // Ordner expandieren/kollabieren
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Neuen Ordner erstellen
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
      createFolder(newFolderName.trim(), color);
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
  };

  // Konversation in Ordner verschieben
  const handleMoveToFolder = (conversationId: string, folderId: string | null) => {
    moveConversationToFolder(conversationId, folderId);
  };

  return (
    <div 
      className="flex h-full w-80 flex-col"
      style={{
        ...surface.base,
        borderRadius: 0,
        borderRight: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* ----------------------------------------
          Header mit "New Chat" Button
          ---------------------------------------- */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={() => createConversation()}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-colors"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
          }}
        >
          <Plus className="h-4 w-4" />
          Neuer Chat
        </button>
      </div>

      {/* ----------------------------------------
          Scrollbarer Content-Bereich
          ---------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Ordner-Sektion */}
        {folders.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Ordner
              </h3>
              <button
                onClick={() => setShowNewFolderDialog(true)}
                className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
                title="Neuer Ordner"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>

            {/* Ordner-Liste */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <ChatFolder
                  key={folder.id}
                  folder={folder}
                  isExpanded={expandedFolders.has(folder.id)}
                  onToggle={() => toggleFolder(folder.id)}
                />
              ))}
            </div>

            {/* Konversationen in Ordnern */}
            {folders.map((folder) => {
              if (!expandedFolders.has(folder.id)) return null;
              const folderConversations = conversationsByFolder[folder.id] || [];
              
              return (
                <div key={folder.id} className="ml-6 mt-1 space-y-1">
                  {folderConversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => setActiveConversation(conv.id)}
                      onDelete={() => deleteConversation(conv.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Konversationen ohne Ordner */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            {folders.length > 0 ? 'Weitere Chats' : 'Chats'}
          </h3>
          
          <div className="space-y-1">
            {conversationsWithoutFolder.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={() => setActiveConversation(conv.id)}
                onDelete={() => deleteConversation(conv.id)}
                onMoveToFolder={(folderId) => handleMoveToFolder(conv.id, folderId)}
                folders={folders}
              />
            ))}
          </div>

          {/* Hinweis wenn keine Chats vorhanden */}
          {conversations.length === 0 && (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 mb-3" style={{ color: textColor, opacity: 0.2 }} />
              <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
                Noch keine Chats
              </p>
              <p className="mt-1 text-xs" style={{ color: textColor, opacity: 0.3 }}>
                Erstelle einen neuen Chat um zu beginnen
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------
          Neuer Ordner Dialog
          ---------------------------------------- */}
      <AnimatePresence>
        {showNewFolderDialog && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowNewFolderDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-4 left-4 right-4 z-20 rounded-xl bg-black/90 backdrop-blur-sm border border-white/10 p-4"
            >
              <h4 className="mb-3 text-sm font-medium text-white">Neuer Ordner</h4>
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowNewFolderDialog(false);
                }}
                placeholder="Ordnername..."
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-white/30 mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-600 transition-colors"
                >
                  Erstellen
                </button>
                <button
                  onClick={() => setShowNewFolderDialog(false)}
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/20 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------
// Komponente: ConversationItem
// Ein einzelner Chat-Eintrag in der Sidebar
// --------------------------------------------

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  folders?: ChatFolderData[];
}

function ConversationItem({ 
  conversation, 
  isActive, 
  onSelect, 
  onDelete,
  onMoveToFolder,
  folders = [],
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Zeitstempel formatieren
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return date.toLocaleDateString('de-DE', { weekday: 'short' });
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="group relative">
      <button
        onClick={onSelect}
        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
          isActive
            ? 'bg-white/20 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{conversation.title}</p>
            <p className="text-xs text-white/40">{formatDate(conversation.updatedAt)}</p>
          </div>
        </div>
      </button>

      {/* Menu-Button (nur bei Hover) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {/* Dropdown-Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-8 z-20 w-48 rounded-lg bg-black/90 backdrop-blur-sm border border-white/10 shadow-xl"
            >
              {onMoveToFolder && folders.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase">
                    In Ordner verschieben
                  </div>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        onMoveToFolder(folder.id);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: folder.color || '#3b82f6' }}
                      />
                      {folder.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      onMoveToFolder(null);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
                  >
                    Kein Ordner
                  </button>
                  <div className="my-1 h-px bg-white/10" />
                </>
              )}
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

