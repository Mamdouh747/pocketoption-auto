(() => {
  'use strict';
  // Approval gate only: never sends broker orders or reads account credentials.
  const $ = id => document.getElementById(id);
  const brokerUrl = 'https://pocketoption.com/';
  let latest = { asset: '', signal: 'WAIT', price: null, time: 0 };
  const money = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 });
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function ensurePanel() {
    if ($('poApprovalGate') || !$('manualTradeCard')) return;
    const panel = document.createElement('section');
    panel.id = 'poApprovalGate';
    panel.className = 'card';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="row"><b>مراجعة وموافقة الصفقة</b><span class="muted">موافقتك مطلوبة</span></div>
      <p class="note">هذه الخطوة تجهّز تفاصيل الصفقة وتفتح منصة Pocket Option فقط. لا ترسل أمراً ولا تنفّذ صفقة. أدخل التفاصيل في المنصة بنفسك بعد مراجعتها.</p>
      <div class="grid">
        <div class="metric"><span>الأصل</span><b id="poApproveAsset">—</b></div>
        <div class="metric"><span>الاتجاه</span><b id="poApproveSide">—</b></div>
        <div class="metric"><span>السعر المرجعي</span><b id="poApprovePrice">—</b></div>
        <div class="metric"><span>وقت القراءة</span><b id="poApproveTime">—</b></div>
      </div>
      <div class="grid">
        <label>مبلغ الصفقة (أدخله بنفسك)<input id="poApproveAmount" type="number" min="0.01" step="0.01" placeholder="مثال: 1"></label>
        <label>المدة بالثواني<input id="poApproveDuration" type="number" min="5" step="1" value="60"></label>
      </div>
      <label style="display:flex;align-items:flex-start;gap:8px;line-height:1.6"><input id="poApproveCheck" type="checkbox"> راجعت الأصل والاتجاه والسعر والمبلغ والمدة، وأوافق على فتح منصة Pocket Option لإكمال التنفيذ يدوياً.</label>
      <button id="poApproveOpen" class="primary" style="width:100%" disabled>موافقة وفتح المنصة</button>
      <div class="statusline" id="poApproveStatus">بانتظار إشارة صالحة وحديثة.</div>
    `;
    $('manualTradeCard').insertAdjacentElement('afterend', panel);
    const style = document.createElement('style');
    style.textContent = `
      #poApprovalGate[hidden]{display:none!important}
      #poApprovalGate .metric{min-width:0}
      #poApprovalGate .metric b{overflow-wrap:anywhere}
      #poApprovalGate label{display:block;color:var(--muted);font-size:12px;margin:10px 0}
      #poApprovalGate input:not([type=checkbox]){display:block;width:100%;margin-top:6px}
      #poApprovalGate input[type=checkbox]{width:18px;height:18px;flex:0 0 auto;margin-top:2px}
      #poApprovalGate button:disabled{opacity:.45}
    `;
    document.head.appendChild(style);
    $('poApproveCheck').addEventListener('change', updateButton);
    $('poApproveAmount').addEventListener('input', updateButton);
    $('poApproveDuration').addEventListener('input', updateButton);
    $('poApproveOpen').addEventListener('click', approveAndOpen);
  }

  function isFresh() {
    return latest.signal !== 'WAIT' && latest.asset && Number.isFinite(latest.price) &&
      Number.isFinite(latest.time) && Date.now() - latest.time < 60000 && latest.time <= Date.now() + 30000;
  }
  function updateButton() {
    const btn = $('poApproveOpen');
    if (!btn) return;
    const amount = Number($('poApproveAmount').value);
    const duration = Number($('poApproveDuration').value);
    btn.disabled = !($('poApproveCheck').checked && amount > 0 && duration >= 5 && isFresh());
  }
  function render() {
    ensurePanel();
    const panel = $('poApprovalGate');
    if (!panel) return;
    const valid = isFresh();
    panel.hidden = !valid;
    if (!valid) {
      $('poApproveStatus').textContent = 'لا توجد إشارة صالحة وحديثة. لا تفتح صفقة.';
      $('poApproveCheck').checked = false;
      updateButton();
      return;
    }
    $('poApproveAsset').textContent = latest.asset;
    $('poApproveSide').textContent = latest.signal === 'CALL' ? 'CALL · شراء' : 'PUT · بيع';
    $('poApprovePrice').textContent = money(latest.price);
    $('poApproveTime').textContent = new Date(latest.time).toLocaleTimeString('ar-SA');
    $('poApproveStatus').textContent = 'تحقق من أن الأصل نفسه متاح في المنصة وأن السعر لم يتغير بشكل جوهري.';
    updateButton();
  }
  function approveAndOpen() {
    if (!isFresh() || !$('poApproveCheck').checked) {
      $('poApproveStatus').textContent = 'انتهت صلاحية الإشارة أو لم تؤكد الموافقة. حدّث التحليل أولاً.';
      updateButton();
      return;
    }
    const amount = Number($('poApproveAmount').value);
    const duration = Number($('poApproveDuration').value);
    if (!(amount > 0 && duration >= 5)) return;
    const intent = {
      asset: latest.asset, side: latest.signal, referencePrice: latest.price,
      signalTime: new Date(latest.time).toISOString(), amount, duration,
      approvedAt: new Date().toISOString(), status: 'opened-platform-manual-execution-required'
    };
    try {
      const history = JSON.parse(localStorage.getItem('poApprovalIntents') || '[]');
      history.unshift(intent);
      localStorage.setItem('poApprovalIntents', JSON.stringify(history.slice(0, 100)));
    } catch (_) {}
    const opened = window.open(brokerUrl, '_blank', 'noopener');
    $('poApproveStatus').textContent = opened
      ? 'تم فتح المنصة. لم تُرسل أي صفقة؛ راجع التفاصيل ونفّذ يدوياً داخل Pocket Option.'
      : 'قد يمنع المتصفح فتح نافذة جديدة. افتح Pocket Option يدوياً؛ لم تُرسل أي صفقة.';
    $('poApproveCheck').checked = false;
    updateButton();
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!target || !['manualCall', 'manualPut'].includes(target.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ensurePanel();
    const expected = target.id === 'manualCall' ? 'CALL' : 'PUT';
    if (!isFresh() || latest.signal !== expected) {
      $('poApproveStatus').textContent = 'الإشارة لم تعد صالحة. حدّث التحليل قبل الموافقة.';
      render();
      return;
    }
    render();
    $('poApprovalGate').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, true);

  window.addEventListener('po:scan-update', event => {
    const d = event.detail || {};
    if (d.asset === $('asset')?.value) {
      latest = { asset: d.asset, signal: d.signal || 'WAIT', price: Number(d.price), time: Number(d.time) };
      if (!Number.isFinite(latest.price)) latest.price = null;
      render();
    }
  });
  document.addEventListener('DOMContentLoaded', ensurePanel);
  ensurePanel();
  setInterval(() => {
    if (latest.signal !== 'WAIT' && Date.now() - latest.time >= 60000) {
      latest.signal = 'WAIT';
      render();
    }
  }, 1000);
})();
