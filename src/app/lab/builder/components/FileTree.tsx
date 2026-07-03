'use client';

// ============================================
// FileTree.tsx - Dateibaum des generierten Moduls
// 
// Zweck: Zeigt alle generierten Dateien als Baum
//        Ermöglicht Auswahl für Code-Preview
// Verwendet von: Builder Page
// ============================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, 
  FileJson, 
  FileText, 
  Folder, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useBuilderStore, useBuilderFiles } from '@/lib/lab';
import type { ModuleFile } from '@/lib/lab';

// --------------------------------------------
// Types
// --------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: ModuleFile;
}

// --------------------------------------------
// Helper: Dateien in Baumstruktur umwandeln
// --------------------------------------------

function buildTree(files: ModuleFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  
  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existingNode = currentLevel.find(n => n.name === part);
      
      if (existingNode) {
        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          file: isFile ? file : undefined,
        };
        
        currentLevel.push(newNode);
        
        if (!isFile && newNode.children) {
          currentLevel = newNode.children;
        }
      }
    }
  }
  
  // Sortieren: Ordner zuerst, dann Dateien
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };
  
  return sortNodes(root);
}

// --------------------------------------------
// Helper: Icon für Dateityp
// --------------------------------------------

function getFileIcon(fileName: string) {
  if (fileName.endsWith('.json')) return FileJson;
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return FileCode;
  return FileText;
}

// --------------------------------------------
// Komponente: TreeNodeItem
// --------------------------------------------

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}

function TreeNodeItem({ 
  node, 
  level, 
  selectedPath, 
  onSelect,
  expandedFolders,
  onToggleFolder,
}: TreeNodeItemProps) {
  const { textColor, accentColor, designStyle } = useThemeStyles();
  const isSelected = node.path === selectedPath;
  const isExpanded = expandedFolders.has(node.path);
  const Icon = node.type === 'folder' 
    ? (isExpanded ? FolderOpen : Folder)
    : getFileIcon(node.name);
  
  return (
    <div>
      <motion.div
        className="flex items-center gap-1 py-1 px-2 cursor-pointer transition-colors"
        style={{
          paddingLeft: `${level * 12 + 8}px`,
          background: isSelected ? `${accentColor}20` : 'transparent',
          borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
        }}
        onClick={() => {
          if (node.type === 'folder') {
            onToggleFolder(node.path);
          } else {
            onSelect(node.path);
          }
        }}
        whileHover={{ background: isSelected ? `${accentColor}30` : 'rgba(255, 255, 255, 0.05)' }}
      >
        {/* Chevron für Ordner */}
        {node.type === 'folder' && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" style={{ color: textColor, opacity: 0.5 }} />
            ) : (
              <ChevronRight className="h-3 w-3" style={{ color: textColor, opacity: 0.5 }} />
            )}
          </span>
        )}
        
        {/* Spacer wenn keine Chevron */}
        {node.type === 'file' && <span className="w-4" />}
        
        {/* Icon */}
        <Icon 
          className="h-4 w-4 shrink-0" 
          style={{ 
            color: node.type === 'folder' ? '#f59e0b' : isSelected ? accentColor : textColor,
            opacity: node.type === 'folder' ? 1 : 0.7,
          }} 
        />
        
        {/* Name */}
        <span 
          className="text-xs truncate"
          style={{ 
            color: isSelected ? accentColor : textColor,
            opacity: isSelected ? 1 : 0.8,
          }}
        >
          {node.name}
        </span>
      </motion.div>
      
      {/* Children */}
      <AnimatePresence>
        {node.type === 'folder' && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------
// Komponente: FileTree
// --------------------------------------------

export function FileTree() {
  const { surface, textColor, accentColor, designStyle } = useThemeStyles();
  const files = useBuilderFiles();
  const selectedFile = useBuilderStore((s) => s.session.selectedFile);
  const selectFile = useBuilderStore((s) => s.selectFile);
  
  // Alle Ordner standardmäßig expandiert
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const folders = new Set<string>();
    files.forEach(file => {
      const parts = file.path.split('/');
      for (let i = 0; i < parts.length - 1; i++) {
        folders.add(parts.slice(0, i + 1).join('/'));
      }
    });
    return folders;
  });
  
  // Baum aufbauen
  const tree = useMemo(() => buildTree(files), [files]);
  
  // Ordner expandieren/kollabieren
  const handleToggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  
  if (files.length === 0) {
    return (
      <div 
        className="p-4"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Folder className="h-8 w-8 mb-2" style={{ color: textColor, opacity: 0.2 }} />
          <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
            Noch keine Dateien generiert
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="overflow-hidden"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4" style={{ color: accentColor }} />
          <span className="text-sm font-medium" style={{ color: textColor }}>
            Dateien
          </span>
          <span 
            className="text-xs px-1.5 py-0.5"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: textColor,
              opacity: 0.6,
              borderRadius: '9999px',
            }}
          >
            {files.length}
          </span>
        </div>
      </div>
      
      {/* Tree */}
      <div className="p-2 max-h-64 overflow-y-auto">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            level={0}
            selectedPath={selectedFile}
            onSelect={selectFile}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
          />
        ))}
      </div>
    </div>
  );
}



