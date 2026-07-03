// ============================================
// VideoEncoder.swift - NICHT MEHR VERWENDET
//
// Zweck: Wurde durch JPEG-basiertes Streaming ersetzt.
//        CGWindowListCreateImage -> JPEG statt
//        SCStream -> H.264.
//        Datei bleibt als Platzhalter erhalten.
// ============================================

// VideoEncoder ist nicht mehr noetig, da JPEG-Frames
// direkt von WindowCapture.swift erzeugt werden.
// Die H.264-Encoding-Logik via VideoToolbox wurde
// durch einfaches JPEG-Encoding via ImageIO ersetzt.
