/**
 * Stable Photo Wall — always renders one managed wall with 6 cards.
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'daily_posts';
  var remoteImages = [];
  var remoteLoaded = false;
  var lastSignature = '';
  var fallbackImages = [
    '/images/portfolio/slide1_img0.jpg',
    '/images/portfolio/slide2_img4.png',
    '/images/portfolio/slide3_img8.png',
    '/images/portfolio/slide4_img14.jpg',
    '/images/portfolio/slide5_img18.png',
    '/images/portfolio/slide6_img21.jpg'
  ];
  var transforms = [
    'rotate(10deg) translate(-225px)',
    'rotate(5deg) translate(-135px)',
    'rotate(-3deg) translate(-45px)',
    'rotate(4deg) translate(45px)',
    'rotate(-7deg) translate(135px)',
    'rotate(6deg) translate(225px)'
  ];
  var hoverPush = 160;

  // Stable selector for React's own (old) PhotoWall section.
  var REACT_WALL_SELECTOR = 'section[code-path="src/sections/PhotoWall.tsx:52:5"]';
  var HOST_ID = 'photo-wall-stable-host';

  function ensureMotionStyles() {
    if (document.getElementById('photo-wall-motion-style')) return;
    var style = document.createElement('style');
    style.id = 'photo-wall-motion-style';
    style.textContent =
      // Permanently hide React's old grid so it can never flash back.
      REACT_WALL_SELECTOR + '{display:none!important;}' +
      // Fit wrapper: full width, centers the fixed-size wall, clips nothing visible.
      '#bounce-cards-fit{width:100%!important;display:flex!important;justify-content:center!important;overflow:hidden!important;}' +
      // Fixed design footprint (locked with !important so page CSS can never stretch it).
      // JS scales this down to fit narrow screens, so it always looks like the demo.
      '#bounce-cards{position:relative!important;width:760px!important;height:360px!important;flex:0 0 auto!important;margin:24px 0 0!important;display:flex!important;justify-content:center!important;align-items:center!important;overflow:visible!important;transform-origin:center center;}' +
      '#bounce-cards .bounce-card{position:absolute!important;width:180px!important;height:180px!important;aspect-ratio:auto!important;border:5px solid rgba(255,255,255,.95)!important;border-radius:25px!important;overflow:hidden!important;box-shadow:0 14px 34px rgba(47,78,141,.2);background:linear-gradient(135deg,#d7ecff,#88A2CC);cursor:pointer;will-change:transform;transition:box-shadow .3s ease;}' +
      '#bounce-cards .bounce-card:hover{z-index:5;box-shadow:0 22px 44px rgba(47,78,141,.28);}' +
      '#bounce-cards .bounce-card img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}' +
      '@media (prefers-reduced-motion:reduce){#bounce-cards .bounce-card{animation:none!important;}}';
    document.head.appendChild(style);
  }

  function noRotationTransform(transformStr) {
    if (/rotate\([\s\S]*?\)/.test(transformStr)) {
      return transformStr.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
    }
    return transformStr === 'none' ? 'rotate(0deg)' : transformStr + ' rotate(0deg)';
  }

  function pushedTransform(baseTransform, offsetX) {
    var translateRegex = /translate\(([-0-9.]+)px\)/;
    var match = baseTransform.match(translateRegex);
    if (match) {
      var currentX = parseFloat(match[1]);
      return baseTransform.replace(translateRegex, 'translate(' + (currentX + offsetX) + 'px)');
    }
    return baseTransform === 'none' ? 'translate(' + offsetX + 'px)' : baseTransform + ' translate(' + offsetX + 'px)';
  }

  function tweenTransform(target, transform, delay) {
    if (typeof window.gsap !== 'undefined') {
      window.gsap.killTweensOf(target);
      window.gsap.to(target, {
        transform: transform,
        duration: 0.4,
        ease: 'back.out(1.4)',
        delay: delay || 0,
        overwrite: 'auto'
      });
    } else {
      target.style.transform = transform;
    }
  }

  function pushSiblings(container, hoveredIdx) {
    Array.from(container.querySelectorAll('.bounce-card')).forEach(function(card, i) {
      var base = transforms[i] || 'none';
      if (i === hoveredIdx) {
        tweenTransform(card, noRotationTransform(base), 0);
      } else {
        var offset = i < hoveredIdx ? -hoverPush : hoverPush;
        tweenTransform(card, pushedTransform(base, offset), Math.abs(hoveredIdx - i) * 0.05);
      }
    });
  }

  function resetSiblings(container) {
    Array.from(container.querySelectorAll('.bounce-card')).forEach(function(card, i) {
      tweenTransform(card, transforms[i] || 'none', 0);
    });
  }

  function bindContainerHover(container) {
    if (container.dataset.bounceHoverBound === 'true') return;
    container.dataset.bounceHoverBound = 'true';
    var activeIndex = -1;

    container.addEventListener('mousemove', function(e) {
      var cards = Array.from(container.querySelectorAll('.bounce-card'));
      var nextIndex = -1;
      cards.forEach(function(card, i) {
        var rect = card.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          nextIndex = i;
        }
      });

      if (nextIndex !== activeIndex) {
        activeIndex = nextIndex;
        if (activeIndex >= 0) {
          pushSiblings(container, activeIndex);
        } else {
          resetSiblings(container);
        }
      }
    }, { passive: true });

    container.addEventListener('mouseleave', function() {
      activeIndex = -1;
      resetSiblings(container);
    }, { passive: true });
  }

  function safeParse(raw) {
    if (!raw) return [];
    try {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.posts)) return data.posts;
      if (data && Array.isArray(data.items)) return data.items;
    } catch (e) {}
    return [];
  }

  function normalizeImages(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.reduce(function(list, item) {
        return list.concat(normalizeImages(item));
      }, []);
    }
    if (typeof value === 'string') return [value];
    if (typeof value === 'object') {
      return normalizeImages(value.src || value.url || value.path || value.image);
    }
    return [];
  }

  function isUsableImage(src) {
    return typeof src === 'string' && (
      src.indexOf('data:image/') === 0 ||
      src.indexOf('blob:') === 0 ||
      src.indexOf('/') === 0 ||
      src.indexOf('http://') === 0 ||
      src.indexOf('https://') === 0
    );
  }

  function extractImages(posts) {
    return safeParse(posts).sort(function(a, b) {
      return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
    }).reduce(function(list, post) {
      ['images', 'image', 'imgs', 'photos', 'photo', 'pictures', 'cover'].forEach(function(key) {
        normalizeImages(post && post[key]).forEach(function(src) {
          if (isUsableImage(src)) list.push(src);
        });
      });
      return list;
    }, []);
  }

  function getLocalImages() {
    // 从 localStorage 回退读取图片
    try {
      var posts = localStorage.getItem('daily_posts');
      if (posts) {
        var images = extractImages(posts);
        if (images.length > 0) return images;
      }
    } catch (e) {}
    return [];
  }

  function getAPIImages() {
    if (typeof fetch !== 'function') return Promise.resolve([]);
    return fetch('/api/daily/photos?limit=6')
      .then(function(r) { return r.ok ? r.json() : { images: [] }; })
      .then(function(data) { return (data && data.images) || []; })
      .catch(function() { return []; });
  }

  function sixImages() {
    var result = [];
    var seen = {};
    // API 图片优先，再是本地回退，最后兜底
    remoteImages.concat(getLocalImages(), fallbackImages, fallbackImages).forEach(function(src) {
      if (result.length >= 6 || !isUsableImage(src)) return;
      if (seen[src] && src.indexOf('/images/portfolio/') !== 0) return;
      seen[src] = true;
      result.push(src);
    });
    while (result.length < 6) {
      result.push(fallbackImages[result.length % fallbackImages.length]);
    }
    return result.slice(0, 6);
  }

  // Locate React's own PhotoWall section (the old version we replace).
  function findReactWall() {
    var byPath = document.querySelector(REACT_WALL_SELECTOR);
    if (byPath) return byPath;
    var headings = Array.from(document.querySelectorAll('h1, h2, h3'));
    var heading = headings.find(function(el) {
      return (el.textContent || '').trim() === '照片墙';
    });
    if (!heading) return null;
    // Skip our own managed host if we accidentally match it.
    var sec = heading.closest('section');
    if (sec && sec.id === HOST_ID) return null;
    return sec || heading.parentElement;
  }

  // Our own section, inserted right after React's wall and never touched by React.
  function ensureHost() {
    var reactWall = findReactWall();
    if (!reactWall || !reactWall.parentNode) return null;
    ensureMotionStyles();
    var host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('section');
      host.id = HOST_ID;
      host.className = reactWall.className || 'mb-10';
    }
    // Keep it positioned immediately after the (hidden) React wall.
    if (host.previousElementSibling !== reactWall || host.parentNode !== reactWall.parentNode) {
      reactWall.parentNode.insertBefore(host, reactWall.nextSibling);
    }
    return host;
  }

  function signatureFor(images) {
    return images.map(function(src) {
      return src.length + ':' + src.slice(0, 60) + ':' + src.slice(-30);
    }).join('|');
  }

  function render() {
    var section = ensureHost();
    if (!section) return;

    var images = sixImages();
    var signature = signatureFor(images);
    if (section.dataset.photoWallSignature === signature && section.querySelectorAll('#bounce-cards .bounce-card').length === 6) {
      return;
    }

    section.dataset.photoWallManaged = 'true';
    section.dataset.photoWallSignature = signature;
    section.style.minHeight = '430px';
    section.innerHTML = [
      '<h2 class="font-display text-xl text-ink">照片墙</h2>',
      '<p class="font-mono text-[10px] text-ink-light">Photo Wall</p>',
      '<div id="bounce-cards-fit"><div id="bounce-cards" aria-label="日常照片墙"></div></div>'
    ].join('');

    var container = section.querySelector('#bounce-cards');
    bindContainerHover(container);

    images.forEach(function(src, i) {
      var card = document.createElement('div');
      card.className = 'bounce-card card-' + i;
      card.style.transform = transforms[i] || 'none';
      card.style.opacity = '1';
      card.addEventListener('mouseenter', function() { pushSiblings(container, i); });
      card.addEventListener('mouseleave', function() { resetSiblings(container); });

      var img = document.createElement('img');
      img.src = src;
      img.alt = '日常照片 ' + (i + 1);
      img.onerror = function() {
        var fallback = fallbackImages[i % fallbackImages.length];
        if (img.src.indexOf(fallback) === -1) img.src = fallback;
      };
      card.appendChild(img);
      container.appendChild(card);
    });

    fitWall();
    animate(container);
  }

  // Scale the fixed 760px design down to whatever width is available, so the
  // wall stays centered and never overflows — identical look to the demo.
  function fitWall() {
    var fit = document.getElementById('bounce-cards-fit');
    var inner = document.getElementById('bounce-cards');
    if (!fit || !inner) return;
    var avail = fit.clientWidth || (fit.parentElement && fit.parentElement.clientWidth) || 760;
    var scale = Math.min(1, avail / 760);
    inner.style.transform = 'scale(' + scale + ')';
    // Collapse the empty space left by scaling so the section isn't too tall.
    inner.style.marginBottom = (scale < 1 ? -(360 * (1 - scale)) : 0) + 'px';
  }

  // Faithful to React Bits <BounceCards />: animate scale 0 -> 1 only, so each
  // card keeps its rotate/translate (set via inline transform) and bounces in.
  function animate(container) {
    var cards = Array.from(container.querySelectorAll('.bounce-card'));
    if (!cards.length) return;
    cards.forEach(function(card) { card.style.opacity = '1'; });
    if (typeof window.gsap === 'undefined') return;
    window.gsap.fromTo(
      cards,
      { scale: 0 },
      {
        scale: 1,
        stagger: 0.06,
        ease: 'elastic.out(1, 0.5)',
        delay: 0.5,
        overwrite: 'auto'
      }
    );
  }

  function loadRemote() {
    if (remoteLoaded || typeof fetch !== 'function') return;
    remoteLoaded = true;
    getAPIImages().then(function(images) {
      remoteImages = images;
      render();
    });
  }

  function start() {
    render();
    loadRemote();
  }

  // Re-render the moment React (re)mounts its PhotoWall, so the stable wall
  // appears instantly and self-heals if the old section ever remounts.
  var rafScheduled = false;
  function scheduleRender() {
    if (rafScheduled) return;
    rafScheduled = true;
    var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };
    raf(function() { rafScheduled = false; render(); });
  }

  function observeMounts() {
    if (typeof MutationObserver !== 'function' || !document.body) return;
    new MutationObserver(scheduleRender).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitWall, 120);
  });

  setInterval(start, 30000);
  window.addEventListener('storage', start);
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'dailyPostsUpdated') {
      // 强制重新拉取 API 数据
      remoteLoaded = false;
      remoteImages = [];
      lastSignature = '';
      setTimeout(start, 150);
    }
  });
  document.addEventListener('DOMContentLoaded', function() { start(); observeMounts(); });
  if (document.body) observeMounts();
  setTimeout(start, 200);
  setTimeout(start, 600);
  setTimeout(start, 1500);
})();
