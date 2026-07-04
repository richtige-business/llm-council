// ============================================
// element-discovery.ts - Automatische Tool-Erkennung
// 
// Zweck: Scannt die aktuelle Seite nach interaktiven Elementen
//        die als Tools verwendet werden könnten
// Verwendet von: AgentSettings, SandboxOverlay
// ============================================

import { useSandboxStore, type DiscoveredElement } from '../stores/sandbox-store';

// --------------------------------------------
// CSS Selector Generator (vereinfacht)
// --------------------------------------------

function generateSelector(element: HTMLElement): string {
  // Priorität 1: data-agent Attribute
  if (element.dataset.agentId) {
    return `[data-agent-id="${element.dataset.agentId}"]`;
  }
  if (element.dataset.agentButton) {
    return `[data-agent-button="${element.dataset.agentButton}"]`;
  }
  if (element.dataset.agentInput) {
    return `[data-agent-input="${element.dataset.agentInput}"]`;
  }
  
  // Priorität 2: ID
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Priorität 3: Name Attribute
  const name = element.getAttribute('name');
  if (name) {
    return `${element.tagName.toLowerCase()}[name="${name}"]`;
  }
  
  // Priorität 4: Aria Label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${ariaLabel}"]`;
  }
  
  // Fallback: Tag + Index
  const siblings = Array.from(element.parentElement?.children || [])
    .filter(c => c.tagName === element.tagName);
  
  if (siblings.length > 1) {
    const index = siblings.indexOf(element) + 1;
    return `${element.tagName.toLowerCase()}:nth-of-type(${index})`;
  }
  
  return element.tagName.toLowerCase();
}

// --------------------------------------------
// Confidence Score berechnen
// Wie wahrscheinlich ist es, dass dieses Element ein Tool ist?
// --------------------------------------------

function calculateConfidence(element: HTMLElement): number {
  let score = 0;
  
  // Hat data-agent Attribute? +40%
  if (element.dataset.agentId || element.dataset.agentButton || element.dataset.agentInput) {
    score += 0.4;
  }
  
  // Hat eine ID? +15%
  if (element.id) {
    score += 0.15;
  }
  
  // Hat aria-label? +15%
  if (element.getAttribute('aria-label')) {
    score += 0.15;
  }
  
  // Hat sichtbaren Text? +10%
  const text = element.textContent?.trim();
  if (text && text.length > 0 && text.length < 50) {
    score += 0.1;
  }
  
  // Ist ein Button? +10%
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    score += 0.1;
  }
  
  // Ist ein Input mit Placeholder? +10%
  if (element instanceof HTMLInputElement && element.placeholder) {
    score += 0.1;
  }
  
  // Ist sichtbar? +10%
  const rect = element.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    score += 0.1;
  }
  
  return Math.min(score, 1);
}

// --------------------------------------------
// Suggested Action bestimmen
// --------------------------------------------

function determineSuggestedAction(element: HTMLElement): DiscoveredElement['suggestedAction'] {
  // Links -> navigate
  if (element.tagName === 'A' && element.getAttribute('href')) {
    return 'navigate';
  }
  
  // Inputs und Textareas -> input
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return 'input';
  }
  
  // Selects -> select
  if (element instanceof HTMLSelectElement) {
    return 'select';
  }
  
  // Alles andere (Buttons, etc.) -> click
  return 'click';
}

// --------------------------------------------
// Elemente scannen
// --------------------------------------------

export function discoverInteractiveElements(): DiscoveredElement[] {
  const discovered: DiscoveredElement[] = [];
  const seenSelectors = new Set<string>();
  
  // Alle interaktiven Elemente finden
  const selectors = [
    'button',
    '[role="button"]',
    'a[href]',
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[data-agent-id]',
    '[data-agent-button]',
    '[data-agent-input]',
    '[tabindex]:not([tabindex="-1"])',
    '[onclick]',
  ];
  
  const elements = document.querySelectorAll<HTMLElement>(selectors.join(', '));
  
  elements.forEach((element) => {
    // Ignoriere versteckte Elemente
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return;
    }
    
    // Ignoriere Elemente ohne Größe
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    
    // Ignoriere Sandbox-Controls
    if (element.closest('[data-sandbox-control]')) {
      return;
    }
    
    // Ignoriere bereits gesehene Selektoren
    const selector = generateSelector(element);
    if (seenSelectors.has(selector)) {
      return;
    }
    seenSelectors.add(selector);
    
    // Confidence berechnen
    const confidence = calculateConfidence(element);
    
    // Nur Elemente mit ausreichend hoher Confidence
    if (confidence < 0.2) {
      return;
    }
    
    // Element zur Liste hinzufügen
    discovered.push({
      id: `discovered-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      selector,
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim().slice(0, 50) || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined,
      dataAgentId: element.dataset.agentId || element.dataset.agentButton || element.dataset.agentInput || undefined,
      role: element.getAttribute('role') || undefined,
      type: element instanceof HTMLInputElement ? element.type : undefined,
      placeholder: element instanceof HTMLInputElement ? element.placeholder : undefined,
      suggestedAction: determineSuggestedAction(element),
      confidence,
    });
  });
  
  // Nach Confidence sortieren (höchste zuerst)
  discovered.sort((a, b) => b.confidence - a.confidence);
  
  return discovered;
}

// --------------------------------------------
// Discovery Hook
// --------------------------------------------

export function useElementDiscovery() {
  const isDiscovering = useSandboxStore((state) => state.isDiscovering);
  const discoveredElements = useSandboxStore((state) => state.discoveredElements);
  const startDiscovery = useSandboxStore((state) => state.startDiscovery);
  const stopDiscovery = useSandboxStore((state) => state.stopDiscovery);
  const setDiscoveredElements = useSandboxStore((state) => state.setDiscoveredElements);
  const createToolFromDiscovery = useSandboxStore((state) => state.createToolFromDiscovery);
  
  const discover = () => {
    startDiscovery();
    
    // Kurze Verzögerung damit DOM vollständig gerendert ist
    setTimeout(() => {
      const elements = discoverInteractiveElements();
      setDiscoveredElements(elements);
      stopDiscovery();
    }, 100);
  };
  
  const refresh = () => {
    const elements = discoverInteractiveElements();
    setDiscoveredElements(elements);
  };
  
  return {
    isDiscovering,
    discoveredElements,
    discover,
    refresh,
    createTool: createToolFromDiscovery,
  };
}

// --------------------------------------------
// Visual Highlighting für entdeckte Elemente
// --------------------------------------------

let highlightOverlays: HTMLElement[] = [];

export function highlightDiscoveredElements(elements: DiscoveredElement[]): void {
  // Entferne alte Highlights
  clearHighlights();
  
  elements.forEach((element, index) => {
    const domElement = document.querySelector(element.selector);
    if (!domElement) return;
    
    const rect = domElement.getBoundingClientRect();
    
    // Overlay erstellen
    const overlay = document.createElement('div');
    overlay.className = 'discovery-highlight';
    overlay.dataset.sandboxControl = 'true';
    overlay.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid rgba(251, 191, 36, 0.8);
      background: rgba(251, 191, 36, 0.1);
      pointer-events: none;
      z-index: 99990;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    
    // Label mit Index
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      background: rgba(251, 191, 36, 1);
      color: black;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    `;
    label.textContent = `${index + 1}. ${element.text?.slice(0, 20) || element.tagName}`;
    overlay.appendChild(label);
    
    document.body.appendChild(overlay);
    highlightOverlays.push(overlay);
  });
}

export function clearHighlights(): void {
  highlightOverlays.forEach(overlay => overlay.remove());
  highlightOverlays = [];
}


