# Stockroom: Design Direction

> Visual direction for the Lovable prototypes and, later, for `packages`/`apps/web` design tokens. Lovable output is a **visual reference only** (it generates Tailwind/shadcn; Stockroom uses SCSS Modules + tokens). Contrast values below were computed, not guessed.

## 1. Character

A calm, dense, work-focused tool for people who stare at tables all day. Neutral ERP feel, not a marketing site.

- **Density over decoration.** Compact rows, small but readable type, little chrome.
- **Neutral surfaces, one accent.** Colour is used for meaning (status, stock level, errors), not for ornament.
- **Numbers are first-class.** SKUs, quantities and prices use tabular figures and are right-aligned where numeric.
- **Never colour alone.** Every status has text and, where useful, an icon.
- Light theme first. Dark theme is a "later" item, but tokens are named semantically so it can be added.

## 2. Layout

- Desktop-first, fluid content. Must stay usable at 375 px (tables scroll horizontally inside their container; filters collapse into a panel).
- **Left sidebar**, 240 px, collapsible to icons: Dashboard, Products, Movements, Orders, Audit log.
- **Top bar:** page title, global search placeholder, and a **role switcher** (demo only, phase 1) showing the current user and role (`ADMIN`, `CLERK`, `VIEWER`). It exists so the permission-based UI can be demonstrated without auth.
- Page structure: title row with primary action on the right, filter/toolbar row, table, pagination footer.
- Detail views use a two-column layout (main content + summary card).
- Forms open in a right-side drawer or a modal; a drawer is preferred for "new movement".

## 3. Colour tokens (light)

Contrast is WCAG 2.2 AA: text at least 4.5:1, UI components and focus indicators at least 3:1.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F7F8FA` | App background |
| `--color-surface` | `#FFFFFF` | Cards, tables, drawers |
| `--color-surface-subtle` | `#F1F3F6` | Table header, hover, zebra |
| `--color-border` | `#D9DEE5` | Dividers, card borders (decorative) |
| `--color-border-control` | `#7A8494` | Inputs, selects, checkboxes (3.78:1 on white, 3.56:1 on bg, 3.40:1 on subtle surface, 3.05:1 on `#E5E7EB` hover/selected row) |
| `--color-text` | `#111827` | Body (17.7:1 on white) |
| `--color-text-muted` | `#4B5563` | Secondary (7.6:1) |
| `--color-text-subtle` | `#646D7A` | Hints, captions (5.2:1 on white, 4.7:1 on subtle surface) |
| `--color-accent` | `#0F766E` | Primary buttons, links, active nav (5.5:1 with white text) |
| `--color-accent-hover` | `#115E59` | Hover/pressed (7.6:1 with white text) |
| `--color-focus` | `#2563EB` | Focus ring, 2 px with 2 px offset (5.2:1 on white) |

### Semantic pairs (text on tinted background)

| Meaning | Text | Background | Ratio |
|---|---|---|---|
| Success | `#166534` | `#DCFCE7` | 6.5 |
| Warning | `#92400E` | `#FEF3C7` | 6.4 |
| Danger | `#991B1B` | `#FEE2E2` | 6.8 |
| Info | `#1E40AF` | `#DBEAFE` | 7.2 |
| Neutral | `#374151` | `#E5E7EB` | 8.3 |

### Domain badges

| Domain value | Badge | Icon idea |
|---|---|---|
| Movement `RECEIPT` | Success | arrow into box |
| Movement `ISSUE` | Danger | arrow out of box |
| Movement `TRANSFER` | Info | left-right arrows |
| Movement `ADJUSTMENT` | Warning | pencil / plus-minus |
| Order `DRAFT` | Neutral | dashed circle |
| Order `CONFIRMED` | Info | check circle |
| Order `PICKED` | Warning | box |
| Order `SHIPPED` | Success | truck |
| Order `CANCELLED` | Neutral, struck-through label | x circle |
| Stock level: OK / Low / Out | Success / Warning / Danger | check circle / triangle alert / x circle; text always shown ("In stock", "Low", "Out") |

## 4. Typography

- **UI font:** Inter (system sans fallback).
- **Mono / figures:** JetBrains Mono for SKUs and IDs; `font-variant-numeric: tabular-nums` for all quantities and prices.
- Scale: 12 (captions, badges), 13 (table cells), 14 (body, controls), 16 (section titles), 20 (page title), 28 (KPI numbers).
- Weights: 400 body, 500 labels and table headers, 600 titles and KPI numbers.
- Line height 1.4 for body, 1.2 for headings and KPI numbers.

## 5. Spacing, shape, elevation

- 4 px base scale: 4, 8, 12, 16, 24, 32, 48.
- Table row height: 40 px default, without a product thumbnail; 32 px compact (density toggle is a nice-to-have, not required).
- Table cells: 13 px (`--font-size-table-cell`), so a later change touches the token, not components.
- Controls: 36 px high (buttons, inputs, selects); icon buttons and row actions 32 px.
- Radius: 6 px controls, 6 px badges, 8 px cards.
- Badges: rounded rectangle (6 px radius), 12 px text, weight 600, 24 px high.
- Elevation: borders instead of shadows. One soft shadow only for drawers, modals and toasts.

## 6. Components to show in the prototypes

Buttons (primary, secondary, ghost, destructive, disabled), text input, select, combobox (product picker), numeric input, checkbox, tabs, badge, toast (with Undo action), drawer, modal, tooltip, pagination, table toolbar (search, filter chips, column menu), skeleton row, empty state, error banner with retry, KPI card.

## 7. States every data screen must show

Default, loading (skeleton rows), empty (with a helpful next action), error (with retry), and, for actions, **permission denied for VIEWER**: controls stay visible but disabled with an accessible explanation (tooltip plus `aria-disabled` description), not silently hidden.

## 8. Motion

Minimal: 120-160 ms fades and slides for drawers, toasts and row insertion. Respect `prefers-reduced-motion`. Optimistic rows appear with a subtle "pending" style (muted text, small spinner) and settle or turn into an inline error on rollback.

## 9. Accessibility requirements that affect the visuals

- Visible focus ring on every interactive element, never removed.
- Hit targets at least 24x24 px (WCAG 2.2), 32 px preferred for table row actions.
- Sort direction and selected state are shown by icon and `aria-sort`/`aria-selected`, not by colour.
- Result counts and mutation outcomes are announced with `aria-live` (visible as text too: "Showing 1-50 of 12,430 movements").
