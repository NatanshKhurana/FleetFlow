import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createServer } from 'vite';
import app from '../../server/src/app.js';
import Agent from '../../server/src/models/Agent.js';
import { mockAgentStore } from '../../server/test-support/mockAgentStore.js';
import { fakeRedis } from '../../server/test-support/fakeRedis.js';
import { agentCacheState, createAgentCacheState } from '../../server/src/services/agentCacheState.js';
import { agentListCache, createAgentListCache } from '../../server/src/services/agentListCache.js';
import { agentDetailCache, createAgentDetailCache } from '../../server/src/services/agentDetailCache.js';
import { createAgentsResource } from '../src/state/agentsResource.js';
import { createAgentResource } from '../src/state/createAgentResource.js';
import { createRequestResource } from '../src/state/requestResource.js';
import { createEditAgentResource, createDeleteAgentResource } from '../src/state/agentMutationResources.js';

// Only storage is simulated. Requests cross Axios, Vite's proxy, Express routes,
// validation, controllers, and the real cache services without live credentials.
for (const cacheEnabled of [false, true]) {
  test(`frontend CRUD and overview integrate with Express through Vite; Redis ${cacheEnabled ? 'enabled' : 'unavailable'}`, async (t) => {
    const records = mockAgentStore(t);
    function matching(filter) {
      return [...records.values()].filter((record) =>
        (!filter.status || record.status === filter.status)
        && (!filter.serviceArea || record.serviceArea === filter.serviceArea)
        && (!filter.$or || filter.$or.some((condition) =>
          Object.entries(condition).some(([field, pattern]) => pattern.test(record[field])))));
    }
    // This fixture interprets the controller's filters and descending sort;
    // dedicated backend tests separately assert MongoDB query construction.
    t.mock.method(Agent, 'find', (filter) => {
      let skip = 0;
      let limit = 10;
      const query = {
        select() { return query; }, lean() { return query; },
        sort(order) { assert.deepEqual(order, { createdAt: -1, _id: -1 }); return query; },
        skip(value) { skip = value; return query; },
        limit(value) { limit = value; return query; },
        async exec() { return structuredClone(matching(filter).reverse().slice(skip, skip + limit)); },
      };
      return query;
    });
    t.mock.method(Agent, 'countDocuments', (filter) => ({ async exec() { return matching(filter).length; } }));
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

    const backend = app.listen(0, '127.0.0.1');
    t.after(() => new Promise((resolve) => { backend.close(resolve); backend.closeAllConnections(); }));
    await once(backend, 'listening');
    const vite = await createServer({
      envDir: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: '127.0.0.1', port: 0, watch: null, hmr: false, ws: false,
        proxy: { '/api': { target: `http://127.0.0.1:${backend.address().port}`, changeOrigin: true } } },
    });
    t.after(() => vite.close());
    await vite.listen();
    const api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
    assert.equal(api.defaults.baseURL, '/api');
    assert.equal(api.defaults.timeout, 10000);
    // Node needs an origin; preserve the actual browser client's /api base path.
    api.defaults.baseURL = `http://127.0.0.1:${vite.httpServer.address().port}${api.defaults.baseURL}`;
    const { createAgent, fetchAgents, fetchAgentById, updateAgent, deleteAgent } =
      await vite.ssrLoadModule('/src/services/agentsService.js');
    const { fetchOverview } = await vite.ssrLoadModule('/src/services/overviewService.js');
    const list = createAgentsResource(fetchAgents);
    t.after(() => list.cancel());
    await list.load();
    assert.equal(list.getSnapshot().data.pagination.total, 0);
    assert.equal((await fetchOverview()).total, 0); // Prime empty overview/list caches.

    const created = [];
    for (let index = 1; index <= 7; index++) {
      const form = createAgentResource(createAgent, async (agent) => {
        created.push(agent);
        await list.clearFilters(); // Same refresh used by AgentsPage.
      });
      const values = { agentId: `INTEGRATION-${index}`, fullName: ` Driver ${index} `,
        phone: '+91 98765 43210', email: ` DRIVER${index}@EXAMPLE.COM `,
        serviceArea: index <= 4 ? 'North' : 'South', status: index % 2 ? 'active' : 'inactive' };
      for (const [field, value] of Object.entries(values)) form.setField(field, value);
      await form.submit();
      assert.equal(form.getSnapshot().status, 'success');
      assert.equal(list.getSnapshot().data.pagination.total, index);
      assert.equal(list.getSnapshot().data.agents[0].id, created.at(-1).id);
    }
    let overview = await fetchOverview();
    assert.deepEqual([overview.total, overview.active, overview.inactive], [7, 4, 3]);
    assert.deepEqual(overview.recentAgents.map((agent) => agent.id), created.slice(-5).reverse().map((agent) => agent.id));
    await list.applyFilters({ search: ' driver ', status: 'active', serviceArea: ' North ', limit: 1 });
    assert.equal(list.getSnapshot().data.pagination.total, 2);
    assert.equal(list.getSnapshot().data.pagination.totalPages, 2);
    assert.equal(list.getSnapshot().data.agents[0].id, created[2].id);
    await list.goToPage(2);
    assert.equal(list.getSnapshot().data.agents[0].id, created[0].id);
    await list.applyFilters({ search: 'Driver .*' }); // Search must be literal, not regex.
    assert.equal(list.getSnapshot().data.pagination.total, 0);

    const initial = await fetchAgentById(created[0].id);
    assert.equal(initial.agent.fullName, 'Driver 1');
    assert.equal(initial.agent.email, 'driver1@example.com');
    await fetchAgentById(initial.agent.id); // Warm detail cache before PATCH.
    let refreshed;
    const edit = createEditAgentResource(initial.agent, updateAgent, async (agent) => {
      refreshed = await fetchAgentById(agent.id); // Detail route's fresh GET after save.
    });
    edit.setField('phone', 'abc');
    await edit.submit();
    assert.equal(edit.getSnapshot().status, 'invalid');
    edit.setField('phone', initial.agent.phone);
    edit.setField('fullName', ' Updated Driver ');
    edit.setField('status', 'inactive');
    await edit.submit();
    assert.equal(edit.getSnapshot().status, 'success');
    assert.equal(refreshed.agent.fullName, 'Updated Driver');
    assert.equal(refreshed.agent.phone, initial.agent.phone);
    assert.equal(refreshed.agent.agentId, initial.agent.agentId);
    assert.notEqual(refreshed.agent.updatedAt, initial.agent.updatedAt);
    overview = await fetchOverview();
    assert.deepEqual([overview.total, overview.active, overview.inactive], [7, 3, 4]);

    // Backend phone validation also remains enforced for callers bypassing forms.
    await assert.rejects(updateAgent(initial.agent.id, { phone: 'abc' }), (error) => error.response.status === 400);
    assert.equal((await fetchAgentById(initial.agent.id)).agent.phone, initial.agent.phone);
    await list.applyFilters({ search: 'Updated Driver', status: 'inactive', serviceArea: 'North' });
    assert.equal(list.getSnapshot().data.agents[0].fullName, 'Updated Driver');
    const cancelled = createDeleteAgentResource(refreshed.agent, deleteAgent);
    assert.equal(cancelled.cancel(), true);
    await cancelled.confirm();
    assert.equal((await fetchAgentById(initial.agent.id)).kind, 'found');
    const deletion = createDeleteAgentResource(refreshed.agent, deleteAgent, () => list.load());
    await deletion.confirm();
    assert.equal(deletion.getSnapshot().status, 'success');
    assert.deepEqual(list.getSnapshot().data.agents, []);
    assert.equal(list.getQuery().search, 'Updated Driver');
    assert.equal(list.getQuery().status, 'inactive');
    assert.equal(list.getQuery().serviceArea, 'North');
    assert.equal((await fetchAgentById(initial.agent.id)).kind, 'not-found');
    overview = await fetchOverview();
    assert.deepEqual([overview.total, overview.active, overview.inactive], [6, 3, 3]);
    assert.equal(records.size, 6);
    if (redis) {
      assert.equal(redis.del.mock.callCount(), 9); // Seven creates, one update, one delete.
      assert.ok(redis.get.mock.callCount() > 0);
      assert.ok(redis.set.mock.callCount() > 0);
    }

    await t.test('confirmed writes survive failed follow-up GETs and read retries send no mutations', async (subtest) => {
      let failList = true;
      let failDetail = false;
      const originalFind = Agent.find;
      const originalDetail = Agent.findById;
      subtest.mock.method(Agent, 'find', (...args) => {
        if (failList) throw new Error('private list read failure');
        return originalFind(...args);
      });
      subtest.mock.method(Agent, 'findById', (...args) => {
        if (failDetail) throw new Error('private detail read failure');
        return originalDetail(...args);
      });
      subtest.mock.method(console, 'error', () => {});
      const methods = [];
      const interceptor = api.interceptors.request.use((config) => {
        methods.push(config.method.toUpperCase());
        return config;
      });
      subtest.after(() => api.interceptors.request.eject(interceptor));
      const mutations = () => methods.filter((method) => method !== 'GET');
      let saved;
      const creation = createAgentResource(createAgent, async (agent) => {
        saved = agent;
        await list.clearFilters();
      });
      const values = { agentId: 'RELOAD-FAILURE', fullName: 'Reload Driver', phone: '123',
        email: 'reload@example.com', serviceArea: 'North', status: 'active' };
      for (const [field, value] of Object.entries(values)) creation.setField(field, value);
      await creation.submit();
      assert.equal(creation.getSnapshot().status, 'success');
      assert.equal(list.getSnapshot().status, 'error');
      assert.ok(records.has(saved.id));
      assert.doesNotMatch(JSON.stringify(list.getSnapshot()), /private/);
      failList = false;
      await list.load(); // The same read-only action used by Try again.
      await creation.submit(); // A confirmed creation must remain guarded.
      assert.equal(list.getSnapshot().status, 'success');
      assert.ok(list.getSnapshot().data.agents.some((agent) => agent.id === saved.id));
      assert.deepEqual(mutations(), ['POST']);

      const detail = createRequestResource(({ signal }) => fetchAgentById(saved.id, { signal }));
      subtest.after(() => detail.cancel());
      await detail.load();
      failDetail = true;
      const edit = createEditAgentResource(saved, updateAgent, () => detail.load());
      edit.setField('fullName', 'Saved despite reload failure');
      await edit.submit();
      assert.equal(edit.getSnapshot().status, 'success');
      assert.equal(detail.getSnapshot().status, 'error');
      assert.equal(records.get(saved.id).fullName, 'Saved despite reload failure');
      assert.equal(detail.getSnapshot().data.agent.fullName, 'Reload Driver');
      failDetail = false;
      await detail.load();
      await edit.submit();
      assert.equal(detail.getSnapshot().status, 'success');
      assert.equal(detail.getSnapshot().data.agent.fullName, 'Saved despite reload failure');
      assert.deepEqual(mutations(), ['POST', 'PATCH']);

      failList = true;
      const deletion = createDeleteAgentResource(detail.getSnapshot().data.agent, deleteAgent, () => list.load());
      await deletion.confirm();
      assert.equal(deletion.getSnapshot().status, 'success');
      assert.equal(list.getSnapshot().status, 'error');
      assert.equal(records.has(saved.id), false);
      failList = false;
      await list.load();
      await deletion.confirm();
      assert.equal(list.getSnapshot().status, 'success');
      assert.equal(list.getSnapshot().data.agents.some((agent) => agent.id === saved.id), false);
      await detail.load();
      assert.equal(detail.getSnapshot().data.kind, 'not-found');
      assert.deepEqual(mutations(), ['POST', 'PATCH', 'DELETE']);
      assert.equal(records.size, 6);
      if (redis) assert.equal(redis.del.mock.callCount(), 12);
    });
  });
}
