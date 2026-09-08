# Project Handoff

## Project Overview
โปรเจกต์ปฏิทิน OT (Overtime Calendar) เป็นแอปพลิเคชันบนเว็บสำหรับให้พนักงานบันทึกเวลาทำงานล่วงเวลา (OT), ลางาน, เข้ากะดึก, และวันหยุดนักขัตฤกษ์ โดยระบบจะคำนวณเงินเดือน, สวัสดิการ (ค่าเดินทาง, ค่าอาหาร, ค่ากะดึก, ค่าอาหาร OT) ให้อัตโนมัติ รองรับการบันทึกแบบ Single-day และ Batch Edit (หลายวัน)

## Current State
- บันทึกโค้ดเวอร์ชันล่าสุดพร้อมระบบ Debounced Cloud Sync
- ผ่านการทดสอบอัตโนมัติ 100% (29/29 assertions ใน `tests/calc-tests.html`)
- Cache version ล่าสุด: `sw.js` (`ot-v72`), `style.css` (`?v=156`), `ui.js` (`?v=54`), `app.js` (`?v=49`), `data.js` (`?v=47`), `cloud.js` (`?v=4`)

## Recent Changes (เซสชันล่าสุด)
1. **GitHub Gist Debounced Auto-Sync & Concurrency Protection (`js/cloud.js` & `js/data.js`):**
   - แก้ไขปัญหาความเสี่ยงชน GitHub Secondary Rate Limit (HTTP 429 / 403) จากการยิง Auto-Sync ถี่เกินไป
   - เพิ่มฟังก์ชัน `triggerAutoCloudSync(delayMs)` หน่วงเวลารวบยอด 3 วินาที (Debounce 3,000ms) ก่อนส่งขึ้น Gist
   - มีระบบล็อกสถานะ In-Flight (`isCloudSyncing`) ป้องกันการส่ง Concurrent Request ซ้อนกัน และมีคิวรวบยอด (`hasPendingCloudSync`) ส่งข้อมูลล่าสุดต่ออัตโนมัติเมื่อ Request ก่อนหน้าเสร็จสิ้น
   - ปรับปรุง `refreshHistory()` ใน `js/data.js` ให้เรียกผ่าน `triggerAutoCloudSync()` แทนการยิงตรงทันที
   - เพิ่มการดักจับข้อผิดพลาดกรณีชน Rate Limit ของ GitHub อย่างนุ่มนวล
2. **Cache Busting & PWA Sync:**
   - อัปเดต `sw.js` เป็น `ot-v72`
   - อัปเดต `index.html` (`data.js?v=47`, `cloud.js?v=4`)
   - ผ่านการทดสอบ `tests/calc-tests.html` 29/29 ครบถ้วน 100%

## Pending Tasks / Next Steps
- ติดตามการทำงานของ Auto-Sync เมื่อมีการแก้ไขข้อมูลในสถานการณ์จริง

## Open Issues / Notes
- **เรื่อง Cache บนมือถือ (PWA):** หากยังเห็นเวอร์ชันเดิม ให้กดรีเฟรช 1 ครั้ง Service Worker ตัวใหม่ `ot-v72` จะโหลดโค้ดเวอร์ชันล่าสุดทันที


