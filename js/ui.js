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
  if($('topRateInfo')) $('topRateInfo').innerText=rateStr+' · '+cutoff+' · แตะเพื่อตั้งค่า';
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
  var labels=[],hVals=[],iVals=[];
  /* เดินย้อน 5 รอบบิลจากรอบปัจจุบัน แล้วใช้ periodFor เพื่อตัดตามวันตัดยอดบิล */
  var periods=[];
  var p=currentPeriod;
  for(var i=0;i<6;i++){
    periods.unshift(p);
    p=periodFor(addDays(p.start,-1));
  }
  periods.forEach(function(per){
    var st=periodStats(per);
    /* ใช้เดือนของวันสิ้นสุดรอบบิลเป็น label */
    labels.push(MS[per.end.getMonth()]);
    hVals.push(st.otHours);
    iVals.push(st.net);
  });
  /* Update subtitle with current period's values */
  var curH=hVals[hVals.length-1], curI=iVals[iVals.length-1];
  if($('chartOtSub')) $('chartOtSub').innerText=hours(curH)+' ชม. รอบนี้';
  if($('chartIncomeSub')) $('chartIncomeSub').innerText=money(curI)+' รอบนี้';
  drawAreaChart($('hoursChart'),labels,hVals,'--blue',false);
  drawAreaChart($('incomeChart'),labels,iVals,'--green',true);
}

function varColor(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim()}

/* ── Google Weather-style Smooth Area Chart ── */
function drawAreaChart(canvas,labels,values,colorVar,isMoney){
  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  var w=rect.width*dpr, h=rect.height*dpr;
  canvas.width=w; canvas.height=h;
  var ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  var cw=rect.width, ch=rect.height;

  /* ── Colors ── */
  var baseColor=varColor(colorVar)||'#3b6fd1';
  var bgColor=varColor('--canvas-bg')||'#ffffff';
  var labelColor=varColor('--canvas-label')||'#61708a';
  var lineColor=varColor('--line')||'#d9dee8';
  var panelColor=varColor('--panel')||'#ffffff';

  /* ── Background ── */
  ctx.fillStyle=bgColor;
  ctx.fillRect(0,0,cw,ch);

  /* ── Layout ── */
  var padTop=30, padBottom=36, padLeft=24, padRight=30;
  var chartW=cw-padLeft-padRight;
  var chartH=ch-padTop-padBottom;

  var max=Math.max.apply(null,values.concat([1]));
  /* Add 15% headroom */
  max=max*1.15;

  var n=values.length;
  if(n<2) return;

  /* ── Calculate data points ── */
  var points=[];
  for(var i=0;i<n;i++){
    var x=padLeft+(chartW/(n-1))*i;
    var y=padTop+chartH-(values[i]/max)*chartH;
    points.push({x:x,y:y});
  }

  /* ── Grid lines (subtle, horizontal dashed) ── */
  ctx.save();
  ctx.strokeStyle=lineColor;
  ctx.lineWidth=0.5;
  ctx.setLineDash([4,4]);
  var gridLines=4;
  for(var g=0;g<=gridLines;g++){
    var gy=padTop+(chartH/gridLines)*g;
    ctx.beginPath();
    ctx.moveTo(padLeft,gy);
    ctx.lineTo(cw-padRight,gy);
    ctx.stroke();
  }
  ctx.restore();

  /* ── Monotone cubic spline (prevents overshoot) ── */
  function bezierPath(pts){
    var n=pts.length;
    if(n<2) return;
    ctx.moveTo(pts[0].x,pts[0].y);
    if(n===2){ctx.lineTo(pts[1].x,pts[1].y);return;}

    /* Compute tangent slopes (Fritsch-Carlson monotone) */
    var slopes=[];
    for(var i=0;i<n-1;i++){
      var dx=pts[i+1].x-pts[i].x;
      slopes.push(dx===0?0:(pts[i+1].y-pts[i].y)/dx);
    }
    var tangents=[slopes[0]];
    for(var i=1;i<n-1;i++){
      if(slopes[i-1]*slopes[i]<=0){
        tangents.push(0);
      } else {
        tangents.push((slopes[i-1]+slopes[i])/2);
      }
    }
    tangents.push(slopes[n-2]);

    /* Monotone correction */
    for(var i=0;i<n-1;i++){
      if(Math.abs(slopes[i])<1e-6){tangents[i]=0;tangents[i+1]=0;continue;}
      var a=tangents[i]/slopes[i], b=tangents[i+1]/slopes[i];
      var s=a*a+b*b;
      if(s>9){var t=3/Math.sqrt(s);tangents[i]=t*a*slopes[i];tangents[i+1]=t*b*slopes[i];}
    }

    /* Draw cubic segments */
    for(var i=0;i<n-1;i++){
      var dx=pts[i+1].x-pts[i].x;
      var cx1=pts[i].x+dx/3;
      var cy1=pts[i].y+tangents[i]*dx/3;
      var cx2=pts[i+1].x-dx/3;
      var cy2=pts[i+1].y-tangents[i+1]*dx/3;
      ctx.bezierCurveTo(cx1,cy1,cx2,cy2,pts[i+1].x,pts[i+1].y);
    }
  }

  /* ── Gradient fill under curve ── */
  var grad=ctx.createLinearGradient(0,padTop,0,padTop+chartH);
  /* Parse base color to rgba */
  var r=parseInt(baseColor.slice(1,3),16)||59;
  var g2=parseInt(baseColor.slice(3,5),16)||111;
  var b=parseInt(baseColor.slice(5,7),16)||209;
  grad.addColorStop(0,'rgba('+r+','+g2+','+b+',0.25)');
  grad.addColorStop(0.6,'rgba('+r+','+g2+','+b+',0.08)');
  grad.addColorStop(1,'rgba('+r+','+g2+','+b+',0.01)');

  ctx.beginPath();
  bezierPath(points);
  ctx.lineTo(points[n-1].x,padTop+chartH);
  ctx.lineTo(points[0].x,padTop+chartH);
  ctx.closePath();
  ctx.fillStyle=grad;
  ctx.fill();

  /* ── Main line ── */
  ctx.beginPath();
  bezierPath(points);
  ctx.strokeStyle=baseColor;
  ctx.lineWidth=2.5;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.stroke();

  /* ── Data point dots + value labels ── */
  ctx.font='600 11px system-ui,-apple-system,sans-serif';
  ctx.textAlign='center';
  points.forEach(function(pt,i){
    /* Outer glow */
    ctx.beginPath();
    ctx.arc(pt.x,pt.y,6,0,Math.PI*2);
    ctx.fillStyle=panelColor;
    ctx.fill();

    /* Inner dot */
    ctx.beginPath();
    ctx.arc(pt.x,pt.y,3.5,0,Math.PI*2);
    ctx.fillStyle=baseColor;
    ctx.fill();

    /* Value label above point — skip last point (pill shows it) */
    if(i===points.length-1) return;
    var val=values[i];
    var displayVal;
    if(isMoney){
      if(val>=1000000) displayVal=(val/1000000).toFixed(1)+'ล้าน';
      else if(val>=10000) displayVal=Math.round(val/1000)+'พัน';
      else if(val>=1000) displayVal=(val/1000).toFixed(1)+'พัน';
      else displayVal=Math.round(val).toString();
    } else {
      displayVal=String(Math.round(val*10)/10);
    }
    ctx.fillStyle=baseColor;
    ctx.font='700 12px system-ui,-apple-system,sans-serif';
    ctx.fillText(displayVal,pt.x,pt.y-14);
  });

  /* ── X-axis labels ── */
  ctx.font='600 12px system-ui,-apple-system,sans-serif';
  ctx.fillStyle=labelColor;
  points.forEach(function(pt,i){
    ctx.fillText(labels[i],pt.x,ch-10);
  });

  /* ── Highlight current period (last point) with accent pill ── */
  var last=points[n-1];
  var pillVal=isMoney?Math.round(values[n-1]/1000)+'พัน':String(Math.round(values[n-1]*10)/10);
  ctx.font='700 11px system-ui,-apple-system,sans-serif';
  var tw=ctx.measureText(pillVal).width;
  var pw=tw+16, ph=22;
  /* Clamp pill so it doesn't overflow canvas right edge */
  var pillCenterX=Math.min(last.x, cw-pw/2-4);
  var px=pillCenterX-pw/2, py=last.y-38;
  /* Pill background */
  ctx.beginPath();
  var pillR=ph/2;
  ctx.moveTo(px+pillR,py);ctx.lineTo(px+pw-pillR,py);
  ctx.arc(px+pw-pillR,py+pillR,pillR,-Math.PI/2,Math.PI/2);
  ctx.lineTo(px+pillR,py+ph);
  ctx.arc(px+pillR,py+pillR,pillR,Math.PI/2,Math.PI*1.5);
  ctx.closePath();
  ctx.fillStyle=baseColor;
  ctx.fill();
  /* Pill text */
  ctx.fillStyle='#ffffff';
  ctx.fillText(pillVal,pillCenterX,py+ph/2+4);

  /* Pill arrow pointing down to actual data point */
  ctx.beginPath();
  ctx.moveTo(last.x-4,py+ph);
  ctx.lineTo(last.x,py+ph+5);
  ctx.lineTo(last.x+4,py+ph);
  ctx.closePath();
  ctx.fillStyle=baseColor;
  ctx.fill();
}

