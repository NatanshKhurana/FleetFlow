import { useEffect, useState, useSyncExternalStore } from 'react';
import AgentsContent from '../components/agents/AgentsContent.jsx';
import { fetchAgents } from '../services/agentsService.js';
import { createAgentsResource } from '../state/agentsResource.js';

export default function AgentsPage() {
  const [resource] = useState(() => createAgentsResource(fetchAgents));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);

  useEffect(() => {
    void resource.load();
    return resource.cancel;
  }, [resource]);

  return <AgentsContent state={state} query={resource.getQuery()}
    onApply={resource.applyFilters} onClear={resource.clearFilters}
    onPageChange={resource.goToPage} onRetry={resource.load} />;
}
