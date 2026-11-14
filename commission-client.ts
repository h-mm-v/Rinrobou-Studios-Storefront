const form = document.querySelector('#request-form');

if (!(form instanceof HTMLFormElement)) {
  throw new Error('Commission request form was not found.');
}

const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = form.querySelector('[role="status"]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!(submitButton instanceof HTMLButtonElement) || !(statusMessage instanceof HTMLElement)) {
    throw new Error('Commission form status controls were not found.');
  }

  submitButton.disabled = true;
  statusMessage.textContent = 'Sending your request...';

  try {
    const response = await fetch('/api/commissions', {
      method: 'POST',
      body: new FormData(form),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message ?? 'Your request could not be sent.');
    }

    statusMessage.textContent = result.message ?? 'Your commission request was sent successfully.';
    form.reset();
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : 'Your request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
  }
});
