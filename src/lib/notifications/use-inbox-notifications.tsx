// ============================================
// use-inbox-notifications.ts - Hook für Inbox-Integration
// 
// Zweck: Verbindet den Notification-Bus mit dem Inbox-Store
//        System-Benachrichtigungen landen automatisch im Postfach
// Verwendet von: InboxPage.tsx oder Root-Layout
// ============================================

'use client';

import React, { useEffect } from 'react';
import { useInboxStore } from '@/modules/inbox/store';
import { subscribeToNotifications, type SystemNotification } from './notification-bus';

// --------------------------------------------
// Hook: useInboxNotifications
// Konvertiert System-Benachrichtigungen in Inbox-Nachrichten
// --------------------------------------------

/**
 * Hook der System-Benachrichtigungen ins Postfach leitet
 * Sollte einmal in der App-Root aufgerufen werden
 * 
 * @example
 * // In layout.tsx oder einem Provider
 * function AppProviders({ children }) {
 *   useInboxNotifications();
 *   return <>{children}</>;
 * }
 */
export function useInboxNotifications() {
  const addMessage = useInboxStore((state) => state.addMessage);

  useEffect(() => {
    // Auf neue Benachrichtigungen hören
    const unsubscribe = subscribeToNotifications((notification) => {
      // System-Benachrichtigung in Inbox-Message konvertieren
      const message = convertToInboxMessage(notification);
      
      // Zur Inbox hinzufügen
      addMessage(message);
      
      // Optional: Browser-Notification zeigen
      showBrowserNotification(notification);
    });

    // Cleanup beim Unmount
    return unsubscribe;
  }, [addMessage]);
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

/**
 * Konvertiert eine System-Benachrichtigung in eine Inbox-Message
 */
function convertToInboxMessage(notification: SystemNotification) {
  // Source-Namen formatieren
  const sourceNames: Record<string, string> = {
    calendar: 'Kalender',
    tasks: 'Aufgaben',
    notes: 'Notizen',
    system: 'System',
  };

  return {
    id: notification.id,
    accountId: null,  // System-Nachrichten haben kein E-Mail-Konto
    type: 'system' as const,
    
    subject: notification.title,
    body: notification.body,
    bodyHtml: null,
    snippet: notification.body.slice(0, 150),
    
    sender: sourceNames[notification.source] || notification.source,
    senderName: sourceNames[notification.source] || notification.source,
    
    recipients: [],
    cc: [],
    bcc: [],
    
    isRead: false,
    isStarred: false,
    isArchived: false,
    isDeleted: false,
    
    folder: 'inbox' as const,
    labels: [notification.source],
    priority: notification.priority || 'normal',
    
    source: notification.source,
    actionUrl: notification.actionUrl || null,
    
    hasAttachments: false,
    attachments: [],
    
    threadId: null,
    externalId: null,
    
    receivedAt: notification.createdAt,
    createdAt: notification.createdAt,
    
    // KI-Analyse Felder
    category: 'unknown' as const,
    urgency: 3 as 1 | 2 | 3 | 4 | 5,
    contactId: null,
    hasCalendarAction: false,
    calendarActionProcessed: false,
  };
}

/**
 * Zeigt eine Browser-Notification (wenn erlaubt)
 */
async function showBrowserNotification(notification: SystemNotification) {
  // Prüfen ob Notifications verfügbar und erlaubt sind
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  // Permission anfordern falls nötig
  let permission = Notification.permission;
  
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return;
  }

  // Notification anzeigen
  const browserNotification = new Notification(notification.title, {
    body: notification.body,
    icon: '/favicon.ico',
    tag: notification.id,  // Verhindert Duplikate
    data: { url: notification.actionUrl },
  });

  // Bei Klick zur Action-URL navigieren
  browserNotification.onclick = () => {
    if (notification.actionUrl) {
      window.focus();
      window.location.href = notification.actionUrl;
    }
    browserNotification.close();
  };

  // Auto-close nach 5 Sekunden
  setTimeout(() => {
    browserNotification.close();
  }, 5000);
}

// --------------------------------------------
// Provider-Komponente (Alternative zum Hook)
// --------------------------------------------

/**
 * Provider-Komponente die den Hook intern verwendet
 * Kann statt des Hooks in der App-Root verwendet werden
 * 
 * @example
 * <InboxNotificationProvider>
 *   <App />
 * </InboxNotificationProvider>
 */
export function InboxNotificationProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  useInboxNotifications();
  return <>{children}</>;
}

