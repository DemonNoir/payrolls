/* ── Docs Viewer ── */

/* รายการไฟล์ใน docs/ (เรียงตามลำดับใหม่ → เก่า) */
var DOCS_FILES = [
  { file: 'walkthrough-mandatory-backup-popup.md', icon: '🔒', title: 'ระบบบังคับสำรองข้อมูล', desc: 'Popup บังคับสำรองข้อมูลทุก 7 วัน' },
  { file: 'walkthrough.md',                        icon: '📊', title: 'KPI Dual-Mode & Payday Logic', desc: 'ระบบ KPI 2 โหมด + วันจ่ายเงินเลื่อนอัตโนมัติ' },
  { file: 'leave_system_overhaul.md',              icon: '📅', title: 'ระบบวันลาครบวงจร', desc: 'ปรับปรุงระบบวันลาและประเภทการลา' },
  { file: 'full_redesign_walkthrough.md',          icon: '🎨', title: 'Full UI Redesign', desc: 'รีดีไซน์หน้าตาแอปใหม่ทั้งหมด' },
  { file: 'night_shift_indicator.md',              icon: '🌙', title: 'Night Shift Indicator', desc: 'ตัวบ่งชี้กะดึกในปฏิทิน' },
  { file: 'annual_redesign.md',                    icon: '📈', title: 'Annual Summary Redesign', desc: 'รีดีไซน์หน้าสรุปประจำปี' },
  { file: 'allowance_rules.md',                    icon: '💰', title: 'กฎการคำนวณสวัสดิการ', desc: 'หลักเกณฑ์การคำนวณ OT และสวัสดิการ' },
  { file: 'ot_rate_label_fix.md',                  icon: '🔧', title: 'OT Rate Label Fix', desc: 'แก้ไข label อัตราค่าแรง OT' },
  { file: 'personal_leave_fix.md',                 icon: '✅', title: 'Personal Leave Fix', desc: 'แก้ไขการคำนวณวันลากิจ' },
  { file: 'pwa_icon_update.md',                    icon: '📱', title: 'PWA Icon Update', desc: 'อัปเดตไอคอนแอปพลิเคชัน' },
];

/* ── Mini Markdown Parser ── */
function parseMarkdown(md) {
  var lines = md.split('\n');
  var html = '';
  var inPre = false, inUl = false, inOl = false, inTable = false;

  function closeList() {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  }
  function closeTable() {
    if (inTable) { html += '</tbody></table>'; inTable = false; }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    /* Code block fence */
    if (/^```/.test(line)) {
      if (inPre) { html += '</code></pre>'; inPre = false; }
      else { closeList(); closeTable(); html += '<pre><code>'; inPre = true; }
      continue;
    }
    if (inPre) { html += escapeHtml(line) + '\n'; continue; }

    /* Horizontal rule */
    if (/^---+$/.test(line.trim())) { closeList(); closeTable(); html += '<hr>'; continue; }

    /* Table row */
    if (/^\|/.test(line)) {
      var cells = line.split('|').slice(1, -1).map(function(c){ return c.trim(); });
      if (cells.every(function(c){ return /^[-:]+$/.test(c); })) continue;
      if (!inTable) {
        closeList();
        html += '<table><thead><tr>';
        cells.forEach(function(c){ html += '<th>' + inlineFormat(c) + '</th>'; });
        html += '</tr></thead><tbody>';
        inTable = true;
      } else {
        html += '<tr>';
        cells.forEach(function(c){ html += '<td>' + inlineFormat(c) + '</td>'; });
        html += '</tr>';
      }
      continue;
    }
    if (inTable) closeTable();

    /* Headings */
    var hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      closeList();
      var level = hMatch[1].length;
      html += '<h' + level + '>' + inlineFormat(hMatch[2]) + '</h' + level + '>';
      continue;
    }

    /* Unordered list */
    if (/^[\*\-]\s+/.test(line)) {
      if (!inUl) { closeTable(); html += '<ul>'; inUl = true; }
      html += '<li>' + inlineFormat(line.replace(/^[\*\-]\s+/, '')) + '</li>';
      continue;
    }

    /* Ordered list */
    if (/^\d+\.\s+/.test(line)) {
      if (!inOl) { closeTable(); html += '<ol>'; inOl = true; }
      html += '<li>' + inlineFormat(line.replace(/^\d+\.\s+/, '')) + '</li>';
      continue;
    }

    /* Close lists */
    if (inUl && !/^[\*\-]\s+/.test(line)) closeList();
    if (inOl && !/^\d+\.\s+/.test(line)) closeList();

    /* Blockquote */
    if (/^>\s?/.test(line)) {
      html += '<blockquote>' + inlineFormat(line.replace(/^>\s?/, '')) + '</blockquote>';
      continue;
    }

    /* Blank line */
    if (!line.trim()) continue;

    /* Paragraph */
    html += '<p>' + inlineFormat(line) + '</p>';
  }

  if (inPre)   html += '</code></pre>';
  if (inUl)    html += '</ul>';
  if (inOl)    html += '</ol>';
  if (inTable) closeTable();

  return html;
}

function inlineFormat(text) {
  text = text.replace(/`([^`]+)`/g, function(_, c){ return '<code>' + escapeHtml(c) + '</code>'; });
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '<span style="color:var(--blue);text-decoration:underline">$1</span>');
  return text;
}

/* ── Docs Viewer Controller ── */
var docsCurrentFile = null;

function openDocsOverlay() {
  var overlay = $('docsOverlay');
  if (!overlay) return;
  docsShowList();
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeDocsOverlay() {
  var overlay = $('docsOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  docsCurrentFile = null;
}

function docsShowList() {
  var listPane    = $('docsListPane');
  var contentPane = $('docsContentPane');
  var backBtn     = $('docsBackBtn');
  var title       = $('docsHeaderTitle');

  title.textContent = '\uD83D\uDCCB เอกสาร & อัปเดต';
  backBtn.classList.remove('show');
  listPane.style.display = '';
  contentPane.classList.remove('show');
  docsCurrentFile = null;

  listPane.innerHTML = DOCS_FILES.map(function(f, idx) {
    return '<div class="docs-file-item" data-idx="' + idx + '">' +
      '<span class="docs-file-icon">' + f.icon + '</span>' +
      '<div class="docs-file-meta">' +
        '<div class="docs-file-name">' + escapeHtml(f.title) + '</div>' +
        '<div class="docs-file-desc">' + escapeHtml(f.desc) + '</div>' +
      '</div>' +
      '<span class="docs-file-arrow">\u203A</span>' +
    '</div>';
  }).join('');

  Array.prototype.forEach.call(
    listPane.querySelectorAll('.docs-file-item'),
    function(el) {
      el.onclick = function() { docsOpenFile(num(el.getAttribute('data-idx'))); };
    }
  );
}

function docsOpenFile(idx) {
  var f = DOCS_FILES[idx];
  if (!f) return;

  var listPane    = $('docsListPane');
  var contentPane = $('docsContentPane');
  var backBtn     = $('docsBackBtn');
  var title       = $('docsHeaderTitle');
  var loadingMsg  = $('docsLoadingMsg');
  var mdBody      = $('docsMdBody');

  title.textContent = f.icon + ' ' + f.title;
  backBtn.classList.add('show');
  listPane.style.display = 'none';
  contentPane.classList.add('show');
  loadingMsg.style.display = 'block';
  mdBody.innerHTML = '';
  docsCurrentFile = f;

  /* คำนวณ base URL หลายวิธีเพื่อรองรับ PWA standalone บน iOS/Android */
  function getDocsBase() {
    /* วิธี 1: หา base จาก script tag ของ docs.js เอง (แม่นที่สุด) */
    var scripts = document.querySelectorAll('script[src*="docs.js"]');
    if (scripts.length) {
      var src = scripts[0].src;
      return src.replace(/js\/docs\.js.*$/, '');
    }
    /* วิธี 2: คำนวณจาก location.href */
    return location.href.replace(/\/[^\/]*(\?.*)?$/, '/');
  }

  var docsUrl = getDocsBase() + 'docs/' + f.file;

  fetch(docsUrl)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function(text) {
      loadingMsg.style.display = 'none';
      mdBody.innerHTML = parseMarkdown(text);
      contentPane.scrollTop = 0;
    })
    .catch(function(err) {
      loadingMsg.style.display = 'none';
      mdBody.innerHTML = '<p style="color:var(--red)">\u26A0\uFE0F โหลดไม่ได้: ' + escapeHtml(String(err)) + '</p>' +
        '<p style="color:var(--muted);font-size:11px">URL: ' + escapeHtml(docsUrl) + '</p>';
    });
}


/* ── Wire Events (close/back/backdrop — open wired ใน app.js) ── */
if ($('docsCloseBtn'))$('docsCloseBtn').onclick  = closeDocsOverlay;
if ($('docsBackBtn')) $('docsBackBtn').onclick   = docsShowList;
if ($('docsOverlay')) $('docsOverlay').onclick   = function(e) {
  if (e.target === this) closeDocsOverlay();
};
