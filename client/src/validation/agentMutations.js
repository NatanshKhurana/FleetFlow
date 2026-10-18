import { agentSubmissionError, validateAgentForm } from './createAgent.js';

export const editableAgentFields = ['fullName', 'phone', 'email', 'serviceArea', 'status'];

export function validateAgentChanges(values, original) {
  const { data, errors } = validateAgentForm({ ...values, agentId: original.agentId });
  const baseline = validateAgentForm(original).data;
  // Send a genuine partial update; never submit identifiers, timestamps, or unchanged fields.
  const changes = Object.fromEntries(editableAgentFields.filter((field) => data[field] !== baseline[field])
    .map((field) => [field, data[field]]));
  return { changes, errors };
}

export function agentMutationError(error, action) {
  const status = error?.response?.status;
  const fieldErrors = {};
  if (status === 404) return { fieldErrors, missing: true, message: 'This agent no longer exists. Return to Agents to refresh your list.' };
  if (status === 400 && action === 'update') {
    const details = agentSubmissionError(error).fieldErrors;
    for (const field of editableAgentFields) if (details[field]) fieldErrors[field] = details[field];
    return { fieldErrors, message: 'The server could not validate these changes. Review your entries.' };
  }
  if (status === 400) return { fieldErrors, message: 'This agent link is invalid. Return to Agents and reload the list.' };
  if (status === 409) return { fieldErrors, message: 'These changes conflict with an existing record. Review your entries.' };
  if (status === 413) return { fieldErrors, message: 'This form is too large. Shorten your entries and try again.' };
  return { fieldErrors, message: action === 'update'
    ? 'We could not confirm the update. Your entries are kept. Check agent details before trying again.'
    : 'We could not confirm deletion. Check the agents list before trying again.' };
}
