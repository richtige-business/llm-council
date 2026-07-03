// ============================================
// AgentWidget.tsx - Agent-Widget für das Dashboard
// 
// Zweck: Klick öffnet die globale Chatbar mit dem
//        entsprechenden Modul-Agent ausgewählt
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { MiniIntelligenceOrb } from '@/components/shell/IntelligenceOrb';
import { useAgentConfigStore, DEFAULT_AGENT_ICONS, DEFAULT_MODULE_COLORS } from '@/lib/agent/stores/agent-config-store';
import { useAppStore } from '@/lib/store/app-store';

// --------------------------------------------
// Types
// --------------------------------------------

interface AgentWidgetProps {
  moduleId: string;
  moduleName: string;
  moduleIcon: string;
  moduleColor: string;
  moduleDescription?: string;
}

function DynamicIcon({ name, className, style }: { 
  name: string; 
  className?: string; 
  style?: React.CSSProperties;
}) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[name];
  if (!Icon) return null;
  return <Icon className={className} style={style} />;
}

// --------------------------------------------
// Component
// --------------------------------------------

export function AgentWidget({
  moduleId,
  moduleName,
  moduleColor,
}: AgentWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Store Actions
  const openChatWithModule = useAppStore((state) => state.openChatWithModule);
  
  // Agent Config - nutze configs direkt statt getConfig
  // um State-Änderungen während des Renders zu vermeiden
  const configs = useAgentConfigStore((state) => state.configs);
  const ensureConfig = useAgentConfigStore((state) => state.ensureConfig);
  
  // Initialisiere Config beim Mount
  useEffect(() => {
    ensureConfig(moduleId);
  }, [moduleId, ensureConfig]);
  
  // Config aus dem Store oder Defaults
  const config = configs[moduleId];
  const currentColor = config?.orbColor || moduleColor || DEFAULT_MODULE_COLORS[moduleId];
  const agentIcon = config?.agentIcon || DEFAULT_AGENT_ICONS[moduleId] || 'Bot';
  const agentName = config?.agentName || moduleName;
  
  const handleClick = () => {
    // Öffnet die globale Chatbar mit diesem Modul
    openChatWithModule(moduleId);
  };
  
  return (
    <motion.div
      className="relative h-full w-full flex flex-col items-center justify-center cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow Effect */}
      <motion.div
        className="absolute rounded-full blur-xl"
        style={{ 
          width: 60, 
          height: 60, 
          background: currentColor,
          opacity: isHovered ? 0.3 : 0.15,
        }}
        animate={{ scale: isHovered ? 1.2 : 1 }}
      />
      
      {/* Icon */}
      <DynamicIcon 
        name={agentIcon}
        className="relative w-10 h-10 drop-shadow-lg"
        style={{ color: currentColor }}
      />
      
      {/* Mini Orb */}
      <div className="mt-1">
        <MiniIntelligenceOrb
          color={currentColor}
          size={18}
          isActive={isHovered}
        />
      </div>
      
      {/* Name bei Hover */}
      <motion.span
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }}
        className="mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: `${currentColor}30`, color: currentColor }}
      >
        {agentName}
      </motion.span>
    </motion.div>
  );
}

// --------------------------------------------
// Widget Definitions
// --------------------------------------------

export const AGENT_WIDGETS = {
  'agent-calendar': {
    id: 'agent-calendar',
    name: 'Kalender',
    moduleId: 'calendar',
    moduleName: 'Kalender',
    moduleIcon: 'Calendar',
    moduleColor: '#f87171', // Rot (entspricht Navbar: from-rose-300 to-red-400)
    moduleDescription: 'Termine verwalten',
  },
  'agent-inbox': {
    id: 'agent-inbox',
    name: 'Inbox',
    moduleId: 'inbox',
    moduleName: 'Inbox',
    moduleIcon: 'Mail',
    moduleColor: '#fbbf24', // Gelb (entspricht Navbar: from-amber-200 to-yellow-300)
    moduleDescription: 'E-Mails verwalten',
  },
  'agent-lab': {
    id: 'agent-lab',
    name: 'Lab',
    moduleId: 'lab',
    moduleName: 'Lab',
    moduleIcon: 'FlaskConical',
    moduleColor: '#14B8A6',
    moduleDescription: 'Builder und Trainings-Workflows',
  },
  'agent-agents': {
    id: 'agent-agents',
    name: 'Agents',
    moduleId: 'agents',
    moduleName: 'Agents',
    moduleIcon: 'BotMessageSquare',
    moduleColor: '#8B5CF6',
    moduleDescription: 'KI-Agenten & Research',
  },
} as const;

export type AgentWidgetId = keyof typeof AGENT_WIDGETS;
