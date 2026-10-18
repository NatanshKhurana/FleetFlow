import { ArrowLeft, Pencil, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router';

const date = new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'UTC',
});

function DetailFeedback({ title, children, onRetry }) {
  return <div className="p-6 sm:p-8">
    <div role="alert"><h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{children}</p></div>
    {onRetry && <button type="button" onClick={onRetry}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
      <RefreshCw size={16} aria-hidden="true" />Try again
    </button>}
  </div>;
}

function AgentInformation({ agent }) {
  const fields = [
    ['Full name', agent.fullName], ['Agent ID', agent.agentId],
    ['Phone', agent.phone], ['Email', agent.email], ['Service area', agent.serviceArea],
    ['Status', <span className={'inline-block rounded-full px-3 py-1 text-xs font-medium ' +
      (agent.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700')}>
      {agent.status === 'active' ? 'Active' : 'Inactive'}</span>],
    ['Created (UTC)', <time dateTime={agent.createdAt}>{date.format(new Date(agent.createdAt))}</time>],
    ['Last updated (UTC)', <time dateTime={agent.updatedAt}>{date.format(new Date(agent.updatedAt))}</time>],
    ['Database record ID', agent.id],
  ];
  return <div className="p-5 sm:p-8">
    <dl className="grid min-w-0 gap-x-8 gap-y-6 sm:grid-cols-2">
      {fields.map(([label, value]) => <div key={label} className="min-w-0 border-b border-slate-100 pb-5">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-2 text-sm leading-6 text-slate-900 [overflow-wrap:anywhere]">{value}</dd>
      </div>)}
    </dl>
    <p className="mt-5 text-xs leading-5 text-slate-500">Agent ID is the business identifier. Database record ID identifies this record in FleetFlow.</p>
  </div>;
}

export default function AgentDetailContent({ state, onRetry, onDelete }) {
  const kind = state.data?.kind;
  return <div className="min-w-0 space-y-5">
    <Link to="/agents" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-emerald-700 underline underline-offset-4">
      <ArrowLeft size={17} aria-hidden="true" />Back to Agents
    </Link>
    {state.status === 'success' && kind === 'found' && <div className="flex flex-wrap gap-3">
      <Link to={`/agents/${encodeURIComponent(state.data.agent.id)}/edit`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
        <Pencil size={17} aria-hidden="true" />Edit agent
      </Link>
      <button type="button" onClick={() => onDelete(state.data.agent)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700">
        <Trash2 size={17} aria-hidden="true" />Delete agent
      </button>
    </div>}
    <section aria-labelledby="agent-information-title" aria-busy={state.status === 'loading'}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:px-8">
        <UserRound size={21} className="shrink-0 text-emerald-700" aria-hidden="true" />
        <h2 id="agent-information-title" className="font-semibold text-slate-900">Agent information</h2>
      </div>
      {state.status === 'loading' ? <p role="status" className="p-6 text-sm text-slate-500 sm:p-8">Loading agent details…</p>
        : state.status === 'error' ? <DetailFeedback title="We couldn't load this agent." onRetry={onRetry}>Agent details are temporarily unavailable. Please try again.</DetailFeedback>
          : kind === 'invalid' ? <DetailFeedback title="Invalid agent link">This link does not contain a valid agent record ID. Return to Agents and select View for an agent.</DetailFeedback>
            : kind === 'not-found' ? <DetailFeedback title="Agent not found" onRetry={onRetry}>This agent may have been removed or the link may be out of date. Return to Agents or try again.</DetailFeedback>
              : <AgentInformation agent={state.data.agent} />}
    </section>
  </div>;
}
