// ============================================
// ReviewSection.tsx - Bewertungs-Sektion
// 
// Zweck: Zeigt alle Bewertungen eines Moduls + Bewertungs-Dialog
// Verwendet von: ModuleDetail Page
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import type { ModuleReview } from '@/lib/marketplace/types';
import { RatingStars, RatingInput } from './RatingStars';
import { ReviewCard } from './ReviewCard';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface ReviewSectionProps {
  moduleId: string;
  moduleName: string;
  reviews: ModuleReview[];
  averageRating: number;
  totalReviews: number;
}

// --------------------------------------------
// Bewertungs-Verteilung Komponente
// --------------------------------------------

interface RatingBarProps {
  stars: number;
  count: number;
  total: number;
  textColor: string;
  accentColor: string;
}

function RatingBar({ stars, count, total, textColor, accentColor }: RatingBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className="text-sm w-3 text-right"
        style={{ color: textColor, opacity: 0.7 }}
      >
        {stars}
      </span>
      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
      <div 
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: 0.1 * (5 - stars) }}
          className="h-full rounded-full"
          style={{ background: accentColor }}
        />
      </div>
      <span 
        className="text-xs w-8"
        style={{ color: textColor, opacity: 0.5 }}
      >
        {count}
      </span>
    </div>
  );
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export function ReviewSection({ 
  moduleId,
  moduleName,
  reviews,
  averageRating,
  totalReviews,
}: ReviewSectionProps) {
  const { surface, container, textColor, designStyle, accentColor, input } = useThemeStyles();
  
  // Store
  const userReview = useMarketplaceStore((s) => s.userReviews[moduleId]);
  const addReview = useMarketplaceStore((s) => s.addReview);
  
  // Dialog State
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(userReview?.rating || 5);
  const [newTitle, setNewTitle] = useState(userReview?.title || '');
  const [newContent, setNewContent] = useState(userReview?.content || '');
  
  // Berechne Verteilung
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    distribution[r.rating as keyof typeof distribution]++;
  });
  
  // Submit Handler
  const handleSubmit = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    addReview(moduleId, {
      rating: newRating,
      title: newTitle,
      content: newContent,
      createdAt: new Date().toISOString(),
    });
    
    setShowWriteReview(false);
  };
  
  return (
    <div>
      {/* Overview */}
      <div 
        className="p-6 mb-6"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Big Rating */}
          <div className="flex flex-col items-center justify-center md:w-48">
            <span 
              className="text-5xl font-bold"
              style={{ color: textColor }}
            >
              {averageRating.toFixed(1)}
            </span>
            <RatingStars rating={averageRating} size="lg" textColor={textColor} />
            <span 
              className="text-sm mt-2"
              style={{ color: textColor, opacity: 0.5 }}
            >
              {totalReviews} Bewertungen
            </span>
          </div>
          
          {/* Right: Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <RatingBar
                key={stars}
                stars={stars}
                count={distribution[stars as keyof typeof distribution]}
                total={totalReviews}
                textColor={textColor}
                accentColor={accentColor}
              />
            ))}
          </div>
        </div>
        
        {/* Write Review Button */}
        <div className="mt-6 pt-6 border-t border-white/10">
          {userReview ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                  Deine Bewertung: 
                </span>
                <RatingStars rating={userReview.rating} size="sm" textColor={textColor} />
              </div>
              <button
                onClick={() => setShowWriteReview(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: `${accentColor}30`, color: accentColor }}
              >
                Bewertung bearbeiten
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowWriteReview(true)}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ 
                background: accentColor, 
                color: '#fff',
                boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : undefined,
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              }}
            >
              <Star className="w-4 h-4" />
              Bewertung schreiben
            </button>
          )}
        </div>
      </div>
      
      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div 
            className="text-center py-12"
            style={{ color: textColor, opacity: 0.5 }}
          >
            Noch keine Bewertungen. Sei der Erste!
          </div>
        ) : (
          reviews.map((review, index) => (
            <ReviewCard 
              key={review.id} 
              review={review}
              animationDelay={index * 0.1}
            />
          ))
        )}
      </div>
      
      {/* Write Review Dialog */}
      <AnimatePresence>
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowWriteReview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6"
              style={{
                ...container.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 
                  className="text-xl font-semibold"
                  style={{ color: textColor }}
                >
                  {moduleName} bewerten
                </h3>
                <button
                  onClick={() => setShowWriteReview(false)}
                  className="p-2 rounded-lg transition-all hover:scale-110"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <X className="w-5 h-5" style={{ color: textColor }} />
                </button>
              </div>
              
              {/* Rating */}
              <div className="mb-6 text-center">
                <p 
                  className="text-sm mb-3"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  Wie gefällt dir das Modul?
                </p>
                <div className="flex justify-center">
                  <RatingInput value={newRating} onChange={setNewRating} />
                </div>
              </div>
              
              {/* Title */}
              <div className="mb-4">
                <label 
                  className="block text-sm mb-2"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  Titel
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Kurze Zusammenfassung..."
                  className="w-full px-4 py-3 focus:outline-none"
                  style={{
                    ...input.base,
                    color: textColor,
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="mb-6">
                <label 
                  className="block text-sm mb-2"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  Deine Bewertung
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Was gefällt dir? Was könnte besser sein?"
                  rows={4}
                  className="w-full px-4 py-3 focus:outline-none resize-none"
                  style={{
                    ...input.base,
                    color: textColor,
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                  }}
                />
              </div>
              
              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: accentColor,
                  color: '#fff',
                  boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : undefined,
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                }}
              >
                <Send className="w-4 h-4" />
                Bewertung veröffentlichen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


