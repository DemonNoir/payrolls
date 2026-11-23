/* Actual amounts are independent of payroll inputs and belong to one exact billing period. */
var payslipView = { key: null, saved: null, estimate: null };
var payslipDecimals = new Intl.NumberFormat('en-US', {
  useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2
});

function openPayslipForPeriod(period) {
  currentPeriod = period;
  showPage('summary');
  $('payslipTitle').focus({ preventScroll: true });
  $('payslipCard').scrollIntoView({ block: 'start' });
}

function renderPayslip() {
  var key = 'pp_payslip:' + dateKey(currentPeriod.start) + '~' + dateKey(currentPeriod.end);
  var saved = getLS(key);
  // Preserve an in-progress edit if another part of this period is re-rendered.
  if (key !== payslipView.key || saved !== payslipView.saved) {
    var record = {};
    try { record = JSON.parse(saved) || {}; } catch (err) { /* Show empty fields for unreadable data. */ }
    $('payslipOt').value = Number.isFinite(record.ot) ? record.ot : '';
    $('payslipNet').value = Number.isFinite(record.net) ? record.net : '';
    $('payslipStatus').textContent = saved ? 'บันทึกแล้ว' : '';
    payslipView.key = key;
    payslipView.saved = saved;
  }
  $('payslipClear').hidden = saved === null;
  $('payslipPeriod').textContent = 'เทียบกับยอดคำนวณเต็มรอบ ' + periodLabel(currentPeriod);
  var stats = periodStats(currentPeriod, undefined, 'overall');
  payslipView.estimate = { ot: stats.otPay, net: stats.net };
  $('payslipOtEstimate').textContent = 'คำนวณได้ ' + money(stats.otPay);
  $('payslipNetEstimate').textContent = 'คำนวณได้ ' + money(stats.net);
  previewPayslip();
}

function payslipAmount(id) {
  var input = $(id);
  return input.validity.valid && input.value !== '' ? input.valueAsNumber : null;
}

function payslipSatang(value) {
  // Match the two-decimal display even at half a satang, e.g. 10.075 -> 10.08.
  return Number(payslipDecimals.format(value).replace('.', ''));
}

function payslipDifference(inputId, resultId, estimate) {
  var amount = payslipAmount(inputId);
  var result = $(resultId);
  if (amount === null) {
    result.textContent = '';
    return null;
  }
  var difference = payslipSatang(amount) - payslipSatang(estimate);
  result.textContent = difference === 0 ? 'ตรงกับสลิป' : 'ส่วนต่าง ' + (difference > 0 ? '+' : '') + money(difference / 100);
  result.classList.toggle('payslip-match', difference === 0);
  return difference;
}

function previewPayslip() {
  var estimate = payslipView.estimate;
  var ot = payslipDifference('payslipOt', 'payslipOtDiff', estimate.ot);
  var net = payslipDifference('payslipNet', 'payslipNetDiff', estimate.net);
  var note = '';
  if (net && ot === 0) {
    note = 'ค่า OT ตรงกัน ลองตรวจเบี้ยเลี้ยงและรายการหักในสลิป';
  } else if (net && ot === null) {
    note = 'กรอกค่า OT จากสลิปเพื่อช่วยตรวจที่มาของส่วนต่าง';
  } else if (ot && ot === net) {
    note = 'ส่วนต่างของเงินสุทธิเท่ากับส่วนต่างค่า OT ลองตรวจชั่วโมงและตัวคูณ OT';
  } else if (ot) {
    note = 'ลองเทียบชั่วโมงกับคำขอ OT และตรวจตัวคูณที่บันทึกไว้ในปฏิทิน';
  }
  $('payslipNote').textContent = note;
}

function storePayslip(record) {
  try {
    if (record) localStorage.setItem(payslipView.key, JSON.stringify(record));
    else localStorage.removeItem(payslipView.key);
  } catch (err) {
    $('payslipStatus').textContent = 'บันทึกไม่สำเร็จ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์';
    return;
  }
  renderPayslip();
  $('payslipStatus').textContent = record ? 'บันทึกแล้ว' : 'ลบยอดจากสลิปแล้ว';
  idbSave();
  triggerAutoCloudSync();
}

$('payslipForm').oninput = function () {
  $('payslipStatus').textContent = 'ยังไม่ได้บันทึก';
  previewPayslip();
};

$('payslipForm').onsubmit = function (event) {
  event.preventDefault();
  var ot = payslipAmount('payslipOt');
  var net = payslipAmount('payslipNet');
  if (ot === null && net === null) {
    $('payslipStatus').textContent = 'กรอกยอดจากสลิปอย่างน้อยหนึ่งรายการ';
    $('payslipOt').focus();
    return;
  }
  storePayslip({ ot: ot, net: net });
};

$('payslipClear').onclick = function () {
  if (confirm('ลบยอดจากสลิปของรอบ ' + periodLabel(currentPeriod) + ' หรือไม่?')) {
    storePayslip(null);
  }
};
$('payslipCompareOt').onclick = function () { $('compareOtLink').click(); };
