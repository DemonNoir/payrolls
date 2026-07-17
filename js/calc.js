/* ══════════════════════════════════════════════════════════════
 * calc.js — สูตรคำนวณเงินเดือน OT สวัสดิการ และรายการหัก
 *
 * ⚠️ คำเตือนสำหรับนักพัฒนา / AI Agent:
 * ไฟล์นี้คือหัวใจของแอป — แก้ผิดแม้บรรทัดเดียวจะทำให้ยอดเงินผิดทั้งหมด
 * ก่อนแก้ไข ต้องอ่าน ARCHITECTURE.md และรัน tests/calc-tests.html ทุกครั้ง
 * ══════════════════════════════════════════════════════════════ */

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
    annualLeaveAdj:getNum('annual_leave_adj',null,0),
    startDate:getLS('start_date')||null,
    calcMode:getLS('calc_mode')||'realtime'
  };
}

function getValidDay(v){v=parseInt(v,10);return (v>=1&&v<=31)?v:0}

/* ── คำนวณค่าแรง/ชม. จากเงินเดือน + KPI ── */
/* สูตร: (เงินเดือน + KPI เงิน) ÷ 30 ÷ 8 แล้ว ceil ทศนิยม 2 ตำแหน่ง
 * ⚠️ Math.ceil ปัดขึ้น ตามสลิปบริษัท — อย่าเปลี่ยนเป็น Math.round/floor
 * ⚠️ หาร 30 เสมอ (ไม่ใช่จำนวนวันในเดือน) — ตามสูตรบริษัท
 * ⚠️ หาร 8 คือ 8 ชม./วัน — ค่าคงที่ตามกฎหมายแรงงาน */
function getHourlyRate(kpiBonusPct){
  var st=settings();
  var salaryBase=st.salaryBase;
  if(isNaN(salaryBase)||salaryBase<=0)return 0;
  var kpiDaily=isNaN(st.kpiPercent)?0:num(st.kpiPercent);
  var kpiBonus=isNaN(kpiBonusPct)?0:num(kpiBonusPct);
  var kpiTotal=kpiDaily+kpiBonus;
  var kpiMoney=salaryBase*(kpiTotal/100);
  var base=salaryBase+kpiMoney;
  return Math.ceil(base/30/8*100)/100; /* ← ห้ามเปลี่ยน ceil/30/8 */
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

/* Removed entryContribution */

/* คำนวณจำนวนเดือนทำงาน (สำหรับ auto-accrual ลาพักร้อน) */
function monthsWorked(){
  var st=settings();
  if(!st.startDate)return 0;
  var start=parseDateKey(st.startDate), now=new Date();
  var months=(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth());
  if(now.getDate()<start.getDate()) months--;
  return Math.max(0,months);
}

function getBanks(excludeKey){
  var data=getCal(), st=settings();
  var ot = st.bankAdj;
  var annual = st.annualLeaveAdj + (monthsWorked()*4);
  Object.keys(data).forEach(function(k){
    if(k!==excludeKey){
      var en=data[k];
      if(en.kind==='ot' && en.payType==='leave') ot += num(en.credit);
      if(en.kind==='use'){
        if(en.leaveType==='annual') annual -= num(en.hours);
        else if(en.leaveType==='swap') ot -= num(en.hours);
      }
      if(en.kind==='leave' && en.leaveType==='annual') annual -= (num(en.days)||1)*8;
    }
  });
  return { ot: Math.max(0, ot), annual: Math.max(0, annual) };
}

function periodStats(p,kpiBonusPctOverride){
  var data=getCal(), st=settings(), th=0,tp=0,otDays=0,otFoodDays=0,leaveUse=0,nightShiftDays=0,byDay={}, start=p.start,end=p.end;
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

  var todayDt = new Date(); todayDt.setHours(0,0,0,0);
  /* นับการลาจากปฏิทิน — 8 ประเภท */
  var calLeave={annual:0,swap:0,personal_paid:0,personal_unpaid:0,sick:0,maternity:0,ordination:0,funeral:0};
  Object.keys(data).forEach(function(k){
    var dt=parseDateKey(k), en=data[k]; if(!inRangeDate(dt,start,end))return;
    if(st.calcMode === 'realtime' && dt > todayDt) return;
    byDay[k]=en;
    if(en.isNight) nightShiftDays++;
    if(en.kind==='ot'){
      th+=num(en.hours);otDays++;if(num(en.hours)>=2)otFoodDays++;
      if(en.payType==='money') tp+=num(en.hours)*num(en.multiplier)*hourlyRate;
    }
    if(en.kind==='use'){
      var lt=en.leaveType||'_legacy';
      var hrs=num(en.hours);
      leaveUse+=hrs/8;
      if(calLeave.hasOwnProperty(lt)) calLeave[lt]+=hrs/8;
      /* old data without leaveType → count as penalty leave */
    }
    /* backward compat: old kind='leave' (days) */
    if(en.kind==='leave'){
      var ld=num(en.days)||1;
      var olt=en.leaveType||'sick';
      if(calLeave.hasOwnProperty(olt)) calLeave[olt]+=ld;
      leaveUse+=ld;
    }
  });
  /* Hybrid: บวกกับยอดลาจากตั้งค่า (per-period) */
  ppSick+=calLeave.sick; ppPersonal+=calLeave.personal_paid+calLeave.personal_unpaid; ppAbsent+=0;
  var ppAnnual=calLeave.annual;
  var ppSwap=calLeave.swap;
  var ppMaternity=calLeave.maternity;
  var ppOrdination=calLeave.ordination;
  var ppFuneral=calLeave.funeral;
  var ppPersonalUnpaid=calLeave.personal_unpaid+getPerPeriod('pp_personal',label);

  /* ── นับวันทำงาน (autoDays) สำหรับคำนวณสวัสดิการ ──
   * autoDays ใช้คูณ: ค่าเดินทาง, ค่าอาหาร, ค่ากะดึก
   *
   * กฎ: นับวันเมื่อ (วันทำงานปกติ) หรือ (มี OT บันทึกในวันนั้น)
   *
   * ⚠️ BUG FIX 2026-06-27: เคยเขียน (getDay()!==0 && (!isHolidayKey(k) || hasOt))
   *    ทำให้วันอาทิตย์ที่ทำ OT ไม่ถูกนับ → ไม่ได้ค่าเดินทาง/ค่าอาหาร
   *    แก้เป็น: (isWorkingDay || hasOt) — ให้วันหยุดหรือวันอาทิตย์ที่ทำ OT ได้สวัสดิการด้วย
   *
   * ⚠️ อย่าเปลี่ยน || hasOt เป็น && hasOt — จะทำให้บั๊กเดิมกลับมา
   * ⚠️ อย่าเอา isWorkingDay ไปรวมกับ hasOt เป็นเงื่อนไขเดียว
   */
  var dStart = st.startDate ? parseDateKey(st.startDate) : null;
  var totalDaysInPeriod = 0;
  var employedDaysInPeriod = 0;
  var autoDays=0, cur=new Date(start);
  while(cur<=end){
    totalDaysInPeriod++;
    var countForRealtime = (st.calcMode === 'overall') || (cur <= todayDt);
    var isEmployed = !dStart || cur >= dStart;
    
    if (isEmployed && countForRealtime) employedDaysInPeriod++;

    var k=dateKey(cur), hasOt=byDay[k]&&byDay[k].kind==='ot';
    var isWorkingDay = (cur.getDay()!==0 && !isHolidayKey(k));
    if((isWorkingDay || hasOt) && isEmployed && countForRealtime) autoDays++;
    cur=addDays(cur,1);
  }

  /* สวัสดิการ (Welfare)
   * คูณจาก actual = autoDays − วันลาทุกประเภท */
  var leaveDays=ppSick+ppPersonal+ppAbsent+ppAnnual+ppSwap+ppMaternity+ppOrdination+ppFuneral+leaveUse;
  var actual=Math.max(0,autoDays-leaveDays);
  var welfare={transport:st.transport*actual,food:st.food*actual,otFood:st.otFood*otFoodDays,night:st.nightRate*nightShiftDays};
  welfare.total=welfare.transport+welfare.food+welfare.otFood+welfare.night;

  var kpiDaily=isNaN(st.kpiPercent)?0:num(st.kpiPercent);
  var kpiTotal=kpiDaily+kpiBonusPct;

  /* ── Prorate: หาร 30 วัน (ตามสูตรสลิป) ──
   * ⚠️ หาร 30 เสมอ ไม่ใช่จำนวนวันจริงในเดือน — ตามสูตรบริษัท
   * ⚠️ ใช้ Math.min เพื่อป้องกันกรณีทำงานเกิน 30 วัน ไม่ให้เงินเกินฐาน */
  var isFullPeriod=(employedDaysInPeriod>=totalDaysInPeriod);
  var proratedSalary=isFullPeriod?st.salaryBase:Math.min(st.salaryBase,(st.salaryBase/30)*employedDaysInPeriod);
  var proratedHousing=isFullPeriod?st.housing:Math.min(st.housing,(st.housing/30)*employedDaysInPeriod);

  /* ── หักลากิจ (ไม่รับค่าจ้าง) + ขาดงาน ──
   * ⚠️ ลาป่วย, ลากิจ (รับค่าจ้าง), ลาพักร้อน, สลับหยุด, ลาคลอด, ลาบวช, ลาฌาปนกิจ → ไม่หักเงินเดือน
   * ⚠️ เฉพาะ ลากิจ (ไม่รับค่าจ้าง) + ขาดงาน(pp_absent settings) → หักเงินเดือน */
  var unpaidLeaveDays=ppPersonalUnpaid+ppAbsent;
  if(unpaidLeaveDays>0) proratedSalary=Math.max(0,proratedSalary-(st.salaryBase/30)*unpaidLeaveDays);

  /* ── KPI ──
   * ⚠️ เบี้ยขยัน = 0 ถ้ามีการลาที่ไม่ใช่ ลาพักร้อน/สลับหยุด
   * กลุ่ม A (ไม่หักเบี้ยขยัน): annual, swap
   * กลุ่ม B (หักเบี้ยขยัน): sick, personal_paid, personal_unpaid, maternity, ordination, funeral, absent, old legacy */
  var notEmployedYet = (employedDaysInPeriod === 0);
  var kpiMoney=notEmployedYet?0:proratedSalary*(kpiTotal/100);
  var kpi=kpiMoney;
  var hasLeavePenalty=(ppSick>0||ppPersonal>0||ppAbsent>0||ppMaternity>0||ppOrdination>0||ppFuneral>0);
  var diligence=(hasLeavePenalty||notEmployedYet)?0:st.diligence;
  if(notEmployedYet){proratedHousing=0;welfare={transport:0,food:0,otFood:0,night:0,total:0};}
  var base=proratedSalary+proratedHousing+ppServiceAward+diligence+kpi;

  /* ── ประกันสังคม ──
   * ⚠️ 5% ของ proratedSalary, ปัดลง (Math.floor), ไม่เกิน 750 บาท
   * ⚠️ อย่าเปลี่ยนเป็น Math.round — จะทำให้ผิดจากสลิปจริง */
  var socialSecurity=Math.min(750,Math.floor(proratedSalary*0.05));
  var deductions={social:socialSecurity,tax:ppTax,other:ppOther,total:socialSecurity+ppTax+ppOther};
  var gross=base+tp+welfare.total;

  return {
    otHours:th,otPay:tp,otDays:otDays,autoDays:autoDays,leaveDays:leaveDays,actualDays:actual,
    welfare:welfare,kpi:kpi,diligence:diligence,serviceAward:ppServiceAward,base:base,gross:gross,deductions:deductions,net:gross-deductions.total,
    hourlyRate:hourlyRate,kpiBonusPct:kpiBonusPct,kpiDailyPct:kpiDaily,kpiTotalPct:kpiTotal,kpiTotalMoney:kpiMoney,
    ppSick:ppSick,ppPersonal:ppPersonal,ppAbsent:ppAbsent,ppAnnual:ppAnnual,ppSwap:ppSwap,
    ppMaternity:ppMaternity,ppOrdination:ppOrdination,ppFuneral:ppFuneral,ppPersonalUnpaid:ppPersonalUnpaid,
    ppTax:ppTax,ppOther:ppOther,ppServiceAward:ppServiceAward,
    proratedSalary:proratedSalary,proratedHousing:proratedHousing,isProrated:!isFullPeriod,employedDays:employedDaysInPeriod,totalDays:totalDaysInPeriod
  };
}

function paydayCountdown(){
  var day=settings().payday||25, now=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  var target=new Date(now.getFullYear(),now.getMonth(),Math.min(day,daysInMonth(now.getFullYear(),now.getMonth())));
  if(target<now){var nm=now.getMonth()+1,ny=now.getFullYear();if(nm>11){nm=0;ny++}target=new Date(ny,nm,Math.min(day,daysInMonth(ny,nm)))}
  return Math.ceil((target-now)/86400000);
}

/* ── monthStats: ใช้ periodFor เพื่อตัดตามวันตัดยอดบิล ──
 * refDate = วันอ้างอิง (cutoff+1 ของเดือนนั้น) เพื่อให้ periodFor คืน billing period ที่ถูกต้อง
 * ⚠️ เดิมใช้ calendar month (1-สิ้นเดือน) ซึ่งผิดเมื่อตั้งวันตัดรอบ */
function monthStats(y,m){
  var cutoff=settings().cutoff;
  if(!cutoff) return periodStats({start:new Date(y,m,1),end:new Date(y,m+1,0)});
  /* สร้าง refDate = วันที่ cutoff+1 ของเดือน m เพื่อให้ periodFor คืนรอบที่ end ตรงเดือน m */
  var refDay=Math.min(cutoff+1,daysInMonth(y,m));
  var ref=new Date(y,m,refDay);
  return periodStats(periodFor(ref));
}
