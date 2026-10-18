import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';
import { agentParamsSchema } from '../src/validation/agentSchemas.js';

const id = '68f2d0000000000000000001';

function sampleAgent() {
  return new Agent({
    _id: id, agentId: 'AGENT-001', fullName: 'Alex Morgan', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'Central', __v: 0,
    createdAt: new Date('2026-10-18T00:00:00.000Z'),
    updatedAt: new Date('2026-10-18T00:00:00.000Z'),
  }).toObject();
}

async function startTestServer(t, { record = sampleAgent(), error } = {}) {
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
  return { base: `http://127.0.0.1:${server.address().port}`, findById, find, query };
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
