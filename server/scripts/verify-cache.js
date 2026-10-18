// Opt-in real Redis check. Never loads .env, connects MongoDB, or touches API cache keys.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRedisConnection } from '../src/config/redis.js';
import { createAgentCacheState, agentDetailCacheKey } from '../src/services/agentCacheState.js';
import { createAgentListCache } from '../src/services/agentListCache.js';
import { createAgentDetailCache } from '../src/services/agentDetailCache.js';

const url = process.env.FLEETFLOW_TEST_REDIS_URL?.trim();
if (!url) {
  console.error('Set FLEETFLOW_TEST_REDIS_URL privately. No .env file is loaded.');
  process.exit(1);
}

const prefix = 'fleetflow:verification:' + randomUUID() + ':';
const keys = new Set();
const connection = createRedisConnection();
const timeout = setTimeout(() => {
  console.error('Cache verification timed out. Disposable payloads expire; metadata cleanup may be needed.');
  process.exit(1);
}, 15000);

function scopedClient(client) {
  function key(name) {
    const scoped = prefix + name;
    keys.add(scoped);
    return scoped;
  }
  return {
    withCommandOptions(options) {
      const commands = client.withCommandOptions(options);
      return {
        get: (name) => commands.get(key(name)),
        set: (name, value, settings) => commands.set(key(name), value, settings),
        del: (name) => commands.del(key(name)),
      };
    },
  };
}

try {
  const client = await connection.connect(url);
  assert.ok(client);
  const scoped = scopedClient(client);
  const options = { getClient: () => scoped };
  const state = createAgentCacheState(options);
  const lists = createAgentListCache({ ...options, state });
  const details = createAgentDetailCache({ ...options, state });
  const query = { page: 1, limit: 10 };
  const id = '000000000000000000000001';
  const list = { success: true, message: 'Agents retrieved successfully', data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  const detail = { success: true, message: 'Agent retrieved successfully', data: {
    id, agentId: 'VERIFY-ONLY', fullName: 'Disposable Cache Check', phone: '123',
    email: 'verify@example.com', serviceArea: 'Test', status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  } };
  const generation = (await lists.read(query)).generation;
  assert.ok(generation);
  assert.equal((await details.read(id)).response, null);
  await lists.write(query, list, 1, generation);
  await details.write(id, detail, 1, generation);
  assert.deepEqual((await lists.read(query)).response, list);
  assert.deepEqual((await details.read(id)).response, detail);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal((await lists.read(query)).response, null);
  assert.equal((await details.read(id)).response, null);
  await lists.write(query, list, 60, generation);
  await details.write(id, detail, 60, generation);
  await state.invalidate(id);
  assert.equal(state.canWrite, true);
  assert.notEqual(await state.readGeneration(), generation);
  assert.equal((await lists.read(query)).response, null);
  assert.equal((await details.read(id)).response, null);
  assert.equal(await scoped.withCommandOptions({ timeout: 1000 }).get(agentDetailCacheKey(id)), null);
  // A late fill still carries its original generation and must remain unusable.
  await lists.write(query, list, 60, generation);
  await details.write(id, detail, 60, generation);
  assert.equal((await lists.read(query)).response, null);
  assert.equal((await details.read(id)).response, null);
  console.log('PASS real Redis: cache hits/misses, expiry, generation invalidation, detail deletion, and late-fill rejection.');
} catch {
  console.error('Cache verification failed. Check private configuration, permissions, and network access.');
  process.exitCode = 1;
} finally {
  try {
    // Only keys explicitly created/read by this UUID-scoped run can be removed.
    if (connection.client && keys.size) {
      await connection.client.withCommandOptions({ timeout: 1000 }).del([...keys]);
    }
  } catch {
    console.error('Disposable cache cleanup failed; metadata may remain in the verification namespace.');
    process.exitCode = 1;
  } finally {
    await connection.disconnect();
    clearTimeout(timeout);
  }
}
