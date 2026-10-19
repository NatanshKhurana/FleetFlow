import { useState } from 'react';
import { Search } from 'lucide-react';

const fieldClass = 'mt-2 min-h-11 w-full min-w-0 rounded-lg border border-strong bg-surface px-3 py-2 text-sm text-heading focus:border-accent';

export default function AgentFilters({ query, onApply, onClear }) {
  const [draft, setDraft] = useState({ ...query });

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setDraft({ search: '', status: '', serviceArea: '', limit: query.limit });
    onClear();
  }

  return (
    <form role="search" aria-label="Find agents" aria-describedby="agent-filter-help"
      onSubmit={(event) => { event.preventDefault(); onApply(draft); }}
      className="rounded-2xl border border-edge bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_7rem]">
        <div>
          <label htmlFor="agents-search" className="text-sm font-medium text-body">Search agents</label>
          <input id="agents-search" name="search" type="search" maxLength={200} autoComplete="off"
            value={draft.search} onChange={(event) => update('search', event.target.value)}
            placeholder="Name, ID, phone, email or area" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="agents-status" className="text-sm font-medium text-body">Status</label>
          <select id="agents-status" name="status" value={draft.status}
            onChange={(event) => update('status', event.target.value)} className={fieldClass}>
            <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label htmlFor="agents-area" className="text-sm font-medium text-body">Service area</label>
          <input id="agents-area" name="serviceArea" value={draft.serviceArea}
            onChange={(event) => update('serviceArea', event.target.value)} placeholder="Exact area name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="agents-limit" className="text-sm font-medium text-body">Per page</label>
          <select id="agents-limit" name="limit" value={draft.limit}
            onChange={(event) => update('limit', event.target.value)} className={fieldClass}>
            {[10, 25, 50, 100].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <p id="agent-filter-help" className="max-w-xl text-xs leading-5 text-muted">
          Search across agent IDs, names, contacts and areas. Service area matches exactly and is case-sensitive. Select Apply filters to update results.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover">
            <Search size={16} aria-hidden="true" />Apply filters
          </button>
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-edge px-4 py-2 text-sm font-medium text-body hover:bg-subtle">Clear filters</button>
        </div>
      </div>
    </form>
  );
}
