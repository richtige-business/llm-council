// ============================================
// LifeOS Module Builder - File Tree
// 
// Zweck: Zeigt die Dateistruktur an (wie bolt.diy)
// Verwendet von: EditorPanel
// ============================================

'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileType,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileMap } from '../../stores/files-store';
import { useWorkbenchStore, type StreamingFileStatus } from '../../stores/workbench-store';

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  container?: { base: React.CSSProperties };
  button?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface FileTreeProps {
  files: FileMap;
  selectedFile?: string;
  onFileSelect: (path: string) => void;
  themeStyles?: ThemeStyles;
}

// --------------------------------------------
// Helper: Dateibaum erstellen
// --------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

function buildTree(files: FileMap): TreeNode[] {
  const root: TreeNode[] = [];
  const paths = Object.keys(files).sort();
  
  for (const path of paths) {
    const parts = path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const currentPath = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;
      
      let node = current.find((n) => n.name === name);
      
      if (!node) {
        node = {
          name,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        current.push(node);
      }
      
      if (!isFile && node.children) {
        current = node.children;
      }
    }
  }
  
  return root;
}

// --------------------------------------------
// File Icon Helper
// --------------------------------------------

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case 'css':
    case 'scss':
      return <FileType className="w-4 h-4 text-pink-400" />;
    default:
      return <File className="w-4 h-4 text-white/50" />;
  }
}

// --------------------------------------------
// Tree Node Komponente
// --------------------------------------------

const TreeNodeComponent = memo(function TreeNodeComponent({
  node,
  depth,
  selectedFile,
  onFileSelect,
  themeStyles,
}: {
  node: TreeNode;
  depth: number;
  selectedFile?: string;
  onFileSelect: (path: string) => void;
  themeStyles?: ThemeStyles;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === 'folder';
  const isSelected = node.path === selectedFile;
  const { accentColor = '#8b5cf6', designStyle = 'glass', textColor = '#ffffff' } = themeStyles || {};
  
  // Streaming-Status dieser Datei prüfen
  const streamingStatus = useWorkbenchStore(
    (state) => isFolder ? undefined : state.streamingFiles.get(node.path)
  );
  const isWriting = streamingStatus === 'writing';
  const isComplete = streamingStatus === 'complete';
  
  // Icon basierend auf Streaming-Status
  const renderFileIcon = () => {
    if (isWriting) {
      // Pulsierender Spinner während Datei geschrieben wird
      return <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentColor }} />;
    }
    if (isComplete) {
      // Grüner Haken wenn Datei fertig geschrieben
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
    return getFileIcon(node.name);
  };
  
  return (
    <motion.div
      // Fade-in Animation für neue Dateien
      initial={isWriting ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <button
        onClick={() => {
          if (isFolder) {
            setIsOpen(!isOpen);
          } else {
            onFileSelect(node.path);
          }
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm transition-colors"
        style={{ 
          paddingLeft: `${depth * 16 + 8}px`,
          background: isSelected 
            ? `${accentColor}30` 
            : isWriting 
              ? `${accentColor}10`  // Dezentes Highlight während Streaming
              : 'transparent',
          color: isSelected ? accentColor : isWriting ? accentColor : `${textColor}b3`,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !isWriting) {
            e.currentTarget.style.background = 'transparent';
          } else if (isWriting && !isSelected) {
            e.currentTarget.style.background = `${accentColor}10`;
          }
        }}
      >
        {/* Expand Icon für Ordner */}
        {isFolder && (
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="w-3.5 h-3.5" style={{ color: `${textColor}66` }} />
          </motion.span>
        )}
        
        {/* File/Folder Icon - mit Streaming-Status */}
        {isFolder ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 text-yellow-400" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-400" />
          )
        ) : (
          renderFileIcon()
        )}
        
        {/* Name */}
        <span className="truncate">
          {node.name}
        </span>
        
        {/* Streaming-Indikator Punkt */}
        {isWriting && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0"
            style={{ background: accentColor }}
          />
        )}
      </button>
      
      {/* Children */}
      <AnimatePresence>
        {isFolder && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children.map((child) => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                themeStyles={themeStyles}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export const FileTree = memo(function FileTree({
  files,
  selectedFile,
  onFileSelect,
  themeStyles,
}: FileTreeProps) {
  const tree = buildTree(files);
  const { textColor = '#ffffff' } = themeStyles || {};
  
  if (Object.keys(files).length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: `${textColor}66` }}>
        Noch keine Dateien generiert
      </div>
    );
  }
  
  return (
    <div className="py-2">
      {tree.map((node) => (
        <TreeNodeComponent
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          themeStyles={themeStyles}
        />
      ))}
    </div>
  );
});

