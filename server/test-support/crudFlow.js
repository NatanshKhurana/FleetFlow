import assert from 'node:assert/strict';

async function send(base, method, path, status, body) {
  const response = await fetch(base + '/api/agents' + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, status, `${method} ${path}: expected ${status}`);
  if (status === 204) {
    assert.equal(await response.text(), '');
    return;
  }
  assert.match(response.headers.get('content-type'), /application\/json/);
  return response.json();
}

// Run identical HTTP assertions against either mocked storage or isolated MongoDB.
export async function verifyCrudFlow(base) {
  const payload = {
    agentId: 'FLOW-001', fullName: ' Flow Agent ', phone: '+1 202-555-0142',
    email: ' FLOW@EXAMPLE.COM ', serviceArea: 'Central', status: 'inactive',
  };
  const initial = await send(base, 'GET', '', 200);
  assert.deepEqual(initial.data, []);
  assert.deepEqual(initial.pagination, { page: 1, limit: 10, total: 0, totalPages: 0 });

  const created = await send(base, 'POST', '', 201, payload);
  const agent = created.data;
  assert.equal(created.success, true);
  assert.match(agent.id, /^[a-f0-9]{24}$/);
  assert.equal(agent.fullName, 'Flow Agent');
  assert.equal(agent.email, 'flow@example.com');
  const path = '/' + agent.id;

  // Regression: invalid contact input must neither add a row nor change an existing one.
  const invalidPhoneCreate = await send(base, 'POST', '', 400, { ...payload, agentId: 'PHONE-INVALID', phone: 'abc' });
  assert.ok(invalidPhoneCreate.details.some((detail) => detail.field === 'phone'));
  assert.equal((await send(base, 'GET', '', 200)).pagination.total, 1);
  const invalidPhoneUpdate = await send(base, 'PATCH', path, 400, { phone: 'abc', fullName: 'Must not be saved' });
  assert.ok(invalidPhoneUpdate.details.some((detail) => detail.field === 'phone'));
  assert.deepEqual((await send(base, 'GET', path, 200)).data, agent);

  // Failures must leave the previously created agent intact.
  const duplicate = await send(base, 'POST', '', 409, { ...payload, agentId: ' FLOW-001 ' });
  assert.deepEqual(duplicate, { success: false, message: 'An agent with this agentId already exists' });
  const invalidCreate = await send(base, 'POST', '', 400, { ...payload, fullName: ' ' });
  assert.equal(invalidCreate.message, 'Request validation failed');
  const invalidUpdate = await send(base, 'PATCH', path, 400, { fullName: 'Should not change', agentId: 'CHANGED' });
  assert.equal(invalidUpdate.message, 'Request validation failed');
  assert.deepEqual((await send(base, 'GET', path, 200)).data, agent);

  const updated = (await send(base, 'PATCH', path, 200, { serviceArea: ' North ' })).data;
  assert.deepEqual({ ...updated, updatedAt: agent.updatedAt }, { ...agent, serviceArea: 'North' });
  assert.ok(Number.isFinite(Date.parse(updated.updatedAt)));
  assert.ok(Date.parse(updated.updatedAt) >= Date.parse(agent.updatedAt));
  assert.deepEqual((await send(base, 'GET', path, 200)).data, updated);
  const listed = await send(base, 'GET', '', 200);
  assert.deepEqual(listed.data, [updated]);
  assert.deepEqual(listed.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });

  // Another record must survive the targeted deletion, even with shared contacts.
  const survivor = (await send(base, 'POST', '', 201, { ...payload, agentId: 'FLOW-002' })).data;
  assert.notEqual(survivor.id, agent.id);
  await send(base, 'DELETE', path, 204);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const missing = await send(base, method, path, 404, method === 'PATCH' ? { status: 'active' } : undefined);
    assert.deepEqual(missing, { success: false, message: 'Agent not found' });
  }
  assert.deepEqual((await send(base, 'GET', '/' + survivor.id, 200)).data, survivor);
  const remaining = await send(base, 'GET', '', 200);
  assert.deepEqual(remaining.data, [survivor]);
  assert.equal(remaining.pagination.total, 1);
  await send(base, 'DELETE', '/' + survivor.id, 204);
  const empty = await send(base, 'GET', '', 200);
  assert.deepEqual(empty.data, []);
  assert.deepEqual(empty.pagination, { page: 1, limit: 10, total: 0, totalPages: 0 });
}
