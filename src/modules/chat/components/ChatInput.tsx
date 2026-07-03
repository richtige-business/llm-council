// ============================================
// ChatInput.tsx - Chat-Eingabefeld
// 
// Zweck: Eingabefeld für Chat-Nachrichten
//        Mit Send-Button und Enter-Unterstützung
// Verwendet von: ChatPage.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Home } from 'lucide-react';
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
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Nachricht eingeben...', showHomeButton = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Theme-Styles
  const { surface, button, accentColor, textColor, designStyle } = useThemeStyles();

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
    setInput('');
    onSend(message);
    
    // Textarea-Höhe zurücksetzen
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div 
      className="flex items-end gap-3 p-4 border-t border-white/10"
      style={{
        ...surface.base,
        borderRadius: 0,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}
    >
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
        onChange={(e) => setInput(e.target.value)}
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
  );
}

