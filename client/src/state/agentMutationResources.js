import { editableAgentFields, validateAgentChanges, agentMutationError } from '../validation/agentMutations.js';

// Small observable state shared by the two mutation flows; requests are never auto-retried.
function mutationState(initial) {
  let snapshot = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    publish(changes) { snapshot = { ...snapshot, ...changes }; for (const listener of listeners) listener(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export function createEditAgentResource(agent, updateAgent, onSaved = () => {}) {
  const values = Object.fromEntries(['agentId', ...editableAgentFields].map((field) => [field, agent[field]]));
  const store = mutationState({ status: 'idle', values, fieldErrors: {}, message: '' });

  function setField(field, value) {
    const state = store.getSnapshot();
    if (!editableAgentFields.includes(field) || ['submitting', 'success'].includes(state.status)) return;
    store.publish({ values: { ...state.values, [field]: value } });
  }

  async function submit() {
    const state = store.getSnapshot();
    if (['submitting', 'success'].includes(state.status)) return;
    const { changes, errors } = validateAgentChanges(state.values, agent);
    if (Object.keys(errors).length || !Object.keys(changes).length) {
      store.publish({ status: 'invalid', fieldErrors: errors, message: Object.keys(errors).length
        ? 'Please correct the highlighted fields.' : 'No changes to save. Update a field or cancel.' });
      return;
    }
    store.publish({ status: 'submitting', fieldErrors: {}, message: '', missing: false });
    let updated;
    try { updated = await updateAgent(agent.id, changes); }
    catch (error) { store.publish({ status: 'error', ...agentMutationError(error, 'update') }); return; }
    store.publish({ status: 'success', message: 'Agent updated successfully.' });
    // A navigation/reload failure must not invite resubmitting a confirmed update.
    try { await onSaved(updated); }
    catch { store.publish({ message: 'Agent updated successfully. Return to Agents to reload the latest data.' }); }
  }
  return { getSnapshot: store.getSnapshot, subscribe: store.subscribe, setField, submit };
}

export function createDeleteAgentResource(agent, deleteAgent, onDeleted = () => {}) {
  const store = mutationState({ status: 'confirming', message: '', missing: false });
  function cancel() {
    if (['submitting', 'success'].includes(store.getSnapshot().status)) return false;
    store.publish({ status: 'cancelled' });
    return true;
  }
  async function confirm() {
    const state = store.getSnapshot();
    if (!['confirming', 'error'].includes(state.status) || state.missing) return;
    store.publish({ status: 'submitting', message: '' });
    try { await deleteAgent(agent.id); }
    catch (error) { store.publish({ status: 'error', ...agentMutationError(error, 'delete') }); return; }
    store.publish({ status: 'success', message: 'Agent deleted successfully.' });
    try { await onDeleted(agent); }
    catch { store.publish({ message: 'Agent deleted successfully. Return to Agents to refresh the list.' }); }
  }
  return { getSnapshot: store.getSnapshot, subscribe: store.subscribe, cancel, confirm };
}
