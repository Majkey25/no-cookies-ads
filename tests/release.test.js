const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('release build has no write token and publication runs no project tooling', async () => {
  const { load } = await import('js-yaml-modern');
  const workflow = load(await fs.readFile(path.join(root, '.github/workflows/release.yml'), 'utf8'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.jobs.build.permissions, undefined);
  assert.equal(workflow.jobs.release.needs, 'build');
  assert.deepEqual(workflow.jobs.release.permissions, { contents: 'write' });
  for (const job of Object.values(workflow.jobs)) {
    for (const step of job.steps.filter(step => step.uses)) {
      assert.match(step.uses, /@[a-f0-9]{40}$/);
      if (step.uses.startsWith('actions/checkout@')) assert.equal(step.with['persist-credentials'], false);
    }
  }
  assert.doesNotMatch(workflow.jobs.release.steps.map(step => step.run || '').join('\n'), /npm|npx|node|playwright/);
  assert.equal(workflow.jobs.build.steps.find(step => step.uses?.startsWith('actions/upload-artifact@')).with.name,
    workflow.jobs.release.steps.find(step => step.uses?.startsWith('actions/download-artifact@')).with.name);
});

test('release publication preserves existing assets and propagates failures', async (t) => {
  const { load } = await import('js-yaml-modern');
  const workflow = load(await fs.readFile(path.join(root, '.github/workflows/release.yml'), 'utf8'));
  const steps = workflow.jobs.release.steps;
  const start = steps.findIndex(step => step.name === 'Create release when missing');
  assert.notEqual(start, -1);
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  const tag = `v${version}`;
  const scripts = steps.slice(start).map(step => step.run).join('\n')
    .replaceAll('${{ steps.version.outputs.version }}', version);
  const bash = process.platform === 'win32'
    ? path.resolve(execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim(), '../../..', 'bin/bash.exe')
    : 'bash';
  const temporary = path.join(root, '.reference/tmp');
  await fs.mkdir(temporary, { recursive: true });
  const directory = await fs.mkdtemp(path.join(temporary, 'release-'));
  try {
    const script = path.join(directory, 'publish.sh');
    const log = path.join(directory, 'calls.txt');
    await fs.writeFile(script, `gh() {
  printf '%s\\0' "$@" >> "$CALL_LOG"
  printf '\\n' >> "$CALL_LOG"
  case "$1 $2" in
    'release view') return "$VIEW_STATUS" ;;
    'release create') return "$CREATE_STATUS" ;;
    *) return 99 ;;
  esac
}
${scripts}`);
    const view = ['release', 'view', tag];
    const create = ['release', 'create', tag,
      'dist/release/no-cookies-ads.zip', `dist/release/no-cookies-ads-${tag}.zip`,
      '--target', 'tested-commit', '--title', `No Cookies & Ads ${tag}`,
      '--notes-file', 'RELEASE_NOTES.md'];
    for (const [name, viewStatus, createStatus, status] of [
      ['existing release', 0, 99, 0],
      ['new release', 1, 0, 0],
      ['creation fails', 1, 1, 1],
      ['lookup and creation fail', 4, 4, 4]
    ]) await t.test(name, async () => {
      await fs.writeFile(log, '');
      const result = spawnSync(bash, ['--noprofile', '--norc', '-eo', 'pipefail', script], {
        cwd: root,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
          TAG: tag, GITHUB_SHA: 'tested-commit', CALL_LOG: log,
          VIEW_STATUS: String(viewStatus), CREATE_STATUS: String(createStatus) },
        encoding: 'utf8'
      });
      assert.ifError(result.error);
      const calls = (await fs.readFile(log, 'utf8')).split('\n').filter(Boolean)
        .map(line => line.split('\0').slice(0, -1));
      assert.deepEqual(calls, viewStatus === 0 ? [view] : [view, create]);
      assert.equal(result.status, status, result.stderr);
    });
  } finally {
    assert.equal(path.dirname(directory), temporary);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
