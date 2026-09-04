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
- See `.agents/docs/known-bugs.md` for the full bug history on this logic

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

- [ ] Ran `tests/calc-tests.html` → all ✅ green (0 failures)
- [ ] Bumped `const CACHE` in `sw.js`
- [ ] Bumped `?v=XX` for CSS in `index.html`
- [ ] Bumped `?v=XX` for every JS file you changed in `index.html`
- [ ] Did not change any constant (30, 8, 750, `Math.ceil`, `Math.floor`) without a documented reason
- [ ] Comment added explaining "why" for any Business Rule touched

### Testing

- After editing `calc.js` → open `tests/calc-tests.html` in browser → **all tests must pass** (✅ green)
- ❌ **NEVER push** with failing tests

### Git

- Every completed task: `git add -A` → `git commit -m "clear description"` → `git push`

---

## Deep Dive References

> Load the relevant doc **only when your task needs it** — do not load all of them.

| Document | Load when |
| :--- | :--- |
| `.agents/docs/known-bugs.md` | Modifying `calc.js`, debugging calculation issues |
| `.agents/docs/architecture.md` | Proposing structural changes, questioning why something was built a certain way |
| `.agents/docs/scope.md` | Adding a new feature, checking hard constraints |
| `.agents/docs/data-privacy.md` | Adding a `localStorage` key, modifying export/import |
| `.agents/docs/ui-conventions.md` | Any change to CSS, layout, or visual components |
| `ARCHITECTURE.md` | Full technical deep-dive on Business Rules and localStorage |
| `PRODUCT.md` | Product context and brand commitments |
| `HANDOFF.md` | Resuming work from a previous session (if file exists) |
| `docs/allowance_rules.md` | Allowance / welfare calculation edge cases |
| `docs/specs/SPEC_leave-type-settings.md` | Building the Leave Type Settings feature |
| `docs/specs/leave-system-overhaul.md` | Building the Leave System Overhaul feature |
| `docs/specs/ot-summary-redesign-prompt.md` | Redesigning the OT summary cards |

---

## 🔁 Session Resume Protocol

Follow these steps at the **start of every new session** before writing any code.

### Step 1 — Read HANDOFF.md (if it exists)

```
File: HANDOFF.md (project root)
```

- If `HANDOFF.md` exists → read it in full. It contains the last known state, recent changes, and pending tasks.
- If `HANDOFF.md` does not exist → proceed to Step 2.

### Step 2 — Check Current Cache Versions

```javascript
// sw.js — find:
const CACHE = 'ot-vXX';   // note XX

// index.html — search for:
style.css?v=XX             // note XX
calc.js?v=XX               // note XX
// (all other script tags)
```

Never guess the version number — always read it first.

### Step 3 — Identify the Relevant Docs to Load

| Task type | Load this doc |
| :--- | :--- |
| Changing calculations | `.agents/docs/known-bugs.md` |
| Changing UI / CSS | `.agents/docs/ui-conventions.md` |
| Adding a new feature | `.agents/docs/scope.md` + `.agents/docs/data-privacy.md` |
| Proposing structural change | `.agents/docs/architecture.md` |
| Debugging | `.agents/docs/known-bugs.md` |
| Restoring / importing data | `.agents/docs/data-privacy.md` |

### Step 4 — Run Baseline Tests (before calc changes)

Before modifying `calc.js`:

1. Open `tests/calc-tests.html` in a browser
2. Confirm all tests are ✅ green — this is your baseline
3. If any test is already ❌ red → **stop and report to the user before making any changes**

### Step 5 — Use the Quick Map to Find the Right File

Use the **Codebase Quick Map** table at the top of this document.

### Step 6 — Proceed, Verify, Commit

1. Run `tests/calc-tests.html` → must still be 100% ✅ green
2. Complete the **Pre-Push Checklist**
3. `git add -A` → `git commit -m "clear description"` → `git push`
