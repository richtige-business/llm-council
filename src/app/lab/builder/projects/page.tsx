// ============================================
// LifeOS Module Builder - Projekt-Übersicht
// 
// Zweck: Zeigt alle Projekte (in Arbeit, fertig, veröffentlicht)
// Navigation: /lab/builder/projects
// ============================================

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ArrowLeft,
  Plus,
  Search,
  Clock,
  CheckCircle,
  Globe,
  Lock,
  Trash2,
  FileCode,
  Calendar,
  Filter,
  LayoutGrid,
  List,
  Hammer,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useThemeStyles } from '@/lib/theme';
import { useProjectsStore, type BuilderProject } from '../stores/projects-store';
import { initializeModuleRegistry } from '@/lib/modules/registry';
import { cn } from '@/lib/utils';

// --------------------------------------------
// Typen
// --------------------------------------------

type StatusFilter = 'all' | 'draft' | 'building' | 'completed' | 'published';
type ViewMode = 'grid' | 'list';

// --------------------------------------------
// Status-Badge Komponente
// --------------------------------------------

function StatusBadge({ status, publishInfo }: { 
  status: BuilderProject['status']; 
  publishInfo?: BuilderProject['publishInfo'];
}) {
  const { designStyle } = useThemeStyles();
  
  const configs = {
    draft: { icon: Clock, label: 'Entwurf', color: '#f59e0b' },
    building: { icon: Hammer, label: 'In Arbeit', color: '#3b82f6' },
    completed: { icon: CheckCircle, label: 'Fertig', color: '#22c55e' },
    published: publishInfo?.visibility === 'public' 
      ? { icon: Globe, label: 'Öffentlich', color: '#8b5cf6' }
      : { icon: Lock, label: 'Privat', color: '#06b6d4' },
  };
  
  const config = configs[status] || configs.draft;
  const Icon = config.icon;
  
  return (
    <span 
      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
      style={{
        background: `${config.color}20`,
        color: config.color,
        borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.5rem',
        border: designStyle === 'brutal' ? '1px solid #000' : 'none',
      }}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// --------------------------------------------
// Projekt-Card Komponente
// --------------------------------------------

function ProjectCard({ 
  project, 
  viewMode,
  onDelete,
}: { 
  project: BuilderProject;
  viewMode: ViewMode;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();
  
  const filesCount = Object.keys(project.files || {}).length;
  const lastUpdated = new Date(project.updatedAt).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
  });
  
  const handleClick = () => {
    router.push(`/lab/builder/${project.id}`);
  };
  
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        whileHover={{ scale: 1.01 }}
        onClick={handleClick}
        className="flex items-center gap-4 p-3 cursor-pointer transition-all group"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          }}
        >
          {project.icon ? (
            <span className="text-sm">{project.icon}</span>
          ) : (
            <Sparkles className="w-5 h-5 text-white" />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" style={{ color: textColor }}>
            {project.name || 'Unbenanntes Projekt'}
          </h3>
          <p className="text-xs truncate" style={{ color: textColor, opacity: 0.5 }}>
            {project.description || 'Keine Beschreibung'}
          </p>
        </div>
        
        {/* Meta */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={project.status} publishInfo={project.publishInfo} />
          <span className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
            {filesCount} Dateien
          </span>
          <span className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
            {lastUpdated}
          </span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 pointer-events-auto z-10"
            title="Projekt löschen"
            aria-label="Projekt löschen"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </motion.div>
    );
  }
  
  // Grid View
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      className="p-4 cursor-pointer transition-all group relative"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
      }}
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        <StatusBadge status={project.status} publishInfo={project.publishInfo} />
      </div>
      
      {/* Delete Button */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(project.id);
        }}
        className="absolute bottom-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 pointer-events-auto z-10"
        title="Projekt löschen"
        aria-label="Projekt löschen"
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
      
      {/* Content */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
          }}
        >
          {project.icon ? (
            <span className="text-lg">{project.icon}</span>
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="font-semibold truncate" style={{ color: textColor }}>
            {project.name || 'Unbenanntes Projekt'}
          </h3>
          <p className="text-sm truncate" style={{ color: textColor, opacity: 0.5 }}>
            {project.description || 'Keine Beschreibung'}
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs" style={{ color: textColor, opacity: 0.4 }}>
        <span className="flex items-center gap-1">
          <FileCode className="w-3.5 h-3.5" />
          {filesCount} Dateien
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {lastUpdated}
        </span>
      </div>
    </motion.div>
  );
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export default function BuilderProjectsPage() {
  const router = useRouter();
  const { surface, container, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Store
  const { projects, deleteProject } = useProjectsStore();
  
  // Module-Registry laden beim Start
  useEffect(() => {
    initializeModuleRegistry();
  }, []);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Gefilterte Projekte
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Search
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status Filter
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, searchQuery, statusFilter]);
  
  // Statistiken
  const stats = useMemo(() => ({
    total: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    building: projects.filter(p => p.status === 'building').length,
    completed: projects.filter(p => p.status === 'completed').length,
    published: projects.filter(p => p.status === 'published').length,
    publicModules: projects.filter(p => p.publishInfo?.visibility === 'public').length,
  }), [projects]);
  
  // Neues Projekt erstellen - navigiert zur Startseite
  const handleNewProject = useCallback(() => {
    router.push('/lab/builder');
  }, [router]);
  
  // Projekt löschen
  const handleDeleteProject = useCallback((id: string) => {
    if (confirm('Möchtest du dieses Projekt wirklich löschen?')) {
      deleteProject(id);
    }
  }, [deleteProject]);
  
  return (
    <div 
      className="fixed inset-0 z-20 flex flex-col overflow-hidden"
      data-agent-panel="lab-root"
      style={{
        background: surfaceColor,
        backdropFilter: designStyle === 'glass' ? 'blur(20px)' : 'none',
      }}
    >
      {/* Header */}
      <header 
        className="flex-shrink-0 h-14"
        style={{
          ...container.base,
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
      >
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/lab/builder"
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{ color: textColor, opacity: 0.6 }}
              title="Zurück zum Builder"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : `0 4px 12px ${accentColor}40`,
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold" style={{ color: textColor }}>
                  Meine Projekte
                </h1>
                <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                  {stats.total} Projekte • {stats.published} Veröffentlicht
                </p>
              </div>
            </div>
          </div>
          
          {/* Right: New Project Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNewProject}
            data-agent-button="builder-new-project"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : `0 4px 15px ${accentColor}40`,
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            }}
          >
            <Plus className="w-4 h-4" />
            Neues Modul
          </motion.button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto">
          {/* Toolbar: Search + Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div 
              className="flex items-center gap-2 px-3 py-2 flex-1 min-w-[200px]"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              <Search className="w-4 h-4" style={{ color: textColor, opacity: 0.4 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Projekte suchen..."
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{ color: textColor }}
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {[
                { value: 'all', label: 'Alle', count: stats.total },
                { value: 'draft', label: 'Entwürfe', count: stats.draft },
                { value: 'completed', label: 'Fertig', count: stats.completed },
                { value: 'published', label: 'Veröffentlicht', count: stats.published },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as StatusFilter)}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: statusFilter === filter.value ? `${accentColor}20` : 'transparent',
                    color: statusFilter === filter.value ? accentColor : textColor,
                    opacity: statusFilter === filter.value ? 1 : 0.6,
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                  }}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
            
            {/* View Mode Toggle */}
            <div 
              className="flex items-center p-1"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 transition-colors"
                style={{
                  background: viewMode === 'grid' ? `${accentColor}20` : 'transparent',
                  borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
                }}
              >
                <LayoutGrid 
                  className="w-4 h-4" 
                  style={{ color: viewMode === 'grid' ? accentColor : textColor, opacity: viewMode === 'grid' ? 1 : 0.5 }} 
                />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 transition-colors"
                style={{
                  background: viewMode === 'list' ? `${accentColor}20` : 'transparent',
                  borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
                }}
              >
                <List 
                  className="w-4 h-4" 
                  style={{ color: viewMode === 'list' ? accentColor : textColor, opacity: viewMode === 'list' ? 1 : 0.5 }} 
                />
              </button>
            </div>
          </div>
          
          {/* Projects Grid/List */}
          <AnimatePresence mode="popLayout">
            {filteredProjects.length > 0 ? (
              <div className={cn(
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                  : 'flex flex-col gap-2'
              )}>
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode={viewMode}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div
                  className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: `${accentColor}10`,
                    borderRadius: designStyle === 'brutal' ? '1rem' : '1.25rem',
                  }}
                >
                  <Sparkles className="w-8 h-8" style={{ color: accentColor, opacity: 0.5 }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Keine Projekte gefunden' 
                    : 'Noch keine Projekte'}
                </h3>
                <p className="text-sm mb-4" style={{ color: textColor, opacity: 0.5 }}>
                  {searchQuery || statusFilter !== 'all'
                    ? 'Versuche andere Suchbegriffe oder Filter'
                    : 'Erstelle dein erstes Modul!'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNewProject}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Neues Modul
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
