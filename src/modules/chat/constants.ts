// ============================================
// constants.ts - Konstanten für Chat-Modul
// 
// Zweck: Definiert Standardwerte und Konfigurationen
//        für das Chat-Modul
// Verwendet von: store.ts, ChatPage.tsx
// ============================================

import type { Module } from '@/types';

// --------------------------------------------
// Standard-Ordner-Farben
// Vordefinierte Farben für Ordner
// --------------------------------------------

export const FOLDER_COLORS = [
  '#3b82f6', // Blau
  '#8b5cf6', // Lila
  '#ec4899', // Pink
  '#f59e0b', // Orange
  '#10b981', // Grün
  '#ef4444', // Rot
  '#6366f1', // Indigo
  '#14b8a6', // Türkis
];

// --------------------------------------------
// Maximale Anzahl von Konversationen
// Verhindert dass zu viele Chats gespeichert werden
// --------------------------------------------

export const MAX_CONVERSATIONS = 100;

// --------------------------------------------
// Maximale Anzahl von Nachrichten pro Konversation
// Ältere Nachrichten werden nicht gelöscht, aber limitiert
// --------------------------------------------

export const MAX_MESSAGES_PER_CONVERSATION = 1000;

// --------------------------------------------
// Standard-Titel für neue Konversationen
// Wird verwendet bis die erste Nachricht gesendet wurde
// --------------------------------------------

export const DEFAULT_CONVERSATION_TITLE = 'Neuer Chat';

// --------------------------------------------
// Chat Modul Info
// Metadaten für die Modul-Registry
// --------------------------------------------

export const CHAT_MODULE_INFO: Omit<Module, 'tools' | 'widgets' | 'isActive' | 'order'> & { color: string } = {
  id: 'chat',
  name: 'Chat',
  description: 'KI-Assistent mit Chat-History und Ordner-System',
  version: '1.0.0',
  icon: 'MessageSquare',
  category: 'system',
  author: 'LifeOS',
  color: '#EC4899',  // Pink - für Agent Orb und Widgets
};











