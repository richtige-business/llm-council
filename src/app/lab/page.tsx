'use client';

// ============================================
// Lab Page - Vibe-Coding Entwicklungsumgebung
// 
// Zweck: Übersicht über Lab-Features mit Modul Builder
// Verwendet von: Shell, Navigation
// ============================================

import { motion } from 'framer-motion';
import { FlaskConical, Blocks, Brain, Code, Sparkles, ArrowRight } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import Link from 'next/link';

export default function LabPage() {
  // Theme-Styles für Multi-Style-Support
  const { surface, container, accentColor, designStyle, textColor } = useThemeStyles();

  // --------------------------------------------
  // Lab Features - Modul Builder ist der Hauptfokus
  // --------------------------------------------
  const labFeatures = [
    {
      icon: Blocks,
      title: 'Modul Builder',
      description: 'Erstelle neue Module mit Vibe-Coding. Beschreibe deine Idee und die KI generiert den Code.',
      accent: '#8b5cf6',
      shadow: 'rgba(139, 92, 246, 0.35)',
      href: '/lab/builder',
      available: true,
    },
    {
      icon: Brain,
      title: 'AI Trainingscenter',
      description: 'Trainings und Fine-Tuning für Module – inkl. Sandbox-Tests in isolierter Umgebung.',
      accent: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.35)',
      href: '/training',
      available: true,
    },
  ];

  return (
    // h-full für volle verfügbare Höhe (Shell kümmert sich um Chatbar-Freiraum)
    <div
      className="flex h-full items-start justify-center overflow-y-auto p-6 pt-8"
      data-agent-panel="lab-root"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        {/* Header Card */}
        <div 
          className="mb-4 p-5"
          style={{
            ...container.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center"
              style={{
                background: accentColor,
                boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : '0 4px 15px rgba(0, 0, 0, 0.2)',
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              }}
            >
              <FlaskConical className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold drop-shadow-sm" style={{ color: textColor }}>Lab</h1>
              <p style={{ color: textColor, opacity: 0.6 }}>Entwickle eigene Module mit Vibe-Coding</p>
            </div>
          </div>
        </div>

        {/* Hero Card - Modul Builder CTA */}
        <Link href="/lab/builder">
          <motion.div
            className="mb-4 p-6 cursor-pointer group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ scale: 1.01 }}
            style={{
              ...container.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
              background: 'rgba(139, 92, 246, 0.12)',
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(139, 92, 246, 0.35)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center"
                  style={{
                    background: '#8b5cf6',
                    boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : '0 4px 15px rgba(139, 92, 246, 0.35)',
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                    border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  }}
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: textColor }}>
                    Modul Builder starten
                  </h2>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                    Beschreibe deine App-Idee und lass die KI den Code generieren
                  </p>
                </div>
              </div>
              <div 
                className="flex h-10 w-10 items-center justify-center transition-transform group-hover:translate-x-1"
                style={{
                  background: accentColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
                }}
              >
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Feature Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {labFeatures.map((feature, index) => {
            const cardContent = (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                className={`group relative overflow-hidden p-4 transition-all ${feature.available ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-60'}`}
                style={{
                  ...surface.base,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                }}
              >
                {/* Icon */}
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center"
                  style={{
                    background: feature.accent,
                    boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : `0 4px 12px ${feature.shadow}`,
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                    border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  }}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="mb-1 font-semibold" style={{ color: textColor }}>
                  {feature.title}
                </h3>
                <p className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
                  {feature.description}
                </p>
                
                {!feature.available && (
                  <span 
                    className="mt-3 inline-flex items-center px-2 py-0.5 text-xs"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: textColor,
                      opacity: 0.5,
                      borderRadius: '9999px',
                    }}
                  >
                    Kommt bald
                  </span>
                )}
              </motion.div>
            );
            
            return feature.href ? (
              <Link key={feature.title} href={feature.href}>
                {cardContent}
              </Link>
            ) : (
              <div key={feature.title}>{cardContent}</div>
            );
          })}
        </div>

        {/* Info Box */}
        <motion.div
          className="mt-4 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center mt-0.5"
              style={{
                background: '#0ea5e9',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              <Code className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1" style={{ color: textColor }}>So funktioniert's</h3>
              <p className="text-xs leading-relaxed" style={{ color: textColor, opacity: 0.6 }}>
                Der Modul Builder ist eine Vibe-Coding Plattform. Beschreibe einfach, welche App du 
                haben möchtest und die KI erstellt automatisch alle nötigen Dateien: Komponenten, 
                Store, Types und Widgets für dein Dashboard. Du kannst iterativ Änderungen vornehmen 
                und das Modul jederzeit aktivieren.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
