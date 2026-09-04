# 🌐 Scope & Constraints

> **Load this file when:** adding a new feature, evaluating whether a capability fits the product, or checking hard constraints before making an architectural decision.

---

## What This App Does

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

---

## What This App Does NOT Do

- ❌ Multi-user or team management
- ❌ Employer-side payroll processing
- ❌ Tax filing or generation of official tax documents
- ❌ Real-time sync to any central backend
- ❌ Push notifications
- ❌ User accounts / login / authentication

---

## Hard Constraints (Never Violate)

| Constraint | Rule |
| :--- | :--- |
| **Offline-first** | Every feature must work with zero network connectivity |
| **No external dependencies** | No CDN URLs for CSS or JS in production code |
| **localStorage only** | No IndexedDB, no cookies, no server sessions for user data |
| **No build step** | Project deploys by uploading files directly — no `npm run build` |
| **Mobile-first** | Design and test at 390px width first; desktop is secondary |
| **Privacy** | User data must never be sent to any URL the user did not explicitly configure |

---

## Product Principles (from PRODUCT.md)

1. **Absolute Privacy:** User data belongs to the user and stays on their device only.
2. **Lightweight & Fast:** No framework or runtime dependencies. Load fast, work everywhere.
3. **Premium Craft:** UI must feel premium (Raycast-style dark aesthetic) and be intuitive on every screen size.
