'use client';

// ============================================
// SandboxCard.tsx - Karte für eine Sandbox Session
// 
// Zweck: Anzeige von Session-Infos mit Schnellzugriff
// Verwendet von: TrainingPage
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  Play,
  Pause,
  Trash2,
  MoreVertical,
  MessageSquare,
  ThumbsUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { STATUS_COLORS } from '../constants';
import type { SandboxSession } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface SandboxCardProps {
  session: SandboxSession & {
    model?: { id: string; name: string; type: string; icon?: string; color?: string };
    promptCount?: number;
  };
  onUpdate: () => void;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function SandboxCard({ session, onUpdate }: SandboxCardProps) {
  const { surface, designStyle, textColor, accentColor } = useThemeStyles();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const status = STATUS_COLORS[session.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.active;
  const isActive = session.status === 'active';

  // --------------------------------------------
  // Status togglen (Pause/Resume)
  // --------------------------------------------

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try {
      await fetch(`/api/training/sandbox/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: isActive ? 'paused' : 'active',
        }),
      });
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Status-Toggle:', error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // --------------------------------------------
  // Löschen
  // --------------------------------------------

  const handleDelete = async () => {
    if (!confirm('Session wirklich löschen? Alle Prompts und Feedbacks werden gelöscht.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await fetch(`/api/training/sandbox/${session.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  // --------------------------------------------
  // Zeitanzeige
  // --------------------------------------------

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes}m`;
    if (minutes < 1440) return `vor ${Math.floor(minutes / 60)}h`;
    return `vor ${Math.floor(minutes / 1440)}d`;
  };

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden p-4 transition-all hover:scale-[1.02]"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        border: isActive ? `1px solid ${accentColor}40` : undefined,
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center"
          style={{
            background: isActive 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
            boxShadow: designStyle === 'brutal' 
              ? '2px 2px 0 #000' 
              : isActive 
                ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                : undefined,
          }}
        >
          <FlaskConical className="h-5 w-5 text-white" />
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-8 w-8 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '0.375rem',
            }}
          >
            <MoreVertical className="h-4 w-4" style={{ color: textColor, opacity: 0.7 }} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-full z-20 mt-1 min-w-[150px] overflow-hidden py-1"
                style={{
                  ...surface.base,
                  borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
              >
                <button
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                >
                  {isTogglingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                  ) : isActive ? (
                    <Pause className="h-4 w-4 opacity-60" />
                  ) : (
                    <Play className="h-4 w-4 opacity-60" />
                  )}
                  {isActive ? 'Pausieren' : 'Fortsetzen'}
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                >
                  <ExternalLink className="h-4 w-4 opacity-60" />
                  Öffnen
                </button>
                <hr className="my-1 border-white/10" />
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="mb-1 font-semibold" style={{ color: textColor }}>
        {session.name || 'Sandbox Session'}
      </h3>
      <p className="mb-3 text-xs opacity-60" style={{ color: textColor }}>
        {session.model?.name || session.baseModel}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
          style={{
            background: status.bg,
            color: status.text,
            borderRadius: '9999px',
          }}
        >
          {status.label}
        </span>

        <span className="text-xs opacity-40" style={{ color: textColor }}>
          {getRelativeTime(session.lastActivityAt)}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-3 flex gap-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" style={{ color: textColor, opacity: 0.4 }} />
          <span className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
            {session.promptCount || 0} Prompts
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3" style={{ color: textColor, opacity: 0.4 }} />
          <span className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
            {session.feedbackCount} Feedbacks
          </span>
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div
          className="absolute bottom-0 left-0 h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, #10b981 100%)`,
          }}
        />
      )}
    </motion.div>
  );
}








