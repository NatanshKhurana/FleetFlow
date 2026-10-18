import assert from 'node:assert/strict';
import { AGENT_CACHE_GENERATION_KEY } from '../src/services/agentCacheState.js';

// Test-local storage and clock; no Redis service, network, or real-time waits.
export function fakeRedis(t, { readError = false, writeError = false, generationWriteError = false, deleteError = false } = {}) {
  const entries = new Map();
  let now = 0;
  const client = {
    withCommandOptions: t.mock.fn((options) => {
      assert.deepEqual(options, { timeout: 1000 });
      // Separate metadata spies keep existing payload-read/write assertions focused.
      return {
        get: (key) => key === AGENT_CACHE_GENERATION_KEY ? client.generationGet(key) : client.get(key),
        set: (key, value, settings) => key === AGENT_CACHE_GENERATION_KEY
          ? client.generationSet(key, value, settings) : client.set(key, value, settings),
        del: (...args) => client.del(...args),
      };
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
    generationGet: t.mock.fn(async (key) => entries.get(key)?.value ?? null),
    generationSet: t.mock.fn(async (key, value, options) => {
      if (generationWriteError) throw new Error('fake-private-generation-error');
      if (options?.condition === 'NX' && entries.has(key)) return null;
      entries.set(key, { value, expiresAt: Infinity });
      return 'OK';
    }),
    del: t.mock.fn(async (key) => {
      if (deleteError) throw new Error('fake-private-delete-error');
      return Number(entries.delete(key));
    }),
    get generation() { return entries.get(AGENT_CACHE_GENERATION_KEY)?.value; },
    advance(milliseconds) { now += milliseconds; },
    prime(key, value) { entries.set(key, { value, expiresAt: Infinity }); },
  };
  return client;
}
