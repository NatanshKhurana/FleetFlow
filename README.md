# FleetFlow

FleetFlow is a planned Delivery Agent Management System for creating, viewing, updating, and deleting delivery agent records through a dashboard backed by an API.

## Current setup status

The initial foundation files and empty application folders have been created. **Application implementation has not started yet.**

- Git has been initialized; there are no commits yet.
- `client/` and `server/` are empty folders reserved for future development.
- Development rules, ignore patterns, and a safe environment-variable template are present.
- `docs/STEP_PLAN.md` contains the exact agreed 30-step roadmap, with objectives, acceptance criteria, and suggested commits. All steps are initially PENDING, as requested.
- Step 1 foundation work is prepared for review. No later step has been started.
- No packages have been installed, no application source files exist, and no external services have been configured.
- There is no runnable application or application test suite yet.
- This foundation is awaiting review. No files have been staged and no commit has been created.

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
|-- server/                  Empty; future API server
|-- docs/
|   |-- DEVELOPMENT_RULES.md Permanent development rules
|   `-- STEP_PLAN.md         Roadmap and acceptance criteria
|-- README.md                Project overview and progress
|-- .gitignore               Files Git should ignore
`-- .env.example             Safe configuration placeholders
```

Git does not track empty folders. `client/` and `server/` exist locally and will appear in Git when a later approved step adds files to them.

## Development workflow

Before every future step, read [the development rules](docs/DEVELOPMENT_RULES.md) and [the step plan](docs/STEP_PLAN.md). Implement only the current step requested by the project owner. Update this README with actual progress and record the checks performed before requesting review.

Do not run installation or application setup commands for this foundation step. There are deliberately no package manifests or start commands yet. `.env.example` documents placeholder variable names only; actual environment setup belongs to a later step. Browser environment variables are public and must never contain secrets.

## Foundation verification

The foundation checks verify the five required files, the empty application folders, all 30 roadmap steps in order with PENDING statuses and required fields, safe environment placeholders, ignore patterns, whitespace, and an empty staging area. The files have also been inspected for accidental secrets and generated content. These are documentation and repository checks; no application tests or builds have been run because application implementation has not started.

After review and explicit approval, the suggested Step 1 commit message from the agreed roadmap is:

```text
chore: initialize FleetFlow project structure
```
