import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';
import { createAgentsResource } from '../src/state/agentsResource.js';

let vite;
let fetchAgents;
let agentListParams;
let AgentsContent;
let api;
const defaults = { page: 1, limit: 10, search: '', status: '', serviceArea: '' };

before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  ({ fetchAgents, agentListParams } = await vite.ssrLoadModule('/src/services/agentsService.js'));
  AgentsContent = (await vite.ssrLoadModule('/src/components/agents/AgentsContent.jsx')).default;
  api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
});
after(async () => { await vite?.close(); });

function agent() {
  return { id: '000000000000000000000001', agentId: 'AGENT-001', fullName: 'Alex Test',
    phone: '+1 202-555-0142', email: 'alex@example.com', serviceArea: 'North', status: 'active',
    createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z', __v: 1 };
}

function result(query = defaults, records = [agent()], total = 41) {
  return { agents: records, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

function response(query = defaults, records = [agent()], total = 41) {
  const value = result(query, records, total);
  return { data: { success: true, data: value.agents, pagination: value.pagination } };
}

function render(state, query = defaults) {
  // React's hydration comments separate text nodes but do not change visible text.
  return renderToString(createElement(MemoryRouter, {}, createElement(AgentsContent, { state, query,
    onApply() {}, onClear() {}, onPageChange() {}, onRetry() {} }))).replace(/<!--.*?-->/g, '');
}

test('query mapping uses API defaults and omits blank optional filters', () => {
  assert.deepEqual(agentListParams(), { page: 1, limit: 10 });
  assert.deepEqual(agentListParams({ ...defaults, search: '  ', serviceArea: ' ' }), { page: 1, limit: 10 });
  assert.deepEqual(agentListParams({ page: 2, limit: 100, search: ' A+B ', status: 'inactive', serviceArea: ' North ' }),
    { page: 2, limit: 100, search: 'A+B', status: 'inactive', serviceArea: 'North' });
});

test('invalid pagination, unsupported status, and malformed filters fail before HTTP access', async (t) => {
  const get = t.mock.fn();
  for (const query of [{ page: 0 }, { page: 1.5 }, { page: Number.MAX_SAFE_INTEGER }, { limit: 101 }, { limit: 0 },
    { status: 'delivering' }, { search: [] }, { search: 'a'.repeat(201) }, { serviceArea: {} }]) {
    await assert.rejects(fetchAgents(query, {}, { get }));
  }
  assert.equal(get.mock.callCount(), 0);
});

test('combined search, status, area, and pagination are sent to Axios with cancellation and full matching totals', async (t) => {
  const query = { page: 2, limit: 25, search: ' Alex ', status: 'active', serviceArea: ' North ' };
  const signal = new AbortController().signal;
  const get = t.mock.fn(async () => response(query, [agent()], 401));
  const value = await fetchAgents(query, { signal }, { get });
  assert.deepEqual(get.mock.calls[0].arguments, ['/agents', { params: {
    page: 2, limit: 25, search: 'Alex', status: 'active', serviceArea: 'North',
  }, signal }]);
  assert.equal(value.pagination.total, 401);
  assert.equal(value.pagination.totalPages, 17);
  assert.equal(value.agents.length, 1);
  assert.equal('__v' in value.agents[0], false);
  assert.equal(value.agents[0].email, 'alex@example.com');
});

test('malformed rows and inconsistent metadata become safe request failures', async () => {
  const cases = [
    (body) => { body.success = false; },
    (body) => { body.data = null; },
    (body) => { body.pagination.page = 2; },
    (body) => { body.pagination.limit = 100; },
    (body) => { body.pagination.total = -1; },
    (body) => { body.pagination.totalPages = 200; },
    (body) => { body.pagination.total = 0; body.pagination.totalPages = 0; },
    (body) => { body.data[0].status = 'available'; },
    (body) => { body.data[0].createdAt = 'invalid'; },
    (body) => { body.data[0].email = null; },
  ];
  for (const mutate of cases) {
    const value = response();
    mutate(value.data);
    await assert.rejects(fetchAgents({}, {}, { get: async () => value }));
  }
});

test('the service accepts empty filtered responses and pages beyond the last page', async () => {
  assert.equal((await fetchAgents({}, {}, { get: async () => response(defaults, [], 0) })).pagination.totalPages, 0);
  const query = { ...defaults, page: 8 };
  const value = await fetchAgents(query, {}, { get: async () => response(query, [], 21) });
  assert.deepEqual(value.agents, []);
  assert.equal(value.pagination.page, 8);
  assert.equal(value.pagination.totalPages, 3);
});

test('table renders existing agent fields, accessible headings, safe text, and unavailable future actions', () => {
  const record = { ...agent(), fullName: '<script>Alex</script>' };
  const html = render({ status: 'success', data: result(defaults, [record]) });
  for (const text of ['Agent / ID', 'Contact', 'Service area', 'Status', 'Added (UTC)', 'AGENT-001', '+1 202-555-0142',
    'alex@example.com', 'North', 'Active', 'Oct 18, 2026']) assert.ok(html.includes(text), text);
  assert.match(html, /scope="col"/);
  assert.match(html, /scope="row"/);
  assert.match(html, /role="region"[^>]*tabindex="0"/);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /&lt;script&gt;Alex&lt;\/script&gt;/);
  assert.match(html, /href="\/agents\/000000000000000000000001"/);
  assert.match(html, /aria-label="View agent AGENT-001"/);
  for (const action of ['Edit', 'Delete']) assert.match(html, new RegExp(`disabled="" aria-label="${action} agent \\(coming soon\\)"`));
  assert.doesNotMatch(html, /<script>|__v|View agent \(coming soon\)/);
});

test('search/filter form exposes supported fields, values, page sizes, and explicit apply/clear actions', () => {
  const query = { ...defaults, search: 'Alex', status: 'inactive', serviceArea: 'North', limit: 25 };
  const html = render({ status: 'loading', data: null }, query);
  for (const name of ['search', 'status', 'serviceArea', 'limit']) assert.ok(html.includes(`name="${name}"`));
  assert.match(html, /role="search"/);
  assert.match(html, /maxLength="200"/i);
  assert.match(html, /value="inactive" selected=""/);
  assert.match(html, /value="25" selected=""/);
  assert.match(html, /case-sensitive/);
  assert.match(html, /Apply filters/);
  assert.match(html, /Clear filters/);
  assert.doesNotMatch(html, /value="available"|value="delivering"/);
});

test('pagination renders server total/ranges and disables boundary navigation', () => {
  const first = render({ status: 'success', data: result() });
  assert.match(first, /Showing 1–1 of 41 matching agents/);
  assert.match(first, /Page 1 of 5/);
  assert.match(first.match(/<button[^>]*aria-label="Previous page"[^>]*>/)[0], /disabled=""/);
  const query = { ...defaults, page: 5 };
  const last = render({ status: 'success', data: result(query) }, query);
  assert.match(last, /Showing 41–41 of 41 matching agents/);
  assert.match(last.match(/<button[^>]*aria-label="Next page"[^>]*>/)[0], /disabled=""/);
});

test('loading and errors hide stale rows/totals and provide progress or safe retry feedback', () => {
  const loading = render({ status: 'loading', data: null });
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading agents/);
  assert.doesNotMatch(loading, /Showing|No agents yet|<table/);
  const error = render({ status: 'error', data: null, error: 'private credential details' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /private credential|Showing|<table/);
});

test('empty database, no filter matches, and out-of-range pages have distinct recovery feedback', () => {
  const empty = { status: 'success', data: result(defaults, [], 0) };
  assert.match(render(empty), /No agents yet/);
  assert.match(render(empty), /No pages/);
  assert.match(render(empty, { ...defaults, search: 'No match' }), /No matching agents/);
  const query = { ...defaults, page: 8 };
  const html = render({ status: 'success', data: result(query, [], 21) }, query);
  assert.match(html, /No agents on this page/);
  assert.match(html, /Back to first page/);
  assert.match(html, /Showing 0 of 21 matching agents/);
  assert.match(html, /Page 8 · 3 pages available/);
});

test('applied filters reset page, normalize text, and remain intact across server-backed pagination', async (t) => {
  const fetch = t.mock.fn(async (query) => result(query, [agent()], 201));
  const resource = createAgentsResource(fetch);
  await resource.load();
  assert.deepEqual(resource.getQuery(), defaults);
  await resource.goToPage(3);
  await resource.applyFilters({ search: ' Alex ', status: 'active', serviceArea: ' North ', limit: '25' });
  assert.deepEqual(resource.getQuery(), { page: 1, limit: 25, search: 'Alex', status: 'active', serviceArea: 'North' });
  await resource.goToPage(2);
  assert.equal(fetch.mock.calls.at(-1).arguments[0].page, 2);
  assert.equal(fetch.mock.calls.at(-1).arguments[0].search, 'Alex');
  assert.equal(resource.getSnapshot().data.pagination.total, 201);
  assert.equal(resource.getSnapshot().data.pagination.totalPages, 9);
});

test('clearing filters keeps the applied page size and resets pagination', async () => {
  const resource = createAgentsResource(async (query) => result(query, [agent()], 201));
  await resource.applyFilters({ search: 'Alex', status: 'inactive', serviceArea: 'North', limit: 25 });
  await resource.goToPage(2);
  await resource.clearFilters();
  assert.deepEqual(resource.getQuery(), { page: 1, limit: 25, search: '', status: '', serviceArea: '' });
});

test('pagination clamps to server bounds and ignores navigation during loading or for invalid/same pages', async (t) => {
  const fetch = t.mock.fn(async (query) => result(query, [agent()], 21));
  const resource = createAgentsResource(fetch);
  await resource.goToPage(2);
  assert.equal(fetch.mock.callCount(), 0);
  await resource.load();
  await resource.goToPage(1);
  await resource.goToPage(NaN);
  assert.equal(fetch.mock.callCount(), 1);
  await resource.goToPage(999);
  assert.equal(resource.getQuery().page, 3);
  await resource.goToPage(-1);
  assert.equal(resource.getQuery().page, 1);
});

test('rapid searches cancel superseded requests and ignore late responses', async () => {
  const pending = [Promise.withResolvers(), Promise.withResolvers()];
  const signals = [];
  const resource = createAgentsResource((query, { signal }) => {
    signals.push(signal);
    return pending[signals.length - 1].promise;
  });
  const first = resource.applyFilters({ search: 'old' });
  const second = resource.applyFilters({ search: 'new' });
  assert.equal(signals[0].aborted, true);
  pending[1].resolve(result({ ...defaults, search: 'new' }, [], 0));
  await second;
  pending[0].resolve(result());
  await first;
  assert.equal(resource.getSnapshot().data.pagination.total, 0);
  assert.equal(resource.getQuery().search, 'new');
});

test('retry keeps the applied query and cancellation prevents updates after leaving the page', async () => {
  let fail = true;
  const pending = Promise.withResolvers();
  const resource = createAgentsResource(async (query) => {
    if (fail) throw new Error('private server details');
    return pending.promise;
  });
  await resource.applyFilters({ search: 'Alex', status: 'active' });
  assert.equal(resource.getSnapshot().status, 'error');
  const query = resource.getQuery();
  fail = false;
  const retry = resource.load();
  assert.equal(resource.getSnapshot().status, 'loading');
  assert.equal(resource.getQuery(), query);
  pending.resolve(result(query));
  await retry;
  assert.equal(resource.getSnapshot().status, 'success');
  const late = Promise.withResolvers();
  const leaving = createAgentsResource(() => late.promise);
  const load = leaving.load();
  leaving.cancel();
  late.reject(new Error('late failure'));
  await load;
  assert.equal(leaving.getSnapshot().status, 'loading');
});

test('a page emptied by later deletions can navigate back to the first page without losing filters', async () => {
  let total = 21;
  const resource = createAgentsResource(async (query) => result(query, [], total));
  await resource.applyFilters({ status: 'inactive' });
  await resource.goToPage(3);
  total = 0;
  await resource.load();
  await resource.goToPage(1);
  assert.equal(resource.getQuery().page, 1);
  assert.equal(resource.getQuery().status, 'inactive');
  assert.equal(resource.getSnapshot().data.pagination.totalPages, 0);
});

test('existing Axios client reads the actual list contract over HTTP with combined filters and pagination', async (t) => {
  let received;
  const query = { page: 2, limit: 25, search: 'A+B', status: 'inactive', serviceArea: 'North West' };
  const backend = createHttpServer((request, reply) => {
    received = new URL(request.url, 'http://localhost');
    reply.writeHead(200, { 'Content-Type': 'application/json' });
    reply.end(JSON.stringify(response(query, [{ ...agent(), status: 'inactive' }], 51).data));
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const previous = api.defaults.baseURL;
  t.after(async () => {
    api.defaults.baseURL = previous;
    await new Promise((resolve) => { backend.close(resolve); backend.closeAllConnections(); });
  });
  api.defaults.baseURL = `http://127.0.0.1:${backend.address().port}/api`;
  const value = await fetchAgents(query);
  assert.equal(received.pathname, '/api/agents');
  assert.deepEqual(Object.fromEntries(received.searchParams), { page: '2', limit: '25', search: 'A+B', status: 'inactive', serviceArea: 'North West' });
  assert.equal(value.pagination.total, 51);
  assert.equal(value.pagination.totalPages, 3);
  assert.equal(value.agents[0].status, 'inactive');
});
