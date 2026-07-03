import { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { VncProxyConfig } from './types.js';
export declare class VncProxy {
    private wss;
    private config;
    private activeConnections;
    constructor(server: Server, config: VncProxyConfig);
    handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): void;
    private handleConnection;
    private cleanup;
    getActiveConnectionCount(): number;
    shutdown(): Promise<void>;
}
