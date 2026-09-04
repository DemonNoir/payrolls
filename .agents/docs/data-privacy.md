# 🔐 Data & Privacy Rules

> **Load this file when:** adding a new `localStorage` key, modifying export/import logic, or building any feature that touches user data.

---

## localStorage Key Registry

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

---

## Export / Import Integrity Rules

- `exportData()` in `js/data.js` **must** include all `period_settings:*` keys in the JSON backup file
- `importFile()` **must** restore all `period_settings:*` keys — not just `ot_cal`
- After a successful import, the user's data must be byte-for-byte equivalent to the exported file — **zero information loss**
- If a new `localStorage` key is added to the app, `exportData()` and `importFile()` must be updated in the same commit

---

## Privacy Rules

- ❌ Never `console.log` the full contents of `ot_cal`, `ot_salary`, or any key containing personal financial data in production code
- ❌ Never send `localStorage` data to any URL except the user's own Google Sheets (user-configured via `js/cloud.js`)
- ❌ Never add `localStorage` data to the Service Worker precache — `sw.js` must only cache app assets (HTML, CSS, JS, icons)
- ✅ Debug logs are acceptable during development; wrap them in a `DEBUG` flag or remove before push
