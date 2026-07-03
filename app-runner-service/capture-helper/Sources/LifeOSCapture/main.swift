// ============================================
// main.swift - LifeOSCapture Entrypoint
//
// Zweck: CLI-Entrypoint fuer den Screen-Capture-Helper.
//        Parst Argumente (Window-ID, Signaling-Port),
//        prueft Berechtigungen, startet Capture-Pipeline.
// Verwendet von: App Runner Service (capture-manager.ts)
// ============================================

import Foundation
import CoreGraphics
import ApplicationServices

// --------------------------------------------
// CLI-Argumente parsen
// Erwartet: --window-id <CGWindowID> --port <signalingPort>
// Optional: --fps <framerate> --bitrate <bps>
// --------------------------------------------

struct Config {
    var windowId: CGWindowID = 0
    var signalingPort: Int = 9090
    var fps: Int = 30
    var bitrate: Int = 5_000_000  // 5 Mbps
    var verbose: Bool = false
}

func parseArguments() -> Config {
    var config = Config()
    let args = CommandLine.arguments
    var i = 1

    while i < args.count {
        switch args[i] {
        case "--window-id":
            i += 1
            if i < args.count, let wid = UInt32(args[i]) {
                config.windowId = CGWindowID(wid)
            }
        case "--port":
            i += 1
            if i < args.count, let port = Int(args[i]) {
                config.signalingPort = port
            }
        case "--fps":
            i += 1
            if i < args.count, let fps = Int(args[i]) {
                config.fps = max(1, min(fps, 60))
            }
        case "--bitrate":
            i += 1
            if i < args.count, let br = Int(args[i]) {
                config.bitrate = br
            }
        case "--verbose", "-v":
            config.verbose = true
        case "--help", "-h":
            printUsage()
            exit(0)
        default:
            log("Unbekanntes Argument: \(args[i])")
        }
        i += 1
    }

    return config
}

func printUsage() {
    print("""
    LifeOSCapture - Native App Screen Capture Helper

    Verwendung:
      LifeOSCapture --window-id <id> --port <port> [optionen]

    Pflicht-Argumente:
      --window-id <id>    CGWindowID des zu capturenden Fensters
      --port <port>       Port fuer den WebSocket Signaling Server

    Optionale Argumente:
      --fps <n>           Framerate (1-60, Standard: 30)
      --bitrate <bps>     Video-Bitrate in bps (Standard: 5000000)
      --verbose, -v       Ausfuehrliches Logging
      --help, -h          Diese Hilfe anzeigen
    """)
}

// --------------------------------------------
// Logging-Hilfsfunktion
// Schreibt auf stderr, damit stdout fuer strukturierte
// Kommunikation mit dem Node.js-Prozess frei bleibt
// --------------------------------------------

func log(_ message: String) {
    FileHandle.standardError.write(
        "[LifeOSCapture] \(message)\n".data(using: .utf8)!
    )
}

// --------------------------------------------
// Berechtigungen pruefen
// Screen Recording und Accessibility muessen
// vom User in den Systemeinstellungen aktiviert sein
// --------------------------------------------

func checkPermissions() -> Bool {
    // CGWindowListCreateImage benoetigt Screen Recording Berechtigung
    // Diese wird vom Parent-Prozess (Cursor) geerbt
    // Wir pruefen ob CGWindowListCreateImage funktioniert
    let testImage = CGWindowListCreateImage(
        CGRect(x: 0, y: 0, width: 1, height: 1),
        .optionOnScreenOnly,
        kCGNullWindowID,
        .bestResolution
    )
    if testImage == nil {
        log("WARNUNG: CGWindowListCreateImage hat kein Bild geliefert.")
        log("Screen Recording Berechtigung moeglicherweise nicht erteilt.")
        log("Bitte unter: Systemeinstellungen > Datenschutz & Sicherheit > Bildschirmaufnahme")
        // Nicht sofort abbrechen – beim konkreten Fenster koennte es trotzdem klappen
    } else {
        log("Screen Recording Berechtigung OK")
    }

    // Accessibility Berechtigung pruefen (fuer CGEvent Input Injection)
    let options = [kAXTrustedCheckOptionPrompt.takeRetainedValue(): true] as CFDictionary
    let hasAccessibility = AXIsProcessTrustedWithOptions(options)
    if !hasAccessibility {
        log("WARNUNG: Accessibility Berechtigung nicht erteilt.")
        log("Input-Forwarding wird nicht funktionieren.")
        log("Bitte aktiviere sie unter: Systemeinstellungen > Datenschutz & Sicherheit > Bedienungshilfen")
        // Nicht fatal – Capture funktioniert trotzdem, nur Input nicht
    }

    return true
}

// --------------------------------------------
// Strukturierte Nachrichten an Node.js senden
// Ueber stdout als JSON-Zeilen
// --------------------------------------------

func sendMessage(_ type: String, _ data: [String: Any] = [:]) {
    var msg: [String: Any] = ["type": type]
    for (key, value) in data {
        msg[key] = value
    }
    if let jsonData = try? JSONSerialization.data(withJSONObject: msg),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
        fflush(stdout)
    }
}

// --------------------------------------------
// Signal-Handler fuer sauberes Beenden
// SIGINT und SIGTERM abfangen
// --------------------------------------------

func setupSignalHandlers(pipeline: CapturePipeline) {
    let signalSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
    signal(SIGINT, SIG_IGN)
    signalSource.setEventHandler {
        log("SIGINT empfangen, beende...")
        pipeline.stop()
        sendMessage("stopped")
        exit(0)
    }
    signalSource.resume()

    let termSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    signal(SIGTERM, SIG_IGN)
    termSource.setEventHandler {
        log("SIGTERM empfangen, beende...")
        pipeline.stop()
        sendMessage("stopped")
        exit(0)
    }
    termSource.resume()
}

// --------------------------------------------
// Hauptprogramm
// Parst Argumente, prueft Berechtigungen, startet Pipeline
// --------------------------------------------

let config = parseArguments()

// Validierung
guard config.windowId > 0 else {
    log("FEHLER: --window-id ist erforderlich und muss > 0 sein")
    printUsage()
    exit(1)
}

guard config.signalingPort > 0 else {
    log("FEHLER: --port ist erforderlich und muss > 0 sein")
    printUsage()
    exit(1)
}

log("Starte mit Window-ID: \(config.windowId), Port: \(config.signalingPort)")
log("FPS: \(config.fps), Bitrate: \(config.bitrate)")

// Berechtigungen pruefen
guard checkPermissions() else {
    sendMessage("error", ["code": "PERMISSION_DENIED", "message": "Berechtigungen fehlen"])
    exit(1)
}

// Capture-Pipeline erstellen und starten
let pipeline = CapturePipeline(config: config)
setupSignalHandlers(pipeline: pipeline)

sendMessage("ready", ["windowId": config.windowId, "port": config.signalingPort])

// Pipeline starten (asynchron)
Task {
    do {
        try await pipeline.start()
        sendMessage("streaming", ["fps": config.fps])
    } catch {
        log("FEHLER beim Start: \(error.localizedDescription)")
        sendMessage("error", ["code": "START_FAILED", "message": error.localizedDescription])
        exit(1)
    }
}

// RunLoop am Leben halten
RunLoop.main.run()
