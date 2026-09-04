# Project Rules & Agent Navigation Map

## Codebase Quick Map

> **Read this table first.** It tells you which file to open for any task.

| What to change | Primary file | Key notes |
| :--- | :--- | :--- |
| Salary/OT/tax/welfare calculations | `js/calc.js` | ⚠️ Read Business Rules below before touching |
| Calendar/dashboard/summary cards UI | `js/ui.js` | Renders calendar grid, dashboard cards, period summary |
| Settings modal / entry overlay | `js/settings.js` | Base salary, shifts, position pay, leave quotas |
| Utility functions / holidays / dates | `js/utils.js` | `num()`, `getLS()`, `dateKey()`, `getEffectiveSettings()`, holiday list |
| Payslip / PDF export | `js/docs.js` | Payslip generator, print layout |
| Backup / restore / import-export | `js/data.js` | JSON import/export, data validation, `period_settings:*` |
| Cloud sync | `js/cloud.js` | Sync to Google Sheets |
| Tutorial / onboarding flow | `js/tutorial.js` | Welcome walkthrough, step-by-step guide |
| Event wiring / app init | `js/app.js` | Listeners, SW registration — **must load last** |
| HTML structure / all modals | `index.html` | Single-page app — every modal lives here |
| Themes / CSS / animations | `css/style.css` | Dark/Light theme, Glassmorphism, micro-animations |
| Unit tests | `tests/calc-tests.html` | Must pass before every push |
| PWA cache version | `sw.js` | Bump `const CACHE` on every release |

### JS Load Order (Global Scope — order matters!)

```
utils.js → calc.js → ui.js → settings.js → data.js
→ cloud.js → tutorial.js → app.js → docs.js
```

All files share global scope. `calc.js` depends on `utils.js` helpers. `app.js` wires events and must come near the end. Breaking this order will cause undefined-function errors at runtime.

---

## Business Rules — DO NOT Break

### 1. OT Hourly Rate (`calc.js` → `getHourlyRate()`)

```
Math.ceil((salary + KPI_money) ÷ 30 ÷ 8 × 100) ÷ 100
```

- **Always divide by 30** (company payslip standard, NOT actual days in month)
- **Always divide by 8** (8 hrs/day per Thai labor law)
- ❌ **NEVER** change `Math.ceil` → `Math.round` or `Math.floor`
- ❌ **NEVER** change `30` → `daysInMonth()`

### 2. Working Day Count (`calc.js` → `periodStats()` → `autoDays`)

```javascript
var isWorkingDay = (cur.getDay()!==0 && !isHolidayKey(k));
if ((isWorkingDay || hasOt) && isEmployed && countForRealtime) autoDays++;
```

- Counts when: `normal working day` **OR** `has OT record`
- ❌ **NEVER** change `||` to `&&` — Sundays with OT must earn travel/food allowance
- **Known bug (2026-06-27):** Someone wrote `(getDay()!==0 && (!isHolidayKey(k) || hasOt))` → Sundays with OT were silently excluded → workers lost travel+food allowance

### 3. Prorate (`calc.js` → `periodStats()`)

```
proratedSalary = Min(salary, (salary ÷ 30) × daysWorked)
```

- **Always divide by 30**, not `totalDaysInPeriod`
- **Always use `Math.min`** to prevent salary > base when days > 30

### 4. Leave Deductions

| Type | Deduct salary? | Deduct diligence bonus? |
| :--- | :---: | :---: |
| Sick leave | ❌ No | ✅ Yes (= 0) |
| Personal leave | ✅ Yes (salary/30 per day) | ✅ Yes (= 0) |
| Absent | ✅ Yes (salary/30 per day) | ✅ Yes (= 0) |

- ⚠️ Deduct from `st.salaryBase` (original base), **NOT** from `proratedSalary`

### 5. Social Security (`calc.js`)

```
socialSecurity = Min(750, Math.floor(proratedSalary × 0.05))
```

- ❌ **NEVER** change `Math.floor` → `Math.round`
- ❌ **NEVER** change the 750 cap without verifying current Thai government gazette

### 6. OT Food Allowance

- Count only days with OT **≥ 2 hours** (see `otFoodDays++` in `calc.js`)
- This is separate from `autoDays` — do NOT derive from working day count

### 7. Calc Mode — `realtime` vs `overall`

| Mode | Behavior |
| :--- | :--- |
| `realtime` | Calculates OT and welfare up to today only |
| `overall` | Calculates the full billing cycle (includes future days) |

- The variable `countForRealtime` controls both the OT loop and the autoDays loop

---

## Workflow Rules (Mandatory)

### Cache Busting — every time you edit JS/CSS

Every code change requires bumping the version in **all three locations**. Search the current number first — never guess.

**Step 1 — `sw.js`:**
```javascript
const CACHE = 'ot-vXX'; // increment XX by 1
```

**Step 2 — `index.html` (CSS):**
```html
<link href="css/style.css?v=XX" ...> <!-- increment XX by 1 -->
```

**Step 3 — `index.html` (each JS file you changed):**
```html
<script src="js/calc.js?v=XX">    <!-- increment XX by 1 -->
<script src="js/ui.js?v=XX">      <!-- only if you edited this file -->
<script src="js/utils.js?v=XX">   <!-- only if you edited this file -->
<!-- ...same for every .js file you modified -->
```

> ⚠️ If you skip this, mobile PWA users will keep loading stale code from cache. They will not see your fix.

### Pre-Push Checklist

Run through this before every `git push`:

- [ ] Ran `tests/calc-tests.html` → all ✅ green (0 failures)
- [ ] Bumped `const CACHE` in `sw.js`
- [ ] Bumped `?v=XX` for CSS in `index.html`
- [ ] Bumped `?v=XX` for every JS file you changed in `index.html`
- [ ] Did not change any constant (30, 8, 750, `Math.ceil`, `Math.floor`) without a documented reason
- [ ] Comment added explaining "why" for any Business Rule touched

### Testing

- After editing `calc.js` → open `tests/calc-tests.html` in browser → **all tests must pass** (✅ green)
- ❌ **NEVER push** with failing tests

---

## Deep Dive References

| Document | Use when |
| :--- | :--- |
| `ARCHITECTURE.md` | Need full Business Rules detail, localStorage keys, calc mode explanation |
| `PRODUCT.md` | Need product context for UI design decisions (loaded by Impeccable skill) |
| `HANDOFF.md` | Resuming work from a previous session |
| `docs/allowance_rules.md` | Detailed allowance / welfare calculation edge cases |
| `docs/specs/SPEC_leave-type-settings.md` | Building the Leave Type Settings feature |
| `docs/specs/leave-system-overhaul.md` | Building the Leave System Overhaul feature |
| `docs/specs/ot-summary-redesign-prompt.md` | Redesigning the OT summary cards |

---

## ⚠️ Known Bugs & Anti-Patterns

This is the canonical registry of bugs that have already been fixed. **Read this before touching `calc.js`** to avoid reintroducing them.

### [2026-06-27] Working Day Logic — Sunday OT Excluded

| Field | Detail |
| :--- | :--- |
| **File** | `calc.js` → `periodStats()` |
| **Symptom** | Workers who did OT on Sundays lost travel + food allowance silently — numbers looked almost correct so the bug was hard to notice |
| **Bad code** | `(getDay()!==0 && (!isHolidayKey(k) || hasOt))` |
| **Root cause** | The outer `&&` required the day to be non-Sunday first. Sunday was excluded at that check, so the `hasOt` branch never fired for Sundays. |
| **Correct code** | `(isWorkingDay || hasOt)` where `isWorkingDay = (cur.getDay()!==0 && !isHolidayKey(k))` |
| **Why correct** | The two conditions are logically independent: a day counts if it's a normal working day *or* if the worker physically came in (proved by OT record). A Sunday with OT satisfies the second condition regardless of the first. |

### Anti-Pattern: Deriving OT Food from Working Day Count

- ❌ Do NOT calculate `otFoodDays` by reusing the `autoDays` loop or the working-day flag
- ✅ `otFoodDays` must be counted in a separate pass — only days with OT **≥ 2 hours**
- **Why:** A worker can come to work without doing OT (not eligible for OT food). A worker can do OT on a holiday (eligible). The two sets do not overlap perfectly.

### Anti-Pattern: Using `Math.round` for Financial Values

- ❌ Do NOT use `Math.round` anywhere in `calc.js`
- ✅ Use `Math.ceil` for OT hourly rate (company rounds up per payslip standard)
- ✅ Use `Math.floor` for social security (Thai government truncates, does not round)
- **Why:** Each rounding rule exists because of a specific legal or contractual standard. `Math.round` would produce numbers that differ from official payslips on edge values.

### Anti-Pattern: Introducing External Libraries

- ❌ Do NOT `<script src="https://cdn...">` any third-party library
- ❌ Do NOT add `npm install` dependencies that run at runtime
- **Why:** The app must work 100% offline as a PWA. An external CDN URL will fail silently with no network. This also violates the Lightweight product principle.

### Anti-Pattern: Changing the 30-Day Divisor Dynamically

- ❌ Do NOT replace `30` with `daysInMonth()`, `periodLength`, or any dynamic value
- **Why:** The company's official payslip uses 30 as a fixed standard across all months. Dynamic values would cause the app's numbers to disagree with official documents.

---

## 🏗️ Architecture Decisions

These decisions were made deliberately. **Understand the reason before proposing to change them.** If you believe a decision should be revisited, document the tradeoff and ask the user first — do not change unilaterally.

### ADR-001: No Backend — Privacy First

**Decision:** All data lives in the browser's `localStorage`. There is no server, no database, no API calls for user data.

**Reason:** The primary users are employees tracking their own OT and salary. They must be able to trust that their income data never leaves their device. A backend would require authentication, server costs, and creates a privacy liability. The product's core promise is "your data stays on your device."

**Implication for agents:** Never add code that sends `ot_cal`, `ot_salary`, or any personal financial data to a remote URL. The only permitted external call is the optional Cloud Sync to the user's *own* Google Sheets (`js/cloud.js`), which the user explicitly sets up themselves.

---

### ADR-002: Vanilla JS + Global Scope, No Framework

**Decision:** All JS files use plain browser globals. No `import`/`export`, no bundler, no React/Vue/Svelte.

**Reason:** The app must install and run as a PWA without a build step. Users open a URL in a browser — they don't run `npm install`. A bundler would require a build pipeline and a dev server, increasing complexity and breaking the offline-first model. Vanilla JS also means the Service Worker can cache files directly with no content-hash complications.

**Implication for agents:** Do not add `import` or `export` statements to any JS file. Do not add a `package.json` with runtime dependencies. All new functions must be declared in global scope and loaded in the correct order (see JS Load Order at the top).

---

### ADR-003: Always Divide by 30 for Daily Salary Rate

**Decision:** The daily salary rate is always `salary ÷ 30`, regardless of how many days are in the actual billing month.

**Reason:** This matches the company's official payslip formula. The company uses 30 as a fixed divisor as a payroll accounting standard. Using `daysInMonth()` would produce a different hourly rate in February (28 days) vs. March (31 days), causing the app's calculated totals to disagree with the official payslip.

**Implication for agents:** Never replace `30` with `daysInMonth()`, `actualDays`, `periodLength`, or any dynamic value — in `getHourlyRate()`, `periodStats()`, or anywhere else in `calc.js`.

---

### ADR-004: Math.ceil for OT Rate, Math.floor for Social Security

**Decision:** OT hourly rate uses `Math.ceil` (rounds up to 2 decimal places via `× 100 / 100`). Social security deduction uses `Math.floor`.

**Reason:**
- **OT rate:** The company's payslip always rounds the hourly rate *up*. If the exact rate is ฿75.416…, the payslip shows ฿75.42. Using `Math.round` would produce ฿75.42 in some cases and ฿75.41 in others — inconsistent with the official document.
- **Social security:** Thai law specifies the deduction is calculated by truncation (floor), not rounding. The government gazette is the authoritative source; do not change this cap (฿750) without verifying a new gazette.

**Implication for agents:** These two rounding functions encode two different legal/contractual standards. Do not "normalize" them to a single rounding method, even if the code looks inconsistent.

---

### ADR-005: Single HTML File, All Modals in `index.html`

**Decision:** The entire UI lives in `index.html`. Every modal, overlay, and panel is a `<div>` in this file, shown/hidden via CSS classes. There are no separate `.html` route files.

**Reason:** Single-page PWA with no client-side router. No server-side rendering. All modals being in the DOM at load time means they are always available even offline, and there is no asynchronous loading delay or flash of unstyled content.

**Implication for agents:** When adding a new modal or UI panel, add its HTML to `index.html`. Do not create new `.html` files for UI panels. Do not use `fetch()` to load HTML fragments. The modal's show/hide state is controlled by CSS class toggling via JS.

---

## 🌐 Scope & Constraints

### What This App Does

This is a **personal OT tracking PWA** for individual employees — not a company HR system or team management tool.

| Capability | Detail |
| :--- | :--- |
| Record OT hours per day | Single-day entry or batch (multi-day) edit |
| Record leave type | Sick / personal / absent, with quota tracking per cycle |
| Record night shift | Boolean flag per day |
| Calculate net income | Salary + OT + KPI + allowances − deductions |
| Export payslip / PDF | Via `js/docs.js` |
| Export / Import backup | JSON file; must include all `period_settings:*` keys |
| Optional cloud sync | To user's own Google Sheets (user-configured, optional) |

### What This App Does NOT Do

- ❌ Multi-user or team management
- ❌ Employer-side payroll processing
- ❌ Tax filing or generation of official tax documents
- ❌ Real-time sync to any central backend
- ❌ Push notifications
- ❌ User accounts / login / authentication

### Hard Constraints (Never Violate)

| Constraint | Rule |
| :--- | :--- |
| **Offline-first** | Every feature must work with zero network connectivity |
| **No external dependencies** | No CDN URLs for CSS or JS in production code |
| **localStorage only** | No IndexedDB, no cookies, no server sessions for user data |
| **No build step** | Project deploys by uploading files directly — no `npm run build` |
| **Mobile-first** | Design and test at 390px width first; desktop is secondary |
| **Privacy** | User data must never be sent to any URL the user did not explicitly configure |

---

## 🔐 Data & Privacy Rules

### localStorage Key Registry

Every key the app uses is listed here. **Do not add new localStorage keys without adding them to this table** and updating the export/import logic in `js/data.js`.

| Key | Value type | Description |
| :--- | :--- | :--- |
| `ot_cal` | JSON string | OT records. Object with `YYYY-MM-DD` string keys. Each value holds hours, rate, leave type, night shift flag, etc. |
| `ot_salary` | number string | Base monthly salary (฿) |
| `ot_cutoff` | number string (1–31) | Billing cycle cutoff day |
| `payday` | number string (1–31) | Nominal payday (before weekend-shift adjustment) |
| `calc_mode` | `"realtime"` / `"overall"` | Calculation display mode |
| `holidays` | JSON array of strings | Public holiday dates in `"YYYY-MM-DD"` format |
| `kpi_bonus_pct:LABEL` | number string | KPI Bonus for a given billing cycle label |
| `pp_*:LABEL` | number string | Leave / deduction data per billing cycle |
| `period_settings:YYYY-MM` | JSON string | Versioned settings snapshot for a specific billing month. Used by `getEffectiveSettings()` to look up historical rates. |
| `theme` | `"dark"` / `"light"` / `"auto"` | UI theme preference |

### Export / Import Integrity Rules

- `exportData()` in `js/data.js` **must** include all `period_settings:*` keys in the JSON backup file
- `importFile()` **must** restore all `period_settings:*` keys — not just `ot_cal`
- After a successful import, the user's data must be byte-for-byte equivalent to the exported file — **zero information loss**
- If a new `localStorage` key is added to the app, `exportData()` and `importFile()` must be updated in the same commit

### Privacy Rules

- ❌ Never `console.log` the full contents of `ot_cal`, `ot_salary`, or any key containing personal financial data in production code
- ❌ Never send `localStorage` data to any URL except the user's own Google Sheets (user-configured via `js/cloud.js`)
- ❌ Never add `localStorage` data to the Service Worker precache — `sw.js` must only cache app assets (HTML, CSS, JS, icons)
- ✅ Debug logs are acceptable during development; wrap them in a `DEBUG` flag or remove before push

---

## 🎨 UI/Design Conventions

These conventions apply to every UI change. An agent that ignores these will produce a result inconsistent with the rest of the app and will require a redesign pass.

### Color Palette

The app uses a **Raycast-inspired deep dark aesthetic** with Apple system warm colors.

| Role | Value | Notes |
| :--- | :--- | :--- |
| Background | `#1c1c1e` | Deepest dark — Apple systemBackground |
| Surface (card) | `#2c2c2e` | One step lighter |
| Surface elevated | `#3a3a3c` | Modals, popovers |
| Text primary | `#f5f5f7` | Off-white — never use `#ffffff` |
| Text secondary | `rgba(255,255,255,0.55)` | Subdued labels, captions |
| Accent | Warm amber / orange-tinted | OT highlights, primary CTAs |
| Danger | `#ff453a` | Apple red — negative values, destructive actions |
| Success | `#30d158` | Apple green — positive values, confirmations |
| Separator | `rgba(255,255,255,0.08)` | Dividers between list items |

- ❌ Do NOT use named web colors (`red`, `blue`, `green`)
- ❌ Do NOT use `#ffffff` or `white` in dark-mode contexts
- ✅ Use `rgba()` for tinted overlays and glassmorphism effects

### Component Style

| Element | Style rules |
| :--- | :--- |
| Cards | `border-radius: 12px–16px`, subtle `box-shadow`, `backdrop-filter: blur(20px)` for glass effect |
| Buttons (primary) | `border-radius: 10px`, accent fill, `font-weight: 600` |
| Buttons (destructive) | `border-radius: 10px`, danger color |
| Inputs / selects | Dark surface background, 1px light border, focus ring on `:focus-visible` |
| Modals | `border-radius: 20px`, elevated surface, soft drop shadow |
| Separators | `rgba(255,255,255,0.08)` — never use `#ccc` or `#eee` |

### Motion & Animation

Every interactive element must respond visually. **Bare DOM updates without any visual transition are not acceptable.**

| Interaction | Expected animation |
| :--- | :--- |
| Button tap / click | `transform: scale(0.96)` on `:active` |
| Modal open | Fade-in + slide-up (`translateY(20px → 0)`, `opacity 0 → 1`) |
| Modal close | Fade-out + slide-down |
| Number value change | CSS `transition` on the element, or a brief counter animation |
| New card / list item appear | Fade-in with slight staggered delay |
| Destructive confirm | Brief shake animation (`@keyframes shake`) |

- Default duration: `transition: all 0.2s ease`
- Always add `@media (prefers-reduced-motion: reduce)` to disable animations for accessibility

### Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- ❌ Do NOT load fonts from Google Fonts CDN or any external URL (offline-first violation)
- **Body text:** `15–16px`, weight `400`
- **Labels / captions:** `13px`, weight `400–500`, secondary color
- **Headings:** `18–22px`, weight `700`
- **Numeric values:** `font-variant-numeric: tabular-nums` for aligned columns

### Responsive / Mobile-First

- Design at **390px width** first; then adapt upward for tablet/desktop
- All tap targets: minimum `44 × 44px` (Apple HIG standard)
- Avoid hover-only interactions — mobile users have no hover state
- Modals must scroll **internally** (overflow: auto on modal body), not push the page

---

## 🔁 Session Resume Protocol

Follow these steps at the **start of every new session** before writing any code. This ensures you don't duplicate work, introduce version conflicts, or miss context from the previous session.

### Step 1 — Read HANDOFF.md (if it exists)

```
File: HANDOFF.md (project root)
```

- If `HANDOFF.md` exists → read it in full before doing anything else. It contains the last known state of the codebase, what was changed in the previous session, and any pending tasks.
- If `HANDOFF.md` does not exist → proceed directly to Step 2. This is not an error.

### Step 2 — Check Current Cache Versions

Open both files and record the current version numbers. You need these so you can increment correctly — never guess.

```bash
# In sw.js, find:
const CACHE = 'ot-vXX';    ← record XX

# In index.html, search for:
style.css?v=XX             ← record XX
calc.js?v=XX               ← record XX
ui.js?v=XX                 ← record XX
# ...all other script tags
```

### Step 3 — Identify the Relevant Section of AGENTS.md

Identify which sections of this document apply to your task before reading any code:

| Task type | Section to re-read |
| :--- | :--- |
| Changing calculations | Business Rules + Known Bugs |
| Changing UI / CSS | UI/Design Conventions |
| Adding a new feature | Scope & Constraints + Data & Privacy Rules |
| Debugging an issue | Known Bugs & Anti-Patterns first |
| Restoring / importing data | Data & Privacy Rules |

### Step 4 — Run Baseline Tests (before calc changes)

Before modifying `calc.js` or any file that affects calculations:

1. Open `tests/calc-tests.html` in a browser
2. Confirm all tests show ✅ green — this is your baseline
3. If any test is already ❌ red → **stop and report this to the user before making any changes**. Do not proceed into a broken baseline.

### Step 5 — Use the Quick Map to Find the Right File

Use the **Codebase Quick Map** table at the top of this document. Do not guess which file to edit based on file name alone.

### Step 6 — Proceed, Verify, Commit

After completing your changes:

1. Run `tests/calc-tests.html` → must be 100% ✅ green
2. Complete the **Pre-Push Checklist** (see Workflow Rules above)
3. `git add -A` → `git commit -m "clear description"` → `git push`
