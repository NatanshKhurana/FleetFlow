import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { createRedisConnection, getRedisClient } from '../src/config/redis.js';

const url = 'redis://127.0.0.1:6379/0';

function setup(t, options = {}) {
  const client = new EventEmitter();
  client.isOpen = false;
  client.isReady = false;
  client.connect = t.mock.fn(async () => { client.isOpen = client.isReady = true; });
  client.close = t.mock.fn(async () => { client.isOpen = client.isReady = false; });
  client.destroy = t.mock.fn(() => { client.isOpen = client.isReady = false; });
  const clientFactory = t.mock.fn(() => client);
  const logger = { log: t.mock.fn(), warn: t.mock.fn() };
  const connection = createRedisConnection({ clientFactory, logger, ...options });
  t.after(() => connection.disconnect());
  return { client, clientFactory, logger, connection };
}

test('missing and blank Redis configuration creates no client or connection', async (t) => {
  const { connection, clientFactory } = setup(t);
  for (const value of [undefined, '', '   ']) assert.equal(await connection.connect(value), null);
  assert.equal(clientFactory.mock.callCount(), 0);
  assert.equal(connection.client, null);
  assert.equal(getRedisClient(), null);
  await connection.disconnect();
  await connection.disconnect();
});

test('configured client shares concurrent connects and reuses a ready connection', async (t) => {
  const { connection, client, clientFactory } = setup(t);
  const first = connection.connect(` ${url} `);
  assert.equal(connection.connect(url), first);
  assert.equal(await first, client);
  assert.equal(await connection.connect(url), client);
  assert.equal(connection.client, client);
  assert.equal(client.connect.mock.callCount(), 1);
  assert.deepEqual(clientFactory.mock.calls[0].arguments, [{
    url, socket: { connectTimeout: 3000, reconnectStrategy: false }, disableOfflineQueue: true,
  }]);
  assert.equal(client.listenerCount('error'), 1);
});

test('connection failure and runtime error events never expose raw errors or URLs', async (t) => {
  const { connection, client, logger } = setup(t);
  client.connect = t.mock.fn(async () => {
    client.isOpen = true;
    const error = new Error('fake-private-password redis://fake-private-host');
    client.emit('error', error);
    throw error;
  });
  assert.equal(await connection.connect(url), null);
  assert.equal(connection.client, null);
  assert.equal(client.destroy.mock.callCount(), 1);
  assert.equal(logger.warn.mock.callCount(), 2);
  assert.doesNotMatch(JSON.stringify(logger.warn.mock.calls.map((call) => call.arguments)), /fake-private|redis:\/\/|stack/);
});

test('client creation failures, including malformed URLs, are safe and nonfatal', async (t) => {
  const logger = { log: t.mock.fn(), warn: t.mock.fn() };
  const connection = createRedisConnection({ logger });
  t.after(() => connection.disconnect());
  assert.equal(await connection.connect('https://fake-private-host'), null);
  assert.equal(connection.client, null);
  assert.doesNotMatch(JSON.stringify(logger.warn.mock.calls.map((call) => call.arguments)), /fake-private|https/);
});

test('a stalled connection is bounded and its client is destroyed', async (t) => {
  const { connection, client } = setup(t, { connectTimeout: 10 });
  client.connect = t.mock.fn(() => {
    client.isOpen = true;
    return new Promise(() => {});
  });
  assert.equal(await connection.connect(url), null);
  assert.equal(connection.client, null);
  assert.equal(client.destroy.mock.callCount(), 1);
});

test('shutdown shares one graceful close and supports a later explicit connection', async (t) => {
  const { connection, client } = setup(t);
  await connection.connect(url);
  const first = connection.disconnect();
  assert.equal(connection.disconnect(), first);
  await first;
  await connection.disconnect();
  assert.equal(client.close.mock.callCount(), 1);
  assert.equal(connection.client, null);
  assert.equal(await connection.connect(url), client);
  assert.equal(client.connect.mock.callCount(), 2);
});

test('failed or stalled graceful closes force destruction, even after isOpen becomes false', async (t) => {
  for (const stalls of [false, true]) {
    const { connection, client } = setup(t, { closeTimeout: 10 });
    await connection.connect(url);
    client.close = t.mock.fn(() => {
      client.isOpen = false;
      if (stalls) return new Promise(() => {});
      throw new Error('fake-private-close-error');
    });
    await connection.disconnect();
    await connection.disconnect();
    assert.equal(client.destroy.mock.callCount(), 1);
    assert.equal(connection.client, null);
  }
});

test('shutdown during an in-progress connection prevents it from becoming reusable', async (t) => {
  const { connection, client } = setup(t);
  const pending = Promise.withResolvers();
  client.connect = t.mock.fn(() => { client.isOpen = true; return pending.promise; });
  client.destroy = t.mock.fn(() => {
    client.isOpen = client.isReady = false;
    pending.reject(new Error('Connection cancelled'));
  });
  const connecting = connection.connect(url);
  // Let the mocked connect start before requesting cleanup.
  await Promise.resolve();
  await Promise.resolve();
  await connection.disconnect();
  assert.equal(await connecting, null);
  assert.equal(connection.client, null);
  assert.ok(client.destroy.mock.callCount() >= 1);
});

test('runtime loss disables reuse; only an explicit reconnect replaces the lost client', async (t) => {
  const { connection, client } = setup(t);
  await connection.connect(url);
  client.isOpen = client.isReady = false;
  client.emit('error', new Error('fake-private-runtime-error'));
  assert.equal(connection.client, null);
  assert.equal(client.connect.mock.callCount(), 1);
  assert.equal(await connection.connect(url), client);
  assert.equal(client.destroy.mock.callCount(), 1);
  assert.equal(client.connect.mock.callCount(), 2);
  await connection.disconnect();
});
