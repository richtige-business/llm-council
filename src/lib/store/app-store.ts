import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import '@/lib/utils/safe-id';
import { DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';
import type { AgentToolCall } from '@/lib/agent/types';
import type { AttachedFile, AttachedImage } from '@/modules/agents/types';
import { stripTransientAttachmentFieldsFromMessages } from '@/modules/agents/lib/chat-attachments';

// ============================================
// App Store - Global Application State
// ============================================

// --------------------------------------------
// Widget-Position Interface
// Speichert Position und Größe jedes Widgets
// --------------------------------------------

export interface WidgetPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// --------------------------------------------
// Greeting Settings Interface
// Einstellungen für den Begrüßungsblock im Dashboard
// Position und Größe wie bei Widgets (Drag & Resize)
// --------------------------------------------

export interface GreetingSettings {
  // Position und Größe (wie Widgets)
  x: number;
  y: number;
  width: number;
  height: number;
  // Schriftart
  fontFamily: string;
  // Fragesatz
  questionText: string;
  // Separate Textfarbe für Begrüßung (überschreibt globale textColor)
  textColor: string;
}

// --------------------------------------------
// Navbar Settings Interface
// Einstellungen für die Quick-Access Navbar
// Größe ist anpassbar, Icons skalieren mit
// --------------------------------------------

export interface NavbarSettings {
  // Größe (horizontal zentriert, daher kein x)
  width: number;
  height: number;
  // Basis-Icon-Größe (wird mit height skaliert)
  baseIconSize: number;
  // Position der Icons: klassische Navbar oben oder freistehend im Dashboard
  iconPlacement: 'navbar' | 'floating';
  // Legacy-Position für alten freistehenden Container (-1 = automatisch berechnen)
  floatingX: number;
  floatingY: number;
  // Legacy-Position für Navbar-Container (-1 = automatisch berechnen)
  navbarX: number;
  navbarY: number;
  // Neue Positionsspeicher:
  // - floatingPositions: einzelne Icon-Positionen pro Kontext (Dashboard/Base)
  // - navbarPositions: Navbar-Position pro Kontext (Dashboard/Base)
  floatingPositions: Record<string, { x: number; y: number }>;
  navbarPositions: Record<string, { x: number; y: number }>;
}

// --------------------------------------------
// User Profile Interface
// Vollständiges Profil wie bei Social Media
// Wird in der Sidebar und auf der Profilseite angezeigt
// --------------------------------------------

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface UserProfile {
  // Anzeigename des Nutzers
  name: string;
  // Avatar-Bild URL (null = Initialen werden angezeigt)
  avatar: string | null;
  // Kurze Bio (max 160 Zeichen, wie bei Twitter)
  bio: string;
  // Online-Status
  status: UserStatus;
}

// Standard-Profil für neue Nutzer
export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'User',
  avatar: null,
  bio: '',
  status: 'online',
};

// Verfügbare Status-Optionen mit Labels und Farben
export const USER_STATUS_OPTIONS: { id: UserStatus; name: string; color: string }[] = [
  { id: 'online', name: 'Online', color: '#22c55e' },
  { id: 'away', name: 'Abwesend', color: '#eab308' },
  { id: 'busy', name: 'Beschäftigt', color: '#ef4444' },
  { id: 'offline', name: 'Offline', color: '#6b7280' },
];

// --------------------------------------------
// Design Style Type
// Verfügbare Design-Stile für die gesamte App
// --------------------------------------------

export type DesignStyle = 'glass' | 'brutal' | 'neo';

// --------------------------------------------
// Design Style Konfigurationen
// Beschreibungen und Vorschau-Farben für jeden Stil
// --------------------------------------------

export const DESIGN_STYLES: { id: DesignStyle; name: string; description: string }[] = [
  { 
    id: 'glass', 
    name: 'Glassmorphism', 
    description: 'Transparente Oberflächen mit Blur-Effekt' 
  },
  { 
    id: 'brutal', 
    name: 'Neo-Brutalism', 
    description: 'Kräftige Farben, harte Kanten und Schatten' 
  },
  { 
    id: 'neo', 
    name: 'Neomorphism', 
    description: 'Weiche, erhöhte Oberflächen mit sanften Schatten' 
  },
];

// --------------------------------------------
// Akzentfarben
// Vordefinierte Akzentfarben zur Auswahl
// --------------------------------------------

export const ACCENT_COLORS = [
  { id: 'blue', name: 'Blau', value: '#0ea5e9' },
  { id: 'purple', name: 'Lila', value: '#8b5cf6' },
  { id: 'pink', name: 'Pink', value: '#ec4899' },
  { id: 'green', name: 'Grün', value: '#22c55e' },
  { id: 'orange', name: 'Orange', value: '#f97316' },
  { id: 'red', name: 'Rot', value: '#ef4444' },
  { id: 'cyan', name: 'Cyan', value: '#06b6d4' },
  { id: 'yellow', name: 'Gelb', value: '#eab308' },
];

// --------------------------------------------
// Oberflächenfarben
// Hintergrundfarben für Container, Widgets, etc.
// --------------------------------------------

export const SURFACE_COLORS = [
  // Glas-Optionen: Neutral (Weiß/Grau/Schwarz)
  { id: 'glass-white', name: 'Glas Weiß', value: 'rgba(255, 255, 255, 0.12)' },
  { id: 'glass-white-strong', name: 'Glas Weiß+', value: 'rgba(255, 255, 255, 0.20)' },
  { id: 'glass-gray', name: 'Glas Grau', value: 'rgba(128, 128, 128, 0.15)' },
  { id: 'glass-dark', name: 'Glas Dunkel', value: 'rgba(0, 0, 0, 0.3)' },
  { id: 'glass-dark-strong', name: 'Glas Dunkel+', value: 'rgba(0, 0, 0, 0.5)' },
  // Glas-Optionen: Blau-Töne
  { id: 'glass-blue', name: 'Glas Blau', value: 'rgba(59, 130, 246, 0.15)' },
  { id: 'glass-blue-strong', name: 'Glas Blau+', value: 'rgba(59, 130, 246, 0.25)' },
  { id: 'glass-cyan', name: 'Glas Cyan', value: 'rgba(6, 182, 212, 0.15)' },
  { id: 'glass-navy', name: 'Glas Navy', value: 'rgba(30, 58, 138, 0.25)' },
  // Glas-Optionen: Lila/Pink-Töne
  { id: 'glass-purple', name: 'Glas Lila', value: 'rgba(139, 92, 246, 0.15)' },
  { id: 'glass-purple-strong', name: 'Glas Lila+', value: 'rgba(139, 92, 246, 0.25)' },
  { id: 'glass-pink', name: 'Glas Pink', value: 'rgba(236, 72, 153, 0.15)' },
  { id: 'glass-rose', name: 'Glas Rose', value: 'rgba(244, 63, 94, 0.15)' },
  // Glas-Optionen: Grün-Töne
  { id: 'glass-green', name: 'Glas Grün', value: 'rgba(34, 197, 94, 0.15)' },
  { id: 'glass-emerald', name: 'Glas Smaragd', value: 'rgba(16, 185, 129, 0.15)' },
  { id: 'glass-teal', name: 'Glas Teal', value: 'rgba(20, 184, 166, 0.15)' },
  // Glas-Optionen: Warm-Töne
  { id: 'glass-orange', name: 'Glas Orange', value: 'rgba(249, 115, 22, 0.15)' },
  { id: 'glass-amber', name: 'Glas Amber', value: 'rgba(245, 158, 11, 0.15)' },
  { id: 'glass-red', name: 'Glas Rot', value: 'rgba(239, 68, 68, 0.15)' },
  // Dunkle Optionen
  { id: 'solid-dark', name: 'Dunkel', value: '#1a1a24' },
  { id: 'solid-darker', name: 'Sehr Dunkel', value: '#0f0f14' },
  { id: 'solid-navy', name: 'Navy', value: '#1e293b' },
  { id: 'solid-slate', name: 'Schiefer', value: '#334155' },
  { id: 'solid-zinc', name: 'Zink', value: '#27272a' },
  { id: 'solid-neutral', name: 'Neutral', value: '#262626' },
  // Pastell-Optionen
  { id: 'pastel-rose', name: 'Pastell Rosa', value: '#fecdd3' },
  { id: 'pastel-blue', name: 'Pastell Blau', value: '#bfdbfe' },
  { id: 'pastel-green', name: 'Pastell Grün', value: '#bbf7d0' },
  { id: 'pastel-purple', name: 'Pastell Lila', value: '#ddd6fe' },
  { id: 'pastel-yellow', name: 'Pastell Gelb', value: '#fef08a' },
  { id: 'pastel-mint', name: 'Pastell Mint', value: '#a7f3d0' },
  // Creme/Beige-Optionen
  { id: 'cream-light', name: 'Creme Hell', value: '#faf7f2' },
  { id: 'cream-warm', name: 'Creme Warm', value: '#f5f0e6' },
  { id: 'cream-beige', name: 'Beige', value: '#e8dcc8' },
  { id: 'cream-sand', name: 'Sand', value: '#d4c4a8' },
  { id: 'cream-ivory', name: 'Elfenbein', value: '#fffff0' },
  { id: 'cream-linen', name: 'Leinen', value: '#faf0e6' },
];

// --------------------------------------------
// Textfarben
// Vordefinierte Textfarben zur Auswahl
// --------------------------------------------

export const TEXT_COLORS = [
  // Helle Farben (für dunkle Hintergründe)
  { id: 'white', name: 'Weiß', value: '#ffffff' },
  { id: 'snow', name: 'Schnee', value: '#f8fafc' },
  { id: 'light-gray', name: 'Hellgrau', value: '#e5e5e5' },
  { id: 'silver', name: 'Silber', value: '#d4d4d8' },
  { id: 'gray', name: 'Grau', value: '#a1a1aa' },
  // Warme Töne
  { id: 'warm-white', name: 'Warmweiß', value: '#fef3c7' },
  { id: 'cream', name: 'Creme', value: '#fef9e7' },
  { id: 'peach', name: 'Pfirsich', value: '#fed7aa' },
  // Kühle Töne
  { id: 'cool-white', name: 'Kaltweiß', value: '#e0f2fe' },
  { id: 'ice-blue', name: 'Eisblau', value: '#bae6fd' },
  { id: 'lavender', name: 'Lavendel', value: '#e9d5ff' },
  { id: 'mint', name: 'Mint', value: '#a7f3d0' },
  // Dunkle Farben (für helle Hintergründe)
  { id: 'charcoal', name: 'Anthrazit', value: '#374151' },
  { id: 'dark-gray', name: 'Dunkelgrau', value: '#4b5563' },
  { id: 'slate', name: 'Schiefer', value: '#475569' },
  { id: 'black', name: 'Schwarz', value: '#1f2937' },
  { id: 'deep-black', name: 'Tiefschwarz', value: '#0f172a' },
];

// --------------------------------------------
// Schriftarten
// Verfügbare Schriftarten für die gesamte App
// --------------------------------------------

export const APP_FONTS = [
  { id: 'system', name: 'System (Standard)', value: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'inter', name: 'Inter', value: '"Inter", sans-serif' },
  { id: 'roboto', name: 'Roboto', value: '"Roboto", sans-serif' },
  { id: 'poppins', name: 'Poppins', value: '"Poppins", sans-serif' },
  { id: 'nunito', name: 'Nunito', value: '"Nunito", sans-serif' },
  { id: 'mono', name: 'Monospace', value: 'ui-monospace, monospace' },
];

// --------------------------------------------
// Einfarbige Hintergründe
// Solid-Color Backgrounds als Alternative zu Bildern
// --------------------------------------------

export const SOLID_BACKGROUNDS = [
  { id: 'solid-black', name: 'Schwarz', value: '#000000' },
  { id: 'solid-charcoal', name: 'Anthrazit', value: '#1a1a1a' },
  { id: 'solid-dark-gray', name: 'Dunkelgrau', value: '#2d2d2d' },
  { id: 'solid-slate', name: 'Schiefer', value: '#1e293b' },
  { id: 'solid-navy', name: 'Navy', value: '#0f172a' },
  { id: 'solid-dark-purple', name: 'Dunkellila', value: '#1e1b4b' },
  { id: 'solid-dark-blue', name: 'Dunkelblau', value: '#172554' },
  { id: 'solid-dark-green', name: 'Dunkelgrün', value: '#14532d' },
];

// --------------------------------------------
// Verfügbare Schriftarten für die Begrüßung
// --------------------------------------------

export const GREETING_FONTS = [
  { id: 'system', name: 'System (Standard)', value: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'playfair', name: 'Playfair Display', value: '"Playfair Display", Georgia, serif' },
  { id: 'inter', name: 'Inter', value: '"Inter", sans-serif' },
  { id: 'source-serif', name: 'Source Serif', value: '"Source Serif Pro", Georgia, serif' },
  { id: 'jetbrains', name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { id: 'crimson', name: 'Crimson Text', value: '"Crimson Text", Georgia, serif' },
];

// --------------------------------------------
// Vorgeschlagene Fragesätze
// --------------------------------------------

export const QUESTION_SUGGESTIONS = [
  'Was möchtest du heute erreichen?',
  'Worauf konzentrierst du dich heute?',
  'Was steht heute an?',
  'Wie kann ich dir helfen?',
  'Welches Projekt steht an?',
  'Was hast du heute vor?',
  'Bereit für einen produktiven Tag?',
];

// --------------------------------------------
// Standard-Widget-Positionen
// Initiale Positionen für die Widgets
// --------------------------------------------

export const DEFAULT_WIDGET_POSITIONS: Record<string, WidgetPosition> = {
  // Kalender-Widgets
  'upcoming-events': { id: 'upcoming-events', x: 50, y: 50, width: 320, height: 280 },
  'mini-calendar': { id: 'mini-calendar', x: 400, y: 50, width: 280, height: 320 },
  // Postfach-Widgets
  'inbox-unread': { id: 'inbox-unread', x: 50, y: 360, width: 320, height: 200 },
  'inbox-recent': { id: 'inbox-recent', x: 400, y: 400, width: 350, height: 300 },
  // Agent-Widgets (für Dashboard)
  'agent-calendar': { id: 'agent-calendar', x: 750, y: 50, width: 180, height: 200 },
  'agent-inbox': { id: 'agent-inbox', x: 950, y: 50, width: 180, height: 200 },
  'agent-lab': { id: 'agent-lab', x: 750, y: 270, width: 180, height: 200 },
  'agent-agents': { id: 'agent-agents', x: 950, y: 270, width: 180, height: 200 },
  'agent-chat': { id: 'agent-chat', x: 750, y: 490, width: 180, height: 200 },
};

// --------------------------------------------
// Tab Window Interface
// Ein Fenster kann mehrere Tabs enthalten (wie Safari)
// --------------------------------------------

export interface WindowTab {
  id: string;
  moduleId: string;
  title: string;
}

export interface TabWindow {
  id: string;
  tabs: WindowTab[];           // Mehrere Tabs pro Fenster
  activeTabIndex: number;      // Welcher Tab ist aktiv
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  
  // Legacy - für Kompatibilität
  moduleId: string;            // Aktives Modul (tabs[activeTabIndex].moduleId)
  title: string;               // Aktiver Titel (tabs[activeTabIndex].title)
}

interface AppState {
  // Sidebar State
  sidebarOpen: boolean;
  sidebarModules: string[]; // Array von Module-IDs die in der Sidebar sichtbar sind
  homeNavbarModules: string[]; // Nur zusaetzliche Home-Navbar-Module (ohne die 3 Standards)
  
  // Navigation State
  activeModuleId: string | null;
  activeToolId: string | null;
  
  // Theme & Appearance
  locale: AppLocale;
  theme: 'dark' | 'light' | 'system';
  designStyle: DesignStyle;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  buttonTextColor: string; // Separate Farbe für Button-Icons und Button-Text
  appFont: string;
  backgroundImage: string;
  backgroundType: 'image' | 'solid';
  solidBackground: string;
  
  // Chat State
  chatOpen: boolean;
  chatTabs: ChatTab[]; // Alle offenen Chat-Tabs
  activeChatTabId: string | null; // Aktiver Chat-Tab
  
  // Legacy (für Kompatibilität)
  chatMessages: ChatMessage[];
  activeChatModuleId: string;
  
  // Intelligence Orb
  hideIntelligenceOrb: boolean; // Wird vom Module Builder gesetzt bei Preview-Vollbild
  
  // User Profile (erweitert)
  userProfile: UserProfile;
  // Legacy - für Kompatibilität mit altem Code
  userName: string;
  
  // Dashboard Widgets
  widgetPositions: Record<string, WidgetPosition>;
  activeWidgets: string[];
  
  // Dashboard Greeting Settings
  greetingSettings: GreetingSettings;
  
  // Dashboard Navbar Settings (Quick-Access Icons)
  navbarSettings: NavbarSettings;
  
  // Tab System
  openTabs: TabWindow[];
  tabBackground: string;
  activeTabId: string | null;
  nextZIndex: number;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
      setSidebarModules: (modules: string[]) => void;
      toggleSidebarModule: (moduleId: string) => void;
      addSidebarModule: (moduleId: string) => void;
      removeSidebarModule: (moduleId: string) => void;
      setHomeNavbarModules: (modules: string[]) => void;
      toggleHomeNavbarModule: (moduleId: string) => void;
      addHomeNavbarModule: (moduleId: string) => void;
      removeHomeNavbarModule: (moduleId: string) => void;
  setActiveModule: (moduleId: string | null) => void;
  setActiveTool: (toolId: string | null) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setLocale: (locale: AppLocale) => void;
  setDesignStyle: (style: DesignStyle) => void;
  setAccentColor: (color: string) => void;
  setSurfaceColor: (color: string) => void;
  setTextColor: (color: string) => void;
  setButtonTextColor: (color: string) => void;
  setAppFont: (font: string) => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundType: (type: 'image' | 'solid') => void;
  setSolidBackground: (color: string) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  // Chat Tab Actions
  openChatTab: (moduleId: string) => void; // Öffnet oder wechselt zu einem Chat-Tab
  ensureChatTabExists: (moduleId: string) => void; // Erstellt Tab ohne Chat zu öffnen
  switchToModuleAgent: (moduleId: string) => void; // Wechselt zum Agent OHNE Chat zu öffnen
  closeChatTab: (tabId: string) => void; // Schließt einen Chat-Tab
  setActiveChatTab: (tabId: string) => void; // Wechselt zum Chat-Tab
  addMessageToTab: (tabId: string, message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string }) => void;
  updateMessageInTab: (tabId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  setTabAgentsConversationId: (tabId: string, conversationId?: string) => void;
  truncateTabMessages: (tabId: string, keepCount: number) => void;
  clearTabMessages: (tabId: string) => void;
  // Legacy (für Kompatibilität)
  setActiveChatModule: (moduleId: string) => void;
  openChatWithModule: (moduleId: string) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatMessages: () => void;
  setHideIntelligenceOrb: (hide: boolean) => void;
  // User Profile Actions
  setUserProfile: (profile: Partial<UserProfile>) => void;
  setUserAvatar: (avatar: string | null) => void;
  setUserBio: (bio: string) => void;
  setUserStatus: (status: UserStatus) => void;
  // Legacy - setzt auch userProfile.name
  setUserName: (name: string) => void;
  setWidgetPositions: (positions: Record<string, WidgetPosition>) => void;
  updateWidgetPosition: (widgetId: string, position: Partial<WidgetPosition>) => void;
  setActiveWidgets: (widgets: string[]) => void;
  toggleWidget: (widgetId: string) => void;
  // Greeting Actions
  updateGreetingSettings: (settings: Partial<GreetingSettings>) => void;
  // Navbar Actions
  updateNavbarSettings: (settings: Partial<NavbarSettings>) => void;
  // Tab Actions
  openTab: (moduleId: string, title?: string) => void;
  addTabToWindow: (windowId: string, moduleId: string) => void; // Tab zu bestehendem Fenster hinzufügen
  switchTabInWindow: (windowId: string, tabIndex: number) => void; // Zwischen Tabs wechseln
  closeTabInWindow: (windowId: string, tabIndex: number) => void; // Einzelnen Tab schließen
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void; // Alle Tabs schließen
  minimizeTab: (tabId: string) => void;
  maximizeTab: (tabId: string) => void;
  restoreTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabPosition: (tabId: string, position: { x: number; y: number }) => void;
  updateTabSize: (tabId: string, size: { width: number; height: number }) => void;
  setTabBackground: (color: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: AttachedImage[];
  files?: AttachedFile[];
  toolCalls?: AgentToolCall[];
  reasoning?: string;
  isStreaming?: boolean;
}

// --------------------------------------------
// Chat Tab Interface
// Jeder Tab hat eigene Nachrichten
// --------------------------------------------

export interface ChatTab {
  id: string;
  moduleId: string;
  messages: ChatMessage[];
  agentsConversationId?: string;
}

// Default backgrounds
export const defaultBackgrounds = [
  {
    id: 'mountains-lake',
    name: 'Bergsee',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
  {
    id: 'northern-lights',
    name: 'Nordlichter',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80',
  },
  {
    id: 'forest-mist',
    name: 'Nebelwald',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
  },
  {
    id: 'ocean-sunset',
    name: 'Ozean Sonnenuntergang',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
  },
  {
    id: 'city-night',
    name: 'Stadt bei Nacht',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80',
  },
  {
    id: 'desert-dunes',
    name: 'Wüstendünen',
    url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80',
  },
];

// --------------------------------------------
// Standard Greeting Settings
// Initiale Werte für den Begrüßungsblock
// Zentriert, unter den Quick-Links (y: 200 = nach Quick-Links Bereich)
// --------------------------------------------

export const DEFAULT_GREETING_SETTINGS: GreetingSettings = {
  x: -1, // -1 bedeutet "automatisch zentriert" (wird dynamisch berechnet)
  y: 180, // Unter den Quick-Links
  width: 420,
  height: 95, // Kompakte Höhe, eng an der Schrift (Verhältnis ca. 4.4:1)
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  questionText: 'Was möchtest du heute erreichen?',
  textColor: '#ffffff', // Standard: Weiß
};

// --------------------------------------------
// Standard Navbar Settings
// Initiale Werte für die Quick-Access Navbar
// --------------------------------------------

export const DEFAULT_NAVBAR_SETTINGS: NavbarSettings = {
  width: 280, // Initiale Breite
  height: 56, // Initiale Höhe (Icons + Padding)
  baseIconSize: 40, // Basis-Icon-Größe
  iconPlacement: 'navbar',
  floatingX: -1,
  floatingY: -1,
  navbarX: -1,
  navbarY: -1,
  floatingPositions: {},
  navbarPositions: {},
};

// --------------------------------------------
// Persist-Migration: entfernt das geloeschte Modul desktop-runner
// aus Sidebar, offenen Fenstern und aktiver Modulwahl.
// --------------------------------------------

function migrateStripDesktopRunnerModule(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== 'object') return persisted;
  const s = persisted as Record<string, unknown>;

  if (Array.isArray(s.sidebarModules)) {
    s.sidebarModules = (s.sidebarModules as string[]).filter((id) => id !== 'desktop-runner');
  }

  if (Array.isArray(s.openTabs)) {
    const cleaned: TabWindow[] = (s.openTabs as TabWindow[])
      .map((win) => {
        const tabs = (win.tabs || []).filter((t) => t.moduleId !== 'desktop-runner');
        if (tabs.length === 0) return null;
        const idx = Math.min(Math.max(0, win.activeTabIndex ?? 0), tabs.length - 1);
        const active = tabs[idx];
        return {
          ...win,
          tabs,
          activeTabIndex: idx,
          moduleId: active.moduleId,
          title: active.title,
        };
      })
      .filter((w): w is TabWindow => w !== null);

    s.openTabs = cleaned;

    if (typeof s.activeTabId === 'string') {
      const stillThere = cleaned.some((w) => w.id === s.activeTabId);
      if (!stillThere) {
        s.activeTabId = cleaned[0]?.id ?? null;
      }
    }
  }

  if (s.activeModuleId === 'desktop-runner') {
    s.activeModuleId = null;
  }

  return persisted;
}

function sanitizePersistedChatTabs(chatTabs: ChatTab[] | undefined): ChatTab[] {
  return (chatTabs || []).map((tab) => ({
    ...tab,
    messages: stripTransientAttachmentFieldsFromMessages((tab.messages || []).slice(-50)).map((message) => ({
      ...message,
      isStreaming: false,
    })),
    agentsConversationId: tab.agentsConversationId || undefined,
  }));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      sidebarOpen: false,
      sidebarModules: ['calendar', 'inbox', 'browser'], // Default: Built-in Module
      homeNavbarModules: [],
      activeModuleId: null,
      activeToolId: null,
      locale: DEFAULT_LOCALE,
      theme: 'dark',
      designStyle: 'neo',
      accentColor: '#4f8cff',
      surfaceColor: '#10233f',
      textColor: '#f5f9ff',
      buttonTextColor: '#ffffff', // Standard: Weiß für Button-Icons
      appFont: 'ui-sans-serif, system-ui, sans-serif',
      backgroundImage: '/system-wallpapers/council-dusk.svg',
      backgroundType: 'image',
      solidBackground: '#081120',
      chatOpen: false,
      chatTabs: [], // Persistente Chat-Tabs
      activeChatTabId: null,
      // Legacy
      chatMessages: [],
      activeChatModuleId: 'master',
      hideIntelligenceOrb: false,
      userProfile: DEFAULT_USER_PROFILE,
      userName: 'User', // Legacy
      widgetPositions: DEFAULT_WIDGET_POSITIONS,
      activeWidgets: [],
      greetingSettings: DEFAULT_GREETING_SETTINGS,
      navbarSettings: DEFAULT_NAVBAR_SETTINGS,
      openTabs: [],
      tabBackground: 'rgba(20, 20, 28, 0.95)',
      activeTabId: null,
      nextZIndex: 1000,
      
      // Actions
      toggleSidebar: () => 
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (open) => 
        set({ sidebarOpen: open }),
      
      setSidebarModules: (modules) =>
        set({ sidebarModules: modules }),
      
      toggleSidebarModule: (moduleId) =>
        set((state) => ({
          sidebarModules: state.sidebarModules.includes(moduleId)
            ? state.sidebarModules.filter(id => id !== moduleId)
            : [...state.sidebarModules, moduleId],
        })),
      
      addSidebarModule: (moduleId) =>
        set((state) => ({
          sidebarModules: state.sidebarModules.includes(moduleId)
            ? state.sidebarModules
            : [...state.sidebarModules, moduleId],
        })),
      
      removeSidebarModule: (moduleId) =>
        set((state) => ({
          sidebarModules: state.sidebarModules.filter(id => id !== moduleId),
        })),

      // --------------------------------------------
      // Home Navbar Actions
      // Nur fuer das Hauptdashboard; Base-Dashboards verwalten ihre Navbar selbst
      // --------------------------------------------

      setHomeNavbarModules: (modules) =>
        set({ homeNavbarModules: Array.from(new Set(modules)) }),

      toggleHomeNavbarModule: (moduleId) =>
        set((state) => ({
          homeNavbarModules: state.homeNavbarModules.includes(moduleId)
            ? state.homeNavbarModules.filter((id) => id !== moduleId)
            : [...state.homeNavbarModules, moduleId],
        })),

      addHomeNavbarModule: (moduleId) =>
        set((state) => ({
          homeNavbarModules: state.homeNavbarModules.includes(moduleId)
            ? state.homeNavbarModules
            : [...state.homeNavbarModules, moduleId],
        })),

      removeHomeNavbarModule: (moduleId) =>
        set((state) => ({
          homeNavbarModules: state.homeNavbarModules.filter((id) => id !== moduleId),
        })),
      
      setActiveModule: (moduleId) => 
        set({ activeModuleId: moduleId, activeToolId: null }),
      
      setActiveTool: (toolId) => 
        set({ activeToolId: toolId }),
      
      setTheme: (theme) => 
        set({ theme }),

      setLocale: (locale) =>
        set({ locale }),
      
      setDesignStyle: (style) => 
        set({ designStyle: style }),
      
      setAccentColor: (color) => 
        set({ accentColor: color }),
      
      setSurfaceColor: (color) => 
        set({ surfaceColor: color }),
      
      setTextColor: (color) => 
        set({ textColor: color }),
      
      setButtonTextColor: (color) =>
        set({ buttonTextColor: color }),
      
      setAppFont: (font) => 
        set({ appFont: font }),
      
      setBackgroundImage: (url) => 
        set({ backgroundImage: url }),
      
      setBackgroundType: (type) => 
        set({ backgroundType: type }),
      
      setSolidBackground: (color) => 
        set({ solidBackground: color }),
      
      toggleChat: () => 
        set((state) => ({ chatOpen: !state.chatOpen })),
      
      setChatOpen: (open) => 
        set({ chatOpen: open }),
      
      // --------------------------------------------
      // Chat Tab Actions
      // --------------------------------------------
      
      openChatTab: (moduleId) => {
        const state = get();
        // Prüfen ob Tab für dieses Modul bereits existiert
        const existingTab = state.chatTabs.find(t => t.moduleId === moduleId);
        
        if (existingTab) {
          // Tab existiert - aktivieren
          set({ 
            chatOpen: true,
            activeChatTabId: existingTab.id,
            activeChatModuleId: moduleId,
          });
        } else {
          // Neuen Tab erstellen
          const newTab: ChatTab = {
            id: crypto.randomUUID(),
            moduleId,
            messages: [],
          };
          set({
            chatOpen: true,
            chatTabs: [...state.chatTabs, newTab],
            activeChatTabId: newTab.id,
            activeChatModuleId: moduleId,
          });
        }
      },
      
      // Erstellt einen Tab falls er nicht existiert, OHNE den Chat zu öffnen
      // Wird beim App-Start verwendet um sicherzustellen dass der Master-Tab existiert
      ensureChatTabExists: (moduleId) => {
        const state = get();
        const existingTab = state.chatTabs.find(t => t.moduleId === moduleId);
        
        if (!existingTab) {
          // Tab existiert nicht -> erstellen (aber Chat NICHT öffnen)
          const newTab: ChatTab = {
            id: crypto.randomUUID(),
            moduleId,
            messages: [],
          };
          set({
            chatTabs: [...state.chatTabs, newTab],
            // Setze als aktiven Tab nur wenn noch kein aktiver Tab existiert
            activeChatTabId: state.activeChatTabId || newTab.id,
            activeChatModuleId: state.activeChatTabId ? state.activeChatModuleId : moduleId,
          });
        }
      },
      
      // ----------------------------------------
      // Wechselt zum Agent für ein Modul OHNE den Chat zu öffnen
      // Erstellt den Tab falls nötig, setzt ihn als aktiv
      // Wird bei Modul-Navigation verwendet (Orb zeigt immer aktuellen Agent)
      // ----------------------------------------
      switchToModuleAgent: (moduleId) => {
        const state = get();
        const existingTab = state.chatTabs.find(t => t.moduleId === moduleId);
        
        if (existingTab) {
          // Tab existiert - nur aktivieren (NICHT chatOpen ändern!)
          set({ 
            activeChatTabId: existingTab.id,
            activeChatModuleId: moduleId,
          });
        } else {
          // Neuen Tab erstellen und aktivieren (aber Chat NICHT öffnen)
          const newTab: ChatTab = {
            id: crypto.randomUUID(),
            moduleId,
            messages: [],
          };
          set({
            chatTabs: [...state.chatTabs, newTab],
            activeChatTabId: newTab.id,
            activeChatModuleId: moduleId,
            // chatOpen bleibt unverändert!
          });
        }
      },
      
      closeChatTab: (tabId) => {
        const state = get();
        const newTabs = state.chatTabs.filter(t => t.id !== tabId);
        
        // Wenn aktiver Tab geschlossen wird, wechsle zum letzten oder null
        let newActiveId = state.activeChatTabId;
        let newActiveModule = state.activeChatModuleId;
        
        if (state.activeChatTabId === tabId) {
          if (newTabs.length > 0) {
            const lastTab = newTabs[newTabs.length - 1];
            newActiveId = lastTab.id;
            newActiveModule = lastTab.moduleId;
          } else {
            newActiveId = null;
            newActiveModule = 'master';
          }
        }
        
        set({
          chatTabs: newTabs,
          activeChatTabId: newActiveId,
          activeChatModuleId: newActiveModule,
        });
      },
      
      setActiveChatTab: (tabId) => {
        const state = get();
        const tab = state.chatTabs.find(t => t.id === tabId);
        if (tab) {
          set({
            activeChatTabId: tabId,
            activeChatModuleId: tab.moduleId,
          });
        }
      },

      setTabAgentsConversationId: (tabId, conversationId) => {
        set((state) => ({
          chatTabs: state.chatTabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  agentsConversationId: conversationId || undefined,
                }
              : tab
          ),
        }));
      },
      
      addMessageToTab: (tabId, message) => {
        set((state) => ({
          chatTabs: state.chatTabs.map(tab => {
            if (tab.id !== tabId) return tab;
            return {
              ...tab,
              messages: [
                ...tab.messages,
                {
                  ...message,
                  id: message.id || crypto.randomUUID(),
                  timestamp: Date.now(),
                },
              ],
            };
          }),
        }));
      },

      updateMessageInTab: (tabId, messageId, updates) => {
        set((state) => ({
          chatTabs: state.chatTabs.map((tab) => {
            if (tab.id !== tabId) return tab;
            return {
              ...tab,
              messages: tab.messages.map((message) =>
                message.id === messageId
                  ? { ...message, ...updates }
                  : message
              ),
            };
          }),
        }));
      },

      // ----------------------------------------
      // Chat-Tab-Nachrichten kuerzen
      // Wird fuer Edit/Regenerate genutzt, damit
      // ungueltig gewordene Folgeantworten verschwinden.
      // ----------------------------------------
      truncateTabMessages: (tabId, keepCount) => {
        set((state) => ({
          chatTabs: state.chatTabs.map(tab => {
            if (tab.id !== tabId) return tab;
            return {
              ...tab,
              messages: tab.messages.slice(0, Math.max(0, keepCount)),
            };
          }),
        }));
      },
      
      clearTabMessages: (tabId) => {
        set((state) => ({
          chatTabs: state.chatTabs.map(tab => {
            if (tab.id !== tabId) return tab;
            return { ...tab, messages: [] };
          }),
        }));
      },
      
      // Legacy Actions (für Kompatibilität)
      setActiveChatModule: (moduleId) =>
        set({ activeChatModuleId: moduleId }),
      
      openChatWithModule: (moduleId) => {
        // Verwende neues Tab-System
        get().openChatTab(moduleId);
      },
      
      addChatMessage: (message) => 
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              ...message,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
          ],
        })),
      
      clearChatMessages: () => 
        set({ chatMessages: [] }),
      
      setHideIntelligenceOrb: (hide) =>
        set({ hideIntelligenceOrb: hide }),
      
      // --------------------------------------------
      // User Profile Actions
      // Verwaltet das vollständige Nutzerprofil
      // --------------------------------------------
      
      setUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
          // Sync userName für Legacy-Kompatibilität
          userName: profile.name ?? state.userProfile.name,
        })),
      
      setUserAvatar: (avatar) =>
        set((state) => ({
          userProfile: { ...state.userProfile, avatar },
        })),
      
      setUserBio: (bio) =>
        set((state) => ({
          userProfile: { ...state.userProfile, bio },
        })),
      
      setUserStatus: (status) =>
        set((state) => ({
          userProfile: { ...state.userProfile, status },
        })),
      
      // Legacy - setzt auch userProfile.name
      setUserName: (name) => 
        set((state) => ({ 
          userName: name,
          userProfile: { ...state.userProfile, name },
        })),
      
      // Widget Actions
      setWidgetPositions: (positions) => 
        set({ widgetPositions: positions }),
      
      updateWidgetPosition: (widgetId, position) => 
        set((state) => ({
          widgetPositions: {
            ...state.widgetPositions,
            [widgetId]: {
              ...state.widgetPositions[widgetId],
              ...position,
              id: widgetId, // Ensure ID is always set
            },
          },
        })),
      
      setActiveWidgets: (widgets) => 
        set({ activeWidgets: widgets }),
      
      toggleWidget: (widgetId) => 
        set((state) => ({
          activeWidgets: state.activeWidgets.includes(widgetId)
            ? state.activeWidgets.filter(id => id !== widgetId)
            : [...state.activeWidgets, widgetId],
        })),
      
      // Greeting Actions
      updateGreetingSettings: (settings) =>
        set((state) => ({
          greetingSettings: {
            ...state.greetingSettings,
            ...settings,
          },
        })),
      
      // Navbar Actions
      updateNavbarSettings: (settings) =>
        set((state) => ({
          navbarSettings: {
            ...state.navbarSettings,
            ...settings,
          },
        })),
      
      // Tab Actions
      openTab: (moduleId, title) => {
        const state = get();
        const tabTitle = title || '';

        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const sidePadding = 28;
        const topOffset = 68; // noch naeher an die Navbar
        const topGap = 4;
        const bottomOffset = 92; // Platz zum Orb, aber deutlich mehr Hoehe
        const availableWidth = Math.max(400, viewportWidth - sidePadding * 2);
        const availableHeight = Math.max(320, viewportHeight - topOffset - topGap - bottomOffset);
        const targetRatio = 16 / 9;

        let normalizedWidth = availableWidth;
        let normalizedHeight = normalizedWidth / targetRatio;

        if (normalizedHeight > availableHeight) {
          normalizedHeight = availableHeight;
          normalizedWidth = normalizedHeight * targetRatio;
        }

        normalizedWidth = Math.round(Math.max(400, normalizedWidth));
        normalizedHeight = Math.round(Math.max(320, normalizedHeight));
        const normalizedX = Math.round((viewportWidth - normalizedWidth) / 2);
        const normalizedY = topOffset + topGap;
        
        // Prüfen ob Modul bereits in einem Tab offen ist
        const existingWindow = state.openTabs.find(win => 
          win.tabs?.some(t => t.moduleId === moduleId) && !win.isMinimized
        );
        if (existingWindow) {
          // Fenster aktivieren und zum richtigen Tab wechseln
          const tabIndex = existingWindow.tabs.findIndex(t => t.moduleId === moduleId);
          set({ 
            activeTabId: existingWindow.id,
            openTabs: state.openTabs.map(win => 
              win.id === existingWindow.id 
                ? {
                    ...win,
                    activeTabIndex: tabIndex,
                    moduleId,
                    title: tabTitle,
                    position: { x: normalizedX, y: normalizedY },
                    size: { width: normalizedWidth, height: normalizedHeight },
                  }
                : win
            ),
          });
          return;
        }

        // Erstes Tab im neuen Fenster
        const firstTab: WindowTab = {
          id: crypto.randomUUID(),
          moduleId,
          title: tabTitle,
        };

        // Neues Fenster erstellen (nicht maximiert fuer Resizing)
        const newWindow: TabWindow = {
          id: crypto.randomUUID(),
          tabs: [firstTab],
          activeTabIndex: 0,
          position: { x: normalizedX, y: normalizedY },
          size: { width: normalizedWidth, height: normalizedHeight },
          isMinimized: false,
          isMaximized: false,
          zIndex: state.nextZIndex,
          // Legacy
          moduleId,
          title: tabTitle,
        };
        
        set({
          openTabs: [...state.openTabs, newWindow],
          activeTabId: newWindow.id,
          nextZIndex: state.nextZIndex + 1,
        });
      },
      
      // Tab zu bestehendem Fenster hinzufügen
      addTabToWindow: (windowId, moduleId) => {
        const state = get();
        const newTab: WindowTab = {
          id: crypto.randomUUID(),
          moduleId,
          title: '',
        };
        
        set({
          openTabs: state.openTabs.map(win => {
            if (win.id !== windowId) return win;
            const newTabs = [...(win.tabs || []), newTab];
            return {
              ...win,
              tabs: newTabs,
              activeTabIndex: newTabs.length - 1,
              moduleId, // Aktives Modul aktualisieren
              title: '',
            };
          }),
        });
      },
      
      // Zwischen Tabs im Fenster wechseln
      switchTabInWindow: (windowId, tabIndex) => {
        set((state) => ({
          openTabs: state.openTabs.map(win => {
            if (win.id !== windowId) return win;
            const tab = win.tabs?.[tabIndex];
            if (!tab) return win;
            return {
              ...win,
              activeTabIndex: tabIndex,
              moduleId: tab.moduleId,
              title: tab.title,
            };
          }),
        }));
      },
      
      // Einzelnen Tab im Fenster schließen
      closeTabInWindow: (windowId, tabIndex) => {
        set((state) => {
          const win = state.openTabs.find(w => w.id === windowId);
          if (!win || !win.tabs) return state;
          
          // Wenn nur ein Tab, schließe das ganze Fenster
          if (win.tabs.length <= 1) {
            const newTabs = state.openTabs.filter(w => w.id !== windowId);
            return {
              openTabs: newTabs,
              activeTabId: newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null,
            };
          }
          
          // Sonst nur den Tab entfernen
          const newTabsList = win.tabs.filter((_, i) => i !== tabIndex);
          const newActiveIndex = Math.min(win.activeTabIndex, newTabsList.length - 1);
          const activeTab = newTabsList[newActiveIndex];
          
          return {
            openTabs: state.openTabs.map(w => {
              if (w.id !== windowId) return w;
              return {
                ...w,
                tabs: newTabsList,
                activeTabIndex: newActiveIndex,
                moduleId: activeTab?.moduleId || '',
                title: activeTab?.title || '',
              };
            }),
          };
        });
      },
      
      closeTab: (tabId) => 
        set((state) => {
          const newTabs = state.openTabs.filter(tab => tab.id !== tabId);
          const newActiveTabId = state.activeTabId === tabId 
            ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
            : state.activeTabId;
          return {
            openTabs: newTabs,
            activeTabId: newActiveTabId,
          };
        }),
      
      closeAllTabs: () => 
        set({ openTabs: [], activeTabId: null }),
      
      minimizeTab: (tabId) => 
        set((state) => ({
          openTabs: state.openTabs.map(tab => 
            tab.id === tabId ? { ...tab, isMinimized: true, isMaximized: false } : tab
          ),
        })),
      
      maximizeTab: (tabId) => 
        set((state) => ({
          openTabs: state.openTabs.map(tab => 
            tab.id === tabId ? { ...tab, isMaximized: true, isMinimized: false } : tab
          ),
        })),
      
      restoreTab: (tabId) => 
        set((state) => ({
          openTabs: state.openTabs.map(tab => 
            tab.id === tabId ? { ...tab, isMaximized: false, isMinimized: false } : tab
          ),
        })),
      
      setActiveTab: (tabId) => {
        const state = get();
        const tab = state.openTabs.find(t => t.id === tabId);
        if (tab) {
          set({
            activeTabId: tabId,
            openTabs: state.openTabs.map(t => 
              t.id === tabId 
                ? { ...t, zIndex: state.nextZIndex, isMinimized: false }
                : t
            ),
            nextZIndex: state.nextZIndex + 1,
          });
        }
      },
      
      updateTabPosition: (tabId, position) => 
        set((state) => ({
          openTabs: state.openTabs.map(tab => 
            tab.id === tabId ? { ...tab, position } : tab
          ),
        })),
      
      updateTabSize: (tabId, size) => 
        set((state) => ({
          openTabs: state.openTabs.map(tab => 
            tab.id === tabId ? { ...tab, size } : tab
          ),
        })),
      
      setTabBackground: (color) => 
        set({ tabBackground: color }),
    }),
    {
      name: 'llm-council-app-state',
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme,
        designStyle: state.designStyle,
        accentColor: state.accentColor,
        surfaceColor: state.surfaceColor,
        textColor: state.textColor,
        appFont: state.appFont,
        backgroundImage: state.backgroundImage,
        backgroundType: state.backgroundType,
        solidBackground: state.solidBackground,
        userProfile: state.userProfile,
        userName: state.userName, // Legacy
        // Chat Tabs persistent speichern (max 50 Nachrichten pro Tab)
        chatTabs: sanitizePersistedChatTabs(state.chatTabs),
        chatMessages: state.chatMessages.slice(-50), // Legacy
        widgetPositions: state.widgetPositions,
        activeWidgets: state.activeWidgets,
        greetingSettings: state.greetingSettings,
        navbarSettings: state.navbarSettings,
        openTabs: state.openTabs,
        tabBackground: state.tabBackground,
        sidebarModules: state.sidebarModules, // Sidebar-Module persistieren
        homeNavbarModules: state.homeNavbarModules,
      }),
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        const migratedState = migrateStripDesktopRunnerModule(persistedState) as Record<string, unknown>;
        if (version < 2) {
          migratedState.chatTabs = sanitizePersistedChatTabs(migratedState.chatTabs as ChatTab[] | undefined);
        }

        return migratedState;
      },
      // Ohne versionsfeld im alten LocalStorage laeuft migrate nicht — merge bereinigt immer.
      merge: (persistedState, currentState) => {
        const merged =
          persistedState && typeof persistedState === 'object'
            ? { ...currentState, ...persistedState }
            : currentState;
        const mergedRecord = merged as unknown as Record<string, unknown>;
        migrateStripDesktopRunnerModule(merged);
        if ('chatTabs' in mergedRecord) {
          mergedRecord.chatTabs = sanitizePersistedChatTabs(
            mergedRecord.chatTabs as ChatTab[] | undefined
          );
        }
        return merged;
      },
    }
  )
);

// ============================================
// Selectors for optimized re-renders
// ============================================

export const useSidebarOpen = () => 
  useAppStore((state) => state.sidebarOpen);

export const useLocale = () =>
  useAppStore((state) => state.locale);

export const useActiveModuleId = () => 
  useAppStore((state) => state.activeModuleId);

export const useActiveToolId = () => 
  useAppStore((state) => state.activeToolId);

export const useTheme = () => 
  useAppStore((state) => state.theme);

export const useDesignStyle = () => 
  useAppStore((state) => state.designStyle);

export const useAccentColor = () => 
  useAppStore((state) => state.accentColor);

export const useSurfaceColor = () => 
  useAppStore((state) => state.surfaceColor);

export const useTextColor = () => 
  useAppStore((state) => state.textColor);

export const useAppFont = () => 
  useAppStore((state) => state.appFont);

export const useBackgroundImage = () => 
  useAppStore((state) => state.backgroundImage);

export const useBackgroundType = () => 
  useAppStore((state) => state.backgroundType);

export const useSolidBackground = () => 
  useAppStore((state) => state.solidBackground);

export const useChatOpen = () => 
  useAppStore((state) => state.chatOpen);

export const useChatMessages = () => 
  useAppStore((state) => state.chatMessages);

export const useUserName = () => 
  useAppStore((state) => state.userName);

export const useUserProfile = () => 
  useAppStore((state) => state.userProfile);

export const useWidgetPositions = () => 
  useAppStore((state) => state.widgetPositions);

export const useActiveWidgets = () => 
  useAppStore((state) => state.activeWidgets);

export const useGreetingSettings = () => 
  useAppStore((state) => state.greetingSettings);

export const useNavbarSettings = () => 
  useAppStore((state) => state.navbarSettings);

export const useOpenTabs = () => 
  useAppStore((state) => state.openTabs);

export const useActiveTabId = () => 
  useAppStore((state) => state.activeTabId);

export const useTabBackground = () => 
  useAppStore((state) => state.tabBackground);

export const useSidebarModules = () => 
  useAppStore((state) => state.sidebarModules);
