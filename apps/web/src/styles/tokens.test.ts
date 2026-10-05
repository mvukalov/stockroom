import { describe, expect, it } from 'vitest';

import {
  colourTokens,
  contrastRatio,
  parseTokens,
  TEXT_MIN_CONTRAST,
  TEXT_PAIRS,
  UI_MIN_CONTRAST,
  UI_PAIRS,
} from './contrast';
import tokensCss from './tokens.css?raw';

const colours = colourTokens(parseTokens(tokensCss));

function colour(name: string): string {
  const value = colours.get(name);
  if (value === undefined)
    throw new Error(`${name} is not defined in tokens.css`);
  return value;
}

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

describe('parseTokens', () => {
  it('reads only the first :root block and drops comments', () => {
    const tokens = parseTokens(`
      :root {
        --space-1: 0.25rem; /* 4 */
        --font-sans:
          'Inter', sans-serif;
      }
      @media (prefers-reduced-motion: reduce) {
        :root { --space-1: 0; }
      }
    `);
    expect([...tokens]).toEqual([
      ['--space-1', '0.25rem'],
      ['--font-sans', "'Inter', sans-serif"],
    ]);
  });
});

describe('colourTokens', () => {
  it('throws on a colour token that is not #rrggbb', () => {
    const tokens = parseTokens(`
      :root {
        --color-text: #111827;
        --color-overlay: rgb(17 24 39 / 0.5);
      }
    `);
    expect(() => colourTokens(tokens)).toThrow(
      '--color-overlay must be a #rrggbb colour, got "rgb(17 24 39 / 0.5)"',
    );
  });
});

describe('design tokens contrast', () => {
  it.each(TEXT_PAIRS)(
    `%s on %s is at least ${TEXT_MIN_CONTRAST}:1`,
    (foreground, background) => {
      expect(
        contrastRatio(colour(foreground), colour(background)),
      ).toBeGreaterThanOrEqual(TEXT_MIN_CONTRAST);
    },
  );

  it.each(UI_PAIRS)(
    `%s on %s is at least ${UI_MIN_CONTRAST}:1`,
    (foreground, background) => {
      expect(
        contrastRatio(colour(foreground), colour(background)),
      ).toBeGreaterThanOrEqual(UI_MIN_CONTRAST);
    },
  );
});
