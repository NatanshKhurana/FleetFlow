# FleetFlow

FleetFlow is a delivery-agent management application for maintaining team records in one workspace. A React dashboard connects to an Express API to register agents, find records, update contact and service-area information, and remove records with confirmation.

[Repository](https://github.com/NatanshKhurana/FleetFlow) | [Configured API health endpoint](https://fleetflow-api-2fq1.onrender.com/api/health)

## Key features

- **API-backed overview:** total, active and inactive agent counts, plus the five most recent registrations.
- **Agent management:** creation, searchable table, status/service-area filters and server-side pagination.
- **Details and editing:** individual records with UTC timestamps and partial updates that preserve unchanged fields.
- **Confirmed deletion:** an explicit confirmation dialog before removing an agent.
- **Request feedback:** loading, empty, not-found, success and safe error states; manual read retries, cancellation and stale-response protection. Failed saves retain form inputs.
- **Optional Redis caching:** list and detail responses are cached and invalidated after successful API mutations, with MongoDB fallback when Redis is unavailable.
- **Responsive themes:** mobile navigation and scrollable tables, with Dark Mode by default and a header toggle for Light Mode. Theme choices persist in browser storage when available.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Lucide icons |
| Backend | Node.js, Express, Zod, dotenv |
| Database and caching | MongoDB with Mongoose; optional Redis with node-redis |
| Testing and deployment | Node's built-in test runner, React server rendering and HTTP fixtures; Vercel frontend, Render backend |

## Architecture

Requests flow from **React → Axios (`/api`) → Express → MongoDB**. Vite proxies API requests during local development; Vercel rewrites them to Render in deployment.

MongoDB stores agent documents, timestamps and a unique business-ID index. Redis provides optional cache-aside reads with a default 60-second lifetime. Successful writes update MongoDB first, then invalidate cached list/detail responses. MongoDB must connect before the API starts; Redis failure does not prevent startup.

## Project structure

```text
client/
  src/components/, src/pages/       Dashboard, forms, tables and dialogs
  src/services/, src/state/         API access and request/form state
  src/lib/, src/validation/         Shared client helpers and validation
  public/theme.js                  Theme initialization and persistence
  test/                            Frontend and API integration tests
  package.json, package-lock.json
  .env.example, vite.config.js, vercel.json
server/
  src/app.js, src/server.js         Express app and entry point
  src/config/, src/startup.js       Database, Redis and server lifecycle
  src/routes/, src/controllers/    Agent API
  src/models/, src/validation/      Data model and request validation
  src/services/, src/middleware/    Caching, validation and error handling
  test/, test-support/, scripts/    Automated tests and opt-in live checks
  package.json, package-lock.json, .env.example
docs/
  STEP_PLAN.md, DEVELOPMENT_RULES.md
```

## Getting started

### Prerequisites

- **Node.js 24 or newer**, npm and Git. Both packages declare `node >=24`.
- A reachable **MongoDB** server or Atlas database, with permissions to read/write records and create the business-ID index. Configure Atlas network access where applicable.
- **Redis is optional.** Neither MongoDB nor Redis is installed by `npm ci`.

### Install and configure

Run in PowerShell:

```powershell
git clone https://github.com/NatanshKhurana/FleetFlow.git
cd FleetFlow
npm ci --prefix server
npm ci --prefix client
if (-not (Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (-not (Test-Path client/.env)) { Copy-Item client/.env.example client/.env }
```

Privately replace the MongoDB placeholder in `server/.env` with your database URI, including the intended database name. Keep `PORT=5000` for the example setup. Leave `REDIS_URL` blank to disable caching, or supply a private Redis URL. Never commit real environment files or place database credentials in frontend variables.

Use the package-specific [server example](server/.env.example) and [client example](client/.env.example). The root `.env.example` is a legacy template and is not loaded by either package; its `CLIENT_ORIGIN` entry does not configure CORS.

### Start the application

**Terminal 1**, from the repository root:

```powershell
cd server
npm start
```

`npm run dev` is also available for backend source watching. HTTP starts after MongoDB connects.

**Terminal 2**, separately from the repository root:

```powershell
cd client
npm run dev
```

Open **http://localhost:5173**, or the URL Vite prints if that port is occupied. With the example configuration, the API is at **http://localhost:5000/api**. Check basic HTTP health from another terminal:

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/health'
```

Expected: `{"success":true,"message":"FleetFlow API is running"}`. This endpoint does not perform a fresh MongoDB/Redis readiness check.

Use **Agents → Add new agent** to create disposable evaluation records. No login or automatic demo-data seeding is implemented. Stop each server with Ctrl+C.

## Environment variables

| Variable | Scope | Required / default | Purpose and safe example |
| --- | --- | --- | --- |
| `PORT` | Private backend configuration | Required | TCP port 1–65535; example `5000`. No missing-value fallback. |
| `MONGODB_URI` | Private backend configuration | Required | MongoDB URI, for example `mongodb://127.0.0.1:27017/fleetflow`; Atlas `mongodb+srv://` URIs are supported. Keep credentials private. |
| `REDIS_URL` | Private backend configuration | Optional; blank disables Redis | `redis://` or TLS `rediss://` URL; local example `redis://127.0.0.1:6379/0`. |
| `AGENT_LIST_CACHE_TTL_SECONDS` | Backend | Optional; `60` when absent | Shared list/detail cache lifetime, integer 1–86400 without leading zeros. A supplied blank value is invalid. |
| `VITE_API_BASE_URL` | Public browser configuration | Optional; `/api` | Keep `/api` for the supplied proxies/rewrites. All `VITE_*` values are public. |
| `API_PROXY_TARGET` | Vite dev/preview configuration | Optional; `http://localhost:5000` | Backend origin without an `/api` suffix or credentials; does not affect the deployed Vercel rewrite. |

The backend loads `server/.env` independently of the launch directory; existing process variables take precedence. If you change the backend port, update `API_PROXY_TARGET` to match. Restart the relevant process after configuration changes; production browser-variable changes require rebuilding.

## API reference

All endpoints use the `/api` base path. Source: [routes](server/src/routes/agentRoutes.js), [controllers](server/src/controllers/agentController.js) and [validation](server/src/validation/agentSchemas.js).

| Method | Endpoint | Successful response |
| --- | --- | --- |
| GET | `/api/health` | `200`: `success` and fixed health `message` |
| POST | `/api/agents` | `201`: `success`, `message`, `data: agent` |
| GET | `/api/agents` | `200`: `success`, `message`, `data: agent[]`, `pagination` |
| GET | `/api/agents/:id` | `200`: `success`, `message`, `data: agent` |
| PATCH | `/api/agents/:id` | `200`: `success`, `message`, `data: updatedAgent` |
| DELETE | `/api/agents/:id` | `204`: empty body |

The database record **`id`** is a 24-character hexadecimal ObjectId used in detail/update/delete URLs. The business **`agentId`** is a separate, unique identifier supplied during creation and cannot be edited. Responses expose `id`, `agentId`, `fullName`, `phone`, `email`, `serviceArea`, `status`, `createdAt` and `updatedAt`; model internals are omitted.

### Create and update

Example creation body for disposable evaluation data:

```json
{
  "agentId": "EVAL-001",
  "fullName": "Alex Example",
  "phone": "+1 202-555-0142",
  "email": "alex@example.com",
  "serviceArea": "Central",
  "status": "active"
}
```

All fields except `status` are required nonblank strings. Status accepts `active` or `inactive` and defaults to `active` when omitted. Values are trimmed; email is validated and lowercased. Phone syntax allows digits, an optional leading `+`, spaces, hyphens, dots and balanced digit-group parentheses; letters are rejected. It does not verify country-specific length or reachability.

PATCH requires at least one of `fullName`, `phone`, `email`, `serviceArea` or `status`, and preserves omitted fields. Unknown fields, IDs and timestamps are rejected in request bodies. Phone and email are not unique fields.

### Search, filters and pagination

| Query parameter | Default | Behavior |
| --- | --- | --- |
| `page` | `1` | Positive decimal integer without leading zeros; unsafe offsets are rejected. |
| `limit` | `10` | Positive decimal integer without leading zeros, maximum `100`. |
| `search` | Omitted | Trimmed, case-insensitive literal substring across business ID, name, phone, email and service area; maximum 200 characters. Blank is ignored. |
| `status` | Omitted | Exact `active` or `inactive`; supplied blank values are invalid. |
| `serviceArea` | Omitted | Trimmed, exact, case-sensitive match; blank is ignored. |

Filters combine with search using AND. Results sort newest first (`createdAt`, then `_id`, descending). Repeated, nested or unknown query parameters are rejected; there is no custom sort parameter.

Example read:

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/agents?page=1&limit=10&search=Alex&status=active&serviceArea=Central'
```

`pagination` contains `page`, `limit`, matching `total` and `totalPages = ceil(total / limit)`. No matches return an empty array with zero totals; a page beyond the end returns an empty array with the requested page and matching totals. Overview metrics use this same endpoint, not a separate overview API.

Common errors: **400** invalid body/ID/query or malformed JSON, **404** missing record/route, **409** duplicate business ID or write conflict, **413** oversized JSON, **500** unexpected server failure. Errors include `success:false` and a safe `message`; validation errors also include `details` with `section`, `field` and `message`. Internal errors and credentials are not returned.

## Testing and build

Install dependencies in **both** packages first: frontend integration tests import the backend app. Run each command in the indicated directory.

| Directory | Command | Purpose |
| --- | --- | --- |
| `server/` | `npm test -- --test-concurrency=1` | Full backend suite using Node's test runner, with sequential test files. |
| `client/` | `npm test` | Full frontend suite, including Axios-to-Express integration through Vite. |
| `client/` | `npm run build` | Production assets in ignored `client/dist/`. |
| `client/` | `npm run preview` | Serve an existing build locally, normally on port 4173; does not deploy it. |

Normal automated tests use controlled HTTP fixtures, mocked model storage and fake Redis, including cache-enabled/unavailable scenarios. React tests render markup and exercise request/form state; they do not run browser interactions. These suites do not independently prove live database persistence, real cache behavior or deployed-browser acceptance.

### Optional live checks

Run inside `server/` only after privately supplying the named process variable for a dedicated test environment. These scripts do not load `.env` or fall back to normal application credentials.

| Command | Test-only variable | Scope |
| --- | --- | --- |
| `node scripts/verify-crud.js` | `FLEETFLOW_TEST_MONGODB_URI` | Real CRUD in a random disposable collection; attempts exact collection cleanup. Does not test a backend restart. |
| `node scripts/verify-redis.js` | `FLEETFLOW_TEST_REDIS_URL` | Connection and PING/PONG; no data writes. |
| `node scripts/verify-cache.js` | `FLEETFLOW_TEST_REDIS_URL` | UUID-scoped cache hits/misses, expiry and invalidation; attempts exact-key cleanup. No MongoDB/HTTP CRUD. |

Require exit code zero, including cleanup. Interrupted checks can leave disposable collections or cache metadata; inspect cleanup messages. Do not use shared production storage for failure simulation or broad deletion commands.

## Deployment

The existing configuration uses **Vercel for the frontend** and **Render for the backend**.

| Service | Project root | Install | Build / start |
| --- | --- | --- | --- |
| Vercel | `client/` | `npm ci` | `npm run build`; output directory `dist` |
| Render | `server/` | `npm ci` | `npm start`; Node 24+, private MongoDB configuration and platform `PORT` |

Keep `VITE_API_BASE_URL=/api` or unset it. [client/vercel.json](client/vercel.json) rewrites `/api/:path*` to `https://fleetflow-api-2fq1.onrender.com/api/:path*` before the SPA fallback to `/index.html`. This supports API requests and direct browser navigation to detail/edit routes. An absolute browser API URL bypasses this arrangement; the backend does not enable CORS.

Repository configuration describes the intended deployment; it does not establish current hosting settings or end-to-end production health.

## Known limitations

- **No authentication, authorization or rate limiting.** The CRUD API is not access-controlled.
- **MongoDB is required for data operations.** Redis is optional; it is not a database fallback. After Redis connection loss, recovery requires an explicit reconnect or backend restart.
- **Live acceptance remains incomplete.** Persistence across backend restarts, real cache expiry/invalidation and deployed-browser behavior have not been fully verified. A successful health response is not proof of these checks.
- **Reads are snapshots.** Overview counts and list queries are separate reads; MongoDB/Redis updates are not one transaction. Concurrent requests or failed invalidation can expose older data, especially across instances; direct database writes bypass API invalidation.
- **Writes are not automatically retried.** A timeout can hide a successful write; check the saved record before resubmitting. Failed form drafts are retained while mounted, not across reloads.
- The reported production first-load API failure has no established root cause. Check browser request path, status, content type and timing against backend logs; a Render cold start has not been proven responsible.

## Further documentation

- [Development roadmap and verification history](docs/STEP_PLAN.md)
- [Development and contribution rules](docs/DEVELOPMENT_RULES.md)
