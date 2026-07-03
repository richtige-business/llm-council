#!/bin/bash -l
# ============================================
# LifeOS Dev Server Starter
# 
# Zweck: Startet den Dev-Server mit korrekter Shell-Umgebung
# Verwendung: ./start-dev.sh
# ============================================

cd "$(dirname "$0")"

# NVM laden falls vorhanden
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm use default 2>/dev/null || nvm use node 2>/dev/null || true
fi

# Volta laden falls vorhanden
[ -s "$HOME/.volta/load.sh" ] && . "$HOME/.volta/load.sh"

# fnm laden falls vorhanden
if [ -s "$HOME/.fnm/fnm" ]; then
  export PATH="$HOME/.fnm:$PATH"
  eval "$(fnm env --use-on-cd)"
fi

# Prisma Client generieren falls nötig
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "🔧 Generiere Prisma Client..."
  npx prisma generate
fi

# Dev-Server starten
echo "🚀 Starte Development Server..."
echo "   → http://localhost:3000"
echo ""
npm run dev
