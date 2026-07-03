#!/bin/bash
# ============================================
# start.sh - Container Startscript
#
# Zweck: Startet alle Dienste im Container:
#        1. Xvfb (virtueller Bildschirm)
#        2. Openbox (minimaler Window Manager)
#        3. Chromium (Browser mit Ziel-URL)
#        4. x11vnc (VNC Server)
#        5. websockify (WebSocket Bridge)
#
# Umgebungsvariablen:
#   DISPLAY     - X11 Display (Standard: :99)
#   RESOLUTION  - Bildschirmaufloesung (Standard: 1920x1080x24)
#   TARGET_URL  - URL die Chromium oeffnet
#   VNC_PORT    - VNC Port (Standard: 5900)
#   WS_PORT     - WebSocket Port (Standard: 6080)
# ============================================

set -e

echo "[LifeOS Browser] Starte Container..."
echo "[LifeOS Browser] URL: ${TARGET_URL}"
echo "[LifeOS Browser] Resolution: ${RESOLUTION}"
echo "[LifeOS Browser] VNC Port: ${VNC_PORT}"
echo "[LifeOS Browser] WS Port: ${WS_PORT}"

# --------------------------------------------
# 1. Xvfb starten (virtueller Bildschirm)
# Erstellt ein virtuelles Display ohne physischen Monitor
# --------------------------------------------

echo "[LifeOS Browser] Starte Xvfb..."
Xvfb ${DISPLAY} -screen 0 ${RESOLUTION} -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Warten bis Xvfb bereit ist
sleep 1

# Pruefen ob Xvfb laeuft
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "[LifeOS Browser] FEHLER: Xvfb konnte nicht gestartet werden"
    exit 1
fi
echo "[LifeOS Browser] Xvfb laeuft (PID: $XVFB_PID)"

# --------------------------------------------
# 2. D-Bus starten (wird von Chromium benoetigt)
# --------------------------------------------

export DBUS_SESSION_BUS_ADDRESS=$(dbus-daemon --fork --session --print-address 2>/dev/null || echo "")

# --------------------------------------------
# 3. Openbox starten (minimaler Window Manager)
# Noetig damit Chromium maximiert werden kann
# --------------------------------------------

echo "[LifeOS Browser] Starte Openbox..."
openbox &
sleep 0.5

# --------------------------------------------
# 4. Chromium starten
# Oeffnet die Ziel-URL im Kiosk-aehnlichen Modus
# --------------------------------------------

echo "[LifeOS Browser] Starte Chrome mit URL: ${TARGET_URL}"
google-chrome-stable \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-software-rasterizer \
    --no-first-run \
    --no-default-browser-check \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --start-maximized \
    --window-size=1920,1080 \
    --window-position=0,0 \
    "${TARGET_URL}" &
CHROME_PID=$!

# Warten bis Chromium gestartet ist
sleep 2
echo "[LifeOS Browser] Chromium gestartet (PID: $CHROME_PID)"

# --------------------------------------------
# 5. x11vnc starten (VNC Server)
# Teilt den virtuellen Bildschirm ueber VNC
# --------------------------------------------

echo "[LifeOS Browser] Starte x11vnc..."
x11vnc \
    -display ${DISPLAY} \
    -forever \
    -nopw \
    -shared \
    -rfbport ${VNC_PORT} \
    -xkb \
    -noxrecord \
    -noxfixes \
    -noxdamage \
    -wait 10 \
    -defer 5 \
    &
X11VNC_PID=$!

sleep 1
echo "[LifeOS Browser] x11vnc laeuft (PID: $X11VNC_PID, Port: $VNC_PORT)"

# --------------------------------------------
# 6. websockify starten (WebSocket Bridge)
# Macht VNC ueber WebSocket erreichbar
# (Noetig fuer noVNC im Browser)
# --------------------------------------------

echo "[LifeOS Browser] Starte websockify..."
# Ohne --web: Reiner WebSocket-Proxy (noVNC Client ist im React-Frontend)
websockify ${WS_PORT} localhost:${VNC_PORT} &
WEBSOCKIFY_PID=$!

sleep 1
echo "[LifeOS Browser] websockify laeuft (PID: $WEBSOCKIFY_PID, Port: $WS_PORT)"

echo ""
echo "============================================"
echo "  LifeOS Browser Container bereit!"
echo "============================================"
echo "  VNC:       vnc://localhost:${VNC_PORT}"
echo "  WebSocket: ws://localhost:${WS_PORT}"
echo "  URL:       ${TARGET_URL}"
echo "============================================"
echo ""

# --------------------------------------------
# Signal-Handler fuer sauberes Beenden
# --------------------------------------------

cleanup() {
    echo "[LifeOS Browser] Beende Container..."
    kill $WEBSOCKIFY_PID 2>/dev/null
    kill $X11VNC_PID 2>/dev/null
    kill $CHROME_PID 2>/dev/null
    kill $XVFB_PID 2>/dev/null
    exit 0
}

trap cleanup SIGTERM SIGINT

# Am Leben halten: Warten auf Chromium-Prozess
# Wenn Chromium beendet wird, endet auch der Container
wait $CHROME_PID
echo "[LifeOS Browser] Chromium beendet, fahre Container herunter..."
cleanup
