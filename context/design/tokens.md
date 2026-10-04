# Stockroom: Design Tokens (reconciled)

> Source: CSS variables and computed styles read from the Lovable preview on 3 Oct 2026, compared with `../design-direction.md`. `design-direction.md` stays the canonical definition. This file records what the prototype actually used, where it differs, and what we adopt in `apps/web`.

## 1. Result in one line

The prototype matches `design-direction.md` for every colour except rounding noise (oklch to hex, one step off at most). Differences that matter are listed in section 3.

## 2. Colour tokens

| Token (ours) | Canonical | Prototype | Verdict |
|---|---|---|---|
| `--color-bg` | `#F7F8FA` | `#F7F8FA` | same |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | same |
| `--color-surface-subtle` | `#F1F3F6` | `#EEF0F4` (`--muted`/`--secondary`) | keep `#F1F3F6` |
| `--color-border` | `#D9DEE5` | `#D9DFE7` | same |
| `--color-border-control` | `#8A94A3` | **not used** (inputs use `#D9DFE7`) | adopt ours, see 3.1 |
| `--color-text` | `#111827` | `#111827` | same |
| `--color-text-muted` | `#4B5563` | `#4B5563` | same |
| `--color-text-subtle` | `#646D7A` | not defined | keep |
| `--color-accent` | `#0F766E` | `#10766E` | same |
| `--color-accent-hover` | `#115E59` | not defined | keep |
| `--color-focus` | `#2563EB` | `#2663EB` | same |
| `--color-nav-active-bg` | not defined | `#DBF7F3` | add |
| `--color-nav-active-text` | not defined | `#005B54` (7.1:1 on `#DBF7F3`) | add |

### Semantic pairs

| Meaning | Canonical text / bg | Prototype text / bg | Verdict |
|---|---|---|---|
| Success | `#166534` / `#DCFCE7` | `#176534` / `#DBFCE7` | keep canonical |
| Warning | `#92400E` / `#FEF3C7` | `#973C00` / `#FFF3C6` | keep canonical (same contrast, 6.4:1) |
| Danger | `#991B1B` / `#FEE2E2` | `#9F0711` / `#FFE2E2` | keep canonical |
| Info | `#1E40AF` / `#DBEAFE` | `#1F40AF` / `#DBEAFE` | same |
| Neutral | `#374151` / `#E5E7EB` | `#364153` / `#E5E7EB` | keep canonical |

The prototype's `--destructive` (`#9F0711`) is its danger text colour; we use `--color-danger`.

## 3. Differences that need a decision

1. **Control border.** The prototype draws inputs, selects and the search field with the decorative border `#D9DFE7` (1.34:1 on white). That fails WCAG 1.4.11 (3:1). Stockroom uses `--color-border-control` (`#8A94A3`, 3.07:1) for inputs, selects, checkboxes and the combobox. Tables and cards keep the light border.
2. **Table type size.** The prototype renders table cells at 14 px. `design-direction.md` says 13 px for dense tables. Keep 13 px in `DataTable`; check readability once with real data and change the token, not the component.
3. **Row height.** Products rows are about 52 px in the prototype because of the 28 px thumbnail. Spec says 40 px. Keep 40 px as the default and drop the thumbnail from the default density (or reduce it to 24 px).
4. **Badge shape.** The prototype uses a 6 px radius (a rounded rectangle), 12 px, weight 600, 24 px tall. `design-direction.md` says pill (999 px). Pick one and keep it consistent; recommendation: follow the prototype (6 px) because it reads calmer in dense tables, then update `design-direction.md`.
5. **Primary button height.** 36 px in the prototype. Keep 36 px; hit target still exceeds the 24 px minimum.
6. **Order cancelled badge.** Neutral with struck-through label, as in the spec. Confirmed to work visually.

## 4. Typography (as built)

- UI: Inter, 14 px base. Mono: JetBrains Mono for SKUs, IDs and location codes.
- Numeric columns: `font-variant-numeric: tabular-nums`, right-aligned.
- Table header: weight 500, muted text colour, no uppercase.
- Radius: 6 px for controls and badges, 8 px (`--radius`: 0.5rem) for cards.

## 5. Not covered by the prototype

Dark theme, density toggle (32 px compact rows), reduced-motion behaviour, and focus-visible styles on every control (check in Storybook with the a11y addon, not from the prototype).
