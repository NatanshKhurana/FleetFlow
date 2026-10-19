import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';
import { createRequestResource } from '../src/state/requestResource.js';
import { createAgentsResource } from '../src/state/agentsResource.js';
import { createAgentResource } from '../src/state/createAgentResource.js';
import { createEditAgentResource } from '../src/state/agentMutationResources.js';

let vite;
let api;
let services;
let fetchOverview;
let Overview;
let Agents;
let Details;
let Form;
const id = 'abcdef0123456789abcdef01';
const agent = { id, agentId: 'FEEDBACK-1', fullName: 'Feedback Driver', phone: '+91 98765 43210',
  email: 'driver@example.com', serviceArea: 'North', status: 'active',
  createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z' };
const overview = { total: 1, active: 1, inactive: 0, recentAgents: [agent] };
const list = { agents: [agent], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };

before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
  services = await vite.ssrLoadModule('/src/services/agentsService.js');
  ({ fetchOverview } = await vite.ssrLoadModule('/src/services/overviewService.js'));
  Overview = (await vite.ssrLoadModule('/src/components/overview/OverviewContent.jsx')).default;
  Agents = (await vite.ssrLoadModule('/src/components/agents/AgentsContent.jsx')).default;
  Details = (await vite.ssrLoadModule('/src/components/agents/AgentDetailContent.jsx')).default;
  Form = (await vite.ssrLoadModule('/src/components/agents/AddAgentForm.jsx')).AddAgentFormView;
});
after(async () => vite?.close());

function render(Component, state, props = {}) {
  return renderToString(createElement(MemoryRouter, null, createElement(Component,
    { state, query: { search: '', status: '', serviceArea: '' }, onRetry() {}, ...props })));
}

test('initial loading, successful empty results, and cancelled reads have distinct accessible feedback', () => {
  for (const Component of [Overview, Agents, Details]) {
    const loading = render(Component, { status: 'loading', data: null });
    assert.match(loading, /aria-busy="true"/);
    assert.match(loading, /role="status"/);
    assert.doesNotMatch(loading, /No agents yet|No matching agents|Agent not found|>0<|NaN/);
    const cancelled = render(Component, { status: 'cancelled', data: null });
    assert.match(cancelled, /aria-busy="false"/);
    assert.match(cancelled, /Request cancelled/);
    assert.match(cancelled, /Try again/);
    assert.doesNotMatch(cancelled, /Loading|role="alert"/);
  }
  assert.match(render(Overview, { status: 'success', data: { total: 0, active: 0, inactive: 0, recentAgents: [] } }), /No agents yet/);
  assert.match(render(Agents, { status: 'success', data: { ...list, agents: [], pagination: { ...list.pagination, total: 0, totalPages: 0 } } }), /No agents yet/);
  assert.match(render(Details, { status: 'success', data: { kind: 'not-found', agent: null } }), /Agent not found/);
});

test('same-data refreshes keep overview, table, and details visible with clear stale-data feedback', () => {
  for (const [Component, data] of [[Overview, overview], [Agents, list], [Details, { kind: 'found', agent }]]) {
    const loading = render(Component, { status: 'loading', data });
    assert.match(loading, /Feedback Driver/);
    assert.match(loading, /Refreshing/);
    assert.match(loading, /Showing previously loaded data/);
    const error = render(Component, { status: 'error', data, errorKind: 'timeout' });
    assert.match(error, /Feedback Driver/);
    assert.match(error, /role="alert"/);
    assert.match(error, /took too long/);
    assert.match(error, /Try again/);
    assert.match(error, /may be out of date/);
    assert.doesNotMatch(error, /aria-busy="true"|successfully/);
    assert.match(render(Component, { status: 'success', data }), /Refresh (overview|agents|details)/);
  }
  const html = render(Agents, { status: 'loading', data: list });
  assert.match(html, /disabled=""[^>]*aria-label="Delete agent FEEDBACK-1"/);
});

test('refresh failure retains data; explicit retry executes again and replaces it without stale errors', async () => {
  let calls = 0;
  const pending = Promise.withResolvers();
  const resource = createRequestResource(() => {
    calls++;
    if (calls === 1) return overview;
    if (calls === 2) return pending.promise;
    return { ...overview, total: 2 };
  });
  await resource.load();
  const refresh = resource.load();
  assert.deepEqual(resource.getSnapshot(), { status: 'loading', data: overview });
  pending.reject({ code: 'ECONNABORTED', message: 'private-url-and-credentials' });
  await refresh;
  assert.equal(resource.getSnapshot().errorKind, 'timeout');
  assert.equal(resource.getSnapshot().data, overview);
  assert.doesNotMatch(JSON.stringify(resource.getSnapshot()), /private/);
  await resource.load();
  assert.deepEqual(resource.getSnapshot(), { status: 'success', data: { ...overview, total: 2 } });
  assert.equal(calls, 3);
});

test('filters and page changes clear mismatched old rows while same-query refresh retains them', async () => {
  let pending;
  const resource = createAgentsResource((query) => pending?.promise ?? { ...list, pagination: { page: query.page, limit: query.limit, total: 20, totalPages: 2 } });
  await resource.load();
  pending = Promise.withResolvers();
  const nextPage = resource.goToPage(2);
  assert.equal(resource.getSnapshot().data, null);
  pending.resolve({ ...list, pagination: { page: 2, limit: 10, total: 20, totalPages: 2 } });
  await nextPage;
  const previous = resource.getSnapshot().data;
  pending = Promise.withResolvers();
  const refresh = resource.load();
  assert.equal(resource.getSnapshot().data, previous);
  const filtered = resource.applyFilters({ search: 'another driver' });
  assert.equal(resource.getSnapshot().data, null);
  pending.resolve({ ...list, agents: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  await Promise.all([refresh, filtered]);
  assert.equal(resource.getQuery().page, 1);
  assert.equal(resource.getSnapshot().data.agents.length, 0);
});

test('cancellation ends loading immediately, ignores late completion, and supports a fresh read', async () => {
  const pending = Promise.withResolvers();
  let signal;
  let calls = 0;
  const resource = createRequestResource((options) => {
    signal = options.signal;
    return ++calls === 1 ? pending.promise : overview;
  });
  const first = resource.load();
  resource.cancel();
  assert.equal(signal.aborted, true);
  assert.deepEqual(resource.getSnapshot(), { status: 'cancelled', data: null });
  await resource.load();
  pending.resolve({ total: 999 });
  await first;
  assert.equal(resource.getSnapshot().data, overview);
  resource.cancel();
  assert.equal(resource.getSnapshot().status, 'success');
});

// Real HTTP failures exercise Axios classification, rather than just synthetic error objects.
async function startFixture(t) {
  let mode = 'timeout';
  const calls = [];
  const server = createHttpServer((request, response) => {
    calls.push(request.method);
    if (mode === 'timeout') return; // Deliberately never answer; Axios owns the deadline.
    if (mode === 'network') { request.socket.destroy(); return; }
    if (mode === 'html') { response.end('<html>private upstream page</html>'); return; }
    if (mode === 'server') { response.writeHead(503); response.end('private upstream failure'); return; }
    const url = new URL(request.url, 'http://localhost');
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname.endsWith(id)) {
      response.writeHead(404);
      response.end(JSON.stringify({ success: false, message: 'private missing details' }));
      return;
    }
    response.end(JSON.stringify({ success: true, data: [], pagination: {
      page: Number(url.searchParams.get('page')), limit: Number(url.searchParams.get('limit')), total: 0, totalPages: 0,
    } }));
  });
  server.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  await once(server, 'listening');
  const previous = { baseURL: api.defaults.baseURL, timeout: api.defaults.timeout };
  t.after(() => Object.assign(api.defaults, previous));
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api`;
  api.defaults.timeout = 200; // Test-only deadline; production remains 10 seconds.
  return { calls, setMode(value) { mode = value; } };
}

test('first-load timeout, network disconnect, HTML, and HTTP 503 become safe errors; manual retries recover', async (t) => {
  assert.equal(api.defaults.timeout, 10000);
  const fixture = await startFixture(t);
  const get = t.mock.method(api, 'get');
  for (const mode of ['timeout', 'network', 'html', 'server']) {
    for (const [Component, read] of [[Overview, fetchOverview], [Agents, ({ signal }) => services.fetchAgents({}, { signal })],
      [Details, ({ signal }) => services.fetchAgentById(id, { signal })]]) {
      fixture.setMode(mode);
      const resource = createRequestResource(read);
      await resource.load();
      const failed = resource.getSnapshot();
      assert.equal(failed.status, 'error');
      assert.equal(failed.data, null);
      const html = render(Component, failed);
      assert.match(html, /role="alert"/);
      assert.match(html, /Try again/);
      assert.doesNotMatch(html, /private|upstream|503|ECONN|No agents yet|Agent not found/);
      if (mode === 'timeout') assert.match(html, /took too long/);
      if (mode === 'network') assert.match(html, /could not reach the API/);
      // Count dispatches: aborted siblings may still reach the HTTP server later.
      const requestsBeforeRetry = get.mock.callCount();
      fixture.setMode('success');
      await resource.load();
      assert.equal(resource.getSnapshot().status, 'success');
      assert.equal(get.mock.callCount() - requestsBeforeRetry, Component === Overview ? 3 : 1);
      assert.match(render(Component, resource.getSnapshot()), Component === Details ? /Agent not found/ : /No agents yet/);
    }
  }
});

test('actual timed-out create and update requests retain drafts, end submission, and never auto-retry', async (t) => {
  const fixture = await startFixture(t);
  const creation = createAgentResource(services.createAgent);
  for (const field of ['agentId', 'fullName', 'phone', 'email', 'serviceArea', 'status']) creation.setField(field, agent[field]);
  const draft = creation.getSnapshot().values;
  const creating = creation.submit();
  assert.match(render(Form, creation.getSnapshot()), /aria-busy="true"/);
  await creation.submit();
  await creating;
  assert.equal(creation.getSnapshot().status, 'error');
  assert.deepEqual(creation.getSnapshot().values, draft);
  assert.match(render(Form, creation.getSnapshot()), /entries are kept/);
  const edit = createEditAgentResource(agent, services.updateAgent);
  edit.setField('fullName', 'Preserved edit draft');
  const editing = edit.submit();
  assert.match(render(Form, edit.getSnapshot(), { editing: true }), /Saving your agent/);
  await edit.submit();
  await editing;
  assert.equal(edit.getSnapshot().status, 'error');
  assert.equal(edit.getSnapshot().values.fullName, 'Preserved edit draft');
  assert.match(render(Form, edit.getSnapshot(), { editing: true }), /Check agent details before trying again/);
  assert.deepEqual(fixture.calls, ['POST', 'PATCH']);
});
