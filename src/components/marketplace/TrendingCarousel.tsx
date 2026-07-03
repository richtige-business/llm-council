// ============================================
// TrendingCarousel.tsx - Horizontal-Scroll Sektion
// 
// Zweck: Zeigt Trending/Featured Module als horizontales Carousel
// Verwendet von: Library Page
// ============================================

'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import type { MarketplaceModule } from '@/lib/marketplace/types';
import { formatDownloads } from '@/lib/marketplace/types';
import { RatingStars } from './RatingStars';
import { PriceBadge } from './PriceBadge';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface TrendingCarouselProps {
  // Titel der Sektion
  title: string;
  // Icon für den Titel
  icon: 'trending' | 'featured' | 'new';
  // Module zum Anzeigen
  modules: MarketplaceModule[];
}

// --------------------------------------------
// Icon-Mapping für Titel
// --------------------------------------------

const titleIconMap = {
  trending: TrendingUp,
  featured: Sparkles,
  new: Clock,
};

const titleColorMap = {
  trending: '#ef4444',
  featured: '#f59e0b',
  new: '#22c55e',
};

// --------------------------------------------
// Icon-Resolver
// --------------------------------------------

function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.Blocks;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function TrendingCarousel({ 
  title, 
  icon, 
  modules,
}: TrendingCarouselProps) {
  const { surface, textColor, designStyle, accentColor } = useThemeStyles();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const TitleIcon = titleIconMap[icon];
  const iconColor = titleColorMap[icon];
  
  // Scroll-Handler
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 320; // Kartenbreite + Gap
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };
  
  if (modules.length === 0) return null;
  
  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: `${iconColor}20` }}
          >
            <TitleIcon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <h2 
            className="text-lg font-semibold"
            style={{ color: textColor }}
          >
            {title}
          </h2>
        </div>
        
        {/* Scroll Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: designStyle === 'brutal' ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: textColor }} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: designStyle === 'brutal' ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: textColor }} />
          </button>
        </div>
      </div>
      
      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {modules.map((module, index) => {
          const IconComponent = getIconComponent(module.icon);
          
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{ scrollSnapAlign: 'start' }}
            >
              <Link href={`/library/${module.slug}`}>
                <div
                  className="group relative w-72 p-4 transition-all duration-300 hover:scale-[1.02] shrink-0"
                  style={{
                    ...surface.base,
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                  }}
                >
                  {/* Background Gradient */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: module.gradient 
                        ? `${module.gradient.replace('100%)', '100%, 0.08)')}` 
                        : `linear-gradient(135deg, ${module.color}10, transparent)`,
                      borderRadius: 'inherit',
                    }}
                  />
                  
                  {/* Content */}
                  <div className="relative flex gap-3">
                    {/* Icon */}
                    <div
                      className="flex w-12 h-12 items-center justify-center shrink-0"
                      style={{
                        background: module.gradient || `linear-gradient(135deg, ${module.color}, ${module.color}cc)`,
                        borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                        boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : `0 4px 12px ${module.color}30`,
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                      }}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-semibold truncate"
                        style={{ color: textColor }}
                      >
                        {module.name}
                      </h3>
                      <p 
                        className="text-xs truncate"
                        style={{ color: textColor, opacity: 0.5 }}
                      >
                        {module.developer.name}
                      </p>
                    </div>
                    
                    {/* Price Badge */}
                    <PriceBadge pricing={module.pricing} size="sm" designStyle={designStyle} />
                  </div>
                  
                  {/* Description */}
                  <p 
                    className="relative text-sm mt-3 line-clamp-2"
                    style={{ color: textColor, opacity: 0.7 }}
                  >
                    {module.shortDescription}
                  </p>
                  
                  {/* Footer */}
                  <div className="relative flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <RatingStars 
                      rating={module.stats.rating} 
                      size="sm"
                      reviewCount={module.stats.reviewCount}
                      textColor={textColor}
                    />
                    
                    {module.stats.weeklyGrowth && module.stats.weeklyGrowth > 0 && (
                      <span 
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: '#22c55e' }}
                      >
                        <TrendingUp className="w-3 h-3" />
                        +{module.stats.weeklyGrowth}%
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
      
      {/* Hide Scrollbar Style */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}


