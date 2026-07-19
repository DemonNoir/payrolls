# HANDOFF.md — ปฏิทิน OT V2

**วันที่:** 2026-07-19 | **เซสชัน:** 5 (Checkpoint 5)

---

## Project Overview

Web App ปฏิทินคำนวณ OT/วันหยุดสำหรับพนักงาน รองรับการกรอก OT, ลางาน, กะดึก พร้อมคำนวณเงินเดือนอัตโนมัติ ใช้ HTML/CSS/JS แบบ vanilla ไม่มี framework เก็บข้อมูลใน localStorage

- **Repo:** `/Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls`
- **Dev Server:** `python -m http.server 8091` (PID 43752) — รันอยู่แล้ว
- **URL:** http://localhost:8091

---

## Current State

### โค้ดที่เขียนเสร็จแล้วในเซสชันนี้ ✅

ฟีเจอร์ **Long-Press Multi-Select** เขียนโค้ดเสร็จครบแล้ว แต่ **ยังไม่ได้ทดสอบในเบราว์เซอร์** เพราะเบราว์เซอร์ยังโหลดเวอร์ชันเก่า (cache ค้าง)

---

## Recent Changes

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `css/style.css` | เพิ่ม `.cell.selected`, `.multi-select-bar`, `.multi-select-bar.show` |
| `index.html` | เพิ่ม `#batchEditOverlay` (Batch Edit Modal) + `#multiSelectActionBar` (Floating Bar) — script version v=30 |
| `js/ui.js` | เพิ่ม ~290 บรรทัด: `initMultiSelect()`, `enterMultiSelectMode()`, `exitMultiSelectMode()`, `toggleMultiSelect()`, `openBatchEdit()`, `saveBatchEdit()`, `updateActionBar()` |
| `sw.js` | bump cache `ot-v17` → `ot-v18` เพื่อ force clear |

---

## Pending Tasks / Next Steps

### 🔴 ด่วน — ยังไม่ได้ทดสอบ

1. **ล้าง cache แล้วทดสอบฟีเจอร์** — วิธีง่ายสุด: เปิด Incognito tab → http://localhost:8091
2. **ทดสอบ flow ครบ:**
   - กดค้างบนวันใน calendar (~450ms) → cell highlight น้ำเงิน
   - ลากผ่านวันอื่น → highlight ตาม
   - ยกนิ้ว → Floating Bar "เลือกแล้ว X วัน [จัดการ] [ยกเลิก]" โผล่
   - กด "จัดการ" → Batch Edit Modal เปิด
   - กรอก OT / ลางาน → กด "บันทึกทับทั้งหมด" → ข้อมูลบันทึก

### 🟡 Decisions ที่ User ตัดสินใจแล้ว

- **UX Flow:** Option B Hybrid (ลากได้ + floating bar + tap เพิ่มวันได้)
- **Overwrite Logic:** เขียนทับทั้งหมด (Overwrite All) — ถ้าผิดแก้ทีละวันเอง
- **วันหยุดนักขัตฤกษ์:** ตั้งได้จาก Batch Modal โดยตรง เก็บใน `settings.holidays` แบบ YYYY-MM-DD

### 🟢 ถ้าทดสอบผ่านแล้ว — ขั้นต่อไป

3. เพิ่ม Usage Guide / Tooltip แนะนำฟีเจอร์กดค้าง
4. git commit & push ขึ้น GitHub

---

## Open Issues / Notes

### ⚠️ ปัญหา Cache เบราว์เซอร์

- Server port 8091 เสิร์ฟไฟล์ถูกต้อง (script v=30, sw cache ot-v18)
- **วิธีแก้:** เปิด Incognito Window → http://localhost:8091
- หรือ DevTools → Application → Service Workers → Unregister → Reload

### ⚠️ Logic วันหยุดนักขัตฤกษ์ (ยังไม่ resolve)

- ถ้าวันเดียวกันมีทั้ง "วันหยุดนักขัตฤกษ์" + "OT" → ควร auto-เปลี่ยน multiplier เป็น 3x ไหม?
- ยังไม่ได้ implement, รอ User ตัดสินใจ

### 📁 ไฟล์สำคัญ

- `js/ui.js` (line 660+): Multi-select logic ทั้งหมด
- `js/utils.js`: `getLeaveTypes()`, `holidayName()`, `getCal()`, `saveCal()`
- `js/calc.js`: Logic คำนวณเงิน (ไม่ได้แก้ในเซสชันนี้)
- `tests/calc-tests.html`: Unit tests (ผ่านครบ 20/20)
