// ============================================
// action-recorder.ts - Zeichnet User-Interaktionen auf
// 
// Zweck: Erfasst Clicks, Inputs, etc. für Teach by Doing
// Verwendet von: SandboxOverlay
// ============================================

import { useSandboxStore, type RecordedAction } from '../stores/sandbox-store';

// --------------------------------------------
// CSS Selector Generator
// Generiert einen eindeutigen Selector für ein Element
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
  
  // Priorität 3: Unique class combination
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c && !c.startsWith('hover:') && !c.startsWith('focus:'));
    if (classes.length > 0) {
      // Versuche eine eindeutige Klassen-Kombination zu finden
      const selector = `${element.tagName.toLowerCase()}.${classes.slice(0, 3).join('.')}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Priorität 4: Aria Label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${ariaLabel}"]`;
  }
  
  // Priorität 5: Name Attribute (für Inputs)
  const name = element.getAttribute('name');
  if (name) {
    return `${element.tagName.toLowerCase()}[name="${name}"]`;
  }
  
  // Priorität 6: Text Content (für Buttons)
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    const text = element.textContent?.trim().slice(0, 30);
    if (text) {
      // Escape quotes in text
      const escapedText = text.replace(/"/g, '\\"');
      return `button:has-text("${escapedText}")`;
    }
  }
  
  // Fallback: XPath-ähnlicher Pfad
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    // Zähle Geschwister mit gleichem Tag
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector = `${selector}:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
  }
  
  return path.join(' > ');
}

// --------------------------------------------
// Element Info Extractor
// Extrahiert relevante Informationen aus einem Element
// --------------------------------------------

function extractElementInfo(element: HTMLElement): RecordedAction['target'] {
  return {
    selector: generateSelector(element),
    tagName: element.tagName.toLowerCase(),
    text: element.textContent?.trim().slice(0, 100) || undefined,
    placeholder: element.getAttribute('placeholder') || undefined,
    ariaLabel: element.getAttribute('aria-label') || undefined,
    dataAgentId: element.dataset.agentId || element.dataset.agentButton || element.dataset.agentInput || undefined,
    className: element.className && typeof element.className === 'string' ? element.className.slice(0, 200) : undefined,
  };
}

// --------------------------------------------
// Event Handler für Recording
// --------------------------------------------

let isRecordingActive = false;

// Click Handler
function handleClick(event: MouseEvent) {
  if (!isRecordingActive) return;
  
  const target = event.target as HTMLElement;
  if (!target || target === document.body) return;
  
  // Ignoriere Recording-Controls
  if (target.closest('[data-sandbox-control]')) return;
  
  const store = useSandboxStore.getState();
  store.addRecordedAction({
    type: 'click',
    target: extractElementInfo(target),
  });
}

// Input Handler (für Text-Eingaben)
function handleInput(event: Event) {
  if (!isRecordingActive) return;
  
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (!target) return;
  
  // Ignoriere Recording-Controls
  if (target.closest('[data-sandbox-control]')) return;
  
  const store = useSandboxStore.getState();
  store.addRecordedAction({
    type: 'input',
    target: extractElementInfo(target),
    value: target.value,
  });
}

// Change Handler (für Selects, Checkboxes, etc.)
function handleChange(event: Event) {
  if (!isRecordingActive) return;
  
  const target = event.target as HTMLSelectElement | HTMLInputElement;
  if (!target) return;
  
  // Ignoriere Recording-Controls
  if (target.closest('[data-sandbox-control]')) return;
  
  // Ignoriere wenn es ein Text-Input ist (wird von handleInput erfasst)
  if (target instanceof HTMLInputElement && ['text', 'email', 'password', 'search', 'url'].includes(target.type)) {
    return;
  }
  
  const store = useSandboxStore.getState();
  store.addRecordedAction({
    type: 'change',
    target: extractElementInfo(target),
    value: target instanceof HTMLSelectElement
      ? target.options[target.selectedIndex]?.text || target.value
      : target.type === 'checkbox' || target.type === 'radio'
      ? String(target.checked)
      : target.value,
  });
}

// Submit Handler (für Forms)
function handleSubmit(event: Event) {
  if (!isRecordingActive) return;
  
  const target = event.target as HTMLFormElement;
  if (!target) return;
  
  // Ignoriere Recording-Controls
  if (target.closest('[data-sandbox-control]')) return;
  
  const store = useSandboxStore.getState();
  store.addRecordedAction({
    type: 'submit',
    target: extractElementInfo(target),
  });
}

// Keypress Handler (für spezielle Tasten wie Enter)
function handleKeypress(event: KeyboardEvent) {
  if (!isRecordingActive) return;
  
  // Nur spezielle Tasten aufzeichnen
  if (!['Enter', 'Escape', 'Tab'].includes(event.key)) return;
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Ignoriere Recording-Controls
  if (target.closest('[data-sandbox-control]')) return;
  
  const store = useSandboxStore.getState();
  store.addRecordedAction({
    type: 'keypress',
    target: extractElementInfo(target),
    key: event.key,
  });
}

// --------------------------------------------
// Recording starten/stoppen
// --------------------------------------------

export function startActionRecording(): void {
  if (isRecordingActive) return;
  
  console.log('🎬 Action Recording gestartet');
  isRecordingActive = true;
  
  // Event Listener hinzufügen (capture phase für frühe Erfassung)
  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('submit', handleSubmit, true);
  document.addEventListener('keypress', handleKeypress, true);
}

export function stopActionRecording(): void {
  if (!isRecordingActive) return;
  
  console.log('🎬 Action Recording gestoppt');
  isRecordingActive = false;
  
  // Event Listener entfernen
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('submit', handleSubmit, true);
  document.removeEventListener('keypress', handleKeypress, true);
}

// --------------------------------------------
// Hook für Recording-Status
// --------------------------------------------

export function useActionRecorder() {
  const isRecording = useSandboxStore((state) => state.isRecording);
  const startRecording = useSandboxStore((state) => state.startRecording);
  const stopRecording = useSandboxStore((state) => state.stopRecording);
  const recordedActions = useSandboxStore((state) => state.recordedActions);
  const clearRecording = useSandboxStore((state) => state.clearRecording);
  
  const start = () => {
    startRecording();
    startActionRecording();
  };
  
  const stop = () => {
    stopActionRecording();
    stopRecording();
  };
  
  return {
    isRecording,
    recordedActions,
    start,
    stop,
    clear: clearRecording,
  };
}


