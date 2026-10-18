# FleetFlow

FleetFlow is a planned Delivery Agent Management System for creating, viewing, updating, and deleting delivery agent records through a dashboard backed by an API.

## Current setup status

**The backend supports creating, listing, retrieving, partially updating, and deleting agents.** List requests support pagination/search/filters; detail, update, and delete requests use the public database ID. The backend connects to MongoDB Atlas before accepting HTTP requests and reuses the Agent model, request validation, and centralized errors. Frontend workflows have not been implemented yet.

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
- Step 13 is COMPLETE after 27 focused tests and all 87 server tests passed. Changes remain uncommitted for review; live Redis connectivity has not been tested.
- Steps 14-30 are PENDING in `docs/STEP_PLAN.md`; their order, objectives, acceptance criteria, and suggested commits are preserved.
- The server exposes health, create-agent, list-agent, single-agent GET, PATCH, and DELETE endpoints with consistent JSON error responses. Successful deletion returns 204 with no body, as required by the roadmap.
- Express, dotenv, Zod, Mongoose, and node-redis are the direct dependencies. The development script uses Node's built-in watch mode.
- `client/` remains empty. Redis connection management is available, but no endpoint uses caching yet. There is no authentication. Normal tests use mocked services; live Redis connectivity has not been checked in Step 13.
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

The agreed scope includes creating, listing, viewing, updating, and deleting delivery agents; searching and filtering agents by status and service area; paginated results; and dashboard totals for active, inactive, and recent agents. Creating agents, listing with search/filters, fetching a single agent, partial updates, and deletion are implemented with request validation and safe error responses. Dashboard screens and Redis caching remain planned.

## High-level architecture

The React application in `client/` will send HTTP requests to the Express API in `server/` using Axios. The server will validate input with Zod and use Mongoose to read and write MongoDB Atlas data. Redis will cache agent list and detail responses, with expiry and invalidation after successful mutations. Database credentials and other server secrets must stay on the server.

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
|-- client/                  Empty; future browser application
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
|   |   |-- validation/
|   |   |   `-- agentSchemas.js     Create/update bodies, list query, and ID params
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
|       |-- integration-script.test.js  Optional-script configuration guard
|       |-- request-errors.test.js  Request middleware and safe error responses
|       `-- startup.test.js  Startup ordering, HTTP, and cleanup tests
|   |-- test-support/
|   |   `-- crudFlow.js      HTTP assertions shared by mocked and optional real checks
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

Git does not track empty folders. `client/` exists locally and will appear in Git when a later approved step adds files to it. `server/node_modules/` contains installed packages locally and is ignored by Git.

## Development workflow

Before every future step, read [the development rules](docs/DEVELOPMENT_RULES.md) and [the step plan](docs/STEP_PLAN.md). Implement only the current step requested by the project owner. Update this README with actual progress and record the checks performed before requesting review.

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

MongoDB is FleetFlow's persistent database: it retains created agents between server restarts. Redis is optional and connects only when configured; endpoint caching starts in later steps. The create route imports the existing Agent model. Mongoose can initialize its collection and indexes after connection; the controller also waits for `Agent.init()` before writing so duplicate protection is ready.

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
| `phone` | Contact number; required trimmed string. Internal formatting is preserved, including a leading `+`. |
| `email` | Contact email; required string, trimmed and converted to lowercase. |
| `serviceArea` | Area served by the agent; required trimmed string. |
| `status` | Trimmed string allowing only `active` or `inactive`. Defaults to `active` when omitted; null and empty values are rejected. |
| `createdAt` | Date managed by Mongoose when the document is first persisted. |
| `updatedAt` | Date managed by Mongoose when the document is saved or updated through supported Mongoose operations. |

`timestamps: true` enables the two date fields. Merely constructing or validating an unsaved document does not populate timestamps. The schema tests check timestamp configuration without saving to a database.

Only `agentId` has a declared unique index. Phone and email deliberately allow shared contact details because no rule requiring one agent per contact method has been agreed. Trimming and email lowercasing happen before persistence. The model continues enforcing non-empty required strings without a phone-format rule; the create-request schema additionally validates email syntax. No international phone canonicalization is introduced.

Mongoose validation catches missing required fields, blank required text after trimming, and unsupported status values before a normal save. This helps keep records consistent; it does not replace request validation. `unique: true` declares a MongoDB index rather than a Mongoose validator: `validate()` cannot detect duplicate stored IDs. The create controller waits for index initialization and converts MongoDB duplicate-key code 11000 to a safe 409 response. MongoDB enforces uniqueness even for concurrent requests, without a race-prone pre-check. See the [Mongoose validation guide](https://mongoosejs.com/docs/validation.html) and [Model.init documentation](https://mongoosejs.com/docs/api/model.html#Model.init()).

`server/test/agent.test.js` builds sample documents and calls `validate()` in memory. `validAgent()` supplies readable test data; `assert.rejects()` checks that invalid documents fail. The tests also inspect timestamp and index definitions. They import neither environment configuration nor startup code and require no live database or credentials.

## Environment configuration

Edit `server/.env` after copying `server/.env.example` only when needed. The template supplies safe `PORT=5000`, a clearly labelled MongoDB placeholder that must be replaced privately, and blank Redis configuration. It cannot connect until the MongoDB value is configured. The root `.env.example` remains a general planning template; the backend does not load a root `.env` or use its frontend placeholders.

| Variable | Purpose and validation |
| --- | --- |
| `PORT` | Required TCP port. Must contain decimal digits representing a whole number from 1 through 65535. It is converted from text to a number before the server listens. There is no silent fallback for a missing or invalid value. |
| `MONGODB_URI` | Required non-empty private MongoDB connection URI. Whitespace is trimmed and MongoDB's driver parser checks URI syntax, including standard and SRV formats, without connecting. Missing, blank, placeholder, and malformed values are rejected without printing them. Valid syntax does not prove that credentials or network access work; startup checks the real connection. |
| `REDIS_URL` | Optional private `redis://` or `rediss://` connection URL; `rediss` uses TLS. Missing/blank skips Redis; nonblank text is trimmed and passed to the client. Invalid URL syntax or connection failures produce fixed warnings and leave Redis unavailable without preventing HTTP startup. Configure real values privately. |

`src/config/env.js` uses a path relative to its own location to load `server/.env`, even when Node starts from the repository root. Existing process variables take precedence over values in the file. A missing file is allowed when the process environment supplies valid `PORT` and `MONGODB_URI`; an unreadable file fails with a readable error. The loader validates before the HTTP listener starts and exports `env` for other modules. Only expected fields are exported. Error messages do not print submitted values or credentials.

This uses dotenv's explicit path and override options and Zod's schema parsing; see the [dotenv documentation](https://github.com/motdotla/dotenv#readme) and [Zod API documentation](https://zod.dev/api).

The root `.gitignore` already excludes `.env` and `.env.*` in subfolders and permits `.env.example`. No server-specific ignore file is needed. Never commit `.env` or put real credentials in example files. Browser environment variables are public and must never contain secrets.

If startup reports `PORT must be a whole number from 1 to 65535`, check `PORT` in `server/.env`: blank values, words, fractions, zero, negative values, and values above 65535 are rejected. A missing value produces the same instruction to set `PORT`. Existing PowerShell variables override the file. To remove unwanted overrides for the current terminal, use `Remove-Item Env:PORT -ErrorAction SilentlyContinue` or `Remove-Item Env:MONGODB_URI -ErrorAction SilentlyContinue`, without printing secret values. Restart the server after changing `.env`; watch mode tracks source files, so do not rely on it to reload the environment file. If a MongoDB syntax error occurs, replace the placeholder privately and check URI formatting; for connection failures use the Atlas troubleshooting guidance above. If the HTTP port is occupied, choose another free valid port or stop the conflicting process. For a file-read error, check permissions. Only Redis may remain absent or blank in this step.

## Redis connection management

`server/src/config/redis.js` exports `connectRedis(url)`, `disconnectRedis()`, and `getRedisClient()`. Startup passes `env.REDIS_URL` to the connection function; this module never loads `.env` itself. `getRedisClient()` returns the shared ready client or `null` when unavailable. Later caching steps can reuse that client. Importing the module opens no connection, and Step 13 does not read/write cache entries or change any endpoint.

`connectRedis()` creates one client using node-redis. Concurrent connection requests share an attempt; calls after success reuse the ready client. Missing configuration returns `null` without creating a client. A configured attempt has a three-second socket timeout and a three-second overall deadline covering DNS/authentication/handshake work. URL parsing and connection failures return `null` with fixed messages. Raw errors, passwords, hostnames, and URLs are never logged.

Automatic reconnection is disabled with `socket.reconnectStrategy: false`, and offline command queuing is disabled. A startup or runtime outage leaves Redis unavailable while MongoDB-backed requests remain usable. The ready-client getter returns `null` after a connection loss. There is no background recovery loop: restart the backend or explicitly call `connectRedis()` again after restoring the service. No request currently uses Redis, and a later caching step must handle an unavailable client.

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

This separate script never loads `.env` or falls back to `REDIS_URL`. It connects, requires `PING` to return `PONG`, and closes the client. It writes no data and has an eight-second overall deadline. The normal suite checks its missing-configuration guard without connecting. **No live Redis check was run in Step 13**; only mocked lifecycle checks, the real client's malformed-URL rejection, and the script guard were verified. If using the optional script, ensure the Redis user permits PING and TLS/credentials are configured privately.

## Backend files and request flow

- `server/package.json` describes the backend, declares its dependencies, and defines the `dev`, `start`, and `test` commands. `private: true` prevents accidental npm publication; `type: module` enables JavaScript `import` and `export`.
- `server/package-lock.json` records exact dependency versions, making future installs reproducible. This file belongs in Git; `node_modules/` does not.
- `server/.env.example` is the shareable backend template; the local `.env` copy is ignored by Git.
- `server/src/config/env.js` loads the file, then uses a Zod schema to describe allowed configuration. `safeParse()` returns validated data or validation issues. The port schema checks decimal text, converts it with `Number`, and enforces the TCP range. MongoDB URI syntax is required and checked by constructing a driver client without opening it. Optional Redis blanks normalize to `undefined`. Invalid configuration throws a readable error before the server can listen. The module exports only the validated `env` object.
- `server/src/config/db.js` exports `connectDatabase(uri)` and `disconnectDatabase()`. The startup code passes the validated URI. Connection failure logs a fixed message and rethrows the error for startup to handle; raw driver errors are never printed. Two module-level listeners report connection errors and closure without adding a listener on every call.
- `server/src/config/redis.js` manages the optional shared Redis client with connection/close deadlines and safe fixed logs. Its factory supports isolated tests without a live service.
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
- `server/test/list-agents.test.js` exercises the production GET route with mocked `Agent.find()` query chains and `Agent.countDocuments()`. It checks filters, escaped regexes, projection, sort, skip/limit, metadata, invalid queries, empty pages, and safe error responses without a database connection.
- `server/test/get-agent.test.js` mocks `Agent.findById()` while exercising the production detail route over HTTP. It verifies the exact targeted ID, projection, public response fields, malformed ID rejection, uppercase hex handling, missing records, and safe unexpected errors. It also ensures the lookup does not call `Agent.find()` to fetch the list.
- `server/test/update-agent.test.js` exercises PATCH over HTTP with mocked model updates, checks the targeted query and supplied fields, and tests normalization and errors. One additional test executes real Mongoose query middleware with a mocked collection method to verify timestamps and update validation. It never opens a database connection or proves persistence.
- `server/test/delete-agent.test.js` uses real HTTP routing and middleware with a mocked `Agent.findByIdAndDelete()` query. It verifies the targeted ID, projection, empty 204 response, malformed/uppercase IDs, missing records, safe 500 errors, and that neither a full-list query nor bulk deletion is used. No stored records are deleted by these tests.
- `server/test/crud-flow.test.js` runs all five endpoints against one fresh, test-local mocked store with deterministic IDs/timestamps. It checks how changes affect later requests. It does not reimplement MongoDB search/filter behavior; the existing list tests continue checking that query contract separately.
- `server/test-support/crudFlow.js` contains shared HTTP assertions, including readback after updates, no changes after rejected writes, an unrelated record surviving deletion, and missing-record responses after deletion. Both the normal lifecycle test and optional real integration script run these same assertions.
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

## Get a single delivery agent

**`GET /api/agents/:id`** retrieves one record. Step 9's roadmap specifies `:id` without explicitly naming the underlying identifier. To follow the existing response convention, this endpoint uses the public `id` from create/list responses: MongoDB's `_id` represented as a 24-character hexadecimal string. It does **not** look up the separate business `agentId` or fall back to that field.

For example, use the returned `id` in:

```text
GET /api/agents/68f2d0000000000000000001
```

The existing Zod middleware validates route `params` before any lookup. Uppercase or lowercase hexadecimal characters are accepted. Business IDs such as `AGENT-001`, wrong-length strings, non-hex characters, and whitespace-padded IDs return 400 without querying MongoDB. An absent `id` fails the parameter schema when it is applied; at the HTTP routing level, `GET /api/agents` and `GET /api/agents/` remain the existing list endpoint rather than a detail request with a missing parameter.

The controller uses a targeted `findById()` query rather than fetching the list and filtering in JavaScript. It reuses the existing public-field formatter and returns **200** with this structure (ID/dates illustrative):

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
| List pagination/defaults/maximum, search escaping, combined filters, empty/out-of-range pages, query errors | `list-agents.test.js` asserts MongoDB filters, sorting, projection, skip/limit, and count calls |
| Single-agent success, malformed/uppercase IDs, valid missing IDs, targeted lookup, safe 500 | `get-agent.test.js` |
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

`details` identifies the section, a dotted field path, and a safe message. Root-level issues use `(root)`. Errors from direct Zod parsing use section `request` because no middleware section is attached. Messages come from fixed mappings of Zod issue codes: missing/type, size, format, allowed-value, and unknown-field errors get readable descriptions; other issue codes get `Invalid value`. Raw Zod messages, submitted values, stack traces, and extra issue metadata are never serialized or logged. This deliberately keeps wording generic, including for custom refinements.

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

`git diff --check` from the repository root also passed. Tests use fake Redis clients; malformed-URL handling uses the installed real client without connecting. The optional PING script's missing-configuration guard passed, but **no live Redis integration was performed**. MongoDB gating, health responses after Redis failure, startup cancellation, and repeatable cleanup were verified with injected services. `server/.env` was not read or changed. No caching, endpoint changes, staging, or commits were added. Step 13 acceptance criteria passed with mocked connectivity verification; Steps 14-30 remain pending.

After review, the suggested Step 13 commit message for you to execute is:

```text
feat: configure Redis connection
```
