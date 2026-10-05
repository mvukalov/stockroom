import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') window.localStorage.clear();
});

// jsdom has no modal dialog. This shim mirrors the browser behaviour the app relies on:
// showModal() moves focus into the dialog, Escape fires `cancel` and closes it, and
// close() returns focus to the element that was focused before and fires `close`.
// It does not make the page inert; focus trapping is left to real browsers.
if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  const previousFocus = new WeakMap<HTMLDialogElement, Element | null>();
  const escapeListeners = new WeakMap<
    HTMLDialogElement,
    (event: KeyboardEvent) => void
  >();

  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    if (this.open) return;
    previousFocus.set(this, document.activeElement);
    this.setAttribute('open', '');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (this.dispatchEvent(new Event('cancel', { cancelable: true }))) {
        this.close();
      }
    };
    escapeListeners.set(this, onKeyDown);
    document.addEventListener('keydown', onKeyDown);
    this.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )?.focus();
  };

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    const onKeyDown = escapeListeners.get(this);
    if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
    const previous = previousFocus.get(this);
    if (previous instanceof HTMLElement) previous.focus();
    this.dispatchEvent(new Event('close'));
  };
}
