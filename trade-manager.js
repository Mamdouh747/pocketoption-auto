(() => {
  'use strict';
  const KEY='poQuickTradeJournalV1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{balance:0,riskPct:1,dailyLossPct:3,mode:'demo',trades:[]}}catch{return{balance:0,riskPct:1,dailyLossPct:3,mode:'demo',trades:[]}}};
  let state=read();
  const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toLocaleDateString('en-CA');
  const pnl=()=>state.trades.filter(t=>t.day===today()&&t.result).reduce((a,t)=>a+Number(t.pnl||0),0);
  const open=()=>state.trades.filter(t=>t.result==='open');
  const maxRisk=()=>Math.max(0,Number(state.balance)*Number(state.riskPct)/100);
  const maxLoss=()=>Math.max(0,Number(state.balance)*Number(state.dailyLossPct)/100);
  function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
  function render(){
    let root=document.getElementById('poTradeManager');if(!root)return;
    const dayPnl=pnl(),limit=maxLoss(),lossReached=dayPnl<=-limit&&limit>0;
    const rows=state.trades.slice(0,25).map(t=>`<div class="pt-row"><div><b>${esc(t.asset)} · ${t.side==='CALL'?'CALL':'PUT'}</b><small>${new Date(t.time).toLocaleString('ar-SA')} · ${money(t.amount)}$ · ${esc(t.duration)} ث</small><small>دخول: ${esc(t.entry||'—')} · عائد: ${esc(t.payout)}%</small></div><div class="pt-actions">${t.result==='open'?'<span class="pt-open">مفتوحة يدوياً</span>':`<b class="${t.pnl>0?'pt-win':t.pnl<0?'pt-loss':''}">${t.pnl>0?'+':''}${money(t.pnl)}$</b><small>${t.result==='win'?'ربح':t.result==='loss'?'خسارة':'استرداد'}</small>`}</div>${t.result==='open'?`<div class="pt-result"><button data-result="win" data-id="${t.id}">ربح</button><button data-result="loss" data-id="${t.id}">خسارة</button><button data-result="refund" data-id="${t.id}">استرداد</button></div>`:''}</div>`).join('');
    root.innerHTML=`
      <div class="pt-head"><b>إدارة الصفقات · Quick Trading</b><span class="pt-pill">${state.mode==='demo'?'تجريبي':'حقيقي'} · تسجيل يدوي</span></div>
      <p class="pt-note">هذه لوحة متابعة محلية وليست اتصالاً بحساب الوسيط. لا تقرأ الرصيد أو الصفقات من Pocket Option. سجّل الصفقة بعد تنفيذها بنفسك داخل المنصة، ثم حدّث نتيجتها هنا.</p>
      <div class="pt-stats"><div><small>الرصيد المرجعي</small><b>${money(state.balance)}$</b></div><div><small>الرصيد التقديري</small><b>${money(Number(state.balance)+state.trades.reduce((a,t)=>a+Number(t.pnl||0),0))}$</b></div><div><small>نتيجة اليوم</small><b class="${dayPnl>=0?'pt-win':'pt-loss'}">${dayPnl>0?'+':''}${money(dayPnl)}$</b></div></div>
      <div class="pt-settings"><label>نوع الحساب<select id="ptMode"><option value="demo" ${state.mode==='demo'?'selected':''}>Demo تجريبي</option><option value="live" ${state.mode==='live'?'selected':''}>Real حقيقي</option></select></label><label>الرصيد المرجعي ($)<input id="ptBalance" type="number" min="0" step="0.01" value="${esc(state.balance)}"></label><label>حد الصفقة (% من الرصيد)<input id="ptRisk" type="number" min="0.1" max="10" step="0.1" value="${esc(state.riskPct)}"></label><label>حد خسارة اليوم (%)<input id="ptDaily" type="number" min="0.5" max="30" step="0.5" value="${esc(state.dailyLossPct)}"></label></div>
      <div class="pt-limits"><span>حد المبلغ المقترح للصفقة: <b>${money(maxRisk())}$</b></span><span>حد خسارة اليوم: <b>${money(limit)}$</b></span><span>الصفقات المفتوحة المسجلة: <b>${open().length}</b></span></div>
      ${lossReached?'<div class="pt-stop">تم بلوغ حد خسارة اليوم المسجل. أوقف التداول وراجع النتائج قبل أي صفقة جديدة.</div>':''}
      <div class="pt-form"><b>تسجيل صفقة نفّذتها يدوياً</b><div class="pt-fields"><label>الأصل<input id="ptAsset" value="${esc(document.getElementById('asset')?.value||'XAUUSD')}"></label><label>الاتجاه<select id="ptSide"><option value="CALL">CALL شراء</option><option value="PUT">PUT بيع</option></select></label><label>المبلغ ($)<input id="ptAmount" type="number" min="0.01" step="0.01" placeholder="مثال 1"></label><label>المدة (ثانية)<input id="ptDuration" type="number" min="5" step="5" value="60"></label><label>سعر الدخول<input id="ptEntry" inputmode="decimal" placeholder="اختياري"></label><label>نسبة العائد (%)<input id="ptPayout" type="number" min="0" max="1000" value="90"></label></div><label class="pt-check"><input type="checkbox" id="ptConfirmed"> أؤكد أنني نفّذت الصفقة يدوياً في منصة Pocket Option</label><button id="ptAdd" class="pt-add" ${lossReached?'disabled':''}>تسجيل الصفقة المفتوحة</button><small class="pt-note">يمنع السجل التسجيل إذا تجاوز مبلغ الصفقة الحد المحدد أو تم بلوغ حد خسارة اليوم. هذه حدود تنبيه داخل التطبيق فقط ولا تتحكم في الوسيط.</small></div>
      <div class="pt-head"><b>سجل الصفقات</b><button id="ptExport">تصدير CSV</button></div><div class="pt-list">${rows||'<p class="pt-note">لا توجد صفقات مسجلة بعد.</p>'}</div>
      <div class="pt-footer"><button id="ptOpenBroker">فتح Pocket Option</button><button id="ptClear" class="pt-clear">مسح السجل المحلي</button></div>
      <small class="pt-note">كل البيانات محفوظة في هذا المتصفح على جهازك فقط. الرصيد المرجعي يدوي وقد يختلف عن رصيد حسابك الحقيقي.</small>`;
    root.querySelector('#ptMode').onchange=e=>{state.mode=e.target.value;save()};
    root.querySelector('#ptBalance').onchange=e=>{state.balance=Math.max(0,Number(e.target.value)||0);save()};
    root.querySelector('#ptRisk').onchange=e=>{state.riskPct=Math.min(10,Math.max(.1,Number(e.target.value)||1));save()};
    root.querySelector('#ptDaily').onchange=e=>{state.dailyLossPct=Math.min(30,Math.max(.5,Number(e.target.value)||3));save()};
    root.querySelector('#ptAdd').onclick=()=>{
      const amount=Number(root.querySelector('#ptAmount').value),duration=Number(root.querySelector('#ptDuration').value),payout=Number(root.querySelector('#ptPayout').value);
      if(!root.querySelector('#ptConfirmed').checked){alert('أكد أولاً أنك نفذت الصفقة يدوياً داخل المنصة.');return}
      if(!(amount>0&&duration>=5&&payout>=0)){alert('تحقق من المبلغ والمدة ونسبة العائد.');return}
      if(amount>maxRisk()){alert('المبلغ يتجاوز حد الصفقة المحدد ('+money(maxRisk())+'$).');return}
      if(lossReached){alert('تم بلوغ حد خسارة اليوم.');return}
      const t={id:String(Date.now())+Math.random().toString(36).slice(2,7),time:new Date().toISOString(),day:today(),asset:root.querySelector('#ptAsset').value.trim(),side:root.querySelector('#ptSide').value,amount,duration,payout,entry:root.querySelector('#ptEntry').value.trim(),result:'open',pnl:0};
      state.trades.unshift(t);save();
    };
    root.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{const t=state.trades.find(x=>x.id===b.dataset.id);if(!t||t.result!=='open')return;const result=b.dataset.result;t.result=result;t.closedAt=new Date().toISOString();t.pnl=result==='win'?t.amount*t.payout/100:result==='loss'?-t.amount:0;save()});
    root.querySelector('#ptOpenBroker').onclick=()=>window.open('https://pocketoption.com/en/','_blank','noopener');
    root.querySelector('#ptClear').onclick=()=>{if(confirm('هل تريد مسح سجل الصفقات المحفوظ على هذا الجهاز؟')){state.trades=[];save()}};
    root.querySelector('#ptExport').onclick=()=>{const lines=[['date','asset','side','amount','duration_seconds','entry','payout_percent','result','pnl'],...state.trades.map(t=>[t.time,t.asset,t.side,t.amount,t.duration,t.entry,t.payout,t.result,t.pnl])];const csv='\\ufeff'+lines.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='po-quick-trades.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  }
  function init(){
    if(!document.getElementById('manualTradeCard')||document.getElementById('poTradeManager'))return;
    const style=document.createElement('style');style.textContent=`
      #poTradeManager{background:linear-gradient(145deg,#172838,#101b27);border:1px solid #31506a;border-radius:18px;padding:15px;margin:12px 0;color:#edf4fa}
      #poTradeManager .pt-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:10px 0}
      #poTradeManager .pt-pill{font-size:11px;color:#f4c66a;border:1px solid #80683b;border-radius:20px;padding:5px 8px}
      #poTradeManager .pt-note,#poTradeManager small{font-size:11px;color:#9aabba;line-height:1.65}
      #poTradeManager .pt-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
      #poTradeManager .pt-stats>div{background:#0b1520;border:1px solid #2b3b4c;border-radius:11px;padding:9px;min-width:0}
      #poTradeManager .pt-stats small,#poTradeManager .pt-stats b{display:block;overflow-wrap:anywhere}
      #poTradeManager .pt-stats b{font-size:13px;margin-top:5px}
      #poTradeManager .pt-settings,#poTradeManager .pt-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #poTradeManager label{display:block;font-size:11px;color:#9aabba;margin:8px 0}
      #poTradeManager input,#poTradeManager select{width:100%;min-width:0;background:#0b1520;border:1px solid #2b3b4c;color:#edf4fa;border-radius:9px;padding:10px}
      #poTradeManager .pt-form{border-top:1px solid #2b3b4c;margin-top:14px;padding-top:12px}
      #poTradeManager .pt-check{display:flex;align-items:center;gap:8px}
      #poTradeManager .pt-check input{width:auto}
      #poTradeManager button{background:#173b4d;color:#edf4fa;border:1px solid #31506a;border-radius:9px;padding:9px;font-weight:700}
      #poTradeManager .pt-add{width:100%;background:#0d9877;border:0;margin:6px 0}
      #poTradeManager button:disabled{opacity:.4}
      #poTradeManager .pt-limits{display:grid;gap:5px;font-size:11px;color:#a9bbcc;margin:10px 0}
      #poTradeManager .pt-stop{background:#42252a;border:1px solid #9e3d4d;border-radius:10px;padding:10px;color:#ffb5bb;font-size:12px}
      #poTradeManager .pt-row{display:grid;grid-template-columns:1fr auto;gap:8px;background:#0b1520;border:1px solid #2b3b4c;border-radius:10px;padding:10px;margin:7px 0}
      #poTradeManager .pt-row small{display:block;margin-top:3px}
      #poTradeManager .pt-actions{text-align:left}
      #poTradeManager .pt-result{grid-column:1/-1;display:flex;gap:6px}
      #poTradeManager .pt-result button{flex:1}
      #poTradeManager .pt-win{color:#16c79a}#poTradeManager .pt-loss{color:#ff6874}#poTradeManager .pt-open{color:#f4c66a;font-size:11px}
      #poTradeManager .pt-footer{display:flex;gap:8px;margin:12px 0}
      #poTradeManager .pt-footer button{flex:1}
      #poTradeManager .pt-clear{color:#ff9da4!important}
      @media(max-width:380px){#poTradeManager .pt-stats{grid-template-columns:1fr 1fr}#poTradeManager .pt-settings,#poTradeManager .pt-fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    const card=document.createElement('section');card.id='poTradeManager';document.getElementById('manualTradeCard').insertAdjacentElement('afterend',card);render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();