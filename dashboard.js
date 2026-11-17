(() => {
  const nav=document.querySelector('nav');
  if(!nav || document.getElementById('gptPanel')) return;
  const panel=document.createElement('section');
  panel.id='gptPanel';
  panel.innerHTML=`
    <div class="gp-head"><div class="gp-brand">GPT <span>TRADE</span> · PO</div><span class="gp-pill" id="gpConnection">بانتظار المصدر</span></div>
    <div class="gp-market" id="gpMarket">السوق المختار</div>
    <div class="gp-signal wait" id="gpSignal"><strong>WAIT</strong><div class="gp-sub" id="gpReason">لا توجد قراءة حديثة</div></div>
    <div class="gp-head"><small>توافق المؤشرات</small><b id="gpAgreement">— / 3</b></div>
    <div class="gp-bar"><i id="gpBar"></i></div>
    <div class="gp-metrics">
      <div class="gp-metric"><span>EMA 5 / 13</span><b id="gpEma">—</b></div>
      <div class="gp-metric"><span>RSI 7</span><b id="gpRsi">—</b></div>
      <div class="gp-metric"><span>MOMENTUM</span><b id="gpMom">—</b></div>
    </div>
    <div class="gp-foot"><small id="gpDuration">مدة التحليل: 60 ثانية</small><button type="button" id="gpRefresh">تحديث الإشارة</button></div>
    <div class="gp-warning">قراءة تحليلية وليست نسبة نجاح أو توصية. لا تُعرض CALL/PUT عند غياب البيانات أو قدمها. مصدر الأسعار الحالي ليس مؤكداً أنه مطابق لـ Pocket Option OTC.</div>`;
  nav.insertAdjacentElement('afterend',panel);
  const el=id=>document.getElementById(id);
  const text=id=>(document.getElementById(id)?.textContent||'').trim();
  function update(){
    const asset=el('asset')?.selectedOptions?.[0]?.textContent||'—';
    el('gpMarket').textContent='السوق: '+asset;
    el('gpDuration').textContent='مدة التحليل: '+(el('duration')?.selectedOptions?.[0]?.textContent||'—');
    el('gpEma').textContent=text('ema')||'—';
    el('gpRsi').textContent=text('rsi')||'—';
    el('gpMom').textContent=text('mom')||'—';
    const signal=el('signal');
    const strong=signal?.querySelector('strong')?.textContent||'WAIT';
    const reason=signal?.querySelector('small')?.textContent||'بانتظار البيانات';
    const cls=strong==='CALL'?'call':strong==='PUT'?'put':'wait';
    el('gpSignal').className='gp-signal '+cls;
    el('gpSignal').querySelector('strong').textContent=strong;
    el('gpReason').textContent=reason;
    const status=text('status');
    const connected=status.includes('متصل');
    el('gpConnection').textContent=connected?'متصل':'غير متصل';
    const ema=text('ema').split('/').map(v=>Number(v.trim()));
    const rsi=Number(text('rsi'));
    const mom=Number(text('mom'));
    let agree=0;
    if(ema.length===2&&ema.every(Number.isFinite)&&ema[0]!==0&&ema[1]!==0){if((strong==='CALL'&&ema[0]>ema[1])||(strong==='PUT'&&ema[0]<ema[1]))agree++;}
    if(Number.isFinite(rsi)){if((strong==='CALL'&&rsi>=50&&rsi<=70)||(strong==='PUT'&&rsi>=30&&rsi<50))agree++;}
    if(Number.isFinite(mom)){if((strong==='CALL'&&mom>0)||(strong==='PUT'&&mom<0))agree++;}
    if(strong==='WAIT')agree=0;
    el('gpAgreement').textContent=strong==='WAIT'?'— / 3':agree+' / 3';
    el('gpBar').style.width=(agree/3*100)+'%';
  }
  el('gpRefresh').addEventListener('click',()=>{
    document.querySelector('[data-tab="home"]')?.click();
    const connect=el('connect');
    if(connect) connect.click();
    else {const scan=el('scanStart');if(scan)scan.click();}
  });
  el('asset')?.addEventListener('change',update);
  el('duration')?.addEventListener('change',update);
  setInterval(update,1500);
  update();
})();