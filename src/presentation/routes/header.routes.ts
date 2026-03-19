import type { Context, Next } from 'hono'
import { DASHBOARD_PATH, INTERRUPT_PATH, METRICS_PATH } from './routes.js'

// Injected into every text/html response served by Bull Board under /admin/queues/*.
// Self-contained: includes scoped styles, dark-mode init, theme toggle, and collapsible active-jobs strip.
const KITCHEN_ADMIN_HEADER = `<style>
  #kitchen-header-root{position:relative;z-index:9999;font-family:system-ui,sans-serif;font-size:14px}
  #kitchen-header-root header{background:#111;color:#fff;padding:12px 24px;display:flex;align-items:center;gap:24px;box-shadow:0 1px 0 #222}
  #kitchen-header-root h1{font-size:16px;font-weight:600;margin:0;padding:0}
  #kitchen-header-root header a{color:#aaa;text-decoration:none;font-size:13px}
  #kitchen-header-root header a:hover{color:#fff}
  #kitchen-theme-btn{margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;padding:4px;line-height:1;color:#aaa}
  #kitchen-theme-btn:hover{color:#fff}
  #kitchen-theme-btn::before{content:'☽'}
  [data-theme="dark"] #kitchen-theme-btn::before{content:'☀'}
  #kitchen-strip{background:#1c1c1c;border-bottom:1px solid #2e2e2e;padding:6px 24px;display:flex;align-items:flex-start;gap:8px;min-height:32px}
  [data-theme="light"] #kitchen-strip{background:#f5f5f5;border-bottom:1px solid #e5e5e5}
  #kitchen-strip-toggle{background:none;border:none;cursor:pointer;font-size:11px;color:#888;padding:2px 4px;margin-top:1px;flex-shrink:0}
  #kitchen-strip-toggle:hover{color:#ccc}
  #kitchen-strip-content{flex:1;font-size:13px;color:#aaa}
  [data-theme="light"] #kitchen-strip-content{color:#555}
  #kitchen-strip-content table{width:100%;border-collapse:collapse}
  #kitchen-strip-content th{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888;padding:4px 10px 4px 0;text-align:left}
  #kitchen-strip-content td{padding:4px 10px 4px 0;font-size:13px;color:#ccc}
  [data-theme="light"] #kitchen-strip-content td{color:#333}
  .kitchen-interrupt-btn{padding:2px 10px;font-size:12px;background:#3a1212;color:#f87171;border:1px solid #7f1d1d;border-radius:4px;cursor:pointer}
  .kitchen-interrupt-btn:hover{background:#4a1818}
  [data-theme="light"] .kitchen-interrupt-btn{background:#fee2e2;color:#dc2626;border-color:#fca5a5}
  [data-theme="light"] .kitchen-interrupt-btn:hover{background:#fecaca}
</style>
<script>;(function(){
  document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'dark');
  window.toggleKitchenTheme=function(){
    var h=document.documentElement,n=h.getAttribute('data-theme')==='dark'?'light':'dark';
    h.setAttribute('data-theme',n);localStorage.setItem('theme',n);
  };
  var kitchenStripExpanded=false;
  function kitchenFetchStrip(){
    fetch(kitchenStripExpanded?'${DASHBOARD_PATH}/active':'${DASHBOARD_PATH}/active/summary')
      .then(function(r){return r.text()})
      .then(function(html){var el=document.getElementById('kitchen-strip-content');if(el)el.innerHTML=html;})
      .catch(function(){});
  }
  window.toggleKitchenStrip=function(){
    kitchenStripExpanded=!kitchenStripExpanded;
    var btn=document.getElementById('kitchen-strip-toggle');
    if(btn)btn.textContent=kitchenStripExpanded?'▲':'▼';
    kitchenFetchStrip();
  };
  window.kitchenInterrupt=function(jobId,btn){
    if(!confirm('Interrupt this job?'))return;
    btn.disabled=true;
    fetch('${INTERRUPT_PATH}/'+jobId,{method:'POST'})
      .then(function(){setTimeout(function(){window.location.reload();},500);})
      .catch(function(){btn.disabled=false;});
  };
  function kitchenInitStrip(){kitchenFetchStrip();setInterval(kitchenFetchStrip,3000);}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',kitchenInitStrip);}else{kitchenInitStrip();}
})();</script>
<div id="kitchen-header-root">
  <header>
    <h1>Kitchen Admin</h1>
    <a href="${DASHBOARD_PATH}">Queue Inspector</a>
    <a href="${METRICS_PATH}">Metrics</a>
    <button id="kitchen-theme-btn" onclick="toggleKitchenTheme()" aria-label="Toggle theme"></button>
  </header>
  <div id="kitchen-strip">
    <button id="kitchen-strip-toggle" onclick="toggleKitchenStrip()" aria-label="Toggle active jobs">▼</button>
    <div id="kitchen-strip-content">Loading…</div>
  </div>
</div>`

export async function injectAdminHeader(c: Context, next: Next): Promise<void> {
  await next()
  const ct = c.res.headers.get('content-type') ?? ''
  if (!ct.includes('text/html')) return
  const text = await c.res.text()
  if (!text.includes('<body')) return
  const injected = text.replace(/<body[^>]*>/, (m) => `${m}\n${KITCHEN_ADMIN_HEADER}`)
  c.res = new Response(injected, { status: c.res.status, headers: new Headers(c.res.headers) })
}
