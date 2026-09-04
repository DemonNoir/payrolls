# 🧪 Test Suite Guide — `tests/calc-tests.html`

> **Load this file when:** writing new calc logic, adding a new Business Rule, or when a test is failing and you need to understand what it covers.

---

## How to Run

1. Open `tests/calc-tests.html` directly in any browser (no server needed)
2. All results render in the browser — ✅ green = pass, ❌ red = fail
3. The summary at the bottom shows total count

**Before editing `calc.js`:** run once to confirm your baseline is 100% green.
**After editing `calc.js`:** run again — must still be 100% green before push.

---

## Test Coverage Map

| Test # | Section | Business Rule covered |
| :--- | :--- | :--- |
| 1 | `getHourlyRate` | BR-1: OT Hourly Rate formula (÷30 ÷8, Math.ceil) |
| 2 | `autoDays` | BR-2: Sunday + holiday OT must count as working day |
| 3 | Prorate | BR-3: New employee prorate = salary/30 × daysWorked |
| 4 | Leave Deductions | BR-4: Sick leave ≠ salary deduct; Personal/Absent = salary deduct |
| 5 | Social Security | BR-5: Math.floor(salary × 0.05), cap 750 |
| 6 | OT Food Allowance | BR-6: Only days with OT ≥ 2 hours qualify |
| 7 | Calc Mode | BR-7: `realtime` excludes future dates; `overall` includes them |
| 8 | Payday Weekend Shift | Saturday → Friday-1; Sunday → Friday-2 |
| 9 | Dual-Mode KPI | KPI Daily in ฿ and KPI Bonus in % can mix independently |
| 10 | Versioned Settings | Future cycles inherit; past cycles are immutable |

**Total assertions at last check: 29 / 29**

---

## What Each Test Validates

### Test 1 — `getHourlyRate`
- Salary 12,000 + KPI 10% → ฿55.00/hr (exact, no rounding artifact)
- Salary 13,000 + KPI 10% → ฿59.59/hr (**ceil**, not round/floor)
- Salary 13,000 + KPI 10% + Bonus 5% → ฿62.30/hr
- Salary 0 → rate 0

### Test 2 — `autoDays` (Sunday/Holiday OT)
- Sunday 21 Jun 2026 + OT record → `transport > 0` (day counted)
- Public holiday 23 Jun 2026 + OT record → day counted
- Public holiday + **no OT** → `autoDays = 0` (not counted)

> ⚠️ This is the regression test for bug [2026-06-27]. If this test fails, the `||` was changed to `&&`.

### Test 3 — Prorate
- Employee starts 1 Jul in cycle 16 Jun–15 Jul → `employedDays = 15`
- `proratedSalary = min(12000, 12000/30 × 15) = 6000`

### Test 4 — Leave Deductions
- Sick leave 2 days → salary unchanged (12,000), diligence = 0
- Personal leave 1 day → salary deducted 400 (12,000/30), diligence = 0

### Test 5 — Social Security
- 12,000 × 0.05 = 600 → `floor(600) = 600`
- 20,000 × 0.05 = 1,000 → capped at **750**
- 12,345 × 0.05 = 617.25 → `floor(617.25) = 617` (not 618)

### Test 6 — OT Food
- Day A: 2.0 hrs OT → qualifies ✅
- Day B: 1.5 hrs OT → does NOT qualify ❌
- Day C: 3.0 hrs OT → qualifies ✅
- Result: `otFood = 2 × 50 = 100`

### Test 7 — Calc Mode
- `overall` + future OT → `otHours = 2`
- `realtime` + same future OT → `otHours = 0`

### Test 8 — Payday Weekend Shift
- 25 Jul 2026 (Saturday) → shifts to **24 Jul** (Friday)
- 25 Oct 2026 (Sunday) → shifts to **23 Oct** (Friday)
- 25 Aug 2026 (Tuesday) → stays **25 Aug** (no change)

### Test 9 — Dual-Mode KPI
- KPI Daily = ฿1,500 (fixed) + Bonus = 5% (of 12,000 = 600)
- Total KPI money = 2,100; base = 14,100
- Hourly rate = `ceil(14100/30/8 × 100) / 100 = 58.75`

### Test 10 — Versioned Settings
- Set Jun 2026 cycle salary = 15,000
- Jul 2026 (not yet set) → inherits 15,000 from Jun ✅
- Set Jul 2026 salary = 18,000 → Jul gets 18,000
- Jun 2026 retroactively → still 15,000 (immutable) ✅

---

## How to Add a New Test

1. Add a `section('Your section name')` call
2. Set up `Storage.reset(Object.assign(defaultSettings(), { ...overrides }))` and `setCal({...})`
3. Call `periodStats(period)` or the specific function
4. Use `assert('description', actual, expected)` — tolerance `±0.015` for floats
5. Run the file in browser; confirm all previous tests still pass

> ⚠️ Every new Business Rule added to `calc.js` must have at least one corresponding `assert()` in this file.
