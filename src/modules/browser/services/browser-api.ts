// ============================================
// browser-api.ts - API Client für Browser Service
// 
// Zweck: Kommunikation mit dem externen Browser Service
//        (Puppeteer-basierter Headless Browser)
// Verwendet von: store.ts, BrowserTab.tsx
// ============================================

// --------------------------------------------
// Browser Service URL
// Der externe Service der echten Browser bereitstellt
// --------------------------------------------

const BROWSER_SERVICE_URL = process.env.NEXT_PUBLIC_BROWSER_SERVICE_URL || 'http://localhost:3001';

// --------------------------------------------
// Types für API Responses
// --------------------------------------------

export interface BrowserSessionResponse {
  sessionId: string;
  createdAt: string;
  tabs: Array<{
    tabId: string;
    url: string;
    title: string;
    isActive: boolean;
  }>;
}

export interface NavigateResponse {
  success: boolean;
  url: string;
  title: string;
  screenshot: string; // Base64 encoded PNG
}

export interface InteractionResponse {
  success: boolean;
  screenshot: string;
  url?: string;
  title?: string;
}

export interface ScreenshotResponse {
  screenshot: string;
  url: string;
  title: string;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message: string;
  code: string;
}

// --------------------------------------------
// Session Management
// Erstellen und Verwalten von Browser-Sessions
// --------------------------------------------

/**
 * Erstellt eine neue Browser-Session
 * Startet einen neuen Headless-Browser im Service
 * 
 * @param userId - ID des Users für Session-Zuordnung
 * @returns Session-Daten mit sessionId
 */
export async function createSession(userId: string): Promise<BrowserSessionResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Session konnte nicht erstellt werden');
  }

  return response.json();
}

/**
 * Beendet eine Browser-Session
 * Schließt den Browser und gibt Ressourcen frei
 * 
 * @param sessionId - ID der zu beendenden Session
 */
export async function destroySession(sessionId: string): Promise<void> {
  await fetch(`${BROWSER_SERVICE_URL}/api/session/${sessionId}`, {
    method: 'DELETE',
  });
}

/**
 * Holt Session-Info
 * 
 * @param sessionId - Session ID
 */
export async function getSession(sessionId: string): Promise<BrowserSessionResponse | null> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/session/${sessionId}`);
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}

// --------------------------------------------
// Navigation
// URL-Navigation im Browser
// --------------------------------------------

/**
 * Navigiert zu einer URL
 * 
 * @param sessionId - Session ID
 * @param url - Ziel-URL
 * @param tabId - Optional: Tab ID (sonst aktiver Tab)
 * @returns Response mit Screenshot und Seiteninfo
 */
export async function navigateToUrl(
  sessionId: string, 
  url: string,
  tabId?: string
): Promise<NavigateResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/navigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, url, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Navigation fehlgeschlagen');
  }

  return response.json();
}

/**
 * Navigiert zurück
 */
export async function navigateBack(sessionId: string, tabId?: string): Promise<NavigateResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/navigate/back`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Zurück-Navigation fehlgeschlagen');
  }

  return response.json();
}

/**
 * Navigiert vorwärts
 */
export async function navigateForward(sessionId: string, tabId?: string): Promise<NavigateResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/navigate/forward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Vorwärts-Navigation fehlgeschlagen');
  }

  return response.json();
}

/**
 * Lädt Seite neu
 */
export async function refreshPage(sessionId: string, tabId?: string): Promise<NavigateResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/navigate/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Seite neu laden fehlgeschlagen');
  }

  return response.json();
}

// --------------------------------------------
// Interaktion
// Maus und Tastatur Eingaben
// --------------------------------------------

/**
 * Führt einen Klick aus
 * 
 * @param sessionId - Session ID
 * @param x - X-Koordinate
 * @param y - Y-Koordinate
 * @param button - Maustaste (left, right, middle)
 */
export async function click(
  sessionId: string,
  x: number,
  y: number,
  button: 'left' | 'right' | 'middle' = 'left',
  tabId?: string
): Promise<InteractionResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/interact/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, x, y, button, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Klick fehlgeschlagen');
  }

  return response.json();
}

/**
 * Gibt Text ein
 * 
 * @param sessionId - Session ID
 * @param text - Einzugebender Text
 * @param selector - Optional: CSS-Selector für Eingabefeld
 */
export async function type(
  sessionId: string,
  text: string,
  selector?: string,
  tabId?: string
): Promise<InteractionResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/interact/type`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text, selector, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Texteingabe fehlgeschlagen');
  }

  return response.json();
}

/**
 * Scrollt die Seite
 * 
 * @param sessionId - Session ID
 * @param deltaX - Horizontaler Scroll-Wert
 * @param deltaY - Vertikaler Scroll-Wert
 */
export async function scroll(
  sessionId: string,
  deltaX: number,
  deltaY: number,
  tabId?: string
): Promise<InteractionResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/interact/scroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, deltaX, deltaY, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Scroll fehlgeschlagen');
  }

  return response.json();
}

/**
 * Drückt eine Taste
 * 
 * @param sessionId - Session ID
 * @param key - Taste (z.B. "Enter", "Escape", "Backspace")
 * @param modifiers - Modifier-Tasten (Control, Shift, Alt, Meta)
 */
export async function keypress(
  sessionId: string,
  key: string,
  modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[],
  tabId?: string
): Promise<InteractionResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/interact/keypress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, key, modifiers, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Tastendruck fehlgeschlagen');
  }

  return response.json();
}

/**
 * Hover über Element
 */
export async function hover(
  sessionId: string,
  x: number,
  y: number,
  tabId?: string
): Promise<InteractionResponse> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/interact/hover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, x, y, tabId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Hover fehlgeschlagen');
  }

  return response.json();
}

// --------------------------------------------
// Screenshot
// Aktuelle Seite als Bild
// --------------------------------------------

/**
 * Holt aktuellen Screenshot
 * 
 * @param sessionId - Session ID
 * @param tabId - Optional: Tab ID
 * @returns Screenshot als Base64 und Seiteninfo
 */
export async function getScreenshot(
  sessionId: string,
  tabId?: string
): Promise<ScreenshotResponse> {
  const url = tabId 
    ? `${BROWSER_SERVICE_URL}/api/screenshot/${sessionId}/${tabId}`
    : `${BROWSER_SERVICE_URL}/api/screenshot/${sessionId}`;
    
  const response = await fetch(url);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Screenshot fehlgeschlagen');
  }

  return response.json();
}

// --------------------------------------------
// Tab Management
// Tabs erstellen und verwalten
// --------------------------------------------

/**
 * Erstellt neuen Tab
 */
export async function createTab(
  sessionId: string,
  url?: string
): Promise<{ tabId: string; url: string; title: string; screenshot: string }> {
  const response = await fetch(`${BROWSER_SERVICE_URL}/api/tabs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, url }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Tab konnte nicht erstellt werden');
  }

  return response.json();
}

/**
 * Schließt Tab
 */
export async function closeTab(sessionId: string, tabId: string): Promise<void> {
  await fetch(`${BROWSER_SERVICE_URL}/api/tabs/${tabId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}

/**
 * Aktiviert Tab
 */
export async function activateTab(sessionId: string, tabId: string): Promise<void> {
  await fetch(`${BROWSER_SERVICE_URL}/api/tabs/${tabId}/activate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}

// --------------------------------------------
// Health Check
// Prüft ob Browser Service erreichbar ist
// --------------------------------------------

/**
 * Prüft ob der Browser Service läuft
 * 
 * @returns true wenn Service erreichbar
 */
export async function checkServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BROWSER_SERVICE_URL}/health`, {
      method: 'GET',
      // Kurzer Timeout für Health Check
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// --------------------------------------------
// Export der Service URL für Debugging
// --------------------------------------------

export const browserServiceUrl = BROWSER_SERVICE_URL;

