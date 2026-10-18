# FleetFlow step plan

This is the agreed 30-step roadmap. Steps 1-7 are **COMPLETE** after verification; Steps 8-30 remain **PENDING**. Steps 1-6 were committed as `0f170dc`, `e5ad3ec`, `ee4870c`, `9e814f5`, `4fa2766`, and `772929d`. Step 7 create-agent checks, all 40 automated tests, isolated Atlas persistence, and real startup passed; its changes await review and have not been committed. Commit messages are suggestions, not permission to commit automatically.

## Phase 1: Project Foundation and Backend Setup

### Step 1 — Initialize project structure
Status: COMPLETE

Objective: Create the repository structure, .gitignore, README.md, .env.example, docs/DEVELOPMENT_RULES.md, and docs/STEP_PLAN.md.

Acceptance criteria: Clean structure, safe environment placeholders, permanent development rules, and the complete 30-step plan.

Commit: chore: initialize FleetFlow project structure

### Step 2 — Configure Express backend
Status: COMPLETE

Objective: Set up the Express application, server entry point, health-check endpoint, and basic error handling.

Acceptance criteria: Server starts successfully and the health endpoint returns a valid response.

Commit: feat: set up Express server and health check

### Step 3 — Configure environment variables
Status: COMPLETE

Objective: Add environment variable loading, validation, and secret protection.

Acceptance criteria: Required configuration is documented, .env is ignored by Git, and missing configuration is handled clearly.

Commit: chore: configure environment variables

### Step 4 — Connect MongoDB
Status: COMPLETE

Objective: Configure Mongoose and connect to MongoDB Atlas.

Acceptance criteria: Connection works with valid credentials and failures are reported clearly.

Commit: feat: connect application to MongoDB

### Step 5 — Create Agent model
Status: COMPLETE

Objective: Define agentId, fullName, phone, email, serviceArea, status, createdAt, and updatedAt.

Acceptance criteria: Schema validation, timestamps, unique identifiers, and appropriate uniqueness constraints are implemented.

Commit: feat: define delivery agent data model

### Step 6 — Add API validation and error handling
Status: COMPLETE

Objective: Introduce Zod request validation and centralized error handling.

Acceptance criteria: Invalid requests receive consistent JSON errors and appropriate HTTP status codes.

Commit: feat: add request validation and API errors

## Phase 2: CRUD API

### Step 7 — Create agent API
Status: COMPLETE

Objective: Implement POST /api/agents.

Acceptance criteria: Valid agents are saved, IDs are generated safely, invalid input is rejected, and duplicate records are handled.

Commit: feat: implement agent creation endpoint

### Step 8 — List agents API
Status: PENDING

Objective: Implement GET /api/agents with pagination, search, and status/service-area filters.

Acceptance criteria: Results and pagination metadata are correct, with validated query parameters.

Commit: feat: implement agent listing endpoint

### Step 9 — Get individual agent
Status: PENDING

Objective: Implement GET /api/agents/:id.

Acceptance criteria: Existing agents are returned and malformed or missing IDs are handled appropriately.

Commit: feat: add single agent details endpoint

### Step 10 — Update agent API
Status: PENDING

Objective: Implement PATCH /api/agents/:id.

Acceptance criteria: Partial updates work, immutable fields cannot be changed, validation is enforced, and updatedAt changes.

Commit: feat: implement agent update endpoint

### Step 11 — Delete agent API
Status: PENDING

Objective: Implement DELETE /api/agents/:id.

Acceptance criteria: Existing records are deleted with 204 No Content; missing records return 404.

Commit: feat: implement agent deletion endpoint

### Step 12 — Verify CRUD APIs
Status: PENDING

Objective: Test all five endpoints using Postman and/or automated integration tests.

Acceptance criteria: Successful requests, validation errors, duplicate records, and missing records are verified.

Commit: test: verify agent CRUD API flows

## Phase 3: Redis Caching

### Step 13 — Connect Redis
Status: PENDING

Objective: Configure the Redis client and connection lifecycle.

Acceptance criteria: Redis connectivity is verified and connection failures are handled gracefully.

Commit: feat: integrate Redis client

### Step 14 — Cache agent list
Status: PENDING

Objective: Implement cache-aside caching for GET /api/agents.

Acceptance criteria: Cache hits and misses work, JSON serialization is correct, and entries expire after 60 seconds.

Commit: feat: cache agent list responses in Redis

### Step 15 — Cache individual agent details
Status: PENDING

Objective: Cache GET /api/agents/:id using agent-specific cache keys.

Acceptance criteria: Individual agent responses are cached, expire correctly, and missing records are handled properly.

Commit: feat: cache individual agent responses

### Step 16 — Implement cache invalidation
Status: PENDING

Objective: Invalidate affected cache keys after successful create, update, and delete operations.

Acceptance criteria: Agent list and individual detail caches cannot continue serving known stale data after successful mutations.

Commit: fix: invalidate stale agent cache entries

### Step 17 — Verify Redis consistency
Status: PENDING

Objective: Test cache hit/miss behaviour, expiry, invalidation, and Redis failure scenarios.

Acceptance criteria: Cache behaviour is verified and Redis outages do not unnecessarily prevent database-backed CRUD operations.

Commit: test: verify Redis caching and consistency

## Phase 4: React Frontend

### Step 18 — Set up React frontend
Status: PENDING

Objective: Configure Vite, React Router, Tailwind CSS, Axios, and the frontend entry point.

Acceptance criteria: Frontend starts successfully and the agreed dependencies are configured.

Commit: feat: set up React dashboard application

### Step 19 — Build dashboard layout
Status: PENDING

Objective: Create a responsive sidebar, header, navigation, and reusable UI components.

Acceptance criteria: Consistent dashboard layout works on desktop, tablet, and mobile.

Commit: feat: build responsive admin dashboard layout

### Step 20 — Build dashboard overview
Status: PENDING

Objective: Show total agents, active agents, inactive agents, and recent agents.

Acceptance criteria: Dashboard statistics come from real API data, not hardcoded sample counts.

Commit: feat: add agent dashboard overview

### Step 21 — Build All Agents page
Status: PENDING

Objective: Create the agent table with search, filters, pagination, and View/Edit/Delete actions.

Acceptance criteria: Data comes from the API and loading, empty, and error states are handled.

Commit: feat: build searchable agent management table

### Step 22 — Build Add Agent form
Status: PENDING

Objective: Create the form for adding a delivery agent.

Acceptance criteria: Required fields, status selection, client-side validation, submission feedback, and API error handling work.

Commit: feat: add delivery agent creation form

### Step 23 — Build Agent Details page
Status: PENDING

Objective: Show an individual agent's details and timestamps.

Acceptance criteria: Details are fetched from the API and missing records display an appropriate error state.

Commit: feat: add agent details view

### Step 24 — Build Edit and Delete flows
Status: PENDING

Objective: Implement the prefilled edit form and delete confirmation dialog.

Acceptance criteria: Updates persist, deletions require confirmation, and the UI refreshes after mutations.

Commit: feat: add agent editing and deletion UI

## Phase 5: Integration, Quality, and Submission

### Step 25 — Integrate frontend and backend
Status: PENDING

Objective: Connect all frontend operations through reusable Axios service functions.

Acceptance criteria: Create, list, detail, update, and delete flows work end to end.

Commit: feat: integrate dashboard with agent APIs

### Step 26 — Improve feedback and error states
Status: PENDING

Objective: Add loading indicators, empty states, readable API errors, duplicate submission prevention, and responsive polish.

Acceptance criteria: Users receive clear feedback for success, failure, and loading states.

Commit: fix: improve dashboard feedback and error states

### Step 27 — Complete automated tests
Status: PENDING

Objective: Add or finalize tests for CRUD, validation, and Redis behaviour.

Acceptance criteria: Tests cover normal operations and important edge cases, and actual test results are documented.

Commit: test: cover CRUD validation and cache edge cases

### Step 28 — Complete evaluator-facing README
Status: PENDING

Objective: Document setup, architecture, database choice, environment variables, APIs, Redis caching, invalidation, and testing.

Acceptance criteria: A reviewer can follow the instructions to configure and run the project without guessing.

Commit: docs: complete project setup and API documentation

### Step 29 — Final verification and bug fixes
Status: PENDING

Objective: Run a clean-install/build check, CRUD smoke tests, Git checks, and secret checks.

Acceptance criteria: Critical flows pass, issues are fixed where possible, and any unresolved problems are disclosed.

Commit: fix: resolve final integration issues

### Step 30 — Prepare GitHub submission
Status: PENDING

Objective: Finalize project status documentation, push the verified repository, and verify reviewer access. Deployment is optional if time permits.

Acceptance criteria: Repository is accessible, README is accurate, setup requirements are documented, and no secrets are committed.

Commit: docs: finalize project submission instructions

## Global rules for all 30 steps

1. Read docs/DEVELOPMENT_RULES.md and docs/STEP_PLAN.md before each step.
2. Work only on the current step and preserve existing working code.
3. Use readable, beginner-friendly JavaScript with simple functions and descriptive names.
4. Explain important files, functions, dependencies, and non-obvious code in simple language.
5. Update README.md at the end of every step with accurate progress and relevant documentation.
6. Test each step before marking it complete. Never claim unrun tests passed.
7. Do not create Git commits automatically. First provide the suggested message and wait for my explicit approval.
8. Never commit secrets, .env files, credentials, or generated dependencies.
9. Mark a step COMPLETE only when its acceptance criteria are satisfied. Otherwise mark it BLOCKED or IN PROGRESS and explain why.
10. Do not force meaningless commits when verification produces no code changes.
11. Keep the project scope limited to the agreed delivery-agent management requirements.
12. At the end of each step, report changed files, tests and their actual results, README changes, a beginner-friendly explanation, unresolved issues, and the suggested commit message.
