# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
พนักงานทั่วไปที่ต้องการจดและคำนวณ OT และเงินเดือนของตัวเอง

## Product Purpose
แอปพลิเคชันจัดการและคำนวณโอที (OT) ที่ให้ความเป็นส่วนตัวสูงสุด ข้อมูลทั้งหมดจะถูกเก็บไว้ในเครื่องของผู้ใช้เท่านั้น (Privacy First) โดยไม่มีการส่งข้อมูลไปยังฐานข้อมูลหลังบ้าน

## Positioning
Standalone PWA แบบ Client-side 100% ที่ทำงานออฟไลน์ได้ รวดเร็ว และไม่มีการเก็บข้อมูลส่วนตัวบนเซิร์ฟเวอร์ภายนอก

## Operating Context
ใช้งานบนสมาร์ทโฟนหรือเบราว์เซอร์ผ่าน PWA เพื่อบันทึกชั่วโมงการทำงาน โควตาวันหยุด และรายได้เพิ่มเติมแบบรายวัน/เดือน

## Capabilities and Constraints
- ปัจจุบันใช้ HTML, CSS และ Vanilla JS แต่สามารถพิจารณาใช้ Framework (เช่น React/Vite หรือ Svelte) ได้ในอนาคตหากแอปมีความซับซ้อนขึ้น
- ข้อมูลทั้งหมดต้องเก็บลง LocalStorage และสามารถสำรอง/กู้คืนผ่านระบบ Import/Export ได้เสมอ
- ต้องเป็น PWA และมีระบบ Cache Busting ทุกครั้งที่มีการอัปเดตไฟล์เพื่อให้ Service Worker ดึงไฟล์เวอร์ชันล่าสุดเสมอ

## Brand Commitments
- ธีมสี Dark/Auto สไตล์ Raycast (Deep dark surfaces #1c1c1e, warm Apple system colors) เน้นความพรีเมียม สวยงาม และใช้งานง่าย
- UI องค์ประกอบแบบ Card-style buttons และมีการใช้ Micro-animations ในการตอบสนองผู้ใช้

## Evidence on Hand
- โค้ดฐาน (index.html, style.css, js/data.js) และ PWA Service Worker (sw.js)
- ระบบ Import ข้อมูลรองรับโครงสร้างแบบ multi-rate rates array

## Product Principles
1. **Absolute Privacy:** ข้อมูลผู้ใช้เป็นของผู้ใช้ ให้อยู่เฉพาะในอุปกรณ์เท่านั้น
2. **Lightweight & Fast:** เบา โหลดเร็ว ไม่พึ่งพา Framework หรือ Dependencies ภายนอก
3. **Premium Craft:** หน้าตาต้องดูพรีเมียม (สไตล์ Raycast) และใช้งานง่ายในทุกมิติ
