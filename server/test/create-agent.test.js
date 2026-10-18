import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';

function validBody(overrides = {}) {
  return {
    agentId: 'AGENT-001',
    fullName: 'Alex Morgan',
    phone: '+1 202-555-0142',
    email: 'alex@example.com',
    serviceArea: 'Central',
    ...overrides,
  };
}

async function startTestServer(t) {
  // Only persistence and index initialization are mocked; routing is real.
  const init = t.mock.method(Agent, 'init', async () => Agent);
  const create = t.mock.method(Agent, 'create', async (data) => {
    const agent = new Agent({ ...data, __v: 0 });
    await agent.validate();
    // Mock timestamps represent a completed write, not a real database save.
    agent.createdAt = new Date('2026-10-18T00:00:00.000Z');
    agent.updatedAt = agent.createdAt;
    return agent;
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return { base: `http://127.0.0.1:${server.address().port}`, init, create };
}

function post(base, body) {
  return fetch(base + '/api/agents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
}

test('POST /api/agents returns 201, normalized public data, and a model-generated ID', async (t) => {
  const { base, init, create } = await startTestServer(t);
  const response = await post(base, validBody({ fullName: '  Alex Morgan  ', email: '  Alex@Example.COM  ', status: 'inactive' }));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.deepEqual(body, {
    success: true, message: 'Agent created successfully',
    data: {
      id: body.data.id, ...validBody(), status: 'inactive',
      createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z',
    },
  });
  assert.match(body.data.id, /^[a-f0-9]{24}$/);
  assert.equal(init.mock.callCount(), 1);
  assert.equal(create.mock.callCount(), 1);
  assert.deepEqual(create.mock.calls[0].arguments, [validBody({ status: 'inactive' })]);
});

test('omitted status is supplied by the model as active', async (t) => {
  const { base, create } = await startTestServer(t);
  const response = await post(base, validBody());
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.status, 'active');
  assert.equal(Object.hasOwn(create.mock.calls[0].arguments[0], 'status'), false);
});

test('each missing, wrong-type, or blank required field returns 400 before persistence', async (t) => {
  const { base, init, create } = await startTestServer(t);
  for (const field of ['agentId', 'fullName', 'phone', 'email', 'serviceArea']) {
    for (const value of [undefined, 42, null, '   ']) {
      const response = await post(base, validBody({ [field]: value }));
      assert.equal(response.status, 400, field);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.message, 'Request validation failed');
      assert.ok(body.details.some((detail) => detail.section === 'body' && detail.field === field));
    }
  }
  assert.equal(init.mock.callCount(), 0);
  assert.equal(create.mock.callCount(), 0);
});

test('invalid email, status, extra fields, and non-object bodies return 400', async (t) => {
  const { base, create } = await startTestServer(t);
  const cases = [
    validBody({ email: 'invalid-address' }),
    ...['pending', 'ACTIVE', '', null, 42].map((status) => validBody({ status })),
    validBody({ unexpected: true }), validBody({ _id: 'caller-controlled' }),
    validBody({ createdAt: '2026-01-01' }), validBody({ __v: 1 }), [],
  ];
  for (const data of cases) {
    const response = await post(base, data);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, 'Request validation failed');
  }
  assert.equal(create.mock.callCount(), 0);
});

test('duplicate agentId produces a safe JSON 409 without driver details', async (t) => {
  const { base } = await startTestServer(t);
  t.mock.method(Agent, 'create', async () => {
    throw Object.assign(new Error('fake-private-driver-details'), { code: 11000, keyValue: { agentId: 'fake-private-value' } });
  });
  const response = await post(base, validBody());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { success: false, message: 'An agent with this agentId already exists' });
});

test('index readiness is awaited before create and index failures prevent writes', async (t) => {
  const { base, create } = await startTestServer(t);
  let indexReady = false;
  t.mock.method(Agent, 'init', async () => { await Promise.resolve(); indexReady = true; return Agent; });
  const originalCreate = Agent.create;
  t.mock.method(Agent, 'create', async (data) => {
    assert.equal(indexReady, true);
    return originalCreate(data);
  });
  assert.equal((await post(base, validBody())).status, 201);
  t.mock.method(Agent, 'init', async () => { throw new Error('fake-private-index-error'); });
  const log = t.mock.method(console, 'error', () => {});
  const callsBefore = create.mock.callCount();
  const failed = await post(base, validBody());
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { success: false, message: 'Internal server error' });
  assert.equal(create.mock.callCount(), callsBefore);
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private/);
});

test('unexpected persistence errors use the existing safe 500 response and logging', async (t) => {
  const { base } = await startTestServer(t);
  t.mock.method(Agent, 'create', async () => { throw new Error('fake-private-database-error'); });
  const log = t.mock.method(console, 'error', () => {});
  const response = await post(base, validBody());
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
});

test('health and unknown routes work; update and delete remain unimplemented', async (t) => {
  const { base, create } = await startTestServer(t);
  const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(5000) });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { success: true, message: 'FleetFlow API is running' });
  for (const [method, path] of [['GET', '/missing'], ['GET', '/api/agents/example/extra'], ['PATCH', '/api/agents/example'], ['DELETE', '/api/agents/example']]) {
    const response = await fetch(base + path, { method, signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { success: false, message: 'Route not found' });
  }
  assert.equal(create.mock.callCount(), 0);
});
