function showPage(name){
  ['calendar','dashboard','summary'].forEach(function(p){
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
    var isStart = (set.startDate && k === set.startDate);
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

  checkMigration();
}

function renderDashboard(){
  var curLabel=periodLabel(currentPeriod);
  var kpiBonusPct=getKpiBonusPct(curLabel);
  if(isNaN(kpiBonusPct))kpiBonusPct=0;
  var st=periodStats(currentPeriod), s=settings();

  /* sync KPI Bonus input */
  $('kpiBonusPct').value=kpiBonusPct||'';

  /* KPI Info Box */
  $('infoKpiDaily').innerText=hours(st.kpiDailyPct)+'%';
  $('infoKpiBonus').innerText=hours(kpiBonusPct)+'%';
  $('infoKpiTotal').innerText=hours(st.kpiTotalPct)+'%';
  $('infoKpiMoney').innerText=money(st.kpiTotalMoney);
  var baseCalc=num(s.salaryBase)+st.kpiTotalMoney;
  $('infoBase').innerText=money(baseCalc);
  $('infoHourlyRate').innerText=s.salaryBase>0?st.hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.':'— (ยังไม่ตั้งเงินเดือน)';

  /* Banner */
  var banner=$('kpiBanner');
  if(kpiBonusPct===0&&s.salaryBase>0){
    banner.style.display='block';
  }else{
    banner.style.display='none';
  }

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

function renderSummary(){
  var st=periodStats(currentPeriod);
  var rows=[
    ['วันทำงานจริง',hours(st.actualDays)+' วัน'],
    ['วันลา/ใช้สิทธิ',hours(st.leaveDays)+' วัน'],
    ['วันที่ทำ OT',st.otDays+' วัน'],
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
  ];
  $('monthlySummary').innerHTML=rows.map(function(r){return '<div class="row"><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'}).join('');
}

function renderHolidayList(){
  var h=getHolidays(), box=$('holidayList');
  box.innerHTML=h.length?h.map(function(x,i){
    return '<div class="holidayItem"><span><b>'+x.date+'</b><br>'+escapeHtml(x.name)+'</span><button data-edit="'+i+'">แก้ไข</button><button data-del="'+i+'">ลบ</button></div>';
  }).join(''):'<div class="mini">ยังไม่มีวันหยุด</div>';
  Array.prototype.forEach.call(box.querySelectorAll('[data-edit]'),function(b){b.onclick=function(){editHoliday(num(b.getAttribute('data-edit')))}});
  Array.prototype.forEach.call(box.querySelectorAll('[data-del]'),function(b){b.onclick=function(){deleteHoliday(num(b.getAttribute('data-del')))}});
}

function renderAll(){renderInfo();renderCalendar();renderDashboard();renderSummary();renderHolidayList();refreshHistory()}

function drawCharts(){
  var labels=[],hVals=[],iVals=[],base=new Date(currentPeriod.start.getFullYear(),currentPeriod.start.getMonth(),1);
  for(var i=5;i>=0;i--){var d=new Date(base.getFullYear(),base.getMonth()-i,1), st=monthStats(d.getFullYear(),d.getMonth());labels.push(MS[d.getMonth()]);hVals.push(st.otHours);iVals.push(st.net)}
  drawBar($('hoursChart'),labels,hVals,varColor('--blue'),false);
  drawBar($('incomeChart'),labels,iVals,varColor('--green'),true);
}

function varColor(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim()}

function drawBar(canvas,labels,values,color,isMoney){
  var ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
  var max=Math.max.apply(null,values.concat([1])),pad=34,bw=(w-pad*2)/values.length*.58,gap=(w-pad*2)/values.length;
  ctx.strokeStyle='#d9dee8';ctx.beginPath();ctx.moveTo(pad,14);ctx.lineTo(pad,h-pad);ctx.lineTo(w-12,h-pad);ctx.stroke();
  ctx.font='22px sans-serif';ctx.textAlign='center';
  values.forEach(function(v,i){
    var x=pad+i*gap+gap/2, bh=(h-pad-20)*(v/max);
    ctx.fillStyle=color;ctx.fillRect(x-bw/2,h-pad-bh,bw,bh);
    ctx.fillStyle='#61708a';ctx.fillText(labels[i],x,h-8);
    ctx.fillText(isMoney?Math.round(v/1000)+'พัน':String(Math.round(v*10)/10),x,h-pad-bh-7);
  });
}
