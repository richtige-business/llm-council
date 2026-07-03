// ============================================
// WindowCapture.swift - CGWindowListCreateImage Capture
//
// Zweck: Captured ein spezifisches macOS-Fenster via
//        CGWindowListCreateImage in einer Schleife.
//        Deutlich zuverlaessiger als SCStream, da keine
//        spezielle App-Verbindung noetig ist.
//        Erzeugt JPEG-Frames statt Video-Stream.
// Verwendet von: CapturePipeline.swift
// ============================================

import Foundation
import CoreGraphics
import CoreImage
import ImageIO
import UniformTypeIdentifiers

// --------------------------------------------
// WindowCapture
// Screenshot-basiertes Capturing via CGWindowListCreateImage.
// Laeuft in einer Timer-Schleife mit konfigurierbarer FPS.
// Gibt JPEG-Daten ueber Callback zurueck.
// --------------------------------------------

class WindowCapture: NSObject {
    // Die Window-ID des zu capturenden Fensters
    private let windowId: CGWindowID

    // Konfiguration
    private let fps: Int
    private let captureAudio: Bool
    private let jpegQuality: CGFloat = 0.7  // JPEG-Qualitaet (0.0-1.0)

    // Timer fuer die Capture-Schleife
    private var captureTimer: DispatchSourceTimer?
    private let captureQueue = DispatchQueue(
        label: "com.lifeos.capture.screenshot",
        qos: .userInteractive
    )

    // Callbacks
    // Wird mit JPEG-Daten aufgerufen fuer jeden Frame
    var onJpegFrame: ((Data) -> Void)?
    // Legacy Callbacks (fuer Kompatibilitaet mit Pipeline)
    var onVideoFrame: ((Any) -> Void)?
    var onAudioFrame: ((Any) -> Void)?

    // Status
    private(set) var isCapturing = false

    // Diagnose
    private var frameCount: UInt64 = 0
    private var lastLogTime: Date = Date()
    private var lastFrameSize: Int = 0

    // SCWindow-Wrapper (nicht mehr benoetigt, aber fuer API-Kompatibilitaet)
    private let window: Any?

    // --------------------------------------------
    // Initialisierung mit SCWindow (Legacy-Signatur)
    // Extrahiert die WindowID aus dem SCWindow
    // --------------------------------------------

    init(window: Any, fps: Int, captureAudio: Bool) {
        // Wir brauchen nur die Window-ID, nicht das SCWindow
        self.window = window
        self.fps = fps
        self.captureAudio = captureAudio

        // Window-ID aus SCWindow extrahieren
        if let scWindow = window as? NSObject,
           scWindow.responds(to: Selector(("windowID"))) {
            self.windowId = CGWindowID(scWindow.value(forKey: "windowID") as? UInt32 ?? 0)
        } else {
            self.windowId = 0
        }

        super.init()
    }

    // Direkte Initialisierung mit Window-ID
    init(windowId: CGWindowID, fps: Int) {
        self.window = nil
        self.windowId = windowId
        self.fps = fps
        self.captureAudio = false
        super.init()
    }

    // --------------------------------------------
    // Capture starten
    // Startet eine Timer-basierte Screenshot-Schleife
    // --------------------------------------------

    func start() async throws {
        guard !isCapturing else {
            log("WindowCapture laeuft bereits")
            return
        }

        guard windowId > 0 else {
            throw CaptureError.windowNotFound(windowId)
        }

        // Testbild machen um sicherzustellen dass das Fenster erreichbar ist
        guard captureWindowToJpeg() != nil else {
            throw CaptureError.captureStartFailed(
                "Kann Fenster \(windowId) nicht capturen. Fenster existiert nicht oder ist nicht zugreifbar."
            )
        }

        // Timer starten: Captured alle 1/fps Sekunden
        let interval = 1.0 / Double(fps)
        let timer = DispatchSource.makeTimerSource(queue: captureQueue)
        timer.schedule(
            deadline: .now(),
            repeating: interval,
            leeway: .milliseconds(5)
        )

        timer.setEventHandler { [weak self] in
            self?.captureFrame()
        }

        timer.resume()
        captureTimer = timer
        isCapturing = true
        frameCount = 0
        lastLogTime = Date()

        log("WindowCapture gestartet: Window \(windowId) @ \(fps)fps (JPEG-Modus)")
    }

    // --------------------------------------------
    // Capture stoppen
    // Timer anhalten und Ressourcen freigeben
    // --------------------------------------------

    func stop() {
        guard isCapturing else { return }

        captureTimer?.cancel()
        captureTimer = nil
        isCapturing = false
        log("WindowCapture gestoppt nach \(frameCount) Frames")
    }

    // --------------------------------------------
    // Einzelnen Frame capturen und via Callback senden
    // Wird vom Timer aufgerufen
    // --------------------------------------------

    private func captureFrame() {
        guard let jpegData = captureWindowToJpeg() else { return }

        frameCount += 1
        lastFrameSize = jpegData.count

        // JPEG-Frame an Callback senden
        onJpegFrame?(jpegData)

        // Alle 5 Sekunden Statistik loggen
        let now = Date()
        let elapsed = now.timeIntervalSince(lastLogTime)
        if elapsed >= 5.0 {
            let actualFps = Double(frameCount) / elapsed
            let avgKB = lastFrameSize / 1024
            log("Capture: \(String(format: "%.1f", actualFps)) FPS, ~\(avgKB) KB/Frame")
            frameCount = 0
            lastLogTime = now
        }
    }

    // --------------------------------------------
    // Fenster als JPEG capturen
    // Nutzt CGWindowListCreateImage fuer zuverlaessiges
    // Fenster-Capturing (funktioniert auch off-screen/hidden)
    // --------------------------------------------

    private func captureWindowToJpeg() -> Data? {
        // CGWindowListCreateImage captured ein spezifisches Fenster
        // CGRect.null = automatisch die Bounds des Fensters nutzen
        guard let cgImage = CGWindowListCreateImage(
            CGRect.null,
            .optionIncludingWindow,
            windowId,
            [.boundsIgnoreFraming, .bestResolution]
        ) else {
            return nil
        }

        // CGImage zu JPEG konvertieren
        let mutableData = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(
            mutableData as CFMutableData,
            UTType.jpeg.identifier as CFString,
            1,
            nil
        ) else {
            return nil
        }

        // JPEG-Qualitaet setzen
        let options: [CFString: Any] = [
            kCGImageDestinationLossyCompressionQuality: jpegQuality
        ]

        CGImageDestinationAddImage(destination, cgImage, options as CFDictionary)

        guard CGImageDestinationFinalize(destination) else {
            return nil
        }

        return mutableData as Data
    }
}
