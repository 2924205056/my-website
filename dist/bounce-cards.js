/**
 * BounceCards — 替换照片墙，用日常动态图片优先展示，GSAP 弹性弹出
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'daily_posts';
  var remoteDailyImages = [];
  var remoteLoaded = false;
  var lastSignature = '';

  // 没有日常图片时，继续用作品集代表图兜底
  var fallbackImages = [
    '/images/portfolio/slide1_img0.jpg',
    '/images/portfolio/slide2_img4.png',
    '/images/portfolio/slide3_img8.png',
    '/images/portfolio/slide4_img14.jpg',
    '/images/portfolio/slide5_img18.png',
    '/images/portfolio/slide6_img21.jpg'
  ];

  function findPhotoWall() {
    var headings = document.querySelectorAll('h1, h2, h3');
    for (var j = 0; j < headings.length; j++) {
      if ((headings[j].textContent || '').trim() === '照片墙') {
        return headings[j].closest('section') || headings[j].parentElement;
      }
    }

    var exactBlocks = document.querySelectorAll('.mb-10');
    for (var i = 0; i < exactBlocks.length; i++) {
      if ((exactBlocks[i].textContent || '').indexOf('照片墙') >= 0) {
        return exactBlocks[i].closest('section') || exactBlocks[i];
      }
    }
    return null;
  }

  function safeParse(raw) {
    if (!raw) return [];
    try {
      var data = JSON.parse(raw);
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
    var sorted = (Array.isArray(posts) ? posts.slice() : []).sort(function(a, b) {
      return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
    });
    var seen = {};
    var images = [];
    sorted.forEach(function(post) {
      ['images', 'image', 'imgs', 'photos', 'photo', 'pictures', 'cover'].forEach(function(key) {
        normalizeImages(post && post[key]).forEach(function(src) {
          if (isUsableImage(src) && !seen[src]) {
            seen[src] = true;
            images.push(src);
          }
        });
      });
    });
    return images;
  }

  function getLocalDailyImages() {
    try {
      return extractImages(safeParse(localStorage.getItem(STORAGE_KEY)));
    } catch (e) {
      return [];
    }
  }

  function fillImages(dailyImages) {
    var seen = {};
    var result = [];
    dailyImages.concat(fallbackImages).forEach(function(src) {
      if (isUsableImage(src) && !seen[src] && result.length < 6) {
        seen[src] = true;
        result.push(src);
      }
    });
    if (!result.length) result = fallbackImages.slice(0, 6);
    return result;
  }

  function signatureFor(images) {
    return images.map(function(src) {
      return src.length + ':' + src.slice(0, 80) + ':' + src.slice(-40);
    }).join('|');
  }

  function loadRemoteDailyImages() {
    if (remoteLoaded || typeof fetch !== 'function') return;
    remoteLoaded = true;
    fetch('/data/posts.json', { cache: 'no-store' })
      .then(function(res) { return res.ok ? res.json() : []; })
      .then(function(data) {
        remoteDailyImages = extractImages(safeParse(JSON.stringify(data)));
        refreshPhotoWall();
      })
      .catch(function() {
        remoteDailyImages = [];
      });
  }

  function replacePhotoWall(images) {
    var el = findPhotoWall();
    if (!el) return;

    var signature = signatureFor(images);
    if (el.querySelector('#bounce-cards') && signature === lastSignature) return;
    lastSignature = signature;
    images = images && images.length ? images : fallbackImages.slice(0, 6);
    images = fillImages(images).slice(0, 6);

    // 保留标题
    var h2 = el.querySelector('h2');
    var subtitle = el.querySelector('p');
    var titleText = h2 ? h2.textContent : '照片墙';
    var subText = subtitle ? subtitle.textContent : '';

    el.innerHTML = '';
    el.setAttribute('data-photo-wall-managed', 'true');
    el.style.minHeight = '430px';

    var h = document.createElement('h2');
    h.textContent = titleText;
    h.className = 'font-display text-xl text-ink';
    el.appendChild(h);
    if (subText) {
      var s = document.createElement('p');
      s.textContent = subText;
      s.className = 'font-mono text-[10px] text-ink-light';
      el.appendChild(s);
    }

    // BounceCards 容器
    var container = document.createElement('div');
    container.id = 'bounce-cards';
    container.setAttribute('aria-label', '日常照片墙');
    container.style.cssText =
      'position:relative;width:100%;height:320px;margin-top:20px;' +
      'display:flex;justify-content:center;align-items:center;overflow:visible;';
    el.appendChild(container);

    var cardWidth = 160;
    var transforms = [
      'rotate(8deg) translate(-120px)',
      'rotate(3deg) translate(-50px)',
      'rotate(-2deg)',
      'rotate(-6deg) translate(50px)',
      'rotate(-10deg) translate(120px)',
      'rotate(-14deg) translate(190px)'
    ];

    images.forEach(function(src, i) {
      var card = document.createElement('div');
      card.className = 'bounce-card';
      card.style.cssText =
        'position:absolute;width:' + cardWidth + 'px;aspect-ratio:1;' +
        'border:4px solid rgba(255,255,255,0.9);border-radius:16px;overflow:hidden;' +
        'box-shadow:0 8px 30px rgba(47,78,141,0.15);' +
        'transform:' + transforms[i] + ';opacity:1;background:linear-gradient(135deg,#d7ecff,#88A2CC);';
      card.setAttribute('data-idx', i);
      container.appendChild(card);

      var img = document.createElement('img');
      img.src = src;
      img.alt = '日常照片 ' + (i + 1);
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = function() {
        img.style.display = 'none';
        card.style.background = 'linear-gradient(135deg,#88A2CC,#2F4E8D)';
      };
      card.appendChild(img);
    });

    // GSAP 弹性入场
    if (typeof gsap !== 'undefined') {
      var cards = container.querySelectorAll('.bounce-card');
      gsap.set(cards, { opacity: 0, scale: 0.96 });
      gsap.to(cards, {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: 'elastic.out(1, 0.5)',
        delay: 0.5
      });

      // 悬停扇开
      cards.forEach(function(card, idx) {
        card.addEventListener('mouseenter', function() {
          cards.forEach(function(c, j) {
            gsap.killTweensOf(c);
            if (j === idx) {
              gsap.to(c, {
                transform: transforms[j].replace(/rotate\([^)]+\)/, 'rotate(0deg)'),
                scale: 1.08,
                duration: 0.4,
                ease: 'back.out(1.4)',
                overwrite: 'auto'
              });
            } else {
              var offsetX = j < idx ? -80 : 80;
              var t = transforms[j].replace(/translate\(([^)]+)\)/, function(_, v) {
                return 'translate(' + (parseFloat(v) + offsetX) + 'px)';
              });
              gsap.to(c, {
                transform: t,
                duration: 0.35,
                ease: 'back.out(1.4)',
                delay: Math.abs(idx - j) * 0.04,
                overwrite: 'auto'
              });
            }
          });
        });
        card.addEventListener('mouseleave', function() {
          cards.forEach(function(c, j) {
            gsap.killTweensOf(c);
            gsap.to(c, {
              transform: transforms[j],
              scale: 1,
              duration: 0.4,
              ease: 'back.out(1.4)',
              overwrite: 'auto'
            });
          });
        });
      });
    } else {
      // 降级：用 CSS transition
      setTimeout(function() {
        container.querySelectorAll('.bounce-card').forEach(function(c, i) {
          setTimeout(function() { c.style.opacity = '1'; }, i * 120);
        });
      }, 500);
    }
  }

  function refreshPhotoWall() {
    var images = fillImages(getLocalDailyImages().concat(remoteDailyImages));
    replacePhotoWall(images);
    loadRemoteDailyImages();
  }

  // 等 React 渲染完，并持续监听日常图片变化
  setInterval(refreshPhotoWall, 800);
  window.addEventListener('storage', function(e) {
    if (!e || e.key === STORAGE_KEY) refreshPhotoWall();
  });
  setTimeout(refreshPhotoWall, 1000);
  setTimeout(refreshPhotoWall, 3000);
})();
