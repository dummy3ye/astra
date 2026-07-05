#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const ROOT = process.cwd();

function checkTracked(file) {
  try {
    execSync(`git ls-files --error-unmatch "${file}" 2>/dev/null`, {
      cwd: ROOT,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function checkModified(file) {
  try {
    const out = execSync(`git status --porcelain "${file}" 2>/dev/null`, {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function checkDirtyRepo() {
  try {
    const out = execSync('git status --porcelain 2>/dev/null', {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    const lines = out.trim().split('\n').filter(Boolean);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.log(
      JSON.stringify({
        error: 'Usage: node scripts/coder-check.mjs <file-or-dir>',
      })
    );
    process.exit(1);
  }

  const result = {
    target,
    exists: existsSync(target),
    tracked: checkTracked(target),
    modified: false,
    dirtiness: null,
    warning: null,
  };

  if (result.exists && result.tracked) {
    result.modified = checkModified(target);
  }

  const dirtyFiles = checkDirtyRepo();
  if (dirtyFiles && dirtyFiles.length > 0) {
    result.dirtiness = dirtyFiles;
  }

  if (!result.tracked && result.exists) {
    result.warning = 'Not tracked by git — changes cannot be reverted easily';
  } else if (result.modified) {
    result.warning = 'File has uncommitted changes — may lose work';
  }

  if (dirtyFiles && dirtyFiles.length > 0) {
    result.warning =
      (result.warning ? result.warning + '; ' : '') +
      `Repo has ${dirtyFiles.length} uncommitted file(s)`;
  }

  // Recovery status
  result.recoverable = result.tracked && !result.modified;

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main();
