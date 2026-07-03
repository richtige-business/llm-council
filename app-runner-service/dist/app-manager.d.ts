import type { RunningApp } from './types.js';
export declare class AppManager {
    private screenshotDir;
    constructor(screenshotDir: string);
    private ensureScreenshotDir;
    launchApp(appName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    closeApp(appName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    focusApp(appName: string): Promise<void>;
    isAppRunning(appName: string): Promise<boolean>;
    listRunningApps(): Promise<RunningApp[]>;
    takeScreenshot(): Promise<{
        screenshot: string;
        width: number;
        height: number;
    }>;
}
