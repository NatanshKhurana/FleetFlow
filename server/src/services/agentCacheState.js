import { randomUUID } from 'node:crypto';
import { getRedisClient } from '../config/redis.js';

export const AGENT_CACHE_GENERATION_KEY = 'fleetflow:agents:cache:v2:generation';

export function agentDetailCacheKey(id) {
  return 'fleetflow:agents:detail:v2:' + id.toLowerCase();
}

// A command-queue timeout alone does not bound a stalled server response.
export async function cacheCommand(client, operation, timeout = 1000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(client.withCommandOptions({ timeout: 1000 }))),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Cache command timed out')), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function createAgentCacheState({ getClient = getRedisClient, logger = console } = {}) {
  let bypass = false;
  let invalidations = 0;
  let failures = 0;

  async function readGeneration() {
    if (bypass || invalidations > 0) return null;
    try {
      const client = getClient();
      if (!client) return null;
      let generation = await cacheCommand(client, (redis) => redis.get(AGENT_CACHE_GENERATION_KEY));
      if (generation === null) {
        // Never reuse a default generation after Redis eviction or a restart.
        const candidate = randomUUID();
        await cacheCommand(client, (redis) => redis.set(AGENT_CACHE_GENERATION_KEY, candidate, { condition: 'NX' }));
        generation = await cacheCommand(client, (redis) => redis.get(AGENT_CACHE_GENERATION_KEY));
      }
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(generation)) return null;
      return bypass || invalidations > 0 ? null : generation;
    } catch {
      logger.warn('Agent cache generation read failed. Using MongoDB.');
      return null;
    }
  }

  async function invalidate(id) {
    const failuresAtStart = failures;
    invalidations++;
    try {
      const client = getClient();
      if (!client) { bypass = true; failures++; return; }
      // Constant work: no KEYS, SCAN, collection-wide deletion, or retry loop.
      // Both operations are attempted even if one fails.
      const results = await Promise.allSettled([
        cacheCommand(client, (redis) => redis.set(AGENT_CACHE_GENERATION_KEY, randomUUID())),
        cacheCommand(client, (redis) => redis.del(agentDetailCacheKey(id))),
      ]);
      if (results.some((result) => result.status === 'rejected')) throw new Error('Cache invalidation failed');
      // A concurrent failed invalidation must not be hidden by this completion.
      if (failures === failuresAtStart) bypass = false;
    } catch {
      bypass = true;
      failures++;
      logger.warn('Agent cache invalidation failed. Mutation succeeded; this process will bypass caching.');
    } finally {
      invalidations--;
    }
  }

  return { readGeneration, invalidate, get canWrite() { return !bypass && invalidations === 0; } };
}

export const agentCacheState = createAgentCacheState();
