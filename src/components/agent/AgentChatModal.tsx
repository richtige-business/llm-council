// ============================================
// AgentChatModal.tsx - Chat-Fenster über dem Widget
// ============================================

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { MiniIntelligenceOrb } from '@/components/shell/IntelligenceOrb';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';

// --------------------------------------------
// Types
// --------------------------------------------

interface AgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  moduleColor: string;
  moduleIcon: string;
  anchorPosition?: { x: number; y: number };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --------------------------------------------
// Dynamic Icon
// --------------------------------------------

function DynamicIcon({ name, className, style }: { 
  name: string; 
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[name];
  if (!Icon) return null;
  return <Icon className={className} style={style} />;
}

// --------------------------------------------
// Constants
// --------------------------------------------

const MODAL_WIDTH = 320;
const MODAL_HEIGHT = 380;

// --------------------------------------------
// Component
// --------------------------------------------

export function AgentChatModal({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  moduleColor,
  moduleIcon,
  anchorPosition,
}: AgentChatModalProps) {
  const { textColor, buttonTextColor } = useThemeStyles();
  const orbColor = useAgentConfigStore((state) => state.getOrbColor(moduleId));
  const color = orbColor || moduleColor;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Berechne Position über dem Widget
  const modalPosition = useMemo(() => {
    if (typeof window === 'undefined') return { left: 100, top: 100 };
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    let left: number;
    let top: number;
    
    if (anchorPosition && anchorPosition.x > 0) {
      // Zentriert über dem Widget
      left = anchorPosition.x - (MODAL_WIDTH / 2);
      top = anchorPosition.y - MODAL_HEIGHT - 20;
      
      // Falls oben kein Platz, dann daneben
      if (top < 20) {
        top = Math.min(anchorPosition.y + 20, vh - MODAL_HEIGHT - 20);
      }
    } else {
      // Fallback: Mitte
      left = (vw - MODAL_WIDTH) / 2;
      top = (vh - MODAL_HEIGHT) / 2;
    }
    
    // Im Viewport halten
    left = Math.max(20, Math.min(left, vw - MODAL_WIDTH - 20));
    top = Math.max(20, Math.min(top, vh - MODAL_HEIGHT - 20));
    
    return { left, top };
  }, [anchorPosition]);
  
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Auto-focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  // Send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content })),
          moduleId,
        }),
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'Fehler',
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Ein Fehler ist aufgetreten.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Invisible Backdrop zum Schließen */}
      <div 
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="fixed z-[101] flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{
          left: modalPosition.left,
          top: modalPosition.top,
          width: MODAL_WIDTH,
          height: MODAL_HEIGHT,
          background: 'rgba(20, 20, 30, 0.98)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${color}40`,
          boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px ${color}15`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
          style={{ 
            borderColor: 'rgba(255,255,255,0.1)',
            background: `linear-gradient(135deg, ${color}10 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-center gap-2">
            <MiniIntelligenceOrb color={color} size={22} isActive />
            <DynamicIcon name={moduleIcon} className="h-3.5 w-3.5" style={{ color }} />
            <span className="font-medium text-xs" style={{ color: textColor }}>
              {moduleName}
            </span>
          </div>
          
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: textColor, opacity: 0.5 }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: textColor }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <DynamicIcon 
                name={moduleIcon} 
                className="h-8 w-8 mb-2 opacity-30" 
                style={{ color }} 
              />
              <p className="text-[11px]" style={{ color: textColor, opacity: 0.5 }}>
                Stell mir eine Frage
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] px-2.5 py-1.5 rounded-lg text-xs"
                  style={{
                    background: msg.role === 'user' ? color : 'rgba(255,255,255,0.9)',
                    color: msg.role === 'user' ? '#fff' : '#1f2937',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/90">
                <Zap className="h-3 w-3 animate-pulse text-amber-500" />
                <span className="text-[10px] text-gray-500">...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="p-2 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div 
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht..."
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: textColor }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-1.5 rounded-full transition-all disabled:opacity-30"
              style={{ background: color, color: buttonTextColor }}
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
