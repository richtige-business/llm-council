// ============================================
// LifeOS Module Builder - Messages
//
// Zweck: Zeigt Chat-Nachrichten inkl. Activity-Timeline
//        und persistenter Build-Artefakte.
// Verwendet von: ProjectChatPage
// ============================================

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Sparkles, Clock3, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionOption } from '../../stores/chat-store';
import { OptionCards } from './OptionCards';
import { StreamingCodeBlockList } from './StreamingCodeBlock';
import { useWorkbenchStore } from '../../stores/workbench-store';

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  container?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface RenderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  options?: ActionOption[];
  kind?: 'chat' | 'activity' | 'summary' | 'build_artifacts';
  activityType?: ProjectActivityType;
  artifacts?: BuildArtifactEntry[];
}

type ProjectActivityType =
  | 'analyze'
  | 'search'
  | 'explore'
  | 'plan'
  | 'edit_start'
  | 'edit_done'
  | 'patch'
  | 'validate'
  | 'finalize';

interface BuildArtifactEntry {
  id?: string;
  title?: string;
  summary?: string;
  timestamp?: string;
  fileCount?: number;
  files?: Array<{ path: string }>;
}

interface MessagesProps {
  messages: RenderMessage[];
  isStreaming?: boolean;
  themeStyles?: ThemeStyles;
  chatMode?: 'build' | 'discuss';
  onSelectOption?: (option: ActionOption) => void;
  onOpenFile?: (path: string) => void;
}

const HistoricalBuildArtifactsCard = memo(function HistoricalBuildArtifactsCard({
  artifacts,
  onOpenFile,
  themeStyles,
}: {
  artifacts: BuildArtifactEntry[];
  onOpenFile?: (path: string) => void;
  themeStyles?: {
    accentColor: string;
    designStyle: string;
    textColor: string;
  };
}) {
  const accentColor = themeStyles?.accentColor || '#8b5cf6';
  const designStyle = themeStyles?.designStyle || 'glass';
  const textColor = themeStyles?.textColor || '#ffffff';

  if (!artifacts || artifacts.length === 0) {
    return (
      <div
        className="inline-block px-4 py-3"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: designStyle === 'brutal' ? '1rem' : '1.25rem',
          border: designStyle === 'brutal' ? '2px solid #000' : `1px solid ${accentColor}35`,
        }}
      >
        <p className="text-sm" style={{ color: textColor, opacity: 0.85 }}>
          Keine Build-Artefakte vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div
      className="inline-block px-4 py-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: designStyle === 'brutal' ? '1rem' : '1.25rem',
        border: designStyle === 'brutal' ? '2px solid #000' : `1px solid ${accentColor}35`,
      }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: accentColor }}>
        Build-Artefakte
      </p>
      <div className="space-y-2">
        {artifacts.map((artifact, index) => {
          const primaryPath = artifact.files?.[0]?.path;
          const label = artifact.title || artifact.summary || `Artefakt ${index + 1}`;
          const fileCount = artifact.fileCount ?? artifact.files?.length ?? 0;

          return (
            <div key={artifact.id || `${label}-${index}`} className="text-sm" style={{ color: textColor, opacity: 0.9 }}>
              <div className="font-medium">{label}</div>
              {fileCount > 0 && (
                <div className="text-xs" style={{ opacity: 0.6 }}>
                  {fileCount} Datei{fileCount === 1 ? '' : 'en'}
                </div>
              )}
              {primaryPath && onOpenFile && (
                <button
                  className="mt-1 text-xs underline underline-offset-2"
                  style={{ color: accentColor }}
                  onClick={() => onOpenFile(primaryPath)}
                >
                  {primaryPath} öffnen
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

function getActivityLabel(activityType?: ProjectActivityType): string {
  switch (activityType) {
    case 'analyze':
      return 'Analyse';
    case 'search':
      return 'Suche';
    case 'explore':
      return 'Explore';
    case 'plan':
      return 'Plan';
    case 'edit_start':
      return 'Edit';
    case 'edit_done':
      return 'Zwischenfazit';
    case 'patch':
      return 'Patch';
    case 'validate':
      return 'Validate';
    case 'finalize':
      return 'Abschluss';
    default:
      return 'Aktivität';
  }
}

const ActivityCard = memo(function ActivityCard({
  message,
  themeStyles,
}: {
  message: RenderMessage;
  themeStyles?: ThemeStyles;
}) {
  const { accentColor = '#8b5cf6', designStyle = 'glass', textColor = '#ffffff' } = themeStyles || {};

  return (
    <div
      className="inline-flex items-start gap-2 px-3 py-2"
      style={{
        background: `${accentColor}14`,
        border: designStyle === 'brutal' ? '2px solid #000' : `1px solid ${accentColor}40`,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
      }}
    >
      <Clock3 className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
      <div className="text-left">
        <p className="text-xs font-semibold" style={{ color: accentColor }}>
          {getActivityLabel(message.activityType)}
        </p>
        <p className="text-sm whitespace-pre-wrap" style={{ color: textColor, opacity: 0.9 }}>
          {message.content}
        </p>
      </div>
    </div>
  );
});

const SummaryCard = memo(function SummaryCard({
  message,
  themeStyles,
  chatMode,
}: {
  message: RenderMessage;
  themeStyles?: ThemeStyles;
  chatMode?: 'build' | 'discuss';
}) {
  const { accentColor = '#8b5cf6', designStyle = 'glass' } = themeStyles || {};

  return (
    <div
      className="inline-flex items-start gap-2 px-4 py-3"
      style={{
        background: `${accentColor}20`,
        border: designStyle === 'brutal' ? '2px solid #000' : `1px solid ${accentColor}50`,
        borderRadius: designStyle === 'brutal' ? '0.85rem' : '1rem',
      }}
    >
      <Flag className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: accentColor }}>
          Abschlussfazit
        </p>
        <MessageContent content={message.content} isStreaming={false} themeStyles={themeStyles} chatMode={chatMode || 'build'} />
      </div>
    </div>
  );
});

// --------------------------------------------
// Message Komponente
// --------------------------------------------

const Message = memo(function Message({
  message,
  isLast,
  isStreaming,
  themeStyles,
  chatMode = 'build',
  onSelectOption,
  onOpenFile,
}: {
  message: RenderMessage;
  isLast: boolean;
  isStreaming: boolean;
  themeStyles?: ThemeStyles;
  chatMode?: 'build' | 'discuss';
  onSelectOption?: (option: ActionOption) => void;
  onOpenFile?: (path: string) => void;
}) {
  const isUser = message.role === 'user';
  const {
    surface,
    accentColor = '#8b5cf6',
    designStyle = 'glass',
    textColor = '#ffffff'
  } = themeStyles || {};

  const isActivity = !isUser && message.kind === 'activity';
  const isSummary = !isUser && message.kind === 'summary';
  const isBuildArtifacts = !isUser && message.kind === 'build_artifacts';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-4 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            : `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
          borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
          border: designStyle === 'brutal' ? '2px solid #000' : 'none',
          boxShadow: designStyle === 'brutal'
            ? '2px 2px 0 #000'
            : `0 4px 12px ${isUser ? '#3b82f640' : accentColor + '40'}`,
        }}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'flex-1 max-w-[80%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        {/* Role Label */}
        <p className="text-xs mb-1.5" style={{ color: textColor, opacity: 0.4 }}>
          {isUser ? 'Du' : 'LifeOS Builder'}
        </p>

        {isBuildArtifacts ? (
          <HistoricalBuildArtifactsCard
            artifacts={message.artifacts || []}
            onOpenFile={onOpenFile}
            themeStyles={themeStyles ? {
              accentColor: themeStyles.accentColor || '#8b5cf6',
              designStyle: themeStyles.designStyle || 'glass',
              textColor: themeStyles.textColor || '#ffffff',
            } : undefined}
          />
        ) : isActivity ? (
          <ActivityCard message={message} themeStyles={themeStyles} />
        ) : isSummary ? (
          <SummaryCard message={message} themeStyles={themeStyles} chatMode={chatMode} />
        ) : (
          <div
            className="inline-block px-4 py-3"
            style={{
              background: isUser
                ? 'rgba(59, 130, 246, 0.2)'
                : surface?.base?.background || 'rgba(255,255,255,0.05)',
              color: textColor,
              opacity: isUser ? 1 : 0.9,
              borderRadius: designStyle === 'brutal' ? '1rem' : '1.25rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
            }}
          >
            <MessageContent
              content={message.content}
              isStreaming={isLast && isStreaming && !isUser}
              themeStyles={themeStyles}
              chatMode={chatMode}
            />
          </div>
        )}

        {/* Actionable Options (nur für normale Assistant-Nachrichten im Discuss-Mode) */}
        {!isUser && !isActivity && !isSummary && !isBuildArtifacts && message.options && message.options.length > 0 && (
          <OptionCards
            options={message.options}
            onSelect={(option) => onSelectOption?.(option)}
            disabled={isStreaming}
            themeStyles={themeStyles}
          />
        )}
      </div>
    </motion.div>
  );
});

// --------------------------------------------
// Message Content Parser
// Entfernt Artifacts aus dem Text und zeigt nur ein Badge
// --------------------------------------------

const MessageContent = memo(function MessageContent({
  content,
  isStreaming,
  themeStyles,
  chatMode = 'build',
}: {
  content: string;
  isStreaming: boolean;
  themeStyles?: ThemeStyles;
  chatMode?: 'build' | 'discuss';
}) {
  const { accentColor = '#8b5cf6', designStyle = 'glass', textColor = '#ffffff' } = themeStyles || {};

  // --------------------------------------------
  // ROBUSTES PARSING: Entferne ALLEN Code aus dem Chat!
  // --------------------------------------------

  // 1. Sammle Artifact-Infos für Badges (bevor wir entfernen)
  const artifacts: { title: string; fileCount: number }[] = [];
  const artifactRegex = /<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/g;
  let match;
  while ((match = artifactRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const titleMatch = fullMatch.match(/title="([^"]*)"/);
    const title = titleMatch ? titleMatch[1] : 'Modul';
    const fileActions = (fullMatch.match(/<boltAction[^>]*type="file"/g) || []).length;
    artifacts.push({ title, fileCount: fileActions });
  }

  // 2. Entferne ALLES was nach Code aussieht - aggressiver Ansatz!
  let cleanContent = content
    .replace(/<boltArtifact[\s\S]*?<\/boltArtifact>/g, '')
    .replace(/<boltArtifact[^>]*>[\s\S]*/g, '')
    .replace(/<boltAction[\s\S]*?<\/boltAction>/g, '')
    .replace(/<boltAction[^>]*>[\s\S]*/g, '')
    .replace(/<options>[\s\S]*?<\/options>/g, '')
    .replace(/<options>[\s\S]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 3. Falls nach dem Cleanen immer noch Code-artige Inhalte da sind, zeige Placeholder
  const looksLikeCode = cleanContent.includes('import ') && cleanContent.includes('from \'')
    || cleanContent.includes('export ')
    || cleanContent.includes('const ') && cleanContent.includes(' = {')
    || cleanContent.includes('<boltA');

  if (looksLikeCode && cleanContent.length > 500) {
    const firstParagraph = cleanContent.split('\n\n')[0];
    if (firstParagraph && !firstParagraph.includes('import ')) {
      cleanContent = firstParagraph;
    } else {
      cleanContent = '';
    }
  }

  return (
    <div className="space-y-2">
      {cleanContent && (
        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
          {cleanContent}
          {isStreaming && (
            <span
              className="inline-block w-2 h-4 ml-0.5 animate-pulse"
              style={{ background: accentColor }}
            />
          )}
        </div>
      )}

      {artifacts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {artifacts.map((artifact, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: `${accentColor}15`,
                border: designStyle === 'brutal'
                  ? '2px solid #000'
                  : `1px solid ${accentColor}30`,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
              <div>
                <span className="text-sm font-medium" style={{ color: textColor }}>
                  {artifact.title}
                </span>
                {artifact.fileCount > 0 && (
                  <span
                    className="text-xs ml-2 px-1.5 py-0.5 rounded"
                    style={{
                      background: `${accentColor}30`,
                      color: accentColor,
                    }}
                  >
                    {artifact.fileCount} Dateien
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!cleanContent && isStreaming && (
        <div className="flex items-center gap-2" style={{ color: `${textColor}60` }}>
          <span className="text-sm">{chatMode === 'discuss' ? 'Denke nach...' : 'Generiere Code...'}</span>
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
});

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export const Messages = memo(function Messages({
  messages,
  isStreaming = false,
  themeStyles,
  chatMode = 'build',
  onSelectOption,
  onOpenFile,
}: MessagesProps) {
  // Prüfe ob gerade Dateien gestreamt werden
  const streamingFiles = useWorkbenchStore(state => state.streamingFiles);
  const hasStreamingFiles = streamingFiles.size > 0;

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4 pb-4">
      {messages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
          isStreaming={isStreaming}
          themeStyles={themeStyles}
          chatMode={chatMode}
          onSelectOption={onSelectOption}
          onOpenFile={onOpenFile}
        />
      ))}

      {/* Live-Streaming-Fenster waehrend der aktuellen Generierung */}
      {hasStreamingFiles && (
        <div className="pl-14">
          <StreamingCodeBlockList
            onOpenFile={onOpenFile}
            themeStyles={themeStyles ? {
              accentColor: themeStyles.accentColor || '#8b5cf6',
              designStyle: themeStyles.designStyle || 'glass',
              textColor: themeStyles.textColor || '#ffffff',
            } : undefined}
          />
        </div>
      )}
    </div>
  );
});
