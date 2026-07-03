// ============================================
// lab-debug-tools.ts - Module Builder Debug Tools fuer Agent
// ============================================

import type { ModuleTool, ModuleToolResult } from '../types';
import { runLabDebugCommand } from '@/lib/lab/debug/command-runner';

export const labDebugTools: ModuleTool[] = [
  {
    id: 'lab.runDebugCommand',
    name: 'Debug Command ausfuehren',
    description: `Fuehrt sichere Debug-Commands im Builder-Workspace aus.
Erlaubte Read-Only Befehle: ls, cat, rg, npm run build, npm run lint, npm test.
Mutierende Commands (aktuell nur npm install) nur mit confirmMutating=true.`,
    module: 'lab',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Befehl (ls | cat | rg | npm)',
          enum: ['ls', 'cat', 'rg', 'npm'],
        },
        args: {
          type: 'array',
          description: 'Argumente fuer den Befehl',
          items: { type: 'string' },
        },
        cwd: {
          type: 'string',
          description: 'Optionales Arbeitsverzeichnis innerhalb des Repos',
        },
        confirmMutating: {
          type: 'boolean',
          description: 'Muss true sein fuer mutierende Befehle (z. B. npm install)',
        },
      },
      required: ['command'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => {
      const payload = input as {
        command: string;
        args?: string[];
        cwd?: string;
        confirmMutating?: boolean;
      };

      const result = await runLabDebugCommand({
        command: payload.command,
        args: payload.args,
        cwd: payload.cwd,
        confirmMutating: payload.confirmMutating,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.requiresApproval ? 'PERMISSION_DENIED' : 'EXECUTION_ERROR',
            message: result.error || `Debug Command fehlgeschlagen (exit=${String(result.exitCode)})`,
          },
          data: result,
        };
      }

      return {
        success: true,
        data: result,
      };
    },
    createAction: () => null,
  },
  {
    id: 'builder.debug.runCommand',
    name: 'Builder Debug Command ausfuehren',
    description: `Fuehrt erlaubte Debug-Commands im Builder-Kontext aus.
Unterstuetzt dieselbe Laufzeit wie lab.runDebugCommand, aber unter der builder.* Tool-ID.`,
    module: 'lab',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Befehl (ls | cat | rg | npm)',
          enum: ['ls', 'cat', 'rg', 'npm'],
        },
        args: {
          type: 'array',
          description: 'Argumente fuer den Befehl',
          items: { type: 'string' },
        },
        cwd: {
          type: 'string',
          description: 'Optionales Arbeitsverzeichnis innerhalb des Repos',
        },
        confirmMutating: {
          type: 'boolean',
          description: 'Muss true sein fuer mutierende Befehle (z. B. npm install)',
        },
      },
      required: ['command'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => {
      const payload = input as {
        command: string;
        args?: string[];
        cwd?: string;
        confirmMutating?: boolean;
      };

      const result = await runLabDebugCommand({
        command: payload.command,
        args: payload.args,
        cwd: payload.cwd,
        confirmMutating: payload.confirmMutating,
      });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: result.requiresApproval ? 'PERMISSION_DENIED' : 'EXECUTION_ERROR',
            message: result.error || `Debug Command fehlgeschlagen (exit=${String(result.exitCode)})`,
          },
          data: result,
        };
      }

      return {
        success: true,
        data: result,
      };
    },
    createAction: () => null,
  },
];
