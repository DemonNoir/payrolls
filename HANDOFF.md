# Project Handoff

## Project Overview
โปรเจกต์ปฏิทิน OT (Overtime Calendar) เป็นแอปพลิเคชันบนเว็บสำหรับให้พนักงานบันทึกเวลาทำงานล่วงเวลา (OT), ลางาน, เข้ากะดึก, และวันหยุดนักขัตฤกษ์ โดยระบบจะคำนวณเงินเดือน, สวัสดิการ (ค่าเดินทาง, ค่าอาหาร, ค่ากะดึก, ค่าอาหาร OT) ให้อัตโนมัติ รองรับการบันทึกแบบ Single-day และ Batch Edit (หลายวัน)

## Current State
- บันทึกโค้ดเวอร์ชันล่าสุดขึ้น GitHub เรียบร้อยแล้ว (`main` branch commit `5eab56f`)
- ผ่านการทดสอบอัตโนมัติ 100% (29/29 assertions ใน `tests/calc-tests.html`)
- รองรับการตั้งค่าแบบสืบทอดรายรอบบิล (Versioned Billing-Cycle Settings), Dual-Mode KPI (บาท / %), และการเลื่อนวันจ่ายเงินเมื่อตรงกับวันเสาร์/อาทิตย์

## Recent Changes (เซสชันล่าสุด)
1. **Payday Weekend Shift Logic:** 
   - เพิ่ม `getActualPaydayDate()` ใน `js/utils.js`: หากวันที่ 25 ตรงกับวันเสาร์ จะเลื่อนเป็นวันศุกร์ที่ 24, หากตรงกับวันอาทิตย์ เลื่อนเป็นวันศุกร์ที่ 23
   - แสดงผลใน Dashboard และ Countdown พร้อมระบุวันศุกร์ที่เลื่อนชัดเจน
2. **Dual-Mode KPI System (% / ฿):**
   - สามารถกำหนด KPI Daily และ KPI Bonus แยกกันได้อิสระว่าจะใช้หน่วยเป็น `%` หรือ `บาท` (Fixed Amount)
   - เพิ่มปุ่มสลับหน่วยในหน้า Settings พร้อมกล่อง KPI Info Box แสดงผลรายละเอียดและแปลงค่าเปรียบเทียบเรียลไทม์
3. **Versioned Billing-Cycle Settings Engine:**
   - การตั้งค่าในหน้า Settings จะสร้างเวอร์ชันผูกกับรอบบิลที่กำลังดูอยู่ (`period_settings:YYYY-MM`)
   - ค่าที่ตั้งใหม่จะ **สืบทอดไปยังรอบบิลถัดไปในอนาคตทั้งหมด** โดยอัตโนมัติ จนกว่าจะมีการตั้งค่าทับใหม่
   - **รอบบิลในอดีต จะไม่ถูกกระทบ** ยังคงใช้ประวัติการตั้งค่าเดิม
4. **Export / Import Backup Upgrade:**
   - `exportData()` และ `importFile()` ใน `js/data.js` รวม `period_settings:*` keys ในไฟล์ JSON Backup
5. **Cache Busting & Service Worker:**
   - อัปเดต `index.html` (script `?v=38`) และ `sw.js` (เวอร์ชัน `ot-v26`)

## Pending Tasks / Next Steps
- ติดตามผลการใช้งานจากผู้ใช้ ว่ามีการเปลี่ยนวันตัดรอบบิลหรือเงินเดือนย้อนหลังแล้วผลการคำนวณถูกต้องตามต้องการทุกกรณีหรือไม่

## Open Issues / Notes
- **เรื่อง Cache บนมือถือ (PWA):** หากมีการอัปเดตโค้ดครั้งหน้า ควรบอกให้ผู้ใช้เคลียร์แคชหรือปิดเปิดแท็บใหม่เสมอ
- โค้ดที่เกี่ยวข้องกับการอ่านค่าตั้งค่าแบบ versioned อยู่ใน `getEffectiveSettings()` และ `savePeriodSettings()` ใน `js/utils.js`
