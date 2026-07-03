// ============================================
// ChatMessage.tsx - Einzelne Chat-Nachricht (erweitert)
// 
// Zweck: Rendert eine einzelne Chat-Nachricht
//        Unterstützt Bilder, Dateien, Modell-Anzeige
// Verwendet von: AgentsPage.tsx
// ============================================

'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { User, Bot, Paperclip, Sparkles, Zap } from 'lucide-react';
import type { ChatMessageData } from '../types';
import { AgentWorkspaceEmbed } from './AgentWorkspaceEmbed';
import { ChatMessageActions } from './ChatMessageActions';
import { Shimmer } from './Shimmer';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallCard } from './ToolCallCard';

const ChatMarkdown = dynamic(
  () => import('./ChatMarkdown').then((m) => ({ default: m.ChatMarkdown })),
  { ssr: false },
);

// --------------------------------------------
// Komponente: ChatMessage
// Eine einzelne Chat-Nachricht (User oder Assistant)
// Mit Reply-Button (Hover) und zitierter Nachricht
// --------------------------------------------

interface ChatMessageProps {
  message: ChatMessageData;
  onReply?: (message: ChatMessageData) => void;  // Callback für "Antworten"
  onActionButton?: (type: string, payload?: Record<string, unknown>) => void; // Callback für Action-Buttons
  onEdit?: (message: ChatMessageData) => void;
  onRegenerate?: (message: ChatMessageData) => void;
  canRegenerate?: boolean;
}

export function ChatMessage({
  message,
  onReply,
  onActionButton,
  onEdit,
  onRegenerate,
  canRegenerate = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isPrivateClarification = message.privateMessageKind === 'clarification';
  const isPrivateStatus = message.privateMessageKind === 'status';

  // --------------------------------------------
  // Nachricht in Zwischenablage kopieren
  // Nutzt nur den sichtbaren Textinhalt der Bubble.
  // --------------------------------------------
  const handleCopy = async () => {
    if (!message.content || typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(message.content);
  };
  
  // Zeitstempel formatieren
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      if (diffMins < 1) return 'gerade eben';
      if (diffMins < 60) return `vor ${diffMins} Min.`;
      if (diffHours < 24) return `vor ${diffHours} Std.`;
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    if (diffDays === 1) return 'Gestern';

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Zusammenfassungs-Nachrichten speziell darstellen
  if (message.isSummary) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
      >
        <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
        <p className="text-xs text-purple-300/70 italic">
          Kontext zusammengefasst – ältere Nachrichten wurden komprimiert
        </p>
      </motion.div>
    );
  }

  // System-Nachrichten
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-2"
      >
        <p className={`text-xs italic ${isPrivateStatus ? 'text-amber-200/70' : 'text-white/30'}`}>
          {message.content}
        </p>
      </motion.div>
    );
  }

  const timeAgo = formatTime(message.timestamp);

  // Gruppenchat: Hat diese Nachricht einen spezifischen Agenten?
  const isGroupAgentMessage = !isUser && Boolean(message.agentName);
  const avatarColor = message.agentColor || undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group/msg flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* ----------------------------------------
          Avatar
          User-Icon, Bot-Icon oder Agent-Farbe (Gruppe)
          ---------------------------------------- */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-indigo-500'
            : isGroupAgentMessage
            ? ''
            : 'bg-gradient-to-br from-purple-500 to-pink-500'
        }`}
        style={isGroupAgentMessage && avatarColor ? { background: avatarColor } : undefined}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* ----------------------------------------
          Nachricht-Content
          Name, Zitat, Text, Zeitstempel und Modell
          sind ALLE innerhalb der Bubble
          ---------------------------------------- */}
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        {/* Angehängte Bilder (über der Nachricht) */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {message.images.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.previewUrl || `data:${img.type};base64,${img.base64}`}
                  alt={img.name}
                  className="h-32 max-w-[200px] rounded-xl object-cover border border-white/10"
                />
              </div>
            ))}
          </div>
        )}

        {/* Angehängte Dateien */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {message.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/10"
              >
                <Paperclip className="h-3 w-3 text-white/40" />
                <span className="text-[10px] text-white/60 max-w-[150px] truncate">{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nachricht-Bubble: Enthält Zitat, Agent-Name, Text, Zeit + Modell */}
        <div className="relative">
          <ChatMessageActions
            align={isUser ? 'right' : 'left'}
            onCopy={message.content ? handleCopy : undefined}
            onEdit={isUser && onEdit ? () => onEdit(message) : undefined}
            onRegenerate={!isUser && canRegenerate && onRegenerate ? () => onRegenerate(message) : undefined}
            onReply={onReply ? () => onReply(message) : undefined}
          />

          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isUser
                ? 'bg-indigo-500 text-white'
                : isPrivateClarification
                  ? 'bg-amber-500/10 text-white backdrop-blur-md'
                : 'bg-white/10 text-white backdrop-blur-md'
            }`}
            style={
              isGroupAgentMessage && avatarColor
                ? {
                    borderLeft: `3px solid ${isPrivateClarification ? '#f59e0b' : avatarColor}`,
                  }
                : undefined
            }
          >
            {/* Agent-Name (innerhalb der Bubble, oben) */}
            {isGroupAgentMessage && (
              <p
                className="text-[11px] font-semibold mb-1"
                style={{ color: isUser ? 'rgba(255,255,255,0.8)' : (avatarColor || '#a78bfa') }}
              >
                {message.agentName}
              </p>
            )}
            {isPrivateClarification && !isUser && (
              <div className="mb-2">
                <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                  Klärung
                </span>
              </div>
            )}

            {/* ----------------------------------------
                Zitierte Nachricht (Reply-Vorschau, wie bei WhatsApp)
                Farbiger linker Rand + Absender + Text-Vorschau
                ---------------------------------------- */}
            {message.replyTo && (
              <div
                className="mb-2 rounded-lg px-3 py-1.5 cursor-pointer"
                style={{
                  background: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                  borderLeft: `3px solid ${message.replyTo.senderColor || '#a78bfa'}`,
                }}
              >
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: message.replyTo.senderColor || '#a78bfa' }}
                >
                  {message.replyTo.senderName}
                </p>
                <p className={`text-[11px] leading-snug line-clamp-2 ${isUser ? 'text-white/70' : 'text-white/50'}`}>
                  {message.replyTo.content}
                </p>
              </div>
            )}

            {/* Nachrichtentext (auch leere Strings rendern für Streaming) */}
            <div className="min-w-0">
              {!isUser && (message.reasoning || message.isStreaming) && (
                <div className="mb-2">
                  <ThinkingBlock
                    isStreaming={Boolean(message.isStreaming)}
                    title={message.reasoning ? 'Gedankengang' : undefined}
                    content={message.reasoning}
                    accentColor={avatarColor || '#a78bfa'}
                    compact={true}
                  />
                </div>
              )}

              {message.content ? (
                isUser ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <ChatMarkdown content={message.content} />
                )
              ) : message.isStreaming ? null : (
                <Shimmer accentColor={avatarColor || '#d8b4fe'} className="text-sm">
                  Antwort wird erstellt...
                </Shimmer>
              )}
            </div>

            {/* ----------------------------------------
                Tool-Ausführungen
                Zeigt sichtbar, welche Tools der Agent benutzt hat
                ---------------------------------------- */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.toolCalls.map((toolCall, index) => (
                  <ToolCallCard key={`${toolCall.name}-${index}`} toolCall={toolCall} />
                ))}
              </div>
            )}

            {/* ----------------------------------------
                Action Button: Klickbarer Button in der Nachricht
                z.B. "Agent Mode aktivieren"
                ---------------------------------------- */}
            {message.actionButton && onActionButton && (
              <button
                onClick={() => onActionButton(message.actionButton!.type, message.actionButton!.payload)}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" />
                {message.actionButton.label}
              </button>
            )}

            {/* Meta-Info: Zeitstempel + Modell (innerhalb der Bubble, unten) */}
            <div className={`flex items-center gap-2 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isUser ? 'text-white/50' : 'text-white/40'}`}>
                {timeAgo}
              </span>
              {isGroupAgentMessage && (
                <span className={`text-[10px] ${isUser ? 'text-white/40' : 'text-white/30'}`}>
                  {message.agentName}
                </span>
              )}
              {!isUser && message.model && (
                <span className="text-[10px] text-white/30">
                  {message.model}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------------------------
            Agent Workspace Embed: Live-Modul-Fenster
            Zeigt das Modul in dem der Agent arbeitet
            Wird unter der Nachricht-Bubble angezeigt
            ---------------------------------------- */}
        {message.agentWorkspace && (
          <AgentWorkspaceEmbed
            moduleId={message.agentWorkspace.moduleId}
            isActive={message.agentWorkspace.isActive}
          />
        )}
      </div>
    </motion.div>
  );
}
