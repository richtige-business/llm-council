// ============================================
// HumanInTheLoopDialog.tsx - Bestätigungs-Dialog für Agent-Aktionen
// 
// Zweck: Zeigt Dialog wenn eine Action Human in the Loop Bestätigung braucht
// Verwendet von: ChatWidget
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check, AlertTriangle } from 'lucide-react';
import type { AgentAction } from '@/lib/agent/types';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface Props {
  action: AgentAction;
  onConfirm: () => void;
  onReject: () => void;
}

// --------------------------------------------
// Action Details formatieren
// --------------------------------------------

function formatActionDetails(action: AgentAction): { title: string; description: string; details: string[] } {
  const { type, payload } = action;
  
  // Basis-Informationen aus dem Type extrahieren
  const [module, actionName] = type.split('.');
  
  // Spezifische Formatierung je nach Action
  switch (type) {
    case 'calendar.createEvent':
      return {
        title: '📅 Termin erstellen',
        description: `Der Agent möchte einen neuen Termin erstellen.`,
        details: [
          `Titel: ${payload?.title || 'Kein Titel'}`,
          `Start: ${payload?.startDate || 'Kein Datum'}`,
          payload?.endDate ? `Ende: ${payload.endDate}` : '',
          payload?.description ? `Beschreibung: ${payload.description}` : '',
        ].filter(Boolean),
      };
      
    case 'calendar.deleteEvent':
      return {
        title: '🗑️ Termin löschen',
        description: `Der Agent möchte einen Termin löschen.`,
        details: [
          `Event ID: ${payload?.eventId || 'Unbekannt'}`,
        ],
      };
      
    case 'inbox.sendEmail':
      return {
        title: '📧 E-Mail senden',
        description: `Der Agent möchte eine E-Mail versenden.`,
        details: [
          `An: ${payload?.to || 'Kein Empfänger'}`,
          `Betreff: ${payload?.subject || 'Kein Betreff'}`,
          payload?.body ? `Nachricht: ${payload.body.substring(0, 100)}${payload.body.length > 100 ? '...' : ''}` : '',
        ].filter(Boolean),
      };
      
    default:
      return {
        title: `🤖 ${actionName || 'Aktion'}`,
        description: `Der Agent möchte eine Aktion im Modul "${module}" ausführen.`,
        details: Object.entries(payload || {}).map(([key, value]) => 
          `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
        ),
      };
  }
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function HumanInTheLoopDialog({ action, onConfirm, onReject }: Props) {
  const [mounted, setMounted] = useState(false);
  const { title, description, details } = formatActionDetails(action);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  const dialogContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onReject}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
        />
        
        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '28rem',
            background: 'linear-gradient(180deg, rgba(35, 35, 50, 0.98) 0%, rgba(25, 25, 40, 0.98) 100%)',
            borderRadius: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(251, 191, 36, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header mit Warnung */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: 'rgba(251, 191, 36, 0.1)',
            borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={22} style={{ color: '#FBC24D' }} />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Bestätigung erforderlich
              </h2>
              <p style={{ color: 'rgba(251, 191, 36, 0.8)', fontSize: '0.75rem', margin: 0 }}>
                Human in the Loop aktiv
              </p>
            </div>
          </div>
          
          {/* Content */}
          <div style={{ padding: '1.25rem' }}>
            {/* Action Title */}
            <h3 style={{ 
              color: '#fff', 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              margin: '0 0 0.5rem 0',
            }}>
              {title}
            </h3>
            
            {/* Description */}
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '0.875rem', 
              margin: '0 0 1rem 0',
              lineHeight: 1.5,
            }}>
              {description}
            </p>
            
            {/* Details */}
            {details.length > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '0.75rem',
                padding: '0.875rem 1rem',
                marginBottom: '1rem',
              }}>
                {details.map((detail, idx) => (
                  <div 
                    key={idx}
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.8rem',
                      padding: '0.25rem 0',
                      borderBottom: idx < details.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      wordBreak: 'break-word',
                    }}
                  >
                    {detail}
                  </div>
                ))}
              </div>
            )}
            
            {/* Warning */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}>
              <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '0.75rem', 
                margin: 0,
                lineHeight: 1.4,
              }}>
                Diese Aktion kann nicht rückgängig gemacht werden. Bitte prüfe die Details sorgfältig.
              </p>
            </div>
          </div>
          
          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '0 1.25rem 1.25rem 1.25rem',
          }}>
            <button
              onClick={onReject}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.625rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <X size={18} />
              Ablehnen
            </button>
            
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '0.625rem',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
            >
              <Check size={18} />
              Bestätigen
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
  
  return createPortal(dialogContent, document.body);
}

export default HumanInTheLoopDialog;


