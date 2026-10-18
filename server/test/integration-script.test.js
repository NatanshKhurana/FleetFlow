import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('optional CRUD script requires explicit process configuration without loading .env or connecting', () => {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase() === 'FLEETFLOW_TEST_MONGODB_URI') delete environment[key];
  }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/verify-crud.js', import.meta.url))], {
    env: environment, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Set FLEETFLOW_TEST_MONGODB_URI privately/);
  assert.match(result.stderr, /No \.env file is loaded/);
  assert.doesNotMatch(result.stderr, /mongodb:\/\/|mongodb\+srv:\/\/|stack/);
});

test('optional Redis check requires explicit process configuration without loading .env', () => {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase() === 'FLEETFLOW_TEST_REDIS_URL') delete environment[key];
  }
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/verify-redis.js', import.meta.url))], {
    env: environment, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Set FLEETFLOW_TEST_REDIS_URL privately/);
  assert.match(result.stderr, /No \.env file is loaded/);
});
