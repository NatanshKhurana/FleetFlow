import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getRedisClient } from '../config/redis.js';
import { cachedAgentSchema } from '../validation/cachedAgentSchema.js';
import { agentCacheState, createAgentCacheState, cacheCommand } from './agentCacheState.js';

// Check cached JSON before returning it, including the public-field allowlist.
const cachedResponseSchema = z.strictObject({
  success: z.literal(true),
  message: z.literal('Agents retrieved successfully'),
  data: z.array(cachedAgentSchema),
  pagination: z.strictObject({
    page: z.number().int().positive(), limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
  }),
});

export function agentListCacheKey({ page, limit, search, status, serviceArea }, generation) {
  // Input comes from the query schema: defaults and whitespace are already resolved.
  const normalized = JSON.stringify({ page, limit, search: search || '', status: status || '', serviceArea: serviceArea || '' });
  // Hashing avoids embedding names, phone numbers, or emails from search in keys.
  return `fleetflow:agents:list:v2:${generation}:` + createHash('sha256').update(normalized).digest('hex');
}

export function createAgentListCache({ getClient = getRedisClient, logger = console,
  state = createAgentCacheState({ getClient, logger }) } = {}) {
  async function read(query) {
    let generation = null;
    try {
      generation = await state.readGeneration();
      if (!generation) return { response: null, generation };
      const client = getClient();
      if (!client) return { response: null, generation: null };
      const text = await cacheCommand(client, (redis) => redis.get(agentListCacheKey(query, generation)));
      if (text === null) return { response: null, generation };
      const parsed = cachedResponseSchema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error('Invalid cached response');
      const { pagination, data } = parsed.data;
      // Rows must fit the page size and the matching total remaining at this offset.
      if (pagination.page !== query.page || pagination.limit !== query.limit
        || pagination.totalPages !== Math.ceil(pagination.total / pagination.limit)
        || data.length > pagination.limit
        || data.length > Math.max(0, pagination.total - (pagination.page - 1) * pagination.limit)) {
        throw new Error('Invalid cached pagination');
      }
      return { response: parsed.data, generation };
    } catch {
      logger.warn('Agent list cache read failed. Using MongoDB.');
      return { response: null, generation };
    }
  }

  async function write(query, response, ttlSeconds = 60, generation) {
    try {
      // Keep the pre-query generation; an older query must not fill a newer namespace.
      if (!generation || !state.canWrite) return;
      const client = getClient();
      if (!client) return;
      // Store JSON and its expiry in one command, including valid empty pages.
      await cacheCommand(client, (redis) => redis.set(
        agentListCacheKey(query, generation), JSON.stringify(response),
        { expiration: { type: 'EX', value: ttlSeconds } },
      ));
    } catch {
      logger.warn('Agent list cache write failed. Returning the MongoDB result.');
    }
  }

  return { read, write };
}

export const agentListCache = createAgentListCache({ state: agentCacheState });
