---
name: poison-tester
description: >
  Runs comprehensive security, lint, and quality checks on the codebase.
  Scans for leaked secrets, hardcoded credentials, dependency vulnerabilities,
  injection vectors, auth gaps, and other critical issues. Use ONLY when the
  user asks for a security audit, pre-deployment check, or "poison test".
---

# Poison Tester

## Quick Start

```bash
node scripts/poison-test.mjs all
```

This runs all automated checks at once and outputs structured JSON. Parse the output and format findings by severity.

## Data Flow

1. **Automated (script)** — `node scripts/poison-test.mjs <subcommand>` handles pattern-matching checks. Parse its JSON output.
2. **Reasoning (model tools)** — Use `glob`, `grep`, `read`, and `bash` for analysis that requires judgment (auth gaps, error handling, CSP headers, input validation, config exposure).

---

## Section 1 — Secrets & Credential Leaks (Automated)

Run:

```bash
node scripts/poison-test.mjs secrets
```

This scans all source files in `packages/` for hardcoded API keys, passwords, connection strings, private keys, and AWS keys. Parse the JSON output and report findings as CRITICAL.

Then verify the VSCode settings and git history manually:

- Use `bash` to run `git log --all --diff-filter=A -- '.vscode/settings.json'` — check if secrets were ever committed
- Use `read` on `.vscode/settings.json` if it exists

---

## Section 2 — Dependency Vulnerabilities (Automated)

Run:

```bash
node scripts/poison-test.mjs deps
```

This runs `npm audit --omit=dev` and `npm outdated` in one step. Parse the JSON output. Flag HIGH or CRITICAL vulns. Note packages many major versions behind.

---

## Section 3 — Lint Quality (Automated)

Run:

```bash
node scripts/poison-test.mjs lint
```

This runs ESLint and Prettier check. Parse the JSON output and summarize.

---

## Section 4 — Debug & Leftover Code (Automated)

Run:

```bash
node scripts/poison-test.mjs debug
```

Detects `console.log` (non-test), `debugger`, `it.only`/`describe.only`, TODO/FIXME/HACK/XXX, and 5+ line commented-out blocks. Parse the JSON output. Flag `it.only` as CRITICAL, `debugger` as HIGH, `console.log` as MEDIUM, rest as LOW.

---

## Section 5 — Injection Vectors (Automated)

Run:

```bash
node scripts/poison-test.mjs injection
```

Scans for `eval()`, `new Function()`, `setTimeout` with string arg, `dangerouslySetInnerHTML`, and `innerHTML` assignments. Parse the JSON output. Flag eval/Function as CRITICAL, the rest as HIGH.

---

## Section 6 — Auth & Authorization Gaps (Model-Driven)

Use model tools — no script needed.

- Use `glob` to find API route files: `packages/dashboard/src/api/**/*.ts`
- Use `grep` to check for auth guards or permission checks
- Use `glob` to find bot command files: `packages/bot/src/commands/**/*.ts`
- Use `grep` to find `permissions.has`, `ManageMessages`, `Administrator` checks
- Use `read` on suspicious files to confirm

Flag routes/commands missing auth guards as HIGH. Flag admin commands without hierarchy checks as MEDIUM.

---

## Section 7 — Error Handling (Model-Driven)

- Use `grep` to find `.catch\(` patterns — look for empty handlers like `.catch(() => {})` or `.catch(() => undefined)` — flag as MEDIUM
- Use `grep` to find `try` blocks, then `read` to check for empty catch blocks — flag as MEDIUM
- Use `grep` to check for error handler middleware in Express: `app.use(` with `(err,` — flag as HIGH if missing
- Use `grep` to check for `unhandledRejection` handler — flag as LOW if missing

---

## Section 8 — Input Validation (Model-Driven)

- Use `glob` to find API route files
- Use `grep` to find Zod schema usage or TsRest body types: `c.body(`, `.parse(`, `z.object`
- Use `grep` on bot command files to find command option type constraints
- Flag routes/commands without validation as MEDIUM

---

## Section 9 — Configuration Exposure (Model-Driven)

- Use `bash` to check gitignore: `git check-ignore .env .env.local dev.db`
- Use `grep` to find hardcoded config values like `port`, `host`, `databaseUrl` in source files
- Check if `.env.example` has real secrets or placeholders — `read packages/bot/.env.example`
- Flag hardcoded configs as MEDIUM

---

## Section 10 — CSP & Security Headers (Model-Driven)

- Use `glob` to find `index.html` files — `read` them and check for `<meta http-equiv="Content-Security-Policy"`
- Use `grep` to find Express `helmet`, `cors`, or custom header middleware
- Use `read` on the Express app setup file to inspect middleware chain
- Flag missing security headers as MEDIUM

---

## Reporting

After all checks complete, output a summary:

```markdown
## Poison Test Results

### CRITICAL (must fix before deploy)

- ...

### HIGH

- ...

### MEDIUM

- ...

### LOW

- ...

### Passed Checks

- [x] Secrets scan — no leaks found
- [x] Dependency audit — all clear
- ...
```
