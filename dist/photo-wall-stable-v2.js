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

  function ensureMotionStyles() {
    if (document.getElementById('photo-wall-motion-style')) return;
    var style = document.createElement('style');
    style.id = 'photo-wall-motion-style';
    style.textContent =
      '#bounce-cards{position:relative;width:min(760px,100%);height:360px;margin:34px auto 0;display:flex;justify-content:center;align-items:center;overflow:visible;}' +
      '#bounce-cards .bounce-card{position:absolute;width:clamp(138px,17vw,190px);aspect-ratio:1;border:5px solid rgba(255,255,255,.95);border-radius:25px;overflow:hidden;box-shadow:0 14px 34px rgba(47,78,141,.2);background:linear-gradient(135deg,#d7ecff,#88A2CC);cursor:pointer;will-change:transform,opacity;transition:transform .4s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease;}' +
      '#bounce-cards .bounce-card:hover{z-index:5;box-shadow:0 22px 44px rgba(47,78,141,.28);}' +
      '#bounce-cards .bounce-card img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '@media (max-width:720px){#bounce-cards{height:300px;}#bounce-cards .bounce-card{width:clamp(112px,24vw,150px);}}' +
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
    return [];
  }

  function getAPIImages() {
    if (typeof fetch !== 'function') return Promise.resolve([]);
    return fetch('/api/daily/photos?limit=6')
      .then(function(res) { return res.ok ? res.json() : { images: [] }; })
      .then(function(data) { return (data.images || []); })
      .catch(function() { return []; });
  }

  function sixImages() {
    var result = [];
    var seen = {};
    getLocalImages().concat(remoteImages, fallbackImages, fallbackImages).forEach(function(src) {
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

  function findWallSection() {
    var headings = Array.from(document.querySelectorAll('h1, h2, h3'));
    var heading = headings.find(function(el) {
      return (el.textContent || '').trim() === '照片墙';
    });
    if (!heading) return null;
    return heading.closest('section') || heading.parentElement;
  }

  function signatureFor(images) {
    return images.map(function(src) {
      return src.length + ':' + src.slice(0, 60) + ':' + src.slice(-30);
    }).join('|');
  }

  function render() {
    var section = findWallSection();
    if (!section) return;
    ensureMotionStyles();

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
      '<div id="bounce-cards" aria-label="日常照片墙"></div>'
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

    animate(container);
  }

  function animate(container) {
    var cards = Array.from(container.querySelectorAll('.bounce-card'));
    if (!cards.length) return;
    if (typeof window.gsap === 'undefined') {
      cards.forEach(function(card) { card.style.opacity = '1'; });
      return;
    }
    window.gsap.set(cards, { opacity: 0, scale: 0 });
    window.gsap.to(cards, {
      opacity: 1,
      scale: 1,
      duration: 0.95,
      stagger: 0.08,
      ease: 'elastic.out(1, 0.5)',
      delay: 0.25
    });
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

  setInterval(start, 30000);
  window.addEventListener('storage', start);
  document.addEventListener('DOMContentLoaded', start);
  setTimeout(start, 500);
  setTimeout(start, 1500);
})();
