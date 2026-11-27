export {};

const form = document.querySelector('#request-form');

if (!(form instanceof HTMLFormElement)) {
  throw new Error('Commission request form was not found.');
}

const submitButton = form.querySelector('button[type="submit"]');
const statusMessage = form.querySelector('[role="status"]');
const referenceFiles = form.querySelector('#reference-files');
const fileHelp = form.querySelector('.file-help');
const description = form.querySelector('#commission-description');
const defaultFileHelp = 'Up to 5 images or PDFs, 5 MB per file.';
const uploadExtensions: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/avif': ['avif'],
  'image/bmp': ['bmp'],
  'image/gif': ['gif'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

if (description instanceof HTMLTextAreaElement) {
  description.addEventListener('input', () => {
    description.setCustomValidity(description.value.trim() ? '' : 'Enter a description of your commission.');
  });
}

if (referenceFiles instanceof HTMLInputElement && fileHelp instanceof HTMLElement) {
  referenceFiles.addEventListener('change', () => {
    const files = Array.from(referenceFiles.files ?? []);
    const count = files.length;
    const oversized = files.some((file) => file.size > 5 * 1024 * 1024);
    const unsupported = files.some((file) =>
      !uploadExtensions[file.type]?.includes(file.name.split('.').pop()?.toLowerCase() ?? ''));
    const error = count > 5 ? 'Attach no more than 5 files.'
      : oversized ? 'Each file must be 5 MB or smaller.'
      : unsupported ? 'Only supported image files and PDFs can be attached.' : '';
    referenceFiles.setCustomValidity(error);
    referenceFiles.setAttribute('aria-invalid', String(Boolean(error)));
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

  if (description instanceof HTMLTextAreaElement) {
    description.setCustomValidity(description.value.trim() ? '' : 'Enter a description of your commission.');
  }
  if (!form.reportValidity()) return;

  const payload = new FormData(form);
  const controls = Array.from(form.querySelectorAll('input, textarea, button')).filter(
    (control): control is HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement =>
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement ||
        control instanceof HTMLButtonElement) && !control.disabled,
  );
  controls.forEach((control) => { control.disabled = true; });
  submitButton.setAttribute('aria-busy', 'true');
  statusMessage.textContent = 'Sending your request...';

  try {
    const response = await fetch('/api/commissions', {
      method: 'POST',
      body: payload,
    });
    const result = await response.json().catch(() => {
      throw new Error('The server returned an invalid response. Please try again later.');
    });

    if (!response.ok || result === null || typeof result !== 'object') {
      throw new Error(typeof result?.message === 'string' ? result.message : 'Your request could not be sent.');
    }

    statusMessage.textContent = typeof result.message === 'string'
      ? result.message : 'Your commission request was sent successfully.';
    form.reset();
    if (description instanceof HTMLTextAreaElement) description.setCustomValidity('');
    if (referenceFiles instanceof HTMLInputElement) {
      referenceFiles.setCustomValidity('');
      referenceFiles.removeAttribute('aria-invalid');
    }
    if (fileHelp instanceof HTMLElement) {
      fileHelp.textContent = defaultFileHelp;
    }
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : 'Your request could not be sent. Please try again.';
  } finally {
    controls.forEach((control) => { control.disabled = false; });
    submitButton.removeAttribute('aria-busy');
  }
});
