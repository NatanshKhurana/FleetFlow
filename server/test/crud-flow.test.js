import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import { mockAgentStore } from '../test-support/mockAgentStore.js';
import { verifyCrudFlow } from '../test-support/crudFlow.js';
import { fakeRedis } from '../test-support/fakeRedis.js';
import { agentCacheState, createAgentCacheState } from '../src/services/agentCacheState.js';
import { agentListCache, createAgentListCache } from '../src/services/agentListCache.js';
import { agentDetailCache, createAgentDetailCache } from '../src/services/agentDetailCache.js';

for (const cacheEnabled of [false, true]) {
test(`CRUD lifecycle with caching ${cacheEnabled ? 'enabled' : 'unavailable'} preserves mutations and missing records`, async (t) => {
  const redis = cacheEnabled ? fakeRedis(t) : null;
  const options = { getClient: () => redis, logger: { warn() {} } };
  const state = createAgentCacheState(options);
  const lists = createAgentListCache({ ...options, state });
  const details = createAgentDetailCache({ ...options, state });
  t.mock.method(agentListCache, 'read', lists.read);
  t.mock.method(agentListCache, 'write', lists.write);
  t.mock.method(agentDetailCache, 'read', details.read);
  t.mock.method(agentDetailCache, 'write', details.write);
  t.mock.method(agentCacheState, 'invalidate', state.invalidate);
  const records = mockAgentStore(t);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  await verifyCrudFlow(`http://127.0.0.1:${server.address().port}`);
  assert.equal(records.size, 0);
  if (redis) {
    // Five successful writes; duplicate, invalid, and missing-record requests add none.
    assert.equal(redis.generationSet.mock.callCount(), 6); // Includes first initialization.
    assert.equal(redis.del.mock.callCount(), 5);
  }
});
}
