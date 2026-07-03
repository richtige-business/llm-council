#!/bin/bash
# ============================================
# build.sh - LifeOSCapture Swift Helper Build-Script
#
# Zweck: Kompiliert den Swift Helper und kopiert das
#        Binary in den bin/ Ordner des App Runner Service.
#
# Verwendung:
#   ./build.sh          # Release Build
#   ./build.sh debug    # Debug Build
#   ./build.sh clean    # Build-Artefakte loeschen
# ============================================

set -e

# Farbige Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verzeichnisse
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_RUNNER_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="${APP_RUNNER_DIR}/bin"
BUILD_CONFIG="${1:-release}"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  LifeOSCapture Build Script${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# --------------------------------------------
# macOS-Version pruefen
# ScreenCaptureKit erfordert macOS 12.3+
# --------------------------------------------

MACOS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "0.0")
MACOS_MAJOR=$(echo "$MACOS_VERSION" | cut -d. -f1)

if [ "$MACOS_MAJOR" -lt 13 ]; then
  echo -e "${RED}FEHLER: macOS 13 oder neuer erforderlich (aktuell: $MACOS_VERSION)${NC}"
  echo "ScreenCaptureKit benoetigt macOS 12.3+, empfohlen: macOS 13+"
  exit 1
fi

# --------------------------------------------
# Swift pruefen
# --------------------------------------------

if ! command -v swift &> /dev/null; then
  echo -e "${RED}FEHLER: Swift nicht gefunden${NC}"
  echo "Bitte installiere Xcode oder Swift Toolchain"
  exit 1
fi

SWIFT_VERSION=$(swift --version 2>&1 | head -1)
echo "Swift: $SWIFT_VERSION"
echo "macOS: $MACOS_VERSION"
echo "Build: $BUILD_CONFIG"
echo ""

# --------------------------------------------
# Clean-Modus
# --------------------------------------------

if [ "$BUILD_CONFIG" = "clean" ]; then
  echo -e "${YELLOW}Loesche Build-Artefakte...${NC}"
  cd "$SCRIPT_DIR"
  swift package clean
  rm -rf .build
  rm -f "${BIN_DIR}/LifeOSCapture"
  echo -e "${GREEN}Fertig!${NC}"
  exit 0
fi

# --------------------------------------------
# Swift Package bauen
# --------------------------------------------

echo -e "${YELLOW}Baue LifeOSCapture ($BUILD_CONFIG)...${NC}"
cd "$SCRIPT_DIR"

# Dependencies aufloesen
swift package resolve 2>&1 || true

# Build ausfuehren
if [ "$BUILD_CONFIG" = "debug" ]; then
  swift build 2>&1
else
  swift build -c release 2>&1
fi

# Build-Ergebnis pruefen
BINARY_PATH="${SCRIPT_DIR}/.build/${BUILD_CONFIG}/LifeOSCapture"

if [ ! -f "$BINARY_PATH" ]; then
  echo -e "${RED}FEHLER: Binary nicht gefunden: $BINARY_PATH${NC}"
  exit 1
fi

# --------------------------------------------
# Binary in bin/ kopieren
# --------------------------------------------

echo ""
echo -e "${YELLOW}Kopiere Binary nach ${BIN_DIR}/...${NC}"
mkdir -p "$BIN_DIR"
cp "$BINARY_PATH" "${BIN_DIR}/LifeOSCapture"
chmod +x "${BIN_DIR}/LifeOSCapture"

# Binary-Groesse anzeigen
BINARY_SIZE=$(ls -lh "${BIN_DIR}/LifeOSCapture" | awk '{print $5}')
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Build erfolgreich!${NC}"
echo -e "${GREEN}============================================${NC}"
echo "  Binary: ${BIN_DIR}/LifeOSCapture"
echo "  Groesse: $BINARY_SIZE"
echo ""
echo "Starte den Helper mit:"
echo "  ./bin/LifeOSCapture --window-id <id> --port 9090"
echo ""

# --------------------------------------------
# Berechtigungen-Hinweis
# --------------------------------------------

echo -e "${YELLOW}Wichtig: Berechtigungen${NC}"
echo "Beim ersten Start werden folgende Berechtigungen benoetigt:"
echo "  1. Bildschirmaufnahme (Screen Recording)"
echo "  2. Bedienungshilfen (Accessibility) - fuer Input-Injection"
echo ""
echo "Gehe zu: Systemeinstellungen > Datenschutz & Sicherheit"
echo ""
