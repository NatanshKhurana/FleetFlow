export const agentFieldLabels = {
  agentId: 'Agent ID', fullName: 'Full name', phone: 'Phone',
  email: 'Email', serviceArea: 'Service area', status: 'Status',
};

export function emptyAgentForm() {
  return { agentId: '', fullName: '', phone: '', email: '', serviceArea: '', status: 'active' };
}

// Match the installed backend Zod email rule; HTML email inputs alone are less strict.
const emailPattern = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export function validateAgentForm(values) {
  const data = {};
  const errors = {};
  for (const [field, label] of Object.entries(agentFieldLabels)) {
    data[field] = typeof values[field] === 'string' ? values[field].trim() : '';
    if (!data[field]) errors[field] = `${label} is required.`;
  }
  data.email = data.email.toLowerCase();
  if (data.email && !emailPattern.test(data.email)) errors.email = 'Enter a valid email address.';
  if (!['active', 'inactive'].includes(data.status)) errors.status = 'Select Active or Inactive.';
  return { data, errors };
}

export function agentSubmissionError(error) {
  const status = error?.response?.status;
  const fieldErrors = {};
  if (status === 409) {
    return { fieldErrors: { agentId: 'This agent ID already exists. Use a unique ID.' },
      message: 'The agent could not be added. Check the agent ID.' };
  }
  if (status === 400) {
    const details = error.response.data?.details;
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (detail?.section === 'body' && Object.hasOwn(agentFieldLabels, detail.field)) {
          fieldErrors[detail.field] = `Check ${agentFieldLabels[detail.field].toLowerCase()}. The server rejected this value.`;
        }
      }
    }
    return { fieldErrors, message: 'The server could not validate this form. Review your entries and try again.' };
  }
  if (status === 413) return { fieldErrors, message: 'This form is too large to submit. Shorten your entries and try again.' };
  // A lost response does not prove the write failed; never automatically repeat a POST.
  return { fieldErrors, message: 'We could not confirm the save. Your entries are kept. Check the agents list before trying again.' };
}
