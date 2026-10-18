# FleetFlow development rules

These rules apply to every future development step. Read this file and `docs/STEP_PLAN.md` before making changes.

## Scope and step discipline

1. Implement only the current step requested by the project owner. Keep the scope limited to the agreed delivery-agent management requirements. Do not start later steps, add unrelated features, install unrequested packages, or configure unrequested external services.
2. Check the current project files and Git status first. Preserve existing work and never discard changes without authorization.
3. Use the agreed stack: React + Vite, Tailwind CSS, React Router, Axios, Node.js, Express, Zod, MongoDB, Mongoose, and Redis. Discuss changes to the stack before adopting them.
4. If the agreed roadmap or a requirement is missing, request it. Do not invent a replacement roadmap or change the agreed 30-step plan.

## Beginner-friendly JavaScript

5. Write simple, readable JavaScript. Prefer familiar language features and straightforward control flow over clever shortcuts or unnecessary abstractions.
6. Use descriptive names for variables, functions, components, and files. Avoid unexplained abbreviations.
7. Keep functions small and focused on one job. Split a function when its responsibilities become difficult to explain or test.
8. Keep file organization clear. Put browser code in `client/`, server code in `server/`, and project guidance in `docs/`. Group related files as the application grows; do not create unused layers in advance.
9. Explain important files, functions, dependencies, code, and design choices in beginner-friendly language. Add comments where they explain intent, assumptions, or non-obvious behavior; avoid comments that only repeat the code.
10. Keep configuration separate from business logic. Never commit secrets, real credentials, private connection strings, generated output, or dependency folders. Keep `.env.example` safe to share and update its placeholders when configuration changes.

## Verification and documentation

11. Test before declaring a step complete. Run the checks appropriate to the change and satisfy that step's acceptance criteria. For documentation-only work, inspect the documents and Git changes; do not invent application tests or install packages just to run checks.
12. At the end of each step, report changed files, the checks actually run and their results, README changes, a beginner-friendly explanation, unresolved issues, and the suggested commit message. State anything that could not be verified. Resolve relevant failures before claiming completion.
13. Update `README.md` after every step with accurate setup progress, implemented features, relevant usage instructions, and limitations. Clearly distinguish planned work from working functionality.
14. Maintain the step status in `docs/STEP_PLAN.md`. Keep every step PENDING at initial setup, as requested. In later work, mark a step COMPLETE only when its acceptance criteria are satisfied. Otherwise mark it BLOCKED or IN PROGRESS and explain why.

## Review and Git commits

15. Prepare a meaningful Conventional Commit for every completed step that changes files. Use a message that describes the actual change, such as `feat: define delivery agent data model` or `docs: clarify development setup`. Do not force meaningless commits when verification produces no code changes.
16. Before staging or committing, inspect the changed files and Git status. Check that secrets, dependencies, build output, logs, and other generated files are excluded. Inspect the staged diff if files are staged.
17. Do not automatically create a commit. Present the completed changes, verification results, and suggested commit message for the project owner's review. Create the step's commit only after explicit approval. If approval is pending, say so and leave the changes uncommitted.
18. Never amend published history, force-push, delete user work, or publish changes without authorization.
