// ============================================
// SpatialCameraController.tsx - Sanfte Kamerafahrten im Agents-Raum
//
// Zweck: Bewegt Kamera und Orbit-Target weich auf den
//        aktuell fokussierten Agenten bzw. Raum-Kontext.
//        Nach Abschluss der Animation gibt OrbitControls
//        die volle Kontrolle an den User zurueck.
// Verwendet von: AgentsSpatialScene
// ============================================

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import type { AgentsSpatialMode, SpatialVector3 } from '../../spatial-types';

interface SpatialCameraControllerProps {
  focusPosition: SpatialVector3 | null;
  mode: AgentsSpatialMode;
  cameraOverride?: SpatialVector3 | null;
}

// Kamera-Offset je nach aktivem Modus (relativ zum Fokus-Punkt).
// tasks/settings: Kamera unter dem Orb → Orb erscheint oben im Viewport.
const MODE_CAMERA_OFFSETS: Record<AgentsSpatialMode, SpatialVector3> = {
  idle: { x: 0, y: 20, z: 16 },
  chat: { x: 0, y: 18, z: 13 },
  settings: { x: 0, y: -5, z: 14 },
  tasks: { x: 0, y: -5, z: 14 },
  groups: { x: 0, y: 54, z: 0.01 },
  group: { x: 0, y: 16, z: 20 },
  council: { x: 0, y: 5.8, z: 19.5 },
};

// Blickziel-Versatz: Im isolierten Modus leicht unter den Orb schauen,
// damit der Orb selbst im oberen Bereich des Bildes landet.
const MODE_TARGET_Y_OFFSETS: Record<AgentsSpatialMode, number> = {
  idle: 0,
  chat: 0,
  settings: -4.5,
  tasks: -4.5,
  groups: 0,
  group: 0,
  council: 1.2,
};

// Schwellenwert: unter diesem Abstand gilt die Animation als "angekommen"
const ARRIVAL_THRESHOLD = 0.15;
// Interpolations-Geschwindigkeit (0–1, hoeher = schneller)
const LERP_SPEED_CAMERA = 0.06;
const LERP_SPEED_TARGET = 0.08;

export function SpatialCameraController({
  focusPosition,
  mode,
  cameraOverride,
}: SpatialCameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  // Ob gerade eine Kamerafahrt laeuft
  const isAnimating = useRef(false);

  const desiredTarget = useMemo(
    () =>
      focusPosition
        ? new Vector3(
            focusPosition.x,
            focusPosition.y + MODE_TARGET_Y_OFFSETS[mode],
            focusPosition.z
          )
        : null,
    [focusPosition, mode],
  );

  const desiredCameraPosition = useMemo(() => {
    if (!focusPosition) return null;
    const offset = cameraOverride || MODE_CAMERA_OFFSETS[mode];
    return new Vector3(
      focusPosition.x + offset.x,
      focusPosition.y + offset.y,
      focusPosition.z + offset.z,
    );
  }, [focusPosition, mode, cameraOverride]);

  // Neue Animation starten, wenn sich Fokus oder Modus aendern
  useEffect(() => {
    if (!desiredCameraPosition || !desiredTarget) return;
    isAnimating.current = true;
  }, [desiredCameraPosition, desiredTarget]);

  // Smooth-Transition pro Frame – stoppt automatisch, sobald Ziel erreicht
  useFrame(() => {
    if (!isAnimating.current) return;
    if (!desiredCameraPosition || !desiredTarget) {
      isAnimating.current = false;
      return;
    }

    camera.position.lerp(desiredCameraPosition, LERP_SPEED_CAMERA);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget, LERP_SPEED_TARGET);
      controlsRef.current.update();
    } else {
      camera.lookAt(desiredTarget);
    }

    // Kamera nah genug am Ziel? Animation beenden, OrbitControls freigeben
    const distanceToGoal = camera.position.distanceTo(desiredCameraPosition);
    if (distanceToGoal < ARRIVAL_THRESHOLD) {
      camera.position.copy(desiredCameraPosition);
      if (controlsRef.current) {
        controlsRef.current.target.copy(desiredTarget);
        controlsRef.current.update();
      }
      isAnimating.current = false;
    }
  });

  // Im Tasks-/Settings-Modus: Kamera fixiert, kein Orbit
  const isIsolated = mode === 'tasks' || mode === 'settings';
  // Im Council-Raum soll der User nicht rein- oder rauszoomen koennen,
  // damit die sorgfaeltig geframte Szene stabil bleibt.
  const disableZoom = isIsolated || mode === 'council';

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!isIsolated}
      enableZoom={!disableZoom}
      enableRotate={!isIsolated}
      enableDamping
      dampingFactor={0.12}
      minDistance={4}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={0.08}
      zoomSpeed={0.8}
      rotateSpeed={0.6}
    />
  );
}
