import { describe, expect, it } from 'vitest';

import tokensCss from './tokens.css?raw';

/** WCAG 2.2 contrast ratio between two `#rrggbb` colours. */
function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((start) => {
      const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    const [r = 0, g = 0, b = 0] = channels;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

// Only the top-level :root block; the reduced-motion override has no colours.
const colours = new Map(
  [...tokensCss.matchAll(/(--color-[\w-]+):\s*(#[0-9a-f]{6});/gi)].map(
    ([, name, value]) => [name, value?.toLowerCase()],
  ),
);

function colour(name: string): string {
  const value = colours.get(name);
  if (value === undefined) throw new Error(`${name} is not defined in tokens.css`);
  return value;
}

// [foreground, background] pairs documented in design-direction.md and tokens.md.
const TEXT_PAIRS: Array<[string, string]> = [
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface-subtle'],
  ['--color-text-muted', '--color-surface'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface-subtle'],
  ['--color-text-subtle', '--color-surface'],
  ['--color-text-subtle', '--color-bg'],
  ['--color-text-subtle', '--color-surface-subtle'],
  ['--color-accent', '--color-surface'],
  ['--color-text-on-accent', '--color-accent'],
  ['--color-text-on-accent', '--color-accent-hover'],
  ['--color-text-on-accent', '--color-danger'],
  ['--color-text-on-accent', '--color-danger-hover'],
  ['--color-nav-active-text', '--color-nav-active-bg'],
  ['--color-success', '--color-success-bg'],
  ['--color-warning', '--color-warning-bg'],
  ['--color-danger', '--color-danger-bg'],
  ['--color-info', '--color-info-bg'],
  ['--color-neutral', '--color-neutral-bg'],
];

// Non-text UI (WCAG 1.4.11). The control border must hold against every
// background an input, select or checkbox sits on, including a hover or selected
// table row (#E5E7EB, the neutral background). The focus ring sits outside the
// element, on whatever background is around it.
const UI_PAIRS: Array<[string, string]> = [
  ['--color-border-control', '--color-surface'],
  ['--color-border-control', '--color-bg'],
  ['--color-border-control', '--color-surface-subtle'],
  ['--color-border-control', '--color-neutral-bg'],
  ['--color-danger', '--color-surface'],
  ['--color-accent', '--color-surface'],
  ['--color-focus', '--color-surface'],
  ['--color-focus', '--color-bg'],
  ['--color-focus', '--color-surface-subtle'],
  ['--color-focus', '--color-nav-active-bg'],
];

describe('contrastRatio', () => {
  it('matches the WCAG extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('does not depend on argument order', () => {
    expect(contrastRatio('#0f766e', '#ffffff')).toBe(
      contrastRatio('#ffffff', '#0f766e'),
    );
  });
});

describe('design tokens contrast', () => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (foreground, background) => {
    expect(
      contrastRatio(colour(foreground), colour(background)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s is at least 3:1', (foreground, background) => {
    expect(
      contrastRatio(colour(foreground), colour(background)),
    ).toBeGreaterThanOrEqual(3);
  });
});
