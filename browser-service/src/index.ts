// ============================================
// index.ts - Browser Service Express Server
// 
// Zweck: Haupt-Einstiegspunkt für den Browser Service
//        Stellt REST-API für Browser-Steuerung bereit
// Verwendet von: LifeOS Frontend (browser-api.ts)
// ============================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { SessionManager } from './session-manager.js';
import { 
  DEFAULT_CONFIG,
  type CreateSessionRequest,
  type NavigateRequest,
  type ClickRequest,
  type TypeRequest,
  type ScrollRequest,
  type KeypressRequest,
  type HoverRequest,
  type CreateTabRequest,
  type TabActionRequest,
  type SessionResponse,
  type NavigateResponse,
  type InteractionResponse,
  type ScreenshotResponse,
  type TabResponse,
  type ErrorResponse,
} from './types.js';

// --------------------------------------------
// Express App erstellen
// --------------------------------------------

const app = express();
const config = {
  ...DEFAULT_CONFIG,
  // Überschreibe mit Umgebungsvariablen wenn vorhanden
  port: parseInt(process.env.PORT || '3001'),
  headless: process.env.HEADLESS !== 'false',
};

// Session Manager initialisieren
const sessionManager = new SessionManager(config);

// --------------------------------------------
// Middleware
// --------------------------------------------

// CORS für LifeOS Frontend erlauben
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));

// JSON Body Parser
app.use(express.json());

// Request Logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --------------------------------------------
// Error Handler Helper
// --------------------------------------------

function sendError(res: Response, status: number, code: string, message: string): void {
  const error: ErrorResponse = { error: code, message, code };
  res.status(status).json(error);
}

// --------------------------------------------
// Health Check Endpoint
// GET /health
// --------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  const stats = sessionManager.getStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    ...stats,
  });
});

// --------------------------------------------
// Session Endpoints
// --------------------------------------------

// POST /api/session - Neue Session erstellen
app.post('/api/session', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as CreateSessionRequest;
    
    if (!userId) {
      return sendError(res, 400, 'MISSING_USER_ID', 'userId ist erforderlich');
    }

    console.log(`[API] Erstelle Session für User: ${userId}`);
    const session = await sessionManager.createSession(userId);
    
    // Ersten Tab erstellen (mit mehr Zeit für Browser-Start)
    console.log(`[API] Erstelle ersten Tab...`);
    const tab = await sessionManager.createTab(session.sessionId);
    
    console.log(`[API] Tab erstellt, hole Screenshot...`);

    const response: SessionResponse = {
      sessionId: session.sessionId,
      createdAt: session.createdAt.toISOString(),
      tabs: [{
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        isActive: tab.isActive,
      }],
    };

    console.log(`[API] Session erfolgreich erstellt: ${session.sessionId}`);
    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler beim Erstellen der Session:', error);
    sendError(res, 500, 'SESSION_ERROR', 'Session konnte nicht erstellt werden');
  }
});

// GET /api/session/:sessionId - Session abrufen
app.get('/api/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session nicht gefunden');
    }

    const response: SessionResponse = {
      sessionId: session.sessionId,
      createdAt: session.createdAt.toISOString(),
      tabs: Array.from(session.tabs.values()).map(tab => ({
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        isActive: tab.isActive,
      })),
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler beim Abrufen der Session:', error);
    sendError(res, 500, 'SESSION_ERROR', 'Session konnte nicht abgerufen werden');
  }
});

// DELETE /api/session/:sessionId - Session beenden
app.delete('/api/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await sessionManager.destroySession(sessionId);
    res.json({ success: true });
    
  } catch (error) {
    console.error('[API] Fehler beim Beenden der Session:', error);
    sendError(res, 500, 'SESSION_ERROR', 'Session konnte nicht beendet werden');
  }
});

// --------------------------------------------
// Navigation Endpoints
// --------------------------------------------

// POST /api/navigate - Zu URL navigieren
app.post('/api/navigate', async (req: Request, res: Response) => {
  try {
    const { sessionId, url, tabId } = req.body as NavigateRequest;
    
    if (!sessionId || !url) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId und url sind erforderlich');
    }

    const tab = await sessionManager.navigate(sessionId, url, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: NavigateResponse = {
      success: true,
      url: tab.url,
      title: tab.title,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Navigation:', error);
    sendError(res, 500, 'NAVIGATE_ERROR', 'Navigation fehlgeschlagen');
  }
});

// POST /api/navigate/back - Zurück navigieren
app.post('/api/navigate/back', async (req: Request, res: Response) => {
  try {
    const { sessionId, tabId } = req.body as { sessionId: string; tabId?: string };
    
    if (!sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId ist erforderlich');
    }

    const tab = await sessionManager.goBack(sessionId, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: NavigateResponse = {
      success: true,
      url: tab.url,
      title: tab.title,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Zurück-Navigation:', error);
    sendError(res, 500, 'NAVIGATE_ERROR', 'Zurück-Navigation fehlgeschlagen');
  }
});

// POST /api/navigate/forward - Vorwärts navigieren
app.post('/api/navigate/forward', async (req: Request, res: Response) => {
  try {
    const { sessionId, tabId } = req.body as { sessionId: string; tabId?: string };
    
    if (!sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId ist erforderlich');
    }

    const tab = await sessionManager.goForward(sessionId, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: NavigateResponse = {
      success: true,
      url: tab.url,
      title: tab.title,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Vorwärts-Navigation:', error);
    sendError(res, 500, 'NAVIGATE_ERROR', 'Vorwärts-Navigation fehlgeschlagen');
  }
});

// POST /api/navigate/refresh - Seite neu laden
app.post('/api/navigate/refresh', async (req: Request, res: Response) => {
  try {
    const { sessionId, tabId } = req.body as { sessionId: string; tabId?: string };
    
    if (!sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId ist erforderlich');
    }

    const tab = await sessionManager.refresh(sessionId, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: NavigateResponse = {
      success: true,
      url: tab.url,
      title: tab.title,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler beim Neu laden:', error);
    sendError(res, 500, 'NAVIGATE_ERROR', 'Seite neu laden fehlgeschlagen');
  }
});

// --------------------------------------------
// Interaction Endpoints
// --------------------------------------------

// POST /api/interact/click - Klick ausführen
app.post('/api/interact/click', async (req: Request, res: Response) => {
  try {
    const { sessionId, x, y, button, tabId } = req.body as ClickRequest;
    
    if (!sessionId || x === undefined || y === undefined) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId, x und y sind erforderlich');
    }

    const tab = await sessionManager.click(sessionId, x, y, button || 'left', tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: InteractionResponse = {
      success: true,
      screenshot,
      url: tab.url,
      title: tab.title,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Klick:', error);
    sendError(res, 500, 'INTERACTION_ERROR', 'Klick fehlgeschlagen');
  }
});

// POST /api/interact/type - Text eingeben
app.post('/api/interact/type', async (req: Request, res: Response) => {
  try {
    const { sessionId, text, selector, tabId } = req.body as TypeRequest;
    
    if (!sessionId || !text) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId und text sind erforderlich');
    }

    const tab = await sessionManager.type(sessionId, text, selector, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: InteractionResponse = {
      success: true,
      screenshot,
      url: tab.url,
      title: tab.title,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Texteingabe:', error);
    sendError(res, 500, 'INTERACTION_ERROR', 'Texteingabe fehlgeschlagen');
  }
});

// POST /api/interact/scroll - Scrollen
app.post('/api/interact/scroll', async (req: Request, res: Response) => {
  try {
    const { sessionId, deltaX, deltaY, tabId } = req.body as ScrollRequest;
    
    if (!sessionId || deltaX === undefined || deltaY === undefined) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId, deltaX und deltaY sind erforderlich');
    }

    const tab = await sessionManager.scroll(sessionId, deltaX, deltaY, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: InteractionResponse = {
      success: true,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler beim Scrollen:', error);
    sendError(res, 500, 'INTERACTION_ERROR', 'Scrollen fehlgeschlagen');
  }
});

// POST /api/interact/keypress - Taste drücken
app.post('/api/interact/keypress', async (req: Request, res: Response) => {
  try {
    const { sessionId, key, modifiers, tabId } = req.body as KeypressRequest;
    
    if (!sessionId || !key) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId und key sind erforderlich');
    }

    const tab = await sessionManager.keypress(sessionId, key, modifiers, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: InteractionResponse = {
      success: true,
      screenshot,
      url: tab.url,
      title: tab.title,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Tastendruck:', error);
    sendError(res, 500, 'INTERACTION_ERROR', 'Tastendruck fehlgeschlagen');
  }
});

// POST /api/interact/hover - Hover
app.post('/api/interact/hover', async (req: Request, res: Response) => {
  try {
    const { sessionId, x, y, tabId } = req.body as HoverRequest;
    
    if (!sessionId || x === undefined || y === undefined) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId, x und y sind erforderlich');
    }

    const tab = await sessionManager.hover(sessionId, x, y, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: InteractionResponse = {
      success: true,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Hover:', error);
    sendError(res, 500, 'INTERACTION_ERROR', 'Hover fehlgeschlagen');
  }
});

// --------------------------------------------
// Screenshot Endpoint
// --------------------------------------------

// GET /api/screenshot/:sessionId/:tabId? - Screenshot abrufen
app.get('/api/screenshot/:sessionId/:tabId?', async (req: Request, res: Response) => {
  try {
    const { sessionId, tabId } = req.params;
    
    const tab = sessionManager.getTab(sessionId, tabId);
    
    if (!tab) {
      return sendError(res, 404, 'TAB_NOT_FOUND', 'Tab nicht gefunden');
    }

    const screenshot = await sessionManager.getScreenshot(sessionId, tabId);

    const response: ScreenshotResponse = {
      screenshot,
      url: tab.url,
      title: tab.title,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler bei Screenshot:', error);
    sendError(res, 500, 'SCREENSHOT_ERROR', 'Screenshot fehlgeschlagen');
  }
});

// --------------------------------------------
// Tab Endpoints
// --------------------------------------------

// POST /api/tabs - Neuen Tab erstellen
app.post('/api/tabs', async (req: Request, res: Response) => {
  try {
    const { sessionId, url } = req.body as CreateTabRequest;
    
    if (!sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId ist erforderlich');
    }

    const tab = await sessionManager.createTab(sessionId, url);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: TabResponse = {
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler beim Erstellen des Tabs:', error);
    sendError(res, 500, 'TAB_ERROR', 'Tab konnte nicht erstellt werden');
  }
});

// DELETE /api/tabs/:tabId - Tab schließen
app.delete('/api/tabs/:tabId', async (req: Request, res: Response) => {
  try {
    const { tabId } = req.params;
    const { sessionId } = req.body as TabActionRequest;
    
    if (!sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId ist erforderlich');
    }

    await sessionManager.closeTab(sessionId, tabId);
    res.json({ success: true });
    
  } catch (error) {
    console.error('[API] Fehler beim Schließen des Tabs:', error);
    sendError(res, 500, 'TAB_ERROR', 'Tab konnte nicht geschlossen werden');
  }
});

// PUT /api/tabs/:tabId/activate - Tab aktivieren
app.put('/api/tabs/:tabId/activate', async (req: Request, res: Response) => {
  try {
    const { tabId } = req.params;
    const { sessionId } = req.body as TabActionRequest;
    
    if (!sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'sessionId ist erforderlich');
    }

    const tab = await sessionManager.activateTab(sessionId, tabId);
    const screenshot = await sessionManager.getScreenshot(sessionId, tab.id);

    const response: TabResponse = {
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      screenshot,
    };

    res.json(response);
    
  } catch (error) {
    console.error('[API] Fehler beim Aktivieren des Tabs:', error);
    sendError(res, 500, 'TAB_ERROR', 'Tab konnte nicht aktiviert werden');
  }
});

// --------------------------------------------
// Server starten
// --------------------------------------------

const server = app.listen(config.port, () => {
  console.log('');
  console.log('============================================');
  console.log('  LifeOS Browser Service');
  console.log('============================================');
  console.log(`  Port:       ${config.port}`);
  console.log(`  Viewport:   ${config.viewportWidth}x${config.viewportHeight}`);
  console.log(`  Headless:   ${config.headless}`);
  console.log(`  Timeout:    ${config.sessionTimeoutMs / 1000 / 60} Minuten`);
  console.log('============================================');
  console.log('');
  console.log(`Server läuft auf http://localhost:${config.port}`);
  console.log('');
});

// --------------------------------------------
// Graceful Shutdown
// --------------------------------------------

async function shutdown(): Promise<void> {
  console.log('\nShutdown wird eingeleitet...');
  
  server.close(async () => {
    console.log('HTTP Server geschlossen');
    await sessionManager.shutdown();
    process.exit(0);
  });

  // Force shutdown nach 10 Sekunden
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled Errors loggen
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

