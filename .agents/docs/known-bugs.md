# ⚠️ Known Bugs & Anti-Patterns

> **Load this file when:** modifying `calc.js`, debugging calculation issues, or reviewing OT/allowance logic.

This is the canonical registry of bugs that have already been fixed. **Read this before touching `calc.js`** to avoid reintroducing them.

---

## Bug Registry

### [2026-06-27] Working Day Logic — Sunday OT Excluded

| Field | Detail |
| :--- | :--- |
| **File** | `calc.js` → `periodStats()` |
| **Symptom** | Workers who did OT on Sundays lost travel + food allowance silently — numbers looked almost correct so the bug was hard to notice |
| **Bad code** | `(getDay()!==0 && (!isHolidayKey(k) \|\| hasOt))` |
| **Root cause** | The outer `&&` required the day to be non-Sunday first. Sunday was excluded at that check, so the `hasOt` branch never fired for Sundays. |
| **Correct code** | `(isWorkingDay \|\| hasOt)` where `isWorkingDay = (cur.getDay()!==0 && !isHolidayKey(k))` |
| **Why correct** | The two conditions are logically independent: a day counts if it's a normal working day *or* if the worker physically came in (proved by OT record). A Sunday with OT satisfies the second condition regardless of the first. |

---

## Anti-Patterns

### ❌ Deriving OT Food from Working Day Count

- Do NOT calculate `otFoodDays` by reusing the `autoDays` loop or the working-day flag
- ✅ `otFoodDays` must be counted in a separate pass — only days with OT **≥ 2 hours**
- **Why:** A worker can come to work without doing OT (not eligible for OT food). A worker can do OT on a holiday (eligible). The two sets do not overlap perfectly.

### ❌ Using `Math.round` for Financial Values

- Do NOT use `Math.round` anywhere in `calc.js`
- ✅ Use `Math.ceil` for OT hourly rate (company rounds up per payslip standard)
- ✅ Use `Math.floor` for social security (Thai government truncates, does not round)
- **Why:** Each rounding rule exists because of a specific legal or contractual standard. `Math.round` would produce numbers that differ from official payslips on edge values.

### ❌ Introducing External Libraries

- Do NOT `<script src="https://cdn...">` any third-party library
- Do NOT add `npm install` dependencies that run at runtime
- **Why:** The app must work 100% offline as a PWA. An external CDN URL will fail silently with no network. This also violates the Lightweight product principle.

### ❌ Changing the 30-Day Divisor Dynamically

- Do NOT replace `30` with `daysInMonth()`, `periodLength`, or any dynamic value
- **Why:** The company's official payslip uses 30 as a fixed standard across all months. Dynamic values would cause the app's numbers to disagree with official documents.

### ❌ Merging `isWorkingDay` and `hasOt` into a Single Condition

- Do NOT write `(getDay()!==0 && (!isHolidayKey(k) || hasOt))` — this was the root cause of the 2026-06-27 bug
- ✅ Always keep them as two independent OR branches: `(isWorkingDay || hasOt)`
- **Why:** The logic is independent. Collapsing them creates a precedence trap where Sunday is excluded before `hasOt` is ever checked.

---

## 🔬 Pre-Push Regression Checklist (Browser)

After every change to `calc.js`, verify these three scenarios in the browser **before** running the full test suite. They are the most commonly broken edge cases.

### Check 1 — Sunday OT still earns allowances
1. Open the app, go to a Sunday in the current cycle
2. Record 2 hours of OT
3. Open the period summary → **transport and food allowance must be > ฿0**
4. ❌ If transport = 0, the `||` was broken → revert immediately

### Check 2 — Social Security never exceeds ฿750
1. Set base salary to ฿20,000 in Settings
2. Open period summary → **ประกันสังคม must show ฿750**, not ฿1,000
3. ❌ If it shows ฿1,000, `Math.floor` was changed or the cap was removed

### Check 3 — Past period not affected by new settings
1. Navigate to last month's period
2. Change salary in Settings (for current period only)
3. Navigate back to last month → **numbers must be identical to before**
4. ❌ If last month changed, `getEffectiveSettings()` / `period_settings:*` logic is broken

> These three checks take less than 2 minutes and catch 90% of regression bugs before they reach production.

