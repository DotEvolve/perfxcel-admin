# Implementation Plan: OCI Infrastructure Migration

## Overview

Migrate `cos-api-gateway`, `cos-workflow-service`, and `ff-api` from Heroku to a self-managed OCI instance using Docker Compose, establish prod/dev environment isolation, automate deployments via GitHub Actions with CalVer tagging, update all downstream configuration, and decommission Heroku. Tasks are ordered by dependency: infrastructure first, then service code changes, then CI/CD pipelines, then external config updates, then verification and decommission.

> **Note:** No property-based tests are included — this is an infrastructure migration with no new application logic to test with PBT.

---

## Tasks

- [x] 1. Prepare OCI instance and deployment directory structure
  - Create `/opt/dotevolve/` with subdirectories `nginx/conf.d/`, `redis/`, and `repos/`
  - Create dedicated `deploy` OS user; grant Docker socket access and write access to `/opt/dotevolve/repos/`
  - Verify Docker Engine and Docker Compose v2 are installed and enabled as system services
  - Verify OCI Security List / iptables allows inbound 80/tcp and 443/tcp; confirm port 6379 is not publicly reachable
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. Issue wildcard TLS certificates via Certbot
  - Install `certbot` and `certbot-dns-cloudflare` plugin on the OCI instance
  - Create `~/.secrets/cloudflare.ini` with the Certbot DNS-challenge Cloudflare API token (Token 1); set file permissions to `600`
  - Run `certbot certonly --dns-cloudflare` to issue wildcard cert for `govnix.net` and `*.govnix.net`
  - Run `certbot certonly --dns-cloudflare` to issue wildcard cert for `floorix.net` and `*.floorix.net`
  - Configure a systemd timer or cron job to run `certbot renew` twice daily; add post-renewal hook `docker compose exec nginx nginx -s reload`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Configure Cloudflare DNS records
  - Create A records for `api.govnix.net`, `workflow.govnix.net`, `api-dev.govnix.net`, `workflow-dev.govnix.net` → OCI public IP
  - Create A records for `api.floorix.net`, `api-dev.floorix.net` → OCI public IP
  - Create CNAME records for `app.govnix.net`, `admin.govnix.net`, `app-dev.govnix.net`, `admin-dev.govnix.net` → `cname.vercel-dns.com`
  - Create CNAME records for `app.floorix.net`, `admin.floorix.net`, `app-dev.floorix.net`, `admin-dev.floorix.net` → `cname.vercel-dns.com`
  - Create wildcard CNAME `*.govnix.net` → `cname.vercel-dns.com` (tenant subdomain provisioning)
  - Create wildcard CNAME `*.floorix.net` → `cname.vercel-dns.com` (tenant subdomain provisioning)
  - Create CNAME records for `portal.dotevolve.net`, `admin.dotevolve.net`, `portal-api.dotevolve.net`, `portal-dev.dotevolve.net`, `admin-dev.dotevolve.net`, `portal-api-dev.dotevolve.net` → `cname.vercel-dns.com`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Write nginx configuration files
  - [x] 4.1 Write `nginx/nginx.conf` — main config with security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`), mime types, access log, and `include /etc/nginx/conf.d/*.conf`
    - _Requirements: 6.8, 6.9_

  - [x] 4.2 Write `nginx/conf.d/govnix-prod.conf` — upstreams for `cos-api-gateway:3001` and `cos-workflow-service:3002`; HTTPS server blocks for `api.govnix.net` (proxy_read_timeout 120s) and `workflow.govnix.net` (proxy_read_timeout 300s); HTTP→HTTPS 301 redirect block; TLS cert paths `/etc/letsencrypt/live/govnix.net/fullchain.pem` and `privkey.pem`
    - _Requirements: 6.1, 6.2, 6.7, 6.8_

  - [x] 4.3 Write `nginx/conf.d/govnix-dev.conf` — upstreams for `cos-api-gateway-dev:3011` and `cos-workflow-service-dev:3012`; HTTPS server blocks for `api-dev.govnix.net` (proxy_read_timeout 120s) and `workflow-dev.govnix.net` (proxy_read_timeout 300s); HTTP→HTTPS 301 redirect block
    - _Requirements: 6.4, 6.5, 6.7, 6.8_

  - [x] 4.4 Write `nginx/conf.d/floorix-prod.conf` — upstream for `ff-api:3003`; HTTPS server block for `api.floorix.net`; HTTP→HTTPS 301 redirect block; TLS cert paths `/etc/letsencrypt/live/floorix.net/fullchain.pem` and `privkey.pem`
    - _Requirements: 6.3, 6.7, 6.8_

  - [x] 4.5 Write `nginx/conf.d/floorix-dev.conf` — upstream for `ff-api-dev:3013`; HTTPS server block for `api-dev.floorix.net`; HTTP→HTTPS 301 redirect block
    - _Requirements: 6.6, 6.7, 6.8_

- [x] 5. Write `docker-compose.yml` on the OCI instance
  - Define `redis` service: `redis:7-alpine`, `restart: always`, named volume `redis_data`, bound to `127.0.0.1:6379`, command `redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru`, profiles `["all"]`
  - Define `nginx` service: `nginx:alpine`, `restart: always`, ports 80/443, read-only mounts for `./nginx/nginx.conf`, `./nginx/conf.d/`, `/etc/letsencrypt`, profiles `["all"]`, `depends_on` all six app services
  - Define prod services `cos-api-gateway` (port 3001), `cos-workflow-service` (port 3002), `ff-api` (port 3003): `restart: always`, `env_file: .env.prod`, `NODE_ENV=production`, correct `PORT` and `REDIS_URL` per service, profiles `["prod", "all"]`
  - Define dev services `cos-api-gateway-dev` (port 3011), `cos-workflow-service-dev` (port 3012), `ff-api-dev` (port 3013): `restart: always`, `env_file: .env.dev`, `NODE_ENV=development`, correct `PORT` and `REDIS_URL` per service, profiles `["dev", "all"]`
  - Declare named volumes `redis_data` and `certbot_webroot`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.2, 7.3_

- [x] 6. Add `Dockerfile` and `.dockerignore` to `govnix-api-gateway`
  - Write `Dockerfile`: `FROM node:24-alpine`, `WORKDIR /app`, `COPY package*.json ./`, `RUN npm ci --omit=dev`, `COPY . .`, `RUN npm run build`, `EXPOSE 3000`, `CMD ["node", "api/index.js"]`
  - Write `.dockerignore` excluding `node_modules`, `.env*`, `.git`, `dist`, `*.log`
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 7. Add `Dockerfile` and `.dockerignore` to `govnix-workflow-service`
  - Write `Dockerfile`: same base pattern as task 6 with `CMD ["node", "api/index.js"]`
  - Write `.dockerignore` excluding `node_modules`, `.env*`, `.git`, `dist`, `*.log`
  - _Requirements: 5.1, 5.3, 5.4_

- [x] 8. Add `Dockerfile` and `.dockerignore` to `floorix-api`
  - Write `Dockerfile`: `FROM node:24-alpine`, `WORKDIR /app`, `COPY package*.json ./`, `RUN npm ci --omit=dev`, `COPY . .`, `RUN npm run build`, `EXPOSE 3000`, `CMD ["node", "dist/server.js"]`
  - Write `.dockerignore` excluding `node_modules`, `.env*`, `.git`, `dist`, `*.log`
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 9. Add `GET /health` endpoint to `govnix-workflow-service`
  - Add a route handler for `GET /health` in the Express app that returns HTTP 200 with `{"status": "ok"}` when the service is running
  - Add dependency check logic: if Redis is unreachable, return HTTP 503 with `{"status": "error", "dependency": "redis"}`; if the database (PostgreSQL/Prisma) is unreachable, return HTTP 503 with `{"status": "error", "dependency": "database"}`
  - Register the route in the main Express app before any auth middleware so it is always reachable
  - _Requirements: 13.2, 13.4_

- [x] 10. Add `GET /health` endpoint to `floorix-api`
  - Add a route handler for `GET /health` in the Express app that returns HTTP 200 with `{"status": "ok"}` when the service is running
  - Add dependency check logic: if MongoDB is unreachable, return HTTP 503 with `{"status": "error", "dependency": "mongodb"}`
  - Register the route before any auth middleware
  - _Requirements: 13.3, 13.4_

- [x] 11. Checkpoint — verify Docker images build and health endpoints respond locally
  - [x] 11.1 Clone all three service repos into `/opt/dotevolve/repos/` on the OCI instance
    - `git clone <govnix-api-gateway-repo> /opt/dotevolve/repos/govnix-api-gateway`
    - `git clone <govnix-workflow-service-repo> /opt/dotevolve/repos/govnix-workflow-service`
    - `git clone <floorix-api-repo> /opt/dotevolve/repos/floorix-api`

  - [x] 11.2 Populate `.env.prod` and `.env.dev` on the OCI instance
    - Create `/opt/dotevolve/.env.prod` with all production secrets: Supabase prod URL and `service_role` key, `REDIS_URL=redis://redis:6379/0`, QStash credentials, and any other service-specific vars — no Heroku-specific variables
    - Create `/opt/dotevolve/.env.dev` with all dev secrets: existing dev Supabase URL and `service_role` key, `REDIS_URL=redis://redis:6379/1`, dev QStash credentials — no Heroku-specific variables
    - _Requirements: 10.4, 10.5_

  - [x] 11.3 Build all Docker images and start the full stack
    - Run `docker compose build` for all six app services and confirm exit 0
    - Start the full stack with `docker compose --profile all up -d`
    - Confirm all containers are running: `docker compose ps`
    - _Requirements: 1.4, 4.4, 4.5_

  - [x] 11.4 Verify health endpoints respond on localhost
    - `curl -f http://localhost:3001/health` → HTTP 200
    - `curl -f http://localhost:3002/health` → HTTP 200
    - `curl -f http://localhost:3003/health` → HTTP 200
    - `curl -f http://localhost:3011/health` → HTTP 200
    - `curl -f http://localhost:3012/health` → HTTP 200
    - `curl -f http://localhost:3013/health` → HTTP 200
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 12. Write GitHub Actions `deploy.yml` for `govnix-api-gateway`
  - Create `.github/workflows/deploy.yml` triggered on `push` to `master` and `dev` branches
  - Add `deploy` job using `ubuntu-latest` with `actions/checkout@v4` (`fetch-depth: 0` for tag listing)
  - Add SSH deploy step using `appleboy/ssh-action@v1` with secrets `OCI_HOST`, `OCI_USER`, `OCI_SSH_KEY`; SSH script: `cd /opt/dotevolve/repos/govnix-api-gateway && git pull origin <branch>`; then `docker compose build cos-api-gateway` (prod) or `cos-api-gateway-dev` (dev); then `docker compose --profile prod up -d cos-api-gateway` (prod) or `--profile dev up -d cos-api-gateway-dev` (dev)
  - Add health check step: `curl --retry 3 --retry-delay 10 -f https://api.govnix.net/health` (prod) or `https://api-dev.govnix.net/health` (dev); fail workflow on non-200
  - Add CalVer tag step (`if: github.ref == 'refs/heads/master'`): compute `YYYY.MM.XX` by listing existing tags for the current month, incrementing patch, then `git tag $TAG && git push origin $TAG`
  - _Requirements: 15.1, 15.2, 15.3, 15.5, 15.6, 15.8, 15.9_

- [x] 13. Write GitHub Actions `deploy.yml` for `govnix-workflow-service`
  - Create `.github/workflows/deploy.yml` with the same structure as task 12
  - SSH script targets `cos-workflow-service` (prod, port 3002) or `cos-workflow-service-dev` (dev, port 3012)
  - Health check targets `https://workflow.govnix.net/health` (prod) or `https://workflow-dev.govnix.net/health` (dev)
  - CalVer tag step identical to task 12 (scoped to this repo's tags)
  - _Requirements: 15.1, 15.2, 15.3, 15.5, 15.6, 15.8, 15.9_

- [x] 14. Write GitHub Actions `deploy.yml` for `floorix-api`
  - Create `.github/workflows/deploy.yml` with the same structure as task 12
  - SSH script targets `ff-api` (prod, port 3003) or `ff-api-dev` (dev, port 3013)
  - Health check targets `https://api.floorix.net/health` (prod) or `https://api-dev.floorix.net/health` (dev)
  - CalVer tag step identical to task 12 (scoped to this repo's tags)
  - _Requirements: 15.1, 15.2, 15.3, 15.5, 15.6, 15.8, 15.9_

- [x] 15. Configure deploy user SSH access and add GitHub Actions secrets to all three service repos
  - On the OCI instance, add the GitHub Actions deploy SSH public key to `/home/deploy/.ssh/authorized_keys`
  - Add `OCI_HOST`, `OCI_USER`, and `OCI_SSH_KEY` secrets to `govnix-api-gateway`, `govnix-workflow-service`, and `floorix-api` repositories via GitHub repository settings
  - _Requirements: 15.6, 15.7_

- [x] 16. Provision new production Supabase project and run migrations
  - Create a new Supabase project for the production environment in the Supabase dashboard
  - Run all existing database migrations against the new prod project (`supabase db push` or manual SQL execution)
  - Enable Row Level Security (RLS) on all tables in the new prod project
  - Record the new prod project URL and `service_role` / `anon` keys for use in `.env.prod` and Vercel env vars
  - Update `.env.prod` on the OCI instance with the new prod Supabase URL and `service_role` key
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.6, 16.7_

- [x] 17. Run App Registry SQL migration against both Supabase projects
  - Execute the following SQL against the **prod** Supabase project:
    ```sql
    UPDATE apps SET base_domain = 'govnix.net', cors_endpoint = 'https://api.govnix.net/api/v1/internal/cors-origins' WHERE slug = 'govnix';
    UPDATE apps SET base_domain = 'floorix.net', cors_endpoint = 'https://api.floorix.net/api/v1/internal/cors-origins' WHERE slug = 'floorix';
    ```
  - Execute the same SQL against the **dev** Supabase project
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 18. Update environment variables in Vercel for `cos-frontend`
  - Set `VITE_API_GATEWAY_URL=https://api.govnix.net` for the `master`/production environment
  - Set `VITE_API_GATEWAY_URL=https://api-dev.govnix.net` for the `dev` environment
  - _Requirements: 10.1_

- [x] 19. Update environment variables in Vercel for `dot-portal-api`
  - Set production env vars: `DOT_COS_BASE_DOMAIN=govnix.net`, `FLOORIX_BASE_DOMAIN=floorix.net`, `DOT_COS_CORS_ENDPOINT=https://api.govnix.net/api/v1/internal/cors-origins`, `FLOORIX_CORS_ENDPOINT=https://api.floorix.net/api/v1/internal/cors-origins`
  - Set dev env vars: `DOT_COS_CORS_ENDPOINT=https://api-dev.govnix.net/api/v1/internal/cors-origins`, `FLOORIX_CORS_ENDPOINT=https://api-dev.floorix.net/api/v1/internal/cors-origins`
  - Update `dot-portal-api`'s `.env.example` to reflect the new domain values for all four variables
  - _Requirements: 10.2, 10.3, 10.6_

- [x] 20. Update Vercel production env vars with new prod Supabase credentials
  - Update `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_KEY` (or `VITE_SUPABASE_ANON_KEY`) in Vercel production environments for all services that connect to Supabase prod: `cos-frontend`, `cos-admin-dashboard`, `dot-portal-api`, `floorix-app`, `floorix-admin`
  - Confirm dev environment variables continue to reference the existing dev Supabase project
  - _Requirements: 16.4, 16.5_

- [x] 21. Register custom domains in Vercel for all seven projects
  - `cos-frontend`: add `app.govnix.net` (prod) and `app-dev.govnix.net` (dev)
  - `cos-admin-dashboard`: add `admin.govnix.net` (prod) and `admin-dev.govnix.net` (dev)
  - `floorix-app`: add `app.floorix.net` (prod) and `app-dev.floorix.net` (dev)
  - `floorix-admin`: add `admin.floorix.net` (prod) and `admin-dev.floorix.net` (dev)
  - `dot-portal`: add `portal.dotevolve.net` (prod) and `portal-dev.dotevolve.net` (dev)
  - `dot-admin`: add `admin.dotevolve.net` (prod) and `admin-dev.dotevolve.net` (dev)
  - `dot-portal-api`: add `portal-api.dotevolve.net` (prod) and `portal-api-dev.dotevolve.net` (dev)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 22. Update QStash target URLs
  - In the Upstash console (or via API), update all target URLs in the **prod** QStash project from `https://cos-workflow.herokuapp.com/...` to `https://workflow.govnix.net/...`
  - In the Upstash console (or via API), update all target URLs in the **dev** QStash project from `https://cos-workflow-dev.herokuapp.com/...` to `https://workflow-dev.govnix.net/...`
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 23. Checkpoint — run full smoke test suite against OCI prod and dev stacks
  - [x] 23.1 Run prod health check smoke tests
    - `curl -f https://api.govnix.net/health` → HTTP 200
    - `curl -f https://workflow.govnix.net/health` → HTTP 200
    - `curl -f https://api.floorix.net/health` → HTTP 200
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 23.2 Run dev health check smoke tests
    - `curl -f https://api-dev.govnix.net/health` → HTTP 200
    - `curl -f https://workflow-dev.govnix.net/health` → HTTP 200
    - `curl -f https://api-dev.floorix.net/health` → HTTP 200
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 23.3 Verify HTTP→HTTPS redirect and TLS validity
    - `curl -I http://api.govnix.net/` → HTTP 301
    - `curl -v https://api.govnix.net/health` → no TLS certificate error
    - _Requirements: 6.7, 2.5_

  - [x] 23.4 Verify Redis connectivity and public isolation
    - `docker exec redis redis-cli -n 0 ping` → `PONG`
    - `docker exec redis redis-cli -n 1 ping` → `PONG`
    - `nc -zv {OCI_IP} 6379` from an external host → connection refused
    - _Requirements: 7.1, 7.2, 1.5_

  - [x] 23.5 Verify end-to-end authenticated API request (prod)
    - Obtain a Supabase JWT for a test user → `GET https://api.govnix.net/api/v1/me` with Bearer token → HTTP 200 with user data
    - _Requirements: 16.6_

  - [x] 23.6 Verify QStash delivery (prod)
    - Trigger a workflow that enqueues a QStash job → check `cos-workflow-service` logs for job receipt and processing
    - _Requirements: 8.1_

  - [x] 23.7 Verify App Registry warm cache returns new domains
    - Restart `dot-portal-api` → call an endpoint that invokes `loadAppRegistry()` → confirm response contains `govnix.net` and `floorix.net` base domains
    - _Requirements: 9.5_

- [x] 24. Trigger first CI/CD deployment via GitHub Actions for all three services
  - Push a commit to the `dev` branch of each service repo and confirm the dev deploy workflow completes successfully (SSH → pull → build → up → health check)
  - Merge `dev` into `master` for each service repo and confirm the prod deploy workflow completes successfully and creates a CalVer tag (e.g. `2026.05.01`)
  - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.9_

- [x] 25. Decommission Heroku services
  - Confirm all pre-decommission conditions are met:
    - All 6 OCI health check smoke tests pass (tasks 23.1 and 23.2)
    - QStash target URLs updated and a test job delivered successfully (tasks 22 and 23.6)
    - App Registry updated in both Supabase projects (task 17)
    - `dot-portal-api` env vars updated in Vercel (task 19)
    - `cos-frontend` `VITE_API_GATEWAY_URL` updated in Vercel (task 18)
    - Vercel custom domains registered for all 7 projects (task 21)
    - DNS A records for all 6 OCI-hosted subdomains verified in Cloudflare (task 3)
  - Scale Heroku dynos to 0 (or delete the Heroku apps) for `cos-api-gateway`, `cos-workflow-service`, and `ff-api`
  - Remove Heroku custom domain entries from the Heroku dashboard
  - Verify no DNS records still point to `*.herokuapp.com`
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 26. Write deployment runbook in `dot-docs`
  - Create or update the OCI deployment runbook document covering:
    - Step-by-step OCI instance setup: SSH access, system updates, Docker Engine install, Docker Compose v2 install, firewall configuration (ports 80/443 only)
    - Two Cloudflare API tokens: Token 1 (Certbot DNS challenge — Zone/DNS/Edit on `govnix.net` and `floorix.net`) and Token 2 (tenant subdomain provisioning — Zone/DNS/Edit on all three domains, used as `CLOUDFLARE_API_TOKEN` in `dot-portal-api`)
    - Certbot wildcard certificate issuance steps for `govnix.net` and `floorix.net`
    - Commands to clone repos into `/opt/dotevolve/repos/`, copy compose file and nginx configs, populate `.env.prod` and `.env.dev`
    - Docker Compose profile commands: start prod only, dev only, all services simultaneously
    - Procedure to rebuild and redeploy a single service without downtime to others
    - TLS certificate rotation and nginx reload procedure
    - Redis DB index assignments (DB 0 = prod, DB 1 = dev) and rationale
    - Rollback procedure: checkout a CalVer tag on OCI, rebuild, restart with Docker Compose
    - Emergency rollback to Heroku procedure for use during the migration window
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 15.10_

- [x] 27. Final checkpoint — confirm full migration complete
  - Confirm Heroku dynos are at zero and no traffic is flowing to `*.herokuapp.com`
  - Confirm all 6 OCI services are healthy and all 7 Vercel custom domains resolve correctly
  - Confirm CalVer tags exist in all three service repos for the first prod release
  - Confirm OCI instance auto-restarts all containers after a reboot (`docker compose ps` post-reboot)
  - _Requirements: 1.4, 12.1, 15.5_
