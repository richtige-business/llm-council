// ============================================
// LifeOS Module Builder - Veröffentlichungs-Modal
// 
// Zweck: Dialog zur Auswahl von Privat/Öffentlich bei Veröffentlichung
// Verwendet von: Projekt-Chat-Seite
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Globe,
  Lock,
  Rocket,
  Loader2,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Props
// --------------------------------------------

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (visibility: 'private' | 'public') => Promise<boolean>;
  moduleName: string;
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export function PublishModal({ isOpen, onClose, onPublish, moduleName }: PublishModalProps) {
  const { surface, container, button, accentColor, textColor, designStyle } = useThemeStyles();
  const [selectedVisibility, setSelectedVisibility] = useState<'private' | 'public'>('private');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handlePublish = async () => {
    setIsPublishing(true);
    const success = await onPublish(selectedVisibility);
    setIsPublishing(false);
    
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div
              className="p-6"
              style={{
                ...container.base,
                borderRadius: designStyle === 'brutal' ? '1rem' : '1.5rem',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                    }}
                  >
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold" style={{ color: textColor }}>
                      Modul veröffentlichen
                    </h2>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                      {moduleName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Success State */}
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div
                    className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: '#22c55e20',
                      borderRadius: '50%',
                    }}
                  >
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: textColor }}>
                    Erfolgreich veröffentlicht!
                  </h3>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                    Das Modul ist jetzt in der Bibliothek verfügbar.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Visibility Options */}
                  <div className="space-y-3 mb-6">
                    {/* Private Option */}
                    <button
                      onClick={() => setSelectedVisibility('private')}
                      className="w-full p-4 text-left transition-all group"
                      style={{
                        ...surface.base,
                        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                        border: selectedVisibility === 'private' 
                          ? `2px solid ${accentColor}` 
                          : `2px solid transparent`,
                        background: selectedVisibility === 'private' 
                          ? `${accentColor}10` 
                          : surface.base.background,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                          style={{
                            background: '#06b6d420',
                            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                          }}
                        >
                          <Lock className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{ color: textColor }}>
                            Private Bibliothek
                          </h3>
                          <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                            Nur für dich sichtbar. Nutze das Modul in deinem persönlichen LifeOS.
                          </p>
                        </div>
                        {/* Radio Circle */}
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            border: `2px solid ${selectedVisibility === 'private' ? accentColor : textColor + '40'}`,
                          }}
                        >
                          {selectedVisibility === 'private' && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ background: accentColor }}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Public Option */}
                    <button
                      onClick={() => setSelectedVisibility('public')}
                      className="w-full p-4 text-left transition-all group"
                      style={{
                        ...surface.base,
                        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                        border: selectedVisibility === 'public' 
                          ? `2px solid ${accentColor}` 
                          : `2px solid transparent`,
                        background: selectedVisibility === 'public' 
                          ? `${accentColor}10` 
                          : surface.base.background,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                          style={{
                            background: '#8b5cf620',
                            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                          }}
                        >
                          <Globe className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{ color: textColor }}>
                            Öffentliche Bibliothek
                          </h3>
                          <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                            Teile dein Modul mit der Community. Andere können es entdecken und nutzen.
                          </p>
                        </div>
                        {/* Radio Circle */}
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            border: `2px solid ${selectedVisibility === 'public' ? accentColor : textColor + '40'}`,
                          }}
                        >
                          {selectedVisibility === 'public' && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ background: accentColor }}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {/* Info Box */}
                  <div 
                    className="flex items-start gap-2 p-3 mb-6"
                    style={{
                      background: `${accentColor}10`,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                    }}
                  >
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                    <p className="text-xs" style={{ color: textColor, opacity: 0.7 }}>
                      Nach der Veröffentlichung erscheint das Modul in der Bibliothek und kann zur Sidebar hinzugefügt werden.
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 text-sm font-medium transition-all"
                      style={{
                        ...button.base,
                        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                        color: textColor,
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                        boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : `0 4px 15px ${accentColor}40`,
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        opacity: isPublishing ? 0.7 : 1,
                      }}
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Veröffentliche...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          Veröffentlichen
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PublishModal;





