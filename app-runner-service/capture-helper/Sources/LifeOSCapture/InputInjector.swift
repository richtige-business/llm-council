// ============================================
// InputInjector.swift - CGEvent Input Injection
//
// Zweck: Injiziert Maus-, Tastatur- und Scroll-Events
//        in ein spezifisches macOS-Fenster via CGEvent API.
//        Konvertiert Window-relative Koordinaten zu Screen-Koordinaten.
// Verwendet von: CapturePipeline.swift
// ============================================

import Foundation
import CoreGraphics
import ApplicationServices

// --------------------------------------------
// InputInjector
// Sendet simulierte Input-Events an ein Zielfenster.
// Erfordert Accessibility-Berechtigung (Bedienungshilfen).
// --------------------------------------------

class InputInjector {
    // ID des Zielfensters fuer Koordinaten-Konvertierung
    let windowId: CGWindowID

    // Gecachte Fensterposition (wird periodisch aktualisiert)
    private var windowOrigin: CGPoint = .zero
    private var windowSize: CGSize = .zero
    private var lastWindowUpdate: Date = .distantPast

    // Event Source fuer konsistente Event-Erstellung
    private let eventSource: CGEventSource?

    // --------------------------------------------
    // Initialisierung
    // Parameter:
    //   windowId - CGWindowID des Zielfensters
    // --------------------------------------------

    init(windowId: CGWindowID) {
        self.windowId = windowId
        // Event Source erstellen (HID System State)
        self.eventSource = CGEventSource(stateID: .hidSystemState)
        // Initiale Fensterposition laden
        updateWindowBounds()
    }

    // --------------------------------------------
    // Fensterposition und -groesse aktualisieren
    // Nutzt CGWindowListCopyWindowInfo um aktuelle
    // Bounds des Fensters zu ermitteln
    // --------------------------------------------

    private func updateWindowBounds() {
        // Maximal alle 500ms aktualisieren (Performance)
        let now = Date()
        guard now.timeIntervalSince(lastWindowUpdate) > 0.5 else { return }

        let windowList = CGWindowListCopyWindowInfo(
            [.optionIncludingWindow],
            windowId
        ) as? [[CFString: Any]]

        if let windowInfo = windowList?.first,
           let boundsDict = windowInfo[kCGWindowBounds] as? [String: Any],
           let x = boundsDict["X"] as? CGFloat,
           let y = boundsDict["Y"] as? CGFloat,
           let w = boundsDict["Width"] as? CGFloat,
           let h = boundsDict["Height"] as? CGFloat {
            windowOrigin = CGPoint(x: x, y: y)
            windowSize = CGSize(width: w, height: h)
            lastWindowUpdate = now
        }
    }

    // --------------------------------------------
    // Window-relative Koordinaten zu Screen-Koordinaten
    //
    // Browser sendet: (x, y) relativ zum Fenster (0,0 oben links)
    // CGEvent braucht: Absolute Screen-Koordinaten (0,0 oben links)
    //
    // Berechnung: screenX = windowOrigin.x + x
    //             screenY = windowOrigin.y + y
    // --------------------------------------------

    private func windowToScreen(_ point: CGPoint) -> CGPoint {
        updateWindowBounds()
        return CGPoint(
            x: windowOrigin.x + point.x,
            y: windowOrigin.y + point.y
        )
    }

    // ============================================
    // MAUS-EVENTS
    // ============================================

    // --------------------------------------------
    // Maus-Button gedrueckt
    // Parameter:
    //   at - Position relativ zum Fenster
    //   button - 0=links, 1=mitte, 2=rechts
    // --------------------------------------------

    func mouseDown(at point: CGPoint, button: Int) {
        let screenPoint = windowToScreen(point)
        let (eventType, mouseButton) = mouseEventParams(button: button, isDown: true)

        guard let event = CGEvent(
            mouseEventSource: eventSource,
            mouseType: eventType,
            mouseCursorPosition: screenPoint,
            mouseButton: mouseButton
        ) else { return }

        event.post(tap: .cghidEventTap)
    }

    // --------------------------------------------
    // Maus-Button losgelassen
    // Parameter:
    //   at - Position relativ zum Fenster
    //   button - 0=links, 1=mitte, 2=rechts
    // --------------------------------------------

    func mouseUp(at point: CGPoint, button: Int) {
        let screenPoint = windowToScreen(point)
        let (eventType, mouseButton) = mouseEventParams(button: button, isDown: false)

        guard let event = CGEvent(
            mouseEventSource: eventSource,
            mouseType: eventType,
            mouseCursorPosition: screenPoint,
            mouseButton: mouseButton
        ) else { return }

        event.post(tap: .cghidEventTap)
    }

    // --------------------------------------------
    // Maus bewegen (ohne Button)
    // Parameter:
    //   to - Neue Position relativ zum Fenster
    // --------------------------------------------

    func mouseMove(to point: CGPoint) {
        let screenPoint = windowToScreen(point)

        guard let event = CGEvent(
            mouseEventSource: eventSource,
            mouseType: .mouseMoved,
            mouseCursorPosition: screenPoint,
            mouseButton: .left
        ) else { return }

        event.post(tap: .cghidEventTap)
    }

    // --------------------------------------------
    // Scroll-Event
    // Parameter:
    //   at - Position relativ zum Fenster
    //   deltaX - Horizontaler Scroll-Betrag
    //   deltaY - Vertikaler Scroll-Betrag
    // --------------------------------------------

    func scroll(at point: CGPoint, deltaX: Double, deltaY: Double) {
        // Zuerst Maus an die richtige Position bewegen
        let screenPoint = windowToScreen(point)
        if let moveEvent = CGEvent(
            mouseEventSource: eventSource,
            mouseType: .mouseMoved,
            mouseCursorPosition: screenPoint,
            mouseButton: .left
        ) {
            moveEvent.post(tap: .cghidEventTap)
        }

        // Scroll-Event erstellen
        // CGEvent Scroll nutzt fixedPt-Werte (Pixel-basiert)
        // wheel3 = 0 (kein Z-Achsen-Scroll)
        guard let scrollEvent = CGEvent(
            scrollWheelEvent2Source: eventSource,
            units: .pixel,
            wheelCount: 2,
            wheel1: Int32(-deltaY),  // Vertikal (invertiert: positiv = runter)
            wheel2: Int32(-deltaX),  // Horizontal
            wheel3: 0               // Z-Achse (nicht verwendet)
        ) else { return }

        scrollEvent.post(tap: .cgSessionEventTap)
    }

    // ============================================
    // TASTATUR-EVENTS
    // ============================================

    // --------------------------------------------
    // Taste gedrueckt
    // Parameter:
    //   keyCode - macOS Virtual Key Code
    //   modifiers - Modifier-Flags (Shift, Ctrl, etc.)
    // --------------------------------------------

    func keyDown(keyCode: UInt16, modifiers: CGEventFlags) {
        guard let event = CGEvent(
            keyboardEventSource: eventSource,
            virtualKey: keyCode,
            keyDown: true
        ) else { return }

        event.flags = modifiers
        event.post(tap: .cghidEventTap)
    }

    // --------------------------------------------
    // Taste losgelassen
    // Parameter:
    //   keyCode - macOS Virtual Key Code
    //   modifiers - Modifier-Flags (Shift, Ctrl, etc.)
    // --------------------------------------------

    func keyUp(keyCode: UInt16, modifiers: CGEventFlags) {
        guard let event = CGEvent(
            keyboardEventSource: eventSource,
            virtualKey: keyCode,
            keyDown: false
        ) else { return }

        event.flags = modifiers
        event.post(tap: .cghidEventTap)
    }

    // ============================================
    // HILFSFUNKTIONEN
    // ============================================

    // --------------------------------------------
    // Button-Index zu CGEventType/CGMouseButton konvertieren
    // Button: 0=links, 1=mitte, 2=rechts (Web-Standard)
    // --------------------------------------------

    private func mouseEventParams(
        button: Int,
        isDown: Bool
    ) -> (CGEventType, CGMouseButton) {
        switch button {
        case 2:
            // Rechtsklick
            return (isDown ? .rightMouseDown : .rightMouseUp, .right)
        case 1:
            // Mittelklick
            return (isDown ? .otherMouseDown : .otherMouseUp, .center)
        default:
            // Linksklick (Standard)
            return (isDown ? .leftMouseDown : .leftMouseUp, .left)
        }
    }
}
