const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const SP = __dirname; const ROOT = path.dirname(__dirname); fs.mkdirSync(path.join(SP, 'shots'), { recursive: true }); const args = process.argv.slice(2); const hash = args.shift(); let size = '1440,900';
if (/^\d+,\d+$/.test(args[0])) size = args.shift();
const port = 9300 + Math.floor(Math.random() * 500);
const prof = path.join(require('os').tmpdir(), 'cinderwatch-chrome-' + port);
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=' + (process.env.DPR || 1), '--window-size=' + size, '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ws = null;
  for (let i = 0; i < 50 && !ws; i++) { await sleep(150); try { const r = await fetch('http://127.0.0.1:' + port + '/json'); const j = await r.json(); const pg = j.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch (e) { } }
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.consoleAPICalled') { console.log('[console.' + m.params.type + ']', m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ').slice(0, 600)); } else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; console.log('[EXCEPTION]', (d.exception && d.exception.description || d.text).slice(0, 900), 'line', d.lineNumber); } else if (m.method === 'Log.entryAdded') { console.log('[log.' + m.params.entry.level + ']', m.params.entry.text.slice(0, 500)); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'file://' + ROOT + '/index.html#' + hash });
  await sleep(600);
  for (const op of args) {
    const k = op.slice(0, op.indexOf(':')), v = op.slice(op.indexOf(':') + 1);
    if (k === 'wait') await sleep(+v);
    else if (k === 'shot') { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SP, 'shots', v + '.png'), Buffer.from(r.result.data, 'base64')); console.log('shot', v); }
    else if (k === 'eval') { const r = await send('Runtime.evaluate', { expression: v, returnByValue: true, awaitPromise: true }); console.log('eval>', JSON.stringify(r.result.result.value !== undefined ? r.result.result.value : (r.result.exceptionDetails ? r.result.exceptionDetails.exception.description : r.result.result.description)).slice(0, 1500)); }
    else if (k === 'click' || k === 'move') { const [x, y] = v.split(',').map(Number); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); if (k === 'click') { await sleep(60); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); } }
    else if (k === 'clickat' || k === 'moveat') { const r = await send('Runtime.evaluate', { expression: v, returnByValue: true }); const [x, y] = String(r.result.result.value).split(',').map(Number); console.log(k, x, y); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); if (k === 'clickat') { await sleep(120); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); } }
    else if (k === 'key') { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: v, text: v.length === 1 ? v : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: v }); }
  }
  ws.close(); chrome.kill(); await sleep(200); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { }
  process.exit(0);
})();
