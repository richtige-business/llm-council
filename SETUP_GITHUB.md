# GitHub Setup Anleitung

## ✅ Bereits erledigt:

1. ✅ Git Repository initialisiert
2. ✅ Alle Dateien committed (120 Dateien, 22.559 Zeilen Code!)
3. ✅ README mit Contributing-Sektion erweitert
4. ✅ .gitignore angepasst (`.env.example` wird nicht ignoriert)
5. ✅ Remote hinzugefügt (muss noch angepasst werden)

## 🔧 Nächste Schritte:

### 1. GitHub Repository erstellen

1. Gehe zu https://github.com/new
2. Repository-Name: `LifeOS`
3. Beschreibung: "KI-Betriebssystem für ein strukturiertes Leben"
4. **WICHTIG**: Lass "Initialize with README" **DEAKTIVIERT** (du hast bereits eine)
5. Klicke auf "Create repository"

### 2. Remote URL anpassen

Ersetze `USERNAME` mit deinem GitHub-Username:

```bash
cd /Users/lucrobuste/Desktop/lifeos-phase1

# Remote entfernen
git remote remove origin

# Remote mit deinem Username hinzufügen
git remote add origin https://github.com/DEIN_USERNAME/LifeOS.git

# Prüfen
git remote -v
```

### 3. Code zu GitHub pushen

```bash
# Branch auf 'main' umbenennen (falls nötig)
git branch -M main

# Code pushen
git push -u origin main
```

### 4. .env.example erstellen (falls noch nicht vorhanden)

```bash
cat > .env.example << 'EOF'
# ============================================
# Environment Variables Template
# ============================================
# Kopiere diese Datei zu .env.local und fülle die Werte aus

# Claude API Key für Agent-System (Anthropic)
ANTHROPIC_API_KEY=your_key_here

# Database URL (falls Prisma verwendet wird)
# DATABASE_URL=postgresql://user:password@localhost:5432/lifeos
EOF

# Committen und pushen
git add .env.example
git commit -m "docs: Add .env.example template"
git push
```

## 👥 Zusammenarbeit einrichten

### Collaborators hinzufügen:

1. Gehe zu deinem Repository auf GitHub
2. Klicke auf **Settings** → **Collaborators**
3. Klicke auf **Add people**
4. Suche nach GitHub-Usernamen oder E-Mail-Adresse
5. Wähle die Berechtigung (Read, Write, oder Admin)

### Branch Protection (optional):

1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Aktivieren:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging

## 📝 Git Config anpassen (optional)

Falls du deine Git-Identität anpassen möchtest:

```bash
# Global (für alle Repositories)
git config --global user.name "Dein Name"
git config --global user.email "deine@email.com"

# Oder nur für dieses Repository
git config user.name "Dein Name"
git config user.email "deine@email.com"
```

## 🎉 Fertig!

Nach dem Push können andere:
- Das Repository klonen: `git clone https://github.com/DEIN_USERNAME/LifeOS.git`
- Issues erstellen
- Pull Requests öffnen
- Mitarbeiten!











