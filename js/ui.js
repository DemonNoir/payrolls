/* annualYear is declared in app.js after 'today' */

function showPage(name){
  ['calendar','dashboard','summary','annual'].forEach(function(p){
    $(p+'Page').classList.toggle('on',p===name);
    $('tab'+p.charAt(0).toUpperCase()+p.slice(1)).classList.toggle('on',p===name);
  });
  renderAll();
}

function renderInfo(){
  var st=settings();
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=getKpiBonusPct(curLabel);
  if(isNaN(kpiBonusPct))kpiBonusPct=0;
  var hourlyRate=getHourlyRate(kpiBonusPct);
  var rateStr=st.salaryBase>0?('ค่าแรง '+hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.'):'ยังไม่ตั้งเงินเดือน';
  var cutoff=st.cutoff?('ตัดรอบวันที่ '+st.cutoff):'ตามเดือนปฏิทิน';
  $('rateInfo').innerText=rateStr+' · '+cutoff+' · แตะเพื่อตั้งค่า';
}

/* ── Dark Mode ── */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  var btn=$('themeBtn');
  if(btn) btn.innerText=(t==='dark')?'☀️':(t==='light')?'🌙':'🌓';
}
function toggleTheme(){
  var cur=document.documentElement.getAttribute('data-theme')||'auto';
  var next=cur==='auto'?'dark':cur==='dark'?'light':'auto';
  setLS('theme',next);applyTheme(next);
}
function initTheme(){
  var saved=getLS('theme')||'auto';
  applyTheme(saved);
}

/* ── Migration check ── */
function checkMigration(){
  var oldRate=getLS('ot_rate');
  var newSalary=getLS('ot_salary');
  var notice=$('migrationNotice');
  if(oldRate&&num(oldRate)>0&&(!newSalary||num(newSalary)<=0)){
    notice.classList.remove('hide');
  }else{
    notice.classList.add('hide');
  }
}

function renderCalendar(){
  $('monthLabel').innerText=periodLabel(currentPeriod);
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=getKpiBonusPct(curLabel);
  if(isNaN(kpiBonusPct))kpiBonusPct=0;
  var hourlyRate=getHourlyRate(kpiBonusPct);

  var data=getCal(), grid=$('calendarGrid'); grid.innerHTML='';
  for(var i=0;i<currentPeriod.start.getDay();i++){var blank=document.createElement('div');blank.className='cell empty';grid.appendChild(blank)}

  var cur=new Date(currentPeriod.start), st=periodStats(currentPeriod), set=settings();
  while(cur<=currentPeriod.end){
    var k=dateKey(cur), en=data[k], cls='', badge='', hname=holidayName(k);
    if(hname)cls+=' holiday';
    if(en&&en.kind==='ot'){
      cls+=' '+(en.payType==='leave'?'leave':'money');
      var multCls=num(en.multiplier)===1?' m1':(num(en.multiplier)===3?' m3':'');
      badge='<span class="badge '+(en.payType==='leave'?'leave ':'')+multCls+'">'+hours(en.hours)+'ชม.</span>';
    }else if(en&&en.kind==='use'){
      cls+=' use'; badge='<span class="badge use">ใช้ '+hours(en.hours)+'h</span>';
    }
    var cell=document.createElement('div');
    cell.className='cell'+cls+(k===dateKey(today)?' today':'');
    cell.title=hname||'';
    var isStart=(set.startDate&&k===set.startDate);
    cell.innerHTML=(hname?'<span class="holidayMark">หยุด</span>':'')+(isStart?'<span class="startMark">💼 เริ่มงาน</span>':'')+'<span class="num">'+cur.getDate()+'</span>'+badge;
    cell.onclick=(function(key){return function(){openEntry(key)}})(k);
    grid.appendChild(cell);
    cur=addDays(cur,1);
  }

  $('totalHours').innerText=hours(st.otHours);
  $('totalPay').innerText=money(st.otPay);
  $('bankBox').innerText='วันหยุดสะสม: '+hours(totalBank())+' ชม.';
  $('deductionBox').innerText='รายการหัก: '+money(st.deductions.total)+' · สุทธิ: '+money(st.net);
  $('paydayBox').innerText='เงินออกอีก '+paydayCountdown()+' วัน';

  /* Rate footer */
  var rf=$('rateFooter');
  if(rf){
    var s=settings();
    rf.innerText=s.salaryBase>0?('⏱ อัตราค่าแรง OT: '+hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.'):'';
  }

  checkMigration();
}

function renderDashboard(){
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=getKpiBonusPct(curLabel);
  if(isNaN(kpiBonusPct))kpiBonusPct=0;
  var st=periodStats(currentPeriod), s=settings();

  $('dashOt').innerText=hours(st.otHours)+' ชม.';
  $('dashOtPay').innerText=money(st.otPay);
  $('dashBank').innerText=hours(totalBank())+' ชม.';
  $('dashKpi').innerText=hours(st.kpiDailyPct)+' + '+hours(kpiBonusPct)+'%';
  $('dashKpiAmt').innerText=money(st.kpiTotalMoney)+' (KPI รวม)';
  $('dashPayday').innerText=paydayCountdown()+' วัน';
  $('dashNet').innerText=money(st.net);
  $('dashNetSub').innerText='รายได้ประจำ '+money(st.base)+' + OT '+money(st.otPay)+' + สวัสดิการ '+money(st.welfare.total)+' - รายการหัก '+money(st.deductions.total);
  $('dashHourlyRate').innerText=s.salaryBase>0?(st.hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.'):'— (ยังไม่ตั้งเงินเดือน)';
  $('dashRateDetail').innerText='เงินเดือน '+money(s.salaryBase)+' · KPI Daily '+hours(st.kpiDailyPct)+'% · KPI Bonus '+hours(kpiBonusPct)+'%';

  drawCharts();
}

/* ── KPI Info Box ใน Settings ── */
function renderKpiInfo(){
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=num($('setKpiBonus')?$('setKpiBonus').value:0);
  if(isNaN(kpiBonusPct))kpiBonusPct=0;
  var s=settings();
  var kpiDaily=isNaN(s.kpiPercent)?0:num(s.kpiPercent);
  var kpiTotal=kpiDaily+kpiBonusPct;
  var kpiMoney=num(s.salaryBase)*(kpiTotal/100);
  var hourlyRate=getHourlyRate(kpiBonusPct);
  var baseCalc=num(s.salaryBase)+kpiMoney;

  $('infoKpiDaily').innerText=hours(kpiDaily)+'%';
  $('infoKpiBonus').innerText=hours(kpiBonusPct)+'%';
  $('infoKpiTotal').innerText=hours(kpiTotal)+'%';
  $('infoKpiMoney').innerText=money(kpiMoney);
  $('infoBase').innerText=money(baseCalc);
  $('infoHourlyRate').innerText=s.salaryBase>0?hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.':'— (ยังไม่ตั้งเงินเดือน)';

  var lbl=$('kpiBonusLabel');
  if(lbl) lbl.innerText='KPI Bonus — '+curLabel+' (%)';
}

function renderSummary(){
  var st=periodStats(currentPeriod), s=settings();
  var rows=[
    ['วันทำงานจริง',hours(st.actualDays)+' วัน'],
    ['วันลา/ใช้สิทธิ',hours(st.leaveDays)+' วัน'],
    ['วันที่ทำ OT',st.otDays+' วัน']
  ];
  /* แสดง prorate info ถ้าไม่ใช่เดือนเต็ม */
  if(st.isProrated){
    rows.push(['⚠ ทำงานในรอบนี้',st.employedDays+'/'+st.totalDays+' วัน (หาร 30)']);
    rows.push(['เงินเดือน (Prorate)',money(st.proratedSalary)+' จาก '+money(s.salaryBase)]);
    rows.push(['ค่าบ้าน (Prorate)',money(st.proratedHousing)+' จาก '+money(s.housing)]);
  }else{
    rows.push(['เงินเดือน',money(st.proratedSalary)]);
    rows.push(['ค่าบ้าน',money(st.proratedHousing)]);
  }
  rows=rows.concat([
    ['ชั่วโมง OT',hours(st.otHours)+' ชม.'],
    ['รายได้ OT',money(st.otPay)],
    ['ค่าเดินทาง',money(st.welfare.transport)],
    ['ค่าอาหาร',money(st.welfare.food)],
    ['ค่าอาหาร OT',money(st.welfare.otFood)],
    ['ค่ากะดึก',money(st.welfare.night)],
    ['KPI',money(st.kpi)],
    ['เบี้ยขยัน',money(st.diligence)],
    ['รางวัลอายุงาน',money(st.serviceAward)],
    ['ประกันสังคม',money(st.deductions.social)],
    ['ภาษี',money(st.deductions.tax)],
    ['หักอื่นๆ',money(st.deductions.other)],
    ['รายได้สุทธิ',money(st.net)]
  ]);
  $('monthlySummary').innerHTML=rows.map(function(r,i){
    var cls=i===rows.length-1?' class="row total-row"':' class="row"';
    return '<div'+cls+'><span>'+r[0]+'</span><b>'+r[1]+'</b></div>';
  }).join('');
}

/* ── Annual Summary ── */
function renderAnnual(){
  var lbl=$('annualYearLabel');
  if(lbl) lbl.innerText=(annualYear+543)+' ('+annualYear+')';

  var totOtHours=0,totOtPay=0,totBase=0,totWelfare=0,totSocial=0,totTax=0,totOther=0,totNet=0;
  var monthRows='';

  for(var m=0;m<12;m++){
    var st=monthStats(annualYear,m);
    totOtHours+=st.otHours;totOtPay+=st.otPay;totBase+=st.base;totWelfare+=st.welfare.total;
    totSocial+=st.deductions.social;totTax+=st.deductions.tax;totOther+=st.deductions.other;totNet+=st.net;
    monthRows+='<div class="row"><span>'+MN[m]+'</span><span style="text-align:center;color:var(--muted)">OT '+hours(st.otHours)+' ชม.</span><b>สุทธิ '+money(st.net)+'</b></div>';
  }

  /* ภ.ง.ด.91 box */
  var taxBox=$('annualTaxBox');
  if(taxBox){
    taxBox.innerHTML='<div class="tax-title">📋 ข้อมูลสำหรับยื่น ภ.ง.ด.91 ปี '+(annualYear+543)+'</div>'+
      '<div class="tax-row"><span>รายได้รวมทั้งปี (เงินเดือน+KPI+สวัสดิการ)</span><b>'+money(totBase+totWelfare)+'</b></div>'+
      '<div class="tax-row"><span>รายได้ OT ทั้งปี</span><b>'+money(totOtPay)+'</b></div>'+
      '<div class="tax-row"><span>ประกันสังคมที่หักทั้งปี</span><b>'+money(totSocial)+'</b></div>'+
      '<div class="tax-row"><span>ภาษีที่หักทั้งปี</span><b>'+money(totTax)+'</b></div>'+
      '<div class="tax-row" style="font-weight:900;border-top:1px solid var(--line);margin-top:6px;padding-top:6px"><span>รายได้สุทธิรวมทั้งปี</span><b>'+money(totNet)+'</b></div>';
  }

  var sumEl=$('annualSummary');
  if(sumEl){
    sumEl.innerHTML=[
      ['ชั่วโมง OT รวม',hours(totOtHours)+' ชม.'],
      ['เงิน OT รวม',money(totOtPay)],
      ['รายได้ประจำรวม',money(totBase)],
      ['สวัสดิการรวม',money(totWelfare)],
      ['ประกันสังคมรวม',money(totSocial)],
      ['ภาษีรวม',money(totTax)],
      ['รายได้สุทธิรวม',money(totNet)]
    ].map(function(r,i,a){
      var cls=i===a.length-1?' class="row total-row"':' class="row"';
      return '<div'+cls+'><span>'+r[0]+'</span><b>'+r[1]+'</b></div>';
    }).join('');
  }

  var mEl=$('annualMonths');
  if(mEl) mEl.innerHTML='<div style="padding:8px 12px;font-size:11px;font-weight:900;color:var(--muted)">รายละเอียดรายเดือน</div>'+monthRows;
}

function renderHolidayList(){
  var h=getHolidays(), box=$('holidayList');
  box.innerHTML=h.length?h.map(function(x,i){
    return '<div class="holidayItem"><span><b>'+x.date+'</b><br>'+escapeHtml(x.name)+'</span><button data-edit="'+i+'">แก้ไข</button><button data-del="'+i+'">ลบ</button></div>';
  }).join(''):'<div class="mini">ยังไม่มีวันหยุด</div>';
  Array.prototype.forEach.call(box.querySelectorAll('[data-edit]'),function(b){b.onclick=function(){editHoliday(num(b.getAttribute('data-edit')))}});
  Array.prototype.forEach.call(box.querySelectorAll('[data-del]'),function(b){b.onclick=function(){deleteHoliday(num(b.getAttribute('data-del')))}});
}

function renderAll(){
  renderInfo();renderCalendar();renderDashboard();renderSummary();renderAnnual();renderHolidayList();renderKpiInfo();checkBackupWarning();refreshHistory();
}

function drawCharts(){
  var labels=[],hVals=[],iVals=[],base=new Date(currentPeriod.start.getFullYear(),currentPeriod.start.getMonth(),1);
  for(var i=5;i>=0;i--){var d=new Date(base.getFullYear(),base.getMonth()-i,1), st=monthStats(d.getFullYear(),d.getMonth());labels.push(MS[d.getMonth()]);hVals.push(st.otHours);iVals.push(st.net)}
  drawBar($('hoursChart'),labels,hVals,varColor('--blue'),false);
  drawBar($('incomeChart'),labels,iVals,varColor('--green'),true);
}

function varColor(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim()}

function drawBar(canvas,labels,values,color,isMoney){
  var ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  var bg=varColor('--canvas-bg')||'#ffffff';
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  var max=Math.max.apply(null,values.concat([1])),pad=34,bw=(w-pad*2)/values.length*.58,gap=(w-pad*2)/values.length;
  ctx.strokeStyle=varColor('--line')||'#d9dee8';ctx.beginPath();ctx.moveTo(pad,14);ctx.lineTo(pad,h-pad);ctx.lineTo(w-12,h-pad);ctx.stroke();
  ctx.font='22px sans-serif';ctx.textAlign='center';
  values.forEach(function(v,i){
    var x=pad+i*gap+gap/2, bh=(h-pad-20)*(v/max);
    ctx.fillStyle=color;ctx.fillRect(x-bw/2,h-pad-bh,bw,bh);
    ctx.fillStyle=varColor('--canvas-label')||'#61708a';
    ctx.fillText(labels[i],x,h-8);
    ctx.fillText(isMoney?Math.round(v/1000)+'พัน':String(Math.round(v*10)/10),x,h-pad-bh-7);
  });
}
