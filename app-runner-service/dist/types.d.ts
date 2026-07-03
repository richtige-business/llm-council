export interface ServiceConfig {
    port: number;
    vncHost: string;
    vncPort: number;
    vncPassword: string | null;
    sessionTimeoutMs: number;
    maxSessions: number;
    screenshotDir: string;
}
export declare const DEFAULT_CONFIG: ServiceConfig;
export interface DesktopSession {
    id: string;
    createdAt: Date;
    lastActivityAt: Date;
    isConnected: boolean;
    activeApp: string | null;
}
export interface RunningApp {
    name: string;
    bundleId: string;
    pid: number;
    isActive: boolean;
}
export interface AppInfo {
    name: string;
    path: string;
    icon?: string;
}
export interface CreateSessionRequest {
    vncPassword?: string;
}
export interface LaunchAppRequest {
    appName: string;
    sessionId: string;
}
export interface CloseAppRequest {
    appName: string;
    sessionId: string;
}
export interface ScreenshotRequest {
    sessionId: string;
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface SessionResponse {
    sessionId: string;
    createdAt: string;
    isConnected: boolean;
    activeApp: string | null;
}
export interface AppListResponse {
    apps: RunningApp[];
}
export interface ScreenshotResponse {
    screenshot: string;
    timestamp: string;
    width: number;
    height: number;
}
export interface LaunchAppResponse {
    success: boolean;
    appName: string;
    message: string;
}
export interface ErrorResponse {
    error: string;
    message: string;
    code: string;
}
export interface VncProxyConfig {
    targetHost: string;
    targetPort: number;
    password: string | null;
}
