export interface CaptureSession {
    sessionId: string;
    windowId: number;
    appName: string;
    helperPort: number;
    helperPid: number | null;
    status: 'starting' | 'running' | 'stopped' | 'error';
    startedAt: number;
    lastError: string | null;
    fps: number;
    bitrate: number;
}
declare class CaptureManager {
    private sessions;
    private helperPath;
    private nextPort;
    private readonly maxPort;
    constructor();
    private cleanupOldHelpers;
    startCapture(sessionId: string, windowId: number, appName: string, fps?: number, bitrate?: number): Promise<CaptureSession>;
    stopCapture(sessionId: string): void;
    getSession(sessionId: string): CaptureSession | null;
    getAllSessions(): CaptureSession[];
    stopAll(): void;
    private handleHelperMessage;
    private waitForHelperReady;
    private getNextPort;
}
export declare const captureManager: CaptureManager;
export {};
