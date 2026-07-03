// ============================================
// page.tsx - App Bibliothek / Marketplace
// 
// Zweck: Zeigt alle verfügbaren Module mit App-Store-ähnlicher UX
// Route: /library
// Features: Meine Module, Trending, Featured, Filter, Suche
// ============================================

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Library, 
  Search, 
  Blocks, 
  Sparkles,
  CheckCircle,
  Grid3X3,
  List,
  Wallet,
  Heart,
  Brain,
  Beaker,
  Plug,
  Database,
  GraduationCap,
  Gamepad2,
  Code,
  Palette,
  SlidersHorizontal,
  X,
  Filter,
  User,
  FolderTree,
  CheckSquare,
  Globe,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useProjectsStore } from '../lab/builder/stores/projects-store';
import { useModuleRegistry } from '@/lib/modules/registry';
import { useBaseStore } from '@/lib/bases/store';
import { useAppStore } from '@/lib/store/app-store';
import {
  AddCustomUrlDialog,
  EXTERNAL_APP_CATALOG,
  deriveExternalAppCatalogEntry,
  externalCatalogToMarketplaceModule,
  type ExternalAppCatalogEntry,
} from '@/lib/external-apps';
import { createExternalAppModule } from '@/lib/external-apps';

// Marketplace imports
import { 
  MARKETPLACE_MODULES, 
  getFeaturedModules, 
  getTrendingModules, 
  getNewModules,
  getModulesByType,
} from '@/lib/marketplace/mock-data';
import { 
  useMarketplaceStore,
} from '@/lib/marketplace/store';
import type { 
  MarketplaceModule, 
  BaseCategory,
  ModuleCategory, 
  SortOption, 
  PriceFilter, 
  RatingFilter,
  MarketplaceItemType,
} from '@/lib/marketplace/types';

// Komponenten
import { 
  ModuleCard, 
  TrendingCarousel,
} from '@/components/marketplace';
import { BaseManager } from '@/components/system/BaseManager';

// --------------------------------------------
// Built-in Apps (System-Module)
// Diese sind immer verfügbar und werden unter "Meine Module" angezeigt
// --------------------------------------------

const BUILT_IN_APPS: MarketplaceModule[] = [
  {
    id: 'calendar',
    name: 'Kalender',
    slug: 'calendar',
    type: 'apps',
    icon: 'Calendar',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    shortDescription: 'Verwalte Termine, Events und Erinnerungen',
    fullDescription: '# Kalender\n\nDer integrierte LifeOS Kalender.',
    category: 'calendar',
    tags: ['calendar', 'events', 'schedule'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos', name: 'LifeOS Team', verified: true },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [] },
    technical: { version: '1.0.0', size: '0 KB', minLifeOSVersion: '1.0.0', permissions: [], lastUpdated: '2026-01-01T00:00:00Z', releaseDate: '2025-01-01T00:00:00Z' },
    changelog: [],
    isBuiltIn: true,
    route: '/calendar',
  },
  {
    id: 'agents',
    name: 'KI Agents',
    slug: 'agents',
    type: 'apps',
    icon: 'BotMessageSquare',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    shortDescription: 'KI-Agenten mit Chat, Web Research, Memory & Multi-Modell',
    fullDescription: '# KI Agents\n\nDas integrierte LifeOS Agents-System mit Agenten-Hierarchie, Kontexttracker, Bild- und Datei-Import.',
    category: 'ai',
    tags: ['agents', 'ai', 'chat', 'research', 'assistant'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos', name: 'LifeOS Team', verified: true },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [] },
    technical: { version: '2.0.0', size: '0 KB', minLifeOSVersion: '1.0.0', permissions: [], lastUpdated: '2026-02-13T00:00:00Z', releaseDate: '2026-02-13T00:00:00Z' },
    changelog: [],
    isBuiltIn: true,
    route: '/agents',
  },
  {
    id: 'inbox',
    name: 'Inbox',
    slug: 'inbox',
    type: 'apps',
    icon: 'Mail',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    shortDescription: 'Vereinheitlichter Posteingang für alle Accounts',
    fullDescription: '# Inbox\n\nDein zentraler Posteingang.',
    category: 'productivity',
    tags: ['email', 'inbox', 'mail'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos', name: 'LifeOS Team', verified: true },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [] },
    technical: { version: '1.0.0', size: '0 KB', minLifeOSVersion: '1.0.0', permissions: [], lastUpdated: '2026-01-01T00:00:00Z', releaseDate: '2025-01-01T00:00:00Z' },
    changelog: [],
    isBuiltIn: true,
    route: '/inbox',
  },
  {
    id: 'training',
    name: 'KI Training',
    slug: 'training',
    type: 'apps',
    icon: 'Brain',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shortDescription: 'Trainiere eigene KI-Modelle',
    fullDescription: '# KI Training\n\nTrainiere und verwalte deine KI-Modelle.',
    category: 'ai',
    tags: ['ai', 'training', 'machine-learning'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos', name: 'LifeOS Team', verified: true },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [] },
    technical: { version: '1.0.0', size: '0 KB', minLifeOSVersion: '1.0.0', permissions: [], lastUpdated: '2026-01-01T00:00:00Z', releaseDate: '2025-01-01T00:00:00Z' },
    changelog: [],
    isBuiltIn: true,
    route: '/training',
  },
  {
    id: 'lab',
    name: 'Module Builder',
    slug: 'lab',
    type: 'apps',
    icon: 'Beaker',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    shortDescription: 'Erstelle eigene Module mit KI',
    fullDescription: '# Module Builder\n\nErstelle eigene Module.',
    category: 'developer',
    tags: ['builder', 'modules', 'development'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos', name: 'LifeOS Team', verified: true },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [] },
    technical: { version: '1.0.0', size: '0 KB', minLifeOSVersion: '1.0.0', permissions: [], lastUpdated: '2026-01-01T00:00:00Z', releaseDate: '2025-01-01T00:00:00Z' },
    changelog: [],
    isBuiltIn: true,
    route: '/lab/builder',
  },
  {
    id: 'browser',
    name: 'Browser',
    slug: 'browser',
    type: 'apps',
    icon: 'Globe',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
    shortDescription: 'Integrierter Web-Browser',
    fullDescription: '# Browser\n\nIntegrierter Web-Browser.',
    category: 'productivity',
    tags: ['browser', 'web', 'internet'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos', name: 'LifeOS Team', verified: true },
    stats: { downloads: 0, rating: 5, reviewCount: 0 },
    media: { screenshots: [] },
    technical: { version: '1.0.0', size: '0 KB', minLifeOSVersion: '1.0.0', permissions: [], lastUpdated: '2026-01-01T00:00:00Z', releaseDate: '2025-01-01T00:00:00Z' },
    changelog: [],
    isBuiltIn: true,
    route: '/browser',
  },
];

// --------------------------------------------
// Web-Apps (Docker-Container-Browser)
// Echte Web-Apps die per Docker + Chromium + VNC gestreamt werden
// Jede App hat ein Original-Icon via Google Favicon Service
// --------------------------------------------

type ModuleSubCategory = 'lifeos' | 'webapps';

const WEB_APPS: MarketplaceModule[] = [
  // Startet bewusst leer:
  // Externe Web-Apps sollen in der Library nur manuell angelegt werden.
];

// --------------------------------------------
// Kategorie-Filter Optionen
// --------------------------------------------

const categoryOptions: { id: ModuleCategory | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'Alle', icon: Grid3X3 },
  { id: 'productivity', label: 'Produktivität', icon: CheckSquare },
  { id: 'finance', label: 'Finanzen', icon: Wallet },
  { id: 'health', label: 'Gesundheit', icon: Heart },
  { id: 'education', label: 'Bildung', icon: GraduationCap },
  { id: 'games', label: 'Spiele', icon: Gamepad2 },
  { id: 'ai', label: 'KI & ML', icon: Brain },
  { id: 'developer', label: 'Developer', icon: Code },
  { id: 'creative', label: 'Kreativ', icon: Palette },
  { id: 'lifestyle', label: 'Lifestyle', icon: Sparkles },
];

const baseCategoryOptions: { id: BaseCategory | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'Alle', icon: Grid3X3 },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'business', label: 'Business', icon: Wallet },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'creative', label: 'Creative', icon: Palette },
  { id: 'health', label: 'Health', icon: Heart },
];

// --------------------------------------------
// Sortierungs-Optionen
// --------------------------------------------

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'popular', label: 'Beliebteste' },
  { id: 'rating', label: 'Bestbewertet' },
  { id: 'newest', label: 'Neueste' },
  { id: 'updated', label: 'Zuletzt aktualisiert' },
  { id: 'name', label: 'A-Z' },
];

// --------------------------------------------
// Preis-Filter Optionen
// --------------------------------------------

const priceOptions: { id: PriceFilter; label: string }[] = [
  { id: 'all', label: 'Alle Preise' },
  { id: 'free', label: 'Kostenlos' },
  { id: 'paid', label: 'Kostenpflichtig' },
];

// --------------------------------------------
// Bewertungs-Filter Optionen
// --------------------------------------------

const ratingOptions: { id: RatingFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: '4+', label: '4+ Sterne' },
  { id: '3+', label: '3+ Sterne' },
];

// --------------------------------------------
// Marketplace Tabs
// --------------------------------------------

// Klassische Kategorien (links), Favoriten separat ganz rechts
const marketplaceTabs: { id: MarketplaceItemType | 'my-system'; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'my-system', name: 'Mein System', icon: FolderTree },
  { id: 'apps', name: 'Bases & Module', icon: Blocks },
  { id: 'models', name: 'Modelle (LLMs)', icon: Brain },
  { id: 'integrations', name: 'Integrations', icon: Plug },
  { id: 'datasets', name: 'Datensätze', icon: Database },
];
const favoritesTab = { id: 'favorites' as const, name: 'Favoriten', icon: Heart };

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export default function LibraryPage() {
  const { surface, container, input, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  const bases = useBaseStore((state) => state.bases);
  const registryModules = useModuleRegistry((state) => state.modules).filter((module) => module.id !== 'agents' && module.id !== 'chat');
  const registerModule = useModuleRegistry((state) => state.registerModule);
  const addSidebarModule = useAppStore((state) => state.addSidebarModule);
  const openTab = useAppStore((state) => state.openTab);
  
  // Marketplace Store
  const viewMode = useMarketplaceStore((s) => s.viewMode);
  const setViewMode = useMarketplaceStore((s) => s.setViewMode);
  const installedModules = useMarketplaceStore((s) => s.installedModules);
  const wishlist = useMarketplaceStore((s) => s.wishlist);
  
  // Veröffentlichte Projekte aus dem Builder Store
  const builderProjects = useProjectsStore((state) => state.projects);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketplaceTab, setSelectedMarketplaceTab] = useState<MarketplaceItemType | 'my-system' | 'favorites'>('my-system');
  const [appsViewGroup, setAppsViewGroup] = useState<'modules' | 'bases'>('modules');
  const [moduleSubCategory, setModuleSubCategory] = useState<ModuleSubCategory>('lifeos');
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all');
  const [selectedBaseCategory, setSelectedBaseCategory] = useState<BaseCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomUrlDialog, setShowCustomUrlDialog] = useState(false);
  
  
  // --------------------------------------------
  // User-erstellte Module aus dem Module Builder
  // --------------------------------------------
  
  const userCreatedModules: MarketplaceModule[] = useMemo(() => {
    if (!builderProjects || !Array.isArray(builderProjects)) return [];
    
    return builderProjects
      .filter(p => p && p.status === 'published')
      .map((project): MarketplaceModule => ({
        id: project.moduleInfo?.id || project.id,
        name: project.moduleInfo?.name || project.name,
        slug: project.moduleInfo?.id || project.id,
        type: 'apps',
        icon: project.moduleInfo?.icon || 'Blocks',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        shortDescription: project.moduleInfo?.description || project.description || 'Selbst erstelltes Modul',
        fullDescription: project.description || 'Dieses Modul wurde mit dem Module Builder erstellt.',
        category: (project.moduleInfo?.category || 'productivity') as ModuleCategory,
        tags: ['custom', 'builder', 'user-created'],
        pricing: { type: 'free' },
        developer: { id: 'user', name: 'Du', verified: false },
        stats: { downloads: 0, rating: 0, reviewCount: 0 },
        media: { screenshots: [] },
        technical: {
          version: '1.0.0',
          size: '< 100 KB',
          minLifeOSVersion: '1.0.0',
          permissions: [],
          lastUpdated: new Date().toISOString(),
          releaseDate: new Date().toISOString(),
        },
        changelog: [],
        isNew: true,
        isUserCreated: true,
        route: `/${project.moduleInfo?.id || project.id}`,
      }));
  }, [builderProjects]);
  
  // --------------------------------------------
  // "Meine Module" - Built-in + User-Created
  // --------------------------------------------
  
  const myModules = useMemo(() => {
    return [...BUILT_IN_APPS, ...userCreatedModules];
  }, [userCreatedModules]);
  
  // --------------------------------------------
  // Alle Module fuer Favoriten-Tab (aus allen Quellen, dedupliziert)
  // --------------------------------------------
  
  const allModulesForFavorites = useMemo(() => {
    const appsModules = getModulesByType('apps').filter((m) => (m.entityType ?? 'module') !== 'base');
    const byId = new Map<string, MarketplaceModule>();
    const catalogModules = EXTERNAL_APP_CATALOG.map(externalCatalogToMarketplaceModule);
    for (const m of [...BUILT_IN_APPS, ...userCreatedModules, ...WEB_APPS, ...catalogModules, ...appsModules]) {
      byId.set(m.id, m);
    }
    for (const m of getModulesByType('models')) byId.set(m.id, m);
    for (const m of getModulesByType('integrations')) byId.set(m.id, m);
    for (const m of getModulesByType('datasets')) byId.set(m.id, m);
    return Array.from(byId.values());
  }, [userCreatedModules]);

  const cloudCatalogModules = useMemo(
    () => EXTERNAL_APP_CATALOG.map(externalCatalogToMarketplaceModule),
    []
  );
  
  // --------------------------------------------
  // Featured/Trending/New Module für aktuellen Tab
  // --------------------------------------------
  
  const featuredModules = useMemo(() => {
    if (selectedMarketplaceTab === 'my-system' || selectedMarketplaceTab === 'favorites') return [];
    const modules = getFeaturedModules(selectedMarketplaceTab);
    if (selectedMarketplaceTab !== 'apps') return modules;
    return modules.filter((module) => {
      const entityType = module.entityType ?? 'module';
      return appsViewGroup === 'bases' ? entityType === 'base' : entityType !== 'base';
    });
  }, [selectedMarketplaceTab, appsViewGroup]);
  
  const trendingModules = useMemo(() => {
    if (selectedMarketplaceTab === 'my-system' || selectedMarketplaceTab === 'favorites') return [];
    const modules = getTrendingModules(selectedMarketplaceTab);
    if (selectedMarketplaceTab !== 'apps') return modules;
    return modules.filter((module) => {
      const entityType = module.entityType ?? 'module';
      return appsViewGroup === 'bases' ? entityType === 'base' : entityType !== 'base';
    });
  }, [selectedMarketplaceTab, appsViewGroup]);
  
  const newModules = useMemo(() => {
    if (selectedMarketplaceTab === 'my-system' || selectedMarketplaceTab === 'favorites') return [];
    const modules = getNewModules(selectedMarketplaceTab);
    if (selectedMarketplaceTab !== 'apps') return modules;
    return modules.filter((module) => {
      const entityType = module.entityType ?? 'module';
      return appsViewGroup === 'bases' ? entityType === 'base' : entityType !== 'base';
    });
  }, [selectedMarketplaceTab, appsViewGroup]);
  
  // --------------------------------------------
  // Filter und Sortierung
  // --------------------------------------------
  
  const filteredModules = useMemo(() => {
    // Basis-Module je nach Tab
    let result: MarketplaceModule[] = [];
    
    if (selectedMarketplaceTab === 'my-system') {
      result = myModules;
    } else if (selectedMarketplaceTab === 'favorites') {
      result = allModulesForFavorites.filter((m) => wishlist.includes(m.id));
    } else if (selectedMarketplaceTab === 'apps') {
      if (appsViewGroup === 'bases') {
        // Bases-Ansicht – unveraendert
        result = getModulesByType('apps').filter((module) => {
          const entityType = module.entityType ?? 'module';
          return entityType === 'base';
        });
      } else {
        // Module-Ansicht mit 2 Unterkategorien: LifeOS Module + Web Apps
        switch (moduleSubCategory) {
          case 'lifeos':
            // Urspruengliche LifeOS Module (ohne Web-Apps)
            result = getModulesByType('apps').filter((module) => {
              const entityType = module.entityType ?? 'module';
              return entityType !== 'base';
            });
            break;
          case 'webapps':
            result = [...WEB_APPS, ...cloudCatalogModules];
            break;
        }
      }
    } else {
      result = getModulesByType(selectedMarketplaceTab);
    }
    
    // Suche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.shortDescription.toLowerCase().includes(query) ||
        m.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Kategorie-Filter (nur fuer LifeOS Module)
    if (selectedMarketplaceTab === 'apps' && appsViewGroup === 'modules' && moduleSubCategory === 'lifeos' && selectedCategory !== 'all') {
      result = result.filter(m => m.category === selectedCategory);
    }
    if (selectedMarketplaceTab === 'apps' && appsViewGroup === 'bases' && selectedBaseCategory !== 'all') {
      result = result.filter((module) => {
        if (module.baseCategory) {
          return module.baseCategory === selectedBaseCategory;
        }
        return module.tags.includes(selectedBaseCategory);
      });
    }
    
    // Preis-Filter
    if (priceFilter === 'free') {
      result = result.filter(m => m.pricing.type === 'free');
    } else if (priceFilter === 'paid') {
      result = result.filter(m => m.pricing.type !== 'free');
    }
    
    // Bewertungs-Filter
    if (ratingFilter === '4+') {
      result = result.filter(m => m.stats.rating >= 4);
    } else if (ratingFilter === '3+') {
      result = result.filter(m => m.stats.rating >= 3);
    }
    
    // Sortierung (nicht fuer "Meine Module")
    if (selectedMarketplaceTab !== 'my-system') {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case 'popular':
            return b.stats.downloads - a.stats.downloads;
          case 'rating':
            return b.stats.rating - a.stats.rating;
          case 'newest':
            return new Date(b.technical.releaseDate).getTime() - new Date(a.technical.releaseDate).getTime();
          case 'updated':
            return new Date(b.technical.lastUpdated).getTime() - new Date(a.technical.lastUpdated).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
    }
    
    return result;
  }, [selectedMarketplaceTab, appsViewGroup, moduleSubCategory, myModules, allModulesForFavorites, wishlist, searchQuery, selectedCategory, selectedBaseCategory, priceFilter, ratingFilter, sortBy, cloudCatalogModules]);
  
  // Statistiken
  const stats = useMemo(() => {
    const tabModules = selectedMarketplaceTab === 'my-system' 
      ? myModules 
      : selectedMarketplaceTab === 'apps'
        ? getModulesByType('apps').filter((module) => {
            const entityType = module.entityType ?? 'module';
            return appsViewGroup === 'bases' ? entityType === 'base' : entityType !== 'base';
          })
        : getModulesByType(selectedMarketplaceTab);
    return {
      total: tabModules.length,
      installed: installedModules.length,
      free: tabModules.filter(m => m.pricing.type === 'free').length,
      builtIn: BUILT_IN_APPS.length,
      userCreated: userCreatedModules.length,
    };
  }, [selectedMarketplaceTab, appsViewGroup, myModules, installedModules, userCreatedModules]);

  const assignedModuleCount = useMemo(() => {
    return new Set(bases.flatMap((base) => base.moduleIds)).size;
  }, [bases]);

  const unassignedModuleCount = useMemo(() => {
    return Math.max(registryModules.length - assignedModuleCount, 0);
  }, [assignedModuleCount, registryModules.length]);

  // Tab-Label
  const getTabLabel = () => {
    switch (selectedMarketplaceTab) {
      case 'my-system': return 'Mein System';
      case 'favorites': return 'Favoriten';
      case 'apps': return 'Bases & Module';
      case 'models': return 'AI Modelle';
      case 'integrations': return 'Integrationen';
      case 'datasets': return 'Datensätze';
    }
  };

  // Tab-Wechsel Handler
  const handleTabChange = (tabId: typeof selectedMarketplaceTab) => {
    setSelectedMarketplaceTab(tabId);
    if (tabId !== 'apps') {
      setAppsViewGroup('modules');
    }
    if (tabId !== 'my-system') {
      setModuleSubCategory('lifeos');
      setSelectedCategory('all');
      setSelectedBaseCategory('all');
    }
    setPriceFilter('all');
    setRatingFilter('all');
    setSearchQuery('');
  };
  
  // Filter zurücksetzen
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBaseCategory('all');
    setPriceFilter('all');
    setRatingFilter('all');
    setSortBy('popular');
  };
  
  // Sind Filter aktiv?
  const hasActiveCategoryFilter =
    selectedMarketplaceTab === 'apps' &&
    ((appsViewGroup === 'modules' && moduleSubCategory === 'lifeos' && selectedCategory !== 'all') ||
      (appsViewGroup === 'bases' && selectedBaseCategory !== 'all'));

  const hasActiveFilters =
    hasActiveCategoryFilter ||
    priceFilter !== 'all' ||
    ratingFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div
      className="flex h-full items-start justify-center overflow-y-auto p-4 md:p-6 pt-6 md:pt-8"
      data-agent-panel="library-root"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl"
      >
        {/* Marketplace Tabs: Klassische Kategorien links, Favoriten rechts mit Abstand */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Klassische Kategorien */}
          {marketplaceTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedMarketplaceTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                data-agent-button={`library-tab-${tab.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                style={{
                  background: isActive 
                    ? tab.id === 'my-system' ? '#8b5cf6' : accentColor 
                    : designStyle === 'brutal' 
                      ? surfaceColor 
                      : 'rgba(255,255,255,0.08)',
                  color: isActive ? '#fff' : textColor,
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' && isActive ? '2px 2px 0 #000' : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.name}</span>
                {tab.id === 'my-system' && (
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ 
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(139, 92, 246, 0.2)',
                      color: isActive ? '#fff' : '#a78bfa',
                    }}
                  >
                    {bases.length}
                  </span>
                )}
              </button>
            );
          })}
          {/* Favoriten – eigene Sektion ganz rechts, Abstand durch Border */}
          <div className="ml-auto pl-4 md:pl-6 border-l border-white/15 shrink-0">
            {(() => {
              const tab = favoritesTab;
              const Icon = tab.icon;
              const isActive = selectedMarketplaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  data-agent-button={`library-tab-${tab.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                  style={{
                    background: isActive 
                      ? '#ec4899' 
                      : designStyle === 'brutal' 
                        ? surfaceColor 
                        : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#fff' : textColor,
                    border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                    boxShadow: designStyle === 'brutal' && isActive ? '2px 2px 0 #000' : 'none',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                  {wishlist.length > 0 && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ 
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(236, 72, 153, 0.25)',
                        color: isActive ? '#fff' : '#f472b6',
                      }}
                    >
                      {wishlist.length}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        </div>

        {/* Header */}
        <div 
          className="mb-6 p-5"
          style={{
            ...container.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div 
                className="flex h-12 w-12 items-center justify-center"
                style={{
                  background: selectedMarketplaceTab === 'my-system' 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                    : selectedMarketplaceTab === 'favorites'
                      ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)'
                      : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                  boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : '0 4px 15px rgba(245, 158, 11, 0.4)',
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                }}
              >
                {selectedMarketplaceTab === 'my-system' ? (
                  <User className="h-6 w-6 text-white" />
                ) : selectedMarketplaceTab === 'favorites' ? (
                  <Heart className="h-6 w-6 text-white" />
                ) : (
                  <Library className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: textColor }}>
                  {getTabLabel()}
                </h1>
                <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                  {selectedMarketplaceTab === 'my-system' 
                    ? `${bases.length} Bases • ${registryModules.length} Module verfügbar`
                    : selectedMarketplaceTab === 'favorites'
                      ? `${wishlist.length} favorisierte Apps, Modelle & mehr`
                      : `${stats.total} verfügbar • ${stats.free} kostenlos`
                  }
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-3 flex-wrap">
              {selectedMarketplaceTab === 'favorites' ? (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(236, 72, 153, 0.15)',
                    border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  }}
                >
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-medium" style={{ color: textColor }}>
                    {wishlist.length} Favoriten
                  </span>
                </div>
              ) : selectedMarketplaceTab === 'my-system' ? (
                <>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                    }}
                  >
                    <Beaker className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium" style={{ color: textColor }}>
                      {bases.length} Bases
                    </span>
                  </div>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                    }}
                  >
                    <FolderTree className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium" style={{ color: textColor }}>
                      {unassignedModuleCount} ohne Base
                    </span>
                  </div>
                </>
              ) : (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{
                    background: designStyle === 'brutal' ? surfaceColor : 'rgba(16, 185, 129, 0.15)',
                    border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  }}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium" style={{ color: textColor }}>
                    {stats.installed} installiert
                  </span>
                </div>
              )}
            </div>
          </div>

          {selectedMarketplaceTab !== 'my-system' && (
            <>
              {/* Search & Filter */}
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: textColor, opacity: 0.4 }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-agent-input="library-search"
                    placeholder={`${getTabLabel()} durchsuchen...`}
                    className="h-11 w-full pl-11 pr-4 text-sm transition-all focus:outline-none"
                    style={{
                      ...input.base,
                      color: textColor,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4" style={{ color: textColor, opacity: 0.5 }} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all"
                  style={{
                    background: showFilters || hasActiveFilters
                      ? `${accentColor}30`
                      : designStyle === 'brutal'
                        ? surfaceColor
                        : 'rgba(255,255,255,0.1)',
                    color: showFilters || hasActiveFilters ? accentColor : textColor,
                    border: designStyle === 'brutal'
                      ? '2px solid #000'
                      : `1px solid ${hasActiveFilters ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-sm font-medium">Filter</span>
                  {hasActiveFilters && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: accentColor }}
                    />
                  )}
                </button>

                {/* View Mode Toggle */}
                <div
                  className="flex overflow-hidden rounded-lg"
                  style={{
                    background: designStyle === 'brutal' ? surfaceColor : 'rgba(255,255,255,0.1)',
                    border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <button
                    onClick={() => setViewMode('grid')}
                    className="p-2.5 transition-all"
                    style={{
                      background: viewMode === 'grid' ? accentColor : 'transparent',
                      color: viewMode === 'grid' ? '#fff' : textColor,
                    }}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className="p-2.5 transition-all"
                    style={{
                      background: viewMode === 'list' ? accentColor : 'transparent',
                      color: viewMode === 'list' ? '#fff' : textColor,
                    }}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Extended Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs" style={{ color: textColor, opacity: 0.6 }}>
                          Sortieren nach
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                          style={{
                            ...input.base,
                            color: textColor,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                          }}
                        >
                          {sortOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs" style={{ color: textColor, opacity: 0.6 }}>
                          Preis
                        </label>
                        <select
                          value={priceFilter}
                          onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                          style={{
                            ...input.base,
                            color: textColor,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                          }}
                        >
                          {priceOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs" style={{ color: textColor, opacity: 0.6 }}>
                          Bewertung
                        </label>
                        <select
                          value={ratingFilter}
                          onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                          style={{
                            ...input.base,
                            color: textColor,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                          }}
                        >
                          {ratingOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={resetFilters}
                          className="rounded-lg px-3 py-1.5 text-sm"
                          style={{ color: accentColor }}
                        >
                          Filter zurücksetzen
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {selectedMarketplaceTab === 'my-system' && (
          <BaseManager />
        )}

        {selectedMarketplaceTab !== 'my-system' && (
          <>
            {selectedMarketplaceTab === 'apps' && (
              <div className="mb-4 flex flex-col items-center gap-3">
                {/* Haupt-Toggle: Module / Bases */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {(['modules', 'bases'] as const).map((group) => {
                    const isActive = appsViewGroup === group;
                    return (
                      <button
                        key={group}
                        onClick={() => {
                          setAppsViewGroup(group);
                          setModuleSubCategory('lifeos');
                          setSelectedCategory('all');
                          setSelectedBaseCategory('all');
                        }}
                        className="rounded-full px-4 py-2 text-sm font-medium transition-all"
                        style={{
                          background: isActive ? accentColor : designStyle === 'brutal' ? surfaceColor : 'rgba(255,255,255,0.08)',
                          color: isActive ? '#fff' : textColor,
                          border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                          boxShadow: designStyle === 'brutal' && isActive ? '2px 2px 0 #000' : 'none',
                        }}
                      >
                        {group === 'modules' ? 'Module' : 'Bases'}
                      </button>
                    );
                  })}
                </div>

                {/* Unterkategorien fuer Module: LifeOS | WebApps | Native Apps */}
                {appsViewGroup === 'modules' && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {([
                      { id: 'lifeos' as ModuleSubCategory, label: 'LifeOS Module', icon: Blocks, color: '#8b5cf6' },
                      { id: 'webapps' as ModuleSubCategory, label: 'Web Apps', icon: Globe, color: '#3b82f6' },
                    ]).map((sub) => {
                      const Icon = sub.icon;
                      const isActive = moduleSubCategory === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setModuleSubCategory(sub.id);
                            setSelectedCategory('all');
                          }}
                          className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                          style={{
                            background: isActive
                              ? sub.color
                              : designStyle === 'brutal'
                                ? surfaceColor
                                : 'rgba(255,255,255,0.06)',
                            color: isActive ? '#fff' : textColor,
                            border: isActive
                              ? `1px solid ${sub.color}`
                              : designStyle === 'brutal'
                                ? '2px solid #000'
                                : '1px solid rgba(255,255,255,0.1)',
                            boxShadow: designStyle === 'brutal' && isActive ? '2px 2px 0 #000' : 'none',
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{sub.label}</span>
                          {/* Anzahl-Badge */}
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.2)' : `${sub.color}20`,
                              color: isActive ? '#fff' : sub.color,
                            }}
                          >
                            {sub.id === 'lifeos'
                              ? getModulesByType('apps').filter(m => (m.entityType ?? 'module') !== 'base').length
                              : WEB_APPS.length + cloudCatalogModules.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Kategorie-Filter Pills (nur fuer LifeOS Module) */}
            {selectedMarketplaceTab === 'apps' && appsViewGroup === 'modules' && moduleSubCategory === 'lifeos' && (
              <div className="mb-6 flex flex-wrap gap-2">
                {categoryOptions.map((category) => {
                  const Icon = category.icon;
                  const isActive = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm"
                      style={{
                        background: isActive
                          ? accentColor
                          : designStyle === 'brutal'
                            ? surfaceColor
                            : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#fff' : textColor,
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        boxShadow: designStyle === 'brutal' && isActive ? '2px 2px 0 #000' : 'none',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedMarketplaceTab === 'apps' && appsViewGroup === 'bases' && (
              <div className="mb-6 flex flex-wrap gap-2">
                {baseCategoryOptions.map((category) => {
                  const Icon = category.icon;
                  const isActive = selectedBaseCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedBaseCategory(category.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm"
                      style={{
                        background: isActive
                          ? accentColor
                          : designStyle === 'brutal'
                            ? surfaceColor
                            : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#fff' : textColor,
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        boxShadow: designStyle === 'brutal' && isActive ? '2px 2px 0 #000' : 'none',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trending Carousels – nur fuer LifeOS Module oder andere Tabs */}
            {!hasActiveFilters && (appsViewGroup !== 'modules' || moduleSubCategory === 'lifeos') && (
              <>
                {featuredModules.length > 0 && (
                  <TrendingCarousel
                    title="Editor's Choice"
                    icon="featured"
                    modules={featuredModules}
                  />
                )}

                {trendingModules.length > 0 && (
                  <TrendingCarousel
                    title="Trending diese Woche"
                    icon="trending"
                    modules={trendingModules}
                  />
                )}

                {newModules.length > 0 && (
                  <TrendingCarousel
                    title="Neu im Marketplace"
                    icon="new"
                    modules={newModules}
                  />
                )}
              </>
            )}

            {/* Info-Banner fuer WebApps */}
            {selectedMarketplaceTab === 'apps' && appsViewGroup === 'modules' && moduleSubCategory === 'webapps' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-3 rounded-xl p-4"
                style={{
                  background: designStyle === 'brutal' ? surfaceColor : 'rgba(59, 130, 246, 0.1)',
                  border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <Globe className="h-5 w-5 shrink-0 text-blue-400" />
                <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                  Web Apps laufen im Cloud-Browser-Streaming via WebRTC. Klicke auf eine App, um sie als Tab hinzuzufuegen.
                </p>
                <button
                  onClick={() => setShowCustomUrlDialog(true)}
                  className="ml-auto shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/30"
                >
                  Eigene URL
                </button>
              </motion.div>
            )}


            {hasActiveFilters ? (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                  {filteredModules.length} Ergebnisse
                </h2>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ 
                    background: moduleSubCategory === 'webapps' 
                      ? 'rgba(59, 130, 246, 0.2)' 
                      : 'rgba(139, 92, 246, 0.2)' 
                  }}
                >
                  {moduleSubCategory === 'webapps' ? (
                    <Globe className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Blocks className="h-4 w-4 text-violet-400" />
                  )}
                </div>
                <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                  {appsViewGroup === 'modules' && moduleSubCategory === 'webapps' 
                    ? 'Alle Web Apps' 
                    : `Alle ${getTabLabel()}`
                  }
                </h2>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode + selectedMarketplaceTab + appsViewGroup + moduleSubCategory + selectedCategory + selectedBaseCategory + sortBy}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={
                  viewMode === 'grid'
                    ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                    : 'flex flex-col gap-3'
                }
              >
                {filteredModules.map((module, index) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    viewMode={viewMode}
                    animationDelay={index * 0.03}
                  />
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredModules.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 text-center"
              >
                <div
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{
                    background: designStyle === 'brutal' ? surfaceColor : selectedMarketplaceTab === 'favorites' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                    border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  }}
                >
                  {selectedMarketplaceTab === 'favorites' ? (
                    <Heart className="h-10 w-10" style={{ color: 'rgba(236, 72, 153, 0.5)' }} />
                  ) : (
                    <Search className="h-10 w-10" style={{ color: textColor, opacity: 0.4 }} />
                  )}
                </div>
                <h2 className="mb-2 text-xl font-semibold" style={{ color: textColor }}>
                  {selectedMarketplaceTab === 'favorites' 
                    ? 'Noch keine Favoriten' 
                    : `Keine ${getTabLabel()} gefunden`}
                </h2>
                <p style={{ color: textColor, opacity: 0.6 }} className="mb-6">
                  {selectedMarketplaceTab === 'favorites'
                    ? 'Klicke auf das Herz bei einem Modul (Bases & Module, Modelle usw.), um es zu deinen Favoriten hinzuzufuegen.'
                    : 'Versuche einen anderen Suchbegriff oder passe deine Filter an'}
                </p>
                <button
                  onClick={() => selectedMarketplaceTab === 'favorites' ? handleTabChange('apps') : resetFilters()}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105"
                  style={{ background: accentColor }}
                >
                  {selectedMarketplaceTab === 'favorites' ? (
                    <><Blocks className="h-5 w-5" />Module entdecken</>
                  ) : (
                    <><Filter className="h-5 w-5" />Filter zurücksetzen</>
                  )}
                </button>
              </motion.div>
            )}
          </>
        )}

        {/* Bottom Spacing */}
        <div className="h-8" />
      </motion.div>

      <AddCustomUrlDialog
        isOpen={showCustomUrlDialog}
        onClose={() => setShowCustomUrlDialog(false)}
        onSubmit={({ name, url }) => {
          const catalogEntry: ExternalAppCatalogEntry = deriveExternalAppCatalogEntry(
            url,
            name
          );
          const moduleDef = createExternalAppModule(catalogEntry, url);
          registerModule(moduleDef);
          addSidebarModule(moduleDef.id);
          openTab(moduleDef.id);

          void fetch('/api/external-apps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              moduleId: moduleDef.id,
              catalogId: catalogEntry.id,
              name: moduleDef.name,
              icon: moduleDef.icon,
              color: catalogEntry.color,
              url,
              userUrl: url,
            }),
          }).catch(() => undefined);
        }}
      />
    </div>
  );
}
