// ============================================
// messages.ts - Zentrale Übersetzungsnachrichten
//
// Zweck: Hält die DE/EN Dictionaries für die globale
//        App-Übersetzung an einer Stelle.
// Verwendet von: I18nProvider, Layout, UI-Komponenten
// ============================================

import type { AppLocale } from './config';

// --------------------------------------------
// messages - App-weite Dictionaries
// Alle Schlüssel existieren in beiden Sprachen.
// --------------------------------------------

export const messages = {
  de: {
    metadata: {
      title: 'LLM Council',
      description: 'Dein KI-Betriebssystem für Privat, Akademisch und Beruflich',
    },
    common: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      remove: 'Entfernen',
      close: 'Schließen',
      loading: 'Lädt...',
      error: 'Fehler',
      back: 'Zurück',
      search: 'Suchen',
      language: 'Sprache',
      german: 'Deutsch',
      english: 'English',
      connected: 'Verbunden',
      disconnected: 'Nicht verbunden',
      retry: 'Erneut versuchen',
      done: 'Fertig',
      customize: 'Anpassen',
      add: 'Hinzufügen',
      open: 'Öffnen',
      today: 'Heute',
      yesterday: 'Gestern',
      notFound: 'Nicht gefunden',
    },
    shell: {
      library: 'Bibliothek',
      lab: 'Lab',
      settings: 'Einstellungen',
      dashboard: 'Dashboard',
      bases: 'Bases',
      singleModules: 'Einzelmodule',
      chatClose: 'Chat schließen',
    },
    settings: {
      title: 'Einstellungen',
      subtitle: 'Personalisiere dein LLM Council',
      yourName: 'Dein Name',
      languageTitle: 'Sprache',
      languageDescription:
        'Wähle die Sprache für die gesamte App. Die Auswahl wird sofort übernommen und in deinem Profil gespeichert.',
      emailAccounts: 'E-Mail-Konten',
      noEmailAccounts: 'Keine E-Mail-Konten verbunden',
      accountLoadError: 'Fehler beim Laden der Konten',
      accountDeleteError: 'Fehler beim Entfernen des Kontos',
      accountDeleteConfirm:
        'Möchtest du das Konto "{email}" wirklich entfernen? Alle zugehörigen Nachrichten werden gelöscht.',
      deleteFailed: 'Konto konnte nicht entfernt werden',
      currentLanguage: 'Aktuelle Sprache',
    },
    profile: {
      title: 'Profil',
      notReachableFallback: 'API nicht erreichbar, nutze localStorage-Fallback',
    },
    dashboard: {
      goodMorning: 'Guten Morgen',
      goodDay: 'Guten Tag',
      goodEvening: 'Guten Abend',
      nextEvents: 'Nächste Events',
      miniCalendar: 'Mini Kalender',
      unreadMessages: 'Ungelesene Nachrichten',
      recentMessages: 'Letzte Nachrichten',
      calendarBot: 'Kalender Bot',
      inboxBot: 'Postfach Bot',
      browserBot: 'Browser Bot',
      tasksBot: 'Aufgaben Bot',
      agentsBot: 'Agents Bot',
    },
    library: {
      title: 'Bibliothek',
      backToLibrary: 'Zurück zur Bibliothek',
      moduleNotFound: 'Modul nicht gefunden',
      moduleMissingText: 'Das gesuchte Modul existiert nicht oder wurde entfernt.',
      all: 'Alle',
      productivity: 'Produktivität',
      finance: 'Finanzen',
      health: 'Gesundheit',
      education: 'Bildung',
      games: 'Spiele',
      aiMl: 'KI & ML',
      developer: 'Developer',
      creative: 'Kreativ',
      lifestyle: 'Lifestyle',
      popular: 'Beliebteste',
      topRated: 'Bestbewertet',
      newest: 'Neueste',
      updated: 'Zuletzt aktualisiert',
      allPrices: 'Alle Preise',
      free: 'Kostenlos',
      paid: 'Kostenpflichtig',
      officialMcp: 'Official MCP',
      communityMcp: 'Community MCP',
      webOnly: 'Web only',
    },
    bases: {
      baseNotFound: 'Base nicht gefunden',
    },
    tabWindow: {
      calendar: 'Kalender',
      inbox: 'Postfach',
      browser: 'Browser',
      tasks: 'Aufgaben',
      library: 'Bibliothek',
      lab: 'Labor',
      training: 'Training',
    },
    modules: {
      automaticTabView: 'Automatische Tab-Ansicht für dieses Modul.',
      moduleDoesNotExist: 'Das Modul "{moduleId}" existiert nicht.',
    },
    time: {
      daysAgo: 'vor {count} Tagen',
      weeksAgo: 'vor {count} Wochen',
      monthsAgo: 'vor {count} Monaten',
      yearsAgo: 'vor {count} Jahren',
    },
  },
  en: {
    metadata: {
      title: 'LLM Council',
      description: 'Your AI operating system for personal, academic, and professional work',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      remove: 'Remove',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      back: 'Back',
      search: 'Search',
      language: 'Language',
      german: 'German',
      english: 'English',
      connected: 'Connected',
      disconnected: 'Disconnected',
      retry: 'Retry',
      done: 'Done',
      customize: 'Customize',
      add: 'Add',
      open: 'Open',
      today: 'Today',
      yesterday: 'Yesterday',
      notFound: 'Not found',
    },
    shell: {
      library: 'Library',
      lab: 'Lab',
      settings: 'Settings',
      dashboard: 'Dashboard',
      bases: 'Bases',
      singleModules: 'Standalone Modules',
      chatClose: 'Close chat',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Customize your LLM Council',
      yourName: 'Your name',
      languageTitle: 'Language',
      languageDescription:
        'Choose the language for the entire app. The selection applies immediately and is saved to your profile.',
      emailAccounts: 'Email accounts',
      noEmailAccounts: 'No email accounts connected',
      accountLoadError: 'Failed to load accounts',
      accountDeleteError: 'Failed to remove account',
      accountDeleteConfirm:
        'Do you really want to remove the account "{email}"? All associated messages will be deleted.',
      deleteFailed: 'Account could not be removed',
      currentLanguage: 'Current language',
    },
    profile: {
      title: 'Profile',
      notReachableFallback: 'API unavailable, using localStorage fallback',
    },
    dashboard: {
      goodMorning: 'Good morning',
      goodDay: 'Good afternoon',
      goodEvening: 'Good evening',
      nextEvents: 'Upcoming events',
      miniCalendar: 'Mini calendar',
      unreadMessages: 'Unread messages',
      recentMessages: 'Recent messages',
      calendarBot: 'Calendar bot',
      inboxBot: 'Inbox bot',
      browserBot: 'Browser bot',
      tasksBot: 'Tasks bot',
      agentsBot: 'Agents bot',
    },
    library: {
      title: 'Library',
      backToLibrary: 'Back to library',
      moduleNotFound: 'Module not found',
      moduleMissingText: 'The requested module does not exist or has been removed.',
      all: 'All',
      productivity: 'Productivity',
      finance: 'Finance',
      health: 'Health',
      education: 'Education',
      games: 'Games',
      aiMl: 'AI & ML',
      developer: 'Developer',
      creative: 'Creative',
      lifestyle: 'Lifestyle',
      popular: 'Most popular',
      topRated: 'Top rated',
      newest: 'Newest',
      updated: 'Recently updated',
      allPrices: 'All prices',
      free: 'Free',
      paid: 'Paid',
      officialMcp: 'Official MCP',
      communityMcp: 'Community MCP',
      webOnly: 'Web only',
    },
    bases: {
      baseNotFound: 'Base not found',
    },
    tabWindow: {
      calendar: 'Calendar',
      inbox: 'Inbox',
      browser: 'Browser',
      tasks: 'Tasks',
      library: 'Library',
      lab: 'Lab',
      training: 'Training',
    },
    modules: {
      automaticTabView: 'Automatic tab view for this module.',
      moduleDoesNotExist: 'The module "{moduleId}" does not exist.',
    },
    time: {
      daysAgo: '{count} days ago',
      weeksAgo: '{count} weeks ago',
      monthsAgo: '{count} months ago',
      yearsAgo: '{count} years ago',
    },
  },
} as const;

export type AppMessages = (typeof messages)[AppLocale];

// --------------------------------------------
// getMessages - Liefert das Dictionary einer Locale
// --------------------------------------------

export function getMessages(locale: AppLocale): AppMessages {
  return messages[locale];
}
