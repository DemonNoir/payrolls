# Walkthrough: ระบบบังคับสำรองข้อมูลทุก 7 วัน

## สิ่งที่เปลี่ยนแปลง

### ไฟล์ที่แก้ไข (7 ไฟล์)

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| [style.css](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/css/style.css) | เพิ่ม `.bak-reminder-overlay` styles ทั้งหมด (~130 บรรทัด) |
| [index.html](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/index.html) | เพิ่ม overlay HTML + อัปเดต banner text + bump v39→v40 |
| [utils.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/utils.js) | threshold 15→7 วัน + เพิ่ม `checkForcedBackupReminder()` + `closeForcedBackupReminder()` |
| [data.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/data.js) | เรียก `closeForcedBackupReminder()` หลัง export สำเร็จ |
| [ui.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/ui.js) | `renderAll()` เรียก `checkForcedBackupReminder()` |
| [app.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/js/app.js) | wire `bakReminderExportBtn` → `exportData` + เรียก init |
| [sw.js](file:///Users/ginkless/ไม่มีชื่อโฟลเดอร์/payrolls/sw.js) | bump cache: `ot-v27` → `ot-v28` |

---

## วิธีทำงานของระบบ

```
เปิดแอป / เปลี่ยนหน้า
        ↓
checkForcedBackupReminder()
        ↓
last_export_ts >= 7 วัน? ──── ไม่ใช่ ──→ ปิด overlay (ใช้งานปกติ)
        │ ใช่
        ↓
แสดง popup บังคับ (z-index: 99999)
ปิดทับทุกอย่าง — ไม่มีปุ่ม X
        │
        ↓ กด "สำรองข้อมูลเดี๋ยวนี้"
        │
exportData() → ดาวน์โหลด .json → markExported() → closeForcedBackupReminder()
        ↓
ใช้งานแอปต่อได้ปกติ
```

---

## Design ของ Popup

- **กล่อง**: Glassmorphism, `border-radius: 24px`, shadow เข้มพร้อม orange border glow
- **Top bar**: gradient shimmer สีส้ม-ทอง ไหลไปมาตลอด
- **ไอคอน 🔒**: pulse animation ขยายและ glow ทุก 1.8 วินาที
- **Badge วัน**: แสดงจำนวนวันที่ค้างสำรอง เช่น "ยังไม่ได้สำรองมา 8 วันแล้ว!"
- **ปุ่ม**: gradient ส้ม-ทอง, hover shimmer, active scale down
- **z-index: 99999**: บังทุก overlay อื่นในแอป

---

## วิธีทดสอบ

### ทดสอบ popup โผล่
```javascript
// เปิด DevTools Console แล้วรัน:
localStorage.setItem('last_export_ts', String(Date.now() - 8 * 86400000))
// แล้ว reload หน้า → popup จะโผล่ทันที
```

### ทดสอบ popup ปิดหลัง export
1. กด "📤 สำรองข้อมูลเดี๋ยวนี้" ใน popup
2. ไฟล์ .json ถูก download
3. popup ปิด → ใช้งานแอปได้ปกติ

### ทดสอบ user ใหม่ (ไม่เคย backup เลย)
```javascript
localStorage.removeItem('last_export_ts')
// reload → badge จะแสดง "ยังไม่เคยสำรองข้อมูลเลย!"
```

---

## Git Commit

```
feat: add mandatory 7-day backup popup (forced, no dismiss)
Commit: 0e362e5
Branch: main → DemonNoir/payrolls
```
