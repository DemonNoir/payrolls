/* ── Open Entry ── */
function openEntry(k){
  activeKey=k;
  var st=settings();
  if(st.salaryBase<=0){alert('กรุณาตั้งเงินเดือน (บาท/เดือน) ก่อนในเมนูตั้งค่า');openSettings();return}
  var d=parseDateKey(k), W=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  $('entryTitle').innerText='วัน'+W[d.getDay()]+' ที่ '+d.getDate()+' '+MN[d.getMonth()]+' '+(d.getFullYear()+543)+(holidayName(k)?' · '+holidayName(k):'');
  var en=getCal()[k], kind=en?en.kind:'ot';
  setRad('entryKind',kind);toggleEntryFields();
  if(en&&en.kind==='ot'){
    $('entryHours').value=en.hours;setRad('multiplier',num(en.multiplier));setRad('payType',en.payType||'money');
  }else{
    $('entryHours').value='';setRad('multiplier',isHolidayKey(k)?3:1.5);setRad('payType','money');
  }
  $('useHours').value=(en&&en.kind==='use')?en.hours:'';
  $('availableBank').innerText=hours(totalBank(k));
  $('deleteEntryBtn').style.display=en?'block':'none';
  previewEntry();
  $('entryOverlay').classList.add('show');
}

function closeEntry(){$('entryOverlay').classList.remove('show');activeKey=null}

function toggleEntryFields(){
  var isOt=radVal('entryKind')==='ot';
  $('otFields').classList.toggle('hide',!isOt);
  $('useFields').classList.toggle('hide',isOt);
}

/* ── Preview: ใช้ rate จาก period ปัจจุบัน ── */
function previewEntry(){
  if(radVal('entryKind')==='ot'){
    var h=num($('entryHours').value), m=num(radVal('multiplier')), pt=radVal('payType');
    var curLabel=periodLabel(currentPeriod);
    var kpiBonusPct=getKpiBonusPct(curLabel);
    if(isNaN(kpiBonusPct))kpiBonusPct=0;
    var rate=getHourlyRate(kpiBonusPct);
    $('entryPreview').innerText=pt==='money'?'= '+money(rate*h*m)+' (อัตรา '+rate.toLocaleString('th-TH',{maximumFractionDigits:2})+' บาท/ชม.)':'= '+hours(h)+' ชม. สะสม';
  }else{
    $('entryPreview').innerText='ใช้ '+hours($('useHours').value)+' ชม.';
  }
}

/* ── Save Entry: lock rate ณ ตอน save ── */
function saveEntry(){
  var data=getCal(), kind=radVal('entryKind');
  if(kind==='ot'){
    var h=num($('entryHours').value), m=num(radVal('multiplier')), pt=radVal('payType');
    if(h<=0){alert('กรอกจำนวนชั่วโมงให้ถูกต้อง');return}
    var curLabel=periodLabel(currentPeriod);
    var kpiBonusPct=getKpiBonusPct(curLabel);
    if(isNaN(kpiBonusPct))kpiBonusPct=0;
    var rate=getHourlyRate(kpiBonusPct);
    data[activeKey]=pt==='money'
      ?{kind:'ot',payType:'money',rate:rate,hours:h,multiplier:m,total:rate*h*m,kpiBonusPctAtSave:kpiBonusPct}
      :{kind:'ot',payType:'leave',hours:h,multiplier:m,credit:h};
  }else{
    var uh=num($('useHours').value), avail=totalBank(activeKey);
    if(uh<=0){alert('กรอกจำนวนชั่วโมงให้ถูกต้อง');return}
    if(uh>avail){alert('วันหยุดสะสมไม่พอ (มีอยู่ '+hours(avail)+' ชม.)');return}
    data[activeKey]={kind:'use',hours:uh};
  }
  setCal(data);closeEntry();renderAll();
}

function deleteEntry(){
  if(!confirm('ลบข้อมูลวันนี้?'))return;
  var data=getCal();delete data[activeKey];setCal(data);closeEntry();renderAll();
}

/* ── Settings ── */
function openSettings(){
  var st=settings();
  $('setSalaryBase').value=st.salaryBase||'';
  $('setStartDate').value=st.startDate||'';
  $('setCutoff').value=st.cutoff||'';$('setPayday').value=st.payday||'';$('setBank').value=hours(totalBank());
  if($('setCalcMode')) $('setCalcMode').value=st.calcMode||'realtime';
  $('setHousing').value=st.housing||'';$('setDiligence').value=st.diligence||'';$('setKpi').value=st.kpiPercent||'';
  /* KPI Bonus โหลดตามรอบบิลที่เลือกอยู่ */
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=getKpiBonusPct(curLabel);
  $('setKpiBonus').value=kpiBonusPct||'';
  var lbl=$('kpiBonusLabel');
  if(lbl) lbl.innerText='KPI Bonus \u2014 '+curLabel+' (%)';
  $('setTransport').value=st.transport;$('setFood').value=st.food;$('setOtFood').value=st.otFood||'';$('setNightRate').value=st.nightRate||'';
  $('setNightEnabled').checked=st.nightEnabled;
  /* การลา + รายการหัก: โหลดตามรอบบิล */
  $('setSick').value=getPerPeriod('pp_sick',curLabel)||'';
  $('setPersonal').value=getPerPeriod('pp_personal',curLabel)||'';
  $('setAbsent').value=getPerPeriod('pp_absent',curLabel)||'';
  $('setServiceAward').value=getPerPeriod('pp_service_award',curLabel)||'';
  $('setTax').value=getPerPeriod('pp_tax',curLabel)||'';
  $('setOther').value=getPerPeriod('pp_other',curLabel)||'';
  /* อัปเดต subhead labels */
  var leaveSub=$('leaveSubhead'); if(leaveSub) leaveSub.innerText='\u0e01\u0e32\u0e23\u0e25\u0e32 \u2014 '+curLabel;
  var deductSub=$('deductSubhead'); if(deductSub) deductSub.innerText='\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01 \u2014 '+curLabel;
  clearHolidayForm();renderHolidayList();renderKpiInfo();$('settingsOverlay').classList.add('show');
}

function closeSettings(){$('settingsOverlay').classList.remove('show')}

function saveSettings(){
  var entriesSum=totalBank()-settings().bankAdj, bankInput=num($('setBank').value);
  setLS('ot_salary',num($('setSalaryBase').value));  /* เงินเดือนหลักสำหรับคำนวณ rate */
  var sd=$('setStartDate').value; if(sd)setLS('start_date',sd);else localStorage.removeItem('start_date');
  var cutoff=getValidDay($('setCutoff').value); if(cutoff){setLS('ot_cutoff',cutoff);setLS('cutoff_day',cutoff)}else{localStorage.removeItem('ot_cutoff');localStorage.removeItem('cutoff_day')}
  var payday=getValidDay($('setPayday').value); if(payday)setLS('payday',payday);else localStorage.removeItem('payday');
  if($('setCalcMode')) setLS('calc_mode', $('setCalcMode').value);
  setLS('ot_bank_adj',bankInput-entriesSum);
  setLS('housing',num($('setHousing').value));setLS('diligence',num($('setDiligence').value));
  setLS('kpi_percent',num($('setKpi').value));
  setLS('transport_rate',num($('setTransport').value));setLS('food_rate',num($('setFood').value));setLS('ot_food_rate',num($('setOtFood').value));setLS('night_shift_rate',num($('setNightRate').value));setBool('night_shift_enabled',$('setNightEnabled').checked);
  /* การลา + รายการหัก: บันทึกตามรอบบิล */
  var curLabel=periodLabel(currentPeriod);
  savePerPeriod('pp_sick',curLabel,num($('setSick').value));
  savePerPeriod('pp_personal',curLabel,num($('setPersonal').value));
  savePerPeriod('pp_absent',curLabel,num($('setAbsent').value));
  savePerPeriod('pp_service_award',curLabel,num($('setServiceAward').value));
  savePerPeriod('pp_tax',curLabel,num($('setTax').value));
  savePerPeriod('pp_other',curLabel,num($('setOther').value));
  /* บันทึก KPI Bonus ตามรอบบิลที่เลือกอยู่ */
  var kpiBonusVal=num($('setKpiBonus').value);
  if(isNaN(kpiBonusVal))kpiBonusVal=0;
  saveKpiBonusPct(curLabel,kpiBonusVal);
  closeSettings();currentPeriod=periodFor(today);renderAll();
}

function clearHolidayForm(){editingHoliday=-1;$('holidayDate').value='';if($('holidayDateEnd'))$('holidayDateEnd').value='';$('holidayName').value=''}
function editHoliday(i){var h=getHolidays()[i];if(!h)return;editingHoliday=i;$('holidayDate').value=h.date;if($('holidayDateEnd'))$('holidayDateEnd').value='';$('holidayName').value=h.name}
function saveHoliday(){
  var date=$('holidayDate').value, dateEnd=$('holidayDateEnd')?$('holidayDateEnd').value:'', name=$('holidayName').value.trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name){alert('กรอกวันที่เริ่มและชื่อวันหยุดให้ครบ');return}
  var h=getHolidays();
  if(editingHoliday>=0){
    h[editingHoliday]={date:date,name:name};
  }else{
    var dStart = parseDateKey(date);
    var dEnd = (dateEnd && /^\d{4}-\d{2}-\d{2}$/.test(dateEnd)) ? parseDateKey(dateEnd) : new Date(dStart.getTime());
    if(dEnd < dStart){alert('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม');return;}
    
    var cur = new Date(dStart.getTime());
    while(cur <= dEnd){
      var dk = dateKey(cur);
      if(!h.some(function(x){return x.date===dk})) h.push({date:dk,name:name});
      cur = addDays(cur, 1);
    }
  }
  setHolidays(h);clearHolidayForm();renderHolidayList();renderAll();
}
function deleteHoliday(i){
  if(!confirm('ลบวันหยุดนี้?'))return;
  var h=getHolidays();h.splice(i,1);setHolidays(h);clearHolidayForm();renderAll();
}
