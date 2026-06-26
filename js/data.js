/* ── Export / Import ── */
function exportData(){
  /* รวบรวม kpi_bonus_pct keys และ work_days keys ทั้งหมด */
  var extraKeys={};
  for(var i=0;i<localStorage.length;i++){
    var k=localStorage.key(i);
    if(k&&(k.indexOf('kpi_bonus_pct:')=== 0||k.indexOf('work_days:')===0||k.indexOf('pp_')===0)){
      extraKeys[k]=getLS(k);
    }
  }
  var keys=['ot_cal','ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','diligence_enabled','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','night_shift_enabled','sick_leave','personal_leave','absent_days','holidays','social_security','tax','other_deduction','payday','cutoff_day','service_award','start_date','calc_mode'];
  var payload={version:3,exported_at:new Date().toISOString(),data:{},extra:extraKeys};
  keys.forEach(function(k){payload.data[k]=getLS(k)});
  var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='ot-calendar-v3-'+dateKey(today)+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  markExported();
  checkBackupWarning();
}

function validateCal(cal){
  if(!cal||typeof cal!=='object'||Array.isArray(cal))return 'ot_cal ต้องเป็น object';
  for(var k in cal){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(k))return 'พบวันที่ไม่ถูกต้อง: '+k;
    var e=cal[k]; if(!e||typeof e!=='object')return 'ข้อมูลวันที่ '+k+' ไม่ถูกต้อง';
    if(e.kind==='ot'){
      if(num(e.hours)<=0)return 'ชั่วโมง OT ของ '+k+' ไม่ถูกต้อง';
      if(['money','leave'].indexOf(e.payType)<0)return 'ประเภท OT ของ '+k+' ไม่ถูกต้อง';
      if([1,1.5,3].indexOf(num(e.multiplier))<0)return 'เรท OT ของ '+k+' ไม่ถูกต้อง';
    }else if(e.kind==='use'){
      if(num(e.hours)<=0)return 'ชั่วโมงใช้วันหยุดของ '+k+' ไม่ถูกต้อง';
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

function importFile(ev){
  var f=ev.target.files[0]; if(!f)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var obj=JSON.parse(e.target.result), incoming={}, cal=null, hol=null, extraData={};

      if(obj&&obj.version===3&&obj.data){
        /* v3: รองรับ ot_salary + extra kpi_bonus/work_days keys */
        incoming=obj.data; extraData=obj.extra||{};
        var required=['ot_cal','ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','night_shift_enabled','sick_leave','personal_leave','absent_days','holidays','social_security','tax','other_deduction','payday','cutoff_day','service_award'];
        var missing=required.filter(function(k){return !(k in incoming)});
        if(missing.length)throw new Error('ข้อมูลขาดฟิลด์: '+missing.join(', '));
        cal=JSON.parse(incoming.ot_cal||'{}');hol=JSON.parse(incoming.holidays||'[]');
      }
      else if(obj&&obj.version===2&&obj.data){
        /* v2: ot_rate เดิม — ใช้งานได้แต่ไม่มี ot_salary */
        incoming=obj.data;
        cal=JSON.parse(incoming.ot_cal||'{}');hol=JSON.parse(incoming.holidays||'[]');
      }
      else if(obj&&obj.cal){cal=obj.cal;incoming={ot_salary:0,ot_cutoff:obj.cutoff,ot_bank_adj:obj.bankAdj};hol=[]}
      else if(obj&&obj.ot_cal){incoming=obj;cal=obj.ot_cal;hol=obj.holidays||[]}
      else throw new Error('ไม่พบโครงสร้างข้อมูลที่รองรับ');

      var err=validateCal(cal)||validateHolidays(hol); if(err){alert('ไฟล์ไม่ถูกต้อง: '+err);return}
      if(!confirm('นำเข้าข้อมูลจะแทนที่ข้อมูลปัจจุบันทั้งหมด ดำเนินการต่อ?'))return;

      setCal(cal); setHolidays(hol);
      var allowedKeys=['ot_salary','ot_cutoff','ot_bank_adj','salary','housing','diligence','diligence_enabled','kpi_percent','transport_rate','food_rate','ot_food_rate','night_shift_rate','night_shift_enabled','sick_leave','personal_leave','absent_days','social_security','tax','other_deduction','payday','cutoff_day','service_award','start_date','calc_mode'];
      Object.keys(incoming).forEach(function(k){
        if(k==='ot_cal'||k==='holidays'||typeof incoming[k]==='undefined'||incoming[k]===null)return;
        if(allowedKeys.indexOf(k)>=0)setLS(k,incoming[k]);
      });
      /* restore extra keys (kpi_bonus_pct / work_days / pp_*) */
      Object.keys(extraData).forEach(function(k){
        if((k.indexOf('kpi_bonus_pct:')===0||k.indexOf('work_days:')===0||k.indexOf('pp_')===0)&&extraData[k]!==null)setLS(k,extraData[k]);
      });
      if(incoming.social_security!==undefined)setLS('ot_ss',incoming.social_security);
      if(incoming.tax!==undefined)setLS('ot_tax',incoming.tax);
      if(incoming.other_deduction!==undefined)setLS('ot_other',incoming.other_deduction);
      /* Migration: ถ้า v2 มี ot_rate แต่ไม่มี ot_salary ให้แจ้ง */
      if(incoming.ot_rate&&num(incoming.ot_rate)>0&&(!incoming.ot_salary||num(incoming.ot_salary)<=0)){
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
  var data=getCal(), months={}, weeks={};
  Object.keys(data).forEach(function(k){
    var d=parseDateKey(k), mk=d.getFullYear()+'-'+pad(d.getMonth()+1), wk=dateKey(weekStart(d));
    months[mk]=monthStats(d.getFullYear(),d.getMonth());
    weeks[wk]=periodStats({start:weekStart(d),end:addDays(weekStart(d),6)});
  });
  localStorage.setItem('monthly_history',JSON.stringify(months));
  localStorage.setItem('weekly_history',JSON.stringify(weeks));
  idbSave(); /* auto-backup ทุกครั้งที่มีการเปลี่ยนแปลง */
}
