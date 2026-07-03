// ============================================
// SandboxProvider - Stellt LifeOS-Umgebung für Sandbox bereit
// 
// Zweck: Wrapp die Sandbox mit Theme, Mock-Stores und
//        allen nötigen Contexts für Module-Ausführung
// Verwendet von: Sandbox Page
// ============================================

'use client';

import { ReactNode, createContext, useContext, useState, useCallback } from 'react';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Mock-Store Typen
// Diese simulieren die echten LifeOS-Stores
// Umfassende Typen für realistische Testdaten
// --------------------------------------------

interface MockHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  completedDates: string[];
  streak: { current: number; best: number };
  frequency: 'daily' | 'weekly' | 'custom';
  reminder?: string;
}

interface MockEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  category: string;
  location?: string;
  description?: string;
  color?: string;
  isAllDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface MockContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags?: string[];
  lastContact?: string;
}

interface MockTask {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
  description?: string;
  projectId?: string;
}

interface MockProject {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  completedCount: number;
}

interface MockEmail {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
}

interface MockNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  folderId?: string;
}

interface MockNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
  action?: { label: string; href: string };
}

interface MockUserSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  language: string;
  timezone: string;
  notifications: boolean;
}

interface SandboxStores {
  habits: MockHabit[];
  events: MockEvent[];
  contacts: MockContact[];
  tasks: MockTask[];
  projects: MockProject[];
  emails: MockEmail[];
  notes: MockNote[];
  notifications: MockNotification[];
  userSettings: MockUserSettings;
}

// --------------------------------------------
// Context für Sandbox-Daten
// Erweiterte API für Module-Interaktion
// --------------------------------------------

interface SandboxContextValue {
  // Stores - Alle Mock-Daten
  stores: SandboxStores;
  
  // Store Updates
  updateStore: <K extends keyof SandboxStores>(
    key: K,
    data: SandboxStores[K]
  ) => void;
  
  // Reset auf Initialzustand
  resetStores: () => void;
  
  // Hilfsfunktionen für häufige Operationen
  addTask: (task: Omit<MockTask, 'id'>) => void;
  toggleTask: (taskId: string) => void;
  addEvent: (event: Omit<MockEvent, 'id'>) => void;
  addContact: (contact: Omit<MockContact, 'id'>) => void;
  completeHabit: (habitId: string) => void;
  addNotification: (notification: Omit<MockNotification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (notificationId: string) => void;
  
  // Theme & Settings
  updateSettings: (settings: Partial<MockUserSettings>) => void;
}

const SandboxContext = createContext<SandboxContextValue | null>(null);

// --------------------------------------------
// Hook zum Zugriff auf Sandbox-Context
// --------------------------------------------

export function useSandboxStores() {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new Error('useSandboxStores must be used within SandboxProvider');
  }
  return context;
}

// Typ-Exports für Module
export type { 
  MockHabit, 
  MockEvent, 
  MockContact, 
  MockTask, 
  MockProject,
  MockEmail,
  MockNote,
  MockNotification,
  MockUserSettings,
  SandboxStores 
};

// --------------------------------------------
// Initiale Mock-Daten
// Realistische Test-Daten für die Sandbox
// --------------------------------------------

// --------------------------------------------
// Hilfsfunktionen für Mock-Daten
// --------------------------------------------

const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const daysAgo = (n: number) => new Date(Date.now() - 86400000 * n);
const hoursFromNow = (n: number) => new Date(Date.now() + 3600000 * n);

// --------------------------------------------
// Initiale Mock-Daten
// Umfassende, realistische Test-Daten für die Sandbox
// --------------------------------------------

const initialMockStores: SandboxStores = {
  // Habits - Gewohnheiten
  habits: [
    {
      id: 'habit-1',
      name: 'Meditation',
      icon: 'Brain',
      color: '#8b5cf6',
      completedDates: [
        formatDate(today),
        formatDate(daysAgo(1)),
        formatDate(daysAgo(2)),
        formatDate(daysAgo(3)),
        formatDate(daysAgo(5)),
      ],
      streak: { current: 4, best: 12 },
      frequency: 'daily',
      reminder: '07:00',
    },
    {
      id: 'habit-2',
      name: 'Sport',
      icon: 'Dumbbell',
      color: '#ef4444',
      completedDates: [
        formatDate(today),
        formatDate(daysAgo(2)),
        formatDate(daysAgo(4)),
      ],
      streak: { current: 1, best: 21 },
      frequency: 'daily',
      reminder: '18:00',
    },
    {
      id: 'habit-3',
      name: 'Lesen',
      icon: 'Book',
      color: '#3b82f6',
      completedDates: [
        formatDate(daysAgo(1)),
        formatDate(daysAgo(3)),
      ],
      streak: { current: 0, best: 8 },
      frequency: 'daily',
    },
    {
      id: 'habit-4',
      name: 'Wasser trinken',
      icon: 'Droplet',
      color: '#06b6d4',
      completedDates: [
        formatDate(today),
        formatDate(daysAgo(1)),
        formatDate(daysAgo(2)),
        formatDate(daysAgo(3)),
        formatDate(daysAgo(4)),
        formatDate(daysAgo(5)),
        formatDate(daysAgo(6)),
      ],
      streak: { current: 7, best: 30 },
      frequency: 'daily',
    },
  ],
  
  // Events - Kalendereinträge
  events: [
    {
      id: 'event-1',
      title: 'Team Standup',
      start: hoursFromNow(1).toISOString(),
      end: hoursFromNow(1.5).toISOString(),
      category: 'work',
      color: '#3b82f6',
      location: 'Zoom Meeting',
      recurrence: 'daily',
    },
    {
      id: 'event-2',
      title: 'Projektbesprechung',
      start: hoursFromNow(3).toISOString(),
      end: hoursFromNow(4).toISOString(),
      category: 'work',
      color: '#8b5cf6',
      location: 'Konferenzraum A',
      description: 'Q1 Roadmap Review mit dem Produktteam',
    },
    {
      id: 'event-3',
      title: 'Mittagspause',
      start: hoursFromNow(5).toISOString(),
      end: hoursFromNow(6).toISOString(),
      category: 'personal',
      color: '#22c55e',
    },
    {
      id: 'event-4',
      title: 'Zahnarzt',
      start: new Date(Date.now() + 86400000 * 2 + 36000000).toISOString(),
      end: new Date(Date.now() + 86400000 * 2 + 39600000).toISOString(),
      category: 'health',
      color: '#ef4444',
      location: 'Dr. Müller, Hauptstraße 15',
    },
    {
      id: 'event-5',
      title: 'Geburtstagsfeier Lisa',
      start: new Date(Date.now() + 86400000 * 5).toISOString(),
      end: new Date(Date.now() + 86400000 * 5 + 14400000).toISOString(),
      category: 'social',
      color: '#f59e0b',
      isAllDay: false,
      location: 'Restaurant Bella Italia',
    },
  ],
  
  // Contacts - Kontakte
  contacts: [
    {
      id: 'contact-1',
      name: 'Max Mustermann',
      email: 'max.mustermann@example.com',
      phone: '+49 123 456789',
      company: 'TechCorp GmbH',
      role: 'Senior Developer',
      tags: ['Arbeit', 'Entwicklung'],
      lastContact: formatDate(daysAgo(2)),
    },
    {
      id: 'contact-2',
      name: 'Anna Schmidt',
      email: 'anna.schmidt@example.com',
      phone: '+49 234 567890',
      company: 'Design Studio',
      role: 'UX Designer',
      tags: ['Arbeit', 'Design'],
      lastContact: formatDate(daysAgo(5)),
    },
    {
      id: 'contact-3',
      name: 'Thomas Weber',
      email: 'thomas.weber@example.com',
      phone: '+49 345 678901',
      tags: ['Freunde', 'Sport'],
      lastContact: formatDate(daysAgo(10)),
    },
    {
      id: 'contact-4',
      name: 'Lisa Hoffmann',
      email: 'lisa.hoffmann@example.com',
      company: 'Marketing Plus',
      role: 'Marketing Manager',
      tags: ['Arbeit', 'Marketing'],
      lastContact: formatDate(today),
    },
    {
      id: 'contact-5',
      name: 'Dr. Julia Becker',
      email: 'j.becker@praxis.de',
      phone: '+49 456 789012',
      company: 'Zahnarztpraxis Becker',
      role: 'Zahnärztin',
      tags: ['Gesundheit'],
      lastContact: formatDate(daysAgo(90)),
    },
  ],
  
  // Tasks - Aufgaben
  tasks: [
    {
      id: 'task-1',
      title: 'Präsentation vorbereiten',
      completed: false,
      priority: 'high',
      dueDate: formatDate(hoursFromNow(24)),
      tags: ['Arbeit', 'Wichtig'],
      description: 'Q1 Review Präsentation für das Management',
      projectId: 'project-1',
    },
    {
      id: 'task-2',
      title: 'E-Mails beantworten',
      completed: true,
      priority: 'medium',
      tags: ['Arbeit'],
    },
    {
      id: 'task-3',
      title: 'Einkaufen gehen',
      completed: false,
      priority: 'low',
      dueDate: formatDate(today),
      tags: ['Persönlich'],
    },
    {
      id: 'task-4',
      title: 'Code Review für Feature X',
      completed: false,
      priority: 'high',
      dueDate: formatDate(hoursFromNow(48)),
      tags: ['Arbeit', 'Entwicklung'],
      projectId: 'project-2',
    },
    {
      id: 'task-5',
      title: 'Arzttermin vereinbaren',
      completed: false,
      priority: 'medium',
      tags: ['Gesundheit'],
    },
  ],
  
  // Projects - Projekte
  projects: [
    {
      id: 'project-1',
      name: 'Q1 Roadmap',
      color: '#8b5cf6',
      taskCount: 8,
      completedCount: 3,
    },
    {
      id: 'project-2',
      name: 'Feature Development',
      color: '#3b82f6',
      taskCount: 12,
      completedCount: 7,
    },
    {
      id: 'project-3',
      name: 'Persönliche Ziele',
      color: '#22c55e',
      taskCount: 5,
      completedCount: 2,
    },
  ],
  
  // Emails - Simulierte E-Mails
  emails: [
    {
      id: 'email-1',
      from: 'Max Mustermann',
      fromEmail: 'max@techcorp.de',
      subject: 'Meeting morgen',
      preview: 'Hi, wollte nur kurz nachfragen ob das Meeting morgen um 10 Uhr noch steht...',
      date: hoursFromNow(-2).toISOString(),
      read: false,
      starred: true,
      folder: 'inbox',
    },
    {
      id: 'email-2',
      from: 'GitHub',
      fromEmail: 'noreply@github.com',
      subject: 'New pull request in lifeos',
      preview: '[lifeos] Pull request #42: Feature: Add calendar sync',
      date: hoursFromNow(-5).toISOString(),
      read: true,
      starred: false,
      folder: 'inbox',
    },
    {
      id: 'email-3',
      from: 'Newsletter',
      fromEmail: 'news@techweekly.com',
      subject: 'Diese Woche in Tech',
      preview: 'Die wichtigsten Tech-News der Woche zusammengefasst...',
      date: hoursFromNow(-24).toISOString(),
      read: true,
      starred: false,
      folder: 'inbox',
    },
  ],
  
  // Notes - Notizen
  notes: [
    {
      id: 'note-1',
      title: 'Meeting Notizen',
      content: '## Wichtige Punkte\n- Feature Deadline: Ende des Monats\n- Neuer Designer im Team\n- Budget Review nächste Woche',
      createdAt: daysAgo(3).toISOString(),
      updatedAt: daysAgo(1).toISOString(),
      tags: ['Arbeit', 'Meeting'],
    },
    {
      id: 'note-2',
      title: 'Ideen für das Wochenende',
      content: '- Wandern im Wald\n- Neues Restaurant ausprobieren\n- Film schauen',
      createdAt: daysAgo(1).toISOString(),
      updatedAt: daysAgo(1).toISOString(),
      tags: ['Persönlich'],
    },
  ],
  
  // Notifications - Benachrichtigungen
  notifications: [
    {
      id: 'notif-1',
      title: 'Neue Nachricht',
      message: 'Max Mustermann hat dir eine E-Mail geschickt',
      type: 'info',
      read: false,
      timestamp: hoursFromNow(-1).toISOString(),
      action: { label: 'Öffnen', href: '/inbox' },
    },
    {
      id: 'notif-2',
      title: 'Termin in 1 Stunde',
      message: 'Team Standup beginnt um 10:00 Uhr',
      type: 'warning',
      read: false,
      timestamp: hoursFromNow(-0.5).toISOString(),
      action: { label: 'Zum Kalender', href: '/calendar' },
    },
    {
      id: 'notif-3',
      title: 'Habit abgeschlossen',
      message: 'Du hast heute meditiert! 🎉',
      type: 'success',
      read: true,
      timestamp: hoursFromNow(-3).toISOString(),
    },
  ],
  
  // User Settings
  userSettings: {
    theme: 'dark',
    accentColor: '#8b5cf6',
    language: 'de',
    timezone: 'Europe/Berlin',
    notifications: true,
  },
};

// --------------------------------------------
// Provider Komponente
// Mit erweiterten Hilfsfunktionen für Module
// --------------------------------------------

interface SandboxProviderProps {
  children: ReactNode;
}

export function SandboxProvider({ children }: SandboxProviderProps) {
  const [stores, setStores] = useState<SandboxStores>(initialMockStores);
  const themeStyles = useThemeStyles();

  // --------------------------------------------
  // Basis-Funktionen
  // --------------------------------------------

  // Store aktualisieren
  const updateStore = useCallback(<K extends keyof SandboxStores>(
    key: K,
    data: SandboxStores[K]
  ) => {
    setStores((prev) => ({
      ...prev,
      [key]: data,
    }));
  }, []);

  // Alle Stores zurücksetzen
  const resetStores = useCallback(() => {
    setStores(initialMockStores);
  }, []);

  // --------------------------------------------
  // Task-Funktionen
  // --------------------------------------------

  const addTask = useCallback((task: Omit<MockTask, 'id'>) => {
    const newTask: MockTask = {
      ...task,
      id: `task-${Date.now()}`,
    };
    setStores((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setStores((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    }));
  }, []);

  // --------------------------------------------
  // Event-Funktionen
  // --------------------------------------------

  const addEvent = useCallback((event: Omit<MockEvent, 'id'>) => {
    const newEvent: MockEvent = {
      ...event,
      id: `event-${Date.now()}`,
    };
    setStores((prev) => ({
      ...prev,
      events: [...prev.events, newEvent],
    }));
  }, []);

  // --------------------------------------------
  // Contact-Funktionen
  // --------------------------------------------

  const addContact = useCallback((contact: Omit<MockContact, 'id'>) => {
    const newContact: MockContact = {
      ...contact,
      id: `contact-${Date.now()}`,
    };
    setStores((prev) => ({
      ...prev,
      contacts: [...prev.contacts, newContact],
    }));
  }, []);

  // --------------------------------------------
  // Habit-Funktionen
  // --------------------------------------------

  const completeHabit = useCallback((habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setStores((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) => {
        if (habit.id !== habitId) return habit;
        
        const alreadyCompleted = habit.completedDates.includes(today);
        if (alreadyCompleted) return habit;
        
        return {
          ...habit,
          completedDates: [...habit.completedDates, today],
          streak: {
            current: habit.streak.current + 1,
            best: Math.max(habit.streak.best, habit.streak.current + 1),
          },
        };
      }),
    }));
  }, []);

  // --------------------------------------------
  // Notification-Funktionen
  // --------------------------------------------

  const addNotification = useCallback((notification: Omit<MockNotification, 'id' | 'timestamp'>) => {
    const newNotification: MockNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setStores((prev) => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications],
    }));
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setStores((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      ),
    }));
  }, []);

  // --------------------------------------------
  // Settings-Funktionen
  // --------------------------------------------

  const updateSettings = useCallback((settings: Partial<MockUserSettings>) => {
    setStores((prev) => ({
      ...prev,
      userSettings: { ...prev.userSettings, ...settings },
    }));
  }, []);

  // --------------------------------------------
  // Context Value
  // --------------------------------------------

  const contextValue: SandboxContextValue = {
    stores,
    updateStore,
    resetStores,
    addTask,
    toggleTask,
    addEvent,
    addContact,
    completeHabit,
    addNotification,
    markNotificationRead,
    updateSettings,
  };

  return (
    <SandboxContext.Provider value={contextValue}>
      <div
        className="min-h-screen w-full"
        style={{
          background: themeStyles.surfaceColor || 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: themeStyles.textColor || '#ffffff',
        }}
      >
        {/* CSS Variables für Theme */}
        <style jsx global>{`
          :root {
            --accent-color: ${themeStyles.accentColor || '#8b5cf6'};
            --text-color: ${themeStyles.textColor || '#ffffff'};
            --surface-color: ${themeStyles.surfaceColor || 'rgba(15, 23, 42, 0.9)'};
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          /* Sandbox Scroll erlauben */
          html, body {
            height: 100%;
            overflow: auto;
          }
          
          /* Glassmorphism Utilities */
          .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          /* Card Utilities */
          .card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
          }
          
          /* Button Utilities */
          .btn-primary {
            background: var(--accent-color);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .btn-primary:hover {
            filter: brightness(1.1);
          }
          
          .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-color);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
          }
          
          /* Input Utilities */
          .input {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-color);
            padding: 0.5rem 0.75rem;
            border-radius: 0.5rem;
            outline: none;
            transition: all 0.2s;
          }
          
          .input:focus {
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
          }
          
          /* Scrollbar Styling */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          
          /* Animation Utilities */
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(10px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
          
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }
        `}</style>
        
        {children}
      </div>
    </SandboxContext.Provider>
  );
}



