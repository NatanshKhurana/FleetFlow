import api from '../lib/api.js';

function readTotal(response) {
  const body = response?.data;
  if (body?.success !== true || !Array.isArray(body.data)
    || !Number.isSafeInteger(body.pagination?.total) || body.pagination.total < 0) {
    throw new Error('Invalid overview response');
  }
  return body.pagination.total;
}

function recentAgent(agent) {
  const fields = ['id', 'agentId', 'fullName', 'serviceArea', 'createdAt'];
  if (!agent || fields.some((field) => typeof agent[field] !== 'string' || !agent[field].trim())
    || !['active', 'inactive'].includes(agent.status) || !Number.isFinite(Date.parse(agent.createdAt))) {
    throw new Error('Invalid recent agent');
  }
  // Keep only fields needed by the overview; contact details are not displayed.
  return Object.fromEntries([...fields, 'status'].map((field) => [field, agent[field]]));
}

export async function fetchOverview({ signal } = {}, client = api) {
  const [all, active, inactive] = await Promise.all([
    client.get('/agents', { params: { page: 1, limit: 5 }, signal }),
    client.get('/agents', { params: { page: 1, limit: 1, status: 'active' }, signal }),
    client.get('/agents', { params: { page: 1, limit: 1, status: 'inactive' }, signal }),
  ]);
  // Count all matching documents, never just the returned page's records.
  const total = readTotal(all);
  const activeCount = readTotal(active);
  const inactiveCount = readTotal(inactive);
  if (activeCount + inactiveCount !== total || all.data.data.length !== Math.min(total, 5)) {
    // Independent cached queries are not an atomic snapshot during concurrent changes.
    throw new Error('Overview responses are inconsistent; retry');
  }
  return { total, active: activeCount, inactive: inactiveCount, recentAgents: all.data.data.map(recentAgent) };
}
