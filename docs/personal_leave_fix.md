# 📝 Walkthrough: Personal Leave Bug Fix

## 🎯 Goal
แก้ไขข้อผิดพลาดในระบบคำนวณ (bug) ที่ทำให้การลาประเภท "ลากิจ (ไม่รับค่าจ้าง)" ที่กรอกผ่านหน้าต่างตั้งค่า (`pp_personal`) ไม่ถูกนำมาหักเงินเดือนใน `calc.js` ซึ่งส่งผลให้ชุดทดสอบใน `tests/calc-tests.html` แจ้งเตือนข้อผิดพลาด (Failed Test)

## ✨ Changes Made
- **File:** `js/calc.js`
- **Description:** 
  - แก้ไขตัวแปร `ppPersonalUnpaid` ให้บวกค่าของ `getPerPeriod('pp_personal', label)` (ค่าลากิจที่กรอกจากการตั้งค่า) เข้าไปด้วย แทนที่จะใช้แค่ `calLeave.personal_unpaid` (ค่าลากิจที่เลือกผ่านปฏิทิน) อย่างเดียว
  - ส่งผลให้ยอดวันลาที่ไม่ได้รับค่าจ้างทั้งหมดรวมกันอย่างถูกต้องและถูกนำไปคำนวณหักเงินเดือนในตัวแปร `unpaidLeaveDays` ได้ตรงตามลอจิกที่ออกแบบไว้
  - ชุดทดสอบ "ลากิจ 1 วัน → หัก 400, เหลือ 11600" ผ่านเรียบร้อยแล้ว
- **Commit & Push:** ทำการ commit และ push ขึ้น Github ตาม Project Rules แล้ว

## ✅ Validation
- รันและตรวจสอบ `tests/calc-tests.html` แล้ว ทั้งหมดผ่าน 100% (ไม่มีแจ้งเตือน Fail)
- ไม่กระทบกับฟีเจอร์อื่นๆ 
