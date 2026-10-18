// Opt-in integration check: uses Atlas, but writes only to a disposable collection.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Agent from '../src/models/Agent.js';
import { startServer } from '../src/startup.js';

const collectionName = `fleetflow_step7_check_${randomUUID().replaceAll('-', '')}`;
const TestAgent = mongoose.model('Step7IntegrationAgent', Agent.schema.clone(), collectionName);
const originalInit = Agent.init;
const originalCreate = Agent.create;
let running;
let testCollectionReady = false;

// Route calls still use real Mongoose operations, targeting the isolated model.
Agent.init = () => TestAgent.init();
Agent.create = (data) => TestAgent.create(data);

const timeout = setTimeout(() => {
  console.error('Integration check timed out. Check for a leftover fleetflow_step7_check_ collection.');
  process.exit(1);
}, 45000);

try {
  const { env } = await import('../src/config/env.js');
  running = await startServer({ ...env, PORT: 0 });
  await TestAgent.init();
  testCollectionReady = true;
  const base = `http://127.0.0.1:${running.server.address().port}`;
  const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(5000) });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { success: true, message: 'FleetFlow API is running' });

  const payload = {
    agentId: 'STEP7-INTEGRATION-001',
    fullName: ' Integration Agent ',
    phone: '+1 202-555-0142',
    email: ' STEP7@EXAMPLE.COM ',
    serviceArea: 'Test Area',
  };
  const send = () => fetch(base + '/api/agents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
  });
  const created = await send();
  assert.equal(created.status, 201);
  const body = await created.json();
  assert.equal(body.data.status, 'active');
  assert.equal(body.data.email, 'step7@example.com');
  assert.equal(body.data.fullName, 'Integration Agent');

  // Read directly from MongoDB to prove storage, not merely an HTTP mock result.
  const stored = await TestAgent.collection.findOne({ agentId: payload.agentId });
  assert.ok(stored);
  assert.equal(stored._id.toString(), body.data.id);
  assert.equal(stored.email, 'step7@example.com');
  assert.equal(stored.status, 'active');
  assert.ok(stored.createdAt instanceof Date);
  assert.ok(stored.updatedAt instanceof Date);
  const duplicate = await send();
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { success: false, message: 'An agent with this agentId already exists' });
  assert.equal(await TestAgent.countDocuments(), 1);
  console.log('PASS real Atlas: gated startup, health 200, create 201, stored document and timestamps, duplicate 409.');
} catch {
  // Driver/assertion errors may contain private connection details or documents.
  console.error('Create-agent integration check failed. Check Atlas access, local configuration, and database permissions.');
  process.exitCode = 1;
} finally {
  Agent.init = originalInit;
  Agent.create = originalCreate;
  try {
    // Only this randomly named, owned collection may be dropped.
    if (mongoose.connection.readyState === 1 && /^fleetflow_step7_check_[a-f0-9]{32}$/.test(collectionName)) {
      try {
        await TestAgent.collection.drop();
        console.log('Disposable integration collection removed.');
      } catch (error) {
        if (error.code !== 26 || testCollectionReady) throw error;
      }
    }
  } catch {
    console.error('Integration cleanup failed. Check for a leftover fleetflow_step7_check_ collection.');
    process.exitCode = 1;
  } finally {
    try {
      if (running) await running.shutdown();
      else await mongoose.disconnect();
    } catch {
      console.error('Integration connection cleanup failed.');
      process.exitCode = 1;
    }
    clearTimeout(timeout);
  }
}
