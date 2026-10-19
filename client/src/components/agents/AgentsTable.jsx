import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

const date = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function AgentsTable({ agents, onDelete, disableDelete = false }) {
  return (
    <>
      <p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500 lg:hidden">Scroll within the table to see all columns.</p>
      <div role="region" aria-label="Agents table, scroll horizontally for more columns" tabIndex={0} className="max-w-full overflow-x-auto rounded-b-2xl">
        <table className="w-full min-w-[52rem] table-fixed text-left text-sm">
          <caption className="sr-only">Delivery agents matching your applied filters. View details, edit information, or confirm deletion for an agent.</caption>
          <colgroup><col className="w-[20%]" /><col className="w-[22%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[16%]" /></colgroup>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
            <tr>{['Agent / ID', 'Contact', 'Service area', 'Status', 'Added (UTC)', 'Actions'].map((heading) =>
              <th key={heading} scope="col" className="px-5 py-4 font-semibold">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.map((agent) => (
              <tr key={agent.id} className="align-top hover:bg-slate-50/60">
                <th scope="row" className="px-5 py-5 font-normal [overflow-wrap:anywhere]">
                  <p className="font-medium text-slate-900">{agent.fullName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">ID: {agent.agentId}</p>
                </th>
                <td className="px-5 py-5 [overflow-wrap:anywhere]">
                  <p className="text-slate-700">{agent.phone}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{agent.email}</p>
                </td>
                <td className="px-5 py-5 text-slate-600 [overflow-wrap:anywhere]">{agent.serviceArea}</td>
                <td className="px-5 py-5">
                  <span className={'inline-block rounded-full px-2.5 py-1 text-xs font-medium ' +
                    (agent.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
                    {agent.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-5 text-xs leading-6 text-slate-500"><time dateTime={agent.createdAt}>{date.format(new Date(agent.createdAt))}</time></td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    <Link to={`/agents/${encodeURIComponent(agent.id)}`} aria-label={`View agent ${agent.agentId}`}
                      title="View agent details" className="flex size-11 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50">
                      <Eye size={18} aria-hidden="true" />
                    </Link>
                    <Link to={`/agents/${encodeURIComponent(agent.id)}/edit`} aria-label={`Edit agent ${agent.agentId}`}
                      title="Edit agent" className="flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
                      <Pencil size={18} aria-hidden="true" />
                    </Link>
                    <button type="button" disabled={disableDelete} onClick={() => onDelete(agent)} aria-label={`Delete agent ${agent.agentId}`}
                      title="Delete agent" className="flex size-11 items-center justify-center rounded-lg text-red-700 hover:bg-red-50">
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
