# FleetFlow

FleetFlow is a planned Delivery Agent Management System for creating, viewing, updating, and deleting delivery agent records through a dashboard backed by an API.

## Current setup status

**The backend supports creating, listing, retrieving, partially updating, and deleting agents.** List requests support pagination/search/filters; detail, update, and delete requests use the public database ID. The backend connects to MongoDB Atlas before accepting HTTP requests and reuses the Agent model, request validation, and centralized errors. The frontend provides the API-backed overview, searchable/filtered/paginated Agents page, creation form, individual details, prefilled editing, and confirmed deletion.

- Step 1 is COMPLETE and committed locally as `0f170dc` (`chore: initialize FleetFlow project structure`).
- Step 2 is COMPLETE and committed locally as `e5ad3ec` (`feat: set up Express server and health check`).
- Step 3 is COMPLETE and committed locally as `ee4870c` (`chore: configure environment variables`).
- Step 4 is COMPLETE and committed locally as `9e814f5` (`feat: connect application to MongoDB`).
- Step 5 is COMPLETE and committed locally as `4fa2766` (`feat: define delivery agent data model`).
- Step 6 is COMPLETE and committed locally as `772929d` (`feat: add request validation and API errors`).
- Step 7 is COMPLETE and committed locally as `d516a14` (`feat: add create agent API`).
- Step 8 is COMPLETE and committed locally as `e50b52d` (`feat: add paginated agent list API`).
- Step 9 is COMPLETE and committed locally as `31671be` (`feat: add get agent by ID API`).
- Step 10 is COMPLETE and committed locally as `7e699d9` (`feat: add update agent API`).
- Step 11 is COMPLETE and committed locally as `a40ea0e` (`feat: add delete agent API`).
- Step 12 is COMPLETE and committed locally as `c57405e` (`test: strengthen CRUD API coverage`). Its optional live MongoDB script has not been run.
- Step 13 is COMPLETE and committed locally as `25c803f` (`feat: configure Redis connection`). The project owner subsequently verified Redis Cloud with `node scripts/verify-redis.js`, reporting successful connection and PING/PONG.
- Step 14 is COMPLETE and committed locally as `0977418` (`feat: cache agent list responses in Redis`). Live list-cache behavior has not been tested by the agent.
- Step 15 is COMPLETE and committed locally as `09580c8` (`feat: cache individual agent responses`). Live detail-cache behavior has not been tested by the agent.
- Step 16 is COMPLETE and committed as `b8f8ec9` (`fix: invalidate stale agent cache entries`), with status documentation committed as `95aeef9`. Its verification results remain recorded below.
- Step 17 is COMPLETE and committed as `f4d9846` (`test: verify Redis caching and consistency`). Live cache verification has not been run.
- Step 18 is COMPLETE and committed as `e170c33` (`feat: set up React dashboard application`).
- Step 19 is COMPLETE and committed as `f90d653` (`feat: build responsive admin dashboard layout`). The project owner confirmed manual browser viewport and keyboard verification passed.
- Step 20 is COMPLETE and committed as `b5d958e` (`feat: add agent dashboard overview`), including the port-5000 proxy alignment.
- Step 21 is COMPLETE and committed as `36ecb01` (`feat: build searchable agent management table`). Its verification results remain recorded below.
- Step 22 is COMPLETE and committed as `7ce23a9` (`feat: add delivery agent creation form`). Its verification results remain recorded below.
- Step 23 is COMPLETE and committed as `9e1f9a6` (`feat: add agent details view`). Its verification results remain recorded below.
- Step 24 is COMPLETE after 77 focused tests, all 91 frontend tests, the production build, syntax checks, and Git checks passed. Editing and confirmed deletion use the existing PATCH/DELETE contracts. Browser interactions and live persistence were not verified in this step; changes remain uncommitted for review.
- Step 25 retains its existing PENDING roadmap status and documented automated integration verification; Steps 27-30 remain PENDING.
- Step 25 now has automated frontend-to-Express integration coverage through the Vite proxy, with Redis enabled and unavailable. See the Step 25 verification section below for results and remaining live/browser checks. Roadmap statuses are preserved as requested.
- Step 26 is COMPLETE: shared read feedback distinguishes initial loading, refresh, cancellation, timeout/network failure, empty success, and missing agents. All 103 frontend tests and the production build passed; see the Step 26 section for the first-load investigation and limitations.
- The server exposes health, create-agent, list-agent, single-agent GET, PATCH, and DELETE endpoints with consistent JSON error responses. Successful deletion returns 204 with no body, as required by the roadmap.
- Express, dotenv, Zod, Mongoose, and node-redis are the direct dependencies. The development script uses Node's built-in watch mode.
- `client/` contains a responsive dashboard shell, API-backed overview, searchable/filtered/paginated Agents list, creation/edit forms, individual details, and delete confirmation with loading/not-found/error/retry handling. List and single-agent GET endpoints use optional Redis caching with a shared default 60-second TTL and invalidation after successful mutations. There is no authentication. Normal tests use mocked services; dedicated live cache expiry/invalidation checks remain unperformed.
- The backend loads `server/.env` and requires valid PORT and MongoDB URI configuration. Existing private configuration is preserved. Redis remains optional because caching must not prevent database-backed API startup.

## Planned technology stack

| Area | Technology | Purpose |
| --- | --- | --- |
| User interface | React + Vite | Build and develop the browser application |
| Styling | Tailwind CSS | Style the interface consistently |
| Navigation | React Router | Move between application pages |
| API requests | Axios | Send requests from the browser to the server |
| Backend | Node.js + Express | Run the server and expose API endpoints |
| Input validation | Zod | Check incoming data before using it |
| Database | MongoDB + Mongoose | Store application data and define its structure |
| Response caching | Redis | Cache agent lists and details with expiry and invalidation |

## Planned features

The agreed scope includes creating, listing, viewing, updating, and deleting delivery agents; searching and filtering agents by status and service area; paginated results; and dashboard totals for active/inactive agents plus recent registrations. Backend CRUD, validation, caching/invalidation, the dashboard overview, Agents list, creation/edit forms, detail page, and confirmed deletion are implemented. The remaining roadmap covers integration verification, polish, tests, documentation, and submission.

## High-level architecture

The React overview in `client/` sends HTTP requests to the Express API in `server/` using Axios. The server validates input with Zod and uses Mongoose to read and write MongoDB Atlas data. Redis caches agent list and detail responses, with expiry and invalidation after successful mutations. Database credentials and other server secrets stay on the server.

```text
Browser: React + Vite + Tailwind CSS + React Router
    |
    | HTTP requests through Axios
    v
Server: Node.js + Express + Zod
    |-- Mongoose --> MongoDB
    `-- Redis (agent response caching)
```

## Project layout

```text
FleetFlow/
|-- client/
|   |-- .env.example          Public API base URL example
|   |-- .gitignore            Local dependencies, builds, and environment files
|   |-- package.json          Frontend dependencies and commands
|   |-- package-lock.json     Exact resolved dependency versions
|   |-- index.html            Browser document with the React mount point
|   |-- vite.config.js        React and Tailwind Vite plugins
|   |-- src/
|       |-- main.jsx          React entry point and browser router
|       |-- App.jsx           Shared layout routes and unknown-page fallback
|       |-- index.css         Tailwind import, font, wrapping, and focus styles
|       |-- components/layout/
|       |   |-- Brand.jsx     Shared logo and workspace subtitle
|       |   |-- Sidebar.jsx   Desktop sidebar and shared navigation
|       |   |-- Header.jsx    Header and mobile navigation disclosure
|       |   `-- DashboardLayout.jsx  Shell, menu state, and content outlet
|       |-- components/overview/OverviewContent.jsx  Summary cards and request states
|       |-- pages/OverviewPage.jsx   Overview request lifecycle and page
|       |-- services/overviewService.js  Paginated counts and recent-agent mapping
|       |-- components/agents/  Filters, table, results, create/edit forms, details, and DeleteAgentDialog
|       |-- pages/AgentsPage.jsx  Agents request lifecycle inside the shared shell
|       |-- pages/AgentDetailPage.jsx  Detail/edit loading, route ID checks, and post-mutation navigation
|       |-- services/agentsService.js  CRUD requests and public response validation
|       |-- validation/createAgent.js  Form rules, normalization, and safe submission errors
|       |-- validation/agentMutations.js  Editable fields, partial updates, and mutation errors
|       |-- state/createAgentResource.js  Form values and guarded submission lifecycle
|       |-- state/agentMutationResources.js  Guarded edit/save and confirm/delete lifecycles
|       |-- state/agentsResource.js  Applied filters, pagination, retry, and reset
|       |-- state/requestResource.js  Shared load/retry/cancel lifecycle
|       |-- state/overviewResource.js  Existing overview interface to that shared lifecycle
|       `-- lib/api.js        Shared Axios client
|   `-- test/                Layout, agent CRUD UI/services, overview, and Vite proxy tests
|-- server/
|   |-- .env.example         Safe backend configuration template
|   |-- package.json         Server dependencies and commands
|   |-- package-lock.json    Exact resolved dependency versions
|   |-- src/
|   |   |-- app.js           Express routes and middleware
|   |   |-- server.js        Starts the HTTP server
|   |   |-- startup.js       Connects the database before listening; owns cleanup
|   |   |-- routes/
|   |   |   `-- agentRoutes.js       All five agent routes and request validation
|   |   |-- controllers/
|   |   |   `-- agentController.js   Create/list/detail/update/delete handlers
|   |   |-- services/
|   |   |   |-- agentCacheState.js   Shared generation, invalidation, and bounded commands
|   |   |   |-- agentListCache.js    List cache keys, JSON checks, and Redis reads/writes
|   |   |   `-- agentDetailCache.js  Agent-specific cached detail responses
|   |   |-- validation/
|   |   |   |-- agentSchemas.js     Create/update bodies, list query, and ID params
|   |   |   `-- cachedAgentSchema.js  Public agent fields accepted by both caches
|   |   |-- config/
|   |   |   |-- env.js       Loads and validates backend configuration
|   |   |   |-- db.js       Mongoose connection and safe lifecycle messages
|   |   |   `-- redis.js    Optional shared Redis connection and bounded cleanup
|   |   |-- models/
|   |   |   `-- Agent.js     Delivery Agent schema and exported model
|   |   |-- middleware/
|   |   |   |-- validateRequest.js  Reusable Zod request validation
|   |   |   `-- errorHandler.js     Final JSON error handler
|   |   `-- utils/
|   |       `-- ApiError.js  Expected application and request validation errors
|   |-- test/
|       |-- env.test.js      Configuration regression tests
|       |-- db.test.js       Mocked database connection tests
|       |-- redis.test.js    Mocked Redis configuration and lifecycle tests
|       |-- agent.test.js    Agent schema validation and index definitions
|       |-- create-agent.test.js    Mocked create-agent endpoint tests
|       |-- list-agents.test.js     Mocked list query and pagination tests
|       |-- get-agent.test.js       Mocked single-agent lookup tests
|       |-- update-agent.test.js    Partial updates and Mongoose query middleware
|       |-- delete-agent.test.js    Mocked targeted deletion and error responses
|       |-- crud-flow.test.js       Connected lifecycle with a fresh mocked store
|       |-- cache-invalidation.test.js  Mutation invalidation and stale-fill protection
|       |-- integration-script.test.js  Optional-script configuration guard
|       |-- request-errors.test.js  Request middleware and safe error responses
|       `-- startup.test.js  Startup ordering, HTTP, and cleanup tests
|   |-- test-support/
|   |   |-- crudFlow.js      HTTP assertions shared by mocked and optional real checks
|   |   `-- fakeRedis.js     Shared test-local Redis storage and expiry clock
|   `-- scripts/
|       |-- verify-create-agent.js  Earlier opt-in create persistence check
|       |-- verify-crud.js   Opt-in full CRUD check; process configuration only
|       `-- verify-redis.js  Opt-in Redis PING; process configuration only
|-- docs/
|   |-- DEVELOPMENT_RULES.md Permanent development rules
|   `-- STEP_PLAN.md         Roadmap and acceptance criteria
|-- README.md                Project overview and progress
|-- .gitignore               Files Git should ignore
`-- .env.example             Safe configuration placeholders
```

Client source files and package lockfiles belong in Git. Both package directories' `node_modules/`, local environment files, and frontend `dist/` output are ignored; `.env.example` files remain trackable.

## Development workflow

Before every future step, read [the development rules](docs/DEVELOPMENT_RULES.md) and [the step plan](docs/STEP_PLAN.md). Implement only the current step requested by the project owner. Update this README with actual progress and record the checks performed before requesting review.

## Frontend setup and commands

Use Node.js 24 or newer and npm, matching the backend convention. The frontend is a separate package inside `client/`; run these PowerShell commands from the repository root:

```powershell
cd client
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. If that port is occupied, Vite may select the next available port. The shell renders without the backend, but overview data requires a reachable Express API and MongoDB. Redis remains optional. Stop Vite with Ctrl+C. For a fresh checkout, `npm ci` installs the exact versions in `client/package-lock.json`.

For the local overview setup, start the backend in a separate PowerShell terminal from the repository root:

```powershell
cd server
npm start
```

The existing backend's normal local configuration uses port 5000, and the Vite proxy now defaults to that same port. No PORT override is needed. Use a fresh terminal without the earlier process-only PORT override, or remove that stale override with `Remove-Item Env:PORT -ErrorAction SilentlyContinue` before starting the backend. Backend code has no hardcoded port: `config/env.js` validates PORT and `startup.js` listens on that value. `GET /api/health` and `GET /api/agents` are the actual mounted paths. To use a backend running on a different port, set `API_PROXY_TARGET` in `client/.env` to its public origin and restart Vite; no backend file changes are needed.

| Command inside `client/` | Purpose |
| --- | --- |
| `npm run dev` | Start Vite with development updates when files change |
| `npm run build` | Compile the frontend into `client/dist/` for production |
| `npm run preview` | Serve an existing production build locally, normally on port 4173; run build first |
| `npm test` | Run 103 frontend tests, including frontend-to-Express integration (requires dependencies installed in both `client/` and `server/`) |

`preview` is a local build check, not a production hosting service. The existing Vercel configuration serves `index.html` for browser-router page URLs such as `/agents`, `/agents/:id`, and `/agents/:id/edit`, after matching the API rewrite. Overview, Agents, Agent details/editing, and the unknown-page fallback share the dashboard shell. Creation is available on Agents; confirmed deletion is available from the table and detail page.

### Frontend configuration

`client/.env.example` documents the safe local values:

```dotenv
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:5000
```

If an existing `client/.env` still contains the earlier `API_PROXY_TARGET=http://localhost:7777`, change that public target to `http://localhost:5000` or remove it to use the default, then restart Vite.

`src/lib/api.js` uses `axios.create()` to export one reusable HTTP client with a 10-second timeout. It reads `import.meta.env.VITE_API_BASE_URL`; missing/blank values now fall back to `/api`. Requests to `/agents` target `/api/agents` on the frontend origin. `vite.config.js` forwards `/api` unchanged to `API_PROXY_TARGET` during development and preview, defaulting to `http://localhost:5000`. The public proxy target is loaded from client configuration and is not a `VITE_*` browser variable. This follows [Vite's proxy configuration](https://vite.dev/config/server-options#server-proxy).

If you copied the older client example, replace its `VITE_API_BASE_URL=http://localhost:5000/api` with `/api` and set the proxy target to the running backend's origin. Absolute API base URLs bypass Vite's proxy and require server-side CORS permission; the existing Express app does not enable cross-origin access. The existing `client/vercel.json` forwards `/api/:path*` to `https://fleetflow-api-2fq1.onrender.com/api/:path*` before its SPA fallback. Keep the deployed frontend's public API base at `/api` (or unset to use that default), so browser requests use this same-origin rewrite. Vercel environment values override the build default; the deployed settings were not inspected in Step 25. The development/preview proxy is not included in `dist/`. Restart Vite after local environment changes; rebuild after changes to browser environment values.

Vite loads client environment files automatically. **Every `VITE_*` value is public browser configuration** and can be included in built assets. Never copy server database/Redis URLs, passwords, or secret tokens into client environment files. The client does not load the private backend environment file. See [Vite environment documentation](https://vite.dev/guide/env-and-mode).

Overview, Agents, and Agent details read data through the existing Axios client. Agent forms use POST `/api/agents` and PATCH `/api/agents/:id`; confirmed deletion uses DELETE `/api/agents/:id`. No backend CORS changes or new endpoints were needed. A frontend build alone does not verify backend connectivity; Step 20 records the earlier live overview check, while Steps 21-24 use controlled responses and local HTTP fixtures.

### Frontend files and dependencies

- `index.html` supplies the page title and the `root` element where React mounts.
- `src/main.jsx` mounts React with `createRoot()`. `StrictMode` helps detect development issues; `BrowserRouter` enables navigation without full page reloads.
- `src/App.jsx` nests Overview (`/`), Agents (`/agents`), Agent details (`/agents/:id`), Edit agent (`/agents/:id/edit`), and the unknown-page route inside `DashboardLayout`. Page containers subscribe to request state and load/cancel it through React effects. The overview view renders summary cards and recent registrations. `components/agents/` contains the search/filter form, results states/pagination, responsive table, shared create/edit field rendering, detail view, and delete confirmation.
- `components/layout/Brand.jsx` shares the FleetFlow logo and subtitle. `Sidebar.jsx` exports the shared navigation and desktop sidebar. `Header.jsx` uses that same navigation for a mobile disclosure. `DashboardLayout.jsx` owns the menu state, responsive reset, Escape handler, skip link, page title, and React Router `Outlet`, which displays the selected page.
- `src/index.css` imports Tailwind and defines the system font, visible keyboard focus outlines, and wrapping for long text. `vite.config.js` registers the React and Tailwind plugins. This follows the officially supported [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite); no legacy `tailwindcss init`, separate PostCSS configuration, or Autoprefixer package is needed.
- `src/lib/api.js` is the existing shared Axios client. The overview and agents services map the actual API responses. The existing request lifecycle was extracted unchanged into `state/requestResource.js` so both pages share loading/success/error, cancellation, retry, and late-response protection. `overviewResource.js` preserves its existing export as an alias; `agentsResource.js` adds applied query state, page resets, and server-bound pagination. React uses `useSyncExternalStore` to subscribe to the same logic tested directly by Node. No authentication or interceptors were added.
- `package.json` declares ES modules, Node requirements, dependencies, and scripts. `package-lock.json` records the exact installed dependency tree.
- `client/.gitignore` complements the root ignore rules for dependencies, build output, tool caches, logs, editor settings, and local environment files. The safe `.env.example` stays trackable.

React and React DOM render the page; React Router provides declarative routing; Axios prepares HTTP access; Lucide React provides icons. Vite, its React plugin, Tailwind CSS, and its Vite plugin are development/build dependencies. The [React Router installation guide](https://reactrouter.com/start/declarative/installation) uses the `react-router` package directly, so `react-router-dom` is not installed.

### Step 19 layout and manual verification

The shell uses slate neutrals, emerald accents, a white sidebar/header, and restrained typography. At `lg` (64rem, normally 1024px), a 16rem desktop sidebar sits beside a flexible content column. Below that breakpoint, the header shows branding with the current page title and a 44px navigation button. The button opens an inline navigation panel below the header; it pushes content down instead of covering it with a modal. There is no focus trap because the panel is not a dialog.

Overview links to `/` and Agents now links to `/agents`, with React Router's active-page indication in shared desktop/mobile navigation. Unknown URLs preserve the shell and offer a link home. Content has a maximum width, responsive padding, a `minmax(0, 1fr)` grid column, and long-text wrapping to reduce overflow. The supported minimum viewport width is 320px.

The menu button reports its current state through `aria-expanded`, identifies its panel with `aria-controls`, and changes its label between Open navigation and Close navigation. Closing via the selected Overview link or Escape returns focus to the menu button. Route changes and crossing into the desktop breakpoint reset the menu. Closed contents use the native `hidden` attribute, keeping their links out of keyboard navigation. A Skip to content link and visible focus outlines support keyboard use. Event listeners are removed when no longer needed.

For future regression checks, run `npm run dev` inside `client/`, then use browser responsive/device tools:

| Viewport | Expected behavior to verify |
| --- | --- |
| 320×568 and 390×844 | Branding, page title, and menu button fit; welcome text wraps; no horizontal scrolling |
| 768×1024 (tablet portrait) | Inline mobile navigation and comfortable content spacing |
| 1024×768 (tablet landscape) | Desktop sidebar replaces the mobile control; main content fits the remaining column |
| 1280×800 and 1440×900 | Persistent sidebar/header, consistent spacing, and bounded content width |
| 200% browser zoom | Navigation switches at the effective CSS width and text remains usable |

At each relevant size, check that `document.documentElement.scrollWidth <= window.innerWidth`. Use Tab to reach Skip to content, activate it, and confirm focus moves to the main content. Below the desktop breakpoint, use Enter/Space on the menu control, check expanded/collapsed state, and press Escape to confirm the menu closes and focus returns to its button. Reopen it and select Overview or Agents to check the same close behavior. Open the menu, resize to desktop and back, and verify it stays closed. Check active navigation styling on both routes. Load an unknown URL and follow Return to Overview. On Agents, horizontal scrolling should stay inside the labelled table region; View/Edit open their routes, and Delete must open confirmation without sending a deletion request.

The project owner confirmed manual browser verification passed at 320px, 390px, 768px, 1024px, and 1440px: mobile menu open/close, Escape closing the menu and returning focus, Tab navigation, resizing across 1024px, and no horizontal overflow all passed. This browser verification was performed by the project owner, not the agent. Step 19 is COMPLETE; Steps 20-30 remain pending. No metrics, tables, forms, user profiles, fake data, API calls, or new dependencies were added.

## Backend setup and commands

Use Node.js 24 or newer and npm. Verification used Node.js v24.19.0 and npm 11.7.0. From the repository root:

```powershell
cd server
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# If creating a new .env, replace its MongoDB placeholder privately before starting.
npm run dev
```

`cd server` selects the backend package. `npm ci` installs the exact versions recorded in `package-lock.json`. The PowerShell `if` command copies the safe template only if `.env` does not already exist, preserving any local settings. `npm run dev` runs `node --watch src/server.js`, which starts the API and restarts it when source files change. Stop it with Ctrl+C. To run without automatic restarts, use `npm start` (`node src/server.js`). Run `npm test` (`node --test`) for all server tests, or `node --test test/request-errors.test.js` for just the request/error tests. Neither test command requires a live database or private environment configuration. No build command is needed for this JavaScript backend.

Direct dependencies are Express 5.3.0, dotenv 18.0.8, Zod 4.6.7, Mongoose 9.11.2, and redis 6.3.0 (node-redis), with exact resolved versions in the lockfile. Express serves requests, dotenv reads the environment file, Zod checks configuration, Mongoose manages MongoDB connectivity, and node-redis provides the Redis client. Node provides watch mode and tests, so no nodemon or test dependency is needed. Step 13 used `npm install redis` inside `server/`; `npm ci` above is the reproducible setup command for an existing checkout.

## MongoDB Atlas prerequisites and startup

MongoDB is FleetFlow's persistent database: it retains created agents between server restarts. Redis is optional and connects only when configured; it caches successful agent-list and individual-agent responses. The create route imports the existing Agent model. Mongoose can initialize its collection and indexes after connection; the controller also waits for `Agent.init()` before writing so duplicate protection is ready.

Before starting, have an active Atlas cluster, a database user with access to the intended FleetFlow database, and your current machine's IP permitted in Atlas Network Access. A database user is separate from an Atlas website account. Obtain the Node.js driver connection URI privately from Atlas, fill in the database user's credentials and application database name locally, and save it as `MONGODB_URI` in `server/.env`. Encode special characters in credentials as required by the URI format. Do not paste the URI into chat, logs, documentation, or Git. Existing `.env` files must be preserved; the guarded PowerShell copy above only creates one when absent.

Startup runs in this order:

1. Load `server/.env` and validate PORT and MongoDB URI syntax.
2. Call `connectDatabase()` and wait for Mongoose to connect to Atlas.
3. If `REDIS_URL` is supplied, attempt Redis once with a three-second connection deadline. Missing or failed Redis configuration does not stop startup.
4. Open the Express HTTP listener on the validated port, unless shutdown was requested during either connection phase.

`mongoose.connect()` starts the network connection and authentication process. It returns a Promise because this work finishes later; `await` pauses startup until the Promise succeeds or fails. The connection module reuses an established connection or waits for one already opening, avoiding duplicate connections. See the [Mongoose connection guide](https://mongoosejs.com/docs/connections.html).

On success, expect `MongoDB connected successfully.`, a fixed Redis connected/skipped/failed message, then `FleetFlow API is running at http://localhost:<port>`. None includes a connection URI or credentials. Then request `GET /api/health` as shown below. The unchanged health response confirms HTTP startup completed after database connection; it is not an ongoing database or Redis readiness probe.

If connection fails, startup logs safe instructions, closes the database client, exits unsuccessfully, and leaves HTTP closed. The connection uses a 30-second server-selection timeout, without a custom retry system. Connection error and disconnected events emit fixed messages without driver details. Mongoose retains its normal connection monitoring behavior.

Ctrl+C (SIGINT) or SIGTERM starts shutdown: stop accepting HTTP requests, let active requests finish, close Redis, then disconnect Mongoose. Repeated cleanup requests share one operation. Shutdown during MongoDB or Redis startup cancels HTTP startup. Redis close gets a one-second grace period before immediate destruction; an in-progress Redis connection is bounded by its three-second deadline. MongoDB cleanup still runs if Redis cleanup fails. The existing ten-second overall shutdown deadline remains in place; cleanup failures exit unsuccessfully.

For connection trouble, check the private database username/password, database permissions, current IP access-list entry, cluster availability, DNS resolution, and firewall/network access to Atlas. Restart after fixing local configuration. Do not disable TLS checks or expose credentials to diagnose errors. The [Atlas connection troubleshooting guide](https://www.mongodb.com/docs/atlas/troubleshoot-connection/) covers authentication, IP access, and network problems.

## Delivery Agent model

`server/src/models/Agent.js` defines the document structure with `mongoose.Schema()` and exports the `Agent` model as its default export. A schema describes what a record may contain; a model lets later code create and work with records using that schema. Importing this module does not load `.env` or call a database connection function.

| Field | Purpose and rules |
| --- | --- |
| `agentId` | Caller-supplied business identifier; required trimmed string with a unique MongoDB index. Values remain case-sensitive. It is separate from MongoDB's generated `_id`, exposed as `id` in API responses. No sequence counter or business-ID generator is introduced. |
| `fullName` | Agent's display name; required trimmed string. |
| `phone` | Contact number; required trimmed string containing numeric phone syntax. Optional leading `+`, spaces, hyphens, dots, and digit groups in parentheses are accepted; formatting is preserved. |
| `email` | Contact email; required string, trimmed and converted to lowercase. |
| `serviceArea` | Area served by the agent; required trimmed string. |
| `status` | Trimmed string allowing only `active` or `inactive`. Defaults to `active` when omitted; null and empty values are rejected. |
| `createdAt` | Date managed by Mongoose when the document is first persisted. |
| `updatedAt` | Date managed by Mongoose when the document is saved or updated through supported Mongoose operations. |

`timestamps: true` enables the two date fields. Merely constructing or validating an unsaved document does not populate timestamps. The schema tests check timestamp configuration without saving to a database.

Only `agentId` has a declared unique index. Phone and email deliberately allow shared contact details because no rule requiring one agent per contact method has been agreed. Trimming and email lowercasing happen before persistence. The model and POST/PATCH request schemas enforce phone syntax; the request schemas also validate email syntax. No international phone canonicalization is introduced. See the phone-validation correction below for its scope and regression checks.

Mongoose validation catches missing required fields, blank required text after trimming, and unsupported status values before a normal save. This helps keep records consistent; it does not replace request validation. `unique: true` declares a MongoDB index rather than a Mongoose validator: `validate()` cannot detect duplicate stored IDs. The create controller waits for index initialization and converts MongoDB duplicate-key code 11000 to a safe 409 response. MongoDB enforces uniqueness even for concurrent requests, without a race-prone pre-check. See the [Mongoose validation guide](https://mongoosejs.com/docs/validation.html) and [Model.init documentation](https://mongoosejs.com/docs/api/model.html#Model.init()).

`server/test/agent.test.js` builds sample documents and calls `validate()` in memory. `validAgent()` supplies readable test data; `assert.rejects()` checks that invalid documents fail. The tests also inspect timestamp and index definitions. They import neither environment configuration nor startup code and require no live database or credentials.

## Environment configuration

Edit `server/.env` after copying `server/.env.example` only when needed. The template supplies safe `PORT=5000`, a clearly labelled MongoDB placeholder that must be replaced privately, and blank Redis configuration. It cannot connect until the MongoDB value is configured. The root `.env.example` remains a general planning template; the backend does not load a root `.env` or use its frontend placeholders.

| Variable | Purpose and validation |
| --- | --- |
| `PORT` | Required TCP port. Must contain decimal digits representing a whole number from 1 through 65535. It is converted from text to a number before the server listens. There is no silent fallback for a missing or invalid value. |
| `MONGODB_URI` | Required non-empty private MongoDB connection URI. Whitespace is trimmed and MongoDB's driver parser checks URI syntax, including standard and SRV formats, without connecting. Missing, blank, placeholder, and malformed values are rejected without printing them. Valid syntax does not prove that credentials or network access work; startup checks the real connection. |
| `REDIS_URL` | Optional private `redis://` or `rediss://` connection URL; `rediss` uses TLS. Missing/blank skips Redis; nonblank text is trimmed and passed to the client. Invalid URL syntax or connection failures produce fixed warnings and leave Redis unavailable without preventing HTTP startup. Configure real values privately. |
| `AGENT_LIST_CACHE_TTL_SECONDS` | Shared list/detail cache lifetime. The existing name is retained so Step 15 reuses configuration. Defaults to **60** when absent. If supplied, must be decimal whole-number text from **1 to 86400**, with surrounding whitespace allowed. Blank, zero, fractional, out-of-range, and nonnumeric values fail configuration validation with a fixed readable error. Applies to new cache writes; changing it does not alter already stored entries. |

`src/config/env.js` uses a path relative to its own location to load `server/.env`, even when Node starts from the repository root. Existing process variables take precedence over values in the file. A missing file is allowed when the process environment supplies valid `PORT` and `MONGODB_URI`; an unreadable file fails with a readable error. The loader validates before the HTTP listener starts and exports `env` for other modules. Startup passes the validated list TTL through Express `app.locals`, so controllers do not import or load private environment configuration. Only expected fields are exported. Error messages do not print submitted values or credentials.

This uses dotenv's explicit path and override options and Zod's schema parsing; see the [dotenv documentation](https://github.com/motdotla/dotenv#readme) and [Zod API documentation](https://zod.dev/api).

The root `.gitignore` already excludes `.env` and `.env.*` in subfolders and permits `.env.example`. No server-specific ignore file is needed. Never commit `.env` or put real credentials in example files. Browser environment variables are public and must never contain secrets.

If startup reports `PORT must be a whole number from 1 to 65535`, check `PORT` in `server/.env`: blank values, words, fractions, zero, negative values, and values above 65535 are rejected. A missing value produces the same instruction to set `PORT`. Existing PowerShell variables override the file. To remove unwanted overrides for the current terminal, use `Remove-Item Env:PORT -ErrorAction SilentlyContinue` or `Remove-Item Env:MONGODB_URI -ErrorAction SilentlyContinue`, without printing secret values. Restart the server after changing `.env`; watch mode tracks source files, so do not rely on it to reload the environment file. If a MongoDB syntax error occurs, replace the placeholder privately and check URI formatting; for connection failures use the Atlas troubleshooting guidance above. If the HTTP port is occupied, choose another free valid port or stop the conflicting process. For a file-read error, check permissions. Only Redis may remain absent or blank in this step.

## Redis connection management

`server/src/config/redis.js` exports `connectRedis(url)`, `disconnectRedis()`, and `getRedisClient()`. Startup passes `env.REDIS_URL` to the connection function; this module never loads `.env` itself. `getRedisClient()` returns the shared ready client or `null` when unavailable. The list-cache service reuses this client. Importing the module opens no connection.

`connectRedis()` creates one client using node-redis. Concurrent connection requests share an attempt; calls after success reuse the ready client. Missing configuration returns `null` without creating a client. A configured attempt has a three-second socket timeout and a three-second overall deadline covering DNS/authentication/handshake work. URL parsing and connection failures return `null` with fixed messages. Raw errors, passwords, hostnames, and URLs are never logged.

Automatic reconnection is disabled with `socket.reconnectStrategy: false`, and offline command queuing is disabled. A startup or runtime outage leaves Redis unavailable while MongoDB-backed requests remain usable. The ready-client getter returns `null` after a connection loss. There is no background recovery loop: restart the backend or explicitly call `connectRedis()` again after restoring the service. List requests fall back to MongoDB whenever Redis is unavailable.

`disconnectRedis()` shares repeated cleanup calls. It uses `client.close()` to close a ready connection, then `client.destroy()` if graceful close fails or exceeds one second. A connecting client is destroyed and its bounded connection attempt is allowed to settle. Internal timers are cleared. `createRedisConnection()` makes an independent manager for tests, accepting a fake client factory, logger, and shorter test deadlines; production uses the shared `redisConnection`. The [node-redis documentation](https://github.com/redis/node-redis) describes client lifecycle methods; its [configuration reference](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md) describes reconnect and offline-queue options.

Run these commands in `server/`:

```powershell
node --test test/redis.test.js test/startup.test.js test/env.test.js test/integration-script.test.js
npm test
```

The Redis tests use fake clients and do not require a Redis service. They cover absent configuration, client options, success/reuse, safe failures, connection and close deadlines, concurrent/idempotent cleanup, runtime loss, and shutdown during connection. Startup tests verify MongoDB gating, health responses after Redis failure, cancellation, and cleanup of both services. Environment tests use fake fixture files, never the private `server/.env`.

For an optional real connectivity check, configure `FLEETFLOW_TEST_REDIS_URL` privately in the process environment, then run:

```powershell
node scripts/verify-redis.js
```

This separate script never loads `.env` or falls back to `REDIS_URL`. It connects, requires `PING` to return `PONG`, and closes the client. It writes no data and has an eight-second overall deadline. The normal suite checks its missing-configuration guard without connecting. The project owner reported a successful real Redis Cloud connection and PING/PONG using this command after Step 13. This verifies connectivity, not cached reads, writes, expiry, or invalidation. No live caching check was run by the agent during Steps 14-16. Caching now requires GET/SET permission for the `fleetflow:agents:list:v2:`, `fleetflow:agents:detail:v2:`, and `fleetflow:agents:cache:v2:` prefixes, plus DEL permission for affected detail keys. The generation SET also uses NX during initialization. Configure permissions and TLS/credentials privately.

## Backend files and request flow

- `server/package.json` describes the backend, declares its dependencies, and defines the `dev`, `start`, and `test` commands. `private: true` prevents accidental npm publication; `type: module` enables JavaScript `import` and `export`.
- `server/package-lock.json` records exact dependency versions, making future installs reproducible. This file belongs in Git; `node_modules/` does not.
- `server/.env.example` is the shareable backend template; the local `.env` copy is ignored by Git.
- `server/src/config/env.js` loads the file, then uses a Zod schema to describe allowed configuration. `safeParse()` returns validated data or validation issues. The port schema checks decimal text, converts it with `Number`, and enforces the TCP range. MongoDB URI syntax is required and checked by constructing a driver client without opening it. Optional Redis blanks normalize to `undefined`. Invalid configuration throws a readable error before the server can listen. The module exports only the validated `env` object.
- `server/src/config/db.js` exports `connectDatabase(uri)` and `disconnectDatabase()`. The startup code passes the validated URI. Connection failure logs a fixed message and rethrows the error for startup to handle; raw driver errors are never printed. Two module-level listeners report connection errors and closure without adding a listener on every call.
- `server/src/config/redis.js` manages the optional shared Redis client with connection/close deadlines and safe fixed logs. Its factory supports isolated tests without a live service.
- `server/src/services/agentListCache.js` builds deterministic list keys, checks cached JSON against the public response shape, and handles Redis failures with fixed warnings. It reads the existing ready client and writes the full response with an atomic expiry. Its factory accepts a fake client getter/logger for isolated tests.
- `server/src/services/agentCacheState.js` owns the shared Redis generation key and post-mutation invalidation. Its `invalidate(id)` rotates the generation and deletes the affected detail key, with fixed safe logs and a process-local bypass after failure. `cacheCommand()` bounds both queued commands and stalled responses. Both production cache services share this state; tests can create independent managers.
- `server/src/services/agentDetailCache.js` follows the same pattern for individual agents. It uses the ready Redis client, lowercases validated ObjectIds in keys, checks that cached data belongs to the requested ID, and falls back safely when Redis or cached data fails.
- `server/src/validation/cachedAgentSchema.js` holds the unchanged public-agent allowlist previously defined in the list cache. Both services reuse it to reject malformed cached fields or internal metadata such as `__v`.
- `server/src/app.js` creates and exports the Express application without opening a network port. Middleware runs in order: `express.json()`, health, the `/api/agents` router, the unchanged JSON 404 fallback, and the existing `errorHandler` last.
- `server/src/routes/agentRoutes.js` defines `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, and `DELETE /:id`, mounted under `/api/agents`. All use the existing `validateRequest()` before their controller: `body` for create, `query` for list, `params` for detail/delete, and both `params` and `body` for update.
- `server/src/validation/agentSchemas.js` defines create/list validation and `agentParamsSchema`, which requires exactly 24 hexadecimal characters. `updateAgentSchema` picks only editable fields from the create schema, makes them optional, removes undefined values, and requires at least one supplied value. It preserves strict rejection of unknown keys and existing normalization without adding defaults.
- `server/src/controllers/agentController.js` exports `createAgent()`, `listAgents()`, `getAgentById()`, and `updateAgent()`. Detail uses one targeted `Agent.findById()` query. Update uses `findByIdAndUpdate()` with `$set` for supplied fields, `runValidators: true` for model validation, `returnDocument: 'after'` for the updated record, and `upsert: false` to prevent accidental insertion. Mongoose manages timestamps. Both queries select public fields and use `lean()` for plain records. All four endpoints reuse `publicAgent()` and the existing central error handler.
- The same controller also exports `deleteAgent()`. It calls `Agent.findByIdAndDelete()` once with the validated MongoDB ID, selects only `_id`, and uses `lean().exec()` to execute the query. A missing result is passed as `ApiError(404, 'Agent not found')`; unexpected errors are passed unchanged to the central handler. `response.status(204).end()` finishes a successful response without a JSON body.
- `server/src/middleware/validateRequest.js` exports `validateRequest(schema, section)`. It checks a request section against a supplied Zod schema and passes failures to the shared error handler. Parsed data goes into `request.validated[section]` for route handlers to use.
- `server/src/middleware/errorHandler.js` is the sole final API error handler. It formats Zod/request validation errors, parser errors, and expected application errors; hides unexpected internal details; and delegates with `next(error)` if a response has already started.
- `server/src/utils/ApiError.js` defines `ApiError` for developer-controlled public application errors and `RequestValidationError` for internal Zod issues with their request-section label. Neither class writes an HTTP response; the central handler owns that job.
- `server/src/startup.js` exports `startServer()`, which awaits MongoDB, attempts optional Redis, then listens. It returns the HTTP server and a reusable `shutdown()` function. Failure and shutdown clean up both services, with MongoDB cleanup in `finally`. Tests can inject database functions and a Redis manager while using the real Express app.
- `server/src/server.js` loads validated configuration, starts the application, and handles signals. An AbortController marks startup as cancelled during shutdown; it prevents a pending connection from subsequently opening HTTP. Startup failures produce a fixed safe message and non-zero exit. The shutdown deadline prevents hanging cleanup.
- `server/test/env.test.js` uses Node's built-in test runner and separate child processes to check configuration in isolation. `createFixture()` copies the real loader into a disposable folder; `runConfig()` starts it with controlled environment variables. Tests never overwrite the developer's real `.env`, and disposable files are removed after each test.
- `server/test/db.test.js` mocks Mongoose connection methods to verify success, failure propagation, reuse, and safe logs. `server/test/startup.test.js` checks database-before-HTTP ordering, real HTTP responses with mocked database readiness, failure cleanup, cancellation, occupied ports, and repeatable shutdown.
- `server/test/redis.test.js` checks optional Redis lifecycle behavior using injected fake clients. The startup/environment/script tests also cover the new configuration and cleanup paths.
- `server/test/request-errors.test.js` uses isolated Express apps with test-only routes to exercise validation and error responses over HTTP. It also checks the already-sent-response guard directly. No test routes are added to the production app.
- `server/test/create-agent.test.js` exercises the production app over HTTP while mocking `Agent.init()` and `Agent.create()`. The mock creates and validates real in-memory Agent documents, but supplies simulated persistence timestamps; it does not prove storage.
- `server/test/list-agents.test.js` exercises the production GET route with mocked MongoDB queries and optional fake Redis. It checks filters, escaped regexes, projection, sort, skip/limit, metadata, invalid queries, empty pages, safe errors, cache hits/misses, key normalization/separation, malformed cached data, expiry options, and Redis read/write failures. A fake clock checks expiry without a real service or timed sleep; ordinary list tests explicitly use missing Redis.
- `server/test/get-agent.test.js` mocks `Agent.findById()` while exercising the production detail route over HTTP. It verifies the exact targeted ID, projection, public fields, validation/404/500 behavior, and no full-list queries. Its cache checks cover hits/misses, case-normalized keys, expiry, shared TTL, malformed/mismatched payloads, Redis failures, and never caching missing agents or errors. Existing non-cache checks explicitly use unavailable Redis.
- `server/test/update-agent.test.js` exercises PATCH over HTTP with mocked model updates, checks the targeted query and supplied fields, and tests normalization and errors. One additional test executes real Mongoose query middleware with a mocked collection method to verify timestamps and update validation. It never opens a database connection or proves persistence.
- `server/test/delete-agent.test.js` uses real HTTP routing and middleware with a mocked `Agent.findByIdAndDelete()` query. It verifies the targeted ID, projection, empty 204 response, malformed/uppercase IDs, missing records, safe 500 errors, and that neither a full-list query nor bulk deletion is used. No stored records are deleted by these tests.
- `server/test/crud-flow.test.js` runs all five endpoints against one fresh, test-local mocked store with deterministic IDs/timestamps. It checks how changes affect later requests. It does not reimplement MongoDB search/filter behavior; the existing list tests continue checking that query contract separately.
- `server/test-support/crudFlow.js` contains shared HTTP assertions, including readback after updates, no changes after rejected writes, an unrelated record surviving deletion, and missing-record responses after deletion. Both the normal lifecycle test and optional real integration script run these same assertions.
- `server/test-support/fakeRedis.js` contains the existing list-test fake, now reused by list and detail tests. Each call creates its own storage, clock, and mocked GET/SET functions, so tests share no records and expiry needs no real-time sleep.
- `server/test/cache-invalidation.test.js` tests mutation ordering, all list variants, detail deletion, failure/bypass behavior, late fills, generation initialization/eviction, overlapping invalidations, and bounded waits. `crud-flow.test.js` runs the existing HTTP lifecycle twice, with caching unavailable and with fake Redis enabled.
- `server/test/integration-script.test.js` starts the optional CRUD and Redis scripts without their explicit test URLs and verifies that they stop with clear messages. It does not start either service or read private configuration.
- `server/scripts/verify-crud.js` is an optional real MongoDB check using a separate connection and a randomly named disposable collection. It redirects all model calls used by the five endpoints to that isolated model, restores the original methods, and cleans up. It reads only `FLEETFLOW_TEST_MONGODB_URI` from the process environment and never imports the `.env` loader.
- `server/scripts/verify-create-agent.js` is a separate, opt-in Atlas integration check. It redirects model calls to a clone of the same schema in a randomly named disposable collection, performs real writes and direct database reads, checks a duplicate, removes that collection, and closes connections. It does not insert into the normal agents collection and is not run by `npm test`.

The error middleware uses Express's four-parameter convention and runs last, as described in the [official Express error-handling guide](https://expressjs.com/en/guide/error-handling/). Node's [watch-mode documentation](https://nodejs.org/api/cli.html#--watch) explains the development runner.

## Health endpoint and errors

With the server running on the template's port, check it from another PowerShell terminal (replace 5000 if you selected another port):

```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/health
```

`GET /api/health` returns HTTP **200** with:

```json
{
  "success": true,
  "message": "FleetFlow API is running"
}
```

An unknown route, such as `GET /api/unknown`, returns HTTP **404** with:

```json
{
  "success": false,
  "message": "Route not found"
}
```

Other errors use the same `success: false` and `message` fields. Malformed JSON returns `Invalid JSON request body` (400); a body exceeding the JSON parser's default 100 KB limit returns `Request body is too large` (413); unexpected failures return `Internal server error` (500). These existing responses are preserved.

## Create a delivery agent

**`POST /api/agents`**, with `Content-Type: application/json`:

```json
{
  "agentId": "AGENT-001",
  "fullName": "Alex Morgan",
  "phone": "+1 202-555-0142",
  "email": "alex@example.com",
  "serviceArea": "Central"
}
```

All five fields above are required strings. Leading/trailing whitespace is removed and blank strings are rejected. Email must have valid syntax and is saved lowercase. `status` is optional; when absent, the existing Mongoose model supplies `active`. Explicit status accepts only `active` or `inactive` after trimming. Nulls, numbers, objects in string fields, invalid status/email values, and unexpected keys are rejected. In particular, callers cannot set `_id`, `id`, `createdAt`, `updatedAt`, or `__v`. The request must be an object, not an array.

The business `agentId` is required from the caller, as requested for Step 7. The generated database identifier uses Mongoose's built-in ObjectId behavior rather than a counter or custom ID generator.

Successful creation returns **201 Created**, for example (ID and timestamps are illustrative):

```json
{
  "success": true,
  "message": "Agent created successfully",
  "data": {
    "id": "68f2d0000000000000000001",
    "agentId": "AGENT-001",
    "fullName": "Alex Morgan",
    "phone": "+1 202-555-0142",
    "email": "alex@example.com",
    "serviceArea": "Central",
    "status": "active",
    "createdAt": "2026-10-18T00:00:00.000Z",
    "updatedAt": "2026-10-18T00:00:00.000Z"
  }
}
```

Only these public fields are returned; Mongoose internals such as `__v` are omitted. An invalid email, for example, returns **400** using the existing format:

```json
{
  "success": false,
  "message": "Request validation failed",
  "details": [
    { "section": "body", "field": "email", "message": "Invalid format" }
  ]
}
```

An unexpected key is reported at `(root)` with `Unexpected fields`. A duplicate trimmed `agentId` returns **409** without echoing database details:

```json
{
  "success": false,
  "message": "An agent with this agentId already exists"
}
```

Unexpected persistence or index-initialization errors use the existing generic **500** response. Phone/email are not unique. List, single-agent GET, PATCH, and DELETE endpoints are documented below.

Run `node --test test/create-agent.test.js` inside `server/` for the isolated route tests. To separately verify real persistence using private local configuration, run `node scripts/verify-create-agent.js`. It requires Atlas read/write/index/drop permissions for its disposable collection. The script creates one test document, verifies it directly from MongoDB, confirms duplicate rejection, then drops only its owned `fleetflow_step7_check_` collection. A forced timeout or cleanup error is reported; check for a leftover collection with that prefix in that case. The normal model may also initialize its collection/indexes through the usual startup flow, but integration test records go only into the disposable collection.

## List delivery agents

**`GET /api/agents`** returns HTTP **200** with the current page of public agent records and pagination metadata. It does not require a request body.

| Query parameter | Default | Rules and behavior |
| --- | --- | --- |
| `page` | `1` | Positive decimal integer, supplied as one string. Whitespace is trimmed; zero, negative values, fractions, scientific notation, leading zeros, blank values, and unsafe integers/offsets are rejected. Omit the parameter to use its default. |
| `limit` | `10` | Positive decimal integer with a maximum of **100**; follows the same string-format rules as page. Values above 100 are rejected rather than silently reduced. |
| `search` | No search | Trimmed text, maximum **200 characters**. Case-insensitive literal substring matching across `agentId`, `fullName`, `phone`, `email`, and `serviceArea`. Regex special characters are escaped. Blank text is ignored. |
| `status` | No filter | Only `active` or `inactive`, after trimming. Blank or other values are rejected. |
| `serviceArea` | No filter | Exact, case-sensitive match after trimming. Blank text is ignored. Special characters have no regex or query-operator meaning. |

Repeated parameters, bracket/nested input, and unknown parameters return the existing HTTP **400** validation response, with `details[].section` set to `query`. Query values are never passed directly into MongoDB as a user-supplied filter object.

Example requests (URL-encode spaces and special characters in values):

```text
GET /api/agents
GET /api/agents?page=2&limit=25
GET /api/agents?search=alex
GET /api/agents?status=active&serviceArea=Central
GET /api/agents?search=alex&status=active&serviceArea=Central&page=2&limit=5
```

Search matches any of its five fields using OR. Status and service-area filters must both match when supplied, and are combined with search using AND. Results are sorted by `createdAt` descending, then `_id` descending to break timestamp ties deterministically.

Example response with one matching record (ID and dates are illustrative):

```json
{
  "success": true,
  "message": "Agents retrieved successfully",
  "data": [
    {
      "id": "68f2d0000000000000000001",
      "agentId": "AGENT-001",
      "fullName": "Alex Morgan",
      "phone": "+1 202-555-0142",
      "email": "alex@example.com",
      "serviceArea": "Central",
      "status": "active",
      "createdAt": "2026-10-18T00:00:00.000Z",
      "updatedAt": "2026-10-18T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

`data` uses the same public fields as create. `total` counts all matching records before pagination; `totalPages` is `Math.ceil(total / limit)`. No matches produce `data: []`, `total: 0`, and `totalPages: 0`. A page beyond the last page remains 200 with an empty array, the requested page/limit, and the actual matching totals; it is not silently moved to another page.

The database performs sorting and pagination using `skip((page - 1) * limit)` and `limit(limit)`. The controller does not fetch all agents and slice them in JavaScript. The find query selects only public fields and uses `lean()` to return plain records for the bounded current page; the formatter converts each record to the public response shape. A separate `countDocuments()` query uses the same filter. These independent reads are not a transactional snapshot: simultaneous writes may briefly make totals and page contents differ. Unexpected find/count errors go to the unchanged central handler and return a generic 500. See the [Mongoose query documentation](https://mongoosejs.com/docs/api/query.html).

Run `node --test test/list-agents.test.js test/create-agent.test.js` inside `server/` for focused list/create regression tests, or `npm test` for the full suite. Step 8 tests mock database calls and assert query construction and HTTP behavior. No real database check was run for Step 8, and `server/.env` was not read or changed.

## Agent-list caching

The list cache applies only to **`GET /api/agents`** (including its normal trailing-slash form). Input is validated first. A successful Redis hit returns the same JSON success envelope, public agent fields, and pagination metadata as a MongoDB response; neither `Agent.find()` nor `Agent.countDocuments()` runs on a hit. The individual-agent endpoint uses its own separate detail cache, described below.

On a miss, the controller runs the existing MongoDB list/count queries, formats the public response, and stores that whole JSON response in Redis. Valid empty results and pages beyond the last page are cached too. Invalid query requests and database failures are never cached. Missing Redis, command errors/timeouts, malformed JSON, invalid public fields, or mismatched pagination cause a miss. Redis write failures still return the successful MongoDB result. Warnings never include raw errors, cached data, search values, keys, or credentials.

Keys have the form `fleetflow:agents:list:v2:<generation>:<sha256>`. The generation is read from Redis for each request. The hash still uses a fixed-order JSON object containing **`page`, `limit`, `search`, `status`, and `serviceArea`** after the existing query schema has applied defaults and trimming. Empty optional text is equivalent to omission. Query-string ordering does not matter. Different response-affecting values have separate keys; service-area case is preserved because its filter is case-sensitive. Search case is also preserved, so equivalent searches with different letter case can occupy separate entries. Hashing keeps raw contact/search text out of key names; it does not encrypt the response value.

For example, `/api/agents` and `/api/agents?limit=10&page=1` share a cache entry. `/api/agents?page=2` and `/api/agents?status=inactive` use different entries. All filtering and pagination behavior remains the same as documented above.

Each successful cache write uses one Redis SET with an `EX` expiration of `AGENT_LIST_CACHE_TTL_SECONDS`, default **60 seconds**. Redis expires the entry automatically; the next request queries MongoDB and fills it again. Hits do not refresh the TTL. Each Redis operation now has an application deadline of one second in addition to the [node-redis command-queue timeout](https://github.com/redis/node-redis/blob/master/docs/command-options.md#timeout). Normal hits use a generation GET and a payload GET; misses add a payload SET. First-time generation initialization adds a conditional SET and another GET. These sequential operations can add latency during an outage; MongoDB time is additional. A timeout returns control without retrying and does not guarantee that a command already sent to Redis was cancelled.

Successful create, update, and delete operations now rotate the shared generation before returning their existing success responses. Every old list query variant becomes unreachable, including previously cached empty lists and pagination totals. Old entries retain their original TTL and expire naturally. Simultaneous misses may still each query MongoDB; no locking or request coalescing is introduced.

The template now includes safe `AGENT_LIST_CACHE_TTL_SECONDS=60`. Existing `.env` files need no change to use the default. To choose a different lifetime later, configure the variable privately as a whole number from 1 to 86400 and restart the backend; blank or invalid values fail startup validation without echoing the value. Keep the real `.env` untracked. The normal test suite never loads it.

Run in `server/`:

```powershell
node --test test/list-agents.test.js test/env.test.js test/startup.test.js
npm test
```

Caching tests use fake Redis and mocked MongoDB. They verify serialization, key construction, skipped database calls, the exact expiry command option, and fake-clock expiry at 60 seconds. They do not claim live Redis expiry or real MongoDB persistence coverage. The project owner's earlier PING/PONG check establishes real Redis connectivity only.

## Get a single delivery agent

**`GET /api/agents/:id`** retrieves one record. Step 9's roadmap specifies `:id` without explicitly naming the underlying identifier. To follow the existing response convention, this endpoint uses the public `id` from create/list responses: MongoDB's `_id` represented as a 24-character hexadecimal string. It does **not** look up the separate business `agentId` or fall back to that field.

For example, use the returned `id` in:

```text
GET /api/agents/68f2d0000000000000000001
```

The existing Zod middleware validates route `params` before any lookup. Uppercase or lowercase hexadecimal characters are accepted. Business IDs such as `AGENT-001`, wrong-length strings, non-hex characters, and whitespace-padded IDs return 400 without querying MongoDB. An absent `id` fails the parameter schema when it is applied; at the HTTP routing level, `GET /api/agents` and `GET /api/agents/` remain the existing list endpoint rather than a detail request with a missing parameter.

On a cache miss, the controller uses a targeted `findById()` query rather than fetching the list and filtering in JavaScript. A cache hit skips that query. The endpoint keeps the existing public-field formatter and returns **200** with this structure (ID/dates illustrative):

```json
{
  "success": true,
  "message": "Agent retrieved successfully",
  "data": {
    "id": "68f2d0000000000000000001",
    "agentId": "AGENT-001",
    "fullName": "Alex Morgan",
    "phone": "+1 202-555-0142",
    "email": "alex@example.com",
    "serviceArea": "Central",
    "status": "active",
    "createdAt": "2026-10-18T00:00:00.000Z",
    "updatedAt": "2026-10-18T00:00:00.000Z"
  }
}
```

Malformed ID (**400 Bad Request**):

```json
{
  "success": false,
  "message": "Request validation failed",
  "details": [
    { "section": "params", "field": "id", "message": "Invalid format" }
  ]
}
```

A valid ObjectId with no matching record returns **404 Not Found**:

```json
{
  "success": false,
  "message": "Agent not found"
}
```

Unexpected database failures use the unchanged centralized **500** response, `{"success":false,"message":"Internal server error"}`. Database internals, metadata such as `__v`, and stack traces are not included. An unknown route still returns `Route not found` with 404; a malformed ID on this newly implemented route now correctly returns the documented 400. See the [Mongoose findById documentation](https://mongoosejs.com/docs/api/model.html#Model.findById()).

Run `node --test test/get-agent.test.js test/create-agent.test.js test/list-agents.test.js` inside `server/` for focused detail/create/list checks. The database methods are mocked; these checks do not claim live MongoDB integration coverage.

## Individual-agent detail caching

**`GET /api/agents/:id`** checks Redis only after the existing ObjectId validation passes. Its key is `fleetflow:agents:detail:v2:<lowercase MongoDB ObjectId>`. For example, the ID `68f2d0000000000000000001` uses `fleetflow:agents:detail:v2:68f2d0000000000000000001`. Uppercase and lowercase hexadecimal forms share one key. Different agents and list requests have separate keys; business `agentId` values are still not accepted as route IDs. Redis stores an internal `{ generation, response }` wrapper; clients still receive the unchanged public response only.

A valid cache hit returns the complete existing success response (`success`, `message`, and public `data`) without calling MongoDB. On a miss, the existing targeted lookup runs. A found agent is formatted, cached as JSON, and returned with HTTP 200. Missing agents still return the existing JSON 404 and are **never cached**; validation failures and database errors are not cached either.

The service reuses `getRedisClient()` and the existing **`AGENT_LIST_CACHE_TTL_SECONDS`** setting through Express `app.locals.agentListCacheTtlSeconds`. Despite its original list-specific name, the variable now controls both caches. No new variable or private configuration change is required. It defaults to **60 seconds** and retains its existing validation range of 1-86400. Redis SET attaches an `EX` expiry atomically; reads do not extend the TTL. Cached details expire independently from cached list pages.

Missing Redis, read errors/timeouts, malformed JSON, invalid cached fields, or a cached response whose agent ID differs from the requested ID all fall back to MongoDB. Redis write failure still returns the found agent successfully. Like the list cache, GET/SET commands have a one-second timeout and warnings contain fixed text only, without keys, URLs, cached contact data, stack traces, or raw errors.

Successful mutations rotate the shared generation, and each also deletes the affected detail key. A detail entry with an earlier generation is rejected even if an older in-flight lookup writes it back after deletion. Rotating the shared generation conservatively invalidates other agents' details as well; this favors consistency over retaining every unrelated hit. PATCH and DELETE responses themselves remain uncached. Simultaneous misses are not coalesced.

Run inside `server/`:

```powershell
node --test test/get-agent.test.js test/list-agents.test.js
npm test
```

Tests use mocked MongoDB and the shared fake Redis, including its deterministic expiry clock. They verify cache hits bypass lookups, miss serialization, identity checks, 60-second default expiry, configured TTL, safe Redis fallback, and no negative/error caching. These tests do not prove live Redis expiry or database persistence. The earlier real Redis Cloud PING/PONG is connectivity evidence only.

## Invalidation after successful mutations

Once MongoDB reports a successful create, update, or delete, the controller awaits `agentCacheState.invalidate(id)` before returning its existing 201, 200, or empty 204 response. Failed validation, duplicate-key errors, other database errors, and missing update/delete targets do not invalidate anything.

Invalidation performs exactly two Redis operations, attempted together: **SET** a new random generation at `fleetflow:agents:cache:v2:generation`, and **DEL** the affected agent's detail key. It uses no KEYS, SCAN, wildcard deletion, FLUSHDB, or loop over stored pages. Work stays constant regardless of how many page/search/filter combinations are cached. Each operation has a one-second deadline; neither command failure prevents the other from being attempted.

Think of the generation as the current edition of the agent cache. Every list read uses that edition in its key. Detail entries carry it alongside their response. A new edition makes all old editions unusable immediately for subsequent requests when Redis invalidation succeeds. The old list entries are left to expire under the unchanged TTL, so no large deletion job is needed.

Reads capture the generation **before** querying MongoDB and keep that same generation when filling the cache. A read that finishes late therefore cannot populate a usable stale entry in a newer edition. In-flight requests that began before invalidation can still finish with their earlier result; this is not a transaction across MongoDB, Redis, and all active HTTP requests.

The generation key has no TTL and holds only one small token. If it is missing or evicted, bounded GET/SET-NX/GET initialization chooses a fresh UUID instead of reusing a fixed default. Concurrent initializers converge on the Redis value. An unavailable or unreadable generation causes MongoDB fallback. Generations are not memoized in process, so healthy instances observe one another's rotations. The new v2 prefixes also prevent this code from reading legacy v1 entries; those entries expire normally. Retire older application versions that do not implement invalidation when deploying this change.

Redis absence, errors, or timeouts do **not** turn a committed MongoDB mutation into an API failure. On invalidation failure this process bypasses cache reads and writes until a later successful invalidation safely restores caching. A concurrent success that started before a failure cannot accidentally clear that bypass. Fixed warning messages never include keys, URLs, credentials, documents, or raw exceptions.

This remains best-effort invalidation across two services, without distributed transactions or a durable retry queue. Other instances cannot learn about a failed invalidation while Redis is unavailable, and the bypass flag does not survive process restarts. In those cases, remaining TTL bounds stale entries; a successful later rotation restores a shared fresh generation. Changes made directly in MongoDB outside these endpoints are likewise limited by TTL. These limitations do not change normal mutation response contracts.

Run inside `server/`:

```powershell
node --test test/cache-invalidation.test.js test/crud-flow.test.js test/get-agent.test.js test/list-agents.test.js
npm test
```

Tests use fake Redis and mocked MongoDB, including the cache-enabled HTTP CRUD flow. They verify successful and failed mutations, all query variants, detail deletion, unrelated-key preservation, late fills, generation eviction/concurrent initialization, failure recovery, concurrent failure bypass, and stalled-command deadlines. They do not establish live Redis/MongoDB invalidation coverage. The earlier PING/PONG check establishes connectivity only.

## Update a delivery agent

**`PATCH /api/agents/:id`** uses MongoDB's `_id`, exposed as the public `id` in API responses, exactly like the single-agent GET endpoint. It never looks up the business `agentId` instead.

Send `Content-Type: application/json` and at least one editable field: `fullName`, `phone`, `email`, `serviceArea`, or `status`. All are optional individually. Strings are trimmed, email is lowercased and syntax-checked, and status allows only `active` or `inactive`. Blank strings, nulls, incorrect types, arrays, empty objects, and unknown fields are rejected. The business `agentId`, database `_id`/`id`, `createdAt`, `updatedAt`, and `__v` cannot be changed through this endpoint. Caller-supplied MongoDB operators are also rejected.

Example partial update:

```http
PATCH /api/agents/68f2d0000000000000000001
Content-Type: application/json

{"serviceArea":"North","status":"inactive"}
```

Successful response (**200**, illustrative values):

```json
{
  "success": true,
  "message": "Agent updated successfully",
  "data": {
    "id": "68f2d0000000000000000001",
    "agentId": "AGENT-001",
    "fullName": "Alex Morgan",
    "phone": "+1 202-555-0142",
    "email": "alex@example.com",
    "serviceArea": "North",
    "status": "inactive",
    "createdAt": "2026-10-18T00:00:00.000Z",
    "updatedAt": "2026-10-18T01:00:00.000Z"
  }
}
```

Only supplied editable fields are set; omitted fields keep their stored values, including an existing inactive status. No create defaults are inserted. Mongoose preserves `createdAt` and sets `updatedAt` for the update, including a request that supplies the same value already stored. The targeted update never creates a missing record.

| Condition | Response |
| --- | --- |
| Malformed ObjectId | **400** `Request validation failed`, with `details` identifying `params.id` |
| Invalid or missing update data | **400** `Request validation failed`, with safe body field details; empty/unknown-field issues use `(root)` |
| Valid ObjectId without a matching agent | **404** `{"success":false,"message":"Agent not found"}` |
| MongoDB duplicate-key error (11000) | **409** `{"success":false,"message":"Agent update conflicts with an existing record"}` |
| Unexpected database failure | **500** `{"success":false,"message":"Internal server error"}` |

Only `agentId` has a unique schema index, and it is immutable through PATCH. Phone/email remain shareable, so normal edits do not introduce a new uniqueness rule. The defensive 409 mapping handles duplicate-key errors without revealing index names, submitted values, or driver details. Validation uses the existing error format documented below; unexpected failures go to the same centralized handler.

Run `node --test test/update-agent.test.js` inside `server/` for the focused tests, or `npm test` for all regressions. Database calls are mocked. The timestamp test checks actual Mongoose query middleware before a mocked collection call; no real update persistence or database uniqueness enforcement was integration-tested in Step 10. Private environment configuration is not needed or read by these checks.

## Delete a delivery agent

**`DELETE /api/agents/:id`** permanently removes one agent by MongoDB's `_id`, exposed as the public `id` in create/list/detail/update responses. The separate business `agentId` is not accepted as a substitute. No request body is needed.

Example request (use the actual returned database ID):

```http
DELETE /api/agents/68f2d0000000000000000001
```

Success returns **204 No Content** with an empty body, as explicitly required by Step 11. There is no JSON confirmation or deleted identifier in the response; clients should check the status and must not call `response.json()` on a successful deletion.

The existing ObjectId parameter schema accepts exactly 24 hexadecimal characters, including uppercase hex. Malformed IDs, whitespace-padded IDs, and business IDs such as `AGENT-001` are rejected before any deletion. The controller uses one targeted `findByIdAndDelete()` operation. It does not retrieve the list, perform bulk deletion, or keep a soft-deleted record.

| Condition | Response |
| --- | --- |
| Matching agent deleted | **204**, empty body |
| Malformed ObjectId | **400** `Request validation failed`, with the standard `details` entry for `params.id` and `Invalid format` |
| Valid ObjectId without a matching agent | **404** `{"success":false,"message":"Agent not found"}` |
| Unexpected database failure | **500** `{"success":false,"message":"Internal server error"}` |

A later request to delete an already deleted record returns 404 when MongoDB reports no match. An absent ID (`DELETE /api/agents`) or an unknown nested path still returns the existing 404 `Route not found`; neither is a bulk-delete endpoint. Errors use the unchanged central handler and do not expose database details or stack traces.

Run `node --test test/delete-agent.test.js` inside `server/` for focused checks, or `npm test` for all server regressions. Database deletion is mocked: these tests verify HTTP behavior and query construction, not live persistence. No Atlas integration script is run, and private environment configuration is not read or changed.

## Test organization and coverage audit

Run these commands inside `server/`:

```powershell
npm test
# Only the new Step 12 checks:
node --test test/crud-flow.test.js test/integration-script.test.js
# All five endpoint suites plus the connected lifecycle:
node --test test/create-agent.test.js test/list-agents.test.js test/get-agent.test.js test/update-agent.test.js test/delete-agent.test.js test/crud-flow.test.js
```

The suite uses Node's built-in test runner, assertions, test-scoped mocks, and native fetch. HTTP tests listen on an available loopback port and close their servers afterward. Each lifecycle test owns its records and deterministic clock; no test depends on data or execution order from another test. No new test dependency is needed. `npm test` does not require Atlas, Redis, external network access, or private `.env` configuration. Environment-loader tests use disposable fake files, not `server/.env`.

The Step 12 audit preserved existing focused tests and added checks for interactions across requests:

| Coverage | Test files and evidence |
| --- | --- |
| Create success/defaults/normalization, required fields, invalid bodies, duplicate 409, safe 500 | `create-agent.test.js`; schema rules in `agent.test.js` |
| List pagination/defaults/maximum, search escaping, combined filters, empty/out-of-range pages, query errors; cache hits/misses, keys, expiry options, safe Redis fallback | `list-agents.test.js` asserts MongoDB queries and uses fake Redis for caching |
| Single-agent success, malformed/uppercase IDs, valid missing IDs, targeted lookup, safe 500; detail cache hits/misses, keys, TTL, safe fallback, no negative/error caching | `get-agent.test.js`, using shared `test-support/fakeRedis.js` |
| Partial update, normalization, omitted fields, immutable fields, empty/invalid bodies, 404/409/500 | `update-agent.test.js`, including real Mongoose timestamp/validation middleware against a mocked collection |
| Delete 204 with empty body, invalid/missing IDs, targeted operation, safe 500 | `delete-agent.test.js` |
| Health/unknown routes, JSON parser 400/413, central error handling, configuration/startup failures | `create-agent.test.js`, `request-errors.test.js`, `env.test.js`, `db.test.js`, `startup.test.js` |
| Connected create/list/detail/update/delete flow; failed writes leave records unchanged; update readback; surviving unrelated record; GET/PATCH/repeated DELETE return 404 after deletion | New `crud-flow.test.js`, using `test-support/crudFlow.js` |
| Optional integration script refuses missing explicit configuration | New `integration-script.test.js` |

These HTTP tests integrate the actual app, routes, validation, controllers, model formatting, and error middleware with mocked database operations. The lifecycle mock simulates duplicate rejection and storage; it does not establish that a real database enforces unique indexes or persists changes. Search/filter/pagination tests inspect query construction, rather than running MongoDB's query engine. No production API behavior was changed for Step 12.

### Optional real MongoDB CRUD check

Use a MongoDB test database with permission to create/read/write/index/drop a disposable collection. Configure `FLEETFLOW_TEST_MONGODB_URI` privately in the process environment through your local shell or secret manager. The script does not read `server/.env`, does not fall back to `MONGODB_URI`, and stops before connecting when its explicit variable is missing. Do not put credentials in tracked files, command examples, or chat.

```powershell
# Configure FLEETFLOW_TEST_MONGODB_URI privately before running this command.
node scripts/verify-crud.js
```

The script connects before opening its loopback HTTP listener, then runs the shared CRUD flow through the real app and Mongoose against a uniquely named `fleetflow_step12_check_` collection. The separate connection/model prevents initializing or writing the normal agents collection. This checks real create/list/detail/update/delete behavior, normalization, duplicate rejection, invalid-write protection, update readback, empty lists, and missing records after deletion. It does not add live search/filter/pagination coverage or replace the existing startup tests.

The script drops only its own randomly named collection and closes the server and connection in cleanup. A 45-second deadline stops a hung run. Forced termination or failed cleanup may leave that collection behind; the script reports its name for private inspection. Driver errors and raw assertion details are hidden. The script is separate from `npm test` and has **not been run against a live database in Step 12**; only its no-configuration guard and syntax were checked. The older Step 7 create script remains available and loads local configuration when explicitly invoked; it was not run in this step.

## Request validation and centralized errors

`validateRequest(schema, section = 'body')` supports `body`, `params`, and `query`. Add it before a future route handler and read `request.validated.body`, `.params`, or `.query` in that handler. For example, `validateRequest(z.object({ label: z.string().trim().min(1) }), 'body')` validates a body with a nonblank label. This is a usage example, not an implemented endpoint. Chain middleware calls to validate several sections; each keeps the other parsed sections intact. Handlers should use parsed data instead of assuming the original request data was transformed.

The helper uses `safeParseAsync()` so synchronous schemas, asynchronous refinements, defaults, and transforms work. The supplied schema controls coercion and unknown-key behavior. Original request sections are preserved, including Express 5's read-only query getter. Invalid input calls `next(error)` and skips the route; a programming exception in a refinement is forwarded by Express 5 as an unexpected error, rather than silently treated as bad user input. See [Zod's parsing documentation](https://zod.dev/basics).

Zod validation failures return HTTP 400 with this structure:

```json
{
  "success": false,
  "message": "Request validation failed",
  "details": [
    {
      "section": "body",
      "field": "profile.name",
      "message": "Value is too short or below the minimum"
    }
  ]
}
```

`details` identifies the section, a dotted field path, and a safe message. Root-level issues use `(root)`. Errors from direct Zod parsing use section `request` because no middleware section is attached. Messages come from fixed mappings of Zod issue codes: missing/type, size, format, allowed-value, and unknown-field errors get readable descriptions; other issue codes get `Invalid value`. Phone-format errors in the request body use a fixed explanation of the accepted syntax. Raw Zod messages, submitted values, stack traces, and extra issue metadata are never serialized or logged. Other wording remains generic, including for custom refinements.

For an expected application failure, future route code may throw `new ApiError(409, 'Requested operation conflicts with current state')`. Status must be an integer from 400 to 599. Messages for 4xx errors are public text: write a fixed, safe explanation rather than copying request values or driver errors. Expected 5xx application errors retain their status but use the generic `Internal server error` message. Ordinary unexpected errors always become 500, even if they carry `statusCode` or `expose` properties. Server failures log a fixed message without the raw error.

Error responses retain the `success: false` / `message` envelope; only request-validation failures add `details`. After headers have been sent, the handler forwards the original error to Express without attempting another response. Database/startup failures remain in the existing startup code, outside this HTTP handler. The create route now supplies its schema and duplicate-key mapping, while reusing these shared components unchanged.

## Step 2 verification

Actual checks run on October 18, 2026:

| Command or check | Actual result |
| --- | --- |
| `npm install express` in `server/` | Installed successfully; npm audited 66 packages and reported 0 vulnerabilities |
| `npm ls --depth=0` in `server/` | Only `express@5.3.0` is a direct dependency |
| `node --check server/src/app.js` and `node --check server/src/server.js` from the root | Both syntax checks passed |
| `npm run dev` in `server/` | Server started at `http://localhost:5000` |
| PowerShell here-string piped to `node --input-type=module`, using native `fetch` and `node:assert/strict` | Health: 200; unknown route: 404; malformed JSON: 400; oversized JSON: 413. All statuses, JSON content types, and exact response bodies passed assertions |
| `npm start` in `server/`, followed by `node --input-type=module -e` with native fetch/assert | Server started; health returned 200 and the exact expected JSON |

Both Step 2 verification servers were stopped with Ctrl+C afterward. At Step 2 there was no persistent automated test suite; the checks above were live HTTP smoke checks. The unexpected-error 500 branch was inspected but not deliberately triggered. Database, Redis, CRUD, authentication, and frontend tests were outside that step.

## Step 3 verification

Actual checks run on October 18, 2026:

| Command or check | Actual result |
| --- | --- |
| `npm install dotenv zod` in `server/` | Added two packages; npm audited 68 packages and reported 0 vulnerabilities |
| `npm ls --depth=0` in `server/` | Express 5.3.0, dotenv 18.0.8, Zod 4.6.7 |
| `node --check` for `src/config/env.js`, `src/server.js`, `src/app.js`, and `test/env.test.js` in `server/` | All syntax checks passed |
| `npm test` in `server/` | Four tests passed: file loading independent of launch directory; process-variable precedence; missing file with valid process port, including 1 and 65535; rejection of missing and invalid ports without printing submitted values |
| `npm run dev` using a local copy of `server/.env.example` | Server started on port 5000 without MongoDB or Redis credentials |
| PowerShell here-string piped to `node --input-type=module`, using native fetch/assert | Health 200, unknown route 404, malformed JSON 400, oversized JSON 413; exact JSON and content types passed |
| Child-process smoke check piped to `node --input-type=module`, running `src/server.js` with an invalid process PORT | Exited 1 before listening; printed a clear PORT error without echoing the submitted value |
| `git check-ignore -v` for backend environment files and dependencies | `.env`, `.env.local`, and `node_modules/` ignored; `.env.example` allowed |

The development server was stopped afterward. A safe local `server/.env` copy remains ignored by Git. The 500 branch remains untriggered; `app.js` was preserved. No MongoDB or Redis connections were attempted. Step 3 acceptance criteria passed; no known blocker remains.

## Step 4 verification

Actual checks run on October 18, 2026. Default `npm test` uses fake configuration and database mocks; it never reads private credentials or requires a live database. The Atlas checks below were separate integration checks using the existing private `.env` without modifying it.

| Command or check | Actual result |
| --- | --- |
| `npm install mongoose` in `server/` | Added Mongoose 9.11.2 and supporting packages; audited 86 packages, reported 0 vulnerabilities |
| `npm test` in `server/` | 16 tests passed after correcting a test mock that stalled the initial run |
| `node --check` for all changed/new JavaScript files | Passed |
| `git check-ignore -v` for backend environment files and dependencies | Secret environment files and dependencies ignored; backend example file remains eligible for Git |
| PowerShell here-string piped to `node --input-type=module`, importing the real startup function and private local configuration | Real Atlas connection and database ping passed; health returned exact JSON with 200; unknown route returned JSON 404; cleanup completed |
| `npm start`, followed by native fetch/assert HTTP check | Real Atlas startup succeeded and health returned 200; Ctrl+C closed Mongoose |
| Separate controlled child-process check against an unavailable loopback MongoDB endpoint | Exited 1 after connection timeout; HTTP unavailable before and after failure; no URI printed |
| Separate child processes invoking SIGINT and SIGTERM handlers after real Atlas startup | Both closed Mongoose and exited 0. Handlers were invoked with `process.emit` because Windows process termination does not deliver Unix signals in the same way |

The configured Atlas URI and credentials were never printed. All verification servers and clients were closed afterward. Step 4 acceptance criteria passed; no known blocker remains. Existing JSON 400 and 413 responses are also covered by the startup tests; the 500 response branch was not deliberately triggered.

## Step 5 verification

Actual checks run on October 18, 2026, inside `server/`:

| Command | Actual result |
| --- | --- |
| `node --test test/agent.test.js` | All 8 Agent tests passed. The first run warned about deprecated `validateSync()`; tests were changed to async `validate()` and rerun successfully without those warnings. |
| `node --check src/models/Agent.js` | Passed |
| `node --check test/agent.test.js` | Passed |
| `npm test` | All 24 tests passed, including the 8 new model tests and 16 existing configuration, connection, and startup tests |

Agent tests cover valid active/inactive documents, each missing required field, empty/whitespace/null required values, invalid status, default status, trimming, lowercase email, timestamp configuration, and the intended unique index. No dependencies were added. No live database was used, no secrets were read from `server/.env`, and no indexes or records were created. Database duplicate enforcement and timestamp persistence were not integration-tested; the schema definitions are verified. Step 5 acceptance criteria passed; no known blocker remains.

## Step 6 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/request-errors.test.js` | 8 passed after correcting an assertion to inspect logged arguments rather than the test runner's mock metadata |
| `node --check src/app.js` | Passed |
| `node --check src/utils/ApiError.js` | Passed |
| `node --check src/middleware/validateRequest.js` | Passed |
| `node --check src/middleware/errorHandler.js` | Passed |
| `node --check test/request-errors.test.js` | Passed |
| `npm test` | All 32 tests passed, including all 24 existing tests |

New tests cover valid/invalid body data, chained params and query validation, async schemas, raw Zod errors, application error status codes, safe unexpected 500 responses, hidden 5xx details, and already-started-response delegation. Existing startup tests continue verifying health 200, unknown-route 404, malformed JSON 400, oversized JSON 413, and database-startup failures. No live database or Redis was used, no dependencies were added, and `server/.env` was not read or changed. Step 6 acceptance criteria passed; no known blocker remains.

## Step 7 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/create-agent.test.js` | 8 focused tests passed with model initialization/writes mocked |
| `npm test` | All 40 tests passed, including all 32 previous tests; no live database required |
| `node --check src/app.js` | Passed |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check src/routes/agentRoutes.js` | Passed |
| `node --check src/validation/agentSchemas.js` | Passed |
| `node --check test/create-agent.test.js` | Passed |
| `node --check scripts/verify-create-agent.js` | Passed |
| `node scripts/verify-create-agent.js` | Real Atlas gated startup, health 200, create 201, direct stored-document/timestamp checks, and duplicate 409 all passed; disposable collection removed and connections closed |
| `npm start`, then native fetch/assert through `node --input-type=module -e` | Existing MongoDB-gated startup succeeded; health returned exact JSON with 200; Ctrl+C closed Mongoose afterward |

The route tests verify normalization, the model's default status, safe generated database IDs, rejection of missing/invalid/extra data, index readiness, duplicate conflicts, safe unexpected errors, and preserved health/404 behavior. The opt-in check used real Mongoose persistence against an isolated collection by redirecting model methods; it did not test writes into the normal agents collection. Existing regression tests also passed for malformed JSON, oversized bodies, and database startup failures. No dependencies were added, no private configuration was printed or modified, and no commit was created. Step 7 acceptance criteria passed; no known blocker remains.

## Step 8 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/list-agents.test.js test/create-agent.test.js` | 17 tests passed: 9 new list tests and 8 create regression tests |
| `npm test` | All 49 tests passed, including all existing health, 404, parser-error, validation, and startup regressions |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check src/routes/agentRoutes.js` | Passed |
| `node --check src/validation/agentSchemas.js` | Passed |
| `node --check test/create-agent.test.js` | Passed |
| `node --check test/list-agents.test.js` | Passed |

The old create regression test's expectation that list GET was unimplemented was updated; single-agent read, update, and delete still return 404. No dependencies were added. Model calls were mocked, so this step does not claim real MongoDB filtering or pagination integration coverage. No private environment file was read or modified, and no Atlas verification script was run. Step 8 acceptance criteria passed; no known blocker remains.

## Step 9 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/get-agent.test.js test/create-agent.test.js test/list-agents.test.js` | 22 tests passed: 5 new detail tests plus all create/list regression tests |
| `npm test` | All 54 tests passed, including existing health, 404, parser-error, validation, and startup checks |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check src/routes/agentRoutes.js` | Passed |
| `node --check src/validation/agentSchemas.js` | Passed |
| `node --check test/create-agent.test.js` | Passed |
| `node --check test/get-agent.test.js` | Passed |

The earlier test that treated a single-agent GET as unimplemented was updated to use an actually unknown nested route. Update and delete still return 404. No dependencies were added; create/list implementations, the Agent model, app startup, and shared middleware were preserved. All database lookups were mocked: no real database check was run, no Atlas script was executed, and `server/.env` was not read or changed. Step 9 acceptance criteria passed; no known blocker remains.

## Step 10 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/update-agent.test.js` | All 10 focused tests passed |
| `npm test` | All 64 tests passed, including create/list/detail, health/404, malformed JSON/oversized body, configuration, and startup regressions |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check src/routes/agentRoutes.js` | Passed |
| `node --check src/validation/agentSchemas.js` | Passed |
| `node --check test/create-agent.test.js` | Passed |
| `node --check test/update-agent.test.js` | Passed |

`git diff --check` from the root also passed. HTTP tests mock model updates and assert the targeted update options and supplied fields. A separate test runs real Mongoose timestamp and validation middleware against a mocked collection operation: `updatedAt` is added, omitted editable fields stay out of `$set`, `createdAt` remains unchanged, and invalid status fails before the collection call. These are isolated tests, not live MongoDB persistence checks. No dependencies were added, `server/.env` was not read or changed, and no Git staging or commit command was run. Step 10 acceptance criteria passed; no known blocker remains. DELETE is still unimplemented.

## Step 11 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/delete-agent.test.js` | All 5 focused tests passed; the initial run took longer to report output and also finished successfully. A repeat passed. |
| `node test/delete-agent.test.js` | All 5 tests passed directly while checking delayed runner output |
| `npm test` | All 69 tests passed, including existing create/list/detail/update, health/404, parser-error, configuration, and startup checks |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check src/routes/agentRoutes.js` | Passed |
| `node --check test/create-agent.test.js` | Passed |
| `node --check test/delete-agent.test.js` | Passed |

`git diff --check` from the root also passed. The previous test that expected DELETE to be unimplemented now checks unknown nested DELETE paths and the absent-ID path. All deletion database calls were mocked; no live MongoDB persistence check was performed. No dependencies were added, `server/.env` was not read or changed, and nothing was staged or committed. Step 11 acceptance criteria passed; no known blocker remains. Step 12 and later steps remain pending.

## Step 12 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/crud-flow.test.js test/integration-script.test.js` | First run: 1 passed, 1 failed because the new mock cloned an ObjectId without its prototype. The mock now stores plain string IDs; rerun: both tests passed. No production code change was needed. |
| `npm test` | All 71 tests passed, including all 69 existing tests |
| `node --check test-support/crudFlow.js` | Passed |
| `node --check test/crud-flow.test.js` | Passed |
| `node --check test/integration-script.test.js` | Passed |
| `node --check scripts/verify-crud.js` | Passed |

`git diff --check` from the repository root also passed. The existing coverage audit and the new shared lifecycle verify successful requests, validation failures, duplicates, and missing records across all five endpoints. Database operations in the normal suite are mocked; the optional script's configuration guard was tested without connecting, but its live MongoDB execution/cleanup remains unverified. No private `.env` was read or changed. No dependencies or API behavior changed, and nothing was staged or committed. Step 12 acceptance criteria passed using automated HTTP integration with mocked database operations. Steps 13-30 remain pending.

## Step 13 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `npm install redis` | Added redis 6.3.0 and supporting packages (6 packages total); npm audited 92 packages and reported 0 vulnerabilities |
| `npm ls --depth=0` | Express 5.3.0, dotenv 18.0.8, Zod 4.6.7, Mongoose 9.11.2, redis 6.3.0 |
| `node --test test/redis.test.js test/startup.test.js test/env.test.js` | Initial 24 focused tests passed |
| `node --test test/redis.test.js test/startup.test.js test/env.test.js test/integration-script.test.js` | Final 27 focused tests passed, including the additional cleanup-failure and optional-script checks |
| `node --test test/redis.test.js` | All 9 passed after final review added explicit-reconnect cleanup of a previously lost client; affected syntax checks were also rerun |
| `npm test` | All 87 tests passed, including all existing CRUD and HTTP regressions |
| `node --check src/config/redis.js` | Passed |
| `node --check src/config/env.js` | Passed |
| `node --check src/startup.js` | Passed |
| `node --check test/redis.test.js` | Passed |
| `node --check test/startup.test.js` | Passed |
| `node --check test/env.test.js` | Passed |
| `node --check test/integration-script.test.js` | Passed |
| `node --check scripts/verify-redis.js` | Passed |

`git diff --check` from the repository root also passed. Tests used fake Redis clients; malformed-URL handling used the installed real client without connecting. The optional PING script's missing-configuration guard passed; the agent did not perform live Redis integration during Step 13. MongoDB gating, health responses after Redis failure, startup cancellation, and repeatable cleanup were verified with injected services. `server/.env` was not read or changed. No caching, endpoint changes, staging, or commits were added in Step 13. After that step was committed, the project owner reported a successful Redis Cloud connection and PING/PONG using `node scripts/verify-redis.js`.

## Step 14 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/list-agents.test.js test/env.test.js test/startup.test.js` | All 35 focused tests passed |
| `npm test` | Initial run: 96 passed, 1 failed because the existing optional CRUD-script guard exceeded its 5-second child-process timeout. That test-only timeout was raised to 15 seconds without changing its assertions or any application timeout. Final rerun: all 97 tests passed. |
| `node --test test/list-agents.test.js test/env.test.js test/startup.test.js test/integration-script.test.js` | All 37 focused tests passed after the guard-timeout correction |
| `node --check src/services/agentListCache.js` | Passed |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check src/config/env.js` | Passed |
| `node --check src/startup.js` | Passed |
| `node --check test/list-agents.test.js` | Passed |
| `node --check test/env.test.js` | Passed |
| `node --check test/startup.test.js` | Passed |
| `node --check test/integration-script.test.js` | Passed |

`git diff --check` from the root also passed. The 9 new list-cache tests exercise the production route with fake Redis and mocked MongoDB; the new TTL configuration test and existing startup test verify validation/defaults/overrides and propagation to Express. Default expiry is verified by fake-clock behavior and the Redis SET expiration argument, not by waiting on a live Redis server. No live cache integration was performed. The project owner's reported Redis Cloud PING/PONG remains connectivity evidence only. No dependencies, invalidation, single-agent caching, secrets access, staging, or commits were added. Step 14 acceptance criteria passed; Steps 15-30 remain pending.

## Step 15 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/get-agent.test.js test/list-agents.test.js` | All 31 focused tests passed: 13 detail tests (8 new) and all 18 existing list tests |
| `npm test` | All 105 server tests passed, including existing CRUD, validation, startup, Redis lifecycle, and script-guard checks |
| `node --check src/services/agentDetailCache.js` | Passed |
| `node --check src/services/agentListCache.js` | Passed |
| `node --check src/validation/cachedAgentSchema.js` | Passed |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check test-support/fakeRedis.js` | Passed |
| `node --check test/get-agent.test.js` | Passed |
| `node --check test/list-agents.test.js` | Passed |

`git diff --check` from the root also passed. Detail tests use mocked MongoDB and fake Redis. They verify full-response serialization, hits skipping MongoDB, agent-specific/case-normalized keys, expiry at 60 seconds using a fake clock, reuse of the existing configured TTL, malformed/mismatched payloads, safe read/write failures, validation before Redis access, and no caching of missing agents or database errors. The public cached-agent schema and the previous list-test fake were extracted unchanged for reuse; list regressions passed. No live caching/persistence check was performed. No dependencies, invalidation, real `.env` access/changes, staging, or commits were added. Step 15 acceptance criteria passed; Steps 16-30 remain pending.

## Step 16 verification

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/cache-invalidation.test.js test/crud-flow.test.js test/get-agent.test.js test/list-agents.test.js` | All 44 focused tests passed |
| `npm test` | All 117 server tests passed; 0 failed and 0 skipped |
| `node --check src/services/agentCacheState.js` | Passed |
| `node --check src/services/agentListCache.js` | Passed |
| `node --check src/services/agentDetailCache.js` | Passed |
| `node --check src/controllers/agentController.js` | Passed |
| `node --check test-support/fakeRedis.js` | Passed |
| `node --check test/cache-invalidation.test.js` | Passed |
| `node --check test/crud-flow.test.js` | Passed |
| `node --check test/get-agent.test.js` | Passed |
| `node --check test/list-agents.test.js` | Passed |

`git diff --check` from the repository root also passed. Tests use mocked MongoDB and fake Redis; no live persistence or cache-invalidation integration test was performed. Coverage includes successful mutation invalidation across list variants, detail-key deletion, failed mutations leaving caches untouched, unavailable/erroring/stalled Redis, late cache fills, concurrent initialization and invalidation, and complete HTTP CRUD flows with caching enabled and disabled. No dependencies were added. The real `server/.env` was not accessed or modified, and nothing was staged or committed. Steps 17-30 remain pending.

## Step 17 cache consistency and recovery

`test/cache-consistency.test.js` exercises the real Express app and cache services together with fake Redis and an isolated mocked Agent store. `test-support/mockAgentStore.js` was extracted from the existing CRUD lifecycle test so both suites share the same storage simulation. It is not a MongoDB query-engine simulation: search/filter/sort behavior remains covered by the existing dedicated query-contract tests.

| Behavior | Verification |
| --- | --- |
| Successful mutations | Existing invalidation tests cover every list variant and affected detail deletion; the HTTP CRUD lifecycle covers creation after a cached empty list. New HTTP checks warm list/detail caches before update and delete and assert fresh values or 404 afterward. |
| Failed MongoDB writes | Warm payloads and generation stay unchanged after duplicate creation and unexpected create/update/delete failures; subsequent hits still skip MongoDB. Existing tests cover validation and missing-target failures. |
| Hit/miss and expiry | HTTP spies confirm hits skip list/count/detail queries. Fake time advances exactly 60 seconds, then both caches fall back to MongoDB. Existing tests cover configured TTL, empty results, and malformed payloads. |
| Redis reads/writes | Payload GET, payload SET, and generation GET failures preserve correct MongoDB-backed list/detail responses and safe logs; restoring these operations permits hits again. |
| Invalidation outages | Missing Redis, generation SET failure, and detail DEL failure preserve successful PATCH/POST/DELETE responses. Follow-up reads show updated MongoDB results, and deleted records return 404. |
| Recovery | Availability alone, repeated failed invalidations, and another process rotating the generation do not clear local bypass. A later successful local mutation plus generation rotation and detail deletion restores usable caching. |
| Overlap | New checks hold detail deletion pending and verify both cache reads and fills are blocked until completion. Existing tests cover old fills, generation initialization/eviction, shared state across managers, stalled commands, and an earlier success completing after another invalidation fails. |

There was no concrete production-code bug uncovered by these checks, so the cache algorithm, endpoint contracts, dependencies, and TTL configuration remain unchanged.

The bypass flag is a safety latch, not an indication that Redis is reachable. After an invalidation fails, this process cannot assume its previously cached data is correct. It keeps using MongoDB until its own later successful invalidation establishes a fresh shared generation. Simple read/write errors do not set that latch because no database mutation requiring invalidation occurred. The existing Redis lifecycle intentionally disables automatic reconnect: runtime connection loss needs an explicit reconnect or restart. Fake availability recovery in the tests verifies cache policy, not a live network reconnect.

The existing limits still apply: MongoDB and Redis are not one transaction; other instances may serve stale data after a failed invalidation until TTL expiry; local bypass does not survive restart. In-flight reads can finish with older results, and direct database writes are not invalidated. This step does not introduce a background recovery loop or durable retry queue.

Run the focused checks inside `server/`:

```powershell
node --test test/cache-consistency.test.js test/cache-invalidation.test.js test/crud-flow.test.js test/get-agent.test.js test/list-agents.test.js test/redis.test.js test/integration-script.test.js
npm test
```

### Optional real Redis cache verification

Use a disposable/test Redis database with GET, SET (including NX and expiry), and DEL permissions on `fleetflow:verification:*`. Privately supply `FLEETFLOW_TEST_REDIS_URL` through your process environment or secret manager. The script never loads `.env` and does not fall back to the application's `REDIS_URL`. With that variable already set, run inside `server/`:

```powershell
node scripts/verify-cache.js
```

`verify-cache.js` connects through the existing Redis lifecycle and uses the production cache services. A random UUID prefix isolates every key from production API caches. It checks list/detail hits and misses, JSON round trips, real expiry with a short one-second TTL, a new generation after invalidation, physical detail deletion, and rejection of late old-generation fills. It deletes only the exact keys tracked by that run and closes the client. A 15-second overall deadline bounds execution. A forced timeout or cleanup failure can leave a small verification metadata key; payloads expire within 60 seconds. No wildcard deletion or database flush is used. A PASS line followed by a nonzero exit code means cleanup failed; require exit code zero.

This script does not connect MongoDB, make API mutations, or prove cross-service persistence consistency. Redis outages and concurrency use deterministic fakes in the normal tests. The script's missing-configuration guard is tested without network access. **The live Redis cache check has not been run by the agent.** The earlier PING/PONG remains connectivity evidence only.

### Step 17 verification results

Actual commands run inside `server/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/cache-consistency.test.js test/cache-invalidation.test.js test/crud-flow.test.js test/get-agent.test.js test/list-agents.test.js test/redis.test.js test/integration-script.test.js` | Final run: all 66 focused tests passed; an earlier run of 65 tests also passed before the final cross-process bypass check was added |
| `npm test` | All 128 tests passed; 0 failed, 0 skipped |
| `node --check test-support/mockAgentStore.js` | Passed |
| `node --check test/crud-flow.test.js` | Passed |
| `node --check test/cache-consistency.test.js` | Passed |
| `node --check test/integration-script.test.js` | Passed |
| `node --check scripts/verify-cache.js` | Passed |

`git diff --check` from the repository root passed. All automated cache/CRUD checks used fake Redis and mocked MongoDB. Only the optional script's missing-configuration guard was executed; no live cache integration was performed. Production code and dependencies are unchanged. No private `.env` was read or modified, and no files were staged or committed. Step 17 acceptance criteria passed; Steps 18-30 remain pending.

## Step 18 verification

Verification used Node.js v24.19.0 and npm 11.7.0 on October 18, 2026. Commands below ran inside `client/`:

| Command | Actual result |
| --- | --- |
| `npm install react@19.3.1 react-dom@19.3.1 react-router@8.4.0 axios@1.20.0 lucide-react@1.59.0` | Added 34 packages; audit reported 0 vulnerabilities |
| `npm install -D vite@8.3.4 @vitejs/plugin-react@6.1.2 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3` | Added 33 packages; final audit covered 68 packages with 0 vulnerabilities |
| `npm run build` | Passed with Vite 8.3.4; generated HTML, CSS, and JavaScript in ignored `dist/` |
| `npm ls --depth=0` | All nine direct dependencies resolved with no dependency conflicts |
| `node --check vite.config.js` | Passed |
| `node --check src/lib/api.js` | Passed; JSX compilation was checked by the production build |
| `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` | Started successfully on port 5173 |
| PowerShell here-string piped to `node --input-type=module` | Native fetch checks returned HTTP 200 for `/`, `/src/main.jsx`, `/src/index.css`, and `/src/lib/api.js`; Vite SSR module loading plus React server rendering verified home text, Lucide SVG, and the fallback route's home link. Axios defaults, blank configuration fallback, custom API URL, and 10-second timeout passed. Built CSS contained the expected Tailwind utility rules. |
| `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` | Started successfully on port 4173 |
| Second PowerShell here-string piped to `node --input-type=module` | Preview HTML and its compiled JavaScript/CSS assets all returned HTTP 200 |

Installed versions are React/React DOM 19.3.1, React Router 8.4.0, Axios 1.20.0, Lucide React 1.59.0, Vite 8.3.4, React Vite plugin 6.1.2, and Tailwind CSS/Vite plugin 4.3.3. Registry engine and peer-dependency requirements were checked against the installed Node and package versions before installation. The temporary SSR verification used Vite's still-supported `envFile: false` option, which emitted a deprecation warning recommending `envDir: false`; application configuration does not use that option.

From the root, `git check-ignore -v` confirmed that client dependencies, `dist/`, local `.env` files, tool caches, logs, and editor files are ignored. `git ls-files --others --exclude-standard client` showed only the ten intended source/configuration/lock/example files. `git diff --check` passed, and the Git index is empty. Both verification servers were stopped afterward.

No browser was connected to this session, so interactive browser behavior and visual appearance were not inspected. React rendering was checked directly without a DOM. No API requests or live service checks were made, and the backend test suite was not rerun because backend files are unchanged. No frontend test runner or linter was added for this minimal setup; build, configuration, render, HTTP, and ignore checks are the verification performed. The private backend environment file was not accessed or modified. No files were staged or committed. Step 18 acceptance criteria passed; Steps 19-30 remain pending.

## Step 19 verification results

Actual commands run inside `client/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `npm test` | All 5 render tests passed; 0 failed, 0 skipped. Repeated successfully after the final mobile-title and breakpoint adjustments. |
| `npm run build` | Passed with Vite 8.3.4; final build produced ignored HTML, CSS, and JavaScript assets without errors |
| `node --check test/layout.test.js` | Passed; the production build compiled all changed JSX |
| `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` | Started successfully |
| PowerShell here-string piped to `node --input-type=module` | Generated CSS contained the 40rem/64rem responsive rules, flexible grid columns, long-text wrapping, hidden-content rule, and focus styles. Native fetch returned HTTP 200 for preview HTML, both compiled JS/CSS assets, and the SPA document fallback at `/missing`. |

From the root, `git diff --check` passed. No dependencies were installed, lockfiles and backend files are unchanged, and no private environment files were accessed. The frontend tests load JSX through Vite with environment-file loading disabled and render React to strings; they verify semantic structure, active routing, unavailable Agents navigation, mobile open/closed attributes, and the unknown-page shell. They do not execute DOM click/keyboard/resize events or measure layout. The preview server was stopped after verification. Backend tests were not rerun because no backend code changed. Nothing was staged or committed.

The project owner's subsequent manual browser confirmation completes the viewport and keyboard verification recorded above. Step 19 is COMPLETE. Steps 20-30 remain pending.

## Step 20 overview data and counting

The overview uses only the existing `GET /api/agents` endpoint. Every load or retry makes three concurrent Axios requests:

| Query | Overview use |
| --- | --- |
| `?page=1&limit=5` | `pagination.total` is the total agent count; `data` provides up to five recent registrations |
| `?page=1&limit=1&status=active` | `pagination.total` is the count of all matching active agents |
| `?page=1&limit=1&status=inactive` | `pagination.total` is the count of all matching inactive agents |

The model and request schema support exactly `active` and `inactive`. Counts are never calculated from the current page's array length or from fabricated sample records. Request volume stays at three GETs and at most seven returned records per load; it does not grow with the number of agents. The backend already sorts by `createdAt` descending with `_id` descending as a deterministic tie-breaker. The recent-registration list is not the future All Agents table: it has no search, filters, links, CRUD actions, or forms. Dates display in UTC for consistent rendering, and contact email/phone values are not shown.

Loading shows dashes and a progress message rather than fake zero counts. A successful empty response displays genuine zero totals and No agents yet feedback. Any failed request, invalid response, or detectable count mismatch hides the entire metrics result and offers Try again. Raw errors, server messages, credentials, and connection details are never rendered. Retry re-enters loading and replaces the previous request. Cancellation on unmount or a newer load prevents stale completion from replacing newer data, including React StrictMode's development cleanup/reload cycle. Axios receives the same AbortController signal for all three requests; see its [cancellation documentation](https://axios-http.com/docs/cancellation).

These three requests are not a transactional snapshot. The service rejects results when active plus inactive differs from total, or when the first page's length does not match its total, but those checks cannot detect every concurrent-change race. Existing Redis caching can also return results up to the configured TTL old (default 60 seconds) when invalidation is unavailable or writes bypass the API. Successful API mutations retain the existing generation invalidation behavior. Reloading/retrying does not bypass Redis's TTL, and no automatic polling is added. The overview describes a snapshot, not real-time delivery activity.

If the overview cannot load, verify the backend's printed startup port, check its `/api/health` endpoint, and align `API_PROXY_TARGET` with that origin. Keep `VITE_API_BASE_URL=/api` for the local proxy; old absolute base URLs bypass it. Restart Vite after changing client configuration. If records changed while the requests ran, retry after the data/cache settles. Do not put backend secrets into client configuration to diagnose failures.

## Step 20 verification results

Commands run inside `client/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `npm test` | Initial run: 16 passed, 1 failed because a test assumed JavaScript sorts null before strings. The assertion now compares a Set of query statuses. After adding two proxy checks, final run: all 19 passed, 0 failed, 0 skipped. |
| `npm run build` | Passed with Vite 8.3.4; final build generated ignored HTML/CSS/JS assets without errors |
| `node --check src/services/overviewService.js` | Passed |
| `node --check src/state/overviewResource.js` | Passed |
| `node --check src/lib/api.js` | Passed |
| `node --check vite.config.js` | Passed |
| `node --check test/overview.test.js` | Passed |
| `node --check test/proxy.test.js` | Passed |
| `node --check test/layout.test.js` | Passed |

The 19 tests include five shell regressions, twelve overview tests, and two proxy tests. They cover full filtered totals larger than a returned page, safe field mapping, malformed/inconsistent responses, genuine empty data, loading, failed requests, error/retry recovery, safe error output, subscription cleanup, cancellation and late completions, StrictMode-style restart, recent-agent rendering, and the existing Axios instance reading a controlled local HTTP fixture. Proxy tests verify the 5000 default and actual request forwarding to an isolated local HTTP server through an API_PROXY_TARGET override. These tests need neither Atlas nor Redis. Parallel test Vite instances now explicitly disable `server.ws` as well as HMR, resolving a test-only websocket port warning without changing development behavior.

Separate **live read-only verification** was performed. From `server/`, initial `npm start` connected MongoDB/Redis and printed port 5000; it was stopped. `$env:PORT = '7777'; npm start` then connected both services and listened on 7777. A PowerShell here-string piped to `node --input-type=module` inside `client/` checked health HTTP 200, ran the actual overview service's three Axios queries through an ephemeral Vite proxy to the real backend, validated totals/recent responses, and rendered the successful overview result. It passed. No agent records or private configuration were printed, and no database mutations were made. The backend loaded its private configuration through normal startup; its environment file was not inspected, copied, or modified. All verification servers were stopped afterward.

`git diff --check` from the repository root passed. No dependencies, lockfiles, backend code, CRUD UI, or authentication changed, and nothing was staged or committed. Backend tests were not rerun because backend source is unchanged. Browser-mounted effects, real clicks, and the new page's visual appearance were not inspected in a connected browser; request/retry logic and rendered states were tested directly using the existing Node/Vite/React setup. Step 20 acceptance criteria passed using automated coverage and the live API read-through check; Steps 21-30 remain pending.

Port-alignment follow-up: the development/preview proxy default and client example now use port 5000, matching normal backend startup. API_PROXY_TARGET remains configurable, and its override is exercised by the isolated HTTP forwarding test. After this correction, `npm test` passed all 19 tests, `npm run build` passed, and root `git diff --check` passed. No backend startup or live-service check was repeated for this follow-up, so `server/.env` was not read, printed, or modified. Step 20 remains COMPLETE; Steps 21-30 remain PENDING.

## Step 21 Agents page

Open `/agents` through the shared desktop sidebar or mobile menu. The page makes read-only requests to the existing `GET /api/agents` endpoint using the shared Axios client and unchanged port-5000 Vite proxy defaults. No backend changes or new dependencies were needed.

| Control | Actual API behavior |
| --- | --- |
| Search agents | Sends `search`, trimmed and limited to the API's 200 characters; the backend matches a literal, case-insensitive substring across agentId, fullName, phone, email, and serviceArea |
| Status | Sends only `active` or `inactive`; All statuses omits the parameter |
| Service area | Sends `serviceArea`; this is an exact, case-sensitive filter. Free text avoids inventing an area-options endpoint or treating areas on one page as the complete set. |
| Per page | Sends `limit`; default 10, with choices 10/25/50/100 matching the backend's maximum of 100 |
| Previous / Next | Sends `page`, starting at 1; uses the API's `page`, `limit`, `total`, and `totalPages` metadata |

Typing changes draft form values only. Select Apply filters or press Enter to submit the complete search/filter/page-size combination. Applying changes resets to page 1. Paging preserves the applied filters; Clear filters resets search/status/area and page while retaining the applied page size. Query state is local to the mounted page, not stored in URL parameters. The UI does not fetch all agents, filter locally, or infer the total from the returned array length.

The table displays name/business agent ID, phone/email, service area, active/inactive status, and registration date in UTC. MongoDB's public `id` is used for row identity, not shown as the business ID. Unexpected internal response properties are discarded. Semantic row/column headings, a caption, and a labelled focusable horizontal-scroll region make the table usable without expanding the entire narrow page. Filter controls and pagination wrap on small screens. The existing 320px minimum viewport applies. View/Edit/Delete row controls are visibly disabled and labelled coming soon, matching the roadmap's planned actions without adding unfinished detail routes or mutation flows. Those behaviors remain for Steps 22-24.

Loading and errors hide stale rows and old pagination. Failed requests or malformed responses show a generic message and Try again, keeping the applied query. Errors never render raw server details. New loads abort the old request, and late completions cannot overwrite newer search results. The shared request lifecycle is the previous overview implementation extracted into `requestResource.js`; the overview's existing export remains available and all its regressions pass.

Empty results distinguish No agents yet from No matching agents. If records disappear while paging, a valid but now-empty later page offers Back to first page and preserves filters. Zero-result pagination says No pages rather than Page 1 of 0. Page navigation is bounded by server metadata. Backend list/count calls and Redis responses are still snapshots rather than a transactional/live view; visible inconsistencies produce safe error feedback, and retries do not bypass the existing cache TTL.

### Step 21 checks and limitations

Commands run inside `client/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/agents.test.js test/layout.test.js` | Final focused run: 22 passed, 0 failed. The initial run had 20 pass/2 fail because React's SSR hydration comments separated visible text; the test helper now removes those comments before text assertions. |
| `npm test` | All 36 frontend tests passed, 0 failed, 0 skipped; repeated successfully after the final table styling adjustment |
| `npm run build` | Final production build passed with Vite 8.3.4. The initial build caught a missing table-header closing tag, which was fixed before rerunning. |
| `node --check src/state/requestResource.js` | Passed |
| `node --check src/state/overviewResource.js` | Passed |
| `node --check src/state/agentsResource.js` | Passed |
| `node --check src/services/agentsService.js` | Passed |
| `node --check test/agents.test.js` | Passed |
| `node --check test/layout.test.js` | Passed; the build compiled all changed JSX |

The 17 new tests cover query defaults/normalization, combined search/status/area/pagination, maximum size and invalid input, public field mapping, response metadata validation, table/form rendering, boundary navigation, loading/error/retry, empty/no-match/out-of-range pages, page resets and filter retention, clear behavior, cancellation, late responses, and actual Axios HTTP serialization to an isolated local fixture server. Updated shell tests verify the active Agents route. The existing 19-test suite continues passing, including overview lifecycle and proxy checks. HTTP fixtures and controlled request fakes do not establish live MongoDB filtering or Redis integration coverage.

A read-only health probe found no running FleetFlow API on port 5000, so the optional live list check was skipped. The backend was not started and `server/.env` was never read, printed, staged, or modified. No browser was connected, so browser DOM events, visual layout, and scrolling were not tested in this step. Tests directly exercise the query/request state logic and server-rendered states. To review manually, start your existing configured backend separately, run `npm run dev` in `client/`, and open `/agents`. Check Apply/Clear, combined filters, page resets, Previous/Next, retry after an unavailable API, and the table's local scrolling at the viewport sizes listed above.

Root `git diff --check` passed. Backend code, API contracts, package dependencies, and lockfiles are unchanged; backend tests were not rerun. Step 21 acceptance criteria passed using the focused and full frontend tests plus production build. Steps 22-30 remain PENDING. No add/edit/delete forms, detail pages, or mutation requests were implemented. Nothing was staged or committed.

Suggested Step 21 commit message after review:

```text
feat: build searchable agent management table
```

## Step 22 Add new agent

Open `/agents` and select **Add new agent**. The inline panel uses the existing dashboard styling, one column on mobile and two from the existing small-screen breakpoint. It has labelled inputs, visible required indicators, native keyboard controls, and the shared focus outline. Opening focuses Agent ID; invalid submissions focus the alert summary, with each field error linked using `aria-describedby` and `aria-invalid`. Cancel and successful creation close the panel and return focus to the Add button. Cancel deliberately discards the draft; request failures keep every entered value while the panel remains open.

| Field | Form and existing backend rules |
| --- | --- |
| Agent ID (`agentId`) | Required nonblank string, trimmed; a user-supplied unique business identifier, separate from MongoDB's generated public `id` |
| Full name (`fullName`) | Required nonblank string, trimmed |
| Phone (`phone`) | Required trimmed numeric phone syntax, allowing an optional leading `+`, spaces, hyphens, dots, and parenthesized digit groups; see the phone-validation correction below |
| Email (`email`) | Required, trimmed and lowercased before submission; client email pattern matches the installed backend Zod rule |
| Service area (`serviceArea`) | Required nonblank string, trimmed; free text, with no invented area-options API |
| Status (`status`) | Active selected initially; Active/Inactive send only `active`/`inactive`. The API permits omission and its model defaults to active; the form sends its explicit selection. |

Only these six fields are submitted. Database IDs and timestamps come from the backend. Phone and email are not unique in the current model; the unique constraint is on `agentId`. Client validation gives immediate feedback, while the server remains the authority and still validates every request. If the backend's rules change later, keep the small client rule module in sync.

`agentsService.createAgent()` posts through the existing Axios instance to `/agents` (local `/api/agents`, proxied to port 5000 by default). It requires the existing HTTP 201 success response and reuses the list service's public-field response checker. `validation/createAgent.js` holds labels, empty defaults, normalization, validation, and safe error mapping. `state/createAgentResource.js` keeps draft values and submission status independently of rendering, making the behavior directly testable. `AddAgentForm.jsx` subscribes to that resource and renders the accessible form. `AgentsPage.jsx` opens/closes the panel, announces success, and refreshes the list.

While saving, fields, Create, and Cancel are disabled. A synchronous submission guard also prevents overlapping POSTs even if submit is invoked again. HTTP 400 body details are mapped to known fields without rendering raw server text; duplicate-ID HTTP 409 errors appear at Agent ID. HTTP 413 gets a useful form-size message. Network errors, timeouts, unexpected server errors, and malformed success responses retain entries and show safe feedback. There is no automatic POST retry: a lost response can mean the database saved the agent, so the message asks you to check the list before trying again.

After confirmed success, a status message identifies the created business ID. Search/status/area filters and their draft controls are cleared, page returns to one, and a fresh GET runs with the existing page size. This avoids hiding the agent behind old filters; the API supplies its existing newest-first order. A failed creation does not clear or refresh the list. If saving succeeds but the GET fails, the success notice remains and the list's Try again retries only the GET. Existing backend cache invalidation is reused unchanged. The overview loads its own updated snapshot when visited; no polling is added.

### Step 22 checks and limitations

Commands run inside `client/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/create-agent.test.js test/agents.test.js test/layout.test.js` | Final focused run: 36 passed, 0 failed, 0 skipped. An earlier 34-test run also passed but revealed a React warning for a deliberately null fixture value; the form now renders a safe empty string for that value. |
| `npm test` | All 50 frontend tests passed, 0 failed, 0 skipped |
| `npm run build` | Passed with Vite 8.3.4; compiled the JSX and produced ignored production assets |
| `node --check src/validation/createAgent.js` | Passed |
| `node --check src/state/createAgentResource.js` | Passed |
| `node --check src/services/agentsService.js` | Passed |
| `node --check test/create-agent.test.js` | Passed |
| `node --check test/layout.test.js` | Passed |

The 14 creation tests cover form rendering, required/type/email/status validation, normalization, exact payload/public response fields, loading, overlapping submits, field errors, duplicate IDs, network/server/size failures, retained drafts, corrected retries, confirmed-save/list-refresh separation, and the POST followed by GET through actual Axios against an isolated local HTTP fixture. Existing list, overview, shell, and proxy regressions continue passing. Fixtures and mocked requests establish no live MongoDB persistence or Redis integration coverage.

Additional regression commands inside `server/`: `npm test` initially reported 126 passed and 2 failed when run alongside frontend tests; two existing configuration-test child processes exceeded their 5-second timeout (`status` was null). `node --test test/env.test.js` then passed all 8 tests independently. `npm test -- --test-concurrency=1` passed the complete 128-test server suite, 0 failed, 0 skipped. No timeout settings or backend source were changed. These environment tests use disposable local fixtures, not the real `server/.env`. From the repository root, `git diff --check` passed.

Browser DOM clicks, focus behavior, viewport appearance, and a live creation were not verified in this step. To review manually, start your configured backend separately, run `npm run dev` in `client/`, and open `/agents`. Check the form at 320px, 390px, 768px, 1024px, and 1440px; use Tab/Shift+Tab and Enter; submit blank fields, an invalid email, an existing ID, and a unique valid record. Confirm success clears filters and displays the new record. With the API unavailable, confirm entered values stay available and the form can retry. A timeout does not guarantee that the write failed, and navigating away or cancelling discards the local draft.

No dependencies, backend code, API contracts, configuration, or lockfiles changed. No detail/edit/delete functionality was added. The configured live backend was not started and `server/.env` was never accessed. Step 22 is COMPLETE; Steps 23-30 remain PENDING. Nothing was staged or committed.

Suggested Step 22 commit message after review:

```text
feat: add delivery agent creation form
```

## Step 23 Agent details

Select the table's **View** icon (accessible name: View agent followed by the business agent ID) to open `/agents/:id`. The route's `id` is MongoDB's public 24-character hexadecimal record ID, not the business `agentId`. The Agents navigation remains active and the header reads Agent details. Edit and Delete remain disabled. Unknown deeper paths still show the existing page-not-found screen.

`agentsService.fetchAgentById()` calls the existing `GET /api/agents/:id` through the shared Axios instance, preserving the `/api` base and configurable port-5000 proxy. It normalizes valid IDs to lowercase, rejects invalid/missing IDs before HTTP access, requires the existing HTTP 200 `{ success: true, data: agent }` contract, and reuses the public-field response checker. The returned record must match the requested database ID. No backend or endpoint changes were needed.

The page displays Full name, Agent ID, Phone, Email, Service area, Active/Inactive status, Created (UTC), Last updated (UTC), and Database record ID. Both timestamps display date and time including seconds in UTC, with machine-readable `<time>` values. Text wraps inside a one-column mobile/two-column wider layout; contact values display as escaped text. A labelled definition list keeps fields understandable. **Back to Agents** is a keyboard-accessible link available in every state, including loading and errors.

`pages/AgentDetailPage.jsx` reads the route parameter and starts the existing shared request resource. Each new record ID gets its own resource, cancelling the previous request; late completions cannot replace newer data. The component cancels on unmount and supports StrictMode's cleanup/reload cycle. `components/agents/AgentDetailContent.jsx` renders the record and feedback states. No duplicate request lifecycle or additional dependencies were introduced.

| Condition | Page behavior |
| --- | --- |
| Loading | Announces Loading agent details; no old agent data is shown |
| Invalid/missing ID | Invalid agent link feedback with Back to Agents; no HTTP request for locally invalid IDs |
| HTTP 404 | Agent not found feedback, Back to Agents, and Try again |
| HTTP 400 | Invalid agent link feedback; no raw validation response is displayed |
| Network error, timeout, server failure, or malformed response | Generic unavailable message and Try again; no raw server text or internal details |
| Retry | Starts a fresh GET, clears old displayed data, and can recover to success |

`/agents` without an ID remains the list route. Returning to it starts the existing list at its defaults: Step 21's local filters/page state is not persisted across navigation. Retry uses the existing backend detail cache and does not bypass its TTL; no polling or cache changes were added.

### Step 23 verification

Commands run inside `client/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/agent-detail.test.js test/agents.test.js test/layout.test.js` | 37 passed, 0 failed, 0 skipped |
| `npm test` | All 65 frontend tests passed, 0 failed, 0 skipped |
| `npm run build` | Passed with Vite 8.3.4; compiled all changed JSX and generated ignored production assets |
| `node --check src/services/agentsService.js` | Passed |
| `node --check test/agent-detail.test.js` | Passed |
| `node --check test/agents.test.js` | Passed |
| `node --check test/layout.test.js` | Passed |

From the repository root, `git diff --check` passed. The 12 new detail tests cover ID validation, targeted request path/cancellation, View-link route resolution, all public fields and both statuses, UTC dates, safe text rendering, loading, 404/400 states, network/timeout/500 failures and retry, malformed responses, late completions, record isolation, and actual Axios requests against an isolated HTTP fixture returning 200 and 404. Three new shell tests verify the detail route/title/navigation, invalid IDs, missing-segment list behavior, and unsupported deeper routes. Existing list tests now provide router context for View links; create, overview, and proxy regressions still pass.

These tests render React to strings and exercise request state directly. Browser DOM clicks, keyboard/focus behavior, and viewport appearance were not inspected in this step. No live MongoDB or Redis detail integration was run. To review manually, run your configured backend separately and `npm run dev` in `client/`, open `/agents`, and use Tab/Enter on View. Check all fields and timestamps, Back to Agents, invalid links, an unavailable API and retry, and the existing 320/390/768/1024/1440px viewport widths.

Step 23 is COMPLETE; Steps 24-30 remain PENDING. No backend, dependency, lockfile, configuration, edit, or delete changes were made. Backend tests were not rerun because backend files are unchanged. The configured live backend was not started; `server/.env` was not accessed. Nothing was staged or committed.

Suggested Step 23 commit message after review:

```text
feat: add agent details view
```

## Step 24 Edit and delete agents

Choose **Edit** in an Agents row or on the detail page to open `/agents/:id/edit`. The page loads the selected record through the existing detail GET before prefilling the form. It uses the same MongoDB public record ID as the detail API. Invalid IDs, missing records, failed loads, and retry reuse the existing detail states. The dashboard header reads Edit agent and Agents stays active in navigation.

The shared form now supports edit mode. Full name, phone, email, service area, and status are editable; business Agent ID is read-only, and database IDs/timestamps are never submitted. Required-string, trim, phone syntax, email lowercase/format, and active/inactive rules are reused. The existing inactive status is preserved, not defaulted to active. Phone syntax follows the correction documented below; no new fields are introduced.

`validation/agentMutations.js` normalizes the complete draft and compares it with the loaded record, producing only changed editable fields. A one-field edit sends a one-field PATCH, so omitted fields are preserved. An unchanged draft shows No changes to save without making a request. `agentsService.updateAgent()` uses the existing HTTP 200 `{ success: true, data: agent }` contract and public-field checker. Identifiers and the returned record ID are checked consistently with detail loading.

`EditAgentForm.jsx` uses `AddAgentFormView` with edit labels and read-only ID behavior. It focuses Full name on opening and the alert summary after errors. Save and Cancel are disabled during submission; a synchronous state guard also blocks repeated PATCH calls. Validation/server errors retain all draft values, map known editable field errors, and show safe messages for 404, 409, oversized forms, network errors, timeouts, or unexpected failures. There are no automatic mutation retries. A lost response can mean an update succeeded, so feedback asks you to check details before retrying.

After confirmed success, navigation replaces the edit entry with the agent detail route, displays confirmation, and starts a fresh detail GET. Returning to Agents starts its existing fresh list GET. There is no global frontend query cache to invalidate: detail/edit/list resources are scoped to mounted pages. Existing backend Redis invalidation is unchanged. If a follow-up GET fails, the successful mutation remains acknowledged and Try again retries only that GET. Navigating away during a pending write does not automatically abort or undo it, and its late completion cannot force navigation back.

### Delete confirmation

Delete is enabled in table rows and on loaded detail pages. Opening it identifies the agent by name and business ID and describes permanent deletion; opening or cancelling sends no DELETE. `DeleteAgentDialog.jsx` uses a native modal `<dialog>` with an accessible name/description. The browser contains focus and makes the background inert. Cancel receives initial focus; Cancel or Escape dismisses before submission. Closing restores focus to the trigger when it still exists, otherwise to the shared main content. The dialog and buttons fit small viewports and allow scrolling for long text.

Only **Delete agent** sends the existing DELETE `/api/agents/:id`, and only HTTP 204 counts as success; no JSON body is expected. During submission, both buttons are disabled and Escape cannot dismiss the pending confirmation. A state guard blocks repeated requests. Failures remain inside the confirmation with safe feedback; no success navigation or list refresh runs after a failed DELETE. A 404 explains the record is missing and disables repeated deletion; Close remains available. Other failures can be explicitly retried or cancelled.

After a table deletion, the dialog closes, success is announced, and a new list GET retains applied filters and page. The existing Back to first page recovery handles an emptied later page. Deleting the currently viewed agent navigates with replacement to `/agents`, displays confirmation, and loads a fresh list. It does not leave the deleted detail view active. Success notices use navigation state and may reappear when revisiting that browser history entry.

`state/agentMutationResources.js` keeps the edit and confirmation states independently testable, including pending/success guards, retained drafts, and completion callbacks. A failed reload or callback never makes an already confirmed mutation resubmittable. The existing create flow and its tests remain intact.

### Step 24 verification and limitations

Commands run inside `client/` on October 18, 2026:

| Command | Actual result |
| --- | --- |
| `node --test test/agent-mutations.test.js test/create-agent.test.js test/agent-detail.test.js test/agents.test.js test/layout.test.js` | Final run: 77 passed, 0 failed, 0 skipped. The initial run had one failing assertion because it assumed HTML attribute order; the assertion now checks the read-only identifier input independently. |
| `npm test` | Final full suite: 91 passed, 0 failed, 0 skipped |
| `npm run build` | Passed with Vite 8.3.4; all changed JSX compiled and generated output stays ignored |
| `node --check src/services/agentsService.js` | Passed |
| `node --check src/state/agentMutationResources.js` | Passed |
| `node --check src/validation/agentMutations.js` | Passed |
| `node --check test/agent-mutations.test.js` | Passed |
| `node --check test/agent-detail.test.js` | Passed |
| `node --check test/agents.test.js` | Passed |
| `node --check test/layout.test.js` | Passed |

From the repository root, `git diff --check` passed. The 25 new mutation tests cover prefilling, immutable fields, normalization/partial payloads, unchanged/invalid edits, confirmed updates, retained errors/retries, pending guards, confirmation/cancellation, DELETE 204, missing records, safe failure messages, success/refresh separation, list retry with preserved filters, route destination notices, and actual Axios GET/PATCH/GET/DELETE/list requests against an isolated HTTP fixture. A new shell test verifies edit routing/loading/invalid IDs; existing table/detail tests now expect enabled Edit/Delete. All previous creation, overview, request lifecycle, and proxy regressions continue passing.

The fixture persists changes only in its disposable in-memory record; no live MongoDB persistence or Redis integration was tested. React render tests and direct resource tests do not execute browser DOM events or verify native modal focus, Escape, resizing, or navigation effects interactively. For manual review, use a disposable test agent with your configured backend, run `npm run dev` in `client/`, and check 320/390/768/1024/1440px widths. Verify prefilled values, immutable ID, required-field errors, one-field saves, confirmation after reload, failed saves retaining inputs, Cancel/Escape without a DELETE, modal Tab containment and focus return, confirmed deletion from both list and details, and recovery when the API is unavailable.

Step 24 is COMPLETE; Steps 25-30 remain PENDING. Backend code, contracts, dependencies, lockfiles, and configuration are unchanged; backend tests were not rerun. The configured live backend was not started and `server/.env` was not accessed. Nothing was staged or committed.

Suggested Step 24 commit message after review:

```text
feat: add agent editing and deletion UI
```

## Phone-validation correction

The contact field is `phone`. Previously, the POST schema checked only `z.string().trim().min(1)` and PATCH inherited that rule. Mongoose required a trimmed string but had no format check. The frontend also checked only that the string was nonblank; `type="tel"` by itself does not validate phone syntax. Consequently, `abc` passed every layer.

No country-specific format or digit count was established. The corrected rule requires numeric phone syntax: digits, an optional leading `+`, spaces, hyphens, dots, and balanced parentheses enclosing digit groups. Examples accepted unchanged after outer trimming include `+1 202-555-0142`, `(020)7946 0958`, `+91 98765 43210`, and `202.555.0142`. Letters, mixed alphanumeric text, punctuation-only values, misplaced plus signs, and unmatched parentheses are rejected. No digit count is imposed, so existing short numeric values such as `123` remain accepted. This checks syntax, not reachability or country-specific numbering validity; extensions containing letters are not supported.

`server/src/validation/phone.js` shares the rule and a safe fixed error message between the Agent model and API error formatting. The create request schema applies the rule, and PATCH inherits it through the existing editable-field schema. Mongoose provides the same defense for model validation. Invalid POST/PATCH bodies return HTTP **400** before any database write or cache invalidation, keeping the established JSON structure:

```json
{
  "success": false,
  "message": "Request validation failed",
  "details": [{
    "section": "body",
    "field": "phone",
    "message": "Enter a phone number using digits, an optional leading +, spaces, hyphens, dots, or parentheses."
  }]
}
```

The existing client form validator implements the same rule and safe phone feedback. Both creation and editing already use that validator, so no form duplication or new dependencies were needed. Invalid input stays in the form with a linked phone-field error and no POST/PATCH request. Existing data is not migrated, rewritten, or canonicalized. Reads and cache response validation are unchanged; a previously stored invalid value remains until explicitly corrected. Controllers, successful mutation responses, uniqueness rules, and Redis invalidation logic are unchanged. Roadmap statuses are unchanged.

Verification performed for this correction:

| Directory | Command | Actual result |
| --- | --- | --- |
| `server/` | `node --test test/agent.test.js test/create-agent.test.js test/update-agent.test.js test/crud-flow.test.js test/request-errors.test.js` | 41 passed, 0 failed |
| `server/` | `npm test -- --test-concurrency=1` | Full suite: 133 passed, 0 failed, 0 skipped |
| `client/` | `node --test test/create-agent.test.js test/agent-mutations.test.js` | 41 passed, 0 failed |
| `client/` | `npm test` | Full suite: 93 passed, 0 failed, 0 skipped |
| `client/` | `npm run build` | Passed with Vite 8.3.4 |
| Root | `node --check` on all 11 changed/new JavaScript files | Passed |
| Root | `git diff --check` | Passed |

The new endpoint tests assert that rejected input never calls model write methods or invalidation. The shared CRUD flow additionally attempts an invalid creation and a multi-field update containing `phone: "abc"`, then checks the row count and unchanged saved record. That flow passes with fake Redis enabled and unavailable; existing successful invalidation assertions still pass. Mongoose tests cover accepted/rejected syntax without a database; frontend tests cover phone errors and blocked creation/edit submission. Persistence assertions use mocked in-memory storage, not a live MongoDB database. No live MongoDB/Redis integration or browser interaction was run. No private environment files were accessed, dependencies added, files staged, or commits created.

Suggested commit: `fix: validate agent phone input across API and forms`

## Step 25 Frontend–backend integration verification

The existing implementation already connects all agent operations through the shared Axios client. No runtime integration defect was demonstrated, so this step adds verification rather than replacing working services or UI. Dashboard cards read full backend pagination totals, and recent registrations and table rows come from backend records. Counts are never derived from the visible page size or demo data.

| Operation | Existing API contract |
| --- | --- |
| List and overview | `GET /api/agents` with `page`, `limit`, optional `search`, `status`, and `serviceArea` |
| Create | `POST /api/agents`, HTTP 201 with the public agent |
| Details | `GET /api/agents/:id`, HTTP 200 with the public agent |
| Edit | `PATCH /api/agents/:id`, HTTP 200 with the updated public agent |
| Delete | `DELETE /api/agents/:id`, HTTP 204 without a response body |

The `:id` is the database record ID. Search is a case-insensitive literal substring; status and service area filters use exact matching and combine with search. Pagination uses backend matching totals. Local development retains the port-5000 proxy; production retains the existing Vercel `/api` rewrite to Render before the SPA fallback. No hosting, API, or environment configuration changed.

`client/test/backend-integration.test.js` sends the actual frontend Axios requests through a running Vite proxy into the actual Express routes, validators, controllers, and cache services. Only MongoDB storage and the Redis client are simulated, using the existing test helpers. Two isolated runs cover Redis available and unavailable. Both verify seven creations with list refreshes, normalization, totals larger than the recent-agent limit, newest-first registrations, combined filters, literal search, pagination, detail loading, phone rejection, partial editing with a fresh detail GET, updated overview counts, cancelled deletion, confirmed deletion with a filtered list refresh, and subsequent detail 404. The enabled-cache run warms responses before mutations and checks fresh results and successful invalidations. `client/test/proxy.test.js` additionally protects the exact Render destination and rewrite order.

Install dependencies in both packages with `npm ci` before running the frontend suite: this new integration test imports the backend app. No packages or lockfiles were changed. The test fixture disables unnecessary Vite dependency discovery; initial harness runs stalled and were interrupted before that adjustment. The final focused and full runs passed.

Verification on October 19, 2026:

| Directory | Command | Actual result |
| --- | --- | --- |
| `client/` | `node --test test/backend-integration.test.js test/proxy.test.js` | 5 passed, 0 failed, 0 skipped |
| `client/` | `npm test` | 96 passed, 0 failed, 0 skipped |
| `server/` | `npm test -- --test-concurrency=1` | 133 passed, 0 failed, 0 skipped |
| `client/` | `npm run build` | Passed with Vite 8.3.4; 2,077 modules transformed |
| Root | `node --check client/test/backend-integration.test.js` | Passed |
| Root | `node --check client/test/proxy.test.js` | Passed |
| Root | `git diff --check` | Passed |

Existing phone-validation, cancellation/stale-response, CRUD, and Redis regressions continue passing. Runtime code, UI, private environment files, cache behavior, dependencies, and hosting configuration are unchanged. Roadmap statuses in `docs/STEP_PLAN.md` remain unchanged as requested; Steps 26–30 were not started.

These checks verify the frontend service/state-to-Express integration locally. They do not execute browser clicks/navigation effects, verify real MongoDB persistence or Redis Cloud, inspect deployed Vercel environment values, or contact the deployed Render backend. Live/browser acceptance remains unverified, so this section records automated progress without marking the roadmap complete. No files were staged or committed.

Suggested commit after review: `feat: integrate dashboard with agent APIs`

## Step 26 Feedback, loading, and safe read retries

Step 26 is COMPLETE against its feedback acceptance criteria. Existing create/edit submission progress, disabled controls, duplicate-submission guards, field validation, retained failed drafts, deletion confirmation, and missing-record feedback were verified and preserved. No mutation is automatically retried. A timed-out write may already have succeeded, so existing messages continue to ask users to check the saved record before submitting again.

The shared `requestResource.js` previously cleared data on every read and left cancelled requests marked as loading. It now retains already loaded data during a same-request refresh, records cancellation as a settled state, and retains only a safe failure category. Superseded and cancelled completions still cannot overwrite a newer result. Changing list filters/pages clears rows belonging to the old query; changing the detail route ID still starts a separate resource. Invalid/missing detail results are not retained while that page retries. There are no new dependencies or global caches.

`components/ReadFeedback.jsx` and `lib/requestErrors.js` share fixed public text across overview, list, and detail views. Initial loading shows progress without invented zero totals or empty-result messages. Refreshes keep data visible with an explicit warning that it may be out of date. A failed refresh keeps that warning and offers **Try again**; a failed first load shows no fabricated content. Timeout messages explain that the request took too long, connection failures ask users to check connectivity, and HTTP/malformed-response failures show a safe unavailable message. No raw Axios message, URL, response body, stack trace, or credential is stored in read state or displayed.

Successful reads expose **Refresh overview**, **Refresh agents**, and **Refresh details** buttons. Retry and refresh run the existing GET services once per action (three list GETs for the overview); there is no retry loop, polling, timeout increase, or POST/PATCH/DELETE retry interceptor. Progress and cancellation use status announcements, errors use alerts, and existing responsive layouts and keyboard-operable buttons remain. List pagination and deletion are disabled while retained results are refreshing or failed. Detail mutation actions appear again after a successful read. Successful empty responses and detail 404s remain distinct from request failures.

### First-load API investigation

The local trace is: page mount → shared request resource/AbortController → reusable service → shared Axios client (`/api`, 10-second timeout) → Vite proxy locally, or the existing Vercel `/api/:path*` rewrite to Render in production → Express `/api/agents` validation/controller/cache/database path. The SPA fallback follows the API rewrite. The overview requests total/recent, active, and inactive data concurrently and checks consistency before displaying counts. Its existing guard can reject inconsistent totals during concurrent changes; no cache behavior was changed. Development StrictMode can cancel and restart a mount request; the cancelled request must not produce an error or replace the restarted result.

Demonstrated local gaps were discarded refresh content, loading state remaining after cancellation, and identical feedback for timeout/network/other failures. HTTP fixtures also reproduce a stalled response, a disconnected socket, an HTML response, and HTTP 503 on the first read; each settles into safe failure feedback and recovers on an explicit retry. The fixtures use a test-only 200 ms Axios timeout; the application's 10-second deadline is unchanged. An earlier assertion counted late-arriving aborted overview requests as retry requests; the corrected assertion counts actual Axios dispatches, and both final test runs passed.

**The reported production first-load failure's root cause is not established locally.** No local production logs were available, no live Render logs or deployed Vercel settings were inspected, and no live deployment was contacted. There is no evidence here establishing a Render cold start. The configured rewrite and service contracts pass local regression tests; they do not prove the deployed environment uses the same configuration.

For remaining manual diagnosis, capture a first-load request in the browser Network panel and record its public path, HTTP status, duration, response content type, and timeout/connection classification without sharing secrets. Verify the deployed frontend uses `/api` and that the API rewrite runs before the SPA fallback; an absolute cross-origin API URL bypasses the rewrite and the existing backend does not enable CORS. Correlate the request time with Render startup/request logs and database readiness, then compare a manual retry. A roughly 10-second timeout establishes the browser deadline was exceeded, not why the backend did not answer. Do not copy private server settings into browser configuration.

### Step 26 verification

Checks on October 19, 2026:

| Directory | Command | Actual result |
| --- | --- | --- |
| `client/` | `node --test test/request-feedback.test.js test/overview.test.js test/agents.test.js test/agent-detail.test.js test/create-agent.test.js test/agent-mutations.test.js` | Final focused run: 89 passed, 0 failed, 0 skipped; initial run: 88 passed, 1 assertion failed as explained above |
| `client/` | `npm test` | 103 passed, 0 failed, 0 skipped, including existing integration checks with Redis enabled/unavailable |
| `client/` | `npm run build` | Passed with Vite 8.3.4; 2,079 modules transformed |
| Root | `node --check` on `requestErrors.js`, `requestResource.js`, `agentsResource.js`, and `request-feedback.test.js` | Passed |
| Root | `git diff --check` | Passed |

Seven new tests exercise initial/empty/cancelled states, retained refresh content, failed refresh and retry, query isolation, late completion after cancellation, actual HTTP timeout/network/HTML/503 failures on all read views, and actual timed-out create/update requests retaining drafts without duplicate writes. Existing not-found, input validation/phone, failure recovery, overlapping requests, StrictMode, and mutation tests still pass. Existing cancellation assertions now expect a settled cancelled state, and initial detail-loading assertions use an empty initial resource.

Backend source, contracts, schemas, Redis behavior, validation, API URL settings, rewrites, hosting, packages, and lockfiles are unchanged. The standalone backend suite was not rerun because backend behavior was not changed; the full client suite includes frontend-to-Express integration checks. Browser DOM events, focus behavior, and viewport appearance were not manually inspected; render tests verify markup and direct resource tests exercise the request states. Live MongoDB/Redis and production first-load behavior remain unverified. `server/.env` was never read, printed, staged, or modified. Changes remain unstaged and uncommitted. Steps 27-30 remain PENDING, and Step 25's existing roadmap status is unchanged.

Suggested commit after review: `fix: improve dashboard feedback and error states`
