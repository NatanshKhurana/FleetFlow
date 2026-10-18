import { z } from 'zod';
import { phonePattern } from './phone.js';

// Reject extra fields so callers cannot set database IDs or timestamps.
export const createAgentSchema = z.strictObject({
  agentId: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1).regex(phonePattern),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  serviceArea: z.string().trim().min(1),
  // Leave the default to the existing Mongoose model.
  status: z.string().trim().pipe(z.enum(['active', 'inactive'])).optional(),
});

// :id means the public MongoDB ObjectId, not the business agentId string.
export const agentParamsSchema = z.strictObject({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

// Reuse create rules, but keep identifiers and timestamps out of editable data.
export const updateAgentSchema = createAgentSchema.pick({
  fullName: true,
  phone: true,
  email: true,
  serviceArea: true,
  status: true,
}).partial()
  // Optional fields must never overwrite stored values with undefined.
  .transform((data) => Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ))
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one editable field.',
  });

// Query values must be single decimal strings, not arrays or coercible objects.
const positiveQueryInteger = z.string().trim().regex(/^[1-9]\d*$/)
  .transform(Number).pipe(z.number().int().positive());

export const listAgentsSchema = z.strictObject({
  page: positiveQueryInteger.default(1),
  limit: positiveQueryInteger.pipe(z.number().max(100)).default(10),
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().pipe(z.enum(['active', 'inactive'])).optional(),
  serviceArea: z.string().trim().optional(),
}).refine((query) => Number.isSafeInteger((query.page - 1) * query.limit), {
  path: ['page'],
  message: 'The requested pagination offset is too large.',
});
