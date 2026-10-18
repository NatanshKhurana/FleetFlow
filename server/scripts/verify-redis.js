// Optional connectivity check: process configuration only, no .env or data writes.
import assert from 'node:assert/strict';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';

const url = process.env.FLEETFLOW_TEST_REDIS_URL?.trim();
if (!url) {
  console.error('Set FLEETFLOW_TEST_REDIS_URL privately in the process environment. No .env file is loaded.');
  process.exit(1);
}

const timeout = setTimeout(() => {
  console.error('Redis connectivity check timed out.');
  process.exit(1);
}, 8000);

try {
  const client = await connectRedis(url);
  assert.ok(client);
  assert.equal(await client.ping(), 'PONG');
  console.log('PASS real Redis: connected and PING returned PONG.');
} catch {
  console.error('Redis connectivity check failed. Check private configuration, permissions, and network access.');
  process.exitCode = 1;
} finally {
  await disconnectRedis();
  clearTimeout(timeout);
}
