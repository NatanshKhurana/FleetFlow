import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import AgentsContent from '../components/agents/AgentsContent.jsx';
import AddAgentForm from '../components/agents/AddAgentForm.jsx';
import { fetchAgents } from '../services/agentsService.js';
import { createAgentsResource } from '../state/agentsResource.js';

export default function AgentsPage() {
  const [resource] = useState(() => createAgentsResource(fetchAgents));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const [formOpen, setFormOpen] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);
  const [filterVersion, setFilterVersion] = useState(0);
  const addButton = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void resource.load();
    return () => { mounted.current = false; resource.cancel(); };
  }, [resource]);

  function closeForm() {
    setFormOpen(false);
    addButton.current?.focus();
  }

  async function onCreated(agent) {
    if (!mounted.current) return;
    setCreatedAgent(agent);
    closeForm();
    // Remount the filter inputs so their drafts match the cleared query too.
    setFilterVersion((version) => version + 1);
    await resource.clearFilters();
  }

  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-slate-500">Manage your delivery team in one place.</p>
      <button ref={addButton} type="button" aria-expanded={formOpen} aria-controls="add-agent-panel"
        onClick={() => { setCreatedAgent(null); setFormOpen(true); }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
        <Plus size={18} aria-hidden="true" />Add new agent
      </button>
    </div>
    {createdAgent && <p role="status" className="break-words rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      Agent {createdAgent.agentId} created successfully. Filters cleared to show the newest agents.
    </p>}
    <div id="add-agent-panel" hidden={!formOpen}>
      {formOpen && <AddAgentForm onCreated={onCreated} onCancel={closeForm} />}
    </div>
    <AgentsContent key={filterVersion} state={state} query={resource.getQuery()}
      onApply={resource.applyFilters} onClear={resource.clearFilters}
      onPageChange={resource.goToPage} onRetry={resource.load} />
  </div>;
}
