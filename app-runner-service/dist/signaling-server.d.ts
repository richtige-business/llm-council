import { IncomingMessage, Server as HttpServer } from 'http';
declare class SignalingRelay {
    private wss;
    private relays;
    attachToServer(_server: HttpServer): void;
    handleUpgrade(request: IncomingMessage, socket: any, head: Buffer): boolean;
    private handleBrowserConnection;
    private connectToHelper;
    shutdown(): void;
}
export declare const signalingRelay: SignalingRelay;
export {};
