import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { createServer } from 'vite';
import { createEditAgentResource, createDeleteAgentResource } from '../src/state/agentMutationResources.js';
import { validateAgentChanges, editableAgentFields } from '../src/validation/agentMutations.js';
import { createAgentsResource } from '../src/state/agentsResource.js';

let vite;
let FormView;
let EditAgentForm;
let DeleteAgentDialog;
let AgentDetailContent;
let App;
let updateAgent;
let deleteAgent;
let fetchAgentById;
let fetchAgents;
let api;
const id = 'abcdef0123456789abcdef01';

before(async () => {
  vite = await createServer({ envDir: false, server: { middlewareMode: true, watch: null, hmr: false, ws: false } });
  FormView = (await vite.ssrLoadModule('/src/components/agents/AddAgentForm.jsx')).AddAgentFormView;
  EditAgentForm = (await vite.ssrLoadModule('/src/components/agents/EditAgentForm.jsx')).default;
  DeleteAgentDialog = (await vite.ssrLoadModule('/src/components/agents/DeleteAgentDialog.jsx')).default;
  AgentDetailContent = (await vite.ssrLoadModule('/src/components/agents/AgentDetailContent.jsx')).default;
  App = (await vite.ssrLoadModule('/src/App.jsx')).default;
  ({ updateAgent, deleteAgent, fetchAgentById, fetchAgents } = await vite.ssrLoadModule('/src/services/agentsService.js'));
  api = (await vite.ssrLoadModule('/src/lib/api.js')).default;
});
after(async () => { await vite?.close(); });

function agent() {
  return { id, agentId: 'AGENT-001', fullName: 'Alex Test', phone: '+1 202-555-0142',
    email: 'alex@example.com', serviceArea: 'North', status: 'inactive',
    createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z' };
}
function response(record = agent()) { return { status: 200, data: { success: true, data: record } }; }
function render(component, props, path = '/') {
  return renderToString(createElement(MemoryRouter, { initialEntries: [path] }, createElement(component, props)))
    .replace(/<!--.*?-->/g, '');
}
function renderEdit(state) {
  return render(FormView, { editing: true, state, onChange() {}, onSubmit() {}, onCancel() {} });
}

test('invalid phone edits show field feedback, preserve the draft, and never send PATCH', async (t) => {
  const update = t.mock.fn();
  for (const phone of ['abc', '123abc', '---', '1234567)', '12+34567']) {
    const resource = createEditAgentResource(agent(), update);
    resource.setField('phone', phone);
    resource.setField('fullName', 'Must not be sent');
    await resource.submit();
    assert.equal(resource.getSnapshot().status, 'invalid');
    assert.match(resource.getSnapshot().fieldErrors.phone, /phone number using digits/);
    assert.match(renderEdit(resource.getSnapshot()), /edit-agent-phone-error/);
    assert.equal(resource.getSnapshot().values.phone, phone);
  }
  assert.equal(update.mock.callCount(), 0);
  for (const phone of ['123', '(020)7946 0958', '+91 98765 43210', '202.555.0142']) {
    const result = validateAgentChanges({ ...agent(), phone: ` ${phone} ` }, agent());
    assert.deepEqual(result.errors, {});
    assert.equal(result.changes.phone, phone);
  }
});

test('edit form prefills all supported fields, keeps agent ID read-only, and preserves the existing status', () => {
  const resource = createEditAgentResource(agent(), () => {});
  const html = render(EditAgentForm, { agent: agent(), onSaved() {}, onCancel() {} });
  for (const field of ['agentId', ...editableAgentFields]) {
    assert.equal(resource.getSnapshot().values[field], agent()[field]);
    assert.match(html, new RegExp(`name="${field}"`));
  }
  assert.match(html, /aria-label="Edit agent"/);
  const identifierInput = html.match(/<input[^>]*id="edit-agent-agentId"[^>]*>/)[0];
  assert.match(identifierInput, /readOnly=""/i);
  assert.match(html, /value="inactive" selected=""/);
  assert.match(html, /value="Alex Test"/);
  assert.match(html, /business agent ID cannot be changed/);
  assert.match(html, /Save changes/);
  assert.match(html, /Back to Agents/);
  assert.doesNotMatch(html, /name="id"|name="createdAt"|Create agent/);
});

test('normalization creates genuine partial changes without identifiers, timestamps, or omitted defaults', () => {
  const original = agent();
  const result = validateAgentChanges({ ...original, agentId: 'tampered', fullName: ' New Name ',
    email: ' NEW@EXAMPLE.COM ', phone: ' 123 ', serviceArea: ' South ', status: ' active ' }, original);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.changes, { fullName: 'New Name', phone: '123', email: 'new@example.com', serviceArea: 'South', status: 'active' });
  assert.deepEqual(validateAgentChanges({ ...original, email: ' ALEX@EXAMPLE.COM ' }, original).changes, {});
});

test('unchanged values and immutable edits never trigger PATCH', async (t) => {
  const update = t.mock.fn();
  const resource = createEditAgentResource(agent(), update);
  for (const field of ['agentId', 'id', 'createdAt', '__proto__']) resource.setField(field, 'tampered');
  await resource.submit();
  assert.equal(resource.getSnapshot().status, 'invalid');
  assert.match(resource.getSnapshot().message, /No changes/);
  assert.equal(resource.getSnapshot().values.agentId, 'AGENT-001');
  assert.equal(update.mock.callCount(), 0);
});

test('blank, invalid-type, invalid-email, and unsupported-status edits fail locally with field errors', async (t) => {
  for (const [field, value] of [['fullName', ' '], ['phone', null], ['email', 'bad'], ['serviceArea', ' '], ['status', 'delivering']]) {
    const update = t.mock.fn();
    const resource = createEditAgentResource(agent(), update);
    resource.setField(field, value);
    await resource.submit();
    assert.equal(update.mock.callCount(), 0);
    assert.ok(resource.getSnapshot().fieldErrors[field], field);
    const html = renderEdit(resource.getSnapshot());
    assert.match(html, /role="alert"/);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, new RegExp(`edit-agent-${field}-error`));
  }
});

test('one-field and multiple-field saves call PATCH once and expose the returned updated public record', async (t) => {
  for (const changes of [{ fullName: 'New Name' }, { email: 'new@example.com', status: 'active' }]) {
    const saved = { ...agent(), ...changes, updatedAt: '2026-10-19T12:00:00.000Z' };
    const update = t.mock.fn(async () => saved);
    const onSaved = t.mock.fn();
    const resource = createEditAgentResource(agent(), update, onSaved);
    for (const [field, value] of Object.entries(changes)) resource.setField(field, value);
    await resource.submit();
    assert.deepEqual(update.mock.calls[0].arguments, [id, changes]);
    assert.deepEqual(onSaved.mock.calls[0].arguments, [saved]);
    assert.equal(resource.getSnapshot().status, 'success');
    assert.equal(saved.phone, agent().phone);
    await resource.submit();
    assert.equal(update.mock.callCount(), 1);
  }
});

test('an overlapping save and edits while pending cannot issue another PATCH or change the submitted data', async (t) => {
  const pending = Promise.withResolvers();
  const update = t.mock.fn(() => pending.promise);
  const resource = createEditAgentResource(agent(), update);
  resource.setField('fullName', 'First name');
  const first = resource.submit();
  resource.setField('fullName', 'Second name');
  await resource.submit();
  assert.equal(update.mock.callCount(), 1);
  assert.equal(resource.getSnapshot().values.fullName, 'First name');
  assert.match(renderEdit(resource.getSnapshot()), /<fieldset disabled=""/);
  assert.match(renderEdit(resource.getSnapshot()), /Saving agent/);
  pending.resolve({ ...agent(), fullName: 'First name' });
  await first;
});

test('server validation errors map only editable body fields and preserve the user draft', async (t) => {
  const onSaved = t.mock.fn();
  const resource = createEditAgentResource(agent(), async () => { throw { response: { status: 400, data: {
    details: [{ section: 'body', field: 'email', message: 'private field text' },
      { section: 'body', field: 'agentId' }, { section: 'query', field: 'phone' }], message: 'private raw error',
  } } }; }, onSaved);
  resource.setField('email', ' NEW@EXAMPLE.COM ');
  await resource.submit();
  assert.deepEqual(Object.keys(resource.getSnapshot().fieldErrors), ['email']);
  assert.equal(resource.getSnapshot().values.email, ' NEW@EXAMPLE.COM ');
  assert.equal(onSaved.mock.callCount(), 0);
  assert.doesNotMatch(renderEdit(resource.getSnapshot()), /private raw|private field/);
});

test('404, 409, 413, server, timeout, and network update errors stay safe and retain entered values', async (t) => {
  for (const error of [{ response: { status: 404 } }, { response: { status: 409 } }, { response: { status: 413 } },
    { response: { status: 500, data: { message: 'private database text' } } }, { code: 'ECONNABORTED' }, new Error('private network text')]) {
    const update = t.mock.fn(async () => { throw error; });
    const resource = createEditAgentResource(agent(), update);
    resource.setField('fullName', ' Draft name ');
    await resource.submit();
    assert.equal(resource.getSnapshot().status, 'error');
    assert.equal(resource.getSnapshot().values.fullName, ' Draft name ');
    assert.equal(update.mock.callCount(), 1);
    assert.doesNotMatch(renderEdit(resource.getSnapshot()), /private|ECONNABORTED/);
    if (error.response?.status === 404) assert.match(resource.getSnapshot().message, /no longer exists/);
    if (error.response?.status === 409) assert.match(resource.getSnapshot().message, /conflict/);
  }
});

test('correcting and retrying a failed edit clears errors and succeeds', async () => {
  let fail = true;
  const resource = createEditAgentResource(agent(), async (recordId, changes) => {
    if (fail) throw { response: { status: 409 } };
    return { ...agent(), ...changes };
  });
  resource.setField('fullName', 'New Name');
  await resource.submit();
  fail = false;
  resource.setField('email', ' NEW@EXAMPLE.COM ');
  await resource.submit();
  assert.equal(resource.getSnapshot().status, 'success');
  assert.deepEqual(resource.getSnapshot().fieldErrors, {});
});

test('PATCH utility targets the database ID and enforces the existing 200 public response contract', async (t) => {
  const patch = t.mock.fn(async () => response({ ...agent(), fullName: 'New Name', __v: 1 }));
  const saved = await updateAgent(id.toUpperCase(), { fullName: 'New Name' }, { patch });
  assert.deepEqual(patch.mock.calls[0].arguments, [`/agents/${id}`, { fullName: 'New Name' }]);
  assert.equal(saved.fullName, 'New Name');
  assert.equal('__v' in saved, false);
  for (const value of [{ status: 201, data: response().data }, { status: 200, data: { success: false } },
    response({ ...agent(), id: '1'.repeat(24) }), response({ ...agent(), updatedAt: 'bad' })]) {
    await assert.rejects(updateAgent(id, { fullName: 'New Name' }, { patch: async () => value }));
  }
});

test('mutation utilities reject malformed or business IDs before HTTP', async (t) => {
  const patch = t.mock.fn();
  const remove = t.mock.fn();
  for (const invalid of [undefined, 'AGENT-001', `${id}\n`, 'invalid']) {
    await assert.rejects(updateAgent(invalid, { status: 'active' }, { patch }));
    await assert.rejects(deleteAgent(invalid, { delete: remove }));
  }
  assert.equal(patch.mock.callCount(), 0);
  assert.equal(remove.mock.callCount(), 0);
});

test('opening a delete confirmation and cancelling sends no DELETE, even if confirm is called later', async (t) => {
  const remove = t.mock.fn();
  const onDeleted = t.mock.fn();
  const resource = createDeleteAgentResource(agent(), remove, onDeleted);
  assert.equal(resource.getSnapshot().status, 'confirming');
  assert.equal(remove.mock.callCount(), 0);
  assert.equal(resource.cancel(), true);
  await resource.confirm();
  assert.equal(resource.getSnapshot().status, 'cancelled');
  assert.equal(remove.mock.callCount(), 0);
  assert.equal(onDeleted.mock.callCount(), 0);
});

test('delete dialog identifies the agent, describes permanence, and offers separate Cancel and confirmation controls', () => {
  const html = render(DeleteAgentDialog, { agent: agent(), onDeleted() {}, onClose() {} });
  assert.match(html, /<dialog[^>]*role="alertdialog" aria-modal="true"/);
  assert.match(html, /aria-labelledby="delete-agent-title"/);
  assert.match(html, /aria-describedby="delete-agent-description"/);
  assert.match(html, /Alex Test \(AGENT-001\)/);
  assert.match(html, /cannot be undone/);
  assert.match(html, /type="button"[^>]*>Cancel/);
  assert.match(html, /type="submit"[^>]*>Delete agent/);
  assert.match(html, /max-w-md/);
});

test('confirmed deletion targets one record and invokes success once', async (t) => {
  const remove = t.mock.fn(async () => {});
  const onDeleted = t.mock.fn();
  const resource = createDeleteAgentResource(agent(), remove, onDeleted);
  await resource.confirm();
  assert.deepEqual(remove.mock.calls[0].arguments, [id]);
  assert.deepEqual(onDeleted.mock.calls[0].arguments, [agent()]);
  assert.equal(resource.getSnapshot().status, 'success');
  await resource.confirm();
  assert.equal(remove.mock.callCount(), 1);
});

test('pending deletion rejects cancellation and repeated confirmation until the one request completes', async (t) => {
  const pending = Promise.withResolvers();
  const remove = t.mock.fn(() => pending.promise);
  const resource = createDeleteAgentResource(agent(), remove);
  const first = resource.confirm();
  assert.equal(resource.getSnapshot().status, 'submitting');
  assert.equal(resource.cancel(), false);
  await resource.confirm();
  assert.equal(remove.mock.callCount(), 1);
  pending.resolve();
  await first;
  assert.equal(resource.getSnapshot().status, 'success');
});

test('failed deletions keep safe feedback, do not invoke success, and require another explicit confirmation', async (t) => {
  for (const error of [{ response: { status: 400 } }, { response: { status: 500, data: { message: 'private driver details' } } }, new Error('private network')]) {
    const remove = t.mock.fn(async () => { throw error; });
    const onDeleted = t.mock.fn();
    const resource = createDeleteAgentResource(agent(), remove, onDeleted);
    await resource.confirm();
    assert.equal(resource.getSnapshot().status, 'error');
    assert.doesNotMatch(resource.getSnapshot().message, /private|driver/);
    assert.equal(remove.mock.callCount(), 1);
    assert.equal(onDeleted.mock.callCount(), 0);
    assert.equal(resource.cancel(), true);
    await resource.confirm();
    assert.equal(remove.mock.callCount(), 1);
  }
});

test('a missing agent on DELETE gets missing-record feedback and cannot be deleted repeatedly', async (t) => {
  const remove = t.mock.fn(async () => { throw { response: { status: 404 } }; });
  const resource = createDeleteAgentResource(agent(), remove);
  await resource.confirm();
  assert.equal(resource.getSnapshot().missing, true);
  assert.match(resource.getSnapshot().message, /no longer exists/);
  await resource.confirm();
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(resource.cancel(), true);
});

test('a failed delete can recover after an explicit second confirmation', async () => {
  let fail = true;
  const resource = createDeleteAgentResource(agent(), async () => { if (fail) throw new Error('network'); });
  await resource.confirm();
  fail = false;
  await resource.confirm();
  assert.equal(resource.getSnapshot().status, 'success');
});

test('DELETE accepts exactly 204 without parsing a JSON body', async (t) => {
  const remove = t.mock.fn(async () => ({ status: 204, data: '' }));
  await deleteAgent(id.toUpperCase(), { delete: remove });
  assert.deepEqual(remove.mock.calls[0].arguments, [`/agents/${id}`]);
  await assert.rejects(deleteAgent(id, { delete: async () => ({ status: 200, data: { success: true } }) }));
});

test('confirmed mutations stay successful when a follow-up refresh or navigation fails', async (t) => {
  const update = t.mock.fn(async () => agent());
  const edit = createEditAgentResource(agent(), update, async () => { throw new Error('reload'); });
  edit.setField('fullName', 'New Name');
  await edit.submit();
  await edit.submit();
  assert.equal(edit.getSnapshot().status, 'success');
  assert.match(edit.getSnapshot().message, /updated successfully/);
  assert.equal(update.mock.callCount(), 1);
  const remove = t.mock.fn(async () => {});
  const deletion = createDeleteAgentResource(agent(), remove, async () => { throw new Error('reload'); });
  await deletion.confirm();
  await deletion.confirm();
  assert.equal(deletion.getSnapshot().status, 'success');
  assert.match(deletion.getSnapshot().message, /deleted successfully/);
  assert.equal(remove.mock.callCount(), 1);
});

test('mutation subscriptions can be removed and separate drafts do not affect each other', async () => {
  const first = createEditAgentResource(agent(), async () => agent());
  const second = createEditAgentResource(agent(), async () => agent());
  const statuses = [];
  const unsubscribe = first.subscribe(() => statuses.push(first.getSnapshot().status));
  first.setField('fullName', 'Draft');
  assert.equal(second.getSnapshot().values.fullName, 'Alex Test');
  unsubscribe();
  const count = statuses.length;
  await first.submit();
  assert.equal(statuses.length, count);
});

test('retrying a list refresh after successful deletion retries only GET and preserves applied filters', async (t) => {
  let fail = true;
  const fetch = t.mock.fn(async (query) => {
    if (fail) throw new Error('list unavailable');
    return { agents: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  });
  const list = createAgentsResource(fetch);
  await list.applyFilters({ status: 'inactive', serviceArea: 'North' });
  const remove = t.mock.fn(async () => {});
  const deletion = createDeleteAgentResource(agent(), remove, () => list.load());
  await deletion.confirm();
  assert.equal(deletion.getSnapshot().status, 'success');
  assert.equal(list.getSnapshot().status, 'error');
  fail = false;
  await list.load();
  assert.equal(list.getSnapshot().status, 'success');
  assert.equal(list.getQuery().status, 'inactive');
  assert.equal(list.getQuery().serviceArea, 'North');
  assert.equal(remove.mock.callCount(), 1);
});

test('detail page exposes edit and delete actions only after loading an agent', () => {
  const html = render(AgentDetailContent, { state: { status: 'success', data: { kind: 'found', agent: agent() } }, onDelete() {} });
  assert.match(html, new RegExp(`href="/agents/${id}/edit"`));
  assert.match(html, /<button[^>]*>[\s\S]*Delete agent/);
  const missing = render(AgentDetailContent, { state: { status: 'success', data: { kind: 'not-found' } }, onRetry() {} });
  assert.doesNotMatch(missing, /Delete agent|Edit agent/);
});

test('post-mutation navigation destinations display confirmation while loading fresh list or details', () => {
  const list = render(App, {}, { pathname: '/agents', state: { agentNotice: 'Agent AGENT-001 deleted successfully.' } });
  assert.match(list, /deleted successfully/);
  assert.match(list, /Loading agents/);
  assert.doesNotMatch(list, /<dialog/);
  const detail = render(App, {}, { pathname: `/agents/${id}`, state: { agentNotice: 'Agent AGENT-001 updated successfully.' } });
  assert.match(detail, /updated successfully/);
  assert.match(detail, /Loading agent details/);
});

test('Axios GET/PATCH/GET/DELETE/list flow updates isolated fixture data with the actual API contracts', async (t) => {
  let record = agent();
  const calls = [];
  const backend = createHttpServer(async (request, reply) => {
    const url = new URL(request.url, 'http://localhost');
    calls.push([request.method, url.pathname]);
    reply.setHeader('Content-Type', 'application/json');
    if (request.method === 'PATCH') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const changes = JSON.parse(body);
      assert.deepEqual(changes, { fullName: 'Updated Name', email: 'new@example.com' });
      record = { ...record, ...changes, updatedAt: '2026-10-19T12:00:00.000Z' };
      reply.end(JSON.stringify(response(record).data));
    } else if (request.method === 'DELETE') {
      record = null;
      reply.writeHead(204);
      reply.end();
    } else if (url.pathname === '/api/agents') {
      const page = Number(url.searchParams.get('page'));
      const limit = Number(url.searchParams.get('limit'));
      reply.end(JSON.stringify({ success: true, data: record ? [record] : [], pagination: { page, limit, total: record ? 1 : 0, totalPages: record ? 1 : 0 } }));
    } else if (record) reply.end(JSON.stringify(response(record).data));
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
  const initial = await fetchAgentById(id);
  let refreshed;
  const edit = createEditAgentResource(initial.agent, updateAgent, async () => { refreshed = await fetchAgentById(id); });
  edit.setField('fullName', ' Updated Name ');
  edit.setField('email', ' NEW@EXAMPLE.COM ');
  await edit.submit();
  assert.equal(refreshed.agent.fullName, 'Updated Name');
  assert.equal(refreshed.agent.phone, initial.agent.phone);
  assert.equal(refreshed.agent.updatedAt, '2026-10-19T12:00:00.000Z');
  const list = createAgentsResource(fetchAgents);
  await list.applyFilters({ status: 'inactive', serviceArea: 'North' });
  const deletion = createDeleteAgentResource(refreshed.agent, deleteAgent, () => list.load());
  await deletion.confirm();
  assert.equal(deletion.getSnapshot().status, 'success');
  assert.deepEqual(list.getSnapshot().data.agents, []);
  assert.equal(list.getQuery().status, 'inactive');
  assert.equal(list.getQuery().serviceArea, 'North');
  assert.equal((await fetchAgentById(id)).kind, 'not-found');
  assert.deepEqual(calls.slice(0, 3), [['GET', `/api/agents/${id}`], ['PATCH', `/api/agents/${id}`], ['GET', `/api/agents/${id}`]]);
  assert.equal(calls.filter(([method]) => method === 'DELETE').length, 1);
});
