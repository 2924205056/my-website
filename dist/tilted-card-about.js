/**
 * TiltedCard for the About page cloud image, adapted for the static build.
 */
(function() {
  'use strict';

  var STYLE_ID = 'about-tilted-card-style';
  var BOUND_ATTR = 'data-tilted-about-bound';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.about-tilted-card{position:relative;perspective:800px;overflow:visible!important;isolation:isolate;cursor:pointer;min-height:220px;display:flex;align-items:center;justify-content:center;}',
      '.about-tilted-card::before{content:"";position:absolute;inset:16px;border-radius:28px;background:radial-gradient(circle at var(--tilt-x,50%) var(--tilt-y,50%),rgba(255,255,255,.72),rgba(255,255,255,.16) 28%,rgba(255,255,255,0) 54%);opacity:var(--tilt-opacity,0);transition:opacity .28s ease;pointer-events:none;z-index:1;}',
      '.about-tilted-card::after{content:"Cloud builder";position:absolute;left:var(--tilt-x,50%);top:var(--tilt-y,50%);transform:translate(14px,14px) rotate(var(--caption-rotate,0deg));border-radius:8px;background:rgba(255,255,255,.92);padding:5px 10px;font-family:Space Mono,monospace;font-size:10px;color:#31508d;box-shadow:0 10px 24px rgba(72,116,176,.16);opacity:var(--tilt-opacity,0);transition:opacity .18s ease;pointer-events:none;z-index:4;}',
      '.about-tilted-card img[alt="小康云"]{position:relative;z-index:2;transform:rotateX(var(--tilt-rx,0deg)) rotateY(var(--tilt-ry,0deg)) scale(var(--tilt-scale,1));transform-style:preserve-3d;will-change:transform;transition:transform .36s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 18px 30px rgba(91,155,213,.24));}',
      '.about-tilted-card .about-tilted-spark{position:absolute;width:16px;height:16px;right:24%;top:26%;z-index:3;opacity:var(--tilt-opacity,0);transform:translateZ(40px) scale(var(--tilt-scale,1));transition:opacity .24s ease,transform .36s cubic-bezier(.2,.8,.2,1);pointer-events:none;}',
      '.about-tilted-card .about-tilted-spark::before{content:"";position:absolute;inset:0;background:#60b8ff;clip-path:polygon(50% 0%,61% 38%,100% 50%,61% 62%,50% 100%,39% 62%,0 50%,39% 38%);filter:drop-shadow(0 4px 8px rgba(96,184,255,.32));}',
      '.about-tilted-profile{position:absolute;left:clamp(22px,6vw,58px);right:clamp(22px,6vw,58px);bottom:clamp(22px,5vw,42px);z-index:3;display:grid;gap:12px;justify-items:start;pointer-events:none;transform:translateZ(28px);}',
      '.about-tilted-profile strong{display:block;font-family:var(--font-display,inherit);font-size:clamp(24px,4vw,42px);line-height:1;color:#2f4e8d;text-shadow:0 2px 12px rgba(255,255,255,.82);}',
      '.about-tilted-profile p{max-width:30ch;margin:0;font-family:Space Mono,monospace;font-size:clamp(11px,1.6vw,14px);line-height:1.7;color:#5574a5;}',
      '.about-tilted-chips{display:flex;flex-wrap:wrap;gap:8px;}',
      '.about-tilted-chips span{border:1px solid rgba(255,255,255,.78);border-radius:999px;background:rgba(255,255,255,.64);padding:6px 10px;font-family:Space Mono,monospace;font-size:10px;color:#42649b;box-shadow:0 8px 18px rgba(92,146,205,.12);backdrop-filter:blur(10px);}',
      '@media (max-width:720px){.about-tilted-profile{left:20px;right:20px;bottom:20px;justify-items:center;text-align:center}.about-tilted-card{min-height:300px}.about-tilted-card img[alt="小康云"]{margin-top:-56px;max-width:220px!important;}}',
      '@media (pointer:coarse),(prefers-reduced-motion:reduce){.about-tilted-card::before,.about-tilted-card::after,.about-tilted-card .about-tilted-spark{display:none!important}.about-tilted-card img[alt="小康云"]{transform:none!important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function isVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function findAboutCard() {
    var headings = Array.from(document.querySelectorAll('h1,h2,h3'));
    var aboutHeading = headings.find(function(el) {
      return isVisible(el) && (el.textContent || '').indexOf('一个长得像云朵') >= 0;
    });
    if (!aboutHeading) return null;
    var section = aboutHeading.closest('section');
    if (!section) return null;
    var img = Array.from(section.querySelectorAll('img[alt="小康云"]')).find(isVisible);
    return img ? img.closest('div') : null;
  }

  function setVars(card, vars) {
    Object.keys(vars).forEach(function(key) {
      card.style.setProperty(key, vars[key]);
    });
  }

  function updateTilt(card, e) {
    var rect = card.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var offsetX = x - rect.width / 2;
    var offsetY = y - rect.height / 2;
    var rotateAmplitude = 14;
    var rotateX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    var rotateY = (offsetX / (rect.width / 2)) * rotateAmplitude;
    var lastY = Number(card.dataset.tiltLastY || 0);
    var velocityY = offsetY - lastY;
    card.dataset.tiltLastY = String(offsetY);

    setVars(card, {
      '--tilt-x': x + 'px',
      '--tilt-y': y + 'px',
      '--tilt-rx': rotateX.toFixed(2) + 'deg',
      '--tilt-ry': rotateY.toFixed(2) + 'deg',
      '--tilt-scale': '1.08',
      '--tilt-opacity': '1',
      '--caption-rotate': Math.max(-14, Math.min(14, -velocityY * 0.6)).toFixed(2) + 'deg'
    });
  }

  function resetTilt(card) {
    card.dataset.tiltLastY = '0';
    setVars(card, {
      '--tilt-rx': '0deg',
      '--tilt-ry': '0deg',
      '--tilt-scale': '1',
      '--tilt-opacity': '0',
      '--caption-rotate': '0deg'
    });
  }

  function bind(card) {
    if (!card || card.getAttribute(BOUND_ATTR) === 'true') return;
    card.setAttribute(BOUND_ATTR, 'true');
    card.classList.add('about-tilted-card');
    if (!card.querySelector('.about-tilted-spark')) {
      var spark = document.createElement('span');
      spark.className = 'about-tilted-spark';
      card.appendChild(spark);
    }
    if (!card.querySelector('.about-tilted-profile')) {
      var profile = document.createElement('div');
      profile.className = 'about-tilted-profile';
      profile.innerHTML = [
        '<strong>杨云康</strong>',
        '<p>产品运营 / AI 应用搭建，把内容、工作流和网页做成好玩的体验。</p>',
        '<div class="about-tilted-chips">',
          '<span>Workflow</span>',
          '<span>内容运营</span>',
          '<span>Prompt</span>',
        '</div>'
      ].join('');
      card.appendChild(profile);
    }

    card.addEventListener('mousemove', function(e) {
      updateTilt(card, e);
    }, { passive: true });

    card.addEventListener('pointermove', function(e) {
      updateTilt(card, e);
    }, { passive: true });

    card.addEventListener('mouseenter', function() {
      setVars(card, { '--tilt-scale': '1.08', '--tilt-opacity': '1' });
    }, { passive: true });

    card.addEventListener('mouseleave', function() {
      resetTilt(card);
    }, { passive: true });

    card.addEventListener('pointerleave', function() {
      resetTilt(card);
    }, { passive: true });
  }

  function run() {
    installStyles();
    bind(findAboutCard());
  }

  run();
  setInterval(run, 700);
  document.addEventListener('DOMContentLoaded', run);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();
