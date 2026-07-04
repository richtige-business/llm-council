#!/bin/bash
# ============================================
# LLM Council Setup & Run Script
# 
# Zweck: Installiert alle Dependencies, generiert Prisma Client
#        und startet den Development Server
# Verwendung: ./setup-and-run.sh
# ============================================

set -e

cd "$(dirname "$0")"

echo "📦 LLM Council Setup"
echo "==============="

# Prüfen ob Node.js installiert ist
if ! command -v node &> /dev/null; then
  echo "❌ Node.js ist nicht installiert oder nicht im PATH."
  echo ""
  echo "Bitte installiere Node.js:"
  echo "  - nvm:  nvm install 20 && nvm use 20"
  echo "  - Homebrew: brew install node"
  echo "  - https://nodejs.org"
  exit 1
fi

echo "✓ Node $(node -v)"
echo "✓ npm $(npm -v)"
echo ""

# 1. Dependencies installieren
echo "📥 Installiere Dependencies..."
npm install

# 2. Prisma Client generieren
echo ""
echo "🔧 Generiere Prisma Client..."
npx prisma generate

# 3. Datenbank-Migration (optional - nur wenn DB läuft)
if command -v psql &> /dev/null 2>&1; then
  echo ""
  echo "📊 Prüfe Datenbank..."
  if npx prisma db push 2>/dev/null; then
    echo "✓ Datenbank-Schema aktualisiert"
  else
    echo "⚠ Datenbank nicht erreichbar – App läuft mit Mock-Daten wo möglich"
  fi
else
  echo ""
  echo "⚠ PostgreSQL nicht installiert – stelle sicher dass DATABASE_URL in .env.local korrekt ist"
fi

# 4. Dev-Server starten
echo ""
echo "🚀 Starte Development Server..."
echo "   → http://localhost:3000"
echo ""
npm run dev
