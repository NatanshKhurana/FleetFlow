import { createRequestResource } from './requestResource.js';

export function createAgentsResource(fetchAgents) {
  let query = { page: 1, limit: 10, search: '', status: '', serviceArea: '' };
  const request = createRequestResource(({ signal }) => fetchAgents(query, { signal }));

  function applyFilters(filters = {}) {
    query = {
      page: 1,
      limit: Number(filters.limit ?? query.limit),
      search: String(filters.search ?? '').trim(),
      status: String(filters.status ?? '').trim(),
      serviceArea: String(filters.serviceArea ?? '').trim(),
    };
    // Different filters must never label old rows as matching the new query.
    return request.load({ keepData: false });
  }

  function goToPage(page) {
    const snapshot = request.getSnapshot();
    if (snapshot.status !== 'success' || !Number.isSafeInteger(page)) return;
    const lastPage = Math.max(1, snapshot.data.pagination.totalPages);
    const nextPage = Math.max(1, Math.min(page, lastPage));
    if (nextPage === query.page) return;
    query = { ...query, page: nextPage };
    return request.load({ keepData: false });
  }

  return { ...request, getQuery: () => query, applyFilters, goToPage,
    clearFilters: () => applyFilters({ limit: query.limit }) };
}
