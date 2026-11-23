# eduGym

Personal fitness tracker — workout logging, analytics, nutrition macros, and Google Health sync.

**Stack:** React (Vite) · FastAPI · PostgreSQL · Docker Compose · nginx  
**Served at:** `https://eduserver/gym/`

---

## Prerequisites

- Docker + Docker Compose
- External Docker network `proxy-net` already created
- PostgreSQL running on `172.21.0.1` (the host, reachable from containers)
- A `.env` file at the project root (see below)

---

## Environment variables

Create `/opt/gym-app/.env`:

```env
DB_HOST=172.21.0.1
DB_NAME=fitness
DB_USER=
DB_PASSWORD=
```

---

## First-time setup

```bash
# 1. Create the external network if it doesn't exist yet
docker network create --subnet 172.21.0.0/24 proxy-net

# 2. Build and start both containers
cd /opt/gym-app
docker compose up -d --build
```

The frontend dist is baked into the Docker image at build time (not volume-mounted),
so any frontend code change requires a rebuild (see below).

---

## Common commands

### Start / stop

```bash
# Start all containers
docker compose up -d

# Stop all containers
docker compose down

# Restart a single container
docker compose restart backend
docker compose restart frontend
```

### Rebuild after code changes

```bash
# Frontend — must rebuild the image after any src/ change
cd /opt/gym-app/frontend
npm run build
cd /opt/gym-app
docker compose build frontend
docker compose up -d frontend

# Backend — just restart (code is copied in at build time, so rebuild if deps changed)
docker compose restart backend

# Backend with dependency changes
docker compose build backend
docker compose up -d backend
```

### Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f          # both
```

### Check container status

```bash
docker compose ps
```

---

## Google Health sync

The backend syncs workout data from Google Health automatically every 15 minutes.

The OAuth token is stored at `backend/health_token.json` and is volume-mounted into
the container. To re-authorise, delete the file and restart the backend — it will
print an auth URL to the logs.

---
