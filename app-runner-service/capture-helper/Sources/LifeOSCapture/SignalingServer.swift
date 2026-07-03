// ============================================
// SignalingServer.swift - WebSocket Server fuer JPEG-Streaming & Input
//
// Zweck: Lokaler WebSocket-Server der JPEG-Frames
//        an den Browser sendet und Input-Events empfaengt.
//        Nutzt Apples Network Framework (NWListener).
//        Der Node.js App Runner Service verbindet sich hier
//        als WebSocket-Relay zum Browser.
// Verwendet von: CapturePipeline.swift
// ============================================

import Foundation
import Network
import CoreGraphics

// --------------------------------------------
// SignalingServer
// WebSocket-Server fuer:
// - JPEG-Frame-Streaming (Binaer-Nachrichten)
// - Input-Event-Empfang (Maus/Tastatur vom Browser)
// --------------------------------------------

class SignalingServer {
    // Server-Konfiguration
    let port: Int

    // Network Framework Listener
    private var listener: NWListener?

    // Aktive Verbindungen (mehrere Browser-Tabs moeglich)
    private var connections: [String: NWConnection] = [:]
    private let connectionsQueue = DispatchQueue(
        label: "com.lifeos.signaling.connections"
    )

    // Callback fuer empfangene Input-Events
    let onInputEvent: (InputEvent) -> Void

    // Frame-Zaehler fuer Diagnose
    private var sentFrameCount: UInt64 = 0
    private var sentBytes: UInt64 = 0

    // --------------------------------------------
    // Initialisierung
    // Parameter:
    //   port - TCP-Port fuer den WebSocket-Server
    //   onInputEvent - Callback fuer empfangene Input-Events
    // --------------------------------------------

    init(port: Int, onInputEvent: @escaping (InputEvent) -> Void) {
        self.port = port
        self.onInputEvent = onInputEvent
    }

    // --------------------------------------------
    // Server starten
    // Erstellt NWListener auf dem konfigurierten Port
    // --------------------------------------------

    func start() async throws {
        // WebSocket-Parameter
        let parameters = NWParameters.tcp
        let wsOptions = NWProtocolWebSocket.Options()
        wsOptions.autoReplyPing = true
        // Maximale Frame-Groesse auf 2 MB setzen (fuer JPEG-Frames)
        wsOptions.maximumMessageSize = 2 * 1024 * 1024
        parameters.defaultProtocolStack.applicationProtocols.insert(wsOptions, at: 0)

        // Listener erstellen
        guard let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            throw CaptureError.captureStartFailed("Ungueltiger Port: \(port)")
        }

        let listener = try NWListener(using: parameters, on: nwPort)

        // Neue Verbindungen akzeptieren
        listener.newConnectionHandler = { [weak self] connection in
            self?.handleNewConnection(connection)
        }

        // State-Handler
        listener.stateUpdateHandler = { state in
            switch state {
            case .ready:
                log("SignalingServer bereit auf Port \(self.port)")
            case .failed(let error):
                log("SignalingServer Fehler: \(error)")
            case .cancelled:
                log("SignalingServer gestoppt")
            default:
                break
            }
        }

        listener.start(queue: DispatchQueue(
            label: "com.lifeos.signaling.server",
            qos: .userInteractive
        ))

        self.listener = listener

        // Warten bis der Server bereit ist (oder Fehler)
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            var resumed = false
            listener.stateUpdateHandler = { state in
                guard !resumed else { return }
                switch state {
                case .ready:
                    resumed = true
                    log("SignalingServer bereit auf Port \(self.port)")
                    cont.resume()
                case .failed(let error):
                    resumed = true
                    log("SignalingServer Fehler: \(error)")
                    cont.resume(throwing: error)
                case .cancelled:
                    resumed = true
                    cont.resume(throwing: CaptureError.captureStartFailed("Server abgebrochen"))
                default:
                    break
                }
            }
        }
    }

    // --------------------------------------------
    // Server stoppen
    // Alle Verbindungen schliessen und Listener beenden
    // --------------------------------------------

    func stop() {
        connectionsQueue.sync {
            for (_, conn) in connections {
                conn.cancel()
            }
            connections.removeAll()
        }
        listener?.cancel()
        listener = nil
        log("SignalingServer gestoppt (\(sentFrameCount) Frames, \(sentBytes / 1024)KB gesendet)")
    }

    // --------------------------------------------
    // JPEG-Frame an alle Verbindungen senden
    // Format: Binary WebSocket Message
    // Header: [1 Byte Typ=0x03][Rest: JPEG Data]
    // Typ 0x03 = JPEG (neu, damit der Browser es unterscheiden kann)
    // --------------------------------------------

    func sendJpegFrame(_ jpegData: Data) {
        // Header: 1 Byte Typ-Marker
        var message = Data(capacity: 1 + jpegData.count)
        message.append(0x03)  // Typ: JPEG
        message.append(jpegData)

        broadcastBinary(message)
        sentFrameCount += 1
        sentBytes += UInt64(message.count)
    }

    // --------------------------------------------
    // Neue WebSocket-Verbindung verarbeiten
    // Startet Nachrichten-Empfang fuer die Verbindung
    // --------------------------------------------

    private func handleNewConnection(_ connection: NWConnection) {
        let id = UUID().uuidString
        log("Neue Verbindung: \(id)")

        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                log("Verbindung \(id) bereit")
            case .failed(let error):
                log("Verbindung \(id) Fehler: \(error)")
                self?.removeConnection(id)
            case .cancelled:
                log("Verbindung \(id) geschlossen")
                self?.removeConnection(id)
            default:
                break
            }
        }

        connectionsQueue.sync {
            connections[id] = connection
        }

        // Verbindung starten und auf Nachrichten warten
        connection.start(queue: DispatchQueue(
            label: "com.lifeos.signaling.conn.\(id)",
            qos: .userInteractive
        ))

        receiveMessages(from: connection, id: id)
    }

    // --------------------------------------------
    // Nachrichten von einer Verbindung empfangen
    // Verarbeitet JSON-Input-Events vom Browser
    // --------------------------------------------

    private func receiveMessages(from connection: NWConnection, id: String) {
        connection.receiveMessage { [weak self] content, context, _, error in
            if let error = error {
                log("Empfangsfehler von \(id): \(error)")
                self?.removeConnection(id)
                return
            }

            // Pruefen ob es eine Text-Nachricht ist (JSON-Input-Events)
            if let data = content,
               let metadata = context?.protocolMetadata.first as? NWProtocolWebSocket.Metadata,
               metadata.opcode == .text {
                self?.handleTextMessage(data, from: id)
            }

            // Weiter auf naechste Nachricht warten
            self?.receiveMessages(from: connection, id: id)
        }
    }

    // --------------------------------------------
    // Text-Nachricht (JSON) verarbeiten
    // Parst Input-Events und leitet sie an den Callback
    // --------------------------------------------

    private func handleTextMessage(_ data: Data, from connectionId: String) {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        // Input-Event parsen und an Pipeline weiterleiten
        if let event = parseInputEvent(type: type, data: json) {
            onInputEvent(event)
        }
    }

    // --------------------------------------------
    // Input-Event aus JSON parsen
    // Unterstuetzte Typen: mousedown, mouseup, mousemove, scroll, keydown, keyup
    // --------------------------------------------

    private func parseInputEvent(type: String, data: [String: Any]) -> InputEvent? {
        switch type {
        case "mousedown":
            let x = data["x"] as? Double ?? 0
            let y = data["y"] as? Double ?? 0
            let button = data["button"] as? Int ?? 0
            return .mouseDown(x: x, y: y, button: button)
        case "mouseup":
            let x = data["x"] as? Double ?? 0
            let y = data["y"] as? Double ?? 0
            let button = data["button"] as? Int ?? 0
            return .mouseUp(x: x, y: y, button: button)
        case "mousemove":
            let x = data["x"] as? Double ?? 0
            let y = data["y"] as? Double ?? 0
            return .mouseMove(x: x, y: y)
        case "scroll":
            let x = data["x"] as? Double ?? 0
            let y = data["y"] as? Double ?? 0
            let deltaX = data["deltaX"] as? Double ?? 0
            let deltaY = data["deltaY"] as? Double ?? 0
            return .scroll(x: x, y: y, deltaX: deltaX, deltaY: deltaY)
        case "keydown":
            let keyCode = UInt16(data["keyCode"] as? Int ?? 0)
            let modifiers = parseModifiers(data["modifiers"] as? [String] ?? [])
            return .keyDown(keyCode: keyCode, modifiers: modifiers)
        case "keyup":
            let keyCode = UInt16(data["keyCode"] as? Int ?? 0)
            let modifiers = parseModifiers(data["modifiers"] as? [String] ?? [])
            return .keyUp(keyCode: keyCode, modifiers: modifiers)
        default:
            return nil
        }
    }

    // --------------------------------------------
    // Modifier-Keys aus String-Array parsen
    // z.B. ["shift", "cmd"] -> CGEventFlags
    // --------------------------------------------

    private func parseModifiers(_ modifiers: [String]) -> CGEventFlags {
        var flags = CGEventFlags()
        for mod in modifiers {
            switch mod.lowercased() {
            case "shift": flags.insert(.maskShift)
            case "ctrl", "control": flags.insert(.maskControl)
            case "alt", "option": flags.insert(.maskAlternate)
            case "cmd", "meta", "command": flags.insert(.maskCommand)
            default: break
            }
        }
        return flags
    }

    // --------------------------------------------
    // Binaer-Nachricht an alle Verbindungen senden
    // Thread-sicher durch connectionsQueue
    // --------------------------------------------

    private func broadcastBinary(_ data: Data) {
        let metadata = NWProtocolWebSocket.Metadata(opcode: .binary)
        let context = NWConnection.ContentContext(
            identifier: "binary",
            metadata: [metadata]
        )

        connectionsQueue.sync {
            for (id, conn) in connections {
                conn.send(
                    content: data,
                    contentContext: context,
                    isComplete: true,
                    completion: .contentProcessed { error in
                        if let error = error {
                            log("Sendefehler an \(id): \(error)")
                        }
                    }
                )
            }
        }
    }

    // --------------------------------------------
    // Verbindung entfernen
    // Wird bei Fehler oder Verbindungsabbruch aufgerufen
    // --------------------------------------------

    private func removeConnection(_ id: String) {
        connectionsQueue.sync {
            if let conn = connections.removeValue(forKey: id) {
                conn.cancel()
            }
        }
    }
}
