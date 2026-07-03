# Code zu GitHub pushen

## ✅ Bereits erledigt:

- ✅ Git Repository initialisiert
- ✅ Alle Dateien committed
- ✅ Remote hinzugefügt: `https://github.com/richtige-business/LifeOS.git`
- ✅ Branch auf `main` gesetzt

## 🚀 Code pushen:

Führe diesen Befehl im Terminal aus:

```bash
cd /Users/lucrobuste/Desktop/lifeos-phase1
git push -u origin main
```

### Authentifizierung:

GitHub wird nach deinen Credentials fragen:

**Option 1: Personal Access Token (empfohlen)**
1. Gehe zu: https://github.com/settings/tokens
2. Klicke auf "Generate new token (classic)"
3. Name: "LifeOS Local Development"
4. Scopes: Aktiviere `repo` (voller Zugriff auf Repositories)
5. Klicke auf "Generate token"
6. Kopiere den Token (wird nur einmal angezeigt!)
7. Beim Push:
   - Username: `richtige-business`
   - Password: **Füge den Token ein** (nicht dein GitHub-Passwort!)

**Option 2: GitHub CLI**
```bash
# GitHub CLI installieren (falls nicht vorhanden)
brew install gh

# Einloggen
gh auth login

# Dann pushen
git push -u origin main
```

**Option 3: SSH Key (für zukünftige Pushes)**
```bash
# SSH Key generieren (falls noch nicht vorhanden)
ssh-keygen -t ed25519 -C "deine@email.com"

# Key zu GitHub hinzufügen
cat ~/.ssh/id_ed25519.pub
# Kopiere den Output und füge ihn hier ein: https://github.com/settings/keys

# Remote auf SSH umstellen
git remote set-url origin git@github.com:richtige-business/LifeOS.git

# Pushen
git push -u origin main
```

## ✅ Nach erfolgreichem Push:

Dein Repository ist jetzt auf GitHub verfügbar unter:
**https://github.com/richtige-business/LifeOS**

Andere können es jetzt klonen:
```bash
git clone https://github.com/richtige-business/LifeOS.git
```











