var today=new Date(), currentPeriod=periodFor(today), activeKey=null, editingHoliday=-1;
var annualYear = today.getFullYear();

function wireInputEvents(root,fn){
  Array.prototype.forEach.call(root.querySelectorAll('input'),function(el){el.addEventListener('input',fn);el.addEventListener('change',fn)});
}

/* ── Event Wiring ── */
$('prevBtn').onclick=function(){currentPeriod=periodFor(addDays(currentPeriod.start,-1));renderAll()};
$('nextBtn').onclick=function(){currentPeriod=periodFor(addDays(currentPeriod.end,1));renderAll()};
$('settingsBtn').onclick=openSettings;
if($('topRateInfo')) $('topRateInfo').onclick=openSettings;

if($('calcModeSelect')) {
  $('calcModeSelect').value = settings().calcMode || 'realtime';
  $('calcModeSelect').onchange = function() {
    setLS('calc_mode', this.value);
    if($('setCalcMode')) $('setCalcMode').value = this.value;
    renderAll();
  };
}

/* Dark Mode */
$('themeBtn').onclick=toggleTheme;

/* Install Guide */
$('installBtn').onclick=function(){$('installOverlay').classList.add('show')};
$('closeInstallBtn').onclick=function(){$('installOverlay').classList.remove('show')};
$('installOverlay').onclick=function(e){if(e.target===this)$('installOverlay').classList.remove('show')};

/* Tabs */
$('tabCalendar').onclick=function(){showPage('calendar')};
$('tabDashboard').onclick=function(){showPage('dashboard')};
$('tabSummary').onclick=function(){showPage('summary')};
$('tabAnnual').onclick=function(){showPage('annual')};

/* Annual year nav */
$('annualPrevBtn').onclick=function(){annualYear--;renderAnnual()};
$('annualNextBtn').onclick=function(){annualYear++;renderAnnual()};
$('annualPdfBtn').onclick=function(){window.print()};

/* Backup warning */
$('backupWarnBtn').onclick=openSettings;

/* Entry */
$('closeEntryBtn').onclick=closeEntry;$('saveEntryBtn').onclick=saveEntry;$('deleteEntryBtn').onclick=deleteEntry;$('entryOverlay').onclick=function(e){if(e.target===this)closeEntry()};
$('leaveType').onchange=previewEntry;$('useHours').oninput=previewEntry;

/* Quick Entry — ซ้ำจากวัน OT ล่าสุด */
$('repeatLastBtn').onclick=function(){
  var data=getCal(), keys=Object.keys(data).sort();
  /* หาวัน OT เงินล่าสุดในรอบบิลปัจจุบัน */
  var lastEntry=null;
  for(var i=keys.length-1;i>=0;i--){
    var k=keys[i], en=data[k];
    if(en&&en.kind==='ot'){var dt=parseDateKey(k);if(inRangeDate(dt,currentPeriod.start,currentPeriod.end)){lastEntry=en;break;}}
  }
  if(!lastEntry){alert('ยังไม่มี OT ในรอบบิลนี้ที่จะซ้ำ');return;}
  $('entryHours').value=lastEntry.hours||'';
  setRad('multiplier',num(lastEntry.multiplier)||1.5);
  setRad('payType',lastEntry.payType||'money');
  previewEntry();
};

/* Settings */
$('closeSettingsBtn').onclick=closeSettings;
$('saveSettingsBtn').onclick=function(){saveSettings(false)};
$('settingsOverlay').onclick=function(e){if(e.target===this)closeSettings()};
$('settingsTutorialAckBtn').onclick=function(){
  localStorage.setItem('settings_tutorial','1');
  $('settingsTutorialOverlay').classList.remove('show');
  saveSettings(true);
};
$('annualTutorialAckBtn').onclick=function(){
  localStorage.setItem('annual_tutorial','1');
  $('annualTutorialOverlay').classList.remove('show');
};

$('leaveType').addEventListener('change', function(){
  if(this.value === 'annual' && localStorage.getItem('annual_tutorial') !== '1'){
    $('annualTutorialOverlay').classList.add('show');
  }
});

$('saveHolidayBtn').onclick=saveHoliday;$('clearHolidayBtn').onclick=clearHolidayForm;
$('exportBtn').onclick=exportData;$('importBtn').onclick=function(){$('importFile').click()};$('importFile').onchange=importFile;
$('pdfBtn').onclick=function(){window.print()};

Array.prototype.forEach.call(document.getElementsByName('entryKind'),function(el){el.onchange=function(){toggleEntryFields();previewEntry()}});
wireInputEvents($('entryOverlay'),previewEntry);
wireInputEvents($('settingsOverlay'),function(){renderKpiInfo();renderDashboard()});

/* KPI Bonus per period — listener ใน Settings */
$('setKpiBonus').addEventListener('input',function(){
  var label=periodLabel(currentPeriod);
  var val=num(this.value);
  if(isNaN(val))val=0;
  saveKpiBonusPct(label,val);
  renderKpiInfo();renderDashboard();
});

/* จัดการปุ่ม Enter ใน Input ทุกตัว เพื่อป้องกันการเลื่อนหน้าจออัตโนมัติ (Auto-scroll) ไปหาปุ่ม */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault(); // ป้องกัน default behavior ที่ชอบพาเลื่อนไปหาปุ่ม submit
    
    // flow สำหรับฟอร์มจัดการวันหยุด (กด Enter แล้วเลื่อนไปช่องถัดไป)
    if (e.target.id === 'holidayDate') {
      if ($('holidayDateEnd')) $('holidayDateEnd').focus();
    } else if (e.target.id === 'holidayDateEnd') {
      if ($('holidayName')) $('holidayName').focus();
    } else {
      // ช่องอื่นๆ กด Enter ให้พับคีย์บอร์ดลง (blur) อย่างเดียว
      e.target.blur();
    }
  }
});
$('setKpiBonus').addEventListener('change',function(){
  var label=periodLabel(currentPeriod);
  var val=num(this.value);
  if(isNaN(val))val=0;
  saveKpiBonusPct(label,val);
  renderKpiInfo();renderDashboard();
});

/* Init */
initTheme();
renderAll();

/* Tutorial */
if($('showTutorialBtn')) $('showTutorialBtn').onclick = function(){ closeSettings(); showTutorial(); };
if(shouldShowTutorial()) setTimeout(showTutorial, 600);
