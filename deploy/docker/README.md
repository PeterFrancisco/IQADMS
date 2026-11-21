# IQADMS Docker deploy (pqad / IoT Lab)

Packaged so the server team can run **one stack** instead of manual `dotnet run` + host nginx + tmux.

- **Port `5173`** — same as today (Cloudflare/tunnel can keep pointing here).
- **Containers:** `web` (nginx + React build), `api` (.NET 8), optional `postgres`.
- **Restart policy:** `unless-stopped` (survives reboot when Docker starts).
- **Healthchecks:** Docker marks unhealthy API/web; easy to hook into monitoring.

## Requirements on the server

- Docker Engine + Docker Compose v2 (`docker compose version`)
- Git clone at `~/IQADMS` (or pull latest `master`)
- **Stop the old stack** before first Docker start (avoid port 5173 conflict):
  ```bash
  rc-service nginx stop    # or disable host nginx for iqadms
  pkill -f 'IQADMS.API'    # stop bare-metal API if running
  ```

## Quick start (new Postgres in Docker)

```bash
cd ~/IQADMS
git pull
cd deploy/docker
cp .env.example .env
nano .env   # POSTGRES_PASSWORD, JWT_KEY, APP_PUBLIC_URL, SMTP

docker compose up -d --build
docker compose ps
docker compose logs -f api   # first start runs EF migrations
```

### Smoke test (on pqad)

```bash
curl -s "http://127.0.0.1:5173/api/Auth/check-email?email=test@test.com"
curl -s -o /dev/null -w "login: %{http_code}\n" "http://127.0.0.1:5173/login"
```

Expect JSON from `/api/...` and **200** from `/login`.

## Use existing Postgres on the host

If the database already lives on pqad (not in a container):

```bash
cd ~/IQADMS/deploy/docker
# .env: DB_HOST=host.docker.internal, POSTGRES_PASSWORD=<host db password>, JWT_KEY=<same as appsettings>
docker compose -f docker-compose.hostdb.yml up -d --build
```

## Migrate from bare-metal deploy

| Asset | Action |
|-------|--------|
| **Database** | `pg_dump` from host DB → restore into Docker Postgres, *or* use `docker-compose.hostdb.yml` and keep host DB |
| **Uploads** | Copy `~/IQADMS/backend/IQADMS.API/Uploads/` into volume: see below |
| **Secrets** | Move `appsettings.json` values into `.env` (JWT, SMTP, connection string) |
| **Public URL** | Set `APP_PUBLIC_URL` in `.env`; point Cloudflare/tunnel to **pqad:5173** (unchanged) |

Copy existing uploads into the API volume (after first `up`):

```bash
VOL=$(docker volume inspect iqadms_iqadms_uploads -f '{{.Mountpoint}}')
# Adjust volume name from `docker volume ls | grep uploads`
sudo cp -a ~/IQADMS/backend/IQADMS.API/Uploads/. "$VOL/"
docker compose restart api
```

## Day-2 operations

```bash
cd ~/IQADMS/deploy/docker
git pull
docker compose up -d --build    # rebuild after code changes
docker compose logs -f web api
docker compose ps
```

| Task | Command |
|------|---------|
| Stop | `docker compose down` |
| Stop + delete DB volume | `docker compose down -v` (**destroys DB**) |
| API only rebuild | `docker compose up -d --build api` |

## Monitoring (why Docker helps)

- `docker compose ps` — health: `healthy` / `unhealthy`
- `docker stats` — CPU/RAM per container
- Proxmox still shows VM resources; Docker adds **per-service** restart and logs (`docker compose logs`)

## Para sa IoT Lab / server admin

Maaaring i-point ulit ang public URL sa **`pqad:5173`** — same port, Docker lang ang nag-serve. Kung gumagana ang curl tests sa loob ng server pero hindi sa public, issue sa **Cloudflare/tunnel/proxy**, hindi sa app image.

Kung kailangan ng Grafana/Prometheus later, pwedeng i-scrape Docker health o mag-add ng sidecar; this compose is the base.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | postgres + api + web |
| `docker-compose.hostdb.yml` | api + web only (host Postgres) |
| `Dockerfile.api` | Build & run IQADMS.API |
| `Dockerfile.web` | Build frontend + nginx |
| `.env.example` | Template secrets (copy to `.env`) |

Legacy manual steps remain in [../DEPLOY.md](../DEPLOY.md).