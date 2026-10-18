import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { redisConnection } from './config/redis.js';

// Tests may supply controlled database functions; normal startup uses Mongoose.
export async function startServer(config, {
  connect = connectDatabase,
  disconnect = disconnectDatabase,
  redis = redisConnection,
  application = app,
  signal,
} = {}) {
  let server;

  async function disconnectServices() {
    try {
      await redis.disconnect();
    } finally {
      await disconnect();
    }
  }

  try {
    await connect(config.MONGODB_URI);
    if (signal?.aborted) {
      throw new Error('Startup was cancelled.');
    }

    // Redis is optional: its bounded connection attempt returns null on failure.
    await redis.connect(config.REDIS_URL);
    if (signal?.aborted) {
      throw new Error('Startup was cancelled.');
    }

    server = await new Promise((resolve, reject) => {
      const listener = application.listen(config.PORT);
      listener.once('error', reject);
      listener.once('listening', () => {
        listener.removeListener('error', reject);
        resolve(listener);
      });
    });
  } catch (error) {
    await disconnectServices();
    throw error;
  }

  console.log(`FleetFlow API is running at http://localhost:${server.address().port}`);
  server.on('error', () => {
    console.error('HTTP server error. Check the local network and port availability.');
  });

  let shutdownPromise;
  function shutdown() {
    // Repeated shutdown requests share one cleanup operation.
    if (!shutdownPromise) {
      shutdownPromise = (async () => {
        try {
          await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
            server.closeIdleConnections();
          });
        } finally {
          await disconnectServices();
        }
      })();
    }
    return shutdownPromise;
  }

  return { server, shutdown };
}
