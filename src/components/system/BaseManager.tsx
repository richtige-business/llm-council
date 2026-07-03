'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, DragEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { Blocks, FolderTree, Globe, Link2, Pencil, Plus, Settings2, Sparkles, Trash2, Unlink, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useThemeStyles } from '@/lib/theme';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';
import { isExternalAppModule, isWebAppModule } from '@/lib/external-apps';
import { getModuleById } from '@/lib/marketplace/mock-data';
import { defaultBackgrounds } from '@/lib/store/app-store';
import type { Module } from '@/types';

// --------------------------------------------
// Filter-Typ fuer nicht zugeordnete Module
// --------------------------------------------

type UnassignedFilter = 'all' | 'lifeos' | 'webapp';

// Postfach, Kalender, Browser werden nicht in "Nicht zugeordnet" angezeigt
// (immer in der Navbar, keine Base-Zuordnung noetig)
const EXCLUDED_FROM_UNASSIGNED = ['inbox', 'calendar', 'browser'] as const;

const BASE_SUGGESTIONS = ['Personal', 'Business', 'Education'] as const;

const MODULE_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
];

type BaseBackgroundOption = { id: string; name: string; url: string };

const THEMED_BASE_BACKGROUNDS: Record<string, BaseBackgroundOption[]> = {
  personal: [
    { id: 'personal-cozy-home', name: 'Cozy Home', url: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1920&q=80' },
    { id: 'personal-sunrise', name: 'Morning Sunrise', url: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=1920&q=80' },
    { id: 'personal-journal', name: 'Calm Journal', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1920&q=80' },
    { id: 'personal-mountain-lake', name: 'Mountain Lake', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  ],
  business: [
    { id: 'business-city', name: 'Skyline', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80' },
    { id: 'business-office', name: 'Office Desk', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80' },
    { id: 'business-boardroom', name: 'Boardroom', url: 'https://images.unsplash.com/photo-1577415124269-fc1140a69e91?w=1920&q=80' },
    { id: 'business-night-city', name: 'City Night', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80' },
  ],
  education: [
    { id: 'education-library', name: 'Library', url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&q=80' },
    { id: 'education-campus', name: 'Campus', url: 'https://images.unsplash.com/photo-1462536943532-57a629f6cc60?w=1920&q=80' },
    { id: 'education-study-desk', name: 'Study Desk', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920&q=80' },
    { id: 'education-notes', name: 'Notebook', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1920&q=80' },
  ],
  creative: [
    { id: 'creative-studio', name: 'Creative Studio', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&q=80' },
    { id: 'creative-colors', name: 'Color Splash', url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1920&q=80' },
    { id: 'creative-workspace', name: 'Design Workspace', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&q=80' },
    { id: 'creative-neon', name: 'Neon Mood', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80' },
  ],
  health: [
    { id: 'health-yoga', name: 'Yoga Flow', url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80' },
    { id: 'health-nature', name: 'Green Nature', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
    { id: 'health-running', name: 'Morning Run', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1920&q=80' },
    { id: 'health-wellness', name: 'Wellness', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80' },
  ],
  default: [
    { id: 'default-northern-lights', name: 'Nordlichter', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80' },
    { id: 'default-ocean', name: 'Ocean Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80' },
    { id: 'default-mountain', name: 'Bergsee', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
    { id: 'default-desert', name: 'Wüstendünen', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80' },
  ],
};

function resolveBaseTheme(baseName: string): keyof typeof THEMED_BASE_BACKGROUNDS {
  const normalized = baseName.toLowerCase();
  if (normalized.includes('personal') || normalized.includes('life') || normalized.includes('privat')) return 'personal';
  if (normalized.includes('business') || normalized.includes('work') || normalized.includes('office') || normalized.includes('firma')) return 'business';
  if (normalized.includes('education') || normalized.includes('learn') || normalized.includes('study') || normalized.includes('bildung')) return 'education';
  if (normalized.includes('creative') || normalized.includes('creator') || normalized.includes('design')) return 'creative';
  if (normalized.includes('health') || normalized.includes('fitness') || normalized.includes('wellness')) return 'health';
  return 'default';
}

function getBackgroundOptionsForBase(baseName: string): BaseBackgroundOption[] {
  const theme = resolveBaseTheme(baseName);
  const themed = THEMED_BASE_BACKGROUNDS[theme] ?? THEMED_BASE_BACKGROUNDS.default;
  const combined = [...themed, ...defaultBackgrounds];
  const seen = new Set<string>();

  return combined.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, 8);
}

// --------------------------------------------
// resolveIcon - Robuster Icon-Resolver
// Liest den Icon-Namen aus dem Modul und gibt die
// passende Lucide-Komponente zurueck.
// Fallback-Kette: Exakter Name → PascalCase → typ-spezifisch
// --------------------------------------------

function resolveIcon(iconName: string | undefined, moduleId?: string): ComponentType<{ className?: string }> {
  // Typ-spezifisches Fallback bestimmen
  const typeFallback =
    moduleId && (isWebAppModule(moduleId) || isExternalAppModule(moduleId))
      ? Globe
      : Blocks;

  if (!iconName || iconName.startsWith('http')) return typeFallback;
  const icons = LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>;
  // Direkte Suche (z.B. "Calendar", "Mail", "Monitor")
  if (icons[iconName]) return icons[iconName];
  // PascalCase-Versuch (z.B. "calendar" → "Calendar")
  const pascal = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  if (icons[pascal]) return icons[pascal];
  return typeFallback;
}

function getGradientForModule(moduleId: string): string {
  const hash = Array.from(moduleId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return MODULE_GRADIENTS[hash % MODULE_GRADIENTS.length]!;
}

export function BaseManager() {
  const router = useRouter();
  const { input, accentColor, designStyle, textColor, surfaceColor } = useThemeStyles();

  const bases = useBaseStore((state) => state.bases);
  const createBase = useBaseStore((state) => state.createBase);
  const updateBase = useBaseStore((state) => state.updateBase);
  const deleteBase = useBaseStore((state) => state.deleteBase);
  const cleanupMissingModules = useBaseStore((state) => state.cleanupMissingModules);

  const registryModules = useModuleRegistry((state) => state.modules);
  const builderProjects: Array<{ id: string; status: string; moduleInfo?: { id: string } }> = [];
  const modules = useMemo(
    () => registryModules.filter((module) => module.id !== 'agents' && module.id !== 'chat'),
    [registryModules]
  );
  const assignToBase = useModuleRegistry((state) => state.assignToBase);
  const removeFromBase = useModuleRegistry((state) => state.removeFromBase);
  const unregisterModule = useModuleRegistry((state) => state.unregisterModule);

  const [newBaseName, setNewBaseName] = useState('');
  const [newBaseDescription, setNewBaseDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [unassignedFilter, setUnassignedFilter] = useState<UnassignedFilter>('all');
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [settingsBaseId, setSettingsBaseId] = useState<string | null>(null);
  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});
  const [memberNameInput, setMemberNameInput] = useState('');
  const [memberEmailInput, setMemberEmailInput] = useState('');
  const [memberRoleInput, setMemberRoleInput] = useState<'owner' | 'editor' | 'viewer'>('viewer');

  const moduleIds = useMemo(() => modules.map((module) => module.id), [modules]);

  useEffect(() => {
    if (moduleIds.length === 0) {
      return;
    }
    cleanupMissingModules(moduleIds);
  }, [cleanupMissingModules, moduleIds]);

  const moduleById = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);

  // --------------------------------------------
  // Builder-Projekte nach Modul-ID auflösen
  // So bekommen nur echte Builder-Module einen Edit-Button.
  // --------------------------------------------

  const editableProjectByModuleId = useMemo(() => {
    return new Map(
      builderProjects
        .filter((project) => project.status === 'published')
        .map((project) => [project.moduleInfo?.id || project.id, project.id])
    );
  }, [builderProjects]);

  // Alle nicht zugeordneten Module (ungefiltert)
  // Postfach, Kalender, Browser ausgenommen – sie sind immer in der Navbar
  const allUnassignedModules = useMemo(() => {
    const assigned = new Set(bases.flatMap((base) => base.moduleIds));
    const excluded = new Set<string>(EXCLUDED_FROM_UNASSIGNED);
    return modules.filter((module) => !assigned.has(module.id) && !excluded.has(module.id));
  }, [bases, modules]);

  // Zaehler pro Kategorie (fuer Badges in den Filter-Pills)
  const unassignedCounts = useMemo(() => {
    let lifeos = 0;
    let webapp = 0;
    for (const m of allUnassignedModules) {
      if (isWebAppModule(m.id) || isExternalAppModule(m.id)) {
        webapp++;
      } else {
        lifeos++;
      }
    }
    return { lifeos, webapp, all: allUnassignedModules.length };
  }, [allUnassignedModules]);

  // Gefilterte nicht zugeordnete Module
  const unassignedModules = useMemo(() => {
    if (unassignedFilter === 'all') return allUnassignedModules;
    return allUnassignedModules.filter((m) => {
      if (unassignedFilter === 'webapp') {
        return isWebAppModule(m.id) || isExternalAppModule(m.id);
      }
      // 'lifeos': Alles was nicht webapp ist
      return !isWebAppModule(m.id) && !isExternalAppModule(m.id);
    });
  }, [allUnassignedModules, unassignedFilter]);

  const resolveModuleInfoHref = (module: Module): string => {
    const marketplaceModule = getModuleById(module.id);
    if (marketplaceModule) {
      return `/library/${marketplaceModule.slug}`;
    }

    return `/library/${module.id}`;
  };

  const navigateToModuleInfo = (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.assign(href);
    }
  };

  const createDescriptionFallback = (name: string) =>
    `${name}-Base fuer strukturierte Workflows und interne Automationen.`;

  const handleCreateBase = (value = newBaseName, descriptionValue = newBaseDescription) => {
    const trimmedName = value.trim();
    const trimmedDescription = descriptionValue.trim();
    if (!trimmedName) {
      setCreateError('Bitte gib einen Base-Namen ein.');
      return;
    }
    if (!trimmedDescription) {
      setCreateError('Bitte gib eine Base-Beschreibung ein.');
      return;
    }

    const duplicate = bases.some((base) => base.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      setCreateError(`"${trimmedName}" existiert bereits.`);
      return;
    }

    createBase({ name: trimmedName, description: trimmedDescription });
    setNewBaseName('');
    setNewBaseDescription('');
    setCreateError(null);
    setActionInfo(null);
  };

  const handleDeleteBase = (baseId: string) => {
    const base = bases.find((candidate) => candidate.id === baseId);

    if (base) {
      for (const moduleId of base.moduleIds) {
        removeFromBase(moduleId);
      }
    }

    deleteBase(baseId);
  };

  const resolveDraggedModuleId = (event: DragEvent) => {
    return event.dataTransfer.getData('text/plain') || draggedModuleId;
  };

  const handleDragStart = (event: DragEvent, moduleId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', moduleId);
    setDraggedModuleId(moduleId);
  };

  const handleDragEnd = () => {
    setDraggedModuleId(null);
    setDragOverZone(null);
  };

  const handleDropOnBase = (event: DragEvent, baseId: string) => {
    event.preventDefault();
    const moduleId = resolveDraggedModuleId(event);
    if (!moduleId) {
      return;
    }

    assignToBase(moduleId, baseId);
    setDragOverZone(null);
    setDraggedModuleId(null);
  };

  const handleDropToUnassigned = (event: DragEvent) => {
    event.preventDefault();
    const moduleId = resolveDraggedModuleId(event);
    if (!moduleId) {
      return;
    }

    removeFromBase(moduleId);
    setDragOverZone(null);
    setDraggedModuleId(null);
  };

  const handleDeleteModule = (module: Module) => {
    const confirmed = window.confirm(`Modul "${module.name}" wirklich komplett löschen?`);
    if (!confirmed) {
      return;
    }

    unregisterModule(module.id);
    setActionInfo(`Modul "${module.name}" wurde gelöscht.`);
  };

  const handleEditModule = (moduleId: string) => {
    const projectId = editableProjectByModuleId.get(moduleId);
    if (!projectId) {
      return;
    }

    router.push(`/lab/builder/${projectId}`);
  };

  const handleBackgroundChange = (baseId: string, backgroundImage: string) => {
    updateBase(baseId, { backgroundImage });
    setActionInfo('Base-Hintergrund wurde aktualisiert.');
  };

  const handleAddAccessMember = (baseId: string) => {
    const name = memberNameInput.trim();
    const email = memberEmailInput.trim();
    if (!name) {
      setActionInfo('Bitte mindestens einen Namen für den Nutzer angeben.');
      return;
    }

    const base = bases.find((entry) => entry.id === baseId);
    if (!base) return;

    const accessMembers = base.accessMembers ?? [];
    const exists = accessMembers.some((entry) => {
      if (email) {
        return Boolean(entry.email) && entry.email?.toLowerCase() === email.toLowerCase();
      }
      return entry.name.toLowerCase() === name.toLowerCase();
    });
    if (exists) {
      setActionInfo('Nutzer ist bereits in dieser Base vorhanden.');
      return;
    }

    updateBase(baseId, {
      accessMembers: [
        ...accessMembers,
        {
          id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          email: email || undefined,
          role: memberRoleInput,
        },
      ],
    });

    setMemberNameInput('');
    setMemberEmailInput('');
    setMemberRoleInput('viewer');
    setActionInfo(`Zugriff für "${name}" hinzugefügt.`);
  };

  const handleRemoveAccessMember = (baseId: string, memberId: string) => {
    const base = bases.find((entry) => entry.id === baseId);
    if (!base) return;

    updateBase(baseId, {
      accessMembers: (base.accessMembers ?? []).filter((entry) => entry.id !== memberId),
    });
    setActionInfo('Nutzerzugriff entfernt.');
  };

  const handleSaveBaseDescription = (baseId: string, fallbackDescription: string) => {
    const draft = (descriptionDrafts[baseId] ?? fallbackDescription).trim();
    if (!draft) {
      setActionInfo('Base-Beschreibung darf nicht leer sein.');
      return;
    }
    updateBase(baseId, { description: draft });
    setDescriptionDrafts((prev) => ({ ...prev, [baseId]: draft }));
    setActionInfo('Base-Beschreibung gespeichert.');
  };

  const renderModuleCard = (module: Module, context: { baseId?: string }) => {
    const gradient = getGradientForModule(module.id);
    const moduleInfoHref = resolveModuleInfoHref(module);
    const editableProjectId = editableProjectByModuleId.get(module.id);

    return (
      <div
        key={module.id}
        draggable
        onDragStart={(event) => handleDragStart(event, module.id)}
        onDragEnd={handleDragEnd}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button')) {
            return;
          }
          navigateToModuleInfo(moduleInfoHref);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            navigateToModuleInfo(moduleInfoHref);
          }
        }}
        role="button"
        tabIndex={0}
        className="group relative rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing hover:scale-[1.01]"
        style={{
          background: designStyle === 'brutal'
            ? surfaceColor
            : 'linear-gradient(150deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.88) 100%)',
          border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(148, 163, 184, 0.3)',
          boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : '0 10px 25px rgba(2,6,23,0.24)',
        }}
      >
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {editableProjectId && (
            <button
              type="button"
              aria-label={`${module.name} im Builder bearbeiten`}
              title="Im Modulbuilder bearbeiten"
              onClick={(event) => {
                event.stopPropagation();
                handleEditModule(module.id);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-105"
              style={{
                color: '#93c5fd',
                background: 'rgba(59, 130, 246, 0.14)',
                border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(96, 165, 250, 0.35)',
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {context.baseId && (
            <button
              type="button"
              aria-label={`${module.name} entfernen`}
              title="Aus Base entfernen"
              onClick={(event) => {
                event.stopPropagation();
                removeFromBase(module.id);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-105"
              style={{
                color: '#fca5a5',
                background: 'rgba(248, 113, 113, 0.14)',
                border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(248, 113, 113, 0.35)',
              }}
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            aria-label={`${module.name} löschen`}
            title="Modul löschen"
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteModule(module);
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-105"
            style={{
              color: '#f87171',
              background: 'rgba(239, 68, 68, 0.16)',
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(239, 68, 68, 0.35)',
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Modul-Icon: Bild (native/web) oder Lucide-Icon */}
        {module.icon?.startsWith('http') ? (
          <div
            className="relative mb-3 h-11 w-11 overflow-hidden"
            style={{
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : '0 8px 20px rgba(15, 23, 42, 0.35)',
            }}
          >
            {/* Echtes App-Icon (HTTP-URL) - scale(1.08) fuellt den Container */}
            <img
              src={module.icon}
              alt={module.name}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: 'block', transform: 'scale(1.08)' }}
              onError={(e) => {
                // Bild fehlgeschlagen: verstecken und Fallback einblenden
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            {/* Fallback-Icon (nur sichtbar wenn Bild fehlschlaegt) */}
            <div
              className="absolute inset-0 items-center justify-center"
              style={{ display: 'none', background: gradient }}
            >
              <Globe className="h-5 w-5 text-white" />
            </div>
          </div>
        ) : (
          <div
            className="mb-3 flex h-11 w-11 items-center justify-center"
            style={{
              background: gradient,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : '0 8px 20px rgba(15, 23, 42, 0.35)',
            }}
          >
            {(() => {
              const Icon = resolveIcon(module.icon, module.id);
              return <Icon className="h-5 w-5 text-white" />;
            })()}
          </div>
        )}

        <div className="flex items-center gap-2 pr-8">
          <h4 className="text-sm font-semibold" style={{ color: textColor }}>
            {module.name}
          </h4>
          {(isWebAppModule(module.id) || isExternalAppModule(module.id)) && (
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ color: '#67e8f9', background: 'rgba(6,182,212,0.15)' }}>
              <Globe className="h-2.5 w-2.5" /> Web
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs" style={{ color: textColor, opacity: 0.65 }}>
          {module.description || 'Modul ohne Beschreibung'}
        </p>

      </div>
    );
  };

  return (
    <div className="relative z-[1] space-y-8 pointer-events-auto">
      <div
        className="relative z-10 pointer-events-auto"
        style={{
          padding: 0,
        }}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateBase();
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newBaseName}
              onChange={(event) => {
                setNewBaseName(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              placeholder="Neue Base erstellen (z.B. ERP, Personal)"
              className="h-10 flex-1 px-3 focus:outline-none"
              style={{
                ...input.base,
                color: textColor,
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
              }}
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-all"
              style={{
                background: accentColor,
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
              }}
            >
              <Plus className="h-4 w-4" />
              Base erstellen
            </button>
          </div>
          <textarea
            value={newBaseDescription}
            onChange={(event) => {
              setNewBaseDescription(event.target.value);
              if (createError) setCreateError(null);
            }}
            placeholder="Base-Beschreibung (Pflicht)"
            className="min-h-[78px] w-full px-3 py-2 text-sm focus:outline-none"
            style={{
              ...input.base,
              color: textColor,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
            }}
          />
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.55 }}>
            Vorschläge:
          </span>
          {BASE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleCreateBase(suggestion, createDescriptionFallback(suggestion))}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-[1.02]"
              style={{
                color: textColor,
                background: designStyle === 'brutal' ? surfaceColor : 'rgba(139, 92, 246, 0.18)',
                border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(167, 139, 250, 0.35)',
              }}
            >
              <Sparkles className="h-3 w-3" />
              {suggestion}
            </button>
          ))}
        </div>

        {createError && (
          <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>
            {createError}
          </p>
        )}
        {actionInfo && (
          <p className="mt-2 text-xs" style={{ color: '#86efac' }}>
            {actionInfo}
          </p>
        )}
      </div>

      {bases.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-8 text-center"
          style={{ borderColor: 'rgba(148, 163, 184, 0.35)' }}
        >
          <FolderTree className="mx-auto mb-3 h-8 w-8" style={{ color: textColor, opacity: 0.5 }} />
          <p style={{ color: textColor, opacity: 0.7 }}>Noch keine Bases vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {bases.map((base) => (
            <section
              key={base.id}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverZone !== base.id) {
                  setDragOverZone(base.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverZone === base.id) {
                  setDragOverZone(null);
                }
              }}
              onDrop={(event) => handleDropOnBase(event, base.id)}
              className="transition-all"
              style={{
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold" style={{ color: textColor }}>
                    {base.name}
                  </h3>
                  <Link
                    href={`/bases/${base.id}/connections`}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      color: '#93c5fd',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(96, 165, 250, 0.35)',
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Connections
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsBaseId((current) => (current === base.id ? null : base.id))}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      color: '#93c5fd',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(96, 165, 250, 0.35)',
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Einstellungen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBase(base.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      color: '#f87171',
                      background: 'rgba(248, 113, 113, 0.12)',
                      border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(248, 113, 113, 0.35)',
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Löschen
                  </button>
                </div>
              </div>

              {settingsBaseId === base.id && (
                <div
                  className="mb-4 space-y-5 rounded-xl p-4"
                  style={{
                    background: 'rgba(15,23,42,0.45)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                  }}
                >
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: textColor, opacity: 0.75 }}>
                      Base-Beschreibung
                    </h4>
                    <textarea
                      value={descriptionDrafts[base.id] ?? base.description}
                      onChange={(event) =>
                        setDescriptionDrafts((prev) => ({ ...prev, [base.id]: event.target.value }))
                      }
                      placeholder="Beschreibung der Base"
                      className="min-h-[96px] w-full px-3 py-2 text-sm focus:outline-none"
                      style={{
                        ...input.base,
                        color: textColor,
                        borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.65rem',
                      }}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveBaseDescription(base.id, base.description)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                        style={{
                          background: accentColor,
                          border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        }}
                      >
                        Speichern
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: textColor, opacity: 0.75 }}>
                      Base-Hintergrund
                    </h4>
                    <p className="mb-2 text-xs" style={{ color: textColor, opacity: 0.6 }}>
                      Thematisch passende Vorschläge für diese Base
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {getBackgroundOptionsForBase(base.name).map((background) => (
                        <button
                          key={background.id}
                          type="button"
                          onClick={() => handleBackgroundChange(base.id, background.url)}
                          className="h-16 overflow-hidden rounded-lg border"
                          style={{
                            borderColor: base.backgroundImage === background.url ? accentColor : 'rgba(148, 163, 184, 0.35)',
                          }}
                          title={background.name}
                        >
                          <div
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${background.url})` }}
                          />
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={base.backgroundImage || ''}
                      onChange={(event) => handleBackgroundChange(base.id, event.target.value)}
                      placeholder="Eigene Hintergrund-URL"
                      className="mt-3 h-9 w-full px-3 text-xs focus:outline-none"
                      style={{
                        ...input.base,
                        color: textColor,
                        borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.65rem',
                      }}
                    />
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: textColor, opacity: 0.75 }}>
                      Nutzer & Zugriffsrechte
                    </h4>

                    <div className="mb-3 space-y-2">
                      {(base.accessMembers ?? []).length === 0 ? (
                        <p className="text-xs" style={{ color: textColor, opacity: 0.65 }}>
                          Noch keine zusätzlichen Nutzer konfiguriert.
                        </p>
                      ) : (
                        (base.accessMembers ?? []).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium" style={{ color: textColor }}>
                                {member.name}
                              </p>
                              <p className="truncate text-xs" style={{ color: textColor, opacity: 0.65 }}>
                                {member.email || 'ohne E-Mail'} · {member.role}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAccessMember(base.id, member.id)}
                              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full"
                              style={{
                                color: '#f87171',
                                background: 'rgba(248, 113, 113, 0.14)',
                              }}
                              title="Nutzer entfernen"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <input
                        value={memberNameInput}
                        onChange={(event) => setMemberNameInput(event.target.value)}
                        placeholder="Name"
                        className="h-9 px-3 text-xs focus:outline-none"
                        style={{
                          ...input.base,
                          color: textColor,
                          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.65rem',
                        }}
                      />
                      <input
                        type="email"
                        value={memberEmailInput}
                        onChange={(event) => setMemberEmailInput(event.target.value)}
                        placeholder="E-Mail (optional)"
                        className="h-9 px-3 text-xs focus:outline-none"
                        style={{
                          ...input.base,
                          color: textColor,
                          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.65rem',
                        }}
                      />
                      <select
                        value={memberRoleInput}
                        onChange={(event) => setMemberRoleInput(event.target.value as 'owner' | 'editor' | 'viewer')}
                        className="h-9 px-3 text-xs focus:outline-none"
                        style={{
                          ...input.base,
                          color: textColor,
                          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.65rem',
                        }}
                      >
                        <option value="owner">Owner</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddAccessMember(base.id)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.14)',
                        border: '1px solid rgba(96, 165, 250, 0.35)',
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Nutzer hinzufügen
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-3">
                {base.moduleIds.length === 0 ? (
                  <p
                    className="rounded-xl border border-dashed px-4 py-8 text-sm text-center"
                    style={{
                      color: textColor,
                      opacity: 0.75,
                      borderColor: dragOverZone === base.id ? accentColor : 'rgba(148, 163, 184, 0.35)',
                      background: dragOverZone === base.id ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                    }}
                  >
                    Module hier hineinziehen
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {base.moduleIds.map((moduleId) => {
                    const moduleEntry = moduleById.get(moduleId);
                    if (!moduleEntry) {
                      return null;
                    }

                      return renderModuleCard(moduleEntry, { baseId: base.id });
                    })}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <section
        onDragOver={(event) => {
          event.preventDefault();
          if (dragOverZone !== 'unassigned') {
            setDragOverZone('unassigned');
          }
        }}
        onDragLeave={() => {
          if (dragOverZone === 'unassigned') {
            setDragOverZone(null);
          }
        }}
        onDrop={handleDropToUnassigned}
        className="pb-2"
        style={{
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: textColor, opacity: 0.7 }}>
            Nicht zugeordnete Module
          </h3>

          {/* Filter-Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { key: 'all' as const, label: 'Alle', count: unassignedCounts.all, icon: null },
              { key: 'lifeos' as const, label: 'LifeOS', count: unassignedCounts.lifeos, icon: <Blocks className="h-3 w-3" /> },
              { key: 'webapp' as const, label: 'Web Apps', count: unassignedCounts.webapp, icon: <Globe className="h-3 w-3" /> },
            ]).map((pill) => {
              const isActive = unassignedFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setUnassignedFilter(pill.key)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    color: isActive ? '#fff' : textColor,
                    opacity: isActive ? 1 : 0.7,
                    background: isActive
                      ? (pill.key === 'native' ? 'rgba(139,92,246,0.35)' : pill.key === 'webapp' ? 'rgba(6,182,212,0.35)' : 'rgba(139,92,246,0.25)')
                      : 'rgba(255,255,255,0.06)',
                    border: isActive
                      ? (pill.key === 'native' ? '1px solid rgba(167,139,250,0.55)' : pill.key === 'webapp' ? '1px solid rgba(103,232,249,0.55)' : '1px solid rgba(167,139,250,0.4)')
                      : '1px solid rgba(148,163,184,0.2)',
                  }}
                >
                  {pill.icon}
                  {pill.label}
                  {pill.count > 0 && (
                    <span
                      className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#fff' : textColor,
                      }}
                    >
                      {pill.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {unassignedModules.length === 0 ? (
          <p
            className="rounded-xl border border-dashed px-4 py-8 text-sm text-center"
            style={{
              color: textColor,
              opacity: 0.75,
              borderColor: dragOverZone === 'unassigned' ? accentColor : 'rgba(148, 163, 184, 0.35)',
              background: dragOverZone === 'unassigned' ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
            }}
          >
            {unassignedFilter === 'all'
              ? 'Alle sichtbaren Module sind einer Base zugeordnet.'
              : unassignedFilter === 'webapp'
                  ? 'Keine Web Apps ohne Base-Zuordnung.'
                  : 'Alle LifeOS Module sind einer Base zugeordnet.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unassignedModules.map((module) => (
              renderModuleCard(module, {})
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
