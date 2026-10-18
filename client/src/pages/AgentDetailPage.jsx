import { useEffect, useState, useSyncExternalStore } from 'react';
import { useParams } from 'react-router';
import AgentDetailContent from '../components/agents/AgentDetailContent.jsx';
import { fetchAgentById, isAgentId } from '../services/agentsService.js';
import { createRequestResource } from '../state/requestResource.js';

function AgentDetailRequest({ id }) {
  const [resource] = useState(() => createRequestResource(({ signal }) => fetchAgentById(id, { signal })));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);

  useEffect(() => {
    void resource.load();
    return resource.cancel;
  }, [resource]);

  return <AgentDetailContent state={state} onRetry={resource.load} />;
}

export default function AgentDetailPage() {
  const { id } = useParams();
  if (!isAgentId(id)) {
    return <AgentDetailContent state={{ status: 'success', data: { kind: 'invalid', agent: null } }} />;
  }
  // A different route ID starts a fresh resource; no previous agent flashes while loading.
  return <AgentDetailRequest key={id.toLowerCase()} id={id} />;
}
