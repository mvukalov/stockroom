# Design reference (Lovable prototype)

Visual reference only. The Lovable code is throwaway: Stockroom is built with SCSS Modules + design tokens (see `../design-direction.md`).

Captured from the Lovable preview on 3 Oct 2026, ADMIN role, ~1568x722 (app area only, no hover/focus rings).

## Naming
`NN-screen-state.png`. `03b-*` are the New movement drawer states.

| Prefix | Screen |
| --- | --- |
| 00 | Shell (collapsed sidebar) |
| 01 | Dashboard |
| 02 | Products |
| 03 / 03b | Movements / New movement drawer |
| 04 | Orders list |
| 05 | Order detail |
| 06 | Audit log |

## Not captured
VIEWER (read-only) pass, mobile viewport, Orders per-tab empty states. These are specified in `project-overview.md` and implemented from the spec.

## Known prototype limitations (do not copy as data rules)
- Every order detail page shows the same four lines; only ORD-2026-0205 matches its list row (4 lines, EUR 991.25).
- Some products on the order lines are not in the Products list (catalogue mismatch).
- ORD-2026-0195 (Picked) has an implausible total versus its lines.
- The "Row expanded" and Screen-state control are prototype-only.
- Authoritative rules (VAT 25%, derived totals, immutability, role permissions, state flow) live in `project-overview.md`, not in these screenshots.
