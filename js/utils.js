var MN=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var MS=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function $(id){return document.getElementById(id)}
function num(v){var n=Number(v);return isNaN(n)?0:n}
function pad(n){return n<10?'0'+n:''+n}
function keyOf(y,m,d){return y+'-'+pad(m+1)+'-'+pad(d)}
function dateKey(dt){return keyOf(dt.getFullYear(),dt.getMonth(),dt.getDate())}
function parseDateKey(k){var p=String(k).split('-');return new Date(num(p[0]),num(p[1])-1,num(p[2]))}
function addDays(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate()}
function money(v){return num(v).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท'}
function hours(v){return num(v).toLocaleString('th-TH',{maximumFractionDigits:1})}

function getLS(k){return localStorage.getItem(k)}
function setLS(k,v){localStorage.setItem(k,String(v))}
function getNum(k,fb,def){
  var v=getLS(k);
  if((v===null||v==='')&&fb)v=getLS(fb);
  if(v===null||v==='')return num(def);
  return num(v);
}
function getBool(k,def){var v=getLS(k);if(v===null)return !!def;return v==='1'||v==='true'}
function setBool(k,v){setLS(k,v?'1':'0')}

function getCal(){try{return JSON.parse(getLS('ot_cal')||'{}')||{}}catch(e){return {}}}
function setCal(d){localStorage.setItem('ot_cal',JSON.stringify(d||{}))}
function getHolidays(){try{var h=JSON.parse(getLS('holidays')||'[]');return Array.isArray(h)?h:[]}catch(e){return []}}
function setHolidays(h){localStorage.setItem('holidays',JSON.stringify((h||[]).sort(function(a,b){return String(a.date).localeCompare(String(b.date))})))}

function radVal(n){var r=document.getElementsByName(n);for(var i=0;i<r.length;i++)if(r[i].checked)return r[i].value;return null}
function setRad(n,v){var r=document.getElementsByName(n);for(var i=0;i<r.length;i++)r[i].checked=String(r[i].value)===String(v)}

function isHolidayKey(k){
  if(parseDateKey(k).getDay()===0)return true;
  return getHolidays().some(function(h){return h.date===k});
}
function holidayName(k){
  var h=getHolidays().find(function(x){return x.date===k});
  if(h)return h.name;
  if(parseDateKey(k).getDay()===0)return 'วันหยุดประจำสัปดาห์';
  return '';
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* ── KPI Bonus per period ── */
function kpiBonusKey(label){return 'kpi_bonus_pct:'+label}
function getKpiBonusPct(label){
  var v=getLS(kpiBonusKey(label));
  if(v===null||v==='')return 0;
  var n=num(v);
  return isNaN(n)?0:n;
}
function saveKpiBonusPct(label,val){
  var n=num(val);
  if(isNaN(n))n=0;
  setLS(kpiBonusKey(label),n);
}

/* ── Per-period generic storage (การลา + รายการหัก) ── */
var PP_KEYS=['pp_sick','pp_personal','pp_absent','pp_service_award','pp_tax','pp_other'];
function ppKey(prefix,label){return prefix+':'+label}
function getPerPeriod(prefix,label){
  var v=getLS(ppKey(prefix,label));
  if(v===null||v==='')return 0;
  return num(v);
}
function savePerPeriod(prefix,label,val){
  var n=num(val);
  if(isNaN(n))n=0;
  setLS(ppKey(prefix,label),n);
}

/* ── IndexedDB Auto-Backup ── */
var _idb=null;
function openIDB(cb){
  if(_idb){cb(_idb);return;}
  var req=indexedDB.open('ot_backup',1);
  req.onupgradeneeded=function(e){e.target.result.createObjectStore('snapshots',{keyPath:'id'})};
  req.onsuccess=function(e){_idb=e.target.result;cb(_idb)};
  req.onerror=function(){/* silent */};
}
function idbSave(){
  try{
    /* รวบรวมข้อมูลทั้งหมด */
    var snap={};
    for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k)snap[k]=localStorage.getItem(k);}
    openIDB(function(db){
      var tx=db.transaction('snapshots','readwrite');
      tx.objectStore('snapshots').put({id:'latest',data:JSON.stringify(snap),ts:Date.now()});
    });
  }catch(e){/* silent */}
}
function idbRestore(cb){
  openIDB(function(db){
    var req=db.transaction('snapshots','readonly').objectStore('snapshots').get('latest');
    req.onsuccess=function(){cb(req.result||null)};
    req.onerror=function(){cb(null)};
  });
}

/* ── Backup Warning (15 วัน) ── */
function markExported(){setLS('last_export_ts',String(Date.now()));}
function checkBackupWarning(){
  var el=$('backupWarn'); if(!el)return;
  var last=getLS('last_export_ts');
  if(!last){el.classList.remove('hide');return;}
  var days=(Date.now()-Number(last))/(86400000);
  el.classList.toggle('hide',days<15);
}

/* ── Leave Types Configuration ── */
var DEFAULT_LEAVE_TYPES = [
  /* Group 1: Has Quota */
  { id: "annual", name_th: "วันหยุดพักร้อนประจำปี", unit: "hours", has_quota: true, quota_total: 0, reset_cycle: "yearly", color_tag: "#e05353", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 1 },
  { id: "sick", name_th: "ลาป่วยโดยได้รับค่าจ้าง", unit: "hours", has_quota: true, quota_total: 240, color_tag: "#f2c94c", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 2 },
  { id: "personal_paid", name_th: "ลากิจธุระโดยได้รับค่าจ้าง", unit: "hours", has_quota: true, quota_total: 24, color_tag: "#27ae60", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 3 },
  { id: "swap", name_th: "สลับวันหยุด", unit: "hours", has_quota: true, quota_total: 0, color_tag: "#2d9cdb", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 4 },
  { id: "military", name_th: "ลาเพื่อรับราชการทหาร", unit: "days", has_quota: true, quota_total: 60, color_tag: "#9b51e0", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 5 },
  { id: "training", name_th: "ลาฝึกอบรม", unit: "days", has_quota: true, quota_total: 30, color_tag: "#e2b93b", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 6 },
  { id: "spousal", name_th: "ลาเพื่อช่วยเหลือคู่สมรส", unit: "days", has_quota: true, quota_total: 15, color_tag: "#5b8ee0", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 7 },
  { id: "parental", name_th: "ลาเลี้ยงดูบุตร", unit: "days", has_quota: true, quota_total: 15, color_tag: "#3aa87a", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 8 },

  /* Group 2: No Quota */
  { id: "sick_unpaid", name_th: "ลาป่วยโดยไม่ได้รับค่าจ้าง", unit: "hours", has_quota: false, color_tag: "#d4af37", is_paid: false, docks_diligence: true, visible_in_calendar: true, order: 9 },
  { id: "work_injury", name_th: "ลาบาดเจ็บจากการทำงาน", unit: "days", has_quota: false, color_tag: "#e07a5f", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 10 },
  { id: "personal_unpaid", name_th: "ลากิจธุระโดยไม่ได้รับค่าจ้าง", unit: "hours", has_quota: false, color_tag: "#81b29a", is_paid: false, docks_diligence: true, visible_in_calendar: true, order: 11 },
  { id: "marriage", name_th: "ลาแต่งงาน", unit: "days", has_quota: false, color_tag: "#f4a261", is_paid: true, docks_diligence: false, visible_in_calendar: true, order: 12 },
  { id: "sterilization", name_th: "ลาผ่าตัดทำหมัน", unit: "days", has_quota: false, color_tag: "#e76f51", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 13 },
  { id: "funeral_non_direct", name_th: "ลางานศพ(ไม่ใช่ญาติสายตรง)", unit: "days", has_quota: false, color_tag: "#264653", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 14 },
  { id: "funeral", name_th: "ลางานศพ(ญาติสายตรง)", unit: "days", has_quota: false, color_tag: "#2a9d8f", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 15 },
  { id: "suspension", name_th: "การพักงาน", unit: "days", has_quota: false, color_tag: "#6d6875", is_paid: false, docks_diligence: true, visible_in_calendar: true, order: 16 },
  { id: "production_stop", name_th: "การหยุดผลิต", unit: "days", has_quota: false, color_tag: "#b5838d", is_paid: true, wage_deduction: 0.25, docks_diligence: false, visible_in_calendar: true, order: 17 },
  { id: "recovery", name_th: "ลาพักฟื้น", unit: "hours", has_quota: false, color_tag: "#e5989b", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 18 },
  { id: "maternity", name_th: "ลาคลอด", unit: "days", has_quota: false, color_tag: "#ffb4a2", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 19 },
  { id: "ordination", name_th: "ลาบวช", unit: "days", has_quota: false, color_tag: "#ffcdb2", is_paid: true, docks_diligence: true, visible_in_calendar: true, order: 20 },
  { id: "absent", name_th: "ขาดงาน", unit: "days", has_quota: false, color_tag: "#d90429", is_paid: false, docks_diligence: true, visible_in_calendar: true, order: 21 }
];

function getLeaveTypes() {
  try {
    var stored = JSON.parse(getLS('leave_types'));
    if (Array.isArray(stored) && stored.length > 0) {
      var defaultMap = {};
      DEFAULT_LEAVE_TYPES.forEach(function(dt) { defaultMap[dt.id] = dt; });
      return stored.map(function(t) {
        var dt = defaultMap[t.id] || {};
        return Object.assign({}, dt, t);
      });
    }
  } catch(e) {}
  return DEFAULT_LEAVE_TYPES.slice();
}

function saveLeaveTypes(types) {
  setLS('leave_types', JSON.stringify(types));
}

/* ── normalizeEntry: backward-compatible adapter ──
 * แปลง entry format เก่า (single rate) → ใหม่ (rates[])
 * ถ้ามี rates[] แล้ว → คืนเดิม
 * ถ้ายัง → สร้าง rates[] จาก hours/multiplier/payType เดิม
 * ⚠️ ใช้ function นี้ทุกที่ที่ต้องอ่าน OT entry เพื่อรับประกัน compat */
function normalizeEntry(en) {
  if (!en || en.kind !== 'ot') return en;
  if (en.rates && Array.isArray(en.rates)) return en;
  // Convert old format → new format
  var r = {
    hours: num(en.hours),
    multiplier: num(en.multiplier) || 1,
    payType: en.payType || 'money'
  };
  if (en.rate) r.rate = en.rate;
  if (en.total) r.total = en.total;
  if (en.credit) r.credit = en.credit;
  if (en.kpiBonusPctAtSave !== undefined) r.kpiBonusPctAtSave = en.kpiBonusPctAtSave;
  var result = { kind: 'ot', rates: [r], isNight: !!en.isNight };
  return result;
}

/* ── totalOtHours: สรุปชั่วโมง OT รวมจาก entry ──
 * ใช้ร่วมกับ normalizeEntry */
function totalOtHours(en) {
  var ne = normalizeEntry(en);
  if (!ne || !ne.rates) return 0;
  var t = 0;
  ne.rates.forEach(function(r) { t += num(r.hours); });
  return t;
}
