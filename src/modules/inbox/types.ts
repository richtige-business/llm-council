// ============================================
// types.ts - TypeScript Typen für das Inbox-Modul
// 
// Zweck: Definiert alle Interfaces und Typen für Nachrichten
// Verwendet von: Store, Komponenten, API-Calls
// ============================================

// --------------------------------------------
// Nachrichten-Typen
// --------------------------------------------

/**
 * Typ einer Nachricht
 * - email: E-Mail von einem verbundenen Konto
 * - system: Interne LifeOS-Benachrichtigung
 */
export type MessageType = 'email' | 'system';

/**
 * Priorität einer Nachricht
 */
export type MessagePriority = 'low' | 'normal' | 'high';

/**
 * Ordner/Label für Nachrichten
 */
export type MessageFolder = 
  | 'inbox' 
  | 'sent' 
  | 'drafts' 
  | 'trash' 
  | 'spam' 
  | 'archive';

/**
 * Kategorie einer Nachricht (KI-klassifiziert)
 */
export type MessageCategory = 'private' | 'business' | 'unknown';

/**
 * Dringlichkeitsstufe (1-5)
 */
export type UrgencyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Provider-Typ für Filter
 */
export type ProviderFilter = 'gmail' | 'outlook' | 'imap' | 'all';

// --------------------------------------------
// Haupt-Interfaces
// --------------------------------------------

/**
 * Label für E-Mail-Konten (z.B. "Privat", "Business", "Education")
 */
export interface AccountLabel {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isSystem: boolean;
  createdAt: string;
}

/**
 * E-Mail-Konto (verbunden via OAuth oder IMAP)
 */
export interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'imap';
  email: string;
  displayName: string | null;
  labelId: string | null;        // NEU: Konto-Label ID
  label: AccountLabel | null;    // NEU: Konto-Label Objekt
  isActive: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  messageCount: number;
  createdAt: string;
}

/**
 * Nachricht (E-Mail oder System-Benachrichtigung)
 */
export interface Message {
  id: string;
  accountId: string | null;
  type: MessageType;
  
  // Inhalt
  subject: string;
  body: string;
  bodyHtml: string | null;
  snippet: string | null;
  
  // Absender
  sender: string;
  senderName: string | null;
  
  // Empfänger (für E-Mails)
  recipients: string[];
  cc: string[];
  bcc: string[];
  
  // Status
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  
  // Kategorisierung
  folder: MessageFolder;
  labels: string[];
  priority: MessagePriority;
  
  // KI-Analyse Felder (NEU)
  category: MessageCategory;           // privat/geschäftlich
  urgency: UrgencyLevel;               // 1-5 Dringlichkeit
  contactId: string | null;            // Verknüpfter Kontakt
  hasCalendarAction: boolean;          // Terminvorschlag erkannt?
  calendarActionProcessed: boolean;    // Termin verarbeitet?
  
  // System-Benachrichtigungs-spezifisch
  source: string | null;      // z.B. "calendar", "tasks"
  actionUrl: string | null;   // Link zum Öffnen
  
  // Anhänge
  hasAttachments: boolean;
  attachments: Attachment[];
  
  // Thread/Konversation
  threadId: string | null;
  externalId: string | null;
  
  // Timestamps
  receivedAt: string;
  createdAt: string;
}

/**
 * E-Mail-Adresse eines Kontakts
 * Ein Kontakt kann mehrere E-Mail-Adressen haben
 */
export interface ContactEmail {
  id: string;
  contactId: string;
  email: string;
  label: string;        // z.B. "Privat", "Arbeit", "Andere"
  isPrimary: boolean;   // Ist dies die Haupt-E-Mail?
  createdAt: string;
}

/**
 * Verknüpfung zwischen Kontakt und E-Mail-Account
 */
export interface ContactAccount {
  id: string;
  contactId: string;
  accountId: string;
  account?: EmailAccount;   // Optional: Account-Details
  messageCount: number;     // Nachrichten mit diesem Account
  lastInteraction: string | null;
  createdAt: string;
}

/**
 * Parameter zum Erstellen eines Kontakts
 */
export interface ContactCreateParams {
  email?: string;                    // Legacy: Einzelne E-Mail
  emails?: Array<{                   // Neu: Mehrere E-Mails
    email: string;
    label?: string;
    isPrimary?: boolean;
  }>;
  name?: string | null;
  category?: MessageCategory | 'unknown';
  company?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatarUrl?: string | null;
  isFavorite?: boolean;
  linkedAccountIds?: string[];       // Account-IDs zum Verknüpfen
}

/**
 * Parameter zum Aktualisieren eines Kontakts
 */
export interface ContactUpdateParams {
  name?: string | null;
  category?: MessageCategory | 'unknown';
  company?: string | null;
  phone?: string | null;
  notes?: string | null;
  avatarUrl?: string | null;
  isFavorite?: boolean;
  isConfirmed?: boolean;
  // E-Mail-Operationen
  addEmails?: Array<{ email: string; label?: string; isPrimary?: boolean }>;
  removeEmailIds?: string[];
  updateEmails?: Array<{ id: string; label?: string; isPrimary?: boolean }>;
  // Account-Operationen
  addAccountIds?: string[];
  removeAccountIds?: string[];
}

/**
 * Kontakt (automatisch erkannt oder manuell angelegt)
 * Ein Kontakt kann mehrere E-Mail-Adressen und Accounts haben
 */
export interface Contact {
  id: string;
  
  // Haupt-E-Mail (für Abwärtskompatibilität, aus emails[isPrimary=true])
  email: string | null;
  
  // Grunddaten
  name: string | null;
  category: MessageCategory;
  messageCount: number;
  isConfirmed: boolean;
  
  // Erweiterte Kontakt-Felder
  company: string | null;     // Firma/Organisation
  phone: string | null;       // Telefonnummer
  notes: string | null;       // Notizen
  avatarUrl: string | null;   // Profilbild-URL
  isFavorite: boolean;        // Als Favorit markiert
  
  // ============================================
  // MEHRERE E-MAILS UND ACCOUNTS
  // ============================================
  
  // Alle E-Mail-Adressen dieses Kontakts
  emails?: ContactEmail[];
  
  // Verknüpfte E-Mail-Accounts (in welchen Postfächern erscheint dieser Kontakt)
  linkedAccounts?: ContactAccount[];
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

/**
 * Terminvorschlag aus E-Mail
 */
export interface CalendarSuggestion {
  id: string;
  messageId: string;
  suggestedTitle: string;
  suggestedDate: string | null;
  suggestedTime: string | null;
  suggestedEndTime: string | null;
  meetingLink: string | null;
  location: string | null;
  description: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  confidence: number;
  createdAt: string;
}

/**
 * E-Mail-Anhang
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

/**
 * Neue Nachricht (zum Erstellen)
 */
export interface NewMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  accountId?: string;  // Von welchem Konto senden
}

// --------------------------------------------
// Filter Types (NEU)
// --------------------------------------------

/**
 * Datums-Voreinstellungen für Schnellauswahl
 */
export type DatePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last3days' 
  | 'last7days' 
  | 'last14days' 
  | 'last30days' 
  | 'thisMonth'
  | 'lastMonth'
  | 'all';

/**
 * Erweiterte Filter für das Postfach
 */
export interface InboxFilters {
  // Nach E-Mail-Provider filtern
  provider: ProviderFilter;
  
  // Nach Kategorie filtern (privat/geschäftlich)
  category: MessageCategory | 'all';
  
  // Nach Kontakt filtern (Contact ID)
  contactId: string | null;
  
  // Nach Dringlichkeit filtern
  urgency: 'high' | 'normal' | 'low' | 'all';
  
  // Nur Nachrichten mit Terminvorschlägen
  hasCalendarAction: boolean | null;
  
  // ============================================
  // DATUMS-FILTER (NEU)
  // ============================================
  
  // Datum von (ISO-String)
  dateFrom: string | null;
  
  // Datum bis (ISO-String)
  dateTo: string | null;
  
  // Schnellauswahl-Preset
  datePreset: DatePreset;
  
  // Nach Konto-Label filtern (AccountLabel ID)
  accountLabelId: string | null;
}

/**
 * Standard-Filter (alles anzeigen)
 */
export const DEFAULT_FILTERS: InboxFilters = {
  provider: 'all',
  category: 'all',
  contactId: null,
  urgency: 'all',
  hasCalendarAction: null,
  dateFrom: null,
  dateTo: null,
  datePreset: 'all',
  accountLabelId: null,
};

// --------------------------------------------
// Store Types
// --------------------------------------------

/**
 * State des Inbox-Stores
 */
export interface InboxState {
  // Daten
  messages: Message[];
  accounts: EmailAccount[];
  contacts: Contact[];
  calendarSuggestions: CalendarSuggestion[];
  labels: InboxLabel[];         // LifeOS-Labels für Nachrichten
  accountLabels: AccountLabel[]; // Labels für Konten (Privat, Business, etc.)
  
  // UI State
  selectedMessageId: string | null;
  selectedMessageIds: string[];  // Mehrfachauswahl für Bulk-Aktionen
  selectedFolder: MessageFolder;
  selectedLabelId: string | null;  // Ausgewähltes LifeOS-Label
  searchQuery: string;
  
  // Filter State (NEU)
  filters: InboxFilters;
  
  // Sync State
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  
  // Modal State
  isComposeOpen: boolean;
  isAccountSetupOpen: boolean;
  isContactModalOpen: boolean;   // NEU: Kontakt-Modal
  selectedContact: Contact | null; // NEU: Ausgewählter Kontakt für Modal
  replyToMessage: Message | null;
  composeMode: 'new' | 'reply' | 'forward';  // NEU: Unterscheidung Antwort/Weiterleiten
  
  // Agent Compose State (für Generative UI)
  agentCompose: {
    isActive: boolean;
    to: string;
    subject: string;
    body: string;
    status: 'idle' | 'typing-to' | 'typing-subject' | 'typing-body' | 'sending' | 'sent' | 'error';
    fromAccount: string | null;
  };
  
  // Suggestion Modal (NEU)
  selectedSuggestionId: string | null;
}

/**
 * LifeOS-Label (benutzerdefiniert)
 */
export interface InboxLabel {
  id: string;
  name: string;
  color: string;
  messageCount?: number;
}

/**
 * Actions des Inbox-Stores
 */
export interface InboxActions {
  // Nachrichten
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string, permanent?: boolean) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  toggleStar: (id: string) => void;
  moveToFolder: (id: string, folder: MessageFolder) => void;
  markAsSpam: (id: string) => void;
  unmarkAsSpam: (id: string) => void;
  
  // Mehrfachauswahl
  toggleMessageSelection: (id: string) => void;
  selectAllInFolder: () => void;
  clearSelection: () => void;
  bulkMoveToFolder: (folder: MessageFolder) => Promise<void>;
  bulkDelete: (permanent?: boolean) => Promise<void>;
  bulkMarkAsRead: () => Promise<void>;
  bulkMarkAsSpam: () => Promise<void>;
  
  // Konten
  setAccounts: (accounts: EmailAccount[]) => void;
  addAccount: (account: EmailAccount) => void;
  removeAccount: (id: string) => void;
  updateAccountLabel: (accountId: string, labelId: string | null) => Promise<void>;
  
  // Konto-Labels (NEU)
  setAccountLabels: (labels: AccountLabel[]) => void;
  fetchAccountLabels: () => Promise<void>;
  createAccountLabel: (name: string, color: string, icon?: string) => Promise<AccountLabel>;
  deleteAccountLabel: (id: string) => Promise<void>;
  
  // Kontakte
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: ContactUpdateParams) => Promise<Contact>;
  removeContact: (id: string) => void;
  fetchContacts: () => Promise<void>;
  createContact: (contact: ContactCreateParams) => Promise<Contact>;
  toggleContactFavorite: (id: string) => Promise<void>;
  
  // Kontakt-Modal (NEU)
  openContactModal: (contact?: Contact | null) => void;
  closeContactModal: () => void;
  
  // Terminvorschläge (NEU)
  setCalendarSuggestions: (suggestions: CalendarSuggestion[]) => void;
  addCalendarSuggestion: (suggestion: CalendarSuggestion) => void;
  updateCalendarSuggestion: (id: string, updates: Partial<CalendarSuggestion>) => void;
  removeCalendarSuggestion: (id: string) => void;
  
  // UI
  selectMessage: (id: string | null) => void;
  setSelectedFolder: (folder: MessageFolder) => void;
  setSelectedLabelId: (labelId: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Filter
  setFilter: <K extends keyof InboxFilters>(key: K, value: InboxFilters[K]) => void;
  setFilters: (filters: Partial<InboxFilters>) => void;
  resetFilters: () => void;
  setDateFilter: (preset: DatePreset | null, from?: string | null, to?: string | null) => void;
  
  // Modals
  openCompose: (replyTo?: Message, mode?: 'new' | 'reply' | 'forward') => void;
  closeCompose: () => void;
  openAccountSetup: () => void;
  closeAccountSetup: () => void;
  
  // Suggestion Modal (NEU)
  selectSuggestion: (id: string | null) => void;
  
  // Sync
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (date: string | null) => void;
  setSyncError: (error: string | null) => void;
  
  // Labels
  setLabels: (labels: InboxLabel[]) => void;
  fetchLabels: () => Promise<void>;
  addLabelToMessage: (messageId: string, labelId: string) => Promise<void>;
  removeLabelFromMessage: (messageId: string, labelId: string) => Promise<void>;
  
  // Agent Compose (für generative UI)
  startAgentCompose: (fromAccountId?: string) => void;
  updateAgentCompose: (updates: Partial<{
    to: string;
    subject: string;
    body: string;
    status: 'idle' | 'typing-to' | 'typing-subject' | 'typing-body' | 'sending' | 'sent' | 'error';
  }>) => void;
  cancelAgentCompose: () => void;
}

/**
 * Vollständiger Store-Typ
 */
export type InboxStore = InboxState & InboxActions;

// --------------------------------------------
// API Response Types
// --------------------------------------------

export interface AccountsResponse {
  accounts: EmailAccount[];
}

export interface MessagesResponse {
  messages: Message[];
  nextPageToken?: string;
  total?: number;
}

export interface SyncResponse {
  success: boolean;
  syncedCount: number;
  errors?: string[];
}




