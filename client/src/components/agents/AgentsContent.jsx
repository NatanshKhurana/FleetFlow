import { ChevronLeft, ChevronRight, RefreshCw, SearchX, UsersRound } from 'lucide-react';
import ReadFeedback from '../ReadFeedback.jsx';
import AgentFilters from './AgentFilters.jsx';
import AgentsTable from './AgentsTable.jsx';

const number = new Intl.NumberFormat('en');
const pageButton = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

function Pagination({ pagination, shown, onPageChange, disabled }) {
  const { page, limit, total, totalPages } = pagination;
  const range = shown ? `${number.format((page - 1) * limit + 1)}–${number.format((page - 1) * limit + shown)}` : '0';
  return (
    <nav aria-label="Agent pagination" className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">Showing {range} of {number.format(total)} matching agents</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500">{totalPages === 0 ? 'No pages' : page > totalPages ? `Page ${page} · ${totalPages} pages available` : `Page ${page} of ${totalPages}`}</span>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1 || totalPages === 0} className={pageButton} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" />Previous</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages} className={pageButton} aria-label="Next page">Next<ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </nav>
  );
}

export default function AgentsContent({ state, query, onApply, onClear, onPageChange, onRetry, onDelete }) {
  const filtered = Boolean(query.search || query.status || query.serviceArea);
  const result = state.data;
  return (
    <div className="min-w-0 space-y-6">
      <AgentFilters query={query} onApply={onApply} onClear={onClear} />
      <section aria-label="Agent results" aria-busy={state.status === 'loading'} className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <UsersRound size={20} className="text-emerald-700" aria-hidden="true" />
          <h2 className="font-semibold text-slate-900">Delivery agents</h2>
          {state.status === 'success' && <button type="button" onClick={() => void onRetry()}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-emerald-700">
            <RefreshCw size={16} aria-hidden="true" />Refresh agents
          </button>}
        </div>
        <ReadFeedback state={state} title="We couldn't load your agents."
          initialLabel="Loading agents…" refreshLabel="Refreshing agents…" onRetry={onRetry} />
        {result && (
          <>
            {result.agents.length ? <AgentsTable agents={result.agents} onDelete={onDelete} disableDelete={state.status !== 'success'} /> : (
              <div role="status" className="p-8 text-center sm:p-12">
                <SearchX size={28} className="mx-auto mb-4 text-emerald-700" aria-hidden="true" />
                <h3 className="font-semibold">{result.pagination.total > 0 ? 'No agents on this page' : filtered ? 'No matching agents' : 'No agents yet'}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{result.pagination.total > 0 ? 'The results may have changed. Return to the first page to continue.' : filtered ? 'Try a different search or clear your filters.' : 'Agents will appear here once they are added to your team.'}</p>
                {result.pagination.page > 1 && <button type="button" disabled={state.status !== 'success'} onClick={() => onPageChange(1)} className="mt-5 min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm text-emerald-700">Back to first page</button>}
              </div>
            )}
            <Pagination pagination={result.pagination} shown={result.agents.length} onPageChange={onPageChange} disabled={state.status !== 'success'} />
          </>
        )}
      </section>
    </div>
  );
}
