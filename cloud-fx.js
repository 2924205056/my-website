/* 云朵家族 · 游戏体验层 (cloud-fx.js)
   给 cloud-games.js 提供：WebAudio 音效引擎 / 粒子系统 / 屏幕震动 /
   视差星空背景 / 绘制原语 / 带暂停与销毁的游戏骨架。
   本文件不含任何具体玩法。 */
(function () {
  const FX = {};
  window.CloudFX = FX;

  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  FX.reducedMotion = RM;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndi = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const lerp = (a, b, t) => a + (b - a) * t;
  Object.assign(FX, { rnd, rndi, pick, clamp, dist, lerp });

  /* ============================================================
     1. 音效引擎
     所有音都是实时合成，无外部资源。统一走 dry + convolver(混响)
     两条总线，让电子音听起来像在夜空里回荡。
     ============================================================ */
  const A = (function () {
    let ctx = null, master = null, dry = null, wet = null;
    let muted = false;
    try { muted = localStorage.getItem('cg-muted') === '1'; } catch (e) { }
    const subs = [];

    function impulse(c, sec, decay) {
      const len = Math.max(1, Math.floor(c.sampleRate * sec));
      const b = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return b;
    }
    function noiseBuf(c, sec) {
      const len = Math.max(1, Math.floor(c.sampleRate * sec));
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    let NB = null;

    function init() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = muted ? 0 : .5;
      master.connect(ctx.destination);
      let tail = master;
      if (ctx.createDynamicsCompressor) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 6;
        comp.connect(master); tail = comp;
      }
      dry = ctx.createGain(); dry.gain.value = .9; dry.connect(tail);
      wet = ctx.createGain(); wet.gain.value = .34;
      if (ctx.createConvolver) {
        const conv = ctx.createConvolver();
        try { conv.buffer = impulse(ctx, 1.7, 2.4); wet.connect(conv); conv.connect(tail); }
        catch (e) { wet.connect(tail); }
      } else wet.connect(tail);
      NB = noiseBuf(ctx, 1);
      return ctx;
    }
    function resume() { const c = init(); if (c && c.state === 'suspended') c.resume(); return c; }
    function now() { const c = init(); return c ? c.currentTime : 0; }
    function out(g, sendWet) { g.connect(dry); if (sendWet !== 0) { const w = ctx.createGain(); w.gain.value = sendWet == null ? 1 : sendWet; g.connect(w); w.connect(wet); } }

    /* 单音：freq→to 的滑音 + 指数包络 */
    function tone(o) {
      const c = init(); if (!c || muted) return;
      o = o || {};
      const t0 = c.currentTime + (o.delay || 0);
      const dur = o.dur || .2;
      const osc = c.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, o.freq || 440), t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
      const g = c.createGain();
      const peak = o.gain == null ? .2 : o.gain;
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + (o.atk || .01));
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      let node = osc;
      if (o.filter) {
        const f = c.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(o.filter, t0); node.connect(f); node = f;
      }
      node.connect(g); out(g, o.wet);
      osc.start(t0); osc.stop(t0 + dur + .03);
    }

    /* 噪声：撞击 / 风声 / 快门 */
    function noise(o) {
      const c = init(); if (!c || muted || !NB) return;
      o = o || {};
      const t0 = c.currentTime + (o.delay || 0);
      const dur = o.dur || .18;
      const src = c.createBufferSource(); src.buffer = NB;
      src.playbackRate.value = o.rate || 1;
      const f = c.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 900, t0);
      if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.to), t0 + dur);
      f.Q.value = o.q == null ? 1.2 : o.q;
      const g = c.createGain();
      const peak = o.gain == null ? .16 : o.gain;
      g.gain.setValueAtTime(.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + (o.atk || .006));
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      src.connect(f); f.connect(g); out(g, o.wet);
      src.start(t0); src.stop(t0 + dur + .03);
    }

    /* 持续音（蓄力 / 呼吸）：返回 {set,stop} */
    function hold(o) {
      const c = init(); if (!c || muted) return { set() { }, stop() { } };
      o = o || {};
      const osc = c.createOscillator(); osc.type = o.type || 'triangle';
      osc.frequency.value = o.freq || 200;
      const g = c.createGain(); g.gain.value = .0001;
      osc.connect(g); out(g, o.wet == null ? .5 : o.wet);
      osc.start();
      let dead = false;
      return {
        set(freq, gain) {
          if (dead) return;
          const t = c.currentTime;
          if (freq) osc.frequency.linearRampToValueAtTime(Math.max(20, freq), t + .04);
          g.gain.linearRampToValueAtTime(Math.max(.0001, gain == null ? .12 : gain), t + .04);
        },
        stop() {
          if (dead) return; dead = true;
          const t = c.currentTime;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(Math.max(.0001, g.gain.value), t);
          g.gain.exponentialRampToValueAtTime(.0001, t + .12);
          try { osc.stop(t + .2); } catch (e) { }
        }
      };
    }

    function setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('cg-muted', muted ? '1' : '0'); } catch (e) { }
      if (master) master.gain.value = muted ? 0 : .5;
      subs.forEach(f => { try { f(muted); } catch (e) { } });
    }
    return {
      tone, noise, hold, resume, now,
      get muted() { return muted; },
      setMuted, toggle() { setMuted(!muted); return muted; },
      onMute(f) { subs.push(f); }
    };
  })();
  FX.audio = A;

  /* 五声音阶（C 大调五声，听起来永远不会难听） */
  const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
  FX.penta = n => PENTA[clamp(n | 0, 0, PENTA.length - 1)];

  /* 语义化音效包 */
  const S = {
    tap() { A.tone({ freq: 720, to: 980, dur: .08, gain: .12, type: 'sine' }); },
    click() { A.noise({ freq: 2600, to: 1200, dur: .05, gain: .1, q: .8 }); },
    /* 连击越高音越高 */
    note(step, gain) { A.tone({ freq: FX.penta(4 + (step | 0)), dur: .3, gain: gain || .18, type: 'triangle' }); A.tone({ freq: FX.penta(4 + (step | 0)) * 2, dur: .18, gain: (gain || .18) * .35, type: 'sine', delay: .01 }); },
    hit(step) { A.tone({ freq: FX.penta(5 + (step | 0) % 6), to: FX.penta(7 + (step | 0) % 5), dur: .16, gain: .17, type: 'triangle' }); A.noise({ freq: 1800, to: 600, dur: .09, gain: .07 }); },
    pickup(step) { S.note(step); A.tone({ freq: 1760, dur: .1, gain: .05, type: 'sine', delay: .04 }); },
    thud() { A.tone({ freq: 150, to: 60, dur: .22, gain: .22, type: 'sine' }); A.noise({ freq: 320, to: 110, dur: .16, gain: .12, type: 'lowpass', q: .7 }); },
    bad() { A.tone({ freq: 220, to: 110, dur: .32, gain: .18, type: 'sawtooth', filter: 900 }); A.noise({ freq: 500, to: 160, dur: .2, gain: .1 }); },
    whoosh() { A.noise({ freq: 260, to: 1500, dur: .3, gain: .07, type: 'bandpass', q: .6 }); },
    pop(t) { A.tone({ freq: 420 - (t | 0) * 34, to: 900 - (t | 0) * 60, dur: .14, gain: .18, type: 'sine' }); },
    shutter() { A.noise({ freq: 3400, to: 900, dur: .05, gain: .16, q: .6 }); A.noise({ freq: 1400, to: 300, dur: .09, gain: .1, delay: .05 }); },
    plink(step) { A.tone({ freq: FX.penta(3 + (step | 0) % 8), dur: .5, gain: .15, type: 'sine' }); },
    win() { [0, 2, 4, 6, 9].forEach((n, i) => A.tone({ freq: FX.penta(n + 2), dur: .55, gain: .16, type: 'triangle', delay: i * .11 })); },
    lose() { [6, 4, 2, 0].forEach((n, i) => A.tone({ freq: FX.penta(n), dur: .42, gain: .15, type: 'triangle', delay: i * .13, filter: 1600 })); },
    start() { [0, 4, 7].forEach((n, i) => A.tone({ freq: FX.penta(n + 3), dur: .4, gain: .13, type: 'sine', delay: i * .06 })); }
  };
  FX.sfx = S;

  /* ============================================================
     2. 绘制原语
     ============================================================ */
  function star(ctx, x, y, r, c, glow, rot) {
    ctx.save();
    ctx.translate(x, y); if (rot) ctx.rotate(rot);
    if (glow) { ctx.shadowColor = c; ctx.shadowBlur = typeof glow === 'number' ? glow : 14; }
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI / 2.5) * i - Math.PI / 2, a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * .45, Math.sin(a2) * r * .45);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* 四角闪光（比五角星更适合当"光点"） */
  function sparkle(ctx, x, y, r, c, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .16, -r * .16, r, 0);
    ctx.quadraticCurveTo(r * .16, r * .16, 0, r);
    ctx.quadraticCurveTo(-r * .16, r * .16, -r, 0);
    ctx.quadraticCurveTo(-r * .16, -r * .16, 0, -r);
    ctx.fill(); ctx.restore();
  }
  /* 会表情的云朵角色。mood: 'happy'|'ooo'|'sad'|'sleep' */
  function cloud(ctx, x, y, s, o) {
    o = o || {};
    const c = o.color || '#f7f4ff', sq = o.squash || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 / sq, sq);
    if (o.rot) ctx.rotate(o.rot);
    ctx.fillStyle = c;
    ctx.shadowColor = o.glow || 'rgba(180,220,255,.6)'; ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, s * .5, 0, 7); ctx.arc(-s * .42, s * .1, s * .36, 0, 7); ctx.arc(s * .42, s * .1, s * .36, 0, 7);
    ctx.arc(-s * .12, -s * .26, s * .4, 0, 7); ctx.arc(s * .18, -s * .2, s * .38, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    /* 高光 */
    const hl = ctx.createRadialGradient(-s * .18, -s * .3, 1, -s * .18, -s * .3, s * .6);
    hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(-s * .1, -s * .2, s * .55, 0, 7); ctx.fill();
    /* 表情 */
    const mood = o.mood || 'happy';
    ctx.fillStyle = o.ink || '#26304d';
    ctx.strokeStyle = o.ink || '#26304d'; ctx.lineWidth = Math.max(1.4, s * .045); ctx.lineCap = 'round';
    if (mood === 'sleep') {
      ctx.beginPath(); ctx.arc(-s * .16, 0, s * .09, .15, Math.PI - .15); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * .16, 0, s * .09, .15, Math.PI - .15); ctx.stroke();
    } else if (mood === 'sad') {
      ctx.beginPath(); ctx.arc(-s * .16, s * .01, s * .06, 0, 7); ctx.arc(s * .16, s * .01, s * .06, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, s * .26, s * .1, Math.PI + .3, -.3); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(-s * .16, 0, s * .055, 0, 7); ctx.arc(s * .16, 0, s * .055, 0, 7); ctx.fill();
      if (mood === 'ooo') { ctx.beginPath(); ctx.arc(0, s * .2, s * .07, 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, s * .14, s * .1, .25, Math.PI - .25); ctx.stroke(); }
    }
    ctx.fillStyle = o.blush || 'rgba(255,160,190,.65)';
    ctx.beginPath(); ctx.arc(-s * .32, s * .13, s * .075, 0, 7); ctx.arc(s * .32, s * .13, s * .075, 0, 7); ctx.fill();
    ctx.restore();
  }
  function moon(ctx, x, y, r, c) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c || '#ffd76a'; ctx.shadowColor = c || '#ffd76a'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(r * .5, -r * .25, r * .88, 0, 7); ctx.fill();
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
    }
  }
  /* 柔光球：用于拖尾、光斑 */
  function glow(ctx, x, y, r, c, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }
  Object.assign(FX, { star, sparkle, cloud, moon, roundRect, glow });

  /* 手绘素材：{key: url} → {key: HTMLImageElement}。
     加载是异步的，游戏该照常开跑，画的时候用 FX.sprite 自动回退。 */
  FX.sprites = function (map, onReady) {
    const out = {};
    let total = 0, done = 0;
    const tick = () => { if (++done >= total && onReady) onReady(out); };
    for (const k in map) {
      total++;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { out[k] = im; tick(); };
      im.onerror = () => { console.warn('[cloud-fx] 素材加载失败:', map[k]); tick(); };
      im.src = map[k];
    }
    if (!total && onReady) onReady(out);
    return out;
  };

  /* 以 (x,y) 为中心、r 为半径画一张素材。图还没加载好就回退到 fb(ctx,x,y,r)。
     o: {rot, alpha, squash, glow:颜色} */
  FX.sprite = function (ctx, im, x, y, r, o) {
    o = o || {};
    if (!im || !im.complete || !im.naturalWidth) { o.fb && o.fb(ctx, x, y, r); return false; }
    if (o.glow) FX.glow(ctx, x, y, r * 1.7, o.glow, o.glowA == null ? .22 : o.glowA);
    const sq = o.squash || 1;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (sq !== 1) ctx.scale(1 / sq, sq);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    /* 素材是正方形且主体居中，按外接圆直径铺开 */
    const d = r * 2;
    ctx.drawImage(im, -r, -r, d, d);
    ctx.restore();
    return true;
  };

  /* ============================================================
     3. 粒子 + 屏幕震动
     ============================================================ */
  FX.particles = function () {
    let P = [], shT = 0, shA = 0, shDur = .28;
    const api = {
      burst(x, y, o) {
        o = o || {};
        const n = RM ? Math.ceil((o.n || 14) / 3) : (o.n || 14);
        for (let i = 0; i < n; i++) {
          const a = o.ang == null ? Math.random() * Math.PI * 2 : o.ang + (Math.random() - .5) * (o.spread == null ? 1.8 : o.spread);
          const sp = (o.sp || 100) * (.35 + Math.random());
          P.push({
            k: o.k || 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            g: o.g == null ? 180 : o.g, drag: o.drag == null ? .96 : o.drag,
            life: (o.life || .6) * (.7 + Math.random() * .6), t: 0,
            r: (o.r || 3) * (.6 + Math.random() * .8),
            c: Array.isArray(o.c) ? pick(o.c) : (o.c || '#ffd76a'),
            rot: Math.random() * 6.28, vr: (Math.random() - .5) * 10
          });
        }
        return api;
      },
      ring(x, y, o) {
        o = o || {};
        P.push({ k: 'ring', x, y, r: o.r || 6, r2: o.r2 || 54, life: o.life || .45, t: 0, c: o.c || '#ffd76a', lw: o.lw || 2.5 });
        return api;
      },
      text(x, y, s, c, size) {
        P.push({ k: 'text', x, y, vy: -52, life: .95, t: 0, s: String(s), c: c || '#ffd76a', r: size || 17 });
        return api;
      },
      trail(x, y, o) {
        o = o || {};
        if (RM) return api;
        P.push({ k: 'dot', x, y, vx: rnd(-14, 14), vy: rnd(-14, 14), g: 0, drag: .9, life: o.life || .35, t: 0, r: o.r || 3, c: o.c || '#ffd76a', rot: 0, vr: 0 });
        return api;
      },
      shake(amp, dur) { if (RM) return api; shA = Math.max(shA, amp); shT = shDur = dur || .28; return api; },
      get shaking() { return shT > 0; },
      step(dt) {
        if (shT > 0) shT -= dt; else shA = 0;
        for (let i = P.length - 1; i >= 0; i--) {
          const p = P[i]; p.t += dt;
          if (p.t >= p.life) { P.splice(i, 1); continue; }
          if (p.k === 'ring') continue;
          if (p.k === 'text') { p.y += p.vy * dt; p.vy *= .94; continue; }
          p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
          p.rot += p.vr * dt;
        }
        if (P.length > 420) P.splice(0, P.length - 420);
      },
      /* 把整个场景包进震动变换 */
      begin(ctx) {
        ctx.save();
        if (shT > 0 && shA > 0) {
          const k = shA * (shT / shDur);
          ctx.translate(rnd(-k, k), rnd(-k, k));
        }
      },
      end(ctx) { ctx.restore(); },
      draw(ctx) {
        for (let i = 0; i < P.length; i++) {
          const p = P[i], u = p.t / p.life, a = 1 - u;
          if (p.k === 'ring') {
            ctx.save(); ctx.globalAlpha = a * .9; ctx.strokeStyle = p.c; ctx.lineWidth = p.lw * a;
            ctx.shadowColor = p.c; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r, p.r2, 1 - Math.pow(1 - u, 2)), 0, 7); ctx.stroke(); ctx.restore();
          } else if (p.k === 'text') {
            ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p.c;
            ctx.font = '600 ' + p.r + 'px "HanziPen SC","Kaiti SC",serif'; ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6;
            ctx.fillText(p.s, p.x, p.y); ctx.restore();
          } else if (p.k === 'star') {
            ctx.save(); ctx.globalAlpha = a; star(ctx, p.x, p.y, p.r * (.5 + a * .8), p.c, 10, p.rot); ctx.restore();
          } else {
            ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
            g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, 7); ctx.fill();
            ctx.restore();
          }
        }
      },
      clear() { P = []; shT = 0; shA = 0; }
    };
    return api;
  };

  /* ============================================================
     4. 视差星空背景（每个游戏画布内部的天空）
     ============================================================ */
  FX.sky = function (W, H, o) {
    o = o || {};
    const layers = [];
    for (let L = 0; L < 2; L++) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const n = Math.floor(W * H / (L === 0 ? 2400 : 6200));
      for (let i = 0; i < n; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const r = L === 0 ? rnd(.25, 1) : rnd(.7, 1.9);
        g.globalAlpha = (L === 0 ? .4 : .85) * rnd(.35, 1);
        g.fillStyle = Math.random() < .2 ? '#ffd76a' : '#e6efff';
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      layers.push(c);
    }
    const tw = [];
    for (let i = 0; i < 9; i++) tw.push({ x: rnd(10, W - 10), y: rnd(10, H * .8), r: rnd(2.2, 4.4), p: rnd(0, 6.28), sp: rnd(.7, 1.7) });
    const top = o.top || '#13244e', bot = o.bottom || '#080e22';
    const nx = o.nx == null ? .7 : o.nx, ny = o.ny == null ? .22 : o.ny;
    const glowC = o.glow || 'rgba(47,224,192,.20)';
    const spd = RM ? [0, 0] : [5, 14];
    return {
      draw(ctx, t) {
        const g1 = ctx.createLinearGradient(0, 0, 0, H);
        g1.addColorStop(0, top); g1.addColorStop(1, bot);
        ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
        const R = Math.max(W, H) * .68;
        const nb = ctx.createRadialGradient(W * nx, H * ny, 4, W * nx, H * ny, R);
        nb.addColorStop(0, glowC); nb.addColorStop(.5, 'rgba(64,116,224,.10)'); nb.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nb; ctx.fillRect(0, 0, W, H);
        for (let L = 0; L < 2; L++) {
          const off = ((t * spd[L]) % H + H) % H;
          ctx.globalAlpha = L === 0 ? .85 : 1;
          ctx.drawImage(layers[L], 0, off); ctx.drawImage(layers[L], 0, off - H);
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < tw.length; i++) {
          const s = tw[i], k = (Math.sin(t * s.sp + s.p) + 1) / 2;
          if (k < .3) continue;
          sparkle(ctx, s.x, s.y, s.r * (.5 + k), 'rgba(255,236,190,' + (k * .85).toFixed(3) + ')', t * .4 + i);
        }
      }
    };
  };

  /* ============================================================
     5. 游戏骨架：HUD / 画布 / overlay / 事件与循环托管
     所有 addEventListener 与 rAF 都登记在 api 上，destroy() 一次收干净。
     ============================================================ */
  const CSS = `
  .cg-wrap{position:relative;width:100%;max-width:460px;display:flex;flex-direction:column;gap:10px;align-items:center}
  .cg-hud{display:flex;justify-content:space-between;align-items:center;width:100%;gap:8px;
    font-family:var(--mono);font-size:11px;letter-spacing:1.4px;color:var(--galaxy-mint)}
  .cg-hud .cg-score{color:var(--star-gold);font-size:14px;display:inline-flex;align-items:center;gap:5px}
  .cg-hud .cg-score b{font-weight:700;font-variant-numeric:tabular-nums;display:inline-block;transition:none}
  .cg-hud .cg-score b.pop{animation:cgPop .34s cubic-bezier(.3,1.6,.5,1)}
  @keyframes cgPop{0%{transform:scale(1)}38%{transform:scale(1.42);filter:brightness(1.5)}100%{transform:scale(1)}}
  .cg-hud .cg-title{flex:1;text-align:center;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cg-hud .cg-right{display:inline-flex;align-items:center;gap:8px}
  .cg-hud .cg-lives{color:#ff9db0;letter-spacing:1px}
  .cg-mute{width:26px;height:26px;border-radius:50%;flex:none;display:grid;place-items:center;
    background:rgba(255,255,255,.07);border:1px solid rgba(160,190,255,.22);font-size:12px;
    color:var(--ink-soft);cursor:pointer;transition:.2s;padding:0;line-height:1}
  .cg-mute:hover{background:rgba(255,255,255,.16);transform:scale(1.08)}
  .cg-mute.off{opacity:.45}
  .cg-toggle{padding:4px 10px;border-radius:999px;flex:none;font-family:var(--mono);
    font-size:10px;letter-spacing:1px;cursor:pointer;line-height:1.5;transition:.2s;
    background:rgba(255,255,255,.07);border:1px solid rgba(160,190,255,.22);color:var(--ink-mute)}
  .cg-toggle:hover{background:rgba(255,255,255,.16)}
  .cg-toggle.on{background:rgba(255,215,106,.9);border-color:var(--star-gold);color:#231603;font-weight:700}
  .cg-stage{position:relative;width:100%;border-radius:18px;overflow:hidden;
    border:1px solid rgba(150,180,255,.2);background:#0a1228;
    box-shadow:0 18px 50px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.04)}
  .cg-stage::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:18px;
    background:radial-gradient(ellipse at 50% 46%,transparent 52%,rgba(4,8,20,.5) 100%)}
  .cg-stage canvas{display:block;width:100%;height:auto;touch-action:none;cursor:pointer;
    outline:none;-webkit-tap-highlight-color:transparent}
  .cg-stage canvas:focus-visible{box-shadow:inset 0 0 0 2px rgba(255,215,106,.7)}
  .cg-msg{min-height:24px;font-family:var(--hand);font-size:17px;color:var(--star-gold);
    text-align:center;line-height:1.5;transition:opacity .2s}
  .cg-msg.flash{animation:cgFlash .4s ease-out}
  @keyframes cgFlash{0%{transform:scale(.8);opacity:0}40%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}
  .cg-tip{font-size:11px;color:var(--ink-mute);text-align:center;line-height:1.7;max-width:46ch}
  .cg-tip kbd{font-family:var(--mono);font-size:10px;padding:1px 5px;border-radius:5px;
    background:rgba(255,255,255,.09);border:1px solid rgba(160,190,255,.25);color:var(--ink-soft)}
  .cg-btn{padding:12px 30px;border-radius:999px;font-family:var(--hand);font-size:16px;
    background:linear-gradient(120deg,var(--star-gold),var(--star-warm));color:#231603;font-weight:600;
    box-shadow:0 8px 24px rgba(255,180,94,.35);transition:.2s;border:none;cursor:pointer}
  .cg-btn:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 14px 32px rgba(255,180,94,.5)}
  .cg-btn:active{transform:scale(.96)}
  .cg-overlay{position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;
    align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(18,32,68,.82),rgba(5,9,22,.93));
    backdrop-filter:blur(7px);z-index:6;text-align:center;padding:22px;animation:cgIn .34s ease-out}
  @keyframes cgIn{from{opacity:0}to{opacity:1}}
  .cg-overlay .big{font-family:var(--hand);font-size:29px;color:var(--cloud-white);line-height:1.35;
    text-shadow:0 0 28px rgba(140,245,216,.35);animation:cgRise .42s cubic-bezier(.25,1.4,.5,1)}
  @keyframes cgRise{from{transform:translateY(14px) scale(.94);opacity:0}to{transform:none;opacity:1}}
  .cg-overlay .stat{font-family:var(--mono);font-size:12px;color:var(--star-gold);letter-spacing:1.2px}
  .cg-overlay .sub2{font-size:12px;color:var(--ink-mute);line-height:1.7;max-width:34ch}
  .cg-paused{position:absolute;inset:0;display:grid;place-items:center;z-index:5;
    background:rgba(6,10,24,.6);backdrop-filter:blur(3px);font-family:var(--hand);
    font-size:20px;color:var(--ink-soft)}
  @media (prefers-reduced-motion:reduce){
    .cg-overlay,.cg-overlay .big,.cg-msg.flash,.cg-hud .cg-score b.pop{animation:none}
  }`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  FX.mount = function (host, cfg) {
    cfg = cfg || {};
    const W = cfg.w || 420, H = cfg.h || 400;
    if (host._cg) { try { host._cg.destroy(); } catch (e) { } }
    host.innerHTML = '';

    const wrap = el('div', 'cg-wrap');
    const hud = el('div', 'cg-hud');
    const scoreBox = el('span', 'cg-score', '★ <b>0</b>');
    const scoreNum = scoreBox.querySelector('b');
    const title = el('span', 'cg-title', cfg.title || '');
    const right = el('span', 'cg-right');
    const lives = el('span', 'cg-lives', '');
    const mute = el('button', 'cg-mute', A.muted ? '🔇' : '🔊');
    mute.setAttribute('aria-label', '音效开关');
    if (A.muted) mute.classList.add('off');
    right.append(lives, mute);
    hud.append(scoreBox, title, right);

    const stage = el('div', 'cg-stage');
    const cv = document.createElement('canvas');
    cv.tabIndex = 0;
    cv.setAttribute('role', 'application');
    cv.setAttribute('aria-label', (cfg.title || '小游戏') + ' 游戏画面');
    stage.appendChild(cv);
    const msg = el('div', 'cg-msg', '');
    const tip = el('div', 'cg-tip', cfg.tip || '');
    wrap.append(hud, stage, msg, tip);
    host.appendChild(wrap);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.aspectRatio = W + ' / ' + H;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const binds = [];
    const loops = [];
    let dead = false, paused = false;

    function on(target, ev, fn, opt) {
      target.addEventListener(ev, fn, opt);
      binds.push([target, ev, fn, opt]);
      return fn;
    }
    /* 键盘：只在游戏可见且未销毁时响应，并阻止方向键滚页 */
    function keys(map, o) {
      o = o || {};
      const kd = e => {
        if (dead || paused) return;
        const f = map[e.key]; if (!f) return;
        if (o.prevent !== false) e.preventDefault();
        f(e, true);
      };
      const ku = e => {
        if (dead) return;
        const f = (o.up || {})[e.key]; if (!f) return;
        e.preventDefault(); f(e, false);
      };
      on(window, 'keydown', kd);
      if (o.up) on(window, 'keyup', ku);
    }
    function pos(e) {
      const r = cv.getBoundingClientRect();
      const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0]) || e;
      return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height) };
    }
    /* 统一指针事件：mouse + touch 一次绑定 */
    function pointer(h) {
      if (h.down) {
        on(cv, 'mousedown', e => { A.resume(); cv.focus({ preventScroll: true }); h.down(pos(e), e); });
        on(cv, 'touchstart', e => { e.preventDefault(); A.resume(); h.down(pos(e), e); }, { passive: false });
      }
      if (h.move) {
        on(cv, 'mousemove', e => h.move(pos(e), e));
        on(cv, 'touchmove', e => { e.preventDefault(); h.move(pos(e), e); }, { passive: false });
      }
      if (h.up) {
        on(window, 'mouseup', e => h.up(pos(e), e));
        on(cv, 'touchend', e => { h.up(pos(e), e); });
        on(cv, 'touchcancel', e => { h.up(pos(e), e); });
      }
      if (h.right) on(cv, 'contextmenu', e => { e.preventDefault(); h.right(pos(e), e); });
    }

    let sc = 0;
    function setScore(v, silent) {
      sc = v; scoreNum.textContent = v;
      if (!silent) { scoreNum.classList.remove('pop'); void scoreNum.offsetWidth; scoreNum.classList.add('pop'); }
    }
    function addScore(d) { setScore(sc + d); return sc; }

    const api = {
      W, H, ctx, cv, stage, host, msgEl: msg, hudRight: right,
      fx: FX.particles(),
      sky: FX.sky(W, H, cfg.sky),
      get score() { return sc; },
      setScore, addScore,
      setLives(n, full) {
        lives.textContent = n > 0 ? '♥'.repeat(n) + (full && full > n ? '♡'.repeat(full - n) : '') : '—';
      },
      setRight(html) { lives.innerHTML = html; },
      /* 在 HUD 里插一个可切换的小按钮（如扫雷的插旗模式） */
      toggleBtn(label, onChange) {
        const b = el('button', 'cg-toggle', label);
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        let on = false;
        b.addEventListener('click', e => {
          e.stopPropagation();
          on = !on;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          S.click(); onChange && onChange(on);
        });
        right.insertBefore(b, mute);
        return {
          el: b,
          get on() { return on; },
          set(v) { on = !!v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
        };
      },
      say(text, flash) {
        msg.textContent = text || '';
        if (flash !== false && text) { msg.classList.remove('flash'); void msg.offsetWidth; msg.classList.add('flash'); }
      },
      on, keys, pos, pointer,
      overlay(o) {
        api.clearOverlay();
        const ov = el('div', 'cg-overlay');
        ov.append(el('div', 'big', o.big || ''));
        if (o.stat) ov.append(el('div', 'stat', o.stat));
        if (o.sub) ov.append(el('div', 'sub2', o.sub));
        if (o.btn) {
          const b = el('button', 'cg-btn', o.btn);
          const go = e => { if (e) e.stopPropagation(); A.resume(); S.start(); o.onBtn && o.onBtn(); };
          b.addEventListener('click', go);
          ov.append(b);
          setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) { } }, 30);
        }
        stage.appendChild(ov);
        return ov;
      },
      clearOverlay() { const o = stage.querySelector('.cg-overlay'); if (o) o.remove(); },
      /* dt 驱动的主循环。step(dt, time) */
      loop(step) {
        let raf = 0, last = 0, run = false, t = 0;
        const frame = now => {
          if (!run) return;
          let dt = (now - last) / 1000;
          last = now;
          if (!(dt > 0)) dt = 1 / 60;
          dt = Math.min(dt, 1 / 20);
          t += dt;
          try { step(dt, t) } catch (err) { run = false; console.error('[cloud-games]', err); return; }
          if (run) raf = requestAnimationFrame(frame);
        };
        const L = {
          start() { if (run || dead) return; run = true; last = performance.now(); raf = requestAnimationFrame(frame); },
          stop() { run = false; cancelAnimationFrame(raf); },
          get running() { return run; },
          get time() { return t; }
        };
        loops.push(L);
        return L;
      },
      pause() {
        if (paused || dead) return;
        paused = true;
        loops.forEach(l => { l._was = l.running; l.stop(); });
        api._holds && api._holds.forEach(h => h && h.stop && h.stop());
      },
      resume() {
        if (!paused || dead) return;
        paused = false;
        loops.forEach(l => { if (l._was) l.start(); });
      },
      get paused() { return paused; },
      destroy() {
        if (dead) return;
        dead = true;
        loops.forEach(l => l.stop());
        binds.forEach(([t, e, f, o]) => { try { t.removeEventListener(e, f, o) } catch (err) { } });
        binds.length = 0;
        api.fx.clear();
        api._holds && api._holds.forEach(h => h && h.stop && h.stop());
        if (host._cg === api) delete host._cg;
      },
      get dead() { return dead; }
    };
    api._holds = [];

    mute.addEventListener('click', e => {
      e.stopPropagation();
      A.resume();
      const m = A.toggle();
      mute.textContent = m ? '🔇' : '🔊';
      mute.classList.toggle('off', m);
      if (!m) S.tap();
    });
    on(document, 'visibilitychange', () => { if (document.hidden) api.pause(); else api.resume(); });
    /* 互动面板开合时由 cloud-dream.js 广播，避免面板关掉后游戏还在后台跑 */
    on(document, 'cg:pause', () => api.pause());
    on(document, 'cg:resume', () => { if (!document.hidden) api.resume(); });

    host._cg = api;
    return api;
  };
})();
