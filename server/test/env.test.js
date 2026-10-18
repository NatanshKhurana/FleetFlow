import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const serverDirectory = fileURLToPath(new URL('../', import.meta.url));

function createFixture(t, fileContents) {
  // Use a disposable folder, never the developer's real server/.env.
  const directory = mkdtempSync(join(serverDirectory, '.env-test-'));
  t.after(() => {
    if (dirname(directory) !== serverDirectory.replace(/[\\/]$/, '') || !basename(directory).startsWith('.env-test-')) {
      throw new Error('Refusing to remove a fixture outside the server directory.');
    }
    rmSync(directory, { recursive: true, force: true });
  });

  mkdirSync(join(directory, 'src/config'), { recursive: true });
  copyFileSync(join(serverDirectory, 'src/config/env.js'), join(directory, 'src/config/env.js'));
  if (fileContents !== undefined) {
    writeFileSync(join(directory, '.env'), fileContents);
  }
  return directory;
}

function runConfig(directory, overrides = {}, cwd = directory) {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (['PORT', 'MONGODB_URI', 'REDIS_URL'].includes(key.toUpperCase())) {
      delete environment[key];
    }
  }

  const moduleUrl = pathToFileURL(join(directory, 'src/config/env.js'));
  const script = `import { env } from ${JSON.stringify(moduleUrl.href)}; console.log(JSON.stringify(env));`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd,
    env: { ...environment, ...overrides },
    encoding: 'utf8',
    timeout: 5000,
  });
}

test('loads .env independently of cwd; blank optional services do not block startup', (t) => {
  const directory = createFixture(t, 'PORT=5100\nMONGODB_URI=\nREDIS_URL=\n');
  const result = runConfig(directory, {}, serverDirectory);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { PORT: 5100 });
});

test('process PORT takes precedence over .env', (t) => {
  const directory = createFixture(t, 'PORT=5100\n');
  const result = runConfig(directory, { PORT: '5200' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).PORT, 5200);
});

test('missing .env is allowed with a valid process PORT, including TCP boundaries', (t) => {
  const directory = createFixture(t);
  for (const PORT of ['1', '65535']) {
    const result = runConfig(directory, { PORT });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { PORT: Number(PORT) });
  }
});

test('missing, blank, malformed, fractional, and out-of-range ports fail without leaking values', (t) => {
  const directory = createFixture(t);
  for (const PORT of [undefined, '', ' ', '0', '-1', '65536', '5000.5', '5e3', '0x1388', 'private-test-value']) {
    const result = runConfig(directory, PORT === undefined ? {} : { PORT });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid environment configuration/);
    assert.match(result.stderr, /PORT must be a whole number from 1 to 65535/);
    assert.doesNotMatch(result.stderr, /private-test-value/);
  }
});
