// ============================================
// types.ts - Gemeinsame Typen fuer Lab Debugging
// ============================================

export type PreviewErrorKind =
  | 'runtime'
  | 'import'
  | 'entry_contract'
  | 'unknown';

export interface StructuredPreviewError {
  kind: PreviewErrorKind;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  componentStack?: string;
  availableExports?: string[];
  timestamp: number;
}

export interface RunLabDebugCommandInput {
  command: string;
  args?: string[];
  cwd?: string;
  confirmMutating?: boolean;
}

export interface LabDebugCommandResult {
  success: boolean;
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  isMutating: boolean;
  requiresApproval: boolean;
  durationMs: number;
  error?: string;
}
