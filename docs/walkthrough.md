# Walkthrough: Payday Weekend Shift, Dual-Mode KPI, and Versioned Billing-Cycle Settings

## 📌 สรุปการพัฒนาและปรับปรุงฟีเจอร์ใหม่ (Changelog)

ระบบปฏิทิน OT และเงินเดือน ได้รับการอัปเกรดเพื่อรองรับเงื่อนไขการทำงานจริงของบริษัทดังนี้:

---

### 1. 🗓️ ระบบเลื่อนวันเงินเดือนออกอัตโนมัติ (Payday Weekend Shift Logic)
- **เงื่อนไขธุรกิจ:** หากวันจ่ายเงินที่ตั้งไว้ (ค่าเริ่มต้นวันที่ 25) ตรงกับวันเสาร์หรือวันอาทิตย์ ระบบจะเลื่อนวันจ่ายเงินมาเป็นวันศุกร์ก่อนหน้าโดยอัตโนมัติ:
  - **ตรงวันเสาร์ (Saturday):** เลื่อนเป็นวันศุกร์ที่ 24
  - **ตรงวันอาทิตย์ (Sunday):** เลื่อนเป็นวันศุกร์ที่ 23
- **การแสดงผล:** Dashboard และ Countdown ปรับการแสดงผลแบบไดนามิก พร้อมระบุหมายเหตุเมื่อมีการเลื่อนวัน เช่น `เงินออกอีก 1 วัน (เลื่อนเป็นศุกร์ 24 ก.ค.)`
- **ฟังก์ชันสำคัญ:** เพิ่ม `getActualPaydayDate(year, month, targetDay)` ใน `js/utils.js`

---

### 2. 📊 ระบบ KPI แบบ 2 โหมดอิสระ (Dual-Mode KPI: Amount ฿ & Percent %)
- **เงื่อนไขธุรกิจ:** สามารถกำหนด KPI Daily และ KPI Bonus แยกกันได้อิสระ โดยเลือกได้ว่าจะล็อกเป็น **"จำนวนเงิน (บาท)"** หรือ **"เปอร์เซ็นต์ (%)"**
- **สูตรการคำนวณ:**
  - KPI Daily Money: หากเป็น `amount` ใช้เงินบาทตรงๆ, หากเป็น `percent` คำนวณจาก `เงินเดือนหลัก × (KPI % / 100)`
  - KPI Bonus Money: หากเป็น `amount` ใช้เงินบาทตรงๆ, หากเป็น `percent` คำนวณจาก `เงินเดือนหลัก × (KPI Bonus % / 100)`
  - ค่าแรงต่อชั่วโมง:
    $$\text{Hourly Rate} = \left\lceil \frac{\text{เงินเดือน} + \text{KPI Daily Money} + \text{KPI Bonus Money}}{30 \times 8} \times 100 \right\rceil \div 100$$
- **การปรับปรุง UI:** เพิ่มปุ่ม toggle pill เลือกหน่วย (`%` / `฿`) ในหน้า Settings พร้อมกล่อง **KPI Info Box** คำนวณรายละเอียดและแปลงค่าเทียบเคียงให้อัตโนมัติในแบบเรียลไทม์

---

### 3. ⚙️ ระบบตั้งค่าแบบสืบทอดตามรอบบิล (Versioned Billing-Cycle Settings Engine)
- **เงื่อนไขธุรกิจ:** การตั้งค่า (เงินเดือน, สวัสดิการ, อัตราค่าแรง, วันตัดรอบ, วันจ่ายเงิน, รายการหัก ฯลฯ) จะถูกผูกเข้ากับ **รอบบิล (Billing Cycle)** ซึ่งถูกกำหนดโดยวันตัดรอบ (cutoff day)
- **พฤติกรรมการทำงาน (Carry-Forward Engine):**
  - เมื่อเปิด Settings ขณะดูรอบบิลใดๆ (เช่น รอบบิล 16 มิ.ย. – 15 ก.ค.) การกดบันทึกจะสร้างเวอร์ชันของรอบบิลนั้น (`period_settings:YYYY-MM`)
  - ค่าที่บันทึกใหม่จะ **สืบทอดไปยังรอบบิลในอนาคตทั้งหมด** โดยอัตโนมัติ จนกว่าจะมีการเข้ามาบันทึกทับใหม่
  - **รอบบิลในอดีต จะไม่ถูกกระทบ** ยังคงใช้ประวัติการตั้งค่าเดิมของรอบบิลนั้นๆ
- **การสำรองข้อมูล (Backup/Restore):** `exportData()` และ `importFile()` ใน `js/data.js` รองรับการรวม `period_settings:*` ใน JSON backup v4 (พร้อม backward compatibility v3)

---

## 🧪 ผลการทดสอบ (Verification & Test Results)

ทำการรันชุดทดสอบอัตโนมัติ `tests/calc-tests.html` ผ่าน Node.js Test Runner:

```bash
Results: Passed = 29, Failed = 0 (100% Pass Rate)
```

### การทดสอบที่สำคัญ:
1. **Payday Shift Test:** 25 ก.ค. 2026 (วันเสาร์) → เลื่อนเป็น 24 ก.ค. (วันศุกร์) ✅
2. **Dual-Mode KPI Test:** KPI Daily 1,500 บาท + Bonus 5% คำนวณอัตราต่อชั่วโมงถูกต้อง ✅
3. **Versioned Settings Test:** ตั้งเงินเดือนรอบ มิ.ย. = 15,000 → รอบ ก.ค. สืบทอด 15,000 → ตั้งรอบ ก.ค. = 18,000 → รอบ ก.ค. เป็น 18,000 แต่รอบ มิ.ย. ย้อนหลังยังคงเป็น 15,000 ✅

---

## 📁 ไฟล์ที่มีการแก้ไข (Modified Files)
1. [index.html](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/index.html) — เพิ่ม KPI toggle buttons (% / ฿), period badge header, และอัปเดต cache bust (`v=38`)
2. [js/utils.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/utils.js) — เพิ่ม `getActualPaydayDate()`, `getPeriodKey()`, `getEffectiveSettings()`, `savePeriodSettings()`
3. [js/calc.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/calc.js) — ปรับ `settings()`, `getHourlyRate()`, `periodStats()`, และ `paydayCountdown()`
4. [js/settings.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/settings.js) — ปรับ `openSettings()` และ `saveSettings()`
5. [js/ui.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/ui.js) — ปรับ `renderDashboard()` และ `renderKpiInfo()`
6. [js/data.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/data.js) — ปรับ `exportData()` และ `importFile()`
7. [sw.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/sw.js) — อัปเดต Cache เป็น `ot-v26`
8. [tests/calc-tests.html](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/tests/calc-tests.html) — เพิ่มชุดทดสอบใหม่ 3 หมวด (29 assertions)
