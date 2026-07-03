// ============================================
// app-manager.ts - macOS App-Steuerung
// 
// Zweck: Startet, stoppt und listet native macOS-Apps
//        Verwendet child_process für Systembefehle
//        und osascript für AppleScript-Integration
// Verwendet von: index.ts (API-Endpunkte)
// ============================================

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { RunningApp } from './types.js';

// exec als Promise-Version für async/await
const execAsync = promisify(exec);

// --------------------------------------------
// Klasse: AppManager
// Steuert native macOS-Anwendungen
// --------------------------------------------

export class AppManager {
  private screenshotDir: string;

  constructor(screenshotDir: string) {
    this.screenshotDir = screenshotDir;
  }

  // ----------------------------------------
  // Screenshot-Verzeichnis erstellen (falls nötig)
  // Wird beim ersten Screenshot-Aufruf geprüft
  // ----------------------------------------
  private async ensureScreenshotDir(): Promise<void> {
    if (!existsSync(this.screenshotDir)) {
      await mkdir(this.screenshotDir, { recursive: true });
    }
  }

  // ----------------------------------------
  // App starten
  // Öffnet eine macOS-App über den `open`-Befehl
  // Parameter: appName - Name der App (z.B. "Microsoft Excel")
  // ----------------------------------------
  async launchApp(appName: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[AppManager] Starte App: ${appName}`);
      
      // `open -a` startet eine App nach Name
      await execAsync(`open -a "${appName}"`);
      
      // Kurz warten damit die App Zeit hat zu starten
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Prüfen ob die App tatsächlich läuft
      const isRunning = await this.isAppRunning(appName);
      
      if (isRunning) {
        console.log(`[AppManager] App "${appName}" erfolgreich gestartet`);
        return { success: true, message: `${appName} wurde gestartet` };
      } else {
        return { success: false, message: `${appName} konnte nicht gestartet werden` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error(`[AppManager] Fehler beim Starten von "${appName}":`, message);
      return { success: false, message: `Fehler: ${message}` };
    }
  }

  // ----------------------------------------
  // App beenden
  // Beendet eine macOS-App über AppleScript (sanftes Beenden)
  // Parameter: appName - Name der App
  // ----------------------------------------
  async closeApp(appName: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[AppManager] Beende App: ${appName}`);
      
      // AppleScript: Sanftes Beenden der App
      await execAsync(`osascript -e 'quit app "${appName}"'`);
      
      // Kurz warten und prüfen ob beendet
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isRunning = await this.isAppRunning(appName);
      
      if (!isRunning) {
        console.log(`[AppManager] App "${appName}" erfolgreich beendet`);
        return { success: true, message: `${appName} wurde beendet` };
      } else {
        // App reagiert nicht - erzwungenes Beenden
        console.log(`[AppManager] Force-Quit für "${appName}"`);
        await execAsync(`osascript -e 'tell application "${appName}" to quit'`);
        return { success: true, message: `${appName} wurde beendet (erzwungen)` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error(`[AppManager] Fehler beim Beenden von "${appName}":`, message);
      return { success: false, message: `Fehler: ${message}` };
    }
  }

  // ----------------------------------------
  // App in den Vordergrund bringen
  // Aktiviert eine App damit sie sichtbar wird
  // Parameter: appName - Name der App
  // ----------------------------------------
  async focusApp(appName: string): Promise<void> {
    try {
      await execAsync(`osascript -e 'tell application "${appName}" to activate'`);
      console.log(`[AppManager] App "${appName}" in den Vordergrund gebracht`);
    } catch (error) {
      console.error(`[AppManager] Fehler beim Fokussieren von "${appName}":`, error);
    }
  }

  // ----------------------------------------
  // Prüfen ob eine App läuft
  // Verwendet AppleScript um den Status abzufragen
  // Parameter: appName - Name der App
  // Rückgabe: true wenn die App läuft
  // ----------------------------------------
  async isAppRunning(appName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `osascript -e 'tell application "System Events" to (name of processes) contains "${appName}"'`
      );
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  // ----------------------------------------
  // Laufende Apps auflisten
  // Gibt eine Liste aller sichtbaren macOS-Apps zurück
  // Filtert System-Prozesse heraus
  // ----------------------------------------
  async listRunningApps(): Promise<RunningApp[]> {
    try {
      // AppleScript: Alle sichtbaren Apps mit Prozess-Info holen
      const script = `
        tell application "System Events"
          set appList to ""
          repeat with proc in (every process whose background only is false)
            set appName to name of proc
            set appPid to unix id of proc
            set appBundle to bundle identifier of proc
            set appFrontmost to frontmost of proc
            set appList to appList & appName & "|" & appPid & "|" & appBundle & "|" & appFrontmost & "\\n"
          end repeat
          return appList
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      
      // Ausgabe parsen: "AppName|PID|BundleID|isFrontmost\n..."
      const apps: RunningApp[] = stdout
        .trim()
        .split('\n')
        .filter(line => line.includes('|'))
        .map(line => {
          const [name, pid, bundleId, isActive] = line.split('|');
          return {
            name: name?.trim() || 'Unknown',
            pid: parseInt(pid?.trim() || '0', 10),
            bundleId: bundleId?.trim() || '',
            isActive: isActive?.trim() === 'true',
          };
        })
        // System-Apps ausfiltern die nicht relevant sind
        .filter(app => !['Finder', 'Dock', 'SystemUIServer', 'Spotlight'].includes(app.name));

      return apps;
    } catch (error) {
      console.error('[AppManager] Fehler beim Auflisten der Apps:', error);
      return [];
    }
  }

  // ----------------------------------------
  // Screenshot erstellen
  // Nutzt das macOS CLI-Tool `screencapture`
  // Rückgabe: Base64-encodiertes PNG
  // ----------------------------------------
  async takeScreenshot(): Promise<{ screenshot: string; width: number; height: number }> {
    try {
      await this.ensureScreenshotDir();
      
      // Eindeutigen Dateinamen generieren
      const filename = `screenshot-${Date.now()}.png`;
      const filepath = `${this.screenshotDir}/${filename}`;
      
      // screencapture: -x = kein Sound, -C = Cursor einblenden, -t png = PNG-Format
      await execAsync(`screencapture -x -C -t png "${filepath}"`);
      
      // Bild als Base64 einlesen
      const imageBuffer = await readFile(filepath);
      const base64 = imageBuffer.toString('base64');
      
      // Bildgröße ermitteln (aus PNG-Header: Bytes 16-23)
      const width = imageBuffer.readUInt32BE(16);
      const height = imageBuffer.readUInt32BE(20);
      
      // Screenshot-Datei wieder löschen (wir haben den Base64-String)
      execAsync(`rm "${filepath}"`).catch(() => {});
      
      return {
        screenshot: `data:image/png;base64,${base64}`,
        width,
        height,
      };
    } catch (error) {
      console.error('[AppManager] Fehler beim Screenshot:', error);
      throw new Error('Screenshot konnte nicht erstellt werden');
    }
  }
}
