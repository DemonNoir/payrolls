var today=new Date(), currentPeriod=periodFor(today), currentWeek=weekStart(today), activeKey=null, editingHoliday=-1;

function wireInputEvents(root,fn){
  Array.prototype.forEach.call(root.querySelectorAll('input'),function(el){el.addEventListener('input',fn);el.addEventListener('change',fn)});
}

/* ── Event Wiring ── */
$('prevBtn').onclick=function(){currentPeriod=periodFor(addDays(currentPeriod.start,-1));renderAll()};
$('nextBtn').onclick=function(){currentPeriod=periodFor(addDays(currentPeriod.end,1));renderAll()};
$('settingsBtn').onclick=openSettings;$('rateInfo').onclick=openSettings;

$('tabCalendar').onclick=function(){showPage('calendar')};$('tabDashboard').onclick=function(){showPage('dashboard')};$('tabWeekly').onclick=function(){showPage('weekly')};
$('weekPrev').onclick=function(){currentWeek=addDays(currentWeek,-7);renderAll()};$('weekNext').onclick=function(){currentWeek=addDays(currentWeek,7);renderAll()};

$('closeEntryBtn').onclick=closeEntry;$('saveEntryBtn').onclick=saveEntry;$('deleteEntryBtn').onclick=deleteEntry;$('entryOverlay').onclick=function(e){if(e.target===this)closeEntry()};

$('closeSettingsBtn').onclick=closeSettings;$('saveSettingsBtn').onclick=saveSettings;$('settingsOverlay').onclick=function(e){if(e.target===this)closeSettings()};

$('saveHolidayBtn').onclick=saveHoliday;$('clearHolidayBtn').onclick=clearHolidayForm;
$('exportBtn').onclick=exportData;$('importBtn').onclick=function(){$('importFile').click()};$('importFile').onchange=importFile;
$('pdfBtn').onclick=function(){window.print()};

Array.prototype.forEach.call(document.getElementsByName('entryKind'),function(el){el.onchange=function(){toggleEntryFields();previewEntry()}});
wireInputEvents($('entryOverlay'),previewEntry);
wireInputEvents($('settingsOverlay'),function(){renderDashboard()});

/* KPI Bonus per period — listener สำคัญ ห้ามพลาด */
$('kpiBonusPct').addEventListener('input',function(){
  var label=periodLabel(currentPeriod);
  var val=num(this.value);
  if(isNaN(val))val=0;
  saveKpiBonusPct(label,val);
  renderAll();
});
$('kpiBonusPct').addEventListener('change',function(){
  var label=periodLabel(currentPeriod);
  var val=num(this.value);
  if(isNaN(val))val=0;
  saveKpiBonusPct(label,val);
  renderAll();
});

/* Init app */
renderAll();
