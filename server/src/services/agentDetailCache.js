import { z } from 'zod';
import { getRedisClient } from '../config/redis.js';
import { cachedAgentSchema } from '../validation/cachedAgentSchema.js';

const cachedResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.literal('Agent retrieved successfully'),
  data: cachedAgentSchema,
});

export function agentDetailCacheKey(id) {
  // Uppercase/lowercase hexadecimal forms refer to the same MongoDB ObjectId.
  return 'fleetflow:agents:detail:v1:' + id.toLowerCase();
}

export function createAgentDetailCache({ getClient = getRedisClient, logger = console } = {}) {
  async function read(id) {
    try {
      const client = getClient();
      if (!client) return null;
      const text = await client.withCommandOptions({ timeout: 1000 }).get(agentDetailCacheKey(id));
      if (text === null) return null;
      const parsed = cachedResponseSchema.safeParse(JSON.parse(text));
      if (!parsed.success || parsed.data.data.id.toLowerCase() !== id.toLowerCase()) {
        throw new Error('Invalid cached agent detail');
      }
      return parsed.data;
    } catch {
      logger.warn('Agent detail cache read failed. Using MongoDB.');
      return null;
    }
  }

  async function write(id, response, ttlSeconds = 60) {
    try {
      const client = getClient();
      if (!client) return;
      await client.withCommandOptions({ timeout: 1000 }).set(
        agentDetailCacheKey(id), JSON.stringify(response),
        { expiration: { type: 'EX', value: ttlSeconds } },
      );
    } catch {
      logger.warn('Agent detail cache write failed. Returning the MongoDB result.');
    }
  }

  return { read, write };
}

export const agentDetailCache = createAgentDetailCache();
