# Stream-Stack Setup

Dieser Ordner enthaelt alles, was du fuer den produktiven Stack brauchst.

## Was ich bereits vorbereitet habe

- `Dockerfile` fuer die Next.js App
- `app-runner-service/Dockerfile`
- `infra/stream-stack/docker-compose.yml`
- `infra/stream-stack/Caddyfile`
- `infra/stream-stack/.env.example`
- internes Stream-Backend unter `src/app/api/streams/*`

Damit ist der Code-Teil fertig. Du musst jetzt nur noch die Infrastruktur-Schritte ausfuehren.

## Was du noch selbst machen musst

1. Server bereitstellen (z. B. Hetzner/Ubuntu)
2. DNS fuer `APP_DOMAIN` auf den Server zeigen lassen
3. `.env` im Ordner `infra/stream-stack` anlegen
4. Docker Compose starten
5. Prisma Migration auf deiner produktiven DB ausfuehren

## 1) Server vorbereiten

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Neu einloggen, damit die Docker-Gruppe aktiv ist.

## 2) Deployment-Dateien konfigurieren

```bash
cd /path/to/lifeos-phase1/infra/stream-stack
cp .env.example .env
```

Dann `.env` anpassen:

- `APP_DOMAIN`
- `FRONTEND_URL`
- falls noetig `NEXT_PUBLIC_STREAM_SERVICE_URL` (leer lassen = internes `/api/streams`)

## 3) Stack starten

```bash
cd /path/to/lifeos-phase1/infra/stream-stack
docker compose up -d --build
```

## 4) DB-Migration (wichtig)

Da `ExternalAppInstallation` neu ist:

```bash
cd /path/to/lifeos-phase1
npx prisma migrate deploy
npx prisma generate
```

## 5) Smoke-Checks

```bash
curl -I https://<APP_DOMAIN>
curl https://<APP_DOMAIN>/api/streams/health
curl https://<APP_DOMAIN>/api/external-apps
```

Wenn `/api/streams/health` `appRunner: ok` liefert, ist die Stream-Fassade bereit.

## Hinweise

- Das aktuelle `/api/streams` Backend nutzt den vorhandenen `app-runner-service` als Orchestrator.
- Session-Persistenz ist als API-Pfad vorhanden (`/persist`), serverseitige Cookie-/Storage-Snapshots kannst du spaeter im app-runner-service erweitern.
