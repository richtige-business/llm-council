// ============================================
// ModuleCard.tsx - Modul-Karte für Grid-Ansicht
// 
// Zweck: Zeigt ein Modul als Karte im Marketplace-Grid
// Verwendet von: Library Page, TrendingCarousel
// ============================================

'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Heart, TrendingUp, Sparkles, Beaker, Globe } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { useAppStore } from '@/lib/store/app-store';
import { useModuleRegistry } from '@/lib/modules/registry';
import { createExternalAppModule, createWebAppModule } from '@/lib/external-apps';
import type { ExternalAppCatalogEntry } from '@/lib/external-apps';
import type { MarketplaceModule } from '@/lib/marketplace/types';
import { formatDownloads } from '@/lib/marketplace/types';
import { RatingStars } from './RatingStars';
import { PriceBadge } from './PriceBadge';
import { AddToSidebarDropdown } from './AddToSidebarDropdown';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface ModuleCardProps {
  module: MarketplaceModule;
  // Ansichts-Modus
  viewMode?: 'grid' | 'list';
  // Animation-Delay für staggered animation
  animationDelay?: number;
}

// --------------------------------------------
// Icon-Resolver
// Holt das passende Lucide-Icon
// --------------------------------------------

function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.Blocks;
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

// --------------------------------------------
// Komponente
// --------------------------------------------

export function ModuleCard({ 
  module, 
  viewMode = 'grid',
  animationDelay = 0,
}: ModuleCardProps) {
  const { surface, accentColor, textColor, designStyle, surfaceColor } = useThemeStyles();
  
  // Store States
  const isInstalled = useMarketplaceStore((s) => s.installedModules.includes(module.id));
  const isInWishlist = useMarketplaceStore((s) => s.wishlist.includes(module.id));
  const toggleWishlist = useMarketplaceStore((s) => s.toggleWishlist);
  
  // Sidebar Module State
  const sidebarModules = useAppStore((state) => state.sidebarModules);
  const addSidebarModule = useAppStore((state) => state.addSidebarModule);
  const openTab = useAppStore((state) => state.openTab);
  const isInSidebar = sidebarModules.includes(module.id);
  
  // Module Registry fuer dynamische Registrierung
  const registerModule = useModuleRegistry((s) => s.registerModule);
  const registryModules = useModuleRegistry((s) => s.modules);
  
  // Icon-Komponente holen
  const IconComponent = getIconComponent(module.icon);
  const mcpBadge = getMcpBadge(module.tags);
  
  // Bestimmte Module nicht zur Sidebar hinzufuegbar
  const canAddToSidebar = !['agents', 'chat', 'lab', 'training'].includes(module.id);
  
  // Pruefen ob Web-App bereits als Modul registriert ist
  const legacyWebAppModuleId = module.isWebApp
    ? `webapp-${module.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : null;
  const externalAppModuleId = module.isWebApp
    ? `extapp-${(module.slug || module.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : null;
  const resolvedWebAppModuleId = externalAppModuleId || legacyWebAppModuleId;
  const isWebAppRegistered = resolvedWebAppModuleId
    ? registryModules.some((m) => m.id === resolvedWebAppModuleId || m.id === legacyWebAppModuleId)
    : false;
  
  // ----------------------------------------
  // Klick-Handler fuer Web Apps
  // Registriert die App als Modul, oeffnet Docker-Container-Tab
  // ----------------------------------------
  const handleWebAppClick = useCallback(async () => {
    if (!resolvedWebAppModuleId || !module.route) return;

    // 1. Modul in Registry registrieren (falls noch nicht vorhanden)
    if (!isWebAppRegistered && module.isWebApp) {
      const catalogEntry: ExternalAppCatalogEntry = {
        id: module.slug || module.id.replace(/^extapp-/, '').replace(/^webapp-/, ''),
        name: module.name,
        icon: module.icon,
        color: module.color,
        gradient: module.gradient || `linear-gradient(135deg, ${module.color} 0%, ${module.color}99 100%)`,
        url: module.route,
        category: 'other',
        description: module.shortDescription,
        allowCustomUrl: true,
      };
      const cloudModule = createExternalAppModule(catalogEntry, module.route);
      registerModule(cloudModule);

      // Legacy-Backup fuer bestehende Flows mit webapp-* Prefix
      const iconUrl =
        module.media?.icon ||
        `https://www.google.com/s2/favicons?domain=${new URL(module.route).hostname}&sz=128`;
      registerModule(createWebAppModule(module.name, module.route, iconUrl));
    }

    // 2. Persistenz auf dem Server aktualisieren
    void fetch('/api/external-apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: resolvedWebAppModuleId,
        catalogId: module.slug || module.id.replace(/^extapp-/, '').replace(/^webapp-/, ''),
        name: module.name,
        icon: module.icon,
        color: module.color,
        url: module.route,
        userUrl: module.route,
      }),
    }).catch(() => undefined);

    // 3. Zur Sidebar hinzufuegen
    addSidebarModule(resolvedWebAppModuleId);

    // 4. Tab oeffnen (Cloud-Streaming startet automatisch)
    openTab(resolvedWebAppModuleId);
  }, [resolvedWebAppModuleId, module, isWebAppRegistered, registerModule, addSidebarModule, openTab]);
  
  // Ziel-URL bestimmen:
  // - Web Apps → kein Link, onClick Handler
  // - Built-in Module → direkt zur App
  // - User-Created Module → direkt zur App
  // - Marketplace Module → zur Detail-Seite
  const href = module.isWebApp
    ? '#'
    : (module.isBuiltIn || module.isUserCreated) && module.route 
      ? module.route 
      : `/library/${module.slug}`;
  
  // onClick fuer Web-Apps
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (module.isWebApp) {
      e.preventDefault();
      handleWebAppClick();
    }
  }, [module.isWebApp, handleWebAppClick]);
  
  // --------------------------------------------
  // Grid-Ansicht
  // --------------------------------------------
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationDelay, duration: 0.3 }}
      >
        <Link href={href} onClick={handleCardClick}>
          <div
            data-agent-card={module.id}
            className="group relative overflow-hidden p-5 transition-all duration-300 hover:scale-[1.02]"
            style={{
              ...surface.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            }}
          >
            {/* Gradient Glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: module.gradient 
                  ? `${module.gradient.replace('100%)', '100%, 0.1)')}` 
                  : `linear-gradient(135deg, ${module.color}15, transparent)`,
              }}
            />
            
            {/* Badges (Trending, Featured) – links */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              {module.isTrending && (
                <span 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                >
                  <TrendingUp className="w-3 h-3" />
                </span>
              )}
              {module.isFeatured && (
                <span 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}
                >
                  <Sparkles className="w-3 h-3" />
                </span>
              )}
            </div>
            
            {/* Heart (Favoriten) + Plus (Sidebar/Base) – oben rechts */}
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWishlist(module.id);
                }}
                className="flex items-center justify-center p-1.5 rounded-full transition-all hover:scale-110"
                style={{
                  background: isInWishlist ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Heart 
                  className={`w-4 h-4 ${isInWishlist ? 'fill-red-400 text-red-400' : ''}`}
                  style={{ color: isInWishlist ? '#f87171' : textColor }}
                />
              </button>
              <AddToSidebarDropdown
                moduleId={module.id}
                isInSidebar={isInSidebar}
                canAddToSidebar={canAddToSidebar}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                accentColor={accentColor}
                textColor={textColor}
              />
            </div>
            
            {/* Icon – Echtes App-Icon oder Lucide-Fallback */}
            <div
              className="relative flex w-14 h-14 items-center justify-center mb-4 overflow-hidden"
              style={{
                background: module.media?.icon 
                  ? 'transparent' 
                  : module.gradient || `linear-gradient(135deg, ${module.color}, ${module.color}cc)`,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
                boxShadow: designStyle === 'brutal' 
                  ? '3px 3px 0 #000' 
                  : module.media?.icon 
                    ? `0 4px 15px rgba(0,0,0,0.2)` 
                    : `0 4px 15px ${module.color}40`,
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              }}
            >
              {module.media?.icon ? (
                <img 
                  src={module.media.icon} 
                  alt={module.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback: Lucide-Icon anzeigen bei Ladefehler
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.style.background = module.gradient || `linear-gradient(135deg, ${module.color}, ${module.color}cc)`;
                    }
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <IconComponent className="w-7 h-7 text-white" />
              )}
            </div>
            
            {/* Content */}
            <div className="relative">
              {/* Name + Status Badge */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: textColor }}
                >
                  {module.name}
                </h3>
                {module.isUserCreated && (
                  <span 
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#a78bfa',
                    }}
                  >
                    <Beaker className="w-3 h-3" />
                    Selbst erstellt
                  </span>
                )}
                {module.isBuiltIn && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#22c55e',
                    }}
                  >
                    Built-in
                  </span>
                )}
                {module.isWebApp && (
                  <span 
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: isWebAppRegistered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                      color: isWebAppRegistered ? '#10b981' : '#3b82f6',
                    }}
                  >
                    <Globe className="w-3 h-3" />
                    {isWebAppRegistered ? 'Aktiv' : 'Web App'}
                  </span>
                )}
                {mcpBadge && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: mcpBadge.background,
                      color: mcpBadge.color,
                    }}
                  >
                    {mcpBadge.label}
                  </span>
                )}
                {isInstalled && !module.isBuiltIn && !module.isUserCreated && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#22c55e',
                    }}
                  >
                    Installiert
                  </span>
                )}
              </div>
              
              {/* Developer */}
              <p 
                className="text-xs mb-2"
                style={{ color: textColor, opacity: 0.5 }}
              >
                von {module.developer.name}
                {module.developer.verified && ' ✓'}
              </p>
              
              {/* Description */}
              <p 
                className="text-sm line-clamp-2 mb-3"
                style={{ color: textColor, opacity: 0.7 }}
              >
                {module.shortDescription}
              </p>
              
              {/* Footer: Rating, Downloads, Price */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <RatingStars 
                    rating={module.stats.rating} 
                    size="sm"
                    reviewCount={module.stats.reviewCount}
                    textColor={textColor}
                  />
                </div>
                <PriceBadge pricing={module.pricing} size="sm" designStyle={designStyle} />
              </div>
              
              {/* Downloads */}
              <p 
                className="text-xs mt-2"
                style={{ color: textColor, opacity: 0.5 }}
              >
                {formatDownloads(module.stats.downloads)} Downloads
              </p>
            </div>
            
            {/* Arrow */}
            <ArrowRight 
              className="absolute bottom-5 right-5 w-4 h-4 opacity-30 group-hover:opacity-70 transition-all group-hover:translate-x-1"
              style={{ color: textColor }}
            />
          </div>
        </Link>
      </motion.div>
    );
  }
  
  // --------------------------------------------
  // List-Ansicht
  // --------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
    >
      <Link href={href} onClick={handleCardClick}>
        <div
          data-agent-card={module.id}
          className="group relative overflow-hidden p-4 flex items-center gap-4 transition-all duration-300"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
          }}
        >
          {/* Icon – Echtes App-Icon oder Lucide-Fallback */}
          <div
            className="relative flex w-12 h-12 items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: module.media?.icon 
                ? 'transparent' 
                : module.gradient || `linear-gradient(135deg, ${module.color}, ${module.color}cc)`,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
              boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : undefined,
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            }}
          >
            {module.media?.icon ? (
              <img 
                src={module.media.icon} 
                alt={module.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.style.background = module.gradient || `linear-gradient(135deg, ${module.color}, ${module.color}cc)`;
                  }
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <IconComponent className="w-6 h-6 text-white" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 
                className="font-semibold"
                style={{ color: textColor }}
              >
                {module.name}
              </h3>
              {module.isTrending && (
                <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              )}
              {module.isUserCreated && (
                <span 
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#a78bfa',
                  }}
                >
                  <Beaker className="w-3 h-3" />
                </span>
              )}
              {module.isBuiltIn && (
                <span 
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                  }}
                >
                  Built-in
                </span>
              )}
              {module.isWebApp && (
                <span 
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: isWebAppRegistered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isWebAppRegistered ? '#10b981' : '#3b82f6',
                  }}
                >
                  <Globe className="w-3 h-3" />
                </span>
              )}
              {mcpBadge && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: mcpBadge.background,
                    color: mcpBadge.color,
                  }}
                >
                  {mcpBadge.label}
                </span>
              )}
              {isInstalled && !module.isBuiltIn && !module.isUserCreated && (
                <span 
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                  }}
                >
                  ✓
                </span>
              )}
            </div>
            <p 
              className="text-sm truncate"
              style={{ color: textColor, opacity: 0.6 }}
            >
              {module.shortDescription}
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            <RatingStars 
              rating={module.stats.rating} 
              size="sm"
              textColor={textColor}
            />
            <PriceBadge pricing={module.pricing} size="sm" designStyle={designStyle} />
          </div>
          
          {/* Heart + Plus (Sidebar/Base) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(module.id);
              }}
              className="flex items-center justify-center p-1.5 rounded-full transition-all hover:scale-110"
              style={{
                background: isInWishlist ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Heart 
                className={`w-4 h-4 ${isInWishlist ? 'fill-red-400 text-red-400' : ''}`}
                style={{ color: isInWishlist ? '#f87171' : textColor }}
              />
            </button>
            <AddToSidebarDropdown
              moduleId={module.id}
              isInSidebar={isInSidebar}
              canAddToSidebar={canAddToSidebar}
              designStyle={designStyle}
              surfaceColor={surfaceColor}
              accentColor={accentColor}
              textColor={textColor}
            />
          </div>
          
          <ArrowRight 
            className="shrink-0 w-4 h-4 opacity-30 group-hover:opacity-70 transition-all group-hover:translate-x-1"
            style={{ color: textColor }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

