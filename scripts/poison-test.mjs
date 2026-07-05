#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname, sep } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

// ── Helpers ────────────────────────────────────────────────────

function walk(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue;
      try {
        const s = statSync(full);
        if (s.isDirectory()) files.push(...walk(full));
        else if (s.isFile() && s.size < 1_000_000 && SOURCE_EXTS.has(extname(entry))) files.push(full);
      } catch { /* skip unreadable */ }
    }
  } catch { /* skip unreadable dir */ }
  return files;
}

function readLines(file) {
  try {
    const content = readFileSync(file, 'utf-8');
    return content.split('\n');
  } catch {
    return [];
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Pattern Scanning Engine ────────────────────────────────────

function scanPatterns(files, patterns) {
  const findings = [];
  for (const file of files) {
    const lines = readLines(file);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of patterns) {
        if (p.excludeTestFiles && /\/test(s)?\//.test(file) && !/\/__tests__\//.test(file)) continue;
        if (p.regex instanceof RegExp && p.regex.test(line)) {
          findings.push({
            severity: p.severity || 'MEDIUM',
            section: p.section || 'scan',
            file: relative(ROOT, file),
            line: i + 1,
            message: p.name,
            match: line.trim().substring(0, 120),
          });
          if (!p.multi) break;
        }
      }
    }
  }
  return findings;
}

// ── Commented-out block detector ───────────────────────────────

function findCommentedBlocks(files) {
  const findings = [];
  for (const file of files) {
    const lines = readLines(file);
    let count = 0;
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        if (count === 0) start = i + 1;
        count++;
      } else {
        if (count >= 5) {
          findings.push({
            severity: 'LOW',
            section: 'debug',
            file: relative(ROOT, file),
            line: start,
            message: `Commented-out block (${count} lines)`,
          });
        }
        count = 0;
      }
    }
    if (count >= 5) {
      findings.push({
        severity: 'LOW',
        section: 'debug',
        file: relative(ROOT, file),
        line: start,
        message: `Commented-out block (${count} lines)`,
      });
    }
  }
  return findings;
}

// ── Subcommands ────────────────────────────────────────────────

function cmdSecrets() {
  const files = walk(join(ROOT, 'packages'));
  const patterns = [
    { name: 'API Key/Token hardcoded', regex: /(?:api[_-]?key|api[_-]?secret|bearer\s+['\"][a-zA-Z0-9]{8,}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xox[bp]-[a-zA-Z0-9]{10,})/i, severity: 'CRITICAL', section: 'secrets' },
    { name: 'Password/Connection String', regex: /(?:password|connection[_-]?string)\s*[:=]\s*['\"][^'\"]{4,}/i, severity: 'CRITICAL', section: 'secrets' },
    { name: 'Database URL', regex: /(?:postgres:\/\/|mysql:\/\/|mongodb:\/\/|redis:\/\/)[^\s'"]+/i, severity: 'CRITICAL', section: 'secrets' },
    { name: 'Private Key', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/, severity: 'CRITICAL', section: 'secrets' },
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'CRITICAL', section: 'secrets' },
  ];
  return scanPatterns(files, patterns);
}

function cmdDebug() {
  const files = walk(join(ROOT, 'packages'));
  const patterns = [
    { name: 'console.log in source', regex: /console\.(?:log|debug|warn|error)\s*\(/, severity: 'MEDIUM', section: 'debug', excludeTestFiles: true },
    { name: 'debugger statement', regex: /\bdebugger\b/, severity: 'HIGH', section: 'debug' },
    { name: 'it.only / describe.only', regex: /(?:it|describe)\.only\s*\(/, severity: 'CRITICAL', section: 'debug' },
    { name: 'TODO comment', regex: /\/\/\s*TODO|<!--\s*TODO/, severity: 'LOW', section: 'debug' },
    { name: 'FIXME comment', regex: /\/\/\s*FIXME|<!--\s*FIXME/, severity: 'LOW', section: 'debug' },
    { name: 'HACK comment', regex: /\/\/\s*HACK|<!--\s*HACK/, severity: 'LOW', section: 'debug' },
    { name: 'XXX comment', regex: /\/\/\s*XXX|<!--\s*XXX/, severity: 'LOW', section: 'debug' },
  ];
  const findings = scanPatterns(files, patterns);
  findings.push(...findCommentedBlocks(files));
  return findings;
}

function cmdInjection() {
  const files = walk(join(ROOT, 'packages'));
  const patterns = [
    { name: 'eval() call', regex: /\beval\s*\(/, severity: 'CRITICAL', section: 'injection' },
    { name: 'new Function()', regex: /new\s+Function\s*\(/, severity: 'CRITICAL', section: 'injection' },
    { name: 'setTimeout with string', regex: /setTimeout\s*\(\s*['"`]/, severity: 'HIGH', section: 'injection' },
    { name: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/, severity: 'HIGH', section: 'injection' },
    { name: 'innerHTML assignment', regex: /\.innerHTML\s*=/, severity: 'HIGH', section: 'injection' },
  ];
  return scanPatterns(files, patterns);
}

function cmdDeps() {
  const result = { audit: null, outdated: null, error: null };
  try {
    const auditOut = execSync('npm audit --omit=dev --json 2>/dev/null || true', { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    const auditJson = JSON.parse(auditOut);
    if (auditJson.metadata) {
      const { vulnerabilities } = auditJson.metadata;
      const total = Object.values(vulnerabilities).reduce((a, b) => a + b, 0);
      result.audit = total > 0 ? `Found ${total} vulnerabilities: ${JSON.stringify(vulnerabilities)}` : 'No vulnerabilities found';
    } else {
      const counts = {};
      for (const adv of Object.values(auditJson.advisories || {})) {
        counts[adv.severity] = (counts[adv.severity] || 0) + 1;
      }
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      result.audit = total > 0 ? `Found ${total} vulnerabilities: ${JSON.stringify(counts)}` : 'No vulnerabilities found';
    }
  } catch (e) {
    result.audit = `Audit failed: ${e.message}`;
  }

  try {
    const outdatedOut = execSync('npm outdated --json 2>/dev/null || true', { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (outdatedOut.trim()) {
      const outdatedJson = JSON.parse(outdatedOut);
      const entries = Object.entries(outdatedJson).map(([pkg, info]) => `${pkg}: current ${info.current}, wanted ${info.wanted}, latest ${info.latest}`);
      result.outdated = entries.length > 0 ? entries : 'All packages up to date';
    } else {
      result.outdated = 'All packages up to date';
    }
  } catch (e) {
    result.outdated = `Outdated check failed: ${e.message}`;
  }

  return result;
}

function cmdLint() {
  const result = { eslint: null, prettier: null, error: null };
  try {
    const out = execSync('npm run lint 2>&1 || true', { cwd: ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const lines = out.trim().split('\n').filter(l => l.includes('error') || l.includes('warning') || l.includes('✖') || l.includes('problem'));
    result.eslint = lines.length > 0 ? lines.join('; ') : 'No issues found';
  } catch (e) {
    result.eslint = `ESLint failed: ${e.message}`;
  }

  try {
    const out = execSync('npm run format:check 2>&1 || true', { cwd: ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const lines = out.trim().split('\n').filter(l => l.includes('would be') || l.includes('Code style') || l.includes('↑'));
    result.prettier = lines.length > 0 ? lines.join('; ') : 'All files formatted correctly';
  } catch (e) {
    result.prettier = `Prettier check failed: ${e.message}`;
  }

  return result;
}

// ── Main ────────────────────────────────────────────────────────

function main() {
  const cmd = process.argv[2] || 'all';
  const output = { summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }, findings: [] };

  const runAndCount = (fn) => {
    const result = fn();
    if (Array.isArray(result)) {
      for (const f of result) {
        output.findings.push(f);
        output.summary[f.severity] = (output.summary[f.severity] || 0) + 1;
      }
      return result;
    }
    return result;
  };

  switch (cmd) {
    case 'secrets':
      output.findings.push(...runAndCount(cmdSecrets));
      break;
    case 'debug':
      output.findings.push(...runAndCount(cmdDebug));
      break;
    case 'injection':
      output.findings.push(...runAndCount(cmdInjection));
      break;
    case 'deps':
      Object.assign(output, runAndCount(cmdDeps));
      break;
    case 'lint':
      Object.assign(output, runAndCount(cmdLint));
      break;
    case 'all':
      runAndCount(cmdSecrets);
      runAndCount(cmdDebug);
      runAndCount(cmdInjection);
      Object.assign(output, runAndCount(cmdDeps));
      Object.assign(output, runAndCount(cmdLint));
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error(`Usage: node scripts/poison-test.mjs <secrets|debug|injection|deps|lint|all>`);
      process.exit(1);
  }

  output.summary.TOTAL = Object.values(output.summary).reduce((a, b) => a + b, 0);
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main();
