(() => {
  'use strict';
  // Local paper-trading only. No broker login, API calls, or real orders.
  const KEY='poAutoEngineDemoV1';
  const defaults={enabled:false,balance:1000,dayStartBalance:1000,dayKey:'',riskPct:1,dailyLossPct:3,duration:60,payout:85,maxOpenTrades:4,trades:[],lastEntryByAsset:{},lastSignalByAsset:{}};
  const read=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}};
  let state=read();
  const metrics={received:0,fresh:0,entered:0,skipped:'بانتظار أول قراءة',last:'—'};
  const confirmations={};
  // Count confirmations only when the provider timestamp advances.
  const lastQuoteTimeByAsset={};
  const money=n=>Math.abs(Number(n||0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const signedMoney=n=>'<bdi dir="ltr">'+(Number(n)>0?'+':Number(n)<0?'−':'')+money(n)+'</bdi>';
  const today=()=>new Date().toLocaleDateString('en-CA');
  function rollDay(){
    const d=today();
    if(state.dayKey!==d){state.dayKey=d;state.dayStartBalance=Number(state.balance)||1000;state.lastEntryByAsset={};state.lastSignalByAsset={};}
  }
  rollDay();
  const closedDay=t=>t.closedDay||(t.closed?new Date(t.closed).toLocaleDateString('en-CA'):t.day);
  const dayPnl=()=>state.trades.filter(t=>t.status==='closed'&&closedDay(t)===today()).reduce((s,t)=>s+Number(t.pnl||0),0);
  const openTrades=()=>state.trades.filter(t=>t.status==='open');
  const stake=()=>Math.max(0,Number(state.balance)*Number(state.riskPct)/100);
  const lossLimit=()=>Math.max(0,Number(state.dayStartBalance)*Number(state.dailyLossPct)/100);
  const lossStreak=()=>{const closed=state.trades.filter(t=>t.day===today()&&t.status==='closed').sort((a,b)=>Date.parse(b.closed||0)-Date.parse(a.closed||0));let n=0;for(const t of closed){if(Number(t.pnl)<0)n++;else break;}return n};
  const save=()=>{rollDay();localStorage.setItem(KEY,JSON.stringify(state));render()};
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function render(){
    const root=document.getElementById('poAutoEngine');if(!root)return;
    rollDay();
    const pnl=dayPnl(),halt=(lossLimit()>0&&pnl<=-lossLimit())||lossStreak()>=3;
    const closedToday=state.trades.filter(t=>t.status==='closed'&&closedDay(t)===today());
    const wins=closedToday.filter(t=>Number(t.pnl)>0).length,losses=closedToday.filter(t=>Number(t.pnl)<0).length,draws=closedToday.filter(t=>t.result==='draw').length;
    const decisive=wins+losses,winRate=decisive?Math.round(wins/decisive*100):0;
    const rows=state.trades.slice(0,12).map(t=>'<div class="ae-row"><span><b>'+esc(t.asset)+' · '+t.side+'</b><small>'+new Date(t.opened).toLocaleTimeString('ar-SA')+' · '+money(t.stake)+'$ · '+t.duration+'ث</small><small>'+esc(t.reason||'سبب الدخول غير مسجل')+(t.resultReason?' · '+esc(t.resultReason):'')+'</small></span><b class="'+(t.status==='open'?'ae-open':t.result==='draw'?'ae-open':t.pnl>0?'ae-win':'ae-loss')+'">'+(t.status==='open'?'مفتوحة':t.result==='draw'?'تعادل · 0.00$':signedMoney(t.pnl))+'</b></div>').join('');
    root.innerHTML='<div class="ae-head"><b>محرك التداول الآلي · Demo PRO</b><span class="ae-tag">محاكاة فقط</span></div>'+
      '<p class="ae-note">محرك تجريبي محلي. لا يتصل بحساب Pocket Option ولا يرسل أوامر حقيقية. يلزم تأكيد الإشارة مرتين قبل فتح صفقة افتراضية.</p>'+
      '<div class="ae-stats"><div><small>الرصيد الافتراضي</small><b>'+money(state.balance)+'$</b></div><div><small>نتيجة اليوم</small><b class="'+(pnl>=0?'ae-win':'ae-loss')+'">'+signedMoney(pnl)+'</b></div><div><small>مفتوحة</small><b>'+openTrades().length+' / '+state.maxOpenTrades+'</b></div></div>'+
      '<div class="ae-limits">إحصائيات اليوم: <b>'+wins+'</b> ربح · <b>'+losses+'</b> خسارة · <b>'+draws+'</b> تعادل · نسبة الفوز من الصفقات الحاسمة <b>'+winRate+'%</b> · سلسلة الخسائر <b>'+lossStreak()+'/3</b></div>'+
      '<div class="ae-settings"><label>مبلغ كل صفقة (% الرصيد)<input id="aeRisk" type="number" min="0.1" max="5" step="0.1" value="'+esc(state.riskPct)+'"></label>'+
      '<label>حد خسارة اليوم (%)<input id="aeLoss" type="number" min="0.5" max="20" step="0.5" value="'+esc(state.dailyLossPct)+'"></label>'+
      '<label>مدة المحاكاة (ثانية)<select id="aeDuration">'+[30,60,90,120,180,300].map(v=>'<option value="'+v+'" '+(Number(state.duration)===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
      '<label>عائد افتراضي (%)<input id="aePayout" type="number" min="1" max="100" value="'+esc(state.payout)+'"></label>'+
      '<label>أقصى صفقات مفتوحة<select id="aeMaxOpen">'+[1,2,3,4,5,6].map(v=>'<option value="'+v+'" '+(Number(state.maxOpenTrades)===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
      (halt?'<div class="ae-stop">توقف وقائي: '+(lossStreak()>=3?'3 خسائر متتالية':'تم بلوغ حد خسارة اليوم')+'. لن يفتح المحرك صفقات جديدة حتى اليوم التالي.</div>':'')+
      '<div class="ae-actions"><button id="aeToggle" class="'+(state.enabled?'ae-stopbtn':'ae-start')+'">'+(state.enabled?'إيقاف المحرك':'تشغيل Auto Engine')+'</button><button id="aeReset">إعادة ضبط الرصيد الافتراضي</button></div>'+
      '<div class="ae-limits">حجم الصفقة الافتراضي: <b>'+money(stake())+'$</b> · حد خسارة اليوم: <b>'+money(lossLimit())+'$</b> · تأكيدان متتاليان · مهلة 180 ثانية لكل أصل</div>'+
      '<div class="ae-limits">تشخيص الربط: <b>'+metrics.received+'</b> مستلمة · <b>'+metrics.fresh+'</b> حديثة · <b>'+metrics.entered+'</b> دخول · '+esc(metrics.skipped)+' · '+esc(metrics.last)+'</div>'+
      '<div class="ae-head"><b>سجل المحاكاة</b></div>'+(rows||'<p class="ae-note">لا توجد صفقات افتراضية بعد. شغّل الماسح ثم المحرك.</p>')+
      '<p class="ae-note">نتائج المحاكاة تقديرية فقط. التعادل يسجل بصفر، والإغلاق يتم عند أول سعر حديث بعد انتهاء المدة؛ لا تمثل هذه النتائج تسوية Pocket Option أو OTC أو فروق الأسعار والعمولات.</p>';
    root.querySelector('#aeRisk').onchange=e=>{state.riskPct=Math.min(5,Math.max(.1,Number(e.target.value)||1));save()};
    root.querySelector('#aeLoss').onchange=e=>{state.dailyLossPct=Math.min(20,Math.max(.5,Number(e.target.value)||3));save()};
    root.querySelector('#aeDuration').onchange=e=>{state.duration=Number(e.target.value);save()};
    root.querySelector('#aePayout').onchange=e=>{state.payout=Math.min(100,Math.max(1,Number(e.target.value)||85));save()};
    root.querySelector('#aeMaxOpen').onchange=e=>{state.maxOpenTrades=Math.min(6,Math.max(1,Number(e.target.value)||4));save()};
    root.querySelector('#aeToggle').onclick=()=>{state.enabled=!state.enabled;save()};
    root.querySelector('#aeReset').onclick=()=>{if(confirm('إعادة الرصيد الافتراضي إلى 1000$ ومسح سجل المحاكاة؟')){state={...defaults,trades:[],balance:1000,dayStartBalance:1000,dayKey:today()};Object.keys(confirmations).forEach(k=>delete confirmations[k]);save()}};
  }
  function process(d){
    metrics.received++;
    const now=Date.now();
    metrics.last=(d&&d.asset?d.asset:'قراءة غير معروفة')+' · '+(d&&d.signal||'—');
    if(!d||!d.asset||!Number.isFinite(d.price)||d.price<=0||!Number.isFinite(d.time)||!d.time){metrics.skipped='بيانات السعر أو الوقت غير صالحة';render();return;}
    if(now-d.time>60000||d.time-now>15000){metrics.skipped='تم تجاهل سعر قديم أو توقيته مستقبلي';render();return;}
    if(d.time<=Number(lastQuoteTimeByAsset[d.asset]||0)){metrics.skipped='تكرار توقيت السعر؛ بانتظار قراءة سوق جديدة';render();return;}
    lastQuoteTimeByAsset[d.asset]=d.time;
    metrics.fresh++;rollDay();
    for(const t of openTrades()){
      if(t.asset!==d.asset||now-t.openedMs<t.duration*1000)continue;
      t.status='closed';t.closed=new Date().toISOString();t.closedDay=today();
      const win=t.side==='CALL'?d.price>t.entry:d.price<t.entry;
      const draw=d.price===t.entry;
      t.pnl=draw?0:win?t.stake*t.payout/100:-t.stake;t.exit=d.price;t.result=draw?'draw':win?'win':'loss';t.resultReason=draw?'سعر الإغلاق ساوى سعر الدخول':win?'تحرك السعر في اتجاه الصفقة':'تحرك السعر عكس اتجاه الصفقة';state.balance+=t.pnl;
    }
    const sig=d.signal==='CALL'||d.signal==='PUT'?d.signal:'WAIT';
    if(sig==='WAIT'){delete confirmations[d.asset];if(state.lastSignalByAsset)delete state.lastSignalByAsset[d.asset];}
    else {
      const c=confirmations[d.asset];
      confirmations[d.asset]=c&&c.signal===sig?{signal:sig,count:c.count+1}:{signal:sig,count:1};
    }
    const c=confirmations[d.asset],lastEntry=Number(state.lastEntryByAsset?.[d.asset]||0);
    const halt=(lossLimit()>0&&dayPnl()<=-lossLimit())||lossStreak()>=3;
    if(!state.enabled)metrics.skipped='المحرك متوقف';
    else if(sig==='WAIT')metrics.skipped='الإشارة WAIT';
    else if(!c||c.count<2)metrics.skipped='بانتظار تأكيد الإشارة للمرة الثانية';
    else if(state.lastSignalByAsset?.[d.asset]===sig)metrics.skipped='تم الدخول سابقاً على الإشارة نفسها؛ انتظر WAIT أو انعكاساً';
    else if(now-lastEntry<180000)metrics.skipped='فترة حماية 180 ثانية لهذا الأصل';
    else if(halt)metrics.skipped=lossStreak()>=3?'توقف بعد 3 خسائر متتالية':'تم بلوغ حد خسارة اليوم';
    else if(openTrades().some(t=>t.asset===d.asset))metrics.skipped='توجد صفقة مفتوحة على الأصل';
    else if(openTrades().length>=Number(state.maxOpenTrades||4))metrics.skipped='تم بلوغ الحد الأقصى للصفقات المفتوحة';
    else if(!(stake()>0&&state.balance>0))metrics.skipped='الرصيد أو مبلغ الصفقة غير صالح';
    else {
      state.trades.unshift({asset:d.asset,side:sig,entry:d.price,stake:Math.min(stake(),state.balance),payout:state.payout,duration:state.duration,reason:String(d.reason||'توافق EMA وRSI والزخم'),rsi:Number.isFinite(d.rsi)?d.rsi:null,opened:new Date().toISOString(),openedMs:now,day:today(),status:'open',pnl:0});
      state.lastEntryByAsset={...(state.lastEntryByAsset||{}),[d.asset]:now};
      state.lastSignalByAsset={...(state.lastSignalByAsset||{}),[d.asset]:sig};
      metrics.entered++;metrics.skipped='تم فتح صفقة افتراضية بعد تأكيدين';
    }
    state.trades=state.trades.slice(0,200);localStorage.setItem(KEY,JSON.stringify(state));render();
  }
  window.addEventListener('po:scan-update',e=>process(e.detail));
  function init(){
    let root=document.getElementById('poAutoEngine');
    if(!root){
      const scan=document.getElementById('scannerCard');if(!scan)return;
      root=document.createElement('section');root.id='poAutoEngine';scan.insertAdjacentElement('afterend',root);
    }
    if(document.getElementById('poAutoEngineStyle')){render();return;}
    const style=document.createElement('style');style.id='poAutoEngineStyle';style.textContent='#poAutoEngine{background:linear-gradient(145deg,#172838,#101b27);border:1px solid #31506a;border-radius:18px;padding:15px;margin:12px 0;color:#edf4fa}#poAutoEngine .ae-head,#poAutoEngine .ae-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:10px 0}#poAutoEngine .ae-tag{font-size:11px;color:#f4c66a;border:1px solid #80683b;border-radius:20px;padding:5px 8px}#poAutoEngine .ae-note,#poAutoEngine small{font-size:11px;color:#9aabba;line-height:1.65}#poAutoEngine .ae-stats,#poAutoEngine .ae-settings{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}#poAutoEngine .ae-settings{grid-template-columns:1fr 1fr;margin:12px 0}#poAutoEngine .ae-stats>div{background:#0b1520;border:1px solid #2b3b4c;border-radius:10px;padding:9px}#poAutoEngine .ae-stats b,#poAutoEngine .ae-stats small{display:block}#poAutoEngine label{font-size:11px;color:#9aabba}#poAutoEngine input,#poAutoEngine select{display:block;width:100%;margin-top:5px;background:#0b1520;border:1px solid #2b3b4c;color:#edf4fa;border-radius:9px;padding:9px}#poAutoEngine button{background:#173b4d;color:#edf4fa;border:1px solid #31506a;border-radius:9px;padding:10px;font-weight:700}#poAutoEngine .ae-start{background:#0d9877;border:0;flex:1}#poAutoEngine .ae-stopbtn{background:#8b3542;flex:1}#poAutoEngine .ae-stop{background:#42252a;border:1px solid #9e3d4d;border-radius:10px;padding:10px;color:#ffb5bb;font-size:12px}#poAutoEngine .ae-limits{font-size:11px;color:#a9bbcc;margin:10px 0}#poAutoEngine .ae-row{display:flex;justify-content:space-between;align-items:center;background:#0b1520;border:1px solid #2b3b4c;border-radius:10px;padding:9px;margin:6px 0}#poAutoEngine .ae-row small{display:block}#poAutoEngine .ae-stats b,#poAutoEngine .ae-row> b{direction:ltr;unicode-bidi:isolate;text-align:right}#poAutoEngine .ae-win{color:#16c79a}#poAutoEngine .ae-loss{color:#ff6874}#poAutoEngine .ae-open{color:#f4c66a}@media(max-width:380px){#poAutoEngine .ae-stats{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(style);render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
