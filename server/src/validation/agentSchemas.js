import { z } from 'zod';

// Reject extra fields so callers cannot set database IDs or timestamps.
export const createAgentSchema = z.strictObject({
  agentId: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  serviceArea: z.string().trim().min(1),
  // Leave the default to the existing Mongoose model.
  status: z.string().trim().pipe(z.enum(['active', 'inactive'])).optional(),
});
