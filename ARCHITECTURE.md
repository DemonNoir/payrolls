# 🏗️ ARCHITECTURE.md — ปฏิทิน OT V2

> **⚠️ สำหรับนักพัฒนาทุกคน (รวมถึง AI Agent):**
> อ่านไฟล์นี้ให้จบก่อนแก้ไขโค้ด — โดยเฉพาะ `calc.js`

---

## ภาพรวมโปรเจกต์

แอป PWA (Progressive Web App) บันทึกชั่วโมง OT, คำนวณรายได้สุทธิ, และแสดงสรุปรายรอบบิล/รายปี
- ไม่มี Backend — ใช้ `localStorage` เก็บข้อมูลทั้งหมด
- ออกแบบมาสำหรับมือถือเป็นหลัก (Mobile-first)
- ทำงานแบบ Offline ผ่าน Service Worker

---

## โครงสร้างไฟล์

```
payrolls/
├── index.html          ← HTML หลัก (UI ทั้งหมดอยู่ในไฟล์เดียว)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker + cache version
├── css/
│   └── style.css       ← สไตล์ทั้งหมด (Light + Dark theme)
├── js/
│   ├── utils.js        ← ฟังก์ชันพื้นฐาน, localStorage helpers, holidays
│   ├── calc.js         ← ⚠️ สูตรคำนวณทั้งหมด (หัวใจของแอป)
│   ├── ui.js           ← Render หน้า (ปฏิทิน, แดชบอร์ด, สรุป, รายปี)
│   ├── settings.js     ← เปิด/ปิด/บันทึกหน้าตั้งค่า + entry overlay
│   ├── data.js         ← Import/Export ข้อมูล + validation
│   └── app.js          ← Event wiring + initialization
├── icons/              ← ไอคอน PWA
└── tests/
    └── calc-tests.html ← ⚠️ ชุดทดสอบ — ต้องรันทุกครั้งหลังแก้ calc.js
```

---

## 🔴 Business Rules ที่ห้ามแตะโดยไม่เข้าใจ

### 1. `getHourlyRate()` — สูตรค่าแรง OT ต่อชั่วโมง
**ไฟล์:** `calc.js`

```
สูตร: Math.ceil((เงินเดือน + KPI เงิน) ÷ 30 ÷ 8 × 100) ÷ 100
```

| ส่วน | ค่าคงที่ | เหตุผล |
|------|---------|--------|
| `÷ 30` | เสมอ | ตามสลิปบริษัท (ไม่ใช่จำนวนวันจริงในเดือน) |
| `÷ 8` | เสมอ | 8 ชม./วัน ตามกฎหมายแรงงาน |
| `Math.ceil` | เสมอ | ปัดขึ้นตามสลิปบริษัท |

> **❌ ห้าม:** เปลี่ยน `Math.ceil` เป็น `Math.round` หรือ `Math.floor`
> **❌ ห้าม:** เปลี่ยน 30 เป็น `daysInMonth()`

---

### 2. `autoDays` — นับวันทำงาน (สำหรับสวัสดิการ)
**ไฟล์:** `calc.js` → `periodStats()`

```javascript
var isWorkingDay = (cur.getDay()!==0 && !isHolidayKey(k));
if ((isWorkingDay || hasOt) && isEmployed && countForRealtime) autoDays++;
```

**กฎ:** นับเมื่อ `วันทำงานปกติ` **หรือ** `มีบันทึก OT`

> **❌ ห้าม:** เปลี่ยน `||` เป็น `&&` — จะทำให้วันหยุดที่ทำ OT ไม่ได้สวัสดิการ
> **❌ ห้าม:** รวม `isWorkingDay` กับ `hasOt` เป็นเงื่อนไขเดียว

**บั๊กที่เคยเกิด:**
- **2026-06-27:** เขียน `(getDay()!==0 && (!isHolidayKey(k) || hasOt))` → วันอาทิตย์ที่ทำ OT ไม่ถูกนับ → ไม่ได้ค่าเดินทาง/ค่าอาหาร

---

### 3. Prorate — พนักงานที่ไม่ได้ทำงานเต็มรอบ
**ไฟล์:** `calc.js` → `periodStats()`

```
proratedSalary = Min(เงินเดือน, (เงินเดือน ÷ 30) × จำนวนวันที่ทำงาน)
```

> **⚠️ สำคัญ:** หาร 30 เสมอ ไม่ใช่ `totalDaysInPeriod`
> **⚠️ สำคัญ:** ใช้ `Math.min` ป้องกันกรณีวันทำงาน > 30

---

### 4. หักลา
| ประเภท | หักเงินเดือน? | หักเบี้ยขยัน? |
|--------|:------------:|:------------:|
| ลาป่วย | ❌ ไม่หัก | ✅ หัก (= 0) |
| ลากิจ | ✅ หัก (เงินเดือน/30 ต่อวัน) | ✅ หัก (= 0) |
| ขาดงาน | ✅ หัก (เงินเดือน/30 ต่อวัน) | ✅ หัก (= 0) |

> **⚠️ สำคัญ:** หักจาก `st.salaryBase` (ฐานเดิม) ไม่ใช่ `proratedSalary`

---

### 5. ประกันสังคม
```
socialSecurity = Min(750, Math.floor(proratedSalary × 0.05))
```

> **❌ ห้าม:** เปลี่ยน `Math.floor` เป็น `Math.round`
> **❌ ห้าม:** เปลี่ยนเพดาน 750 โดยไม่ตรวจสอบกับประกาศราชกิจจาฯ

---

### 6. OT Food (ค่าอาหาร OT)
นับเฉพาะวันที่ทำ OT **>= 2 ชั่วโมง** (ดู `calc.js` บรรทัด `otFoodDays++`)

> **⚠️ สำคัญ:** แยกจาก `autoDays` — ไม่ได้คูณจากวันทำงาน

---

### 7. Calc Mode — realtime vs overall
| โหมด | พฤติกรรม |
|------|---------|
| `realtime` | คำนวณ OT และสวัสดิการถึงแค่วันนี้ |
| `overall` | คำนวณเต็มรอบบิล (รวมวันอนาคต) |

> **⚠️ สำคัญ:** ตัวแปร `countForRealtime` ควบคุมทั้ง OT loop และ autoDays loop

---

## ลำดับการโหลดไฟล์ JS

```
utils.js → calc.js → ui.js → settings.js → data.js → app.js
```

ทุกไฟล์ใช้ Global Scope — ลำดับสำคัญมาก!
- `calc.js` ต้องมาหลัง `utils.js` (ใช้ `num()`, `getLS()`, `dateKey()`, etc.)
- `app.js` ต้องมาสุดท้าย (wire events + init)

---

## Cache Versioning

ทุกครั้งที่แก้ไขโค้ด **ต้อง bump version** ใน 3 ที่:
1. `sw.js` → `const CACHE='ot-vXX';`
2. `index.html` → `<link href="css/style.css?v=XX">`
3. `index.html` → `<script src="js/xxx.js?v=XX">` (ทุกไฟล์)

> **ถ้าลืม bump** → ผู้ใช้บนมือถือจะยังได้โค้ดเก่าจาก cache

---

## localStorage Keys

| Key | ค่า | หมายเหตุ |
|-----|-----|---------|
| `ot_cal` | JSON string | ข้อมูล OT ทั้งหมด (key = YYYY-MM-DD) |
| `ot_salary` | number | เงินเดือนหลัก |
| `ot_cutoff` | 1-31 | วันตัดรอบ |
| `payday` | 1-31 | วันเงินออก |
| `calc_mode` | `realtime` / `overall` | โหมดการคำนวณ |
| `holidays` | JSON array | วันหยุดนักขัตฤกษ์ |
| `kpi_bonus_pct:LABEL` | number | KPI Bonus ต่อรอบบิล |
| `pp_*:LABEL` | number | ข้อมูลลา/หักต่อรอบบิล |

---

## ⚙️ วิธีทดสอบ

หลังแก้ไข `calc.js` ทุกครั้ง:

1. เปิด `tests/calc-tests.html` ในเบราว์เซอร์
2. ตรวจว่า **ทั้งหมดผ่าน** (✅ สีเขียว)
3. ถ้ามี ❌ แดง → **ห้าม push** จนกว่าจะแก้ให้ผ่านครบ

---

## 📋 Checklist ก่อน Push โค้ด

- [ ] อ่าน ARCHITECTURE.md แล้ว
- [ ] รัน `tests/calc-tests.html` ผ่านทั้งหมด
- [ ] Bump cache version ใน `sw.js` + `index.html` แล้ว
- [ ] ไม่ได้เปลี่ยนค่าคงที่ (30, 8, 750, Math.ceil, Math.floor) โดยไม่ได้ตั้งใจ
- [ ] Comment อธิบาย "ทำไม" ในทุก Business Rule ที่แก้ไข
