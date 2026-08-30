/**
 * React Bits GlassSurface, adapted to the current static build.
 */
(function() {
  'use strict';

  var STYLE_ID = 'about-glass-surface-style';
  var BOUND_ATTR = 'data-about-glass-bound';
  var clouds = [
    { name: '云小画', tag: '艺术家', img: '/images/cloud-team/cutout/cloud-painter-cutout.png', x: '20%', y: '24%', size: '196px', delay: '0s', trait: '把想法画成看得见的样子', skills: ['插画', '配色', '视觉草图'], intro: '负责把脑海里的灵感快速变成画面，喜欢收集颜色、贴纸和小小的情绪细节。' },
    { name: '云知知', tag: '图书管理员', img: '/images/cloud-team/cutout/cloud-librarian-cutout.png', x: '50%', y: '23%', size: '188px', delay: '.2s', trait: '安静整理所有知识线索', skills: ['资料整理', '阅读', '归档'], intro: '会把散落的信息排成清晰目录，是云朵小队里最擅长做笔记和知识库的一位。' },
    { name: '云滴滴', tag: '气象员', img: '/images/cloud-team/cutout/cloud-weather-cutout.png', x: '80%', y: '24%', size: '196px', delay: '.4s', trait: '提前感知情绪天气', skills: ['观察', '预判', '提醒'], intro: '随身带着小伞，负责观察节奏和风险，在项目变天之前轻轻提醒大家。' },
    { name: '云梦梦', tag: '助眠师', img: '/images/cloud-team/cutout/cloud-sleeper-cutout.png', x: '20%', y: '45%', size: '186px', delay: '.6s', trait: '让疲惫慢慢松下来', skills: ['疗愈', '陪伴', '放松'], intro: '最会照顾休息时间，提醒大家不要一直冲刺，也要给灵感留一点安静的空间。' },
    { name: '云音音', tag: '歌手', img: '/images/cloud-team/cutout/cloud-singer-cutout.png', x: '50%', y: '45%', size: '192px', delay: '.8s', trait: '用旋律带动气氛', skills: ['表达', '节奏', '舞台感'], intro: '负责把普通时刻唱得更明亮，适合出现在活动、展示和需要一点快乐的地方。' },
    { name: '云小厨', tag: '烘焙师', img: '/images/cloud-team/cutout/cloud-baker-cutout.png', x: '80%', y: '45%', size: '192px', delay: '1s', trait: '把甜味做进日常', skills: ['烘焙', '手作', '照顾人'], intro: '喜欢把复杂流程拆成配方，也喜欢用蛋糕和热乎乎的点心安慰大家。' },
    { name: '云闪闪', tag: '超级英雄', img: '/images/cloud-team/cutout/cloud-hero-cutout.png', x: '20%', y: '66%', size: '192px', delay: '1.2s', trait: '关键时刻第一个冲上去', skills: ['行动力', '守护', '救场'], intro: '披风一扬就开始解决问题，是小队里的应急担当，专治拖延和临时状况。' },
    { name: '云探探', tag: '侦探', img: '/images/cloud-team/cutout/cloud-detective-cutout.png', x: '50%', y: '66%', size: '186px', delay: '1.4s', trait: '发现藏起来的答案', skills: ['调研', '分析', '追踪'], intro: '带着放大镜寻找蛛丝马迹，适合做用户研究、问题定位和隐藏彩蛋侦查。' },
    { name: '云拍拍', tag: '摄影师', img: '/images/cloud-team/cutout/cloud-photographer-cutout.png', x: '80%', y: '66%', size: '194px', delay: '1.6s', trait: '替回忆按下快门', skills: ['拍摄', '构图', '记录'], intro: '负责捕捉闪光瞬间，把日常、作品和旅途都变成可以回看的故事。' }
  ];

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '@keyframes about-glass-cloud-float{0%,100%{transform:translateY(0) rotate(var(--cloud-rotate,0deg)) scale(1);}50%{transform:translateY(-13px) rotate(var(--cloud-rotate-mid,0deg)) scale(1.04);}}',
      '@keyframes about-glass-shine{0%{transform:translateX(-130%) rotate(10deg);}100%{transform:translateX(130%) rotate(10deg);}}',
      '.glass-surface{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:opacity .26s ease-out;}',
      '.glass-surface__filter{width:100%;height:100%;pointer-events:none;position:absolute;inset:0;opacity:0;z-index:-1;}',
      '.glass-surface__content{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:.5rem;border-radius:inherit;position:relative;z-index:1;}',
      '.glass-surface--svg{background:rgba(255,255,255,var(--glass-frost,0));backdrop-filter:var(--filter-id) saturate(var(--glass-saturation,1));-webkit-backdrop-filter:blur(18px) saturate(1.6);box-shadow:0 0 2px 1px rgba(0,0,0,.15) inset,0 0 10px 4px rgba(255,255,255,.18) inset,0 4px 16px rgba(17,17,26,.05),0 8px 24px rgba(17,17,26,.05),0 16px 56px rgba(17,17,26,.05),0 4px 16px rgba(17,17,26,.05) inset,0 8px 24px rgba(17,17,26,.05) inset,0 16px 56px rgba(17,17,26,.05) inset;}',
      '.glass-surface--fallback{background:rgba(255,255,255,.25);backdrop-filter:blur(12px) saturate(1.8) brightness(1.1);-webkit-backdrop-filter:blur(12px) saturate(1.8) brightness(1.1);border:1px solid rgba(255,255,255,.3);box-shadow:0 8px 32px rgba(31,38,135,.2),0 2px 16px rgba(31,38,135,.1),inset 0 1px 0 rgba(255,255,255,.4),inset 0 -1px 0 rgba(255,255,255,.2);}',
      '.about-glass-surface{width:100%!important;border-radius:34px!important;isolation:isolate;border:1px solid rgba(255,255,255,.72)!important;background:linear-gradient(180deg,rgba(235,247,255,.94),rgba(217,238,255,.86))!important;box-shadow:0 18px 46px rgba(120,170,220,.16)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;--glass-frost:0;--glass-saturation:1;}',
      '.about-glass-surface.glass-surface--svg,.about-glass-surface.glass-surface--fallback{background:linear-gradient(180deg,rgba(235,247,255,.94),rgba(217,238,255,.86))!important;box-shadow:0 18px 46px rgba(120,170,220,.16)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}',
      '.about-glass-surface::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 34%,rgba(255,255,255,.5),rgba(255,255,255,.18) 42%,rgba(255,255,255,0) 68%);z-index:0;pointer-events:none;}',
      '.about-glass-surface::after{content:none!important;}',
      '.about-glass-content{position:relative;width:100%;display:grid;gap:22px;padding:28px;}',
      '.about-glass-title{position:relative;z-index:5;display:grid;gap:4px;}',
      '.about-glass-title strong{font-family:Space Mono,monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#6e8bb9;}',
      '.about-glass-title span{font-family:var(--font-display,inherit);font-size:clamp(24px,3.4vw,38px);line-height:1;color:#2f4e8d;text-shadow:0 2px 12px rgba(255,255,255,.82);}',
      '.about-cloud-grid{position:relative;z-index:4;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px 26px;align-items:end;}',
      '.about-cloud-orbit{position:relative;width:100%;min-height:168px;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;animation:about-glass-cloud-float 4.8s ease-in-out infinite;animation-delay:var(--cloud-delay);will-change:transform;pointer-events:auto;cursor:pointer;border:0;background:transparent;padding:0;}',
      '.about-cloud-orbit img{display:block;width:100%;height:auto;object-fit:contain;filter:drop-shadow(0 18px 22px rgba(68,132,198,.2));}',
      '.about-cloud-orbit>img{max-width:min(var(--cloud-size),94%);max-height:146px;}',
      '.about-cloud-orbit img{transition:transform .24s ease,filter .24s ease;}',
      '.about-cloud-orbit label{position:relative;transform:none;white-space:nowrap;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:rgba(255,255,255,.68);padding:4px 8px;font-family:Space Mono,monospace;font-size:10px;color:#42649b;box-shadow:0 8px 18px rgba(92,146,205,.12);backdrop-filter:blur(10px);}',
      '.about-cloud-orbit small{color:#7a96bf;font-size:9px;}',
      '.about-cloud-profile{position:relative;z-index:6;display:grid;grid-template-columns:minmax(120px,160px) 1fr;gap:18px;align-items:center;border:1px solid rgba(255,255,255,.78);border-radius:26px;background:rgba(255,255,255,.78);padding:16px 18px 16px 14px;box-shadow:0 18px 38px rgba(88,137,198,.12),inset 0 1px 0 rgba(255,255,255,.72);backdrop-filter:none;-webkit-backdrop-filter:none;}',
      '.about-cloud-orbit[data-active="true"]{z-index:60;}',
      '.about-cloud-orbit[data-active="true"] img{transform:scale(1.1);filter:drop-shadow(0 24px 28px rgba(68,132,198,.28));}',
      '.about-cloud-orbit:focus-visible{outline:2px solid rgba(83,130,202,.72);outline-offset:8px;border-radius:28px;}',
      '.about-cloud-profile img{width:100%;max-height:128px;object-fit:contain;filter:drop-shadow(0 16px 20px rgba(68,132,198,.18));}',
      '.about-cloud-profile-main{display:grid;gap:9px;min-width:0;}',
      '.about-cloud-profile-kicker{font-family:Space Mono,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7894bf;}',
      '.about-cloud-profile h3{margin:0;font-family:var(--font-display,inherit);font-size:clamp(24px,3vw,34px);line-height:1;color:#2f4e8d;}',
      '.about-cloud-profile-role{margin:0;font-family:Space Mono,monospace;font-size:12px;color:#5f7fac;}',
      '.about-cloud-profile-trait{margin:0;font-size:15px;line-height:1.65;color:#42649b;font-weight:700;}',
      '.about-cloud-profile-intro{margin:0;font-size:13px;line-height:1.8;color:#5d76a5;}',
      '.about-cloud-profile-skills{display:flex;flex-wrap:wrap;gap:7px;}',
      '.about-cloud-profile-skills span{border:1px solid rgba(130,174,230,.28);border-radius:999px;background:rgba(255,255,255,.66);padding:5px 8px;font-family:Space Mono,monospace;font-size:10px;color:#42649b;}',
      '.about-cloud-stage{display:block!important;grid-template-columns:1fr!important;}',
      '.about-cloud-stage [data-about-intro-card="true"]{display:none!important;}',
      '.about-cloud-stage .about-glass-surface{min-height:min(980px,calc(100vh - 130px));}',
      '.about-cloud-stage .about-glass-content{padding:clamp(28px,4vw,54px);}',
      '.about-cloud-stage .about-cloud-grid{gap:clamp(30px,4vw,54px) clamp(24px,4vw,60px);}',
      '@media (max-width:760px){.about-glass-content{padding:24px 18px}.about-cloud-grid{gap:22px 14px}.about-cloud-orbit{min-height:124px}.about-cloud-orbit>img{max-width:min(var(--cloud-size),92%);max-height:98px}.about-cloud-orbit label{font-size:9px;padding:3px 7px}.about-cloud-profile{grid-template-columns:96px 1fr;padding:13px}.about-cloud-profile img{max-height:96px}.about-cloud-profile-intro{font-size:12px;line-height:1.65}.about-cloud-stage .about-glass-surface{min-height:0;}}',
      '@media (max-width:520px){.about-cloud-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.about-cloud-orbit{min-height:116px}.about-cloud-orbit>img{max-width:min(var(--cloud-size),38vw);max-height:88px}.about-cloud-profile{grid-template-columns:1fr;text-align:left}.about-cloud-profile>img{justify-self:center;width:min(140px,52vw)}}',
      '@media (prefers-reduced-motion:reduce){.about-cloud-orbit{animation:none!important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function supportsSVGFilters(filterId) {
    var ua = navigator.userAgent || '';
    var isWebkit = /Safari/.test(ua) && !/Chrome/.test(ua);
    var isFirefox = /Firefox/.test(ua);
    if (isWebkit || isFirefox) return false;
    var div = document.createElement('div');
    div.style.backdropFilter = 'url(#' + filterId + ')';
    return div.style.backdropFilter !== '';
  }

  function displacementMap(width, height, ids) {
    var borderRadius = 34;
    var borderWidth = 0.07;
    var brightness = 60;
    var opacity = 0.82;
    var blur = 12;
    var edgeSize = Math.min(width, height) * (borderWidth * 0.5);
    var svg = [
      '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">',
        '<defs>',
          '<linearGradient id="' + ids.red + '" x1="100%" y1="0%" x2="0%" y2="0%">',
            '<stop offset="0%" stop-color="#0000"/>',
            '<stop offset="100%" stop-color="red"/>',
          '</linearGradient>',
          '<linearGradient id="' + ids.blue + '" x1="0%" y1="0%" x2="0%" y2="100%">',
            '<stop offset="0%" stop-color="#0000"/>',
            '<stop offset="100%" stop-color="blue"/>',
          '</linearGradient>',
        '</defs>',
        '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="black"></rect>',
        '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="' + borderRadius + '" fill="url(#' + ids.red + ')"/>',
        '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="' + borderRadius + '" fill="url(#' + ids.blue + ')" style="mix-blend-mode:screen"/>',
        '<rect x="' + edgeSize + '" y="' + edgeSize + '" width="' + (width - edgeSize * 2) + '" height="' + (height - edgeSize * 2) + '" rx="' + borderRadius + '" fill="hsl(0 0% ' + brightness + '% / ' + opacity + ')" style="filter:blur(' + blur + 'px)"/>',
      '</svg>'
    ].join('');
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function updateDisplacement(panel) {
    var rect = panel.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width || 400));
    var height = Math.max(1, Math.round(rect.height || 390));
    var ids = {
      red: panel.dataset.redGrad,
      blue: panel.dataset.blueGrad
    };
    var image = panel.querySelector('feImage');
    var red = panel.querySelector('[data-channel="red"]');
    var green = panel.querySelector('[data-channel="green"]');
    var blue = panel.querySelector('[data-channel="blue"]');
    var gaussian = panel.querySelector('[data-gaussian]');
    if (image) image.setAttribute('href', displacementMap(width, height, ids));
    [
      { el: red, offset: 0 },
      { el: green, offset: 15 },
      { el: blue, offset: 25 }
    ].forEach(function(item) {
      if (!item.el) return;
      item.el.setAttribute('scale', String(-150 + item.offset));
      item.el.setAttribute('xChannelSelector', 'R');
      item.el.setAttribute('yChannelSelector', 'G');
    });
    if (gaussian) gaussian.setAttribute('stdDeviation', '0');
  }

  function isVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function hideAIOutreachCard() {
    var matches = Array.from(document.querySelectorAll('div')).filter(function(el) {
      var text = el.textContent || '';
      return isVisible(el) && text.indexOf('AI 外呼项目') >= 0 && text.indexOf('核心成员') >= 0;
    }).sort(function(a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });
    var card = matches.find(function(el) {
      return (el.className || '').toString().indexOf('text-card-foreground') >= 0;
    }) || matches.find(function(el) {
      var rect = el.getBoundingClientRect();
      return rect.height < 360 && rect.width > 260;
    });
    if (!card) return;
    card.setAttribute('data-about-hidden-card', 'ai-outreach');
    card.style.setProperty('display', 'none', 'important');
  }

  function findAboutCard() {
    if (document.querySelector('.about-glass-surface[' + BOUND_ATTR + '="true"]')) return null;
    var heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(function(el) {
      return (el.textContent || '').indexOf('一个长得像云朵') >= 0;
    });
    var section = heading && heading.closest('section');
    if (section) {
      section.classList.add('about-cloud-stage');
      var introCard = heading.closest('div');
      if (introCard) introCard.setAttribute('data-about-intro-card', 'true');
    }
    var img = section && Array.from(section.querySelectorAll('img[alt="小康云"]')).find(function(el) {
      return !el.closest('.about-glass-surface');
    });
    return img ? img.closest('div') : null;
  }

  function cloudMarkup(item, index) {
    return [
      '<button type="button" class="about-cloud-orbit" data-about-glass-cloud="' + index + '" data-active="' + (index === 0 ? 'true' : 'false') + '" aria-label="查看' + item.name + '档案" style="--cloud-size:' + item.size + ';--cloud-delay:' + item.delay + ';--cloud-rotate:' + ((index % 2 ? -2 : 2) + 'deg') + ';--cloud-rotate-mid:' + ((index % 2 ? 2 : -2) + 'deg') + ';">',
        '<img src="' + item.img + '?v=20260616-cloud-stage5" alt="' + item.name + '" loading="eager" draggable="false">',
        '<label>' + item.name + ' <small>' + item.tag + '</small></label>',
      '</button>'
    ].join('');
  }

  function profileMarkup(index) {
    var item = clouds[index] || clouds[0];
    return [
      '<div class="about-cloud-profile" data-about-cloud-profile>',
        '<img src="' + item.img + '?v=20260616-cloud-stage5" alt="' + item.name + '">',
        '<div class="about-cloud-profile-main">',
          '<div class="about-cloud-profile-kicker">Cloud File</div>',
          '<h3>' + item.name + '</h3>',
          '<p class="about-cloud-profile-role">' + item.tag + '</p>',
          '<p class="about-cloud-profile-trait">' + item.trait + '</p>',
          '<p class="about-cloud-profile-intro">' + item.intro + '</p>',
          '<div class="about-cloud-profile-skills">' + item.skills.map(function(skill) { return '<span>' + skill + '</span>'; }).join('') + '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function setActiveCloud(panel, index) {
    var content = panel && panel.querySelector('.about-glass-content');
    if (!content) return;
    content.querySelectorAll('[data-about-glass-cloud]').forEach(function(el) {
      el.dataset.active = el.dataset.aboutGlassCloud === String(index) ? 'true' : 'false';
    });
    var profile = content.querySelector('[data-about-cloud-profile]');
    if (profile) {
      var wrap = document.createElement('div');
      wrap.innerHTML = profileMarkup(index);
      profile.replaceWith(wrap.firstChild);
    }
  }

  function bindCloudInteractions(panel) {
    if (!panel || panel.dataset.aboutCloudCardsBound === 'true') return;
    panel.dataset.aboutCloudCardsBound = 'true';
    panel.addEventListener('click', function(event) {
      var target = event.target.closest && event.target.closest('[data-about-glass-cloud]');
      if (!target || !panel.contains(target)) return;
      setActiveCloud(panel, Number(target.dataset.aboutGlassCloud || 0));
    });
    panel.addEventListener('mouseover', function(event) {
      var target = event.target.closest && event.target.closest('[data-about-glass-cloud]');
      if (!target || !panel.contains(target)) return;
      setActiveCloud(panel, Number(target.dataset.aboutGlassCloud || 0));
    });
  }

  function ensureClouds(panel) {
    var content = panel && panel.querySelector('.about-glass-content');
    if (!content) return;
    var grid = content.querySelector('[data-about-cloud-grid]');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'about-cloud-grid';
      grid.setAttribute('data-about-cloud-grid', 'true');
      var profile = content.querySelector('[data-about-cloud-profile]');
      content.insertBefore(grid, profile || null);
    }
    var current = grid.querySelectorAll('[data-about-glass-cloud]');
    if (current.length === clouds.length) return;
    Array.from(current).forEach(function(el) { el.remove(); });
    var wrap = document.createElement('div');
    wrap.innerHTML = clouds.map(cloudMarkup).join('');
    Array.from(wrap.children).forEach(function(el) {
      grid.appendChild(el);
    });
  }

  function filterMarkup(filterId) {
    return [
      '<svg class="glass-surface__filter" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
        '<defs>',
          '<filter id="' + filterId + '" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">',
            '<feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>',
            '<feDisplacementMap data-channel="red" in="SourceGraphic" in2="map" result="dispRed"/>',
            '<feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"/>',
            '<feDisplacementMap data-channel="green" in="SourceGraphic" in2="map" result="dispGreen"/>',
            '<feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green"/>',
            '<feDisplacementMap data-channel="blue" in="SourceGraphic" in2="map" result="dispBlue"/>',
            '<feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue"/>',
            '<feBlend in="red" in2="green" mode="screen" result="rg"/>',
            '<feBlend in="rg" in2="blue" mode="screen" result="output"/>',
            '<feGaussianBlur data-gaussian in="output" stdDeviation="0"/>',
          '</filter>',
        '</defs>',
      '</svg>'
    ].join('');
  }

  function bind(card) {
    if (!card || card.getAttribute(BOUND_ATTR) === 'true') return;
    var uid = String(Date.now()) + '-' + Math.floor(Math.random() * 10000);
    var filterId = 'about-glass-filter-' + uid;
    card.setAttribute(BOUND_ATTR, 'true');
    card.dataset.redGrad = 'red-grad-' + uid;
    card.dataset.blueGrad = 'blue-grad-' + uid;
    card.className = (card.className || '') + ' glass-surface about-glass-surface';
    card.style.setProperty('--filter-id', 'url(#' + filterId + ')');
    card.innerHTML = [
      filterMarkup(filterId),
      '<div class="glass-surface__content">',
        '<div class="about-glass-content">',
          '<div class="about-glass-title"><strong>Cloud Team</strong><span>云朵小队</span></div>',
          '<div class="about-cloud-grid" data-about-cloud-grid="true">' + clouds.map(cloudMarkup).join('') + '</div>',
          profileMarkup(0),
        '</div>',
      '</div>'
    ].join('');
    card.classList.add('glass-surface--flat');
    ensureClouds(card);
    bindCloudInteractions(card);
    setTimeout(function() { updateDisplacement(card); }, 0);
    setTimeout(function() { updateDisplacement(card); }, 300);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function() { updateDisplacement(card); }).observe(card);
    }
  }

  function run() {
    installStyles();
    hideAIOutreachCard();
    var panel = document.querySelector('.about-glass-surface[' + BOUND_ATTR + '="true"]');
    if (panel) ensureClouds(panel);
    bind(findAboutCard());
  }

  run();
  setInterval(run, 700);
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
})();
