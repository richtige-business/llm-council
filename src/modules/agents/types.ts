// ============================================
// types.ts - TypeScript Interfaces für Agents-Modul
// 
// Zweck: Definiert alle Typen für das Agents-System
//        (Conversations, Messages, Folders, Agents, Context, etc.)
// Verwendet von: store.ts, AgentsPage.tsx, Sidebars, ChatBar
// ============================================

import type { AgentToolCall } from '@/lib/agent/types';
import type { LLMProvider } from '@/lib/llm/types';

// --------------------------------------------
// Attachment Typen
// Bilder, Dateien und andere Anhänge
// --------------------------------------------

export interface AttachedImage {
  id: string;                     // Eindeutige ID
  name: string;                   // Dateiname
  type: string;                   // MIME-Type (z.B. "image/png")
  size: number;                   // Dateigröße in Bytes
  base64: string;                 // Base64-kodierter Inhalt
  previewUrl?: string;            // Lokale Preview-URL (blob:)
}

export interface AttachedFile {
  id: string;                     // Eindeutige ID
  name: string;                   // Dateiname (z.B. "report.pdf")
  type: string;                   // MIME-Type
  size: number;                   // Dateigröße in Bytes
  content?: string;               // Extrahierter Text-Inhalt
  url?: string;                   // Upload-URL oder Data-URL
}

// --------------------------------------------
// Chat Message Interface
// Eine einzelne Chat-Nachricht (erweitert um Attachments)
// --------------------------------------------

// ReplyTo: Referenz auf eine zitierte Nachricht (wie bei WhatsApp)
export interface ReplyToData {
  messageId: string;              // ID der zitierten Nachricht
  content: string;                // Vorschau-Text (gekürzt)
  senderName: string;             // Absender der zitierten Nachricht
  senderColor?: string;           // Farbe des Absenders (für visuelle Zuordnung)
}

// --------------------------------------------
// Agent Workspace: Live-Modul-Fenster im Chat
// Wird angezeigt wenn der Agent Mode aktiv ist
// und der Agent eine Aktion in einem Modul ausführt
// --------------------------------------------
export interface AgentWorkspaceData {
  moduleId: string;               // Welches Modul wird angezeigt? (z.B. 'calendar', 'browser')
  isActive: boolean;              // Läuft der Agent gerade? (true = animiert, false = minimiert)
}

// --------------------------------------------
// Action Button: Klickbarer Button in einer Nachricht
// Wird z.B. für Agent-Mode-Vorschläge verwendet
// --------------------------------------------
export interface ActionButtonData {
  type: string;                   // Button-Typ (z.B. 'activate-agent-mode')
  label: string;                  // Button-Beschriftung
  payload?: Record<string, unknown>; // Zusätzliche Daten (z.B. originalMessage)
}

export interface ChatMessageData {
  id: string;                     // Eindeutige ID der Nachricht
  role: 'user' | 'assistant' | 'system';  // Wer hat die Nachricht geschrieben?
  content: string;                // Inhalt der Nachricht
  timestamp: number;              // Zeitstempel der Nachricht
  toolCalls?: AgentToolCall[];
  images?: AttachedImage[];       // Angehängte Bilder (für Vision)
  files?: AttachedFile[];         // Angehängte Dateien
  model?: string;                 // Welches Modell hat geantwortet?
  tokenCount?: number;            // Token-Anzahl dieser Nachricht
  isSummary?: boolean;            // Ist dies eine Zusammenfassung?
  agentId?: string;               // Welcher Agent hat geantwortet? (für Gruppenchats)
  agentName?: string;             // Anzeigename des Agents
  agentColor?: string;            // Farbe des Agents (für Avatar)
  replyTo?: ReplyToData;          // Referenz auf zitierte Nachricht (Reply-Funktion)
  agentWorkspace?: AgentWorkspaceData; // Live-Modul-Fenster im Chat (Agent Mode)
  actionButton?: ActionButtonData;     // Klickbarer Button (z.B. Agent-Mode-Vorschlag)
  privateMessageKind?: 'message' | 'clarification' | 'status'; // Spezifischer Privatchat-Typ
  reasoning?: string;                  // Optionaler Denk-/Planungstext des Agents
  reasoningDuration?: number;          // Dauer des Denkprozesses in Sekunden
  isStreaming?: boolean;               // Ob die Nachricht gerade noch aufgebaut wird
}

// --------------------------------------------
// Chat Conversation Interface
// Eine komplette Chat-Konversation (erweitert)
// --------------------------------------------

export interface ChatConversation {
  id: string;                     // Eindeutige ID der Konversation
  title: string;                  // Titel der Konversation
  messages: ChatMessageData[];    // Alle Nachrichten in dieser Konversation
  folderId: string | null;        // ID des Ordners (null = kein Ordner)
  agentId: string;                // Welcher Agent wird verwendet? (z.B. 'master', 'calendar')
  model?: string;                 // Override: Modell für diese Konversation
  createdAt: number;              // Zeitstempel der Erstellung
  updatedAt: number;              // Zeitstempel der letzten Aktualisierung
  isPinned?: boolean;             // Oben angeheftet?
  tags?: string[];                // Tags für Filterung
  summary?: string;               // Auto-generierte Zusammenfassung
  totalTokens?: number;           // Gesamte Token-Anzahl
  isGroupChat?: boolean;          // Ist dies ein Gruppenchat zwischen Agents?
  participantRoles?: GroupChatParticipantRole[]; // Rollen der beteiligten Agents
  groupParticipantChatId?: string; // Einzelchat mit einem bestimmten Teilnehmer innerhalb einer Gruppe
  breakoutSessionId?: string;     // Zugehörige Breakout-Session
  unreadCount?: number;           // Ungelesene private Nachrichten im Teilnehmer-Chat
  requiresPrivateReply?: boolean; // Wartet dieser Teilnehmer auf eine User-Antwort?
  lastPrivateMessageAt?: number;  // Letzter privater Eingang für Sortierung/Badges
  lastPrivateMessageKind?: 'message' | 'clarification' | 'status';
}

// --------------------------------------------
// Chat Folder Interface
// Ein Ordner für Chat-Konversationen
// --------------------------------------------

export interface ChatFolderData {
  id: string;                     // Eindeutige ID des Ordners
  name: string;                   // Name des Ordners
  color?: string;                 // Farbe des Ordners
  agentId: string;                // Zu welchem Agent gehört dieser Ordner?
  conversationIds: string[];      // IDs der Konversationen in diesem Ordner
  createdAt: number;              // Zeitstempel der Erstellung
}

// --------------------------------------------
// Gruppenchat-Rollen und Autoritaetshierarchie
// Definiert welcher Agent welche Rolle und Befugnisse hat
// --------------------------------------------

// Hierarchische Autoritaetsstufen innerhalb einer Gruppe
export type ParticipantAuthority =
  | 'owner'      // CEO: volle Kontrolle, kann alles
  | 'admin'      // CMO/CFO: Admin in ihrem Bereich
  | 'member'     // Normaler Teilnehmer
  | 'observer';  // Nur zuhören, kein aktives Handeln

// Bereichs-Definition fuer Sub-Admins (z.B. CMO => Marketing)
export interface AuthorityScope {
  domain: string;                  // z.B. "marketing", "finanzen", "technik"
  description?: string;            // Freitext-Beschreibung des Bereichs
  canDelegateInScope: boolean;     // Darf innerhalb des Bereichs Tasks verteilen
  canCreateBreakouts: boolean;     // Darf Breakout-Sessions erstellen
  canManageArtifacts: boolean;     // Darf Ordner/Dokumente verwalten
  subordinateAgentIds?: string[];  // Agents die diesem Sub-Admin unterstehen
}

export interface GroupChatParticipantRole {
  agentId: string;                // Agent-ID
  role: string;                   // Rolle im Gruppenchat (z.B. "Moderator")
  authority?: ParticipantAuthority; // Autoritaetsstufe (Default: 'member')
  scope?: AuthorityScope;         // Bereichs-Definition (nur fuer owner/admin)
  capabilities?: string[];        // Was kann dieser Agent? (z.B. ['web-research', 'code'])
}

// --------------------------------------------
// Gruppen-Dateiablage
// Ordner + Dateien pro Gruppe/Untergruppe
// --------------------------------------------

export interface GroupFileFolderData {
  id: string;                     // Eindeutige Ordner-ID
  groupId: string;                // Zugehörige Gruppen-ID
  parentFolderId?: string | null; // Optionale Parent-ID fuer echte Baumstruktur
  name: string;                   // Ordnername
  color?: string;                 // Optionale Ordnerfarbe
  relativePath?: string;          // Relativer Pfad fuer Import/Export
  createdAt: number;              // Zeitstempel
}

export interface GroupFileData extends AttachedFile {
  groupId: string;                // Zugehörige Gruppen-ID
  folderId: string | null;        // Optionaler Zielordner
  relativePath?: string;          // Relativer Pfad innerhalb der Gruppe
  createdAt: number;              // Zeitstempel
}

// --------------------------------------------
// Serverseitige Gruppenbibliothek
// Persistente Metadaten + Dateibaum pro Gruppe
// --------------------------------------------

export interface GroupLibraryData {
  id: string;
  groupAgentId: string;
  name: string;
  description: string;
  objective: string;
  linkedDashboardFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupLibraryFolderData {
  id: string;
  groupLibraryId: string;
  parentFolderId: string | null;
  name: string;
  color: string;
  relativePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupLibraryDocumentData {
  id: string;
  groupLibraryId: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  contentText: string | null;
  contentBase64: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------
// Custom Agent Interface
// Vom Benutzer erstellte Agenten
// --------------------------------------------

export interface CustomAgentData {
  id: string;                     // Eindeutige Agent-ID (z.B. custom-uuid)
  name: string;                   // Anzeigename
  description?: string;           // Beschreibung/Spezialisierung
  objective?: string;             // Zielbild / Objective fuer Gruppen
  icon: string;                   // Lucide Icon Name
  color: string;                  // Orb-Farbe
  type?: 'agent' | 'group';       // Agent-Typ: normaler Agent oder Gruppe
  participantRoles?: GroupChatParticipantRole[]; // Rollen bei Gruppen
  /** @deprecated Nutze stattdessen authority: 'owner' in participantRoles */
  adminAgentId?: string;          // Zentraler Gruppen-Orchestrator / Admin
  adminAgentIds?: string[];       // Alle Agents mit owner/admin Authority
  parentAgentId?: string;         // Optional: Parent-Agent für Subagenten
  parentGroupId?: string;         // Optional: Parent-Gruppe bei Breakout-Sessions
  rootGroupId?: string;           // Root-Gruppe für Aggregation
  breakoutSessionId?: string;     // Zugehörige serverseitige Breakout-Session
  createdAt: number;              // Zeitstempel
}

// --------------------------------------------
// Council Interface
// Benutzerdefinierte Council-Metadaten fuer die Sidebar
// --------------------------------------------

export interface CouncilData {
  id: string;                     // Eindeutige Council-ID
  name: string;                   // Anzeigename des Councils
  seatMembers: CouncilSeatMemberData[]; // Besetzte Sitze im Council
  memberMessages?: Record<string, ChatMessageData[]>; // Sitz-Histories des Councils
  mainMessages?: ChatMessageData[]; // Oeffentlicher Council-Hauptverlauf
  runs?: CouncilRunData[];        // Historie der Council-Deliberations
  createdAt: number;              // Zeitstempel der Erstellung
  updatedAt: number;              // Zeitstempel der letzten Aenderung
}

// --------------------------------------------
// Council-Sitzbesetzung
// Speichert alle Daten eines Members pro Sitz
// --------------------------------------------

export interface CouncilSeatMemberData {
  seatId: string;                  // Zugeordneter Sitz im Council
  name: string;                    // Anzeigename des Members
  color: string;                   // Orb-Farbe des Members
  model: string;                   // LLM-Modell fuer diesen Sitz
  role: string;                    // Kurzrolle im Council
  rolePrompt: string;              // Rollenbeschreibung / System-Prompt
  sourceAgentId?: string | null;   // Optionaler Ursprungs-Agent
  skills?: string[];               // Aktivierte Skill-IDs (siehe skills-catalog.ts)
  createdAt: number;               // Zeitstempel
  updatedAt: number;               // Zeitstempel
}

// --------------------------------------------
// Council-Run / Deliberation
// Laufzeitdaten fuer First Opinions, Reviews
// und finale Eldest-Synthese
// --------------------------------------------

export type CouncilRunStage =
  | 'idle'
  | 'first-opinions'
  | 'review'
  | 'final-synthesis'
  | 'completed'
  | 'error';

export interface CouncilRunData {
  id: string;                     // Eindeutige Run-ID
  councilId: string | null;       // Zugehoeriger Council-Draft / gespeicherter Council
  councilName: string;            // Anzeigename zum Zeitpunkt des Runs
  prompt: string;                 // Ausgangsfrage des Users
  stage: CouncilRunStage;         // Aktuelle / letzte Phase
  firstOpinions: Record<string, string>; // seatId -> First Opinion
  reviews: Record<string, string>; // reviewerSeatId -> Review-Output
  finalResponse?: string;         // Finale Eldest-Antwort
  error?: string | null;          // Optionaler Fehlertext
  createdAt: number;              // Startzeit
  updatedAt: number;              // Letzte Aenderung
}

// --------------------------------------------
// Agent Usage Analytics
// Ereignisse und Aggregationen für Token-/Kosten-Analysen
// --------------------------------------------

export interface AgentUsageEvent {
  id: string;                     // Eindeutige Event-ID
  agentId: string;                // Zugehöriger Agent
  sourceType: 'chat' | 'scheduled-task' | 'group-orchestration';
  sourceId?: string;              // Konversation, Task oder Lauf
  modelId?: string;               // Verwendetes Modell
  promptTokens: number;           // Geschätzte oder echte Input-Tokens
  completionTokens: number;       // Geschätzte oder echte Output-Tokens
  totalTokens: number;            // Summe aus Input + Output
  estimatedCost?: number;         // Optionale Kostenschätzung
  durationMs?: number;            // Optionale Laufzeit
  createdAt: number;              // Zeitstempel
}

export interface AgentUsageSummary {
  totalTokens: number;            // Gesamte Token-Nutzung
  promptTokens: number;           // Input-Tokens
  completionTokens: number;       // Output-Tokens
  estimatedCost: number;          // Summierte Kostenschätzung
  conversationsCount: number;     // Anzahl beteiligter Konversationen
  lastActiveAt: number | null;    // Letzte Aktivität
}

// --------------------------------------------
// Scheduled Tasks
// Definiert geplante Agent-Aufgaben und einzelne Läufe
// --------------------------------------------

export type ScheduledTaskType = 'one-time' | 'recurring';
export type ScheduledTaskStatus = 'active' | 'paused' | 'completed' | 'error';
export type ScheduledTaskRunStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';
export type ScheduledTaskTargetType = 'agent' | 'group';
export type ScheduledTaskOutputMode =
  | 'task-log'
  | 'new-conversation'
  | 'existing-conversation'
  | 'notification';
export type ScheduledTaskFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledTaskRecurringConfig {
  frequency: ScheduledTaskFrequency; // Wiederholungseinheit
  interval: number;                  // Alle X Einheiten
  weekdays?: number[];               // 0-6 (Sonntag-Samstag)
  dayOfMonth?: number;               // 1-31 für monatliche Tasks
  time: string;                      // Uhrzeit im Format HH:MM
  startDate?: string;                // Optionales Startdatum (ISO)
  endDate?: string;                  // Optionales Enddatum (ISO)
}

export interface ScheduledAgentTask {
  id: string;                        // Eindeutige Task-ID
  title: string;                     // Anzeigename der Aufgabe
  description?: string;              // Optionaler Kontext
  targetType: ScheduledTaskTargetType; // Einzelagent oder Gruppe
  targetId: string;                  // ID des Agenten bzw. der Gruppe
  prompt: string;                    // Instruktion für die Ausführung
  type: ScheduledTaskType;           // Einmalig oder wiederkehrend
  status: ScheduledTaskStatus;       // Aktiv, pausiert, abgeschlossen, Fehler
  enabled: boolean;                  // Separater Schalter für Aktivierung
  timezone: string;                  // Zeitzone, z.B. Europe/Berlin
  runAt?: string;                    // Einmaliger Zeitpunkt (ISO)
  recurring?: ScheduledTaskRecurringConfig; // Wiederkehrende Konfiguration
  outputMode: ScheduledTaskOutputMode; // Wie Ergebnisse abgelegt werden
  targetConversationId?: string | null; // Optionales Ziel für bestehende Chats
  retryCount: number;                // Anzahl Wiederholungen bei Fehlern
  timeoutSeconds: number;            // Laufzeit-Limit
  lastRunAt?: number | null;         // Zeitstempel des letzten Laufs
  nextRunAt?: number | null;         // Nächster geplanter Lauf
  createdAt: number;                 // Zeitstempel der Erstellung
  updatedAt: number;                 // Zeitstempel der letzten Änderung
}

export interface ScheduledAgentTaskRun {
  id: string;                        // Eindeutige Lauf-ID
  taskId: string;                    // Zugehörige Task
  status: ScheduledTaskRunStatus;    // Status des Laufs
  startedAt: number;                 // Startzeit
  finishedAt?: number;               // Endzeit
  resultSummary?: string;            // Kurzbeschreibung des Ergebnisses
  errorMessage?: string;             // Fehlermeldung
  conversationId?: string;           // Verknüpfte Konversation
  estimatedTokens?: number;          // Grobe Token-Metrik für MVP
}

// --------------------------------------------
// Agent Node Interface
// Ein einzelner Agent in der Hierarchie
// --------------------------------------------

export interface AgentNode {
  id: string;                     // Agent-ID (z.B. 'master', 'calendar', 'custom-1')
  name: string;                   // Anzeigename (z.B. "Master Agent")
  icon: string;                   // Lucide Icon Name
  color: string;                  // Farbe des Agent-Orbs
  status: 'active' | 'idle' | 'disabled';  // Status des Agents
  description?: string;           // Kurzbeschreibung
  isBuiltIn: boolean;             // Ist es ein eingebauter Agent?
  children?: AgentNode[];         // Sub-Agents (für Hierarchie)
  capabilities?: string[];        // Was kann der Agent? (z.B. ['web-research', 'code'])
}

// --------------------------------------------
// Context Window Konfiguration
// Token-Limits für verschiedene Modelle
// --------------------------------------------

export interface ContextWindowConfig {
  modelId: string;                // Modell-ID
  maxTokens: number;              // Maximale Tokens
  recommendedMax: number;         // Empfohlenes Maximum (mit Buffer)
  summarizeThreshold: number;     // Ab wann zusammenfassen (z.B. 0.8 = 80%)
}

// --------------------------------------------
// Orchestrierungs-Modus
// Definiert strukturierte Gespraechsmodi fuer Gruppenchats
// --------------------------------------------

export type OrchestrationMode =
  | 'free-discussion'    // Offener Chat ohne feste Struktur
  | 'brainstorming'      // Ideen-Generierung (Generate → Filter → Organize → Evaluate)
  | 'debate'             // Pro/Contra-Debatte mit Moderator
  | 'task-delegation'    // Aufgaben verteilen und abarbeiten
  | 'review'             // Artefakt/Ergebnis gemeinsam bewerten
  | 'synthesis'          // Ergebnisse zusammenfuehren
  | 'planning';          // Ziele und Meilensteine planen

// --------------------------------------------
// Gruppen-Ziele (GroupObjective)
// Kurz- und langfristige Ziele fuer Gruppenarbeit
// --------------------------------------------

export interface GroupObjective {
  id: string;
  groupId: string;                 // Zugehoerige Gruppen-ID
  title: string;                   // Kurztitel des Ziels
  description: string;             // Ausfuehrliche Beschreibung
  type: 'short-term' | 'long-term';
  status: 'planned' | 'active' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  subObjectives?: GroupObjective[]; // Verschachtelte Teil-Ziele
  assignedAgentIds?: string[];     // Agents die am Ziel arbeiten
  artifactIds?: string[];          // Referenzen auf GroupLibraryDocumentData
  parentObjectiveId?: string;      // Eltern-Ziel fuer Hierarchie
  deadline?: string;               // ISO-Datum
  progress?: number;               // 0-100 Prozent
  createdAt: number;
  updatedAt: number;
}

// --------------------------------------------
// Orchestrator-Session und Tasks
// Laufzeit-Zustand einer Gruppenchat-Orchestrierung
// --------------------------------------------

export interface GroupOrchestrationSession {
  id: string;
  groupId: string;
  conversationId: string;
  activeMode: OrchestrationMode;
  activeBreakouts: string[];       // IDs aktiver Breakout-Sessions
  pendingTasks: OrchestratorTask[];
  completedTasks: OrchestratorTask[];
  turnHistory: TurnRecord[];
  startedAt: number;
  lastActivityAt: number;
}

export interface OrchestratorTask {
  id: string;
  description: string;
  assignedTo: string[];            // Agent-IDs die den Task bearbeiten
  delegatedBy: string;             // Admin/Sub-Admin der delegiert hat
  status: 'pending' | 'active' | 'completed' | 'failed';
  result?: string;                 // Ergebnis-Text nach Abschluss
  breakoutSessionId?: string;      // Falls in Breakout bearbeitet
  artifactIds?: string[];          // Erzeugte Artefakte
  createdAt: number;
}

export interface TurnRecord {
  agentId: string;
  action: 'spoke' | 'passed' | 'delegated' | 'created-breakout' | 'saved-artifact';
  channel: 'group' | 'private' | 'breakout';
  timestamp: number;
  brief?: string;                  // Kurzzusammenfassung fuer Orchestrator-Kontext
}

// --------------------------------------------
// Channel-Routing
// Bestimmt wo eine Nachricht landet (Gruppe, Privat, Breakout)
// --------------------------------------------

export type MessageChannel =
  | { type: 'group' }
  | { type: 'private'; targetUserId: string }
  | { type: 'breakout'; breakoutId: string };

// Geparste Agent-Antwort mit Channel-Split
export interface ParsedAgentResponse {
  groupContent: string | null;     // Was in den Gruppenchat kommt
  privateContent: string | null;   // Was in den Privatchat kommt
  isPass: boolean;                 // Agent hat mit [PASS] geantwortet
}

// --------------------------------------------
// Group-Orchestrate API
// Request- und SSE-Event-Kontrakte für die
// serverseitige Gruppen-Orchestrierung.
// --------------------------------------------

export interface GroupOrchestrateRequest {
  groupId: string;
  conversationId: string;
  userMessage: string;
  forceMode?: OrchestrationMode;
  mentionedAgentIds?: string[];
  images?: AttachedImage[];
  files?: AttachedFile[];
  // Phase 3 nutzt zusätzliche Snapshots aus dem Client,
  // bis die Route den Zustand serverseitig selbst laden kann.
  conversationHistory?: ChatMessageData[];
  participants?: GroupChatParticipantRole[];
  objectives?: GroupObjective[];
  groupContext?: unknown;
  maxTurns?: number;
}

export interface OrchestratedAgentMultimodalModeInput {
  enabled?: boolean;
  provider?: 'openai' | 'browser';
  model?: string;
}

export interface OrchestratedAgentSettings {
  llmProvider?: LLMProvider;
  llmModel?: string;
  systemPrompt?: string;
  enabledTools?: string[];
  visualTools?: string[];
  enabledSkills?: string[];
  allowedIntegrations?: string[];
  temperature?: number;
  maxTokens?: number;
  visualModeEnabled?: boolean;
  humanInTheLoopTools?: string[];
  multimodal?: {
    image?: OrchestratedAgentMultimodalModeInput;
    video?: OrchestratedAgentMultimodalModeInput;
    tts?: OrchestratedAgentMultimodalModeInput;
    stt?: OrchestratedAgentMultimodalModeInput;
  };
}

export interface OrchestratedAgentDraft {
  agentId?: string;
  name: string;
  role: string;
  description: string;
  icon?: string;
  color?: string;
  parentAgentId?: string;
  targetGroupId?: string;
  addToGroup: boolean;
  authority?: ParticipantAuthority;
  scope?: AuthorityScope;
  capabilities?: string[];
  settings?: OrchestratedAgentSettings;
  temporary?: boolean;
}

export interface BreakoutSessionData {
  breakoutId: string;
  parentGroupId: string;
  breakoutGroupId: string;
  breakoutConversationId: string | null;
  name: string;
  task: string;
  participants: GroupChatParticipantRole[];
  mode?: OrchestrationMode;
  reportBackTo: string;
  autoSaveArtifacts?: boolean;
  targetFolderId?: string | null;
  status: 'running' | 'completed' | 'failed';
  summary?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type GroupOrchestrateEvent =
  | { type: 'mode_selected'; mode: OrchestrationMode; reasoning: string }
  | { type: 'session_end'; summary: string }
  | { type: 'error'; message: string; breakoutId?: string }
  | { type: 'agent_speaking'; agentId: string; agentName: string; breakoutId?: string }
  | { type: 'agent_token'; agentId: string; agentName?: string; token: string; breakoutId?: string }
  | { type: 'agent_done'; agentId: string; agentName?: string; fullContent: string; breakoutId?: string }
  | { type: 'agent_passed'; agentId: string; agentName?: string; breakoutId?: string }
  | { type: 'private_message'; agentId: string; agentName: string; content: string; conversationId: string }
  | { type: 'private_clarification_needed'; agentId: string; agentName: string; question: string; conversationId: string }
  | { type: 'task_delegated'; task: OrchestratorTask }
  | { type: 'task_completed'; taskId: string; result: string }
  | { type: 'sub_admin_active'; adminId: string; scope: string }
  | {
      type: 'breakout_created';
      breakoutId: string;
      breakoutGroupId: string;
      breakoutConversationId: string;
      parentGroupId: string;
      name: string;
      task: string;
      participants: GroupChatParticipantRole[];
      mode?: OrchestrationMode;
      reportBackTo: string;
      autoSaveArtifacts?: boolean;
      targetFolderId?: string | null;
    }
  | {
      type: 'breakout_result';
      breakoutId: string;
      breakoutGroupId: string;
      breakoutConversationId: string;
      parentGroupId: string;
      summary: string;
      reportedByAgentId: string;
      reportedByName: string;
    }
  | { type: 'artifact_saved'; name: string; folderId: string | null }
  | { type: 'folder_created'; folderId: string; name: string }
  | { type: 'objective_updated'; objectiveId: string; updates: Partial<GroupObjective> }
  | { type: 'objective_created'; objective: Partial<GroupObjective> | GroupObjective }
  | ({ type: 'agent_created' } & Required<Pick<OrchestratedAgentDraft, 'name' | 'role' | 'description' | 'addToGroup'>> & {
      agentId: string;
      temporary: boolean;
      icon?: string;
      color?: string;
      parentAgentId?: string;
      targetGroupId?: string;
      authority?: ParticipantAuthority;
      scope?: AuthorityScope;
      capabilities?: string[];
      settings?: OrchestratedAgentSettings;
      breakoutId?: string;
    })
  | { type: 'mode_changed'; oldMode: OrchestrationMode; newMode: OrchestrationMode; reasoning: string }
  | { type: 'intervention_received'; userMessage: string }
  | { type: 'orchestration_paused'; reason: string }
  | { type: 'orchestration_resumed' }
  | { type: 'orchestration_aborted'; reason: string }
  | { type: 'synthesis'; content: string; breakoutId?: string }
  | { type: 'orchestrator_message'; content: string; breakoutId?: string };

// --------------------------------------------
// Session-Zusammenfassung (Long-Term Memory)
// Wird am Ende jeder Orchestrierungs-Session erstellt
// und beim Start der naechsten als Kontext geladen
// --------------------------------------------

export interface GroupSessionSummary {
  id: string;
  groupId: string;
  sessionDate: string;             // ISO-Datum
  mode: OrchestrationMode;         // Welcher Modus wurde verwendet?
  topic: string;                   // Worum ging es?
  keyDecisions: string[];          // Wichtigste Entscheidungen
  openQuestions: string[];         // Was ist noch offen?
  objectiveProgress: {             // Welche Ziele wurden beeinflusst?
    objectiveId: string;
    progressBefore: number;
    progressAfter: number;
    notes: string;
  }[];
  artifactsCreated: string[];      // IDs der erstellten Dokumente
  participantContributions: {      // Wer hat was beigetragen?
    agentId: string;
    summary: string;
  }[];
  createdAt: number;
}

// --------------------------------------------
// Agents State Interface
// Der komplette Zustand des Agents-Moduls
// --------------------------------------------

export interface AgentsState {
  conversations: ChatConversation[];    // Alle Chat-Konversationen
  folders: ChatFolderData[];            // Alle Ordner
  groupFileFolders: GroupFileFolderData[]; // Datei-Ordner für Gruppen
  groupFiles: GroupFileData[];          // Einzelne Dateien in Gruppen
  customAgents: CustomAgentData[];      // Benutzerdefinierte Agenten
  breakoutSessions: BreakoutSessionData[]; // Laufende/abgeschlossene Breakouts
  groupObjectives: GroupObjective[];    // Gruppen-Ziele (kurz-/langfristig)
  groupSessionSummaries: GroupSessionSummary[]; // Vergangene Session-Zusammenfassungen
  councils: CouncilData[];              // Persistierte Councils fuer die Sidebar
  activeCouncilDraftId: string | null;  // Aktuell bearbeiteter Council-Entwurf
  activeCouncilDraftName: string;       // Name des Council-Entwurfs
  activeCouncilDraftSeatMembers: CouncilSeatMemberData[]; // Aktuelle Sitzbesetzung des Drafts
  activeCouncilDraftMemberMessages: Record<string, ChatMessageData[]>; // seatId -> Nachrichten pro Member
  activeCouncilDraftMainMessages: ChatMessageData[]; // Oeffentliche User/Eldest-Nachrichten
  activeCouncilDraftRuns: CouncilRunData[]; // Bisherige Runs im aktuellen Council
  activeCouncilStage: CouncilRunStage;  // Live-Phase des laufenden Council-Runs
  activeCouncilStageLabel: string;      // UI-Label fuer den aktuellen Stage-Status
  activeCouncilIsRunning: boolean;      // Ob gerade eine Council-Deliberation laeuft
  activeConversationId: string | null;  // ID der aktiven Konversation
  selectedAgentId: string | null;       // Aktuell ausgewählter Agent oder null
  isLoading: boolean;                   // Lädt der Assistent gerade eine Antwort?
  agentSidebarCollapsed: boolean;       // Ist die Agent-Sidebar eingeklappt?
  historySidebarCollapsed: boolean;     // Ist die History-Sidebar eingeklappt?
  webResearchEnabled: boolean;          // Web Research aktiv?
  deepResearchEnabled: boolean;         // Deep Research aktiv?
  agentModeEnabled: boolean;            // Agent-Mode aktiv? (UI-only)
  pendingCouncilPromptDraft: string | null; // Vom Eldest-Onboarding vorausgefuellter Chatbar-Entwurf
}

// --------------------------------------------
// Agents Actions Interface
// Alle Aktionen die im Agents-Modul ausgeführt werden können
// --------------------------------------------

export interface AgentsActions {
  // Conversation Management
  createConversation: (agentId?: string) => string;
  deleteConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  updateConversationParticipants: (
    conversationId: string,
    participants: GroupChatParticipantRole[]
  ) => void;
  togglePinConversation: (conversationId: string) => void;
  
  // Message Management
  addMessage: (conversationId: string, message: Omit<ChatMessageData, 'id' | 'timestamp'>) => string;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessageData>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  clearConversationMessages: (conversationId: string) => void;
  
  // Folder Management
  createFolder: (name: string, color?: string) => string;
  deleteFolder: (folderId: string) => void;
  updateFolder: (folderId: string, updates: Partial<ChatFolderData>) => void;
  moveConversationToFolder: (conversationId: string, folderId: string | null) => void;
  createGroupFileFolder: (groupId: string, name: string, color?: string) => string;
  addGroupFile: (groupId: string, file: AttachedFile, folderId?: string | null) => string;
  moveGroupFileToFolder: (fileId: string, folderId: string | null) => void;
  deleteGroupFile: (fileId: string) => void;
  ensureGroupMainConversation: (groupAgentId: string) => string;
  ensureGroupParticipantChats: (groupAgentId: string) => void;
  
  // Agent Selection
  setSelectedAgent: (agentId: string | null) => void;
  updateCustomAgent: (
    agentId: string,
    updates: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      parentAgentId?: string;
    }
  ) => void;
  createCustomAgent: (
    name: string,
    description?: string,
    icon?: string,
    color?: string,
    parentAgentId?: string
  ) => string;
  deleteCustomAgent: (agentId: string) => void;
  createGroupAgent: (
    name: string,
    participants: GroupChatParticipantRole[],
    adminAgentId: string,
    parentAgentId?: string
  ) => string;
  updateGroupAgent: (
    groupAgentId: string,
    updates: {
      name?: string;
      description?: string;
      objective?: string;
      color?: string;
      /** Lucide-Icon-Name (wie in AgentHierarchySidebar ICON_MAP) */
      icon?: string;
      participantRoles?: GroupChatParticipantRole[];
      adminAgentId?: string;
    }
  ) => void;
  createBreakoutSession: (
    parentGroupId: string,
    name: string,
    participants: GroupChatParticipantRole[]
  ) => string;
  upsertBreakoutSession: (
    session: Omit<BreakoutSessionData, 'createdAt' | 'updatedAt'> & {
      createdAt?: number;
      updatedAt?: number;
    }
  ) => string;
  createOrchestratedAgent: (draft: OrchestratedAgentDraft) => string;
  createCouncilDraft: () => string;
  openCouncil: (councilId: string) => void;
  ensureCouncilDraft: () => string;
  setActiveCouncilDraftName: (name: string) => void;
  upsertActiveCouncilSeatMember: (member: Omit<CouncilSeatMemberData, 'createdAt' | 'updatedAt'>) => void;
  removeActiveCouncilSeatMember: (seatId: string) => void;
  trimActiveCouncilExtraSeatMembers: (side: 'left' | 'right', fromIndex: number) => void;
  updateCouncilName: (councilId: string, name: string) => void;
  deleteCouncil: (councilId: string) => void;
  persistActiveCouncilDraft: () => string | null;
  syncActiveCouncilDraft: () => string | null;
  addCouncilMainMessage: (message: Omit<ChatMessageData, 'id' | 'timestamp'>) => string;
  updateCouncilMainMessage: (messageId: string, updates: Partial<ChatMessageData>) => void;
  clearCouncilMainMessages: () => void;
  addCouncilMemberMessage: (seatId: string, message: Omit<ChatMessageData, 'id' | 'timestamp'>) => string;
  updateCouncilMemberMessage: (
    seatId: string,
    messageId: string,
    updates: Partial<ChatMessageData>
  ) => void;
  clearCouncilMemberMessages: (seatId: string) => void;
  runCouncilPrompt: (
    prompt: string,
    images?: AttachedImage[],
    files?: AttachedFile[]
  ) => Promise<string | null>;
  abortAndResetCouncilRun: () => void;
  
  // Group Objectives
  addGroupObjective: (
    groupId: string,
    objective: Omit<GroupObjective, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateGroupObjective: (objectiveId: string, updates: Partial<GroupObjective>) => void;
  deleteGroupObjective: (objectiveId: string) => void;

  // UI State
  setIsLoading: (loading: boolean) => void;
  toggleAgentSidebar: () => void;
  toggleHistorySidebar: () => void;
  setWebResearchEnabled: (enabled: boolean) => void;
  setDeepResearchEnabled: (enabled: boolean) => void;
  setAgentModeEnabled: (enabled: boolean) => void;
  setPendingCouncilPromptDraft: (draft: string | null) => void;
}

// --------------------------------------------
// Kombinierter Store Type
// State + Actions zusammen
// --------------------------------------------

export type AgentsStore = AgentsState & AgentsActions;
