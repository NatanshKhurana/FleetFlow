import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { mongo } from 'mongoose';

// Resolve from this file, so starting Node from the project root also works.
const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
const loaded = dotenv.config({ path: envPath, quiet: true, override: false });

// A file is optional when configuration is supplied by the process environment.
if (loaded.error && loaded.error.code !== 'ENOENT') {
  throw new Error('Unable to read server/.env. Check the file and its permissions.');
}

const portMessage = 'PORT must be a whole number from 1 to 65535.';
const portSchema = z.string({ error: portMessage })
  .trim()
  .regex(/^\d+$/, portMessage)
  .transform(Number)
  .pipe(z.number().int(portMessage).min(1, portMessage).max(65535, portMessage));

const mongoMessage = 'MONGODB_URI must be a valid, non-empty MongoDB connection URI.';
const mongoSchema = z.string({ error: mongoMessage }).trim().min(1, mongoMessage)
  .refine((value) => {
    try {
      // The driver parses the URI here; constructing a client opens no connection.
      new mongo.MongoClient(value);
      return true;
    } catch {
      return false;
    }
  }, mongoMessage);

// Redis remains optional because cache availability must not block the API.
const optionalServiceValue = z.string().trim().optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  PORT: portSchema,
  MONGODB_URI: mongoSchema,
  REDIS_URL: optionalServiceValue,
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  // Report field names and instructions, never submitted values or credentials.
  const details = result.error.issues.map((issue) => `- ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}\nSet PORT and MONGODB_URI in server/.env or the process environment.`);
}

export const env = result.data;
