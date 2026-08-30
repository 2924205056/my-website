/* 晾照片装置 —— 程序化 3D 模型（three r128 兼容）
 * 两根车削木立柱 + 下垂麻绳（悬链线 Tube）+ 三个木夹夹着三张拍立得
 * 照片画面：CanvasTexture 手绘深蓝天空 + 奶油白云 + 小鸟（三张各不同）
 * userData.fx = { tap() }  三张照片被风吹过般依次前后轻摆
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8, PORCELAIN = 0xf2ede2,
      ROPE = 0xa98a5f, CLIP_WOOD = 0x9c7440;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  function roundedBox(w, h, d, r){
    var x = -w/2, y = -h/2;
    var shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    var bevel = Math.min(r * 0.9, d * 0.2);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.008, d - bevel * 2),
      bevelEnabled: true, bevelThickness: bevel, bevelSize: Math.min(bevel, r * 0.95),
      bevelSegments: 2, curveSegments: 8
    });
    geo.translate(0, 0, -Math.max(0.008, d - bevel * 2) / 2);
    return geo;
  }

  /* ---- 天空画面：深蓝渐变 + 层叠奶油云 + 小鸟，variant 0/1/2 三张不同 ---- */
  function skyTexture(variant){
    var W = 256, H = 300;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    var grad = ctx.createLinearGradient(0, 0, 30, H);
    grad.addColorStop(0, '#223c5a');
    grad.addColorStop(0.55, '#2c4a6e');
    grad.addColorStop(1, '#3f6da3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 柔边水彩 puff：径向渐变圆
    function puff(cx, cy, r, rgb, alpha){
      var g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
      g.addColorStop(0.65, 'rgba(' + rgb + ',' + (alpha * 0.55) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 确定性伪随机
    var seed = variant * 977 + 13;
    function rnd(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    // 云：几十个渐变 puff 沿椭圆域堆叠，底灰蓝、中奶油、顶亮白
    function cloud(cx, cy, sx, sy){
      var i, x, y, r;
      for (i = 0; i < 16; i++){          // 外晕（灰蓝阴影）
        x = cx + (rnd() - 0.5) * 2 * sx;
        y = cy + (rnd() - 0.35) * 1.5 * sy;
        r = sx * (0.28 + rnd() * 0.24);
        puff(x, y, r, '150,160,155', 0.16);
      }
      for (i = 0; i < 22; i++){          // 主体奶油
        x = cx + (rnd() - 0.5) * 1.7 * sx;
        y = cy + (rnd() - 0.5) * 1.25 * sy;
        r = sx * (0.2 + rnd() * 0.2);
        puff(x, y, r, '234,217,184', 0.4);
      }
      for (i = 0; i < 14; i++){          // 上半亮部
        x = cx + (rnd() - 0.5) * 1.3 * sx;
        y = cy - sy * 0.28 + (rnd() - 0.5) * 0.7 * sy;
        r = sx * (0.14 + rnd() * 0.16);
        puff(x, y, r, '248,242,226', 0.5);
      }
      for (i = 0; i < 6; i++){           // 顶部高光尖
        x = cx + (rnd() - 0.5) * 0.9 * sx;
        y = cy - sy * 0.55 + (rnd() - 0.5) * 0.4 * sy;
        r = sx * (0.1 + rnd() * 0.1);
        puff(x, y, r, '255,250,240', 0.55);
      }
    }
    function bird(cx, cy, s, tilt){
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt || 0);
      ctx.strokeStyle = 'rgba(246,240,226,0.95)';
      ctx.lineWidth = Math.max(2.2, s * 0.22);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s, 0.18 * s);
      ctx.quadraticCurveTo(-s * 0.42, -s * 0.6, 0, 0);
      ctx.quadraticCurveTo(s * 0.42, -s * 0.6, s, 0.18 * s);
      ctx.stroke();
      // 小身体
      ctx.fillStyle = 'rgba(246,240,226,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.06, s * 0.22, s * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (variant === 0){            // 左下大云 + 右上两只大海鸥
      cloud(64, 252, 66, 46);
      cloud(196, 290, 56, 40);
      bird(172, 76, 22, 0.1);
      bird(112, 122, 15, -0.16);
    } else if (variant === 1){     // 下方云海 + 中部一群小鸟
      cloud(52, 280, 54, 40);
      cloud(168, 258, 62, 44);
      cloud(246, 296, 48, 36);
      var flock = [[128,84,11,0],[164,106,9,0.2],[100,120,9,-0.2],[142,138,10,0.1],
                   [180,152,8,-0.1],[110,164,8,0.15],[150,176,9,-0.15]];
      for (var f = 0; f < flock.length; f++){
        bird(flock[f][0], flock[f][1], flock[f][2], flock[f][3]);
      }
    } else {                       // 右侧顶天巨云 + 左上一只孤鸟
      cloud(216, 178, 70, 62);
      cloud(168, 288, 62, 42);
      cloud(242, 78, 46, 36);
      bird(66, 66, 18, -0.1);
    }

    // 四角轻微压暗，像旧相纸
    var vg = ctx.createRadialGradient(W/2, H/2, H * 0.35, W/2, H/2, H * 0.75);
    vg.addColorStop(0, 'rgba(20,32,50,0)');
    vg.addColorStop(1, 'rgba(20,32,50,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }

  window.createLockerPhotos = function(){
    var root = new THREE.Group();
    root.name = 'Photo Line';
    var matWood = lam(WOOD), matWoodD = lam(WOOD_D),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D),
        matRope = lam(ROPE), matClip = lam(CLIP_WOOD),
        matFrame = lam(PORCELAIN);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 两根车削木立柱（束腰底座 + 黄铜环 + 黄铜球顶）---- */
    var POST_X = 0.9, TIE_Y = 1.0, SAG = 0.15;
    var lathePts = [
      new THREE.Vector2(0.0,   0.0),
      new THREE.Vector2(0.088, 0.0),
      new THREE.Vector2(0.098, 0.022),
      new THREE.Vector2(0.086, 0.05),
      new THREE.Vector2(0.052, 0.075),
      new THREE.Vector2(0.037, 0.11),
      new THREE.Vector2(0.032, 0.3),
      new THREE.Vector2(0.028, 0.86),
      new THREE.Vector2(0.04,  0.915),
      new THREE.Vector2(0.03,  0.955),
      new THREE.Vector2(0.028, 1.04),
      new THREE.Vector2(0.02,  1.07),
      new THREE.Vector2(0.0,   1.075)
    ];
    [-1, 1].forEach(function(s, i){
      var post = new THREE.Group();
      post.name = 'post-' + i;
      post.position.set(s * POST_X, 0, 0);
      root.add(post);
      mesh('post-body', new THREE.LatheGeometry(lathePts, 22), matWood, 0, 0, 0, post);
      var ring = mesh('post-ring', new THREE.TorusGeometry(0.052, 0.011, 8, 20), matBrassD, 0, 0.078, 0, post);
      ring.rotation.x = Math.PI / 2;
      mesh('post-collar', new THREE.CylinderGeometry(0.034, 0.037, 0.03, 14), matBrass, 0, 1.075, 0, post);
      mesh('post-finial', new THREE.SphereGeometry(0.05, 16, 12), matBrass, 0, 1.125, 0, post);
      // 麻绳在柱身上绕的一圈结
      var wrap = mesh('rope-wrap', new THREE.TorusGeometry(0.038, 0.013, 8, 20), matRope, 0, TIE_Y, 0, post);
      wrap.rotation.x = Math.PI / 2;
      var wrap2 = mesh('rope-wrap2', new THREE.TorusGeometry(0.037, 0.011, 8, 20), matRope, 0, TIE_Y + 0.022, 0, post);
      wrap2.rotation.x = Math.PI / 2;
    });

    /* ---- 下垂麻绳：悬链线（抛物线近似）TubeGeometry ---- */
    function ropePoint(t){
      var x = -POST_X + t * 2 * POST_X;
      var y = TIE_Y - SAG * 4 * t * (1 - t);
      return new THREE.Vector3(x, y, 0);
    }
    var ropeSamples = [];
    for (var rs = 0; rs <= 28; rs++){ ropeSamples.push(ropePoint(rs / 28)); }
    var ropeCurve = new THREE.CatmullRomCurve3(ropeSamples);
    mesh('rope', new THREE.TubeGeometry(ropeCurve, 40, 0.012, 8), matRope, 0, 0, 0);
    // 绳股感：一根细绳沿主绳轻微螺旋
    var twistPts = [];
    for (var tw = 0; tw <= 90; tw++){
      var tt = tw / 90;
      var p = ropePoint(tt);
      var ang = tt * Math.PI * 26;
      twistPts.push(new THREE.Vector3(p.x, p.y + Math.cos(ang) * 0.009, p.z + Math.sin(ang) * 0.009));
    }
    mesh('rope-twist', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(twistPts), 120, 0.004, 6),
      lam(0x8f7148), 0, 0, 0);

    /* ---- 三组：木夹 + 拍立得（挂在绳上，可前后摆）---- */
    function makeClip(parent){
      var clip = new THREE.Group();
      clip.name = 'clip';
      parent.add(clip);
      // 两片木夹身：上端微微张开咬住绳子
      [-1, 1].forEach(function(sz){
        var slat = mesh('clip-slat', roundedBox(0.062, 0.175, 0.024, 0.018), matClip, 0, -0.05, sz * 0.017, clip);
        slat.rotation.x = -sz * 0.12;
        // 上端圆头
        var knob = mesh('clip-knob', new THREE.SphereGeometry(0.02, 10, 8), matClip, 0, 0.038, sz * 0.026, clip);
        knob.scale.set(1.3, 1, 0.85);
      });
      // 黄铜弹簧箍
      var band = mesh('clip-band', new THREE.TorusGeometry(0.036, 0.008, 8, 18), matBrass, 0, -0.028, 0, clip);
      band.rotation.x = Math.PI / 2;
      band.scale.set(1, 1, 1.35);
      return clip;
    }

    function makePhoto(variant){
      var photo = new THREE.Group();
      photo.name = 'photo-' + variant;
      // 拍立得白框
      mesh('frame', roundedBox(0.36, 0.46, 0.016, 0.02), matFrame, 0, 0, 0, photo);
      // 画面（正面），画面区偏上留出拍立得宽下边
      var picMat = new THREE.MeshLambertMaterial({map: skyTexture(variant)});
      mesh('picture', new THREE.PlaneGeometry(0.3, 0.34), picMat, 0, 0.03, 0.013, photo);
      // 背面奶油纸 + 蓝色小圆标（拍立得背标）
      var back = mesh('back', new THREE.PlaneGeometry(0.3, 0.4), lam(CREAM), 0, 0, -0.013, photo);
      back.rotation.y = Math.PI;
      var stamp = mesh('back-stamp', new THREE.CircleGeometry(0.045, 20), lam(BLUE), 0.09, -0.12, -0.0145, photo);
      stamp.rotation.y = Math.PI;
      var stripe = mesh('back-stripe', new THREE.PlaneGeometry(0.22, 0.018), lam(0xd8c49a), -0.02, 0.13, -0.0145, photo);
      stripe.rotation.y = Math.PI;
      return photo;
    }

    var swings = [];
    var hang = [
      {t: 0.2,  variant: 0, tilt:  0.05},
      {t: 0.5,  variant: 1, tilt: -0.035},
      {t: 0.8,  variant: 2, tilt:  0.045}
    ];
    hang.forEach(function(h, i){
      var p = ropePoint(h.t);
      // 绳的切线角，让夹子顺着绳的坡度
      var d = ropePoint(Math.min(1, h.t + 0.01)).sub(ropePoint(Math.max(0, h.t - 0.01)));
      var slope = Math.atan2(d.y, d.x);
      var swing = new THREE.Group();
      swing.name = 'swing-' + i;
      swing.position.copy(p);
      swing.rotation.z = slope * 0.6 + h.tilt;
      root.add(swing);
      var clip = makeClip(swing);
      clip.position.y = 0.045;   // 夹子上端咬住绳
      var photo = makePhoto(h.variant);
      photo.position.y = -0.27;  // 照片顶边被夹住
      swing.add(photo);
      swings.push(swing);
    });

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.25, 0.45),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.62, 0);
    root.add(proxy);

    /* ---- 交互：一阵风，三张照片依次前后轻摆 ---- */
    var swinging = false;
    root.userData.fx = {
      tap: function(){
        if (swinging) return;
        swinging = true;
        var tl = gsap.timeline({onComplete: function(){ swinging = false; }});
        swings.forEach(function(sw, i){
          tl.to(sw.rotation, {
            x: 0.55 - i * 0.06, duration: 0.28, ease: 'power2.out'
          }, i * 0.16);
          tl.to(sw.rotation, {
            x: 0, duration: 1.9, ease: 'elastic.out(1, 0.18)'
          }, i * 0.16 + 0.28);
        });
      }
    };
    return root;
  };
})();
