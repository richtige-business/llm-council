// ============================================
// dom-actions.ts - DOM-Interaktions-Funktionen
// 
// Zweck: Findet und interagiert mit DOM-Elementen
// Verwendet von: useVisualAgent
// ============================================

import {
  setCursorPosition,
  setCursorVisible,
  setCursorClicking,
  setCursorLabel,
} from './AgentCursor';
import { useAppStore } from '@/lib/store/app-store';

// Re-export für visual-executor
export { setCursorPosition, setCursorVisible, setCursorLabel };

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

// Wartet eine bestimmte Zeit (für visuelle Effekte)
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Berechnet die Mitte eines Elements
function getElementCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

// --------------------------------------------
// Element finden
// --------------------------------------------

export interface FindElementOptions {
  // Text im Element suchen
  text?: string;
  // CSS-Selektor
  selector?: string;
  // Attribut-Wert
  attribute?: { name: string; value: string };
  // Aria-Label
  ariaLabel?: string;
  // Placeholder-Text (für Inputs)
  placeholder?: string;
  // Nur sichtbare Elemente
  visibleOnly?: boolean;
}

export function findElement(options: FindElementOptions): HTMLElement | null {
  const { text, selector, attribute, ariaLabel, placeholder, visibleOnly = true } = options;

  let elements: HTMLElement[] = [];

  // Per Selektor suchen
  if (selector) {
    elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  }
  // Per aria-label suchen
  else if (ariaLabel) {
    elements = Array.from(
      document.querySelectorAll<HTMLElement>(`[aria-label="${ariaLabel}"]`)
    );
  }
  // Per Placeholder suchen
  else if (placeholder) {
    elements = Array.from(
      document.querySelectorAll<HTMLElement>(`[placeholder*="${placeholder}"]`)
    );
  }
  // Per Attribut suchen
  else if (attribute) {
    elements = Array.from(
      document.querySelectorAll<HTMLElement>(`[${attribute.name}="${attribute.value}"]`)
    );
  }
  // Per Text suchen
  else if (text) {
    // Alle klickbaren Elemente durchsuchen
    const allElements = document.querySelectorAll<HTMLElement>(
      'button, a, [role="button"], input, textarea, [onclick], .cursor-pointer'
    );
    
    elements = Array.from(allElements).filter(el => {
      const elementText = el.textContent?.toLowerCase() || '';
      const searchText = text.toLowerCase();
      return elementText.includes(searchText);
    });

    // Falls nichts gefunden, auch andere Elemente durchsuchen
    if (elements.length === 0) {
      const allOtherElements = document.querySelectorAll<HTMLElement>('*');
      elements = Array.from(allOtherElements).filter(el => {
        const elementText = el.textContent?.toLowerCase() || '';
        const searchText = text.toLowerCase();
        // Nur Elemente die exakt diesen Text haben (nicht Container)
        return elementText === searchText || 
               el.innerText?.toLowerCase().trim() === searchText;
      });
    }
  }

  // Sichtbarkeit prüfen
  if (visibleOnly) {
    elements = elements.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    });
  }

  return elements[0] || null;
}

// --------------------------------------------
// Cursor zu Element bewegen
// --------------------------------------------

export async function moveCursorTo(
  element: HTMLElement,
  label?: string
): Promise<void> {
  const { x, y } = getElementCenter(element);
  
  setCursorVisible(true);
  setCursorLabel(label || null);
  setCursorPosition(x - 12, y - 12); // Offset für Cursor-Spitze
  
  // Warten bis Animation fertig ist
  await wait(400);
}

// --------------------------------------------
// Cursor zu Koordinaten bewegen
// --------------------------------------------

export async function moveCursorToPosition(
  x: number,
  y: number,
  label?: string
): Promise<void> {
  setCursorVisible(true);
  setCursorLabel(label || null);
  setCursorPosition(x - 12, y - 12);
  
  await wait(400);
}

// --------------------------------------------
// Auf Element klicken
// --------------------------------------------

export async function clickElement(
  element: HTMLElement,
  label?: string
): Promise<void> {
  // Cursor zum Element bewegen
  await moveCursorTo(element, label);
  
  // Click-Animation starten
  setCursorClicking(true);
  await wait(150);
  
  // Element scrollen falls nötig
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(100);
  
  // Tatsächlichen Click ausführen
  element.focus();
  element.click();
  
  // Click-Animation beenden
  await wait(150);
  setCursorClicking(false);
  
  // Kurze Pause nach dem Click
  await wait(200);
}

// --------------------------------------------
// Einfache DOM-Manipulation für unkontrollierte Inputs
// Das EventModal verwendet jetzt useRef (unkontrollierte Inputs)
// daher reicht eine einfache DOM-Manipulation!
// --------------------------------------------

// Setzt den Wert eines Input-Elements direkt
function setDOMValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  // Native Value Setter verwenden (für React-Kompatibilität)
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeValueSetter) {
    nativeValueSetter.call(element, value);
  } else {
    element.value = value;
  }
  
  // Input Event dispatchen
  element.dispatchEvent(new InputEvent('input', { 
    bubbles: true, 
    cancelable: true,
    inputType: 'insertText',
    data: value,
  }));
  
  // Change Event dispatchen
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Simuliert Tippen mit Animation
async function simulateTyping(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  speed: number = 25
): Promise<void> {
  // Element fokussieren
  element.focus();
  element.select();
  await wait(50);
  
  // Animation: Text erscheint Buchstabe für Buchstabe
  for (let i = 1; i <= text.length; i++) {
    setDOMValue(element, text.substring(0, i));
    await wait(speed);
  }
  
  // Finalen Wert setzen
  setDOMValue(element, text);
  
  console.log('⌨️ Tippen fertig, Wert:', element.value);
  await wait(50);
}

// Alias für Rückwärtskompatibilität
function setNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  setDOMValue(element, value);
}

// --------------------------------------------
// In Element tippen (mit echter Keyboard-Simulation)
// --------------------------------------------

export async function typeInElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  label?: string
): Promise<void> {
  // Cursor zum Element bewegen
  await moveCursorTo(element, label);
  
  // Click-Animation
  setCursorClicking(true);
  await wait(100);
  
  // Element fokussieren (wichtig!)
  element.focus();
  element.select(); // Alten Text auswählen
  
  setCursorClicking(false);
  await wait(150);
  
  // Label aktualisieren
  setCursorLabel(`Tippe: "${text}"`);
  
  // ECHTE Keyboard-Simulation - jeder Buchstabe einzeln!
  console.log('⌨️ Starte Keyboard-Simulation für:', text);
  await simulateTyping(element, text, 25);
  console.log('⌨️ Keyboard-Simulation fertig, Wert:', element.value);
  
  // Blur und Focus um onChange definitiv zu triggern
  element.blur();
  await wait(50);
  element.focus();
  
  setCursorLabel(null);
  await wait(200);
}

// --------------------------------------------
// Schnell tippen (mit Keyboard-Simulation, aber schneller)
// --------------------------------------------

export async function typeInElementFast(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  label?: string
): Promise<void> {
  // Cursor zum Element bewegen
  await moveCursorTo(element, label);
  
  // Click
  setCursorClicking(true);
  await wait(100);
  element.focus();
  element.select();
  setCursorClicking(false);
  
  await wait(100);
  
  // Schnellere Keyboard-Simulation (10ms pro Zeichen)
  await simulateTyping(element, text, 10);
  
  // Blur und Focus für onChange
  element.blur();
  await wait(50);
  element.focus();
  
  await wait(150);
}

// --------------------------------------------
// Export für externe Verwendung (z.B. visual-executor)
// Für Date/Time Inputs die keine Keyboard-Simulation brauchen
// --------------------------------------------

export function setInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  // Für date/time Inputs reicht der native Setter
  setNativeInputValue(element, value);
}

// Export für vollständige Keyboard-Simulation (für Text-Inputs)
export async function setInputValueWithKeyboard(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): Promise<void> {
  element.focus();
  element.select();
  await simulateTyping(element, value, 5);
  element.blur();
  element.focus();
}

// --------------------------------------------
// Cursor verstecken
// --------------------------------------------

export function hideCursor(): void {
  setCursorVisible(false);
  setCursorLabel(null);
  setCursorClicking(false);
}

// --------------------------------------------
// Cursor zeigen mit Nachricht
// --------------------------------------------

export async function showCursorWithMessage(
  message: string,
  x: number,
  y: number,
  duration: number = 2000
): Promise<void> {
  setCursorPosition(x, y);
  setCursorLabel(message);
  setCursorVisible(true);
  
  await wait(duration);
  
  setCursorLabel(null);
}

// --------------------------------------------
// Erweiterte Visual-Automation Helper
// Diese Helfer kapseln wiederkehrende UI-Schritte
// fuer das neue Visual-Recipe-System.
// --------------------------------------------

function isVisibleElement(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

export async function waitForElement(
  options: FindElementOptions,
  timeoutMs: number = 3000,
  intervalMs: number = 120
): Promise<HTMLElement | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const element = findElement(options);
    if (element) {
      return element;
    }
    await wait(intervalMs);
  }

  return null;
}

export async function waitForElementToDisappear(
  selectorOrOptions: string | FindElementOptions,
  timeoutMs: number = 2500,
  intervalMs: number = 120
): Promise<boolean> {
  const startedAt = Date.now();
  const options =
    typeof selectorOrOptions === 'string'
      ? { selector: selectorOrOptions }
      : selectorOrOptions;

  while (Date.now() - startedAt <= timeoutMs) {
    const element = findElement(options);
    if (!element) {
      return true;
    }
    await wait(intervalMs);
  }

  return false;
}

export async function clickBySelector(
  selector: string,
  label?: string,
  timeoutMs: number = 3000
): Promise<HTMLElement | null> {
  const element = await waitForElement({ selector }, timeoutMs);
  if (!element) {
    return null;
  }

  await clickElement(element, label);
  return element;
}

export async function clickByAgentButton(
  buttonId: string,
  label?: string,
  timeoutMs: number = 3000
): Promise<HTMLElement | null> {
  return clickBySelector(`[data-agent-button="${buttonId}"]`, label, timeoutMs);
}

export async function clickByAgentTab(
  tabId: string,
  label?: string,
  timeoutMs: number = 3000
): Promise<HTMLElement | null> {
  return clickBySelector(`[data-agent-tab="${tabId}"]`, label, timeoutMs);
}

export async function fillByAgentInput(
  inputId: string,
  value: string,
  label?: string,
  timeoutMs: number = 3000
): Promise<HTMLInputElement | HTMLTextAreaElement | null> {
  const element = await waitForElement({
    selector: `[data-agent-input="${inputId}"]`,
  }, timeoutMs);

  if (
    !element ||
    !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
  ) {
    return null;
  }

  await typeInElement(element, value, label);
  return element;
}

export async function clickByText(
  text: string,
  label?: string,
  timeoutMs: number = 2500
): Promise<HTMLElement | null> {
  const element = await waitForElement({ text }, timeoutMs);
  if (!element) {
    return null;
  }

  await clickElement(element, label);
  return element;
}

export async function assertToastOrState(
  selectors: string[],
  timeoutMs: number = 1800,
  intervalMs: number = 120
): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const hasState = selectors.some((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      return Boolean(element && isVisibleElement(element));
    });

    if (hasState) {
      return true;
    }

    await wait(intervalMs);
  }

  return false;
}

export async function openTabAndWait(
  moduleId: string,
  options?: {
    panelSelector?: string;
    allowStoreFallback?: boolean;
    openSidebarFirst?: boolean;
    buttonLabel?: string;
  }
): Promise<HTMLElement | null> {
  const {
    panelSelector = `[data-agent-panel="${moduleId}-root"]`,
    allowStoreFallback = false,
    openSidebarFirst = true,
    buttonLabel,
  } = options || {};

  const existingPanel = panelSelector
    ? findElement({ selector: panelSelector })
    : null;
  if (existingPanel) {
    return existingPanel;
  }

  const isDashboardSurface = Boolean(
    findElement({ selector: '[data-agent-panel="dashboard-root"]' })
  );

  if (isDashboardSurface) {
    const dashboardTrigger = await clickByAgentButton(
      `dashboard-open-${moduleId}`,
      buttonLabel || `Öffne ${moduleId} im Dashboard`,
      1800
    );

    if (dashboardTrigger && panelSelector) {
      const panel = await waitForElement({ selector: panelSelector }, 2500);
      if (panel) {
        return panel;
      }
    }

    // Auf Dashboard-Flächen niemals auf Routenavigation ausweichen:
    // Module sollen als Fenster/Tab geöffnet werden, nicht als Vollseite.
    if (!allowStoreFallback) {
      return null;
    }
  }

  if (!isDashboardSurface && openSidebarFirst) {
    const sidebarPanel = findElement({ selector: '[data-agent-panel="shell-sidebar"]' });
    if (!sidebarPanel) {
      await clickByAgentButton('open-sidebar', 'Öffne Sidebar', 1200);
      await waitForElement({ selector: '[data-agent-panel="shell-sidebar"]' }, 1500);
    }
  }

  const moduleTrigger = await clickByAgentTab(
    moduleId,
    buttonLabel || `Öffne ${moduleId}`,
    1800
  );

  if (moduleTrigger && panelSelector) {
    const panel = await waitForElement({ selector: panelSelector }, 2500);
    if (panel) {
      return panel;
    }
  }

  if (!allowStoreFallback) {
    return null;
  }

  // Fallback: Wenn die sichtbare Navigation kein stabiles Ziel liefert,
  // öffnen wir das Modul kontrolliert über den Store und warten auf das Panel.
  useAppStore.getState().openTab(moduleId);
  if (!panelSelector) {
    await wait(500);
    return null;
  }

  return waitForElement({ selector: panelSelector }, 2500);
}

