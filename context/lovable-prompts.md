# Stockroom: Lovable Prompts

> How to use: create **one** Lovable project. Paste the **Base prompt** first and let it build the shell. Then paste **one screen prompt at a time** in the same project, so the layout and components stay consistent. Take screenshots after each. Lovable code is a **throwaway visual reference**: do not copy it into the repo.
>
> Screenshots go to `context/design/` named like `01-dashboard-default.png`, `01-dashboard-empty.png`, etc.
>
> Tip: if Lovable adds auth, a backend or Supabase, tell it to remove them. Everything must be static with hard-coded mock data.

---

## 0. Base prompt (paste first)

```
Build a static UI prototype for "Stockroom", an inventory and orders management web app for a small warehouse. English UI only. This is a visual prototype: use hard-coded mock data, no backend, no authentication, no database.

Users and roles: ADMIN, CLERK, VIEWER. Add a role switcher in the top bar (a dropdown showing the current user's name and role) so I can switch between the three roles. VIEWER is read-only: action buttons stay visible but disabled, with a tooltip explaining why ("Your role is read-only"). CLERK can create stock movements and edit orders; ADMIN can do everything.

Core concept: stock levels are not edited directly. They are derived from an append-only log of stock movements of type RECEIPT, ISSUE, TRANSFER, ADJUSTMENT. Orders have lines and a status flow DRAFT -> CONFIRMED -> PICKED -> SHIPPED, plus CANCELLED.

Layout: left sidebar (240px, collapsible to icons) with navigation: Dashboard, Products, Movements, Orders, Audit log. Top bar with page title, a search field placeholder and the role switcher. Content area is fluid.

Visual style: calm, dense, neutral, work-focused ERP tool. Light theme. Background #F7F8FA, surfaces white, borders #D9DEE5, text #111827, muted text #4B5563. Single accent colour teal #0F766E for primary buttons, links and the active nav item. Use semantic badge colours: success text #166534 on #DCFCE7, warning #92400E on #FEF3C7, danger #991B1B on #FEE2E2, info #1E40AF on #DBEAFE, neutral #374151 on #E5E7EB. Focus ring 2px #2563EB with offset. Font: Inter; use a monospace font for SKUs and IDs; tabular numbers for quantities and prices, right-aligned in tables. Base font size 14px, table cells 13px, page title 20px, KPI numbers 28px. Table row height 40px, radius 6px for controls and 8px for cards, borders instead of shadows (one soft shadow only for drawers, modals and toasts). Never use colour alone to convey status: every badge has a text label and a small icon.

Mock data should look realistic: products with SKUs like "BEA-ESS-001", titles of everyday consumer goods (cosmetics, groceries, furniture, kitchen), categories, brands, prices in EUR, and warehouse locations like "A-01-03" (aisle-rack-shelf). Names of staff: Ana Horvat (ADMIN), Marko Kovač (CLERK), Iva Babić (VIEWER).

Also add a small "Screen state" dropdown in the bottom-left corner of the app (prototype-only control) with options: Default, Loading, Empty, Error. It switches the current page between those states so I can take screenshots. Loading shows skeleton rows, Empty shows an empty state with a helpful next action, Error shows an inline error banner with a Retry button.

First, build only the app shell (sidebar, top bar, role switcher, screen-state control) and an empty Dashboard placeholder. I will ask for each screen separately.
```

---

## 1. Dashboard

```
Build the Dashboard screen.

- Row of 4 KPI cards: "Products in stock" (number), "Low-stock items" (number, warning style), "Open orders" (number), "Movements this week" (number). Each card has a small label, a large number (28px, 600 weight) and a muted caption like "+12 vs last week" with text, not only colour.
- Below, a card titled "Low-stock items" with a compact table: Product (title + monospace SKU), Location, On hand, Minimum, Status badge (Low / Out), and a ghost button "Create receipt" on each row (disabled with tooltip for VIEWER).
- Footer of that card: link "View all products".
- Do NOT add a chart.
Show Default, Loading (skeleton cards and rows), Empty ("Nothing is running low" with a positive message), and Error states through the Screen state control.
```

## 2. Products

```
Build the Products screen as a dense data table.

- Title "Products" with muted count "194 products". Primary button "New product" on the right (ADMIN only; disabled for others with tooltip).
- Toolbar: search input, filter chips for Category, Brand, Stock status (In stock / Low / Out), a "Columns" menu to show/hide columns, and a "Clear filters" link.
- Table columns: checkbox, SKU (monospace), Title (with small thumbnail), Category, Brand, Price (right-aligned, EUR), On hand (right-aligned, tabular), Status badge (In stock / Low / Out), row actions (kebab menu).
- Sortable column headers with clear sort direction icons (ascending/descending).
- Footer: "Showing 1-50 of 194 products", page size select (25/50/100), previous/next pagination.
- Active filters are shown as removable chips above the table.
Show Default, Loading, Empty (no results for current filters, with "Clear filters"), Error, and a variant with 3 rows selected showing a bulk action bar.
```

## 3. Movements (history)

```
Build the Movements screen: the append-only history of stock movements. It will contain tens of thousands of rows, so design it as a long virtualized-style list with a fixed header.

- Title "Stock movements" with muted count "48,213 movements". Primary button "New movement" (disabled with tooltip for VIEWER).
- Toolbar: date range, Type filter chips (Receipt, Issue, Transfer, Adjustment), Product search, Location filter, Created by.
- Columns: Date/time, Type badge, Product (title + monospace SKU), Location, Quantity (signed: +24 in success text colour with a plus sign, -6 in danger text colour with a minus sign; always sign included), Reason, Created by, ID (short monospace, truncated with copy button).
- Sticky header, no pagination; show a muted line at the bottom "Showing 1-60 of 48,213, scroll to load more".
- Movements are immutable: no edit or delete actions. Show a small info note: "Movements cannot be edited. To correct a mistake, add an ADJUSTMENT."
Show Default, Loading, Empty, Error.
```

## 3b. New movement drawer and interaction states

```
Build the "New movement" form as a right-side drawer opened from the Movements screen.

Fields: Type (segmented control: Receipt, Issue, Transfer, Adjustment), Product (searchable combobox showing title and SKU), Location (select), Destination location (only visible when Type is Transfer), Quantity (numeric input with stepper), Reason (textarea, required for Adjustment). Footer: Cancel and "Save movement".

Create separate visual states I can screenshot:
1. Default empty form
2. Validation errors (inline messages under fields, an error summary at the top, invalid fields have a clear border plus an icon)
3. Issue with quantity greater than available stock (inline warning "Only 14 on hand")
4. Submitting: drawer closes, and the new row appears at the top of the history in a "pending" style (muted text, small spinner)
5. Success: row settles, and a toast appears at the bottom with the text "Movement saved" and an "Undo" button
6. Failure: the pending row turns into an error row with the message "Could not save. Retry" and a Retry button; a toast says "Movement failed and was rolled back"
Add a prototype-only control to switch between these six states.
```

## 4. Orders list

```
Build the Orders screen.

- Title "Orders" with count. Primary button "New order" (ADMIN and CLERK; disabled for VIEWER).
- Tabs with counts for status: All, Draft, Confirmed, Picked, Shipped, Cancelled.
- Toolbar: search by order number or customer, date range.
- Columns: Order no. (monospace, e.g. ORD-2026-0142), Customer, Created, Lines (count), Total (EUR, right-aligned), Status badge (with icon and text), row action "Open".
- Pagination footer like on Products.
Show Default, Loading, Empty (per-tab empty message), Error.
```

## 5. Order detail

```
Build the Order detail screen for ORD-2026-0142.

- Header: order number, status badge, customer, created date. On the right, the primary action depends on status (Draft: "Confirm order"; Confirmed: "Mark as picked"; Picked: "Mark as shipped") and a secondary destructive "Cancel order". Disabled with tooltip for VIEWER.
- A horizontal status stepper: Draft -> Confirmed -> Picked -> Shipped, with the current step highlighted, completed steps checked, and Cancelled shown as a separate state. Do not rely on colour alone.
- Main column: "Order lines" table (Product + SKU, Location, Qty ordered, Qty available, Unit price, Line total) with an inline warning on lines where available stock is lower than ordered. In Draft status, lines are editable (quantity input, remove button, "Add line" button). In later statuses, lines are read-only.
- Right column: summary card (subtotal, tax, total), shipping address, and an "Activity" timeline listing status changes with user and time.
- Show a confirmation modal for "Cancel order" and for status transitions that cannot be undone.
Show variants for each status (Draft, Confirmed, Picked, Shipped, Cancelled) via the Screen state control, plus Loading and Error.
```

## 6. Audit log

```
Build the Audit log screen. It is a read-only table of everything that changed in the system (stock movements created, order status changes, user role changes).

- Title "Audit log". Toolbar: date range, Actor, Action type chips (Movement created, Order status changed, Order edited), search by entity ID.
- Columns: Timestamp, Actor (name + role badge), Action, Entity (type + monospace ID, linked), Summary ("Order ORD-2025-0142: CONFIRMED -> PICKED"), Details (expand row to show before/after values in a small key-value list).
- Same table styling, footer and pagination as the Products screen.
- No edit or delete actions anywhere.
Show Default, Loading, Empty, Error, and one row expanded.
```

## 7. VIEWER pass

```
Do not add new screens. Review all existing screens with the role switcher set to VIEWER and make sure of the following:
- Every action button (New product, New movement, New order, Create receipt, status transitions, row actions that mutate data) is visible but disabled, with a tooltip "Your role is read-only".
- Read-only information, filters, sorting and navigation still work.
- A small persistent badge in the top bar shows "Read-only access".
Then show me the Products, Movements and Order detail screens in VIEWER mode.
```

## 8. Optional: narrow viewport check

```
Show the Products screen and Order detail screen at a 390px wide mobile viewport. The sidebar becomes a hamburger menu. Tables scroll horizontally inside their container with a sticky first column. Filters collapse into a "Filters" button that opens a bottom sheet.
```

---

## Screenshot checklist

| #   | Screen            | Screenshots                                    |
| --- | ----------------- | ---------------------------------------------- |
| 01  | Dashboard         | default, loading, empty, error                 |
| 02  | Products          | default, loading, empty, error, bulk selection |
| 03  | Movements         | default, loading, empty, error                 |
| 03b | New movement      | six interaction states                         |
| 04  | Orders            | default, loading, empty, error                 |
| 05  | Order detail      | one per status, loading, error                 |
| 06  | Audit log         | default, loading, empty, error, expanded row   |
| 07  | VIEWER            | Products, Movements, Order detail              |
| 08  | Mobile (optional) | Products, Order detail                         |

When the screenshots are ready, bring them back here: the next step is extracting real design tokens from them and reconciling them with `design-direction.md`.
