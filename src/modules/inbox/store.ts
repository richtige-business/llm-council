// ============================================
// store.ts - Zentraler Datenspeicher für das Inbox-Modul
// 
// Zweck: Verwaltet alle Nachrichten, Konten und UI-State
//        Speichert Daten automatisch im LocalStorage
// Verwendet von: Allen Inbox-Komponenten und Widgets
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  InboxStore, 
  Message, 
  EmailAccount,
  MessageFolder,
  Contact,
  CalendarSuggestion,
  InboxFilters,
  InboxLabel,
  AccountLabel,
  DatePreset,
} from './types';
import { DEFAULT_FILTERS } from './types';

// --------------------------------------------
// Inbox Store erstellen
// --------------------------------------------

export const useInboxStore = create<InboxStore>()(
  persist(
    (set, get) => ({
      // ========================================
      // INITIALER STATE
      // ========================================
      
      // Daten
      messages: [],
      accounts: [],
      contacts: [],
      calendarSuggestions: [],
      labels: [],         // LifeOS-Labels für Nachrichten
      accountLabels: [],  // Labels für Konten (Privat, Business, etc.)
      
      // UI State
      selectedMessageId: null,
      selectedMessageIds: [],  // Mehrfachauswahl für Bulk-Aktionen
      selectedFolder: 'inbox',
      selectedLabelId: null,  // Ausgewähltes LifeOS-Label
      searchQuery: '',
      
      // Filter State (NEU)
      filters: { ...DEFAULT_FILTERS },
      
      // Sync State
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      
      // Modal State
      isComposeOpen: false,
      isAccountSetupOpen: false,
      isContactModalOpen: false,   // NEU: Kontakt-Modal
      selectedContact: null,       // NEU: Ausgewählter Kontakt für Modal
      replyToMessage: null,
      composeMode: 'new' as const,  // NEU: 'new' | 'reply' | 'forward'
      
      // Agent Compose State (für Generative UI)
      agentCompose: {
        isActive: false,
        to: '',
        subject: '',
        body: '',
        status: 'idle' as 'idle' | 'typing-to' | 'typing-subject' | 'typing-body' | 'sending' | 'sent' | 'error',
        fromAccount: null as string | null,
      },
      
      // Suggestion Modal (NEU)
      selectedSuggestionId: null,

      // ========================================
      // NACHRICHTEN ACTIONS
      // ========================================

      // Alle Nachrichten setzen (nach Fetch)
      setMessages: (messages) => {
        set({ messages });
      },

      // Neue Nachricht hinzufügen
      addMessage: (message) => {
        set((state) => ({
          messages: [message, ...state.messages],
        }));
      },

      // Nachricht aktualisieren
      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      // Nachricht löschen (in Papierkorb, mit API-Sync)
      deleteMessage: (id, permanent = false) => {
        if (permanent) {
          // Endgültig löschen - aus State entfernen
          set((state) => ({
            messages: state.messages.filter((m) => m.id !== id),
            selectedMessageId: state.selectedMessageId === id 
              ? null 
              : state.selectedMessageId,
          }));
        } else {
          // Lokal in Papierkorb verschieben
          get().updateMessage(id, { folder: 'trash', isDeleted: true });
          set((state) => ({
            selectedMessageId: state.selectedMessageId === id 
              ? null 
              : state.selectedMessageId,
          }));
        }
        // API aufrufen für Zwei-Wege-Sync
        fetch(`/api/inbox/messages?id=${id}&permanent=${permanent}`, {
          method: 'DELETE',
        }).catch(console.error);
      },

      // Als gelesen markieren (mit API-Sync)
      markAsRead: (id) => {
        get().updateMessage(id, { isRead: true });
        // API aufrufen für Zwei-Wege-Sync
        fetch('/api/inbox/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isRead: true }),
        }).catch(console.error);
      },

      // Als ungelesen markieren (mit API-Sync)
      markAsUnread: (id) => {
        get().updateMessage(id, { isRead: false });
        // API aufrufen für Zwei-Wege-Sync
        fetch('/api/inbox/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isRead: false }),
        }).catch(console.error);
      },

      // Stern umschalten (mit API-Sync)
      toggleStar: (id) => {
        const message = get().messages.find((m) => m.id === id);
        if (message) {
          const newStarred = !message.isStarred;
          get().updateMessage(id, { isStarred: newStarred });
          // API aufrufen für Zwei-Wege-Sync
          fetch('/api/inbox/messages', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isStarred: newStarred }),
          }).catch(console.error);
        }
      },

      // In anderen Ordner verschieben (mit API-Sync)
      moveToFolder: (id, folder) => {
        get().updateMessage(id, { folder });
        // API aufrufen für Zwei-Wege-Sync (archivieren/zurück in inbox)
        fetch('/api/inbox/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, folder }),
        }).catch(console.error);
      },

      // Als Spam markieren (mit API-Sync)
      markAsSpam: (id) => {
        get().updateMessage(id, { folder: 'spam' });
        fetch('/api/inbox/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, folder: 'spam', markAsSpam: true }),
        }).catch(console.error);
      },

      // Spam-Markierung entfernen (mit API-Sync)
      unmarkAsSpam: (id) => {
        get().updateMessage(id, { folder: 'inbox' });
        fetch('/api/inbox/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, folder: 'inbox', unmarkAsSpam: true }),
        }).catch(console.error);
      },

      // ========================================
      // MEHRFACHAUSWAHL ACTIONS
      // ========================================

      // Nachricht zur Auswahl hinzufügen/entfernen
      toggleMessageSelection: (id) => {
        set((state) => ({
          selectedMessageIds: state.selectedMessageIds.includes(id)
            ? state.selectedMessageIds.filter((msgId) => msgId !== id)
            : [...state.selectedMessageIds, id],
        }));
      },

      // Alle Nachrichten im aktuellen Ordner auswählen
      selectAllInFolder: () => {
        const { messages, selectedFolder, selectedLabelId } = get();
        let idsToSelect: string[];
        
        if (selectedLabelId) {
          // Wenn Label ausgewählt: alle mit diesem Label
          idsToSelect = messages
            .filter((m) => m.labels.includes(selectedLabelId))
            .map((m) => m.id);
        } else {
          // Sonst: alle im aktuellen Ordner
          idsToSelect = messages
            .filter((m) => m.folder === selectedFolder)
            .map((m) => m.id);
        }
        
        set({ selectedMessageIds: idsToSelect });
      },

      // Auswahl löschen
      clearSelection: () => {
        set({ selectedMessageIds: [] });
      },

      // Bulk: Mehrere Nachrichten verschieben
      bulkMoveToFolder: async (folder) => {
        const { selectedMessageIds } = get();
        
        // Lokal aktualisieren
        selectedMessageIds.forEach((id) => {
          get().updateMessage(id, { folder });
        });
        
        // API für jede Nachricht aufrufen (parallel)
        await Promise.all(
          selectedMessageIds.map((id) =>
            fetch('/api/inbox/messages', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, folder }),
            })
          )
        );
        
        // Auswahl löschen
        set({ selectedMessageIds: [] });
      },

      // Bulk: Mehrere Nachrichten löschen
      bulkDelete: async (permanent = false) => {
        const { selectedMessageIds } = get();
        
        if (permanent) {
          // Endgültig löschen
          set((state) => ({
            messages: state.messages.filter((m) => !selectedMessageIds.includes(m.id)),
          }));
        } else {
          // In Papierkorb verschieben
          selectedMessageIds.forEach((id) => {
            get().updateMessage(id, { folder: 'trash', isDeleted: true });
          });
        }
        
        // API für jede Nachricht aufrufen
        await Promise.all(
          selectedMessageIds.map((id) =>
            fetch(`/api/inbox/messages?id=${id}&permanent=${permanent}`, {
              method: 'DELETE',
            })
          )
        );
        
        // Auswahl löschen
        set({ selectedMessageIds: [] });
      },

      // Bulk: Als gelesen markieren
      bulkMarkAsRead: async () => {
        const { selectedMessageIds } = get();
        
        selectedMessageIds.forEach((id) => {
          get().updateMessage(id, { isRead: true });
        });
        
        await Promise.all(
          selectedMessageIds.map((id) =>
            fetch('/api/inbox/messages', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, isRead: true }),
            })
          )
        );
        
        set({ selectedMessageIds: [] });
      },

      // Bulk: Als Spam markieren
      bulkMarkAsSpam: async () => {
        const { selectedMessageIds } = get();
        
        selectedMessageIds.forEach((id) => {
          get().updateMessage(id, { folder: 'spam' });
        });
        
        await Promise.all(
          selectedMessageIds.map((id) =>
            fetch('/api/inbox/messages', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, folder: 'spam', markAsSpam: true }),
            })
          )
        );
        
        set({ selectedMessageIds: [] });
      },

      // ========================================
      // KONTEN ACTIONS
      // ========================================

      // Alle Konten setzen
      setAccounts: (accounts) => {
        set({ accounts });
      },

      // Neues Konto hinzufügen
      addAccount: (account) => {
        set((state) => ({
          accounts: [...state.accounts, account],
        }));
      },

      // Konto entfernen
      removeAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
          // Nachrichten des Kontos auch entfernen
          messages: state.messages.filter((msg) => msg.accountId !== id),
        }));
      },

      // Label zu Konto zuweisen (mit API-Sync)
      updateAccountLabel: async (accountId, labelId) => {
        try {
          const res = await fetch('/api/inbox/accounts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: accountId, labelId }),
          });
          
          if (res.ok) {
            const { account } = await res.json();
            set((state) => ({
              accounts: state.accounts.map((acc) =>
                acc.id === accountId ? { ...acc, labelId: account.labelId, label: account.label } : acc
              ),
            }));
          }
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Konto-Labels:', error);
        }
      },

      // ========================================
      // KONTO-LABELS ACTIONS (NEU)
      // ========================================

      // Alle Konto-Labels setzen
      setAccountLabels: (labels) => {
        set({ accountLabels: labels });
      },

      // Konto-Labels von API laden
      fetchAccountLabels: async () => {
        try {
          // Zuerst System-Labels seeden (falls noch nicht vorhanden)
          await fetch('/api/inbox/account-labels/seed', { method: 'POST' });
          
          // Dann alle Labels laden
          const res = await fetch('/api/inbox/account-labels');
          if (res.ok) {
            const { labels } = await res.json();
            set({ accountLabels: labels });
          }
        } catch (error) {
          console.error('Fehler beim Laden der Konto-Labels:', error);
        }
      },

      // Neues Konto-Label erstellen
      createAccountLabel: async (name, color, icon) => {
        try {
          const res = await fetch('/api/inbox/account-labels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color, icon }),
          });
          
          if (res.ok) {
            const { label } = await res.json();
            set((state) => ({
              accountLabels: [...state.accountLabels, label],
            }));
            return label;
          }
          throw new Error('Fehler beim Erstellen');
        } catch (error) {
          console.error('Fehler beim Erstellen des Konto-Labels:', error);
          throw error;
        }
      },

      // Konto-Label löschen
      deleteAccountLabel: async (id) => {
        try {
          const res = await fetch(`/api/inbox/account-labels?id=${id}`, {
            method: 'DELETE',
          });
          
          if (res.ok) {
            set((state) => ({
              accountLabels: state.accountLabels.filter((l) => l.id !== id),
              // Auch von Konten entfernen
              accounts: state.accounts.map((acc) =>
                acc.labelId === id ? { ...acc, labelId: null, label: null } : acc
              ),
            }));
          }
        } catch (error) {
          console.error('Fehler beim Löschen des Konto-Labels:', error);
        }
      },

      // ========================================
      // KONTAKTE ACTIONS
      // ========================================

      // Alle Kontakte setzen
      setContacts: (contacts) => {
        set({ contacts });
      },

      // Kontakte von API laden
      fetchContacts: async () => {
        try {
          const res = await fetch('/api/inbox/contacts');
          if (res.ok) {
            const { contacts } = await res.json();
            set({ contacts });
          }
        } catch (error) {
          console.error('Fehler beim Laden der Kontakte:', error);
        }
      },

      // Neuen Kontakt erstellen
      createContact: async (contact) => {
        try {
          const res = await fetch('/api/inbox/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contact),
          });
          
          if (res.ok) {
            const { contact: newContact } = await res.json();
            set((state) => ({
              contacts: [newContact, ...state.contacts],
            }));
            return newContact;
          }
          throw new Error('Fehler beim Erstellen');
        } catch (error) {
          console.error('Fehler beim Erstellen des Kontakts:', error);
          throw error;
        }
      },

      // Kontakt als Favorit markieren/entfernen
      toggleContactFavorite: async (id) => {
        const contact = get().contacts.find((c) => c.id === id);
        if (!contact) return;
        
        const newFavorite = !contact.isFavorite;
        
        try {
          const res = await fetch('/api/inbox/contacts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, isFavorite: newFavorite }),
          });
          
          if (res.ok) {
            set((state) => ({
              contacts: state.contacts.map((c) =>
                c.id === id ? { ...c, isFavorite: newFavorite } : c
              ),
            }));
          }
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Kontakts:', error);
        }
      },

      // Kontakt-Modal öffnen
      openContactModal: (contact = null) => {
        set({ isContactModalOpen: true, selectedContact: contact });
      },

      // Kontakt-Modal schließen
      closeContactModal: () => {
        set({ isContactModalOpen: false, selectedContact: null });
      },

      // Neuen Kontakt hinzufügen
      addContact: (contact) => {
        set((state) => ({
          contacts: [...state.contacts, contact],
        }));
      },

      // Kontakt aktualisieren (mit API-Aufruf)
      updateContact: async (id, updates) => {
        try {
          const res = await fetch('/api/inbox/contacts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          
          if (res.ok) {
            const { contact: updatedContact } = await res.json();
            set((state) => ({
              contacts: state.contacts.map((c) =>
                c.id === id ? updatedContact : c
              ),
            }));
            return updatedContact;
          }
          throw new Error('Fehler beim Aktualisieren');
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Kontakts:', error);
          throw error;
        }
      },

      // Kontakt entfernen
      removeContact: (id) => {
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
          // Filter zurücksetzen falls dieser Kontakt gefiltert war
          filters: state.filters.contactId === id 
            ? { ...state.filters, contactId: null }
            : state.filters,
        }));
      },

      // ========================================
      // TERMINVORSCHLÄGE ACTIONS (NEU)
      // ========================================

      // Alle Vorschläge setzen
      setCalendarSuggestions: (suggestions) => {
        set({ calendarSuggestions: suggestions });
      },

      // Neuen Vorschlag hinzufügen
      addCalendarSuggestion: (suggestion) => {
        set((state) => ({
          calendarSuggestions: [...state.calendarSuggestions, suggestion],
        }));
      },

      // Vorschlag aktualisieren
      updateCalendarSuggestion: (id, updates) => {
        set((state) => ({
          calendarSuggestions: state.calendarSuggestions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      // Vorschlag entfernen
      removeCalendarSuggestion: (id) => {
        set((state) => ({
          calendarSuggestions: state.calendarSuggestions.filter((s) => s.id !== id),
          selectedSuggestionId: state.selectedSuggestionId === id 
            ? null 
            : state.selectedSuggestionId,
        }));
      },

      // ========================================
      // UI ACTIONS
      // ========================================

      // Nachricht auswählen
      selectMessage: (id) => {
        set({ selectedMessageId: id });
        
        // Automatisch als gelesen markieren wenn ausgewählt
        if (id) {
          const message = get().messages.find((m) => m.id === id);
          if (message && !message.isRead) {
            get().markAsRead(id);
          }
        }
      },

      // Ordner wechseln
      setSelectedFolder: (folder) => {
        set({ 
          selectedFolder: folder,
          selectedMessageId: null,  // Auswahl zurücksetzen
        });
      },

      // Label auswählen (für Filter)
      setSelectedLabelId: (labelId) => {
        set({ 
          selectedLabelId: labelId,
          selectedMessageId: null,  // Auswahl zurücksetzen
        });
      },

      // Suchquery setzen
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // ========================================
      // FILTER ACTIONS (NEU)
      // ========================================

      // Einzelnen Filter setzen
      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
          selectedMessageId: null, // Auswahl zurücksetzen bei Filterwechsel
        }));
      },

      // Mehrere Filter auf einmal setzen
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          selectedMessageId: null,
        }));
      },

      // Alle Filter zurücksetzen
      resetFilters: () => {
        set({ 
          filters: { ...DEFAULT_FILTERS },
          selectedMessageId: null,
        });
      },

      // Datums-Filter setzen (Preset oder manueller Zeitraum)
      setDateFilter: (preset, from = null, to = null) => {
        if (preset && preset !== 'all') {
          // Preset verwenden - Datumsbereich berechnen
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let dateFrom: Date | null = null;
          let dateTo: Date | null = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // Ende des Tages

          switch (preset) {
            case 'today':
              dateFrom = today;
              break;
            case 'yesterday':
              dateFrom = new Date(today.getTime() - 24 * 60 * 60 * 1000);
              dateTo = new Date(today.getTime() - 1);
              break;
            case 'last3days':
              dateFrom = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
              break;
            case 'last7days':
              dateFrom = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'last14days':
              dateFrom = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
              break;
            case 'last30days':
              dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case 'thisMonth':
              dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'lastMonth':
              dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
              break;
          }

          set((state) => ({
            filters: {
              ...state.filters,
              datePreset: preset,
              dateFrom: dateFrom?.toISOString() || null,
              dateTo: dateTo?.toISOString() || null,
            },
            selectedMessageId: null,
          }));
        } else if (from || to) {
          // Manueller Zeitraum
          set((state) => ({
            filters: {
              ...state.filters,
              datePreset: 'all',
              dateFrom: from || null,
              dateTo: to || null,
            },
            selectedMessageId: null,
          }));
        } else {
          // Alles zurücksetzen
          set((state) => ({
            filters: {
              ...state.filters,
              datePreset: 'all',
              dateFrom: null,
              dateTo: null,
            },
            selectedMessageId: null,
          }));
        }
      },

      // ========================================
      // MODAL ACTIONS
      // ========================================

      // Compose-Modal öffnen
      // mode: 'new' (neue Mail), 'reply' (Antwort), 'forward' (Weiterleiten)
      openCompose: (replyTo, mode = 'new') => {
        set({
          isComposeOpen: true,
          replyToMessage: replyTo || null,
          composeMode: replyTo ? mode : 'new',
        });
      },

      // Compose-Modal schließen
      closeCompose: () => {
        set({
          isComposeOpen: false,
          replyToMessage: null,
          composeMode: 'new',
        });
      },

      // ========================================
      // AGENT COMPOSE (Generative UI)
      // ========================================

      // Agent startet E-Mail-Komposition
      startAgentCompose: (fromAccountId?: string) => {
        set({
          isComposeOpen: true,
          composeMode: 'new',
          agentCompose: {
            isActive: true,
            to: '',
            subject: '',
            body: '',
            status: 'typing-to',
            fromAccount: fromAccountId || null,
          },
        });
      },

      // Agent aktualisiert Compose-Felder (für Typing-Animation)
      updateAgentCompose: (updates: Partial<{
        to: string;
        subject: string;
        body: string;
        status: 'idle' | 'typing-to' | 'typing-subject' | 'typing-body' | 'sending' | 'sent' | 'error';
      }>) => {
        set((state) => ({
          agentCompose: {
            ...state.agentCompose,
            ...updates,
          },
        }));
      },

      // Agent beendet Komposition
      finishAgentCompose: (success: boolean) => {
        set((state) => ({
          agentCompose: {
            ...state.agentCompose,
            status: success ? 'sent' : 'error',
            isActive: false,
          },
        }));
        
        // Nach kurzer Verzögerung schließen
        setTimeout(() => {
          set({
            isComposeOpen: false,
            agentCompose: {
              isActive: false,
              to: '',
              subject: '',
              body: '',
              status: 'idle',
              fromAccount: null,
            },
          });
        }, success ? 1500 : 3000);
      },

      // Agent Compose zurücksetzen
      resetAgentCompose: () => {
        set({
          agentCompose: {
            isActive: false,
            to: '',
            subject: '',
            body: '',
            status: 'idle',
            fromAccount: null,
          },
        });
      },

      // Account-Setup öffnen
      openAccountSetup: () => {
        set({ isAccountSetupOpen: true });
      },

      // Account-Setup schließen
      closeAccountSetup: () => {
        set({ isAccountSetupOpen: false });
      },

      // ========================================
      // SUGGESTION MODAL (NEU)
      // ========================================

      // Terminvorschlag auswählen (öffnet Modal)
      selectSuggestion: (id) => {
        set({ selectedSuggestionId: id });
      },

      // ========================================
      // SYNC ACTIONS
      // ========================================

      setSyncing: (syncing) => {
        set({ isSyncing: syncing });
      },

      setLastSyncAt: (date) => {
        set({ lastSyncAt: date });
      },

      setSyncError: (error) => {
        set({ syncError: error });
      },

      // ========================================
      // LABELS ACTIONS
      // ========================================

      setLabels: (labels) => {
        set({ labels });
      },

      fetchLabels: async () => {
        try {
          const response = await fetch('/api/inbox/labels');
          if (response.ok) {
            const { labels } = await response.json();
            set({ labels: labels || [] });
          }
        } catch (error) {
          console.error('Fehler beim Laden der Labels:', error);
        }
      },

      addLabelToMessage: async (messageId, labelId) => {
        try {
          const response = await fetch('/api/inbox/labels/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, labelId }),
          });
          if (response.ok) {
            // Lokales Update der Nachricht
            const message = get().messages.find((m) => m.id === messageId);
            if (message) {
              get().updateMessage(messageId, {
                labels: [...message.labels, labelId],
              });
            }
            // Labels neu laden für Count-Update
            get().fetchLabels();
          }
        } catch (error) {
          console.error('Fehler beim Zuweisen des Labels:', error);
        }
      },

      removeLabelFromMessage: async (messageId, labelId) => {
        try {
          const response = await fetch(
            `/api/inbox/labels/assign?messageId=${messageId}&labelId=${labelId}`,
            { method: 'DELETE' }
          );
          if (response.ok) {
            const message = get().messages.find((m) => m.id === messageId);
            if (message) {
              get().updateMessage(messageId, {
                labels: message.labels.filter((l) => l !== labelId),
              });
            }
            get().fetchLabels();
          }
        } catch (error) {
          console.error('Fehler beim Entfernen des Labels:', error);
        }
      },

      // ========================================
      // API FETCH ACTIONS
      // Laden von Daten aus der Datenbank
      // ========================================

      // Konten von der API laden
      fetchAccounts: async () => {
        try {
          const response = await fetch('/api/inbox/accounts');
          if (!response.ok) throw new Error('Fehler beim Laden der Konten');
          const data = await response.json();
          set({ accounts: data.accounts || [] });
        } catch (error) {
          console.error('Fehler beim Laden der Konten:', error);
        }
      },

      // Nachrichten von der API laden
      fetchMessages: async (folder = 'inbox') => {
        set({ isSyncing: true, syncError: null });
        try {
          const response = await fetch(`/api/inbox/messages?folder=${folder}&limit=500`);
          if (!response.ok) throw new Error('Fehler beim Laden der Nachrichten');
          const data = await response.json();
          set({ 
            messages: data.messages || [],
            isSyncing: false,
            lastSyncAt: new Date(),
          });
        } catch (error: any) {
          console.error('Fehler beim Laden der Nachrichten:', error);
          set({ syncError: error.message, isSyncing: false });
        }
      },

      // Alle Ordner synchronisieren (Inbox, Sent, etc.)
      syncAllFolders: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          // Erst Remote-Sync (Gmail/Outlook)
          await fetch('/api/inbox/sync', { method: 'POST' });
          
          // Dann alle Nachrichten aus DB laden
          const response = await fetch('/api/inbox/messages?limit=500');
          if (!response.ok) throw new Error('Fehler beim Laden der Nachrichten');
          const data = await response.json();
          
          set({ 
            messages: data.messages || [],
            isSyncing: false,
            lastSyncAt: new Date(),
          });
        } catch (error: any) {
          console.error('Sync-Fehler:', error);
          set({ syncError: error.message, isSyncing: false });
        }
      },
    }),
    {
      // ========================================
      // PERSIST KONFIGURATION
      // ========================================
      
      name: 'llm-council-inbox',
      
      storage: createJSONStorage(() => localStorage),
      
      // SSR-Kompatibilität
      skipHydration: true,
      
      // Nur bestimmte Felder speichern
      // WICHTIG: messages NICHT speichern - zu viele Daten (LocalStorage Limit!)
      // Nachrichten werden bei jedem Laden von der API abgerufen
      partialize: (state) => ({
        // messages: NICHT SPEICHERN - werden von API geladen
        accounts: state.accounts,
        contacts: state.contacts,
        calendarSuggestions: state.calendarSuggestions,
        selectedFolder: state.selectedFolder,
        lastSyncAt: state.lastSyncAt,
        // UI-State wie selectedMessageId wird NICHT gespeichert
        // Filter werden NICHT gespeichert (Reset bei Reload)
      }),
    }
  )
);

// ============================================
// HYDRATION
// ============================================

export const hydrateInboxStore = () => {
  if (typeof window !== 'undefined') {
    useInboxStore.persist.rehydrate();
  }
};

// ============================================
// SELEKTOREN
// Optimierte Hooks für häufig benötigte Daten
// ============================================

// Rohe Daten für gefilterte Nachrichten (ohne neue Referenz)
export const useInboxMessages = () =>
  useInboxStore((state) => state.messages);

export const useSelectedFolder = () =>
  useInboxStore((state) => state.selectedFolder);

export const useSearchQuery = () =>
  useInboxStore((state) => state.searchQuery);

/**
 * Hook für gefilterte Nachrichten - verwendet useMemo um Infinite Loop zu vermeiden
 * MUSS in der Komponente mit useMemo verwendet werden!
 * 
 * Unterstützt jetzt erweiterte Filter:
 * - provider: Gmail/Outlook/IMAP
 * - category: privat/geschäftlich
 * - contactId: Nach Kontakt filtern
 * - urgency: Nach Dringlichkeit filtern
 * - hasCalendarAction: Nur mit Terminvorschlägen
 * - selectedLabelId: Nach LifeOS-Label filtern
 */
export function getFilteredMessages(
  messages: Message[], 
  selectedFolder: MessageFolder, 
  searchQuery: string,
  filters: InboxFilters,
  accounts: EmailAccount[],
  selectedLabelId: string | null = null
): Message[] {
  let filtered: Message[];
  
  // ========================================
  // BESTIMMEN OB DATUMS-FILTER AKTIV IST
  // Wenn ja, durchsuche ALLE Ordner (außer Spam/Trash wenn nicht explizit gewählt)
  // ========================================
  const hasDateFilter = filters.datePreset !== 'all' || filters.dateFrom || filters.dateTo;
  
  // ========================================
  // LABEL FILTER (hat Vorrang vor Ordner)
  // Wenn ein Label ausgewählt ist, zeige alle Nachrichten mit diesem Label
  // ========================================
  if (selectedLabelId) {
    filtered = messages.filter((msg) => msg.labels?.includes(selectedLabelId));
  } else if (hasDateFilter) {
    // Bei aktivem Datums-Filter: Alle Ordner durchsuchen
    // Aber nur "normale" Ordner (nicht Spam/Trash), es sei denn, diese sind explizit gewählt
    if (selectedFolder === 'spam' || selectedFolder === 'trash') {
      // Wenn Spam oder Papierkorb explizit ausgewählt: nur diesen Ordner
      filtered = messages.filter((msg) => msg.folder === selectedFolder);
    } else {
      // Sonst: alle außer Spam und Papierkorb
      filtered = messages.filter((msg) => msg.folder !== 'spam' && msg.folder !== 'trash');
    }
  } else {
    // Normaler Ordner-Filter (kein Datums-Filter aktiv)
    filtered = messages.filter((msg) => msg.folder === selectedFolder);
  }
  
  // ========================================
  // PROVIDER FILTER
  // ========================================
  if (filters.provider !== 'all') {
    // Finde Account IDs für diesen Provider
    const providerAccountIds = accounts
      .filter(acc => acc.provider === filters.provider)
      .map(acc => acc.id);
    
    filtered = filtered.filter(msg => 
      msg.accountId && providerAccountIds.includes(msg.accountId)
    );
  }
  
  // ========================================
  // KATEGORIE FILTER (privat/geschäftlich)
  // ========================================
  if (filters.category !== 'all') {
    filtered = filtered.filter(msg => msg.category === filters.category);
  }
  
  // ========================================
  // KONTAKT FILTER
  // ========================================
  if (filters.contactId) {
    filtered = filtered.filter(msg => msg.contactId === filters.contactId);
  }
  
  // ========================================
  // DRINGLICHKEIT FILTER
  // ========================================
  if (filters.urgency !== 'all') {
    filtered = filtered.filter(msg => {
      switch (filters.urgency) {
        case 'high':
          return msg.urgency >= 4; // 4 und 5
        case 'normal':
          return msg.urgency === 3;
        case 'low':
          return msg.urgency <= 2; // 1 und 2
        default:
          return true;
      }
    });
  }
  
  // ========================================
  // TERMINVORSCHLAG FILTER
  // ========================================
  if (filters.hasCalendarAction === true) {
    filtered = filtered.filter(msg => msg.hasCalendarAction);
  } else if (filters.hasCalendarAction === false) {
    filtered = filtered.filter(msg => !msg.hasCalendarAction);
  }
  
  // ========================================
  // DATUMS-FILTER (NEU)
  // Filtert Nachrichten nach Zeitraum
  // ========================================
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter(msg => {
      const msgDate = new Date(msg.receivedAt);
      return msgDate >= fromDate;
    });
  }
  
  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo);
    filtered = filtered.filter(msg => {
      const msgDate = new Date(msg.receivedAt);
      return msgDate <= toDate;
    });
  }
  
  // ========================================
  // SUCHFILTER
  // ========================================
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((msg) =>
      msg.subject.toLowerCase().includes(query) ||
      msg.sender.toLowerCase().includes(query) ||
      msg.body.toLowerCase().includes(query)
    );
  }
  
  // Nach Datum sortieren (neueste zuerst)
  return filtered.sort((a, b) => 
    new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

/**
 * Alternative: Nach Dringlichkeit sortieren
 */
export function getMessagesSortedByUrgency(
  messages: Message[],
  selectedFolder: MessageFolder
): Message[] {
  return messages
    .filter((msg) => msg.folder === selectedFolder)
    .sort((a, b) => {
      // Zuerst nach Dringlichkeit (höher = zuerst)
      if (b.urgency !== a.urgency) {
        return b.urgency - a.urgency;
      }
      // Dann nach Datum
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    });
}

// Ausgewählte Nachricht (Einzelauswahl)
export const useSelectedMessage = () => {
  const selectedMessageId = useInboxStore((state) => state.selectedMessageId);
  const messages = useInboxStore((state) => state.messages);
  
  // useMemo ist hier nicht nötig da wir nur einen find() machen
  return messages.find((msg) => msg.id === selectedMessageId) || null;
};

// Mehrfachauswahl IDs
export const useSelectedMessageIds = () =>
  useInboxStore((state) => state.selectedMessageIds);

// Ist eine Nachricht ausgewählt? (für Checkbox)
export const useIsMessageSelected = (messageId: string) =>
  useInboxStore((state) => state.selectedMessageIds.includes(messageId));

// Anzahl ausgewählter Nachrichten
export const useSelectedCount = () =>
  useInboxStore((state) => state.selectedMessageIds.length);

// Ausgewähltes Label
export const useSelectedLabelId = () =>
  useInboxStore((state) => state.selectedLabelId);

// Ungelesene Nachrichten zählen - einfacher Selektor mit primitive return
export const useUnreadCount = (folder?: MessageFolder) =>
  useInboxStore((state) => {
    if (folder) {
      return state.messages.filter((m) => m.folder === folder && !m.isRead).length;
    }
    return state.messages.filter((msg) => !msg.isRead).length;
  });

// Alle Konten
export const useInboxAccounts = () =>
  useInboxStore((state) => state.accounts);

// Konto nach ID
export const useAccountById = (accountId: string) => {
  const accounts = useInboxStore((state) => state.accounts);
  return accounts.find((acc) => acc.id === accountId);
};

// ============================================
// FILTER SELEKTOREN (NEU)
// ============================================

// Aktuelle Filter
export const useInboxFilters = () =>
  useInboxStore((state) => state.filters);

// Prüfen ob Filter aktiv sind
export const useHasActiveFilters = () =>
  useInboxStore((state) => {
    const { filters } = state;
    return (
      filters.provider !== 'all' ||
      filters.category !== 'all' ||
      filters.contactId !== null ||
      filters.urgency !== 'all' ||
      filters.hasCalendarAction !== null ||
      filters.datePreset !== 'all' ||
      filters.dateFrom !== null ||
      filters.dateTo !== null
    );
  });

// ============================================
// KONTAKT SELEKTOREN (NEU)
// ============================================

// Alle Kontakte
export const useInboxContacts = () =>
  useInboxStore((state) => state.contacts);

// Kontakt nach ID
export const useContactById = (contactId: string | null) => {
  const contacts = useInboxStore((state) => state.contacts);
  if (!contactId) return null;
  return contacts.find((c) => c.id === contactId) || null;
};

// Kontakte nach Kategorie
export const useContactsByCategory = (category: 'private' | 'business') =>
  useInboxStore((state) => 
    state.contacts.filter((c) => c.category === category)
  );

// ============================================
// TERMINVORSCHLAG SELEKTOREN (NEU)
// ============================================

// Alle Terminvorschläge
export const useCalendarSuggestions = () =>
  useInboxStore((state) => state.calendarSuggestions);

// Nur offene (pending) Vorschläge
export const usePendingSuggestions = () =>
  useInboxStore((state) => 
    state.calendarSuggestions.filter((s) => s.status === 'pending')
  );

// Anzahl offener Vorschläge
export const usePendingSuggestionsCount = () =>
  useInboxStore((state) => 
    state.calendarSuggestions.filter((s) => s.status === 'pending').length
  );

// Ausgewählter Terminvorschlag
export const useSelectedSuggestion = () => {
  const selectedId = useInboxStore((state) => state.selectedSuggestionId);
  const suggestions = useInboxStore((state) => state.calendarSuggestions);
  if (!selectedId) return null;
  return suggestions.find((s) => s.id === selectedId) || null;
};

// Vorschlag für eine bestimmte Nachricht
export const useSuggestionForMessage = (messageId: string | null) => {
  const suggestions = useInboxStore((state) => state.calendarSuggestions);
  if (!messageId) return null;
  return suggestions.find((s) => s.messageId === messageId && s.status === 'pending') || null;
};

// ============================================
// STATISTIK SELEKTOREN (NEU)
// ============================================

// Anzahl Nachrichten nach Kategorie
export const useMessageCountByCategory = () =>
  useInboxStore((state) => {
    const private_count = state.messages.filter(m => m.category === 'private').length;
    const business = state.messages.filter(m => m.category === 'business').length;
    const unknown = state.messages.filter(m => m.category === 'unknown').length;
    return { private: private_count, business, unknown };
  });

// Anzahl dringender Nachrichten (urgency >= 4)
export const useUrgentMessagesCount = () =>
  useInboxStore((state) => 
    state.messages.filter(m => m.urgency >= 4 && !m.isRead).length
  );

// ============================================
// LABELS SELEKTOREN
// ============================================

// Alle Labels
export const useInboxLabels = () =>
  useInboxStore((state) => state.labels);

// Label nach ID
export const useLabelById = (labelId: string | null) => {
  const labels = useInboxStore((state) => state.labels);
  if (!labelId) return null;
  return labels.find((l) => l.id === labelId) || null;
};
