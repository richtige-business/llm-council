// ============================================
// window-manager.ts - Window Management fuer Native Apps
//
// Zweck: Ermittelt Window-IDs, verschiebt Fenster off-screen,
//        und holt sie zurueck. Nutzt Swift-Inline fuer
//        CGWindowList (keine extra Berechtigungen noetig),
//        und AppleScript fuer Window-Verschiebung
//        (braucht Accessibility-Berechtigung).
// Verwendet von: index.ts (API Endpoints), capture-manager.ts
// ============================================

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --------------------------------------------
// Window-Info Interface
// Beschreibt ein macOS-Fenster
// --------------------------------------------

export interface WindowInfo {
  windowId: number;        // CGWindowID
  appName: string;         // Prozessname
  title: string;           // Fenstertitel
  x: number;               // X-Position
  y: number;               // Y-Position
  width: number;           // Fensterbreite
  height: number;          // Fensterhoehe
  isOnScreen: boolean;     // Sichtbar auf dem Bildschirm?
}

// --------------------------------------------
// Vorcompiliertes Swift-Tool nutzen (schneller als swift -e)
// Wir nutzen unser LifeOSCapture Binary nicht,
// sondern inline Swift fuer maximale Flexibilitaet.
// Bei Performance-Problemen: Eigenes Tool kompilieren.
// --------------------------------------------

// Cache: Swift-Aufrufe sind teuer (~1s), daher cachen wir
let cachedSwiftAvailable: boolean | null = null;

// --------------------------------------------
// getWindowInfo - Window-ID und Bounds ermitteln
//
// Nutzt CGWindowListCopyWindowInfo via Swift-Inline.
// Braucht KEINE Accessibility-Berechtigung!
// (Screen Recording Permission kann noetig sein fuer
//  Window-Namen, aber Bounds/IDs gehen immer)
//
// Parameter:
//   appName - Name der App (z.B. "Canva", "Microsoft Excel")
// Rueckgabe:
//   WindowInfo oder null wenn nicht gefunden
// --------------------------------------------

export async function getWindowInfo(appName: string): Promise<WindowInfo | null> {
  try {
    // CGWindowListCopyWindowInfo via Swift
    // .optionAll statt .optionOnScreenOnly - findet auch minimierte Fenster
    const swiftCode = `
import CoreGraphics
import Foundation

let target = "${appName}".lowercased()
let list = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[CFString: Any]] ?? []

for w in list {
  let owner = (w[kCGWindowOwnerName] as? String) ?? ""
  if owner.lowercased() == target || owner.lowercased().contains(target) {
    let wid = (w[kCGWindowNumber] as? Int) ?? 0
    let bounds = w[kCGWindowBounds] as? [String: Any]
    let width = (bounds?["Width"] as? Int) ?? 0
    let height = (bounds?["Height"] as? Int) ?? 0
    if width > 50 && height > 50 {
      let x = (bounds?["X"] as? Int) ?? 0
      let y = (bounds?["Y"] as? Int) ?? 0
      let name = (w[kCGWindowName] as? String) ?? ""
      let onScreen = (w[kCGWindowIsOnscreen] as? Int) ?? 0
      let json: [String: Any] = [
        "windowId": wid,
        "appName": owner,
        "title": name,
        "x": x, "y": y,
        "width": width, "height": height,
        "isOnScreen": onScreen == 1
      ]
      if let data = try? JSONSerialization.data(withJSONObject: json),
         let str = String(data: data, encoding: .utf8) {
        print(str)
      }
      break
    }
  }
}
`;

    const { stdout } = await execAsync(
      `echo ${JSON.stringify(swiftCode)} | swift -`,
      { timeout: 12000 }
    );

    const trimmed = stdout.trim();
    if (!trimmed) return null;

    return JSON.parse(trimmed) as WindowInfo;
  } catch (error) {
    console.error(`[WindowManager] Swift-Abfrage fehlgeschlagen fuer "${appName}":`, error);
    return null;
  }
}

// --------------------------------------------
// getAllWindows - Alle Fenster einer App auflisten
// --------------------------------------------

export async function getAllWindows(appName: string): Promise<WindowInfo[]> {
  try {
    const swiftCode = `
import CoreGraphics
import Foundation

let target = "${appName}".lowercased()
let list = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[CFString: Any]] ?? []
var results: [[String: Any]] = []

for w in list {
  let owner = (w[kCGWindowOwnerName] as? String) ?? ""
  if owner.lowercased() == target || owner.lowercased().contains(target) {
    let wid = (w[kCGWindowNumber] as? Int) ?? 0
    let bounds = w[kCGWindowBounds] as? [String: Any]
    let width = (bounds?["Width"] as? Int) ?? 0
    let height = (bounds?["Height"] as? Int) ?? 0
    if width > 50 && height > 50 {
      let x = (bounds?["X"] as? Int) ?? 0
      let y = (bounds?["Y"] as? Int) ?? 0
      let name = (w[kCGWindowName] as? String) ?? ""
      let onScreen = (w[kCGWindowIsOnscreen] as? Int) ?? 0
      results.append([
        "windowId": wid,
        "appName": owner,
        "title": name,
        "x": x, "y": y,
        "width": width, "height": height,
        "isOnScreen": onScreen == 1
      ])
    }
  }
}

if let data = try? JSONSerialization.data(withJSONObject: results),
   let str = String(data: data, encoding: .utf8) {
  print(str)
}
`;

    const { stdout } = await execAsync(
      `echo ${JSON.stringify(swiftCode)} | swift -`,
      { timeout: 12000 }
    );

    const trimmed = stdout.trim();
    if (!trimmed) return [];

    return JSON.parse(trimmed) as WindowInfo[];
  } catch (error) {
    console.error(`[WindowManager] Fehler beim Auflisten der Fenster fuer "${appName}":`, error);
    return [];
  }
}

// --------------------------------------------
// hideWindow - Fenster off-screen verschieben
//
// Nutzt AppleScript (braucht Accessibility-Berechtigung).
// Wenn das fehlschlaegt, wird ein Hinweis geloggt.
// Das Fenster wird weit nach links verschoben (-10000, 0),
// ist aber fuer ScreenCaptureKit weiterhin sichtbar.
// --------------------------------------------

export async function hideWindow(appName: string): Promise<boolean> {
  try {
    // Zuerst pruefen ob der Prozess existiert und ein Fenster hat
    const script = `
tell application "System Events"
  if exists process "${appName}" then
    tell process "${appName}"
      if exists window 1 then
        set position of window 1 to {-10000, 0}
        return "ok"
      else
        return "no-window"
      end if
    end tell
  else
    return "no-process"
  end if
end tell`;

    const { stdout } = await execAsync(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`,
      { timeout: 5000 }
    );

    const result = stdout.trim();
    if (result === 'ok') {
      console.log(`[WindowManager] Fenster von "${appName}" versteckt (off-screen)`);
      return true;
    }

    console.warn(`[WindowManager] hideWindow "${appName}": ${result}`);
    return false;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Accessibility-Fehler erkennen und hilfreichen Hinweis geben
    if (errMsg.includes('-25211') || errMsg.includes('Hilfszugriff') || errMsg.includes('accessibility')) {
      console.error(`[WindowManager] ACCESSIBILITY-BERECHTIGUNG FEHLT!`);
      console.error(`  Bitte oeffne: Systemeinstellungen > Datenschutz & Sicherheit > Bedienungshilfen`);
      console.error(`  Und fuege hinzu: Terminal, Cursor, oder die App die den Service startet.`);
      console.error(`  Ohne diese Berechtigung kann das Fenster nicht versteckt werden.`);
      console.error(`  Der Stream funktioniert trotzdem, aber das native Fenster bleibt sichtbar.`);
    } else {
      console.error(`[WindowManager] Fehler beim Verstecken von "${appName}":`, errMsg);
    }
    return false;
  }
}

// --------------------------------------------
// showWindow - Fenster zurueck auf den Bildschirm holen
// Setzt die Position auf (100, 100) und aktiviert die App.
// --------------------------------------------

export async function showWindow(appName: string): Promise<boolean> {
  try {
    const script = `
tell application "System Events"
  if exists process "${appName}" then
    tell process "${appName}"
      if exists window 1 then
        set position of window 1 to {100, 100}
      end if
    end tell
  end if
end tell
tell application "${appName}" to activate`;

    await execAsync(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`,
      { timeout: 5000 }
    );

    console.log(`[WindowManager] Fenster von "${appName}" sichtbar gemacht`);
    return true;
  } catch (error) {
    console.error(`[WindowManager] Fehler beim Anzeigen von "${appName}":`, error);
    return false;
  }
}

// --------------------------------------------
// waitForWindow - Wartet bis ein Fenster erscheint
//
// Nutzt CGWindowList via Swift (KEINE Accessibility noetig).
// Pollt alle 1s bis ein Fenster mit passender Groesse da ist.
// Oeffnet die App via 'open -a' falls noch nicht offen.
// Timeout nach maxWaitMs Millisekunden.
// --------------------------------------------

export async function waitForWindow(
  appName: string,
  maxWaitMs: number = 15000
): Promise<WindowInfo | null> {
  const startTime = Date.now();
  const pollInterval = 1500;

  console.log(`[WindowManager] Warte auf Fenster von "${appName}" (max ${maxWaitMs}ms)...`);

  // Sicherstellen dass die App aktiviert ist (bringt Fenster in den Vordergrund)
  try {
    await execAsync(`open -a "${appName}"`, { timeout: 5000 });
    console.log(`[WindowManager] "open -a ${appName}" ausgefuehrt`);
  } catch {
    console.warn(`[WindowManager] "open -a ${appName}" fehlgeschlagen`);
  }

  // Erste Wartezeit: Apps brauchen Zeit zum Starten
  await new Promise(resolve => setTimeout(resolve, 2000));

  while (Date.now() - startTime < maxWaitMs) {
    const info = await getWindowInfo(appName);
    if (info && info.windowId > 0 && info.width > 50 && info.height > 50) {
      console.log(`[WindowManager] Fenster gefunden: ID=${info.windowId}, ${info.width}x${info.height}, "${info.title}"`);
      return info;
    }

    console.log(`[WindowManager] Noch kein Fenster... (${Math.round((Date.now() - startTime) / 1000)}s)`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.warn(`[WindowManager] Timeout: Kein Fenster fuer "${appName}" nach ${maxWaitMs}ms`);
  return null;
}

// --------------------------------------------
// hideAppWindow - App-Fenster sanft verstecken
//
// WICHTIG: Nicht off-screen verschieben (-10000)!
// Das bricht den ScreenCaptureKit-Stream, weil macOS
// off-screen Fenster nicht mehr rendert.
//
// Stattdessen: App ausblenden (set visible to false).
// Das ist wie Cmd+H (Hide) – das Fenster wird unsichtbar,
// aber ScreenCaptureKit mit desktopIndependentWindow
// kann es trotzdem capturen.
//
// Wenn Accessibility fehlt: LifeOS-Browser nach vorne holen
// --------------------------------------------

export async function hideAppWindow(appName: string): Promise<boolean> {
  try {
    // Methode 1: App ausblenden via "set visible to false"
    // Das versteckt die App wie Cmd+H
    const script = `
tell application "System Events"
  if exists process "${appName}" then
    set visible of process "${appName}" to false
    return "hidden"
  end if
end tell
return "no-process"`;

    const { stdout } = await execAsync(
      `osascript -e '${script.replace(/'/g, "'\\''")}'`,
      { timeout: 5000 }
    );

    const result = stdout.trim();
    if (result === 'hidden') {
      console.log(`[WindowManager] "${appName}" ausgeblendet (Cmd+H Aequivalent)`);
      return true;
    }

    console.warn(`[WindowManager] hideAppWindow "${appName}": ${result}`);
    return false;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (errMsg.includes('-25211') || errMsg.includes('Hilfszugriff') || errMsg.includes('accessibility')) {
      console.warn(`[WindowManager] Accessibility fehlt – versuche Browser nach vorne zu holen...`);
      // Fallback: Browser/LifeOS-Fenster nach vorne holen
      try {
        await execAsync(`osascript -e 'tell application "Google Chrome" to activate'`, { timeout: 3000 });
        console.log(`[WindowManager] Google Chrome nach vorne geholt`);
        return true;
      } catch {
        // Letzter Fallback: Safari oder anderer Browser
        try {
          await execAsync(`osascript -e 'tell application "Safari" to activate'`, { timeout: 3000 });
          return true;
        } catch {
          console.warn(`[WindowManager] Konnte Browser nicht nach vorne holen`);
          return false;
        }
      }
    }

    console.error(`[WindowManager] Fehler beim Verstecken von "${appName}":`, errMsg);
    return false;
  }
}
