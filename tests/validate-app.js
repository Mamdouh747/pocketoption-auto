const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\\s\\S]*?)<\\/script>/);
assert.ok(scriptMatch, 'Application script tag must exist');
const appScript = scriptMatch[1];
assert.doesNotThrow(() => new Function(appScript), 'Application JavaScript must parse');

const ids = [...html.matchAll(/\\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, 'DOM IDs must be unique');
const referencedIds = [...appScript.matchAll(/\\$\\(['"]([^'"]+)['"]\\)/g)].map((m) => m[1]);
for (const id of new Set(referencedIds)) {
  assert.ok(ids.includes(id), `Referenced DOM id is missing: ${id}`);
}

const start = appScript.indexOf('function ema');
const end = appScript.indexOf('\\nfunction showSignal', start);
assert.ok(start >= 0 && end > start, 'EMA/RSI implementation must exist');
const indicators = new Function(appScript.slice(start, end) + '; return { ema, rsi };')();

const ema5 = indicators.ema([1, 2, 3, 4, 5], 5);
assert.ok(Math.abs(ema5 - 3.3950617283950617) < 1e-10, 'EMA test vector must match');
const rising = Array.from({ length: 40 }, (_, i) => 100 + i);
const falling = Array.from({ length: 40 }, (_, i) => 140 - i);
assert.equal(indicators.rsi(rising, 7), 100, 'RSI for a strictly rising series must be 100');
assert.equal(indicators.rsi(falling, 7), 0, 'RSI for a strictly falling series must be 0');

const cache = fs.readFileSync('sw.js', 'utf8');
assert.match(cache, /po-auto-signals-v\\d+/, 'Service worker cache must be versioned');
assert.match(html, /microsoft-signalr\\/8\\.0\\.0\\/signalr\\.min\\.js/, 'SignalR client must be loaded');
assert.match(appScript, /HubConnectionBuilder/, 'SignalR connection must be configured');
assert.match(appScript, /startPolling\\(\\)/, 'REST fallback must remain available');

console.log('PO Auto Signals validation passed: syntax, DOM references, EMA/RSI vectors, PWA cache and SignalR fallback.');
