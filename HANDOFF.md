# Handoff: Payrolls (OT Calendar V2)

## Project Overview
โปรเจกต์ "ปฏิทิน OT V2" สำหรับจัดการบันทึกเวลาทำงานล่วงเวลา (OT), ลางาน, กะดึก และวันหยุดนักขัตฤกษ์ 
พัฒนาด้วย HTML, CSS, JavaScript แบบ Static Web App และเก็บข้อมูลใน `localStorage` ของเบราว์เซอร์

## Current State
การพัฒนาในเซสชันล่าสุดเสร็จสิ้นการแก้บั๊ก UI และปรับปรุงฟอร์ม Batch Edit ให้ทำงานได้สมบูรณ์ ผู้ใช้มีความต้องการใหม่ที่เป็นฟีเจอร์ขนาดใหญ่ คือการรองรับ **2 อัตรา OT ในวันเดียวกัน** (เช่น 1x 8 ชั่วโมง และ 3x 2 ชั่วโมง) ซึ่งต้องทำการ Refactor โครงสร้างข้อมูลและการคำนวณใหม่

## Recent Changes (เซสชันล่าสุด)
ในเซสชันล่าสุดได้แก้ไขและปรับปรุงไฟล์ต่างๆ ดังนี้ (`index.html`, `js/ui.js`, `js/settings.js`):
1. **Batch Edit UI Fixes:**
   - แก้ไขแถบ `multiSelectActionBar` บังปุ่มบันทึกเวลาเปิด Modal
   - รีเซ็ตค่าฟอร์มกลับเป็นค่าเริ่มต้นเสมอเมื่อเปิด Batch Edit
   - แก้ไขการสลับฟอร์มระหว่าง OT และ ใช้วันหยุด (แก้บั๊ก radio button toggle)
   - ดึงข้อมูล dropdown ประเภทวันลามาแสดงผลได้ถูกต้อง (แก้ `name` เป็น `name_th`)
2. **Long-press Bug Fix:**
   - เพิ่ม Threshold ระยะทาง 10px สำหรับ touch event เพื่อป้องกันไม่ให้การสั่นของนิ้วมือยกเลิกการกดค้าง (long-press) เร็วเกินไป
3. **Holiday & Night Shift Logic:**
   - ปรับโครงสร้าง HTML ของ Batch Edit ให้มี 3 ตัวเลือกหลัก: ทำ OT, ใช้วันหยุด, ตั้งเป็นวันหยุดนักขัตฤกษ์
   - เปลี่ยนให้การตั้งกะดึก (Night shift) เป็นการ Merge `isNight: true` เข้ากับข้อมูลเดิมแทนที่จะลบข้อมูลเก่าทิ้ง
   - บันทึกวันหยุดนักขัตฤกษ์แยกลงใน `holidays` (ผ่านฟังก์ชันใน `utils.js`)
4. **Multiplier Rules:**
   - ซ่อนตัวเลือก 1.5x ออกจาก Modal ทั้งแบบวันเดียว (Single Entry) และหลายวัน (Batch Edit) หากวันที่เลือกเป็นวันหยุด (วันอาทิตย์หรือวันนักขัตฤกษ์) โดยให้ Default เป็น 3x แทน

## Pending Tasks / Next Steps (งานที่ต้องทำต่อ)
- **[MAJOR FEATURE] รองรับหลายอัตรา OT ในวันเดียว:**
  - **Data Structure Refactoring:** เปลี่ยนโครงสร้างข้อมูลใน `ot_cal` (localStorage) จากที่เก็บ `hours` และ `multiplier` เดี่ยวๆ ให้เป็น array ของ rates เช่น `rates: [{ hours: 8, multiplier: 1 }, { hours: 2, multiplier: 3 }]`
  - **Calculation Update:** แก้ไขสูตรคำนวณในไฟล์ `js/calc.js` ให้ลูปผ่าน array `rates` แทนการดึงค่าตรงๆ
  - **UI Update:** ปรับปรุงหน้าจอแก้ไขเดี่ยว (`openEntryModal`) และแบบกลุ่ม (`openBatchEdit`) ให้สามารถเพิ่มอัตรา OT ได้มากกว่า 1 แบบ

## Open Issues / Notes
- **ข้อควรระวังเรื่องการคำนวณ:** ไฟล์ `calc.js` เป็นหัวใจสำคัญ หากแก้ไขฟีเจอร์เพิ่มอัตราหลายแบบ ต้องตรวจสอบการทำงานของการสรุปยอดรวม (Total) ให้ละเอียด
- **Data Migration:** หากเปลี่ยนโครงสร้างข้อมูลใน `localStorage` อาจต้องเขียนสคริปต์สั้นๆ ในการ Migrate ข้อมูลเก่า (ถ้ามี) ของผู้ใช้ให้เข้ากับรูปแบบใหม่ `rates` เพื่อป้องกันแอปพัง
