import { Clock3, RefreshCw, TriangleAlert, UserRoundCheck, UserRoundMinus, UsersRound } from 'lucide-react';

const number = new Intl.NumberFormat('en');
const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function SummaryCards({ data, loading }) {
  const cards = [
    { label: 'Total agents', value: data?.total, icon: UsersRound, primary: true },
    { label: 'Active agents', value: data?.active, icon: UserRoundCheck },
    { label: 'Inactive agents', value: data?.inactive, icon: UserRoundMinus },
  ];
  return (
    <dl className="grid min-w-0 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, primary }) => (
        <div key={label} className={'min-w-0 rounded-2xl border p-6 ' +
          (primary ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-900')}>
          <dt className="flex items-start justify-between gap-3 text-sm font-medium">
            {label}<Icon size={20} strokeWidth={1.7} className="shrink-0 opacity-80" aria-hidden="true" />
          </dt>
          <dd className="mt-5">
            <span className="block break-words text-3xl font-semibold tracking-tight xl:text-4xl">
              {loading ? <span aria-hidden="true">—</span> : number.format(value)}
            </span>
            <p className={'mt-3 text-xs leading-5 ' + (primary ? 'text-emerald-50' : 'text-slate-500')}>
              {primary ? 'Across your delivery team' : label === 'Active agents' ? 'Currently marked active' : 'Currently marked inactive'}
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RecentAgents({ agents }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white" aria-labelledby="recent-agents-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-6">
        <div>
          <h3 id="recent-agents-title" className="font-semibold text-slate-900">Recently added</h3>
          <p className="mt-1 text-sm text-slate-500">Your latest agent registrations.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{agents.length} shown</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {agents.map((agent) => (
          <li key={agent.id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UsersRound size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{agent.fullName}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{agent.agentId} · {agent.serviceArea}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
              <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' +
                (agent.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
                {agent.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <time dateTime={agent.createdAt} className="text-xs text-slate-500" title="Registration date (UTC)">
                {date.format(new Date(agent.createdAt))}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function OverviewContent({ state, onRetry }) {
  const loading = state.status === 'loading';
  return (
    <section aria-label="Agent overview" aria-busy={loading} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Your team at a glance.</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">A snapshot of the people behind your deliveries.</p>
      </div>
      {state.status === 'error' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div role="alert">
            <TriangleAlert className="mb-4 text-amber-600" size={24} aria-hidden="true" />
            <h3 className="font-semibold">We couldn't load your overview.</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">Your agent data is temporarily unavailable. Please try again.</p>
          </div>
          <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            <RefreshCw size={16} aria-hidden="true" />Try again
          </button>
        </div>
      ) : (
        <>
          <SummaryCards data={state.data} loading={loading} />
          {loading ? (
            <div role="status" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              <Clock3 size={19} aria-hidden="true" />Loading your overview…
            </div>
          ) : state.data.total === 0 ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
              <UsersRound size={28} className="mx-auto mb-4 text-emerald-700" aria-hidden="true" />
              <h3 className="font-semibold">No agents yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Your overview will fill in as agents are added to your team.</p>
            </div>
          ) : <RecentAgents agents={state.data.recentAgents} />}
          {!loading && <p className="text-xs leading-5 text-slate-500">Counts include all registered agents. Recent registrations are ordered newest first.</p>}
        </>
      )}
    </section>
  );
}
