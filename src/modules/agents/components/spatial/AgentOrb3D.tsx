// ============================================
// AgentOrb3D.tsx - Renderbarer Agent-Orb fuer die Spatial-Szene
//
// Zweck: Zeigt einen Agenten als interaktiven Orb mit Glow,
//        permanentem Label und Fokus-Ring im 3D-Raum.
//        Groesse skaliert mit Hierarchie-Tiefe (master am groessten).
// Verwendet von: AgentsSpatialScene
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import type { SpatialAgentNode } from '../../spatial-types';

interface AgentOrb3DProps {
  node: SpatialAgentNode;
  isSelected: boolean;
  onSelect: (agentId: string) => void;
  /** Im Tasks-/Settings-Modus: Orb isoliert, Label darunter als Titel */
  isolatedMode?: boolean;
  /** Feintuning fuer Sonderlayouts wie Gruppen-Settings */
  sizeVariant?: 'default' | 'groupSettingsCenter' | 'groupSettingsMember';
}

// Orb-Radius nach Hierarchie-Tiefe: Parent-Agents immer groesser als ihre Subagents.
// Im isolierten Tasks-/Settings-Modus wird diese Hierarchie bewusst aufgehoben.
const BASE_RADIUS = 2.2;
const DEPTH_SHRINK = 0.62;
const ISOLATED_RADIUS = 1.05;
const GROUP_SETTINGS_CENTER_RADIUS = 1.18;
const GROUP_SETTINGS_MEMBER_RADIUS = 0.82;

function orbRadius(depth: number): number {
  return BASE_RADIUS * Math.pow(DEPTH_SHRINK, depth);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((entry) => `${entry}${entry}`)
        .join('')
    : normalized;

  const numeric = Number.parseInt(value, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

export function AgentOrb3D({
  node,
  isSelected,
  onSelect,
  isolatedMode = false,
  sizeVariant = 'default',
}: AgentOrb3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isGroupNode = node.entityType === 'group';
  const labelText = node.displayLabel || node.label;
  const labelMeta =
    node.labelMeta !== undefined
      ? node.labelMeta
      : isGroupNode
        ? 'Gruppen-Orchestrator'
        : node.isBuiltIn
          ? 'System-Agent'
          : 'Custom Agent';

  const radius = useMemo(
    () =>
      isolatedMode
        ? ISOLATED_RADIUS
        : sizeVariant === 'groupSettingsCenter'
          ? GROUP_SETTINGS_CENTER_RADIUS
          : sizeVariant === 'groupSettingsMember'
            ? GROUP_SETTINGS_MEMBER_RADIUS
            : orbRadius(node.depth),
    [isolatedMode, node.depth, sizeVariant]
  );

  const glowColor = useMemo(() => {
    const rgb = hexToRgb(node.color || '#8B5CF6');
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`;
  }, [node.color]);

  // Torus und Label-Position proportional zum Radius.
  // Im isolierten Modus kompakter, damit Orb + Titel sauber in den Header-Bereich passen.
  const torusOuterRadius = isolatedMode ? radius * 1.18 : radius * 1.35;
  const torusThickness = radius * 0.07;
  const labelY = isolatedMode ? radius + 0.55 : radius + 0.9;

  return (
    <group position={[node.worldPosition.x, node.worldPosition.y, node.worldPosition.z]}>
      {/* Fokus-Ring bei Auswahl */}
      {isSelected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[torusOuterRadius, torusThickness, 20, 64]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.8} />
        </mesh>
      ) : null}

      {/* Gruppen-Orchestrator mit zusaetzlichem Ring markieren */}
      {isGroupNode ? (
        <mesh rotation={[Math.PI / 2.8, 0, 0]}>
          <torusGeometry args={[radius * 1.12, radius * 0.045, 18, 48]} />
          <meshBasicMaterial color={node.color} transparent opacity={isSelected ? 0.7 : 0.38} />
        </mesh>
      ) : null}

      {/* Haupt-Sphere (klickbar) */}
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isSelected ? 1.15 : isHovered ? 0.72 : 0.2}
          roughness={0.28}
          metalness={0.15}
        />
      </mesh>

      {/* Glow-Sphere */}
      <mesh scale={isolatedMode ? 1.16 : isSelected ? 1.55 : isHovered ? 1.42 : 1.25}>
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isolatedMode ? 0.16 : isSelected ? 0.55 : isHovered ? 0.3 : 0.18}
        />
      </mesh>

      {/* Labels nur im Hub anzeigen - Tasks/Settings nutzen den Seiten-Header */}
      {!isolatedMode && !node.hideLabel ? (
        <Html
          position={[0, labelY, 0]}
          center
          zIndexRange={[12, 1]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`text-center transition-all duration-200 ${
              isSelected || isHovered
                ? 'rounded-lg border-2 border-white/25 bg-[#070d1a]/92 px-3 py-2 shadow-2xl backdrop-blur-md'
                : 'rounded-lg border border-white/20 bg-[#070d1a]/88 px-2.5 py-1.5 shadow-lg backdrop-blur-md'
            }`}
            style={{
              boxShadow:
                isSelected || isHovered
                  ? `0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px ${node.color}40, 0 0 20px ${node.color}35`
                  : `0 2px 16px rgba(0,0,0,0.45), 0 0 0 1px ${node.color}30`,
            }}
          >
            <p
              className={`whitespace-nowrap font-extrabold tracking-tight transition-all duration-200 ${
                isSelected
                  ? 'text-base text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]'
                  : isHovered
                    ? 'text-sm text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]'
                    : 'text-sm text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.76)]'
              }`}
            >
              {labelText}
            </p>
            {(isSelected || isHovered) && labelMeta ? (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/55">
                {labelMeta}
              </p>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
