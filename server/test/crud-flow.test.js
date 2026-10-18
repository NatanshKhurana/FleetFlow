import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';
import { verifyCrudFlow } from '../test-support/crudFlow.js';

function queryResult(read) {
  const options = { skip: 0, limit: 10 };
  const query = {
    select() { return query; },
    lean() { return query; },
    sort() { return query; },
    skip(value) { options.skip = value; return query; },
    limit(value) { options.limit = value; return query; },
    async exec() { return structuredClone(await read(options)); },
  };
  return query;
}

test('CRUD lifecycle shares state across requests, rejects failed writes, and leaves deleted records missing', async (t) => {
  // A new store and deterministic clock belong to this test only.
  // This simulates storage, not MongoDB's query engine or unique index enforcement.
  const records = new Map();
  let sequence = 0;
  let clock = Date.parse('2026-01-01T00:00:00.000Z');
  t.mock.method(Agent, 'init', async () => Agent);
  t.mock.method(Agent, 'create', async (data) => {
    if ([...records.values()].some((record) => record.agentId === data.agentId)) {
      throw Object.assign(new Error('Simulated duplicate'), { code: 11000 });
    }
    const agent = new Agent({ ...data, _id: (++sequence).toString(16).padStart(24, '0') });
    await agent.validate();
    agent.createdAt = agent.updatedAt = new Date(++clock);
    // Store a plain ID so structuredClone does not strip ObjectId's prototype.
    const record = { ...agent.toObject(), _id: agent._id.toString() };
    records.set(record._id, record);
    return agent;
  });
  t.mock.method(Agent, 'findById', (id) => queryResult(() => records.get(id) ?? null));
  t.mock.method(Agent, 'findByIdAndUpdate', (id, operation) => queryResult(() => {
    const record = records.get(id);
    if (!record) return null;
    const updated = { ...record, ...operation.$set, updatedAt: new Date(++clock) };
    records.set(id, updated);
    return updated;
  }));
  t.mock.method(Agent, 'findByIdAndDelete', (id) => queryResult(() => {
    const record = records.get(id) ?? null;
    records.delete(id);
    return record;
  }));
  t.mock.method(Agent, 'find', (filter) => {
    // Search/filter/sort contracts already have dedicated list tests.
    assert.deepEqual(filter, {});
    return queryResult(({ skip, limit }) => [...records.values()].slice(skip, skip + limit));
  });
  t.mock.method(Agent, 'countDocuments', (filter) => {
    assert.deepEqual(filter, {});
    return queryResult(() => records.size);
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  await verifyCrudFlow(`http://127.0.0.1:${server.address().port}`);
  assert.equal(records.size, 0);
});
