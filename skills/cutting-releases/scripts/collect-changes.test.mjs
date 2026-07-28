// Run: node --test '.claude/skills/cutting-releases/scripts/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCommit,
  groupCommits,
  compareSemverDesc,
  getCommits,
  buildReport,
  linearUrl,
} from './collect-changes.mjs';

test('parseCommit extracts type, scope, PR and strips them from the subject', () => {
  const c = parseCommit({ sha: 'abc123', subject: 'feat(ENG-67): interactive match graph (#292)', body: '' });
  assert.equal(c.type, 'feat');
  assert.equal(c.scope, 'ENG-67');
  assert.equal(c.pr, 292);
  assert.equal(c.subject, 'interactive match graph');
  assert.deepEqual(c.linearIds, ['ENG-67']);
});

test('parseCommit finds Linear IDs in the body and dedupes across subject+body', () => {
  const c = parseCommit({ sha: 'd', subject: 'fix(ENG-62): data loss', body: 'relates to ENG-62 and ENG-63' });
  assert.deepEqual(c.linearIds, ['ENG-62', 'ENG-63']);
});

test('parseCommit flags chore(deps*) and bare bumps as maintenance', () => {
  assert.equal(parseCommit({ sha: '1', subject: 'chore(deps): bump pg-boss from 9.0.3 to 12.26.2 (#292)', body: '' }).isMaintenance, true);
  assert.equal(parseCommit({ sha: '2', subject: 'chore(deps-dev): bump the dev-dependencies group (#287)', body: '' }).isMaintenance, true);
  assert.equal(parseCommit({ sha: '4', subject: 'feat(ENG-67): interactive match graph', body: '' }).isMaintenance, false);
});

test('parseCommit does NOT hide a real feature that merely mentions Dependabot/deps', () => {
  // Regression: feat(ENG-93): group AWS deps in Dependabot ... was wrongly
  // swept into maintenance because the body/subject contained "Dependabot".
  const c = parseCommit({ sha: '9', subject: 'feat(ENG-93): group AWS deps in Dependabot + auto-deploy (#288)', body: '' });
  assert.equal(c.isMaintenance, false);
  assert.equal(c.type, 'feat');
  assert.deepEqual(c.linearIds, ['ENG-93']);
});

test('parseCommit filters non-ticket refs like ADR-0001 out of linearIds', () => {
  const c = parseCommit({ sha: 'x', subject: 'docs: Qdrant deployment design', body: 'See ADR-0024 and ENG-63' });
  assert.deepEqual(c.linearIds, ['ENG-63']);
});

test('parseCommit flags promote-image commits as deploy noise', () => {
  assert.equal(parseCommit({ sha: '1', subject: 'chore: promote prod images 2026.07.01', body: '' }).isDeployNoise, true);
  assert.equal(parseCommit({ sha: '2', subject: 'chore: Deploy changes to dev (#313)', body: '' }).isDeployNoise, false);
});

test('groupCommits buckets features/fixes/other, counts maintenance, dedupes Linear IDs, drops noise', () => {
  const parsed = [
    { sha: '1', subject: 'feat: admin explorer diagnostics', body: '' },
    { sha: '2', subject: 'feat(ENG-67): interactive match graph (#292)', body: '' },
    { sha: '3', subject: 'fix(ENG-62): data loss (#287)', body: 'ENG-62' },
    { sha: '4', subject: 'chore(deps): bump pg-boss (#310)', body: '' },
    { sha: '5', subject: 'docs: Qdrant deployment design (#269)', body: '' },
    { sha: '6', subject: 'chore: promote prod images 2026.07.01', body: '' },
  ].map(parseCommit);

  const g = groupCommits(parsed);
  assert.equal(g.features.length, 2);
  assert.equal(g.fixes.length, 1);
  assert.equal(g.other.length, 1); // the docs commit
  assert.equal(g.maintenanceCount, 1);
  assert.deepEqual(g.linearIds, ['ENG-67', 'ENG-62']); // noise commit excluded, deduped
});

test('compareSemverDesc sorts highest-first and tolerates a leading v', () => {
  const tags = ['1.0.5', '1.1.0', '1.1.1', 'v1.0.10'];
  tags.sort(compareSemverDesc);
  assert.equal(tags[0], '1.1.1');
  assert.equal(tags[tags.length - 1], '1.0.5');
});

test('getCommits parses the field/record-separated git log via an injected runner', () => {
  const F = '\x1f';
  const S = '\x1e';
  const fakeLog = `abc${F}feat(ENG-1): a${F}body one${S}\ndef${F}fix: b${F}${S}\n`;
  const commits = getCommits('1.0.0..HEAD', () => fakeLog);
  assert.equal(commits.length, 2);
  assert.equal(commits[0].sha, 'abc');
  assert.equal(commits[0].subject, 'feat(ENG-1): a');
  assert.equal(commits[0].body, 'body one');
  assert.equal(commits[1].sha, 'def');
});

test('buildReport shapes counts, compare URL, and Linear links', () => {
  const grouped = groupCommits(
    [
      { sha: 'aaaaaaa', subject: 'feat(ENG-9): x (#10)', body: '' },
      { sha: 'bbbbbbb', subject: 'chore(deps): bump y', body: '' },
    ].map(parseCommit),
  );
  const r = buildReport({
    base: '1.0.0',
    head: 'HEAD',
    headSha: 'deadbeefcafef00d',
    repo: 'TPN-Labs/AnuntReal',
    workspace: 'tpn-labs',
    grouped,
    diffstat: '2 files changed',
  });
  assert.equal(r.counts.features, 1);
  assert.equal(r.counts.maintenance, 1);
  assert.equal(r.counts.total, 2);
  assert.equal(r.compareUrl, 'https://github.com/TPN-Labs/AnuntReal/compare/1.0.0...deadbeefcafef00d');
  assert.deepEqual(r.linearLinks, [{ id: 'ENG-9', url: 'https://linear.app/tpn-labs/issue/ENG-9' }]);
});

test('buildReport builds a commits URL (not compare) when there is no base tag — the first release', () => {
  const grouped = groupCommits([{ sha: 'aaaaaaa', subject: 'feat(ENG-1): first', body: '' }].map(parseCommit));
  const r = buildReport({
    base: null,
    head: 'HEAD',
    headSha: 'deadbeefcafef00d',
    repo: 'TPN-Labs/AnuntReal',
    workspace: 'tpn-labs',
    grouped,
    diffstat: null,
  });
  assert.equal(r.compareUrl, 'https://github.com/TPN-Labs/AnuntReal/commits/deadbeefcafef00d');
});

test('linearUrl builds workspace-scoped issue URLs', () => {
  assert.equal(linearUrl('ENG-70', 'tpn-labs'), 'https://linear.app/tpn-labs/issue/ENG-70');
});
