(() => {
  const assets = [
    ['XAUUSD','الذهب'],['XAGUSD','الفضة'],['EURUSD','EUR/USD'],['GBPUSD','GBP/USD'],
    ['USDJPY','USD/JPY'],['AUDUSD','AUD/USD'],['USDCAD','USD/CAD'],['USDCHF','USD/CHF'],
    ['NZDUSD','NZD/USD'],['US30','داو جونز'],['NAS100','ناسداك 100'],['US500','S&P 500'],['DAX40','داكس 40']
  ];
  const state = new Map();
  let running = false, loop = null, cycleBusy = false;
  const rows = $('scanRows'), status = $('scanStatus');
  const pool = async (items, limit, task) => {
    let next = 0;
    const workers = Array.from({length:Math.min(limit,items.length)}, async () => {
      while (next < items.length) { const i = next++; try { await task(items[i]); } catch (e) {} }
    });
    await Promise.all(workers);
  };
  // Quality score is a filter, NOT a predicted win probability.
  const calculate = prices => {
    if (prices.length < 30) return {signal:'WAIT',reason:'نحتاج 30 شمعة مكتملة',rsi:null,confidence:0};
    const e5=ema(prices,5), e13=ema(prices,13), rv=rsi(prices,7);
    const mom=prices[prices.length-1]-prices[prices.length-4];
    if (![e5,e13,rv,mom].every(Number.isFinite)) return {signal:'WAIT',reason:'بيانات غير مكتملة',rsi:rv,confidence:0};
    const tail=prices.slice(-7), diffs=tail.slice(1).map((v,i)=>v-tail[i]);
    const up=diffs.filter(v=>v>0).length, down=diffs.filter(v=>v<0).length;
    const moves=prices.slice(-21).slice(1).map((v,i)=>Math.abs(v-prices.slice(-21)[i]));
    const avgMove=moves.reduce((a,b)=>a+b,0)/(moves.length||1);
    const volatilityRatio=avgMove>0?Math.abs(mom)/(avgMove*3):0;
    const bullish=e5>e13&&rv>=55&&rv<=67&&mom>0;
    const bearish=e5<e13&&rv>=33&&rv<=45&&mom<0;
    const aligned=bullish?up>=5:bearish?down>=5:false;
    const separated=avgMove>0&&Math.abs(e5-e13)>=avgMove*.35;
    const volatilityOk=volatilityRatio>=.35&&volatilityRatio<=2.5;
    const score=(e5!==e13?20:0)+((bullish&&rv>=55&&rv<=67)||(bearish&&rv>=33&&rv<=45)?20:0)+((bullish&&mom>0)||(bearish&&mom<0)?20:0)+(aligned?20:0)+(separated&&volatilityOk?20:0);
    const candidate=bullish?'CALL':bearish?'PUT':'WAIT';
    const signal=candidate!=='WAIT'&&score>=80?candidate:'WAIT';
    const reason=signal==='WAIT'?(candidate==='WAIT'?'اتجاه غير واضح':'جودة الإشارة '+score+'/100؛ يلزم 80 على الأقل'):'توافق '+score+'/100 · اتجاه وزخم واستمرارية وتقلب مقبول';
    return {signal,reason,rsi:rv,confidence:score};
  };
  const render = () => {
    const items = assets.map(([asset,label]) => {
      const s = state.get(asset) || {};
      const sig = s.signal || 'WAIT';
      const cls = sig==='CALL'?'scan-call':sig==='PUT'?'scan-put':'scan-wait';
      const price = Number.isFinite(s.price) ? s.price.toFixed(asset.includes('JPY')?3:5) : '—';
      const age = s.time ? new Date(s.time).toLocaleTimeString('ar-SA') : 'بانتظار البيانات';
      return '<div class="scan-row"><span><b>'+label+'</b><span class="scan-meta">'+asset+(s.symbol?' · '+s.symbol:'')+'</span></span><span>'+price+'<span class="scan-meta">'+age+'</span></span><b class="'+cls+'">'+sig+'<span class="scan-meta">'+(s.reason||'لم يتم الفحص')+'</span></b></div>';
    }).join('');
    rows.innerHTML = '<div class="scan-row scan-head"><span>السوق</span><span>السعر</span><span>الإشارة</span></div>'+items;
  };
  const scanOne = async ([asset]) => {
    let s = state.get(asset) || {prices:[],signal:'WAIT',lastSignal:'',lastAt:0};
    if (!s.symbol) {
      s.symbol = resolveSymbol(asset, window.__poActiveSymbols);
      if (!s.symbol) {
        s.signal='WAIT'; s.reason='لا توجد بيانات نشطة لدى المصدر'; state.set(asset,s);
        window.dispatchEvent(new CustomEvent('po:scan-update',{detail:{asset,signal:'WAIT',price:null,time:0,source:'',reason:s.reason}}));
        return;
      }
    }
    if (!s.seeded) {
      try {
        const hist = await getJSON(apiBase+'/'+encodeURIComponent(s.symbol)+'/ohlc?interval=1m&limit=80');
        if (Array.isArray(hist.bars)) {
          const bars = hist.bars.filter(b=>!b.isOpen&&Number(b.close)>0&&Number.isFinite(Number(b.close))).reverse();
          s.prices = bars.map(b=>Number(b.close)).slice(-80); const lastBar=bars[bars.length-1]; s.lastBucket=lastBar&&Date.parse(lastBar.openTime)?Math.floor(Date.parse(lastBar.openTime)/60000)*60000:undefined;
        }
      } catch (e) { s.reason='تعذر تحميل الشموع: '+e.message; }
      s.seeded = true;
    }
    try {
      const d = await getJSON(apiBase+'/'+encodeURIComponent(s.symbol)+'?allowStale=false');
      const quoteAge=Number(d.quoteAgeSeconds),t=Date.parse(d.timestamp),now=Date.now();
      if (d.stale===true || d.marketState==='closed') throw Error('السوق مغلق أو السعر معلّم كقديم');
      if (Number.isFinite(quoteAge) && quoteAge>60) throw Error('السعر أقدم من 60 ثانية');
      if (!Number.isFinite(t) || now-t>60000 || t-now>15000) throw Error('توقيت السعر مفقود أو قديم أو مستقبلي');
      const returned = String(d.symbol||'').trim().toUpperCase();
      if (returned && returned !== s.symbol) throw Error('رمز السعر غير مطابق');
      const p = quotePrice(d);
      if (!p) throw Error('لا يوجد سعر صالح');
      const bucket=Math.floor(t/60000)*60000;
      if (!Number.isFinite(s.lastBucket) || bucket>s.lastBucket) { s.prices.push(p); s.lastBucket=bucket; }
      else if (bucket===s.lastBucket && s.prices.length) s.prices[s.prices.length-1]=p;
      else throw Error('وصلت قراءة أقدم من شمعة الماسح الحالية');
      if (s.prices.length>180) s.prices.shift();
      s.price=p; s.time=t; s.source=d.source||'biquote';
      const result=calculate(s.prices);
      s.signal=result.signal; s.reason=result.reason; s.rsi=result.rsi; s.confidence=result.confidence;
      if (s.signal!=='WAIT' && (s.signal!==s.lastSignal || Date.now()-s.lastAt>60000)) {
        logs.unshift({date:new Date().toLocaleString('ar-SA'),asset,symbol:s.symbol,signal:s.signal,price:p.toFixed(5),rsi:result.rsi==null?'':result.rsi.toFixed(1)});
        logs=logs.slice(0,500); s.lastSignal=s.signal; s.lastAt=Date.now();
        if (typeof drawLogs==='function') drawLogs();
      }
    } catch (e) { s.signal='WAIT'; s.reason=e.message; }
    state.set(asset,s);
    window.dispatchEvent(new CustomEvent('po:scan-update', {detail:{asset,signal:s.signal||'WAIT',price:Number.isFinite(s.price)?s.price:null,time:s.time||0,source:s.source||'',reason:s.reason||'',rsi:Number.isFinite(s.rsi)?s.rsi:null,confidence:Number.isFinite(s.confidence)?s.confidence:0}}));
  };
  const cycle = async () => {
    if (!running || cycleBusy) return;
    cycleBusy=true;
    try {
      if (!window.__poActiveSymbols) window.__poActiveSymbols=await getJSON(apiBase+'/active');
      await pool(assets,4,scanOne);
      const now=Date.now(),ready=[...state.values()].filter(s=>s.time&&now-s.time<=60000&&now-s.time>=-15000).length;
      status.textContent='يفحص '+ready+' من '+assets.length+' سوق · آخر فحص '+new Date().toLocaleTimeString('ar-SA');
      window.dispatchEvent(new CustomEvent('po:scanner-status',{detail:{running:true,fresh:ready,total:assets.length,time:now}}));
      render();
    } catch(e) { status.textContent='تعذر الفحص: '+e.message; }
    finally { cycleBusy=false; }
  };
  $('scanStart').onclick = async () => {
    if (running) return;
    try {
      if (typeof save==='function') save();
      running=true; $('scanStart').disabled=true; $('scanStop').disabled=false;
      window.dispatchEvent(new CustomEvent('po:scanner-status',{detail:{running:true,fresh:0,total:assets.length,time:Date.now()}}));
      status.textContent='جاري التحقق من الأسواق...';
      window.__poActiveSymbols=await getJSON(apiBase+'/active');
      await cycle();
      loop=setInterval(cycle,5000);
    } catch(e) {
      running=false; $('scanStart').disabled=false; $('scanStop').disabled=true;
      status.textContent='فشل بدء الماسح: '+e.message;
    }
  };
  $('scanStop').onclick = () => {
    running=false; if(loop) clearInterval(loop); loop=null;
    window.dispatchEvent(new CustomEvent('po:scanner-status',{detail:{running:false,fresh:0,total:assets.length,time:Date.now()}}));
    $('scanStart').disabled=false; $('scanStop').disabled=true;
    status.textContent='تم إيقاف الماسح.';
  };
  render();
})();