import assert from 'node:assert/strict';
import test from 'node:test';
import Agent from '../src/models/Agent.js';
import { createAgent, updateAgent, deleteAgent } from '../src/controllers/agentController.js';
import { agentCacheState, createAgentCacheState, AGENT_CACHE_GENERATION_KEY } from '../src/services/agentCacheState.js';
import { createAgentListCache, agentListCacheKey } from '../src/services/agentListCache.js';
import { createAgentDetailCache, agentDetailCacheKey } from '../src/services/agentDetailCache.js';
import { fakeRedis } from '../test-support/fakeRedis.js';

const id = '68f2d0000000000000000001';
const query = { page: 1, limit: 10 };
const detail = {
  success: true, message: 'Agent retrieved successfully',
  data: { id, agentId: 'AGENT-001', fullName: 'Alex Morgan', phone: '123',
    email: 'alex@example.com', serviceArea: 'Central', status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
};

function listResponse(params = query) {
  return { success: true, message: 'Agents retrieved successfully', data: [],
    pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 0 } };
}

function setup(t, redis = fakeRedis(t)) {
  const logger = { warn: t.mock.fn() };
  const getClient = () => redis;
  const state = createAgentCacheState({ getClient, logger });
  const lists = createAgentListCache({ getClient, logger, state });
  const details = createAgentDetailCache({ getClient, logger, state });
  return { redis, state, lists, details, logger };
}

function mutationMocks(t, { record, error, initError } = {}) {
  const events = [];
  const agent = record === undefined ? { ...detail.data, _id: id } : record;
  const persist = async () => {
    if (error) throw error;
    events.push('mongodb success');
    return agent;
  };
  const result = { select() { return result; }, lean() { return result; }, exec: persist };
  t.mock.method(Agent, 'init', async () => { if (initError) throw initError; });
  t.mock.method(Agent, 'create', persist);
  t.mock.method(Agent, 'findByIdAndUpdate', () => result);
  t.mock.method(Agent, 'findByIdAndDelete', () => result);
  const request = { validated: { body: { fullName: 'Updated' }, params: { id: id.toUpperCase() } } };
  const response = { statusCode: 200, body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, end() { return this; } };
  const next = t.mock.fn();
  return { events, request, response, next };
}

for (const [name, controller, status] of [['create', createAgent, 201], ['update', updateAgent, 200], ['delete', deleteAgent, 204]]) {
  test(`${name} invalidates every list variant and the affected detail only after MongoDB success`, async (t) => {
    const { redis, state, lists, details } = setup(t);
    const generation = await state.readGeneration();
    const variants = [query, { ...query, page: 2 }, { ...query, limit: 5 },
      { ...query, search: 'Alex' }, { ...query, status: 'inactive' },
      { ...query, serviceArea: 'Central' }, { ...query, search: 'Alex', status: 'active', serviceArea: 'North' }];
    for (const params of variants) await lists.write(params, listResponse(params), 60, generation);
    await details.write(id, detail, 60, generation);
    assert.ok((await details.read(id)).response);
    const otherKey = 'unrelated:application:key';
    redis.prime(otherKey, 'untouched');
    const mocks = mutationMocks(t);
    t.mock.method(agentCacheState, 'invalidate', async (agentId) => {
      mocks.events.push('invalidation');
      await state.invalidate(agentId);
    });
    await controller(mocks.request, mocks.response, mocks.next);
    assert.equal(mocks.response.statusCode, status);
    assert.equal(mocks.next.mock.callCount(), 0);
    assert.deepEqual(mocks.events, ['mongodb success', 'invalidation']);
    assert.notEqual(redis.generation, generation);
    assert.deepEqual(redis.del.mock.calls[0].arguments, [agentDetailCacheKey(id)]);
    for (const params of variants) assert.equal((await lists.read(params)).response, null);
    assert.equal((await details.read(id)).response, null);
    assert.equal(await redis.get(otherKey), 'untouched');
    // Invalidation work does not grow with the number of cached query variants.
    assert.equal(redis.generationSet.mock.callCount(), 2); // Initialization + one rotation.
    assert.equal(redis.del.mock.callCount(), 1);
  });
}

test('failed creates, duplicate records, failed updates/deletes, and missing records never invalidate', async (t) => {
  t.mock.method(console, 'error', () => {});
  const invalidation = t.mock.method(agentCacheState, 'invalidate', async () => {});
  const cases = [
    [createAgent, { initError: new Error('index failure') }],
    [createAgent, { error: Object.assign(new Error('duplicate'), { code: 11000 }) }],
    [createAgent, { error: new Error('database failure') }],
    [updateAgent, { record: null }], [deleteAgent, { record: null }],
    [updateAgent, { error: new Error('database failure') }],
    [updateAgent, { error: Object.assign(new Error('duplicate'), { code: 11000 }) }],
    [deleteAgent, { error: new Error('database failure') }],
  ];
  for (const [controller, options] of cases) {
    const mocks = mutationMocks(t, options);
    await controller(mocks.request, mocks.response, mocks.next);
    assert.equal(mocks.next.mock.callCount(), 1);
    assert.equal(invalidation.mock.callCount(), 0);
  }
});

test('Redis unavailable or either invalidation command failing preserves each mutation success', async (t) => {
  for (const redis of [null, fakeRedis(t, { generationWriteError: true }), fakeRedis(t, { deleteError: true })]) {
    for (const [controller, status] of [[createAgent, 201], [updateAgent, 200], [deleteAgent, 204]]) {
      const { state, logger } = setup(t, redis);
      t.mock.method(agentCacheState, 'invalidate', state.invalidate);
      const mocks = mutationMocks(t);
      await controller(mocks.request, mocks.response, mocks.next);
      assert.equal(mocks.response.statusCode, status);
      assert.equal(mocks.next.mock.callCount(), 0);
      assert.equal(await state.readGeneration(), null);
      assert.doesNotMatch(JSON.stringify(logger.warn.mock.calls.map((call) => call.arguments)), /fake-private|stack|redis:\/\//);
    }
    if (redis) {
      assert.equal(redis.generationSet.mock.callCount(), 3);
      assert.equal(redis.del.mock.callCount(), 3);
    }
  }
});

test('failed invalidation bypasses warm caches until a later successful rotation', async (t) => {
  const { redis, state, lists, details } = setup(t);
  const old = await state.readGeneration();
  await lists.write(query, listResponse(), 60, old);
  await details.write(id, detail, 60, old);
  const original = redis.generationSet;
  let fail = true;
  t.mock.method(redis, 'generationSet', (...args) => {
    if (fail) throw new Error('fake-private-invalidation-details');
    return original(...args);
  });
  await state.invalidate(id);
  assert.equal((await lists.read(query)).response, null);
  assert.equal((await details.read(id)).response, null);
  assert.equal(state.canWrite, false);
  fail = false;
  await state.invalidate(id);
  assert.equal(state.canWrite, true);
  assert.notEqual(await state.readGeneration(), old);
});

test('late fills from pre-mutation reads cannot make stale list or detail data usable', async (t) => {
  const { state, lists, details } = setup(t);
  const oldListRead = await lists.read(query);
  const oldDetailRead = await details.read(id);
  await state.invalidate(id);
  // Simulate MongoDB reads finishing after the mutation and its invalidation.
  await lists.write(query, listResponse(), 60, oldListRead.generation);
  await details.write(id, detail, 60, oldDetailRead.generation);
  const currentList = await lists.read(query);
  const currentDetail = await details.read(id);
  assert.equal(currentList.response, null);
  assert.equal(currentDetail.response, null);
  const fresh = { ...detail, data: { ...detail.data, fullName: 'Updated' } };
  await details.write(id, fresh, 60, currentDetail.generation);
  assert.equal((await details.read(id)).response.data.fullName, 'Updated');
});

test('evicting the generation key creates a fresh token instead of reviving old entries', async (t) => {
  const { redis, state, lists, details } = setup(t);
  const old = await state.readGeneration();
  await lists.write(query, listResponse(), 60, old);
  await details.write(id, detail, 60, old);
  await redis.del(AGENT_CACHE_GENERATION_KEY);
  assert.equal((await lists.read(query)).response, null);
  assert.equal((await details.read(id)).response, null);
  assert.notEqual(redis.generation, old);
  assert.notEqual(agentListCacheKey(query, old), agentListCacheKey(query, redis.generation));
});

test('a stalled invalidation is bounded, still attempts detail deletion, and disables caching', async (t) => {
  const { redis, state } = setup(t);
  t.mock.method(redis, 'generationSet', () => new Promise(() => {}));
  await state.invalidate(id);
  assert.equal(redis.del.mock.callCount(), 1);
  assert.equal(state.canWrite, false);
  assert.equal(await state.readGeneration(), null);
});

test('two cache managers share initialization and observe rotations without a process-local generation cache', async (t) => {
  const redis = fakeRedis(t);
  const first = setup(t, redis).state;
  const second = setup(t, redis).state;
  const [one, two] = await Promise.all([first.readGeneration(), second.readGeneration()]);
  assert.ok(one);
  assert.equal(one, two);
  await first.invalidate(id);
  assert.notEqual(await second.readGeneration(), one);
});

test('an earlier successful invalidation completing late cannot undo a concurrent failure bypass', async (t) => {
  const { redis, state } = setup(t);
  await state.readGeneration();
  const original = redis.generationSet;
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  let calls = 0;
  t.mock.method(redis, 'generationSet', async (...args) => {
    if (++calls > 1) throw new Error('Controlled concurrent failure');
    await original(...args);
    started.resolve();
    await release.promise;
    return 'OK';
  });
  const first = state.invalidate(id);
  await started.promise;
  await state.invalidate('68f2d0000000000000000002');
  release.resolve();
  await first;
  assert.equal(state.canWrite, false);
  assert.equal(await state.readGeneration(), null);
});
