// ============================================
// lab-handler.ts - Frontend-Handler fuer Builder-/Lab-Actions
//
// Zweck: Fuehrt neue Builder-Tools im Client aus und verbindet
//        sie mit dem Projects-Store und der Modul-Registry.
// Verwendet von: useAgentExecutor, Lab-/Builder-Tools
// ============================================

'use client';

import { useProjectsStore } from '@/app/lab/builder/stores/projects-store';
import { BUILDER_TOOL_SPECS } from '@/lib/agent/tools/builder-tool-specs';
import { initializeModuleRegistry } from '@/lib/modules/registry';
import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';

type BuilderSnapshotRecord = {
  id: string;
  label: string;
  project: unknown;
  createdAt: string;
};

const BUILDER_ACTION_IDS = BUILDER_TOOL_SPECS.map((spec) => spec.id);
const LAB_LEGACY_ACTION_IDS = [
  'lab.createProject',
  'lab.generateModule',
  'lab.previewModule',
  'lab.publishModule',
] as const;

function resolveProjectId(payload: Record<string, unknown>, store: ReturnType<typeof useProjectsStore.getState>): string | null {
  const payloadProjectId = typeof payload.projectId === 'string' ? payload.projectId : null;
  if (payloadProjectId) return payloadProjectId;
  if (store.currentProjectId) return store.currentProjectId;
  return store.projects[0]?.id || null;
}

function openLabWorkspace(projectId?: string | null): void {
  const appStore = useAppStore.getState();
  const projectsStore = useProjectsStore.getState();
  appStore.openTab('lab');

  if (projectId) {
    projectsStore.setCurrentProject(projectId);
  }
}

function getSnapshotStorageKey(projectId: string): string {
  return `lifeos-builder-snapshots:${projectId}`;
}

function readSnapshots(projectId: string): BuilderSnapshotRecord[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(getSnapshotStorageKey(projectId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as BuilderSnapshotRecord[] : [];
  } catch {
    return [];
  }
}

function writeSnapshots(projectId: string, snapshots: BuilderSnapshotRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSnapshotStorageKey(projectId), JSON.stringify(snapshots));
}

function updateProjectFiles(
  projectId: string,
  updater: (files: Record<string, { type: 'file' | 'folder'; content?: string }>) => Record<string, { type: 'file' | 'folder'; content?: string }>
): void {
  useProjectsStore.setState((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            files: updater(project.files || {}),
            updatedAt: new Date().toISOString(),
          }
        : project
    ),
  }));
}

// --------------------------------------------
// Lab Action Handler
// Deckt Builder-Projekte, Dateien, Modul-API und Publishing ab.
// --------------------------------------------

export const labActionHandler: ActionHandler = {
  moduleId: 'lab',
  supportedActions: [...BUILDER_ACTION_IDS, ...LAB_LEGACY_ACTION_IDS],
  execute: async (action: AgentAction): Promise<ActionResult> => {
    const projectsStore = useProjectsStore.getState();
    const payload = action.payload as Record<string, unknown>;

    try {
      switch (action.type) {
        case 'builder.project.create':
        case 'lab.createProject': {
          const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : 'Neues Builder-Projekt';
          const description = typeof payload.description === 'string' ? payload.description : '';
          const projectId = projectsStore.createProject(name, description);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.project.list':
          openLabWorkspace(projectsStore.currentProjectId || projectsStore.projects[0]?.id || null);
          return { success: true };

        case 'builder.project.get': {
          const projectId = resolveProjectId(payload, projectsStore);
          openLabWorkspace(projectId);
          return { success: Boolean(projectId), error: projectId ? undefined : 'Kein Projekt gefunden' };
        }

        case 'builder.project.updateMeta': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };

          const { name, description, ...moduleMetaUpdates } = payload;
          const projectUpdates: Record<string, unknown> = {};
          if (typeof name === 'string') projectUpdates.name = name;
          if (typeof description === 'string') projectUpdates.description = description;
          if (Object.keys(projectUpdates).length > 0) {
            projectsStore.updateProject(projectId, projectUpdates);
          }
          if (Object.keys(moduleMetaUpdates).length > 0) {
            projectsStore.updateModuleMetadata(projectId, moduleMetaUpdates);
          }
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.project.duplicate': {
          const projectId = resolveProjectId(payload, projectsStore);
          const source = projectId ? projectsStore.projects.find((project) => project.id === projectId) : null;
          if (!source) return { success: false, error: 'Projekt nicht gefunden' };

          const duplicateId = projectsStore.createProject(
            `${source.name} Kopie`,
            source.description || ''
          );
          projectsStore.updateProject(duplicateId, {
            ...source,
            id: duplicateId,
            name: `${source.name} Kopie`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          openLabWorkspace(duplicateId);
          return { success: true };
        }

        case 'builder.project.archive': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          projectsStore.updateProject(projectId, { status: 'completed' });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.project.delete': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          projectsStore.deleteProject(projectId);
          openLabWorkspace(projectsStore.currentProjectId || projectsStore.projects[0]?.id || null);
          return { success: true };
        }

        case 'builder.session.setMode': {
          const mode = typeof payload.mode === 'string' ? payload.mode : 'chat';
          openLabWorkspace(resolveProjectId(payload, projectsStore));
          useAppStore.getState().setActiveTool(`builder-mode:${mode}`);
          return { success: true };
        }

        case 'builder.prompt.submit':
        case 'builder.prompt.refine':
        case 'builder.prompt.suggest':
        case 'builder.prompt.attachBaseContext':
        case 'builder.generate.run':
        case 'builder.generate.retryWithRepair':
        case 'lab.generateModule': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };

          const prompt =
            (typeof payload.prompt === 'string' && payload.prompt)
            || (typeof payload.refinement === 'string' && payload.refinement)
            || (typeof payload.instructions === 'string' && payload.instructions)
            || (typeof payload.repairPrompt === 'string' && payload.repairPrompt)
            || (typeof payload.baseContext === 'string' && payload.baseContext)
            || action.type;

          projectsStore.addMessage(projectId, {
            role: 'user',
            content: prompt,
          });
          projectsStore.updateProject(projectId, {
            status: action.type.includes('generate') || action.type === 'lab.generateModule' ? 'building' : 'draft',
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.files.list':
        case 'builder.file.get':
        case 'builder.validate.contract':
        case 'builder.validate.compile':
        case 'builder.validate.uiQuality':
        case 'builder.validate.lucideImports':
        case 'builder.preview.render':
        case 'builder.debug.runCommand':
        case 'builder.debug.captureErrors':
        case 'builder.audit.list':
        case 'builder.audit.getActionDiff': {
          const projectId = resolveProjectId(payload, projectsStore);
          openLabWorkspace(projectId);
          return { success: Boolean(projectId), error: projectId ? undefined : 'Kein Projekt gefunden' };
        }

        case 'builder.file.set':
        case 'builder.file.create': {
          const projectId = resolveProjectId(payload, projectsStore);
          const path = typeof payload.path === 'string' ? payload.path : '';
          const content = typeof payload.content === 'string' ? payload.content : '';
          if (!projectId || !path.trim()) return { success: false, error: 'projectId oder path fehlt' };
          projectsStore.setFile(projectId, path, content);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.file.patch': {
          const projectId = resolveProjectId(payload, projectsStore);
          const path = typeof payload.path === 'string' ? payload.path : '';
          const search = typeof payload.search === 'string' ? payload.search : '';
          const replace = typeof payload.replace === 'string' ? payload.replace : '';
          if (!projectId || !path.trim()) return { success: false, error: 'projectId oder path fehlt' };

          const project = projectsStore.projects.find((entry) => entry.id === projectId);
          const currentContent = project?.files?.[path]?.content || '';
          projectsStore.setFile(projectId, path, currentContent.replace(search, replace));
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.file.rename':
        case 'builder.file.move': {
          const projectId = resolveProjectId(payload, projectsStore);
          const fromPath = typeof payload.fromPath === 'string' ? payload.fromPath : '';
          const toPath = typeof payload.toPath === 'string' ? payload.toPath : '';
          if (!projectId || !fromPath.trim() || !toPath.trim()) {
            return { success: false, error: 'projectId, fromPath oder toPath fehlt' };
          }

          updateProjectFiles(projectId, (files) => {
            const nextFiles = { ...files };
            const entry = nextFiles[fromPath];
            if (!entry) return nextFiles;
            nextFiles[toPath] = entry;
            delete nextFiles[fromPath];
            return nextFiles;
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.file.delete': {
          const projectId = resolveProjectId(payload, projectsStore);
          const path = typeof payload.path === 'string' ? payload.path : '';
          if (!projectId || !path.trim()) return { success: false, error: 'projectId oder path fehlt' };
          updateProjectFiles(projectId, (files) => {
            const nextFiles = { ...files };
            delete nextFiles[path];
            return nextFiles;
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.setManifest': {
          const projectId = resolveProjectId(payload, projectsStore);
          const manifest = payload.manifest && typeof payload.manifest === 'object'
            ? payload.manifest as Record<string, unknown>
            : null;
          if (!projectId || !manifest) return { success: false, error: 'projectId oder manifest fehlt' };
          projectsStore.updateModuleMetadata(projectId, manifest);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.setEntry': {
          const projectId = resolveProjectId(payload, projectsStore);
          const entryPath = typeof payload.entryPath === 'string' ? payload.entryPath : '';
          if (!projectId || !entryPath.trim()) return { success: false, error: 'projectId oder entryPath fehlt' };
          projectsStore.updateModuleMetadata(projectId, { homepage: entryPath });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.setPermissions': {
          const projectId = resolveProjectId(payload, projectsStore);
          const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          projectsStore.updateModuleMetadata(projectId, { tags: permissions.map((entry) => String(entry)) });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.tool.add': {
          const projectId = resolveProjectId(payload, projectsStore);
          const tool = payload.tool && typeof payload.tool === 'object'
            ? payload.tool as Record<string, unknown>
            : null;
          if (!projectId || !tool) return { success: false, error: 'projectId oder tool fehlt' };

          projectsStore.addTool(projectId, {
            name: String(tool.name || tool.id || 'tool'),
            description: String(tool.description || ''),
            parameters: Array.isArray(tool.parameters) ? tool.parameters as never[] : [],
            returns: tool.returns && typeof tool.returns === 'object' ? tool.returns as never : undefined,
            canBeCalledBy: tool.canBeCalledBy === 'agents' || tool.canBeCalledBy === 'modules' ? tool.canBeCalledBy : 'both',
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.tool.update': {
          const projectId = resolveProjectId(payload, projectsStore);
          const toolId = typeof payload.toolId === 'string' ? payload.toolId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : null;
          if (!projectId || !toolId.trim() || !updates) {
            return { success: false, error: 'projectId, toolId oder updates fehlt' };
          }
          projectsStore.updateTool(projectId, toolId, updates);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.tool.remove': {
          const projectId = resolveProjectId(payload, projectsStore);
          const toolId = typeof payload.toolId === 'string' ? payload.toolId : '';
          if (!projectId || !toolId.trim()) return { success: false, error: 'projectId oder toolId fehlt' };
          projectsStore.removeTool(projectId, toolId);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.event.add': {
          const projectId = resolveProjectId(payload, projectsStore);
          const event = payload.event && typeof payload.event === 'object'
            ? payload.event as Record<string, unknown>
            : null;
          if (!projectId || !event) return { success: false, error: 'projectId oder event fehlt' };
          projectsStore.addEvent(projectId, {
            name: String(event.name || 'event'),
            description: String(event.description || ''),
            payload: Array.isArray(event.payload) ? event.payload as never[] : [],
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.event.update': {
          const projectId = resolveProjectId(payload, projectsStore);
          const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : null;
          if (!projectId || !eventId.trim() || !updates) {
            return { success: false, error: 'projectId, eventId oder updates fehlt' };
          }
          projectsStore.updateEvent(projectId, eventId, updates);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.event.remove': {
          const projectId = resolveProjectId(payload, projectsStore);
          const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';
          if (!projectId || !eventId.trim()) return { success: false, error: 'projectId oder eventId fehlt' };
          projectsStore.removeEvent(projectId, eventId);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.customPrompt.set': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          projectsStore.updateCustomPrompt(projectId, {
            enabled: true,
            systemPrompt: typeof payload.systemPrompt === 'string' ? payload.systemPrompt : '',
            constraints: Array.isArray(payload.constraints) ? payload.constraints.map(String) : [],
            examples: Array.isArray(payload.examples) ? payload.examples.map(String) : [],
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.apiKey.add': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          projectsStore.addApiKey(projectId, {
            service: String(payload.service || 'custom'),
            name: String(payload.name || payload.service || 'API Key'),
            key: String(payload.key || ''),
            description: typeof payload.description === 'string' ? payload.description : '',
            isConfigured: Boolean(payload.key),
          });
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.apiKey.update': {
          const projectId = resolveProjectId(payload, projectsStore);
          const keyId = typeof payload.keyId === 'string' ? payload.keyId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : null;
          if (!projectId || !keyId.trim() || !updates) {
            return { success: false, error: 'projectId, keyId oder updates fehlt' };
          }
          projectsStore.updateApiKey(projectId, keyId, updates);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.apiKey.remove': {
          const projectId = resolveProjectId(payload, projectsStore);
          const keyId = typeof payload.keyId === 'string' ? payload.keyId : '';
          if (!projectId || !keyId.trim()) return { success: false, error: 'projectId oder keyId fehlt' };
          projectsStore.removeApiKey(projectId, keyId);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.activate':
        case 'builder.module.publish':
        case 'lab.publishModule': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          const visibility = payload.visibility === 'public' ? 'public' : 'private';
          await projectsStore.publishProject(projectId, visibility);
          await initializeModuleRegistry();
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.unpublish':
        case 'builder.module.deactivate': {
          const projectId = resolveProjectId(payload, projectsStore);
          if (!projectId) return { success: false, error: 'projectId fehlt' };
          projectsStore.unpublishProject(projectId);
          await initializeModuleRegistry();
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.registry.refresh': {
          await initializeModuleRegistry();
          openLabWorkspace(resolveProjectId(payload, projectsStore));
          return { success: true };
        }

        case 'builder.backup.createSnapshot': {
          const projectId = resolveProjectId(payload, projectsStore);
          const project = projectId ? projectsStore.projects.find((entry) => entry.id === projectId) : null;
          if (!projectId || !project) return { success: false, error: 'Projekt nicht gefunden' };

          const snapshots = readSnapshots(projectId);
          const nextSnapshot: BuilderSnapshotRecord = {
            id: crypto.randomUUID(),
            label: typeof payload.label === 'string' && payload.label.trim()
              ? payload.label.trim()
              : `Snapshot ${new Date().toLocaleString('de-DE')}`,
            project,
            createdAt: new Date().toISOString(),
          };
          writeSnapshots(projectId, [nextSnapshot, ...snapshots].slice(0, 20));
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.backup.restoreSnapshot':
        case 'builder.module.rollbackToSnapshot': {
          const projectId = resolveProjectId(payload, projectsStore);
          const snapshotId = typeof payload.snapshotId === 'string' ? payload.snapshotId : '';
          if (!projectId || !snapshotId.trim()) return { success: false, error: 'projectId oder snapshotId fehlt' };

          const snapshot = readSnapshots(projectId).find((entry) => entry.id === snapshotId);
          if (!snapshot || !snapshot.project || typeof snapshot.project !== 'object') {
            return { success: false, error: 'Snapshot nicht gefunden' };
          }

          projectsStore.updateProject(projectId, snapshot.project as Record<string, unknown>);
          openLabWorkspace(projectId);
          return { success: true };
        }

        case 'builder.module.exportZip': {
          const projectId = resolveProjectId(payload, projectsStore);
          const project = projectId ? projectsStore.projects.find((entry) => entry.id === projectId) : null;
          if (!projectId || !project) return { success: false, error: 'Projekt nicht gefunden' };

          if (typeof window !== 'undefined') {
            const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${project.name || 'builder-project'}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }
          openLabWorkspace(projectId);
          return { success: true };
        }

        default: {
          openLabWorkspace(resolveProjectId(payload, projectsStore));
          return { success: true };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lab-Aktion fehlgeschlagen',
      };
    }
  },
};
