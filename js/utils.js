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
