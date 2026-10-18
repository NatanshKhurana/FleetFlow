import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { emptyAgentForm, validateAgentForm, agentSubmissionError } from '../src/validation/createAgent.js';
import { createAgentResource } from '../src/state/createAgentResource.js';
import { createAgentsResource } from '../src/state/agentsResource.js';

let vite;
let AddAgentFormView;
let createAgent;
let fetchAgents;
let api;

before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  ({ AddAgentFormView } = await vite.ssrLoadModule('/src/components/agents/AddAgentForm.jsx'));
  ({ createAgent, fetchAgents } = await vite.ssrLoadModule('/src/services/agentsService.js'));
  api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
});
after(async () => { await vite?.close(); });

function values() {
  return { agentId: ' AG-NEW ', fullName: ' Alex Test ', phone: ' +1 202-555-0142 ',
    email: ' ALEX@EXAMPLE.COM ', serviceArea: ' North ', status: 'active' };
}

function agent(data = validateAgentForm(values()).data) {
  return { ...data, id: '000000000000000000000001', createdAt: '2026-10-18T12:00:00.000Z',
    updatedAt: '2026-10-18T12:00:00.000Z' };
}

function fill(resource, fields = values()) {
  for (const [field, value] of Object.entries(fields)) resource.setField(field, value);
}

function render(state) {
  return renderToString(createElement(AddAgentFormView, { state, onChange() {}, onSubmit() {}, onCancel() {} }))
    .replace(/<!--.*?-->/g, '');
}

test('form renders exactly the supported fields, labels, required indicators, and two status options', () => {
  const resource = createAgentResource(() => {});
  const html = render(resource.getSnapshot());
  for (const field of Object.keys(emptyAgentForm())) {
    assert.match(html, new RegExp(`for="new-agent-${field}"`));
    assert.match(html, new RegExp(`name="${field}"`));
  }
  assert.equal((html.match(/required=""/g) || []).length, 5);
  assert.equal((html.match(/<input\b/g) || []).length, 5);
  assert.equal((html.match(/<option\b/g) || []).length, 2);
  assert.match(html, /value="active" selected=""/);
  assert.match(html, /type="email"/);
  assert.match(html, /type="tel"/);
  assert.match(html, /sm:grid-cols-2/);
  assert.match(html, /min-w-0/);
  assert.match(html, /noValidate=""/i);
  assert.match(html, /unique business ID/);
  assert.match(html, /type="button"[^>]*>Cancel/);
  assert.doesNotMatch(html, /name="id"|name="createdAt"|name="password"/);
});

test('client rules trim strings and lowercase email without inventing phone/ID/area restrictions', () => {
  const result = validateAgentForm(values());
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.data, { agentId: 'AG-NEW', fullName: 'Alex Test', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'North', status: 'active' });
  assert.deepEqual(validateAgentForm({ ...values(), phone: 'x', agentId: 'a', serviceArea: 'a', status: ' inactive ' }).errors, {});
  for (const email of ['a+b@example.co.uk', "a'b@example.com", 'a_b@example.com']) {
    assert.deepEqual(validateAgentForm({ ...values(), email }).errors, {});
  }
  for (const email of ['a@localhost', 'a..b@example.com', '.a@example.com', 'a@b.c', 'not-an-email']) {
    assert.ok(validateAgentForm({ ...values(), email }).errors.email, email);
  }
});

test('blank required fields, invalid types/email, and unsupported status fail locally without a POST', async (t) => {
  const create = t.mock.fn();
  const resource = createAgentResource(create);
  await resource.submit();
  assert.equal(resource.getSnapshot().status, 'invalid');
  assert.equal(Object.keys(resource.getSnapshot().fieldErrors).length, 5);
  fill(resource, { ...values(), phone: '  ', fullName: null, email: 'bad', status: 'delivering' });
  await resource.submit();
  for (const field of ['phone', 'fullName', 'email', 'status']) assert.ok(resource.getSnapshot().fieldErrors[field]);
  assert.equal(create.mock.callCount(), 0);
  const html = render(resource.getSnapshot());
  assert.match(html, /role="alert"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /aria-invalid="true" aria-describedby="new-agent-email-error"/);
  assert.match(html, /id="new-agent-email-error"/);
});

test('valid submission publishes progress and passes only normalized supported fields to the service', async (t) => {
  const create = t.mock.fn(async (data) => agent(data));
  const onCreated = t.mock.fn();
  const resource = createAgentResource(create, onCreated);
  const statuses = [];
  const unsubscribe = resource.subscribe(() => statuses.push(resource.getSnapshot().status));
  fill(resource, { ...values(), id: 'must-not-submit', status: 'inactive' });
  await resource.submit();
  assert.deepEqual(create.mock.calls[0].arguments, [validateAgentForm({ ...values(), status: 'inactive' }).data]);
  assert.equal(onCreated.mock.callCount(), 1);
  assert.equal(onCreated.mock.calls[0].arguments[0].agentId, 'AG-NEW');
  assert.deepEqual(statuses.slice(-2), ['submitting', 'success']);
  assert.equal(resource.getSnapshot().values.agentId, ' AG-NEW ');
  unsubscribe();
  const count = statuses.length;
  resource.setField('fullName', 'cannot edit saved form');
  await resource.submit();
  assert.equal(statuses.length, count);
  assert.equal(create.mock.callCount(), 1);
});

test('overlapping submissions and edits while pending cannot create a second request or change the payload', async (t) => {
  const pending = Promise.withResolvers();
  const create = t.mock.fn(() => pending.promise);
  const resource = createAgentResource(create);
  fill(resource);
  const first = resource.submit();
  await resource.submit();
  resource.setField('agentId', 'different');
  assert.equal(create.mock.callCount(), 1);
  assert.equal(resource.getSnapshot().values.agentId, ' AG-NEW ');
  const html = render(resource.getSnapshot());
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /<fieldset disabled=""/);
  assert.match(html, /Saving agent/);
  assert.match(html, /role="status"/);
  pending.resolve(agent());
  await first;
  await resource.submit();
  assert.equal(create.mock.callCount(), 1);
});

test('server body validation details become useful field errors and retain every entered value', async () => {
  const resource = createAgentResource(async () => { throw { response: { status: 400, data: {
    message: 'private raw error', details: [
      { section: 'body', field: 'email', message: 'private raw field details' },
      { section: 'query', field: 'phone', message: 'private query details' },
      { section: 'body', field: '__proto__', message: 'private internals' },
    ],
  } } }; });
  fill(resource);
  await resource.submit();
  const state = resource.getSnapshot();
  assert.equal(state.status, 'error');
  assert.deepEqual(state.values, values());
  assert.deepEqual(Object.keys(state.fieldErrors), ['email']);
  assert.match(state.fieldErrors.email, /server rejected/);
  assert.match(render(state), /ALEX@EXAMPLE.COM/);
  assert.doesNotMatch(render(state), /private|__proto__/);
  for (const details of [null, {}, [{ section: 'body', field: '(root)' }]]) {
    assert.match(agentSubmissionError({ response: { status: 400, data: { details } } }).message, /Review your entries/);
  }
});

test('duplicate agent ID maps HTTP 409 to its field without displaying raw server text', async () => {
  const resource = createAgentResource(async () => { throw { response: { status: 409, data: { message: 'private database error' } } }; });
  fill(resource);
  await resource.submit();
  assert.match(resource.getSnapshot().fieldErrors.agentId, /already exists/);
  assert.deepEqual(resource.getSnapshot().values, values());
  assert.doesNotMatch(render(resource.getSnapshot()), /private database/);
});

test('network, timeout, server, oversized, and malformed-response failures retain values and never auto-retry', async (t) => {
  for (const error of [new Error('private network details'), { code: 'ECONNABORTED' },
    { response: { status: 500, data: { message: 'private stack' } } }, { response: { status: 413 } }]) {
    const create = t.mock.fn(async () => { throw error; });
    const resource = createAgentResource(create);
    fill(resource);
    await resource.submit();
    assert.equal(resource.getSnapshot().status, 'error');
    assert.deepEqual(resource.getSnapshot().values, values());
    assert.equal(create.mock.callCount(), 1);
    assert.doesNotMatch(render(resource.getSnapshot()), /private|ECONNABORTED/);
    assert.match(resource.getSnapshot().message, /entries/);
  }
});

test('correcting fields and retrying after a rejected submission clears errors and can succeed', async () => {
  let fail = true;
  const resource = createAgentResource(async (data) => {
    if (fail) throw { response: { status: 409 } };
    return agent(data);
  });
  fill(resource);
  await resource.submit();
  resource.setField('agentId', 'AG-DIFFERENT');
  fail = false;
  await resource.submit();
  assert.equal(resource.getSnapshot().status, 'success');
  assert.deepEqual(resource.getSnapshot().fieldErrors, {});
  assert.match(render(resource.getSnapshot()), /Agent created successfully/);
});

test('create service requires the existing 201 contract and reuses public field mapping', async (t) => {
  const post = t.mock.fn(async () => ({ status: 201, data: { success: true, data: { ...agent(), __v: 4, internal: 'omit' } } }));
  const payload = validateAgentForm(values()).data;
  assert.deepEqual(await createAgent(payload, { post }), agent());
  assert.deepEqual(post.mock.calls[0].arguments, ['/agents', payload]);
  for (const response of [
    { status: 200, data: { success: true, data: agent() } },
    { status: 201, data: { success: false, data: agent() } },
    { status: 201, data: { success: true, data: { ...agent(), id: null } } },
  ]) await assert.rejects(createAgent(payload, { post: async () => response }));
});

test('a confirmed save stays successful even if its list refresh fails; it cannot be posted again', async (t) => {
  const create = t.mock.fn(async () => agent());
  const resource = createAgentResource(create, async () => { throw new Error('refresh failure'); });
  fill(resource);
  await resource.submit();
  assert.equal(resource.getSnapshot().status, 'success');
  assert.match(resource.getSnapshot().message, /list could not refresh/);
  await resource.submit();
  assert.equal(create.mock.callCount(), 1);
});

test('failed creation never refreshes or clears the existing list query', async (t) => {
  const refresh = t.mock.fn();
  const list = createAgentsResource(async () => {});
  const form = createAgentResource(async () => { throw { response: { status: 400 } }; }, refresh);
  fill(form);
  const query = list.getQuery();
  await form.submit();
  assert.equal(refresh.mock.callCount(), 0);
  assert.equal(list.getQuery(), query);
});

test('list retry after a confirmed creation retries only the GET, never the POST', async (t) => {
  let fail = true;
  const fetch = t.mock.fn(async (query) => {
    if (fail) throw new Error('list unavailable');
    return { agents: [agent()], pagination: { page: query.page, limit: query.limit, total: 1, totalPages: 1 } };
  });
  const list = createAgentsResource(fetch);
  const create = t.mock.fn(async () => agent());
  const form = createAgentResource(create, () => list.clearFilters());
  fill(form);
  await form.submit();
  assert.equal(form.getSnapshot().status, 'success');
  assert.equal(list.getSnapshot().status, 'error');
  fail = false;
  await list.load();
  assert.equal(list.getSnapshot().status, 'success');
  assert.equal(create.mock.callCount(), 1);
  assert.equal(fetch.mock.callCount(), 2);
});

test('Axios POST and subsequent list refresh use the real contracts against an isolated HTTP fixture', async (t) => {
  const calls = [];
  const records = [];
  const backend = createHttpServer(async (request, reply) => {
    const url = new URL(request.url, 'http://localhost');
    calls.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams) });
    reply.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body);
      assert.deepEqual(payload, validateAgentForm(values()).data);
      records.unshift(agent(payload));
      reply.writeHead(201);
      reply.end(JSON.stringify({ success: true, message: 'Agent created successfully', data: records[0] }));
    } else {
      const page = Number(url.searchParams.get('page'));
      const limit = Number(url.searchParams.get('limit'));
      reply.end(JSON.stringify({ success: true, data: records, pagination: { page, limit, total: records.length, totalPages: records.length ? 1 : 0 } }));
    }
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const previous = api.defaults.baseURL;
  t.after(async () => {
    api.defaults.baseURL = previous;
    await new Promise((resolve) => { backend.close(resolve); backend.closeAllConnections(); });
  });
  api.defaults.baseURL = `http://127.0.0.1:${backend.address().port}/api`;
  const list = createAgentsResource(fetchAgents);
  await list.applyFilters({ search: 'unrelated', status: 'inactive', serviceArea: 'South', limit: 25 });
  const form = createAgentResource(createAgent, () => list.clearFilters());
  fill(form);
  await form.submit();
  assert.equal(form.getSnapshot().status, 'success');
  assert.equal(list.getSnapshot().status, 'success');
  assert.equal(list.getSnapshot().data.agents[0].agentId, 'AG-NEW');
  assert.deepEqual(list.getQuery(), { page: 1, limit: 25, search: '', status: '', serviceArea: '' });
  assert.deepEqual(calls.map(({ method, path }) => [method, path]), [
    ['GET', '/api/agents'], ['POST', '/api/agents'], ['GET', '/api/agents'],
  ]);
  assert.deepEqual(calls.at(-1).query, { page: '1', limit: '25' });
});
