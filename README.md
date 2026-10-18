# FleetFlow

FleetFlow is a planned Delivery Agent Management System for creating, viewing, updating, and deleting delivery agent records through a dashboard backed by an API.

## Current setup status

**The Express backend, Delivery Agent model, reusable request validation, and centralized error handling are implemented.** The backend connects to MongoDB Atlas before accepting HTTP requests. Agent CRUD workflows and the frontend have not been implemented yet.

- Step 1 is COMPLETE and committed locally as `0f170dc` (`chore: initialize FleetFlow project structure`).
- Step 2 is COMPLETE and committed locally as `e5ad3ec` (`feat: set up Express server and health check`).
- Step 3 is COMPLETE and committed locally as `ee4870c` (`chore: configure environment variables`).
- Step 4 is COMPLETE and committed locally as `9e814f5` (`feat: connect application to MongoDB`).
- Step 5 is COMPLETE and committed locally as `4fa2766` (`feat: define delivery agent data model`).
- Step 6 is COMPLETE after request validation, error handling, and all 32 automated tests passed. Its changes await review and remain uncommitted.
- Steps 7-30 are PENDING in `docs/STEP_PLAN.md`; their order, objectives, acceptance criteria, and suggested commits are preserved.
- The server exposes a health endpoint and consistent JSON error responses.
- Express, dotenv, Zod, and Mongoose are the direct dependencies. The development script uses Node's built-in watch mode.
- `client/` remains empty. The Agent model is defined and exported for later CRUD steps; there are no CRUD endpoints, authentication, or Redis connections.
- The backend loads `server/.env` and requires valid PORT and MongoDB URI configuration. Existing private configuration is preserved. Redis remains optional until Step 13.

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

The agreed scope includes creating, listing, viewing, updating, and deleting delivery agents; searching and filtering agents by status and service area; paginated results; and dashboard totals for active, inactive, and recent agents. The Agent schema now defines agentId, fullName, phone, email, serviceArea, status, createdAt, and updatedAt. Request validation, clear error states, responsive forms and tables, and Redis caching with expiry and invalidation will support the future workflows. Those workflows remain planned.

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
|   |   |-- config/
|   |   |   |-- env.js       Loads and validates backend configuration
|   |   |   `-- db.js        Mongoose connection and safe lifecycle messages
|   |   |-- models/
|   |   |   `-- Agent.js     Delivery Agent schema and exported model
|   |   |-- middleware/
|   |   |   |-- validateRequest.js  Reusable Zod request validation
|   |   |   `-- errorHandler.js     Final JSON error handler
|   |   `-- utils/
|   |       `-- ApiError.js  Expected application and request validation errors
|   `-- test/
|       |-- env.test.js      Configuration regression tests
|       |-- db.test.js       Mocked database connection tests
|       |-- agent.test.js    Agent schema validation and index definitions
|       |-- request-errors.test.js  Request middleware and safe error responses
|       `-- startup.test.js  Startup ordering, HTTP, and cleanup tests
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

Direct dependencies are Express 5.3.0, dotenv 18.0.8, Zod 4.6.7, and Mongoose 9.11.2, with exact resolved versions in the lockfile. Express serves requests, dotenv reads the environment file, Zod checks configuration, and Mongoose manages MongoDB connectivity. Node provides watch mode and tests, so no nodemon or test dependency is needed. Step 4 used `npm install mongoose` inside `server/`; `npm ci` above is the reproducible setup command for an existing checkout.

## MongoDB Atlas prerequisites and startup

MongoDB is FleetFlow's persistent database: it will retain agent records between server restarts. Redis will be introduced later for caching; it is not required or connected now. The Agent schema is defined below; it is not imported into startup yet. Step 5 performs no live database writes or index creation and adds no CRUD operations.

Before starting, have an active Atlas cluster, a database user with access to the intended FleetFlow database, and your current machine's IP permitted in Atlas Network Access. A database user is separate from an Atlas website account. Obtain the Node.js driver connection URI privately from Atlas, fill in the database user's credentials and application database name locally, and save it as `MONGODB_URI` in `server/.env`. Encode special characters in credentials as required by the URI format. Do not paste the URI into chat, logs, documentation, or Git. Existing `.env` files must be preserved; the guarded PowerShell copy above only creates one when absent.

Startup runs in this order:

1. Load `server/.env` and validate PORT and MongoDB URI syntax.
2. Call `connectDatabase()` and wait for Mongoose to connect to Atlas.
3. Only then open the Express HTTP listener on the validated port.

`mongoose.connect()` starts the network connection and authentication process. It returns a Promise because this work finishes later; `await` pauses startup until the Promise succeeds or fails. The connection module reuses an established connection or waits for one already opening, avoiding duplicate connections. See the [Mongoose connection guide](https://mongoosejs.com/docs/connections.html).

On success, expect `MongoDB connected successfully.` followed by `FleetFlow API is running at http://localhost:<port>`. Neither message includes the URI or credentials. Then request `GET /api/health` as shown below. The unchanged health response confirms HTTP startup completed after database connection; it is not an ongoing database readiness probe.

If connection fails, startup logs safe instructions, closes the database client, exits unsuccessfully, and leaves HTTP closed. The connection uses a 30-second server-selection timeout, without a custom retry system. Connection error and disconnected events emit fixed messages without driver details. Mongoose retains its normal connection monitoring behavior.

Ctrl+C (SIGINT) or SIGTERM starts shutdown: stop accepting HTTP requests, let active requests finish, then disconnect Mongoose. Repeated cleanup requests share one operation. Shutdown during database startup cancels HTTP startup. A ten-second deadline forces an unsuccessful exit if cleanup hangs; cleanup failures also exit unsuccessfully.

For connection trouble, check the private database username/password, database permissions, current IP access-list entry, cluster availability, DNS resolution, and firewall/network access to Atlas. Restart after fixing local configuration. Do not disable TLS checks or expose credentials to diagnose errors. The [Atlas connection troubleshooting guide](https://www.mongodb.com/docs/atlas/troubleshoot-connection/) covers authentication, IP access, and network problems.

## Delivery Agent model

`server/src/models/Agent.js` defines the document structure with `mongoose.Schema()` and exports the `Agent` model as its default export. A schema describes what a record may contain; a model lets later code create and work with records using that schema. Importing this module does not load `.env` or call a database connection function.

| Field | Purpose and rules |
| --- | --- |
| `agentId` | Business identifier for the agent; required trimmed string with a unique MongoDB index. Values remain case-sensitive. This step does not generate IDs. It is separate from MongoDB's built-in `_id`. |
| `fullName` | Agent's display name; required trimmed string. |
| `phone` | Contact number; required trimmed string. Internal formatting is preserved, including a leading `+`. |
| `email` | Contact email; required string, trimmed and converted to lowercase. |
| `serviceArea` | Area served by the agent; required trimmed string. |
| `status` | Trimmed string allowing only `active` or `inactive`. Defaults to `active` when omitted; null and empty values are rejected. |
| `createdAt` | Date managed by Mongoose when the document is first persisted. |
| `updatedAt` | Date managed by Mongoose when the document is saved or updated through supported Mongoose operations. |

`timestamps: true` enables the two date fields. Merely constructing or validating an unsaved document does not populate timestamps. The schema tests check timestamp configuration without saving to a database.

Only `agentId` has a declared unique index. Phone and email deliberately allow shared contact details because no rule requiring one agent per contact method has been agreed. Trimming and email lowercasing happen as values are assigned, before validation or persistence. No international phone canonicalization or email-format validator is added to the model; these fields currently enforce required non-empty text. Step 6 provides reusable request-validation middleware; Agent-specific request schemas will be defined with the later CRUD endpoints.

Mongoose validation catches missing required fields, blank required text after trimming, and unsupported status values before a normal save. This helps keep records consistent; it does not replace request validation. `unique: true` declares a MongoDB index rather than a Mongoose validator: `validate()` cannot detect duplicate stored IDs. Once the unique index exists, MongoDB rejects conflicting writes with a duplicate-key error. Future CRUD setup must ensure that index is ready and handle those errors. This step verifies the index definition only, without creating it in Atlas. See the [Mongoose validation guide](https://mongoosejs.com/docs/validation.html).

`server/test/agent.test.js` builds sample documents and calls `validate()` in memory. `validAgent()` supplies readable test data; `assert.rejects()` checks that invalid documents fail. The tests also inspect timestamp and index definitions. They import neither environment configuration nor startup code and require no live database or credentials.

## Environment configuration

Edit `server/.env` after copying `server/.env.example` only when needed. The template supplies safe `PORT=5000`, a clearly labelled MongoDB placeholder that must be replaced privately, and blank Redis configuration. It cannot connect until the MongoDB value is configured. The root `.env.example` remains a general planning template; the backend does not load a root `.env` or use its frontend placeholders.

| Variable | Purpose and validation |
| --- | --- |
| `PORT` | Required TCP port. Must contain decimal digits representing a whole number from 1 through 65535. It is converted from text to a number before the server listens. There is no silent fallback for a missing or invalid value. |
| `MONGODB_URI` | Required non-empty private MongoDB connection URI. Whitespace is trimmed and MongoDB's driver parser checks URI syntax, including standard and SRV formats, without connecting. Missing, blank, placeholder, and malformed values are rejected without printing them. Valid syntax does not prove that credentials or network access work; startup checks the real connection. |
| `REDIS_URL` | Optional private configuration reserved for Redis integration in Step 13. Leave blank now. Blank values become `undefined`; nonblank values are trimmed strings. Connection-string validation and connections are deferred to Step 13. |

`src/config/env.js` uses a path relative to its own location to load `server/.env`, even when Node starts from the repository root. Existing process variables take precedence over values in the file. A missing file is allowed when the process environment supplies valid `PORT` and `MONGODB_URI`; an unreadable file fails with a readable error. The loader validates before the HTTP listener starts and exports `env` for other modules. Only expected fields are exported. Error messages do not print submitted values or credentials.

This uses dotenv's explicit path and override options and Zod's schema parsing; see the [dotenv documentation](https://github.com/motdotla/dotenv#readme) and [Zod API documentation](https://zod.dev/api).

The root `.gitignore` already excludes `.env` and `.env.*` in subfolders and permits `.env.example`. No server-specific ignore file is needed. Never commit `.env` or put real credentials in example files. Browser environment variables are public and must never contain secrets.

If startup reports `PORT must be a whole number from 1 to 65535`, check `PORT` in `server/.env`: blank values, words, fractions, zero, negative values, and values above 65535 are rejected. A missing value produces the same instruction to set `PORT`. Existing PowerShell variables override the file. To remove unwanted overrides for the current terminal, use `Remove-Item Env:PORT -ErrorAction SilentlyContinue` or `Remove-Item Env:MONGODB_URI -ErrorAction SilentlyContinue`, without printing secret values. Restart the server after changing `.env`; watch mode tracks source files, so do not rely on it to reload the environment file. If a MongoDB syntax error occurs, replace the placeholder privately and check URI formatting; for connection failures use the Atlas troubleshooting guidance above. If the HTTP port is occupied, choose another free valid port or stop the conflicting process. For a file-read error, check permissions. Only Redis may remain absent or blank in this step.

## Backend files and request flow

- `server/package.json` describes the backend, declares its dependencies, and defines the `dev`, `start`, and `test` commands. `private: true` prevents accidental npm publication; `type: module` enables JavaScript `import` and `export`.
- `server/package-lock.json` records exact dependency versions, making future installs reproducible. This file belongs in Git; `node_modules/` does not.
- `server/.env.example` is the shareable backend template; the local `.env` copy is ignored by Git.
- `server/src/config/env.js` loads the file, then uses a Zod schema to describe allowed configuration. `safeParse()` returns validated data or validation issues. The port schema checks decimal text, converts it with `Number`, and enforces the TCP range. MongoDB URI syntax is required and checked by constructing a driver client without opening it. Optional Redis blanks normalize to `undefined`. Invalid configuration throws a readable error before the server can listen. The module exports only the validated `env` object.
- `server/src/config/db.js` exports `connectDatabase(uri)` and `disconnectDatabase()`. The startup code passes the validated URI. Connection failure logs a fixed message and rethrows the error for startup to handle; raw driver errors are never printed. Two module-level listeners report connection errors and closure without adding a listener on every call.
- `server/src/app.js` creates and exports the Express application without opening a network port. Middleware functions process requests in order: `express.json()`, the existing health route, the unchanged JSON 404 fallback, and the imported `errorHandler` last. The existing final handler was extracted rather than duplicated. No new production route was added in Step 6.
- `server/src/middleware/validateRequest.js` exports `validateRequest(schema, section)`. It checks a request section against a supplied Zod schema and passes failures to the shared error handler. Parsed data goes into `request.validated[section]` for route handlers to use.
- `server/src/middleware/errorHandler.js` is the sole final API error handler. It formats Zod/request validation errors, parser errors, and expected application errors; hides unexpected internal details; and delegates with `next(error)` if a response has already started.
- `server/src/utils/ApiError.js` defines `ApiError` for developer-controlled public application errors and `RequestValidationError` for internal Zod issues with their request-section label. Neither class writes an HTTP response; the central handler owns that job.
- `server/src/startup.js` exports `startServer()`, which awaits the database connection before listening and returns the HTTP server plus a reusable `shutdown()` function. Failure cleans up the database client. Tests substitute database functions while using the real Express app, so ordinary tests never require Atlas.
- `server/src/server.js` loads validated configuration, starts the application, and handles signals. An AbortController marks startup as cancelled during shutdown; it prevents a pending connection from subsequently opening HTTP. Startup failures produce a fixed safe message and non-zero exit. The shutdown deadline prevents hanging cleanup.
- `server/test/env.test.js` uses Node's built-in test runner and separate child processes to check configuration in isolation. `createFixture()` copies the real loader into a disposable folder; `runConfig()` starts it with controlled environment variables. Tests never overwrite the developer's real `.env`, and disposable files are removed after each test.
- `server/test/db.test.js` mocks Mongoose connection methods to verify success, failure propagation, reuse, and safe logs. `server/test/startup.test.js` checks database-before-HTTP ordering, real HTTP responses with mocked database readiness, failure cleanup, cancellation, occupied ports, and repeatable shutdown.
- `server/test/request-errors.test.js` uses isolated Express apps with test-only routes to exercise validation and error responses over HTTP. It also checks the already-sent-response guard directly. No test routes are added to the production app.

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

All responses retain the `success: false` / `message` envelope; only request-validation failures add `details`. After headers have been sent, the handler forwards the original error to Express without attempting another response. Database/startup failures remain in the existing startup code, outside this HTTP handler. Route-specific Agent schemas and database-error mappings belong to the later CRUD steps; neither live database behavior nor new endpoints are introduced here.

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

After review, the suggested Step 6 commit message for you to execute is:

```text
feat: add request validation and API errors
```
