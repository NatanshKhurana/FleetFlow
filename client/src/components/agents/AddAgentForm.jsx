import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { UserPlus } from 'lucide-react';
import { createAgent } from '../../services/agentsService.js';
import { createAgentResource } from '../../state/createAgentResource.js';
import { agentFieldLabels } from '../../validation/createAgent.js';

const inputClass = 'mt-2 min-h-11 w-full min-w-0 rounded-lg border border-strong bg-surface px-3 py-2 text-sm text-heading focus:border-accent disabled:bg-subtle';
const inputTypes = { phone: 'tel', email: 'email' };
const autocomplete = { fullName: 'name', phone: 'tel', email: 'email' };

export function AddAgentFormView({ state, onChange, onSubmit, onCancel, firstFieldRef, errorRef, editing = false }) {
  const pending = state.status === 'submitting';
  const failed = ['invalid', 'error'].includes(state.status);
  const prefix = editing ? 'edit-agent' : 'new-agent';
  const title = editing ? 'Edit agent' : 'Add new agent';
  return (
    <section aria-labelledby="add-agent-title" className="min-w-0 rounded-2xl border border-accent-edge bg-surface p-5 sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <UserPlus size={22} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
        <div><h2 id="add-agent-title" className="text-lg font-semibold text-heading">{title}</h2>
          <p id="add-agent-help" className="mt-1 text-sm leading-6 text-muted">{editing ? 'Update this agent’s information.' : 'Build your delivery team.'} Fields marked * are required.</p></div>
      </div>
      <form aria-label={title} aria-describedby="add-agent-help" aria-busy={pending} noValidate
        onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>
        {failed && <div ref={errorRef} tabIndex={-1} role="alert" className="mb-5 rounded-lg border border-danger-edge bg-danger-soft p-4 text-sm text-danger">{state.message}</div>}
        <fieldset disabled={pending || state.status === 'success'} className="min-w-0">
          <legend className="sr-only">Agent information</legend>
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">
            {Object.entries(agentFieldLabels).map(([field, label]) => {
              const error = state.fieldErrors[field];
              const helpId = field === 'agentId' ? `${prefix}-id-help` : field === 'status' ? `${prefix}-status-help` : '';
              const describedBy = [helpId, error ? `${prefix}-${field}-error` : ''].filter(Boolean).join(' ') || undefined;
              const common = { id: `${prefix}-${field}`, name: field, value: state.values[field] ?? '',
                onChange: (event) => onChange(field, event.target.value), className: inputClass,
                'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
              return <div key={field} className="min-w-0">
                <label htmlFor={common.id} className="text-sm font-medium text-body">{label}{field !== 'status' && !(editing && field === 'agentId') && <span aria-hidden="true"> *</span>}</label>
                {field === 'status' ? <select {...common}><option value="active">Active</option><option value="inactive">Inactive</option></select>
                  : <input {...common} readOnly={editing && field === 'agentId'} ref={field === (editing ? 'fullName' : 'agentId') ? firstFieldRef : undefined} type={inputTypes[field] || 'text'} required autoComplete={autocomplete[field] || 'off'} />}
                {field === 'agentId' && <p id={helpId} className="mt-2 text-xs leading-5 text-muted">{editing ? 'The business agent ID cannot be changed.' : 'Enter a unique business ID for this agent.'}</p>}
                {field === 'status' && <p id={helpId} className="mt-2 text-xs leading-5 text-muted">{editing ? 'Choose Active or Inactive.' : 'New agents start as Active unless you choose Inactive.'}</p>}
                {error && <p id={`${prefix}-${field}-error`} className="mt-2 text-sm text-danger">{error}</p>}
              </div>;
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <button type="submit" className="min-h-11 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60">{pending ? 'Saving agent…' : editing ? 'Save changes' : 'Create agent'}</button>
            <button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-edge px-5 py-2 text-sm font-medium text-body hover:bg-subtle">Cancel</button>
          </div>
        </fieldset>
        {pending && <p role="status" className="mt-4 text-sm text-muted">Saving your agent. Please wait.</p>}
        {state.status === 'success' && <div className="mt-4 text-sm text-accent"><p role="status">{state.message}</p>
          <button type="button" onClick={onCancel} className="mt-3 min-h-11 rounded-lg border border-edge px-4 py-2">Close</button></div>}
      </form>
    </section>
  );
}

export default function AddAgentForm({ onCreated, onCancel }) {
  const [resource] = useState(() => createAgentResource(createAgent, onCreated));
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  const firstField = useRef(null);
  const errorSummary = useRef(null);
  useEffect(() => { firstField.current?.focus(); }, []);
  useEffect(() => {
    if (['invalid', 'error'].includes(state.status)) errorSummary.current?.focus();
  }, [state.status, state.fieldErrors]);
  return <AddAgentFormView state={state} onChange={resource.setField} onSubmit={resource.submit}
    onCancel={onCancel} firstFieldRef={firstField} errorRef={errorSummary} />;
}
