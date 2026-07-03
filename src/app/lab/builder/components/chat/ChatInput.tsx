// ============================================
// LifeOS Module Builder - Chat Input
// 
// Zweck: Eingabefeld für Chat-Nachrichten mit Mode-Switcher
//        Modi: Build (implementiert), Discuss (berät), Pro (erweitert)
// Verwendet von: BaseChat
// ============================================

'use client';

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square, Sparkles, Hammer, MessageCircle, ChevronDown, Check, Zap, Crown, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModels } from '@/lib/llm/use-models';
import {
  DEFAULT_OPENROUTER_MODEL_ID,
  DEFAULT_OPENROUTER_PROVIDER_FILTER,
  filterModelsByProvider,
  getModelProviderId,
} from '@/lib/llm/model-catalog';
import { useLLMConfigStore } from '../../stores/llm-config-store';
import type { LLMProvider } from '@/lib/llm/types';

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  container?: { base: React.CSSProperties };
  button?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

// Chat-Modi: build, discuss, pro
export type ChatMode = 'build' | 'discuss' | 'pro';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
  chatStarted?: boolean;
  themeStyles?: ThemeStyles;
  // Mode Switcher
  chatMode?: ChatMode;
  onChatModeChange?: (mode: ChatMode) => void;
  // LLM Model Switcher (optional - wenn nicht gesetzt, wird global store genutzt)
  projectId?: string;
}

// --------------------------------------------
// Mode-Konfiguration
// --------------------------------------------

interface ModeConfig {
  id: ChatMode;
  label: string;
  icon: typeof Hammer;
  description: string;
  color: string;
  emoji: string;
  statusText: string;
}

const CHAT_MODES: ModeConfig[] = [
  {
    id: 'build',
    label: 'Build',
    icon: Hammer,
    description: 'Agent implementiert Code',
    color: '#0ea5e9', // Sky Blue
    emoji: '🔨',
    statusText: 'Baut & implementiert',
  },
  {
    id: 'discuss',
    label: 'Discuss',
    icon: MessageCircle,
    description: 'Agent plant & berät',
    color: '#a855f7', // Purple
    emoji: '💬',
    statusText: 'Plant & berät',
  },
  {
    id: 'pro',
    label: 'Pro',
    icon: Crown,
    description: 'Erweitert mit Tests & Docs',
    color: '#f59e0b', // Amber/Gold
    emoji: '👑',
    statusText: 'Pro-Modus aktiv',
  },
];

// --------------------------------------------
// Komponente
// --------------------------------------------

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming = false,
  placeholder,
  disabled = false,
  chatStarted = false,
  themeStyles,
  chatMode: externalChatMode,
  onChatModeChange,
  projectId,
}: ChatInputProps) {
  const TEXTAREA_HEIGHT = 56;
  const { 
    surface, 
    container, 
    button, 
    accentColor = '#8b5cf6', 
    designStyle = 'glass', 
    textColor = '#ffffff' 
  } = themeStyles || {};
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Lokaler State für Mode wenn nicht extern gesteuert
  const [localChatMode, setLocalChatMode] = useState<ChatMode>('build');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [manualProviderFilter, setManualProviderFilter] = useState<string | null>(null);
  const [modelDropdownStyle, setModelDropdownStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  
  // LLM Config Store (mit Selector, damit UI auf Änderungen reagiert)
  const llmConfig = useLLMConfigStore((state) =>
    projectId ? state.getProjectConfig(projectId) : state.globalConfig
  );
  const setGlobalConfig = useLLMConfigStore((state) => state.setGlobalConfig);
  const setProjectConfig = useLLMConfigStore((state) => state.setProjectConfig);
  const { models: allModels, providers } = useModels();
  const setLLMConfig = projectId
    ? (config: Partial<{ provider: LLMProvider; model: string }>) => setProjectConfig(projectId, config)
    : setGlobalConfig;
  const providerFilter = manualProviderFilter || getModelProviderId(llmConfig.model || DEFAULT_OPENROUTER_MODEL_ID);
  const availableModels = filterModelsByProvider(allModels, providerFilter);
  const currentModel = allModels.find((m) => m.id === llmConfig.model) || allModels[0];
  
  // Verwende externe Props oder lokalen State
  const chatMode = externalChatMode ?? localChatMode;
  const setChatMode = onChatModeChange ?? setLocalChatMode;
  
  // Aktuelle Mode-Konfiguration
  const currentMode = CHAT_MODES.find(m => m.id === chatMode) || CHAT_MODES[0];
  
  // Dynamic placeholder basierend auf Mode
  const dynamicPlaceholder = placeholder ?? (
    chatMode === 'build' 
      ? 'Was soll ich für dich bauen?' 
      : chatMode === 'discuss'
      ? 'Was möchtest du besprechen?'
      : 'Beschreibe dein Modul (mit Tests & Docs)...'
  );
  
  // Handle submit
  const handleSubmit = () => {
    if (value.trim() && !disabled && !isStreaming) {
      onSubmit();
    }
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (modeDropdownOpen) setModeDropdownOpen(false);
      if (modelDropdownOpen) setModelDropdownOpen(false);
    };
    
    if (modeDropdownOpen || modelDropdownOpen) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [modeDropdownOpen, modelDropdownOpen]);

  // --------------------------------------------
  // Model-Dropdown Position (Portal)
  // Startseite: öffnet nach unten
  // Editor: öffnet nach oben
  // --------------------------------------------

  const updateModelDropdownPosition = useCallback(() => {
    if (!modelButtonRef.current) return;
    const rect = modelButtonRef.current.getBoundingClientRect();
    const openUp = chatStarted; // Startseite = false => nach unten
    const offset = 8;

    if (openUp) {
      setModelDropdownStyle({
        bottom: window.innerHeight - rect.top + offset,
        left: rect.left,
        width: Math.max(260, rect.width),
        openUp: true,
      });
    } else {
      setModelDropdownStyle({
        top: rect.bottom + offset,
        left: rect.left,
        width: Math.max(260, rect.width),
        openUp: false,
      });
    }
  }, [chatStarted]);

  useEffect(() => {
    if (!modelDropdownOpen) return;
    updateModelDropdownPosition();
    const handleScroll = () => updateModelDropdownPosition();
    const handleResize = () => updateModelDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [modelDropdownOpen, updateModelDropdownPosition]);
  
  return (
    <motion.div
      layout
      className={cn(
        'relative w-full max-w-3xl mx-auto',
        chatStarted ? 'sticky bottom-4' : ''
      )}
    >
      <div 
        className="relative transition-all duration-300"
        style={{
          ...(container?.base || {}),
          borderRadius: designStyle === 'brutal' ? '1rem' : '1.25rem',
          boxShadow: designStyle === 'brutal' 
            ? '4px 4px 0 #000' 
            : designStyle === 'neo'
            ? `4px 4px 8px rgba(0,0,0,0.3), -2px -2px 6px rgba(255,255,255,0.05)`
            : `0 8px 32px ${accentColor}20`,
        }}
      >
        {/* Mode Switcher - In der Eingabezeile */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModeDropdownOpen(!modeDropdownOpen);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/10"
              style={{
                color: currentMode.color,
              }}
            >
              <currentMode.icon className="w-4 h-4" />
              <span>{currentMode.label}</span>
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform",
                modeDropdownOpen && "rotate-180"
              )} />
            </button>
            
            {/* Dropdown Menu - Öffnet nach OBEN */}
            <AnimatePresence>
              {modeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 bottom-full mb-2 z-50 min-w-[220px] py-1 rounded-xl shadow-xl"
                  style={{
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {CHAT_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = chatMode === mode.id;
                    
                    return (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setChatMode(mode.id);
                          setModeDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <div 
                          className="w-8 h-8 flex items-center justify-center rounded-lg"
                          style={{
                            background: isSelected ? `${mode.color}30` : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: mode.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: textColor }}>{mode.label}</span>
                            {mode.id === 'pro' && (
                              <span 
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                                style={{
                                  background: `linear-gradient(135deg, ${mode.color} 0%, #f97316 100%)`,
                                  color: '#000',
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                            {mode.description}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4" style={{ color: mode.color }} />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Trennlinie */}
          <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
          
          {/* Model Switcher */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModelDropdownOpen(!modelDropdownOpen);
              }}
              ref={modelButtonRef}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:bg-white/10"
              style={{
                color: textColor,
                opacity: 0.6,
              }}
              title="Sprachmodell wechseln"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{currentModel?.name || llmConfig.model}</span>
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform",
                modelDropdownOpen && "rotate-180"
              )} />
            </button>
            
            {/* Model Dropdown via Portal (damit es nicht abgeschnitten wird) */}
            {modelDropdownOpen && modelDropdownStyle && typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: modelDropdownStyle.openUp ? 10 : -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: modelDropdownStyle.openUp ? 10 : -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="fixed z-[9999] min-w-[260px] max-h-[60vh] overflow-y-auto py-1 rounded-xl shadow-xl"
                  style={{
                    top: modelDropdownStyle.top,
                    bottom: modelDropdownStyle.bottom,
                    left: modelDropdownStyle.left,
                    width: modelDropdownStyle.width,
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Anbieter-Filter */}
                  <div className="px-2 pt-2 pb-1">
                    <div className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: `${textColor}55` }}>
                      Anbieter
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      <button
                        onClick={() => setManualProviderFilter(DEFAULT_OPENROUTER_PROVIDER_FILTER)}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: providerFilter === DEFAULT_OPENROUTER_PROVIDER_FILTER ? 'rgba(255,255,255,0.15)' : 'transparent',
                          color: providerFilter === DEFAULT_OPENROUTER_PROVIDER_FILTER ? textColor : `${textColor}60`,
                        }}
                      >
                        Alle
                      </button>
                      {providers.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setManualProviderFilter(provider.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: providerFilter === provider.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                            color: providerFilter === provider.id ? textColor : `${textColor}60`,
                          }}
                        >
                          {provider.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mx-2 my-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                  
                  {/* Modelle des gewaehlten Anbieters */}
                  {availableModels.map((model) => {
                    const isSelected = llmConfig.model === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          setLLMConfig({ provider: 'openai', model: model.id });
                          setModelDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium" style={{ color: textColor }}>
                            {model.name}
                          </div>
                          {model.description && (
                            <div className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
                              {model.providerLabel} · {model.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4" style={{ color: accentColor }} />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>,
              document.body
            )}
          </div>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Pro Badge wenn Pro Mode aktiv */}
          {chatMode === 'pro' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: '#000',
              }}
            >
              <Zap className="w-3 h-3" />
              <span>+Tests +Docs</span>
            </motion.span>
          )}
        </div>
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
          disabled={disabled || isStreaming}
              data-agent-input="builder-chat-input"
          rows={1}
          className="w-full bg-transparent px-5 py-3 pr-24 resize-none focus:outline-none text-base scrollbar-thin scrollbar-thumb-white/10"
          style={{ 
            height: `${TEXTAREA_HEIGHT}px`,
            minHeight: `${TEXTAREA_HEIGHT}px`,
            maxHeight: `${TEXTAREA_HEIGHT}px`,
            overflowY: 'auto',
            color: textColor,
          }}
        />
        
        {/* Action Buttons */}
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {/* Stop Button */}
          {isStreaming && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={onStop}
              className="p-2 transition-all"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              }}
            >
              <Square className="w-5 h-5" />
            </motion.button>
          )}
          
          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={disabled || isStreaming || !value.trim()}
            data-agent-button="builder-chat-send"
            className="p-3 transition-all flex items-center gap-2"
            style={{
              background: value.trim() && !isStreaming
                ? chatMode === 'pro'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                  : `linear-gradient(135deg, ${currentMode.color} 0%, #764ba2 100%)`
                : 'rgba(255,255,255,0.05)',
              color: value.trim() && !isStreaming ? '#fff' : 'rgba(255,255,255,0.3)',
              borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
              boxShadow: value.trim() && !isStreaming 
                ? designStyle === 'brutal' 
                  ? '3px 3px 0 #000' 
                  : `0 4px 15px ${currentMode.color}40`
                : 'none',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              cursor: value.trim() && !isStreaming ? 'pointer' : 'not-allowed',
            }}
          >
            {isStreaming ? (
              <Sparkles className="w-5 h-5 animate-pulse" />
            ) : chatMode === 'pro' ? (
              <Crown className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>
      
      {/* Hint Text */}
      {!chatStarted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-3"
          style={{ color: textColor, opacity: 0.4 }}
        >
          Drücke <kbd 
            className="px-1.5 py-0.5 rounded" 
            style={{ background: 'rgba(255,255,255,0.1)', color: textColor, opacity: 0.6 }}
          >Enter</kbd> zum Senden 
          oder <kbd 
            className="px-1.5 py-0.5 rounded" 
            style={{ background: 'rgba(255,255,255,0.1)', color: textColor, opacity: 0.6 }}
          >Shift+Enter</kbd> für neue Zeile
        </motion.p>
      )}
    </motion.div>
  );
});
