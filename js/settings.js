/* ── Open Entry ── */
function openEntry(k){
  activeKey=k;
  var st=settings();
  if(st.salaryBase<=0){alert('กรุณาตั้งเงินเดือน (บาท/เดือน) ก่อนในเมนูตั้งค่า');openSettings();return}
  var d=parseDateKey(k), W=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  $('entryTitle').innerText='✏️ วัน'+W[d.getDay()]+' ที่ '+d.getDate()+' '+MN[d.getMonth()]+' '+(d.getFullYear()+543)+(holidayName(k)?' · '+holidayName(k):'');
  var en=getCal()[k], kind=en?en.kind:'ot';
  /* backward compat: old kind='leave' → treat as kind='use' */
  if(kind==='leave') kind='use';
  setRad('entryKind',kind);toggleEntryFields();
  $('entryNight').checked = (en && en.isNight) ? true : false;
  var isHol = isHolidayKey(k);
  
  $('rateRowsContainer').innerHTML = ''; // clear rows
  if(en&&en.kind==='ot'){
    var ne = normalizeEntry(en);
    ne.rates.forEach(function(r, i) {
       var m = num(r.multiplier);
       if(isHol && m===1.5) m = 3;
       addRateRow(i, r.hours, m, r.payType, isHol);
    });
  }else{
    addRateRow(0, '', isHol?3:1.5, 'money', isHol);
  }
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

function closeEntry(){$('entryOverlay').classList.remove('show');activeKey=null}

/* ── Multi-Rate UI Helpers ── */
function addRateRow(index, hours, multiplier, payType, isHol) {
  var container = $('rateRowsContainer');
  var div = document.createElement('div');
  div.className = 'rate-row';
  div.setAttribute('data-rate-index', index);
  
  var delBtn = index > 0 ? '<button class="btn danger" onclick="this.closest(\'.rate-row\').remove(); previewEntry();" style="padding:2px 8px; font-size:12px;">ลบ</button>' : '';
  
  div.innerHTML = `
    <div class="rate-row-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; margin-top:${index>0?'12px':'0'}; border-top:${index>0?'1px solid rgba(255,255,255,0.1)':'none'}; padding-top:${index>0?'8px':'0'};">
      <span style="font-size:12px; font-weight:600; color:var(--muted);">อัตราที่ ${index + 1}</span>
      ${delBtn}
    </div>
    <div class="group"><label>ชม. OT</label><input type="number" class="rateHours" step="0.1" inputmode="decimal" value="${hours||''}" oninput="previewEntry()"></div>
    <div class="group"><div class="choice">
      <label><input type="radio" name="multiplier_${index}" value="1" ${multiplier==1?'checked':''} onchange="previewEntry()"> 1.0x</label>
      <label class="mult15Label" style="display:${isHol?'none':''}"><input type="radio" name="multiplier_${index}" value="1.5" ${multiplier==1.5?'checked':''} onchange="previewEntry()"> 1.5x</label>
      <label><input type="radio" name="multiplier_${index}" value="3" ${multiplier==3?'checked':''} onchange="previewEntry()"> 3.0x</label>
    </div></div>
    <div class="group"><label>รับเป็น</label><div class="choice">
      <label><input type="radio" name="payType_${index}" value="money" ${payType!=='leave'?'checked':''} onchange="previewEntry()"> เงิน</label>
      <label><input type="radio" name="payType_${index}" value="leave" ${payType==='leave'?'checked':''} onchange="previewEntry()"> วันหยุด</label>
    </div></div>
  `;
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

function toggleEntryFields(){
  var kind=radVal('entryKind');
  $('otFields').classList.toggle('hide',kind!=='ot');
  $('useFields').classList.toggle('hide',kind!=='use');
  if($('nightShiftGroup')) $('nightShiftGroup').style.display=(kind==='ot')?'block':'none';
}

function previewEntry(){
  var kind=radVal('entryKind');
  if(kind==='ot'){
    var curLabel=periodLabel(currentPeriod);
    var kpiBonusPct=getKpiBonusPct(curLabel);
    if(isNaN(kpiBonusPct))kpiBonusPct=0;
    var rate=getHourlyRate(kpiBonusPct);
    
    var totalMoney = 0;
    var totalLeave = 0;
    var desc = [];
    
    var rows = document.querySelectorAll('#rateRowsContainer .rate-row');
    rows.forEach(function(row) {
       var idx = row.getAttribute('data-rate-index');
       var h = num(row.querySelector('.rateHours').value);
       var m = num(document.querySelector('input[name="multiplier_'+idx+'"]:checked').value);
       var pt = document.querySelector('input[name="payType_'+idx+'"]:checked').value;
       
       if (h > 0) {
         if (pt === 'money') {
            var effectiveRate = rate * m;
            totalMoney += effectiveRate * h;
            desc.push(h + 'ชม.×' + m + 'x');
         } else {
            totalLeave += h;
         }
       }
    });
    
    var txts = [];
    if (totalMoney > 0) txts.push('= ' + money(totalMoney) + (desc.length ? ' (' + desc.join(', ') + ')' : ''));
    if (totalLeave > 0) txts.push('= ' + hours(totalLeave) + ' ชม. สะสม');
    
    $('entryPreview').innerText = txts.length ? txts.join(' และ ') : '';
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
    var curLabel=periodLabel(currentPeriod);
    var kpiBonusPct=getKpiBonusPct(curLabel);
    if(isNaN(kpiBonusPct))kpiBonusPct=0;
    var rate=getHourlyRate(kpiBonusPct);
    
    var ratesArr = [];
    var totalH = 0;
    var hasHolidayMultiplier = false;
    var rows = document.querySelectorAll('#rateRowsContainer .rate-row');
    rows.forEach(function(row) {
       var idx = row.getAttribute('data-rate-index');
       var h = num(row.querySelector('.rateHours').value);
       var m = num(document.querySelector('input[name="multiplier_'+idx+'"]:checked').value);
       var pt = document.querySelector('input[name="payType_'+idx+'"]:checked').value;
       
       if (h > 0) {
         if (m === 1 || m === 3) hasHolidayMultiplier = true;
         ratesArr.push({
            hours: h,
            multiplier: m,
            payType: pt,
            rate: rate,
            total: pt === 'money' ? (rate * h * m) : 0,
            credit: pt === 'leave' ? h : 0,
            kpiBonusPctAtSave: kpiBonusPct
         });
         totalH += h;
       }
    });
    
    if (hasHolidayMultiplier) {
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
    var banks=getBanks(activeKey);
    var avail=(lt==='swap')?banks.ot:banks.annual;
    if(uh<=0){alert('กรอกจำนวนชั่วโมงให้ถูกต้อง');return}
    if((lt==='swap'||lt==='annual') && uh>avail){alert('วันหยุดสะสมไม่พอ (มีอยู่ '+hours(avail)+' ชม.)');return}
    data[activeKey]={kind:'use',leaveType:lt,hours:uh};
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
  $('setCutoff').value=st.cutoff||'';$('setPayday').value=st.payday||'';
  if($('setCalcMode')) $('setCalcMode').value=st.calcMode||'realtime';
  $('setHousing').value=st.housing||'';$('setDiligence').value=st.diligence||'';$('setKpi').value=st.kpiPercent||'';
  /* KPI Bonus โหลดตามรอบบิลที่เลือกอยู่ */
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=getKpiBonusPct(curLabel);
  $('setKpiBonus').value=kpiBonusPct||'';
  var lbl=$('kpiBonusLabel');
  if(lbl) lbl.innerText='KPI Bonus \u2014 '+curLabel+' (%)';
  $('setTransport').value=st.transport;$('setFood').value=st.food;$('setOtFood').value=st.otFood||'';$('setNightRate').value=st.nightRate||'';
  /* รายการหัก: โหลดตามรอบบิล */
  $('setServiceAward').value=getPerPeriod('pp_service_award',curLabel)||'';
  $('setTax').value=getPerPeriod('pp_tax',curLabel)||'';
  $('setOther').value=getPerPeriod('pp_other',curLabel)||'';
  /* อัปเดต subhead labels */
  var deductSub=$('deductSubhead'); if(deductSub) deductSub.innerText='\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01 \u2014 '+curLabel;
  clearHolidayForm();renderHolidayList();renderKpiInfo();$('settingsOverlay').classList.add('show');
}

function closeSettings(){$('settingsOverlay').classList.remove('show')}

function saveSettings(force){
  if(!force && localStorage.getItem('settings_tutorial')!=='1'){
    $('settingsTutorialOverlay').classList.add('show');
    return;
  }
  setLS('ot_salary',num($('setSalaryBase').value));  /* เงินเดือนหลักสำหรับคำนวณ rate */
  var sd=$('setStartDate').value; if(sd)setLS('start_date',sd);else localStorage.removeItem('start_date');
  var cutoff=getValidDay($('setCutoff').value); if(cutoff){setLS('ot_cutoff',cutoff);setLS('cutoff_day',cutoff)}else{localStorage.removeItem('ot_cutoff');localStorage.removeItem('cutoff_day')}
  var payday=getValidDay($('setPayday').value); if(payday)setLS('payday',payday);else localStorage.removeItem('payday');
  if($('setCalcMode')) setLS('calc_mode', $('setCalcMode').value);
  setLS('housing',num($('setHousing').value));setLS('diligence',num($('setDiligence').value));
  setLS('kpi_percent',num($('setKpi').value));
  setLS('transport_rate',num($('setTransport').value));setLS('food_rate',num($('setFood').value));setLS('ot_food_rate',num($('setOtFood').value));setLS('night_shift_rate',num($('setNightRate').value));
  /* รายการหัก: บันทึกตามรอบบิล */
  var curLabel=periodLabel(currentPeriod);
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
    titleHtml += '<div style="width:12px;height:12px;border-radius:50%;background:'+(t.color_tag||'#ccc')+';"></div>';
    titleHtml += '<div><div style="font-weight:600;font-size:14px;color:'+(t.visible_in_calendar===false?'var(--muted)':'var(--ink)')+'">'+t.name_th+(t.visible_in_calendar===false?' (ซ่อน)':'')+'</div>';
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
    } else {
       $('eltQuotaTotal').disabled = false;
       $('eltQuotaGroup').querySelector('label').innerText = 'โควตาทั้งหมด (ต่อรอบ)';
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
      var diff = targetCurrent - currentBanks[t.id];
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
  };
}
if($('closeLeaveSettingsBtn')) $('closeLeaveSettingsBtn').onclick = function() { $('leaveSettingsOverlay').classList.remove('show'); };
if($('closeLeaveSettingsTopBtn')) $('closeLeaveSettingsTopBtn').onclick = function() { $('leaveSettingsOverlay').classList.remove('show'); };
if($('closeEditLeaveTypeBtn')) $('closeEditLeaveTypeBtn').onclick = function() { $('editLeaveTypeOverlay').classList.remove('show'); };
if($('closeEditLeaveTypeTopBtn')) $('closeEditLeaveTypeTopBtn').onclick = function() { $('editLeaveTypeOverlay').classList.remove('show'); };
if($('saveEditLeaveTypeBtn')) $('saveEditLeaveTypeBtn').onclick = saveEditLeaveType;
