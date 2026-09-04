# 🏗️ Architecture Decisions

> **Load this file when:** proposing structural changes, adding new files/dependencies, questioning why something was built a certain way.

These decisions were made deliberately. **Understand the reason before proposing to change them.** If you believe a decision should be revisited, document the tradeoff and ask the user first — do not change unilaterally.

---

## ADR-001: No Backend — Privacy First

**Decision:** All data lives in the browser's `localStorage`. There is no server, no database, no API calls for user data.

**Reason:** The primary users are employees tracking their own OT and salary. They must be able to trust that their income data never leaves their device. A backend would require authentication, server costs, and creates a privacy liability. The product's core promise is "your data stays on your device."

**Implication for agents:** Never add code that sends `ot_cal`, `ot_salary`, or any personal financial data to a remote URL. The only permitted external call is the optional Cloud Sync to the user's *own* Google Sheets (`js/cloud.js`), which the user explicitly sets up themselves.

---

## ADR-002: Vanilla JS + Global Scope, No Framework

**Decision:** All JS files use plain browser globals. No `import`/`export`, no bundler, no React/Vue/Svelte.

**Reason:** The app must install and run as a PWA without a build step. Users open a URL in a browser — they don't run `npm install`. A bundler would require a build pipeline and a dev server, increasing complexity and breaking the offline-first model. Vanilla JS also means the Service Worker can cache files directly with no content-hash complications.

**Implication for agents:** Do not add `import` or `export` statements to any JS file. Do not add a `package.json` with runtime dependencies. All new functions must be declared in global scope and loaded in the correct order (see JS Load Order in AGENTS.md).

---

## ADR-003: Always Divide by 30 for Daily Salary Rate

**Decision:** The daily salary rate is always `salary ÷ 30`, regardless of how many days are in the actual billing month.

**Reason:** This matches the company's official payslip formula. The company uses 30 as a fixed divisor as a payroll accounting standard. Using `daysInMonth()` would produce a different hourly rate in February (28 days) vs. March (31 days), causing the app's calculated totals to disagree with the official payslip.

**Implication for agents:** Never replace `30` with `daysInMonth()`, `actualDays`, `periodLength`, or any dynamic value — in `getHourlyRate()`, `periodStats()`, or anywhere else in `calc.js`.

---

## ADR-004: Math.ceil for OT Rate, Math.floor for Social Security

**Decision:** OT hourly rate uses `Math.ceil` (rounds up to 2 decimal places via `× 100 / 100`). Social security deduction uses `Math.floor`.

**Reason:**
- **OT rate:** The company's payslip always rounds the hourly rate *up*. If the exact rate is ฿75.416…, the payslip shows ฿75.42. Using `Math.round` would produce ฿75.42 in some cases and ฿75.41 in others — inconsistent with the official document.
- **Social security:** Thai law specifies the deduction is calculated by truncation (floor), not rounding. The government gazette is the authoritative source; do not change this cap (฿750) without verifying a new gazette.

**Implication for agents:** These two rounding functions encode two different legal/contractual standards. Do not "normalize" them to a single rounding method, even if the code looks inconsistent.

---

## ADR-005: Single HTML File, All Modals in `index.html`

**Decision:** The entire UI lives in `index.html`. Every modal, overlay, and panel is a `<div>` in this file, shown/hidden via CSS classes. There are no separate `.html` route files.

**Reason:** Single-page PWA with no client-side router. No server-side rendering. All modals being in the DOM at load time means they are always available even offline, and there is no asynchronous loading delay or flash of unstyled content.

**Implication for agents:** When adding a new modal or UI panel, add its HTML to `index.html`. Do not create new `.html` files for UI panels. Do not use `fetch()` to load HTML fragments. The modal's show/hide state is controlled by CSS class toggling via JS.
