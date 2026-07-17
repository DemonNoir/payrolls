# 📝 HANDOFF: ปฏิทิน OT V2

## 🎯 Project Overview
แอป PWA (Progressive Web App) สำหรับบันทึกชั่วโมง OT, คำนวณรายได้สุทธิ, สวัสดิการ, และสรุปรายปี
- **Tech Stack:** HTML, CSS (Vanilla), JavaScript (Vanilla)
- **Architecture:** ไม่มี Backend เก็บข้อมูลทั้งหมดลง `localStorage` แบบ Offline-first
- **Mobile-First:** ออกแบบ UI สำหรับใช้งานบนมือถือเป็นหลัก

## 🟢 Current State
- **เวอร์ชันล่าสุด:** `?v=28` / `CACHE='ot-v16'` (Network-First Strategy)
- สถานะแอปสมบูรณ์มาก มีระบบป้องกันบั๊กถดถอยด้วยชุดทดสอบ (`tests/calc-tests.html`) และเอกสารสถาปัตยกรรม (`ARCHITECTURE.md`) ที่อธิบาย Business Rules ไว้อย่างชัดเจน

## ✨ Recent Changes (เซสชันล่าสุด)
1. **แก้ไข Label อัตราค่าแรง OT (v28):**
   - Dashboard: เปลี่ยน label จาก "อัตราค่าแรง OT" เป็น "อัตราค่าจ้างฐาน/ชม." เพื่อไม่ให้สื่อผิด
   - Entry Modal: แก้ preview ให้แสดง effective_rate = base × multiplier (เปลี่ยนตาม 1.0x/1.5x/3.0x ทันที)
   - Calendar footer + sub-header: แก้ label ให้สอดคล้อง
2. **Per-day Night Shift System (v27):**
   - ถอด Global Setting `night_shift_enabled` (สัปดาห์นี้เข้ากะดึก) แบบเหมาทั้งรอบบิลออก
   - เปลี่ยนให้ผู้ใช้เลือก `🌙 เข้ากะดึก (ได้รับค่ากะดึก)` เป็นรายวัน/สัปดาห์ได้โดยตรงจาก Modal ในหน้าปฏิทินแทน (แก้ปัญหาผู้ที่เข้ากะสลับสัปดาห์)
   - ปรับลอจิก `calc.js` ให้นับ `nightShiftDays` จริงจากวันที่เลือก
3. **Service Worker (Network-First):**
   - อัปเดต `sw.js` กลยุทธ์จาก Cache-First เป็น Network-First เพื่อให้มั่นใจว่าเมื่อมีการแก้โค้ด ผู้ใช้แค่ Refresh หน้าเว็บในมือถือก็จะได้อัปเดตทันที
4. **Leave System Redesign (แยกระบบวันหยุด):**
   - แยกกระเป๋าวันหยุดออกเป็น **"สลับหยุด (OT Swap)"** และ **"ลาพักร้อน (Annual Leave)"** อย่างชัดเจนทั้งในหน้าปฏิทินและ Dashboard
   - ปรับให้ผู้ใช้กรอกยอด **"ลาพักร้อนสุทธิปัจจุบัน"** ลงในหน้าตั้งค่าได้เลย โดยระบบจะทำการหักลบ (Reverse-calculate) กับยอด 4 ชม./เดือนให้เองแบบอัตโนมัติ ทำให้ผู้ใช้เก่าที่ทำงานมานานสามารถกรอกยอดยกมาได้โดยสูตรในอนาคตไม่เพี้ยน
5. **Diligence & Service Award Logic (คืนค่าตามยูสเซอร์สั่ง):**
   - พูดคุยเรื่อง "เบี้ยขยัน" และ "รางวัลอายุงาน" ที่กระโดดขึ้นมาตั้งแต่วันแรกในโหมด "เรียลไทม์"
   - ยูสเซอร์ **ยืนยันให้แสดงเป็นเงินก้อนเต็ม (Lump-sum / All-or-nothing)** ตามเดิม โดยไม่ต้องนำมาหารตามจำนวนวัน (No Prorating) เหมือนกับค่าเช่าบ้าน
   - ย้ำ! ห้ามเปลี่ยนสูตรนี้เด็ดขาดเว้นแต่ยูสเซอร์จะสั่ง

## 🚀 Pending Tasks / Next Steps
- (รอผู้ใช้กำหนดทิศทางเพิ่มเติมในเซสชันถัดไป) อาจจะมีการปรับปรุง UI ส่วนอื่นๆ หรือเพิ่มฟีเจอร์ใหม่ตามคำขอของผู้ใช้งาน
- **Pre-existing test failure:** `tests/calc-tests.html` test "ลากิจ 1 วัน → หัก 400, เหลือ 11600" — ต้องตรวจสอบว่า test case หรือ code ที่ผิด (เกี่ยวกับ pp_personal vs personal_unpaid logic)

## ⚠️ Open Issues / Notes (สำคัญมากสำหรับ Agent ถัดไป)
1. **อ่าน `ARCHITECTURE.md` ก่อนเสมอ:** หากต้องการแก้ไข `calc.js` หรือตรรกะการคำนวณ **ต้อง** อ่านกฎในไฟล์นี้ก่อน และเมื่อแก้ไขเสร็จ ต้องรัน `tests/calc-tests.html` ให้ผ่าน 100% ทุกครั้ง
2. **อย่าลืม Bump Version:** ทุกครั้งที่มีการแก้โค้ด JS/CSS จะต้องไปเปลี่ยน `?v=XX` ใน `index.html` และเปลี่ยนตัวแปร `CACHE` ใน `sw.js` เสมอ เพื่อบังคับให้ผู้ใช้บนมือถือโหลด Cache ใหม่ (ปัจจุบัน v28 / ot-v16)
3. **การออกแบบ UI:** ผู้ใช้ชอบดีไซน์แนว Modern, Glassmorphism และ Micro-animations (พรีเมียมระดับโลก)
4. เมื่อทำงานเสร็จในแต่ละเซสชัน ให้ทำ Walkthrough และ Commit/Push ขึ้น GitHub ด้วยเสมอ (ตาม Project Rules)

