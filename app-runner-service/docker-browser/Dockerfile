# ============================================
# LifeOS Browser Container
#
# Zweck: Isolierter Chromium-Browser in einem Docker-Container
#        mit VNC-Server fuer Remote-Streaming.
#        Wird von LifeOS genutzt um Web-Apps (Canva, Figma, etc.)
#        sicher in einem eigenen Container zu oeffnen.
#
# Aufbau:
#   - Xvfb: Virtueller Bildschirm (kein echtes Display noetig)
#   - Chromium: Browser der die Web-App oeffnet
#   - x11vnc: VNC-Server der den virtuellen Bildschirm streamt
#   - websockify: WebSocket-Bridge fuer noVNC-Zugriff
# ============================================

# Ubuntu 22.04 + Google Chrome (Chromium-Snap funktioniert nicht in Docker)
# platform amd64: Chrome gibt es nur für x86 (Apple Silicon nutzt Emulation)
FROM --platform=linux/amd64 ubuntu:22.04

# Keine interaktiven Prompts
ENV DEBIAN_FRONTEND=noninteractive

# --------------------------------------------
# Google Chrome installieren (funktioniert in Docker)
# --------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------
# System-Pakete installieren
# --------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    # Virtueller Framebuffer
    xvfb \
    # VNC Server
    x11vnc \
    # WebSocket-Bridge
    websockify \
    # Schriftarten (damit Web-Apps korrekt gerendert werden)
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-liberation \
    # Minimale Window-Manager Unterstuetzung
    openbox \
    # Utilities
    dbus-x11 \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------
# Umgebungsvariablen
# --------------------------------------------

# Display fuer Xvfb
ENV DISPLAY=:99

# Bildschirmaufloesung (Breite x Hoehe x Farbtiefe)
ENV RESOLUTION=1920x1080x24

# Ziel-URL die Chromium beim Start oeffnet
ENV TARGET_URL=https://google.com

# VNC-Port (intern)
ENV VNC_PORT=5900

# WebSocket-Port (fuer noVNC-Zugriff)
ENV WS_PORT=6080

# --------------------------------------------
# Startscript kopieren
# --------------------------------------------

COPY start.sh /start.sh
RUN chmod +x /start.sh

# --------------------------------------------
# Ports freigeben
# 5900: VNC (direkt)
# 6080: WebSocket (fuer noVNC)
# --------------------------------------------

EXPOSE 5900 6080

# --------------------------------------------
# Healthcheck: Prueft ob VNC-Server laeuft
# --------------------------------------------

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
    CMD curl -sf http://localhost:6080 || exit 1

# Container als normaler User ausfuehren (Sicherheit)
# Chromium braucht --no-sandbox wenn als root
CMD ["/start.sh"]
