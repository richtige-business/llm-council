// ============================================
// page.tsx - Modul-Detail-Seite
// 
// Zweck: Zeigt alle Details zu einem einzelnen Modul
// Route: /library/[moduleId]
// Features: Screenshots, Beschreibung, Reviews, Changelog
// ============================================

'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Plus, 
  Minus, 
  Heart,
  Shield,
  Clock,
  Download,
  Tag,
  Info,
  FileText,
  MessageSquare,
  History,
  CheckCircle,
  BadgeCheck,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useAppStore } from '@/lib/store/app-store';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { 
  getModuleById,
  getModuleBySlug, 
  getReviewsForModule,
} from '@/lib/marketplace/mock-data';
import { useModuleRegistry } from '@/lib/modules/registry';
import { useBaseStore } from '@/lib/bases/store';
import { 
  type MarketplaceModule,
  type ModuleCategory,
  formatDownloads, 
  getRelativeTime,
  CATEGORY_META,
} from '@/lib/marketplace/types';
import type { Module as RegistryModule } from '@/types';

// Komponenten
import { 
  RatingStars, 
  ModuleCard,
  PriceBadge, 
  InstallButton,
  ScreenshotCarousel,
  ReviewSection,
} from '@/components/marketplace';

// --------------------------------------------
// Icon-Resolver
// --------------------------------------------

function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.Blocks;
}

function renderModuleIcon(iconName: string, className: string) {
  const Icon = getIconComponent(iconName);
  return <Icon className={className} />;
}

function getMcpBadge(tags: string[]): {
  label: string;
  background: string;
  color: string;
} | null {
  if (tags.includes('official-mcp')) {
    return {
      label: 'Official MCP',
      background: 'rgba(16, 185, 129, 0.16)',
      color: '#34d399',
    };
  }

  if (tags.includes('community-mcp')) {
    return {
      label: 'Community MCP',
      background: 'rgba(245, 158, 11, 0.18)',
      color: '#fbbf24',
    };
  }

  if (tags.includes('web-only')) {
    return {
      label: 'Web only',
      background: 'rgba(148, 163, 184, 0.18)',
      color: '#cbd5e1',
    };
  }

  return null;
}

function normalizeCategory(category: string): ModuleCategory {
  if (category in CATEGORY_META) {
    return category as ModuleCategory;
  }

  if (category === 'business') return 'productivity';
  if (category === 'personal') return 'lifestyle';
  if (category === 'system') return 'developer';
  if (category === 'learning') return 'education';

  return 'productivity';
}

function registryModuleToMarketplaceModule(module: RegistryModule): MarketplaceModule {
  return {
    id: module.id,
    name: module.name,
    slug: module.id,
    type: 'apps',
    icon: module.icon || 'Blocks',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    shortDescription: module.description || 'Modul aus deinem System.',
    fullDescription: `# ${module.name}\n\n${module.description || 'Keine Beschreibung verfügbar.'}`,
    category: normalizeCategory(module.category),
    tags: [module.category, 'base-module'],
    pricing: { type: 'free' },
    developer: { id: 'lifeos-system', name: 'LifeOS System', verified: true },
    stats: { downloads: 0, rating: 0, reviewCount: 0 },
    media: { screenshots: [] },
    technical: {
      version: module.version || '1.0.0',
      size: 'N/A',
      minLifeOSVersion: '1.0.0',
      permissions: [],
      lastUpdated: new Date().toISOString(),
      releaseDate: new Date().toISOString(),
    },
    changelog: [],
    route: `/${module.id}`,
    entityType: 'module',
  };
}

function createUniqueBaseName(existingNames: string[], initialName: string): string {
  const normalizedExisting = new Set(existingNames.map((name) => name.toLowerCase()));
  if (!normalizedExisting.has(initialName.toLowerCase())) {
    return initialName;
  }

  let suffix = 2;
  while (normalizedExisting.has(`${initialName} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }

  return `${initialName} ${suffix}`;
}

// --------------------------------------------
// Tab-Typen
// --------------------------------------------

type DetailTab = 'description' | 'reviews' | 'changelog' | 'info';

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export default function ModuleDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  
  const { surface, container, textColor, designStyle, accentColor, surfaceColor } = useThemeStyles();
  const registryModules = useModuleRegistry((state) => state.modules);
  const assignToBase = useModuleRegistry((state) => state.assignToBase);
  const registryModule = useMemo(
    () => registryModules.find((entry) => entry.id === moduleId),
    [registryModules, moduleId]
  );
  const bases = useBaseStore((state) => state.bases);
  const createBase = useBaseStore((state) => state.createBase);
  const getBaseByModuleId = useBaseStore((state) => state.getBaseByModuleId);
  
  // Module finden
  const resolvedModule = useMemo(() => {
    const marketplaceModule = getModuleBySlug(moduleId) ?? getModuleById(moduleId);
    if (marketplaceModule) {
      return marketplaceModule;
    }

    if (registryModule) {
      return registryModuleToMarketplaceModule(registryModule);
    }

    return null;
  }, [moduleId, registryModule]);
  const reviews = useMemo(
    () => (resolvedModule ? getReviewsForModule(resolvedModule.id) : []),
    [resolvedModule]
  );
  const resolvedModuleId = resolvedModule?.id ?? moduleId;
  const isBaseTemplate = resolvedModule?.entityType === 'base';
  const includedBaseModules = useMemo(() => {
    if (!resolvedModule || !isBaseTemplate || !resolvedModule.includedModules?.length) {
      return [];
    }

    return resolvedModule.includedModules
      .map((includedId) => {
        const marketplaceModule = getModuleById(includedId);
        if (marketplaceModule) {
          return marketplaceModule;
        }

        const registryEntry = registryModules.find((entry) => entry.id === includedId);
        return registryEntry ? registryModuleToMarketplaceModule(registryEntry) : null;
      })
      .filter((entry): entry is MarketplaceModule => entry !== null);
  }, [resolvedModule, isBaseTemplate, registryModules]);
  
  // Store States
  const isInWishlist = useMarketplaceStore((s) => s.wishlist.includes(resolvedModuleId));
  const toggleWishlist = useMarketplaceStore((s) => s.toggleWishlist);
  const isInstalled = useMarketplaceStore((s) => s.installedModules.includes(resolvedModuleId));
  
  // Sidebar
  const sidebarModules = useAppStore((state) => state.sidebarModules);
  const toggleSidebarModule = useAppStore((state) => state.toggleSidebarModule);
  const isInSidebar = sidebarModules.includes(resolvedModuleId);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<DetailTab>('description');
  const [baseActionInfo, setBaseActionInfo] = useState<string | null>(null);
  const tabs: { id: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'description', label: 'Beschreibung', icon: FileText },
    { id: 'reviews', label: 'Bewertungen', icon: MessageSquare },
    { id: 'changelog', label: 'Changelog', icon: History },
    { id: 'info', label: 'Infos', icon: Info },
  ];
  
  // 404 wenn Modul nicht gefunden
  if (!resolvedModule) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div 
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(239, 68, 68, 0.15)' }}
          >
            <LucideIcons.AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
            {t('library.moduleNotFound')}
          </h1>
          <p className="mb-6" style={{ color: textColor, opacity: 0.6 }}>
            {t('library.moduleMissingText')}
          </p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white"
            style={{ background: accentColor }}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('library.backToLibrary')}
          </Link>
        </motion.div>
      </div>
    );
  }
  
  const categoryMeta = CATEGORY_META[resolvedModule.category];
  const canAddToSidebar = !isBaseTemplate && !['agents', 'chat', 'lab', 'training'].includes(resolvedModule.id);
  const mcpBadge = getMcpBadge(resolvedModule.tags);

  const handleAdoptBaseTemplate = () => {
    if (!isBaseTemplate) return;

    const includedModuleIds = resolvedModule.includedModules ?? [];
    const availableModuleIds = includedModuleIds.filter((id) =>
      registryModules.some((entry) => entry.id === id)
    );

    const conflictingModuleNames = availableModuleIds
      .map((id) => {
        const assignedBase = getBaseByModuleId(id);
        if (!assignedBase) return null;

        const assignedModule = registryModules.find((entry) => entry.id === id);
        return assignedModule ? `${assignedModule.name} (${assignedBase.name})` : `${id} (${assignedBase.name})`;
      })
      .filter((entry): entry is string => entry !== null);

    if (conflictingModuleNames.length > 0) {
      const confirmed = window.confirm(
        `Diese Module sind bereits anderen Bases zugeordnet und werden verschoben:\n\n${conflictingModuleNames.join('\n')}\n\nFortfahren?`
      );
      if (!confirmed) {
        return;
      }
    }

    const baseLabel = resolvedModule.name.replace(/^Base:\s*/i, '').trim() || resolvedModule.name;
    const nextBaseName = createUniqueBaseName(
      bases.map((entry) => entry.name),
      baseLabel
    );

    const createdBaseId = createBase({
      name: nextBaseName,
      description: resolvedModule.shortDescription,
      icon: resolvedModule.icon,
      color: resolvedModule.color,
    });

    for (const includedModuleId of availableModuleIds) {
      assignToBase(includedModuleId, createdBaseId);
    }

    const missingCount = includedModuleIds.length - availableModuleIds.length;
    if (missingCount > 0) {
      setBaseActionInfo(
        `Base "${nextBaseName}" übernommen. ${availableModuleIds.length} Module zugeordnet, ${missingCount} aktuell nicht verfügbar.`
      );
      return;
    }

    setBaseActionInfo(`Base "${nextBaseName}" wurde erfolgreich übernommen.`);
  };
  
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-4 md:p-6 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl"
      >
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-sm font-medium transition-all hover:gap-3"
          style={{ color: textColor, opacity: 0.7 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>
        
        {/* Header Card */}
        <div 
          className="p-6 mb-6"
          style={{
            ...container.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
          }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Icon */}
            <div
              className="relative flex w-24 h-24 items-center justify-center shrink-0 mx-auto md:mx-0"
              style={{
                background: resolvedModule.media?.icon
                  ? 'rgba(255,255,255,0.04)'
                  : resolvedModule.gradient || `linear-gradient(135deg, ${resolvedModule.color}, ${resolvedModule.color}cc)`,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
                boxShadow: designStyle === 'brutal' 
                  ? '4px 4px 0 #000' 
                  : `0 8px 30px ${resolvedModule.color}40`,
                border: designStyle === 'brutal' ? '3px solid #000' : 'none',
              }}
            >
              {renderModuleIcon(resolvedModule.icon, 'absolute h-12 w-12 text-white')}
              {resolvedModule.media?.icon ? (
                <img
                  src={resolvedModule.media.icon}
                  alt={resolvedModule.name}
                  className="h-16 w-16 rounded-2xl object-cover"
                  onError={(event) => {
                    const target = event.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                renderModuleIcon(resolvedModule.icon, 'h-12 w-12 text-white')
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  {/* Name + Badges */}
                  <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start mb-2">
                    <h1 
                      className="text-2xl font-bold"
                      style={{ color: textColor }}
                    >
                      {resolvedModule.name}
                    </h1>
                    {(isInstalled || resolvedModule.isBuiltIn) && (
                      <span 
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {resolvedModule.isBuiltIn ? 'Integriert' : 'Installiert'}
                      </span>
                    )}
                    {mcpBadge && (
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: mcpBadge.background,
                          color: mcpBadge.color,
                        }}
                      >
                        <Shield className="w-3 h-3" />
                        {mcpBadge.label}
                      </span>
                    )}
                  </div>
                  
                  {/* Developer */}
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                    <span style={{ color: textColor, opacity: 0.6 }}>
                      von {resolvedModule.developer.name}
                    </span>
                    {resolvedModule.developer.verified && (
                      <BadgeCheck className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap">
                    <RatingStars 
                      rating={resolvedModule.stats.rating} 
                      size="md"
                      reviewCount={resolvedModule.stats.reviewCount}
                      textColor={textColor}
                    />
                    <span style={{ color: textColor, opacity: 0.5 }}>•</span>
                    <span style={{ color: textColor, opacity: 0.6 }} className="text-sm">
                      {formatDownloads(resolvedModule.stats.downloads)} Downloads
                    </span>
                  </div>
                </div>
                
                {/* Price Badge */}
                <div className="flex flex-col items-center md:items-end gap-2">
                  <PriceBadge pricing={resolvedModule.pricing} size="lg" designStyle={designStyle} />
                  
                  {/* Category */}
                  <span 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{ 
                      background: `${categoryMeta.color}20`,
                      color: categoryMeta.color,
                    }}
                  >
                    <Tag className="w-3 h-3" />
                    {categoryMeta.label}
                  </span>
                </div>
              </div>
              
              {/* Short Description */}
              <p 
                className="mt-4 text-sm"
                style={{ color: textColor, opacity: 0.8 }}
              >
                {resolvedModule.shortDescription}
              </p>
              
              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                {isBaseTemplate ? (
                  <>
                    <button
                      onClick={handleAdoptBaseTemplate}
                      className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all hover:scale-105 text-white"
                      style={{
                        background: accentColor,
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Diese Base übernehmen
                    </button>
                  </>
                ) : (
                  <>
                    <InstallButton 
                      moduleId={resolvedModule.id}
                      isBuiltIn={resolvedModule.isBuiltIn}
                      size="lg"
                    />

                    {canAddToSidebar && (
                      <button
                        onClick={() => toggleSidebarModule(resolvedModule.id)}
                        className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all hover:scale-105"
                        style={{
                          background: isInSidebar 
                            ? 'rgba(239, 68, 68, 0.15)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          color: isInSidebar ? '#f87171' : textColor,
                          border: designStyle === 'brutal' ? '2px solid #000' : `1px solid ${isInSidebar ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
                        }}
                      >
                        {isInSidebar ? (
                          <><Minus className="w-4 h-4" /><span>Aus Sidebar</span></>
                        ) : (
                          <><Plus className="w-4 h-4" /><span>Zur Sidebar</span></>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => toggleWishlist(resolvedModule.id)}
                      className="flex items-center justify-center w-12 h-12 rounded-lg transition-all hover:scale-105"
                      style={{
                        background: isInWishlist ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                        border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <Heart 
                        className={`w-5 h-5 ${isInWishlist ? 'fill-red-400 text-red-400' : ''}`}
                        style={{ color: isInWishlist ? '#f87171' : textColor }}
                      />
                    </button>
                  </>
                )}
              </div>

              {isBaseTemplate && baseActionInfo && (
                <p className="mt-3 text-xs" style={{ color: textColor, opacity: 0.75 }}>
                  {baseActionInfo}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Screenshots */}
        {resolvedModule.media.screenshots.length > 0 && (
          <div className="mb-6">
            <ScreenshotCarousel 
              screenshots={resolvedModule.media.screenshots}
              moduleName={resolvedModule.name}
            />
          </div>
        )}
        
        {/* Tabs */}
        <div className="mb-6">
          <div 
            className="flex gap-1 p-1 rounded-xl overflow-x-auto"
            style={{
              background: designStyle === 'brutal' ? surfaceColor : 'rgba(255, 255, 255, 0.05)',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all flex-1 justify-center whitespace-nowrap"
                  style={{
                    background: isActive ? accentColor : 'transparent',
                    color: isActive ? '#fff' : textColor,
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                  {tab.id === 'reviews' && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ 
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {reviews.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* Description Tab */}
          {activeTab === 'description' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
              }}
            >
              {/* Tags */}
              {resolvedModule.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {resolvedModule.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: textColor,
                        opacity: 0.7,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {isBaseTemplate && (
                <div className="mb-8">
                  <h3 className="mb-3 text-base font-semibold" style={{ color: textColor }}>
                    Enthaltene Module
                  </h3>
                  {includedBaseModules.length === 0 ? (
                    <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                      Für diese Base sind aktuell keine Module hinterlegt.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {includedBaseModules.map((includedModule, index) => (
                        <ModuleCard
                          key={includedModule.id}
                          module={includedModule}
                          viewMode="grid"
                          animationDelay={index * 0.03}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Markdown Content (simple rendering) */}
              <div 
                className="prose prose-invert max-w-none"
                style={{ color: textColor }}
              >
                {resolvedModule.fullDescription.split('\n').map((line, i) => {
                  // Headers
                  if (line.startsWith('# ')) {
                    return (
                      <h1 key={i} className="text-2xl font-bold mt-6 mb-4" style={{ color: textColor }}>
                        {line.slice(2)}
                      </h1>
                    );
                  }
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={i} className="text-xl font-semibold mt-5 mb-3" style={{ color: textColor }}>
                        {line.slice(3)}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={i} className="text-lg font-medium mt-4 mb-2" style={{ color: textColor }}>
                        {line.slice(4)}
                      </h3>
                    );
                  }
                  // List items
                  if (line.startsWith('- ')) {
                    const content = line.slice(2);
                    // Bold text **text**
                    const parts = content.split(/\*\*(.*?)\*\*/g);
                    return (
                      <li key={i} className="ml-4 mb-1" style={{ color: textColor, opacity: 0.8 }}>
                        {parts.map((part, j) => 
                          j % 2 === 1 
                            ? <strong key={j}>{part}</strong> 
                            : part
                        )}
                      </li>
                    );
                  }
                  // Empty line
                  if (line.trim() === '') {
                    return <br key={i} />;
                  }
                  // Paragraph
                  return (
                    <p key={i} className="mb-2" style={{ color: textColor, opacity: 0.8 }}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </motion.div>
          )}
          
          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ReviewSection
                moduleId={resolvedModule.id}
                moduleName={resolvedModule.name}
                reviews={reviews}
                averageRating={resolvedModule.stats.rating}
                totalReviews={resolvedModule.stats.reviewCount}
              />
            </motion.div>
          )}
          
          {/* Changelog Tab */}
          {activeTab === 'changelog' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {resolvedModule.changelog.length === 0 ? (
                <div 
                  className="p-6 text-center"
                  style={{
                    ...surface.base,
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                  }}
                >
                  <p style={{ color: textColor, opacity: 0.5 }}>
                    Noch keine Changelog-Einträge verfügbar.
                  </p>
                </div>
              ) : (
                resolvedModule.changelog.map((entry, i) => (
                  <div
                    key={entry.version}
                    className="p-5"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-semibold"
                        style={{ background: `${accentColor}30`, color: accentColor }}
                      >
                        v{entry.version}
                      </span>
                      <span 
                        className="text-sm"
                        style={{ color: textColor, opacity: 0.5 }}
                      >
                        {getRelativeTime(entry.date)}
                      </span>
                      {i === 0 && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                        >
                          Aktuell
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {entry.changes.map((change, j) => (
                        <li 
                          key={j}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: textColor, opacity: 0.8 }}
                        >
                          <span style={{ color: accentColor }}>•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </motion.div>
          )}
          
          {/* Info Tab */}
          {activeTab === 'info' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
              }}
            >
              <h3 
                className="text-lg font-semibold mb-4"
                style={{ color: textColor }}
              >
                Technische Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Version */}
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                  >
                    <Tag className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>Version</p>
                    <p className="font-medium" style={{ color: textColor }}>{resolvedModule.technical.version}</p>
                  </div>
                </div>
                
                {/* Size */}
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{ background: 'rgba(59, 130, 246, 0.15)' }}
                  >
                    <Download className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>Größe</p>
                    <p className="font-medium" style={{ color: textColor }}>{resolvedModule.technical.size}</p>
                  </div>
                </div>
                
                {/* Last Updated */}
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                  >
                    <Clock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>Zuletzt aktualisiert</p>
                    <p className="font-medium" style={{ color: textColor }}>
                      {getRelativeTime(resolvedModule.technical.lastUpdated)}
                    </p>
                  </div>
                </div>
                
                {/* Min Version */}
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{ background: 'rgba(245, 158, 11, 0.15)' }}
                  >
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>Mindestversion</p>
                    <p className="font-medium" style={{ color: textColor }}>
                      LifeOS {resolvedModule.technical.minLifeOSVersion}+
                    </p>
                  </div>
                </div>
              </div>

              {isBaseTemplate && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3" style={{ color: textColor }}>
                    Base-Komposition
                  </h4>
                  <p className="text-sm mb-3" style={{ color: textColor, opacity: 0.75 }}>
                    {resolvedModule.includedModules?.length ?? 0} Module in dieser Base-Vorlage.
                  </p>
                  <ul className="space-y-2">
                    {(resolvedModule.includedModules ?? []).map((entry) => (
                      <li key={entry} className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                        • {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Permissions */}
              {resolvedModule.technical.permissions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 
                    className="font-medium mb-3"
                    style={{ color: textColor }}
                  >
                    Benötigte Berechtigungen
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {resolvedModule.technical.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-3 py-1.5 rounded-lg text-sm"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: textColor,
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Developer Info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 
                  className="font-medium mb-3"
                  style={{ color: textColor }}
                >
                  Entwickler
                </h4>
                <div className="flex items-center gap-3">
                  {resolvedModule.developer.avatar ? (
                    <img 
                      src={resolvedModule.developer.avatar} 
                      alt={resolvedModule.developer.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: accentColor }}
                    >
                      <span className="text-white font-bold">
                        {resolvedModule.developer.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: textColor }}>
                        {resolvedModule.developer.name}
                      </span>
                      {resolvedModule.developer.verified && (
                        <BadgeCheck className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    {resolvedModule.developer.website && (
                      <a 
                        href={resolvedModule.developer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm hover:underline"
                        style={{ color: accentColor }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Bottom Spacing */}
        <div className="h-8" />
      </motion.div>
    </div>
  );
}
