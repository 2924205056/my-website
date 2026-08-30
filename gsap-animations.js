/**
 * 云朵实验室 - GSAP 动画系统 v5
 * 
 * 策略：所有动画元素已在 HTML 中就位，此脚本只负责动画控制
 */

(function() {
  // 等待 GSAP 和 ScrollTrigger 加载
  if (typeof gsap === 'undefined') {
    console.warn('GSAP not loaded');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ========================================
  // 1. 隐藏旧滑板云（确保不可见）
  // ========================================
  var oldGlider = document.getElementById('cloud-glider');
  if (oldGlider) oldGlider.style.display = 'none';

  // ========================================
  // 2. 云角色入场动画
  // ========================================
  var cloudSVG = document.getElementById('hc-svg');
  var crown = document.getElementById('hc-crown');
  var glow = document.getElementById('hc-glow');

  if (cloudSVG) {
    // 初始隐藏
    gsap.set(cloudSVG, { scale: 0, opacity: 0, transformOrigin: 'center center' });
    // 弹性入场
    gsap.to(cloudSVG, {
      scale: 1,
      opacity: 1,
      rotation: 0,
      duration: 1.4,
      ease: 'elastic.out(1, 0.5)',
      delay: 0.5
    });
  }

  if (crown) {
    gsap.set(crown, { scale: 0, y: -50, opacity: 0, transformOrigin: 'center center' });
    gsap.to(crown, {
      scale: 1,
      y: 0,
      opacity: 1,
      rotation: 0,
      duration: 0.8,
      ease: 'back.out(2)',
      delay: 1.2
    });
  }

  if (glow) {
    gsap.set(glow, { scale: 0, opacity: 0, transformOrigin: 'center center' });
    gsap.to(glow, {
      scale: 1,
      opacity: 1,
      duration: 1,
      ease: 'power2.out',
      delay: 0.8
    });
  }

  // ========================================
  // 3. 持续浮动动画
  // ========================================
  if (cloudSVG) {
    gsap.to(cloudSVG, {
      y: -18,
      rotation: 1.5,
      duration: 3.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  // 光晕呼吸
  if (glow) {
    gsap.to(glow, {
      scale: 1.08,
      opacity: 0.9,
      duration: 4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  // ========================================
  // 4. 随机眨眼
  // ========================================
  function blink() {
    var eyeL = document.getElementById('hc-eye-l');
    var eyeR = document.getElementById('hc-eye-r');
    if (!eyeL || !eyeR) return;

    gsap.to([eyeL, eyeR], {
      scaleY: 0.05,
      duration: 0.08,
      ease: 'power2.in',
      transformOrigin: 'center center',
      onComplete: function() {
        gsap.to([eyeL, eyeR], {
          scaleY: 1,
          duration: 0.12,
          ease: 'power2.out',
          transformOrigin: 'center center'
        });
      }
    });
    setTimeout(blink, 3000 + Math.random() * 3000);
  }
  setTimeout(blink, 2500);

  // ========================================
  // 5. 浮动星星
  // ========================================
  var starsContainer = document.getElementById('hc-stars');
  var starColors = ['#FFD700', '#FF6B9D', '#60A5FA', '#A78BFA', '#6BCB77'];

  function createStar() {
    if (!starsContainer) return;
    var star = document.createElement('div');
    var size = 8 + Math.random() * 16;
    var color = starColors[Math.floor(Math.random() * starColors.length)];
    star.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" fill="' + color + '" opacity="0.8"/></svg>';
    star.style.cssText = 'position:absolute;left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;pointer-events:none;';
    starsContainer.appendChild(star);

    gsap.fromTo(star,
      { scale: 0, rotation: -90 },
      {
        scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)',
        onComplete: function() {
          gsap.to(star, {
            y: -30 - Math.random() * 50,
            x: gsap.utils.random(-20, 20),
            opacity: 0, scale: 0.3, rotation: 180,
            duration: 2 + Math.random() * 2, ease: 'power1.out',
            onComplete: function() { star.remove(); }
          });
        }
      }
    );
  }

  setInterval(createStar, 800);
  for (var i = 0; i < 5; i++) setTimeout(createStar, i * 200);

  // ========================================
  // 6. 浮动爱心
  // ========================================
  var heartsContainer = document.getElementById('hc-hearts');

  function createHeart() {
    if (!heartsContainer) return;
    var heart = document.createElement('div');
    var size = 10 + Math.random() * 14;
    heart.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#F472B6" opacity="0.7"/></svg>';
    heart.style.cssText = 'position:absolute;left:' + (20 + Math.random() * 60) + '%;bottom:-20px;pointer-events:none;';
    heartsContainer.appendChild(heart);

    gsap.to(heart, {
      y: -250 - Math.random() * 100,
      x: gsap.utils.random(-40, 40),
      rotation: gsap.utils.random(-20, 20),
      opacity: 0,
      scale: 0.3 + Math.random() * 0.5,
      duration: 3 + Math.random() * 2,
      ease: 'power1.out',
      onComplete: function() { heart.remove(); }
    });
  }

  setInterval(createHeart, 2500);
  setTimeout(createHeart, 1000);

  // ========================================
  // 7. 鼠标跟随（桌面设备）
  // ========================================
  if (window.matchMedia('(hover: hover)').matches) {
    var heroCloud = document.getElementById('hero-cloud');
    document.addEventListener('mousemove', function(e) {
      if (!cloudSVG || !heroCloud) return;
      var rect = heroCloud.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var dx = (e.clientX - centerX) / window.innerWidth;
      var dy = (e.clientY - centerY) / window.innerHeight;

      gsap.to(cloudSVG, {
        rotation: dx * 6,
        x: dx * 12,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });

      var eyeL = document.getElementById('hc-eye-l');
      var eyeR = document.getElementById('hc-eye-r');
      if (eyeL && eyeR) {
        gsap.to([eyeL, eyeR], {
          x: dx * 3,
          y: dy * 2,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    });
  }

  // ========================================
  // 8. GIF 云朵角色 — 保持常驻可见
  // ========================================
  var gliderWrapper = document.getElementById('glider-wrapper');
  if (gliderWrapper) {
    // 确保 GIF 始终可见，不被其他脚本隐藏
    gliderWrapper.style.opacity = '1';
    gliderWrapper.style.visibility = 'visible';
    gliderWrapper.style.display = 'block';
    // 轻微浮动效果（不影响可见性）
    gsap.to(gliderWrapper, {
      y: -8,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });
  }

  // ========================================
  // 9. 滚动进度条
  // ========================================
  var progressBar = document.createElement('div');
  progressBar.id = 'gsap-progress';
  progressBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#60A5FA,#A78BFA,#F472B6);z-index:9999;width:0%;pointer-events:none;';
  document.body.appendChild(progressBar);

  gsap.to(progressBar, {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3
    }
  });

  // ========================================
  // 10. 回到顶部按钮
  // ========================================
  var backBtn = document.createElement('button');
  backBtn.id = 'gsap-back-top';
  backBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
  backBtn.style.cssText = 'position:fixed;bottom:28px;right:28px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#60A5FA,#A78BFA);color:white;border:none;cursor:pointer;z-index:9998;opacity:0;pointer-events:none;box-shadow:0 8px 28px rgba(96,165,250,0.35);display:flex;align-items:center;justify-content:center;transition:opacity 0.3s;';
  document.body.appendChild(backBtn);

  ScrollTrigger.create({
    start: 'top -600',
    end: 99999,
    onEnter: function() { backBtn.style.opacity = '1'; backBtn.style.pointerEvents = 'auto'; },
    onLeaveBack: function() { backBtn.style.opacity = '0'; backBtn.style.pointerEvents = 'none'; }
  });

  backBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  console.log('✨ GSAP Hero 动画系统 v5 已加载');
})();
