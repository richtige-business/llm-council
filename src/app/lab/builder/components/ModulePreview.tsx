'use client';

// ============================================
// ModulePreview.tsx - Live Preview des Moduls
// 
// Zweck: Zeigt eine echte Live-Vorschau des generierten Moduls
//        Nutzt iframe-Sandbox für sichere Code-Ausführung
// Verwendet von: Builder Page
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  RefreshCw, 
  AlertTriangle,
  Eye,
  Smartphone,
  Monitor,
  Loader2,
  CheckCircle,
  XCircle,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useBuilderModule, usePreviewState, useBuilderStore } from '@/lib/lab';

// --------------------------------------------
// Viewport-Optionen
// --------------------------------------------

const VIEWPORTS = [
  { id: 'desktop', icon: Monitor, width: '100%', label: 'Desktop' },
  { id: 'mobile', icon: Smartphone, width: '375px', label: 'Mobile' },
];

// --------------------------------------------
// Activate Button Komponente
// --------------------------------------------

interface ActivateButtonProps {
  currentModule: NonNullable<ReturnType<typeof useBuilderModule>>;
  accentColor: string;
}

function ActivateButton({ currentModule, accentColor }: ActivateButtonProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const setModuleStatus = useBuilderStore((s) => s.setModuleStatus);
  
  const handleActivate = async (overwrite = false) => {
    setIsActivating(true);
    setActivationResult(null);
    
    try {
      const response = await fetch('/api/lab/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: currentModule,
          overwrite,
        }),
      });
      
      const data = await response.json();
      
      if (response.status === 409 && data.exists) {
        // Modul existiert - frage nach Überschreibung
        if (confirm(data.message)) {
          await handleActivate(true);
          return;
        }
        setIsActivating(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Activation failed');
      }
      
      setActivationResult({
        success: true,
        message: data.message,
      });
      setModuleStatus('published');
      
    } catch (error) {
      console.error('Activation error:', error);
      setActivationResult({
        success: false,
        message: error instanceof Error ? error.message : 'Aktivierung fehlgeschlagen',
      });
    } finally {
      setIsActivating(false);
    }
  };
  
  return (
    <div className="p-3 border-t border-white/10 shrink-0">
      {activationResult && (
        <div 
          className="mb-3 p-2 rounded-lg text-sm"
          style={{
            background: activationResult.success 
              ? 'rgba(16, 185, 129, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${activationResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: activationResult.success ? '#10b981' : '#ef4444',
          }}
        >
          {activationResult.success ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{activationResult.message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span>{activationResult.message}</span>
            </div>
          )}
        </div>
      )}
      
      {currentModule.status === 'published' ? (
        <div className="flex gap-2">
          <a
            href={`/${currentModule.id}`}
            className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, #a855f7 100%)`,
              color: '#fff',
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Modul öffnen
          </a>
          <button
            onClick={() => handleActivate(true)}
            disabled={isActivating}
            className="px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all hover:bg-white/10 disabled:opacity-50"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isActivating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleActivate()}
          disabled={isActivating}
          className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #a855f7 100%)`,
            color: '#fff',
            boxShadow: `0 4px 15px ${accentColor}40`,
          }}
        >
          {isActivating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Aktiviere...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Modul aktivieren
            </>
          )}
        </button>
      )}
    </div>
  );
}

// --------------------------------------------
// Komponente: ModulePreview
// --------------------------------------------

export function ModulePreview() {
  const { surface, container, textColor, accentColor, designStyle } = useThemeStyles();
  const currentModule = useBuilderModule();
  const previewState = usePreviewState();
  const setPreviewActive = useBuilderStore((s) => s.setPreviewActive);
  const clearPreviewErrors = useBuilderStore((s) => s.clearPreviewErrors);
  const addCompileError = useBuilderStore((s) => s.addCompileError);
  
  const [viewport, setViewport] = useState('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [previewHTML, setPreviewHTML] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // --------------------------------------------
  // Preview generieren
  // --------------------------------------------
  
  const generatePreview = useCallback(async () => {
    if (!currentModule || currentModule.files.length === 0) {
      setPreviewHTML(null);
      return;
    }
    
    // Prüfe ob eine Page-Komponente existiert
    const hasPageComponent = currentModule.files.some(
      f => f.path.includes('components/') && f.path.endsWith('Page.tsx')
    );
    
    if (!hasPageComponent) {
      setPreviewHTML(null);
      return;
    }
    
    setIsLoading(true);
    clearPreviewErrors();
    
    try {
      const response = await fetch('/api/lab/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: currentModule.files,
          moduleName: currentModule.name,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Preview generation failed');
      }
      
      const data = await response.json();
      setPreviewHTML(data.html);
      setPreviewActive(true);
      
    } catch (error) {
      console.error('Preview error:', error);
      addCompileError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      setPreviewHTML(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentModule, clearPreviewErrors, addCompileError, setPreviewActive]);
  
  // Auto-generate preview wenn sich das Modul ändert
  useEffect(() => {
    if (currentModule?.status === 'ready' || currentModule?.status === 'published') {
      generatePreview();
    }
  }, [currentModule?.status, currentModule?.files.length, generatePreview]);
  
  // Refresh-Funktion
  const handleRefresh = () => {
    generatePreview();
  };
  
  // Kein Modul
  if (!currentModule) {
    return (
      <div 
        className="flex flex-col h-full"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Eye className="h-12 w-12 mx-auto mb-3" style={{ color: textColor, opacity: 0.2 }} />
            <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
              Erstelle ein Modul um die Vorschau zu sehen
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Viewport-Breite
  const currentViewport = VIEWPORTS.find(v => v.id === viewport) || VIEWPORTS[0];
  
  // Status-Farbe
  const statusConfig = {
    drafting: { color: '#f59e0b', icon: Loader2, label: 'Entwurf' },
    generating: { color: '#3b82f6', icon: Loader2, label: 'Generiere...' },
    ready: { color: '#10b981', icon: CheckCircle, label: 'Bereit' },
    error: { color: '#ef4444', icon: XCircle, label: 'Fehler' },
    published: { color: '#8b5cf6', icon: CheckCircle, label: 'Veröffentlicht' },
  };
  
  const status = statusConfig[currentModule.status];
  const StatusIcon = status.icon;
  
  return (
    <div 
      className={`flex flex-col overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}
      style={{
        ...container.base,
        borderRadius: isFullscreen ? 0 : (designStyle === 'brutal' ? '0.5rem' : '1rem'),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" style={{ color: accentColor }} />
            <span className="text-sm font-medium" style={{ color: textColor }}>
              Live-Vorschau
            </span>
          </div>
          
          {/* Status Badge */}
          <div 
            className="flex items-center gap-1 px-2 py-0.5 text-xs"
            style={{
              background: `${status.color}20`,
              color: status.color,
              borderRadius: '9999px',
            }}
          >
            <StatusIcon 
              className={`h-3 w-3 ${currentModule.status === 'generating' || isLoading ? 'animate-spin' : ''}`} 
            />
            <span>{isLoading ? 'Lädt...' : status.label}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Viewport Switcher */}
          <div 
            className="flex rounded-lg overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {VIEWPORTS.map(vp => (
              <button
                key={vp.id}
                onClick={() => setViewport(vp.id)}
                className="p-1.5 transition-colors"
                style={{
                  background: viewport === vp.id ? accentColor : 'transparent',
                }}
                title={vp.label}
              >
                <vp.icon 
                  className="h-4 w-4" 
                  style={{ color: viewport === vp.id ? '#fff' : textColor, opacity: viewport === vp.id ? 1 : 0.5 }} 
                />
              </button>
            ))}
          </div>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded transition-colors hover:bg-white/10"
            title={isFullscreen ? 'Verkleinern' : 'Vollbild'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" style={{ color: textColor, opacity: 0.6 }} />
            ) : (
              <Maximize2 className="h-4 w-4" style={{ color: textColor, opacity: 0.6 }} />
            )}
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded transition-colors hover:bg-white/10 disabled:opacity-50"
            title="Aktualisieren"
          >
            <RefreshCw 
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
              style={{ color: textColor, opacity: 0.6 }} 
            />
          </button>
        </div>
      </div>
      
      {/* Module Info (nur wenn nicht fullscreen) */}
      {!isFullscreen && (
        <div className="p-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-10 w-10 items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, #a855f7 100%)`,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              <span className="text-lg">📦</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate" style={{ color: textColor }}>
                {currentModule.name || 'Unbenanntes Modul'}
              </h3>
              <p className="text-xs truncate" style={{ color: textColor, opacity: 0.5 }}>
                {currentModule.description || 'Keine Beschreibung'}
              </p>
            </div>
          </div>
          
          {/* Modul-Stats */}
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: accentColor }}>
                {currentModule.files.length}
              </div>
              <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                Dateien
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: accentColor }}>
                {currentModule.widgets.length}
              </div>
              <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                Widgets
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: accentColor }}>
                {currentModule.tools?.length || 0}
              </div>
              <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                Tools
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Area */}
      <div className="flex-1 p-4 overflow-auto">
        <div 
          className="mx-auto h-full transition-all duration-300"
          style={{ 
            maxWidth: currentViewport.width,
          }}
        >
          {/* Errors */}
          {previewState.compileErrors.length > 0 && (
            <div 
              className="mb-4 p-3"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Kompilierungsfehler</span>
              </div>
              {previewState.compileErrors.map((error, i) => (
                <p key={i} className="text-xs text-red-300 font-mono">
                  {error}
                </p>
              ))}
            </div>
          )}
          
          {/* iframe Preview */}
          <div 
            className="h-full relative"
            style={{
              ...surface.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
              minHeight: isFullscreen ? 'calc(100vh - 120px)' : '300px',
              overflow: 'hidden',
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" style={{ color: accentColor }} />
                  <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                    Generiere Vorschau...
                  </p>
                </div>
              </div>
            )}
            
            {previewHTML ? (
              <iframe
                ref={iframeRef}
                srcDoc={previewHTML}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title={`${currentModule.name} Preview`}
                style={{
                  minHeight: isFullscreen ? 'calc(100vh - 120px)' : '300px',
                  background: 'transparent',
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  {currentModule.status === 'generating' ? (
                    <>
                      <Loader2 
                        className="h-8 w-8 mx-auto mb-2 animate-spin" 
                        style={{ color: accentColor }} 
                      />
                      <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
                        Generiere Modul...
                      </p>
                    </>
                  ) : currentModule.status === 'error' ? (
                    <>
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="text-sm text-red-400">
                        {currentModule.error || 'Ein Fehler ist aufgetreten'}
                      </p>
                    </>
                  ) : currentModule.files.length === 0 ? (
                    <>
                      <Eye className="h-8 w-8 mx-auto mb-2" style={{ color: textColor, opacity: 0.2 }} />
                      <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
                        Beschreibe dein Modul um die Vorschau zu sehen
                      </p>
                    </>
                  ) : (
                    <>
                      <Play className="h-8 w-8 mx-auto mb-2" style={{ color: textColor, opacity: 0.3 }} />
                      <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
                        Klicke auf Aktualisieren für die Vorschau
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="mt-3 px-4 py-2 text-sm rounded-lg transition-colors"
                        style={{
                          background: accentColor,
                          color: '#fff',
                        }}
                      >
                        Vorschau generieren
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Activate Button */}
      {(currentModule.status === 'ready' || currentModule.status === 'published') && (
        <ActivateButton 
          currentModule={currentModule} 
          accentColor={accentColor}
        />
      )}
      
      {/* Fullscreen Escape Hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 right-4 text-xs px-2 py-1 rounded bg-black/50" style={{ color: textColor, opacity: 0.5 }}>
          ESC oder Klick auf Minimize zum Schließen
        </div>
      )}
    </div>
  );
}
