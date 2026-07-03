// ============================================
// CapturePipeline.swift - Zentrale Capture-Orchestrierung
//
// Zweck: Verbindet WindowCapture (JPEG-Screenshots),
//        SignalingServer (WebSocket) und InputInjector
//        zu einer zusammenhaengenden Pipeline.
//        Sendet JPEG-Frames direkt per WebSocket.
// Verwendet von: main.swift
// ============================================

import Foundation
import CoreGraphics

// --------------------------------------------
// CapturePipeline
// Orchestriert:
// WindowCapture -> JPEG Frame -> WebSocket -> Browser
// Browser -> WebSocket -> InputInjector -> App
// --------------------------------------------

class CapturePipeline {
    let config: Config

    // Komponenten
    private var windowCapture: WindowCapture?
    private var signalingServer: SignalingServer?
    private var inputInjector: InputInjector?

    // Status
    private(set) var isRunning = false

    init(config: Config) {
        self.config = config
    }

    // --------------------------------------------
    // Pipeline starten
    // 1. Input-Injector erstellen
    // 2. Signaling-Server starten
    // 3. Window Capture starten (JPEG-Modus)
    // 4. JPEG-Frames an Signaling-Server weiterleiten
    // --------------------------------------------

    func start() async throws {
        guard !isRunning else {
            log("Pipeline laeuft bereits")
            return
        }

        log("Pipeline wird gestartet...")

        // 1. Input-Injector erstellen
        inputInjector = InputInjector(windowId: config.windowId)
        log("Input-Injector bereit")

        // 2. Signaling-Server starten
        signalingServer = SignalingServer(
            port: config.signalingPort,
            onInputEvent: { [weak self] event in
                self?.handleInputEvent(event)
            }
        )
        try await signalingServer!.start()
        log("Signaling-Server gestartet auf Port \(config.signalingPort)")

        // 3. Window Capture starten (JPEG-Screenshot-Modus)
        windowCapture = WindowCapture(windowId: config.windowId, fps: config.fps)

        // JPEG-Frames direkt an den WebSocket senden
        windowCapture!.onJpegFrame = { [weak self] jpegData in
            self?.signalingServer?.sendJpegFrame(jpegData)
        }

        try await windowCapture!.start()
        isRunning = true
        log("Capture-Pipeline laeuft! (JPEG-Modus, \(config.fps) FPS)")
    }

    // --------------------------------------------
    // Pipeline stoppen
    // --------------------------------------------

    func stop() {
        guard isRunning else { return }
        log("Pipeline wird gestoppt...")

        windowCapture?.stop()
        signalingServer?.stop()

        windowCapture = nil
        signalingServer = nil
        inputInjector = nil

        isRunning = false
        log("Pipeline gestoppt")
    }

    // --------------------------------------------
    // Input-Event vom Browser verarbeiten
    // --------------------------------------------

    private func handleInputEvent(_ event: InputEvent) {
        guard let injector = inputInjector else { return }

        switch event {
        case .mouseDown(let x, let y, let button):
            injector.mouseDown(at: CGPoint(x: x, y: y), button: button)
        case .mouseUp(let x, let y, let button):
            injector.mouseUp(at: CGPoint(x: x, y: y), button: button)
        case .mouseMove(let x, let y):
            injector.mouseMove(to: CGPoint(x: x, y: y))
        case .scroll(let x, let y, let deltaX, let deltaY):
            injector.scroll(at: CGPoint(x: x, y: y), deltaX: deltaX, deltaY: deltaY)
        case .keyDown(let keyCode, let modifiers):
            injector.keyDown(keyCode: keyCode, modifiers: modifiers)
        case .keyUp(let keyCode, let modifiers):
            injector.keyUp(keyCode: keyCode, modifiers: modifiers)
        }
    }
}

// --------------------------------------------
// Fehler-Typen
// --------------------------------------------

enum CaptureError: LocalizedError {
    case windowNotFound(CGWindowID)
    case permissionDenied
    case encoderSetupFailed(String)
    case captureStartFailed(String)

    var errorDescription: String? {
        switch self {
        case .windowNotFound(let id):
            return "Fenster mit ID \(id) nicht gefunden"
        case .permissionDenied:
            return "Screen Recording Berechtigung fehlt"
        case .encoderSetupFailed(let reason):
            return "Encoder-Setup fehlgeschlagen: \(reason)"
        case .captureStartFailed(let reason):
            return "Capture-Start fehlgeschlagen: \(reason)"
        }
    }
}

// --------------------------------------------
// Input-Event Typen
// --------------------------------------------

enum InputEvent {
    case mouseDown(x: Double, y: Double, button: Int)
    case mouseUp(x: Double, y: Double, button: Int)
    case mouseMove(x: Double, y: Double)
    case scroll(x: Double, y: Double, deltaX: Double, deltaY: Double)
    case keyDown(keyCode: UInt16, modifiers: CGEventFlags)
    case keyUp(keyCode: UInt16, modifiers: CGEventFlags)
}
