import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';
import { createRequestResource } from '../src/state/requestResource.js';

let vite;
let fetchAgentById;
let isAgentId;
let AgentDetailContent;
let AgentDetailPage;
let AgentsTable;
let App;
let api;
const id = 'abcdef0123456789abcdef01';

before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  ({ fetchAgentById, isAgentId } = await vite.ssrLoadModule('/src/services/agentsService.js'));
  AgentDetailContent = (await vite.ssrLoadModule('/src/components/agents/AgentDetailContent.jsx')).default;
  AgentDetailPage = (await vite.ssrLoadModule('/src/pages/AgentDetailPage.jsx')).default;
  AgentsTable = (await vite.ssrLoadModule('/src/components/agents/AgentsTable.jsx')).default;
  App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
});
after(async () => { await vite?.close(); });

function agent() {
  return { id, agentId: 'AGENT-001', fullName: 'Alex Test', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'North', status: 'active',
    createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-19T14:30:00.000Z' };
}

function response(record = agent()) {
  return { status: 200, data: { success: true, message: 'Agent retrieved successfully', data: record } };
}

function renderComponent(component, props, path = '/') {
  return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(component, props)))
    .replace(/<!--.*?-->/g, '');
}

function render(state) {
  return renderComponent(AgentDetailContent, { state, onRetry() {} });
}

test('malformed, missing, business, and query-like IDs are rejected without HTTP access', async (t) => {
  const get = t.mock.fn();
  for (const value of [undefined, null, '', 'AGENT-001', 'a'.repeat(23), 'g'.repeat(24), ` ${id} `, `${id}\n`,
    { $ne: null }, ['a'], '../agents', `${id}?extra=1`]) {
    assert.equal(isAgentId(value), false);
    assert.deepEqual(await fetchAgentById(value, {}, { get }), { kind: 'invalid', agent: null });
  }
  assert.equal(get.mock.callCount(), 0);
  const missing = renderComponent(AgentDetailPage, {});
  assert.match(missing, /Invalid agent link/);
  assert.match(missing, /Back to Agents/);
  assert.doesNotMatch(missing, /Loading agent details/);
});

test('valid IDs fetch only their detail endpoint with cancellation and public response mapping', async (t) => {
  const get = t.mock.fn(async () => response({ ...agent(), __v: 2, internal: 'omit' }));
  const signal = new AbortController().signal;
  assert.equal(isAgentId(id.toUpperCase()), true);
  const value = await fetchAgentById(id.toUpperCase(), { signal }, { get });
  assert.deepEqual(get.mock.calls[0].arguments, [`/agents/${id}`, { signal }]);
  assert.equal(get.mock.callCount(), 1);
  assert.deepEqual(value, { kind: 'found', agent: agent() });
});

test('the table View link targets the public database ID and resolves to the dedicated detail route', () => {
  const html = renderComponent(AgentsTable, { agents: [agent()] });
  const target = html.match(/href="(\/agents\/[^\"]+)"/)[1];
  assert.equal(target, `/agents/${id}`);
  assert.match(html, /aria-label="View agent AGENT-001"/);
  assert.doesNotMatch(html, /href="\/agents\/AGENT-001"/);
  const destination = renderComponent(App, {}, target);
  assert.match(destination, /Agent details/);
  assert.match(destination, /Loading agent details/);
  assert.match(destination, /Back to Agents/);
  assert.match(html, new RegExp(`href="/agents/${id}/edit"`));
  assert.match(html, /aria-label="Delete agent AGENT-001"/);
  assert.doesNotMatch(html, /coming soon/);
});

test('successful detail rendering shows all public fields with labelled, responsive UTC timestamps and status', () => {
  const html = render({ status: 'success', data: { kind: 'found', agent: agent() } });
  for (const label of ['Full name', 'Agent ID', 'Phone', 'Email', 'Service area', 'Status',
    'Created (UTC)', 'Last updated (UTC)', 'Database record ID']) assert.ok(html.includes(`<dt class="text-xs font-medium text-slate-500">${label}</dt>`), label);
  for (const text of ['Alex Test', 'AGENT-001', '+1 202-555-0142', 'alex@example.com', 'North', 'Active', id,
    'Oct 18, 2026', 'Oct 19, 2026']) assert.ok(html.includes(text), text);
  assert.match(html, /dateTime="2026-10-18T12:00:00.000Z"/i);
  assert.match(html, /dateTime="2026-10-19T14:30:00.000Z"/i);
  assert.match(html, /<dl[^>]*sm:grid-cols-2/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /href="\/agents"/);
  assert.doesNotMatch(html, /<form|__v|Try again/);
  const inactive = render({ status: 'success', data: { kind: 'found', agent: { ...agent(), status: 'inactive', fullName: '<script>test</script>' } } });
  assert.match(inactive, /Inactive/);
  assert.match(inactive, /&lt;script&gt;test&lt;\/script&gt;/);
  assert.doesNotMatch(inactive, /<script>/);
});

test('loading announces progress and hides prior details while keeping a return link', () => {
  const html = render({ status: 'loading', data: { kind: 'found', agent: agent() } });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /Loading agent details/);
  assert.match(html, /Back to Agents/);
  assert.doesNotMatch(html, /Alex Test|AGENT-001|Try again/);
});

test('HTTP 404 and 400 become safe distinct page states without rendering server details', async () => {
  for (const [status, kind, title] of [[404, 'not-found', 'Agent not found'], [400, 'invalid', 'Invalid agent link']]) {
    const data = await fetchAgentById(id, {}, { get: async () => { throw { response: { status, data: { message: 'private server text' } } }; } });
    assert.deepEqual(data, { kind, agent: null });
    const html = render({ status: 'success', data });
    assert.match(html, new RegExp(title));
    assert.match(html, /role="alert"/);
    assert.match(html, /Back to Agents/);
    assert.doesNotMatch(html, /private|Alex Test/);
    if (status === 404) assert.match(html, /Try again/);
    else assert.doesNotMatch(html, /Try again/);
  }
});

test('network and server failures reach generic error UI, with retry returning to loading then success', async () => {
  for (const failure of [new Error('private network text'), { code: 'ECONNABORTED' },
    { response: { status: 500, data: { message: 'private stack' } } }]) {
    let fail = true;
    const pending = Promise.withResolvers();
    const resource = createRequestResource(({ signal }) => fetchAgentById(id, { signal }, { get: async () => {
      if (fail) throw failure;
      return pending.promise;
    } }));
    await resource.load();
    assert.equal(resource.getSnapshot().status, 'error');
    const html = render(resource.getSnapshot());
    assert.match(html, /We couldn&#x27;t load this agent/);
    assert.match(html, /Try again/);
    assert.doesNotMatch(html, /private|stack|ECONNABORTED|Alex Test/);
    fail = false;
    const retry = resource.load();
    assert.equal(resource.getSnapshot().status, 'loading');
    pending.resolve(response());
    await retry;
    assert.equal(resource.getSnapshot().status, 'success');
    assert.equal(resource.getSnapshot().data.agent.id, id);
  }
});

test('retrying a missing agent performs a fresh GET and can recover without stale details', async (t) => {
  let missing = true;
  const get = t.mock.fn(async () => { if (missing) throw { response: { status: 404 } }; return response(); });
  const resource = createRequestResource(({ signal }) => fetchAgentById(id, { signal }, { get }));
  await resource.load();
  assert.equal(resource.getSnapshot().data.kind, 'not-found');
  missing = false;
  const retry = resource.load();
  assert.equal(resource.getSnapshot().data, null);
  await retry;
  assert.equal(resource.getSnapshot().data.kind, 'found');
  assert.equal(get.mock.callCount(), 2);
});

test('malformed responses, unsupported statuses, invalid dates, and mismatched records become safe failures', async () => {
  const cases = [
    (value) => { value.status = 201; }, (value) => { value.data.success = false; },
    (value) => { value.data.data = null; }, (value) => { value.data.data.id = 'a'.repeat(24); },
    (value) => { value.data.data.phone = null; }, (value) => { value.data.data.status = 'delivering'; },
    (value) => { value.data.data.updatedAt = 'bad'; },
  ];
  for (const mutate of cases) {
    const value = response();
    mutate(value);
    const resource = createRequestResource(() => fetchAgentById(id, {}, { get: async () => value }));
    await resource.load();
    assert.equal(resource.getSnapshot().status, 'error');
    assert.doesNotMatch(render(resource.getSnapshot()), /Alex Test|delivering|Invalid detail response|Unexpected agent ID/);
  }
});

test('overlapping detail retries ignore late results, and leaving a detail cancels its pending request', async () => {
  const old = Promise.withResolvers();
  const newer = Promise.withResolvers();
  const signals = [];
  const resource = createRequestResource(({ signal }) => fetchAgentById(id, { signal }, { get: () => {
    signals.push(signal);
    return signals.length === 1 ? old.promise : newer.promise;
  } }));
  const first = resource.load();
  const second = resource.load();
  assert.equal(signals[0].aborted, true);
  newer.resolve(response({ ...agent(), fullName: 'Newer name' }));
  await second;
  old.resolve(response());
  await first;
  assert.equal(resource.getSnapshot().data.agent.fullName, 'Newer name');
  const leaving = Promise.withResolvers();
  const cancelled = createRequestResource(({ signal }) => fetchAgentById(id, { signal }, { get: async () => leaving.promise }));
  const load = cancelled.load();
  cancelled.cancel();
  leaving.reject(new Error('late private error'));
  await load;
  assert.equal(cancelled.getSnapshot().status, 'loading');
});

test('separate route-ID resources isolate records even when the previous GET completes late', async () => {
  const pending = Promise.withResolvers();
  const previous = createRequestResource(() => fetchAgentById(id, {}, { get: async () => pending.promise }));
  const first = previous.load();
  previous.cancel();
  const secondId = '1234567890abcdef12345678';
  const next = createRequestResource(() => fetchAgentById(secondId, {}, { get: async () => response({ ...agent(), id: secondId, fullName: 'Second agent' }) }));
  await next.load();
  pending.resolve(response());
  await first;
  assert.equal(previous.getSnapshot().data, null);
  assert.equal(next.getSnapshot().data.agent.fullName, 'Second agent');
});

test('existing Axios client loads real detail and 404 response contracts from an isolated HTTP fixture', async (t) => {
  const paths = [];
  const backend = createHttpServer((request, reply) => {
    paths.push(request.url);
    reply.setHeader('Content-Type', 'application/json');
    if (paths.length === 1) reply.end(JSON.stringify(response().data));
    else { reply.writeHead(404); reply.end(JSON.stringify({ success: false, message: 'Agent not found' })); }
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const previous = api.defaults.baseURL;
  t.after(async () => {
    api.defaults.baseURL = previous;
    await new Promise((resolve) => { backend.close(resolve); backend.closeAllConnections(); });
  });
  api.defaults.baseURL = `http://127.0.0.1:${backend.address().port}/api`;
  assert.deepEqual(await fetchAgentById(id), { kind: 'found', agent: agent() });
  assert.deepEqual(await fetchAgentById(id), { kind: 'not-found', agent: null });
  assert.deepEqual(paths, [`/api/agents/${id}`, `/api/agents/${id}`]);
});
