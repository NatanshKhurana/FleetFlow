import { createClient } from 'redis';

async function withTimeout(operation, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Redis lifecycle timeout')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Each test can supply a fake client; production uses the shared instance below.
export function createRedisConnection({
  clientFactory = createClient,
  logger = console,
  connectTimeout = 3000,
  closeTimeout = 1000,
} = {}) {
  let client;
  let connecting;
  let closing;

  function destroy(candidate) {
    // close() can mark isOpen false while its socket is still draining.
    if (!candidate) return;
    try {
      candidate.destroy();
    } catch {
      logger.warn('Redis connection cleanup failed.');
    }
  }

  function connect(url) {
    if (closing) return closing.then(() => connect(url));
    if (client?.isReady) return Promise.resolve(client);
    if (connecting) return connecting;
    if (!url?.trim()) {
      logger.log('Redis is not configured. Continuing without Redis.');
      return Promise.resolve(null);
    }

    connecting = (async () => {
      // Let connecting be assigned before any failure can clear it.
      await Promise.resolve();
      let candidate;
      try {
        // Release a previously lost connection before an explicit new attempt.
        destroy(client);
        client = undefined;
        candidate = clientFactory({
          url: url.trim(),
          socket: { connectTimeout, reconnectStrategy: false },
          disableOfflineQueue: true,
        });
        client = candidate;
        candidate.on('error', () => {
          logger.warn('Redis connection error. Redis is unavailable; database operations remain available.');
        });
        // Also bound DNS, authentication, and handshake waits, not just TCP setup.
        await withTimeout(() => candidate.connect(), connectTimeout);
        if (client !== candidate) return null;
        if (!candidate.isReady) throw new Error('Redis client is not ready');
        logger.log('Redis connected successfully.');
        return candidate;
      } catch {
        if (client === candidate) client = undefined;
        destroy(candidate);
        logger.warn('Redis connection failed. Continuing without Redis. Check configuration and network access.');
        return null;
      } finally {
        connecting = undefined;
      }
    })();
    return connecting;
  }

  function disconnect() {
    if (closing) return closing;
    closing = (async () => {
      await Promise.resolve();
      const candidate = client;
      client = undefined;
      if (candidate) {
        if (candidate.isReady && candidate.isOpen) {
          try {
            await withTimeout(() => candidate.close(), closeTimeout);
          } catch {
            logger.warn('Redis graceful close failed. Closing the connection immediately.');
            destroy(candidate);
          }
        } else {
          destroy(candidate);
        }
      }
      // An interrupted connect settles within its connection deadline.
      if (connecting) await connecting;
    })().finally(() => { closing = undefined; });
    return closing;
  }

  return { connect, disconnect, get client() { return client?.isReady ? client : null; } };
}

export const redisConnection = createRedisConnection();
export const connectRedis = redisConnection.connect;
export const disconnectRedis = redisConnection.disconnect;
// Reuse this ready client later; null means Redis is currently unavailable.
export function getRedisClient() { return redisConnection.client; }
