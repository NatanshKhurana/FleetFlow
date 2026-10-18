import api from '../lib/api.js';

export function agentListParams(query = {}) {
  const { page = 1, limit = 10, search = '', status = '', serviceArea = '' } = query;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !Number.isSafeInteger((page - 1) * limit) || typeof search !== 'string' || search.trim().length > 200
    || typeof serviceArea !== 'string' || !['', 'active', 'inactive'].includes(status)) {
    throw new Error('Invalid agent list query');
  }
  const params = { page, limit };
  if (search.trim()) params.search = search.trim();
  if (status) params.status = status;
  if (serviceArea.trim()) params.serviceArea = serviceArea.trim();
  return params;
}

function publicAgent(agent) {
  const fields = ['id', 'agentId', 'fullName', 'phone', 'email', 'serviceArea', 'createdAt', 'updatedAt'];
  if (!agent || fields.some((field) => typeof agent[field] !== 'string' || !agent[field].trim())
    || !['active', 'inactive'].includes(agent.status)
    || !Number.isFinite(Date.parse(agent.createdAt)) || !Number.isFinite(Date.parse(agent.updatedAt))) {
    throw new Error('Invalid agent response');
  }
  return Object.fromEntries([...fields, 'status'].map((field) => [field, agent[field]]));
}

export async function createAgent(data, client = api) {
  const response = await client.post('/agents', data);
  if (response.status !== 201 || response.data?.success !== true) throw new Error('Invalid create response');
  return publicAgent(response.data.data);
}

export function isAgentId(id) {
  return typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id);
}

export async function updateAgent(id, changes, client = api) {
  if (!isAgentId(id)) throw new Error('Invalid agent ID');
  const response = await client.patch(`/agents/${id.toLowerCase()}`, changes);
  if (response.status !== 200 || response.data?.success !== true) throw new Error('Invalid update response');
  const agent = publicAgent(response.data.data);
  if (agent.id.toLowerCase() !== id.toLowerCase()) throw new Error('Unexpected agent ID');
  return agent;
}

export async function deleteAgent(id, client = api) {
  if (!isAgentId(id)) throw new Error('Invalid agent ID');
  const response = await client.delete(`/agents/${id.toLowerCase()}`);
  // The existing API deliberately returns no JSON for a successful delete.
  if (response.status !== 204) throw new Error('Invalid delete response');
}

export async function fetchAgentById(id, { signal } = {}, client = api) {
  if (!isAgentId(id)) return { kind: 'invalid', agent: null };
  const normalizedId = id.toLowerCase();
  let response;
  try {
    response = await client.get(`/agents/${normalizedId}`, { signal });
  } catch (error) {
    // Expected client errors are page states, not raw error messages to display.
    if (error?.response?.status === 404) return { kind: 'not-found', agent: null };
    if (error?.response?.status === 400) return { kind: 'invalid', agent: null };
    throw error;
  }
  if (response.status !== 200 || response.data?.success !== true) throw new Error('Invalid detail response');
  const agent = publicAgent(response.data.data);
  if (agent.id.toLowerCase() !== normalizedId) throw new Error('Unexpected agent ID');
  return { kind: 'found', agent };
}

export async function fetchAgents(query = {}, { signal } = {}, client = api) {
  const params = agentListParams(query);
  const { data: body } = await client.get('/agents', { params, signal });
  const pagination = body?.pagination;
  if (body?.success !== true || !Array.isArray(body.data) || !pagination
    || pagination.page !== params.page || pagination.limit !== params.limit
    || !Number.isSafeInteger(pagination.total) || pagination.total < 0
    || pagination.totalPages !== Math.ceil(pagination.total / params.limit)
    || body.data.length > params.limit
    || body.data.length > Math.max(0, pagination.total - (params.page - 1) * params.limit)) {
    throw new Error('Invalid agent pagination response');
  }
  return {
    agents: body.data.map(publicAgent),
    pagination: { page: pagination.page, limit: pagination.limit, total: pagination.total, totalPages: pagination.totalPages },
  };
}
