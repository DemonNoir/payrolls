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
  var rateStr=st.salaryBase>0?('ค่าจ้างฐาน '+hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.'):'ยังไม่ตั้งเงินเดือน';
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
  var set=settings();
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
      var ne = normalizeEntry(en);
      var hasLeave = false;
      var hasMoney = false;
      var totalH = 0;
      var badgeParts = [];
      var primaryMult = 1.5;
      
      if(ne && ne.rates) {
        ne.rates.forEach(function(r) {
           var h = num(r.hours);
           if (h > 0) {
              totalH += h;
              if (r.payType === 'leave') hasLeave = true;
              else hasMoney = true;
              
              var m = num(r.multiplier);
              primaryMult = m; // roughly track last mult
              var multStr = (m !== 1.5) ? '×' + m : '';
              badgeParts.push(hours(h) + 'h' + multStr);
           }
        });
      }
      
      cls+=' '+(hasLeave && !hasMoney ? 'leave' : 'money');
      var multCls = '';
      if (ne && ne.rates && ne.rates.length === 1) {
         multCls = primaryMult===1?' m1':(primaryMult===3?' m3':'');
      } else if (ne && ne.rates && ne.rates.length > 1) {
         multCls = ' m3'; // highlight mixed rates with red border for visibility
      }
      
      if (totalH > 0) {
        badge='<span class="badge '+(hasLeave && !hasMoney ? 'leave ':'')+multCls+'" style="font-size:10px">'+badgeParts.join('+')+'</span>';
      }
    }else if(en&&en.kind==='use'){
      var lt=en.leaveType||'_legacy';
      var ltCls={annual:'leave-annual',swap:'leave-swap',personal_paid:'leave-personal',personal_unpaid:'leave-personal',sick:'leave-sick',maternity:'leave-maternity',ordination:'leave-ordination',funeral:'leave-funeral'};
      var ltLabel={annual:'🏖️พักร้อน',swap:'🔄สลับ',personal_paid:'📋กิจ',personal_unpaid:'📋กิจ(ไม่รับ)',sick:'🤒ป่วย',maternity:'🤰คลอด',ordination:'🙏บวช',funeral:'🕯️ฌาปนกิจ'};
      cls+=' use'; badge='<span class="badge '+(ltCls[lt]||'leave-sick')+'">'+(ltLabel[lt]||'ใช้สิทธิ')+' '+hours(en.hours)+'h</span>';
    }else if(en&&en.kind==='leave'){
      /* backward compat: old kind='leave' */
      var ltCls2={annual:'leave-annual',sick:'leave-sick',personal:'leave-personal',absent:'leave-absent'};
      var ltLabel2={annual:'🏖️พักร้อน',sick:'🤒ป่วย',personal:'📋กิจ',absent:'🚫ขาด'};
      var ltype2=en.leaveType||'sick';
      cls+=' use'; badge='<span class="badge '+(ltCls2[ltype2]||'leave-sick')+'">'+(ltLabel2[ltype2]||'ลา')+' '+hours(en.days)+'d</span>';
    }
    var cell=document.createElement('div');
    cell.className='cell'+cls+(k===dateKey(today)?' today':'');
    cell.title=hname||'';
    var isStart=(set.startDate&&k===set.startDate);
    var isNight=(en&&en.isNight)?'<span style="position:absolute;top:2px;right:4px;font-size:12px;">🌙</span>':'';
    cell.innerHTML=(hname?'<span class="holidayMark">หยุด</span>':'')+(isStart?'<span class="startMark">💼 เริ่มงาน</span>':'')+isNight+'<span class="num">'+cur.getDate()+'</span>'+badge;
    cell.setAttribute('data-date', k);
    cell.onclick=(function(key){return function(){
      if(window.multiSelectMode) {
        toggleMultiSelect(key, this);
      } else {
        openEntry(key);
      }
    }})(k);
    grid.appendChild(cell);
    cur=addDays(cur,1);
  }

  $('totalHours').innerText=hours(st.otHours);
  $('totalPay').innerText=money(st.otPay);
  var banks = getBanks();
  if($('valBank')) $('valBank').innerText=hours(banks.ot);
  if($('valAnnual')) $('valAnnual').innerText=hours(banks.annual);
  $('deductionBox').innerText='รายการหัก: '+money(st.deductions.total)+' · สุทธิ: '+money(st.net);
  $('paydayBox').innerText='เงินออกอีก '+paydayCountdown()+' วัน';

  /* Rate footer */
  var rf=$('rateFooter');
  if(rf){
    var s=settings();
    rf.innerText=s.salaryBase>0?('💼 ค่าจ้างฐาน: '+hourlyRate.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท/ชม.'):'';
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
  var banks = getBanks();
  $('dashBank').innerText=hours(banks.ot)+' / '+hours(banks.annual)+' ชม.';
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
  var html = '';
  
  html += '<div class="row section-divider">📊 สถิติการทำงาน</div>';
  html += '<div class="row"><span>วันทำงานจริง</span><b>'+hours(st.actualDays)+' วัน</b></div>';
  html += '<div class="row"><span>วันที่ทำ OT</span><b>'+st.otDays+' วัน</b></div>';
  if(st.leaveDays>0){
    html += '<div class="row"><span>วันลา/หยุดทั้งหมด</span><b>'+hours(st.leaveDays)+' วัน</b></div>';
    if(st.ppAnnual>0) html += '<div class="row"><span>&nbsp;&nbsp;🏖️ ลาพักร้อน</span><b>'+hours(st.ppAnnual)+' วัน</b></div>';
    if(st.ppSwap>0) html += '<div class="row"><span>&nbsp;&nbsp;🔄 สลับหยุด</span><b>'+hours(st.ppSwap)+' วัน</b></div>';
    if(st.ppSick>0)   html += '<div class="row"><span>&nbsp;&nbsp;🤒 ลาป่วย</span><b>'+hours(st.ppSick)+' วัน</b></div>';
    if(st.ppPersonal>0) html += '<div class="row"><span>&nbsp;&nbsp;📋 ลากิจ</span><b>'+hours(st.ppPersonal)+' วัน</b></div>';
    if(st.ppAbsent>0) html += '<div class="row"><span>&nbsp;&nbsp;🚫 ขาดงาน</span><b>'+hours(st.ppAbsent)+' วัน</b></div>';
    if(st.ppMaternity>0) html += '<div class="row"><span>&nbsp;&nbsp;🤰 ลาคลอด</span><b>'+hours(st.ppMaternity)+' วัน</b></div>';
    if(st.ppOrdination>0) html += '<div class="row"><span>&nbsp;&nbsp;🙏 ลาบวช</span><b>'+hours(st.ppOrdination)+' วัน</b></div>';
    if(st.ppFuneral>0) html += '<div class="row"><span>&nbsp;&nbsp;🕯️ ลาฌาปนกิจ</span><b>'+hours(st.ppFuneral)+' วัน</b></div>';
  }

  html += '<div class="row section-divider">💰 รายได้พื้นฐาน</div>';
  if(st.isProrated){
    html += '<div class="row"><span>⚠ ทำงานในรอบนี้</span><b>'+st.employedDays+'/'+st.totalDays+' วัน (หาร 30)</b></div>';
    html += '<div class="row"><span>เงินเดือน (Prorate)</span><b>'+money(st.proratedSalary)+' จาก '+money(s.salaryBase)+'</b></div>';
    html += '<div class="row"><span>🏠 ค่าบ้าน (Prorate)</span><b>'+money(st.proratedHousing)+' จาก '+money(s.housing)+'</b></div>';
  }else{
    html += '<div class="row"><span>เงินเดือน</span><b>'+money(st.proratedSalary)+'</b></div>';
    html += '<div class="row"><span>🏠 ค่าบ้าน</span><b>'+money(st.proratedHousing)+'</b></div>';
  }

  html += '<div class="row section-divider">⚡ รายได้เพิ่มเติม</div>';
  html += '<div class="row"><span>⏱ ชั่วโมง OT</span><b>'+hours(st.otHours)+' ชม.</b></div>';
  html += '<div class="row"><span>รายได้ OT</span><b>'+money(st.otPay)+'</b></div>';
  html += '<div class="row"><span>🚗 ค่าเดินทาง</span><b>'+money(st.welfare.transport)+'</b></div>';
  html += '<div class="row"><span>🍱 ค่าอาหาร</span><b>'+money(st.welfare.food)+'</b></div>';
  html += '<div class="row"><span>🍜 ค่าอาหาร OT</span><b>'+money(st.welfare.otFood)+'</b></div>';
  html += '<div class="row"><span>🌙 ค่ากะดึก</span><b>'+money(st.welfare.night)+'</b></div>';
  html += '<div class="row"><span>📊 KPI</span><b>'+money(st.kpi)+'</b></div>';
  html += '<div class="row"><span>⭐ เบี้ยขยัน</span><b>'+money(st.diligence)+'</b></div>';
  html += '<div class="row"><span>🎁 รางวัลอายุงาน</span><b>'+money(st.serviceAward)+'</b></div>';

  html += '<div class="row section-divider">📉 รายการหัก</div>';
  html += '<div class="row"><span>🏥 ประกันสังคม</span><b>-'+money(st.deductions.social)+'</b></div>';
  html += '<div class="row"><span>🏛 ภาษี</span><b>-'+money(st.deductions.tax)+'</b></div>';
  html += '<div class="row"><span>🏷 หักอื่นๆ</span><b>-'+money(st.deductions.other)+'</b></div>';

  html += '<div class="row total-row"><span>💵 รายได้สุทธิ</span><b>'+money(st.net)+'</b></div>';

  $('monthlySummary').innerHTML = html;
}

/* ── Annual Summary — Premium Redesign ── */
function renderAnnual(){
  var lbl=$('annualYearLabel');
  var sub=$('annualYearSub');
  if(lbl) lbl.innerText='พ.ศ. '+(annualYear+543);
  if(sub) sub.innerText='ค.ศ. '+annualYear;

  var totOtHours=0,totOtPay=0,totBase=0,totWelfare=0,totSocial=0,totTax=0,totOther=0,totNet=0,totDeduct=0;
  var monthData=[];

  for(var m=0;m<12;m++){
    var st=monthStats(annualYear,m);
    totOtHours+=st.otHours;totOtPay+=st.otPay;totBase+=st.base;totWelfare+=st.welfare.total;
    totSocial+=st.deductions.social;totTax+=st.deductions.tax;totOther+=st.deductions.other;totNet+=st.net;
    totDeduct+=st.deductions.total;
    monthData.push({name:MN[m],nameShort:MS[m],st:st});
  }

  /* ── Hero ── */
  var heroAmt=$('annualHeroAmount');
  if(heroAmt) heroAmt.innerText=num(totNet).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท';

  /* ── Stats Cards ── */
  var otH=$('annualOtHours'),otP=$('annualOtPay');
  if(otH) otH.innerText=hours(totOtHours)+' ชม.';
  if(otP) otP.innerText=money(totOtPay);

  var baseEl=$('annualBaseTotal');
  if(baseEl) baseEl.innerText=money(totBase);

  var welEl=$('annualWelfareTotal');
  if(welEl) welEl.innerText=money(totWelfare);

  var dedEl=$('annualDeductTotal');
  if(dedEl) dedEl.innerText=money(totDeduct);

  /* ── Bar Chart ── */
  var canvas=$('annualBarChart');
  if(canvas){
    var chartLabels=[], chartValues=[];
    for(var i=0;i<12;i++){
      chartLabels.push(monthData[i].nameShort);
      chartValues.push(monthData[i].st.net);
    }
    drawAnnualBarChart(canvas,chartLabels,chartValues);
    var chartSub=$('annualChartSub');
    if(chartSub) chartSub.innerText='เฉลี่ย '+money(totNet/12)+'/เดือน';
  }

  /* ── Tax Card (ภ.ง.ด.91) ── */
  var taxBox=$('annualTaxBox');
  if(taxBox){
    taxBox.innerHTML=
      '<div class="tax-title">📋 ข้อมูลสำหรับยื่น ภ.ง.ด.91 ปี '+(annualYear+543)+'</div>'+
      '<div class="tax-row"><span>รายได้รวมทั้งปี (เงินเดือน+KPI+สวัสดิการ)</span><b>'+money(totBase+totWelfare)+'</b></div>'+
      '<div class="tax-row"><span>รายได้ OT ทั้งปี</span><b>'+money(totOtPay)+'</b></div>'+
      '<div class="tax-row"><span>ประกันสังคมที่หักทั้งปี</span><b>'+money(totSocial)+'</b></div>'+
      '<div class="tax-row"><span>ภาษีที่หักทั้งปี</span><b>'+money(totTax)+'</b></div>'+
      '<div class="tax-row-total"><span>รายได้สุทธิรวมทั้งปี</span><b>'+money(totNet)+'</b></div>';
  }

  /* ── Monthly Breakdown ── */
  var maxNet=0;
  for(var i=0;i<12;i++){if(monthData[i].st.net>maxNet)maxNet=monthData[i].st.net;}
  if(maxNet<=0) maxNet=1;

  var mEl=$('annualMonths');
  if(mEl){
    var html='';
    for(var i=0;i<12;i++){
      var md=monthData[i], s=md.st;
      var barW=Math.round((s.net/maxNet)*100);
      html+='<div class="annual-month-row" data-month="'+i+'">'+
        '<div class="annual-month-row-main">'+
          '<span class="annual-month-name">'+md.name+' <span class="annual-month-expand-icon">▼</span></span>'+
          '<span class="annual-month-ot">OT '+hours(s.otHours)+' ชม.</span>'+
          '<span class="annual-month-net">'+money(s.net)+'</span>'+
        '</div>'+
        '<div class="annual-month-bar"><div class="annual-month-bar-fill" style="width:'+barW+'%"></div></div>'+
        '<div class="annual-month-detail">'+
          '<div class="annual-month-detail-row"><span>เงินเดือน</span><b>'+money(s.proratedSalary)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>ค่าบ้าน</span><b>'+money(s.proratedHousing)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>KPI</span><b>'+money(s.kpi)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>เบี้ยขยัน</span><b>'+money(s.diligence)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>OT ('+hours(s.otHours)+' ชม.)</span><b>'+money(s.otPay)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>สวัสดิการ</span><b>'+money(s.welfare.total)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>ประกันสังคม</span><b>-'+money(s.deductions.social)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>ภาษี</span><b>-'+money(s.deductions.tax)+'</b></div>'+
          '<div class="annual-month-detail-row"><span>หักอื่นๆ</span><b>-'+money(s.deductions.other)+'</b></div>'+
        '</div>'+
      '</div>';
    }
    mEl.innerHTML=html;

    /* Attach expand/collapse listeners */
    Array.prototype.forEach.call(mEl.querySelectorAll('.annual-month-row'),function(row){
      row.querySelector('.annual-month-row-main').onclick=function(){
        row.classList.toggle('expanded');
      };
    });
  }
}

/* ── Annual Bar Chart (12 เดือน) ── */
function drawAnnualBarChart(canvas,labels,values){
  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  var w=rect.width*dpr, h=rect.height*dpr;
  canvas.width=w; canvas.height=h;
  var ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  var cw=rect.width, ch=rect.height;

  var bgColor=varColor('--canvas-bg')||'#ffffff';
  var labelColor=varColor('--canvas-label')||'#61708a';
  var lineColor=varColor('--line')||'#d9dee8';
  var blueColor=varColor('--blue')||'#3b6fd1';
  var greenColor=varColor('--green')||'#22865f';
  var panelColor=varColor('--panel')||'#ffffff';

  ctx.fillStyle=bgColor;
  ctx.fillRect(0,0,cw,ch);

  var padTop=28,padBottom=34,padLeft=12,padRight=12;
  var chartW=cw-padLeft-padRight;
  var chartH=ch-padTop-padBottom;

  var max=Math.max.apply(null,values.concat([1]));
  max=max*1.2;

  var n=values.length;
  var barGap=4;
  var barW=Math.max(8,(chartW/n)-barGap);
  var totalBarSpace=(barW+barGap)*n-barGap;
  var startX=padLeft+(chartW-totalBarSpace)/2;

  /* Grid lines */
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

  /* Parse blue color for gradient */
  var r=parseInt(blueColor.slice(1,3),16)||59;
  var g2=parseInt(blueColor.slice(3,5),16)||111;
  var b=parseInt(blueColor.slice(5,7),16)||209;
  var gr=parseInt(greenColor.slice(1,3),16)||34;
  var gg=parseInt(greenColor.slice(3,5),16)||134;
  var gb=parseInt(greenColor.slice(5,7),16)||95;

  /* Bars */
  for(var i=0;i<n;i++){
    var barH=max>0?(values[i]/max)*chartH:0;
    var x=startX+(barW+barGap)*i;
    var y=padTop+chartH-barH;
    var barRadius=Math.min(barW/2,4);

    /* Bar gradient */
    var grad=ctx.createLinearGradient(0,y,0,padTop+chartH);
    grad.addColorStop(0,'rgba('+r+','+g2+','+b+',0.85)');
    grad.addColorStop(1,'rgba('+gr+','+gg+','+gb+',0.65)');

    /* Draw rounded bar */
    ctx.beginPath();
    if(barH>barRadius*2){
      ctx.moveTo(x,y+barRadius);
      ctx.arc(x+barRadius,y+barRadius,barRadius,Math.PI,Math.PI*1.5);
      ctx.arc(x+barW-barRadius,y+barRadius,barRadius,Math.PI*1.5,0);
      ctx.lineTo(x+barW,padTop+chartH);
      ctx.lineTo(x,padTop+chartH);
    }else if(barH>0){
      ctx.rect(x,y,barW,barH);
    }
    ctx.closePath();
    ctx.fillStyle=grad;
    ctx.fill();

    /* Value label above bar (only if nonzero) */
    if(values[i]>0){
      ctx.font='600 9px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif';
      ctx.textAlign='center';
      ctx.fillStyle=blueColor;
      var displayVal;
      if(values[i]>=1000000) displayVal=(values[i]/1000000).toFixed(1)+'ล.';
      else if(values[i]>=10000) displayVal=Math.round(values[i]/1000)+'k';
      else if(values[i]>=1000) displayVal=(values[i]/1000).toFixed(1)+'k';
      else displayVal=Math.round(values[i]).toString();
      ctx.fillText(displayVal,x+barW/2,y-5);
    }

    /* X-axis label */
    ctx.font='600 10px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle=labelColor;
    ctx.fillText(labels[i],x+barW/2,ch-10);
  }
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
  ctx.font='600 11px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif';
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
    ctx.font='700 12px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif';
    ctx.fillText(displayVal,pt.x,pt.y-14);
  });

  /* ── X-axis labels ── */
  ctx.font='600 12px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif';
  ctx.fillStyle=labelColor;
  points.forEach(function(pt,i){
    ctx.fillText(labels[i],pt.x,ch-10);
  });

  /* ── Highlight current period (last point) with accent pill ── */
  var last=points[n-1];
  var pillVal=isMoney?Math.round(values[n-1]/1000)+'พัน':String(Math.round(values[n-1]*10)/10);
  ctx.font='700 11px -apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif';
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



/* ==================================================
   Long-Press Multi-Select Logic
================================================== */
window.multiSelectMode = false;
window.selectedDates = new Set();
let longPressTimer = null;
let touchMoved = false;
let startCell = null;
let gridRect = null;
let touchStartX = 0;
let touchStartY = 0;

function toggleMultiSelect(dateKey, cellElement) {
  if (window.selectedDates.has(dateKey)) {
    window.selectedDates.delete(dateKey);
    cellElement.classList.remove('selected');
  } else {
    window.selectedDates.add(dateKey);
    cellElement.classList.add('selected');
  }
  updateActionBar();
}

function updateActionBar() {
  const bar = $('multiSelectActionBar');
  if (!bar) return;
  const count = window.selectedDates.size;
  $('msCountLabel').innerText = 'เลือกแล้ว ' + count + ' วัน';
  if (count === 0 && window.multiSelectMode) {
    // Keep mode active but show 0
  }
}

function enterMultiSelectMode(cell, dateKey) {
  if (window.multiSelectMode) return;
  window.multiSelectMode = true;
  
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  
  $('multiSelectActionBar').classList.add('show');
  
  // Select the initial cell
  if (!window.selectedDates.has(dateKey)) {
    window.selectedDates.add(dateKey);
    cell.classList.add('selected');
  }
  updateActionBar();
}

function exitMultiSelectMode() {
  window.multiSelectMode = false;
  window.selectedDates.clear();
  $('multiSelectActionBar').classList.remove('show');
  const cells = document.querySelectorAll('.cell.selected');
  cells.forEach(c => c.classList.remove('selected'));
}

function initMultiSelect() {
  const grid = $('calendarGrid');
  if (!grid) return;
  
  function getCellFromEvent(e) {
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const el = document.elementFromPoint(clientX, clientY);
    if (el && el.closest('.cell')) {
      return el.closest('.cell');
    }
    return null;
  }
  
  function handleDown(e) {
    if (e.touches && e.touches.length > 1) return; // ignore multi-touch
    const cell = e.target.closest('.cell');
    if (!cell) return;
    
    const dateKey = cell.getAttribute('data-date');
    if (!dateKey) return;
    
    touchMoved = false;
    startCell = cell;
    // เก็บตำแหน่งเริ่มต้นเพื่อเช็ค threshold
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    } else {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    }
    
    if (!window.multiSelectMode) {
      longPressTimer = setTimeout(() => {
        enterMultiSelectMode(cell, dateKey);
      }, 450); // 450ms long press
    } else {
      // already in multi-select mode, dragging will just select
    }
  }
  
  function handleMove(e) {
    // ยกเลิก timer เมื่อเคลื่อนเกิน 10px เพื่อไม่ให้การสั่นเล็กน้อยรบกวน
    let curX, curY;
    if (e.touches && e.touches.length > 0) {
      curX = e.touches[0].clientX;
      curY = e.touches[0].clientY;
    } else {
      curX = e.clientX;
      curY = e.clientY;
    }
    const moved = Math.abs(curX - touchStartX) > 10 || Math.abs(curY - touchStartY) > 10;
    
    if (moved) {
      touchMoved = true;
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
    
    if (window.multiSelectMode) {
      // Avoid default scroll ONLY if moving on calendar in multi-select mode
      e.preventDefault(); 
      
      const cell = getCellFromEvent(e);
      if (cell) {
        const dateKey = cell.getAttribute('data-date');
        if (dateKey && !window.selectedDates.has(dateKey)) {
          window.selectedDates.add(dateKey);
          cell.classList.add('selected');
          updateActionBar();
        }
      }
      
      // Auto-scroll logic (basic)
      let clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (clientY < 100) {
        window.scrollBy(0, -10);
      } else if (clientY > window.innerHeight - 100) {
        window.scrollBy(0, 10);
      }
    }
  }
  
  function handleUp(e) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  grid.addEventListener('touchstart', handleDown, { passive: false });
  grid.addEventListener('touchmove', handleMove, { passive: false });
  grid.addEventListener('touchend', handleUp);
  grid.addEventListener('touchcancel', handleUp);
  
  grid.addEventListener('mousedown', handleDown);
  window.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) handleMove(e); // only if mouse is down
  });
  window.addEventListener('mouseup', handleUp);
  
  // Bind actions
  $('msCancelBtn').onclick = exitMultiSelectMode;
  $('msEditBtn').onclick = openBatchEdit;
  $('closeBatchEditTopBtn').onclick = () => {
    $('batchEditOverlay').classList.remove('show');
    if (window.multiSelectMode) {
      $('multiSelectActionBar').classList.add('show');
    }
  };
  
  // Batch Form Toggles — 3 modes: ot / use / holiday
  document.querySelectorAll('input[name="batchEntryKind"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const v = e.target.value;
      $('batchOtFields').classList.toggle('hide', v !== 'ot');
      $('batchUseFields').classList.toggle('hide', v !== 'use');
      $('batchHolidayFields').classList.toggle('hide', v !== 'holiday');
    });
  });
  
  $('batchHoliday').onchange = (e) => {
    if (e.target.checked) {
      $('batchHolidayName').classList.remove('hide');
    } else {
      $('batchHolidayName').classList.add('hide');
    }
  };
  
  $('batchClearBtn').onclick = () => {
    if(confirm('ยืนยันการล้างข้อมูลทั้งหมดใน ' + window.selectedDates.size + ' วันที่เลือก?')) {
      let data = getCal();
      window.selectedDates.forEach(k => {
        delete data[k];
      });
      saveCal(data);
      renderCalendar();
      $('batchEditOverlay').classList.remove('show');
      exitMultiSelectMode();
    }
  };
  
  $('batchSaveBtn').onclick = saveBatchEdit;
}

// Override init() to add initMultiSelect
const originalInit = window.onload;
window.onload = function() {
  if (originalInit) originalInit();
  initMultiSelect();
  
  // Populate leave types in batch modal
  const batchLt = $('batchLeaveType');
  if (batchLt) {
    batchLt.innerHTML = '';
    const types = getLeaveTypes();
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.innerText = t.name_th || t.name || t.id;
      batchLt.appendChild(opt);
    });
  }
};

function openBatchEdit() {
  if (window.selectedDates.size === 0) {
    alert('กรุณาเลือกอย่างน้อย 1 วัน');
    return;
  }
  
  // Warning check
  let countExisting = 0;
  let data = getCal();
  window.selectedDates.forEach(k => {
    if (data[k]) countExisting++;
  });
  
  if (countExisting > 0) {
    $('batchEditWarning').innerText = '⚠️ มี ' + countExisting + ' วันที่มีข้อมูลอยู่แล้ว (การบันทึกจะเขียนทับข้อมูลเดิม)';
  } else {
    $('batchEditWarning').innerText = '⚠️ การบันทึกนี้จะเขียนทับข้อมูลเดิมทั้งหมดในวันที่เลือก';
  }
  
  $('batchEditTitle').innerText = 'แก้ไข ' + window.selectedDates.size + ' วัน';
  
  // Repopulate leave types every time (in case not yet loaded)
  const batchLt = $('batchLeaveType');
  if (batchLt) {
    batchLt.innerHTML = '';
    const types = getLeaveTypes();
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.innerText = t.name_th || t.name || t.id;
      batchLt.appendChild(opt);
    });
  }

  // Reset form to OT mode every time modal opens
  document.querySelector('input[name="batchEntryKind"][value="ot"]').checked = true;
  $('batchOtFields').classList.remove('hide');
  $('batchUseFields').classList.add('hide');
  $('batchEntryHours').value = '';
  $('batchUseHours').value = '';
  document.querySelector('input[name="batchMultiplier"][value="1"]').checked = true;
  document.querySelector('input[name="batchPayType"][value="money"]').checked = true;
  $('batchEntryNight').checked = false;
  $('batchHolidayName').value = '';
  // Hide holiday fields on reset
  $('batchHolidayFields').classList.add('hide');

  // ซ่อน 1.5x ถ้าทุกวันที่เลือกเป็นวันหยุด (ไม่มีค่า 1.5x ในวันหยุด)
  const allHoliday = [...window.selectedDates].every(k => isHolidayKey(k));
  if ($('batchMult15Label')) {
    $('batchMult15Label').style.display = allHoliday ? 'none' : '';
  }
  // ถ้า 1.5x ซ่อนอยู่และยังถูก checked → reset เป็น 1x
  if (allHoliday) {
    document.querySelector('input[name="batchMultiplier"][value="1"]').checked = true;
  }

  $('batchEditOverlay').classList.add('show');
  $('multiSelectActionBar').classList.remove('show');
}

function saveBatchEdit() {
  const kind = document.querySelector('input[name="batchEntryKind"]:checked').value;
  const isOT = kind === 'ot';
  const isUse = kind === 'use';
  const isHoliday = kind === 'holiday';
  const isNight = $('batchEntryNight').checked;

  if (isHoliday) {
    const holidayNameStr = ($('batchHolidayName').value || '').trim() || 'วันหยุดนักขัตฤกษ์';
    let h = getHolidays();
    let data = getCal();
    window.selectedDates.forEach(k => {
      // บันทึกวันหยุด
      const ex = h.find(x => x.date === k);
      if (ex) { ex.name = holidayNameStr; }
      else { h.push({ date: k, name: holidayNameStr }); }
      
      // บันทึกกะดึกถ้าเลือก
      if (isNight) {
        if (data[k]) { data[k].isNight = true; }
        else { data[k] = { kind: 'ot', rates: [], isNight: true }; }
      }
    });
    setHolidays(h);
    if (isNight) saveCal(data);
    
    renderCalendar();
    $('batchEditOverlay').classList.remove('show');
    exitMultiSelectMode();
    return;
  }

  let hoursVal = isOT ? parseFloat($('batchEntryHours').value) : parseFloat($('batchUseHours').value);
  const mult = parseFloat(document.querySelector('input[name="batchMultiplier"]:checked').value);
  const payType = document.querySelector('input[name="batchPayType"]:checked').value;
  const leaveType = $('batchLeaveType').value;

  if (isNaN(hoursVal) || hoursVal <= 0) hoursVal = 0;

  // ถ้าเลือก "ใช้วันหยุด" ต้องระบุชั่วโมง (ยกเว้นถ้าติ๊กกะดึกอย่างเดียว)
  if (isUse && hoursVal <= 0 && !isNight) {
    alert('กรุณาระบุจำนวนชั่วโมงที่ใช้');
    return;
  }

  // ถ้าเลือก OT แต่ไม่ได้กรอกชั่วโมงและไม่ได้ติ๊กกะดึก → ไม่ทำอะไร
  if (isOT && hoursVal <= 0 && !isNight) {
    alert('กรุณาระบุชั่วโมง OT หรือติ๊กเข้ากะดึก');
    return;
  }

  let data = getCal();
  let hList = getHolidays();
  let updatedHolidays = false;

  window.selectedDates.forEach(k => {
    if (isOT && hoursVal > 0) {
      // Auto mark holiday for 1.0x or 3.0x
      if (mult === 1 || mult === 3) {
        if (!hList.find(x => x.date === k)) {
          hList.push({ date: k, name: 'วันหยุดนักขัตฤกษ์' });
          updatedHolidays = true;
        }
      }
      
      // OT mode: เขียนทับ พร้อม isNight (เซฟเป็น format rates[])
      data[k] = { 
        kind: 'ot', 
        rates: [{ hours: hoursVal, multiplier: mult, payType: payType }], 
        isNight: isNight 
      };
    } else if (isUse && hoursVal > 0) {
      // ใช้วันหยุด mode: เขียนทับ พร้อม isNight
      data[k] = { kind: 'use', hours: hoursVal, leaveType: leaveType, isNight: isNight };
    } else if (isNight) {
      // กะดึกอย่างเดียว: MERGE ไม่ overwrite ข้อมูลเดิม
      if (data[k]) {
        data[k].isNight = true;   // อัปเดตเฉพาะ flag กะดึก
      } else {
        // สร้างใหม่เป็นกะดึกอย่างเดียว (rates ว่างเปล่า)
        data[k] = { kind: 'ot', rates: [], isNight: true };
      }
    }
    // ถ้าไม่มีอะไรเลยก็ไม่ทำอะไร (ป้องกัน delete ข้อมูลเดิม)
  });

  if (updatedHolidays) setHolidays(hList);
  saveCal(data);
  renderCalendar();
  $('batchEditOverlay').classList.remove('show');
  exitMultiSelectMode();
}

