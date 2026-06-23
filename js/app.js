var today=new Date(), currentPeriod=periodFor(today), activeKey=null, editingHoliday=-1;
var annualYear = today.getFullYear();

function wireInputEvents(root,fn){
  Array.prototype.forEach.call(root.querySelectorAll('input'),function(el){el.addEventListener('input',fn);el.addEventListener('change',fn)});
}

/* ── Event Wiring ── */
$('prevBtn').onclick=function(){currentPeriod=periodFor(addDays(currentPeriod.start,-1));renderAll()};
$('nextBtn').onclick=function(){currentPeriod=periodFor(addDays(currentPeriod.end,1));renderAll()};
$('settingsBtn').onclick=openSettings;$('rateInfo').onclick=openSettings;

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
$('closeSettingsBtn').onclick=closeSettings;$('saveSettingsBtn').onclick=saveSettings;$('settingsOverlay').onclick=function(e){if(e.target===this)closeSettings()};

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
