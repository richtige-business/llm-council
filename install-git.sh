#!/bin/bash
# ============================================
# install-git.sh - Git auf macOS installieren
#
# Zweck: Installiert Git via Xcode Command Line Tools oder Homebrew
# Verwendung: Im Terminal ausführen: ./install-git.sh
# ============================================

set -e

echo "🔍 Prüfe ob Git bereits installiert ist..."
if command -v git &> /dev/null; then
    echo "✅ Git ist bereits installiert: $(git --version)"
    exit 0
fi

echo ""
echo "Git ist nicht installiert. Zwei Optionen:"
echo ""
echo "Option 1: Xcode Command Line Tools (empfohlen, schnell)"
echo "  → Öffnet ein Fenster zum Installieren"
echo "  → Klicke 'Installieren' und warte ein paar Minuten"
echo ""
echo "Option 2: Homebrew (benötigt Admin-Passwort)"
echo "  → Installiert Homebrew + Git"
echo ""

read -p "Option wählen (1 oder 2, Standard: 1): " choice
choice=${choice:-1}

if [ "$choice" = "1" ]; then
    echo ""
    echo "Starte Xcode Command Line Tools Installation..."
    xcode-select --install
    echo ""
    echo "⚠️  Ein Fenster sollte sich geöffnet haben."
    echo "    Klicke 'Installieren' und warte bis die Installation fertig ist."
    echo "    Danach: git --version"
else
    echo ""
    echo "Installiere Homebrew (Passwort wird abgefragt)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Homebrew zu PATH hinzufügen (Apple Silicon)
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    echo ""
    echo "Installiere Git..."
    brew install git
    
    echo ""
    echo "✅ Git installiert: $(git --version)"
    echo ""
    echo "Füge Homebrew dauerhaft zu deiner Shell hinzu:"
    echo '  echo ''eval "$(/opt/homebrew/bin/brew shellenv)"'' >> ~/.zprofile'
    echo "  eval \"\$(/opt/homebrew/bin/brew shellenv)\""
fi
