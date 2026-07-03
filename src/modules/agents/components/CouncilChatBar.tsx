// ============================================
// CouncilChatBar.tsx - Chat-Eingabe für den Council-Hub
//
// Zweck: Zentrierte, schwebende Chatbar am unteren Bildschirmrand
//        im Council-Raum. Die Member-Pill-Buttons sind Teil des
//        Chatbar-Rahmens (gleicher Hintergrund, direkt oben anliegend).
//        Darunter History-Panel pro Member.
// Verwendet von: AgentsModuleShell.tsx
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Folder,
  Mic,
  Square,
  Globe,
  Search,
  Bot,
  X,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';

// ESM-only Paket – muss ohne SSR geladen werden
const CouncilMarkdown = dynamic(
  () => import('./CouncilMarkdown').then((m) => ({ default: m.CouncilMarkdown })),
  { ssr: false },
);
import { useThemeStyles } from '@/lib/theme';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_FILE_TYPES,
} from '../constants';
import type { AttachedImage, AttachedFile, ChatMessageData } from '../types';
import { useAgentsStore } from '../store';
import { useAgentsSpatialStore } from '../spatial-store';
import {
  formatAttachmentFileSize,
  readAttachmentsFromFiles,
  revokeImagePreviewUrls,
  stripTransientAttachmentFieldsFromImages,
} from '../lib/chat-attachments';

const COUNCIL_MAIN_PANEL_ID = '__council-main__';

// --------------------------------------------
// Props
// --------------------------------------------

interface CouncilChatBarProps {
  onSend?: (message: string, images?: AttachedImage[], files?: AttachedFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

// --------------------------------------------
// Hilfsfunktion: Zeitstempel formatieren
// --------------------------------------------

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// --------------------------------------------
// Unterkomponente: Member-History-Panel
// Öffnet sich über der Chatbar nach oben
// --------------------------------------------

interface MemberHistoryPanelProps {
  seatId: string;
  memberName: string;
  memberColor: string;
  onClose: () => void;
}

interface SharedHistoryPanelProps {
  title: string;
  accentColor: string;
  subtitle: string;
  emptyTitle: string;
  emptySubtitle: string;
  messages: ChatMessageData[];
  initialScrollMode?: 'bottom' | 'last-assistant-start';
  onClose: () => void;
}

function SharedHistoryPanel({
  title,
  accentColor,
  subtitle,
  emptyTitle,
  emptySubtitle,
  messages,
  initialScrollMode = 'bottom',
  onClose,
}: SharedHistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { surface, button, textColor, designStyle, surfaceColor } = useThemeStyles();

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    const applyInitialScroll = () => {
      if (!scrollRef.current) {
        return;
      }

      if (initialScrollMode === 'last-assistant-start') {
        const lastAssistantMessage = [...messages]
          .reverse()
          .find((message) => message.role === 'assistant');

        if (lastAssistantMessage) {
          const targetElement = messageRefs.current[lastAssistantMessage.id];
          if (targetElement) {
            // Zwei Frames spaeter ist das Panel samt Motion-Layout stabil,
            // dadurch landen wir exakt am oberen Rand der finalen Nachricht.
            scrollRef.current.scrollTo({
              top: Math.max(0, targetElement.offsetTop - 48),
              behavior: 'auto',
            });
            return;
          }
        }
      }

      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'auto',
      });
    };

    let nestedFrameId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
      nestedFrameId = window.requestAnimationFrame(applyInitialScroll);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (nestedFrameId !== null) {
        window.cancelAnimationFrame(nestedFrameId);
      }
    };
  }, [initialScrollMode, messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mb-2 flex flex-col overflow-hidden"
      style={{
        ...surface.base,
        // Viewport-sichere Obergrenze, damit Safari das Panel nicht
        // ueber den sichtbaren Bildschirm hinausschiebt.
        maxHeight: 'min(34rem, calc(100dvh - 11.5rem))',
      }}
    >
      {/* Panel-Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom:
            designStyle === 'brutal'
              ? '2px solid #000'
              : designStyle === 'neo'
                ? '1px solid rgba(255,255,255,0.05)'
                : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
          />
          <span className="text-sm font-medium" style={{ color: textColor }}>{title}</span>
          <span className="text-[11px] text-white/35">{subtitle}</span>
          <span className="text-[11px] text-white/30">{messages.length} messages</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center transition-colors"
          style={{
            ...button.base,
            width: '1.5rem',
            height: '1.5rem',
            color: textColor,
            opacity: 0.5,
            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Nachrichtenliste */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}28` }}
            >
              <MessageSquare className="h-4 w-4" style={{ color: accentColor }} />
            </div>
            <div className="text-xs text-white/40">{emptyTitle}</div>
            <div className="mt-1 text-[11px] text-white/25">{emptySubtitle}</div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const assistantBubbleColor = msg.agentColor || accentColor;
            return (
              <div
                key={msg.id}
                ref={(node) => {
                  messageRefs.current[msg.id] = node;
                }}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isUser && (
                  <div
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
                    style={{ backgroundColor: assistantBubbleColor, boxShadow: `0 0 6px ${assistantBubbleColor}60` }}
                  />
                )}
                <div className={`max-w-[85%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`council-md rounded-2xl px-4 py-3 text-sm leading-relaxed text-white ${isUser ? 'rounded-tr-sm bg-white/10' : 'rounded-tl-sm'}`}
                    style={{
                      ...((!isUser)
                        ? { backgroundColor: `${assistantBubbleColor}20`, border: `1px solid ${assistantBubbleColor}28` }
                        : {
                            background:
                              designStyle === 'brutal' || designStyle === 'neo'
                                ? surfaceColor
                                : 'rgba(255,255,255,0.1)',
                            border:
                              designStyle === 'brutal'
                                ? '2px solid #000'
                                : '1px solid rgba(255,255,255,0.08)',
                          }),
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {isUser ? msg.content : (
                      <CouncilMarkdown content={msg.content} />
                    )}
                  </div>
                  <div className="text-[10px] text-white/25">{formatTimestamp(msg.timestamp)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function MemberHistoryPanel({ seatId, memberName, memberColor, onClose }: MemberHistoryPanelProps) {
  // Selector gibt nur das Record-Objekt zurück – kein inline `|| []` um
  // neue Array-Referenzen und die resultierende Endlosschleife zu vermeiden
  const rawMessages = useAgentsStore((state) => state.activeCouncilDraftMemberMessages[seatId]);
  const messages = useMemo(() => rawMessages ?? [], [rawMessages]);

  return (
    <SharedHistoryPanel
      title={memberName}
      accentColor={memberColor}
      subtitle="Member thread"
      emptyTitle="No messages yet"
      emptySubtitle={`${memberName} has not replied yet`}
      messages={messages}
      initialScrollMode="bottom"
      onClose={onClose}
    />
  );
}

function MainHistoryPanel({ onClose }: { onClose: () => void }) {
  const messages = useAgentsStore((state) => state.activeCouncilDraftMainMessages);

  return (
    <SharedHistoryPanel
      title="Council Feed"
      accentColor="#94a3b8"
      subtitle="Prompt, first opinion, and final answer"
      emptyTitle="No council history yet"
      emptySubtitle="When the council starts, the main thread appears here."
      messages={messages}
      initialScrollMode="last-assistant-start"
      onClose={onClose}
    />
  );
}

// --------------------------------------------
// Hauptkomponente: CouncilChatBar
// --------------------------------------------

export function CouncilChatBar({
  onSend,
  disabled = false,
  placeholder = 'Ask the council or enter a directive...',
}: CouncilChatBarProps) {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const seatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const councilMemberMessages = useAgentsStore((state) => state.activeCouncilDraftMemberMessages);
  const councilMainMessages = useAgentsStore((state) => state.activeCouncilDraftMainMessages);
  const activeCouncilIsRunning = useAgentsStore((state) => state.activeCouncilIsRunning);
  const runCouncilPrompt = useAgentsStore((state) => state.runCouncilPrompt);
  const abortAndResetCouncilRun = useAgentsStore((state) => state.abortAndResetCouncilRun);
  const webResearchEnabled = useAgentsStore((state) => state.webResearchEnabled);
  const deepResearchEnabled = useAgentsStore((state) => state.deepResearchEnabled);
  const agentModeEnabled = useAgentsStore((state) => state.agentModeEnabled);
  const setWebResearchEnabled = useAgentsStore((state) => state.setWebResearchEnabled);
  const setDeepResearchEnabled = useAgentsStore((state) => state.setDeepResearchEnabled);
  const setAgentModeEnabled = useAgentsStore((state) => state.setAgentModeEnabled);

  const openCouncilChatMemberId = useAgentsSpatialStore((state) => state.openCouncilChatMemberId);
  const setOpenCouncilChatMember = useAgentsSpatialStore((state) => state.setOpenCouncilChatMember);

  const { surface, input: inputStyles, button, textColor, designStyle, surfaceColor } = useThemeStyles();

  // Textarea-Höhe automatisch anpassen
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Ordner-Upload-Attribute setzen
  useEffect(() => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute('webkitdirectory', '');
    folderInputRef.current.setAttribute('directory', '');
  }, []);

  // Member-Buttons: Eldest zuerst, dann die anderen
  const sortedMembers = [...seatMembers].sort((a, b) => {
    if (a.seatId === 'chair-center') return -1;
    if (b.seatId === 'chair-center') return 1;
    return 0;
  });

  const handleToggleHistory = (seatId: string) => {
    setOpenCouncilChatMember(openCouncilChatMemberId === seatId ? null : seatId);
  };

  const handleToggleMainHistory = () => {
    setOpenCouncilChatMember(
      openCouncilChatMemberId === COUNCIL_MAIN_PANEL_ID ? null : COUNCIL_MAIN_PANEL_ID
    );
  };

  const activePanelMember = openCouncilChatMemberId
    ? seatMembers.find((m) => m.seatId === openCouncilChatMemberId) || null
    : null;
  const isMainPanelOpen = openCouncilChatMemberId === COUNCIL_MAIN_PANEL_ID;

  const clearComposeAttachments = useCallback(() => {
    revokeImagePreviewUrls(attachedImages);
    setAttachedImages([]);
    setAttachedFiles([]);
  }, [attachedImages]);

  // ----------------------------------------
  // Nachricht senden
  // ----------------------------------------
  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || disabled || activeCouncilIsRunning) {
      return;
    }

    try {
      if (onSend) {
        onSend(
          input.trim(),
          attachedImages.length > 0 ? stripTransientAttachmentFieldsFromImages(attachedImages) : undefined,
          attachedFiles.length > 0 ? attachedFiles : undefined,
        );
      } else {
        await runCouncilPrompt(
          input.trim(),
          attachedImages.length > 0 ? stripTransientAttachmentFieldsFromImages(attachedImages) : undefined,
          attachedFiles.length > 0 ? attachedFiles : undefined,
        );
      }

      setInput('');
      clearComposeAttachments();

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Council prompt failed:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbortCouncilRun = () => {
    if (!activeCouncilIsRunning) {
      return;
    }

    abortAndResetCouncilRun();
  };

  // ----------------------------------------
  // Bild-Import
  // ----------------------------------------
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    void readAttachmentsFromFiles(files).then((next) => {
      if (next.images.length > 0) {
        setAttachedImages((prev) => [...prev, ...next.images]);
      }
    });
  }, []);

  // ----------------------------------------
  // Datei-Import
  // ----------------------------------------
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    void readAttachmentsFromFiles(files).then((next) => {
      if (next.files.length > 0) {
        setAttachedFiles((prev) => [...prev, ...next.files]);
      }
    });
  }, []);

  const removeImage = (imageId: string) => {
    setAttachedImages((prev) => {
      const img = prev.find((i) => i.id === imageId);
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== imageId);
    });
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    return formatAttachmentFileSize(bytes);
  };

  const hasContent = input.trim().length > 0 || attachedImages.length > 0 || attachedFiles.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex w-full flex-col"
    >
      {/* ----------------------------------------
          History-Panel (öffnet sich nach oben, außerhalb der Bar)
          ---------------------------------------- */}
      <AnimatePresence>
        {isMainPanelOpen ? (
          <MainHistoryPanel onClose={() => setOpenCouncilChatMember(null)} />
        ) : activePanelMember ? (
          <MemberHistoryPanel
            key={activePanelMember.seatId}
            seatId={activePanelMember.seatId}
            memberName={activePanelMember.name}
            memberColor={activePanelMember.color}
            onClose={() => setOpenCouncilChatMember(null)}
          />
        ) : null}
      </AnimatePresence>

      {/* ----------------------------------------
          Member-Pill-Leiste – schwebt knapp über der Chatbar
          Außerhalb des Glassmorphism-Wrappers, minimaler Abstand
          ---------------------------------------- */}
      {sortedMembers.length > 0 ? (
        <div className="mb-1.5 flex items-center gap-1.5 px-1">
          <button
            onClick={handleToggleMainHistory}
            className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150"
            style={{
              ...button.base,
              background: '#f8cd4f',
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(248,205,79,0.55)',
              boxShadow: isMainPanelOpen
                ? '0 0 16px rgba(248,205,79,0.34)'
                : '0 0 10px rgba(248,205,79,0.2)',
              color: '#111827',
            }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: '#111827',
                boxShadow: 'none',
              }}
            />
            <span>Council</span>
            {councilMainMessages.length > 0 ? (
              <span
                className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                style={{ backgroundColor: 'rgba(17,24,39,0.9)' }}
              >
                {councilMainMessages.length > 9
                  ? '9+'
                  : councilMainMessages.length}
              </span>
            ) : null}
          </button>

          {sortedMembers.map((member) => {
            const isOpen = openCouncilChatMemberId === member.seatId;
            const isEldest = member.seatId === 'chair-center';
            const msgCount = (councilMemberMessages[member.seatId] || []).length;

            return (
              <button
                key={member.seatId}
                onClick={() => handleToggleHistory(member.seatId)}
                className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 ${
                  isOpen ? 'text-white' : 'text-white/55 hover:text-white/80'
                }`}
                style={{
                  ...button.base,
                  background: isOpen
                    ? designStyle === 'brutal'
                      ? member.color
                      : `${member.color}22`
                    : button.base.background,
                  backdropFilter: surface.base.backdropFilter,
                  WebkitBackdropFilter: surface.base.WebkitBackdropFilter,
                  border: isOpen
                    ? designStyle === 'brutal'
                      ? '2px solid #000'
                      : `1px solid ${member.color}50`
                    : button.base.border,
                  boxShadow: isOpen
                    ? `0 0 ${isEldest ? 14 : 8}px ${member.color}28`
                    : button.base.boxShadow,
                  color: isOpen ? textColor : `${textColor}99`,
                }}
              >
                {/* Farbpunkt */}
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: member.color,
                    boxShadow: isEldest || isOpen ? `0 0 5px ${member.color}` : 'none',
                  }}
                />
                {/* Name */}
                <span>{member.name}</span>
                {/* Nachrichten-Badge */}
                {msgCount > 0 ? (
                  <span
                    className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {msgCount > 9 ? '9+' : msgCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* ----------------------------------------
          Chatbar-Wrapper (Glassmorphism)
          ---------------------------------------- */}
      <div
        className="overflow-hidden"
        style={{
          ...surface.base,
        }}
      >
        {/* Attachment-Vorschau */}
        <AnimatePresence>
          {(attachedImages.length > 0 || attachedFiles.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 px-4 pt-3"
            >
              {attachedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img src={img.previewUrl} alt={img.name} className="h-14 w-14 rounded-lg object-cover border border-white/10" />
                  <button onClick={() => removeImage(img.id)} className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="relative group flex items-center gap-2 px-2.5 py-1.5"
                  style={{
                    ...button.base,
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  }}
                >
                  <Paperclip className="h-3 w-3 text-white/50" />
                  <div>
                    <p className="text-[10px] text-white/70 max-w-[120px] truncate">{file.name}</p>
                    <p className="text-[9px] text-white/30">{formatFileSize(file.size)}</p>
                  </div>
                  <button onClick={() => removeFile(file.id)} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="px-4 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || activeCouncilIsRunning}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none text-sm placeholder:opacity-35 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              ...inputStyles.base,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0,
              maxHeight: '160px',
              overflowY: 'auto',
              color: textColor,
            }}
          />
        </div>

        {/* Untere Leiste: Tools + Send */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-0.5">
            {/* Bild-Upload */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex h-7 w-7 items-center justify-center transition-colors"
              title="Attach image"
              disabled={disabled || activeCouncilIsRunning}
              style={{ ...button.base, width: '1.75rem', height: '1.75rem', color: `${textColor}99` }}
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
            <input ref={imageInputRef} type="file" accept={SUPPORTED_IMAGE_TYPES.join(',')} multiple onChange={handleImageSelect} className="hidden" />

            {/* Datei-Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-7 w-7 items-center justify-center transition-colors"
              title="Attach file"
              disabled={disabled || activeCouncilIsRunning}
              style={{ ...button.base, width: '1.75rem', height: '1.75rem', color: `${textColor}99` }}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>

            {/* Ordner-Upload */}
            <button
              onClick={() => folderInputRef.current?.click()}
              className="flex h-7 w-7 items-center justify-center transition-colors"
              title="Attach folder"
              disabled={disabled || activeCouncilIsRunning}
              style={{ ...button.base, width: '1.75rem', height: '1.75rem', color: `${textColor}99` }}
            >
              <Folder className="h-3.5 w-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept={SUPPORTED_FILE_TYPES.join(',')} multiple onChange={handleFileSelect} className="hidden" />
            <input ref={folderInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

            {/* Trenner */}
            <div className="h-4 w-px bg-white/10 mx-1" />

            {/* Web Research */}
            <button
              onClick={() => setWebResearchEnabled(!webResearchEnabled)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors"
              title="Web Research"
              style={{
                ...button.base,
                color: webResearchEnabled ? '#60a5fa' : `${textColor}80`,
                background: webResearchEnabled
                  ? designStyle === 'brutal'
                    ? surfaceColor
                    : 'rgba(59,130,246,0.16)'
                  : button.base.background,
              }}
            >
              <Globe className="h-3 w-3" />
              Web
            </button>

            {/* Deep Research */}
            <button
              onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors"
              title="Deep Research"
              style={{
                ...button.base,
                color: deepResearchEnabled ? '#c084fc' : `${textColor}80`,
                background: deepResearchEnabled
                  ? designStyle === 'brutal'
                    ? surfaceColor
                    : 'rgba(168,85,247,0.16)'
                  : button.base.background,
              }}
            >
              <Search className="h-3 w-3" />
              Deep
            </button>

            {/* Agent-Mode */}
            <button
              onClick={() => setAgentModeEnabled(!agentModeEnabled)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors"
              title="Agent-Mode"
              style={{
                ...button.base,
                color: agentModeEnabled ? '#34d399' : `${textColor}80`,
                background: agentModeEnabled
                  ? designStyle === 'brutal'
                    ? surfaceColor
                    : 'rgba(16,185,129,0.16)'
                  : button.base.background,
              }}
            >
              <Bot className="h-3 w-3" />
              Agent
            </button>
          </div>

          {/* Mikrofon + Senden */}
          <div className="flex items-end gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center cursor-not-allowed"
                title="Voice mode (coming soon)"
              disabled
              style={{
                ...button.base,
                width: '2rem',
                height: '2rem',
                color: textColor,
                opacity: 0.3,
              }}
            >
              <Mic className="h-3.5 w-3.5" />
            </button>

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleAbortCouncilRun}
                disabled={!activeCouncilIsRunning}
                className="flex h-7 items-center gap-1.5 px-2 text-[10px] font-medium transition-colors disabled:cursor-not-allowed"
                title="Stop the active council run and reset"
                style={{
                  ...button.base,
                  color: activeCouncilIsRunning ? '#fda4af' : `${textColor}55`,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.625rem',
                  background: activeCouncilIsRunning
                    ? (designStyle === 'brutal' ? surfaceColor : 'rgba(244,63,94,0.12)')
                    : button.base.background,
                  border: activeCouncilIsRunning
                    ? (designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(244,63,94,0.3)')
                    : button.base.border,
                }}
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </button>

              <motion.button
                onClick={handleSend}
                disabled={!hasContent || disabled || activeCouncilIsRunning}
                className="flex h-8 w-8 items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  ...(hasContent && !disabled ? button.primary : button.base),
                  background: hasContent && !disabled ? button.primary.background : surfaceColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.625rem',
                  color: hasContent && !disabled ? '#fff' : textColor,
                }}
                whileHover={{ scale: hasContent && !disabled ? 1.05 : 1 }}
                whileTap={{ scale: hasContent && !disabled ? 0.95 : 1 }}
                title="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
