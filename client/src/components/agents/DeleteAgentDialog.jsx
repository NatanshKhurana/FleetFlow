import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { deleteAgent } from '../../services/agentsService.js';
import { createDeleteAgentResource } from '../../state/agentMutationResources.js';

export default function DeleteAgentDialog({ agent, onDeleted, onClose }) {
  const [resource] = useState(() => createDeleteAgentResource(agent, deleteAgent, onDeleted));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const pending = state.status === 'submitting';

  function cancel() {
    if (resource.getSnapshot().status === 'success' || resource.cancel()) onClose();
  }

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    // Native modal dialogs contain keyboard focus and make the rest of the page inert.
    element.showModal();
    cancelButton.current?.focus();
    return () => {
      element.close();
      if (opener?.isConnected) opener.focus();
      else document.getElementById('main-content')?.focus();
    };
  }, []);

  return <dialog ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-agent-title"
    aria-describedby="delete-agent-description" aria-busy={pending}
    onCancel={(event) => { event.preventDefault(); cancel(); }}
    className="fixed m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <h2 id="delete-agent-title" className="text-lg font-semibold">Delete this agent?</h2>
    <p id="delete-agent-description" className="mt-3 break-words text-sm leading-6 text-slate-600">
      Delete {agent.fullName} ({agent.agentId}) permanently? This action cannot be undone.
    </p>
    {state.status === 'error' && <p role="alert" className="mt-4 text-sm leading-6 text-red-700">{state.message}</p>}
    {pending && <p role="status" className="mt-4 text-sm text-slate-500">Deleting agent. Please wait.</p>}
    {state.status === 'success' && <p role="status" className="mt-4 text-sm text-emerald-800">{state.message}</p>}
    <form className="mt-6 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); void resource.confirm(); }}>
      <button ref={cancelButton} type="button" onClick={state.status === 'success' ? onClose : cancel} disabled={pending}
        className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">{state.missing || state.status === 'success' ? 'Close' : 'Cancel'}</button>
      <button type="submit" disabled={pending || state.missing || state.status === 'success'}
        className="min-h-11 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Deleting…' : 'Delete agent'}</button>
    </form>
  </dialog>;
}
