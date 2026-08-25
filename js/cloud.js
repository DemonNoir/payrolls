/* ── GitHub Gist Cloud Sync Module ── */

function getCloudConfig(){
  return {
    token: getLS('gist_token') || '',
    gistId: getLS('gist_id') || '',
    autoSync: getLS('gist_autosync') === '1',
    lastSync: getLS('gist_last_sync') || '',
    user: getLS('gist_user') || ''
  };
}

function saveCloudConfig(cfg){
  if(cfg.token !== undefined) setLS('gist_token', cfg.token.trim());
  if(cfg.gistId !== undefined) setLS('gist_id', cfg.gistId.trim());
  if(cfg.autoSync !== undefined) setLS('gist_autosync', cfg.autoSync ? '1' : '0');
  if(cfg.lastSync !== undefined) setLS('gist_last_sync', cfg.lastSync);
  if(cfg.user !== undefined) setLS('gist_user', cfg.user);
}

function clearCloudConfig(){
  localStorage.removeItem('gist_token');
  localStorage.removeItem('gist_id');
  localStorage.removeItem('gist_autosync');
  localStorage.removeItem('gist_last_sync');
  localStorage.removeItem('gist_user');
}

function buildBackupData(){
  var extraKeys = {};
  for(var i = 0; i < localStorage.length; i++){
    var k = localStorage.key(i);
    if(k && (k.indexOf('kpi_bonus_pct:') === 0 || k.indexOf('work_days:') === 0 || k.indexOf('pp_') === 0 || k.indexOf('period_settings:') === 0)){
      extraKeys[k] = getLS(k);
    }
  }
  var keys = ['ot_cal','ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','diligence_enabled','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','sick_leave','personal_leave','absent_days','holidays','social_security','tax','other_deduction','payday','cutoff_day','service_award','start_date','calc_mode'];
  var payload = {
    version: 3,
    exported_at: new Date().toISOString(),
    client: 'Payroll PWA Cloud Sync',
    data: {},
    extra: extraKeys
  };
  keys.forEach(function(k){ payload.data[k] = getLS(k); });
  return payload;
}

function applyBackupData(obj){
  var incoming = {}, cal = null, hol = null, extraData = {};
  if(obj && obj.version === 3 && obj.data){
    incoming = obj.data;
    extraData = obj.extra || {};
    var required = ['ot_cal','ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','sick_leave','personal_leave','absent_days','holidays','social_security','tax','other_deduction','payday','cutoff_day','service_award'];
    var missing = required.filter(function(k){ return !(k in incoming); });
    if(missing.length) throw new Error('ข้อมูลขาดฟิลด์: ' + missing.join(', '));
    cal = JSON.parse(incoming.ot_cal || '{}');
    hol = JSON.parse(incoming.holidays || '[]');
  } else if(obj && obj.version === 2 && obj.data){
    incoming = obj.data;
    cal = JSON.parse(incoming.ot_cal || '{}');
    hol = JSON.parse(incoming.holidays || '[]');
  } else if(obj && obj.cal){
    cal = obj.cal;
    incoming = { ot_salary: 0, ot_cutoff: obj.cutoff, ot_bank_adj: obj.bankAdj };
    hol = [];
  } else if(obj && obj.ot_cal){
    incoming = obj;
    cal = obj.ot_cal;
    hol = obj.holidays || [];
  } else {
    throw new Error('ไม่พบโครงสร้างข้อมูลที่ถูกต้อง');
  }

  var err = validateCal(cal) || validateHolidays(hol);
  if(err) throw new Error(err);

  setCal(cal);
  setHolidays(hol);

  var allowedKeys = ['ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','diligence_enabled','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','sick_leave','personal_leave','absent_days','social_security','tax','other_deduction','payday','cutoff_day','service_award','start_date','calc_mode'];
  Object.keys(incoming).forEach(function(k){
    if(k === 'ot_cal' || k === 'holidays' || typeof incoming[k] === 'undefined' || incoming[k] === null) return;
    if(allowedKeys.indexOf(k) >= 0) setLS(k, incoming[k]);
  });

  Object.keys(extraData).forEach(function(k){
    if((k.indexOf('kpi_bonus_pct:') === 0 || k.indexOf('work_days:') === 0 || k.indexOf('pp_') === 0 || k.indexOf('period_settings:') === 0) && extraData[k] !== null){
      setLS(k, extraData[k]);
    }
  });

  if(incoming.social_security !== undefined) setLS('ot_ss', incoming.social_security);
  if(incoming.tax !== undefined) setLS('ot_tax', incoming.tax);
  if(incoming.other_deduction !== undefined) setLS('ot_other', incoming.other_deduction);

  markExported();
  checkBackupWarning();
  closeForcedBackupReminder();
  currentPeriod = periodFor(today);
  renderAll();
}

async function testGitHubToken(token){
  if(!token) throw new Error('กรุณากรอก GitHub Token');
  var res = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json'
    }
  });
  if(res.status === 401) throw new Error('Token ไม่ถูกต้อง หรือหมดอายุแล้ว');
  if(!res.ok) throw new Error('เกิดข้อผิดพลาดจาก GitHub (' + res.status + ')');
  var user = await res.json();
  return user;
}

async function cloudBackup(silent){
  var cfg = getCloudConfig();
  var token = $('cloudGistToken') ? $('cloudGistToken').value.trim() : cfg.token;
  var gistId = $('cloudGistId') ? $('cloudGistId').value.trim() : cfg.gistId;

  if(!token){
    if(!silent) alert('กรุณากรอก GitHub Personal Access Token ก่อนครับ');
    return;
  }

  var btn = $('cloudBackupBtn');
  var origText = btn ? btn.innerText : '';
  if(btn && !silent) { btn.disabled = true; btn.innerText = '⏳ กำลังอัปโหลด...'; }

  try {
    var payload = buildBackupData();
    var gistBody = {
      description: 'Payroll OT Calendar Backup [Private]',
      public: false,
      files: {
        'payroll_backup.json': {
          content: JSON.stringify(payload, null, 2)
        }
      }
    };

    var url = 'https://api.github.com/gists';
    var method = 'POST';

    if(gistId){
      url = 'https://api.github.com/gists/' + gistId;
      method = 'PATCH';
    }

    var res = await fetch(url, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gistBody)
    });

    if(res.status === 401) throw new Error('Token ไม่ถูกต้องหรือไม่มีสิทธิ์เข้าถึง Gist (โปรดตรวจสอบว่าได้เลือก scope "gist" หรือไม่)');
    if(res.status === 404 && gistId) throw new Error('ไม่พบ Gist ID นี้ในบัญชีของคุณ (อาจถูกลบไปแล้ว ให้ลองลบช่อง Gist ID เพื่อสร้างใหม่)');
    if(!res.ok) throw new Error('GitHub API Error (' + res.status + ')');

    var result = await res.json();
    var newGistId = result.id;
    var nowStr = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

    saveCloudConfig({
      token: token,
      gistId: newGistId,
      lastSync: nowStr
    });

    markExported();
    checkBackupWarning();
    closeForcedBackupReminder();
    renderCloudStatus();

    if(!silent){
      alert('☁️ สำรองข้อมูลขึ้น GitHub Gist เรียบร้อยแล้ว!\n\nGist ID: ' + newGistId + '\nเวลา: ' + nowStr);
    }
  } catch(err) {
    if(!silent) alert('❌ การสำรองข้อมูลล้มเหลว: ' + err.message);
    console.error('Cloud Backup Error:', err);
  } finally {
    if(btn && !silent) { btn.disabled = false; btn.innerText = origText; }
  }
}

async function cloudRestore(){
  var cfg = getCloudConfig();
  var token = $('cloudGistToken') ? $('cloudGistToken').value.trim() : cfg.token;
  var gistId = $('cloudGistId') ? $('cloudGistId').value.trim() : cfg.gistId;

  if(!token){ alert('กรุณากรอก GitHub Token ก่อนครับ'); return; }
  if(!gistId){ alert('กรุณากรอก Gist ID หรือกด "สำรองข้อมูล" ก่อนเพื่อสร้าง Gist'); return; }

  if(!confirm('⚠️ การกู้คืนข้อมูลจาก Cloud จะนำข้อมูลบน Gist มาเขียนทับข้อมูลในเครื่องนี้ทั้งหมด\n\nต้องการดำเนินการต่อหรือไม่?')){
    return;
  }

  var btn = $('cloudRestoreBtn');
  var origText = btn ? btn.innerText : '';
  if(btn) { btn.disabled = true; btn.innerText = '⏳ กำลังดึงข้อมูล...'; }

  try {
    var res = await fetch('https://api.github.com/gists/' + gistId, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json'
      }
    });

    if(res.status === 401) throw new Error('Token ไม่ถูกต้อง');
    if(res.status === 404) throw new Error('ไม่พบ Gist ID นี้');
    if(!res.ok) throw new Error('GitHub API Error (' + res.status + ')');

    var gist = await res.json();
    var fileObj = gist.files['payroll_backup.json'] || gist.files[Object.keys(gist.files)[0]];
    if(!fileObj || !fileObj.content) throw new Error('ไม่พบไฟล์ payroll_backup.json ใน Gist');

    var rawContent = fileObj.content;
    if(fileObj.truncated && fileObj.raw_url){
      var rawRes = await fetch(fileObj.raw_url);
      rawContent = await rawRes.text();
    }

    var parsed = JSON.parse(rawContent);
    applyBackupData(parsed);

    var nowStr = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    saveCloudConfig({ token: token, gistId: gistId, lastSync: nowStr });
    renderCloudStatus();

    alert('✅ กู้คืนข้อมูลจาก Cloud สำเร็จเรียบร้อยแล้ว!');
    closeCloudModal();
    if($('settingsOverlay')) closeSettings();
  } catch(err) {
    alert('❌ การกู้คืนข้อมูลล้มเหลว: ' + err.message);
    console.error('Cloud Restore Error:', err);
  } finally {
    if(btn) { btn.disabled = false; btn.innerText = origText; }
  }
}

function renderCloudStatus(){
  var cfg = getCloudConfig();
  if($('cloudGistToken')) $('cloudGistToken').value = cfg.token;
  if($('cloudGistId')) $('cloudGistId').value = cfg.gistId;
  if($('cloudAutoSyncToggle')) $('cloudAutoSyncToggle').checked = cfg.autoSync;

  var statusBadge = $('cloudStatusBadge');
  var syncInfo = $('cloudLastSyncInfo');
  var gistLink = $('cloudGistLink');

  if(cfg.token && cfg.gistId){
    if(statusBadge){
      statusBadge.innerHTML = '<span class="cloud-dot online"></span> <b>เชื่อมต่อแล้ว</b>';
      statusBadge.className = 'cloud-badge active';
    }
    if(syncInfo) syncInfo.innerText = cfg.lastSync ? ('ซิงค์ล่าสุด: ' + cfg.lastSync) : 'ยังไม่มีการซิงค์';
    if(gistLink){
      gistLink.href = 'https://gist.github.com/' + cfg.gistId;
      gistLink.style.display = 'inline-flex';
      gistLink.innerText = '🔗 ดูไฟล์บน Gist (' + cfg.gistId.slice(0,7) + '...)';
    }
  } else if(cfg.token){
    if(statusBadge){
      statusBadge.innerHTML = '<span class="cloud-dot pending"></span> <b>พร้อมสำรองข้อมูลครั้งแรก</b>';
      statusBadge.className = 'cloud-badge ready';
    }
    if(syncInfo) syncInfo.innerText = 'กรอก Token แล้ว (กดปุ่มอัปโหลดเพื่อสร้าง Gist)';
    if(gistLink) gistLink.style.display = 'none';
  } else {
    if(statusBadge){
      statusBadge.innerHTML = '<span class="cloud-dot offline"></span> <b>ยังไม่ได้เชื่อมต่อ</b>';
      statusBadge.className = 'cloud-badge';
    }
    if(syncInfo) syncInfo.innerText = 'ใส่ Token เพื่อเริ่มใช้งานระบบคลาวด์ฟรี';
    if(gistLink) gistLink.style.display = 'none';
  }
}

function openCloudModal(){
  renderCloudStatus();
  var overlay = $('cloudSyncOverlay');
  if(overlay) overlay.classList.add('show');
}

function closeCloudModal(){
  var overlay = $('cloudSyncOverlay');
  if(overlay) overlay.classList.remove('show');
}

function copyToClipboard(text, successMsg){
  if(!text) return false;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      if(successMsg) alert(successMsg);
    }).catch(function(){
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg){
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if(successMsg) alert(successMsg);
  } catch(e) {
    prompt('กรุณาคัดลอกข้อความด้านล่าง:', text);
  }
  document.body.removeChild(ta);
}

function initCloudEvents(){
  /* Secret Trigger 1: Secret glass button in settings */
  var secretBtn = $('secretCloudBtn');
  if(secretBtn) secretBtn.onclick = function(){
    animateIcon(this, 'icon-anim-spin');
    openCloudModal();
  };

  /* Secret Trigger 2: Triple Click on Month Label (Easter Egg) */
  var headerClicks = 0, headerClickTimer = null;
  var monthEl = $('monthLabel');
  if(monthEl){
    monthEl.addEventListener('click', function(){
      headerClicks++;
      clearTimeout(headerClickTimer);
      if(headerClicks >= 3){
        headerClicks = 0;
        openCloudModal();
      } else {
        headerClickTimer = setTimeout(function(){ headerClicks = 0; }, 600);
      }
    });
  }

  /* Password visibility toggle */
  var toggleEye = $('toggleTokenVisibility');
  if(toggleEye){
    toggleEye.onclick = function(){
      var input = $('cloudGistToken');
      if(input){
        if(input.type === 'password'){
          input.type = 'text';
          this.innerText = '🙈';
        } else {
          input.type = 'password';
          this.innerText = '👁️';
        }
      }
    };
  }

  /* Copy Buttons */
  if($('copyGistIdBtn')) $('copyGistIdBtn').onclick = function(){
    var id = $('cloudGistId') ? $('cloudGistId').value.trim() : '';
    if(!id){ alert('⚠️ ยังไม่มี Gist ID ให้คัดลอก (กดสำรองข้อมูลครั้งแรกก่อนเพื่อสร้าง Gist)'); return; }
    copyToClipboard(id, '📋 คัดลอก Gist ID เรียบร้อยแล้ว:\n\n' + id);
  };

  if($('copyTokenBtn')) $('copyTokenBtn').onclick = function(){
    var token = $('cloudGistToken') ? $('cloudGistToken').value.trim() : '';
    if(!token){ alert('⚠️ ยังไม่มี Token ให้คัดลอก'); return; }
    copyToClipboard(token, '📋 คัดลอก GitHub Token เรียบร้อยแล้ว');
  };

  if($('copyMigrationKeyBtn')) $('copyMigrationKeyBtn').onclick = function(){
    var token = $('cloudGistToken') ? $('cloudGistToken').value.trim() : '';
    var id = $('cloudGistId') ? $('cloudGistId').value.trim() : '';
    if(!token && !id){ alert('⚠️ ยังไม่มีข้อมูลเชื่อมต่อให้คัดลอก'); return; }
    var text = '🔑 ข้อมูลเชื่อมต่อ Cloud Sync (Payroll App)\nToken: ' + (token || '(ยังไม่มี)') + '\nGist ID: ' + (id || '(ยังไม่มี)');
    copyToClipboard(text, '📋 คัดลอกข้อมูลสำหรับย้ายเครื่องเรียบร้อยแล้ว!\n\nคุณสามารถนำข้อความนี้ไปวางในเครื่องใหม่ หรือส่งเข้า LINE / Notes ได้เลยครับ');
  };

  /* Actions */
  if($('cloudBackupBtn')) $('cloudBackupBtn').onclick = function(){ cloudBackup(false); };
  if($('cloudRestoreBtn')) $('cloudRestoreBtn').onclick = function(){ cloudRestore(); };

  if($('cloudTestBtn')) $('cloudTestBtn').onclick = async function(){
    var token = $('cloudGistToken').value.trim();
    if(!token){ alert('กรุณากรอก Token ก่อนทดสอบ'); return; }
    var btn = this;
    var orig = btn.innerText;
    btn.disabled = true; btn.innerText = '⏳ ตรวจสอบ...';
    try {
      var user = await testGitHubToken(token);
      saveCloudConfig({ token: token, user: user.login });
      alert('✨ เชื่อมต่อสำเร็จ!\n\nผู้ใช้ GitHub: @' + user.login + (user.name ? ' (' + user.name + ')' : ''));
      renderCloudStatus();
    } catch(e) {
      alert('❌ เชื่อมต่อไม่สำเร็จ: ' + e.message);
    } finally {
      btn.disabled = false; btn.innerText = orig;
    }
  };

  if($('cloudClearBtn')) $('cloudClearBtn').onclick = function(){
    if(confirm('ต้องการล้างการเชื่อมต่อ GitHub Gist ออกจากเครื่องนี้หรือไม่? (ไฟล์บน GitHub จะไม่ถูกลบ)')){
      clearCloudConfig();
      renderCloudStatus();
      alert('ล้างการเชื่อมต่อเรียบร้อยแล้ว');
    }
  };

  if($('cloudAutoSyncToggle')) $('cloudAutoSyncToggle').onchange = function(){
    saveCloudConfig({ autoSync: this.checked });
  };

  if($('closeCloudBtn')) $('closeCloudBtn').onclick = closeCloudModal;
  if($('cloudSyncOverlay')) $('cloudSyncOverlay').onclick = function(e){
    if(e.target === this) closeCloudModal();
  };
}

