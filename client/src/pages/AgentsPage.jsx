import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import { useLocation } from 'react-router';
import AgentsContent from '../components/agents/AgentsContent.jsx';
import AddAgentForm from '../components/agents/AddAgentForm.jsx';
import DeleteAgentDialog from '../components/agents/DeleteAgentDialog.jsx';
import { fetchAgents } from '../services/agentsService.js';
import { createAgentsResource } from '../state/agentsResource.js';

export default function AgentsPage() {
  const location = useLocation();
  const [resource] = useState(() => createAgentsResource(fetchAgents));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const [formOpen, setFormOpen] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);
  const [notice, setNotice] = useState(() => typeof location.state?.agentNotice === 'string' ? location.state.agentNotice : '');
  const [deletingAgent, setDeletingAgent] = useState(null);
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
    setNotice('');
    closeForm();
    // Remount the filter inputs so their drafts match the cleared query too.
    setFilterVersion((version) => version + 1);
    await resource.clearFilters();
  }

  async function onDeleted(agent) {
    if (!mounted.current) return;
    setCreatedAgent(null);
    setNotice(`Agent ${agent.agentId} deleted successfully.`);
    setDeletingAgent(null);
    // Keep applied filters; the existing empty-page recovery handles a deleted last row.
    await resource.load();
  }

  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted">Manage your delivery team in one place.</p>
      <button ref={addButton} type="button" aria-expanded={formOpen} aria-controls="add-agent-panel"
        onClick={() => { setCreatedAgent(null); setNotice(''); setFormOpen(true); }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover">
        <Plus size={18} aria-hidden="true" />Add new agent
      </button>
    </div>
    {notice && <p role="status" className="break-words rounded-xl border border-accent-edge bg-accent-soft p-4 text-sm text-accent">{notice}</p>}
    {createdAgent && <p role="status" className="break-words rounded-xl border border-accent-edge bg-accent-soft p-4 text-sm text-accent">
      Agent {createdAgent.agentId} created successfully. Filters cleared to show the newest agents.
    </p>}
    <div id="add-agent-panel" hidden={!formOpen}>
      {formOpen && <AddAgentForm onCreated={onCreated} onCancel={closeForm} />}
    </div>
    <AgentsContent key={filterVersion} state={state} query={resource.getQuery()}
      onApply={resource.applyFilters} onClear={resource.clearFilters}
      onPageChange={resource.goToPage} onRetry={resource.load} onDelete={setDeletingAgent} />
    {deletingAgent && <DeleteAgentDialog key={deletingAgent.id} agent={deletingAgent} onDeleted={onDeleted} onClose={() => setDeletingAgent(null)} />}
  </div>;
}
