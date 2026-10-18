import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';

function sampleAgent() {
  return new Agent({
    agentId: 'AGENT-001', fullName: 'Alex Morgan', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'Central', __v: 0,
    createdAt: new Date('2026-10-18T00:00:00.000Z'),
    updatedAt: new Date('2026-10-18T00:00:00.000Z'),
  }).toObject();
}

async function startTestServer(t, { records = [], total = records.length, findError, countError } = {}) {
  // Capture the query contract; no mocked query attempts a live database call.
  const query = {};
  for (const method of ['select', 'sort', 'skip', 'limit', 'lean']) {
    query[method] = t.mock.fn(() => query);
  }
  query.exec = t.mock.fn(async () => {
    if (findError) throw findError;
    return records;
  });
  const find = t.mock.method(Agent, 'find', () => query);
  const count = t.mock.method(Agent, 'countDocuments', () => ({ exec: async () => {
    if (countError) throw countError;
    return total;
  } }));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return { base: `http://127.0.0.1:${server.address().port}`, find, count, query };
}

function get(base, query = '') {
  return fetch(base + '/api/agents' + query, { signal: AbortSignal.timeout(5000) });
}

test('default pagination uses database projection, stable sort, skip/limit, and safe public fields', async (t) => {
  const record = sampleAgent();
  const { base, find, count, query } = await startTestServer(t, { records: [record], total: 23 });
  const response = await get(base);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true, message: 'Agents retrieved successfully',
    data: [{
      id: record._id.toString(), agentId: 'AGENT-001', fullName: 'Alex Morgan',
      phone: '+1 202-555-0142', email: 'alex@example.com', serviceArea: 'Central',
      status: 'active', createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    }],
    pagination: { page: 1, limit: 10, total: 23, totalPages: 3 },
  });
  assert.deepEqual(find.mock.calls[0].arguments, [{}]);
  assert.deepEqual(count.mock.calls[0].arguments, [{}]);
  assert.deepEqual(query.select.mock.calls[0].arguments, ['agentId fullName phone email serviceArea status createdAt updatedAt']);
  assert.deepEqual(query.sort.mock.calls[0].arguments, [{ createdAt: -1, _id: -1 }]);
  assert.deepEqual(query.skip.mock.calls[0].arguments, [0]);
  assert.deepEqual(query.limit.mock.calls[0].arguments, [10]);
  assert.equal(query.lean.mock.callCount(), 1);
  assert.equal(query.exec.mock.callCount(), 1);
});

test('explicit pagination and the maximum page size use correct offsets and metadata', async (t) => {
  const { base, query } = await startTestServer(t, { total: 64 });
  const response = await get(base, '?page=3&limit=25');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).pagination, { page: 3, limit: 25, total: 64, totalPages: 3 });
  assert.deepEqual(query.skip.mock.calls[0].arguments, [50]);
  assert.deepEqual(query.limit.mock.calls[0].arguments, [25]);
  const maximum = await get(base, '?limit=100');
  assert.equal(maximum.status, 200);
  assert.equal((await maximum.json()).pagination.limit, 100);
});

test('invalid, repeated, nested, unknown, and unsafe query values return 400 without database queries', async (t) => {
  const { base, find, count } = await startTestServer(t);
  const cases = [
    'page=0', 'page=-1', 'page=1.5', 'page=text', 'page=', 'page=01', 'page=1e3',
    'page=9007199254740992', 'page=9007199254740991&limit=100',
    'limit=0', 'limit=-1', 'limit=1.5', 'limit=101', 'limit=', 'limit=Infinity',
    'page=1&page=2', 'limit=1&limit=2', 'status=pending', 'status=', 'status=ACTIVE',
    'status=active&status=inactive', 'search=one&search=two', 'serviceArea=A&serviceArea=B',
    'page[x]=1', 'status[$ne]=active', 'serviceArea[$regex]=.*', 'sort=fullName',
    `search=${'x'.repeat(201)}`,
  ];
  for (const query of cases) {
    const response = await get(base, '?' + query);
    assert.equal(response.status, 400, query);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.message, 'Request validation failed');
    assert.ok(body.details.length > 0);
    assert.ok(body.details.every((detail) => detail.section === 'query'));
  }
  assert.equal(find.mock.callCount(), 0);
  assert.equal(count.mock.callCount(), 0);
});

test('search is a case-insensitive literal substring across all five fields', async (t) => {
  const { base, find, count } = await startTestServer(t);
  const literal = 'A.+(X)[Y]{}^$|?*\\';
  const response = await get(base, '?' + new URLSearchParams({ search: `  ${literal}  ` }));
  assert.equal(response.status, 200);
  const filter = find.mock.calls[0].arguments[0];
  assert.deepEqual(filter.$or.map((clause) => Object.keys(clause)[0]), ['agentId', 'fullName', 'phone', 'email', 'serviceArea']);
  for (const clause of filter.$or) {
    const pattern = Object.values(clause)[0];
    assert.ok(pattern instanceof RegExp);
    assert.equal(pattern.flags, 'i');
    assert.equal(pattern.test(`prefix ${literal.toLowerCase()} suffix`), true);
    assert.equal(pattern.test('A-anything-X-Y'), false);
  }
  assert.deepEqual(count.mock.calls[0].arguments, [filter]);
});

test('status and service area filters are exact and blank optional text is ignored', async (t) => {
  const { base, find, count } = await startTestServer(t);
  const cases = [
    [{ status: 'active' }, { status: 'active' }],
    [{ status: 'inactive' }, { status: 'inactive' }],
    [{ serviceArea: '  Central  ' }, { serviceArea: 'Central' }],
    [{ serviceArea: '.*[$ne]' }, { serviceArea: '.*[$ne]' }],
    [{ search: '   ', serviceArea: '  ' }, {}],
  ];
  for (const [params, filter] of cases) {
    const response = await get(base, '?' + new URLSearchParams(params));
    assert.equal(response.status, 200);
    assert.deepEqual(find.mock.calls.at(-1).arguments, [filter]);
    assert.deepEqual(count.mock.calls.at(-1).arguments, [filter]);
  }
});

test('search combines with both filters and uses the same matching criteria for the count', async (t) => {
  const { base, find, count, query } = await startTestServer(t, { total: 12 });
  const response = await get(base, '?search=Alex&status=active&serviceArea=Central&page=2&limit=5');
  assert.equal(response.status, 200);
  const filter = find.mock.calls[0].arguments[0];
  assert.deepEqual(filter, {
    status: 'active', serviceArea: 'Central',
    $or: ['agentId', 'fullName', 'phone', 'email', 'serviceArea'].map((field) => ({ [field]: /Alex/i })),
  });
  assert.deepEqual(count.mock.calls[0].arguments, [filter]);
  assert.deepEqual(query.skip.mock.calls[0].arguments, [5]);
  assert.deepEqual(query.limit.mock.calls[0].arguments, [5]);
  assert.deepEqual((await response.json()).pagination, { page: 2, limit: 5, total: 12, totalPages: 3 });
});

test('no matches return an empty array with zero total pages', async (t) => {
  const { base } = await startTestServer(t);
  const response = await get(base, '?search=missing');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.data, []);
  assert.deepEqual(body.pagination, { page: 1, limit: 10, total: 0, totalPages: 0 });
});

test('a page past the last page remains 200 with the requested page and matching total', async (t) => {
  const { base, query } = await startTestServer(t, { total: 12 });
  const response = await get(base, '?page=99&limit=5');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.data, []);
  assert.deepEqual(body.pagination, { page: 99, limit: 5, total: 12, totalPages: 3 });
  assert.deepEqual(query.skip.mock.calls[0].arguments, [490]);
});

test('find and count failures use the existing safe centralized 500 response', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  for (const option of ['findError', 'countError']) {
    const { base } = await startTestServer(t, { [option]: new Error('fake-private-query-error') });
    const response = await get(base);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  }
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
});
