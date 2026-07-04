'use client';

// ============================================
// ChatMessageActions.tsx - Hover-Aktionen fuer Chat-Nachrichten
//
// Zweck: Zeigt Copy-, Edit-, Regenerate- und
//        Reply-Aktionen kompakt an einer Nachricht
// Verwendet von: ChatMessage.tsx
// ============================================

import { useState } from 'react';
import type { ComponentType } from 'react';
import { Check, Copy, Pencil, RefreshCw, Reply } from 'lucide-react';

interface ChatMessageActionsProps {
  align: 'left' | 'right';
  onCopy?: () => void | Promise<void>;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onReply?: () => void;
}

interface ActionButtonConfig {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void | Promise<void>;
}

export function ChatMessageActions({
  align,
  onCopy,
  onEdit,
  onRegenerate,
  onReply,
}: ChatMessageActionsProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!onCopy) return;

    await onCopy();
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  };

  const actionButtons: ActionButtonConfig[] = [
    ...(onReply
      ? [{ id: 'reply', label: 'Antworten', icon: Reply, onClick: onReply }]
      : []),
    ...(onCopy
      ? [{
          id: 'copy',
          label: isCopied ? 'Kopiert' : 'Kopieren',
          icon: isCopied ? Check : Copy,
          onClick: handleCopy,
        }]
      : []),
    ...(onEdit
      ? [{ id: 'edit', label: 'Bearbeiten', icon: Pencil, onClick: onEdit }]
      : []),
    ...(onRegenerate
      ? [{ id: 'regenerate', label: 'Neu generieren', icon: RefreshCw, onClick: onRegenerate }]
      : []),
  ];

  if (actionButtons.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute top-1 z-20 flex gap-1 opacity-0 transition-all group-hover/msg:opacity-100"
      style={
        align === 'right'
          ? { right: 'calc(100% + 0.375rem)' }
          : { left: 'calc(100% + 0.375rem)' }
      }
    >
      {actionButtons.map((actionButton) => {
        const Icon = actionButton.icon;

        return (
          <button
            key={actionButton.id}
            type="button"
            onClick={() => {
              void actionButton.onClick();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/55 transition-all hover:bg-white/20 hover:text-white/90"
            title={actionButton.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
