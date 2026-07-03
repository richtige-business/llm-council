// ============================================
// ReviewCard.tsx - Einzelne Bewertungs-Karte
// 
// Zweck: Zeigt eine Nutzer-Bewertung mit Helpful-Button
// Verwendet von: ReviewSection
// ============================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { useThemeStyles } from '@/lib/theme';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import type { ModuleReview } from '@/lib/marketplace/types';
import { getRelativeTime } from '@/lib/marketplace/types';
import { RatingStars } from './RatingStars';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface ReviewCardProps {
  review: ModuleReview;
  animationDelay?: number;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function ReviewCard({ 
  review,
  animationDelay = 0,
}: ReviewCardProps) {
  const { surface, textColor, designStyle, accentColor } = useThemeStyles();
  
  // Store für Helpful-Markierung
  const isHelpful = useMarketplaceStore((s) => s.helpfulReviews.includes(review.id));
  const markHelpful = useMarketplaceStore((s) => s.markReviewHelpful);
  const unmarkHelpful = useMarketplaceStore((s) => s.unmarkReviewHelpful);
  
  // Lokaler Helpful-Count (optimistic update)
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  
  // Toggle Helpful
  const toggleHelpful = () => {
    if (isHelpful) {
      unmarkHelpful(review.id);
      setHelpfulCount(c => Math.max(0, c - 1));
    } else {
      markHelpful(review.id);
      setHelpfulCount(c => c + 1);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="p-4"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header: Avatar, Name, Date */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
          {review.userAvatar ? (
            <Image
              src={review.userAvatar}
              alt={review.userName}
              fill
              className="object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center text-lg font-semibold"
              style={{ background: accentColor, color: '#fff' }}
            >
              {review.userName.charAt(0)}
            </div>
          )}
        </div>
        
        {/* Name & Meta */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="font-medium"
              style={{ color: textColor }}
            >
              {review.userName}
            </span>
            <span 
              className="text-xs"
              style={{ color: textColor, opacity: 0.5 }}
            >
              {getRelativeTime(review.createdAt)}
            </span>
          </div>
          
          {/* Rating */}
          <RatingStars rating={review.rating} size="sm" textColor={textColor} />
        </div>
      </div>
      
      {/* Title */}
      <h4 
        className="font-semibold mb-2"
        style={{ color: textColor }}
      >
        {review.title}
      </h4>
      
      {/* Content */}
      <p 
        className="text-sm mb-4 leading-relaxed"
        style={{ color: textColor, opacity: 0.8 }}
      >
        {review.content}
      </p>
      
      {/* Developer Response */}
      {review.developerResponse && (
        <div 
          className="mb-4 p-3 rounded-lg ml-4 border-l-2"
          style={{ 
            background: 'rgba(139, 92, 246, 0.1)',
            borderColor: '#8b5cf6',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <span 
              className="text-xs font-medium text-violet-400"
            >
              Entwickler-Antwort
            </span>
            <span 
              className="text-xs"
              style={{ color: textColor, opacity: 0.5 }}
            >
              {getRelativeTime(review.developerResponse.createdAt)}
            </span>
          </div>
          <p 
            className="text-sm"
            style={{ color: textColor, opacity: 0.8 }}
          >
            {review.developerResponse.content}
          </p>
        </div>
      )}
      
      {/* Footer: Helpful Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleHelpful}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-105"
          style={{
            background: isHelpful ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isHelpful ? '#22c55e' : textColor,
            opacity: isHelpful ? 1 : 0.7,
          }}
        >
          <ThumbsUp className={`w-4 h-4 ${isHelpful ? 'fill-current' : ''}`} />
          <span>Hilfreich ({helpfulCount})</span>
        </button>
      </div>
    </motion.div>
  );
}


