// ============================================
// AgentSettingsUnifiedModal.tsx - Einheitliches Settings-Modal
//
// Zweck: Rendert die gleiche Settings-UI wie /agents/settings
//        direkt im Dashboard-Modal ohne Route-Wechsel.
// Verwendet von: ModuleSettingsButton
// ============================================

'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAgentsStore } from '@/modules/agents/store';
import { AgentSettingsPage } from '@/modules/agents/components/AgentSettingsPage';

interface Props {
  moduleId: string;
  moduleName: string;
  moduleColor?: string;
  onClose: () => void;
}

export function AgentSettingsUnifiedModal({ moduleId, onClose }: Props) {
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);

  useEffect(() => {
    setSelectedAgent(moduleId);
  }, [moduleId, setSelectedAgent]);

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: 'min(1480px, 98vw)',
          height: 'min(920px, 94vh)',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          background: 'rgba(8, 12, 24, 0.92)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 20,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.35)',
            color: '#fff',
            borderRadius: 9999,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Settings schliessen"
        >
          <X size={16} />
        </button>

        <div className="h-full">
          <AgentSettingsPage />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default AgentSettingsUnifiedModal;
