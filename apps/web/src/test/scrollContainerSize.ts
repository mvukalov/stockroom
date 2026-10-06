import { act } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * jsdom has no layout, so every element is 0 × 0 and a virtualized list renders no
 * rows. This gives elements marked `data-scroll-container` (the `VirtualTable`
 * scroll box) a size, and leaves every other element at 0. Like a browser (and
 * unlike jsdom), setting `scrollTop` on such an element then fires `scroll`, so the
 * virtualizer learns about a scroll made by the app. Returns the restore function;
 * `vi.restoreAllMocks()` restores it too.
 */
export function stubScrollContainerSize({
  width = 1200,
  height = 400,
}: { width?: number; height?: number } = {}): () => void {
  const sized = (element: HTMLElement, size: number) =>
    element.hasAttribute('data-scroll-container') ? size : 0;
  const heightSpy = vi
    .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return sized(this, height);
    });
  const widthSpy = vi
    .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return sized(this, width);
    });
  const scrollTop = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'scrollTop',
  );
  const scrollSpy = vi
    .spyOn(Element.prototype, 'scrollTop', 'set')
    .mockImplementation(function (this: Element, value: number) {
      scrollTop?.set?.call(this, value);
      if (this.hasAttribute('data-scroll-container')) {
        // Asynchronous, as in a browser: never inside the render that scrolled.
        queueMicrotask(() => this.dispatchEvent(new Event('scroll')));
      }
    });
  return () => {
    heightSpy.mockRestore();
    widthSpy.mockRestore();
    scrollSpy.mockRestore();
  };
}

/** Scrolls a `VirtualTable` scroll box to `top` and tells the virtualizer at once. */
export function scrollTo(container: HTMLElement, top: number): void {
  container.scrollTop = top;
  act(() => {
    container.dispatchEvent(new Event('scroll'));
  });
}
