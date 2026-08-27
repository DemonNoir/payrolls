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

1. **`index.html`**: Find the current `?v=XX` number for each changed file and **increment by 1** (search first, never guess)
2. **`sw.js`**: Change `const CACHE = 'ot-vXX'` — **increment by 1**

> If you skip this, mobile PWA users will keep loading stale code from cache.

### Testing

- After editing `calc.js` → open `tests/calc-tests.html` in browser → **all tests must pass** (✅ green)
- ❌ **NEVER push** with failing tests

### UI Redesign (when requested)

1. World-class premium design: Glassmorphism, gradients, micro-animations
2. Create walkthrough doc → save in `docs/`
3. `git add` + `git commit` + `git push` always

### Git

- Every completed task: `git add` → `git commit` (clear message) → `git push`

---

## Deep Dive References

| Document | Use when |
| :--- | :--- |
| `ARCHITECTURE.md` | Need full Business Rules detail, localStorage keys, calc mode explanation |
| `PRODUCT.md` | Need product context for UI design decisions (loaded by Impeccable skill) |
| `HANDOFF.md` | Resuming work from a previous session |
| `docs/specs/SPEC_leave-type-settings.md` | Building the Leave Type Settings feature |
| `docs/specs/leave-system-overhaul.md` | Building the Leave System Overhaul feature |
| `docs/specs/ot-summary-redesign-prompt.md` | Redesigning the OT summary cards |
