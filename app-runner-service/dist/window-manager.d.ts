export interface WindowInfo {
    windowId: number;
    appName: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isOnScreen: boolean;
}
export declare function getWindowInfo(appName: string): Promise<WindowInfo | null>;
export declare function getAllWindows(appName: string): Promise<WindowInfo[]>;
export declare function hideWindow(appName: string): Promise<boolean>;
export declare function showWindow(appName: string): Promise<boolean>;
export declare function waitForWindow(appName: string, maxWaitMs?: number): Promise<WindowInfo | null>;
export declare function hideAppWindow(appName: string): Promise<boolean>;
