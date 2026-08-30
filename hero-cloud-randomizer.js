(function () {
  var STYLE_ID = 'hero-cloud-randomizer-style';
  var WRAP_ID = 'cloud-family-hero-wrap';
  var BOUND_ATTR = 'data-hero-cloud-randomized';

  var clouds = [
    { name: '云小画', tag: '艺术家', img: '/images/cloud-team/cutout/cloud-painter-cutout.png', accent: '#EF7EA8', status: '把今天的想法画成第一张草图。', scale: 1.04 },
    { name: '云知知', tag: '图书管理员', img: '/images/cloud-team/cutout/cloud-librarian-cutout.png', accent: '#62A77A', status: '正在把散落的信息排成清晰目录。', scale: 1.03 },
    { name: '云滴滴', tag: '气象员', img: '/images/cloud-team/cutout/cloud-weather-cutout.png', accent: '#5C9FE8', status: '提前观察今天的灵感天气。', scale: 1.04 },
    { name: '云梦梦', tag: '助眠师', img: '/images/cloud-team/cutout/cloud-sleeper-cutout.png', accent: '#9B8BEA', status: '提醒大家慢一点，也给灵感留点空。', scale: 1.02 },
    { name: '云音音', tag: '歌手', img: '/images/cloud-team/cutout/cloud-singer-cutout.png', accent: '#F06F9A', status: '给页面加了一段轻轻的节奏。', scale: 1.03 },
    { name: '云小厨', tag: '烘焙师', img: '/images/cloud-team/cutout/cloud-baker-cutout.png', accent: '#E9A54A', status: '把复杂流程拆成一份甜甜的配方。', scale: 1.03 },
    { name: '云闪闪', tag: '超级英雄', img: '/images/cloud-team/cutout/cloud-hero-cutout.png', accent: '#E9594F', status: '关键时刻负责救场和推进。', scale: 1.05 },
    { name: '云探探', tag: '侦探', img: '/images/cloud-team/cutout/cloud-detective-cutout.png', accent: '#6E8AB8', status: '正在寻找页面里还没被发现的小线索。', scale: 1.02 },
    { name: '云拍拍', tag: '摄影师', img: '/images/cloud-team/cutout/cloud-photographer-cutout.png', accent: '#6BAEC8', status: '替今天的日常按下一张快门。', scale: 1.03 },
    { name: '云卷卷', tag: '灵感记录员', img: '/images/cloud-char-0.png', accent: '#65B96F', status: '把突然冒出来的想法卷成小纸条。', scale: 1.04 },
    { name: '云奔奔', tag: '行动派队长', img: '/images/cloud-char-1.png', accent: '#F28B4B', status: '正在把“可以试试”变成“已经开始”。', scale: 1.04 },
    { name: '云乐乐', tag: '气氛调音师', img: '/images/cloud-char-2.png', accent: '#EF6FA7', status: '给页面调了一点开心的音量。', scale: 1.03 },
    { name: '云小白', tag: '玩法测试员', img: '/images/cloud-char-3.png', accent: '#4D96FF', status: '正在研究点哪里会冒出惊喜。', scale: 1.02 }
  ];

  var moods = [
    '今日云层：适合整理作品集',
    '今日灵感：有一点点冒泡',
    '今日值班：云朵小队随机出勤',
    '今日天气：多云转好玩'
  ];

  var layouts = [
    [
      { x: 50, y: 10, s: 1.22, r: -2, z: 4 },
      { x: 14, y: 34, s: 0.92, r: -7, z: 2 },
      { x: 78, y: 38, s: 0.9, r: 6, z: 2 },
      { x: 33, y: 70, s: 0.78, r: 3, z: 1 },
      { x: 68, y: 72, s: 0.76, r: -3, z: 1 }
    ],
    [
      { x: 24, y: 16, s: 1.02, r: -5, z: 3 },
      { x: 66, y: 14, s: 1.08, r: 5, z: 4 },
      { x: 18, y: 62, s: 0.85, r: 4, z: 1 },
      { x: 74, y: 58, s: 0.88, r: -4, z: 1 },
      { x: 48, y: 76, s: 0.76, r: 2, z: 1 }
    ],
    [
      { x: 50, y: 22, s: 1.18, r: 2, z: 4 },
      { x: 23, y: 52, s: 0.92, r: -6, z: 2 },
      { x: 77, y: 52, s: 0.92, r: 6, z: 2 },
      { x: 37, y: 76, s: 0.74, r: 0, z: 1 },
      { x: 64, y: 77, s: 0.72, r: -2, z: 1 }
    ]
  ];

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#cloud-family-hero-wrap{max-width:min(520px,100%)!important;width:min(520px,100%)!important;padding:0!important;}',
      '.hero-cloud-playground{position:relative;width:100%;height:clamp(310px,34vw,430px);isolation:isolate;}',
      '.hero-cloud-status{position:absolute;left:50%;bottom:-20px;transform:translateX(-50%);z-index:8;min-width:min(320px,92%);padding:9px 14px;border:1px solid rgba(255,255,255,.78);border-radius:999px;background:rgba(255,255,255,.68);box-shadow:0 12px 30px rgba(81,137,185,.12);font-size:12px;line-height:1.45;color:#31508d;text-align:center;}',
      '.hero-cloud-status strong{display:block;font-size:13px;color:#24406f;}',
      '.hero-cloud-card{position:absolute;left:calc(var(--x)*1%);top:calc(var(--y)*1%);z-index:var(--z);width:clamp(92px,10vw,146px);border:0;background:transparent;padding:0;transform:translate(-50%,-50%) rotate(var(--r)) scale(var(--s));cursor:pointer;animation:hero-cloud-drift-live var(--dur) ease-in-out infinite;animation-delay:var(--delay);transition:filter .22s ease;}',
      '.hero-cloud-card.is-main{width:clamp(128px,15vw,202px);}',
      '.hero-cloud-card img{width:100%;height:auto;object-fit:contain;filter:drop-shadow(0 18px 22px rgba(69,124,181,.22));transition:transform .25s ease,filter .25s ease;}',
      '.hero-cloud-card:hover img,.hero-cloud-card:focus-visible img{transform:translateY(-8px) scale(1.05);filter:drop-shadow(0 22px 26px rgba(69,124,181,.28));}',
      '.hero-cloud-card:focus-visible{outline:2px solid rgba(77,150,255,.72);outline-offset:8px;border-radius:24px;}',
      '.hero-cloud-chip{position:absolute;left:50%;bottom:-2px;transform:translate(-50%,50%);white-space:nowrap;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.86);box-shadow:0 8px 18px rgba(61,107,154,.1);font-size:11px;color:#24406f;}',
      '.hero-cloud-chip span{color:var(--accent);font-weight:700;}',
      '.hero-cloud-spark{position:absolute;width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.86);box-shadow:0 0 0 6px rgba(255,255,255,.28);animation:hero-cloud-sparkle 2.8s ease-in-out infinite;}',
      '.hero-cloud-spark:nth-child(1){left:14%;top:12%;animation-delay:-.4s}.hero-cloud-spark:nth-child(2){right:10%;top:24%;animation-delay:-1.1s}.hero-cloud-spark:nth-child(3){left:22%;bottom:22%;animation-delay:-1.9s}',
      '@keyframes hero-cloud-drift-live{0%,100%{translate:0 0;}50%{translate:0 -10px;}}',
      '@keyframes hero-cloud-sparkle{0%,100%{opacity:.35;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}',
      '@media (max-width:760px){.hero-cloud-playground{height:315px}.hero-cloud-card{width:84px}.hero-cloud-card.is-main{width:122px}.hero-cloud-chip{font-size:10px;padding:4px 7px}.hero-cloud-status{font-size:11px;}}',
      '@media (prefers-reduced-motion:reduce){.hero-cloud-card,.hero-cloud-spark{animation:none!important}.hero-cloud-card img{transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function render(wrap) {
    if (!wrap) return false;
    if (wrap.getAttribute(BOUND_ATTR) === 'true') return true;
    injectStyle();

    var pickedClouds = shuffle(clouds).slice(0, 5);
    var main = pickedClouds[0];
    var layout = pick(layouts);
    var mood = pick(moods);

    wrap.innerHTML = '';
    wrap.setAttribute(BOUND_ATTR, 'true');
    wrap.setAttribute('aria-label', '云朵小队随机队形');

    var playground = document.createElement('div');
    playground.className = 'hero-cloud-playground';
    playground.innerHTML = '<i class="hero-cloud-spark"></i><i class="hero-cloud-spark"></i><i class="hero-cloud-spark"></i>';

    pickedClouds.forEach(function (cloud, index) {
      var pos = layout[index];
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'hero-cloud-card' + (index === 0 ? ' is-main' : '');
      button.style.setProperty('--x', pos.x);
      button.style.setProperty('--y', pos.y);
      button.style.setProperty('--s', (pos.s * (cloud.scale || 1)).toFixed(2));
      button.style.setProperty('--r', pos.r + 'deg');
      button.style.setProperty('--z', pos.z);
      button.style.setProperty('--accent', cloud.accent);
      button.style.setProperty('--dur', (3.8 + index * 0.42).toFixed(2) + 's');
      button.style.setProperty('--delay', (-Math.random() * 2.4).toFixed(2) + 's');
      button.setAttribute('aria-label', cloud.name + '，' + cloud.tag);
      button.innerHTML =
        '<img src="' + cloud.img + '?v=hero-random-20260616" alt="' + cloud.name + '" draggable="false">' +
        '<div class="hero-cloud-chip"><span>' + cloud.name + '</span> ' + cloud.tag + '</div>';
      button.addEventListener('click', function () {
        var status = wrap.querySelector('[data-hero-cloud-status]');
        if (status) {
          status.innerHTML = '<strong>' + cloud.name + '上线</strong>' + cloud.status;
        }
      });
      playground.appendChild(button);
    });

    var status = document.createElement('div');
    status.className = 'hero-cloud-status';
    status.setAttribute('data-hero-cloud-status', 'true');
    status.innerHTML = '<strong>' + mood + '</strong>' + main.name + '上线：' + main.status;
    playground.appendChild(status);
    wrap.appendChild(playground);
    return true;
  }

  function boot() {
    var wrap = document.getElementById(WRAP_ID);
    if (wrap && render(wrap)) return;
    var observer = new MutationObserver(function () {
      var current = document.getElementById(WRAP_ID);
      if (render(current)) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
})();
