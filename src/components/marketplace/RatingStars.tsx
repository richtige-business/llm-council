// ============================================
// RatingStars.tsx - Sterne-Bewertungsanzeige
// 
// Zweck: Zeigt Bewertungssterne (gefüllt/leer) an
// Verwendet von: ModuleCard, ReviewCard, ReviewSection
// ============================================

'use client';

import { Star } from 'lucide-react';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface RatingStarsProps {
  // Aktuelle Bewertung (0-5, kann Dezimalzahlen haben)
  rating: number;
  // Maximale Sterne (default: 5)
  maxStars?: number;
  // Größe der Sterne
  size?: 'sm' | 'md' | 'lg';
  // Ob interaktiv (klickbar für Eingabe)
  interactive?: boolean;
  // Callback bei Klick (nur wenn interactive=true)
  onRatingChange?: (rating: number) => void;
  // Anzahl Reviews anzeigen
  reviewCount?: number;
  // Textfarbe
  textColor?: string;
}

// --------------------------------------------
// Größen-Mapping
// --------------------------------------------

const sizeMap = {
  sm: { star: 'w-3 h-3', text: 'text-xs', gap: 'gap-0.5' },
  md: { star: 'w-4 h-4', text: 'text-sm', gap: 'gap-1' },
  lg: { star: 'w-5 h-5', text: 'text-base', gap: 'gap-1' },
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function RatingStars({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  reviewCount,
  textColor = '#ffffff',
}: RatingStarsProps) {
  const sizes = sizeMap[size];
  
  // Berechne gefüllte, halb-gefüllte und leere Sterne
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);
  
  // Handler für interaktive Sterne
  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };
  
  return (
    <div className={`flex items-center ${sizes.gap}`}>
      {/* Gefüllte Sterne */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <button
          key={`full-${i}`}
          type="button"
          onClick={() => handleClick(i)}
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          <Star
            className={`${sizes.star} fill-amber-400 text-amber-400`}
          />
        </button>
      ))}
      
      {/* Halb-gefüllter Stern (mit Clip) */}
      {hasHalfStar && (
        <button
          key="half"
          type="button"
          onClick={() => handleClick(fullStars)}
          disabled={!interactive}
          className={`relative ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          {/* Hintergrund (leerer Stern) */}
          <Star
            className={`${sizes.star} text-gray-400`}
          />
          {/* Vordergrund (halber gefüllter Stern) */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star
              className={`${sizes.star} fill-amber-400 text-amber-400`}
            />
          </div>
        </button>
      )}
      
      {/* Leere Sterne */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <button
          key={`empty-${i}`}
          type="button"
          onClick={() => handleClick(fullStars + (hasHalfStar ? 1 : 0) + i)}
          disabled={!interactive}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          <Star
            className={`${sizes.star} text-gray-400`}
          />
        </button>
      ))}
      
      {/* Bewertungszahl und Review-Count */}
      {reviewCount !== undefined && (
        <span 
          className={`${sizes.text} ml-1`}
          style={{ color: textColor, opacity: 0.7 }}
        >
          {rating.toFixed(1)} ({reviewCount})
        </span>
      )}
    </div>
  );
}

// --------------------------------------------
// Interaktive Variante für Bewertungseingabe
// --------------------------------------------

interface RatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingInput({ value, onChange, size = 'lg' }: RatingInputProps) {
  return (
    <RatingStars
      rating={value}
      size={size}
      interactive
      onRatingChange={onChange}
    />
  );
}


