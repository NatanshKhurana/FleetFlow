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
