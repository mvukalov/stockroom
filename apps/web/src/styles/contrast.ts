/**
 * Token parsing and WCAG contrast, shared by tokens.test.ts (which enforces the
 * documented pairs) and the Storybook Tokens page (which shows them).
 */

/** WCAG 2.2 contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(foreground: string, background: string): number {
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

/**
 * Custom properties of the first `:root` block, in source order. Later blocks
 * (the reduced-motion override) are skipped so each token keeps its base value.
 */
export function parseTokens(css: string): Map<string, string> {
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const withoutComments = root.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Map(
    [...withoutComments.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
      ([, name = '', value = '']) => [name, value.trim().replace(/\s+/g, ' ')],
    ),
  );
}

/**
 * Colour tokens (`--color-*`), lower-cased. Contrast is computed from `#rrggbb`
 * only, so any other format throws instead of dropping the token unchecked.
 */
export function colourTokens(tokens: Map<string, string>): Map<string, string> {
  const colours = new Map<string, string>();
  for (const [name, value] of tokens) {
    if (!name.startsWith('--color-')) continue;
    if (!/^#[0-9a-f]{6}$/i.test(value)) {
      throw new Error(`${name} must be a #rrggbb colour, got "${value}"`);
    }
    colours.set(name, value.toLowerCase());
  }
  return colours;
}

// [foreground, background] pairs documented in design-direction.md and tokens.md.
export const TEXT_PAIRS: Array<[string, string]> = [
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
export const UI_PAIRS: Array<[string, string]> = [
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

/** WCAG minimums: 4.5:1 for normal text, 3:1 for non-text UI. */
export const TEXT_MIN_CONTRAST = 4.5;
export const UI_MIN_CONTRAST = 3;
