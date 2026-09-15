# Requirements Document

## Introduction

This feature covers the full migration of DotEvolve's backend services from Heroku to Oracle Cloud Infrastructure (OCI), along with the associated domain rebranding (Govnix → Govnix, Foot Factory → Floorix), environment strategy (prod + dev on the same OCI instance), self-hosted Redis, and all downstream configuration updates across services, environment variables, and the Supabase app registry.

The three backend services currently on Heroku — `cos-api-gateway`, `cos-workflow-service`, and `ff-api` — will be containerised and deployed to a single OCI instance (4 OCPU / 24 GB RAM) using Docker Compose profiles. Frontend services remain on Vercel. A parallel dev stack runs on the same OCI instance using `-dev` subdomain suffixes.

---

## Glossary

- **OCI_Instance**: The Oracle Cloud Infrastructure virtual machine (4 OCPU / 24 GB RAM) that hosts all backend containers.
- **Docker_Compose**: The container orchestration tool used to manage prod and dev service stacks on the OCI_Instance.
- **Prod_Stack**: The set of Docker Compose services running under the `prod` profile, serving production traffic.
- **Dev_Stack**: The set of Docker Compose services running under the `dev` profile, serving development/staging traffic via `-dev` subdomain suffixes.
- **Nginx**: The reverse proxy running on the OCI_Instance that routes HTTPS traffic to the correct container by hostname.
- **Redis**: The self-hosted Redis 7 instance running on the OCI_Instance, shared by Prod_Stack (DB 0) and Dev_Stack (DB 1).
- **cos-api-gateway**: The tenant-facing reverse proxy service for the Govnix (Govnix) product.
- **cos-workflow-service**: The PDF/AI/queue processing backend for the Govnix product.
- **ff-api**: The MongoDB + Express API backend for the Floorix (Foot Factory) product.
- **QStash**: The managed Upstash message queue used for async job delivery; target URLs must be updated to OCI hostnames.
- **App_Registry**: The DB-backed configuration store in the Supabase `apps` table, consumed by `dot-portal-api`, that holds `base_domain`, `cors_endpoint`, and `vercel_project_id` per app.
- **dot-portal-api**: The Vercel-hosted central backend API for the DotEvolve portal platform.
- **Certbot**: The Let's Encrypt ACME client used to issue and renew TLS certificates via Cloudflare DNS challenge.
- **Cloudflare**: The DNS provider managing all DNS records for `govnix.net`, `floorix.net`, and `dotevolve.net`.
- **Vercel**: The hosting platform for all frontend SPAs and small API services.
- **Govnix**: The rebranded name for the Govnix Compliance OS product, served under `govnix.net`.
- **Floorix**: The rebranded name for the Foot Factory manufacturing ops product, served under `floorix.net`.
- **DotEvolve**: The platform brand, served under `dotevolve.net`.
- **Tenant_Subdomain**: A per-tenant subdomain of the form `{tenantSlug}.govnix.net` or `{tenantSlug}.floorix.net`, provisioned via Vercel + Cloudflare.
- **GitHub_Actions**: The CI/CD platform used to automate builds and deployments to the OCI_Instance on push to `master` (prod) or `dev` (dev) branches.
- **Deploy_User**: A dedicated non-root SSH user on the OCI_Instance used exclusively by GitHub Actions for automated deployments.
- **CalVer**: Calendar Versioning scheme used for release tags in the format `YYYY.MM.XX` where `YYYY` is the year, `MM` is the zero-padded month, and `XX` is a zero-padded patch increment (e.g. `2026.05.01`, `2026.05.02`).

---

## Requirements

### Requirement 1: OCI Instance Provisioning

**User Story:** As a platform engineer, I want the OCI instance configured with Docker, Docker Compose, and all required system dependencies, so that backend services can be deployed and managed as containers.

#### Acceptance Criteria

1. THE OCI_Instance SHALL have Docker Engine and Docker Compose v2 installed and enabled as system services.
2. THE OCI_Instance SHALL have Certbot with the `certbot-dns-cloudflare` plugin installed for TLS certificate management.
3. THE OCI_Instance SHALL have the deployment directory `/opt/dotevolve/` created with subdirectories `nginx/conf.d/`, `redis/`, and `repos/`.
4. WHEN the OCI_Instance is rebooted, THE Docker_Compose SHALL automatically restart all previously running containers via the `restart: always` policy.
5. THE OCI_Instance firewall SHALL allow inbound traffic on ports 80 (HTTP) and 443 (HTTPS) only; port 6379 (Redis) SHALL be bound to `127.0.0.1` and not exposed publicly.

---

### Requirement 2: TLS Certificate Issuance

**User Story:** As a platform engineer, I want wildcard TLS certificates issued for `govnix.net` and `floorix.net`, so that all prod and dev subdomains are served over HTTPS without per-subdomain certificate management.

#### Acceptance Criteria

1. WHEN Certbot is invoked with the `--dns-cloudflare` plugin, THE Certbot SHALL issue a wildcard certificate covering `govnix.net` and `*.govnix.net`.
2. WHEN Certbot is invoked with the `--dns-cloudflare` plugin, THE Certbot SHALL issue a wildcard certificate covering `floorix.net` and `*.floorix.net`.
3. THE Certbot SHALL store Cloudflare API credentials in `~/.secrets/cloudflare.ini` with file permissions set to `600`.
4. WHEN a certificate is within 30 days of expiry, THE Certbot SHALL automatically renew it via a scheduled cron job or systemd timer.
5. THE Nginx SHALL reference the Let's Encrypt certificate paths `/etc/letsencrypt/live/{domain}/fullchain.pem` and `privkey.pem` for TLS termination.

---

### Requirement 3: DNS Configuration

**User Story:** As a platform engineer, I want all required DNS records created in Cloudflare, so that production and development subdomains resolve to the correct OCI or Vercel endpoints.

#### Acceptance Criteria

1. THE Cloudflare DNS SHALL have A records for `api.govnix.net`, `workflow.govnix.net`, `api-dev.govnix.net`, and `workflow-dev.govnix.net` pointing to the OCI_Instance public IP.
2. THE Cloudflare DNS SHALL have an A record for `api.floorix.net` and `api-dev.floorix.net` pointing to the OCI_Instance public IP.
3. THE Cloudflare DNS SHALL have CNAME records for `app.govnix.net`, `admin.govnix.net`, `app-dev.govnix.net`, and `admin-dev.govnix.net` pointing to `cname.vercel-dns.com`.
4. THE Cloudflare DNS SHALL have CNAME records for `app.floorix.net`, `admin.floorix.net`, `app-dev.floorix.net`, and `admin-dev.floorix.net` pointing to `cname.vercel-dns.com`.
5. THE Cloudflare DNS SHALL have a wildcard CNAME record `*.govnix.net` pointing to `cname.vercel-dns.com` for Tenant_Subdomain provisioning.
6. THE Cloudflare DNS SHALL have a wildcard CNAME record `*.floorix.net` pointing to `cname.vercel-dns.com` for Tenant_Subdomain provisioning.
7. THE Cloudflare DNS SHALL have CNAME records for `portal.dotevolve.net`, `admin.dotevolve.net`, `portal-api.dotevolve.net`, `portal-dev.dotevolve.net`, `admin-dev.dotevolve.net`, and `portal-api-dev.dotevolve.net` pointing to `cname.vercel-dns.com`.

---

### Requirement 4: Docker Compose Service Configuration

**User Story:** As a platform engineer, I want all backend services defined in a single Docker Compose file with prod and dev profiles, so that both environments can be managed independently on the same OCI instance.

#### Acceptance Criteria

1. THE Docker_Compose SHALL define `cos-api-gateway` (port 3001), `cos-workflow-service` (port 3002), and `ff-api` (port 3003) under the `prod` profile.
2. THE Docker_Compose SHALL define `cos-api-gateway-dev` (port 3011), `cos-workflow-service-dev` (port 3012), and `ff-api-dev` (port 3013) under the `dev` profile.
3. THE Docker_Compose SHALL define a shared `redis` service bound to `127.0.0.1:6379` with `appendonly yes` and `maxmemory 2gb` with `allkeys-lru` eviction policy.
4. WHEN the `prod` profile is started, THE Prod_Stack services SHALL load environment variables from `.env.prod` and set `NODE_ENV=production`.
5. WHEN the `dev` profile is started, THE Dev_Stack services SHALL load environment variables from `.env.dev` and set `NODE_ENV=development`.
6. THE Prod_Stack services SHALL connect to Redis DB 0 via `REDIS_URL=redis://redis:6379/0`.
7. THE Dev_Stack services SHALL connect to Redis DB 1 via `REDIS_URL=redis://redis:6379/1`.
8. THE Docker_Compose SHALL define an `nginx` service that mounts `./nginx/nginx.conf` and `./nginx/conf.d/` as read-only volumes and exposes ports 80 and 443.

---

### Requirement 5: Dockerfile Standardisation

**User Story:** As a platform engineer, I want each backend service to have a production-ready Dockerfile, so that images can be built consistently and deployed to OCI.

#### Acceptance Criteria

1. THE Dockerfile for `cos-api-gateway` and `cos-workflow-service` SHALL use `node:24-alpine` as the base image, run `npm ci --omit=dev`, build the TypeScript source, and start with `node api/index.js`.
2. THE Dockerfile for `ff-api` SHALL use `node:24-alpine` as the base image, run `npm ci --omit=dev`, build the TypeScript source, and start with `node dist/server.js`.
3. WHEN a Docker image is built, THE build process SHALL not include `node_modules` from the host machine (`.dockerignore` SHALL exclude `node_modules`, `.env*`, and `.git`).
4. THE Dockerfile SHALL expose port 3000 and rely on the `PORT` environment variable being set by Docker Compose to the correct per-service port.

---

### Requirement 6: Nginx Reverse Proxy Configuration

**User Story:** As a platform engineer, I want Nginx configured to route HTTPS traffic to the correct backend container by hostname, so that each service is reachable at its designated domain.

#### Acceptance Criteria

1. WHEN a request arrives at `api.govnix.net`, THE Nginx SHALL proxy it to `cos-api-gateway:3001` with `proxy_read_timeout 120s`.
2. WHEN a request arrives at `workflow.govnix.net`, THE Nginx SHALL proxy it to `cos-workflow-service:3002` with `proxy_read_timeout 300s` to accommodate PDF and AI processing.
3. WHEN a request arrives at `api.floorix.net`, THE Nginx SHALL proxy it to `ff-api:3003`.
4. WHEN a request arrives at `api-dev.govnix.net`, THE Nginx SHALL proxy it to `cos-api-gateway-dev:3011`.
5. WHEN a request arrives at `workflow-dev.govnix.net`, THE Nginx SHALL proxy it to `cos-workflow-service-dev:3012` with `proxy_read_timeout 300s`.
6. WHEN a request arrives at `api-dev.floorix.net`, THE Nginx SHALL proxy it to `ff-api-dev:3013`.
7. WHEN an HTTP request arrives on port 80 for any configured hostname, THE Nginx SHALL return a 301 redirect to the HTTPS equivalent.
8. THE Nginx SHALL forward `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers to all upstream services.
9. THE Nginx SHALL include security headers `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `X-XSS-Protection: 1; mode=block` on all responses.

---

### Requirement 7: Self-Hosted Redis Migration

**User Story:** As a platform engineer, I want the backend services to use the self-hosted Redis instance on OCI instead of Upstash Redis, so that rate limiting and caching operate with lower latency and no per-request billing.

#### Acceptance Criteria

1. THE `cos-api-gateway` and `cos-workflow-service` SHALL connect to Redis using the `REDIS_URL` environment variable injected by Docker Compose.
2. THE Redis instance SHALL persist data to disk using the AOF (append-only file) strategy via a named Docker volume `redis_data`.
3. WHEN the Redis memory usage reaches 2 GB, THE Redis SHALL evict keys using the `allkeys-lru` policy to prevent out-of-memory errors.
4. THE `dot-portal-api` Upstash Redis connection (used for billing reminder dedup and portal-level caching) SHALL remain unchanged; only the OCI-hosted services migrate to self-hosted Redis.

---

### Requirement 8: QStash Target URL Update

**User Story:** As a platform engineer, I want QStash target URLs updated from Heroku hostnames to OCI hostnames, so that async job delivery continues to work after the Heroku services are decommissioned.

#### Acceptance Criteria

1. THE Upstash QStash prod project SHALL have all target URLs updated from `https://cos-workflow.herokuapp.com/...` to `https://workflow.govnix.net/...`.
2. THE Upstash QStash dev project SHALL have all target URLs updated from `https://cos-workflow-dev.herokuapp.com/...` to `https://workflow-dev.govnix.net/...`.
3. THE prod and dev QStash configurations SHALL use two separate Upstash QStash projects to ensure environment isolation.

---

### Requirement 9: App Registry Domain Update (Supabase)

**User Story:** As a platform engineer, I want the Supabase `apps` table updated with the new domain names, so that the DB-backed App_Registry reflects the Govnix and Floorix rebranding and the dot-portal-api provisions tenant subdomains correctly.

#### Acceptance Criteria

1. THE Supabase `apps` table SHALL have the `base_domain` for the `govnix` app updated from `cos.dotevolve.net` to `govnix.net`.
2. THE Supabase `apps` table SHALL have the `base_domain` for the `floorix` app updated from `floorix.dotevolve.net` to `floorix.net`.
3. THE Supabase `apps` table SHALL have the `cors_endpoint` for the `govnix` app updated to `https://api.govnix.net/api/v1/internal/cors-origins`.
4. THE Supabase `apps` table SHALL have the `cors_endpoint` for the `floorix` app updated to `https://api.floorix.net/api/v1/internal/cors-origins`.
5. WHEN the App_Registry cache is warm, THE `dot-portal-api` SHALL provision Tenant_Subdomains of the form `{tenantSlug}.govnix.net` and `{tenantSlug}.floorix.net`.
6. WHEN the App_Registry cache is warm, THE `dot-portal-api` SHALL provision dev Tenant_Subdomains of the form `{tenantSlug}-dev.govnix.net` and `{tenantSlug}-dev.floorix.net` for the dev environment.

---

### Requirement 10: Environment Variable Updates Across Services

**User Story:** As a platform engineer, I want all environment variables referencing old Heroku hostnames or old domain names updated across every service, so that no service continues to point to decommissioned infrastructure.

#### Acceptance Criteria

1. THE `cos-frontend` Vercel environment SHALL have `VITE_API_GATEWAY_URL` set to `https://api.govnix.net` for the production branch and `https://api-dev.govnix.net` for the dev branch.
2. THE `dot-portal-api` Vercel environment SHALL have `DOT_COS_BASE_DOMAIN` set to `govnix.net`, `FOOT_FACTORY_BASE_DOMAIN` set to `floorix.net`, `DOT_COS_CORS_ENDPOINT` set to `https://api.govnix.net/api/v1/internal/cors-origins`, and `FOOT_FACTORY_CORS_ENDPOINT` set to `https://api.floorix.net/api/v1/internal/cors-origins` for the production environment.
3. THE `dot-portal-api` Vercel environment SHALL have `DOT_COS_CORS_ENDPOINT` set to `https://api-dev.govnix.net/api/v1/internal/cors-origins` and `FOOT_FACTORY_CORS_ENDPOINT` set to `https://api-dev.floorix.net/api/v1/internal/cors-origins` for the dev environment.
4. THE `.env.prod` file on the OCI_Instance SHALL contain all production secrets and connection strings required by `cos-api-gateway`, `cos-workflow-service`, and `ff-api`, with no Heroku-specific variables.
5. THE `.env.dev` file on the OCI_Instance SHALL contain all development secrets and connection strings required by the Dev_Stack services, with no Heroku-specific variables.
6. THE `dot-portal-api` `.env.example` file SHALL be updated to reflect the new domain values for `FOOT_FACTORY_BASE_DOMAIN`, `DOT_COS_BASE_DOMAIN`, `FOOT_FACTORY_CORS_ENDPOINT`, and `DOT_COS_CORS_ENDPOINT`.

---

### Requirement 11: Vercel Custom Domain Registration

**User Story:** As a platform engineer, I want the new product domains registered as custom domains in the relevant Vercel projects, so that frontend SPAs are served from the correct branded URLs.

#### Acceptance Criteria

1. THE Vercel project for `cos-frontend` SHALL have `app.govnix.net` registered as a custom domain for the production deployment and `app-dev.govnix.net` for the dev deployment.
2. THE Vercel project for `cos-admin-dashboard` SHALL have `admin.govnix.net` registered as a custom domain for the production deployment and `admin-dev.govnix.net` for the dev deployment.
3. THE Vercel project for `floorix-app` SHALL have `app.floorix.net` registered as a custom domain for the production deployment and `app-dev.floorix.net` for the dev deployment.
4. THE Vercel project for `floorix-admin` SHALL have `admin.floorix.net` registered as a custom domain for the production deployment and `admin-dev.floorix.net` for the dev deployment.
5. THE Vercel project for `dot-portal` SHALL have `portal.dotevolve.net` registered as a custom domain for the production deployment and `portal-dev.dotevolve.net` for the dev deployment.
6. THE Vercel project for `dot-admin` SHALL have `admin.dotevolve.net` registered as a custom domain for the production deployment and `admin-dev.dotevolve.net` for the dev deployment.
7. THE Vercel project for `dot-portal-api` SHALL have `portal-api.dotevolve.net` registered as a custom domain for the production deployment and `portal-api-dev.dotevolve.net` for the dev deployment.

---

### Requirement 12: Heroku Decommission

**User Story:** As a platform engineer, I want the Heroku dynos for `cos-api-gateway`, `cos-workflow-service`, and `ff-api` decommissioned after OCI services are verified healthy, so that we stop incurring Heroku costs.

#### Acceptance Criteria

1. WHEN all three OCI services respond to health check requests at their production URLs, THE Heroku dynos for `cos-api-gateway`, `cos-workflow-service`, and `ff-api` SHALL be scaled to zero or deleted.
2. WHEN Heroku dynos are decommissioned, THE Heroku app DNS entries SHALL be removed or redirected to prevent stale DNS resolution.
3. THE decommission of Heroku services SHALL only occur after the QStash target URLs have been updated to OCI hostnames (Requirement 8) and the App_Registry has been updated (Requirement 9).

---

### Requirement 13: Health Check Endpoints

**User Story:** As a platform engineer, I want each backend service to expose a health check endpoint, so that deployment readiness and ongoing service health can be verified programmatically.

#### Acceptance Criteria

1. THE `cos-api-gateway` SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body `{"status": "ok"}` when the service is running.
2. THE `cos-workflow-service` SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body `{"status": "ok"}` when the service is running.
3. THE `ff-api` SHALL expose a `GET /health` endpoint that returns HTTP 200 with a JSON body `{"status": "ok"}` when the service is running.
4. WHEN a health check endpoint is called and the service is unable to connect to its required dependencies (Redis or database), THE service SHALL return HTTP 503 with a JSON body indicating the failing dependency.

---

### Requirement 14: Deployment Runbook Documentation

**User Story:** As a platform engineer, I want a step-by-step deployment runbook covering OCI instance setup, Cloudflare token creation, TLS certificates, Docker Compose management, and recovery procedures, so that any team member can set up or operate the infrastructure from scratch.

#### Acceptance Criteria

1. THE deployment runbook SHALL include a step-by-step OCI instance setup section covering: SSH access, system package updates, Docker Engine installation, Docker Compose v2 installation, and firewall (iptables/OCI Security List) configuration to allow ports 80 and 443 only.
2. THE deployment runbook SHALL document the two Cloudflare API tokens required and how to create them:
   - **Token 1 — Certbot DNS challenge**: Zone / DNS / Edit permission scoped to `govnix.net` and `floorix.net`, used in `~/.secrets/cloudflare.ini` for wildcard TLS certificate issuance.
   - **Token 2 — Tenant subdomain provisioning**: Zone / DNS / Edit permission scoped to `govnix.net`, `floorix.net`, and `dotevolve.net`, used by `dot-portal-api` as `CLOUDFLARE_API_TOKEN` for dynamic CNAME record creation.
3. THE deployment runbook SHALL document the step-by-step Certbot wildcard certificate issuance process for `govnix.net` and `floorix.net` using the `--dns-cloudflare` plugin.
4. THE deployment runbook SHALL document the commands to clone all three service repos into `/opt/dotevolve/repos/`, copy the Docker Compose file and nginx configs, and populate `.env.prod` and `.env.dev`.
5. THE deployment runbook SHALL document the commands to start the Prod_Stack, Dev_Stack, and all services simultaneously using Docker Compose profiles.
6. THE deployment runbook SHALL document the procedure for rebuilding and redeploying a single service without downtime to other services.
7. THE deployment runbook SHALL document the procedure for rotating TLS certificates and reloading Nginx.
8. THE deployment runbook SHALL document the Redis DB index assignments (DB 0 = prod, DB 1 = dev) and the rationale for using a shared Redis instance.
9. THE deployment runbook SHALL document the rollback procedure for reverting to Heroku in the event of a critical OCI failure during the migration window.

---

### Requirement 15: CI/CD Pipeline via GitHub Actions

**User Story:** As a platform engineer, I want a GitHub Actions CI/CD pipeline that automatically builds and deploys each backend service to OCI on push to `master` (prod) or `dev` (dev), auto-tags every prod release using CalVer format `YYYY.MM.XX`, and supports rollback via tags, so that deployments are fully automated and recoverable without manual SSH access.

#### Acceptance Criteria

1. EACH of the three service repos (`govnix-api-gateway`, `govnix-workflow-service`, `floorix-api`) SHALL have a GitHub Actions workflow file at `.github/workflows/deploy.yml`.
2. WHEN a push is made to the `master` branch, THE GitHub Actions workflow SHALL SSH into the OCI_Instance, pull the latest code, rebuild the Docker image for the prod service, and restart the prod container using Docker Compose.
3. WHEN a push is made to the `dev` branch, THE GitHub Actions workflow SHALL SSH into the OCI_Instance, pull the latest code, rebuild the Docker image for the dev service, and restart the dev container using Docker Compose.
4. THE branching strategy SHALL be: `feature/*` branches merge into `dev` via pull request; `dev` merges into `master` as the release event; direct pushes to `master` are reserved for hotfixes only.
5. WHEN a `master` branch deployment completes successfully, THE GitHub Actions workflow SHALL automatically create and push a Git tag in CalVer format `YYYY.MM.XX` where `YYYY` is the current year, `MM` is the zero-padded month, and `XX` is a zero-padded auto-incrementing patch number starting at `01` for the first deployment of that month.
6. THE GitHub Actions workflow SHALL use the following repository secrets: `OCI_HOST` (OCI instance public IP), `OCI_USER` (deploy SSH username), and `OCI_SSH_KEY` (private SSH key for the deploy user).
7. THE OCI_Instance SHALL have a dedicated `deploy` user with a public SSH key authorised in `~/.ssh/authorized_keys`, with read/write access to `/opt/dotevolve/repos/` and Docker socket permissions.
8. WHEN the Docker image rebuild fails during a CI/CD deployment, THE GitHub Actions workflow SHALL exit with a non-zero status code and the running container SHALL NOT be restarted, preserving the last known good deployment.
9. WHEN a deployment completes successfully, THE GitHub Actions workflow SHALL verify the service health by calling the `GET /health` endpoint and failing the workflow if the response is not HTTP 200.
10. WHEN a rollback is required, THE deployment runbook SHALL document the procedure for checking out a specific CalVer tag on the OCI_Instance and restarting the affected container using Docker Compose.

---

### Requirement 16: Supabase Environment Separation

**User Story:** As a platform engineer, I want a dedicated Supabase project for production with RLS enabled on all tables, while the existing Supabase project continues to serve the dev environment, so that prod and dev data are fully isolated and production data is protected by a security baseline.

#### Acceptance Criteria

1. A new Supabase project SHALL be created for the production environment, separate from the existing Supabase project which continues to serve the dev environment.
2. THE production Supabase project SHALL have all database migrations from the existing project applied to it before any prod service is pointed at it.
3. THE production Supabase project SHALL have Row Level Security (RLS) enabled on all tables from initial setup.
4. THE `.env.prod` file on the OCI_Instance and all Vercel production environment variables SHALL reference the new production Supabase project URL and keys.
5. THE `.env.dev` file on the OCI_Instance and all Vercel dev environment variables SHALL continue to reference the existing Supabase project URL and keys.
6. THE production Supabase project SHALL use the `service_role` key exclusively in server-side services (`cos-api-gateway`, `cos-workflow-service`, `ff-api`, `dot-portal-api`, `cos-admin-dashboard`); the `anon` key SHALL only be used in browser-side Supabase JS clients.
7. WHEN RLS is enabled on a production table, THE `service_role` key SHALL bypass RLS for all backend service queries without requiring explicit policies, providing a defence-in-depth baseline without breaking existing service behaviour.
