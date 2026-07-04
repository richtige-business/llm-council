// ============================================
// legacy-phrases.ts - Fallback-Phrasen für Alttexte
//
// Zweck: Übersetzt noch nicht migrierte hartkodierte
//        UI-Texte app-weit per exaktem String-Mapping.
// Verwendet von: I18nProvider
// ============================================

export interface LegacyPhrasePair {
  de: string;
  en: string;
}

// --------------------------------------------
// legacyPhrasePairs - Exakte Fallback-Paare
// Wichtig: Nur systemseitige Texte, keine Nutzdaten.
// --------------------------------------------

export const legacyPhrasePairs: LegacyPhrasePair[] = [
  { de: 'Einstellungen', en: 'Settings' },
  { de: 'Personalisiere dein LLM Council', en: 'Customize your LLM Council' },
  { de: 'Dein Name', en: 'Your name' },
  { de: 'Dein Name', en: 'Your Name' },
  { de: 'Dein Name', en: 'Your name' },
  { de: 'Bearbeiten', en: 'Edit' },
  { de: 'Speichern', en: 'Save' },
  { de: 'E-Mail-Konten', en: 'Email accounts' },
  { de: 'Keine E-Mail-Konten verbunden', en: 'No email accounts connected' },
  { de: 'Fehler beim Laden der Konten:', en: 'Error loading accounts:' },
  { de: 'Fehler beim Entfernen des Kontos', en: 'Error removing account' },
  { de: 'Bibliothek', en: 'Library' },
  { de: 'Lab', en: 'Lab' },
  { de: 'Zurück zur Bibliothek', en: 'Back to library' },
  { de: 'Modul nicht gefunden', en: 'Module not found' },
  { de: 'Das gesuchte Modul existiert nicht oder wurde entfernt.', en: 'The requested module does not exist or has been removed.' },
  { de: 'Base nicht gefunden', en: 'Base not found' },
  { de: 'Zurück', en: 'Back' },
  { de: 'Anpassen', en: 'Customize' },
  { de: 'Fertig', en: 'Done' },
  { de: 'Guten Morgen', en: 'Good morning' },
  { de: 'Guten Tag', en: 'Good afternoon' },
  { de: 'Guten Abend', en: 'Good evening' },
  { de: 'Nächste Events', en: 'Upcoming events' },
  { de: 'Mini Kalender', en: 'Mini calendar' },
  { de: 'Ungelesene Nachrichten', en: 'Unread messages' },
  { de: 'Letzte Nachrichten', en: 'Recent messages' },
  { de: 'Kalender Bot', en: 'Calendar bot' },
  { de: 'Postfach Bot', en: 'Inbox bot' },
  { de: 'Browser Bot', en: 'Browser bot' },
  { de: 'Aufgaben Bot', en: 'Tasks bot' },
  { de: 'Kalender', en: 'Calendar' },
  { de: 'Postfach', en: 'Inbox' },
  { de: 'Aufgaben', en: 'Tasks' },
  { de: 'Labor', en: 'Lab' },
  { de: 'Einzelmodule', en: 'Standalone Modules' },
  { de: 'Automatische Tab-Ansicht für dieses Modul.', en: 'Automatic tab view for this module.' },
  { de: 'Automatische Tab-Ansicht fuer dieses Modul.', en: 'Automatic tab view for this module.' },
  { de: 'Das Modul', en: 'The module' },
  { de: 'existiert nicht.', en: 'does not exist.' },
  { de: 'Keine Beschreibung verfügbar.', en: 'No description available.' },
  { de: 'Modul aus deinem System.', en: 'Module from your system.' },
  { de: 'Beschreibung', en: 'Description' },
  { de: 'Bewertungen', en: 'Reviews' },
  { de: 'Infos', en: 'Info' },
  { de: 'Heute', en: 'Today' },
  { de: 'Gestern', en: 'Yesterday' },
  { de: 'Deutsch', en: 'German' },
  { de: 'Fehler', en: 'Error' },
  { de: 'Lädt...', en: 'Loading...' },
  { de: 'Kostenlos', en: 'Free' },
  { de: 'Kostenpflichtig', en: 'Paid' },
  { de: 'Beliebteste', en: 'Most popular' },
  { de: 'Bestbewertet', en: 'Top rated' },
  { de: 'Neueste', en: 'Newest' },
  { de: 'Zuletzt aktualisiert', en: 'Recently updated' },
  { de: 'Alle Preise', en: 'All prices' },
  { de: 'Alle', en: 'All' },
  { de: 'Produktivität', en: 'Productivity' },
  { de: 'Finanzen', en: 'Finance' },
  { de: 'Gesundheit', en: 'Health' },
  { de: 'Bildung', en: 'Education' },
  { de: 'Spiele', en: 'Games' },
  { de: 'Kreativ', en: 'Creative' },
  { de: 'Integrationen', en: 'Integrations' },
  { de: 'Kalender & Termine', en: 'Calendar & events' },
  { de: 'Verwalte Termine, Events und Erinnerungen', en: 'Manage appointments, events, and reminders' },
  { de: 'Vereinheitlichter Posteingang für alle Accounts', en: 'Unified inbox for all accounts' },
  { de: 'Trainiere eigene KI-Modelle', en: 'Train your own AI models' },
  { de: 'Erstelle eigene Module mit KI', en: 'Create your own modules with AI' },
  { de: 'Integrierter Web-Browser', en: 'Integrated web browser' },
  { de: 'KI Agents', en: 'AI Agents' },
  { de: 'KI-Agenten mit Chat, Web Research, Memory & Multi-Modell', en: 'AI agents with chat, web research, memory, and multi-model support' },
  { de: 'Module Builder', en: 'Module Builder' },
  { de: 'Designs, Praesentationen, Whiteboards und Social Assets direkt als Web-App in LLM Council nutzen.', en: 'Use designs, presentations, whiteboards, and social assets directly as a web app in LLM Council.' },
  { de: 'Dokumente, Wikis, Projekte und Datenbanken in einer flexiblen Workspace-Web-App organisieren.', en: 'Organize documents, wikis, projects, and databases in a flexible workspace web app.' },
  { de: 'Produktdesign, UI-Files, Komponenten und FigJam-Boards als kreative Web-App in LLM Council verwenden.', en: 'Use product design, UI files, components, and FigJam boards as a creative web app in LLM Council.' },
  { de: 'Repositories, Pull Requests, Issues und Automationen direkt ueber die GitHub-Weboberflaeche steuern.', en: 'Manage repositories, pull requests, issues, and automations directly through the GitHub web interface.' },
  { de: 'Issues, Projekte, Roadmaps und Team-Planung mit einer schnellen Produktivitaetsoberflaeche verwalten.', en: 'Manage issues, projects, roadmaps, and team planning with a fast productivity interface.' },
  { de: 'Channels, Threads, Nachrichten und Team-Kommunikation als zentrale Web-App in LLM Council zusammenfuehren.', en: 'Bring channels, threads, messages, and team communication together as a central web app in LLM Council.' },
  { de: 'Feeds, DMs, Creator-Posts und Community-Management ueber die Instagram-Web-App in LLM Council oeffnen.', en: 'Open feeds, DMs, creator posts, and community management through the Instagram web app in LLM Council.' },
];
