// ============================================
// mock-trainer.ts - Mock Training Service
// 
// Zweck: Simuliert Training-Prozess für MVP
// Verwendet von: Training Jobs API
// ============================================

import type { TrainingJob, TrainingConfig, JobMetrics, TrainingLogEntry } from '../types';

// --------------------------------------------
// Training-Simulation Konfiguration
// --------------------------------------------

const MOCK_CONFIG = {
  // Schritte pro Sekunde (simuliert)
  stepsPerSecond: 5,
  // Basis-Verlust (Start)
  baseLoss: 2.5,
  // Ziel-Verlust (Ende)
  targetLoss: 0.3,
  // Varianz im Loss
  lossVariance: 0.1,
  // Update-Intervall in ms
  updateInterval: 1000,
};

// --------------------------------------------
// Mock Training State
// --------------------------------------------

interface MockTrainingState {
  jobId: string;
  currentStep: number;
  totalSteps: number;
  currentEpoch: number;
  totalEpochs: number;
  currentLoss: number;
  logs: TrainingLogEntry[];
  intervalId: NodeJS.Timeout | null;
  onUpdate: (state: MockTrainingState) => void;
  onComplete: (metrics: JobMetrics) => void;
  onError: (error: string) => void;
}

// Aktive Trainings
const activeTrainings = new Map<string, MockTrainingState>();

// --------------------------------------------
// Training starten
// --------------------------------------------

export function startMockTraining(
  job: TrainingJob,
  config: TrainingConfig,
  datasetRowCount: number,
  callbacks: {
    onUpdate: (progress: number, epoch: number, logs: TrainingLogEntry[]) => void;
    onComplete: (metrics: JobMetrics) => void;
    onError: (error: string) => void;
  }
): void {
  // Falls bereits läuft, abbrechen
  if (activeTrainings.has(job.id)) {
    stopMockTraining(job.id);
  }

  // Gesamtschritte berechnen
  const stepsPerEpoch = Math.ceil(datasetRowCount / config.batchSize);
  const totalSteps = stepsPerEpoch * config.epochs;

  // State initialisieren
  const state: MockTrainingState = {
    jobId: job.id,
    currentStep: 0,
    totalSteps,
    currentEpoch: 0,
    totalEpochs: config.epochs,
    currentLoss: MOCK_CONFIG.baseLoss,
    logs: [
      {
        timestamp: Date.now(),
        level: 'info',
        message: 'Mock-Training gestartet',
      },
      {
        timestamp: Date.now(),
        level: 'info',
        message: `Konfiguration: ${config.epochs} Epochen, ${datasetRowCount} Samples, Batch Size ${config.batchSize}`,
      },
    ],
    intervalId: null,
    onUpdate: () => {},
    onComplete: callbacks.onComplete,
    onError: callbacks.onError,
  };

  // Update-Funktion
  state.onUpdate = (s: MockTrainingState) => {
    const progress = Math.round((s.currentStep / s.totalSteps) * 100);
    callbacks.onUpdate(progress, s.currentEpoch, s.logs);
  };

  // Intervall starten
  state.intervalId = setInterval(() => {
    simulateTrainingStep(state);
  }, MOCK_CONFIG.updateInterval);

  activeTrainings.set(job.id, state);
}

// --------------------------------------------
// Training-Schritt simulieren
// --------------------------------------------

function simulateTrainingStep(state: MockTrainingState): void {
  // Schritte erhöhen
  state.currentStep += MOCK_CONFIG.stepsPerSecond;

  // Epoche berechnen
  const stepsPerEpoch = state.totalSteps / state.totalEpochs;
  const newEpoch = Math.floor(state.currentStep / stepsPerEpoch);

  // Epoche gewechselt?
  if (newEpoch > state.currentEpoch && newEpoch <= state.totalEpochs) {
    state.currentEpoch = newEpoch;
    state.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: `Epoche ${state.currentEpoch}/${state.totalEpochs} abgeschlossen`,
      step: state.currentStep,
    });
  }

  // Loss berechnen (sinkt über Zeit)
  const progress = state.currentStep / state.totalSteps;
  const lossDecay = Math.exp(-3 * progress); // Exponentieller Abfall
  const noise = (Math.random() - 0.5) * MOCK_CONFIG.lossVariance;
  state.currentLoss = MOCK_CONFIG.targetLoss + 
    (MOCK_CONFIG.baseLoss - MOCK_CONFIG.targetLoss) * lossDecay + noise;
  state.currentLoss = Math.max(MOCK_CONFIG.targetLoss * 0.8, state.currentLoss);

  // Gelegentlich Log-Eintrag
  if (state.currentStep % (MOCK_CONFIG.stepsPerSecond * 5) === 0) {
    state.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: `Training... Step ${state.currentStep}/${state.totalSteps}`,
      step: state.currentStep,
      loss: state.currentLoss,
      learningRate: 0.0001 * Math.pow(0.95, state.currentEpoch), // LR Decay
    });
  }

  // Update-Callback
  state.onUpdate(state);

  // Fertig?
  if (state.currentStep >= state.totalSteps) {
    completeTraining(state);
  }
}

// --------------------------------------------
// Training abschließen
// --------------------------------------------

function completeTraining(state: MockTrainingState): void {
  // Intervall stoppen
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  // Finale Logs
  state.logs.push({
    timestamp: Date.now(),
    level: 'info',
    message: 'Training abgeschlossen!',
    step: state.totalSteps,
    loss: state.currentLoss,
  });

  // Metriken generieren
  const metrics: JobMetrics = {
    trainLoss: state.currentLoss,
    evalLoss: state.currentLoss * (1.1 + Math.random() * 0.1), // Eval etwas höher
    trainingSamples: state.totalSteps * 4, // ~Batch Size
    stepsPerSecond: MOCK_CONFIG.stepsPerSecond,
    gpuMemoryUsed: 8192 + Math.random() * 2048, // 8-10 GB
  };

  // Callback
  state.onComplete(metrics);

  // Aufräumen
  activeTrainings.delete(state.jobId);
}

// --------------------------------------------
// Training stoppen
// --------------------------------------------

export function stopMockTraining(jobId: string): void {
  const state = activeTrainings.get(jobId);
  if (state) {
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    activeTrainings.delete(jobId);
  }
}

// --------------------------------------------
// Training-Status abfragen
// --------------------------------------------

export function getMockTrainingStatus(jobId: string): {
  isRunning: boolean;
  progress: number;
  currentEpoch: number;
  currentLoss: number;
} | null {
  const state = activeTrainings.get(jobId);
  if (!state) return null;

  return {
    isRunning: true,
    progress: Math.round((state.currentStep / state.totalSteps) * 100),
    currentEpoch: state.currentEpoch,
    currentLoss: state.currentLoss,
  };
}

// --------------------------------------------
// Kosten schätzen
// --------------------------------------------

export function estimateMockCost(
  datasetRowCount: number,
  config: TrainingConfig
): number {
  // Mock: 0 Kosten
  // In Produktion: GPU-Zeit * Preis
  return 0;
}








