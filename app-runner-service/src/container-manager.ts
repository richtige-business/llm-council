// ============================================
// container-manager.ts - WebRTC Browser Container Management
//
// Zweck: Startet, ueberwacht und beendet isolierte Browser-
//        Container fuer Web-App-Streaming auf Basis von Neko.
// Verwendet von: stream-manager.ts
// ============================================

import { randomBytes } from 'crypto';
import { exec, execSync } from 'child_process';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --------------------------------------------
// Container Session Status
// Beschreibt den Zustand einer aktiven WebRTC-Session
// --------------------------------------------

export interface ContainerSession {
  sessionId: string;
  containerId: string;
  containerName?: string;
  appName: string;
  targetUrl: string;
  vncPort?: number;
  wsPort?: number;
  viewerPort: number;
  tcpMuxPort: number;
  udpMuxPort: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startedAt: number;
  lastError: string | null;
  resolution: string;
  novncUrl?: string;
  viewerUrl?: string;
  internalViewerBaseUrl?: string;
  seleniumUrl?: string;
  userName: string;
  userPassword: string;
  adminPassword: string;
}

// --------------------------------------------
// Bekannte Web-App URLs
// Mapping von App-Namen zu URLs
// --------------------------------------------

const APP_URLS: Record<string, string> = {
  'canva': 'https://www.canva.com',
  'figma': 'https://www.figma.com',
  'google-docs': 'https://docs.google.com',
  'google-sheets': 'https://sheets.google.com',
  'google-slides': 'https://slides.google.com',
  'notion': 'https://www.notion.so',
  'miro': 'https://miro.com',
  'slack': 'https://app.slack.com',
  'discord': 'https://discord.com/app',
  'spotify': 'https://open.spotify.com',
  'chatgpt': 'https://chat.openai.com',
  'github': 'https://github.com',
  'trello': 'https://trello.com',
  'airtable': 'https://airtable.com',
  'linear': 'https://linear.app',
  'youtube': 'https://www.youtube.com',
  'twitter': 'https://x.com',
  'photopea': 'https://www.photopea.com',
  'excalidraw': 'https://excalidraw.com',
  'whatsapp': 'https://web.whatsapp.com',
};

// --------------------------------------------
// ContainerManager
// Verwaltet Neko/WebRTC Container pro App-Session
// --------------------------------------------

class ContainerManager {
  private readonly sessionContainerPrefix = 'lifeos-webrtc-browser-';
  private readonly dockerHost =
    process.env.STREAM_MANAGER_INTERNAL_HOST || '127.0.0.1';
  private readonly dockerNetwork =
    process.env.STREAM_MANAGER_DOCKER_NETWORK || '';
  private readonly runtimePath =
    process.env.STREAM_MANAGER_RUNTIME_PATH || '/opt/lifeos-runtime';
  private readonly runtimeVolumeName =
    process.env.STREAM_MANAGER_RUNTIME_VOLUME_NAME || 'lifeos-stream-runtime';
  private readonly childRuntimePath =
    process.env.STREAM_MANAGER_CHILD_RUNTIME_PATH || '/opt/lifeos-runtime';
  private readonly publicBaseUrl =
    process.env.STREAM_PUBLIC_BASE_URL ||
    process.env.FRONTEND_URL ||
    'http://127.0.0.1';
  private readonly viewerHost =
    process.env.STREAM_MANAGER_DIRECT_VIEWER_HOST || '127.0.0.1';
  private readonly publicIp =
    process.env.STREAM_WEBRTC_PUBLIC_IP || this.derivePublicIpFromBaseUrl();

  private sessions: Map<string, ContainerSession> = new Map();
  private readonly imageName =
    process.env.STREAM_BROWSER_IMAGE || 'ghcr.io/m1k1o/neko/chromium:latest';
  private nextViewerPort = 18080;
  private nextTcpMuxPort = 53000;
  private nextUdpMuxPort = 54000;
  private readonly maxPortOffset = 99;
  private dockerAvailable = false;

  constructor() {
    this.checkDocker();
  }

  // --------------------------------------------
  // Docker-Verfuegbarkeit pruefen
  // --------------------------------------------

  private checkDocker(): void {
    try {
      execSync('docker info', { stdio: 'ignore', timeout: 5000 });
      this.dockerAvailable = true;
      console.log('[ContainerManager] Docker verfuegbar');
      this.cleanupOldContainers();
    } catch {
      this.dockerAvailable = false;
      console.warn('[ContainerManager] Docker NICHT verfuegbar!');
    }
  }

  // --------------------------------------------
  // Image pruefen/pullen
  // --------------------------------------------

  async ensureImage(): Promise<boolean> {
    if (!this.dockerAvailable) return false;

    try {
      await execAsync(`docker image inspect ${this.imageName}`, { timeout: 5000 });
      console.log(`[ContainerManager] Image "${this.imageName}" vorhanden`);
      return true;
    } catch {
      console.log(`[ContainerManager] Image "${this.imageName}" nicht gefunden, pulle...`);
      try {
        await execAsync(`docker pull --platform linux/amd64 ${this.imageName}`, {
          timeout: 180000,
        });
        return true;
      } catch (error) {
        console.error('[ContainerManager] Image-Pull fehlgeschlagen:', error);
        return false;
      }
    }
  }

  // --------------------------------------------
  // Container starten
  // Startet einen isolierten Neko-Browser fuer eine Ziel-URL.
  // --------------------------------------------

  async startContainer(
    sessionId: string,
    appName: string,
    url?: string,
    resolution: string = '1600x900x24'
  ): Promise<ContainerSession> {
    if (!this.dockerAvailable) {
      return {
        sessionId,
        containerId: '',
        appName,
        targetUrl: url || '',
        vncPort: 0,
        wsPort: 0,
        viewerPort: 0,
        tcpMuxPort: 0,
        udpMuxPort: 0,
        status: 'error',
        startedAt: Date.now(),
        lastError: 'Docker ist nicht verfuegbar.',
        resolution,
        novncUrl: '',
        seleniumUrl: '',
        userName: '',
        userPassword: '',
        adminPassword: '',
      };
    }

    const existing = this.sessions.get(sessionId);
    if (existing && existing.status === 'running') {
      return existing;
    }

    const targetUrl =
      url ||
      APP_URLS[appName.toLowerCase()] ||
      `https://www.google.com/search?q=${encodeURIComponent(appName)}`;

    const { width, height } = this.parseResolution(resolution);
    const viewerPort = this.getNextPort('viewer');
    const tcpMuxPort = this.getNextPort('tcpmux');
    const udpMuxPort = this.getNextPort('udpmux');
    const containerName = `${this.sessionContainerPrefix}${sessionId
      .replace(/[^a-zA-Z0-9]/g, '-')
      .slice(0, 32)}`;
    const userName = `lifeos-${sessionId.slice(-6)}`;
    const userPassword = this.createSecret();
    const adminPassword = this.createSecret();
    const internalViewerBaseUrl = this.buildInternalViewerBaseUrl(
      containerName,
      viewerPort
    );

    const session: ContainerSession = {
      sessionId,
      containerId: '',
      containerName,
      appName,
      targetUrl,
      vncPort: 0,
      wsPort: 0,
      viewerPort,
      tcpMuxPort,
      udpMuxPort,
      status: 'starting',
      startedAt: Date.now(),
      lastError: null,
      resolution,
      novncUrl: '',
      viewerUrl: this.buildDirectViewerUrl(viewerPort, userName, userPassword),
      internalViewerBaseUrl,
      seleniumUrl: '',
      userName,
      userPassword,
      adminPassword,
    };

    this.sessions.set(sessionId, session);

    try {
      const imageReady = await this.ensureImage();
      if (!imageReady) {
        session.status = 'error';
        session.lastError = 'WebRTC-Image konnte nicht geladen werden';
        return session;
      }

      await this.prepareRuntimeFiles(session);

      console.log(
        `[ContainerManager] Starte WebRTC-Browser fuer "${appName}" (${targetUrl})...`
      );
      console.log(
        `[ContainerManager] Ports: Viewer=${viewerPort}, TCPMUX=${tcpMuxPort}, UDPMUX=${udpMuxPort}`
      );

      const runtimeSessionPath = `${this.childRuntimePath}/${sessionId}`;
      const publicIpEnv = this.publicIp
        ? `-e NEKO_WEBRTC_NAT1TO1=${this.escapeShellArg(this.publicIp)} `
        : '';

      const command =
        `docker run -d --rm --platform linux/amd64 ` +
        `--name ${containerName} ` +
        `${this.dockerNetwork ? `--network ${this.dockerNetwork} ` : ''}` +
        `-p ${viewerPort}:8080 ` +
        `-p ${tcpMuxPort}:${tcpMuxPort}/tcp ` +
        `-p ${udpMuxPort}:${udpMuxPort}/udp ` +
        `--cap-add=SYS_ADMIN ` +
        `--shm-size=2g ` +
        `--mount type=volume,src=${this.runtimeVolumeName},dst=${this.childRuntimePath} ` +
        `-e NEKO_DESKTOP_SCREEN=${width}x${height}@30 ` +
        `-e NEKO_MEMBER_MULTIUSER_USER_PASSWORD=${this.escapeShellArg(userPassword)} ` +
        `-e NEKO_MEMBER_MULTIUSER_ADMIN_PASSWORD=${this.escapeShellArg(adminPassword)} ` +
        `-e NEKO_SESSION_IMPLICIT_HOSTING=1 ` +
        `-e NEKO_WEBRTC_TCPMUX=${tcpMuxPort} ` +
        `-e NEKO_WEBRTC_UDPMUX=${udpMuxPort} ` +
        `-e NEKO_WEBRTC_ICELITE=1 ` +
        `${publicIpEnv}` +
        `${this.imageName} ` +
        `sh -lc ${this.escapeShellArg(
          `cp "${runtimeSessionPath}/chromium.conf" /etc/neko/supervisord/chromium.conf && ` +
            `sed -i 's#</openbox_config>#<applications><application class="*"><decor>no</decor><maximized>yes</maximized><fullscreen>yes</fullscreen></application></applications></openbox_config>#' /etc/neko/openbox.xml && ` +
            `(command -v unclutter >/dev/null 2>&1 && unclutter -idle 0 -jitter 10000 -root >/tmp/unclutter.log 2>&1 &) ; ` +
            `exec /usr/bin/supervisord -c /etc/neko/supervisord.conf`
        )}`;

      const { stdout } = await execAsync(command, { timeout: 120000 });
      const containerId = stdout.trim().slice(0, 12);
      session.containerId = containerId;

      console.log(`[ContainerManager] Container gestartet: ${containerId}`);

      await this.waitForReady(session, 45000);

      session.status = 'running';
      console.log(
        `[ContainerManager] "${appName}" laeuft! Viewer: ${session.viewerUrl}`
      );
      return session;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[ContainerManager] Start fehlgeschlagen:', errMsg);
      session.status = 'error';
      session.lastError = errMsg;
      return session;
    }
  }

  // --------------------------------------------
  // Container stoppen und Runtime-Dateien entfernen
  // --------------------------------------------

  async stopContainer(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.containerId) {
      try {
        console.log(`[ContainerManager] Stoppe Container ${session.containerId}...`);
        await execAsync(`docker stop ${session.containerId}`, { timeout: 15000 });
      } catch {
        try {
          await execAsync(`docker rm -f ${session.containerId}`, { timeout: 5000 });
        } catch {
          // Ignorieren
        }
      }
    }

    await this.cleanupRuntimeFiles(sessionId);
    session.status = 'stopped';
    this.sessions.delete(sessionId);
    console.log(`[ContainerManager] Container gestoppt fuer Session ${sessionId}`);
  }

  getSession(sessionId: string): ContainerSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessions(): ContainerSession[] {
    return Array.from(this.sessions.values());
  }

  getViewerProxyTarget(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return session.internalViewerBaseUrl || null;
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map((id) =>
      this.stopContainer(id)
    );
    await Promise.all(promises);
  }

  isDockerAvailable(): boolean {
    return this.dockerAvailable;
  }

  getAppUrl(appName: string): string | null {
    return APP_URLS[appName.toLowerCase()] || null;
  }

  getAvailableApps(): { name: string; url: string }[] {
    return Object.entries(APP_URLS).map(([name, url]) => ({ name, url }));
  }

  // --------------------------------------------
  // Runtime-Dateien fuer Chromium Kiosk erzeugen
  // --------------------------------------------

  private async prepareRuntimeFiles(session: ContainerSession): Promise<void> {
    const sessionRuntimeDir = join(this.runtimePath, session.sessionId);
    await mkdir(sessionRuntimeDir, { recursive: true });

    await writeFile(
      join(sessionRuntimeDir, 'chromium.conf'),
      this.buildChromiumSupervisorConfig(session),
      'utf8'
    );
  }

  private async cleanupRuntimeFiles(sessionId: string): Promise<void> {
    await rm(join(this.runtimePath, sessionId), {
      recursive: true,
      force: true,
    }).catch(() => undefined);
  }

  // --------------------------------------------
  // Container-Erreichbarkeit pruefen
  // Die Neko-HTTP-Oberflaeche muss antworten, bevor die Session
  // an das Frontend gemeldet wird.
  // --------------------------------------------

  private async waitForReady(
    session: ContainerSession,
    timeoutMs: number
  ): Promise<void> {
    const startTime = Date.now();
    const viewerUrl = session.internalViewerBaseUrl;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${viewerUrl}/`, {
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          console.log(
            `[ContainerManager] WebRTC-Viewer bereit auf ${viewerUrl}`
          );
          return;
        }
      } catch {
        // Noch nicht bereit
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(
      `WebRTC-Browser nicht bereit (Timeout, URL: ${viewerUrl}/)`
    );
  }

  // --------------------------------------------
  // Alte Container bereinigen
  // --------------------------------------------

  private cleanupOldContainers(): void {
    try {
      execSync(
        `docker ps -aq --filter "name=${this.sessionContainerPrefix}" | xargs docker rm -f 2>/dev/null || true`,
        { timeout: 10000, stdio: 'ignore' }
      );
      console.log('[ContainerManager] Alte Container bereinigt');
    } catch {
      // Ignorieren
    }
  }

  // --------------------------------------------
  // Port-Allokation
  // Viewer-Port fuer HTTP/WebSocket, MUX-Ports fuer WebRTC.
  // --------------------------------------------

  private getNextPort(type: 'viewer' | 'tcpmux' | 'udpmux'): number {
    if (type === 'viewer') {
      const port = this.nextViewerPort;
      this.nextViewerPort++;
      if (this.nextViewerPort > 18080 + this.maxPortOffset) {
        this.nextViewerPort = 18080;
      }
      return port;
    }

    if (type === 'tcpmux') {
      const port = this.nextTcpMuxPort;
      this.nextTcpMuxPort++;
      if (this.nextTcpMuxPort > 53000 + this.maxPortOffset) {
        this.nextTcpMuxPort = 53000;
      }
      return port;
    }

    const port = this.nextUdpMuxPort;
    this.nextUdpMuxPort++;
    if (this.nextUdpMuxPort > 54000 + this.maxPortOffset) {
      this.nextUdpMuxPort = 54000;
    }
    return port;
  }

  // --------------------------------------------
  // Browser-Startkonfiguration
  // Chromium startet im Kiosk-Modus direkt auf der Ziel-URL,
  // damit weder Tabs noch URL-Bar sichtbar sind.
  // --------------------------------------------

  private buildChromiumSupervisorConfig(session: ContainerSession): string {
    const { width, height } = this.parseResolution(session.resolution);
    const safeUrl = session.targetUrl.replace(/"/g, '%22');

    return `\
[program:chromium]
environment=HOME="/home/%(ENV_USER)s",USER="%(ENV_USER)s",DISPLAY="%(ENV_DISPLAY)s"
command=/usr/bin/chromium
 --window-position=0,0
 --display=%(ENV_DISPLAY)s
 --user-data-dir=/home/neko/.config/chromium
 --no-first-run
 --kiosk
 --start-fullscreen
 --window-size=${width},${height}
 --bwsi
 --disable-background-networking
 --disable-features=Translate,AutomationControlled,ExtensionsToolbarMenu
 --autoplay-policy=no-user-gesture-required
 --disable-file-system
 --disable-gpu
 --disable-software-rasterizer
 --disable-dev-shm-usage
 ${safeUrl}
stopsignal=INT
autorestart=true
priority=800
user=%(ENV_USER)s
stdout_logfile=/var/log/neko/chromium.log
stdout_logfile_maxbytes=100MB
stdout_logfile_backups=10
redirect_stderr=true

[program:openbox]
environment=HOME="/home/%(ENV_USER)s",USER="%(ENV_USER)s",DISPLAY="%(ENV_DISPLAY)s"
command=/usr/bin/openbox --config-file /etc/neko/openbox.xml
autorestart=true
priority=300
user=%(ENV_USER)s
stdout_logfile=/var/log/neko/openbox.log
stdout_logfile_maxbytes=100MB
stdout_logfile_backups=10
redirect_stderr=true
`;
  }

  // --------------------------------------------
  // Viewer-URLs
  // Direkt-Zugriff wird lokal verwendet; auf dem Server wird
  // spaeter derselbe Viewer ueber /stream/:sessionId geproxied.
  // --------------------------------------------

  private buildDirectViewerUrl(
    viewerPort: number,
    userName: string,
    userPassword: string
  ): string {
    try {
      const baseUrl = new URL(this.publicBaseUrl);
      baseUrl.hostname = this.viewerHost;
      baseUrl.port = String(viewerPort);
      baseUrl.pathname = '/';
      baseUrl.search = this.buildViewerQuery(userName, userPassword);
      return baseUrl.toString();
    } catch {
      return `http://${this.viewerHost}:${viewerPort}/${this.buildViewerQuery(
        userName,
        userPassword
      )}`;
    }
  }

  private buildViewerQuery(userName: string, userPassword: string): string {
    const params = new URLSearchParams({
      usr: userName,
      pwd: userPassword,
      cast: '1',
      embed: '1',
      mute_chat: '1',
      volume: '0',
    });
    return `?${params.toString()}`;
  }

  private buildInternalViewerBaseUrl(
    containerName: string,
    mappedPort: number
  ): string {
    if (this.dockerNetwork) {
      return `http://${containerName}:8080`;
    }

    return `http://${this.dockerHost}:${mappedPort}`;
  }

  // --------------------------------------------
  // Hilfsfunktionen
  // --------------------------------------------

  private parseResolution(resolution: string): {
    width: number;
    height: number;
    depth: number;
  } {
    const match = resolution.match(/^(\d+)x(\d+)x(\d+)$/i);
    if (!match) {
      return { width: 1600, height: 900, depth: 24 };
    }

    return {
      width: Number(match[1]) || 1600,
      height: Number(match[2]) || 900,
      depth: Number(match[3]) || 24,
    };
  }

  private createSecret(): string {
    return randomBytes(18).toString('base64url');
  }

  private derivePublicIpFromBaseUrl(): string {
    try {
      const hostname = new URL(this.publicBaseUrl).hostname;
      return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ? hostname : '';
    } catch {
      return '';
    }
  }

  private escapeShellArg(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}

export const containerManager = new ContainerManager();
