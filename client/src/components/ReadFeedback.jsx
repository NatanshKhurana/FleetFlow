import { RefreshCw } from 'lucide-react';
import { readErrorMessage } from '../lib/requestErrors.js';

export default function ReadFeedback({ state, title, initialLabel, refreshLabel, onRetry }) {
  if (state.status === 'success') return null;
  const loading = state.status === 'loading';
  return <div className="space-y-3 p-5 text-sm sm:p-6">
    {loading ? <p role="status" className="text-slate-500">{state.data ? refreshLabel : initialLabel}</p>
      : state.status === 'cancelled' ? <p role="status" className="text-slate-600">Request cancelled. Try again when you are ready.</p>
        : <div role="alert"><h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-slate-600">{readErrorMessage(state.errorKind)}</p></div>}
    {state.data && <p className="text-slate-500">Showing previously loaded data. It may be out of date.</p>}
    {!loading && onRetry && <button type="button" onClick={() => void onRetry()}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
      <RefreshCw size={16} aria-hidden="true" />Try again
    </button>}
  </div>;
}
