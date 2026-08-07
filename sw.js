const CACHE='ot-v32';
const FILES=['./','./index.html','./css/style.css','./js/utils.js','./js/calc.js','./js/ui.js','./js/settings.js','./js/data.js','./js/tutorial.js','./js/app.js','./js/docs.js','./manifest.json','./docs/walkthrough-mandatory-backup-popup.md','./docs/walkthrough.md','./docs/leave_system_overhaul.md','./docs/full_redesign_walkthrough.md','./docs/night_shift_indicator.md','./docs/annual_redesign.md','./docs/allowance_rules.md','./docs/ot_rate_label_fix.md','./docs/personal_leave_fix.md','./docs/pwa_icon_update.md'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

/* Network-First Strategy:
   ดึงข้อมูลจากอินเทอร์เน็ตก่อนเสมอ เพื่อให้ได้โค้ดเวอร์ชันล่าสุดเมื่อมีการรีเฟรช 
   ถ้าไม่มีเน็ต (Offline) ค่อยดึงข้อมูลจาก Cache ที่เก็บไว้ */
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(res=>{
      // ถ้าโหลดจากเน็ตสำเร็จ ให้เอาไปอัปเดตทับใน Cache ด้วย
      if(res&&res.status===200){
        var clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>{
      // ถ้าไม่มีเน็ต ให้ดึงจาก Cache
      return caches.match(e.request);
    })
  );
});
