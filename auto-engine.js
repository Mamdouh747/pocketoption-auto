(() => {
  'use strict';
  // Local paper-trading only. No broker login, API calls, or real orders.
  const KEY='poAutoEngineDemoV1';
  const defaults={enabled:false,balance:1000,riskPct:1,dailyLossPct:3,duration:60,payout:85,maxOpenTrades:4,trades:[]};
  const read=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}};
  let state=read();
  const metrics={received:0,fresh:0,entered:0,skipped:'بانتظار أول قراءة',last:'—'};
  const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const today=()=>new Date().toLocaleDateString('en-CA');
  const dayPnl=()=>state.trades.filter(t=>t.day===today()&&t.status==='closed').reduce((s,t)=>s+Number(t.pnl||0),0);
  const openTrades=()=>state.trades.filter(t=>t.status==='open');
  const stake=()=>Math.max(0,Number(state.balance)*Number(state.riskPct)/100);
  const lossLimit=()=>Math.max(0,Number(state.balance)*Number(state.dailyLossPct)/100);
  const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));render()};
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function render(){
    let root=document.getElementById('poAutoEngine');if(!root)return;
    const pnl=dayPnl(),halt=pnl<=-lossLimit()&&lossLimit()>0;\n    const closedToday=state.trades.filter(t=>t.day===today()&&t.status==='closed');\n    const wins=closedToday.filter(t=>Number(t.pnl)>0).length,losses=closedToday.filter(t=>Number(t.pnl)<0).length;\n    const winRate=closedToday.length?Math.round(wins/closedToday.length*100):0;
    const rows=state.trades.slice(0,12).map(t=>'<div class="ae-row"><span><b>'+esc(t.asset)+' · '+t.side+'</b><small>'+new Date(t.opened).toLocaleTimeString('ar-SA')+' · '+money(t.stake)+'$ · '+t.duration+'ث</small></span><b class="'+(t.status==='open'?'ae-open':t.pnl>=0?'ae-win':'ae-loss')+'">'+(t.status==='open'?'مفتوحة':(t.pnl>0?'+':'')+money(t.pnl)+'$')+'</b></div>').join('');
    root.innerHTML='<div class="ae-head"><b>محرك التداول الآلي · Demo</b><span class="ae-tag">محاكاة فقط</span></div>'+
      '<p class="ae-note">يدير صفقات افتراضية تلقائياً من إشارات الماسح، ويغلقها بعد المدة المحددة حسب حركة السعر. لا يتصل بحساب Pocket Option ولا يرسل أوامر حقيقية.</p>'+
      '<div class="ae-stats"><div><small>الرصيد الافتراضي</small><b>'+money(state.balance)+'$</b></div><div><small>نتيجة اليوم</small><b class="'+(pnl>=0?'ae-win':'ae-loss')+'">'+(pnl>0?'+':'')+money(pnl)+'$</b></div><div><small>مفتوحة</small><b>'+openTrades().length+' / '+state.maxOpenTrades+'</b></div></div>'+\n      '<div class="ae-limits">إحصائيات الصفقات المغلقة اليوم: <b>'+wins+'</b> ربح · <b>'+losses+'</b> خسارة · نسبة الفوز <b>'+winRate+'%</b></div>'+
      '<div class="ae-settings"><label>مبلغ كل صفقة (% الرصيد)<input id="aeRisk" type="number" min="0.1" max="5" step="0.1" value="'+esc(state.riskPct)+'"></label>'+
      '<label>حد خسارة اليوم (%)<input id="aeLoss" type="number" min="0.5" max="20" step="0.5" value="'+esc(state.dailyLossPct)+'"></label>'+
      '<label>مدة المحاكاة (ثانية)<select id="aeDuration">'+[30,60,90,120,180,300].map(v=>'<option value="'+v+'" '+(Number(state.duration)===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
      '<label>عائد افتراضي (%)<input id="aePayout" type="number" min="1" max="100" value="'+esc(state.payout)+'"></label>'+\n      '<label>أقصى صفقات مفتوحة<select id="aeMaxOpen">'+[1,2,3,4,5,6].map(v=>'<option value="'+v+'" '+(Number(state.maxOpenTrades)===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
      (halt?'<div class="ae-stop">توقف المحرك: تم بلوغ حد خسارة اليوم في المحاكاة.</div>':'')+
      '<div class="ae-actions"><button id="aeToggle" class="'+(state.enabled?'ae-stopbtn':'ae-start')+'">'+(state.enabled?'إيقاف المحرك':'تشغيل Auto Engine')+'</button><button id="aeReset">إعادة ضبط الرصيد الافتراضي</button></div>'+
      '<div class="ae-limits">حجم الصفقة الافتراضي: <b>'+money(stake())+'$</b> · حد خسارة اليوم: <b>'+money(lossLimit())+'$</b></div>'+
      '<div class="ae-limits">تشخيص الربط: <b>'+metrics.received+'</b> مستلمة · <b>'+metrics.fresh+'</b> حديثة · <b>'+metrics.entered+'</b> دخول · '+esc(metrics.skipped)+' · '+esc(metrics.last)+'</div>'+
      '<div class="ae-head"><b>سجل المحاكاة</b></div>'+(rows||'<p class="ae-note">لا توجد صفقات افتراضية بعد. شغّل الماسح ثم المحرك.</p>')+
      '<p class="ae-note">نتائج المحاكاة لا تمثل عائد Pocket Option؛ لا تحتسب التعادل أو قواعد OTC أو فروق الأسعار والعمولات.</p>';
    root.querySelector('#aeRisk').onchange=e=>{state.riskPct=Math.min(5,Math.max(.1,Number(e.target.value)||1));save()};
    root.querySelector('#aeLoss').onchange=e=>{state.dailyLossPct=Math.min(20,Math.max(.5,Number(e.target.value)||3));save()};
    root.querySelector('#aeDuration').onchange=e=>{state.duration=Number(e.target.value);save()};
    root.querySelector('#aePayout').onchange=e=>{state.payout=Math.min(100,Math.max(1,Number(e.target.value)||85));save()};\n    root.querySelector('#aeMaxOpen').onchange=e=>{state.maxOpenTrades=Math.min(6,Math.max(1,Number(e.target.value)||4));save()};
    root.querySelector('#aeToggle').onclick=()=>{state.enabled=!state.enabled;save()};
    root.querySelector('#aeReset').onclick=()=>{if(confirm('إعادة الرصيد الافتراضي إلى 1000$ ومسح سجل المحاكاة؟')){state={...defaults,trades:[]};save()}};
  }
  function process(d){
    metrics.received++;
    const now=Date.now();
    metrics.last=(d&&d.asset?d.asset:'قراءة غير معروفة')+' · '+(d&&d.signal||'—');
    if(!d||!d.asset||!Number.isFinite(d.price)||!Number.isFinite(d.time)||!d.time){metrics.skipped='بيانات السعر أو الوقت غير صالحة';render();return;}
    if(now-d.time>60000||d.time-now>30000){metrics.skipped='تم تجاهل سعر قديم';render();return;}
    metrics.fresh++;
    for(const t of openTrades()){if(t.asset!==d.asset||now-t.openedMs<t.duration*1000)continue;t.status='closed';t.closed=new Date().toISOString();const win=t.side==='CALL'?d.price>t.entry:d.price<t.entry;t.pnl=win?t.stake*t.payout/100:-t.stake;t.exit=d.price;t.result=win?'win':'loss';state.balance+=t.pnl;}
    const lastEntry=Number(state.lastEntryByAsset?.[d.asset]||0);
    if(!state.enabled)metrics.skipped='المحرك متوقف';else if(d.signal!=='CALL'&&d.signal!=='PUT')metrics.skipped='الإشارة WAIT';else if(now-lastEntry<60000)metrics.skipped='فترة انتظار منع التكرار';else if(openTrades().some(t=>t.asset===d.asset))metrics.skipped='توجد صفقة مفتوحة على الأصل';else if(openTrades().length>=Number(state.maxOpenTrades||4))metrics.skipped='تم بلوغ الحد الأقصى للصفقات المفتوحة';else {const pnl=dayPnl(),limit=lossLimit();if(limit>0&&pnl<=-limit)metrics.skipped='تم بلوغ حد خسارة اليوم';else if(!(stake()>0&&state.balance>0))metrics.skipped='الرصيد أو مبلغ الصفقة غير صالح';else {state.trades.unshift({asset:d.asset,side:d.signal,entry:d.price,stake:Math.min(stake(),state.balance),payout:state.payout,duration:state.duration,opened:new Date().toISOString(),openedMs:now,day:today(),status:'open',pnl:0});state.lastEntryByAsset={...(state.lastEntryByAsset||{}),[d.asset]:now};metrics.entered++;metrics.skipped='تم فتح صفقة افتراضية';}}
    state.trades=state.trades.slice(0,200);localStorage.setItem(KEY,JSON.stringify(state));render();
  }
  window.addEventListener('po:scan-update',e=>process(e.detail));
  function init(){
    if(document.getElementById('poAutoEngine'))return;
    const scan=document.getElementById('scannerCard');if(!scan)return;
    const root=document.createElement('section');root.id='poAutoEngine';scan.insertAdjacentElement('afterend',root);
    const style=document.createElement('style');style.textContent='#poAutoEngine{background:linear-gradient(145deg,#172838,#101b27);border:1px solid #31506a;border-radius:18px;padding:15px;margin:12px 0;color:#edf4fa}#poAutoEngine .ae-head,#poAutoEngine .ae-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:10px 0}#poAutoEngine .ae-tag{font-size:11px;color:#f4c66a;border:1px solid #80683b;border-radius:20px;padding:5px 8px}#poAutoEngine .ae-note,#poAutoEngine small{font-size:11px;color:#9aabba;line-height:1.65}#poAutoEngine .ae-stats,#poAutoEngine .ae-settings{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}#poAutoEngine .ae-settings{grid-template-columns:1fr 1fr;margin:12px 0}#poAutoEngine .ae-stats>div{background:#0b1520;border:1px solid #2b3b4c;border-radius:10px;padding:9px}#poAutoEngine .ae-stats b,#poAutoEngine .ae-stats small{display:block}#poAutoEngine label{font-size:11px;color:#9aabba}#poAutoEngine input,#poAutoEngine select{display:block;width:100%;margin-top:5px;background:#0b1520;border:1px solid #2b3b4c;color:#edf4fa;border-radius:9px;padding:9px}#poAutoEngine button{background:#173b4d;color:#edf4fa;border:1px solid #31506a;border-radius:9px;padding:10px;font-weight:700}#poAutoEngine .ae-start{background:#0d9877;border:0;flex:1}#poAutoEngine .ae-stopbtn{background:#8b3542;flex:1}#poAutoEngine .ae-stop{background:#42252a;border:1px solid #9e3d4d;border-radius:10px;padding:10px;color:#ffb5bb;font-size:12px}#poAutoEngine .ae-limits{font-size:11px;color:#a9bbcc;margin:10px 0}#poAutoEngine .ae-row{display:flex;justify-content:space-between;align-items:center;background:#0b1520;border:1px solid #2b3b4c;border-radius:10px;padding:9px;margin:6px 0}#poAutoEngine .ae-row small{display:block}#poAutoEngine .ae-win{color:#16c79a}#poAutoEngine .ae-loss{color:#ff6874}#poAutoEngine .ae-open{color:#f4c66a}@media(max-width:380px){#poAutoEngine .ae-stats{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(style);render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();