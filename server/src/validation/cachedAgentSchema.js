import { z } from 'zod';

// Both caches accept only the public agent fields, never database metadata.
export const cachedAgentSchema = z.strictObject({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/),
  agentId: z.string(), fullName: z.string(), phone: z.string(),
  email: z.string(), serviceArea: z.string(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
