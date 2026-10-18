import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';
import { agentParamsSchema } from '../src/validation/agentSchemas.js';
import { agentDetailCache, agentDetailCacheKey, createAgentDetailCache } from '../src/services/agentDetailCache.js';
import { agentListCacheKey } from '../src/services/agentListCache.js';
import { fakeRedis } from '../test-support/fakeRedis.js';

const id = '68f2d0000000000000000001';

function sampleAgent() {
  return new Agent({
    _id: id, agentId: 'AGENT-001', fullName: 'Alex Morgan', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'Central', __v: 0,
    createdAt: new Date('2026-10-18T00:00:00.000Z'),
    updatedAt: new Date('2026-10-18T00:00:00.000Z'),
  }).toObject();
}

async function startTestServer(t, { record = sampleAgent(), error, cacheClient = null, ttlSeconds } = {}) {
  const logger = { warn: t.mock.fn() };
  const cache = createAgentDetailCache({ getClient: () => cacheClient, logger });
  t.mock.method(agentDetailCache, 'read', cache.read);
  t.mock.method(agentDetailCache, 'write', cache.write);
  const previousTtl = app.locals.agentListCacheTtlSeconds;
  app.locals.agentListCacheTtlSeconds = ttlSeconds;
  t.after(() => { app.locals.agentListCacheTtlSeconds = previousTtl; });
  const query = {};
  query.select = t.mock.fn(() => query);
  query.lean = t.mock.fn(() => query);
  query.exec = t.mock.fn(async () => {
    if (error) throw error;
    return record;
  });
  const findById = t.mock.method(Agent, 'findById', () => query);
  const find = t.mock.method(Agent, 'find', () => assert.fail('Single-agent lookup must not fetch the list'));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((failure) => failure ? reject(failure) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return { base: `http://127.0.0.1:${server.address().port}`, findById, find, query, logger };
}

function get(base, value) {
  return fetch(base + '/api/agents/' + encodeURIComponent(value), { signal: AbortSignal.timeout(5000) });
}

test('existing agent returns public fields using one targeted MongoDB ID query', async (t) => {
  const record = sampleAgent();
  record.internalNote = 'fake-private-model-metadata';
  const { base, findById, find, query } = await startTestServer(t, { record });
  const response = await get(base, id);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true, message: 'Agent retrieved successfully',
    data: {
      id, agentId: 'AGENT-001', fullName: 'Alex Morgan', phone: '+1 202-555-0142',
      email: 'alex@example.com', serviceArea: 'Central', status: 'active',
      createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z',
    },
  });
  assert.equal(findById.mock.callCount(), 1);
  assert.deepEqual(findById.mock.calls[0].arguments, [id]);
  assert.deepEqual(query.select.mock.calls[0].arguments, ['agentId fullName phone email serviceArea status createdAt updatedAt']);
  assert.equal(query.lean.mock.callCount(), 1);
  assert.equal(query.exec.mock.callCount(), 1);
  assert.equal(find.mock.callCount(), 0);
});

test('malformed IDs and business identifiers return a safe 400 before any lookup', async (t) => {
  const { base, findById } = await startTestServer(t);
  const cases = ['AGENT-001', '12345', 'abcdefghijkl', 'g'.repeat(24), id + '0', ` ${id} `, ' ', '{"$ne":null}'];
  for (const value of cases) {
    const response = await get(base, value);
    assert.equal(response.status, 400, value);
    assert.deepEqual(await response.json(), {
      success: false, message: 'Request validation failed',
      details: [{ section: 'params', field: 'id', message: 'Invalid format' }],
    });
  }
  assert.equal(agentParamsSchema.safeParse({}).success, false);
  assert.equal(findById.mock.callCount(), 0);
});

test('uppercase hexadecimal ObjectIds are accepted without falling back to business IDs', async (t) => {
  const { base, findById } = await startTestServer(t);
  const response = await get(base, id.toUpperCase());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.id, id);
  assert.deepEqual(findById.mock.calls[0].arguments, [id.toUpperCase()]);
});

test('a valid ID with no matching record returns the standard safe 404', async (t) => {
  const { base, findById } = await startTestServer(t, { record: null });
  const response = await get(base, id);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { success: false, message: 'Agent not found' });
  assert.deepEqual(findById.mock.calls[0].arguments, [id]);
});

test('unexpected lookup errors use centralized safe 500 responses and logging', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const { base } = await startTestServer(t, { error: new Error('fake-private-database-details') });
  const response = await get(base, id);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
});

test('a detail miss caches the complete public response and a hit skips MongoDB', async (t) => {
  const redis = fakeRedis(t);
  const { base, findById, query } = await startTestServer(t, { cacheClient: redis });
  const first = await get(base, id);
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.deepEqual(JSON.parse(redis.set.mock.calls[0].arguments[1]), body);
  assert.deepEqual(redis.set.mock.calls[0].arguments[2], { expiration: { type: 'EX', value: 60 } });
  const hit = await get(base, id);
  assert.equal(hit.status, 200);
  assert.deepEqual(await hit.json(), body);
  assert.equal(findById.mock.callCount(), 1);
  assert.equal(query.exec.mock.callCount(), 1);
  assert.equal(redis.set.mock.callCount(), 1);
});

test('detail keys normalize ObjectId case and separate different agents and list entries', async (t) => {
  const redis = fakeRedis(t);
  const { base, findById } = await startTestServer(t, { cacheClient: redis });
  await (await get(base, id)).json();
  const uppercase = await get(base, id.toUpperCase());
  assert.equal(uppercase.status, 200);
  assert.equal((await uppercase.json()).data.id, id);
  assert.equal(findById.mock.callCount(), 1);
  assert.equal(redis.get.mock.calls[0].arguments[0], `fleetflow:agents:detail:v1:${id}`);
  assert.equal(redis.get.mock.calls[0].arguments[0], redis.get.mock.calls[1].arguments[0]);
  const otherId = '68f2d0000000000000000002';
  redis.prime(agentDetailCacheKey(otherId), JSON.stringify({
    success: true, message: 'Agent retrieved successfully',
    data: { ...(await (await get(base, id)).json()).data, id: otherId, agentId: 'AGENT-002' },
  }));
  assert.equal((await (await get(base, otherId)).json()).data.agentId, 'AGENT-002');
  assert.equal(findById.mock.callCount(), 1);
  assert.notEqual(agentDetailCacheKey(id), agentDetailCacheKey(otherId));
  assert.notEqual(agentDetailCacheKey(id), agentListCacheKey({ page: 1, limit: 10 }));
});

test('detail default expiry is 60 seconds and a hit does not refresh it', async (t) => {
  const redis = fakeRedis(t);
  const { base, findById } = await startTestServer(t, { cacheClient: redis });
  await (await get(base, id)).json();
  redis.advance(59999);
  assert.equal((await get(base, id)).status, 200);
  assert.equal(findById.mock.callCount(), 1);
  redis.advance(1);
  assert.equal((await get(base, id)).status, 200);
  assert.equal(findById.mock.callCount(), 2);
  assert.equal(redis.set.mock.callCount(), 2);
});

test('detail writes reuse the existing configured list TTL', async (t) => {
  const redis = fakeRedis(t);
  const { base } = await startTestServer(t, { cacheClient: redis, ttlSeconds: 120 });
  assert.equal((await get(base, id)).status, 200);
  assert.deepEqual(redis.set.mock.calls[0].arguments[2], { expiration: { type: 'EX', value: 120 } });
});

test('malformed detail JSON, wrong shapes, internal fields, and another agent ID are misses', async (t) => {
  const redis = fakeRedis(t);
  const { base, findById, logger } = await startTestServer(t, { cacheClient: redis });
  const valid = await (await get(base, id)).json();
  const values = [
    '{fake-private-malformed-json', 'null', '{}',
    JSON.stringify({ ...valid, data: { ...valid.data, __v: 1 } }),
    JSON.stringify({ ...valid, data: { ...valid.data, id: '68f2d0000000000000000002' } }),
  ];
  for (const value of values) {
    redis.prime(agentDetailCacheKey(id), value);
    const response = await get(base, id);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), valid);
  }
  assert.equal(findById.mock.callCount(), values.length + 1);
  assert.doesNotMatch(JSON.stringify(logger.warn.mock.calls.map((call) => call.arguments)), /fake-private|stack|__v/);
});

test('detail Redis read/write failures return the MongoDB result safely', async (t) => {
  for (const option of ['readError', 'writeError']) {
    const redis = fakeRedis(t, { [option]: true });
    const { base, findById, logger } = await startTestServer(t, { cacheClient: redis });
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await get(base, id);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.id, id);
    }
    assert.equal(findById.mock.callCount(), 2);
    assert.ok(logger.warn.mock.callCount() > 0);
    assert.doesNotMatch(JSON.stringify(logger.warn.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
  }
});

test('missing agents are never cached, including when Redis reads fail or contain a cached error', async (t) => {
  for (const readError of [false, true]) {
    const redis = fakeRedis(t, { readError });
    redis.prime(agentDetailCacheKey(id), JSON.stringify({ success: false, message: 'Agent not found' }));
    const { base, findById } = await startTestServer(t, { cacheClient: redis, record: null });
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await get(base, id);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { success: false, message: 'Agent not found' });
    }
    assert.equal(findById.mock.callCount(), 2);
    assert.equal(redis.set.mock.callCount(), 0);
  }
});

test('invalid IDs skip Redis and database errors never populate the detail cache', async (t) => {
  const redis = fakeRedis(t);
  const { base, findById } = await startTestServer(t, { cacheClient: redis, error: new Error('fake-private-driver-details') });
  t.mock.method(console, 'error', () => {});
  assert.equal((await get(base, 'AGENT-001')).status, 400);
  assert.equal(redis.get.mock.callCount(), 0);
  assert.equal(findById.mock.callCount(), 0);
  const response = await get(base, id);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  assert.equal(redis.set.mock.callCount(), 0);
});
