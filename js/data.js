/* ── Export / Import ── */
var requiredBackupKeys = ['ot_cal','ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','sick_leave','personal_leave','absent_days','holidays','social_security','tax','other_deduction','payday','cutoff_day','service_award'];
var payrollBackupKeys = requiredBackupKeys.concat(['diligence_enabled','start_date','calc_mode','shift_schedule']);

function isPeriodBackupKey(key){
  return /^(kpi_bonus_pct:|work_days:|pp_|period_settings:)/.test(key);
}

function buildBackupData(client){
  var payload = {version:3, exported_at:new Date().toISOString(), data:{}, extra:{}};
  if(client) payload.client = client;
  payrollBackupKeys.forEach(function(key){ payload.data[key] = getLS(key); });
  getAllStorageKeys().filter(isPeriodBackupKey).forEach(function(key){ payload.extra[key] = getLS(key); });
  return payload;
}

function exportData(){
  var payload = buildBackupData();
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='ot-calendar-v3-'+dateKey(today)+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  markExported();
  checkBackupWarning();
  closeForcedBackupReminder();
}

function isBackupDate(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(parseDateKey(key)) === key;
}

function validateCal(cal){
  if(!cal||typeof cal!=='object'||Array.isArray(cal))return 'ot_cal ต้องเป็น object';
  for(var k in cal){
    if(!isBackupDate(k))return 'พบวันที่ไม่ถูกต้อง: '+k;
    var e=cal[k]; if(!e||typeof e!=='object')return 'ข้อมูลวันที่ '+k+' ไม่ถูกต้อง';
    if(e.kind==='ot'){
      if(e.rates && Array.isArray(e.rates)){
        for(var i=0; i<e.rates.length; i++){
          var r=e.rates[i];
          if(!r || !Number.isFinite(Number(r.hours)) || num(r.hours)<=0)return 'ชั่วโมง OT ของ '+k+' (ลำดับ '+(i+1)+') ไม่ถูกต้อง';
          if(['money','leave'].indexOf(r.payType)<0)return 'ประเภท OT ของ '+k+' (ลำดับ '+(i+1)+') ไม่ถูกต้อง';
          if([1,1.5,3].indexOf(num(r.multiplier))<0)return 'เรท OT ของ '+k+' (ลำดับ '+(i+1)+') ไม่ถูกต้อง';
          if(r.timing !== undefined){
            var timing = r.timing;
            var minutes = timing && otClockDuration(timing.start, timing.end, timing.breakMinutes);
            if(!Number.isInteger(minutes) || minutes <= 0 || Math.abs(minutes - Number(r.hours)*60) > 0.000001)
              return 'เวลาที่บันทึกและชั่วโมง OT ของ '+k+' ไม่ตรงกัน';
          }
        }
      }else{
        if(num(e.hours)<=0)return 'ชั่วโมง OT ของ '+k+' ไม่ถูกต้อง';
        if(['money','leave'].indexOf(e.payType)<0)return 'ประเภท OT ของ '+k+' ไม่ถูกต้อง';
        if([1,1.5,3].indexOf(num(e.multiplier))<0)return 'เรท OT ของ '+k+' ไม่ถูกต้อง';
      }
    }else if(e.kind==='use'){
      if(num(e.hours)<=0)return 'ชั่วโมงใช้วันหยุดของ '+k+' ไม่ถูกต้อง';
    }else if(e.kind==='leave'){
      if(e.days !== undefined && (!Number.isFinite(Number(e.days)) || num(e.days)<=0))return 'จำนวนวันลาของ '+k+' ไม่ถูกต้อง';
    }else return 'kind ของ '+k+' ไม่ถูกต้อง';
  }
  return '';
}
function validateHolidays(h){
  if(!Array.isArray(h))return 'holidays ต้องเป็น array';
  for(var i=0;i<h.length;i++){
    if(!h[i]||!/^\d{4}-\d{2}-\d{2}$/.test(String(h[i].date))||!String(h[i].name||'').trim())return 'ข้อมูลวันหยุดลำดับ '+(i+1)+' ไม่ถูกต้อง';
  }
  return '';
}

function parseBackupField(value, emptyValue) {
  if(value === null || value === undefined) return emptyValue;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function validateBackupPayslip(key, value) {
  var range = key.slice('pp_payslip:'.length).split('~');
  if(range.length !== 2 || !isBackupDate(range[0]) || !isBackupDate(range[1]) || range[0] > range[1])
    throw new Error('ช่วงวันที่ของสลิปไม่ถูกต้อง');
  var slip = parseBackupField(value, null);
  if(!slip || (slip.ot === null && slip.net === null) || (slip.ot !== null && (!Number.isFinite(slip.ot) || slip.ot < 0)) ||
     (slip.net !== null && !Number.isFinite(slip.net))) throw new Error('ยอดเงินในสลิปไม่ถูกต้อง');
  return typeof value === 'string' ? value : JSON.stringify(slip);
}

/* Prepare the entire restore before the confirmation dialog or any storage writes. */
function preparePayrollRestore(obj) {
  var incoming, cal, holidays, extra = {};
  if(obj && (obj.version === 3 || obj.version === 2) && obj.data){
    incoming = obj.data;
    if(obj.version === 3){
      var missing = requiredBackupKeys.filter(function(key){return !Object.hasOwn(incoming,key)});
      if(missing.length) throw new Error('ข้อมูลขาดฟิลด์: '+missing.join(', '));
      extra = obj.extra || {};
      if(typeof extra !== 'object' || Array.isArray(extra)) throw new Error('ข้อมูลรายรอบไม่ถูกต้อง');
    }
    cal = parseBackupField(incoming.ot_cal, {});
    holidays = parseBackupField(incoming.holidays, []);
  }else if(obj && obj.cal){
    incoming = {ot_salary:0, ot_cutoff:obj.cutoff, ot_bank_adj:obj.bankAdj};
    cal = obj.cal;
    holidays = [];
  }else if(obj && obj.ot_cal){
    incoming = obj;
    cal = parseBackupField(obj.ot_cal, {});
    holidays = parseBackupField(obj.holidays, []);
  }else{
    throw new Error('ไม่พบโครงสร้างข้อมูลที่รองรับ');
  }

  var err = validateCal(cal) || validateHolidays(holidays);
  if(err) throw new Error(err);
  var changes = new Map();
  payrollBackupKeys.forEach(function(key){
    if(incoming[key] !== undefined && incoming[key] !== null) changes.set(key,String(incoming[key]));
  });
  changes.set('ot_cal',JSON.stringify(cal));
  changes.set('holidays',JSON.stringify(holidays.slice().sort(function(a,b){return a.date.localeCompare(b.date)})));

  var schedule = parseBackupField(incoming.shift_schedule, {});
  if(!schedule || typeof schedule !== 'object' || Array.isArray(schedule) || Object.keys(schedule).some(function(key){
    return !isBackupDate(key) || !['day','night','off'].includes(schedule[key]);
  })) throw new Error('ตารางกะมีวันที่หรือประเภทกะไม่ถูกต้อง');
  changes.set('shift_schedule',incoming.shift_schedule == null ? null : JSON.stringify(schedule));

  // A backup predating shifts and actual payslips has no records of either kind.
  getAllStorageKeys().filter(function(key){return key.startsWith('pp_payslip:')}).forEach(function(key){changes.set(key,null)});
  Object.keys(extra).filter(isPeriodBackupKey).forEach(function(key){
    if(extra[key] === null) return;
    changes.set(key,key.startsWith('pp_payslip:') ? validateBackupPayslip(key,extra[key]) : String(extra[key]));
  });
  [['social_security','ot_ss'],['tax','ot_tax'],['other_deduction','ot_other']].forEach(function(pair){
    if(incoming[pair[0]] !== undefined) changes.set(pair[1],String(incoming[pair[0]]));
  });
  return {changes:changes, legacyRate:incoming.ot_rate && num(incoming.ot_rate)>0 && num(incoming.ot_salary)<=0};
}

function restorePayrollBackup(changes) {
  var previous = new Map();
  try {
    changes.forEach(function(value,key){
      var old = localStorage.getItem(key);
      if(old === value) return;
      if(value === null) localStorage.removeItem(key);
      else localStorage.setItem(key,value);
      previous.set(key,old);
    });
  } catch(error) {
    // Free space occupied by the partial restore before putting old values back.
    previous.forEach(function(old,key){ localStorage.removeItem(key); });
    previous.forEach(function(old,key){ if(old !== null) localStorage.setItem(key,old); });
    throw error;
  }
  lastShiftPatternBackup = null;
}

function importFile(ev){
  var f=ev.target.files[0]; if(!f)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var backup = preparePayrollRestore(JSON.parse(e.target.result));
      if(!confirm('นำเข้าข้อมูลจะแทนที่ข้อมูลปัจจุบันทั้งหมด ดำเนินการต่อ?'))return;
      restorePayrollBackup(backup.changes);
      /* Migration: ถ้า v2 มี ot_rate แต่ไม่มี ot_salary ให้แจ้ง */
      if(backup.legacyRate){
        alert('กู้คืนข้อมูลเรียบร้อย\n\n⚠️ พบข้อมูลจากระบบเดิม (ot_rate)\nกรุณากรอก "เงินเดือน (บาท/เดือน)" ใหม่ในเมนูตั้งค่า เพื่อให้คำนวณค่าแรงได้ถูกต้อง');
      }else{
        alert('กู้คืนข้อมูลเรียบร้อย');
      }
      closeSettings();currentPeriod=periodFor(today);renderAll();
    }catch(err){alert('ไฟล์ไม่ถูกต้อง: '+err.message)}
  };
  reader.readAsText(f); ev.target.value='';
}

function refreshHistory(){
  var months = {}, weeks = {};
  var dates = new Set(Object.keys(getCal()).concat(Object.keys(getShiftSchedule())));
  dates.forEach(function(key){
    var day = parseDateKey(key), start = weekStart(day);
    var month = key.slice(0, 7), week = dateKey(start);
    if (!months[month]) months[month] = monthStats(day.getFullYear(), day.getMonth());
    if (!weeks[week]) weeks[week] = periodStats({start:start, end:addDays(start, 6)});
  });
  localStorage.setItem('monthly_history',JSON.stringify(months));
  localStorage.setItem('weekly_history',JSON.stringify(weeks));
  idbSave(); /* auto-backup ทุกครั้งที่มีการเปลี่ยนแปลง */
  if(typeof triggerAutoCloudSync === 'function'){
    triggerAutoCloudSync();
  }
}
