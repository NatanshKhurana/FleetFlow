import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { createOverviewResource } from '../src/state/overviewResource.js';

let vite;
let fetchOverview;
let OverviewContent;
let api;

before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  fetchOverview = (await vite.ssrLoadModule('/src/services/overviewService.js')).fetchOverview;
  OverviewContent = (await vite.ssrLoadModule('/src/components/overview/OverviewContent.jsx')).default;
  api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
});
after(async () => { await vite?.close(); });

function agent(index = 1, status = 'active') {
  return { id: String(index).padStart(24, '0'), agentId: 'TEST-' + index,
    fullName: 'Test Agent ' + index, serviceArea: 'Central', status,
    createdAt: '2026-10-18T12:00:00.000Z', email: 'unused@example.com' };
}

function response(total, records = []) {
  return { data: { success: true, data: records, pagination: { total } } };
}

function fixtures() {
  return [response(1234, Array.from({ length: 5 }, (_, index) => agent(index + 1))), response(1200), response(34)];
}

function fakeClient(t, responses = fixtures()) {
  let index = 0;
  return { get: t.mock.fn(async () => responses[index++]) };
}

function render(state, onRetry = () => {}) {
  return renderToString(createElement(OverviewContent, { state, onRetry }));
}

test('three small requests use full pagination totals, exact status filters, and a shared abort signal', async (t) => {
  const client = fakeClient(t);
  const signal = new AbortController().signal;
  const data = await fetchOverview({ signal }, client);
  assert.deepEqual([data.total, data.active, data.inactive], [1234, 1200, 34]);
  assert.equal(data.recentAgents.length, 5);
  assert.equal(data.recentAgents[0].agentId, 'TEST-1');
  assert.equal('email' in data.recentAgents[0], false);
  assert.deepEqual(client.get.mock.calls.map((call) => call.arguments), [
    ['/agents', { params: { page: 1, limit: 5 }, signal }],
    ['/agents', { params: { page: 1, limit: 1, status: 'active' }, signal }],
    ['/agents', { params: { page: 1, limit: 1, status: 'inactive' }, signal }],
  ]);
});

test('an empty database maps to genuine zero totals and an empty recent list', async (t) => {
  const data = await fetchOverview({}, fakeClient(t, [response(0), response(0), response(0)]));
  assert.deepEqual(data, { total: 0, active: 0, inactive: 0, recentAgents: [] });
});

test('malformed, incomplete, and inconsistent responses fail instead of fabricating counts', async (t) => {
  const cases = [
    (items) => { items[0].data.pagination.total = -1; },
    (items) => { items[1].data.pagination.total = '1200'; },
    (items) => { items[2].data.success = false; },
    (items) => { delete items[0].data.pagination; },
    (items) => { items[1].data.pagination.total++; },
    (items) => { items[0].data.data.pop(); },
    (items) => { items[0].data.data[0].status = 'delivering'; },
    (items) => { items[0].data.data[0].createdAt = 'invalid'; },
    (items) => { items[0].data.data[0].fullName = null; },
  ];
  for (const mutate of cases) {
    const items = fixtures();
    mutate(items);
    await assert.rejects(fetchOverview({}, fakeClient(t, items)));
  }
});

test('a failed request cannot produce a partial dashboard', async () => {
  const client = { get: async (path, { params }) => {
    if (params.status === 'inactive') throw new Error('private response details');
    return response(1, [agent()]);
  } };
  await assert.rejects(fetchOverview({}, client));
});

test('resource publishes loading then success and supports subscriber cleanup', async () => {
  const pending = Promise.withResolvers();
  const resource = createOverviewResource(() => pending.promise);
  const statuses = [];
  const unsubscribe = resource.subscribe(() => statuses.push(resource.getSnapshot().status));
  assert.equal(resource.getSnapshot().status, 'loading');
  const loading = resource.load();
  assert.equal(resource.getSnapshot().data, null);
  const data = { total: 1, active: 1, inactive: 0, recentAgents: [agent()] };
  pending.resolve(data);
  await loading;
  assert.deepEqual(resource.getSnapshot(), { status: 'success', data });
  assert.deepEqual(statuses, ['loading', 'success']);
  unsubscribe();
  await resource.load();
  assert.deepEqual(statuses, ['loading', 'success']);
});

test('the retry action changes error to loading and then recovered success without exposing raw errors', async () => {
  const pending = Promise.withResolvers();
  let calls = 0;
  let failedSignal;
  const resource = createOverviewResource(({ signal }) => {
    if (++calls === 1) {
      failedSignal = signal;
      throw new Error('private password and database details');
    }
    return pending.promise;
  });
  await resource.load();
  assert.equal(failedSignal.aborted, true);
  const failed = render(resource.getSnapshot(), resource.load);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Try again/);
  assert.doesNotMatch(failed, /password|database details|Total agents/);
  // Call the same callback supplied to the retry button (no browser DOM is required).
  const retry = resource.load();
  assert.match(render(resource.getSnapshot()), /Loading your overview/);
  pending.resolve({ total: 0, active: 0, inactive: 0, recentAgents: [] });
  await retry;
  assert.match(render(resource.getSnapshot()), /No agents yet/);
  assert.equal(calls, 2);
});

test('a newer retry cancels and ignores an older response even if transport cancellation is ignored', async () => {
  const pending = [Promise.withResolvers(), Promise.withResolvers()];
  const signals = [];
  const resource = createOverviewResource(({ signal }) => {
    signals.push(signal);
    return pending[signals.length - 1].promise;
  });
  const first = resource.load();
  const second = resource.load();
  assert.equal(signals[0].aborted, true);
  pending[1].resolve({ total: 0 });
  await second;
  pending[0].resolve({ total: 999 });
  await first;
  assert.equal(resource.getSnapshot().data.total, 0);
});

test('unmount cancellation ignores completion and permits the StrictMode reload cycle', async () => {
  const pending = Promise.withResolvers();
  let calls = 0;
  let signal;
  const resource = createOverviewResource((options) => {
    signal = options.signal;
    return ++calls === 1 ? pending.promise : Promise.resolve({ total: 0 });
  });
  const first = resource.load();
  resource.cancel();
  assert.equal(signal.aborted, true);
  pending.reject(new Error('late cancellation'));
  await first;
  assert.equal(resource.getSnapshot().status, 'cancelled');
  await resource.load();
  assert.equal(resource.getSnapshot().status, 'success');
});

test('loading markup announces progress and never displays invented zero totals', () => {
  const html = render({ status: 'loading', data: null });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, />0<|No agents yet|Try again/);
});

test('success renders full counts, supported statuses, recent registration fields, and escaped text', () => {
  const record = { ...agent(), fullName: '<script>Test</script>', status: 'inactive' };
  const html = render({ status: 'success', data: { total: 1234, active: 1200, inactive: 34, recentAgents: [record] } });
  for (const value of ['1,234', '1,200', '34', 'Recently added', 'TEST-1', 'Central', 'Inactive', 'Oct 18, 2026']) {
    assert.ok(html.includes(value), value);
  }
  assert.match(html, /&lt;script&gt;Test&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|<table|<form|href="\/agents|unused@example.com/);
});

test('empty markup shows zero totals and helpful empty feedback without a fabricated recent record', () => {
  const html = render({ status: 'success', data: { total: 0, active: 0, inactive: 0, recentAgents: [] } });
  assert.equal((html.match(/>0</g) || []).length, 3);
  assert.match(html, /No agents yet/);
  assert.doesNotMatch(html, /Recently added|TEST-/);
});

test('the existing Axios instance reads overview responses over HTTP with exact API query paths', async (t) => {
  assert.equal(api.defaults.baseURL, '/api');
  assert.equal(api.defaults.timeout, 10000);
  const requests = [];
  const server = createHttpServer((request, responseObject) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push(url);
    const status = url.searchParams.get('status');
    const body = status === 'active' ? response(1200) : status === 'inactive' ? response(34) : fixtures()[0];
    responseObject.writeHead(200, { 'Content-Type': 'application/json' });
    responseObject.end(JSON.stringify(body.data));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const previous = api.defaults.baseURL;
  t.after(async () => {
    api.defaults.baseURL = previous;
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  });
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api`;
  const data = await fetchOverview();
  assert.equal(data.total, 1234);
  assert.equal(requests.length, 3);
  assert.ok(requests.every((url) => url.pathname === '/api/agents' && url.searchParams.get('page') === '1'));
  assert.deepEqual(new Set(requests.map((url) => url.searchParams.get('status'))), new Set([null, 'active', 'inactive']));
});
