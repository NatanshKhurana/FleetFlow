import { env } from './config/env.js';
import { startServer } from './startup.js';

const controller = new AbortController();
let stopping = false;
let startup;

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  controller.abort();

  // A stuck request or database close must not keep shutdown alive forever.
  const timeout = setTimeout(() => {
    console.error('Shutdown exceeded 10 seconds. Exiting.');
    process.exit(1);
  }, 10000);

  try {
    const running = await startup?.catch(() => undefined);
    if (running) await running.shutdown();
    process.exitCode = exitCode;
  } catch {
    console.error('Unable to finish cleanup. Exiting unsuccessfully.');
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });

startup = startServer(env, { signal: controller.signal });
startup.catch(async () => {
  // Never print the driver error, URI, credentials, or nested error details.
  console.error('API startup failed. Check MongoDB credentials, Atlas IP access, network connectivity, and PORT availability.');
  await shutdown(1);
});
