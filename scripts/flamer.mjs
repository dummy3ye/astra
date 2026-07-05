#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname, sep } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'coverage',
  '.next',
  'build',
]);
const SOURCE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);
const GENERIC_COMMIT_RE =
  /^(fix|update|stuff|wip|oops|asd|test|minor|cleanup|refactor|change|hack|tmp|temp|foo|bar|done|progress|initial|first|start|added|updated|fixed|removed|changed|working|checkpoint|save|commit|more|misc|meh|idk|whatever|shit|crap|blah|wtf|lol|nice|ok|new)$/i;

function walk(dir, exts = SOURCE_EXTS) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue;
      try {
        const s = statSync(full);
        if (s.isDirectory()) files.push(...walk(full, exts));
        else if (s.isFile() && s.size < 1_000_000 && exts.has(extname(entry)))
          files.push(full);
      } catch {
        /* skip unreadable */
      }
    }
  } catch {
    /* skip unreadable dir */
  }
  return files;
}

function readLines(file) {
  try {
    return readFileSync(file, 'utf-8').split('\n');
  } catch {
    return [];
  }
}

function readJSON(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function analyzePackages() {
  const findings = [];
  const packagesDir = join(ROOT, 'packages');
  if (!existsSync(packagesDir)) {
    findings.push({
      category: 'error',
      severity: 'LOW',
      title: 'No packages directory',
      detail: 'No packages/ directory found at project root.',
    });
    return { findings, packages: [] };
  }

  const pkgDirs = readdirSync(packagesDir).filter((d) => {
    try {
      return statSync(join(packagesDir, d)).isDirectory();
    } catch {
      return false;
    }
  });

  const packages = [];
  const allDeps = {};

  for (const dir of pkgDirs) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = readJSON(pkgPath);
    if (!pkg) continue;

    packages.push({ name: dir, path: `packages/${dir}`, pkg });

    for (const depType of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ]) {
      const deps = pkg[depType] || {};
      for (const [name, ver] of Object.entries(deps)) {
        if (!allDeps[name]) allDeps[name] = {};
        allDeps[name][dir] = ver;
      }
    }
  }

  for (const [dep, versions] of Object.entries(allDeps)) {
    const uniqueVersions = [...new Set(Object.values(versions))];
    if (uniqueVersions.length > 1) {
      const detail = Object.entries(versions)
        .map(([pkg, ver]) => `${pkg}: ${ver}`)
        .join(', ');
      findings.push({
        category: 'deps',
        severity: 'CRITICAL',
        title: `${dep} version mismatch`,
        detail: `${dep} has different versions across packages: ${detail}`,
      });
    }
  }

  for (const p of packages) {
    const dir = p.name;
    const pkg = p.pkg;

    if (!pkg.scripts?.test && !pkg.scripts?.['test:run']) {
      findings.push({
        category: 'script',
        severity: 'MEDIUM',
        title: `Missing test script`,
        detail: `${dir} has no test script in package.json`,
        files: [`packages/${dir}/package.json`],
      });
    }
    if (!pkg.scripts?.lint) {
      findings.push({
        category: 'script',
        severity: 'LOW',
        title: `Missing lint script`,
        detail: `${dir} has no lint script in package.json`,
        files: [`packages/${dir}/package.json`],
      });
    }
    if (!pkg.scripts?.build) {
      findings.push({
        category: 'script',
        severity: 'HIGH',
        title: `Missing build script`,
        detail: `${dir} has no build script in package.json`,
        files: [`packages/${dir}/package.json`],
      });
    }
    if (!pkg.scripts?.typecheck && !pkg.scripts?.['type-check']) {
      findings.push({
        category: 'script',
        severity: 'LOW',
        title: `Missing typecheck script`,
        detail: `${dir} has no typecheck script in package.json`,
        files: [`packages/${dir}/package.json`],
      });
    }
  }

  return {
    findings,
    packages: packages.map((p) => ({ name: p.name, path: p.path })),
  };
}

function analyzeSourceFiles(packages) {
  const findings = [];
  const allFiles = [];
  const fileSizes = [];

  for (const p of packages) {
    const pkgPath = join(ROOT, p.path);
    const srcDir = join(pkgPath, 'src');
    if (!existsSync(srcDir)) continue;

    const files = walk(srcDir);
    for (const f of files) {
      const lines = readLines(f);
      const relPath = relative(ROOT, f);
      allFiles.push({ path: relPath, lines: lines.length, pkg: p.name });
      fileSizes.push({ path: relPath, lines: lines.length, pkg: p.name });
    }
  }

  fileSizes.sort((a, b) => b.lines - a.lines);

  for (const f of fileSizes) {
    if (f.lines > 300) {
      findings.push({
        category: 'bloat',
        severity: 'MEDIUM',
        title: `Bloated file: ${f.lines} lines`,
        detail: `${f.path} is ${f.lines} lines (threshold: 300). That's not a file, it's a manuscript.`,
        files: [f.path],
      });
    }
  }

  if (fileSizes.length > 0) {
    const top3 = fileSizes.slice(0, 3);
    const detail = top3.map((f) => `${f.path} (${f.lines} lines)`).join(', ');
    findings.push({
      category: 'bloat',
      severity: 'LOW',
      title: `Top 3 largest files`,
      detail,
    });
  }

  const emptyFiles = fileSizes.filter((f) => f.lines === 0);
  if (emptyFiles.length > 0) {
    findings.push({
      category: 'bloat',
      severity: 'LOW',
      title: `Empty files found`,
      detail: `${emptyFiles.length} source file(s) are completely empty.`,
      files: emptyFiles.map((f) => f.path),
    });
  }

  return {
    findings,
    totalSourceFiles: allFiles.length,
    totalLines: allFiles.reduce((s, f) => s + f.lines, 0),
  };
}

function scanTodos(packages) {
  const findings = [];
  const todoRE = /\/\/\s*(TODO|FIXME|HACK|XXX)/g;
  const counts = { TODO: 0, FIXME: 0, HACK: 0, XXX: 0 };
  const files = [];

  for (const p of packages) {
    const pkgPath = join(ROOT, p.path);
    const srcDir = join(pkgPath, 'src');
    if (!existsSync(srcDir)) continue;
    const srcFiles = walk(srcDir);
    for (const f of srcFiles) {
      const lines = readLines(f);
      for (let i = 0; i < lines.length; i++) {
        todoRE.lastIndex = 0;
        const match = todoRE.exec(lines[i]);
        if (match) {
          const type = match[1];
          counts[type] = (counts[type] || 0) + 1;
          if (!files.includes(relative(ROOT, f))) files.push(relative(ROOT, f));
        }
      }
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    const detail = Object.entries(counts)
      .filter(([_, c]) => c > 0)
      .map(([t, c]) => `${c} ${t}`)
      .join(', ');
    findings.push({
      category: 'todos',
      severity: total > 10 ? 'MEDIUM' : 'LOW',
      title: `Leftover markers found`,
      detail: `${total} marker(s) found across ${files.length} file(s): ${detail}`,
      files,
    });
  }

  return findings;
}

function analyzeGit() {
  const findings = [];

  try {
    execSync('git rev-parse --git-dir 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    findings.push({
      category: 'git',
      severity: 'LOW',
      title: 'No git history',
      detail: 'Not a git repository or git is not available.',
    });
    return findings;
  }

  try {
    const logOut = execSync('git log --oneline --all 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const commits = logOut.trim().split('\n').filter(Boolean);
    if (commits.length === 0) {
      findings.push({
        category: 'git',
        severity: 'LOW',
        title: 'Empty git history',
        detail: 'Repository has no commits.',
      });
      return findings;
    }

    const authorOut = execSync('git shortlog -sn --all 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const authors = authorOut.trim().split('\n').filter(Boolean).length;

    const messages = commits.map((c) => c.replace(/^[a-f0-9]+\s+/, ''));
    const genericCount = messages.filter(
      (m) => GENERIC_COMMIT_RE.test(m.trim()) || m.trim().length < 10
    ).length;

    const msgPreview = messages
      .slice(0, 5)
      .map((m) => `"${m.trim()}"`)
      .join(', ');

    if (commits.length < 10) {
      findings.push({
        category: 'git',
        severity: 'MEDIUM',
        title: `Sparse git history`,
        detail: `Only ${commits.length} commit(s) across ${authors} author(s). Recent: ${msgPreview}.`,
      });
    }

    if (genericCount > 0 && genericCount / commits.length > 0.3) {
      findings.push({
        category: 'git',
        severity: 'MEDIUM',
        title: `Generic commit messages`,
        detail: `${genericCount}/${commits.length} (${Math.round((genericCount / commits.length) * 100)}%) commit messages are generic or too short. Recent: ${msgPreview}.`,
      });
    }

    if (authors === 1 && commits.length > 3) {
      findings.push({
        category: 'git',
        severity: 'LOW',
        title: `Solo project`,
        detail: `All ${commits.length} commits by a single author. Either you're a lone wolf or your team doesn't commit.`,
      });
    }
  } catch {
    findings.push({
      category: 'git',
      severity: 'LOW',
      title: 'Git analysis failed',
      detail: 'Could not analyze git history.',
    });
  }

  return findings;
}

function analyzeTestRatio(packages, totalSourceFiles) {
  const findings = [];
  let testFiles = 0;

  for (const p of packages) {
    const pkgPath = join(ROOT, p.path);
    const srcDir = join(pkgPath, 'src');
    if (!existsSync(srcDir)) continue;

    const testExts = new Set([
      '.test.ts',
      '.test.tsx',
      '.spec.ts',
      '.spec.tsx',
      '.test.js',
      '.test.jsx',
      '.spec.js',
      '.spec.jsx',
    ]);
    const allFiles = walk(
      srcDir,
      new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
    );
    for (const f of allFiles) {
      const ext = extname(f);
      const name = f.toLowerCase();
      if (
        testExts.has(ext) ||
        name.includes('__tests__') ||
        name.includes('.test.') ||
        name.includes('.spec.')
      ) {
        testFiles++;
      }
    }
  }

  if (totalSourceFiles === 0) return findings;

  const ratio = testFiles / totalSourceFiles;
  const pct = Math.round(ratio * 100);

  if (testFiles === 0) {
    findings.push({
      category: 'testing',
      severity: 'CRITICAL',
      title: 'Zero test files',
      detail: `No test files found among ${totalSourceFiles} source files. Test coverage: ${pct}%.`,
    });
  } else if (ratio < 0.1) {
    findings.push({
      category: 'testing',
      severity: 'HIGH',
      title: 'Low test coverage',
      detail: `${testFiles} test file(s) for ${totalSourceFiles} source file(s) (${pct}%). That's not coverage, that's a suggestion.`,
    });
  } else if (ratio < 0.25) {
    findings.push({
      category: 'testing',
      severity: 'MEDIUM',
      title: 'Moderate test coverage',
      detail: `${testFiles} test file(s) for ${totalSourceFiles} source file(s) (${pct}%). Getting warmer.`,
    });
  } else if (ratio < 0.5) {
    findings.push({
      category: 'testing',
      severity: 'LOW',
      title: 'Decent test coverage',
      detail: `${testFiles} test file(s) for ${totalSourceFiles} source file(s) (${pct}%). Not bad, but room to grow.`,
    });
  }

  return findings;
}

function analyzePrisma(packages) {
  const findings = [];

  for (const p of packages) {
    const schemaPath = join(ROOT, p.path, 'prisma', 'schema.prisma');
    if (!existsSync(schemaPath)) continue;

    const lines = readLines(schemaPath);
    const modelCount = lines.filter((l) =>
      l.trim().startsWith('model ')
    ).length;
    const ignoredFields = lines.filter((l) =>
      l.trim().startsWith('@ignore')
    ).length;

    if (lines.length > 200) {
      findings.push({
        category: 'schema',
        severity: 'MEDIUM',
        title: 'Large Prisma schema',
        detail: `${p.name}'s schema.prisma is ${lines.length} lines with ${modelCount} models. That's a lot of tables for a Discord bot.`,
        files: [`${p.path}/prisma/schema.prisma`],
      });
    }

    if (ignoredFields > 0) {
      findings.push({
        category: 'schema',
        severity: 'LOW',
        title: 'Ignored Prisma fields',
        detail: `${p.name} has ${ignoredFields} @ignore'd field(s). Cleaning up the schema graveyard?`,
        files: [`${p.path}/prisma/schema.prisma`],
      });
    }

    if (modelCount > 0) {
      findings.push({
        category: 'schema',
        severity: 'LOW',
        title: `Prisma schema: ${modelCount} models`,
        detail: `${p.name} defines ${modelCount} Prisma model(s) in ${lines.length} lines.`,
        files: [`${p.path}/prisma/schema.prisma`],
      });
    }
  }

  return findings;
}

function analyzeConfigs(packages) {
  const findings = [];

  const rootFiles = readdirSync(ROOT).filter((f) => {
    try {
      return statSync(join(ROOT, f)).isFile();
    } catch {
      return false;
    }
  });

  const expected = ['.env.example', '.env', 'tsconfig.json'];
  const found = {};
  for (const f of rootFiles) {
    const lower = f.toLowerCase();
    if (lower === '.env.example' || lower === '.env') found[f] = true;
    if (lower === 'tsconfig.json') found['tsconfig.json'] = true;
  }

  if (!found['.env'] && !found['.env.example']) {
    findings.push({
      category: 'config',
      severity: 'LOW',
      title: 'No .env files',
      detail: 'No .env or .env.example found at project root.',
    });
  }

  for (const p of packages) {
    const pkgFiles = readdirSync(join(ROOT, p.path)).filter((f) => {
      try {
        return statSync(join(ROOT, p.path, f)).isFile();
      } catch {
        return false;
      }
    });
    if (!pkgFiles.some((f) => f === 'tsconfig.json')) {
      findings.push({
        category: 'config',
        severity: 'MEDIUM',
        title: `Missing tsconfig.json`,
        detail: `${p.name} has no tsconfig.json. TypeScript without config is like a car without wheels.`,
        files: [`${p.path}/tsconfig.json`],
      });
    }
    if (
      !pkgFiles.some(
        (f) => f.toLowerCase() === 'dockerfile' || f.startsWith('Dockerfile')
      )
    ) {
      // not all packages need Docker
    }
  }

  return findings;
}

function main() {
  const args = process.argv.slice(2);
  let targetPackage = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--package' && args[i + 1]) {
      targetPackage = args[i + 1];
      i++;
    }
  }

  const startTime = Date.now();
  const output = {
    project: {
      name: basename(ROOT),
      packages: [],
      totalSourceFiles: 0,
      totalLines: 0,
    },
    findings: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      analyzedPackages: [],
      duration: 0,
    },
  };

  try {
    const { findings: pkgFindings, packages } = analyzePackages();
    output.findings.push(...pkgFindings);

    let filteredPackages = packages;
    if (targetPackage) {
      filteredPackages = packages.filter((p) => p.name === targetPackage);
      if (filteredPackages.length === 0) {
        output.findings.push({
          category: 'error',
          severity: 'LOW',
          title: `Package not found`,
          detail: `Package '${targetPackage}' not found in packages/. Available: ${packages.map((p) => p.name).join(', ') || 'none'}`,
        });
      }
    }

    output.project.packages = packages.map((p) => p.name);
    output.metadata.analyzedPackages = filteredPackages.map((p) => p.name);

    const srcResult = analyzeSourceFiles(filteredPackages);
    output.findings.push(...srcResult.findings);
    output.project.totalSourceFiles = srcResult.totalSourceFiles;
    output.project.totalLines = srcResult.totalLines;

    output.findings.push(...scanTodos(filteredPackages));
    output.findings.push(...analyzeGit());
    output.findings.push(
      ...analyzeTestRatio(filteredPackages, srcResult.totalSourceFiles)
    );
    output.findings.push(...analyzePrisma(filteredPackages));
    output.findings.push(...analyzeConfigs(filteredPackages));
  } catch (e) {
    output.findings.push({
      category: 'error',
      severity: 'LOW',
      title: 'Script error',
      detail: `Unexpected error: ${e.message}`,
    });
  }

  output.metadata.duration = (Date.now() - startTime) / 1000;
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

import { basename } from 'path';
main();
