# FleetFlow

FleetFlow is a planned Delivery Agent Management System for creating, viewing, updating, and deleting delivery agent records through a dashboard backed by an API.

## Current setup status

**The basic Express backend is implemented and verified.** Delivery-agent functionality and the frontend have not been implemented yet.

- Step 1 is COMPLETE and committed locally as `0f170dc` (`chore: initialize FleetFlow project structure`).
- Step 2 is COMPLETE after development-server and start-script verification; its changes await review and remain uncommitted.
- Steps 3-30 are PENDING in `docs/STEP_PLAN.md`; their order, objectives, acceptance criteria, and suggested commits are preserved.
- The server exposes a health endpoint and consistent JSON error responses.
- Express is the only direct dependency. The development script uses Node's built-in watch mode.
- `client/` remains empty. There are no CRUD endpoints, authentication, database connections, or external services configured.
- Environment loading and validation belong to Step 3. `.env.example` still contains documentation placeholders only; do not copy those placeholder values into a running service.

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
|   |-- package.json         Server dependencies and commands
|   |-- package-lock.json    Exact resolved dependency versions
|   `-- src/
|       |-- app.js           Express routes and middleware
|       `-- server.js        Starts the HTTP server
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
npm run dev
```

`cd server` selects the backend package. `npm ci` installs the exact versions recorded in `package-lock.json`. `npm run dev` runs `node --watch src/server.js`, which starts the API and restarts it when source files change. Stop it with Ctrl+C. To run without automatic restarts, use `npm start` (`node src/server.js`). No build command is needed for this JavaScript backend.

Express 5.3.0 is the only direct dependency (`^5.3.0` in the manifest, with exact resolved versions in the lockfile). Node provides watch mode, so nodemon is not needed. The initial installation command was `npm install express` inside `server/`; `npm ci` above is the reproducible setup command for an existing checkout.

The server currently listens on port **5000**, defined in `src/server.js`. If that port is occupied, stop the conflicting process before starting the API. No `.env` file is required or loaded in this step. `.env.example` documents placeholders for later configuration. Browser environment variables are public and must never contain secrets.

## Backend files and request flow

- `server/package.json` describes the backend, declares Express, and defines the `dev` and `start` commands. `private: true` prevents accidental npm publication; `type: module` enables JavaScript `import` and `export`.
- `server/package-lock.json` records the exact installed versions of Express and its supporting packages, making future installs reproducible. This file belongs in Git; `node_modules/` does not.
- `server/src/app.js` creates and exports the Express application without opening a network port. Middleware functions process requests in order. `express.json()` reads JSON request bodies. The health route returns the response below; the following fallback sends JSON 404 responses for unmatched routes. The final four-parameter error middleware handles malformed JSON (400), oversized bodies (413), and unexpected failures (500). It avoids exposing internal errors to callers and delegates with `next(error)` if a response has already started.
- `server/src/server.js` imports the application and calls `app.listen()` to accept requests. Its startup callback prints the local address; its error listener prints a startup failure and exits unsuccessfully so failures such as an occupied port are visible.

The error middleware uses Express's four-parameter convention and runs last, as described in the [official Express error-handling guide](https://expressjs.com/en/guide/error-handling/). Node's [watch-mode documentation](https://nodejs.org/api/cli.html#--watch) explains the development runner.

## Health endpoint and errors

With the server running, check it from another PowerShell terminal:

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

Both verification servers were stopped with Ctrl+C afterward. No persistent automated test suite has been added; the checks above were live HTTP smoke checks. The unexpected-error 500 branch has been inspected but was not deliberately triggered. Database, Redis, CRUD, authentication, and frontend tests are outside this step.

After review and explicit approval, the suggested Step 2 commit message is:

```text
feat: set up Express server and health check
```
