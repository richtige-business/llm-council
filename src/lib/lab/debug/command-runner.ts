// ============================================
// command-runner.ts - Sicherer Debug Command Runner fuer Lab
// ============================================

import { spawn } from 'child_process';
import path from 'path';
import { createLogger } from '@/lib/logger';
import type { LabDebugCommandResult, RunLabDebugCommandInput } from './types';

const log = createLogger('LabDebugRunner');

const MAX_OUTPUT_CHARS = 24000;
const DEFAULT_TIMEOUT_MS = 20_000;
const NPM_TIMEOUT_MS = 180_000;
const WORKSPACE_ROOT = process.cwd();

type AllowedCommandConfig = {
  command: string;
  argsPrefix: string[];
  mutating: boolean;
};

// Read-only Defaults
const ALLOWED_COMMANDS: AllowedCommandConfig[] = [
  { command: 'ls', argsPrefix: [], mutating: false },
  { command: 'cat', argsPrefix: [], mutating: false },
  { command: 'rg', argsPrefix: [], mutating: false },
  { command: 'npm', argsPrefix: ['run', 'build'], mutating: false },
  { command: 'npm', argsPrefix: ['run', 'lint'], mutating: false },
  { command: 'npm', argsPrefix: ['test'], mutating: false },
  // Mutating by default -> requires explicit opt-in flag
  { command: 'npm', argsPrefix: ['install'], mutating: true },
];

function normalizeArgs(rawArgs: unknown): string[] {
  if (!Array.isArray(rawArgs)) return [];
  return rawArgs
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function truncateOutput(value: string): string {
  if (value.length <= MAX_OUTPUT_CHARS) return value;
  const tail = value.slice(-MAX_OUTPUT_CHARS);
  return `...[gekürzt]\n${tail}`;
}

function resolveCwd(rawCwd?: string): { cwd: string; error?: string } {
  if (!rawCwd || rawCwd.trim().length === 0) {
    return { cwd: WORKSPACE_ROOT };
  }

  const normalized = rawCwd.trim();
  const absolute = path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(WORKSPACE_ROOT, normalized);

  if (!absolute.startsWith(WORKSPACE_ROOT)) {
    return {
      cwd: WORKSPACE_ROOT,
      error: 'cwd liegt außerhalb des Workspace und ist nicht erlaubt.',
    };
  }

  return { cwd: absolute };
}

function resolveAllowedConfig(command: string, args: string[]): AllowedCommandConfig | null {
  for (const config of ALLOWED_COMMANDS) {
    if (config.command !== command) continue;
    const prefix = config.argsPrefix;
    if (prefix.length === 0) return config;

    const matches = prefix.every((expected, index) => args[index] === expected);
    if (matches) return config;
  }
  return null;
}

export async function runLabDebugCommand(
  input: RunLabDebugCommandInput,
): Promise<LabDebugCommandResult> {
  const command = String(input.command || '').trim();
  const args = normalizeArgs(input.args);
  const startedAt = Date.now();

  const cwdResolution = resolveCwd(input.cwd);
  if (cwdResolution.error) {
    return {
      success: false,
      command,
      args,
      cwd: cwdResolution.cwd,
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      isMutating: false,
      requiresApproval: false,
      durationMs: Date.now() - startedAt,
      error: cwdResolution.error,
    };
  }

  if (!command) {
    return {
      success: false,
      command,
      args,
      cwd: cwdResolution.cwd,
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      isMutating: false,
      requiresApproval: false,
      durationMs: Date.now() - startedAt,
      error: 'Kein Befehl angegeben.',
    };
  }

  const allowed = resolveAllowedConfig(command, args);
  if (!allowed) {
    return {
      success: false,
      command,
      args,
      cwd: cwdResolution.cwd,
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      isMutating: false,
      requiresApproval: false,
      durationMs: Date.now() - startedAt,
      error: `Befehl nicht erlaubt. Zulässig: ls, cat, rg, npm run build, npm run lint, npm test${', npm install (mit confirmMutating=true)'}.`,
    };
  }

  if (allowed.mutating && !input.confirmMutating) {
    return {
      success: false,
      command,
      args,
      cwd: cwdResolution.cwd,
      exitCode: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      isMutating: true,
      requiresApproval: true,
      durationMs: Date.now() - startedAt,
      error: 'Mutierender Befehl blockiert. Setze confirmMutating=true für explizite Freigabe.',
    };
  }

  const timeoutMs = command === 'npm' ? NPM_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  return await new Promise<LabDebugCommandResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: cwdResolution.cwd,
      shell: false,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    let timedOut = false;

    const finalize = (exitCode: number | null, error?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);

      const result: LabDebugCommandResult = {
        success: exitCode === 0 && !error,
        command,
        args,
        cwd: cwdResolution.cwd,
        exitCode,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        timedOut,
        isMutating: allowed.mutating,
        requiresApproval: false,
        durationMs: Date.now() - startedAt,
        error,
      };

      if (!result.success) {
        log.warn('Debug command fehlgeschlagen', {
          command,
          args,
          exitCode,
          timedOut,
          error,
        });
      }

      resolve(result);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      finalize(null, `Timeout nach ${timeoutMs}ms`);
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      finalize(null, error.message);
    });

    child.on('close', (code) => {
      finalize(code);
    });
  });
}
