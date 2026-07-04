// ============================================
// GroupSettingsOrbStrip.tsx - Statische Orb-Leiste fuer Gruppensettings
//
// Zweck: Zeigt die Teilnehmer einer Gruppe als gleich grosse,
//        nicht interaktive Orbs in einer Reihe ueber dem
//        Gruppen-Settingsfenster.
// Verwendet von: AgentsSpatialSettingsMode
// ============================================

'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { BUILT_IN_AGENT_DEFINITIONS } from '../agent-meta';
import { useAgentsStore } from '../store';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';

interface GroupSettingsOrbStripProps {
  groupId: string;
}

interface StripOrbProps {
  color: string;
  x: number;
}

// --------------------------------------------
// Einzelner 3D-Orb fuer die statische Strip-Ansicht
// Nicht interaktiv, nur mit sanfter Eigenrotation.
// --------------------------------------------
function StripOrb({ color, x }: StripOrbProps) {
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[Math.PI / 2.8, 0, 0]}>
        <torusGeometry args={[1.25, 0.06, 20, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.05, 40, 40]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.24}
          metalness={0.12}
        />
      </mesh>

      <mesh scale={1.28}>
        <sphereGeometry args={[1.05, 26, 26]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

export function GroupSettingsOrbStrip({ groupId }: GroupSettingsOrbStripProps) {
  const customAgents = useAgentsStore((state) => state.customAgents);
  const configs = useAgentConfigStore((state) => state.configs);

  const group = useMemo(
    () => customAgents.find((agent) => agent.id === groupId && agent.type === 'group') || null,
    [customAgents, groupId]
  );

  const participants = useMemo(() => {
    if (!group) {
      return [];
    }

    return (group.participantRoles || [])
      .filter((participant) => participant.agentId.trim() !== '')
      .map((participant) => {
        const customAgent = customAgents.find((agent) => agent.id === participant.agentId) || null;
        const builtInAgent = BUILT_IN_AGENT_DEFINITIONS.find((agent) => agent.id === participant.agentId) || null;

        return {
          id: participant.agentId,
          name:
            customAgent?.name ||
            configs[participant.agentId]?.agentName ||
            builtInAgent?.name ||
            participant.agentId,
          color:
            customAgent?.color ||
            configs[participant.agentId]?.orbColor ||
            builtInAgent?.color ||
            '#8B5CF6',
          isAdmin: participant.agentId === group.adminAgentId,
        };
      });
  }, [configs, customAgents, group]);

  const orbLayout = useMemo(() => {
    const spacing = participants.length <= 3 ? 3.4 : participants.length <= 5 ? 3.0 : 2.6;
    const startX = -((participants.length - 1) * spacing) / 2;

    return participants.map((participant, index) => ({
      ...participant,
      x: startX + index * spacing,
    }));
  }, [participants]);

  const cameraZ = useMemo(() => {
    if (orbLayout.length <= 3) return 7.5;
    if (orbLayout.length <= 5) return 9;
    return 10.5;
  }, [orbLayout.length]);

  if (orbLayout.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none h-32 w-full max-w-[760px] md:h-36" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, cameraZ], fov: 24 }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[0, 3.2, 8]} intensity={1.35} color="#dbeafe" />
        <pointLight position={[0, 0, 6]} intensity={1.25} color="#ffffff" />
        <pointLight position={[0, 1.5, 3]} intensity={1.15} color="#93c5fd" />

        {orbLayout.map((participant) => (
          <StripOrb key={participant.id} color={participant.color} x={participant.x} />
        ))}
      </Canvas>
    </div>
  );
}
