var today=new Date(), currentPeriod=periodFor(today), activeKey=null, editingHoliday=-1;
var annualYear = today.getFullYear();

function wireInputEvents(root,fn){
  Array.prototype.forEach.call(root.querySelectorAll('input'),function(el){el.addEventListener('input',fn);el.addEventListener('change',fn)});
}

/* ── Navbar Button Animation Helper ── */
function animateIcon(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', function handler() {
    el.classList.remove(cls);
    el.removeEventListener('animationend', handler);
  });
}

/* ── Event Wiring ── */
$('prevBtn').onclick = function() {
  animateIcon(this, 'icon-anim-left');
  currentPeriod = periodFor(addDays(currentPeriod.start, -1));
  renderAll();
};
$('nextBtn').onclick = function() {
  animateIcon(this, 'icon-anim-right');
  currentPeriod = periodFor(addDays(currentPeriod.end, 1));
  renderAll();
};
$('settingsBtn').onclick = function() {
  animateIcon(this, 'icon-anim-spin');
  openSettings();
};
if($('topRateInfo')) $('topRateInfo').onclick=openSettings;

if($('calcModeSelect')) {
  $('calcModeSelect').value = settings().calcMode || 'realtime';
  $('calcModeSelect').onchange = function() {
    setLS('calc_mode', this.value);
    if($('setCalcMode')) $('setCalcMode').value = this.value;
    renderAll();
  };
}

/* Dark Mode — animate flip on toggle */
$('themeBtn').onclick = function() {
  animateIcon(this, 'icon-anim-flip');
  toggleTheme();
};

/* Docs Viewer */
if($('docsBtn')) $('docsBtn').onclick = function() {
  animateIcon(this, 'icon-anim-bounce');
  openDocsOverlay();
};

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

/* Mandatory Backup Reminder Popup */
if($('bakReminderExportBtn')) $('bakReminderExportBtn').onclick=exportData;

/* Install Guide */
if($('closeInstallBtn')) $('closeInstallBtn').onclick=function(){$('installOverlay').classList.remove('show')};
if($('installOverlay'))  $('installOverlay').onclick=function(e){if(e.target===this)$('installOverlay').classList.remove('show')};

/* Entry */
$('closeEntryBtn').onclick=closeEntry;$('saveEntryBtn').onclick=saveEntry;$('deleteEntryBtn').onclick=deleteEntry;$('entryOverlay').onclick=function(e){if(e.target===this)closeEntry()};
$('leaveType').onchange=previewEntry;$('useHours').oninput=previewEntry;

/* Quick Entry — ซ้ำจากวัน OT ล่าสุด */
$('repeatLastBtn').onclick=function(){
  var data=getCal(), keys=Object.keys(data).sort();
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

/* KPI Bonus per period */
$('setKpiBonus').addEventListener('input',function(){
  var label=periodLabel(currentPeriod);
  var val=num(this.value);
  if(isNaN(val))val=0;
  saveKpiBonusPct(label,val);
  renderKpiInfo();renderDashboard();
});

/* Enter key handler */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault();
    if (e.target.id === 'holidayDate') {
      if ($('holidayDateEnd')) $('holidayDateEnd').focus();
    } else if (e.target.id === 'holidayDateEnd') {
      if ($('holidayName')) $('holidayName').focus();
    } else {
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

/* ══════════════════════════════════════════════════════════════
 * Profile Avatar System
 * ══════════════════════════════════════════════════════════════ */
(function() {
  var AVATAR_KEY = 'user_avatar';
  var MAX_SIZE = 200; // px — ย่อรูปให้เหลือสูงสุด 200×200
  var ctx_open = false;

  var btn       = $('avatarBtn');
  var imgEl     = $('avatarImg');
  var defaultEl = $('avatarDefault');
  var fileInput = $('avatarFileInput');
  var ctxMenu   = $('avatarCtxMenu');
  var ctxUpload = $('avatarCtxUpload');
  var ctxDelete = $('avatarCtxDelete');
  var ctxDivider= $('avatarCtxDivider');

  if (!btn) return;

  /* ── Dynamic Favicon & Apple Touch Icon ── */
  function updateDynamicIcons(dataUrl) {
    var defaultIcon = 'icons/icon-192.png';
    var iconUrl = dataUrl || defaultIcon;

    var fav = $('dynamicFavicon');
    if (!fav) {
      fav = document.createElement('link');
      fav.id = 'dynamicFavicon';
      fav.rel = 'icon';
      document.head.appendChild(fav);
    }
    fav.href = iconUrl;

    var appleIcon = $('dynamicAppleIcon');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.id = 'dynamicAppleIcon';
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;
  }

  /* ── Apply avatar to UI ── */
  function applyAvatar(dataUrl) {
    if (dataUrl) {
      imgEl.src = dataUrl;
      imgEl.classList.add('has-photo');
      defaultEl.classList.add('hidden');
      btn.classList.add('has-photo');
      if (ctxDelete) { ctxDelete.style.display = 'flex'; }
      if (ctxDivider) { ctxDivider.style.display = 'block'; }
    } else {
      imgEl.src = '';
      imgEl.classList.remove('has-photo');
      defaultEl.classList.remove('hidden');
      btn.classList.remove('has-photo');
      if (ctxDelete) { ctxDelete.style.display = 'none'; }
      if (ctxDivider) { ctxDivider.style.display = 'none'; }
    }
    updateDynamicIcons(dataUrl);
  }

  /* ── Load saved avatar on boot ── */
  var saved = localStorage.getItem(AVATAR_KEY);
  applyAvatar(saved || null);

  /* ── Resize + compress image via Canvas ── */
  function processImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1);
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        /* ลองบีบอัด WebP ก่อน (80%) ถ้าใหญ่เกิน 200KB ลดเป็น 60% */
        var dataUrl = canvas.toDataURL('image/webp', 0.80);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.80);
        }
        if (dataUrl.length > 200 * 1024 * 1.33) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.60);
        }
        callback(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ── Save to LocalStorage (with quota error handling) ── */
  function saveAvatar(dataUrl) {
    try {
      localStorage.setItem(AVATAR_KEY, dataUrl);
      applyAvatar(dataUrl);
    } catch(e) {
      /* Quota Exceeded → บีบอัดเพิ่มเป็น 40% + ย่อเหลือ 120px */
      var canvas = document.createElement('canvas');
      var img2 = new Image();
      img2.onload = function() {
        var scale = Math.min(120 / img2.width, 120 / img2.height, 1);
        canvas.width  = Math.round(img2.width  * scale);
        canvas.height = Math.round(img2.height * scale);
        canvas.getContext('2d').drawImage(img2, 0, 0, canvas.width, canvas.height);
        var smaller = canvas.toDataURL('image/jpeg', 0.40);
        try {
          localStorage.setItem(AVATAR_KEY, smaller);
          applyAvatar(smaller);
        } catch(e2) {
          alert('พื้นที่จัดเก็บข้อมูล (LocalStorage) เต็มแล้วครับ\nกรุณาสำรองข้อมูล แล้วลองใหม่อีกครั้ง');
        }
      };
      img2.src = dataUrl;
    }
  }

  /* ── File Input change handler ── */
  fileInput.addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    this.value = '';
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP, GIF)');
      return;
    }
    processImage(file, saveAvatar);
  });

  /* ── Context Menu helpers ── */
  function openCtxMenu() {
    var rect = btn.getBoundingClientRect();
    var menuH = 110; // ประมาณ
    var top = rect.bottom + 6;
    if (top + menuH > window.innerHeight - 10) {
      top = rect.top - menuH - 6;
    }
    ctxMenu.style.top   = top + 'px';
    ctxMenu.style.right = (window.innerWidth - rect.right) + 'px';
    ctxMenu.style.left  = 'auto';
    ctxMenu.classList.add('show');
    ctx_open = true;
  }

  function closeCtxMenu() {
    ctxMenu.classList.remove('show');
    ctx_open = false;
  }

  /* ── Avatar button → toggle context menu ── */
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (ctx_open) { closeCtxMenu(); return; }
    openCtxMenu();
  });

  /* ── Right-click → context menu ── */
  btn.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (ctx_open) { closeCtxMenu(); return; }
    openCtxMenu();
  });

  /* ── Context menu actions ── */
  if (ctxUpload) ctxUpload.addEventListener('click', function() {
    closeCtxMenu();
    fileInput.click();
  });

  if (ctxDelete) ctxDelete.addEventListener('click', function() {
    closeCtxMenu();
    if (!confirm('ลบรูปโปรไฟล์?')) return;
    localStorage.removeItem(AVATAR_KEY);
    applyAvatar(null);
  });

  /* ── Close on outside click ── */
  document.addEventListener('click', function(e) {
    if (ctx_open && !ctxMenu.contains(e.target) && e.target !== btn) {
      closeCtxMenu();
    }
  });

  /* ── Close on Escape ── */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && ctx_open) closeCtxMenu();
  });
})();

/* ── Init ── */
initTheme();
renderAll();
checkForcedBackupReminder();
if(typeof initCloudEvents === 'function') initCloudEvents();

/* Tutorial */
if($('showTutorialBtn')) $('showTutorialBtn').onclick = function(){ closeSettings(); showTutorial(); };
if(shouldShowTutorial()) setTimeout(showTutorial, 600);
