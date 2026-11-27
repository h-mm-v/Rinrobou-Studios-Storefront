export {};

const form = document.querySelector('#request-form');

if (!(form instanceof HTMLFormElement)) {
  throw new Error('Commission request form was not found.');
}

const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = form.querySelector('[role="status"]');
const referenceFiles = form.querySelector('#reference-files');
const fileHelp = form.querySelector('.file-help');
const defaultFileHelp = 'Up to 5 images or PDFs, 5 MB per file.';

if (referenceFiles instanceof HTMLInputElement && fileHelp instanceof HTMLElement) {
  referenceFiles.addEventListener('change', () => {
    const count = referenceFiles.files?.length ?? 0;
    const oversized = Array.from(referenceFiles.files ?? []).some((file) => file.size > 5 * 1024 * 1024);
    referenceFiles.setCustomValidity(count > 5 ? 'Attach no more than 5 files.' : oversized ? 'Each file must be 5 MB or smaller.' : '');
    fileHelp.textContent =
      referenceFiles.validationMessage || (count === 0
        ? defaultFileHelp
        : `${count} file${count === 1 ? '' : 's'} selected (maximum 5).`);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton instanceof HTMLButtonElement && submitButton.disabled) return;

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
    const result = await response.json().catch(() => {
      throw new Error('The server returned an invalid response. Please try again later.');
    });

    if (!response.ok) {
      throw new Error(result.message ?? 'Your request could not be sent.');
    }

    statusMessage.textContent = result.message ?? 'Your commission request was sent successfully.';
    form.reset();
    if (referenceFiles instanceof HTMLInputElement) referenceFiles.setCustomValidity('');
    if (fileHelp instanceof HTMLElement) {
      fileHelp.textContent = defaultFileHelp;
    }
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : 'Your request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
  }
});
