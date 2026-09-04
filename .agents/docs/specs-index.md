# 📋 Specs Index

> Status of all feature specification documents in `docs/specs/`.

| Spec | Status | Summary |
| :--- | :---: | :--- |
| [`SPEC_leave-type-settings.md`](../specs/SPEC_leave-type-settings.md) | 📄 Draft | Settings UI for configuring leave types (sick/personal/absent) with per-type quotas and deduction rules |
| [`leave-system-overhaul.md`](../specs/leave-system-overhaul.md) | 📄 Draft | Full overhaul of the leave recording and calculation system — new leave types, UI, and calc engine changes |
| [`ot-summary-redesign-prompt.md`](../specs/ot-summary-redesign-prompt.md) | 📄 Draft | Redesign of the OT summary cards on the dashboard — layout, data displayed, and visual hierarchy |

---

## Status Legend

| Icon | Meaning |
| :---: | :--- |
| 📄 Draft | Spec written but not yet started in code |
| 🚧 In Progress | Actively being built |
| ✅ Done | Fully implemented and shipped |
| 🚫 Cancelled | Decided not to build |

---

## How to Use a Spec

1. Read the spec file fully before writing any code for that feature
2. Check the relevant Business Rules in `AGENTS.md` — the spec may introduce new ones
3. If new `localStorage` keys are needed, update `docs/data-privacy.md` and `js/data.js`
4. When done, update the Status above to ✅ Done
