import assert from 'node:assert/strict';
import test from 'node:test';
import Agent from '../src/models/Agent.js';

function validAgent(overrides = {}) {
  return {
    agentId: 'AGENT-001',
    fullName: 'Alex Morgan',
    phone: '+1 202-555-0142',
    email: 'alex@example.com',
    serviceArea: 'Central',
    ...overrides,
  };
}

const requiredFields = ['agentId', 'fullName', 'phone', 'email', 'serviceArea'];

test('valid agents pass validation with either allowed status', async () => {
  for (const status of ['active', 'inactive']) {
    const agent = new Agent(validAgent({ status }));
    await agent.validate();
    assert.equal(agent.status, status);
  }
});

test('each missing required field fails validation', async () => {
  for (const field of requiredFields) {
    const data = validAgent();
    delete data[field];
    await assert.rejects(new Agent(data).validate(), (error) => {
      assert.equal(error.errors[field]?.kind, 'required', field);
      return true;
    });
  }
});

test('required strings reject empty, whitespace-only, and null values', async () => {
  for (const field of requiredFields) {
    for (const value of ['', '   ', null]) {
      await assert.rejects(new Agent(validAgent({ [field]: value })).validate(), (error) => {
        assert.equal(error.errors[field]?.kind, 'required', field);
        return true;
      });
    }
  }
});

test('invalid or null status fails validation', async () => {
  for (const status of ['pending', 'ACTIVE', '', null]) {
    await assert.rejects(new Agent(validAgent({ status })).validate(), (error) => {
      assert.ok(error.errors.status, `Expected status ${status} to fail`);
      return true;
    });
  }
});

test('status defaults to active when omitted', async () => {
  const agent = new Agent(validAgent());
  await agent.validate();
  assert.equal(agent.status, 'active');
});

test('strings are trimmed and email is normalized to lowercase', async () => {
  const agent = new Agent({
    agentId: '  AGENT-001  ',
    fullName: '  Alex Morgan  ',
    phone: '  +1 202-555-0142  ',
    email: '  Alex@Example.COM  ',
    serviceArea: '  Central  ',
    status: '  inactive  ',
  });
  await agent.validate();
  for (const [field, value] of Object.entries(validAgent({ status: 'inactive' }))) {
    assert.equal(agent[field], value, field);
  }
});

test('automatic createdAt and updatedAt timestamps are configured as dates', () => {
  assert.equal(Agent.schema.options.timestamps, true);
  assert.equal(Agent.schema.path('createdAt').instance, 'Date');
  assert.equal(Agent.schema.path('updatedAt').instance, 'Date');
});

test('agentId has a unique index while phone and email allow shared contact details', async () => {
  const uniqueIndexes = Agent.schema.indexes()
    .filter(([, options]) => options.unique)
    .map(([fields]) => fields);
  assert.deepEqual(uniqueIndexes, [{ agentId: 1 }]);

  // In-memory validation never contacts MongoDB or enforces unique indexes.
  const first = new Agent(validAgent());
  const second = new Agent(validAgent({ agentId: 'AGENT-002' }));
  await first.validate();
  await second.validate();
});
