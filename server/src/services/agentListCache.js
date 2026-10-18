import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getRedisClient } from '../config/redis.js';
import { cachedAgentSchema } from '../validation/cachedAgentSchema.js';

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

export function agentListCacheKey({ page, limit, search, status, serviceArea }) {
  // Input comes from the query schema: defaults and whitespace are already resolved.
  const normalized = JSON.stringify({ page, limit, search: search || '', status: status || '', serviceArea: serviceArea || '' });
  // Hashing avoids embedding names, phone numbers, or emails from search in keys.
  return 'fleetflow:agents:list:v1:' + createHash('sha256').update(normalized).digest('hex');
}

export function createAgentListCache({ getClient = getRedisClient, logger = console } = {}) {
  async function read(query) {
    try {
      const client = getClient();
      if (!client) return null;
      const text = await client.withCommandOptions({ timeout: 1000 }).get(agentListCacheKey(query));
      if (text === null) return null;
      const parsed = cachedResponseSchema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error('Invalid cached response');
      const { pagination, data } = parsed.data;
      if (pagination.page !== query.page || pagination.limit !== query.limit
        || pagination.totalPages !== Math.ceil(pagination.total / pagination.limit)
        || data.length > pagination.limit) throw new Error('Invalid cached pagination');
      return parsed.data;
    } catch {
      logger.warn('Agent list cache read failed. Using MongoDB.');
      return null;
    }
  }

  async function write(query, response, ttlSeconds = 60) {
    try {
      const client = getClient();
      if (!client) return;
      // Store JSON and its expiry in one command, including valid empty pages.
      await client.withCommandOptions({ timeout: 1000 }).set(
        agentListCacheKey(query), JSON.stringify(response),
        { expiration: { type: 'EX', value: ttlSeconds } },
      );
    } catch {
      logger.warn('Agent list cache write failed. Returning the MongoDB result.');
    }
  }

  return { read, write };
}

export const agentListCache = createAgentListCache();
