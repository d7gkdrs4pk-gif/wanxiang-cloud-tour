/* Chinese HUD adapter. Original Cinderwatch scene/game source stays intact. */
(() => {
  'use strict';
  const messages = /*__MESSAGES__*/;
  const family = '"CinderwatchZh","PingFang SC","Noto Sans CJK SC",sans-serif';
  const hasHan = /[\u2e80-\u9fff]/;
  const metrics = document.createElement('canvas').getContext('2d');
  const originalMeasure = PX.measure, originalText = PX.text;
  const seen = new Map(), missing = new Set();
  function translate(value) {
    const source = String(value);
    if (Object.prototype.hasOwnProperty.call(messages, source)) return messages[source];
    let m;
    if ((m = /^Wave (\d+)(?: · (.+))?$/.exec(source))) return '第' + m[1] + '波' + (m[2] ? ' · ' + translate(m[2]) : '');
    if ((m = /^Next wave in (\d+)$/.exec(source))) return '下波倒计时 ' + m[1] + '秒';
    if ((m = /^(\d+) on the road$/.exec(source))) return '剩余敌人 ' + m[1];
    if ((m = /^AI resumes in (\d+)$/.exec(source))) return m[1] + '秒后自动指挥';
    if ((m = /^Upgrade (\d+)$/.exec(source))) return '升级 ' + m[1];
    if ((m = /^Sell \+(\d+)$/.exec(source))) return '出售 +' + m[1];
    if ((m = /^(\d+) footmen · (\d+) health$/.exec(source))) return '步兵 ' + m[1] + ' · 生命 ' + m[2];
    if ((m = /^Range ([\d.]+) · Damage ([\d.]+)$/.exec(source))) return '射程 ' + m[1] + ' · 伤害 ' + m[2];
    if ((m = /^(.+): click a pad$/.exec(source))) return translate(m[1]) + '：点选塔位';
    if ((m = /^(\d+) fps\s+(\d+)x(\d+)\s+calls (\d+)\s+mons (\d+)$/.exec(source))) return m[1] + '帧/秒 ' + m[2] + '×' + m[3] + ' 绘制 ' + m[4] + ' 敌人 ' + m[5];
    if (/[A-Za-z]{2}/.test(source)) missing.add(source);
    return source;
  }
  function measure(value) {
    if (!hasHan.test(value)) return originalMeasure(value);
    metrics.font = '700 9px ' + family;
    return metrics.measureText(value).width;
  }
  PX.measure = value => measure(translate(value));
  PX.text = function(ctx, value, x, y, scale, color, options) {
    const source = String(value), text = translate(source);
    if (seen.size < 512) seen.set(source, text);
    if (!hasHan.test(text)) return originalText(ctx, text, x, y, scale, color, options);
    const s = Math.max(1, Math.round(scale || 1)), o = options || {}, width = measure(text) * s;
    let left = x;
    if (o.align === 'c') left -= width / 2;
    else if (o.align === 'r') left -= width;
    ctx.save();
    ctx.font = '700 ' + (9 * s) + 'px ' + family;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    const bx = Math.round(left), by = Math.round(y + 7.6 * s);
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(text, bx + s, by + s); }
    if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = 2 * s; ctx.strokeText(text, bx, by); }
    ctx.fillStyle = color || '#ffffff'; ctx.fillText(text, bx, by);
    ctx.restore();
    return width;
  };
  window.__CW_ZH = {
    language: 'zh-CN', translate, measure: value => PX.measure(value),
    fontReady: document.fonts.load('700 9px "CinderwatchZh"'),
    seen: () => Object.fromEntries(seen), missing: () => Array.from(missing),
  };
})();
