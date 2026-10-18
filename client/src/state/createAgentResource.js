import { agentFieldLabels, emptyAgentForm, validateAgentForm, agentSubmissionError } from '../validation/createAgent.js';

export function createAgentResource(createAgent, onCreated = () => {}) {
  let snapshot = { status: 'idle', values: emptyAgentForm(), fieldErrors: {}, message: '' };
  const listeners = new Set();

  function publish(changes) {
    snapshot = { ...snapshot, ...changes };
    for (const listener of listeners) listener();
  }

  function setField(field, value) {
    if (!Object.hasOwn(agentFieldLabels, field) || ['submitting', 'success'].includes(snapshot.status)) return;
    publish({ values: { ...snapshot.values, [field]: value } });
  }

  async function submit() {
    // Guard in code as well as disabling controls: repeated submits must issue only one POST.
    if (['submitting', 'success'].includes(snapshot.status)) return;
    const { data, errors } = validateAgentForm(snapshot.values);
    if (Object.keys(errors).length) {
      publish({ status: 'invalid', fieldErrors: errors, message: 'Please correct the highlighted fields.' });
      return;
    }
    publish({ status: 'submitting', fieldErrors: {}, message: '' });
    let agent;
    try {
      agent = await createAgent(data);
    } catch (error) {
      publish({ status: 'error', ...agentSubmissionError(error) });
      return;
    }
    publish({ status: 'success', message: 'Agent created successfully.' });
    // A list-refresh failure must never turn a confirmed save into a retryable creation.
    try {
      await onCreated(agent);
    } catch {
      publish({ message: 'Agent created successfully, but the list could not refresh. Reload the agents list.' });
    }
  }

  return { getSnapshot: () => snapshot, setField, submit,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
}
