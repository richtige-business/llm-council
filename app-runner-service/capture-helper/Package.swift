// swift-tools-version: 5.9
// ============================================
// Package.swift - LifeOSCapture Swift Package
//
// Zweck: Definiert Dependencies und Build-Targets
//        fuer den nativen macOS Screen-Capture-Helper
//        Nutzt CGWindowListCreateImage statt ScreenCaptureKit
//        fuer zuverlaessigeres Fenster-Capturing
// ============================================

import PackageDescription

let package = Package(
    name: "LifeOSCapture",
    platforms: [
        .macOS(.v13)
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "LifeOSCapture",
            dependencies: [],
            path: "Sources/LifeOSCapture",
            linkerSettings: [
                // CoreGraphics: CGWindowListCreateImage, CGEvent
                .linkedFramework("CoreGraphics"),
                // CoreImage: Bild-Konvertierung (JPEG)
                .linkedFramework("CoreImage"),
                // ApplicationServices: Accessibility APIs
                .linkedFramework("ApplicationServices"),
                // ImageIO: CGImageDestination fuer JPEG-Encoding
                .linkedFramework("ImageIO"),
            ]
        )
    ]
)
