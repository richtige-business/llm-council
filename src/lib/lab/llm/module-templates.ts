// ============================================
// module-templates.ts - App-Typ Templates
// 
// Zweck: Vordefinierte Templates für verschiedene App-Typen
//        Helfen dem Agent schneller zu starten
// ============================================

// --------------------------------------------
// Template Interface
// --------------------------------------------

export interface ModuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  files: TemplateFile[];
  suggestedTech: string[];
  tags: string[];
}

export interface TemplateFile {
  path: string;
  content: string;
  description: string;
}

// --------------------------------------------
// Game Template
// --------------------------------------------

export const GAME_TEMPLATE: ModuleTemplate = {
  id: 'game',
  name: 'Spiel',
  description: 'Canvas-basiertes 2D Spiel mit Game Loop',
  category: 'creative',
  icon: 'Gamepad2',
  suggestedTech: ['Canvas API', 'requestAnimationFrame', 'Keyboard Events'],
  tags: ['game', 'canvas', '2d'],
  files: [
    {
      path: 'module.json',
      description: 'Minimales Manifest für ein Spiel',
      content: `{
  "id": "my-game",
  "name": "Mein Spiel",
  "icon": "Gamepad2",
  "entry": "./Game.tsx"
}`,
    },
    {
      path: 'Game.tsx',
      description: 'Hauptkomponente mit Canvas und Game Loop',
      content: `'use client';

import { useEffect, useRef, useState } from 'react';
import { Gamepad2, RotateCcw, Play, Pause } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { container, button, accentColor, textColor, designStyle } = useThemeStyles();
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  
  // Game Loop
  useEffect(() => {
    if (!isRunning) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw game elements here
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
      ctx.fill();
      
      animationId = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => cancelAnimationFrame(animationId);
  }, [isRunning, accentColor]);
  
  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Gamepad2 style={{ color: accentColor }} className="w-6 h-6" />
          <h1 className="text-xl font-bold" style={{ color: textColor }}>
            Mein Spiel
          </h1>
        </div>
        <div className="text-2xl font-bold" style={{ color: accentColor }}>
          Score: {score}
        </div>
      </div>
      
      {/* Canvas */}
      <div 
        className="flex-1 flex items-center justify-center"
        style={container.base}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="rounded-lg"
          style={{ 
            maxWidth: '100%',
            border: designStyle === 'brutal' ? '3px solid #000' : 'none',
          }}
        />
      </div>
      
      {/* Controls */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="flex items-center gap-2 px-6 py-3"
          style={button.primary}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => { setScore(0); setIsRunning(false); }}
          className="flex items-center gap-2 px-6 py-3"
          style={button.base}
        >
          <RotateCcw className="w-5 h-5" />
          Neustart
        </button>
      </div>
    </div>
  );
}`,
    },
  ],
};

// --------------------------------------------
// Dashboard/SaaS Template
// --------------------------------------------

export const DASHBOARD_TEMPLATE: ModuleTemplate = {
  id: 'dashboard',
  name: 'Dashboard/SaaS',
  description: 'Datenvisualisierung und Analytics Dashboard',
  category: 'business',
  icon: 'BarChart3',
  suggestedTech: ['Recharts', 'Data Fetching', 'Zustand'],
  tags: ['dashboard', 'analytics', 'saas', 'data'],
  files: [
    {
      path: 'module.json',
      description: 'Manifest für Dashboard-App',
      content: `{
  "id": "my-dashboard",
  "name": "Analytics Dashboard",
  "icon": "BarChart3",
  "entry": "./App.tsx",
  "category": "business"
}`,
    },
    {
      path: 'App.tsx',
      description: 'Dashboard mit KPI-Cards und Charts',
      content: `'use client';

import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';

// KPI-Daten (später aus API)
const kpis = [
  { label: 'Umsatz', value: '€24,500', change: '+12%', icon: DollarSign },
  { label: 'Nutzer', value: '1,234', change: '+8%', icon: Users },
  { label: 'Conversion', value: '3.2%', change: '+0.5%', icon: TrendingUp },
  { label: 'Aktivität', value: '89%', change: '+2%', icon: Activity },
];

export default function Dashboard() {
  const { container, surface, accentColor, textColor, designStyle } = useThemeStyles();
  
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 style={{ color: accentColor }} className="w-8 h-8" />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: textColor }}>
            Dashboard
          </h1>
          <p style={{ color: textColor, opacity: 0.6 }}>
            Übersicht deiner wichtigsten Metriken
          </p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-4"
            style={{
              ...surface.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: textColor, opacity: 0.7 }}>{kpi.label}</span>
              <kpi.icon className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: textColor }}>
              {kpi.value}
            </div>
            <div 
              className="text-sm mt-1"
              style={{ color: kpi.change.startsWith('+') ? '#22c55e' : '#ef4444' }}
            >
              {kpi.change} vs. Vormonat
            </div>
          </div>
        ))}
      </div>
      
      {/* Chart Placeholder */}
      <div
        className="p-6 h-80"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: textColor }}>
          Umsatz-Entwicklung
        </h2>
        <div 
          className="h-full flex items-center justify-center"
          style={{ color: textColor, opacity: 0.5 }}
        >
          {/* Hier Recharts oder andere Chart-Library einbinden */}
          <p>Chart-Komponente hier einfügen</p>
        </div>
      </div>
    </div>
  );
}`,
    },
  ],
};

// --------------------------------------------
// Forum/Social Template
// --------------------------------------------

export const FORUM_TEMPLATE: ModuleTemplate = {
  id: 'forum',
  name: 'Forum/Social',
  description: 'Diskussionsforum mit Posts und Kommentaren',
  category: 'social',
  icon: 'MessageSquare',
  suggestedTech: ['Zustand', 'Forms', 'Markdown'],
  tags: ['forum', 'community', 'social', 'discussion'],
  files: [
    {
      path: 'module.json',
      description: 'Manifest für Forum-App',
      content: `{
  "id": "community-forum",
  "name": "Community Forum",
  "icon": "MessageSquare",
  "entry": "./App.tsx",
  "category": "social"
}`,
    },
    {
      path: 'types.ts',
      description: 'TypeScript-Typen für Forum',
      content: `export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  likes: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}`,
    },
    {
      path: 'store.ts',
      description: 'Zustand Store für Posts',
      content: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Post, Comment } from './types';

interface ForumStore {
  posts: Post[];
  addPost: (title: string, content: string, author: string) => void;
  addComment: (postId: string, content: string, author: string) => void;
  likePost: (postId: string) => void;
}

export const useForumStore = create<ForumStore>()(
  persist(
    (set) => ({
      posts: [],
      
      addPost: (title, content, author) => {
        const newPost: Post = {
          id: crypto.randomUUID(),
          title,
          content,
          author,
          createdAt: new Date().toISOString(),
          likes: 0,
          comments: [],
        };
        set((state) => ({ posts: [newPost, ...state.posts] }));
      },
      
      addComment: (postId, content, author) => {
        const newComment: Comment = {
          id: crypto.randomUUID(),
          content,
          author,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId
              ? { ...post, comments: [...post.comments, newComment] }
              : post
          ),
        }));
      },
      
      likePost: (postId) => {
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post
          ),
        }));
      },
    }),
    { name: 'forum-storage' }
  )
);`,
    },
    {
      path: 'App.tsx',
      description: 'Forum-Hauptkomponente',
      content: `'use client';

import { useState } from 'react';
import { MessageSquare, Plus, Heart, Send } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useForumStore } from './store';

export default function Forum() {
  const { container, surface, button, input, accentColor, textColor, designStyle } = useThemeStyles();
  const { posts, addPost, addComment, likePost } = useForumStore();
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const handleSubmit = () => {
    if (newTitle.trim() && newContent.trim()) {
      addPost(newTitle, newContent, 'Du');
      setNewTitle('');
      setNewContent('');
      setShowForm(false);
    }
  };
  
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare style={{ color: accentColor }} className="w-8 h-8" />
          <h1 className="text-2xl font-bold" style={{ color: textColor }}>
            Forum
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2"
          style={button.primary}
        >
          <Plus className="w-5 h-5" />
          Neuer Post
        </button>
      </div>
      
      {/* New Post Form */}
      {showForm && (
        <div className="mb-6 p-4" style={surface.base}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titel..."
            className="w-full px-4 py-2 mb-3 bg-transparent"
            style={{ ...input.base, color: textColor }}
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Was möchtest du teilen?"
            rows={3}
            className="w-full px-4 py-2 mb-3 bg-transparent resize-none"
            style={{ ...input.base, color: textColor }}
          />
          <button onClick={handleSubmit} style={button.primary} className="px-4 py-2">
            Posten
          </button>
        </div>
      )}
      
      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12" style={{ color: textColor, opacity: 0.5 }}>
            Noch keine Posts. Starte die Diskussion!
          </div>
        ) : (
          posts.map((post) => (
            <div 
              key={post.id} 
              className="p-4"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
              }}
            >
              <h2 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                {post.title}
              </h2>
              <p className="mb-3" style={{ color: textColor, opacity: 0.8 }}>
                {post.content}
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => likePost(post.id)}
                  className="flex items-center gap-1"
                  style={{ color: accentColor }}
                >
                  <Heart className="w-4 h-4" />
                  {post.likes}
                </button>
                <span style={{ color: textColor, opacity: 0.5 }}>
                  {post.comments.length} Kommentare
                </span>
                <span style={{ color: textColor, opacity: 0.5 }}>
                  von {post.author}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}`,
    },
  ],
};

// --------------------------------------------
// CRM Template
// --------------------------------------------

export const CRM_TEMPLATE: ModuleTemplate = {
  id: 'crm',
  name: 'CRM / Kontaktmanagement',
  description: 'Kontakte und Deals verwalten',
  category: 'business',
  icon: 'Users',
  suggestedTech: ['Zustand', 'Forms', 'Search/Filter'],
  tags: ['crm', 'contacts', 'sales', 'business'],
  files: [
    {
      path: 'module.json',
      description: 'Manifest für CRM-App',
      content: `{
  "id": "my-crm",
  "name": "CRM",
  "icon": "Users",
  "entry": "./App.tsx",
  "category": "business"
}`,
    },
    {
      path: 'App.tsx',
      description: 'CRM-Hauptkomponente mit Kontaktliste',
      content: `'use client';

import { useState } from 'react';
import { Users, Plus, Search, Mail, Phone, Building } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';

// Demo-Kontakte
const demoContacts = [
  { id: '1', name: 'Max Mustermann', email: 'max@example.com', company: 'Acme Inc', status: 'lead' },
  { id: '2', name: 'Anna Schmidt', email: 'anna@example.com', company: 'Tech GmbH', status: 'customer' },
];

export default function CRM() {
  const { container, surface, button, input, accentColor, textColor, designStyle } = useThemeStyles();
  const [contacts, setContacts] = useState(demoContacts);
  const [search, setSearch] = useState('');
  
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users style={{ color: accentColor }} className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: textColor }}>CRM</h1>
            <p style={{ color: textColor, opacity: 0.6 }}>{contacts.length} Kontakte</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2" style={button.primary}>
          <Plus className="w-5 h-5" />
          Kontakt
        </button>
      </div>
      
      {/* Search */}
      <div className="relative mb-6">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
          style={{ color: textColor, opacity: 0.5 }} 
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="w-full pl-10 pr-4 py-3 bg-transparent"
          style={{ ...input.base, color: textColor }}
        />
      </div>
      
      {/* Contact List */}
      <div className="space-y-3">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-4 p-4 cursor-pointer transition-opacity hover:opacity-80"
            style={{
              ...surface.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            }}
          >
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: accentColor }}
            >
              {contact.name.split(' ').map(n => n[0]).join('')}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h3 className="font-semibold" style={{ color: textColor }}>
                {contact.name}
              </h3>
              <div className="flex items-center gap-4 text-sm" style={{ color: textColor, opacity: 0.6 }}>
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {contact.company}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {contact.email}
                </span>
              </div>
            </div>
            
            {/* Status */}
            <span
              className="px-3 py-1 text-xs font-medium rounded-full"
              style={{
                background: contact.status === 'customer' ? '#22c55e20' : accentColor + '20',
                color: contact.status === 'customer' ? '#22c55e' : accentColor,
              }}
            >
              {contact.status === 'customer' ? 'Kunde' : 'Lead'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}`,
    },
  ],
};

// --------------------------------------------
// Alle Templates exportieren
// --------------------------------------------

export const ALL_TEMPLATES: ModuleTemplate[] = [
  GAME_TEMPLATE,
  DASHBOARD_TEMPLATE,
  FORUM_TEMPLATE,
  CRM_TEMPLATE,
];

// --------------------------------------------
// Template nach ID finden
// --------------------------------------------

export function getTemplateById(id: string): ModuleTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

// --------------------------------------------
// Template-Übersicht für Agent
// --------------------------------------------

export const TEMPLATE_OVERVIEW = `
# Verfügbare Modul-Templates

## 🎮 Game Template
- Canvas-basiertes 2D Spiel
- Game Loop mit requestAnimationFrame
- Score-System
- Keyboard Controls

## 📊 Dashboard/SaaS Template
- KPI-Cards
- Chart-Platzhalter
- Responsive Grid
- Datenvisualisierung

## 💬 Forum/Social Template
- Post-Liste
- Kommentare
- Like-System
- Zustand Store

## 👥 CRM Template
- Kontaktliste
- Suche/Filter
- Status-Tags
- Avatar-Darstellung

Jedes Template folgt dem minimalen Modul-Vertrag
und nutzt das LifeOS Theme-System!
`;


