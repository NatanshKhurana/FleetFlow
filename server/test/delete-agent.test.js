import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';

const id = '68f2d0000000000000000001';

async function startTestServer(t, { record = { _id: id }, error } = {}) {
  // Exercise real routing and middleware; mock only database operations.
  const query = {};
  query.select = t.mock.fn(() => query);
  query.lean = t.mock.fn(() => query);
  query.exec = t.mock.fn(async () => {
    if (error) throw error;
    return record;
  });
  const remove = t.mock.method(Agent, 'findByIdAndDelete', () => query);
  const find = t.mock.method(Agent, 'find', () => assert.fail('Deletion must not fetch the list'));
  const deleteMany = t.mock.method(Agent, 'deleteMany', () => assert.fail('Deletion must target only one agent'));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((failure) => failure ? reject(failure) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return { base: `http://127.0.0.1:${server.address().port}`, remove, query, find, deleteMany };
}

function removeAgent(base, value = id) {
  return fetch(base + '/api/agents/' + encodeURIComponent(value), {
    method: 'DELETE', signal: AbortSignal.timeout(5000),
  });
}

test('DELETE targets one MongoDB ID and returns 204 with no response body', async (t) => {
  const { base, remove, query, find, deleteMany } = await startTestServer(t, {
    record: { _id: id, internalNote: 'fake-private-metadata' },
  });
  const response = await removeAgent(base);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('content-type'), null);
  assert.equal(remove.mock.callCount(), 1);
  assert.deepEqual(remove.mock.calls[0].arguments, [id]);
  assert.deepEqual(query.select.mock.calls[0].arguments, ['_id']);
  assert.equal(query.lean.mock.callCount(), 1);
  assert.equal(query.exec.mock.callCount(), 1);
  assert.equal(find.mock.callCount(), 0);
  assert.equal(deleteMany.mock.callCount(), 0);
});

test('malformed ObjectIds and business agentIds return 400 before deletion', async (t) => {
  const { base, remove } = await startTestServer(t);
  for (const value of ['AGENT-001', '12345', 'g'.repeat(24), id + '0', ` ${id} `, ' ', '{"$ne":null}']) {
    const response = await removeAgent(base, value);
    assert.equal(response.status, 400, value);
    assert.deepEqual(await response.json(), {
      success: false, message: 'Request validation failed',
      details: [{ section: 'params', field: 'id', message: 'Invalid format' }],
    });
  }
  assert.equal(remove.mock.callCount(), 0);
});

test('uppercase hexadecimal ObjectIds use the same targeted delete operation', async (t) => {
  const { base, remove } = await startTestServer(t);
  const response = await removeAgent(base, id.toUpperCase());
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.deepEqual(remove.mock.calls[0].arguments, [id.toUpperCase()]);
});

test('valid but nonexistent ObjectId returns the standard JSON 404', async (t) => {
  const { base, remove } = await startTestServer(t, { record: null });
  const response = await removeAgent(base);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { success: false, message: 'Agent not found' });
  assert.equal(remove.mock.callCount(), 1);
  assert.deepEqual(remove.mock.calls[0].arguments, [id]);
});

test('unexpected delete errors use centralized safe 500 responses and logging', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const { base } = await startTestServer(t, { error: new Error('fake-private-database-details') });
  const response = await removeAgent(base);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  assert.equal(log.mock.callCount(), 1);
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
});
