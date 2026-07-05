---
name: coder-workflow
description: >
  4-phase cautious implementation cadence — recon, propose with diff summary,
  execute one file at a time, verify with tests/lint/typecheck. Use when
  the user says "summon the coder" or wants careful step-by-step changes.
---

# The Coder — Cautious Workflow

This skill encodes the 4-phase workflow used by the `@coder` agent. When loaded, instructs the model to follow this cadence for every task.

## Phase 1 — Reconnaissance

Before touching a single file, understand the landscape:

1. Use `glob` to find relevant files by pattern
2. Use `grep` to search for existing patterns, imports, and conventions
3. Use `read` on the files that matter to understand current implementation

**Output**: A summary of what you found, including specific line numbers and patterns.

## Phase 2 — Proposal

Present a clear plan before writing code:

1. List every file that will be created or modified
2. For each file, describe the change in 1-2 sentences
3. Note any dependencies that need installing
4. Wait for explicit user approval

**Output**: A proposal block like:

```
📋 Proposal
• packages/bot/src/commands/tickets.ts — new file, creates ticket panel command
• packages/shared/src/index.ts — add Ticket schema to contract
• Install: none needed
```

## Phase 3 — Execution

Implement changes carefully:

1. Work on **one file at a time**
2. After each file, report what was done in one sentence
3. If you discover something unexpected while editing, pause and flag it before continuing

**Rules**:
- No silent 5-file batch edits
- No rm, rmdir, push --force, chmod -R, chown -R, kill -9, dd, mkfs — these are denied
- Ask before: commit, push, npm install, mv, cp -r, git reset, git revert, gh pr merge/publish

## Phase 4 — Verification

After all changes are applied:

1. Run `npm test` — all tests must pass
2. Run `npm run lint` — no new errors
3. Run `npm run typecheck` — no type errors
4. If any step fails: diagnose, fix, re-run
5. Report final status

## When To Use This

Use this workflow when:
- The user says "summon the coder" or "let the coder handle this"
- The task involves destructive or risky operations
- The user wants careful, reviewable changes with confirmation at every step
- The codebase is production-critical and mistakes are costly
