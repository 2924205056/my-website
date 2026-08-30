/* 云朵家族 · 梦幻绘本风共享脚本
   负责：星空画布、星系漩涡、柔光颗粒、互动面板开关、简单粒子 */
(function () {
  // ---------- 星空 + 星系漩涡 ----------
  function paintSky() {
    const starC = document.getElementById('sky-stars');
    const galC = document.getElementById('sky-galaxy');
    if (!starC) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;

    // 星点层
    starC.width = w * dpr; starC.height = h * dpr;
    const s = starC.getContext('2d'); s.scale(dpr, dpr);
    s.clearRect(0, 0, w, h);
    // 背景渐变
    const bg = s.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a1330'); bg.addColorStop(.5, '#0a1128'); bg.addColorStop(1, '#070d1f');
    s.fillStyle = bg; s.fillRect(0, 0, w, h);
    // 星点
    const N = Math.floor((w * h) / 9000);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const r = Math.random() * 1.3 + .3;
      const gold = Math.random() < .18;
      s.globalAlpha = Math.random() * .7 + .25;
      s.fillStyle = gold ? '#ffd76a' : '#dfe8ff';
      s.beginPath(); s.arc(x, y, r, 0, 7); s.fill();
    }
    s.globalAlpha = 1;

    // 星系漩涡层
    if (!galC) return;
    galC.width = w * dpr; galC.height = h * dpr;
    const g = galC.getContext('2d'); g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const cx = w * .72, cy = h * .3, R = Math.min(w, h) * .55;
    for (let i = 0; i < 260; i++) {
      const t = i / 260;
      const ang = t * Math.PI * 6 + Math.sin(t * 9) * .3;
      const rad = t * R * (0.85 + Math.random() * .3);
      const x = cx + Math.cos(ang) * rad * 1.25;
      const y = cy + Math.sin(ang) * rad * .82;
      const rr = (1 - t) * 2.2 + .4;
      const teal = Math.random() < .7;
      g.globalAlpha = (1 - t) * .5 * (Math.random() * .6 + .4);
      g.fillStyle = teal ? '#2fe0c0' : '#5b8def';
      g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }

  let rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(paintSky, 200); });
  paintSky();

  // ---------- 互动面板 ----------
  const orb = document.querySelector('.orb');
  const panel = document.getElementById('panel');
  const closeBtn = panel && panel.querySelector('.close');
  const fire = n => document.dispatchEvent(new CustomEvent(n));
  function open() {
    if (!panel) return;
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    fire('cg:resume');
  }
  function close() {
    if (!panel) return;
    panel.classList.remove('show');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    fire('cg:pause');
  }
  if (orb) {
    orb.addEventListener('click', open);
    orb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (panel) panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // ---------- 粒子工具：从某元素爆发小符号 ----------
  window.cloudBurst = function (host, symbols, count) {
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    for (let i = 0; i < (count || 14); i++) {
      const el = document.createElement('span');
      el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:99;pointer-events:none;` +
        `font-size:${14 + Math.random() * 20}px;will-change:transform,opacity;` +
        `text-shadow:0 0 12px rgba(255,215,106,.8)`;
      document.body.appendChild(el);
      const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 170;
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 60;
      el.animate([
        { transform: 'translate(-50%,-50%) scale(.4) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.2) rotate(${(Math.random() - .5) * 160}deg)`, opacity: 0 }
      ], { duration: 1100 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.3,1)' })
        .onfinish = () => el.remove();
    }
  };
})();
