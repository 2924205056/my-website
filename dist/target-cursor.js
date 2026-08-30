/**
 * TargetCursor — React Bits cursor effect adapted for this static portfolio.
 * It only targets visible portfolio elements and keeps the native cursor.
 */
(function() {
  'use strict';

  var TARGET_CLASS = 'target-cursor-hit';
  var activeTarget = null;
  var cursor = null;
  var dot = null;
  var corners = [];
  var spinTween = null;
  var tickerActive = false;
  var targetPositions = null;
  var strength = { value: 0 };
  var lastX = window.innerWidth / 2;
  var lastY = window.innerHeight / 2;

  function isDisabled() {
    return window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function waitForGsap(cb) {
    if (window.gsap) {
      cb();
      return;
    }
    var tries = 0;
    var timer = setInterval(function() {
      tries += 1;
      if (window.gsap) {
        clearInterval(timer);
        cb();
      } else if (tries > 12) {
        clearInterval(timer);
        window.gsap = createFallbackGsap();
        cb();
      }
    }, 100);
  }

  function createFallbackGsap() {
    var tickerFns = [];
    var tickerRunning = false;

    function ensureState(el) {
      if (!el.__targetCursorState) {
        el.__targetCursorState = { x: 0, y: 0, xPercent: 0, yPercent: 0, scale: 1, rotation: 0 };
      }
      return el.__targetCursorState;
    }

    function applyTransform(el) {
      var s = ensureState(el);
      el.style.transform =
        'translate(' + s.x + 'px,' + s.y + 'px) ' +
        'translate(' + s.xPercent + '%,' + s.yPercent + '%) ' +
        'rotate(' + s.rotation + 'deg) ' +
        'scale(' + s.scale + ')';
    }

    function setOne(target, vars) {
      if (!target) return;
      if (target.nodeType === 1) {
        var state = ensureState(target);
        ['x', 'y', 'xPercent', 'yPercent', 'scale', 'rotation'].forEach(function(prop) {
          if (vars[prop] === undefined) return;
          var value = vars[prop];
          if (typeof value === 'string' && value.indexOf('+=') === 0) {
            value = (Number(state[prop]) || 0) + Number(value.slice(2));
          }
          state[prop] = Number(value);
        });
        applyTransform(target);
      } else {
        Object.keys(vars).forEach(function(prop) {
          if (prop !== 'duration' && prop !== 'ease' && prop !== 'overwrite' && prop !== 'repeat') {
            target[prop] = vars[prop];
          }
        });
      }
    }

    function animateObject(target, vars) {
      var duration = Math.max(0, Number(vars.duration || 0)) * 1000;
      var keys = Object.keys(vars).filter(function(prop) {
        return prop !== 'duration' && prop !== 'ease' && prop !== 'overwrite' && prop !== 'repeat';
      });
      var start = {};
      keys.forEach(function(prop) { start[prop] = Number(target[prop]) || 0; });
      var startTime = Date.now();

      function tick() {
        var progress = duration ? Math.min(1, (Date.now() - startTime) / duration) : 1;
        keys.forEach(function(prop) {
          var end = Number(vars[prop]);
          target[prop] = start[prop] + (end - start[prop]) * progress;
        });
        if (progress < 1) requestAnimationFrame(tick);
      }

      tick();
    }

    function runTicker() {
      if (!tickerFns.length) {
        tickerRunning = false;
        return;
      }
      tickerFns.slice().forEach(function(fn) { fn(); });
      requestAnimationFrame(runTicker);
    }

    return {
      set: function(target, vars) {
        if (target && typeof target.length === 'number' && !target.nodeType) {
          Array.from(target).forEach(function(el) { setOne(el, vars); });
        } else {
          setOne(target, vars);
        }
      },
      to: function(target, vars) {
        if (target && target.nodeType === 1) {
          target.style.transition = 'transform ' + (vars.duration || 0.2) + 's cubic-bezier(.16,1,.3,1)';
          setOne(target, vars);
        } else {
          animateObject(target, vars);
        }
        return { pause: function(){}, play: function(){}, kill: function(){}, restart: function(){} };
      },
      killTweensOf: function(){},
      getProperty: function(target, prop) {
        var state = ensureState(target);
        return state[prop] || 0;
      },
      ticker: {
        add: function(fn) {
          if (tickerFns.indexOf(fn) === -1) tickerFns.push(fn);
          if (!tickerRunning) {
            tickerRunning = true;
            requestAnimationFrame(runTicker);
          }
        },
        remove: function(fn) {
          tickerFns = tickerFns.filter(function(item) { return item !== fn; });
        }
      }
    };
  }

  function makeCursor() {
    if (document.getElementById('target-cursor')) return document.getElementById('target-cursor');
    var style = document.createElement('style');
    style.textContent = [
      '.target-cursor-wrapper{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:9999;mix-blend-mode:multiply;transform:translate(-50%,-50%);}',
      '.target-cursor-dot{position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:999px;background:#31508d;box-shadow:0 0 0 4px rgba(255,255,255,.55);transform:translate(-50%,-50%);will-change:transform;}',
      '.target-cursor-corner{position:absolute;left:50%;top:50%;width:14px;height:14px;border:3px solid #31508d;filter:drop-shadow(0 2px 4px rgba(255,255,255,.8));will-change:transform;}',
      '.target-cursor-corner.corner-tl{transform:translate(-150%,-150%);border-right:0;border-bottom:0;}',
      '.target-cursor-corner.corner-tr{transform:translate(50%,-150%);border-left:0;border-bottom:0;}',
      '.target-cursor-corner.corner-br{transform:translate(50%,50%);border-left:0;border-top:0;}',
      '.target-cursor-corner.corner-bl{transform:translate(-150%,50%);border-right:0;border-top:0;}',
      '.target-cursor-hit{cursor:pointer;}'
    ].join('');
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.id = 'target-cursor';
    el.className = 'target-cursor-wrapper';
    el.innerHTML = [
      '<div class="target-cursor-dot"></div>',
      '<div class="target-cursor-corner corner-tl"></div>',
      '<div class="target-cursor-corner corner-tr"></div>',
      '<div class="target-cursor-corner corner-br"></div>',
      '<div class="target-cursor-corner corner-bl"></div>'
    ].join('');
    document.body.appendChild(el);
    return el;
  }

  function moveCursor(x, y) {
    lastX = x;
    lastY = y;
    window.gsap.to(cursor, {
      x: x,
      y: y,
      duration: 0.12,
      ease: 'power3.out',
      overwrite: 'auto'
    });
  }

  function resetCorners() {
    var positions = [
      { x: -21, y: -21 },
      { x: 7, y: -21 },
      { x: 7, y: 7 },
      { x: -21, y: 7 }
    ];
    corners.forEach(function(corner, i) {
      window.gsap.to(corner, {
        x: positions[i].x,
        y: positions[i].y,
        duration: 0.28,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    });
  }

  function updateTargetPositions(target) {
    var rect = target.getBoundingClientRect();
    var border = 5;
    var size = 14;
    targetPositions = [
      { x: rect.left - border, y: rect.top - border },
      { x: rect.right + border - size, y: rect.top - border },
      { x: rect.right + border - size, y: rect.bottom + border - size },
      { x: rect.left - border, y: rect.bottom + border - size }
    ];
  }

  function ticker() {
    if (!targetPositions || !cursor) return;
    var cursorX = Number(window.gsap.getProperty(cursor, 'x')) || lastX;
    var cursorY = Number(window.gsap.getProperty(cursor, 'y')) || lastY;
    corners.forEach(function(corner, i) {
      var currentX = Number(window.gsap.getProperty(corner, 'x')) || 0;
      var currentY = Number(window.gsap.getProperty(corner, 'y')) || 0;
      var targetX = targetPositions[i].x - cursorX;
      var targetY = targetPositions[i].y - cursorY;
      window.gsap.to(corner, {
        x: currentX + (targetX - currentX) * strength.value,
        y: currentY + (targetY - currentY) * strength.value,
        duration: 0.08,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    });
  }

  function enterTarget(target) {
    if (!target || target === activeTarget) return;
    activeTarget = target;
    updateTargetPositions(target);
    if (spinTween) spinTween.pause();
    window.gsap.killTweensOf(cursor, 'rotation');
    window.gsap.to(cursor, { rotation: 0, scale: 1.02, duration: 0.18, ease: 'power2.out' });
    window.gsap.to(dot, { scale: 0.7, duration: 0.2, ease: 'power2.out' });
    window.gsap.to(strength, { value: 1, duration: 0.2, ease: 'power2.out', overwrite: true });
    if (!tickerActive) {
      window.gsap.ticker.add(ticker);
      tickerActive = true;
    }
  }

  function leaveTarget() {
    if (!activeTarget) return;
    activeTarget = null;
    targetPositions = null;
    window.gsap.to(strength, { value: 0, duration: 0.12, overwrite: true });
    if (tickerActive) {
      window.gsap.ticker.remove(ticker);
      tickerActive = false;
    }
    window.gsap.to(cursor, { scale: 1, duration: 0.2, ease: 'power2.out' });
    window.gsap.to(dot, { scale: 1, duration: 0.2, ease: 'power2.out' });
    resetCorners();
    if (spinTween) spinTween.play();
  }

  function isVisible(el) {
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    return rect.width > 8 && rect.height > 8 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function portfolioIsActive() {
    return Array.from(document.querySelectorAll('h1,h2,h3')).some(function(el) {
      var text = (el.textContent || '').trim();
      return isVisible(el) && (
        text.indexOf('动效、交互和云朵感实验') >= 0 ||
        text === '实用工具' ||
        text === '个人作品集' ||
        text === '照片墙'
      );
    });
  }

  function refreshTargets() {
    document.querySelectorAll('.' + TARGET_CLASS).forEach(function(el) {
      el.classList.remove(TARGET_CLASS);
    });
    if (!portfolioIsActive()) {
      leaveTarget();
      return;
    }

    var selectors = [
      '.work-card-wrapper',
      '.portfolio-project-card',
      '#bounce-cards .bounce-card',
      '#portfolio-contact-tools iframe',
      '#portfolio-contact-tools button',
      '#portfolio-contact-tools a',
      '#portfolio-contact-tools input',
      '#portfolio-contact-tools textarea',
      '#portfolio-contact-tools select',
      '#portfolio-utility-tools a',
      'section a[href*=".html"]',
      'section a[href*="yangbaibai"]',
      'section a[href*="resume.yangbaibai"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(el) {
      if (isVisible(el)) el.classList.add(TARGET_CLASS);
    });
  }

  function init() {
    if (isDisabled()) return;
    cursor = makeCursor();
    dot = cursor.querySelector('.target-cursor-dot');
    corners = Array.from(cursor.querySelectorAll('.target-cursor-corner'));
    window.gsap.set(cursor, { xPercent: -50, yPercent: -50, x: lastX, y: lastY });
    resetCorners();
    spinTween = window.gsap.to(cursor, { rotation: '+=360', duration: 2.4, ease: 'none', repeat: -1 });

    window.addEventListener('mousemove', function(e) {
      moveCursor(e.clientX, e.clientY);
      if (activeTarget) updateTargetPositions(activeTarget);
    }, { passive: true });

    window.addEventListener('mouseover', function(e) {
      var target = e.target && e.target.closest && e.target.closest('.' + TARGET_CLASS);
      if (target) enterTarget(target);
    }, { passive: true });

    window.addEventListener('mouseout', function(e) {
      if (!activeTarget) return;
      var next = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.' + TARGET_CLASS);
      if (next === activeTarget) return;
      leaveTarget();
    }, { passive: true });

    window.addEventListener('scroll', function() {
      if (activeTarget) updateTargetPositions(activeTarget);
    }, { passive: true });

    window.addEventListener('mousedown', function() {
      window.gsap.to(cursor, { scale: 0.92, duration: 0.12, ease: 'power2.out' });
      window.gsap.to(dot, { scale: 0.55, duration: 0.12, ease: 'power2.out' });
    });
    window.addEventListener('mouseup', function() {
      window.gsap.to(cursor, { scale: activeTarget ? 1.02 : 1, duration: 0.16, ease: 'power2.out' });
      window.gsap.to(dot, { scale: activeTarget ? 0.7 : 1, duration: 0.16, ease: 'power2.out' });
    });

    refreshTargets();
    setInterval(refreshTargets, 800);
    new MutationObserver(refreshTargets).observe(document.documentElement, { childList: true, subtree: true });
  }

  waitForGsap(init);
})();
