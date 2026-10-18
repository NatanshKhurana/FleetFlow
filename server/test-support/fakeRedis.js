import assert from 'node:assert/strict';

// Test-local storage and clock; no Redis service, network, or real-time waits.
export function fakeRedis(t, { readError = false, writeError = false } = {}) {
  const entries = new Map();
  let now = 0;
  const client = {
    withCommandOptions: t.mock.fn((options) => {
      assert.deepEqual(options, { timeout: 1000 });
      return client;
    }),
    get: t.mock.fn(async (key) => {
      if (readError) throw new Error('fake-private-redis-read-details');
      const entry = entries.get(key);
      return entry && entry.expiresAt > now ? entry.value : null;
    }),
    set: t.mock.fn(async (key, value, options) => {
      if (writeError) throw new Error('fake-private-redis-write-details');
      assert.equal(options.expiration.type, 'EX');
      entries.set(key, { value, expiresAt: now + options.expiration.value * 1000 });
      return 'OK';
    }),
    advance(milliseconds) { now += milliseconds; },
    prime(key, value) { entries.set(key, { value, expiresAt: Infinity }); },
  };
  return client;
}
