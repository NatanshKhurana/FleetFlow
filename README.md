# FleetFlow

FleetFlow is a planned Delivery Agent Management System for creating, viewing, updating, and deleting delivery agent records through a dashboard backed by an API.

## Current setup status

**The Express backend and validated environment configuration are implemented and verified.** Delivery-agent functionality and the frontend have not been implemented yet.

- Step 1 is COMPLETE and committed locally as `0f170dc` (`chore: initialize FleetFlow project structure`).
- Step 2 is COMPLETE and committed locally as `e5ad3ec` (`feat: set up Express server and health check`).
- Step 3 is COMPLETE after verification; its changes await review and remain uncommitted.
- Steps 4-30 are PENDING in `docs/STEP_PLAN.md`; their order, objectives, acceptance criteria, and suggested commits are preserved.
- The server exposes a health endpoint and consistent JSON error responses.
- Express, dotenv, and Zod are the direct dependencies. The development script uses Node's built-in watch mode.
- `client/` remains empty. There are no CRUD endpoints, authentication, database connections, or external services configured.
- The backend loads `server/.env` and validates configuration before listening. `server/.env.example` provides a safe local port and blank future-service fields. No service credentials are required yet.

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

The agreed scope includes creating, listing, viewing, updating, and deleting delivery agents; searching and filtering agents by status and service area; paginated results; and dashboard totals for active, inactive, and recent agents. Agent records will include agentId, fullName, phone, email, serviceArea, status, createdAt, and updatedAt. Validation, clear error states, responsive forms and tables, and Redis caching with expiry and invalidation will support these workflows. All of these capabilities are planned and have not been implemented.

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
|   |   `-- config/
|   |       `-- env.js       Loads and validates backend configuration
|   `-- test/
|       `-- env.test.js      Configuration regression tests
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
npm run dev
```

`cd server` selects the backend package. `npm ci` installs the exact versions recorded in `package-lock.json`. The PowerShell `if` command copies the safe template only if `.env` does not already exist, preserving any local settings. `npm run dev` runs `node --watch src/server.js`, which starts the API and restarts it when source files change. Stop it with Ctrl+C. To run without automatic restarts, use `npm start` (`node src/server.js`). Run `npm test` (`node --test`) for configuration regression tests. No build command is needed for this JavaScript backend.

Direct dependencies are Express 5.3.0, dotenv 18.0.8, and Zod 4.6.7, with exact resolved versions in the lockfile. Express serves requests, dotenv reads the environment file, and Zod checks configuration. Node provides watch mode and tests, so no nodemon or test dependency is needed. Step 3 used `npm install dotenv zod` inside `server/`; `npm ci` above is the reproducible setup command for an existing checkout.

## Environment configuration

Edit `server/.env` after copying `server/.env.example`. The template runs locally with `PORT=5000` and blank service fields. The root `.env.example` remains a general planning template; the backend does not load a root `.env` or use its frontend placeholders.

| Variable | Purpose and validation |
| --- | --- |
| `PORT` | Required TCP port. Must contain decimal digits representing a whole number from 1 through 65535. It is converted from text to a number before the server listens. There is no silent fallback for a missing or invalid value. |
| `MONGODB_URI` | Optional private configuration reserved for MongoDB integration in Step 4. Leave blank now. Blank values become `undefined`; nonblank values are trimmed strings. Connection-string validation and connections are deferred to Step 4. |
| `REDIS_URL` | Optional private configuration reserved for Redis integration in Step 13. Leave blank now. Blank values become `undefined`; nonblank values are trimmed strings. Connection-string validation and connections are deferred to Step 13. |

`src/config/env.js` uses a path relative to its own location to load `server/.env`, even when Node starts from the repository root. Existing process variables take precedence over values in the file. A missing file is allowed when the process environment supplies a valid `PORT`; an unreadable file fails with a readable error. The loader validates before the HTTP listener starts and exports `env` for other modules. Only expected fields are exported. Error messages do not print submitted values or credentials.

This uses dotenv's explicit path and override options and Zod's schema parsing; see the [dotenv documentation](https://github.com/motdotla/dotenv#readme) and [Zod API documentation](https://zod.dev/api).

The root `.gitignore` already excludes `.env` and `.env.*` in subfolders and permits `.env.example`. No server-specific ignore file is needed. Never commit `.env` or put real credentials in example files. Browser environment variables are public and must never contain secrets.

If startup reports `PORT must be a whole number from 1 to 65535`, check `PORT` in `server/.env`: blank values, words, fractions, zero, negative values, and values above 65535 are rejected. A missing value produces the same instruction to set `PORT`. An existing PowerShell `$env:PORT` overrides the file; inspect that setting if your file changes appear ineffective. To remove an unwanted override for the current terminal, run `Remove-Item Env:PORT -ErrorAction SilentlyContinue`. Restart the server after changing `.env`; watch mode tracks source files, so do not rely on it to reload the environment file. If startup instead reports an occupied port, choose another free valid port or stop the conflicting process. For a file-read error, check the file's permissions. MongoDB and Redis fields may remain absent or blank in this step.

## Backend files and request flow

- `server/package.json` describes the backend, declares its dependencies, and defines the `dev`, `start`, and `test` commands. `private: true` prevents accidental npm publication; `type: module` enables JavaScript `import` and `export`.
- `server/package-lock.json` records exact dependency versions, making future installs reproducible. This file belongs in Git; `node_modules/` does not.
- `server/.env.example` is the shareable backend template; the local `.env` copy is ignored by Git.
- `server/src/config/env.js` first loads the file, then uses a Zod schema to describe allowed configuration. `safeParse()` returns either validated data or validation issues. The port schema checks decimal text, converts it with `Number`, and enforces the TCP range. Optional service fields normalize blank strings to `undefined`. Invalid configuration throws a readable error before the server can listen. The module exports only the validated `env` object.
- `server/src/app.js` creates and exports the Express application without opening a network port. Middleware functions process requests in order. `express.json()` reads JSON request bodies. The health route returns the response below; the following fallback sends JSON 404 responses for unmatched routes. The final four-parameter error middleware handles malformed JSON (400), oversized bodies (413), and unexpected failures (500). It avoids exposing internal errors to callers and delegates with `next(error)` if a response has already started.
- `server/src/server.js` imports the application and validated `env`, then calls `app.listen(env.PORT)` to accept requests. Its startup callback prints the local address; its error listener prints a startup failure and exits unsuccessfully so failures such as an occupied port are visible.
- `server/test/env.test.js` uses Node's built-in test runner and separate child processes to check configuration in isolation. `createFixture()` copies the real loader into a disposable folder; `runConfig()` starts it with controlled environment variables. Tests never overwrite the developer's real `.env`, and disposable files are removed after each test.

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

Other errors use the same `success: false` and `message` fields. Malformed JSON returns `Invalid JSON request body` (400); a body exceeding the JSON parser's default 100 KB limit returns `Request body is too large` (413); unexpected failures return `Internal server error` (500). This is basic error handling only; Zod request validation remains scheduled for Step 6.

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

After review and explicit approval, the suggested Step 3 commit message is:

```text
chore: configure environment variables
```
