/* ══════════════════════════════════════════════════════════════
 * tutorial.js — Interactive Onboarding Tutorial
 *
 * แสดงคู่มือสอนการใช้งานแบบ Full-screen Slides
 * - แสดงอัตโนมัติเมื่อเปิดแอปครั้งแรก
 * - เปิดซ้ำได้ตลอดจากหน้าตั้งค่า
 * - รองรับ Swipe gestures บนมือถือ
 * ══════════════════════════════════════════════════════════════ */

var TUTORIAL_SLIDES = [
  {
    emoji: '👋',
    title: 'ยินดีต้อนรับ!',
    body: 'แอปบันทึก OT คำนวณรายได้\nและสรุปเงินเดือนอัตโนมัติ\n\nใช้งานง่าย · ทำงาน Offline ได้',
    tip: 'ปัดไปทางซ้าย หรือกดปุ่ม "ถัดไป" เพื่อเริ่มเรียนรู้'
  },
  {
    emoji: '⚙️',
    title: 'เริ่มต้น — ตั้งค่าก่อน!',
    body: 'กดปุ่ม ⚙ ที่มุมขวาบน แล้วกรอก:\n\n1. เงินเดือน (บาท/เดือน)\n2. วันตัดรอบ เช่น 15\n3. วันเงินออก เช่น 25',
    tip: '💡 ตั้งแค่ 3 อย่างนี้ก็เริ่มใช้ได้เลย!'
  },
  {
    emoji: '📅',
    title: 'บันทึก OT',
    body: 'แตะที่วันที่บนปฏิทินเพื่อบันทึก OT\n\n• เลือกจำนวนชั่วโมง (เช่น 2 ชม.)\n• เลือกอัตรา (1x, 1.5x, 3x)\n• เลือกรับเป็น เงิน หรือ สะสมวันหยุด',
    tip: '🟧 สีส้ม = OT เงิน  ·  🟦 สีน้ำเงิน = สะสมวันหยุด'
  },
  {
    emoji: '📊',
    title: 'ดูแดชบอร์ด',
    body: 'กดแท็บ "แดชบอร์ด" เพื่อดู:\n\n• รายได้สุทธิโดยประมาณ\n• ชั่วโมง OT รอบนี้\n• กราฟ OT + รายได้ย้อนหลัง',
    tip: '💡 ตัวเลขจะอัปเดตทันทีเมื่อบันทึก OT'
  },
  {
    emoji: '📋',
    title: 'สรุปรอบบิล & รายปี',
    body: '• แท็บ "สรุปรอบบิล"\n  ดูรายละเอียดเงินเดือน สวัสดิการ รายการหัก\n\n• แท็บ "รายปี"\n  ดูภาพรวมทั้งปี + ข้อมูลยื่น ภ.ง.ด.91',
    tip: '💡 กดลูกศร ‹ › เพื่อดูรอบบิลอื่น'
  },
  {
    emoji: '🌙',
    title: 'สลับธีม',
    body: 'กดปุ่ม 🌙 ที่ด้านบนเพื่อเปลี่ยนธีม:\n\n🌙  Dark Mode (มืด)\n☀️  Light Mode (สว่าง)\n🌓  Auto (ตามระบบมือถือ)',
    tip: ''
  },
  {
    emoji: '🔄',
    title: 'โหมดการคำนวณ',
    body: 'สลับได้ใต้แท็บเมนู:\n\n• เรียลไทม์ — คำนวณรายได้ถึงแค่วันนี้\n• โดยรวม — ประเมินรายได้เต็มรอบบิล',
    tip: '💡 สลับได้ทั้งในหน้าหลักและหน้าตั้งค่า'
  },
  {
    emoji: '💾',
    title: 'สำรอง & กู้คืนข้อมูล',
    body: 'กดปุ่ม ⚙ → เลื่อนลงล่างสุด:\n\n📤  สำรองข้อมูล → ดาวน์โหลดเป็นไฟล์\n📥  กู้คืนข้อมูล → เลือกไฟล์ที่สำรองไว้',
    tip: '⚠️ แนะนำให้สำรองข้อมูลทุก 2 สัปดาห์'
  },
  {
    emoji: '📱',
    title: 'ติดตั้งลงมือถือ (PWA)',
    body: 'ใช้งานแบบแอปได้ ไม่ต้องพึ่งเน็ต!\n\n🍏 iOS: กดปุ่ม "แชร์" ด้านล่าง\n→ เลือก "เพิ่มไปยังหน้าจอโฮม"\n\n🤖 Android: กดเมนู 3 จุดขวาบน\n→ เลือก "เพิ่มลงในหน้าจอหลัก"',
    tip: '💡 ดูวิธีติดตั้งแบบละเอียดได้ที่ปุ่ม 📱 หน้าแรก'
  }
];

var _tutCurrent = 0;
var _tutTouchX = 0;

function buildTutorialHTML() {
  var el = $('tutorialOverlay');
  if (!el) return;

  var slides = '';
  for (var i = 0; i < TUTORIAL_SLIDES.length; i++) {
    var s = TUTORIAL_SLIDES[i];
    var bodyHtml = escapeHtml(s.body).replace(/\n/g, '<br>');
    var tipHtml = s.tip ? '<div class="tut-tip">' + escapeHtml(s.tip) + '</div>' : '';
    slides += '<div class="tut-slide' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' +
      '<div class="tut-emoji">' + s.emoji + '</div>' +
      '<div class="tut-title">' + escapeHtml(s.title) + '</div>' +
      '<div class="tut-body">' + bodyHtml + '</div>' +
      tipHtml +
      '</div>';
  }

  var dots = '';
  for (var j = 0; j < TUTORIAL_SLIDES.length; j++) {
    dots += '<span class="tut-dot' + (j === 0 ? ' active' : '') + '" data-idx="' + j + '"></span>';
  }

  el.innerHTML =
    '<div class="tut-container">' +
      '<button class="tut-close" id="tutCloseBtn">✕</button>' +
      '<div class="tut-slides-wrap">' + slides + '</div>' +
      '<div class="tut-dots">' + dots + '</div>' +
      '<div class="tut-nav">' +
        '<button class="tut-btn tut-prev" id="tutPrevBtn">‹ ก่อนหน้า</button>' +
        '<button class="tut-btn tut-next" id="tutNextBtn">ถัดไป ›</button>' +
      '</div>' +
    '</div>';

  /* Wire events */
  $('tutCloseBtn').onclick = closeTutorial;
  $('tutPrevBtn').onclick = function() { tutGoTo(_tutCurrent - 1); };
  $('tutNextBtn').onclick = function() {
    if (_tutCurrent === TUTORIAL_SLIDES.length - 1) closeTutorial();
    else tutGoTo(_tutCurrent + 1);
  };

  /* Dot clicks */
  var dotEls = el.querySelectorAll('.tut-dot');
  for (var d = 0; d < dotEls.length; d++) {
    dotEls[d].onclick = (function(idx) { return function() { tutGoTo(idx); }; })(d);
  }

  /* Swipe support */
  var wrap = el.querySelector('.tut-slides-wrap');
  wrap.addEventListener('touchstart', function(e) { _tutTouchX = e.changedTouches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - _tutTouchX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) tutGoTo(_tutCurrent + 1);       /* swipe left → next */
      else tutGoTo(_tutCurrent - 1);               /* swipe right → prev */
    }
  }, { passive: true });

  /* Click outside to close */
  el.onclick = function(e) { if (e.target === el) closeTutorial(); };
}

function tutGoTo(idx) {
  if (idx < 0 || idx >= TUTORIAL_SLIDES.length) return;
  var el = $('tutorialOverlay');
  if (!el) return;

  var oldSlide = el.querySelector('.tut-slide.active');
  var newSlide = el.querySelectorAll('.tut-slide')[idx];
  if (!newSlide || oldSlide === newSlide) return;

  /* Determine direction */
  var goingForward = idx > _tutCurrent;

  /* Animate out old */
  oldSlide.classList.remove('active');
  oldSlide.classList.add(goingForward ? 'exit-left' : 'exit-right');

  /* Animate in new */
  newSlide.classList.add(goingForward ? 'enter-right' : 'enter-left');
  /* Force reflow */
  void newSlide.offsetWidth;
  newSlide.classList.remove('enter-right', 'enter-left');
  newSlide.classList.add('active');

  /* Clean up old after animation */
  setTimeout(function() {
    oldSlide.classList.remove('exit-left', 'exit-right');
  }, 300);

  _tutCurrent = idx;

  /* Update dots */
  var dots = el.querySelectorAll('.tut-dot');
  for (var i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('active', i === idx);
  }

  /* Update nav buttons */
  $('tutPrevBtn').style.visibility = idx === 0 ? 'hidden' : 'visible';
  var nextBtn = $('tutNextBtn');
  nextBtn.innerText = idx === TUTORIAL_SLIDES.length - 1 ? '✨ เริ่มใช้งาน!' : 'ถัดไป ›';
  if (idx === TUTORIAL_SLIDES.length - 1) {
    nextBtn.classList.add('tut-finish');
  } else {
    nextBtn.classList.remove('tut-finish');
  }
}

function showTutorial() {
  _tutCurrent = 0;
  buildTutorialHTML();
  tutGoTo(0);
  $('tutorialOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeTutorial() {
  var el = $('tutorialOverlay');
  if (el) el.classList.remove('show');
  document.body.style.overflow = '';
  setLS('tutorial_done', '1');
}

function shouldShowTutorial() {
  return getLS('tutorial_done') !== '1';
}
