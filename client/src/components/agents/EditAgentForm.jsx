import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { AddAgentFormView } from './AddAgentForm.jsx';
import { createEditAgentResource } from '../../state/agentMutationResources.js';
import { updateAgent } from '../../services/agentsService.js';

export default function EditAgentForm({ agent, onSaved, onCancel }) {
  const [resource] = useState(() => createEditAgentResource(agent, updateAgent, onSaved));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const firstField = useRef(null);
  const errorSummary = useRef(null);
  useEffect(() => { firstField.current?.focus(); }, []);
  useEffect(() => {
    if (['invalid', 'error'].includes(state.status)) errorSummary.current?.focus();
  }, [state.status, state.fieldErrors]);
  return <div className="min-w-0 space-y-5">
    <Link to="/agents" className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-700 underline underline-offset-4">Back to Agents</Link>
    <AddAgentFormView editing state={state} onChange={resource.setField} onSubmit={resource.submit}
      onCancel={onCancel} firstFieldRef={firstField} errorRef={errorSummary} />
  </div>;
}
