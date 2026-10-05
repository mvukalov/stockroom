import { Badge } from '../components/atoms/Badge/Badge';
import {
  colourTokens,
  contrastRatio,
  parseTokens,
  TEXT_MIN_CONTRAST,
  TEXT_PAIRS,
  UI_MIN_CONTRAST,
  UI_PAIRS,
} from '../styles/contrast';
import tokensCss from '../styles/tokens.css?raw';
import styles from './TokenTables.module.scss';

// Everything on the Tokens page is read from tokens.css, so it cannot drift from
// the values the app uses. Previews paint with var(--token), labels show the
// parsed value.
const tokens = parseTokens(tokensCss);
const colours = colourTokens(tokens);

function withPrefix(prefix: string): Array<[string, string]> {
  return [...tokens].filter(([name]) => name.startsWith(prefix));
}

function hexOf(name: string): string {
  return colours.get(name) ?? 'missing';
}

export function ColourSwatches() {
  return (
    <ul className={styles.swatches}>
      {[...colours].map(([name, hex]) => (
        <li key={name} className={styles.swatch}>
          <span
            className={styles.chip}
            style={{ backgroundColor: `var(${name})` }}
          />
          <code className={styles.name}>{name}</code>
          <code className={styles.value}>{hex}</code>
        </li>
      ))}
    </ul>
  );
}

type ContrastKind = 'text' | 'ui';

function ContrastRows({
  pairs,
  kind,
}: {
  pairs: Array<[string, string]>;
  kind: ContrastKind;
}) {
  const minimum = kind === 'text' ? TEXT_MIN_CONTRAST : UI_MIN_CONTRAST;

  return pairs.map(([foreground, background]) => {
    const ratio = contrastRatio(hexOf(foreground), hexOf(background));
    const passes = ratio >= minimum;
    return (
      <tr key={`${foreground} ${background}`}>
        <td>
          <code>{foreground}</code>
          <br />
          on <code>{background}</code>
        </td>
        <td>
          <span
            className={styles.sample}
            style={{ backgroundColor: `var(${background})` }}
          >
            {kind === 'text' ? (
              <span style={{ color: `var(${foreground})` }}>Aa 1,284</span>
            ) : (
              <span
                className={styles.uiSample}
                style={{ borderColor: `var(${foreground})` }}
              />
            )}
          </span>
        </td>
        <td className={styles.numeric}>{ratio.toFixed(2)}:1</td>
        <td className={styles.numeric}>{minimum}:1</td>
        <td>
          <Badge tone={passes ? 'success' : 'danger'}>
            {passes ? 'Pass' : 'Fail'}
          </Badge>
        </td>
      </tr>
    );
  });
}

export function ContrastPairs() {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption>
          Documented pairs, checked by tokens.test.ts. Text needs{' '}
          {TEXT_MIN_CONTRAST}:1, non-text UI (borders, focus ring){' '}
          {UI_MIN_CONTRAST}:1.
        </caption>
        <thead>
          <tr>
            <th scope="col">Pair</th>
            <th scope="col">Sample</th>
            <th scope="col" className={styles.numeric}>
              Ratio
            </th>
            <th scope="col" className={styles.numeric}>
              Minimum
            </th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          <ContrastRows pairs={TEXT_PAIRS} kind="text" />
          <ContrastRows pairs={UI_PAIRS} kind="ui" />
        </tbody>
      </table>
    </div>
  );
}

export function TypeScale() {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
            <th scope="col">Sample</th>
          </tr>
        </thead>
        <tbody>
          {withPrefix('--font-size-').map(([name, value]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>
                <code>{value}</code>
              </td>
              <td className={styles.typeSample} style={{ fontSize: `var(${name})` }}>Stock on hand 1,284</td>
            </tr>
          ))}
          {withPrefix('--font-weight-').map(([name, value]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>
                <code>{value}</code>
              </td>
              <td className={styles.typeSample} style={{ fontWeight: `var(${name})` }}>Stock on hand 1,284</td>
            </tr>
          ))}
          {withPrefix('--font-').filter(([name]) => !/size|weight/.test(name)).map(
            ([name, value]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>
                  <code>{value}</code>
                </td>
                <td className={styles.typeSample} style={{ fontFamily: `var(${name})` }}>SKU-00042 1,284</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SpacingScale() {
  return (
    <ul className={styles.list}>
      {withPrefix('--space-').map(([name, value]) => (
        <li key={name} className={styles.row}>
          <code className={styles.name}>{name}</code>
          <code className={styles.value}>{value}</code>
          <span className={styles.bar} style={{ width: `var(${name})` }} />
        </li>
      ))}
    </ul>
  );
}

export function Radii() {
  return (
    <ul className={styles.swatches}>
      {withPrefix('--radius-').map(([name, value]) => (
        <li key={name} className={styles.swatch}>
          <span
            className={styles.radiusBox}
            style={{ borderRadius: `var(${name})` }}
          />
          <code className={styles.name}>{name}</code>
          <code className={styles.value}>{value}</code>
        </li>
      ))}
    </ul>
  );
}
