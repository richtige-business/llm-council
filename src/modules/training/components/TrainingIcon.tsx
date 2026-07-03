'use client';

// ============================================
// TrainingIcon.tsx - Zentrales Icon-Mapping fuer das Training Center
//
// Zweck: Wandelt Icon-Namen aus Konstanten in Lucide-Komponenten um
// Verwendet von: Entry-Screen, Selector, Workspace-Shell
// ============================================

import type { CSSProperties } from 'react';
import {
  BadgeCheck,
  Bot,
  Brain,
  Database,
  Dumbbell,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  GraduationCap,
  History,
  LayoutDashboard,
  Layers3,
  PlayCircle,
  Route,
  ScanSearch,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Upload,
  Wand2,
  Workflow,
} from 'lucide-react';

// --------------------------------------------
// Icon-Registry
// Zentraler Ort fuer alle im Training Center genutzten Icons
// --------------------------------------------

interface TrainingIconProps {
  iconName: string;
  className?: string;
  style?: CSSProperties;
}

// --------------------------------------------
// Render-Komponente fuer Icons
// Vermeidet dynamische Komponenten-Erzeugung in Render-Funktionen
// --------------------------------------------

export function TrainingIcon({ iconName, className, style }: TrainingIconProps) {
  switch (iconName) {
    case 'BadgeCheck':
      return <BadgeCheck className={className} style={style} />;
    case 'Bot':
      return <Bot className={className} style={style} />;
    case 'Database':
      return <Database className={className} style={style} />;
    case 'Dumbbell':
      return <Dumbbell className={className} style={style} />;
    case 'FlaskConical':
      return <FlaskConical className={className} style={style} />;
    case 'GitBranch':
      return <GitBranch className={className} style={style} />;
    case 'GitCompareArrows':
      return <GitCompareArrows className={className} style={style} />;
    case 'GraduationCap':
      return <GraduationCap className={className} style={style} />;
    case 'History':
      return <History className={className} style={style} />;
    case 'LayoutDashboard':
      return <LayoutDashboard className={className} style={style} />;
    case 'Layers3':
      return <Layers3 className={className} style={style} />;
    case 'PlayCircle':
      return <PlayCircle className={className} style={style} />;
    case 'Route':
      return <Route className={className} style={style} />;
    case 'ScanSearch':
      return <ScanSearch className={className} style={style} />;
    case 'Share2':
      return <Share2 className={className} style={style} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} style={style} />;
    case 'Sparkles':
      return <Sparkles className={className} style={style} />;
    case 'ThumbsUp':
      return <ThumbsUp className={className} style={style} />;
    case 'Upload':
      return <Upload className={className} style={style} />;
    case 'Wand2':
      return <Wand2 className={className} style={style} />;
    case 'Workflow':
      return <Workflow className={className} style={style} />;
    default:
      return <Brain className={className} style={style} />;
  }
}
