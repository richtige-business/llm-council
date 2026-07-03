// ============================================
// ScreenshotCarousel.tsx - Screenshot-Galerie
// 
// Zweck: Zeigt Screenshots eines Moduls als Carousel mit Lightbox
// Verwendet von: ModuleDetail Page
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import Image from 'next/image';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface ScreenshotCarouselProps {
  // Screenshot-URLs
  screenshots: string[];
  // Modul-Name für Alt-Text
  moduleName: string;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function ScreenshotCarousel({ 
  screenshots, 
  moduleName,
}: ScreenshotCarouselProps) {
  const { surface, textColor, designStyle, accentColor } = useThemeStyles();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  if (screenshots.length === 0) {
    return (
      <div 
        className="flex items-center justify-center h-48 rounded-xl"
        style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px dashed rgba(255, 255, 255, 0.2)',
        }}
      >
        <p style={{ color: textColor, opacity: 0.5 }}>
          Keine Screenshots verfügbar
        </p>
      </div>
    );
  }
  
  // Navigation
  const goTo = (index: number) => {
    if (index < 0) {
      setCurrentIndex(screenshots.length - 1);
    } else if (index >= screenshots.length) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(index);
    }
  };
  
  return (
    <>
      {/* Haupt-Carousel */}
      <div className="relative">
        {/* Haupt-Bild */}
        <div
          className="relative aspect-video overflow-hidden cursor-pointer group"
          onClick={() => setLightboxOpen(true)}
          style={{
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Image
            src={screenshots[currentIndex]}
            alt={`${moduleName} Screenshot ${currentIndex + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlay bei Hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Navigation Arrows */}
        {screenshots.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all hover:scale-110"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all hover:scale-110"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}
        
        {/* Dots */}
        {screenshots.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: index === currentIndex ? accentColor : 'rgba(255, 255, 255, 0.5)',
                  transform: index === currentIndex ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Thumbnail-Leiste */}
      {screenshots.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {screenshots.map((src, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className="relative shrink-0 w-20 h-14 overflow-hidden transition-all"
              style={{
                borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.5rem',
                border: index === currentIndex 
                  ? `2px solid ${accentColor}` 
                  : '2px solid transparent',
                opacity: index === currentIndex ? 1 : 0.6,
              }}
            >
              <Image
                src={src}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full transition-all hover:scale-110"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            {/* Image */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[80vh] w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={screenshots[currentIndex]}
                alt={`${moduleName} Screenshot ${currentIndex + 1}`}
                width={1920}
                height={1080}
                className="w-full h-auto object-contain rounded-lg"
              />
            </motion.div>
            
            {/* Navigation in Lightbox */}
            {screenshots.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all hover:scale-110"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
            
            {/* Counter */}
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm text-white"
              style={{ background: 'rgba(0, 0, 0, 0.5)' }}
            >
              {currentIndex + 1} / {screenshots.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


