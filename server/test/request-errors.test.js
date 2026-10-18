import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../src/middleware/validateRequest.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { ApiError } from '../src/utils/ApiError.js';

async function testServer(t, addRoutes) {
  const application = express();
  application.use(express.json());
  addRoutes(application);
  application.use(errorHandler);
  const server = application.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
}

test('valid body data reaches a route as parsed data without overwriting the raw body', async (t) => {
  const schema = z.object({ name: z.string().trim().min(1) });
  const base = await testServer(t, (app) => {
    app.post('/check', validateRequest(schema), (req, res) => {
      res.json({ parsed: req.validated.body, original: req.body });
    });
  });
  const response = await request(base + '/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '  Alex  ', extra: 'unused' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    parsed: { name: 'Alex' }, original: { name: '  Alex  ', extra: 'unused' },
  });
});

test('invalid body returns safe field details and never calls the route', async (t) => {
  let routeCalled = false;
  const schema = z.object({ profile: z.object({ name: z.string().min(3, { error: 'fake-private-schema-message' }) }) });
  const base = await testServer(t, (app) => {
    app.post('/check', validateRequest(schema), (req, res) => { routeCalled = true; res.json({}); });
  });
  const response = await request(base + '/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: { name: '' }, password: 'fake-private-input' }),
  });
  assert.equal(response.status, 400);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.json();
  assert.deepEqual(body, {
    success: false, message: 'Request validation failed',
    details: [{ section: 'body', field: 'profile.name', message: 'Value is too short or below the minimum' }],
  });
  assert.doesNotMatch(JSON.stringify(body), /fake-private|stack/);
  assert.equal(routeCalled, false);
});

test('params and query validation can be chained while preserving the query getter', async (t) => {
  const params = z.object({ id: z.string().min(3) });
  const query = z.object({ page: z.coerce.number().int().min(1) });
  const base = await testServer(t, (app) => {
    app.get('/check/:id', validateRequest(params, 'params'), validateRequest(query, 'query'), (req, res) => {
      res.json({ parsed: req.validated, rawPage: req.query.page });
    });
  });
  const valid = await request(base + '/check/abc?page=2');
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { parsed: { params: { id: 'abc' }, query: { page: 2 } }, rawPage: '2' });
  for (const [path, section, field] of [['/check/a?page=2', 'params', 'id'], ['/check/abc?page=0', 'query', 'page']]) {
    const response = await request(base + path);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.details[0].section, section);
    assert.equal(body.details[0].field, field);
  }
});

test('async refinements work and schema programming errors reach the error handler', async (t) => {
  const failure = new Error('fake-private-refinement-error');
  const schema = z.object({ name: z.string().refine(async (value) => {
    if (value === 'throw') throw failure;
    return value === 'allowed';
  }) });
  const log = t.mock.method(console, 'error', () => {});
  const base = await testServer(t, (app) => {
    app.post('/check', validateRequest(schema), (req, res) => res.json(req.validated.body));
  });
  for (const [name, status] of [['allowed', 200], ['denied', 400], ['throw', 500]]) {
    const response = await request(base + '/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /fake-private|stack/);
  }
  assert.doesNotMatch(JSON.stringify(log.mock.calls), /fake-private-refinement-error/);
});

test('raw Zod errors also become safe JSON 400 responses', async (t) => {
  const base = await testServer(t, (app) => {
    app.get('/check', () => z.object({ count: z.number() }).parse({ count: 'fake-private-input' }));
  });
  const response = await request(base + '/check');
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false, message: 'Request validation failed',
    details: [{ section: 'request', field: 'count', message: 'Invalid or missing value' }],
  });
});

test('known application errors retain their status; unexpected and server errors hide details', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const base = await testServer(t, (app) => {
    app.get('/conflict', () => { throw new ApiError(409, 'Requested operation conflicts with current state'); });
    app.get('/unavailable', () => { throw new ApiError(503, 'fake-private-service-details'); });
    app.get('/unexpected', async () => {
      const error = new Error('fake-private-connection-details');
      error.statusCode = 400;
      error.expose = true;
      throw error;
    });
  });
  const conflict = await request(base + '/conflict');
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { success: false, message: 'Requested operation conflicts with current state' });
  for (const [path, status] of [['/unexpected', 500], ['/unavailable', 503]]) {
    const response = await request(base + path);
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' });
  }
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map((call) => call.arguments)), /fake-private|stack/);
});

test('already-started responses delegate the original error without writing again', () => {
  const error = new Error('response already started');
  let forwarded;
  let calls = 0;
  errorHandler(error, {}, { headersSent: true, status: () => assert.fail('Unexpected response write') }, (value) => {
    calls++; forwarded = value;
  });
  assert.equal(calls, 1);
  assert.equal(forwarded, error);
});

test('invalid middleware configuration and invalid application statuses fail clearly', () => {
  assert.throws(() => validateRequest(z.object({}), 'headers'), /body, params, or query/);
  assert.throws(() => new ApiError(200, 'invalid status'), /400 to 599/);
});
