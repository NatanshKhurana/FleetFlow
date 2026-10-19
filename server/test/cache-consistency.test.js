import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';
import { mockAgentStore } from '../test-support/mockAgentStore.js';
import { fakeRedis } from '../test-support/fakeRedis.js';
import { agentCacheState, createAgentCacheState } from '../src/services/agentCacheState.js';
import { agentListCache, createAgentListCache } from '../src/services/agentListCache.js';
import { agentDetailCache, createAgentDetailCache } from '../src/services/agentDetailCache.js';

const payload = { agentId: 'CACHE-001', fullName: 'Before', phone: '123',
  email: 'cache@example.com', serviceArea: 'Central' };

async function setup(t) {
  const redis = fakeRedis(t);
  let available = true;
  const logger = { warn: t.mock.fn() };
  const options = { getClient: () => available ? redis : null, logger };
  const state = createAgentCacheState(options);
  const lists = createAgentListCache({ ...options, state });
  const details = createAgentDetailCache({ ...options, state });
  for (const [target, source] of [[agentListCache, lists], [agentDetailCache, details]]) {
    t.mock.method(target, 'read', source.read);
    t.mock.method(target, 'write', source.write);
  }
  t.mock.method(agentCacheState, 'invalidate', state.invalidate);
  mockAgentStore(t);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function send(method, path = '', body, status = 200) {
    const response = await fetch(`${base}/api/agents${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, status);
    const text = await response.text();
    assert.doesNotMatch(text, /fake-private|stack|redis:\/\//);
    return text ? JSON.parse(text) : undefined;
  }
  const created = await send('POST', '', payload, 201);
  const path = '/' + created.data.id;
  const read = async () => ({ list: await send('GET'), detail: await send('GET', path) });
  return { base, redis, state, lists, details, send, path, read, logger,
    setAvailable(value) { available = value; } };
}

function assertName(responses, name) {
  assert.equal(responses.list.data[0].fullName, name);
  assert.equal(responses.detail.data.fullName, name);
}

test('warm list/detail hits skip MongoDB, updates refresh both, and deletes cannot return cached agents', async (t) => {
  const { read, send, path, redis } = await setup(t);
  const warm = await read();
  const listReads = Agent.find.mock.callCount();
  const countReads = Agent.countDocuments.mock.callCount();
  const detailReads = Agent.findById.mock.callCount();
  assert.deepEqual(await read(), warm);
  assert.equal(Agent.find.mock.callCount(), listReads);
  assert.equal(Agent.countDocuments.mock.callCount(), countReads);
  assert.equal(Agent.findById.mock.callCount(), detailReads);
  // Expiry is tested at the boundary without sleeping or contacting Redis.
  redis.advance(60000);
  assert.deepEqual(await read(), warm);
  assert.equal(Agent.find.mock.callCount(), listReads + 1);
  assert.equal(Agent.findById.mock.callCount(), detailReads + 1);
  await send('PATCH', path, { fullName: 'After' });
  assertName(await read(), 'After');
  await send('DELETE', path, undefined, 204);
  assert.deepEqual((await send('GET')).data, []);
  assert.equal((await send('GET', path, undefined, 404)).message, 'Agent not found');
});

test('failed MongoDB writes preserve warm cache contents and generation', async (t) => {
  const { read, send, path, redis } = await setup(t);
  const warm = await read();
  const generation = redis.generation;
  const deletions = redis.del.mock.callCount();
  const listReads = Agent.find.mock.callCount();
  const detailReads = Agent.findById.mock.callCount();
  t.mock.method(console, 'error', () => {});
  await send('POST', '', payload, 409);
  for (const [method, modelMethod] of [['POST', 'create'], ['PATCH', 'findByIdAndUpdate'], ['DELETE', 'findByIdAndDelete']]) {
    const mocked = t.mock.method(Agent, modelMethod, () => { throw new Error('fake-private-database'); });
    await send(method, method === 'POST' ? '' : path, method === 'DELETE' ? undefined : payloadFor(method), 500);
    mocked.mock.restore();
  }
  assert.equal(redis.generation, generation);
  assert.equal(redis.del.mock.callCount(), deletions);
  assert.deepEqual(await read(), warm);
  assert.equal(Agent.find.mock.callCount(), listReads);
  assert.equal(Agent.findById.mock.callCount(), detailReads);
});

test('rejected validation and missing-record mutations preserve warm caches without false success', async (t) => {
  const { read, send, path, redis } = await setup(t);
  const warm = await read();
  const generation = redis.generation;
  const writes = redis.set.mock.callCount();
  const rotations = redis.generationSet.mock.callCount();
  const deletions = redis.del.mock.callCount();
  const creates = Agent.create.mock.callCount();
  for (const [method, target, body] of [
    ['POST', '', { ...payload, agentId: 'INVALID-PHONE', phone: 'abc' }],
    ['PATCH', path, { phone: 'abc', fullName: 'Must not be saved' }],
    ['PATCH', path, { fullName: 'Must not be saved', agentId: 'immutable' }],
    ['PATCH', '/not-a-record-id', { status: 'inactive' }],
    ['DELETE', '/not-a-record-id', undefined],
  ]) {
    const rejected = await send(method, target, body, 400);
    assert.equal(rejected.success, false);
    assert.equal(rejected.message, 'Request validation failed');
  }
  assert.equal(Agent.create.mock.callCount(), creates);
  assert.equal(Agent.findByIdAndUpdate.mock.callCount(), 0);
  assert.equal(Agent.findByIdAndDelete.mock.callCount(), 0);
  for (const method of ['PATCH', 'DELETE']) {
    const missing = await send(method, '/' + 'f'.repeat(24), method === 'PATCH' ? { status: 'inactive' } : undefined, 404);
    assert.deepEqual(missing, { success: false, message: 'Agent not found' });
  }
  assert.equal(redis.generation, generation);
  assert.equal(redis.generationSet.mock.callCount(), rotations);
  assert.equal(redis.del.mock.callCount(), deletions);
  assert.deepEqual(await read(), warm);
  assert.equal(Agent.find.mock.callCount(), 1);
  assert.equal(Agent.countDocuments.mock.callCount(), 1);
  assert.equal(Agent.findById.mock.callCount(), 1);
  assert.equal(redis.set.mock.callCount(), writes);
});

test('malformed and oversized JSON on actual mutation routes leave warm caches and storage untouched', async (t) => {
  const { base, path, read, redis } = await setup(t);
  const warm = await read();
  const generation = redis.generation;
  const writes = redis.set.mock.callCount();
  const rotations = redis.generationSet.mock.callCount();
  const deletions = redis.del.mock.callCount();
  const creates = Agent.create.mock.callCount();
  for (const [body, status, message] of [
    ['{invalid-json', 400, 'Invalid JSON request body'],
    [JSON.stringify({ fullName: 'x'.repeat(110000) }), 413, 'Request body is too large'],
  ]) {
    for (const [method, target] of [['POST', ''], ['PATCH', path]]) {
      const response = await fetch(`${base}/api/agents${target}`, {
        method, headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, status);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.deepEqual(await response.json(), { success: false, message });
    }
  }
  assert.equal(Agent.create.mock.callCount(), creates);
  assert.equal(Agent.findByIdAndUpdate.mock.callCount(), 0);
  assert.equal(redis.generation, generation);
  assert.equal(redis.generationSet.mock.callCount(), rotations);
  assert.equal(redis.del.mock.callCount(), deletions);
  assert.deepEqual(await read(), warm);
  assert.equal(Agent.find.mock.callCount(), 1);
  assert.equal(Agent.findById.mock.callCount(), 1);
  assert.equal(redis.set.mock.callCount(), writes);
});

function payloadFor(method) {
  return method === 'POST' ? { ...payload, agentId: 'CACHE-002' } : { fullName: 'Failed' };
}

for (const failure of ['generationSet', 'del', 'unavailable']) {
  test(`invalidation ${failure} failure serves fresh MongoDB data and reconnect alone cannot clear bypass`, async (t) => {
    const { redis, state, read, send, path, setAvailable } = await setup(t);
    await read();
    let broken;
    if (failure === 'unavailable') setAvailable(false);
    else broken = t.mock.method(redis, failure, () => { throw new Error('fake-private-invalidation'); });
    await send('PATCH', path, { fullName: 'During outage' });
    assert.equal(state.canWrite, false);
    assertName(await read(), 'During outage');
    // Other writes, including another failed invalidation attempt, stay usable.
    const extra = await send('POST', '', { ...payload, agentId: 'CACHE-002' }, 201);
    await send('DELETE', '/' + extra.data.id, undefined, 204);
    await send('GET', '/' + extra.data.id, undefined, 404);
    assert.equal(state.canWrite, false);
    assertName(await read(), 'During outage');
    if (broken) broken.mock.restore();
    setAvailable(true);
    const calls = redis.withCommandOptions.mock.callCount();
    const dbReads = Agent.find.mock.callCount();
    assertName(await read(), 'During outage');
    assertName(await read(), 'During outage');
    assert.equal(redis.withCommandOptions.mock.callCount(), calls);
    assert.equal(Agent.find.mock.callCount(), dbReads + 2);
    assert.equal(state.canWrite, false);
    const old = redis.generation;
    await send('PATCH', path, { fullName: 'Recovered' });
    assert.notEqual(redis.generation, old);
    assert.equal(state.canWrite, true);
    assertName(await read(), 'Recovered');
    const recoveredReads = Agent.find.mock.callCount();
    assertName(await read(), 'Recovered');
    assert.equal(Agent.find.mock.callCount(), recoveredReads);
  });
}

for (const failure of ['get', 'set', 'generationGet']) {
  test(`Redis ${failure} errors fall back safely and reads recover without a mutation when no invalidation failed`, async (t) => {
    const { redis, state, read, logger } = await setup(t);
    const broken = t.mock.method(redis, failure, () => { throw new Error('fake-private-cache'); });
    assertName(await read(), 'Before');
    assertName(await read(), 'Before');
    assert.equal(Agent.find.mock.callCount(), 2);
    assert.equal(Agent.findById.mock.callCount(), 2);
    assert.equal(state.canWrite, true);
    assert.doesNotMatch(JSON.stringify(logger.warn.mock.calls.map((call) => call.arguments)), /fake-private|stack|redis:\/\//);
    broken.mock.restore();
    assertName(await read(), 'Before');
    const count = Agent.find.mock.callCount();
    assertName(await read(), 'Before');
    assert.equal(Agent.find.mock.callCount(), count);
  });
}

test('an outstanding invalidation blocks reads and fills until both commands finish', async (t) => {
  const { redis, state, lists, details, read, path } = await setup(t);
  const warm = await read();
  const old = redis.generation;
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  const original = redis.del;
  t.mock.method(redis, 'del', async (...args) => {
    started.resolve();
    await release.promise;
    return original(...args);
  });
  const invalidating = state.invalidate(path.slice(1));
  await started.promise;
  const writes = redis.set.mock.callCount();
  assert.equal(state.canWrite, false);
  assert.equal((await lists.read({ page: 1, limit: 10 })).response, null);
  assert.equal((await details.read(path.slice(1))).response, null);
  await lists.write({ page: 1, limit: 10 }, warm.list, 60, old);
  await details.write(path.slice(1), warm.detail, 60, old);
  assert.equal(redis.set.mock.callCount(), writes);
  release.resolve();
  await invalidating;
  assert.equal(state.canWrite, true);
  assertName(await read(), 'Before');
});

test('a different process rotating the generation cannot silently clear this process failure bypass', async (t) => {
  const { redis, state, read } = await setup(t);
  await read();
  const broken = t.mock.method(redis, 'generationSet', () => { throw new Error('fake-private-failure'); });
  await state.invalidate('000000000000000000000001');
  broken.mock.restore();
  const otherProcess = createAgentCacheState({ getClient: () => redis });
  const old = redis.generation;
  await otherProcess.invalidate('000000000000000000000002');
  assert.notEqual(redis.generation, old);
  assert.equal(await state.readGeneration(), null);
  assert.equal(state.canWrite, false);
  await state.invalidate('000000000000000000000001');
  assert.equal(state.canWrite, true);
  assert.equal(await state.readGeneration(), redis.generation);
});
