import { ArrowLeft, Pencil, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import ReadFeedback from '../ReadFeedback.jsx';

const date = new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'UTC',
});

function DetailFeedback({ title, children, onRetry }) {
  return <div className="p-6 sm:p-8">
    <div role="alert"><h3 className="font-semibold text-heading">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{children}</p></div>
    {onRetry && <button type="button" onClick={onRetry}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover">
      <RefreshCw size={16} aria-hidden="true" />Try again
    </button>}
  </div>;
}

function AgentInformation({ agent }) {
  const fields = [
    ['Full name', agent.fullName], ['Agent ID', agent.agentId],
    ['Phone', agent.phone], ['Email', agent.email], ['Service area', agent.serviceArea],
    ['Status', <span className={'inline-block rounded-full px-3 py-1 text-xs font-medium ' +
      (agent.status === 'active' ? 'bg-accent-soft text-accent' : 'bg-raised text-body')}>
      {agent.status === 'active' ? 'Active' : 'Inactive'}</span>],
    ['Created (UTC)', <time dateTime={agent.createdAt}>{date.format(new Date(agent.createdAt))}</time>],
    ['Last updated (UTC)', <time dateTime={agent.updatedAt}>{date.format(new Date(agent.updatedAt))}</time>],
    ['Database record ID', agent.id],
  ];
  return <div className="p-5 sm:p-8">
    <dl className="grid min-w-0 gap-x-8 gap-y-6 sm:grid-cols-2">
      {fields.map(([label, value]) => <div key={label} className="min-w-0 border-b border-line pb-5">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-2 text-sm leading-6 text-heading [overflow-wrap:anywhere]">{value}</dd>
      </div>)}
    </dl>
    <p className="mt-5 text-xs leading-5 text-muted">Agent ID is the business identifier. Database record ID identifies this record in FleetFlow.</p>
  </div>;
}

export default function AgentDetailContent({ state, onRetry, onDelete }) {
  const kind = state.data?.kind;
  const found = kind === 'found';
  return <div className="min-w-0 space-y-5">
    <Link to="/agents" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-accent underline underline-offset-4">
      <ArrowLeft size={17} aria-hidden="true" />Back to Agents
    </Link>
    {state.status === 'success' && kind === 'found' && <div className="flex flex-wrap gap-3">
      <Link to={`/agents/${encodeURIComponent(state.data.agent.id)}/edit`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 text-sm font-medium text-body">
        <Pencil size={17} aria-hidden="true" />Edit agent
      </Link>
      <button type="button" onClick={() => onDelete(state.data.agent)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-danger-edge bg-surface px-4 py-2 text-sm font-medium text-danger">
        <Trash2 size={17} aria-hidden="true" />Delete agent
      </button>
      <button type="button" onClick={() => void onRetry()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 text-sm text-accent">
        <RefreshCw size={17} aria-hidden="true" />Refresh details
      </button>
    </div>}
    <section aria-labelledby="agent-information-title" aria-busy={state.status === 'loading'}
      className="min-w-0 rounded-2xl border border-edge bg-surface">
      <div className="flex items-center gap-3 border-b border-line p-5 sm:px-8">
        <UserRound size={21} className="shrink-0 text-accent" aria-hidden="true" />
        <h2 id="agent-information-title" className="font-semibold text-heading">Agent information</h2>
      </div>
      <ReadFeedback state={state} title="We couldn't load this agent."
        initialLabel="Loading agent details…" refreshLabel="Refreshing agent details…" onRetry={onRetry} />
      {found ? <AgentInformation agent={state.data.agent} /> : state.status !== 'success' ? null
          : kind === 'invalid' ? <DetailFeedback title="Invalid agent link">This link does not contain a valid agent record ID. Return to Agents and select View for an agent.</DetailFeedback>
            : kind === 'not-found' ? <DetailFeedback title="Agent not found" onRetry={onRetry}>This agent may have been removed or the link may be out of date. Return to Agents or try again.</DetailFeedback>
              : null}
    </section>
  </div>;
}
