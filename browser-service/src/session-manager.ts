// ============================================
// session-manager.ts - Playwright Session Management
// 
// Zweck: Verwaltet Browser-Sessions mit Playwright
//        Erstellt, verwaltet und beendet Browser-Instanzen
// Verwendet von: index.ts (Express Routes)
// ============================================

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import type { ServiceConfig } from './types.js';

// --------------------------------------------
// Browser Tab Interface (für Playwright)
// --------------------------------------------

export interface BrowserTab {
  id: string;
  page: Page;
  url: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
}

// --------------------------------------------
// Browser Session Interface
// --------------------------------------------

export interface BrowserSession {
  sessionId: string;
  userId: string;
  browser: Browser;
  context: BrowserContext;
  tabs: Map<string, BrowserTab>;
  activeTabId: string | null;
  createdAt: Date;
  lastActivityAt: Date;
}

// --------------------------------------------
// Session Manager Klasse
// Zentrale Verwaltung aller Browser-Sessions
// --------------------------------------------

export class SessionManager {
  private sessions: Map<string, BrowserSession> = new Map();
  private config: ServiceConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: ServiceConfig) {
    this.config = config;
    
    // Starte automatischen Cleanup alle 5 Minuten
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
    
    console.log('[SessionManager] Initialisiert mit Config:', {
      viewportWidth: config.viewportWidth,
      viewportHeight: config.viewportHeight,
      sessionTimeoutMs: config.sessionTimeoutMs,
      headless: config.headless,
    });
  }

  // ----------------------------------------
  // Session erstellen
  // ----------------------------------------
  
  async createSession(userId: string): Promise<BrowserSession> {
    console.log(`[SessionManager] Erstelle Session für User: ${userId}`);
    
    // Prüfe ob User bereits max Sessions hat
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId);
    
    if (userSessions.length >= this.config.maxSessionsPerUser) {
      const oldest = userSessions.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )[0];
      
      if (oldest) {
        console.log(`[SessionManager] Max Sessions erreicht, beende älteste: ${oldest.sessionId}`);
        await this.destroySession(oldest.sessionId);
      }
    }

    // Neuen Browser starten mit Playwright
    console.log('[SessionManager] Starte Playwright Browser...');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    // Browser Context erstellen (wie ein Incognito-Fenster)
    const context = await browser.newContext({
      viewport: {
        width: this.config.viewportWidth,
        height: this.config.viewportHeight,
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const sessionId = uuidv4();
    const now = new Date();

    const session: BrowserSession = {
      sessionId,
      userId,
      browser,
      context,
      tabs: new Map(),
      activeTabId: null,
      createdAt: now,
      lastActivityAt: now,
    };

    this.sessions.set(sessionId, session);
    console.log(`[SessionManager] Session erstellt: ${sessionId}`);

    return session;
  }

  // ----------------------------------------
  // Session abrufen
  // ----------------------------------------
  
  getSession(sessionId: string): BrowserSession | undefined {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.lastActivityAt = new Date();
    }
    
    return session;
  }

  // ----------------------------------------
  // Session beenden
  // ----------------------------------------
  
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      console.log(`[SessionManager] Session nicht gefunden: ${sessionId}`);
      return;
    }

    console.log(`[SessionManager] Beende Session: ${sessionId}`);

    try {
      await session.context.close();
      await session.browser.close();
    } catch (error) {
      console.error(`[SessionManager] Fehler beim Beenden der Session:`, error);
    }

    this.sessions.delete(sessionId);
    console.log(`[SessionManager] Session beendet: ${sessionId}`);
  }

  // ----------------------------------------
  // Tab erstellen
  // ----------------------------------------
  
  async createTab(sessionId: string, url?: string): Promise<BrowserTab> {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session nicht gefunden');
    }

    const targetUrl = url || this.config.defaultUrl;
    console.log(`[SessionManager] Erstelle Tab: ${targetUrl}`);

    // Neue Seite im Context öffnen
    const page = await session.context.newPage();

    const tabId = uuidv4();
    
    // Tab-Objekt erstellen
    const tab: BrowserTab = {
      id: tabId,
      page,
      url: 'about:blank',
      title: 'Neue Seite',
      isActive: true,
      createdAt: new Date(),
    };

    // Alle anderen Tabs deaktivieren
    for (const existingTab of session.tabs.values()) {
      existingTab.isActive = false;
    }

    // Tab zum Store hinzufügen
    session.tabs.set(tabId, tab);
    session.activeTabId = tabId;

    // Zur URL navigieren
    try {
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      
      // Warte kurz für Rendering
      await page.waitForTimeout(500);
      
      // Tab-Info aktualisieren
      tab.url = page.url();
      tab.title = await page.title() || 'Neue Seite';
      
    } catch (error) {
      console.error(`[SessionManager] Navigation fehlgeschlagen:`, error);
      tab.url = targetUrl;
      tab.title = 'Fehler beim Laden';
    }

    console.log(`[SessionManager] Tab erstellt: ${tabId}`);
    return tab;
  }

  // ----------------------------------------
  // Tab abrufen
  // ----------------------------------------
  
  getTab(sessionId: string, tabId?: string): BrowserTab | undefined {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return undefined;
    }

    if (tabId) {
      return session.tabs.get(tabId);
    }

    if (session.activeTabId) {
      return session.tabs.get(session.activeTabId);
    }

    return session.tabs.values().next().value;
  }

  // ----------------------------------------
  // Tab schließen
  // ----------------------------------------
  
  async closeTab(sessionId: string, tabId: string): Promise<void> {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session nicht gefunden');
    }

    const tab = session.tabs.get(tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    console.log(`[SessionManager] Schließe Tab: ${tabId}`);

    try {
      await tab.page.close();
    } catch (e) {
      // Ignorieren
    }

    session.tabs.delete(tabId);

    if (session.activeTabId === tabId) {
      const remainingTabs = Array.from(session.tabs.values());
      session.activeTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
      
      if (session.activeTabId) {
        const newActiveTab = session.tabs.get(session.activeTabId);
        if (newActiveTab) {
          newActiveTab.isActive = true;
        }
      }
    }
  }

  // ----------------------------------------
  // Tab aktivieren
  // ----------------------------------------
  
  async activateTab(sessionId: string, tabId: string): Promise<BrowserTab> {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session nicht gefunden');
    }

    const tab = session.tabs.get(tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    for (const t of session.tabs.values()) {
      t.isActive = false;
    }

    tab.isActive = true;
    session.activeTabId = tabId;

    await tab.page.bringToFront();

    return tab;
  }

  // ----------------------------------------
  // Zu URL navigieren
  // ----------------------------------------
  
  async navigate(sessionId: string, url: string, tabId?: string): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    console.log(`[SessionManager] Navigiere zu: ${url}`);

    try {
      await tab.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await tab.page.waitForTimeout(500);
    } catch (error) {
      console.error(`[SessionManager] Navigation fehlgeschlagen:`, error);
    }

    tab.url = tab.page.url();
    tab.title = await tab.page.title() || url;

    return tab;
  }

  // ----------------------------------------
  // Zurück navigieren
  // ----------------------------------------
  
  async goBack(sessionId: string, tabId?: string): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    await tab.page.goBack({ waitUntil: 'domcontentloaded' });
    
    tab.url = tab.page.url();
    tab.title = await tab.page.title() || tab.url;

    return tab;
  }

  // ----------------------------------------
  // Vorwärts navigieren
  // ----------------------------------------
  
  async goForward(sessionId: string, tabId?: string): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    await tab.page.goForward({ waitUntil: 'domcontentloaded' });
    
    tab.url = tab.page.url();
    tab.title = await tab.page.title() || tab.url;

    return tab;
  }

  // ----------------------------------------
  // Seite neu laden
  // ----------------------------------------
  
  async refresh(sessionId: string, tabId?: string): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    await tab.page.reload({ waitUntil: 'domcontentloaded' });
    
    tab.url = tab.page.url();
    tab.title = await tab.page.title() || tab.url;

    return tab;
  }

  // ----------------------------------------
  // Screenshot erstellen
  // ----------------------------------------
  
  async getScreenshot(sessionId: string, tabId?: string): Promise<string> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    const screenshot = await tab.page.screenshot({
      type: 'png',
    });

    return `data:image/png;base64,${screenshot.toString('base64')}`;
  }

  // ----------------------------------------
  // Klick ausführen
  // ----------------------------------------
  
  async click(
    sessionId: string, 
    x: number, 
    y: number, 
    button: 'left' | 'right' | 'middle' = 'left',
    tabId?: string
  ): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    console.log(`[SessionManager] Klick bei (${x}, ${y})`);

    await tab.page.mouse.click(x, y, { button });
    
    // Kurz warten für mögliche Navigation/Updates
    await tab.page.waitForTimeout(500);
    
    tab.url = tab.page.url();
    tab.title = await tab.page.title() || tab.url;

    return tab;
  }

  // ----------------------------------------
  // Text eingeben
  // ----------------------------------------
  
  async type(
    sessionId: string, 
    text: string, 
    selector?: string,
    tabId?: string
  ): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    console.log(`[SessionManager] Texteingabe: "${text}"`);

    if (selector) {
      await tab.page.fill(selector, text);
    } else {
      await tab.page.keyboard.type(text);
    }

    return tab;
  }

  // ----------------------------------------
  // Scrollen
  // ----------------------------------------
  
  async scroll(
    sessionId: string, 
    deltaX: number, 
    deltaY: number,
    tabId?: string
  ): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    console.log(`[SessionManager] Scroll (${deltaX}, ${deltaY})`);

    await tab.page.mouse.wheel(deltaX, deltaY);

    return tab;
  }

  // ----------------------------------------
  // Taste drücken
  // ----------------------------------------
  
  async keypress(
    sessionId: string, 
    key: string, 
    modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[],
    tabId?: string
  ): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    console.log(`[SessionManager] Tastendruck: ${key}`);

    if (modifiers && modifiers.length > 0) {
      const keyCombo = [...modifiers, key].join('+');
      await tab.page.keyboard.press(keyCombo);
    } else {
      await tab.page.keyboard.press(key);
    }

    await tab.page.waitForTimeout(300);
    
    tab.url = tab.page.url();
    tab.title = await tab.page.title() || tab.url;

    return tab;
  }

  // ----------------------------------------
  // Hover über Position
  // ----------------------------------------
  
  async hover(
    sessionId: string, 
    x: number, 
    y: number,
    tabId?: string
  ): Promise<BrowserTab> {
    const tab = this.getTab(sessionId, tabId);
    
    if (!tab) {
      throw new Error('Tab nicht gefunden');
    }

    await tab.page.mouse.move(x, y);

    return tab;
  }

  // ----------------------------------------
  // Cleanup abgelaufener Sessions
  // ----------------------------------------
  
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const age = now - session.lastActivityAt.getTime();
      
      if (age > this.config.sessionTimeoutMs) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      console.log(`[SessionManager] Session abgelaufen: ${sessionId}`);
      await this.destroySession(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`[SessionManager] ${expiredSessions.length} abgelaufene Sessions bereinigt`);
    }
  }

  // ----------------------------------------
  // Shutdown
  // ----------------------------------------
  
  async shutdown(): Promise<void> {
    console.log('[SessionManager] Shutdown...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const sessionId of this.sessions.keys()) {
      await this.destroySession(sessionId);
    }

    console.log('[SessionManager] Shutdown abgeschlossen');
  }

  // ----------------------------------------
  // Statistiken
  // ----------------------------------------
  
  getStats(): { activeSessions: number; totalTabs: number } {
    let totalTabs = 0;
    
    for (const session of this.sessions.values()) {
      totalTabs += session.tabs.size;
    }

    return {
      activeSessions: this.sessions.size,
      totalTabs,
    };
  }
}
