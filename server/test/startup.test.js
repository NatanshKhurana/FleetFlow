import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';
import app from '../src/app.js';
import { startServer } from '../src/startup.js';
import { createRedisConnection } from '../src/config/redis.js';
import { EventEmitter } from 'node:events';

const config = { PORT: 0, MONGODB_URI: 'mongodb://127.0.0.1:27017/fleetflow_test' };

test('HTTP starts only after database readiness; health and error responses are preserved', async (t) => {
  const ready = Promise.withResolvers();
  let listenCalls = 0;
  let disconnectCalls = 0;
  const startup = startServer(config, {
    connect: () => ready.promise,
    disconnect: async () => { disconnectCalls++; },
    application: { listen: (port) => { listenCalls++; return app.listen(port); } },
  });
  assert.equal(listenCalls, 0);
  ready.resolve();
  const running = await startup;
  t.after(() => running.shutdown());
  assert.equal(listenCalls, 1);
  const base = `http://127.0.0.1:${running.server.address().port}`;
  const cases = [
    { path: '/api/health', status: 200, message: 'FleetFlow API is running', success: true },
    { path: '/missing', status: 404, message: 'Route not found', success: false },
    { path: '/api/health', status: 400, message: 'Invalid JSON request body', success: false,
      options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' } },
    { path: '/api/health', status: 413, message: 'Request body is too large', success: false,
      options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(110000) }) } },
  ];
  for (const item of cases) {
    const response = await fetch(base + item.path, { ...item.options, signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, item.status);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await response.json(), { success: item.success, message: item.message });
  }
  await Promise.all([running.shutdown(), running.shutdown()]);
  assert.equal(running.server.listening, false);
  assert.equal(disconnectCalls, 1);
});

test('a database failure prevents listening and cleans up the database client', async () => {
  let listened = false;
  let disconnected = false;
  const failure = new Error('controlled database failure');
  await assert.rejects(startServer(config, {
    connect: async () => { throw failure; },
    disconnect: async () => { disconnected = true; },
    application: { listen: () => { listened = true; } },
  }), (error) => error === failure);
  assert.equal(listened, false);
  assert.equal(disconnected, true);
});

test('a signal during database connection cancels HTTP startup', async () => {
  const controller = new AbortController();
  let listened = false;
  let disconnected = false;
  await assert.rejects(startServer(config, {
    connect: async () => controller.abort(),
    disconnect: async () => { disconnected = true; },
    application: { listen: () => { listened = true; } },
    signal: controller.signal,
  }), /Startup was cancelled/);
  assert.equal(listened, false);
  assert.equal(disconnected, true);
});

test('an occupied HTTP port fails startup and closes the database connection', async (t) => {
  const occupied = createServer();
  await new Promise((resolve) => occupied.listen(0, resolve));
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  let disconnected = false;
  await assert.rejects(startServer({ ...config, PORT: occupied.address().port }, {
    connect: async () => {},
    disconnect: async () => { disconnected = true; },
  }), { code: 'EADDRINUSE' });
  assert.equal(disconnected, true);
});

test('startup connects MongoDB then Redis, and repeated shutdown closes both once', async (t) => {
  const events = [];
  const running = await startServer({ ...config, REDIS_URL: 'redis://127.0.0.1:6379' }, {
    connect: async () => { events.push('mongo connect'); },
    disconnect: async () => { events.push('mongo close'); },
    redis: {
      connect: async (url) => { assert.equal(url, 'redis://127.0.0.1:6379'); events.push('redis connect'); },
      disconnect: async () => { events.push('redis close'); },
    },
  });
  t.after(() => running.shutdown());
  assert.deepEqual(events, ['mongo connect', 'redis connect']);
  await Promise.all([running.shutdown(), running.shutdown()]);
  assert.deepEqual(events, ['mongo connect', 'redis connect', 'redis close', 'mongo close']);
});

test('Redis connection failure still allows health requests and normal shutdown', async (t) => {
  const client = new EventEmitter();
  client.isOpen = false;
  client.connect = async () => { throw new Error('fake-private-redis-details'); };
  client.destroy = () => {};
  const redis = createRedisConnection({ clientFactory: () => client, logger: { log() {}, warn() {} } });
  let mongoClosed = false;
  const running = await startServer({ ...config, REDIS_URL: 'redis://127.0.0.1:6379' }, {
    connect: async () => {}, disconnect: async () => { mongoClosed = true; }, redis,
  });
  t.after(() => running.shutdown());
  const health = await fetch(`http://127.0.0.1:${running.server.address().port}/api/health`, { signal: AbortSignal.timeout(5000) });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { success: true, message: 'FleetFlow API is running' });
  assert.equal(redis.client, null);
  await running.shutdown();
  assert.equal(mongoClosed, true);
});

test('cancellation during Redis startup cleans both services without opening HTTP', async () => {
  const controller = new AbortController();
  const closed = [];
  await assert.rejects(startServer(config, {
    connect: async () => {}, disconnect: async () => { closed.push('mongo'); },
    redis: { connect: async () => { controller.abort(); }, disconnect: async () => { closed.push('redis'); } },
    application: { listen: () => assert.fail('Cancelled startup must not listen') },
    signal: controller.signal,
  }), /Startup was cancelled/);
  assert.deepEqual(closed, ['redis', 'mongo']);
});

test('HTTP startup failure cleans Redis as well as MongoDB', async () => {
  const closed = [];
  await assert.rejects(startServer(config, {
    connect: async () => {}, disconnect: async () => { closed.push('mongo'); },
    redis: { connect: async () => {}, disconnect: async () => { closed.push('redis'); } },
    application: { listen: () => { throw new Error('Controlled listen failure'); } },
  }), /Controlled listen failure/);
  assert.deepEqual(closed, ['redis', 'mongo']);
});

test('a Redis cleanup failure cannot skip MongoDB cleanup', async () => {
  let mongoClosed = false;
  const running = await startServer(config, {
    connect: async () => {}, disconnect: async () => { mongoClosed = true; },
    redis: { connect: async () => {}, disconnect: async () => { throw new Error('Controlled cleanup failure'); } },
  });
  await assert.rejects(running.shutdown(), /Controlled cleanup failure/);
  assert.equal(mongoClosed, true);
  assert.equal(running.server.listening, false);
});
