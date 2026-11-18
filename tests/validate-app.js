const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('<script>');
const end = html.lastIndexOf('</script>');
assert.ok(start >= 0 && end > start, 'inline application script exists');
const app = html.slice(start + 8, end);
assert.doesNotThrow(() => new Function(app), 'application script parses');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'DOM ids are unique');
const refs = [...app.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
for (const id of new Set(refs)) assert.ok(ids.includes(id), 'missing DOM id: ' + id);

const scanner = fs.readFileSync('scanner.js', 'utf8');
const dashboard = fs.readFileSync('dashboard.js', 'utf8');
assert.doesNotThrow(() => new Function(scanner), 'scanner script parses');
assert.doesNotThrow(() => new Function(dashboard), 'dashboard script parses');
assert.match(html, /microsoft-signalr\/8\.0\.0\/signalr\.min\.js/);
assert.match(app, /HubConnectionBuilder/);
assert.match(app, /startPolling\(\)/);
assert.match(html, /id="scanStart"/);
assert.match(html, /id="gptPanel"/) === false; // dashboard creates this panel at runtime
assert.match(html, /dashboard\.css/);
assert.match(html, /dashboard\.js/);
assert.match(html, /id="manualCall"/);
assert.match(html, /id="manualPut"/);
assert.match(app, /التنفيذ اليدوي فقط/);

const a = app.indexOf('function ema');
const b = app.indexOf('\nfunction showSignal', a);
assert.ok(a >= 0 && b > a, 'indicator functions exist');
const indicators = new Function(app.slice(a, b) + '; return {ema,rsi};')();
assert.ok(Math.abs(indicators.ema([1,2,3,4,5],5)-3.3950617283950617)<1e-10);
assert.equal(indicators.rsi(Array.from({length:40},(_,i)=>100+i),7),100);
assert.equal(indicators.rsi(Array.from({length:40},(_,i)=>140-i),7),0);
assert.match(scanner, /نحتاج 30 شمعة مكتملة/);
assert.match(scanner, /Math\.floor\(t\/60000\)\*60000/);
assert.match(fs.readFileSync('sw.js','utf8'), /po-auto-signals-v5/);
console.log('Unified PRO dashboard validation passed.');
