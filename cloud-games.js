/* 云朵家族 · 经典小游戏引擎 (cloud-games.js)
   9 个经典玩法原型，云主题包装。骨架 / 音效 / 粒子由 cloud-fx.js 提供，
   本文件只写玩法。已迁移到 CloudFX.mount 的游戏见各自注释。 */
(function () {
  const FX = window.CloudFX;
  if (!FX) { console.error('[cloud-games] 需要先加载 cloud-fx.js'); return; }
  const S = FX.sfx;

  window.CloudGames = {};

  /* ======== 1. weather 云滴滴 · 打砖块 ========
     已迁移到 CloudFX：dt 驱动 + 发球等待 + 按列升调 + 挡板表情。 */
  CloudGames.weather = function (host) {
    const g = FX.mount(host, {
      w: 420, h: 404, title: '星光打砖块',
      tip: '拖动或 <kbd>←</kbd><kbd>→</kbd> 移动云朵 · <kbd>空格</kbd> 发球 · 用挡板边缘可以改变角度',
      sky: { top: '#10294f', bottom: '#070d20', nx: .22, ny: .14, glow: 'rgba(120,180,255,.18)' }
    });
    const { W, H, ctx } = g;
    const ROWS = 4, COLS = 7, BW = 48, BH = 18, BGAP = 8;
    const PADY = H - 40, PADW = 76, LIVES = 3;
    const SPD0 = 268, SPD_MAX = 430, R = 8;
    const HUES = ['#ff9db0', '#ffd76a', '#7ff5d8', '#8fb8ff'];
    const ART = FX.sprites({ hero: './assets/cloud-items/hero-weather.webp' });

    let px, tx, ball, bricks, lives, playing, held, combo, L;

    function build() {
      bricks = [];
      const ox = (W - (COLS * BW + (COLS - 1) * (BGAP - 2))) / 2;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          bricks.push({
            x: ox + c * (BW + BGAP - 2), y: 44 + r * (BH + 8),
            w: BW, h: BH, on: true, hue: HUES[r], row: r
          });
    }

    function park() {
      held = true;
      ball = { x: px, y: PADY - 20, vx: 0, vy: 0 };
    }

    function reset() {
      px = tx = W / 2; build(); lives = LIVES; playing = true; combo = 0;
      g.setScore(0, true); g.setLives(LIVES, LIVES); g.say('按空格或点一下发球');
      g.fx.clear(); g.clearOverlay(); park(); L.start();
    }

    function launch() {
      if (!playing || !held || g.paused) return;
      held = false; combo = 0;
      const a = FX.rnd(-.5, .5) - Math.PI / 2;
      ball.vx = Math.cos(a) * SPD0; ball.vy = Math.sin(a) * SPD0;
      S.whoosh(); g.say('');
    }

    function speedUp(k) {
      const s = Math.hypot(ball.vx, ball.vy);
      const n = Math.min(SPD_MAX, s * k);
      ball.vx = ball.vx / s * n; ball.vy = ball.vy / s * n;
    }

    function finish(win) {
      playing = false; L.stop();
      if (win) {
        S.win();
        g.overlay({
          big: '满天星都亮了！', stat: '★ ' + g.score,
          sub: '剩下 ' + lives + ' 颗心 · 连续击中不落地能拿连击加成',
          btn: '再玩一次', onBtn: reset
        });
      } else {
        S.lose();
        const litP = Math.round((1 - bricks.filter(b => b.on).length / (ROWS * COLS)) * 100);
        g.overlay({
          big: '星星落地啦', stat: '★ ' + g.score,
          sub: '点亮了 ' + litP + '% 的夜空 · 用挡板边缘接球能打出更斜的角度',
          btn: '再来一次', onBtn: reset
        });
      }
    }

    function step(dt, time) {
      px += (tx - px) * Math.min(1, dt * 16);

      if (held) {
        ball.x = px; ball.y = PADY - 20;
      } else if (playing) {
        // 分两步积分，避免高速穿砖
        for (let s = 0; s < 2; s++) {
          const h = dt / 2;
          ball.x += ball.vx * h; ball.y += ball.vy * h;

          if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); S.click(); }
          if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); S.click(); }
          if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); S.click(); }

          // 挡板
          if (ball.vy > 0 && ball.y > PADY - 14 && ball.y < PADY + 10 && Math.abs(ball.x - px) < PADW / 2 + R) {
            const off = FX.clamp((ball.x - px) / (PADW / 2), -1, 1);
            const spd = Math.hypot(ball.vx, ball.vy);
            const a = -Math.PI / 2 + off * 1.05;
            ball.vx = Math.cos(a) * spd; ball.vy = Math.sin(a) * spd;
            ball.y = PADY - 14;
            combo = 0;
            S.tap();
            g.fx.burst(ball.x, PADY - 12, { n: 5, c: '#cfe4ff', ang: -Math.PI / 2, spread: 1.4, sp: 90, life: .3, r: 2 });
          }

          // 砖块
          for (const b of bricks) {
            if (!b.on) continue;
            if (ball.x + R < b.x || ball.x - R > b.x + b.w || ball.y + R < b.y || ball.y - R > b.y + b.h) continue;
            b.on = false;
            // 按重叠深度决定反弹轴
            const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            const ox = (b.w / 2 + R) - Math.abs(ball.x - cx);
            const oy = (b.h / 2 + R) - Math.abs(ball.y - cy);
            if (ox < oy) ball.vx = ball.x < cx ? -Math.abs(ball.vx) : Math.abs(ball.vx);
            else ball.vy = ball.y < cy ? -Math.abs(ball.vy) : Math.abs(ball.vy);

            combo++;
            const pts = 10 * (ROWS - b.row) + (combo > 1 ? combo * 4 : 0);
            g.addScore(pts);
            S.hit(ROWS - b.row + combo);
            g.fx.burst(cx, cy, { n: 12, c: [b.hue, '#ffffff'], sp: 150, life: .45, r: 3, g: 160 });
            g.fx.ring(cx, cy, { r: 6, r2: 34, c: b.hue, life: .35 });
            if (combo >= 3) g.fx.text(cx, cy - 12, '×' + combo, b.hue, 15);
            speedUp(1.012);
            break;
          }
        }

        g.fx.trail(ball.x, ball.y, { c: '#fff2c8', r: 2.6, life: .3 });

        if (ball.y > H + 16) {
          lives--; g.setLives(lives, LIVES);
          S.thud(); g.fx.shake(7, .3);
          if (lives <= 0) { finish(false); return; }
          g.say('还剩 ' + lives + ' 颗心');
          park();
        }
        if (!bricks.some(b => b.on)) { finish(true); return; }
      }

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .3);

      for (const b of bricks) {
        if (!b.on) continue;
        ctx.save();
        ctx.fillStyle = b.hue; ctx.shadowColor = b.hue; ctx.shadowBlur = 10;
        FX.roundRect(ctx, b.x, b.y, b.w, b.h, 9); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        FX.roundRect(ctx, b.x + 4, b.y + 3, b.w - 8, 4, 2); ctx.fill();
        ctx.restore();
      }

      FX.glow(ctx, ball.x, ball.y, 22, '#fff2c8', .35);
      FX.star(ctx, ball.x, ball.y, R, '#fff2c8', 14, time * 3);

      // 云滴滴本人当挡板。素材是方图，按外接圆铺开时半径取挡板半宽
      FX.sprite(ctx, ART.hero, px, PADY + 4, PADW * .58, {
        squash: 1 + FX.clamp((tx - px) * .002, -.06, .06),
        rot: FX.clamp((tx - px) * .003, -.14, .14),
        glow: '#8fb8ff', glowA: held ? .38 : .22,
        fb: (c, x, y, r) => FX.cloud(c, x, y, PADW, {
          mood: held ? 'ooo' : 'happy',
          squash: 1 + FX.clamp((tx - px) * .002, -.06, .06)
        })
      });

      g.fx.draw(ctx);
      g.fx.end(ctx);
    }

    L = g.loop(step);
    g.pointer({
      move: p => { tx = FX.clamp(p.x, PADW / 2, W - PADW / 2); },
      down: p => { tx = FX.clamp(p.x, PADW / 2, W - PADW / 2); launch(); }
    });
    g.keys({
      ArrowLeft: () => { tx = FX.clamp(tx - 40, PADW / 2, W - PADW / 2); },
      ArrowRight: () => { tx = FX.clamp(tx + 40, PADW / 2, W - PADW / 2); },
      ' ': launch, Enter: launch
    });

    g.overlay({
      big: '星光打砖块', stat: '接住星星 · 敲亮乌云',
      sub: '移动云朵托住小星星。越靠上的砖分越高，不落地连击还有加成',
      btn: '开始', onBtn: reset
    });
    return g;
  };

  /* ======== 2. painter 云小画 · Flappy 穿云 ========
     已迁移到 CloudFX：dt 驱动 + 彩虹拖尾 + 穿缝升调 + 缝隙随分数收窄。 */
  CloudGames.painter = function (host) {
    const g = FX.mount(host, {
      w: 420, h: 436, title: '画笔飞行',
      tip: '<kbd>点击</kbd> 或 <kbd>空格</kbd> 让画笔向上飞 · 从云缝中间穿过去',
      sky: { top: '#123a52', bottom: '#070f20', nx: .78, ny: .18, glow: 'rgba(120,240,220,.18)' }
    });
    const { W, H, ctx } = g;
    const PX = 96, GRAV = 1180, JUMP = -336, SPD0 = 132, PW = 48;
    const INK = ['#ffd76a', '#7ff5d8', '#ff9db0', '#e0a8ff', '#8fb8ff'];
    const ART = FX.sprites({ hero: './assets/cloud-items/hero-painter.webp' });

    let y, vy, pipes, playing, spawnT, speed, trailT, hue, started, L;

    function reset() {
      y = H * .42; vy = 0; pipes = []; playing = true;
      spawnT = .9; speed = SPD0; trailT = 0; hue = 0; started = false;
      g.setScore(0, true); g.setRight(''); g.say('点一下起飞');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function flap() {
      if (!playing || g.paused) return;
      started = true; vy = JUMP;
      S.whoosh();
      g.fx.burst(PX - 14, y + 10, { n: 5, c: INK[hue % INK.length], sp: 90, ang: 2.4, spread: 1.2, life: .35, r: 2.5, g: 60 });
    }

    function die() {
      playing = false; L.stop(); S.bad(); S.lose();
      g.fx.shake(10, .4);
      g.fx.burst(PX, y, { n: 26, c: INK, sp: 210, life: .7, r: 4 });
      g.overlay({
        big: '画笔掉下来啦', stat: '穿过 ' + g.score + ' 道云缝',
        sub: '别急着连点，让它自己滑一会儿更好控制',
        btn: '再飞一次', onBtn: reset
      });
    }

    function step(dt, time) {
      if (started) { vy += GRAV * dt; y += vy * dt; }
      else { y = H * .42 + Math.sin(time * 2.2) * 7; }

      if (playing && started) {
        speed = SPD0 + Math.min(78, g.score * 3.4);
        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = (W * .62) / speed;
          const gap = Math.max(104, 150 - g.score * 2.2);
          pipes.push({ x: W + PW, top: FX.rnd(46, H - gap - 56), gap, passed: false });
        }
        for (const p of pipes) p.x -= speed * dt;
        pipes = pipes.filter(p => p.x > -PW - 10);

        // 拖尾
        trailT -= dt;
        if (trailT <= 0) {
          trailT = .022;
          g.fx.trail(PX - 16, y + 8, { c: INK[hue % INK.length], r: 3.4, life: .5 });
        }

        let hit = y < 10 || y > H - 10;
        for (const p of pipes) {
          if (PX + 13 > p.x && PX - 15 < p.x + PW && (y - 12 < p.top || y + 12 > p.top + p.gap)) hit = true;
          if (!p.passed && p.x + PW < PX - 15) {
            p.passed = true; hue++;
            g.addScore(1); S.note(Math.min(8, g.score));
            g.fx.ring(PX, y, { r: 10, r2: 52, c: INK[hue % INK.length], life: .4 });
            if (g.score % 5 === 0) g.say('画了 ' + g.score + ' 道彩虹！');
          }
        }
        if (hit) { die(); return; }
      }

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .3);

      for (const p of pipes) {
        const c = p.passed ? 'rgba(127,245,216,.4)' : 'rgba(150,190,255,.5)';
        drawPipe(p.x, 0, p.top, c);
        drawPipe(p.x, p.top + p.gap, H - p.top - p.gap, c);
      }

      // 云小画本人举着画笔飞，机头随速度上下摆
      const tilt = FX.clamp(vy * .0011, -.45, .95);
      FX.sprite(ctx, ART.hero, PX, y, 21, {
        rot: tilt, glow: INK[hue % INK.length], glowA: .26,
        fb(c, x, y2, r) {
          c.save();
          c.translate(x, y2); c.rotate(tilt);
          c.strokeStyle = '#d8c9ff'; c.lineWidth = 5; c.lineCap = 'round';
          c.beginPath(); c.moveTo(-19, 9); c.lineTo(6, -6); c.stroke();
          c.strokeStyle = INK[hue % INK.length]; c.lineWidth = 5;
          c.beginPath(); c.moveTo(-19, 9); c.lineTo(-11, 4); c.stroke();
          FX.star(c, 11, -11, 8, '#ffd76a', 14, time * 2);
          c.restore();
        }
      });

      g.fx.draw(ctx);
      g.fx.end(ctx);
    }

    function drawPipe(x, top, h, c) {
      if (h <= 0) return;
      ctx.save();
      ctx.fillStyle = c; ctx.shadowColor = 'rgba(150,190,255,.45)'; ctx.shadowBlur = 14;
      FX.roundRect(ctx, x, top, PW, h, PW / 2);
      ctx.fill();
      ctx.restore();
    }

    L = g.loop(step);
    g.pointer({ down: flap });
    g.keys({ ' ': flap, Enter: flap, ArrowUp: flap });

    g.overlay({
      big: '画笔飞行', stat: '穿过云缝 · 画出彩虹',
      sub: '点击或空格让画笔向上飞。穿得越多，云缝越窄',
      btn: '开始', onBtn: reset
    });
    return g;
  };

  /* ======== 3. singer 云音音 · 节奏大师 ========
     已迁移到 CloudFX：固定 BPM 谱面（不再随机撒音符）+ 判定分级 + 连击升调 +
     每小节踩拍的呼吸律动。音符按"到达判定线的时刻"定义，所以掉帧也不会跑掉。
     手感取向：这是个哄人开心的游戏，不是打榜的音游 —— 判定给得宽，按空拍不罚，
     难度靠四轮逐步加密来爬，而不是一上来就满谱。 */
  CloudGames.singer = function (host) {
    const g = FX.mount(host, {
      w: 420, h: 436, title: '星星节奏',
      tip: '星星落到判定线时按 <kbd>D</kbd><kbd>F</kbd><kbd>J</kbd><kbd>K</kbd>（也可用 <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>F</kbd> 或方向键）· 手机直接点轨道',
      sky: { top: '#2a1840', bottom: '#0a0718', nx: .5, ny: .12, glow: 'rgba(224,168,255,.20)' }
    });
    const { W, H, ctx } = g;
    /* 轨道标签用字母而不是箭头。方向键 ←↓↑→ 是个倒 T 形，↓ 和 ↑ 在物理上
       是上下叠着的，映射到左右相邻的两条轨道时手指得做反直觉的移动。
       DFJK 是四个并排的键，跟四条轨道一一对上。方向键仍然能用。 */
    const LANES = ['D', 'F', 'J', 'K'];
    const LX = i => 78 + i * 88, LY = H - 96;
    const BPM = 84, BEAT = 60 / BPM, LEAD = 2.4;   // 音符从顶部落到判定线要 LEAD 秒
    const PERFECT = .11, GOOD = .22;               // 判定窗口（秒）
    const ART = FX.sprites({ hero: './assets/cloud-items/hero-singer.webp' });

    /* 谱面：[拍号, 轨道]。BASE 全是正拍，OFF 是切分的半拍。
       第 1 轮只走一半正拍让人先摸清节奏，之后逐轮加密。 */
    const BASE = [
      [0, 0], [1, 2], [2, 3], [3, 1],
      [4, 0], [5, 2], [6, 3], [7, 2],
      [8, 1], [9, 3], [10, 0], [11, 3],
      [12, 2], [13, 0], [14, 1], [15, 0]
    ];
    const OFF = [[4.5, 1], [10.5, 2], [14.5, 3], [15.5, 2]];
    const BARS = 16, ROUNDS = 4;
    /* 空一小节再出音符：伴奏先起，让人听清拍子再上手。
       用整小节而不是随便一个秒数，音符才会正好落在拍上。 */
    const LEAD_IN = 4;   // 单位是拍

    let notes, playing, combo, maxCombo, hits, perfect, misses, total,
      ended, nextBeat, L;

    function build() {
      notes = [];
      for (let r = 0; r < ROUNDS; r++) {
        // 第 1 轮隔一个放一个，第 2 轮起铺满正拍，第 3 轮起加切分
        const base = r === 0 ? BASE.filter((_, i) => i % 2 === 0) : BASE;
        const off = r >= 3 ? OFF : r === 2 ? OFF.slice(0, 2) : [];
        for (const [b, lane] of base.concat(off))
          notes.push({ t: (r * BARS + b + LEAD_IN) * BEAT, lane, done: 0 });
      }
      notes.sort((a, b) => a.t - b.t);
      total = notes.length;
    }

    /* ---- 伴奏 ----
       C - Am - F - G 四小节循环，全部实时合成，没有外部音频文件。
       跟音符共用同一条时间轴（拍号 × BEAT），所以永远不会跑拍。
       每帧只往前排 LOOKAHEAD 秒的音：暂停时 step 停了，排音也就停了，
       最多拖一个不到 0.3 秒的尾巴自然收掉。 */
    const AU = FX.audio;
    const LOOKAHEAD = .26;
    const ROOT = [130.81, 110.00, 87.31, 98.00];    // C3 A2 F2 G2
    const FIFTH = [196.00, 164.81, 130.81, 146.83]; // G3 E3 C3 D3
    // 空五度的和声垫，不带三音，跟五声音阶的旋律怎么撞都不会难听
    const PAD = [[261.63, 392.00], [220.00, 329.63], [174.61, 261.63], [196.00, 293.66]];

    function scheduleBeat(i, now) {
      const d = i * BEAT - now;             // 距离现在还有多久
      if (d < 0) return;
      const bar = ((i / 4) | 0) % 4, b = i % 4;
      // 跟谱面的难度爬坡对齐：轮次越往后，伴奏的层次也越厚
      const round = Math.floor((i - LEAD_IN) / BARS);

      // 底鼓：一、三拍
      if (b === 0 || b === 2)
        AU.tone({ freq: 110, to: 46, dur: .19, gain: .2, type: 'sine', delay: d, wet: .12 });

      // 贝斯：一拍根音，三拍五度
      if (b === 0)
        AU.tone({ freq: ROOT[bar], dur: BEAT * 1.7, gain: .1, type: 'triangle', delay: d, filter: 620, wet: .2 });
      if (b === 2)
        AU.tone({ freq: FIFTH[bar], dur: BEAT * .9, gain: .075, type: 'triangle', delay: d, filter: 620, wet: .2 });

      // 和声垫：每小节头，铺满整个小节
      if (b === 0)
        for (const f of PAD[bar])
          AU.tone({ freq: f, dur: BEAT * 3.6, gain: .045, type: 'sine', atk: .16, delay: d, wet: .85 });

      // 沙锤：八分音符，反拍轻一点。第一轮先不加，让开场干净些
      if (round >= 1) {
        AU.noise({ freq: 6200, dur: .028, gain: .035, q: .9, delay: d, wet: .3 });
        AU.noise({ freq: 6200, dur: .022, gain: .018, q: .9, delay: d + BEAT / 2, wet: .3 });
      }

      // 军鼓：二、四拍，后半段才进来
      if (round >= 2 && (b === 1 || b === 3))
        AU.noise({ freq: 1900, to: 700, dur: .11, gain: .075, q: .7, delay: d, wet: .35 });
    }

    /* 把 time 之前（含 LOOKAHEAD 窗口内）该响的拍子都排掉 */
    function scheduleMusic(time) {
      while (nextBeat * BEAT < time + LOOKAHEAD) {
        scheduleBeat(nextBeat, time);
        nextBeat++;
      }
    }

    function reset() {
      build(); playing = true; combo = 0; maxCombo = 0;
      hits = 0; perfect = 0; misses = 0; ended = false;
      nextBeat = 0;
      AU.resume();   // 从按钮点击进来的，正好是解锁 AudioContext 的用户手势
      g.setScore(0, true); g.setRight('♪ 0'); g.say('跟着拍子来');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function judge(lane) {
      if (!playing || g.paused) return;
      const now = L.time;
      let best = null, bd = 1e9;
      for (const n of notes) {
        if (n.lane !== lane || n.done) continue;
        const d = Math.abs(n.t - now);
        if (d < bd) { bd = d; best = n; }
      }
      /* 按空拍只是没声儿，不断连击 —— 断连击的惩罚留给"漏掉音符"。
         两头都罚的话，手生的人会陷入"越慌越乱按、越乱按越断"的螺旋。 */
      if (!best || bd > GOOD) {
        S.click();
        g.fx.burst(LX(lane), LY, { n: 4, c: '#8a7fb5', sp: 60, life: .3, r: 2 });
        return;
      }
      best.done = 1;
      hits++; combo++; maxCombo = Math.max(maxCombo, combo);
      g.setRight('♪ ' + combo);
      const isP = bd <= PERFECT;
      if (isP) perfect++;
      const pts = (isP ? 100 : 55) + Math.min(60, combo * 3);
      g.addScore(pts);
      S.note(Math.min(9, 1 + combo % 8), isP ? .2 : .14);
      g.say(isP ? 'Perfect!' : 'Good');
      g.fx.ring(LX(lane), LY, { r: 10, r2: isP ? 52 : 34, c: isP ? '#ffd76a' : '#7ff5d8', life: .42 });
      g.fx.burst(LX(lane), LY, {
        n: isP ? 16 : 9, c: isP ? ['#ffd76a', '#fff', '#ffe9a8'] : ['#7ff5d8', '#cfe4ff'],
        sp: isP ? 165 : 110, life: .5, r: 3
      });
      if (isP) g.fx.text(LX(lane), LY - 26, '+' + pts, '#ffd76a', 16);
      if (combo && combo % 10 === 0) {
        g.fx.shake(3, .18);
        g.say('连击 ' + combo + '！');
      }
    }

    function finish() {
      ended = true; playing = false; L.stop();
      const acc = hits ? Math.round(hits / total * 100) : 0;
      const rank = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C';
      S.win();
      g.overlay({
        big: acc >= 85 ? '演唱会圆满成功！' : '这一首唱完啦',
        stat: '★ ' + g.score + ' · 评级 ' + rank,
        sub: `命中 ${hits}/${total}（Perfect ${perfect}）· 最高连击 ${maxCombo}`,
        btn: '再来一首', onBtn: reset
      });
    }

    function step(dt, time) {
      // 伴奏：只在游戏进行中往前排，暂停或结算后自然停
      if (playing) scheduleMusic(time);

      // 漏掉的音符
      if (playing) {
        for (const n of notes) {
          if (!n.done && time - n.t > GOOD) {
            n.done = 2; misses++; combo = 0; g.setRight('♪ 0');
            g.say('Miss');
          }
        }
        if (notes.every(n => n.done) || time > notes[notes.length - 1].t + 1.4) { finish(); return; }
      }

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .3);

      const beat = time / BEAT, pulse = 1 - (beat % 1);   // 每拍一次的脉冲

      // 轨道
      for (let i = 0; i < 4; i++) {
        const x = LX(i);
        const grd = ctx.createLinearGradient(0, 0, 0, LY);
        grd.addColorStop(0, 'rgba(150,180,255,0)');
        grd.addColorStop(1, 'rgba(150,180,255,.14)');
        ctx.fillStyle = grd; ctx.fillRect(x - 30, 0, 60, LY);
        ctx.strokeStyle = 'rgba(150,180,255,.16)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x - 30, LY); ctx.stroke();
      }

      // 判定线：踩拍时亮一下
      ctx.save();
      ctx.strokeStyle = `rgba(127,245,216,${(.45 + pulse * .45).toFixed(3)})`;
      ctx.lineWidth = 2 + pulse * 1.5;
      ctx.shadowColor = '#7ff5d8'; ctx.shadowBlur = 8 + pulse * 14;
      ctx.beginPath(); ctx.moveTo(24, LY); ctx.lineTo(W - 24, LY); ctx.stroke();
      ctx.restore();

      // 音符：位置由"还差多久到判定线"算出，掉帧也不跑拍
      for (const n of notes) {
        if (n.done) continue;
        const left = n.t - time;
        if (left > LEAD || left < -GOOD - .1) continue;
        const y = LY - (left / LEAD) * LY;
        const near = FX.clamp(1 - Math.abs(left) / .3, 0, 1);
        FX.glow(ctx, LX(n.lane), y, 20 + near * 12, '#ffd76a', .22 + near * .3);
        FX.star(ctx, LX(n.lane), y, 11 + near * 2.5, '#ffd76a', 14, time * 2 + n.lane);
      }

      // 判定圈 + 键位
      for (let i = 0; i < 4; i++) {
        const x = LX(i);
        ctx.save();
        ctx.strokeStyle = `rgba(255,215,106,${(.35 + pulse * .3).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, LY, 15 + pulse * 2, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(207,214,245,.75)';
        ctx.font = '13px ui-monospace,monospace'; ctx.textAlign = 'center';
        ctx.fillText(LANES[i], x, LY + 34);
        ctx.restore();
      }

      // 云音音：跟着拍子上下呼吸，连击高时张嘴唱
      const by = 34 + Math.sin(beat * Math.PI) * 3;
      FX.sprite(ctx, ART.hero, W / 2, by, 30, {
        squash: 1 + pulse * .05,
        rot: Math.sin(time * 1.4) * .06,
        glow: '#e0a8ff', glowA: .22,
        fb: (c, x, y, r) => FX.cloud(c, x, y, r * 1.5, {
          mood: combo > 6 ? 'ooo' : 'happy', squash: 1 + pulse * .06
        })
      });

      g.fx.draw(ctx);
      g.fx.end(ctx);

      // 进度条
      if (playing) {
        const last = notes[notes.length - 1].t;
        ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(24, H - 14, W - 48, 4);
        ctx.fillStyle = 'rgba(224,168,255,.8)';
        ctx.fillRect(24, H - 14, (W - 48) * FX.clamp(time / last, 0, 1), 4);
      }
    }

    L = g.loop(step);
    /* 三套键位都收：DFJK（推荐，两手食指中指各管一边）、ASDF（左手四指）、
       方向键（老习惯）。大小写都认 —— 只绑小写的话开了大写锁定就没反应。 */
    const KEYMAP = {
      ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3,
      d: 0, f: 1, j: 2, k: 3,
      a: 0, s: 1
    };
    const keyBinds = {};
    for (const k in KEYMAP) {
      const lane = KEYMAP[k];
      keyBinds[k] = () => judge(lane);
      if (k.length === 1) keyBinds[k.toUpperCase()] = () => judge(lane);
    }
    g.keys(keyBinds);
    g.pointer({ down: p => { const i = Math.round((p.x - 78) / 88); if (i >= 0 && i < 4) judge(i); } });

    g.overlay({
      big: '星星节奏', stat: '84 BPM · 4 轮，一轮比一轮密',
      sub: '星星落到青色判定线时按对应的键：D F J K 从左到右各管一条轨道。' +
        '按空了不扣连击，放心跟着拍子来',
      btn: '开始演奏', onBtn: reset
    });
    return g;
  };

  /* ======== 4. baker 云小厨 · 合成大西瓜 ========
     已迁移到 CloudFX：dt 驱动物理 + 合成连锁音效 + 溢出预警。 */
  CloudGames.baker = function (host) {
    const g = FX.mount(host, {
      w: 400, h: 452, title: '云朵合成',
      tip: '移动选位置，<kbd>点击</kbd> 或 <kbd>空格</kbd> 投放 · 两个相同的甜点会合成更大的',
      sky: { top: '#2b1d42', bottom: '#0c0a1e', nx: .5, ny: .16, glow: 'rgba(255,170,205,.20)' }
    });
    const { W, H, ctx } = g;

    const TIERS = [
      { r: 15, c: '#fff2f8', n: '糖霜', s: 'baker-t0-sugar' },
      { r: 21, c: '#ffd76a', n: '曲奇', s: 'baker-t1-cookie' },
      { r: 28, c: '#ffb45e', n: '蛋糕', s: 'baker-t2-cake' },
      { r: 37, c: '#ff9db0', n: '甜圈', s: 'baker-t3-donut' },
      { r: 48, c: '#e0a8ff', n: '布丁', s: 'baker-t4-pudding' },
      { r: 62, c: '#8ff5d8', n: '云朵蛋糕', s: 'baker-t5-cloudcake' }
    ];
    // 手绘甜点素材；没加载好时回退到色块圆
    const ART = FX.sprites(TIERS.reduce((m, T) => (m[T.s] = './assets/cloud-items/' + T.s + '.webp', m), {
      hero: './assets/cloud-items/hero-baker.webp'
    }));
    const LIP = 18, FLOOR = H - 12, DANGER = 66, DROPY = 34;
    const GRAV = 1500, BOUNCE = .22, DAMP = .86, OVERFLOW = 2.2;

    let items, dropX, next, playing, cool, combo, comboT, danger, warned, top, reached, L;

    function reset() {
      items = []; dropX = W / 2; next = FX.rndi(0, 2); playing = true;
      cool = 0; combo = 0; comboT = 0; danger = 0; warned = false; top = 0; reached = false;
      g.setScore(0, true); g.setRight('🥮 糖霜'); g.say('');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function drop() {
      if (!playing || cool > 0 || g.paused) return;
      const t = next, r = TIERS[t].r;
      items.push({ x: FX.clamp(dropX, LIP + r, W - LIP - r), y: DROPY, vx: 0, vy: 0, t, rest: 0, rot: FX.rnd(-.12, .12) });
      next = FX.rndi(0, 2); cool = .26;
      S.tap();
      g.fx.burst(dropX, DROPY, { n: 5, c: TIERS[t].c, sp: 60, life: .3, r: 2, g: 80 });
    }

    function merge(a, b, i, j) {
      const nt = a.t + 1, T = TIERS[nt];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      items.splice(j, 1); items.splice(i, 1);
      items.push({ x: mx, y: my, vx: (a.vx + b.vx) * .5, vy: -130, t: nt, rest: 0, rot: FX.rnd(-.1, .1), pop: .3 });

      combo++; comboT = 1.6;
      const pts = (nt + 1) * 15 * combo;
      g.addScore(pts);
      if (nt > top) { top = nt; g.setRight('🥮 ' + T.n); }

      S.pop(nt);
      if (combo > 1) S.note(combo);
      g.fx.ring(mx, my, { r: T.r * .5, r2: T.r * 2.4, c: T.c, life: .5 });
      g.fx.burst(mx, my, { n: 16, c: [T.c, '#ffffff', '#ffd76a'], sp: 150, life: .5, r: 3, g: 220 });
      g.fx.text(mx, my - T.r - 10, '+' + pts, T.c, 18);
      g.fx.shake(nt >= 3 ? 7 : 3.5, .22);
      g.say(combo > 1 ? `连锁 ×${combo} · 「${T.n}」！` : `合成了「${T.n}」`);
      warned = false;

      if (nt === TIERS.length - 1 && !reached) celebrate(T);
    }

    function celebrate(T) {
      reached = true; L.stop(); S.win();
      g.overlay({
        big: '云朵蛋糕出炉了！', stat: '★ ' + g.score,
        sub: '闻到了吗？这是幸福发酵的味道。还能继续叠，看看能堆多高',
        btn: '继续烘焙', onBtn: () => { g.clearOverlay(); L.start(); }
      });
    }

    function lose() {
      playing = false; L.stop(); S.lose();
      g.overlay({
        big: '烤盘塞满啦', stat: '★ ' + g.score,
        sub: reached ? '云朵蛋糕已经烤出来过一次了，下次试试连锁合成' : '把相同的甜点叠到一起就能合成更大的',
        btn: '再烤一盘', onBtn: reset
      });
    }

    function step(dt, time) {
      if (cool > 0) cool -= dt;
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

      // 物理积分
      for (const it of items) {
        const r = TIERS[it.t].r;
        if (it.pop > 0) it.pop = Math.max(0, it.pop - dt);
        it.vy += GRAV * dt;
        it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.y > FLOOR - r) {
          if (it.vy > 430) {
            S.thud();
            g.fx.burst(it.x, FLOOR - 2, { n: 4, c: TIERS[it.t].c, ang: -Math.PI / 2, spread: 1.5, sp: 80, life: .3, r: 2 });
          }
          it.y = FLOOR - r; it.vy *= -BOUNCE; it.vx *= DAMP;
          if (Math.abs(it.vy) < 30) it.vy = 0;
        }
        if (it.x < LIP + r) { it.x = LIP + r; it.vx = Math.abs(it.vx) * BOUNCE; }
        if (it.x > W - LIP - r) { it.x = W - LIP - r; it.vx = -Math.abs(it.vx) * BOUNCE; }
        it.vx *= Math.pow(.995, dt * 60);
      }

      // 碰撞：同级合成，否则按半径加权分离
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          const ra = TIERS[a.t].r, rb = TIERS[b.t].r;
          const d = FX.dist(a.x, a.y, b.x, b.y);
          if (d >= ra + rb - 1) continue;
          if (a.t === b.t && a.t < TIERS.length - 1) { merge(a, b, i, j); i--; break; }
          const nx = (b.x - a.x) / (d || 1), ny = (b.y - a.y) / (d || 1);
          const ov = (ra + rb - d) / 2, ma = ra * ra, mb = rb * rb, mt = ma + mb;
          a.x -= nx * ov * 2 * (mb / mt); a.y -= ny * ov * 2 * (mb / mt);
          b.x += nx * ov * 2 * (ma / mt); b.y += ny * ov * 2 * (ma / mt);
          const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rvn < 0) {
            const imp = rvn * .5;
            a.vx += nx * imp; a.vy += ny * imp;
            b.vx -= nx * imp; b.vy -= ny * imp;
          }
        }
      }

      // 静止判定 → 溢出预警
      let over = false;
      for (const it of items) {
        if (Math.abs(it.vy) < 26 && Math.abs(it.vx) < 26) it.rest += dt; else it.rest = 0;
        if (it.rest > .5 && it.y - TIERS[it.t].r < DANGER) over = true;
      }
      if (over) {
        danger += dt;
        if (!warned) { warned = true; g.say('小心！快溢出烤盘了'); }
      } else {
        if (warned && danger <= 0) warned = false;
        danger = Math.max(0, danger - dt * 2);
      }
      if (danger >= OVERFLOW) { lose(); return; }

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .35);

      // 烤盘
      ctx.save();
      ctx.strokeStyle = 'rgba(255,214,160,.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(LIP, DANGER - 12); ctx.lineTo(LIP, FLOOR);
      ctx.lineTo(W - LIP, FLOOR); ctx.lineTo(W - LIP, DANGER - 12);
      ctx.stroke();
      ctx.restore();

      // 溢出线：预警时闪烁
      const dk = danger > 0 ? .3 + .5 * Math.abs(Math.sin(time * 6)) : .16;
      ctx.save();
      ctx.setLineDash([7, 7]); ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(255,140,170,${dk.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(LIP, DANGER); ctx.lineTo(W - LIP, DANGER); ctx.stroke();
      ctx.restore();

      // 刚合成的甜点弹一下（pop 从 .3 衰减到 0）
      for (const it of items) {
        const k = it.pop > 0 ? 1 + Math.sin((1 - it.pop / .3) * Math.PI) * .22 : 1;
        drawTier(it.t, it.x, it.y, k, it.rot);
      }

      // 投放引导线 + 下一个预览
      if (playing) {
        const nt = TIERS[next], gx = FX.clamp(dropX, LIP + nt.r, W - LIP - nt.r);
        ctx.save();
        ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath(); ctx.moveTo(gx, DROPY + nt.r); ctx.lineTo(gx, FLOOR); ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = cool > 0 ? .3 : .8;
        drawTier(next, gx, DROPY, 1, Math.sin(time * 1.6) * .1);
        ctx.restore();

        // 云小厨跟着投放位置走，冷却中身子沉一下
        FX.sprite(ctx, ART.hero, gx, DROPY - nt.r - 20, 19, {
          squash: cool > 0 ? 1.07 : 1 + Math.sin(time * 2.2) * .03,
          rot: Math.sin(time * 1.1) * .05,
          glow: '#ffb45e', glowA: .22
        });
      }

      g.fx.draw(ctx);
      g.fx.end(ctx);
    }

    /* 画一层甜点：优先手绘素材，素材没到位就回退到色块圆 */
    function drawTier(t, x, y, scale, rot) {
      const T = TIERS[t], r = T.r * (scale || 1);
      FX.sprite(ctx, ART[T.s], x, y, r * 1.12, {
        rot: rot || 0, glow: T.c, glowA: .2,
        fb(ctx, x, y, r) {
          ctx.save();
          ctx.fillStyle = T.c; ctx.shadowColor = T.c; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
          ctx.shadowBlur = 0;
          const hl = ctx.createRadialGradient(x - r * .34, y - r * .4, 1, x - r * .34, y - r * .4, r * 1.1);
          hl.addColorStop(0, 'rgba(255,255,255,.6)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
          ctx.restore();
        }
      });
    }

    L = g.loop(step);
    g.pointer({
      move: p => { dropX = FX.clamp(p.x, LIP, W - LIP); },
      down: p => { dropX = FX.clamp(p.x, LIP, W - LIP); drop(); }
    });
    g.keys({
      ArrowLeft: () => { dropX = FX.clamp(dropX - 22, LIP, W - LIP); },
      ArrowRight: () => { dropX = FX.clamp(dropX + 22, LIP, W - LIP); },
      ' ': drop, Enter: drop
    });

    g.overlay({
      big: '云朵合成', stat: '甜点合成 · 别让烤盘溢出',
      sub: '移动选位置，点击投放。两个相同的甜点碰到一起，会变成更大的那一个',
      btn: '开始烘焙', onBtn: reset
    });
    return g;
  };

  /* ======== 5. detective 云探探 · 黄金矿工 ========
     已迁移到 CloudFX：dt 驱动摆钩 + 重量手感（越重拉得越慢）+ 分层战利品 + 限时。 */
  CloudGames.detective = function (host) {
    const g = FX.mount(host, {
      w: 420, h: 436, title: '捞星星',
      tip: '钩子摆到想要的方向时 <kbd>点击</kbd> 或按 <kbd>空格</kbd> 放绳 · 越重的东西拉得越慢',
      sky: { top: '#0f2a4c', bottom: '#060b1a', nx: .5, ny: .1, glow: 'rgba(120,200,255,.18)' }
    });
    const { W, H, ctx } = g;
    const OX = W / 2, OY = 78, REST = 42;
    const SWING = 1.16, SWING_SP = 1.45, DOWN_SP = 330, TOTAL = 60;
    const ART = FX.sprites({
      hero: './assets/cloud-items/hero-detective.webp',
      'prop-star-gold': './assets/cloud-items/prop-star-gold.webp',
      'prop-gem': './assets/cloud-items/prop-gem.webp',
      'prop-moonshard': './assets/cloud-items/prop-moonshard.webp',
      'prop-rock': './assets/cloud-items/prop-rock.webp'
    });

    const KINDS = [
      { k: 'star', r: 12, v: 30, w: 1.0, c: '#ffd76a', n: '星星', s: 'prop-star-gold' },
      { k: 'star', r: 19, v: 70, w: 2.2, c: '#ffbe33', n: '大星星', s: 'prop-star-gold' },
      { k: 'gem', r: 14, v: 130, w: 1.4, c: '#7ff5d8', n: '宝石', s: 'prop-gem' },
      { k: 'moon', r: 21, v: 210, w: 3.6, c: '#fff0b8', n: '月亮碎片', s: 'prop-moonshard' },
      { k: 'rock', r: 19, v: 5, w: 5.0, c: '#4b4562', n: '陨石块', s: 'prop-rock' }
    ];

    let ang, state, len, caught, items, playing, left, best, L;

    function spawn() {
      items = [];
      let tries = 0;
      while (items.length < 10 && tries < 500) {
        tries++;
        const K = FX.pick(KINDS);
        const x = FX.rnd(30 + K.r, W - 30 - K.r), y = FX.rnd(158, H - 26 - K.r);
        if (items.some(o => FX.dist(x, y, o.x, o.y) < o.K.r + K.r + 12)) continue;
        items.push({ x, y, K, rot: FX.rnd(0, 6.28), ph: FX.rnd(0, 6.28) });
      }
    }

    function reset() {
      ang = 0; state = 'swing'; len = 0; caught = null; playing = true;
      left = TOTAL; best = 0; spawn();
      g.setScore(0, true); g.setRight('⏱ ' + TOTAL); g.say('');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function fire() {
      if (!playing || state !== 'swing' || g.paused) return;
      state = 'down'; S.whoosh();
    }

    function finish(win) {
      playing = false; L.stop();
      if (win) {
        S.win();
        g.overlay({
          big: '这片天空捞干净啦', stat: '★ ' + g.score,
          sub: '最值钱的一件是「' + (KINDS.find(k => k.v === best) || KINDS[0]).n + '」',
          btn: '再捞一片', onBtn: reset
        });
      } else {
        S.lose();
        g.overlay({
          big: '天亮了，收工', stat: '★ ' + g.score,
          sub: '月亮碎片最值钱，但也最沉；陨石块又重又不值钱，别碰',
          btn: '再来一夜', onBtn: reset
        });
      }
    }

    function step(dt, time) {
      if (playing) {
        left -= dt;
        const shown = Math.max(0, Math.ceil(left));
        g.setRight((shown <= 10 ? '⏰ ' : '⏱ ') + shown);
        if (left <= 0) { finish(false); return; }
      }

      if (state === 'swing') ang = Math.sin(time * SWING_SP) * SWING;
      const hx = OX + Math.sin(ang) * (REST + len), hy = OY + Math.cos(ang) * (REST + len);

      if (state === 'down') {
        len += DOWN_SP * dt;
        for (const it of items) {
          if (FX.dist(hx, hy, it.x, it.y) < it.K.r + 9) {
            caught = it; state = 'up';
            S.click(); g.fx.ring(it.x, it.y, { r: it.K.r, r2: it.K.r * 2.6, c: it.K.c, life: .4 });
            break;
          }
        }
        if (REST + len > H - 16) { state = 'up'; }
      } else if (state === 'up') {
        len -= (caught ? DOWN_SP / caught.K.w : DOWN_SP * 1.3) * dt;
        if (caught) { caught.x = hx; caught.y = hy + caught.K.r + 5; }
        if (len <= 0) {
          len = 0;
          if (caught) {
            const K = caught.K;
            g.addScore(K.v);
            if (K.v > best) best = K.v;
            items = items.filter(o => o !== caught);
            if (K.k === 'rock') { S.thud(); g.fx.shake(6, .25); g.say('是块陨石…… +' + K.v); }
            else {
              S.pickup(Math.min(6, Math.round(K.v / 40)));
              g.say('捞到「' + K.n + '」 +' + K.v);
            }
            g.fx.text(OX, OY + 16, '+' + K.v, K.c, 19);
            g.fx.burst(OX, OY + 10, { n: 14, c: [K.c, '#ffffff'], sp: 130, life: .5, r: 3 });
            caught = null;
          }
          state = 'swing';
          if (!items.length) { finish(true); return; }
        }
      }

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .3);

      for (const it of items) {
        if (it === caught) continue;
        drawLoot(ctx, it, time);
      }

      // 绳 + 钩
      ctx.save();
      ctx.strokeStyle = 'rgba(214,226,255,.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(OX, OY); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.restore();
      if (caught) drawLoot(ctx, caught, time);
      ctx.save();
      ctx.fillStyle = '#ffd76a'; ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 7); ctx.fill();
      ctx.restore();

      // 云探探本体：拉重物时被压扁一点
      const mood = state === 'up' && caught ? 'ooo' : 'happy';
      FX.sprite(ctx, ART.hero, OX, 48, 26, {
        squash: state === 'down' ? 1.06 : (state === 'up' ? 1.08 : 1),
        glow: '#ffd76a', glowA: caught ? .34 : .2,
        fb: (c, x, y, r) => FX.cloud(c, x, y, 44, { mood, squash: state === 'down' ? 1.06 : 1 })
      });

      g.fx.draw(ctx);
      g.fx.end(ctx);
    }

    function drawLoot(ctx, it, time) {
      const { K } = it, bob = Math.sin(time * 1.6 + it.ph) * 1.6;
      const x = it.x, y = it.y + (it === caught ? 0 : bob);
      // 手绘素材优先；星星和陨石会慢慢自转，宝石月亮保持正立好认
      if (FX.sprite(ctx, ART[K.s], x, y, K.r * 1.25, {
        rot: K.k === 'star' ? it.rot + time * .3 : (K.k === 'rock' ? it.rot : 0),
        glow: K.c, glowA: K.k === 'rock' ? .12 : .24
      })) return;
      if (K.k === 'gem') {
        ctx.save();
        ctx.fillStyle = K.c; ctx.shadowColor = K.c; ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(x, y - K.r); ctx.lineTo(x + K.r * .8, y);
        ctx.lineTo(x, y + K.r); ctx.lineTo(x - K.r * .8, y);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .5; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(x, y - K.r); ctx.lineTo(x + K.r * .3, y - K.r * .2); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (K.k === 'moon') {
        FX.moon(ctx, x, y, K.r, K.c);
      } else if (K.k === 'rock') {
        ctx.save();
        ctx.fillStyle = K.c; ctx.shadowColor = 'rgba(140,130,190,.5)'; ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = (Math.PI * 2 / 7) * i + it.rot, r = K.r * (i % 2 ? .78 : 1);
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        FX.star(ctx, x, y, K.r, K.c, 14, it.rot + time * .3);
      }
    }

    L = g.loop(step);
    g.pointer({ down: fire });
    g.keys({ ' ': fire, Enter: fire, ArrowDown: fire });

    g.overlay({
      big: '捞星星', stat: '限时 60 秒 · 捞得越重越慢',
      sub: '钩子来回摆动，看准方向放绳。月亮碎片最值钱，陨石块又沉又不值钱',
      btn: '开始', onBtn: reset
    });
    return g;
  };

  /* ======== 6. librarian 云知知 · 扫雷 ========
     已迁移到 CloudFX：翻开动画 + 移动端插旗模式（toggleBtn）+ 双击展开 +
     计时。这个游戏是事件驱动的，但仍跑一个轻循环来做翻牌动画和云知知的呼吸。 */
  CloudGames.librarian = function (host) {
    const COLS = 8, ROWS = 8, MINES = 10, CELL = 42;
    const PAD = 12, TOP = 52;
    const W = COLS * CELL + PAD * 2, H = ROWS * CELL + PAD + TOP;

    const g = FX.mount(host, {
      w: W, h: H, title: '星空扫雷',
      tip: '点击翻开 · 右键（或开启 <kbd>插旗</kbd> 后点击）标记流星 · 数字 = 周围流星数',
      sky: { top: '#101a3e', bottom: '#060a1c', nx: .5, ny: .06, glow: 'rgba(140,180,255,.16)' }
    });
    const { ctx } = g;
    const ART = FX.sprites({ hero: './assets/cloud-items/hero-librarian.webp' });
    const NC = ['', '#8fb8ff', '#7ff5d8', '#ffd76a', '#ffb45e', '#ff9db0', '#e0a8ff', '#ff8e72', '#fff'];
    const GX = c => PAD + c * CELL, GY = r => TOP + r * CELL;

    let grid, playing, opened, flags, first, elapsed, ended, flagMode, L;

    function reset() {
      grid = [];
      for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++)
          grid[r][c] = { mine: false, open: false, flag: false, n: 0, r, c, anim: 0, boom: 0 };
      }
      playing = true; opened = 0; flags = 0; first = true; elapsed = 0; ended = false;
      g.setScore(0, true); g.setRight('☄ ' + MINES);
      g.say('小心流星，把安全的星空翻开');
      g.fx.clear(); g.clearOverlay();
      L.start();
    }

    function plant(sr, sc) {
      let placed = 0;
      while (placed < MINES) {
        const r = FX.rndi(0, ROWS - 1), c = FX.rndi(0, COLS - 1);
        // 首点及其八邻域保证安全，开局不会一击必死
        if (grid[r][c].mine || (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1)) continue;
        grid[r][c].mine = true; placed++;
      }
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          let n = 0;
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if ((dr || dc) && nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) n++;
            }
          grid[r][c].n = n;
        }
    }

    function flood(r, c, depth) {
      const cell = grid[r] && grid[r][c];
      if (!cell || cell.open || cell.flag) return;
      cell.open = true; cell.anim = .001 + Math.min(.28, (depth || 0) * .022);
      opened++;
      if (cell.n === 0)
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if (dr || dc) flood(r + dr, c + dc, (depth || 0) + 1);
    }

    function cellAt(p) {
      return { c: Math.floor((p.x - PAD) / CELL), r: Math.floor((p.y - TOP) / CELL) };
    }
    const inside = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;

    function toggleFlag(r, c) {
      if (!playing || !inside(r, c)) return;
      const cell = grid[r][c];
      if (cell.open) return;
      cell.flag = !cell.flag;
      flags += cell.flag ? 1 : -1;
      g.setRight('☄ ' + (MINES - flags));
      S.click();
      if (cell.flag) g.fx.ring(GX(c) + CELL / 2, GY(r) + CELL / 2, { r: 6, r2: 24, c: '#ffd76a', life: .3 });
    }

    function boom(r, c) {
      playing = false; ended = true;
      S.bad(); g.fx.shake(12, .45);
      let delay = 0;
      for (let rr = 0; rr < ROWS; rr++)
        for (let cc = 0; cc < COLS; cc++) {
          const m = grid[rr][cc];
          if (m.mine) { m.open = true; m.boom = delay; delay += .045; }
        }
      g.fx.burst(GX(c) + CELL / 2, GY(r) + CELL / 2,
        { n: 26, c: ['#ff8e72', '#ffd76a', '#fff'], sp: 210, life: .7, r: 4 });
      setTimeout(() => {
        if (g.dead) return;
        S.lose();
        g.overlay({
          big: '碰到流星啦', stat: '翻开 ' + opened + ' / ' + (ROWS * COLS - MINES),
          sub: '拿不准的格子先插旗标记，数字是周围八格的流星数',
          btn: '再试一次', onBtn: reset
        });
      }, 700);
    }

    function win() {
      playing = false; ended = true;
      S.win();
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (grid[r][c].mine && !grid[r][c].flag) toggleFlag(r, c);
      g.overlay({
        big: '整片星空都点亮了！', stat: '★ ' + g.score + ' · ' + elapsed.toFixed(1) + '秒',
        sub: '完美避开 ' + MINES + ' 颗流星',
        btn: '再来一局', onBtn: reset
      });
    }

    function dig(r, c) {
      if (!playing || !inside(r, c)) return;
      const cell = grid[r][c];
      if (cell.flag) return;

      // 已翻开的数字格：周围旗数够了就一次展开（标准扫雷的 chord）
      if (cell.open) {
        if (!cell.n) return;
        let f = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && inside(r + dr, c + dc) && grid[r + dr][c + dc].flag) f++;
        if (f !== cell.n) return;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (!(dr || dc) || !inside(nr, nc)) continue;
            const t = grid[nr][nc];
            if (t.flag || t.open) continue;
            if (t.mine) { boom(nr, nc); return; }
            flood(nr, nc, 0);
          }
        g.setScore(opened * 10);
        if (opened === ROWS * COLS - MINES) win();
        return;
      }

      if (first) { plant(r, c); first = false; }
      if (cell.mine) { cell.open = true; boom(r, c); return; }

      const before = opened;
      flood(r, c, 0);
      const got = opened - before;
      g.setScore(opened * 10);
      S.pop(Math.min(5, cell.n));
      if (got > 3) {
        g.fx.ring(GX(c) + CELL / 2, GY(r) + CELL / 2, { r: 8, r2: 46, c: '#7ff5d8', life: .45 });
        g.say('一下翻开了 ' + got + " 片！");
      }
      if (opened === ROWS * COLS - MINES) win();
    }

    function step(dt, time) {
      if (playing && !first) elapsed += dt;

      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .22);

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const cell = grid[r][c];
          if (cell.anim > 0) cell.anim = Math.max(0, cell.anim - dt);
          if (cell.boom > 0) cell.boom = Math.max(0, cell.boom - dt);
          const x = GX(c), y = GY(r), cx = x + CELL / 2, cy = y + CELL / 2;
          // 翻开动画：横向压扁再展开
          const flip = cell.open && cell.anim > 0 ? Math.abs(Math.cos((1 - cell.anim / .3) * Math.PI / 2)) : 1;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(Math.max(.06, flip), 1);
          ctx.translate(-cx, -cy);
          ctx.fillStyle = cell.open ? 'rgba(16,28,62,.82)' : 'rgba(56,84,164,.5)';
          ctx.strokeStyle = cell.open ? 'rgba(120,150,220,.2)' : 'rgba(160,190,255,.3)';
          ctx.lineWidth = 1;
          FX.roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 7);
          ctx.fill(); ctx.stroke();
          if (!cell.open) {
            // 未翻开的格子给一点高光，像一块夜空瓷砖
            ctx.fillStyle = 'rgba(255,255,255,.07)';
            FX.roundRect(ctx, x + 4, y + 4, CELL - 8, (CELL - 8) * .42, 5); ctx.fill();
          }
          ctx.restore();

          if (flip < .5) continue;
          if (cell.open && cell.mine) {
            const k = cell.boom > 0 ? .5 : 1;
            FX.star(ctx, cx, cy, 12 * k, '#ff8e72', 16, time * 1.5);
          } else if (cell.open && cell.n > 0) {
            ctx.save();
            ctx.fillStyle = NC[cell.n];
            ctx.font = 'bold 17px ui-monospace,monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = NC[cell.n]; ctx.shadowBlur = 8;
            ctx.fillText(cell.n, cx, cy + 1);
            ctx.restore();
          } else if (cell.flag) {
            FX.star(ctx, cx, cy, 10, '#ffd76a', 14, time * .8);
          }
        }

      // 云知知坐在标题栏左边
      FX.sprite(ctx, ART.hero, 30, 26, 21, {
        rot: Math.sin(time * 1.1) * .05,
        glow: '#8fb8ff', glowA: .2,
        fb: (c, x, y, r) => FX.cloud(c, x, y, r * 1.5, { mood: ended ? 'ooo' : 'happy' })
      });
      ctx.save();
      ctx.fillStyle = 'rgba(207,214,245,.6)';
      ctx.font = '11px ui-monospace,monospace'; ctx.textAlign = 'right';
      ctx.fillText(elapsed.toFixed(1) + 's', W - PAD, 30);
      ctx.restore();

      g.fx.draw(ctx);
      g.fx.end(ctx);
    }

    L = g.loop(step);
    const flagBtn = g.toggleBtn('插旗', () => { });
    g.pointer({
      down: p => {
        const { r, c } = cellAt(p);
        if (!inside(r, c)) return;
        if (flagBtn.on) toggleFlag(r, c); else dig(r, c);
      },
      right: p => { const { r, c } = cellAt(p); toggleFlag(r, c); }
    });

    reset();
    return g;
  };

  /* ======== 7. hero 云闪闪 · 神庙闪避 ========
     已迁移到 CloudFX：dt 驱动 + 受击无敌帧 + 速度线 + 里程计分。 */
  CloudGames.hero = function (host) {
    const g = FX.mount(host, {
      w: 420, h: 436, title: '夜巡闪避',
      tip: '<kbd>←</kbd><kbd>→</kbd> 或拖动左右移动 · 躲开乌云，顺路捡星星',
      sky: { top: '#1b1440', bottom: '#07061a', nx: .5, ny: .06, glow: 'rgba(160,140,255,.20)' }
    });
    const { W, H, ctx } = g;
    const PY = H - 52, PR = 22, MARGIN = 24;
    const LIVES = 3, INVUL = 1.4;
    const ART = FX.sprites({
      hero: './assets/cloud-items/hero-hero.webp',
      star: './assets/cloud-items/prop-star-gold.webp',
      shield: './assets/cloud-items/prop-shield.webp',
      cloud: './assets/cloud-items/prop-darkcloud.webp'
    });

    let px, tx, obs, lives, playing, spawnT, speed, mileT, invul, shield, dist2, L;

    function reset() {
      px = tx = W / 2; obs = []; lives = LIVES; playing = true;
      spawnT = .6; speed = 168; mileT = 0; invul = 0; shield = false; dist2 = 0;
      g.setScore(0, true); g.setLives(LIVES, LIVES); g.say('');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function hurt() {
      if (invul > 0) return;
      if (shield) {
        shield = false; invul = .8;
        S.click(); g.say('护盾挡住了！');
        g.fx.ring(px, PY, { r: PR, r2: PR * 3, c: '#7ff5d8', life: .5 });
        return;
      }
      lives--;
      g.setLives(lives, LIVES);
      invul = INVUL;
      S.bad(); g.fx.shake(11, .4);
      g.fx.burst(px, PY, { n: 22, c: ['#ff9db0', '#8a7fb5'], sp: 190, life: .6, r: 4 });
      if (lives <= 0) {
        playing = false; L.stop(); S.lose();
        g.overlay({
          big: '被乌云撞晕啦', stat: '★ ' + g.score,
          sub: '飞了 ' + Math.round(dist2) + ' 米 · 绿色护盾能替你挡一次',
          btn: '再巡一夜', onBtn: reset
        });
      } else {
        g.say(lives === 1 ? '最后一颗心了，小心！' : '撞到乌云了');
      }
    }

    function step(dt, time) {
      // 玩家平滑跟随
      px += (tx - px) * Math.min(1, dt * 14);

      if (playing) {
        dist2 += speed * dt * .1;
        speed = 168 + Math.min(210, dist2 * .55);
        mileT += dt;
        if (mileT >= 1) { mileT -= 1; g.addScore(2); }
        if (invul > 0) invul -= dt;

        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = FX.rnd(.42, .78) * (168 / speed) + .16;
          const r = Math.random();
          const kind = r < .1 ? 'shield' : r < .42 ? 'star' : 'cloud';
          obs.push({ x: FX.rnd(MARGIN + 16, W - MARGIN - 16), y: -28, kind, ph: FX.rnd(0, 6.28) });
        }
      }

      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i];
        o.y += speed * dt;
        const hitR = o.kind === 'cloud' ? 30 : 24;
        if (Math.abs(o.y - PY) < hitR && Math.abs(o.x - px) < hitR) {
          if (o.kind === 'star') {
            g.addScore(5); S.pickup(2);
            g.fx.burst(o.x, o.y, { n: 12, c: ['#ffd76a', '#fff'], sp: 140, life: .45, r: 3 });
            g.fx.text(o.x, o.y - 14, '+5', '#ffd76a', 16);
            obs.splice(i, 1);
          } else if (o.kind === 'shield') {
            shield = true; S.note(6);
            g.say('拿到护盾，能挡一次撞击');
            g.fx.ring(o.x, o.y, { r: 8, r2: 46, c: '#7ff5d8', life: .5 });
            obs.splice(i, 1);
          } else {
            obs.splice(i, 1); hurt();
            if (!playing) return;
          }
        } else if (o.y > H + 34) {
          obs.splice(i, 1);
        }
      }

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .3 + dist2 * .004);

      // 速度线
      ctx.save();
      ctx.strokeStyle = 'rgba(180,205,255,.16)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const sx = ((i * 137 + (time * speed * 1.4) % W) % W);
        const sy = ((i * 211 + time * speed * 2.2) % (H + 80)) - 40;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 26); ctx.stroke();
      }
      ctx.restore();

      for (const o of obs) {
        if (o.kind === 'star') {
          FX.sprite(ctx, ART.star, o.x, o.y, 13, {
            rot: time * 1.6 + o.ph, glow: '#ffd76a', glowA: .28,
            fb: (c, x, y) => FX.star(c, x, y, 11, '#ffd76a', 14, time * 1.6 + o.ph)
          });
        } else if (o.kind === 'shield') {
          FX.sprite(ctx, ART.shield, o.x, o.y, 15, {
            squash: 1 + Math.sin(time * 3 + o.ph) * .05, glow: '#7ff5d8', glowA: .32,
            fb(c, x, y) {
              FX.glow(c, x, y, 22, '#7ff5d8', .3);
              c.save();
              c.strokeStyle = '#7ff5d8'; c.lineWidth = 2.4; c.shadowColor = '#7ff5d8'; c.shadowBlur = 12;
              c.beginPath(); c.arc(x, y, 12, 0, 7); c.stroke();
              c.restore();
            }
          });
        } else {
          FX.sprite(ctx, ART.cloud, o.x, o.y, 22, {
            squash: 1 + Math.sin(time * 2 + o.ph) * .04, glow: '#8a7fb5', glowA: .26,
            fb: (c, x, y) => FX.cloud(c, x, y, 32, {
              color: '#4a4460', ink: '#c9c2e8', mood: 'sad',
              glow: 'rgba(138,127,181,.6)', blush: 'rgba(120,110,160,.5)',
              squash: 1 + Math.sin(time * 2 + o.ph) * .04
            })
          });
        }
      }

      // 云闪闪：无敌帧闪烁
      const blink = invul > 0 && Math.floor(invul * 12) % 2 === 0;
      if (!blink) {
        if (shield) {
          ctx.save();
          ctx.strokeStyle = 'rgba(127,245,216,.7)'; ctx.lineWidth = 2;
          ctx.shadowColor = '#7ff5d8'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(px, PY, PR + 12, 0, 7); ctx.stroke();
          ctx.restore();
        }
        FX.sprite(ctx, ART.hero, px, PY, PR + 2, {
          rot: FX.clamp((tx - px) * .004, -.2, .2),
          glow: shield ? '#7ff5d8' : '#ffdc96', glowA: invul > 0 ? .4 : .24,
          fb: (c, x, y, r) => FX.cloud(c, x, y, 42, {
            color: '#fff4d6', mood: invul > 0 ? 'ooo' : 'happy',
            glow: 'rgba(255,220,150,.65)',
            rot: (tx - px) * .004
          })
        });
      }

      g.fx.draw(ctx);
      g.fx.end(ctx);

      // 里程表
      ctx.save();
      ctx.fillStyle = 'rgba(207,214,245,.5)';
      ctx.font = '11px ui-monospace,monospace'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(dist2) + ' m', W - 12, 20);
      ctx.restore();
    }

    L = g.loop(step);
    g.pointer({
      move: p => { tx = FX.clamp(p.x, MARGIN, W - MARGIN); },
      down: p => { tx = FX.clamp(p.x, MARGIN, W - MARGIN); }
    });
    g.keys({
      ArrowLeft: () => { tx = FX.clamp(tx - 46, MARGIN, W - MARGIN); },
      ArrowRight: () => { tx = FX.clamp(tx + 46, MARGIN, W - MARGIN); }
    });

    g.overlay({
      big: '夜巡闪避', stat: '躲乌云 · 捡星星 · 越飞越快',
      sub: '←→ 或拖动移动。金星星加分，绿护盾能替你挡一次撞击',
      btn: '开始巡逻', onBtn: reset
    });
    return g;
  };

  /* ======== 8. photographer 云摄摄 · 节奏抓拍 ========
     已迁移到 CloudFX：dt 驱动 + 多种拍摄对象（分值/速度不同）+ 取景框对焦 +
     快门音与闪光 + 逐张评级的相片条。 */
  CloudGames.photographer = function (host) {
    const g = FX.mount(host, {
      w: 420, h: 348, title: '流星抓拍',
      tip: '被拍的对象滑到取景框正中时按 <kbd>空格</kbd> 或点击 · 越正越清晰',
      sky: { top: '#0d2340', bottom: '#050a18', nx: .3, ny: .2, glow: 'rgba(140,210,255,.16)' }
    });
    const { W, H, ctx } = g;
    const CX = W / 2, CY = 150, FRAME = 116, ROLL = 8;
    const ART = FX.sprites({
      hero: './assets/cloud-items/hero-photographer.webp',
      '流星': './assets/cloud-items/prop-star-gold.webp',
      '月亮': './assets/cloud-items/prop-moon.webp',
      '彗星': './assets/cloud-items/prop-comet.webp',
      '星团': './assets/cloud-items/prop-starcluster.webp'
    });

    const SUBJ = [
      { n: '流星', c: '#ffd76a', r: 15, sp: 210, v: 1.0 },
      { n: '月亮', c: '#fff0b8', r: 21, sp: 150, v: 0.8 },
      { n: '彗星', c: '#7ff5d8', r: 13, sp: 300, v: 1.4 },
      { n: '星团', c: '#e0a8ff', r: 18, sp: 185, v: 1.1 }
    ];

    let subj, sx, dir, shots, playing, flash, film, ended, focusT, L;

    function nextSubject() {
      subj = FX.pick(SUBJ);
      dir = Math.random() < .5 ? 1 : -1;
      sx = dir > 0 ? 26 : W - 26;
      focusT = 0;
    }

    function reset() {
      shots = ROLL; playing = true; flash = 0; film = []; ended = false;
      nextSubject();
      g.setScore(0, true); g.setRight('🎞 ' + ROLL); g.say('等它滑到正中间');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function snap() {
      if (!playing || shots <= 0 || g.paused) return;
      shots--; g.setRight('🎞 ' + shots);
      flash = .22;
      const d = Math.abs(sx - CX);
      let pts, txt, grade;
      if (d < 10) { pts = 120; txt = '完美正中央！'; grade = 'S'; }
      else if (d < 26) { pts = 75; txt = '很棒！'; grade = 'A'; }
      else if (d < 52) { pts = 40; txt = '拍到了'; grade = 'B'; }
      else { pts = 5; txt = '糊了…'; grade = 'C'; }
      pts = Math.round(pts * subj.v);
      g.addScore(pts);
      film.push({ grade, c: subj.c });
      g.say(txt + ' 「' + subj.n + '」 +' + pts);
      S.shutter();
      if (grade === 'S') {
        S.note(7);
        g.fx.ring(sx, CY, { r: 12, r2: 76, c: subj.c, life: .55 });
        g.fx.burst(sx, CY, { n: 20, c: [subj.c, '#fff'], sp: 180, life: .6, r: 3.5 });
        g.fx.shake(4, .2);
      } else if (grade === 'C') {
        g.fx.burst(sx, CY, { n: 5, c: '#8a7fb5', sp: 60, life: .35, r: 2 });
      } else {
        g.fx.burst(sx, CY, { n: 11, c: subj.c, sp: 120, life: .45, r: 3 });
      }
      g.fx.text(sx, CY - subj.r - 16, '+' + pts, subj.c, 17);

      if (shots <= 0) {
        playing = false;
        setTimeout(() => {
          if (g.dead) return;
          ended = true; L.stop(); S.win();
          const s = film.filter(f => f.grade === 'S').length;
          g.overlay({
            big: '胶卷拍完啦', stat: '★ ' + g.score,
            sub: s ? `拍到 ${s} 张完美照片 · 彗星最难但分值最高` : '沉住气，等它滑到取景框正中再按快门',
            btn: '再拍一卷', onBtn: reset
          });
        }, 620);
      } else {
        nextSubject();
      }
    }

    function step(dt, time) {
      if (flash > 0) flash = Math.max(0, flash - dt);
      if (playing) {
        focusT += dt;
        sx += dir * subj.sp * dt;
        // 出界就换下一个对象，但不消耗胶卷
        if (sx < 20 || sx > W - 20) nextSubject();
      }

      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .26);

      // 取景框
      const d = Math.abs(sx - CX);
      const sharp = FX.clamp(1 - d / 60, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(140,245,216,${(.25 + sharp * .5).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      const half = FRAME / 2;
      // 四角取景标记
      const corner = 22;
      for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = CX + ox * half, y = CY + oy * half;
        ctx.beginPath();
        ctx.moveTo(x, y - oy * corner); ctx.lineTo(x, y); ctx.lineTo(x - ox * corner, y);
        ctx.stroke();
      }
      // 中央对焦线
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = `rgba(255,215,106,${(.2 + sharp * .55).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(CX, CY - half); ctx.lineTo(CX, CY + half); ctx.stroke();
      ctx.restore();

      // 完美区高亮
      if (sharp > .8) {
        ctx.save();
        ctx.fillStyle = `rgba(140,245,216,${((sharp - .8) * .5).toFixed(3)})`;
        ctx.fillRect(CX - 10, CY - half, 20, FRAME);
        ctx.restore();
      }

      // 拍摄对象：越靠边越"虚"
      if (playing) {
        const blur = 1 - sharp;
        ctx.save();
        ctx.globalAlpha = .55 + sharp * .45;
        // 流星和彗星是"飞"过来的，先拖一道尾巴再画本体
        if (subj.n === '流星' || subj.n === '彗星') {
          ctx.save();
          ctx.strokeStyle = subj.c; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.globalAlpha *= .5;
          ctx.beginPath(); ctx.moveTo(sx - dir * 30, CY); ctx.lineTo(sx, CY); ctx.stroke();
          ctx.restore();
        }
        FX.sprite(ctx, ART[subj.n], sx, CY, subj.r * 1.2, {
          rot: subj.n === '流星' ? time * 2 : (subj.n === '星团' ? time * .5 : 0),
          fb(c, x, y) {
            if (subj.n === '月亮') FX.moon(c, x, y, subj.r, subj.c);
            else if (subj.n === '星团') {
              for (let i = 0; i < 4; i++) {
                const a = time * .8 + i * 1.57;
                FX.star(c, x + Math.cos(a) * 10, y + Math.sin(a) * 10, subj.r * .5, subj.c, 12, a);
              }
            } else FX.star(c, x, y, subj.r, subj.c, 16, time * 2);
          }
        });
        ctx.restore();
        FX.glow(ctx, sx, CY, subj.r * 2.2, subj.c, .15 + sharp * .25);
        // 对象名
        ctx.save();
        ctx.fillStyle = `rgba(207,214,245,${(.3 + sharp * .5).toFixed(3)})`;
        ctx.font = '11px ui-monospace,monospace'; ctx.textAlign = 'center';
        ctx.fillText(subj.n + ' ×' + subj.v, sx, CY + subj.r + 22);
        ctx.restore();
      }

      // 云摄摄举着相机
      FX.sprite(ctx, ART.hero, 40, H - 40, 26, {
        rot: Math.sin(time * 1.2) * .05,
        glow: '#8fd2ff', glowA: .2,
        fb: (c, x, y, r) => FX.cloud(c, x, y, r * 1.5, { mood: sharp > .8 ? 'ooo' : 'happy' })
      });

      // 相片条
      for (let i = 0; i < ROLL; i++) {
        const x = 92 + i * 36, y = H - 30, f = film[i];
        ctx.save();
        ctx.fillStyle = f ? f.c : 'rgba(255,255,255,.07)';
        ctx.globalAlpha = f ? .8 : 1;
        FX.roundRect(ctx, x, y, 28, 22, 4); ctx.fill();
        if (f) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(30,24,50,.75)';
          ctx.font = 'bold 12px ui-monospace,monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.grade, x + 14, y + 12);
        }
        ctx.restore();
      }

      g.fx.draw(ctx);
      g.fx.end(ctx);

      // 闪光盖在最上层
      if (flash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${(flash / .22 * .55).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    L = g.loop(step);
    g.pointer({ down: snap });
    g.keys({ ' ': snap, Enter: snap });

    g.overlay({
      big: '流星抓拍', stat: '一卷 8 张 · 越正越清晰',
      sub: '不同对象分值不同：彗星跑得快但加成最高。滑到取景框正中时按快门',
      btn: '开始拍摄', onBtn: reset
    });
    return g;
  };

  /* ======== 9. sleeper 云梦梦 · 弹珠台 ========
     已迁移到 CloudFX：dt 驱动 + 蓄力发射（带 hold() 蓄力音）+ 真挡板（球快掉下去
     时能救回来）+ 导流墙 + 缓冲柱 + 连击（会超时断）+ 梦境槽满了开多球 +
     无尽波次（每波清空后星星更密、分值更高）。 */
  CloudGames.sleeper = function (host) {
    const g = FX.mount(host, {
      w: 400, h: 480, title: '梦乡弹珠',
      tip: '按住 <kbd>空格</kbd> 蓄力松开发射 · 球在场上时 <kbd>←</kbd><kbd>→</kbd> 或点屏幕左右半边拍挡板',
      sky: { top: '#191243', bottom: '#06041a', nx: .5, ny: .1, glow: 'rgba(180,150,255,.20)' }
    });
    const { W, H, ctx } = g;
    /* 手感：半力（约 50%）能打到中间几排星星，满力会撞到天花板再落回来。
       上升高度 = (sin·v)² / 2G。 */
    const R = 11, GRAV = 420, WALL = 12, DRAIN = H - 14;
    const BALLS = 3, MAXB = 5, PX = W / 2, PY = H - 40;
    /* 挡板：从 pivot 出发长 FL，静止时朝内下 REST，拍起来到 UP。
       尖端落在 x≈167/233，中间 66px 的缺口就是排水口 —— 跟真弹珠机一样，
       抬挡板不会关掉缺口，你得用板面把球打回去。 */
    const FL = 78, REST = .42, UP = -.5, FPY = 412, FPX = 104;
    /* 发射角：左上到右上都能瞄。柱子已经错开中轴了，垂直上抛也会被弹偏，
       不会再出现"原路落回排水口"的死局。 */
    const AIM_MIN = -2.55, AIM_MAX = -1.0, AIM_0 = -2.15;
    const COMBO_T = 3.2, DREAM_MAX = 100;
    const ART = FX.sprites({ hero: './assets/cloud-items/hero-sleeper.webp' });

    /* 导流墙：把顺着侧壁滚下来的球拐到挡板上，不然球会从挡板外侧白掉。
       内侧端点离转轴不到 2×(R+4)，球钻不进挡板背后的死区。 */
    const GUIDES = [
      [WALL, 330, FPX - 8, FPY - 6],
      [W - WALL, 330, W - FPX + 8, FPY - 6]
    ];

    let live, stars, bumps, flips, reserve, wave, power, charging, ready,
      playing, combo, comboT, dream, aim, snd, kicks, L;

    function build() {
      // 每波多一排，星星分值随波数涨
      const rows = Math.min(4, 2 + wave), HUE = ['#ffd76a', '#7ff5d8', '#e0a8ff', '#8fb8ff'];
      stars = [];
      for (let row = 0; row < rows; row++)
        for (let i = 0; i < 4; i++)
          stars.push({
            x: 58 + i * 95 + (row % 2 ? 22 : 0), y: 68 + row * 58,
            r: 13, on: true, hue: HUE[row], v: (4 - row) * 10 * wave, ph: FX.rnd(0, 6.28)
          });
      /* 故意不对称：柱子摆在正中轴上时，球会被原路弹回排水口，
         每次都走同一条死路。错开一点，反弹才有变化。 */
      bumps = [
        { x: W * .44, y: 246, r: 22, hit: 0 },
        { x: W * .22, y: 302, r: 18, hit: 0 },
        { x: W * .74, y: 296, r: 18, hit: 0 }
      ];
    }

    function park() {
      ready = true; power = 0;
    }

    function reset() {
      wave = 1; build();
      live = []; reserve = BALLS; playing = true; charging = false;
      combo = 0; comboT = 0; dream = 0;
      kicks = { touch: 0, kick: 0, balls: live };
      g._probe = kicks;   // 给测试看挡板到底有没有碰到球（live 之后只增删不重指）
      aim = AIM_0;          // 默认朝左上斜射
      flips = [
        { dir: 1, px: FPX, py: FPY, a: REST, w: 0, on: false, hold: 0, kickT: 0 },
        { dir: -1, px: W - FPX, py: FPY, a: REST, w: 0, on: false, hold: 0, kickT: 0 }
      ];
      park();
      g.setScore(0, true); g.setLives(reserve, MAXB); g.say('按住蓄力，松开发射');
      g.fx.clear(); g.clearOverlay(); L.start();
    }

    function startCharge() {
      if (!playing || !ready || charging || g.paused) return;
      charging = true; power = 0;
      FX.audio.resume();
      snd = FX.audio.hold({ freq: 170, type: 'triangle' });
      g._holds.push(snd);
    }

    function stopSnd() {
      if (!snd) return;
      snd.stop();
      const i = g._holds.indexOf(snd);
      if (i >= 0) g._holds.splice(i, 1);
      snd = null;
    }

    function release() {
      stopSnd();
      if (!charging) return;
      charging = false;
      if (!ready) return;
      const sp = 280 + power * 6;
      live.push({ x: PX, y: PY, vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp });
      ready = false;
      S.whoosh();
      g.fx.burst(PX, PY, { n: 8, c: '#ffd76a', ang: aim, spread: .8, sp: 120, life: .35, r: 2.5 });
      power = 0;
    }

    /* 拍挡板。按住不放挡板就一直抬着（真弹珠机就是这样），松开才落回；
       点一下屏幕则按 hold 计时自动落回。
       kickT 是"刚拍过"的宽限窗口：只靠瞬时角速度判定的话窗口只有两三帧，
       球晚到一点就完全打不到，玩家的时机感会觉得挡板是坏的。 */
    function flip(side) {
      if (!playing || g.paused) return;
      const f = flips[side];
      if (!f.on) { S.click(); f.kickT = .2; }
      f.on = true;
      f.hold = .2;
    }

    function multiball() {
      dream = 0;
      for (const b of bumps.slice(0, 2))
        live.push({ x: b.x, y: b.y - b.r - R - 2, vx: FX.rnd(-140, 140), vy: -FX.rnd(120, 240) });
      S.win(); g.say('梦境扩散 · 多球！');
      g.fx.shake(5, .3);
      for (const b of bumps.slice(0, 2))
        g.fx.ring(b.x, b.y, { r: 8, r2: 70, c: '#e0a8ff', life: .6 });
    }

    function nextWave() {
      wave++;
      reserve = Math.min(MAXB, reserve + 1);
      g.setLives(reserve, MAXB);
      build();
      S.win(); g.say('第 ' + wave + ' 波 · 多送你一颗月亮');
      g.fx.shake(4, .3);
      g.fx.text(W / 2, 200, 'WAVE ' + wave, '#7ff5d8', 26);
    }

    /* 最后一颗球漏了才扣数；多球时掉一颗不心疼。 */
    function lost() {
      S.thud(); g.fx.shake(6, .28);
      if (live.length > 0) { g.say('漏了一颗，场上还有 ' + live.length + ' 颗'); return; }
      reserve--;
      combo = 0; dream = 0;
      g.setLives(reserve, MAXB);
      if (reserve <= 0) {
        playing = false; L.stop(); S.lose();
        g.overlay({
          big: '月亮都睡着了', stat: '★ ' + g.score,
          sub: '撑到了第 ' + wave + ' 波 · 球快掉下去时用挡板把它拍回去',
          btn: '再入梦一次', onBtn: reset
        });
      } else {
        g.say('还剩 ' + reserve + ' 颗月亮');
        park();
      }
    }

    function hitStar(ball, st) {
      st.on = false;
      combo++; comboT = COMBO_T;
      const pts = st.v * combo;
      g.addScore(pts);
      S.plink(combo);
      dream = Math.min(DREAM_MAX, dream + 11);
      g.fx.ring(st.x, st.y, { r: st.r, r2: st.r * 3.4, c: st.hue, life: .45 });
      g.fx.burst(st.x, st.y, { n: 14, c: [st.hue, '#fff'], sp: 150, life: .5, r: 3 });
      g.fx.text(st.x, st.y - 16, '+' + pts, st.hue, 16);
      if (combo > 1) g.say('连击 ×' + combo + '！');
      // 从星星中心弹开
      const nx = (ball.x - st.x) || .01, ny = (ball.y - st.y) || .01;
      const d = Math.hypot(nx, ny), sp = Math.hypot(ball.vx, ball.vy) * .94;
      ball.vx = nx / d * sp; ball.vy = ny / d * sp;
    }

    const PAD = 4;   // 线段的"厚度"，球心离线小于 R+PAD 就算碰上

    /* 球撞线段。
       oneSided: 挡板专用。板面法线固定朝上，球只能从上面被挡住 ——
       挡板抬起只用 40ms，会直接扫过球所在的位置，这时按穿透方向算法线会
       得到"球在板下面"，于是把球一脚推进排水口。真弹珠机的挡板是单面的。
       kick > 0 时额外沿法线加速，用来做拍击。 */
    function segHit(ball, ax, ay, bx, by, e, kick, oneSided) {
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
      const t = FX.clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / len2, 0, 1);
      const cx = ax + dx * t, cy = ay + dy * t;
      let nx = ball.x - cx, ny = ball.y - cy;

      if (oneSided) {
        const len = Math.sqrt(len2);
        let fx = -dy / len, fy = dx / len;          // 垂直于板面
        if (fy > 0) { fx = -fx; fy = -fy; }         // 统一朝上
        const sd = nx * fx + ny * fy;               // 球在法线方向的有符号距离
        const td = nx * (dx / len) + ny * (dy / len);  // 沿板面方向的偏移
        // 球在板背面（已经漏过去了）或绕过了板尖，都不接
        if (sd > R + PAD || sd < -R || Math.abs(td) > R + PAD) return 0;
        ball.x = cx + fx * (R + PAD + .5); ball.y = cy + fy * (R + PAD + .5);
        nx = fx; ny = fy;
      } else {
        const d = Math.hypot(nx, ny);
        if (d > R + PAD) return 0;
        if (d < .01) { nx = 0; ny = -1; }
        else { nx /= d; ny /= d; }
        ball.x = cx + nx * (R + PAD + .5); ball.y = cy + ny * (R + PAD + .5);
      }

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
      if (kick > 0) { ball.vx += nx * kick; ball.vy += ny * kick; return 2; }
      return 1;
    }

    function flipTip(f) {
      return [f.px + Math.cos(f.a) * FL * f.dir, f.py + Math.sin(f.a) * FL];
    }

    /* 拍击判定用"扫过的扇形"，不用线段。
       挡板从 REST 扫到 UP 只要 40ms，而球每 4ms 才走一小步 —— 线段碰撞会在
       两帧之间直接跨过球（上一帧球在板上方，下一帧就在板下方了），于是一次
       都判不到。改成：球只要落在挡板扫过的那片扇形里，且挡板正在抬起或刚
       拍过，就算被打到。用 dir 把右挡板镜像到左挡板的坐标系里，一套算式通用。 */
    function flipKick(ball, f) {
      if (!(f.kickT > 0 || f.w < -.6)) return false;
      if (ball.noKick > 0) return false;   // 同一次拍击别反复给力
      const dx = (ball.x - f.px) * f.dir, dy = ball.y - f.py;
      const d = Math.hypot(dx, dy);
      if (d > FL + R || d < 10) return false;
      const a = Math.atan2(dy, dx);
      if (a > REST + .25 || a < UP - .25) return false;
      f.kickT = 0;
      ball.noKick = .2;                   // 挡板抬起要 40ms，横跨好几个子步
      const nx = Math.sin(a) * f.dir, ny = -Math.cos(a);   // 垂直板面朝上
      const sp = 300 + 240 * (d / FL);    // 越靠板尖打得越远
      ball.vx = nx * sp; ball.vy = ny * sp;
      return true;
    }

    function step(dt, time) {
      if (charging) {
        power = Math.min(100, power + 78 * dt);
        if (snd) snd.set(170 + power * 7, .07 + power * .0009);
      }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

      // 挡板朝目标角插值；kickT 是拍击的宽限窗口，比瞬时角速度宽容得多
      for (const f of flips) {
        if (f.hold > 0) { f.hold -= dt; if (f.hold <= 0) f.on = false; }
        if (f.kickT > 0) f.kickT -= dt;
        const prev = f.a;
        f.a += ((f.on ? UP : REST) - f.a) * Math.min(1, dt * 24);
        f.w = (f.a - prev) / Math.max(dt, 1e-4);
      }

      for (let bi = live.length - 1; bi >= 0; bi--) {
        const ball = live[bi];
        // 分步积分，避免高速穿过星星和挡板
        const steps = 4, h = dt / steps;
        if (ball.noKick > 0) ball.noKick -= dt;
        for (let s = 0; s < steps; s++) {
          ball.vy += GRAV * h;
          ball.x += ball.vx * h; ball.y += ball.vy * h;

          if (ball.x < WALL + R) { ball.x = WALL + R; ball.vx = Math.abs(ball.vx) * .82; S.click(); }
          if (ball.x > W - WALL - R) { ball.x = W - WALL - R; ball.vx = -Math.abs(ball.vx) * .82; S.click(); }
          if (ball.y < WALL + R) { ball.y = WALL + R; ball.vy = Math.abs(ball.vy) * .82; S.click(); }

          for (const st of stars)
            if (st.on && FX.dist(ball.x, ball.y, st.x, st.y) <= st.r + R) hitStar(ball, st);

          for (const b of bumps) {
            const d = FX.dist(ball.x, ball.y, b.x, b.y);
            if (d > b.r + R) continue;
            const nx = (ball.x - b.x) / (d || 1), ny = (ball.y - b.y) / (d || 1);
            ball.x = b.x + nx * (b.r + R + .5);
            ball.y = b.y + ny * (b.r + R + .5);
            const sp = Math.max(240, Math.hypot(ball.vx, ball.vy) * 1.04);
            ball.vx = nx * sp; ball.vy = ny * sp;
            b.hit = .22;
            g.addScore(5);
            S.pop(2);
            g.fx.ring(b.x, b.y, { r: b.r, r2: b.r * 2.2, c: '#7ff5d8', life: .3 });
          }

          for (const gd of GUIDES) segHit(ball, gd[0], gd[1], gd[2], gd[3], .6, 0);

          for (const f of flips) {
            // 先看有没有被拍飞（扇形判定），没有再当斜坡挡一下
            if (flipKick(ball, f)) {
              kicks.touch++; kicks.kick++;
              S.pop(1);
              g.fx.burst(ball.x, ball.y, { n: 8, c: '#b49bff', sp: 130, life: .32, r: 2.5 });
              continue;
            }
            const [tx, ty] = flipTip(f);
            if (segHit(ball, f.px, f.py, tx, ty, .34, 0, true)) kicks.touch++;
          }

          ball.vx *= Math.pow(.999, h * 60);
        }

        g.fx.trail(ball.x, ball.y, { c: '#fff0b8', r: 3, life: .32 });
        if (ball.y > DRAIN) { live.splice(bi, 1); lost(); }
      }

      if (playing && dream >= DREAM_MAX && live.length) multiball();
      if (playing && !stars.some(s => s.on)) nextWave();

      // ---- 绘制 ----
      g.fx.step(dt);
      g.fx.begin(ctx);
      g.sky.draw(ctx, time * .26);

      // 台面边框
      ctx.save();
      ctx.strokeStyle = 'rgba(180,160,255,.3)'; ctx.lineWidth = 2;
      FX.roundRect(ctx, WALL, WALL, W - WALL * 2, H - WALL - 2, 14);
      ctx.stroke();
      // 导流墙
      ctx.strokeStyle = 'rgba(180,160,255,.4)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const gd of GUIDES) {
        ctx.beginPath(); ctx.moveTo(gd[0], gd[1]); ctx.lineTo(gd[2], gd[3]); ctx.stroke();
      }
      ctx.restore();

      for (const b of bumps) {
        if (b.hit > 0) b.hit = Math.max(0, b.hit - dt);
        const k = 1 + b.hit * 1.1;
        FX.glow(ctx, b.x, b.y, b.r * 1.9 * k, '#7ff5d8', .18 + b.hit * .8);
        ctx.save();
        ctx.strokeStyle = `rgba(127,245,216,${(.5 + b.hit * 2).toFixed(2)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * k, 0, 7); ctx.stroke();
        ctx.restore();
      }

      for (const st of stars)
        if (st.on) FX.star(ctx, st.x, st.y, st.r + Math.sin(time * 2 + st.ph) * .8, st.hue, 14, time * .5 + st.ph);

      // 挡板：拍起来的瞬间会发光
      for (const f of flips) {
        const [tx, ty] = flipTip(f), hot = f.w < -.6;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = hot ? '#e0d4ff' : '#b49bff';
        ctx.shadowColor = '#b49bff'; ctx.shadowBlur = hot ? 20 : 10;
        ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.restore();
      }

      // 瞄准线（待发射时）
      if (ready && playing) {
        const len = 40 + power * .6;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = `rgba(255,215,106,${(.4 + power * .005).toFixed(2)})`;
        ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(PX, PY);
        ctx.lineTo(PX + Math.cos(aim) * len, PY + Math.sin(aim) * len);
        ctx.stroke();
        ctx.restore();
        FX.moon(ctx, PX, PY, R, '#fff0b8');
      }

      for (const ball of live) FX.moon(ctx, ball.x, ball.y, R, '#fff0b8');

      // 云梦梦在左下角打呼
      FX.sprite(ctx, ART.hero, 36, H - 32, 21, {
        squash: 1 + Math.sin(time * .9) * .04,
        glow: '#b49bff', glowA: .2,
        fb: (c, x, y, r) => FX.cloud(c, x, y, r * 1.5, { mood: 'sleep' })
      });

      g.fx.draw(ctx);
      g.fx.end(ctx);

      // 底部两条：蓄力（金）+ 梦境槽（紫，满了开多球）
      ctx.save();
      const bx = 76, bw = W - 100;
      ctx.fillStyle = 'rgba(255,255,255,.1)';
      FX.roundRect(ctx, bx, H - 12, bw, 6, 3); ctx.fill();
      const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grd.addColorStop(0, '#7ff5d8'); grd.addColorStop(1, '#ffd76a');
      ctx.fillStyle = grd;
      FX.roundRect(ctx, bx, H - 12, bw * power / 100, 6, 3); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,.1)';
      FX.roundRect(ctx, bx, H - 22, bw, 5, 3); ctx.fill();
      ctx.fillStyle = dream >= DREAM_MAX ? '#fff' : '#e0a8ff';
      FX.roundRect(ctx, bx, H - 22, bw * dream / DREAM_MAX, 5, 3); ctx.fill();

      // 波次
      ctx.fillStyle = 'rgba(207,214,245,.5)';
      ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'right';
      ctx.fillText('WAVE ' + wave, W - 14, H - 28);
      ctx.restore();
    }

    L = g.loop(step);
    /* 同一组控制两用：球还没发射时 ←→ 调角度，球在场上时 ←→ 拍挡板。
       点屏幕同理 —— 待发射时是蓄力，球在场上时按左右半边拍对应挡板。 */
    g.pointer({
      down: p => { if (ready) startCharge(); else flip(p.x < W / 2 ? 0 : 1); },
      up: release
    });
    g.keys({
      ' ': startCharge, Enter: startCharge,
      ArrowLeft: () => {
        if (ready) aim = FX.clamp(aim - .06, AIM_MIN, AIM_MAX);
        else flip(0);
      },
      ArrowRight: () => {
        if (ready) aim = FX.clamp(aim + .06, AIM_MIN, AIM_MAX);
        else flip(1);
      }
    }, { up: { ' ': release, Enter: release } });

    g.overlay({
      big: '梦乡弹珠', stat: '3 颗月亮 · 一波接一波',
      sub: '←→ 瞄准后按住蓄力发射。球在场上时 ←→ 变成左右挡板，球快漏下去就拍回去。' +
        '紫槽攒满会开多球，星星全点亮进下一波并多送一颗月亮',
      btn: '开始', onBtn: reset
    });
  };

})();
