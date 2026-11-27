const form = document.querySelector('#request-form');

if (!(form instanceof HTMLFormElement)) {
  throw new Error('Commission request form was not found.');
}

const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = form.querySelector('[role="status"]');
const referenceFiles = form.querySelector('#reference-files');
const fileHelp = form.querySelector('.file-help');

if (referenceFiles instanceof HTMLInputElement && fileHelp instanceof HTMLElement) {
  referenceFiles.addEventListener('change', () => {
    const count = referenceFiles.files?.length ?? 0;
    fileHelp.textContent =
      count === 0
        ? 'Images and PDF files are welcome.'
        : `${count} file${count === 1 ? '' : 's'} selected (maximum 5).`;
  });
}

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
    if (fileHelp instanceof HTMLElement) {
      fileHelp.textContent = 'Images and PDF files are welcome.';
    }
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : 'Your request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
  }
});
