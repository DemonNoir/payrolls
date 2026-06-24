/* ── Settings ── */
function settings(){
  return {
    salaryBase:getNum('ot_salary','salary',12000),   /* เงินเดือนหลัก (OT และรายรับสุทธิ) */
    cutoff:getValidDay(getLS('ot_cutoff')||getLS('cutoff_day'))||15,
    payday:getValidDay(getLS('payday'))||getValidDay(getLS('cutoff_day'))||getValidDay(getLS('ot_cutoff'))||25,
    bankAdj:getNum('ot_bank_adj',null,0),
    housing:getNum('housing',null,1000),
    diligence:getNum('diligence',null,1000),
    kpiPercent:getNum('kpi_percent',null,10), /* KPI Daily % */
    transport:getNum('transport_rate',null,50),
    food:getNum('food_rate',null,40),
    otFood:getNum('ot_food_rate',null,50),
    nightRate:getNum('night_shift_rate',null,50),
    nightEnabled:getBool('night_shift_enabled',false),
    sick:getNum('sick_leave',null,0),
    personal:getNum('personal_leave',null,0),
    absent:getNum('absent_days',null,0),
    tax:getNum('tax','ot_tax',0),
    other:getNum('other_deduction','ot_other',0),
    serviceAward:getNum('service_award',null,0),
    startDate:getLS('start_date')||null
  };
}

function getValidDay(v){v=parseInt(v,10);return (v>=1&&v<=31)?v:0}

/* ── คำนวณค่าแรง/ชม. จากเงินเดือน + KPI ── */
function getHourlyRate(kpiBonusPct){
  var st=settings();
  var salaryBase=st.salaryBase;
  if(isNaN(salaryBase)||salaryBase<=0)return 0;
  var kpiDaily=isNaN(st.kpiPercent)?0:num(st.kpiPercent);
  var kpiBonus=isNaN(kpiBonusPct)?0:num(kpiBonusPct);
  var kpiTotal=kpiDaily+kpiBonus;
  var kpiMoney=salaryBase*(kpiTotal/100);
  var base=salaryBase+kpiMoney;
  return base/30/8;
}

function periodFor(ref){
  var s=settings(), cutoff=s.cutoff;
  if(!cutoff){return {start:new Date(ref.getFullYear(),ref.getMonth(),1),end:new Date(ref.getFullYear(),ref.getMonth()+1,0)}}
  var y=ref.getFullYear(),m=ref.getMonth(),d=ref.getDate(),ey=y,em=m;
  if(d>Math.min(cutoff,daysInMonth(y,m))){em++;if(em>11){em=0;ey++}}
  var ed=Math.min(cutoff,daysInMonth(ey,em)), end=new Date(ey,em,ed);
  var pm=em-1,py=ey;if(pm<0){pm=11;py--}
  var pd=Math.min(cutoff,daysInMonth(py,pm));
  return {start:new Date(py,pm,pd+1),end:end};
}

function periodLabel(p){return settings().cutoff?p.start.getDate()+' '+MS[p.start.getMonth()]+' - '+p.end.getDate()+' '+MS[p.end.getMonth()]+' '+(p.end.getFullYear()+543):MN[p.start.getMonth()]+' '+(p.start.getFullYear()+543)}
function weekStart(d){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-x.getDay());return x}
function inRangeDate(dt,start,end){return dt>=start&&dt<=end}

function entryContribution(en){
  if(!en)return 0;
  if(en.kind==='ot'&&en.payType==='leave')return num(en.credit);
  if(en.kind==='use')return -num(en.hours);
  return 0;
}

function totalBank(excludeKey){
  var data=getCal(), b=settings().bankAdj;
  Object.keys(data).forEach(function(k){if(k!==excludeKey)b+=entryContribution(data[k])});
  return b;
}

function periodStats(p,kpiBonusPctOverride){
  var data=getCal(), st=settings(), th=0,tp=0,otDays=0,otFoodDays=0,leaveUse=0,byDay={}, start=p.start,end=p.end;
  var label=periodLabel(p);
  var kpiBonusPct=(kpiBonusPctOverride!==undefined)?num(kpiBonusPctOverride):getKpiBonusPct(label);
  if(isNaN(kpiBonusPct))kpiBonusPct=0;
  var hourlyRate=getHourlyRate(kpiBonusPct);

  /* per-period: การลา + รายการหัก */
  var ppSick=getPerPeriod('pp_sick',label);
  var ppPersonal=getPerPeriod('pp_personal',label);
  var ppAbsent=getPerPeriod('pp_absent',label);
  var ppServiceAward=getPerPeriod('pp_service_award',label);
  var ppTax=getPerPeriod('pp_tax',label);
  var ppOther=getPerPeriod('pp_other',label);

  Object.keys(data).forEach(function(k){
    var dt=parseDateKey(k), en=data[k]; if(!inRangeDate(dt,start,end))return;
    byDay[k]=en;
    if(en.kind==='ot'){
      th+=num(en.hours);otDays++;if(num(en.hours)>=2)otFoodDays++;
      /* คำนวณ OT ใหม่เสมอตาม rate ปัจจุบัน (ไม่ lock total) */
      if(en.payType==='money') tp+=num(en.hours)*num(en.multiplier)*hourlyRate;
    }
    if(en.kind==='use')leaveUse+=num(en.hours)/8;
  });

  var dStart = st.startDate ? parseDateKey(st.startDate) : null;
  var totalDaysInPeriod = 0;
  var employedDaysInPeriod = 0;
  var autoDays=0, cur=new Date(start);
  while(cur<=end){
    totalDaysInPeriod++;
    var isEmployed = !dStart || cur >= dStart;
    if (isEmployed) employedDaysInPeriod++;

    var k=dateKey(cur), hasOt=byDay[k]&&byDay[k].kind==='ot';
    if(cur.getDay()!==0 && (!isHolidayKey(k)||hasOt) && isEmployed) autoDays++;
    cur=addDays(cur,1);
  }

  var leaveDays=ppSick+ppPersonal+ppAbsent+leaveUse;
  var actual=Math.max(0,autoDays-leaveDays);
  var welfare={transport:st.transport*actual,food:st.food*actual,otFood:st.otFood*otFoodDays,night:st.nightEnabled?st.nightRate*actual:0};
  welfare.total=welfare.transport+welfare.food+welfare.otFood+welfare.night;

  var kpiDaily=isNaN(st.kpiPercent)?0:num(st.kpiPercent);
  var kpiTotal=kpiDaily+kpiBonusPct;

  /* ── Prorate: หาร 30 วัน (ตามสูตรสลิป) ── */
  var isFullPeriod=(employedDaysInPeriod>=totalDaysInPeriod);
  var proratedSalary=isFullPeriod?st.salaryBase:Math.min(st.salaryBase,(st.salaryBase/30)*employedDaysInPeriod);
  var proratedHousing=isFullPeriod?st.housing:Math.min(st.housing,(st.housing/30)*employedDaysInPeriod);

  /* หักลากิจ/ขาดงาน (ไม่ได้รับค่าจ้าง): วันละ เงินเดือน/30 */
  var unpaidLeaveDays=ppPersonal+ppAbsent;
  if(unpaidLeaveDays>0) proratedSalary=Math.max(0,proratedSalary-(st.salaryBase/30)*unpaidLeaveDays);

  /* KPI คำนวณจากเงินเดือนที่ prorate แล้ว */
  var kpiMoney=proratedSalary*(kpiTotal/100);
  var kpi=kpiMoney;
  var hasLeavePenalty=(ppSick>0||ppPersonal>0||ppAbsent>0);
  var diligence=hasLeavePenalty?0:st.diligence;
  var base=proratedSalary+proratedHousing+ppServiceAward+diligence+kpi;

  /* ประกันสังคม: 5% ของเงินเดือนที่ prorate แล้ว (ปัดลง, ไม่เกิน 750) */
  var socialSecurity=Math.min(750,Math.floor(proratedSalary*0.05));
  var deductions={social:socialSecurity,tax:ppTax,other:ppOther,total:socialSecurity+ppTax+ppOther};
  var gross=base+tp+welfare.total;

  return {
    otHours:th,otPay:tp,otDays:otDays,autoDays:autoDays,leaveDays:leaveDays,actualDays:actual,
    welfare:welfare,kpi:kpi,diligence:diligence,serviceAward:ppServiceAward,base:base,gross:gross,deductions:deductions,net:gross-deductions.total,
    hourlyRate:hourlyRate,kpiBonusPct:kpiBonusPct,kpiDailyPct:kpiDaily,kpiTotalPct:kpiTotal,kpiTotalMoney:kpiMoney,
    ppSick:ppSick,ppPersonal:ppPersonal,ppAbsent:ppAbsent,ppTax:ppTax,ppOther:ppOther,ppServiceAward:ppServiceAward,
    proratedSalary:proratedSalary,proratedHousing:proratedHousing,isProrated:!isFullPeriod,employedDays:employedDaysInPeriod,totalDays:totalDaysInPeriod
  };
}

function paydayCountdown(){
  var day=settings().payday||25, now=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  var target=new Date(now.getFullYear(),now.getMonth(),Math.min(day,daysInMonth(now.getFullYear(),now.getMonth())));
  if(target<now){var nm=now.getMonth()+1,ny=now.getFullYear();if(nm>11){nm=0;ny++}target=new Date(ny,nm,Math.min(day,daysInMonth(ny,nm)))}
  return Math.ceil((target-now)/86400000);
}

function monthStats(y,m){return periodStats({start:new Date(y,m,1),end:new Date(y,m+1,0)})}
