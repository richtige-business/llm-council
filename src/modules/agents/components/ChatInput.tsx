// ============================================
// ChatInput.tsx - Chat-Eingabefeld
// 
// Zweck: Eingabefeld für Chat-Nachrichten
//        Mit Send-Button und Enter-Unterstützung
// Verwendet von: ChatPage.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Home, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: ChatInput
// Eingabefeld für Chat-Nachrichten
// --------------------------------------------

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showHomeButton?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Nachricht eingeben...',
  showHomeButton = false,
  value,
  onValueChange,
  isEditing = false,
  onCancelEdit,
}: ChatInputProps) {
  const [internalInput, setInternalInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Theme-Styles
  const { surface, button, accentColor, textColor, designStyle } = useThemeStyles();
  const input = value ?? internalInput;

  // --------------------------------------------
  // Eingabewert setzen
  // Unterstuetzt kontrollierte und lokale Nutzung.
  // --------------------------------------------
  const setInputValue = (nextValue: string) => {
    if (onValueChange) {
      onValueChange(nextValue);
      return;
    }
    setInternalInput(nextValue);
  };

  // Textarea-Höhe automatisch anpassen
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Enter-Taste: Nachricht senden (Shift+Enter: Zeilenumbruch)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Nachricht senden
  const handleSend = () => {
    if (!input.trim() || disabled) return;
    
    const message = input.trim();
    setInputValue('');
    onSend(message);
    
    // Textarea-Höhe zurücksetzen
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div 
      className="border-t border-white/10 p-4"
      style={{
        ...surface.base,
        borderRadius: 0,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* ----------------------------------------
          Editier-Hinweis
          Zeigt an, dass eine bestehende Nachricht
          bearbeitet wird und erlaubt Abbruch.
          ---------------------------------------- */}
      {isEditing && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2">
          <span className="text-xs font-medium text-amber-200">
            Du bearbeitest eine gesendete Nachricht
          </span>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-amber-100/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Abbrechen
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-3">
      {/* ----------------------------------------
          Home-Button - Links neben dem Input
          Nur sichtbar wenn showHomeButton true ist
          ---------------------------------------- */}
      {showHomeButton && (
        <Link
          href="/"
          className="flex h-10 w-10 shrink-0 items-center justify-center transition-all hover:scale-105"
          style={{
            ...button.base,
            color: textColor,
            opacity: 0.7,
          }}
          title="Zurück zum Dashboard"
        >
          <Home className="h-4 w-4" />
        </Link>
      )}

      {/* ----------------------------------------
          Textarea für Eingabe
          Passt sich automatisch der Höhe an
          ---------------------------------------- */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none px-4 py-3 text-sm placeholder:opacity-40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ 
          maxHeight: '200px', 
          overflowY: 'auto',
          background: 'rgba(255,255,255,0.1)',
          color: textColor,
          border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
      />

      {/* ----------------------------------------
          Send-Button
          Nur aktiv wenn Text eingegeben wurde
          ---------------------------------------- */}
      <motion.button
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: accentColor,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          border: designStyle === 'brutal' ? '2px solid #000' : 'none',
          boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
        }}
        whileHover={{ scale: input.trim() && !disabled ? 1.05 : 1 }}
        whileTap={{ scale: input.trim() && !disabled ? 0.95 : 1 }}
      >
        <Send className="h-4 w-4" />
      </motion.button>
      </div>
    </div>
  );
}

