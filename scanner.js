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
  const calculate = prices => {
    if (prices.length < 30) return {signal:'WAIT',reason:'نحتاج 30 شمعة مكتملة',rsi:null};
    const e5 = ema(prices,5), e13 = ema(prices,13);
    const rv = rsi(prices,7), mom = prices[prices.length-1] - prices[prices.length-4];
    if (![e5,e13,rv,mom].every(Number.isFinite)) return {signal:'WAIT',reason:'بيانات غير مكتملة',rsi:rv};
    if (e5 > e13 && rv >= 50 && rv <= 70 && mom > 0) return {signal:'CALL',reason:'اتجاه صاعد وزخم إيجابي',rsi:rv};
    if (e5 < e13 && rv >= 30 && rv < 50 && mom < 0) return {signal:'PUT',reason:'اتجاه هابط وزخم سلبي',rsi:rv};
    return {signal:'WAIT',reason:'الشروط غير مكتملة',rsi:rv};
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
    // Publish each scanner snapshot for the local demo engine; this never sends broker orders.
    for (const [asset, s] of state.entries()) {
      window.dispatchEvent(new CustomEvent('po:scan-update', {detail:{
        asset, signal:s.signal||'WAIT', price:Number.isFinite(s.price)?s.price:null,
        time:s.time||0, reason:s.reason||''
      }}));
    }
    rows.innerHTML = '<div class="scan-row scan-head"><span>السوق</span><span>السعر</span><span>الإشارة</span></div>'+items;
  };
  const scanOne = async ([asset]) => {
    let s = state.get(asset) || {prices:[],signal:'WAIT',lastSignal:'',lastAt:0};
    if (!s.symbol) {
      s.symbol = resolveSymbol(asset, window.__poActiveSymbols);
      if (!s.symbol) { s.reason='لا توجد بيانات نشطة لدى المصدر'; state.set(asset,s); return; }
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
      if (d.stale===true || d.marketState==='closed' || Number(d.quoteAgeSeconds)>300) throw Error('سعر قديم أو السوق مغلق');
      const returned = String(d.symbol||'').trim().toUpperCase();
      if (returned && returned !== s.symbol) throw Error('رمز السعر غير مطابق');
      const p = quotePrice(d);
      if (!p) throw Error('لا يوجد سعر صالح');
      const t = Date.parse(d.timestamp)||Date.now(), bucket=Math.floor(t/60000)*60000;
      if (!Number.isFinite(s.lastBucket) || bucket>s.lastBucket) { s.prices.push(p); s.lastBucket=bucket; }
      else if (bucket===s.lastBucket && s.prices.length) s.prices[s.prices.length-1]=p;
      else throw Error('وصلت قراءة أقدم من شمعة الماسح الحالية');
      if (s.prices.length>180) s.prices.shift();
      s.price=p; s.time=t; s.source=d.source||'biquote';
      const result=calculate(s.prices);
      s.signal=result.signal; s.reason=result.reason;
      if (s.signal!=='WAIT' && (s.signal!==s.lastSignal || Date.now()-s.lastAt>60000)) {
        logs.unshift({date:new Date().toLocaleString('ar-SA'),asset,symbol:s.symbol,signal:s.signal,price:p.toFixed(5),rsi:result.rsi==null?'':result.rsi.toFixed(1)});
        logs=logs.slice(0,500); s.lastSignal=s.signal; s.lastAt=Date.now();
        if (typeof drawLogs==='function') drawLogs();
      }
    } catch (e) { s.signal='WAIT'; s.reason=e.message; }
    state.set(asset,s);
  };
  const cycle = async () => {
    if (!running || cycleBusy) return;
    cycleBusy=true;
    try {
      if (!window.__poActiveSymbols) window.__poActiveSymbols=await getJSON(apiBase+'/active');
      await pool(assets,4,scanOne);
      const ready=[...state.values()].filter(s=>s.time).length;
      status.textContent='يفحص '+ready+' من '+assets.length+' سوق · آخر فحص '+new Date().toLocaleTimeString('ar-SA');
      render();
    } catch(e) { status.textContent='تعذر الفحص: '+e.message; }
    finally { cycleBusy=false; }
  };
  $('scanStart').onclick = async () => {
    if (running) return;
    try {
      if (typeof save==='function') save();
      running=true; $('scanStart').disabled=true; $('scanStop').disabled=false;
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
    $('scanStart').disabled=false; $('scanStop').disabled=true;
    status.textContent='تم إيقاف الماسح.';
  };
  render();
})();