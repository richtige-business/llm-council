// ============================================
// types.ts - TypeScript Interfaces für Browser Service
// 
// Zweck: Definiert alle Typen für den Browser Service
//        (Sessions, Tabs, API Responses, etc.)
// Verwendet von: session-manager.ts, index.ts
// ============================================

// Hinweis: Browser und Page Typen werden direkt in session-manager.ts 
// von Playwright importiert

// --------------------------------------------
// API Request Types
// Eingehende Anfragen an den Service
// --------------------------------------------

export interface CreateSessionRequest {
  userId: string;
}

export interface NavigateRequest {
  sessionId: string;
  url: string;
  tabId?: string;
}

export interface ClickRequest {
  sessionId: string;
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle';
  tabId?: string;
}

export interface TypeRequest {
  sessionId: string;
  text: string;
  selector?: string;
  tabId?: string;
}

export interface ScrollRequest {
  sessionId: string;
  deltaX: number;
  deltaY: number;
  tabId?: string;
}

export interface KeypressRequest {
  sessionId: string;
  key: string;
  modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[];
  tabId?: string;
}

export interface HoverRequest {
  sessionId: string;
  x: number;
  y: number;
  tabId?: string;
}

export interface CreateTabRequest {
  sessionId: string;
  url?: string;
}

export interface TabActionRequest {
  sessionId: string;
}

// --------------------------------------------
// API Response Types
// Ausgehende Antworten vom Service
// --------------------------------------------

export interface SessionResponse {
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

export interface TabResponse {
  tabId: string;
  url: string;
  title: string;
  screenshot: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
}

// --------------------------------------------
// Service Configuration
// Einstellungen für den Browser Service
// --------------------------------------------

export interface ServiceConfig {
  port: number;                    // Server Port
  viewportWidth: number;           // Browser Viewport Breite
  viewportHeight: number;          // Browser Viewport Höhe
  sessionTimeoutMs: number;        // Session Timeout in ms
  maxSessionsPerUser: number;      // Max Sessions pro User
  defaultUrl: string;              // Standard-Startseite
  headless: boolean;               // Headless Modus?
}

export const DEFAULT_CONFIG: ServiceConfig = {
  port: 3001,
  viewportWidth: 1280,
  viewportHeight: 720,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 Minuten
  maxSessionsPerUser: 3,
  defaultUrl: 'https://www.google.com',
  headless: true, // Im Production-Mode headless
};

