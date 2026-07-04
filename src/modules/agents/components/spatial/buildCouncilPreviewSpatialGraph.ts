// ============================================
// buildCouncilPreviewSpatialGraph.ts - Vorschau-Layout fuer den Council-Raum
//
// Zweck: Definiert die Sitzpositionen auf einem sanften Kreisbogen
//        und berechnet den dynamischen Kamerafokus, damit alle
//        Sitze und Add-Buttons immer im Bild sind.
// Verwendet von: AgentsSpatialScene, AgentsModuleShell
// ============================================

import type { SpatialGraph, SpatialVector3 } from '../../spatial-types';

export interface CouncilSeatDefinition {
  id: string;
  label: string;
  position: SpatialVector3;
  rotationY?: number;
  elevated?: boolean;
}

// --------------------------------------------
// Bogen-Parameter: Die originalen 4 Sitzpositionen liegen auf
// einem Kreisbogen mit Mittelpunkt HINTER dem Betrachter.
//   Inner-Paar (±0.244 rad)  → x ≈ ±5.8, z ≈ -8.8
//   Outer-Paar (±0.381 rad)  → x ≈ ±8.9, z ≈ -7.8
// Neue Sitze werden mit dem gleichen Winkelschritt (0.137 rad)
// auf demselben Bogen weiter nach aussen ergaenzt.
// --------------------------------------------
const ARC_CENTER_Z = 14.5;
const ARC_RADIUS = 24;
const BASE_ANGLES = [0.244, 0.381];
const BASE_Y = [0.35, 0.15];
const ANGLE_STEP = 0.137;
const ROTATION_FACTOR = 0.42;
const CHAIR_POSITION: SpatialVector3 = { x: 0, y: 1.65, z: -12.4 };

// Y-Offset der <group> in CouncilPreviewStage, damit der
// Kamerafokus in Weltkoordinaten korrekt bleibt.
const STAGE_OFFSET_Y = 0.95;

// --------------------------------------------
// Erzeugt die Sitzliste: 1 Chair + 4 Basis-Sitze +
// unabhaengig erweiterbare linke/rechte Zusatzsitze
// auf demselben Bogen.
// --------------------------------------------
export function buildCouncilArcSeats(
  extraLeftCount: number,
  extraRightCount: number,
): CouncilSeatDefinition[] {
  const chair: CouncilSeatDefinition = {
    id: 'chair-center',
    label: 'Chair',
    position: CHAIR_POSITION,
    rotationY: 0,
    elevated: true,
  };

  const seats: CouncilSeatDefinition[] = [];

  for (let tier = 0; tier < BASE_ANGLES.length; tier += 1) {
    const angle = BASE_ANGLES[tier];
    const y = BASE_Y[tier];
    const z = ARC_CENTER_Z - Math.cos(angle) * ARC_RADIUS;

    seats.push({
      id: `arc-left-${tier}`,
      label: 'Council Seat',
      position: { x: -Math.sin(angle) * ARC_RADIUS, y, z },
      rotationY: angle * ROTATION_FACTOR,
    });

    seats.push({
      id: `arc-right-${tier}`,
      label: 'Council Seat',
      position: { x: Math.sin(angle) * ARC_RADIUS, y, z },
      rotationY: -angle * ROTATION_FACTOR,
    });
  }

  const outerAngle = BASE_ANGLES[BASE_ANGLES.length - 1];

  for (let i = 0; i < Math.max(0, extraLeftCount); i += 1) {
    const angle = outerAngle + (i + 1) * ANGLE_STEP;
    const z = ARC_CENTER_Z - Math.cos(angle) * ARC_RADIUS;

    seats.push({
      id: `arc-left-extra-${i}`,
      label: 'Council Seat',
      position: { x: -Math.sin(angle) * ARC_RADIUS, y: 0.15, z },
      rotationY: angle * ROTATION_FACTOR,
    });
  }

  for (let i = 0; i < Math.max(0, extraRightCount); i += 1) {
    const angle = outerAngle + (i + 1) * ANGLE_STEP;
    const z = ARC_CENTER_Z - Math.cos(angle) * ARC_RADIUS;

    seats.push({
      id: `arc-right-extra-${i}`,
      label: 'Council Seat',
      position: { x: Math.sin(angle) * ARC_RADIUS, y: 0.15, z },
      rotationY: -angle * ROTATION_FACTOR,
    });
  }

  return [chair, ...seats];
}

// --------------------------------------------
// Berechnet Fokus und Kamera-Offset dynamisch,
// sodass alle Sitze und die +Buttons sichtbar bleiben.
// Focus-Koordinaten sind in Weltkoordinaten (inkl. Stage-Offset).
// --------------------------------------------
export function computeCouncilFraming(seats: CouncilSeatDefinition[]): {
  focus: SpatialVector3;
  cameraOffset: SpatialVector3;
} {
  if (seats.length === 0) {
    return {
      focus: { x: 0, y: 2.0 + STAGE_OFFSET_Y, z: -8 },
      cameraOffset: { x: 0, y: 5.8, z: 19.5 },
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const seat of seats) {
    if (seat.position.x < minX) minX = seat.position.x;
    if (seat.position.x > maxX) maxX = seat.position.x;
    if (seat.position.z < minZ) minZ = seat.position.z;
    if (seat.position.z > maxZ) maxZ = seat.position.z;
  }

  // Zusaetzlicher Rand, damit die seitlichen +Buttons auch bei
  // vielen Zusatzsitzen sicher innerhalb des Viewports liegen.
  // Zusatzsitze wandern auf dem Bogen weiter nach aussen UND
  // (durch den abnehmenden cos(angle)) naeher an die Kamera heran,
  // daher fliesst neben spanX auch spanZ in den Zoom-Faktor ein.
  const buttonPadding = 6;
  const spanX = maxX + buttonPadding - (minX - buttonPadding);
  const spanZ = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const baseDistance = 17.0;
  const extraDistanceFromX = Math.max(0, (spanX - 20.5) * 0.85);
  const extraDistanceFromZ = Math.max(0, (spanZ - 2) * 1.3);
  const extraDistance = Math.max(extraDistanceFromX, extraDistanceFromZ);

  return {
    focus: {
      x: centerX,
      y: 0.92 + STAGE_OFFSET_Y,
      z: centerZ + 1.2,
    },
    cameraOffset: {
      x: 0,
      y: 3.1 + extraDistance * 0.14,
      z: baseDistance + extraDistance,
    },
  };
}

export function buildCouncilPreviewSpatialGraph(): SpatialGraph {
  return {
    nodes: [],
    agentNodes: [],
    taskNodes: [],
    conversationNodes: [],
    connections: [],
    nodesById: {},
  };
}
