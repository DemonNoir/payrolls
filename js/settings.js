/* ── Open Entry ── */
var entryPeriod = null;
var entryComparison = null;
function openEntry(k, comparisonRow, comparisonPeriod){
  var d = parseDateKey(k);
  entryPeriod = comparisonPeriod || (inRangeDate(d,currentPeriod.start,currentPeriod.end) ? currentPeriod : periodFor(d,d));
  var st=settings(entryPeriod);
  if(st.salaryBase<=0){alert('กรุณาตั้งเงินเดือน (บาท/เดือน) ก่อนในเมนูตั้งค่า');openSettings('pay');return}
  activeKey=k;
  entryComparison=comparisonRow || null;
  var note=$('entryComparisonNote');
  note.hidden=!entryComparison;
  if(entryComparison){
    note.textContent=otComparisonAmounts(entryComparison);
    $('compareOtOverlay').classList.remove('show');
    $('compareOtOverlay').setAttribute('aria-hidden','true');
  }
  var W=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  $('entryTitle').innerText='✏️ วัน'+W[d.getDay()]+' ที่ '+d.getDate()+' '+MN[d.getMonth()]+' '+(d.getFullYear()+543)+(holidayName(k)?' · '+holidayName(k):'');
  var en=getCal()[k], kind=en?en.kind:'ot';
  /* backward compat: old kind='leave' → treat as kind='use' */
  if(kind==='leave') kind='use';
  setRad('entryKind',kind);toggleEntryFields();
  $('entryNight').checked = isNightAttendance(en, getShiftSchedule()[k]);
  fillEntryRates(en);
  /* populate leaveType dropdown dynamically */
  var types = typeof getLeaveTypes === 'function' ? getLeaveTypes() : [];
  var ltSelect = $('leaveType');
  ltSelect.innerHTML = '';
  types.filter(function(t){ return t.visible_in_calendar !== false; })
       .sort(function(a,b){ return a.order - b.order; })
       .forEach(function(t){
         var opt = document.createElement('option');
         opt.value = t.id;
         opt.innerText = t.name_th;
         ltSelect.appendChild(opt);
       });

  /* populate use/leave fields */
  if(en&&en.kind==='use'){
    $('leaveType').value=en.leaveType||'annual';
    $('useHours').value=en.hours||'';
  }else if(en&&en.kind==='leave'){
    $('leaveType').value=en.leaveType||'sick';
    $('useHours').value=(num(en.days)||1)*8;
  }else{
    $('leaveType').value='annual';
    $('useHours').value='';
  }
  updateEntryModalBank();
  $('deleteEntryBtn').style.display=en?'block':'none';
  previewEntry();
  $('entryOverlay').classList.add('show');
  $('entryTitle').focus();
}

function updateEntryModalBank() {
  var lt = $('leaveType').value;
  var types = typeof getLeaveTypes === 'function' ? getLeaveTypes() : [];
  var tConf = types.find(function(x){ return x.id===lt; });
  var banks = getBanks(activeKey);
  
  if (tConf && tConf.has_quota) {
    $('availableBankLabel').classList.remove('hide');
    $('availableBank').innerText = num(banks[lt]).toLocaleString('th-TH',{maximumFractionDigits:1});
    $('availableBankUnit').innerText = tConf.unit === 'days' ? 'วัน' : 'ชม.';
    $('useHours').placeholder = tConf.unit === 'days' ? 'วัน' : 'ชม.';
  } else {
    $('availableBankLabel').classList.add('hide');
    $('useHours').placeholder = (tConf && tConf.unit === 'days') ? 'วัน' : 'ชม.';
  }
}

$('leaveType').addEventListener('change', function() {
  updateEntryModalBank();
  previewEntry();
});

function closeEntry(){
  $('entryOverlay').classList.remove('show');
  activeKey=null;
  entryPeriod=null;
  if(entryComparison){
    var date=entryComparison.date;
    entryComparison=null;
    $('compareOtOverlay').classList.add('show');
    $('compareOtOverlay').setAttribute('aria-hidden','false');
    renderOtComparison();
    var opener=$('compareOtResults').querySelector('[data-edit-date="'+date+'"]');
    (opener || $('runCompareOtBtn')).focus();
  }
}

function fillEntryRates(entry, repeat){
  var isHol=isHolidayKey(activeKey);
  var rates=entry && entry.kind==='ot' ? normalizeEntry(entry).rates : [];
  $('rateRowsContainer').replaceChildren();
  if(!rates.length){
    addRateRow(0,'',isHol?3:1.5,'money',isHol);
    return;
  }
  rates.forEach(function(rate,index){
    var multiplier=num(rate.multiplier);
    if(repeat && isHol && multiplier===1.5) multiplier=3;
    addRateRow(index,rate.hours,multiplier,rate.payType,isHol,null,null,rate.timing);
  });
}

function readRateTiming(row){
  if(!row.querySelector('.use-rate-time').checked) return null;
  var rest=row.querySelector('.rate-break');
  return {start:row.querySelector('.rate-start').value, end:row.querySelector('.rate-end').value,
          breakMinutes:rest.validity.badInput ? NaN : Number(rest.value)};
}

function updateRateTiming(row){
  var timing=readRateTiming(row);
  row.querySelector('.rate-time-fields').hidden=!timing;
  row.querySelector('.rate-hours-group').hidden=!!timing;
  if(!timing) return;
  var minutes=otClockDuration(timing.start,timing.end,timing.breakMinutes);
  var result=row.querySelector('.rate-time-result');
  if(minutes===null){
    result.textContent=(!timing.start || !timing.end) ? 'ระบุเวลาเริ่มและเลิก OT' :
      (timing.start===timing.end ? 'เวลาเริ่มและเลิกต้องต่างกัน' : 'เวลาพักต้องเป็นนาทีเต็ม ตั้งแต่ 0 และสั้นกว่าช่วง OT');
    return;
  }
  result.textContent='รวม '+Math.floor(minutes/60)+' ชม. '+minutes%60+' นาที'+(timing.end<timing.start?' · เลิกวันถัดไป':'');
}

function rateHoursFromRow(row,timing){
  if(!timing){
    var manual=row.querySelector('.rateHours');
    return manual.validity.badInput ? NaN : num(manual.value);
  }
  var minutes=otClockDuration(timing.start,timing.end,timing.breakMinutes);
  return minutes===null ? NaN : minutes/60;
}


/* ── Multi-Rate UI Helpers ── */
function addRateRow(index, hours, multiplier, payType, isHol, containerId, prefix, timing) {
  var container = $(containerId || 'rateRowsContainer');
  if(!container) return;
  var pfx = prefix || '';
  var div = document.createElement('div');
  div.className = 'rate-row';
  div.setAttribute('data-rate-index', index);
  
  var delBtn = index > 0 ? '<button class="btn danger" onclick="this.closest(\'.rate-row\').remove(); if(typeof previewEntry === \'function\'){previewEntry();}" style="padding:2px 8px; font-size:12px;">✕</button>' : '';
  var onchangeStr = containerId === 'batchRateRowsContainer' ? '' : 'onchange="previewEntry()"';
  var oninputStr = containerId === 'batchRateRowsContainer' ? '' : 'oninput="previewEntry()"';
  
  div.innerHTML = `
    <div class="rate-row-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; margin-top:${index>0?'12px':'0'}; border-top:${index>0?'1px solid rgba(255,255,255,0.1)':''}; padding-top:${index>0?'12px':'0'};">
      <span style="font-size:12px; font-weight:600; color:var(--muted);">อัตราที่ ${index + 1}</span>
      ${delBtn}
    </div>
    <div class="group rate-hours-group"><label for="${pfx}rateHours${index}">ชม. OT</label><input id="${pfx}rateHours${index}" type="number" class="rateHours" step="any" inputmode="decimal" ${oninputStr}></div>
    <div class="group"><div class="choice">
      <label><input type="radio" name="${pfx}multiplier_${index}" value="1" ${multiplier==1?'checked':''} ${onchangeStr}> 1.0x</label>
      <label class="${pfx}mult15Label" style="display:${isHol && multiplier!=1.5?'none':''}"><input type="radio" name="${pfx}multiplier_${index}" value="1.5" ${multiplier==1.5?'checked':''} ${onchangeStr}> 1.5x</label>
      <label><input type="radio" name="${pfx}multiplier_${index}" value="3" ${multiplier==3?'checked':''} ${onchangeStr}> 3.0x</label>
    </div></div>
    <div class="group"><label>รับเป็น</label><div class="choice">
      <label><input type="radio" name="${pfx}payType_${index}" value="money" ${payType!=='leave'?'checked':''} ${onchangeStr}> เงิน</label>
      <label><input type="radio" name="${pfx}payType_${index}" value="leave" ${payType==='leave'?'checked':''} ${onchangeStr}> วันหยุด</label>
    </div></div>
  `;
  div.querySelector('.rateHours').value=hours || '';
  if(!pfx){
    var controls=$('rateTimeTemplate').content.cloneNode(true);
    var toggle=controls.querySelector('.use-rate-time');
    if(timing && otClockDuration(timing.start,timing.end,timing.breakMinutes)!==null){
      toggle.checked=true;
      controls.querySelector('.rate-start').value=timing.start;
      controls.querySelector('.rate-end').value=timing.end;
      controls.querySelector('.rate-break').value=timing.breakMinutes;
    }
    var panel=controls.querySelector('.rate-time');
    function refreshClock(){updateRateTiming(div);previewEntry();}
    panel.addEventListener('input',refreshClock);
    panel.addEventListener('change',refreshClock);
    div.querySelector('.rate-hours-group').after(controls);
    updateRateTiming(div);
  }
  container.appendChild(div);
}

if ($('addRateBtn')) {
  $('addRateBtn').addEventListener('click', function() {
    var container = $('rateRowsContainer');
    var isHol = isHolidayKey(activeKey);
    // Find next available index
    var maxIdx = -1;
    container.querySelectorAll('.rate-row').forEach(function(row) {
      var idx = parseInt(row.getAttribute('data-rate-index')||0, 10);
      if (idx > maxIdx) maxIdx = idx;
    });
    addRateRow(maxIdx + 1, '', isHol ? 3 : 1.5, 'money', isHol);
  });
}

if ($('addBatchRateBtn')) {
  $('addBatchRateBtn').addEventListener('click', function() {
    var container = $('batchRateRowsContainer');
    const allHoliday = [...window.selectedDates].every(k => isHolidayKey(k));
    var maxIdx = -1;
    container.querySelectorAll('.rate-row').forEach(function(row) {
      var idx = parseInt(row.getAttribute('data-rate-index')||0, 10);
      if (idx > maxIdx) maxIdx = idx;
    });
    addRateRow(maxIdx + 1, '', allHoliday ? 3 : 1.5, 'money', allHoliday, 'batchRateRowsContainer', 'batch_');
  });
}

function toggleEntryFields(){
  var kind=radVal('entryKind');
  $('otFields').classList.toggle('hide',kind!=='ot');
  $('useFields').classList.toggle('hide',kind!=='use');
  if($('nightShiftGroup')) $('nightShiftGroup').style.display=(kind==='ot')?'block':'none';
}

function previewEntry(){
  var kind=radVal('entryKind');
  if(kind==='ot'){
    var kpiBonusPct=num(settings(entryPeriod).kpiBonusValue);
    var rate=getHourlyRate(kpiBonusPct,entryPeriod);
    
    var totalMoney = 0;
    var totalLeave = 0;
    var desc = [];
    var ratesDesc = [];
    
    var rows = document.querySelectorAll('#rateRowsContainer .rate-row');
    rows.forEach(function(row) {
       var idx = row.getAttribute('data-rate-index');
       var h = rateHoursFromRow(row,readRateTiming(row));
       var mInput = document.querySelector('input[name="multiplier_'+idx+'"]:checked');
       var ptInput = document.querySelector('input[name="payType_'+idx+'"]:checked');
       if(!mInput || !ptInput) return;
       var m = num(mInput.value);
       var pt = ptInput.value;
       
       if (h > 0) {
         if (pt === 'money') {
            var effectiveRate = rate * m;
            totalMoney += effectiveRate * h;
            desc.push(hours(h) + 'ชม.×' + m + 'x');
         } else {
            totalLeave += h;
         }
       } else {
         if (pt === 'money') {
            ratesDesc.push(m + 'x = ' + money(rate * m) + '/ชม.');
         }
       }
    });
    
    var txts = [];
    if (totalMoney > 0) txts.push('= ' + money(totalMoney) + (desc.length ? ' (' + desc.join(', ') + ')' : ''));
    if (totalLeave > 0) txts.push('= ' + hours(totalLeave) + ' ชม. สะสม');
    
    if (txts.length === 0) {
       $('entryPreview').innerText = '= 0.00' + (ratesDesc.length ? ' (' + ratesDesc.join(', ') + ')' : '');
    } else {
       $('entryPreview').innerText = txts.join(' และ ');
    }
  }else if(kind==='use'){
    var lt=$('leaveType').value;
    var types = typeof getLeaveTypes === 'function' ? getLeaveTypes() : [];
    var tConf = types.find(function(x){ return x.id===lt; });
    
    var uh=num($('useHours').value)||0;
    var timeStr = uh + ((tConf && tConf.unit === 'days') ? ' วัน' : ' ชม.');
    
    var name = tConf ? tConf.name_th : 'ใช้สิทธิ';
    var noDiligence = tConf ? !tConf.docks_diligence : false;
    
    var txt = name + ' ' + timeStr;
    if(noDiligence) txt+=' (ไม่หักเบี้ยขยัน)';
    else txt+=' (หักเบี้ยขยัน)';
    $('entryPreview').innerText=txt;
  }
}

/* ── Save Entry: lock rate ณ ตอน save ── */
function saveEntry(){
  var data=getCal(), kind=radVal('entryKind');
  var isNight = $('entryNight').checked;
  if(kind==='ot'){
    var kpiBonusPct=num(settings(entryPeriod).kpiBonusValue);
    var rate=getHourlyRate(kpiBonusPct,entryPeriod);
    
    var ratesArr = [];
    var totalH = 0;
    var hasHolidayMultiplier = false;
    var rows = document.querySelectorAll('#rateRowsContainer .rate-row');
    for(var row of rows){
       var timing=readRateTiming(row);
       var h=rateHoursFromRow(row,timing);
       if(!Number.isFinite(h) || h<0){
         alert(timing ? row.querySelector('.rate-time-result').textContent : 'กรอกจำนวนชั่วโมงให้ถูกต้อง');
         row.querySelector(timing ? '.rate-start' : '.rateHours').focus();
         return;
       }
       var m = num(row.querySelector('input[name^="multiplier_"]:checked').value);
       var pt = row.querySelector('input[name^="payType_"]:checked').value;
       if (h > 0) {
         if (m === 1 || m === 3) hasHolidayMultiplier = true;
         var savedRate={
            hours: h,
            multiplier: m,
            payType: pt,
            rate: rate,
            total: pt === 'money' ? (rate * h * m) : 0,
            credit: pt === 'leave' ? h : 0,
            kpiBonusPctAtSave: kpiBonusPct
         };
         if(timing) savedRate.timing=timing;
         ratesArr.push(savedRate);
         totalH += h;
       }
    }

    if (hasHolidayMultiplier && !isHolidayKey(activeKey)) {
      var hList = getHolidays();
      if (!hList.find(function(x) { return x.date === activeKey; })) {
        hList.push({ date: activeKey, name: 'วันหยุดนักขัตฤกษ์' });
        setHolidays(hList);
      }
    }
    
    if(totalH<=0 && !isNight){alert('กรอกจำนวนชั่วโมงให้ถูกต้อง หรือเลือกลบรายการนี้');return}
    
    if(totalH<=0 && isNight){
      data[activeKey]={kind:'ot', rates: [], isNight:true};
    } else {
      data[activeKey]={kind:'ot', rates: ratesArr, isNight:isNight};
    }
  }else{
    var uh=num($('useHours').value);
    var lt=$('leaveType').value;
    var isNight = $('entryNight').checked;
    var banks=getBanks(activeKey);
    var avail=(lt==='swap')?banks.ot:banks.annual;
    if(uh<=0){alert('กรอกจำนวนชั่วโมงให้ถูกต้อง');return}
    if((lt==='swap'||lt==='annual') && uh>avail){alert('วันหยุดสะสมไม่พอ (มีอยู่ '+hours(avail)+' ชม.)');return}
    data[activeKey]={kind:'use',leaveType:lt,hours:uh,isNight:isNight};
  }
  setCal(data);closeEntry();renderAll();
}

function deleteEntry(){
  if(!confirm('ลบข้อมูลวันนี้?'))return;
  var data=getCal();delete data[activeKey];setCal(data);closeEntry();renderAll();
}

/* ── Settings ── */
var settingsDirty = false;
var settingsOpener = null;

function showSettingsPanel(name) {
  var menu = $('settingsMenu');
  var button = Array.from(menu.querySelectorAll('[data-settings-target]')).find(function(item) {
    return item.dataset.settingsTarget === name;
  });
  var previous = menu.querySelector('[aria-current="page"]');
  if (previous) previous.removeAttribute('aria-current');
  if (button) button.setAttribute('aria-current', 'page');
  var editable = ['pay', 'earn', 'welfare'].includes(name);
  menu.hidden = !!button;
  $('settingsBackBtn').hidden = !button;
  // Support both old structure (span > text) and new .s-nav-title structure
  var titleEl = button && (button.querySelector('.s-nav-title') || button.firstElementChild);
  $('settingsTitle').textContent = titleEl ? (titleEl.firstChild ? titleEl.firstChild.textContent || titleEl.textContent : titleEl.textContent) : 'ตั้งค่า';
  $('settingsPeriodBadge').hidden = !editable;
  $('settingsSaveBar').hidden = !editable && !settingsDirty;
  $('settingsOverlay').querySelectorAll('[data-settings-panel]').forEach(function(panel) {
    panel.hidden = !button || panel.dataset.settingsPanel !== name;
    if (!panel.hidden) panel.scrollTop = 0;
  });
  $('settingsOverlay').querySelector('.sheet').scrollTop = 0;
  if (!button && previous) previous.focus();
  else $('settingsTitle').focus();
}

$('settingsMenu').onclick = function(event) {
  var button = event.target.closest('[data-settings-target]');
  if (button) showSettingsPanel(button.dataset.settingsTarget);
};
$('settingsBackBtn').onclick = function() { showSettingsPanel(); };
$('settingsOverlay').addEventListener('input', function(event) {
  if (event.target.closest('[data-settings-panel="pay"], [data-settings-panel="earn"], [data-settings-panel="welfare"]')) {
    settingsDirty = true;
  }
});
function dismissSettings() {
  if (settingsDirty && !confirm('ปิดโดยทิ้งการตั้งค่าที่ยังไม่ได้บันทึก?')) return;
  closeSettings();
}
$('settingsOverlay').addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    if ($('settingsMenu').hidden) showSettingsPanel();
    else dismissSettings();
  } else if (event.key === 'Tab') {
    var visible = Array.from(this.querySelectorAll('button, input, select, summary, [tabindex="0"]'))
      .filter(function(el) { return !el.disabled && el.getClientRects().length; });
    var first = visible[0], last = visible[visible.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function openSettings(panel){
  settingsOpener = document.activeElement;
  settingsDirty = false;
  var curPeriodRef = (typeof currentPeriod !== 'undefined' ? currentPeriod : null);
  var st = settings(curPeriodRef);
  
  var curLabel = periodLabel(curPeriodRef);
  var badge = $('settingsPeriodBadge');
  if (badge) {
    badge.innerText = 'ใช้ตั้งแต่รอบ ' + curLabel + ' เป็นต้นไป';
  }
  
  $('setSalaryBase').value = st.salaryBase || '';
  $('setStartDate').value = st.startDate || '';
  $('setCutoff').value = st.cutoff || '';
  $('setPayday').value = st.payday || '';
  $('setHousing').value = st.housing || '';
  $('setDiligence').value = st.diligence || '';
  
  setRad('kpiType', st.kpiType || 'percent');
  $('setKpi').value = (st.kpiValue !== undefined ? st.kpiValue : st.kpiPercent) || '';
  
  setRad('kpiBonusType', st.kpiBonusType || 'percent');
  $('setKpiBonus').value = (st.kpiBonusValue !== undefined ? st.kpiBonusValue : '') ;
  
  var lbl = $('kpiBonusLabel');
  if (lbl) lbl.innerText = 'KPI Bonus รอบนี้';
  
  $('setTransport').value = st.transport !== undefined ? st.transport : '';
  $('setFood').value = st.food !== undefined ? st.food : '';
  $('setOtFood').value = st.otFood !== undefined ? st.otFood : '';
  $('setNightRate').value = st.nightRate !== undefined ? st.nightRate : '';
  
  $('setServiceAward').value = st.serviceAward || '';
  $('setTax').value = st.tax || '';
  $('setOther').value = st.other || '';
  
  var deductSub = $('deductSubhead');
  if (deductSub) deductSub.innerText = 'รายการหัก — ' + curLabel;
  
  clearHolidayForm();
  renderHolidayList();
  renderKpiInfo();
  $('settingsOverlay').classList.add('show');
  showSettingsPanel(panel);
}

function closeSettings(){
  $('settingsOverlay').classList.remove('show');
  settingsDirty = false;
  if (settingsOpener) settingsOpener.focus();
}

function saveSettings(force){
  if(!force && localStorage.getItem('settings_tutorial')!=='1'){
    $('settingsTutorialOverlay').classList.add('show');
    $('settingsTutorialAckBtn').focus();
    return;
  }
  
  var curPeriodRef = (typeof currentPeriod !== 'undefined' ? currentPeriod : null);
  var sd = $('setStartDate').value;
  if (sd) setLS('start_date', sd); else localStorage.removeItem('start_date');
  
  var newSt = {
    salaryBase: num($('setSalaryBase').value),
    startDate: sd || null,
    cutoff: getValidDay($('setCutoff').value) || 15,
    payday: getValidDay($('setPayday').value) || 25,
    housing: num($('setHousing').value),
    diligence: num($('setDiligence').value),
    serviceAward: num($('setServiceAward').value),
    kpiType: radVal('kpiType') || 'percent',
    kpiValue: num($('setKpi').value),
    kpiBonusType: radVal('kpiBonusType') || 'percent',
    kpiBonusValue: num($('setKpiBonus').value),
    transport: num($('setTransport').value),
    food: num($('setFood').value),
    otFood: num($('setOtFood').value),
    nightRate: num($('setNightRate').value),
    tax: num($('setTax').value),
    other: num($('setOther').value)
  };
  
  savePeriodSettings(curPeriodRef, newSt);
  // Return to the settings menu (not close entirely) — user navigates out themselves
  settingsDirty = false;
  showSettingsPanel(); // go back to menu
  currentPeriod = periodFor(new Date(curPeriodRef.end.getFullYear(), curPeriodRef.end.getMonth(), 1), curPeriodRef);
  renderAll();
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

/* ── Leave Settings ── */
var _editingLeaveTypeId = null;

function renderLeaveSettings() {
  var types = typeof getLeaveTypes === 'function' ? getLeaveTypes() : [];
  var quotaList = $('leaveSettingsQuotaList');
  var noQuotaList = $('leaveSettingsNoQuotaList');
  if(!quotaList || !noQuotaList) return;
  
  quotaList.innerHTML = '';
  noQuotaList.innerHTML = '';
  var banks = getBanks();
  
  types.sort(function(a,b){return a.order - b.order;}).forEach(function(t) {
    var el = document.createElement('div');
    el.className = 'list-item';
    el.style = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; background:rgba(255,255,255,0.05); cursor:pointer; margin-bottom:5px;';
    
    var unitStr = t.unit === 'days' ? 'วัน' : 'ชม.';
    var titleHtml = '<div style="display:flex;align-items:center;gap:8px;">';
    titleHtml += '<div style="width:12px;height:12px;border-radius:50%;background:'+(t.color_tag||'#ccc')+';">' + '</div>';
    titleHtml += '<div><div style="font-weight:600;font-size:14px;color:'+(t.visible_in_calendar===false?'var(--muted)':'var(--ink)')+'">'+t.name_th+(t.visible_in_calendar===false?' (ซ่อน)':'')+' </div>';
    if(t.has_quota) {
      var currentBank = banks[t.id] || 0;
      titleHtml += '<div style="font-size:12px;color:var(--muted)">ทั้งหมด '+t.quota_total+' '+unitStr+' / คงเหลือ '+currentBank+' '+unitStr+'</div>';
    } else {
      titleHtml += '<div style="font-size:12px;color:var(--muted)">'+(t.is_paid?'ได้รับค่าจ้าง':'ไม่ได้รับค่าจ้าง')+'</div>';
    }
    titleHtml += '</div></div>';
    el.innerHTML = titleHtml;
    
    var editIcon = document.createElement('div');
    editIcon.innerHTML = '✏️';
    el.appendChild(editIcon);
    
    el.onclick = function() { openEditLeaveType(t.id); };
    
    if(t.has_quota) quotaList.appendChild(el);
    else noQuotaList.appendChild(el);
  });
}

function openEditLeaveType(id) {
  var types = typeof getLeaveTypes === 'function' ? getLeaveTypes() : [];
  var t = types.find(function(x){return x.id===id;});
  if(!t) return;
  
  _editingLeaveTypeId = id;
  $('editLeaveTypeTitle').innerText = 'ตั้งค่า: ' + t.name_th;
  $('eltVisible').checked = t.visible_in_calendar !== false;
  $('eltUnit').value = t.unit || 'hours';
  $('eltColorTag').value = t.color_tag || '#cccccc';
  
  if(t.has_quota) {
    $('eltQuotaGroup').style.display = 'block';
    $('eltQuotaTotal').value = t.quota_total;
    $('eltQuotaCurrentGroup').style.display = 'block';
    
    // Auto-accrual special case for annual
    if (t.id === 'annual') {
       $('eltQuotaTotal').value = 0;
       $('eltQuotaTotal').disabled = true;
       $('eltQuotaGroup').querySelector('label').innerText = 'โควตาทั้งหมด (ได้รับ +4 ชม./เดือน อัตโนมัติ)';
       $('eltQuotaCurrent').disabled = false;  // ← เปิดให้แก้ไขได้
    } else {
       $('eltQuotaTotal').disabled = false;
       $('eltQuotaGroup').querySelector('label').innerText = 'โควตาทั้งหมด (ต่อรอบ)';
       $('eltQuotaCurrent').disabled = false;
    }
    
    var banks = getBanks();
    $('eltQuotaCurrent').value = num(banks[t.id]);
    
    $('eltResetCycle').value = t.reset_cycle || 'yearly';
    $('eltResetCycle').parentNode.style.display = 'block';
  } else {
    $('eltQuotaGroup').style.display = 'none';
    $('eltQuotaCurrentGroup').style.display = 'none';
    $('eltResetCycle').parentNode.style.display = 'none';
  }
  
  $('editLeaveTypeOverlay').classList.add('show');
}

function saveEditLeaveType() {
  if(!_editingLeaveTypeId) return;
  var types = typeof getLeaveTypes === 'function' ? getLeaveTypes() : [];
  var t = types.find(function(x){return x.id===_editingLeaveTypeId;});
  if(t) {
    t.visible_in_calendar = $('eltVisible').checked;
    t.unit = $('eltUnit').value;
    t.color_tag = $('eltColorTag').value;
    if(t.has_quota) {
      if (t.id !== 'annual') t.quota_total = num($('eltQuotaTotal').value);
      t.reset_cycle = $('eltResetCycle').value;
      
      // Handle "reverse-calculate" for current quota
      var targetCurrent = num($('eltQuotaCurrent').value);
      var currentBanks = getBanks();
      var unclamped = (currentBanks._unclamped && currentBanks._unclamped[t.id] !== undefined) ? currentBanks._unclamped[t.id] : currentBanks[t.id];
      var diff = targetCurrent - unclamped;
      if (diff !== 0) {
        if (t.id === 'annual') {
          setLS('annual_leave_adj', num(getLS('annual_leave_adj')) + diff);
        } else if (t.id === 'swap') {
          setLS('ot_bank_adj', num(getLS('ot_bank_adj')) + diff);
        } else {
          t.quota_total += diff; // Simple fallback
        }
      }
    }
    saveLeaveTypes(types);
  }
  $('editLeaveTypeOverlay').classList.remove('show');
  renderLeaveSettings();
}

if($('openLeaveSettingsBtn')) {
  $('openLeaveSettingsBtn').onclick = function() {
    renderLeaveSettings();
    $('leaveSettingsOverlay').classList.add('show');
    $('closeLeaveSettingsTopBtn').focus();
  };
}
if($('closeLeaveSettingsBtn')) $('closeLeaveSettingsBtn').onclick = function() { $('leaveSettingsOverlay').classList.remove('show'); };
if($('closeLeaveSettingsTopBtn')) $('closeLeaveSettingsTopBtn').onclick = function() { $('leaveSettingsOverlay').classList.remove('show'); };
if($('closeEditLeaveTypeBtn')) $('closeEditLeaveTypeBtn').onclick = function() { $('editLeaveTypeOverlay').classList.remove('show'); };
if($('closeEditLeaveTypeTopBtn')) $('closeEditLeaveTypeTopBtn').onclick = function() { $('editLeaveTypeOverlay').classList.remove('show'); };
if($('saveEditLeaveTypeBtn')) $('saveEditLeaveTypeBtn').onclick = saveEditLeaveType;
