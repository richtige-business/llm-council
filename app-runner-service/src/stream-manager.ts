// ============================================
// stream-manager.ts - Schlanker Stream-Manager fuer Web-App-Streaming
//
// Zweck: Stellt nur die Container-Endpunkte fuer Browser-Streams bereit
// Verwendet von: Next.js /api/streams, Docker Compose Produktion
// ============================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import httpProxy from 'http-proxy';
import { containerManager } from './container-manager.js';

// --------------------------------------------
// Grundkonfiguration
// Fuer den produktiven Web-App-Stack benoetigen wir nur
// Host, Port und erlaubte Frontend-Origin.
// --------------------------------------------

const port = parseInt(process.env.PORT || '3002', 10);
const bindHost = process.env.HOST || '127.0.0.1';
const frontendUrl = process.env.FRONTEND_URL || '';

const app = express();
const httpServer = createServer(app);
const viewerProxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true,
  ignorePath: true,
});

viewerProxy.on('error', (error, req, res) => {
  console.error('Viewer Proxy Fehler:', error);

  if (res && 'writeHead' in res && 'end' in res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'VIEWER_PROXY_FAILED',
      message: 'Der WebRTC-Viewer konnte die Stream-Session nicht erreichen.',
    }));
  }

  if (req && 'socket' in req && req.socket && !req.socket.destroyed) {
    req.socket.destroy();
  }
});

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    frontendUrl,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --------------------------------------------
// Viewer-HTML fuer Embed-Modus optimieren
// Entfernt sichtbare Viewer-Chrome und zieht das gestreamte
// Video/Canvas auf die gesamte Flaeche auf.
// --------------------------------------------

const EMBED_UI_OVERRIDES = `
<style>
html, body, #neko {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  overflow: hidden !important;
  background: #000 !important;
}

body > p {
  display: none !important;
}

#neko video,
#neko canvas {
  position: fixed !important;
  inset: -2vh -2vw !important;
  width: 104vw !important;
  height: 104vh !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: fill !important;
  background: #000 !important;
}

#neko .video-container,
#neko [class*="video"],
#neko [class*="screen"] {
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #000 !important;
}

#neko button,
#neko [role="button"],
#neko nav,
#neko aside,
#neko footer,
#neko header,
#neko a[href*="github.com/m1k1o/neko"] {
  display: none !important;
}
</style>
<script>
(() => {
  const hideViewerChrome = () => {
    document.querySelectorAll('#neko button, #neko [role="button"], #neko nav, #neko aside, #neko footer, #neko header').forEach((node) => {
      node.style.display = 'none';
      node.style.pointerEvents = 'none';
    });

    document.querySelectorAll('#neko video, #neko canvas').forEach((node) => {
      node.style.position = 'fixed';
      node.style.inset = '-2vh -2vw';
      node.style.width = '104vw';
      node.style.height = '104vh';
      node.style.maxWidth = 'none';
      node.style.maxHeight = 'none';
      node.style.objectFit = 'fill';
      node.style.background = '#000';
    });
  };

  new MutationObserver(hideViewerChrome).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('load', hideViewerChrome);
  window.addEventListener('DOMContentLoaded', hideViewerChrome);
  setInterval(hideViewerChrome, 1500);
})();
</script>
`;

// --------------------------------------------
// Health Endpoint
// Liefert schlanke Service-Metadaten fuer /api/streams/health
// --------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'stream-manager',
    uptime: process.uptime(),
    dockerAvailable: containerManager.isDockerAvailable(),
    activeSessions: containerManager.getAllSessions().length,
  });
});

// --------------------------------------------
// Container starten
// Startet einen WebRTC-Browser-Container fuer eine Ziel-URL
// --------------------------------------------

app.post('/api/container/start', async (req: Request, res: Response) => {
  const { appName, sessionId, url, resolution } = req.body;

  if (!appName || !sessionId) {
    return res.status(400).json({
      error: 'MISSING_PARAMS',
      message: 'appName und sessionId sind erforderlich',
    });
  }

  const existing = containerManager.getSession(sessionId);
  if (existing && existing.status === 'running') {
    return res.json({
      success: true,
      session: existing,
    });
  }

  try {
    const session = await containerManager.startContainer(
      sessionId,
      appName,
      url,
      resolution || '1600x900x24'
    );

    if (session.status === 'error') {
      return res.status(500).json({
        error: 'CONTAINER_START_FAILED',
        message: session.lastError,
        dockerAvailable: containerManager.isDockerAvailable(),
        session,
      });
    }

    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'CONTAINER_ERROR',
      message:
        error instanceof Error
          ? error.message
          : 'Container-Start fehlgeschlagen',
      dockerAvailable: containerManager.isDockerAvailable(),
    });
  }
});

// --------------------------------------------
// Container stoppen
// --------------------------------------------

app.post('/api/container/stop', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      error: 'MISSING_PARAMS',
      message: 'sessionId fehlt',
    });
  }

  await containerManager.stopContainer(sessionId);
  return res.json({ success: true });
});

// --------------------------------------------
// Einzelne Session lesen
// --------------------------------------------

app.get('/api/container/status/:sessionId', (req: Request, res: Response) => {
  const session = containerManager.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Session nicht gefunden',
    });
  }

  return res.json({
    success: true,
    session,
  });
});

// --------------------------------------------
// Bekannte App-Mappings lesen
// --------------------------------------------

app.get('/api/container/apps', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    apps: containerManager.getAvailableApps(),
    dockerAvailable: containerManager.isDockerAvailable(),
  });
});

// --------------------------------------------
// Alle aktiven Sessions lesen
// --------------------------------------------

app.get('/api/container/sessions', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    sessions: containerManager.getAllSessions(),
  });
});

// --------------------------------------------
// Viewer Proxy
// Leitet die Neko-Weboberflaeche ueber einen festen Pfad
// auf derselben Domain an den Session-Container weiter.
// --------------------------------------------

app.get(['/stream/:sessionId', '/stream/:sessionId/'], async (req: Request, res: Response) => {
  const proxyTarget = buildViewerProxyUrl(req.originalUrl, req.params.sessionId);
  if (!proxyTarget) {
    return res.status(404).json({
      error: 'STREAM_NOT_FOUND',
      message: 'Keine aktive Stream-Session fuer diesen Pfad gefunden.',
    });
  }

  try {
    const upstream = await fetch(proxyTarget, {
      headers: {
        accept: req.headers.accept || 'text/html',
      },
    });
    const html = await upstream.text();
    const patchedHtml = html.includes('</head>')
      ? html.replace('</head>', `${EMBED_UI_OVERRIDES}</head>`)
      : `${EMBED_UI_OVERRIDES}${html}`;

    return res
      .status(upstream.status)
      .set('content-type', 'text/html; charset=utf-8')
      .send(patchedHtml);
  } catch (error) {
    console.error('Viewer HTML Override Fehler:', error);
    viewerProxy.web(req, res, { target: proxyTarget });
  }
});

app.use('/stream/:sessionId', (req: Request, res: Response) => {
  const proxyTarget = buildViewerProxyUrl(req.originalUrl, req.params.sessionId);
  if (!proxyTarget) {
    return res.status(404).json({
      error: 'STREAM_NOT_FOUND',
      message: 'Keine aktive Stream-Session fuer diesen Pfad gefunden.',
    });
  }

  viewerProxy.web(req, res, { target: proxyTarget });
});

// --------------------------------------------
// Server starten
// --------------------------------------------

httpServer.listen(port, bindHost, () => {
  console.log('');
  console.log('============================================');
  console.log('  LifeOS Stream Manager Service');
  console.log('============================================');
  console.log(`  Port:             ${port}`);
  console.log(`  Binding:          ${bindHost}`);
  console.log(`  Frontend URL:     ${frontendUrl || '(nicht gesetzt)'}`);
  console.log(
    `  Docker:           ${
      containerManager.isDockerAvailable() ? 'verfuegbar' : 'NICHT VERFUEGBAR'
    }`
  );
  console.log('  Container API:    POST /api/container/start');
  console.log('============================================');
  console.log('');
});

// --------------------------------------------
// Graceful Shutdown
// --------------------------------------------

async function shutdown(): Promise<void> {
  console.log('\nShutdown des Stream-Managers wird eingeleitet...');
  await containerManager.stopAll();

  httpServer.close(() => {
    console.log('HTTP Server geschlossen');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

httpServer.on('upgrade', (req, socket, head) => {
  if (!(req.url || '').startsWith('/stream/')) {
    socket.destroy();
    return;
  }

  const proxyTarget = buildViewerProxyUrl(req.url || '', undefined);
  if (!proxyTarget) {
    socket.destroy();
    return;
  }

  viewerProxy.ws(req, socket, head, { target: proxyTarget });
});

// --------------------------------------------
// Proxy-Ziel fuer den WebRTC-Viewer berechnen
// Entfernt den Session-Praefix und leitet dann auf den internen
// HTTP/WebSocket-Endpunkt des passenden Browser-Containers weiter.
// --------------------------------------------

function buildViewerProxyUrl(
  requestUrl: string,
  routeSessionId?: string
): string | null {
  try {
    const parsedUrl = new URL(requestUrl, 'http://stream-manager.local');
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const sessionId = routeSessionId || pathParts[1];

    if (!sessionId) {
      return null;
    }

    const targetBase = containerManager.getViewerProxyTarget(sessionId);
    if (!targetBase) {
      return null;
    }

    const forwardedPath =
      pathParts.length > 2 ? `/${pathParts.slice(2).join('/')}` : '/';

    return `${targetBase}${forwardedPath}${parsedUrl.search}`;
  } catch {
    return null;
  }
}
