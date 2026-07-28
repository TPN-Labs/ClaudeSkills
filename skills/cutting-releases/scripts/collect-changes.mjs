#!/usr/bin/env node
// collect-changes.mjs — deterministic release-range collector for the
// `cutting-releases` skill. Zero dependencies (Node built-ins + git only).
//
// It answers ONE question reliably: "what changed between the last release and
// now?" — so the human/agent authoring the changelog never has to eyeball a long
// commit list, miscount dependency bumps, or miss a Linear ticket buried in a
// commit body.
//
// It does NOT publish anything. No Slack, no GitHub release, no file writes.
// Those are the outward-facing steps the skill gates behind explicit approval.
//
// Usage:
//   node collect-changes.mjs [--base <ref>] [--head <ref>]
//                            [--workspace <slug>] [--repo <owner/repo>]
//
//   --base       Defaults to the highest semver tag reachable from HEAD.
//                On the FIRST release there is no tag yet, so it stays null and
//                the collector reports the whole history.
//   --head       Defaults to HEAD.
//   --workspace  Linear workspace slug for issue URLs (default: tpn-labs).
//   --repo       owner/repo for compare URLs (default: derived from origin).
//
// Output: a single JSON object on stdout (see buildReport).

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const FIELD = '\x1f'; // unit separator between commit fields
const SEP = '\x1e'; // record separator between commits

// --- pure parsing/grouping (ported from the retired deploy-notify action) ---

const HEADER_RE = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?!?:\s*(?<subject>.+?)\s*$/;
const PR_RE = /\s*\(#(\d+)\)\s*$/;
// Linear ticket refs look like ENG-123. Excludes doc refs like ADR-0001 that
// match the shape but aren't tickets — callers pass a project prefix filter.
const LINEAR_RE = /\b[A-Z]{2,}-\d+\b/g;
const NON_TICKET_PREFIXES = new Set(['ADR', 'RFC', 'PR', 'UTC', 'API', 'SQL', 'CSV', 'XLS']);
const DEPLOY_NOISE_RE = /^chore: promote (dev|prod|qa) images/i;
const BUMP_RE = /^bump\b/i;

/** @param {{sha:string, subject:string, body:string}} raw */
export function parseCommit(raw) {
  const header = HEADER_RE.exec(raw.subject);
  const type = header?.groups?.type?.toLowerCase() ?? null;
  const scope = header?.groups?.scope ?? null;
  let subject = header?.groups?.subject ?? raw.subject;

  const prMatch = PR_RE.exec(subject);
  const pr = prMatch ? Number(prMatch[1]) : null;
  if (prMatch) subject = subject.replace(PR_RE, '').trim();

  const haystack = `${raw.subject}\n${raw.body}`;
  const linearIds = [...new Set(haystack.match(LINEAR_RE) ?? [])].filter(
    (id) => !NON_TICKET_PREFIXES.has(id.split('-')[0]),
  );

  // Maintenance = dependency bumps. These are consistently `chore(deps*)` or a
  // bare "bump X from Y to Z" subject. We deliberately do NOT treat a commit as
  // maintenance just because the word "dependabot" appears in its body, or a
  // real feature (e.g. `feat(ENG-93): group AWS deps in Dependabot`) would be
  // hidden from the changelog.
  const isMaintenance =
    (type === 'chore' && (scope?.toLowerCase().startsWith('deps') ?? false)) ||
    (type !== 'feat' && type !== 'fix' && BUMP_RE.test(subject));

  const isDeployNoise = DEPLOY_NOISE_RE.test(raw.subject);

  return { sha: raw.sha, type, scope, subject, pr, linearIds, isMaintenance, isDeployNoise, raw };
}

/** @param {ReturnType<typeof parseCommit>[]} commits */
export function groupCommits(commits) {
  const features = [];
  const fixes = [];
  const other = [];
  let maintenanceCount = 0;
  const linearIds = new Set();

  for (const c of commits) {
    if (c.isDeployNoise) continue;
    c.linearIds.forEach((id) => linearIds.add(id));
    if (c.isMaintenance) {
      maintenanceCount++;
    } else if (c.type === 'feat') {
      features.push(c);
    } else if (c.type === 'fix') {
      fixes.push(c);
    } else {
      other.push(c);
    }
  }

  return { features, fixes, other, maintenanceCount, linearIds: [...linearIds] };
}

export function linearUrl(id, workspace) {
  return `https://linear.app/${workspace}/issue/${id}`;
}

/** Semver-ish comparison; highest first. Accepts optional leading `v`. */
export function compareSemverDesc(a, b) {
  const norm = (t) => t.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [a1, a2, a3] = norm(a);
  const [b1, b2, b3] = norm(b);
  return b1 - a1 || b2 - a2 || b3 - a3;
}

// --- git plumbing (thin wrappers so tests can inject a runner) ---

const defaultRun = (args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

export function getCommits(range, run = defaultRun) {
  const args = ['log', `--format=%H${FIELD}%s${FIELD}%b${SEP}`];
  if (range) args.push(range);
  const out = run(args);
  return out
    .split(SEP)
    .map((r) => r.replace(/^\n/, ''))
    .filter((r) => r.trim().length > 0)
    .map((r) => {
      const [sha, subject, body] = r.split(FIELD);
      return { sha: sha.trim(), subject: subject ?? '', body: (body ?? '').trim() };
    });
}

function latestSemverTag(run = defaultRun) {
  const out = run(['tag', '--list', '--merged', 'HEAD']).trim();
  const tags = out
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => /^v?\d+\.\d+\.\d+$/.test(t));
  tags.sort(compareSemverDesc);
  return tags[0] ?? null;
}

function repoFromOrigin(run = defaultRun) {
  try {
    const url = run(['remote', 'get-url', 'origin']).trim();
    const m = url.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    return m ? `${m[1]}/${m[2]}` : null;
  } catch {
    return null;
  }
}

// --- report assembly ---

function slim(c) {
  return { scope: c.scope, subject: c.subject, pr: c.pr, sha: c.sha.slice(0, 7), linearIds: c.linearIds };
}

export function buildReport({ base, head, headSha, repo, workspace, grouped, diffstat }) {
  const compareUrl = repo
    ? base
      ? `https://github.com/${repo}/compare/${base}...${headSha}`
      : `https://github.com/${repo}/commits/${headSha}`
    : null;
  return {
    base,
    head,
    headSha,
    repo,
    workspace,
    compareUrl,
    counts: {
      features: grouped.features.length,
      fixes: grouped.fixes.length,
      other: grouped.other.length,
      maintenance: grouped.maintenanceCount,
      total: grouped.features.length + grouped.fixes.length + grouped.other.length + grouped.maintenanceCount,
    },
    features: grouped.features.map(slim),
    fixes: grouped.fixes.map(slim),
    other: grouped.other.map(slim),
    linearIds: grouped.linearIds,
    linearLinks: grouped.linearIds.map((id) => ({ id, url: linearUrl(id, workspace) })),
    diffstat,
  };
}

function parseArgs(argv) {
  const get = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  return {
    base: get('base'),
    head: get('head') ?? 'HEAD',
    workspace: get('workspace') ?? 'tpn-labs',
    repo: get('repo'),
  };
}

function main(argv, run = defaultRun) {
  const args = parseArgs(argv);
  const base = args.base ?? latestSemverTag(run);
  const head = args.head;
  const headSha = run(['rev-parse', head]).trim();
  const repo = args.repo ?? repoFromOrigin(run);
  const range = base ? `${base}..${head}` : null;
  // First release: no base tag, so log the whole history OF `head` — not the
  // ambient HEAD. Passing `head` (not null) keeps `--head` authoritative.
  const logRef = range ?? head;

  const grouped = groupCommits(getCommits(logRef, run).map(parseCommit));
  const diffstat = range ? run(['diff', '--stat', range]).trim().split('\n').pop().trim() : null;

  const report = buildReport({ base, head, headSha, repo, workspace: args.workspace, grouped, diffstat });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2));
}
