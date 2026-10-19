import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import AgentDetailContent from '../components/agents/AgentDetailContent.jsx';
import EditAgentForm from '../components/agents/EditAgentForm.jsx';
import DeleteAgentDialog from '../components/agents/DeleteAgentDialog.jsx';
import { fetchAgentById, isAgentId } from '../services/agentsService.js';
import { createRequestResource } from '../state/requestResource.js';

function AgentDetailRequest({ id, editing }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(false);
  const [deletingAgent, setDeletingAgent] = useState(null);
  const [resource] = useState(() => createRequestResource(({ signal }) => fetchAgentById(id, { signal }), {
    canRetainData: (data) => data?.kind === 'found',
  }));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);

  useEffect(() => {
    mounted.current = true;
    void resource.load();
    return () => { mounted.current = false; resource.cancel(); };
  }, [resource]);

  function onSaved(agent) {
    if (!mounted.current) return;
    navigate(`/agents/${agent.id}`, { replace: true, state: { agentNotice: `Agent ${agent.agentId} updated successfully.` } });
  }

  function onDeleted(agent) {
    if (!mounted.current) return;
    navigate('/agents', { replace: true, state: { agentNotice: `Agent ${agent.agentId} deleted successfully.` } });
  }

  if (editing && state.status === 'success' && state.data.kind === 'found') {
    return <EditAgentForm agent={state.data.agent} onSaved={onSaved} onCancel={() => navigate(`/agents/${id}`)} />;
  }
  return <div className="min-w-0 space-y-5">
    {typeof location.state?.agentNotice === 'string' && <p role="status" className="break-words rounded-xl border border-accent-edge bg-accent-soft p-4 text-sm text-accent">{location.state.agentNotice}</p>}
    <AgentDetailContent state={state} onRetry={resource.load} onDelete={setDeletingAgent} />
    {deletingAgent && <DeleteAgentDialog key={deletingAgent.id} agent={deletingAgent} onDeleted={onDeleted} onClose={() => setDeletingAgent(null)} />}
  </div>;
}

export default function AgentDetailPage({ editing = false }) {
  const { id } = useParams();
  if (!isAgentId(id)) {
    return <AgentDetailContent state={{ status: 'success', data: { kind: 'invalid', agent: null } }} />;
  }
  // A different route ID starts a fresh resource; no previous agent flashes while loading.
  return <AgentDetailRequest key={`${id.toLowerCase()}:${editing}`} id={id} editing={editing} />;
}
