import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const serverDirectory = fileURLToPath(new URL('../', import.meta.url));
const testUri = 'mongodb://127.0.0.1:27017/fleetflow_test';

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
    if (['PORT', 'MONGODB_URI', 'REDIS_URL', 'AGENT_LIST_CACHE_TTL_SECONDS'].includes(key.toUpperCase())) {
      delete environment[key];
    }
  }

  const moduleUrl = pathToFileURL(join(directory, 'src/config/env.js'));
  const script = `import { env } from ${JSON.stringify(moduleUrl.href)}; console.log(JSON.stringify(env));`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd,
    env: { ...environment, MONGODB_URI: testUri, ...overrides },
    encoding: 'utf8',
    timeout: 5000,
  });
}

test('loads .env independently of cwd; blank Redis remains optional', (t) => {
  const directory = createFixture(t, `PORT=5100\nMONGODB_URI=${testUri}\nREDIS_URL=\n`);
  const result = runConfig(directory, { MONGODB_URI: undefined }, serverDirectory);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { PORT: 5100, MONGODB_URI: testUri, AGENT_LIST_CACHE_TTL_SECONDS: 60 });
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
    assert.deepEqual(JSON.parse(result.stdout), { PORT: Number(PORT), MONGODB_URI: testUri, AGENT_LIST_CACHE_TTL_SECONDS: 60 });
  }
});

test('missing, blank, placeholder, or malformed MongoDB URI fails without exposing values', (t) => {
  const directory = createFixture(t);
  for (const MONGODB_URI of [undefined, '', ' ', 'REPLACE_WITH_YOUR_PRIVATE_MONGODB_ATLAS_URI', 'https://private-test-value', 'mongodb://']) {
    const result = runConfig(directory, { PORT: '5000', MONGODB_URI });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /MONGODB_URI must be a valid, non-empty MongoDB connection URI/);
    assert.doesNotMatch(result.stderr, /private-test-value/);
  }
});

test('MongoDB SRV syntax is accepted without contacting the database', (t) => {
  const directory = createFixture(t);
  const result = runConfig(directory, { PORT: '5000', MONGODB_URI: 'mongodb+srv://cluster.example.com/fleetflow_test' });
  assert.equal(result.status, 0, result.stderr);
});

test('optional Redis configuration stays absent when missing or blank and trims a supplied URL', (t) => {
  const directory = createFixture(t);
  for (const REDIS_URL of [undefined, '', '   ', ' redis://127.0.0.1:6379/0 ']) {
    const result = runConfig(directory, { PORT: '5000', REDIS_URL });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).REDIS_URL, REDIS_URL?.trim() || undefined);
  }
});

test('cache TTL uses its default, validates bounds, and respects process overrides', (t) => {
  const directory = createFixture(t, 'AGENT_LIST_CACHE_TTL_SECONDS=120\n');
  for (const value of [undefined, '1', '300', '86400']) {
    const result = runConfig(directory, { PORT: '5000', ...(value === undefined ? {} : { AGENT_LIST_CACHE_TTL_SECONDS: value }) });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).AGENT_LIST_CACHE_TTL_SECONDS, value === undefined ? 120 : Number(value));
  }
  for (const value of ['', '0', '-1', '1.5', '86401', 'private-test-value']) {
    const result = runConfig(directory, { PORT: '5000', AGENT_LIST_CACHE_TTL_SECONDS: value });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /AGENT_LIST_CACHE_TTL_SECONDS must be a whole number from 1 to 86400/);
    assert.doesNotMatch(result.stderr, /private-test-value/);
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
