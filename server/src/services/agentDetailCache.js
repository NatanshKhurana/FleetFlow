import { z } from 'zod';
import { getRedisClient } from '../config/redis.js';
import { cachedAgentSchema } from '../validation/cachedAgentSchema.js';
import { agentCacheState, createAgentCacheState, cacheCommand, agentDetailCacheKey } from './agentCacheState.js';

export { agentDetailCacheKey } from './agentCacheState.js';

const cachedResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.literal('Agent retrieved successfully'),
  data: cachedAgentSchema,
});

export function createAgentDetailCache({ getClient = getRedisClient, logger = console,
  state = createAgentCacheState({ getClient, logger }) } = {}) {
  async function read(id) {
    let generation = null;
    try {
      generation = await state.readGeneration();
      if (!generation) return { response: null, generation };
      const client = getClient();
      if (!client) return { response: null, generation: null };
      const text = await cacheCommand(client, (redis) => redis.get(agentDetailCacheKey(id)));
      if (text === null) return { response: null, generation };
      const entry = JSON.parse(text);
      // Reject late writes from reads that started before a successful mutation.
      if (entry?.generation !== generation) return { response: null, generation };
      const parsed = cachedResponseSchema.safeParse(entry.response);
      if (!parsed.success || parsed.data.data.id.toLowerCase() !== id.toLowerCase()) {
        throw new Error('Invalid cached agent detail');
      }
      return { response: parsed.data, generation };
    } catch {
      logger.warn('Agent detail cache read failed. Using MongoDB.');
      return { response: null, generation };
    }
  }

  async function write(id, response, ttlSeconds = 60, generation) {
    try {
      if (!generation || !state.canWrite) return;
      const client = getClient();
      if (!client) return;
      await cacheCommand(client, (redis) => redis.set(
        agentDetailCacheKey(id), JSON.stringify({ generation, response }),
        { expiration: { type: 'EX', value: ttlSeconds } },
      ));
    } catch {
      logger.warn('Agent detail cache write failed. Returning the MongoDB result.');
    }
  }

  return { read, write };
}

export const agentDetailCache = createAgentDetailCache({ state: agentCacheState });
