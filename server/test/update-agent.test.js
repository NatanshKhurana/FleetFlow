import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';
import { updateAgentSchema } from '../src/validation/agentSchemas.js';

const id = '68f2d0000000000000000001';

function sampleAgent() {
  return new Agent({
    _id: id, agentId: 'AGENT-001', fullName: 'Alex Morgan', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'Central', status: 'inactive', __v: 0,
    createdAt: new Date('2026-10-18T00:00:00.000Z'),
    updatedAt: new Date('2026-10-18T00:00:00.000Z'),
  }).toObject();
}

async function startTestServer(t, { missing = false, error } = {}) {
  const original = sampleAgent();
  const query = {};
  let changes;
  query.select = t.mock.fn(() => query);
  query.lean = t.mock.fn(() => query);
  query.exec = t.mock.fn(async () => {
    if (error) throw error;
    if (missing) return null;
    // Simulate persistence for HTTP tests; timestamp middleware is tested separately.
    return { ...original, ...changes, updatedAt: new Date('2026-10-18T01:00:00.000Z') };
  });
  const update = t.mock.method(Agent, 'findByIdAndUpdate', (value, operation) => {
    changes = operation.$set;
    return query;
  });
  const find = t.mock.method(Agent, 'find', () => assert.fail('Updates must not fetch the list'));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((failure) => failure ? reject(failure) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return { base: `http://127.0.0.1:${server.address().port}`, update, query, find };
}

function patch(base, body, value = id) {
  return fetch(base + '/api/agents/' + encodeURIComponent(value), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
}

test('one-field PATCH preserves omitted fields and returns only updated public data', async (t) => {
  const { base, update, query, find } = await startTestServer(t);
  const response = await patch(base, { fullName: 'Taylor Smith' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true, message: 'Agent updated successfully',
    data: {
      id, agentId: 'AGENT-001', fullName: 'Taylor Smith', phone: '+1 202-555-0142',
      email: 'alex@example.com', serviceArea: 'Central', status: 'inactive',
      createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T01:00:00.000Z',
    },
  });
  assert.equal(update.mock.callCount(), 1);
  assert.deepEqual(update.mock.calls[0].arguments, [
    id, { $set: { fullName: 'Taylor Smith' } },
    { returnDocument: 'after', runValidators: true, upsert: false },
  ]);
  assert.deepEqual(query.select.mock.calls[0].arguments, ['agentId fullName phone email serviceArea status createdAt updatedAt']);
  assert.equal(query.lean.mock.callCount(), 1);
  assert.equal(query.exec.mock.callCount(), 1);
  assert.equal(find.mock.callCount(), 0);
});

test('multiple editable fields are trimmed and email is lowercased', async (t) => {
  const { base, update } = await startTestServer(t);
  const response = await patch(base, {
    fullName: '  Taylor Smith  ', phone: '  +1 202-555-0199  ',
    email: '  TAYLOR@Example.COM  ', serviceArea: '  North  ', status: '  active  ',
  }, id.toUpperCase());
  const normalized = {
    fullName: 'Taylor Smith', phone: '+1 202-555-0199', email: 'taylor@example.com',
    serviceArea: 'North', status: 'active',
  };
  assert.equal(response.status, 200);
  const body = await response.json();
  for (const [field, value] of Object.entries(normalized)) assert.equal(body.data[field], value);
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: normalized });
  assert.equal(update.mock.calls[0].arguments[0], id.toUpperCase());
});

test('empty bodies, immutable fields, unknown fields, and update operators are rejected', async (t) => {
  const { base, update } = await startTestServer(t);
  const cases = [{}, [], ...['agentId', '_id', 'id', 'createdAt', 'updatedAt', '__v', 'unknown', '$set']
    .map((field) => ({ fullName: 'Taylor', [field]: 'caller-controlled' }))];
  for (const data of cases) {
    const response = await patch(base, data);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.message, 'Request validation failed');
    assert.equal(body.success, false);
    assert.ok(body.details.some((detail) => detail.section === 'body' && detail.field === '(root)'));
  }
  assert.equal(update.mock.callCount(), 0);
});

test('invalid field types, blank values, email, and status fail before updating', async (t) => {
  const { base, update } = await startTestServer(t);
  const cases = [];
  for (const field of ['fullName', 'phone', 'email', 'serviceArea', 'status']) {
    for (const value of [null, 42, true, {}, [], '   ']) cases.push({ [field]: value });
  }
  cases.push({ email: 'not-an-email' }, { status: 'pending' }, { status: 'ACTIVE' });
  for (const data of cases) {
    const response = await patch(base, data);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.message, 'Request validation failed');
    assert.ok(body.details.some((detail) => detail.field === Object.keys(data)[0]));
  }
  assert.equal(update.mock.callCount(), 0);
});

test('malformed ObjectIds and business IDs fail parameter validation', async (t) => {
  const { base, update } = await startTestServer(t);
  for (const value of ['AGENT-001', '123', 'g'.repeat(24), ` ${id} `]) {
    const response = await patch(base, { status: 'active' }, value);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false, message: 'Request validation failed',
      details: [{ section: 'params', field: 'id', message: 'Invalid format' }],
    });
  }
  assert.equal(update.mock.callCount(), 0);
});

test('valid but nonexistent ObjectId returns 404 without inserting', async (t) => {
  const { base, update } = await startTestServer(t, { missing: true });
  const response = await patch(base, { status: 'active' });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { success: false, message: 'Agent not found' });
  assert.equal(update.mock.calls[0].arguments[2].upsert, false);
});

test('duplicate-key failures return a safe 409', async (t) => {
  const error = Object.assign(new Error('fake-private-driver-details'), {
    code: 11000, keyValue: { email: 'fake-private-value' },
  });
  const { base } = await startTestServer(t, { error });
  const response = await patch(base, { email: 'taylor@example.com' });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    success: false, message: 'Agent update conflicts with an existing record',
  });
});

test('unexpected update failures use centralized generic 500 responses', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const { base } = await startTestServer(t, { error: new Error('fake-private-database-details') });
  const response = await patch(base, { status: 'active' });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  assert.equal(log.mock.callCount(), 1);
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
});

test('optional undefined values are omitted and never replaced by defaults', () => {
  assert.deepEqual(updateAgentSchema.parse({ fullName: ' Taylor ', status: undefined }), { fullName: 'Taylor' });
  assert.equal(updateAgentSchema.safeParse({ status: undefined }).success, false);
});

test('real Mongoose update middleware adds updatedAt and validates before the mocked database call', async (t) => {
  // Keep real query middleware, but mock the collection call to avoid connecting.
  const collectionUpdate = t.mock.method(Agent.collection, 'findOneAndUpdate', async (filter, update) => ({
    ...sampleAgent(), ...update.$set,
  }));
  const before = Date.now();
  const record = await Agent.findByIdAndUpdate(id, { $set: { fullName: ' Taylor ' } }, {
    returnDocument: 'after', runValidators: true, upsert: false,
  }).lean().exec();
  const [filter, operation, options] = collectionUpdate.mock.calls[0].arguments;
  assert.equal(filter._id.toString(), id);
  assert.equal(operation.$set.fullName, 'Taylor');
  assert.deepEqual(Object.keys(operation.$set).sort(), ['fullName', 'updatedAt']);
  assert.ok(operation.$set.updatedAt instanceof Date);
  assert.ok(operation.$set.updatedAt.getTime() >= before);
  assert.ok(operation.$set.updatedAt.getTime() <= Date.now());
  assert.ok(record.updatedAt > record.createdAt);
  assert.equal(record.createdAt.toISOString(), '2026-10-18T00:00:00.000Z');
  assert.equal(options.returnDocument, 'after');
  assert.equal(options.upsert, false);
  await assert.rejects(Agent.findByIdAndUpdate(id, { $set: { status: 'pending' } }, {
    runValidators: true,
  }).exec(), { name: 'ValidationError' });
  assert.equal(collectionUpdate.mock.callCount(), 1);
});
