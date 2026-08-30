/**
 * TargetCursor — 对齐 React Bits 原版
 * mix-blend-mode: difference + white = 任何背景都可见
 * targetSelector: .cursor-target
 * 因为本站不能用 GSAP transform，用 left/top + margin 代替
 */
(function() {
  'use strict';

  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var TARGET_SEL = '.cursor-target';
  var SPIN_DURATION = 2;
  var HOVER_DURATION = 0.2;
  var PARALLAX_ON = true;

  var cursor, dot, corners = [];
  var activeTarget = null;
  var isSnapped = false;
  var targetCornerPositions = null;
  var activeStrength = { current: 0 };
  var leaveHandler = null;
  var resumeTimeout = null;
  var gsapReady = false;

  var cx = 0, cy = 0, tx = 0, ty = 0;

  // ── Hero 检测 ─────────────────────────────────
  function getHero() {
    var img = document.querySelector('img[alt="小康云滑板形象"]');
    if (img) return img.closest('section');
    return document.querySelector('.cloud-hero-section');
  }

  function inHero(x, y) {
    var hero = getHero();
    if (!hero) return false;
    var r = hero.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // ── CSS ──────────────────────────────────────
  var style = document.createElement('style');
  style.id = 'tc-style';
  style.textContent = [
    '.target-cursor-wrapper{position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:9999;mix-blend-mode:difference;opacity:0;}',
    '.target-cursor-dot{position:absolute;left:50%;top:50%;width:4px;height:4px;background:#fff;border-radius:50%;margin:-2px 0 0 -2px;transition:opacity 0.2s;}',
    '.target-cursor-corner{position:absolute;left:50%;top:50%;width:12px;height:12px;border:3px solid #fff;transition:margin 0.25s cubic-bezier(0.22,0.61,0.36,1);}',
    '.corner-tl{margin:-18px 0 0 -18px;border-right:none;border-bottom:none;}',
    '.corner-tr{margin:-18px 0 0 6px;border-left:none;border-bottom:none;}',
    '.corner-br{margin:6px 0 0 6px;border-left:none;border-top:none;}',
    '.corner-bl{margin:6px 0 0 -18px;border-right:none;border-top:none;}'
  ].join('');
  document.head.appendChild(style);

  // ── DOM ──────────────────────────────────────
  cursor = document.createElement('div');
  cursor.className = 'target-cursor-wrapper';
  cursor.id = 'tccursor';

  dot = document.createElement('div');
  dot.className = 'target-cursor-dot';
  cursor.appendChild(dot);

  ['corner-tl','corner-tr','corner-br','corner-bl'].forEach(function(cls) {
    var c = document.createElement('div');
    c.className = 'target-cursor-corner ' + cls;
    cursor.appendChild(c);
  });

  var root = document.getElementById('root');
  if (root && root.parentNode) {
    root.parentNode.insertBefore(cursor, root);
  } else {
    document.body.appendChild(cursor);
  }
  corners = Array.from(cursor.querySelectorAll('.target-cursor-corner'));

  // ── 角标默认 margin ─────────────────────────
  var DEFAULT_MARGINS = [
    { l: -18, t: -18 },
    { l: 6,   t: -18 },
    { l: 6,   t: 6   },
    { l: -18, t: 6   }
  ];

  function resetCorners() {
    corners.forEach(function(c, i) {
      c.style.marginLeft = DEFAULT_MARGINS[i].l + 'px';
      c.style.marginTop = DEFAULT_MARGINS[i].t + 'px';
    });
  }

  // ── 吸附 / 解吸 ─────────────────────────────
  function snapTo(target) {
    if (!target || isSnapped) return;
    isSnapped = true;
    activeTarget = target;

    if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

    var rect = target.getBoundingClientRect();
    var B = 3, S = 12;
    targetCornerPositions = [
      { x: rect.left - B,           y: rect.top - B },
      { x: rect.right + B - S,      y: rect.top - B },
      { x: rect.right + B - S,      y: rect.bottom + B - S },
      { x: rect.left - B,           y: rect.bottom + B - S }
    ];

    dot.style.opacity = '0.4';

    // 角标吸附动画
    corners.forEach(function(c, i) {
      c.style.transition = 'margin 0.2s cubic-bezier(0.22,0.61,0.36,1)';
      c.style.marginLeft = (targetCornerPositions[i].x - cx) + 'px';
      c.style.marginTop = (targetCornerPositions[i].y - cy) + 'px';
    });

    // 如果有 GSAP，使用更丝滑的 ticker
    if (gsapReady) {
      gsap.to(activeStrength, { current: 1, duration: HOVER_DURATION, ease: 'power2.out' });
    }

    leaveHandler = function() {
      isSnapped = false;
      targetCornerPositions = null;
      activeTarget = null;
      if (gsapReady) { gsap.set(activeStrength, { current: 0, overwrite: true }); }
      else { activeStrength.current = 0; }
      dot.style.opacity = '1';
      resetCorners();
      if (target) target.removeEventListener('mouseleave', leaveHandler);
      leaveHandler = null;
    };
    target.addEventListener('mouseleave', leaveHandler);
  }

  function unsnap() {
    if (leaveHandler) leaveHandler();
  }

  var isInHero = false;

  // ── 隐藏默认光标（仅 Hero 区域）─────────────
  document.addEventListener('mousemove', function(e) {
    tx = e.clientX;
    ty = e.clientY;

    var nowInHero = inHero(e.clientX, e.clientY);
    if (nowInHero !== isInHero) {
      isInHero = nowInHero;
      cursor.style.opacity = isInHero ? '1' : '0';
      document.body.style.cursor = isInHero ? 'none' : '';
    }

    // 离开目标时解吸
    if (isSnapped && activeTarget) {
      var elUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (!elUnder || (elUnder !== activeTarget && !activeTarget.contains(elUnder))) {
        unsnap();
      }
    }
  }, { passive: true });

  document.addEventListener('mouseover', function(e) {
    if (!isInHero || isSnapped) return;
    var el = e.target;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.matches && el.matches(TARGET_SEL)) {
        snapTo(el);
        return;
      }
      el = el.parentElement;
    }
  });

  // ── 刷新目标 ────────────────────────────────
  function refreshTargets() {
    var hero = getHero();
    if (hero) {
      hero.querySelectorAll('a, button, [role="button"], img, [onclick]').forEach(function(el) {
        el.classList.add('cursor-target');
      });
    }
  }
  refreshTargets();
  setInterval(refreshTargets, 800);
  new MutationObserver(refreshTargets).observe(document.documentElement, { childList: true, subtree: true });

  // ── 渲染循环 ────────────────────────────────
  (function render() {
    if (!document.contains(cursor)) return requestAnimationFrame(render);

    if (!isSnapped) {
      cx += (tx - cx) * 0.3;
      cy += (ty - cy) * 0.3;
      cursor.style.left = cx + 'px';
      cursor.style.top = cy + 'px';
      var deg = (Date.now() / (SPIN_DURATION * 1000) * 360) % 360;
      cursor.style.transform = 'rotate(' + deg + 'deg)';
    } else {
      cursor.style.left = cx + 'px';
      cursor.style.top = cy + 'px';
      cursor.style.transform = 'rotate(0deg)';

      // Parallax 效果：角标持续追踪目标位置
      if (PARALLAX_ON && activeTarget && document.contains(activeTarget) && targetCornerPositions) {
        var strength = gsapReady ? (gsap.getProperty(activeStrength, 'current') || 0) : activeStrength.current;
        if (strength > 0) {
          var rect = activeTarget.getBoundingClientRect();
          var B = 3, S = 12;
          var tcx = [
            { x: rect.left - B,           y: rect.top - B },
            { x: rect.right + B - S,      y: rect.top - B },
            { x: rect.right + B - S,      y: rect.bottom + B - S },
            { x: rect.left - B,           y: rect.bottom + B - S }
          ];
          corners.forEach(function(c, i) {
            var curMarginL = parseFloat(c.style.marginLeft) || DEFAULT_MARGINS[i].l;
            var curMarginT = parseFloat(c.style.marginTop) || DEFAULT_MARGINS[i].t;
            var targetL = tcx[i].x - cx;
            var targetT = tcx[i].y - cy;
            c.style.marginLeft = (curMarginL + (targetL - curMarginL) * strength) + 'px';
            c.style.marginTop = (curMarginT + (targetT - curMarginT) * strength) + 'px';
          });
        }
      }
    }
    requestAnimationFrame(render);
  })();

  // ── 滚动检查 ────────────────────────────────
  window.addEventListener('scroll', function() {
    var hero = getHero();
    if (!hero) {
      cursor.style.opacity = '0';
      document.body.style.cursor = '';
      isInHero = false;
      return;
    }
    var r = hero.getBoundingClientRect();
    var inView = r.bottom > 0 && r.top < window.innerHeight;
    if (!inView) {
      cursor.style.opacity = '0';
      document.body.style.cursor = '';
      isInHero = false;
    }
    if (isSnapped && activeTarget) {
      var elUnder = document.elementFromPoint(cx, cy);
      if (!elUnder || (elUnder !== activeTarget && !activeTarget.contains(elUnder))) {
        unsnap();
      }
    }
  }, { passive: true });

  // ── 鼠标按下缩放 ────────────────────────────
  document.addEventListener('mousedown', function() {
    dot.style.transform = 'scale(0.7)';
  });
  document.addEventListener('mouseup', function() {
    dot.style.transform = 'scale(1)';
  });

  // ── GSAP 升级（可选） ────────────────────────
  function tryGsap() {
    if (!window.gsap || !window.gsap.to) return;
    gsapReady = true;
    console.log('[TC] GSAP 加速已启用');
  }
  tryGsap();
  if (!gsapReady) {
    var n = 0;
    var t = setInterval(function() {
      n++; tryGsap();
      if (gsapReady || n > 50) clearInterval(t);
    }, 100);
  }

  // 初始位置
  cx = tx = window.innerWidth / 2;
  cy = ty = window.innerHeight / 2;
  cursor.style.left = cx + 'px';
  cursor.style.top = cy + 'px';

  console.log('[TC] ✓ TargetCursor (React Bits 对齐版)');
})();
