const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path'); const os = require('os');
const ROOT = path.dirname(__dirname), FFMPEG = process.env.FFMPEG || 'ffmpeg';
const [mode, seed, arg, out] = process.argv.slice(2); const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
const port = 9400 + Math.floor(Math.random() * 400), prof = path.join(os.tmpdir(), 'cinderwatch-rec-' + port);
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1', '--window-size=' + W + ',' + H, '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGE = `(() => {
  const cv = document.createElement('canvas'), gl = document.getElementById('gl'), hud = document.getElementById('hud');
  cv.width = gl.width; cv.height = gl.height; const c2 = cv.getContext('2d');
  const grab = () => { c2.drawImage(gl, 0, 0); c2.drawImage(hud, 0, 0); return cv.toDataURL('image/png'); };
  const c = __cw, G = c.G;
  window.__rec = {
    frame: 0, audio: false, started: false, log: [], last: {}, grab,
    initAudio(total) {
      const off = this.off = new OfflineAudioContext(2, Math.ceil(total * 48000), 48000);
      const prox = new Proxy(off, { get(t, p) { if (p === 'state') return 'running'; if (p === 'resume') return () => Promise.resolve(); const v = t[p]; return typeof v === 'function' ? v.bind(t) : v; }, set(t, p, v) { t[p] = v; return true; } });
      window.AudioContext = function () { return prox; };
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      this.audio = true; return 'audio ' + off.length;
    },
    note() {
      const L = this.last, f = this.frame, boss = G.mons.find(m => m.def.boss), ev = [];
      if (G.phase !== L.phase) ev.push('phase ' + G.phase); if (G.k !== L.k) ev.push('wave k' + G.k + ' L' + G.level);
      if (!!boss !== !!L.boss) ev.push(boss ? 'boss in' : 'boss gone'); if (boss && boss.dying > 0 && !L.dying) ev.push('boss dying');
      if (G.B.lit && !L.lit) ev.push('beacon lit'); if (G.lives !== L.lives && L.lives !== undefined) ev.push('lives ' + G.lives);
      L.phase = G.phase; L.k = G.k; L.boss = !!boss; L.dying = boss && boss.dying > 0; L.lit = G.B.lit; L.lives = G.lives;
      for (const e of ev) this.log.push('f' + f + ' (' + (f / 60).toFixed(1) + 's) ' + e);
      if (f % 120 === 0) this.log.push('f' + f + ' t' + G.t.toFixed(0) + ' mons ' + G.mons.filter(m => m.vis || m.fly).length + ' arrows ' + G.arrows.length + ' shells ' + G.shells.length + ' fx ' + c.FX.timed.length + ' bolts ' + c.FX.bolts.length + ' men ' + G.men.length + ' tw[' + G.towers.map(t => t.kind[0] + t.lvl).join('') + '] zoom ' + c.CAM.zoom.toFixed(2) + (boss ? ' boss ' + (boss.hp / boss.maxHp).toFixed(2) + ' s' + boss.s.toFixed(0) + '/' + G.B.L.toFixed(0) : ''));
    },
    async advance(n, capture, quiet) {
      for (let i = 0; i < n; i++) {
        c.tick(1 / 60, capture); if (capture) window.__emit(grab());
        this.frame++; if (!quiet) this.note();
        if (this.audio) { const p = this.off.suspend(this.frame / 60); if (!this.started) { this.started = true; this.done = this.off.startRendering(); } else this.off.resume(); await p; }
      }
      const l = this.log.join('\\n'); this.log.length = 0; return l;
    },
    async wav(ranges) {
      this.off.resume(); const buf = await this.done, sr = buf.sampleRate, ch = [buf.getChannelData(0), buf.getChannelData(1)];
      let n = 0; for (const [a, b] of ranges) n += Math.round((b - a) / 60 * sr);
      const pcm = new Int16Array(n * 2), fade = Math.round(sr * 0.02); let o = 0, peak = 0, sq = 0;
      for (const [a, b] of ranges) { const s0 = Math.round(a / 60 * sr), len = Math.round((b - a) / 60 * sr);
        for (let i = 0; i < len; i++) { const g = Math.min(1, i / fade, (len - 1 - i) / fade); for (let k = 0; k < 2; k++) { const v = (ch[k][s0 + i] || 0) * g; peak = Math.max(peak, Math.abs(v)); sq += v * v; pcm[o++] = Math.max(-1, Math.min(1, v)) * 32767; } } }
      const hdr = new DataView(new ArrayBuffer(44)), w = (p, s) => { for (let i = 0; i < s.length; i++) hdr.setUint8(p + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); hdr.setUint32(4, 36 + pcm.byteLength, true); w(8, 'WAVEfmt '); hdr.setUint32(16, 16, true); hdr.setUint16(20, 1, true); hdr.setUint16(22, 2, true); hdr.setUint32(24, sr, true); hdr.setUint32(28, sr * 4, true); hdr.setUint16(32, 4, true); hdr.setUint16(34, 16, true); w(36, 'data'); hdr.setUint32(40, pcm.byteLength, true);
      const bytes = new Uint8Array(44 + pcm.byteLength); bytes.set(new Uint8Array(hdr.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
      let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
      return JSON.stringify({ peak: +peak.toFixed(3), rms: +Math.sqrt(sq / (n * 2)).toFixed(4), b64: btoa(s) });
    },
  };
  return cv.width + 'x' + cv.height;
})()`;
(async () => {
  let ws = null;
  for (let i = 0; i < 60 && !ws; i++) { await sleep(150); try { const j = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); const pg = j.find(t => t.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch (e) { } }
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map(); let onFrame = null;
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method === 'Runtime.bindingCalled') { if (onFrame) onFrame(m.params.payload); }
    else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; console.log('[EXCEPTION]', (d.exception && d.exception.description || d.text).slice(0, 600)); }
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('[console.error]', m.params.args.map(a => a.value || a.description).join(' ').slice(0, 400));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description); return r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable'); await send('Runtime.addBinding', { name: '__emit' });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file://' + ROOT + '/index.html#seed=' + seed + '&manual=1&noscale=1' });
  await sleep(1500);
  console.log('canvas', await ev(PAGE));
  const quit = async () => { ws.close(); chrome.kill(); await sleep(200); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { } process.exit(0); };
  if (mode === 'scan') {
    const total = Math.round(+arg * 60);
    for (let f = 0; f < total; f += 600) { const l = await ev('__rec.advance(' + Math.min(600, total - f) + ', false)'); if (l) console.log(l); }
    return quit();
  }
  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true }); const frames = arg.split(',').map(Number).sort((a, b) => a - b); let cur = 0;
    for (const f of frames) {
      for (let n = f - 1 - cur; n > 0; n -= 600) await ev('__rec.advance(' + Math.min(600, n) + ', false, true)'); 
      const got = new Promise(r => { onFrame = r; }); await ev('__rec.advance(1, true, true)'); const url = await got; onFrame = null; cur = f;
      fs.writeFileSync(path.join(out, 'f' + f + '.png'), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')); console.log('still', f);
    }
    return quit();
  }
  if (mode === 'capture') {
    const ranges = arg.split(',').map(r => r.split('-').map(Number)), end = ranges[ranges.length - 1][1], tmp = out.replace(/\.mp4$/, '') + '.video.mp4', wav = out.replace(/\.mp4$/, '') + '.wav';
    console.log(await ev('__rec.initAudio(' + (end / 60 + 0.4) + ')'));
    const AO = !!process.env.AUDIO_ONLY;
    const ff = AO ? null : spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '10', '-pix_fmt', 'yuv420p', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    let nOut = 0; onFrame = url => { ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')); nOut++; };
    let cur = 0;
    for (const [a, b] of ranges) {
      for (let n = a - cur; n > 0; n -= 600) await ev('__rec.advance(' + Math.min(600, n) + ', false, true)');
      for (let f = a; f < b; f += 30) { await ev('__rec.advance(' + Math.min(30, b - f) + ', ' + !AO + ', true)'); process.stdout.write('\rframes ' + nOut + '   '); }
      cur = b;
    }
    if (!AO) { await sleep(300); ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('\nvideo frames', nOut); }
    const a = JSON.parse(await ev('__rec.wav(' + JSON.stringify(ranges) + ')')); fs.writeFileSync(wav, Buffer.from(a.b64, 'base64')); console.log('audio peak', a.peak, 'rms', a.rms);
    if (AO) return quit();
    const dur = nOut / 60, mux = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-i', wav, '-vf', 'fade=t=out:st=' + (dur - 0.5).toFixed(2) + ':d=0.5', '-af', 'afade=t=in:st=0:d=0.05,afade=t=out:st=' + (dur - 0.7).toFixed(2) + ':d=0.7', '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF || '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: 'inherit' });
    await new Promise(r => mux.on('close', r)); console.log('wrote', out);
    return quit();
  }
  return quit();
})();
