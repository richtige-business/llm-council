// ============================================
// AgentsSpatialScene.tsx - Persistente 3D-Hauptszene fuer Agents
//
// Zweck: Rendert den zentralen Spatial-Core mit Agent-Orbs,
//        Oktopus-Hierarchie und Kamera-Steuerung
// Verwendet von: AgentsModuleShell
// ============================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Maximize2, X } from 'lucide-react';
import * as THREE from 'three';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import { useAgentsStore, useSelectedAgentId } from '../../store';
import { useScheduledTasksStore } from '../../tasks-store';
import { useAgentsSpatialStore } from '../../spatial-store';
import { AgentOrb3D } from './AgentOrb3D';
import {
  buildCouncilPreviewSpatialGraph,
  buildCouncilArcSeats,
  computeCouncilFraming,
} from './buildCouncilPreviewSpatialGraph';
import { buildSpatialGraph } from './buildSpatialGraph';
import { buildGroupSpatialGraph } from './buildGroupSpatialGraph';
import { buildGroupsOverviewSpatialGraph } from './buildGroupsOverviewSpatialGraph';
import { SpatialCameraController } from './SpatialCameraController';
import { SpatialConnections } from './SpatialConnections';

function SceneTaskNode({
  node,
  isSelected,
  onSelect,
}: {
  node: ReturnType<typeof buildSpatialGraph>['taskNodes'][number];
  isSelected: boolean;
  onSelect: (taskId: string, targetId: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <group position={[node.worldPosition.x, node.worldPosition.y, node.worldPosition.z]}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id, node.targetId);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={() => setIsHovered(false)}
      >
        <octahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isSelected ? 0.85 : isHovered ? 0.4 : 0.16}
          roughness={0.3}
        />
      </mesh>
      {(isSelected || isHovered) ? (
        <Html position={[0, 1.2, 0]} center zIndexRange={[12, 1]}>
          <div className="rounded-lg border border-white/10 bg-[#0b1120]/88 px-2 py-1 text-center shadow-xl backdrop-blur-md">
            <p className="text-[11px] font-medium text-white">{node.label}</p>
            <p className="text-[9px] text-white/45">
              {node.taskType} · {node.status}
            </p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function SceneConversationNode({
  node,
}: {
  node: ReturnType<typeof buildSpatialGraph>['conversationNodes'][number];
}) {
  return (
    <mesh position={[node.worldPosition.x, node.worldPosition.y, node.worldPosition.z]}>
      <sphereGeometry args={[0.22, 18, 18]} />
      <meshBasicMaterial color={node.color} transparent opacity={0.8} />
    </mesh>
  );
}

function CouncilSeatAddButton({
  position,
  onAdd,
}: {
  position: [number, number, number];
  onAdd: () => void;
}) {
  return (
    <Html position={position} center zIndexRange={[18, 1]}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-lg font-semibold text-white/85 shadow-[0_10px_30px_rgba(15,23,42,0.35)] backdrop-blur-md transition-colors hover:border-white/30 hover:bg-slate-900/85 hover:text-white"
        title="Add seat"
      >
        +
      </button>
    </Html>
  );
}

type CouncilBubbleAnchorSnapshot = {
  left: number;
  top: number;
  visible: boolean;
};

type CouncilBubbleAnchorMap = Record<string, CouncilBubbleAnchorSnapshot>;

function CouncilSpeechBubbleAnchor({
  anchorPosition,
  seatId,
  onAnchorChange,
}: {
  anchorPosition: [number, number, number];
  seatId: string;
  onAnchorChange: (seatId: string, nextAnchor: CouncilBubbleAnchorSnapshot | null) => void;
}) {
  const anchorRef = useRef<THREE.Group>(null);
  const projectedPositionRef = useRef(new THREE.Vector3());
  const previousAnchorRef = useRef<CouncilBubbleAnchorSnapshot | null>(null);
  const { camera, size } = useThree();

  // --------------------------------------------
  // Der 3D-Anker bleibt exakt oberhalb des Orbs.
  // Wir melden nur die projizierte Bildschirmposition
  // an das DOM-Overlay ausserhalb des Canvas.
  // --------------------------------------------
  useFrame(() => {
    if (!anchorRef.current) {
      return;
    }

    anchorRef.current.updateWorldMatrix(true, false);
    const worldPosition = projectedPositionRef.current;
    anchorRef.current.getWorldPosition(worldPosition);
    worldPosition.project(camera);

    const isVisible = worldPosition.z > -1 && worldPosition.z < 1;
    const nextAnchor = isVisible
      ? {
          left: (worldPosition.x * 0.5 + 0.5) * size.width,
          top: (-worldPosition.y * 0.5 + 0.5) * size.height,
          visible: true,
        }
      : {
          left: 0,
          top: 0,
          visible: false,
        };

    const previousAnchor = previousAnchorRef.current;
    const hasMeaningfulChange =
      !previousAnchor ||
      previousAnchor.visible !== nextAnchor.visible ||
      Math.abs(previousAnchor.left - nextAnchor.left) > 0.25 ||
      Math.abs(previousAnchor.top - nextAnchor.top) > 0.25;

    if (hasMeaningfulChange) {
      previousAnchorRef.current = nextAnchor;
      onAnchorChange(seatId, nextAnchor);
    }
  });

  useEffect(() => {
    return () => {
      onAnchorChange(seatId, null);
    };
  }, [onAnchorChange, seatId]);

  return <group ref={anchorRef} position={anchorPosition} />;
}

function CouncilPreviewStage({
  onFramingChange,
  onBubbleAnchorChange,
}: {
  onFramingChange: (focus: { x: number; y: number; z: number }, offset: { x: number; y: number; z: number }) => void;
  onBubbleAnchorChange: (seatId: string, nextAnchor: CouncilBubbleAnchorSnapshot | null) => void;
}) {
  const [extraLeftCount, setExtraLeftCount] = useState(0);
  const [extraRightCount, setExtraRightCount] = useState(0);
  const [hoveredCouncilSeatId, setHoveredCouncilSeatId] = useState<string | null>(null);
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const activeCouncilDraftMemberMessages = useAgentsStore((state) => state.activeCouncilDraftMemberMessages);
  const trimActiveCouncilExtraSeatMembers = useAgentsStore((state) => state.trimActiveCouncilExtraSeatMembers);
  const selectedCouncilSeatId = useAgentsSpatialStore((state) => state.selectedCouncilSeatId);
  const speakingCouncilSeatId = useAgentsSpatialStore((state) => state.speakingCouncilSeatId);
  const openCouncilSpeechBubbleIds = useAgentsSpatialStore((state) => state.openCouncilSpeechBubbleIds);
  const setSelectedCouncilSeat = useAgentsSpatialStore((state) => state.setSelectedCouncilSeat);
  const pendingCouncilSeatRemovalId = useAgentsSpatialStore((state) => state.pendingCouncilSeatRemovalId);
  const clearCouncilSeatRemovalRequest = useAgentsSpatialStore((state) => state.clearCouncilSeatRemovalRequest);
  const pulseTimeRef = useRef(0);
  const seatVisualRefs = useRef<
    Record<
      string,
      {
        group: THREE.Group | null;
        orbMesh: THREE.Mesh | null;
        haloMesh: THREE.Mesh | null;
        orbMaterial: THREE.MeshStandardMaterial | null;
        haloMaterial: THREE.MeshBasicMaterial | null;
      }
    >
  >({});

  useFrame((_, delta) => {
    pulseTimeRef.current += delta;

    Object.entries(seatVisualRefs.current).forEach(([seatId, refs]) => {
      if (!refs.group || !refs.orbMesh || !refs.haloMesh || !refs.orbMaterial || !refs.haloMaterial) {
        return;
      }

      const currentBaseOrbScale = refs.group.userData.baseOrbScale || 1;
      const currentBaseHaloScale = refs.group.userData.baseHaloScale || 1;

      if (speakingCouncilSeatId === seatId) {
        const pulse = 1 + (Math.sin(pulseTimeRef.current * 8.5) * 0.085 + 0.11);
        refs.orbMesh.scale.setScalar(currentBaseOrbScale * pulse);
        refs.haloMesh.scale.setScalar(currentBaseHaloScale * (pulse + 0.02));
        refs.orbMaterial.emissiveIntensity = 2.35 + Math.sin(pulseTimeRef.current * 8.5) * 0.45;
        refs.haloMaterial.opacity = 0.28 + (Math.sin(pulseTimeRef.current * 8.5) + 1) * 0.08;
      } else {
        refs.orbMesh.scale.setScalar(currentBaseOrbScale);
        refs.haloMesh.scale.setScalar(currentBaseHaloScale);
        refs.orbMaterial.emissiveIntensity = refs.group.userData.baseOrbEmissiveIntensity || 0.72;
        refs.haloMaterial.opacity = refs.group.userData.baseHaloOpacity || 0.12;
      }
    });
  });

  const seats = useMemo(
    () => buildCouncilArcSeats(extraLeftCount, extraRightCount),
    [extraLeftCount, extraRightCount],
  );

  const requiredExtraSeatCounts = useMemo(() => {
    let requiredLeftCount = 0;
    let requiredRightCount = 0;

    activeCouncilDraftSeatMembers.forEach((member) => {
      if (member.seatId.startsWith('arc-left-extra-')) {
        const index = Number(member.seatId.replace('arc-left-extra-', ''));
        if (Number.isFinite(index)) {
          requiredLeftCount = Math.max(requiredLeftCount, index + 1);
        }
      }

      if (member.seatId.startsWith('arc-right-extra-')) {
        const index = Number(member.seatId.replace('arc-right-extra-', ''));
        if (Number.isFinite(index)) {
          requiredRightCount = Math.max(requiredRightCount, index + 1);
        }
      }
    });

    return {
      left: requiredLeftCount,
      right: requiredRightCount,
    };
  }, [activeCouncilDraftSeatMembers]);

  const framing = useMemo(() => computeCouncilFraming(seats), [seats]);

  useEffect(() => {
    onFramingChange(framing.focus, framing.cameraOffset);
  }, [framing, onFramingChange]);

  useEffect(() => {
    setExtraLeftCount((currentValue) => Math.max(currentValue, requiredExtraSeatCounts.left));
    setExtraRightCount((currentValue) => Math.max(currentValue, requiredExtraSeatCounts.right));
  }, [requiredExtraSeatCounts]);

  useEffect(() => {
    if (!pendingCouncilSeatRemovalId) {
      return;
    }

    if (pendingCouncilSeatRemovalId.startsWith('arc-left-extra-')) {
      const index = Number(pendingCouncilSeatRemovalId.replace('arc-left-extra-', ''));
      if (Number.isFinite(index)) {
        setExtraLeftCount(index);
        trimActiveCouncilExtraSeatMembers('left', index);
      }
    }

    if (pendingCouncilSeatRemovalId.startsWith('arc-right-extra-')) {
      const index = Number(pendingCouncilSeatRemovalId.replace('arc-right-extra-', ''));
      if (Number.isFinite(index)) {
        setExtraRightCount(index);
        trimActiveCouncilExtraSeatMembers('right', index);
      }
    }

    clearCouncilSeatRemovalRequest();
  }, [clearCouncilSeatRemovalRequest, pendingCouncilSeatRemovalId, trimActiveCouncilExtraSeatMembers]);

  const leftMostSeat = useMemo(
    () =>
      seats
        .filter((seat) => seat.position.x < 0 && !seat.elevated)
        .sort((left, right) => left.position.x - right.position.x)[0] || null,
    [seats],
  );

  const rightMostSeat = useMemo(
    () =>
      seats
        .filter((seat) => seat.position.x > 0 && !seat.elevated)
        .sort((left, right) => right.position.x - left.position.x)[0] || null,
    [seats],
  );

  return (
    <group position={[0, 0.95, 0]}>
      {/* Chair-Podium */}
      <mesh position={[0, 0.22, -12.4]}>
        <boxGeometry args={[6.8, 0.45, 4.4]} />
        <meshStandardMaterial color="#334155" roughness={0.72} metalness={0.12} />
      </mesh>

      {/* Sessel auf dem Kreisbogen */}
      {seats.map((seat) => {
        const seatMember =
          activeCouncilDraftSeatMembers.find((member) => member.seatId === seat.id) || null;
        const isSelected = selectedCouncilSeatId === seat.id;
        const isSpeaking = speakingCouncilSeatId === seat.id;
        const isHovered = hoveredCouncilSeatId === seat.id;
        const isHighlighted = isSelected || isHovered;
        const orbRadius = seat.elevated ? 0.96 : 0.82;
        const orbY = seat.elevated ? 0.98 : 0.98;
        const orbZ = seat.elevated ? 0.2 : 0.16;
        const labelY = seat.elevated ? 2.82 : 2.48;
        const baseOrbEmissiveIntensity = isSelected ? 1.1 : isHovered ? 0.95 : 0.72;
        const baseHaloOpacity = isSelected ? 0.16 : isHovered ? 0.14 : 0.12;
        const bubbleMessageId = openCouncilSpeechBubbleIds[seat.id] || null;
        const bubbleMessage = bubbleMessageId
          ? (activeCouncilDraftMemberMessages[seat.id] || []).find(
              (message) => message.id === bubbleMessageId
            ) || null
          : null;
        const bubbleVisible = Boolean(bubbleMessage);
        const baseScale = isSelected ? 1.04 : isHovered ? 1.02 : 1;

        return (
          <group
            key={seat.id}
            ref={(node) => {
              if (!seatVisualRefs.current[seat.id]) {
                seatVisualRefs.current[seat.id] = {
                  group: null,
                  orbMesh: null,
                  haloMesh: null,
                  orbMaterial: null,
                  haloMaterial: null,
                };
              }
              seatVisualRefs.current[seat.id].group = node;
              if (node) {
                node.userData.baseOrbScale = 1;
                node.userData.baseHaloScale = 1;
                node.userData.baseOrbEmissiveIntensity = baseOrbEmissiveIntensity;
                node.userData.baseHaloOpacity = baseHaloOpacity;
              }
            }}
            position={[seat.position.x, seat.position.y, seat.position.z]}
            rotation={[0, seat.rotationY || 0, 0]}
            scale={baseScale}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredCouncilSeatId(seat.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHoveredCouncilSeatId((currentSeatId) => (currentSeatId === seat.id ? null : currentSeatId));
              document.body.style.cursor = 'auto';
            }}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedCouncilSeat(seat.id);
            }}
          >
            {isHighlighted ? (
              <mesh position={[0, -0.42, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.28, 1.72, 40]} />
                <meshBasicMaterial
                  color={seat.elevated ? '#f59e0b' : isSelected ? '#93c5fd' : '#67e8f9'}
                  transparent
                  opacity={isSelected ? 0.8 : 0.46}
                />
              </mesh>
            ) : null}

            {seat.elevated ? (
              <mesh position={[0, -1.05, 0]}>
                <boxGeometry args={[3.3, 0.25, 2.8]} />
                <meshStandardMaterial
                  color={isSelected ? '#64748b' : isHovered ? '#566579' : '#475569'}
                  emissive={isHighlighted ? '#1e293b' : '#000000'}
                  emissiveIntensity={isSelected ? 0.55 : isHovered ? 0.24 : 0}
                  roughness={0.74}
                  metalness={0.14}
                />
              </mesh>
            ) : null}

            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[2.25, 0.26, 2.05]} />
              <meshStandardMaterial
                color={isSelected ? '#14b8a6' : isHovered ? '#129488' : '#0f766e'}
                emissive={isHighlighted ? '#134e4a' : '#000000'}
                emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.26 : 0}
                roughness={0.76}
                metalness={0.08}
              />
            </mesh>

            <mesh position={[0, 1.05, -0.78]}>
              <boxGeometry args={[2.25, 2.05, 0.28]} />
              <meshStandardMaterial
                color={isSelected ? '#2dd4bf' : isHovered ? '#22c7ba' : '#14b8a6'}
                emissive={isHighlighted ? '#115e59' : '#000000'}
                emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.22 : 0}
                roughness={0.7}
                metalness={0.06}
              />
            </mesh>

            <mesh position={[-1.07, 0.52, -0.08]}>
              <boxGeometry args={[0.22, 1.16, 1.6]} />
              <meshStandardMaterial
                color={isSelected ? '#134e4a' : isHovered ? '#126a64' : '#115e59'}
                emissive={isHighlighted ? '#0f766e' : '#000000'}
                emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.16 : 0}
                roughness={0.74}
                metalness={0.1}
              />
            </mesh>

            <mesh position={[1.07, 0.52, -0.08]}>
              <boxGeometry args={[0.22, 1.16, 1.6]} />
              <meshStandardMaterial
                color={isSelected ? '#134e4a' : isHovered ? '#126a64' : '#115e59'}
                emissive={isHighlighted ? '#0f766e' : '#000000'}
                emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.16 : 0}
                roughness={0.74}
                metalness={0.1}
              />
            </mesh>

            {!seatMember ? (
              <mesh position={[0, 1.18, -0.92]}>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshBasicMaterial
                  color={seat.elevated ? '#f59e0b' : isSelected ? '#bfdbfe' : isHovered ? '#7dd3fc' : '#60a5fa'}
                  transparent
                  opacity={isSelected ? 0.95 : isHovered ? 0.88 : 0.75}
                />
              </mesh>
            ) : null}

            {seatMember ? (
              <>
                {/* Besetzte Sitze visualisieren wir als echte Member-Orbs */}
                <mesh
                  position={[0, orbY, orbZ]}
                  ref={(node) => {
                    if (!seatVisualRefs.current[seat.id]) {
                      seatVisualRefs.current[seat.id] = {
                        group: null,
                        orbMesh: null,
                        haloMesh: null,
                        orbMaterial: null,
                        haloMaterial: null,
                      };
                    }
                    seatVisualRefs.current[seat.id].orbMesh = node;
                  }}
                >
                  <sphereGeometry args={[orbRadius, 36, 36]} />
                  <meshStandardMaterial
                    ref={(node) => {
                      if (!seatVisualRefs.current[seat.id]) {
                        seatVisualRefs.current[seat.id] = {
                          group: null,
                          orbMesh: null,
                          haloMesh: null,
                          orbMaterial: null,
                          haloMaterial: null,
                        };
                      }
                      seatVisualRefs.current[seat.id].orbMaterial = node;
                    }}
                    color={seatMember.color}
                    emissive={seatMember.color}
                    emissiveIntensity={isSpeaking ? 1.45 : baseOrbEmissiveIntensity}
                    metalness={0.72}
                    roughness={0.26}
                  />
                </mesh>

                <mesh
                  position={[0, orbY, orbZ]}
                  ref={(node) => {
                    if (!seatVisualRefs.current[seat.id]) {
                      seatVisualRefs.current[seat.id] = {
                        group: null,
                        orbMesh: null,
                        haloMesh: null,
                        orbMaterial: null,
                        haloMaterial: null,
                      };
                    }
                    seatVisualRefs.current[seat.id].haloMesh = node;
                  }}
                >
                  <sphereGeometry args={[orbRadius + 0.22, 32, 32]} />
                  <meshBasicMaterial
                    ref={(node) => {
                      if (!seatVisualRefs.current[seat.id]) {
                        seatVisualRefs.current[seat.id] = {
                          group: null,
                          orbMesh: null,
                          haloMesh: null,
                          orbMaterial: null,
                          haloMaterial: null,
                        };
                      }
                      seatVisualRefs.current[seat.id].haloMaterial = node;
                    }}
                    color={seatMember.color}
                    transparent
                    opacity={isSpeaking ? 0.22 : baseHaloOpacity}
                  />
                </mesh>

                {bubbleVisible && bubbleMessage ? (
                  <CouncilSpeechBubbleAnchor
                    anchorPosition={[0, labelY + 1.36, 0.22]}
                    seatId={seat.id}
                    onAnchorChange={onBubbleAnchorChange}
                  />
                ) : null}

                {isHovered || isSelected ? (
                  <Html
                    position={[0, labelY, 0.18]}
                    center
                    zIndexRange={[14, 1]}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div
                      className="rounded-lg border border-white/20 bg-[#070d1a]/88 px-2.5 py-1.5 text-center shadow-lg backdrop-blur-md"
                      style={{
                        boxShadow: `0 2px 16px rgba(0,0,0,0.45), 0 0 0 1px ${seatMember.color}40`,
                      }}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92">
                        {seatMember.name}
                      </div>
                      {seatMember.role.trim().toLowerCase() !== seatMember.name.trim().toLowerCase() ? (
                        <div className="mt-1 text-[9px] font-medium tracking-[0.12em] text-white/48">
                          {seatMember.role}
                        </div>
                      ) : null}
                    </div>
                  </Html>
                ) : null}
              </>
            ) : null}
          </group>
        );
      })}

      {/* + Buttons neben den aeussersten Sitzen */}
      {leftMostSeat ? (
        <CouncilSeatAddButton
          position={[
            leftMostSeat.position.x - 2.15,
            leftMostSeat.position.y + 1.25,
            leftMostSeat.position.z + 0.15,
          ]}
          onAdd={() => setExtraLeftCount((value) => value + 1)}
        />
      ) : null}

      {rightMostSeat ? (
        <CouncilSeatAddButton
          position={[
            rightMostSeat.position.x + 2.15,
            rightMostSeat.position.y + 1.25,
            rightMostSeat.position.z + 0.15,
          ]}
          onAdd={() => setExtraRightCount((value) => value + 1)}
        />
      ) : null}
    </group>
  );
}

function CouncilSpeechBubbleLayer({
  bubbleAnchors,
  foregroundBubbleSeatId,
  onBringToFront,
}: {
  bubbleAnchors: CouncilBubbleAnchorMap;
  foregroundBubbleSeatId: string | null;
  onBringToFront: (seatId: string) => void;
}) {
  const mode = useAgentsSpatialStore((state) => state.mode);
  const speakingCouncilSeatId = useAgentsSpatialStore((state) => state.speakingCouncilSeatId);
  const openCouncilSpeechBubbleIds = useAgentsSpatialStore((state) => state.openCouncilSpeechBubbleIds);
  const closeCouncilSpeechBubble = useAgentsSpatialStore((state) => state.closeCouncilSpeechBubble);
  const setOpenCouncilChatMember = useAgentsSpatialStore((state) => state.setOpenCouncilChatMember);
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const activeCouncilDraftMemberMessages = useAgentsStore((state) => state.activeCouncilDraftMemberMessages);

  const sortedSeatIds = useMemo(() => {
    const seatOrder = new Map(activeCouncilDraftSeatMembers.map((member, index) => [member.seatId, index]));
    return Object.keys(openCouncilSpeechBubbleIds).sort((leftSeatId, rightSeatId) => {
      return (seatOrder.get(leftSeatId) ?? 999) - (seatOrder.get(rightSeatId) ?? 999);
    });
  }, [activeCouncilDraftSeatMembers, openCouncilSpeechBubbleIds]);

  if (mode !== 'council') {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {sortedSeatIds.map((seatId, index) => {
        const seatMember =
          activeCouncilDraftSeatMembers.find((member) => member.seatId === seatId) || null;
        const bubbleAnchor = bubbleAnchors[seatId];
        const bubbleMessageId = openCouncilSpeechBubbleIds[seatId];
        const bubbleMessage = bubbleMessageId
          ? (activeCouncilDraftMemberMessages[seatId] || []).find((message) => message.id === bubbleMessageId) || null
          : null;

        if (!seatMember || !bubbleAnchor?.visible || !bubbleMessage) {
          return null;
        }

        const bubbleZIndex = foregroundBubbleSeatId === seatId ? 200 : 16 + index;

        return (
          <div
            key={seatId}
            className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border text-left text-[10px] leading-relaxed text-white shadow-[0_14px_34px_rgba(0,0,0,0.42)] backdrop-blur-md"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate3d(${bubbleAnchor.left}px, ${bubbleAnchor.top}px, 0) translate3d(-50%, -50%, 0)`,
              background: 'rgba(7,13,26,0.9)',
              borderColor: `${seatMember.color}55`,
              width: '186px',
              minWidth: '186px',
              maxWidth: '186px',
              height: '152px',
              minHeight: '152px',
              maxHeight: '152px',
              overflow: 'hidden',
              boxShadow: `0 10px 28px rgba(0,0,0,0.38), 0 0 0 1px ${seatMember.color}28, 0 0 14px ${seatMember.color}28`,
              zIndex: bubbleZIndex,
              willChange: 'transform',
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onBringToFront(seatId);
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: seatMember.color, boxShadow: `0 0 8px ${seatMember.color}` }}
                />
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/90">
                  {speakingCouncilSeatId === seatId ? `${seatMember.name} is speaking` : seatMember.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenCouncilChatMember(seatId);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Open in chat panel"
                  title="Open in chat panel"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeCouncilSpeechBubble(seatId);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close speech bubble"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 px-2.5 py-2 text-white/85"
              style={{
                minHeight: 0,
                maxHeight: '114px',
                overflowY: 'auto',
                overflowX: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            >
              {bubbleMessage.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpatialSceneContent({
  onCouncilBubbleAnchorChange,
}: {
  onCouncilBubbleAnchorChange: (seatId: string, nextAnchor: CouncilBubbleAnchorSnapshot | null) => void;
}) {
  const selectedAgentId = useSelectedAgentId();
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const customAgents = useAgentsStore((state) => state.customAgents);
  const conversations = useAgentsStore((state) => state.conversations);
  const tasks = useScheduledTasksStore((state) => state.tasks);
  const configs = useAgentConfigStore((state) => state.configs);

  const hubView = useAgentsSpatialStore((state) => state.hubView);
  const cameraTargetId = useAgentsSpatialStore((state) => state.cameraTargetId);
  const selectedTaskId = useAgentsSpatialStore((state) => state.selectedTaskId);
  const activeGroupRoomId = useAgentsSpatialStore((state) => state.activeGroupRoomId);
  const setHubView = useAgentsSpatialStore((state) => state.setHubView);
  const focusAgent = useAgentsSpatialStore((state) => state.focusAgent);
  const setSelectedTaskId = useAgentsSpatialStore((state) => state.setSelectedTaskId);
  const setActiveGroupRoom = useAgentsSpatialStore((state) => state.setActiveGroupRoom);
  const setSelectedCouncilSeat = useAgentsSpatialStore((state) => state.setSelectedCouncilSeat);
  const mode = 'council';

  const hubGraph = useMemo(
    () =>
      buildSpatialGraph({
        customAgents,
        conversations,
        tasks,
        configs,
      }),
    [configs, conversations, customAgents, tasks]
  );

  const groupGraph = useMemo(
    () =>
      activeGroupRoomId
        ? buildGroupSpatialGraph({
            groupId: activeGroupRoomId,
            customAgents,
            conversations,
            tasks,
            configs,
          })
        : null,
    [activeGroupRoomId, configs, conversations, customAgents, tasks]
  );

  const groupsOverviewGraph = useMemo(
    () =>
      buildGroupsOverviewSpatialGraph({
        customAgents,
        conversations,
        tasks,
        configs,
      }),
    [configs, conversations, customAgents, tasks]
  );

  const councilPreviewGraph = useMemo(
    () => buildCouncilPreviewSpatialGraph(),
    []
  );

  // --------------------------------------------
  // Dynamischer Council-Fokus und Kamera-Override
  // Werden vom CouncilPreviewStage per Callback geliefert.
  // --------------------------------------------
  const councilFocusRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 2.4, z: -8 });
  const councilOffsetRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 5.8, z: 19.5 });
  const [councilFocus, setCouncilFocus] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 2.4, z: -8 });
  const [councilOffset, setCouncilOffset] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 5.8, z: 19.5 });

  const handleCouncilFramingChange = useCallback(
    (focus: { x: number; y: number; z: number }, offset: { x: number; y: number; z: number }) => {
      councilFocusRef.current = focus;
      councilOffsetRef.current = offset;
      setCouncilFocus(focus);
      setCouncilOffset(offset);
    },
    [],
  );

  const graph = councilPreviewGraph;
  const groupCenterNode =
    mode === 'group' && activeGroupRoomId && selectedAgentId === activeGroupRoomId
      ? graph.agentNodes[0] || null
      : null;

  useEffect(() => {
    if (selectedAgentId) {
      focusAgent(selectedAgentId);
    }
  }, [focusAgent, selectedAgentId]);

  useEffect(() => {
    if (mode !== 'council') {
      setSelectedCouncilSeat(null);
    }
  }, [mode, setSelectedCouncilSeat]);

  const selectedNode =
    (selectedAgentId
      ? graph.agentNodes.find((node) => node.id === selectedAgentId)
      : null) || groupCenterNode || null;

  const cameraNode =
    (cameraTargetId
      ? graph.agentNodes.find((node) => node.id === cameraTargetId)
      : null) || selectedNode;
  const overviewFocusPosition =
    mode === 'groups'
      ? { x: 0, y: 0, z: 0 }
      : mode === 'council'
        ? councilFocus
      : null;

  const councilCameraOverride = mode === 'council' ? councilOffset : null;

  const showTaskLayer = mode === 'tasks';
  const showConversationLayer = mode === 'chat';

  // Im Tasks-/Settings-Modus nur den ausgewaehlten Orb isoliert zeigen
  const isolatedMode = mode === 'tasks' || mode === 'settings';
  const visibleAgentNodes = isolatedMode
    ? graph.agentNodes.filter((node) => node.id === selectedAgentId)
    : [];

  return (
    <>
      <ambientLight intensity={0.92} />
      <directionalLight position={[18, 24, 12]} intensity={1.35} color="#dbeafe" />
      <pointLight position={[0, 10, 0]} intensity={1.4} color="#8b5cf6" />
      <SpatialCameraController
        focusPosition={cameraNode?.worldPosition || overviewFocusPosition}
        mode={mode}
        cameraOverride={councilCameraOverride}
      />

      {/* Connections nur im Hub (idle) */}
      {!isolatedMode && mode !== 'council' ? (
        <SpatialConnections
          graph={graph}
          showTasks={showTaskLayer}
          showConversations={showConversationLayer}
        />
      ) : null}

      {mode === 'council' ? (
        <CouncilPreviewStage
          onFramingChange={handleCouncilFramingChange}
          onBubbleAnchorChange={onCouncilBubbleAnchorChange}
        />
      ) : null}

      {visibleAgentNodes.map((node) => (
        <AgentOrb3D
          key={node.id}
          node={node}
          isSelected={selectedAgentId === node.id}
          isolatedMode={isolatedMode}
          onSelect={(agentId) => {
            setSelectedTaskId(null);
            if (mode === 'groups') {
              const targetGroupId = node.rootGroupId || node.parentGroupId;
              const targetGroup = targetGroupId
                ? customAgents.find((agent) => agent.id === targetGroupId && agent.type === 'group')
                : null;
              const targetAdminId = targetGroup?.adminAgentId?.trim() || targetGroup?.id || null;

              setHubView('groups');
              setActiveGroupRoom(targetGroup?.id || null);
              // Im Gruppen-Hub beim Oeffnen einer Gruppe keinen
              // Admin automatisch selektieren, nur dorthin zoomen.
              setSelectedAgent(null);
              focusAgent(targetAdminId);
              return;
            }

            const customAgent = customAgents.find((agent) => agent.id === agentId);
            if (customAgent?.type === 'group') {
              setActiveGroupRoom(agentId);
            }
            setSelectedAgent(agentId);
            focusAgent(agentId);
          }}
        />
      ))}

      {showTaskLayer && !isolatedMode
        ? graph.taskNodes.map((node) => (
            <SceneTaskNode
              key={node.id}
              node={node}
              isSelected={selectedTaskId === node.id}
              onSelect={(taskId, targetId) => {
                setSelectedTaskId(taskId);
                setSelectedAgent(targetId);
                focusAgent(targetId);
              }}
            />
          ))
        : null}

      {showConversationLayer
        ? graph.conversationNodes.map((node) => (
            <SceneConversationNode key={node.id} node={node} />
          ))
        : null}
    </>
  );
}

export function AgentsSpatialScene() {
  const [bubbleAnchors, setBubbleAnchors] = useState<CouncilBubbleAnchorMap>({});
  const [foregroundBubbleSeatId, setForegroundBubbleSeatId] = useState<string | null>(null);
  const openCouncilSpeechBubbleIds = useAgentsSpatialStore((state) => state.openCouncilSpeechBubbleIds);

  const handleCouncilBubbleAnchorChange = useCallback(
    (seatId: string, nextAnchor: CouncilBubbleAnchorSnapshot | null) => {
      setBubbleAnchors((currentAnchors) => {
        if (!nextAnchor) {
          if (!(seatId in currentAnchors)) {
            return currentAnchors;
          }

          const nextAnchors = { ...currentAnchors };
          delete nextAnchors[seatId];
          return nextAnchors;
        }

        const currentAnchor = currentAnchors[seatId];
        if (
          currentAnchor &&
          currentAnchor.visible === nextAnchor.visible &&
          Math.abs(currentAnchor.left - nextAnchor.left) <= 0.25 &&
          Math.abs(currentAnchor.top - nextAnchor.top) <= 0.25
        ) {
          return currentAnchors;
        }

        return {
          ...currentAnchors,
          [seatId]: nextAnchor,
        };
      });
    },
    [],
  );

  useEffect(() => {
    if (!foregroundBubbleSeatId) {
      return;
    }

    if (!openCouncilSpeechBubbleIds[foregroundBubbleSeatId]) {
      setForegroundBubbleSeatId(null);
    }
  }, [foregroundBubbleSeatId, openCouncilSpeechBubbleIds]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 20, 16], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => {
          const { activeGroupRoomId } = useAgentsSpatialStore.getState();
          useAgentsStore.getState().setSelectedAgent(null);
          useAgentsSpatialStore.getState().setSelectedTaskId(null);
          useAgentsSpatialStore.getState().setSelectedCouncilSeat(null);
          useAgentsSpatialStore.getState().setOpenCouncilChatMember(null);
          useAgentsSpatialStore.getState().focusAgent(null);
          // Im Gruppenraum nur die Auswahl loesen, aber im Raum bleiben.
          if (!activeGroupRoomId) {
            useAgentsSpatialStore.getState().setActiveGroupRoom(null);
          }
        }}
      >
        <SpatialSceneContent onCouncilBubbleAnchorChange={handleCouncilBubbleAnchorChange} />
      </Canvas>

      <CouncilSpeechBubbleLayer
        bubbleAnchors={bubbleAnchors}
        foregroundBubbleSeatId={foregroundBubbleSeatId}
        onBringToFront={setForegroundBubbleSeatId}
      />
    </div>
  );
}
