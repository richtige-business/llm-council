export interface MouseInputEvent {
    sessionId: string;
    eventType: 'mousedown' | 'mouseup' | 'mousemove';
    x: number;
    y: number;
    button?: number;
}
export interface ScrollInputEvent {
    sessionId: string;
    eventType: 'scroll';
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
}
export interface KeyInputEvent {
    sessionId: string;
    eventType: 'keydown' | 'keyup';
    keyCode: number;
    key?: string;
    modifiers?: string[];
}
export type InputEvent = MouseInputEvent | ScrollInputEvent | KeyInputEvent;
declare class InputRelay {
    private helperConnections;
    sendInput(event: InputEvent): Promise<boolean>;
    private connectToHelper;
    shutdown(): void;
}
export declare const inputRelay: InputRelay;
export declare function validateInputEvent(body: Record<string, unknown>): InputEvent | null;
export {};
