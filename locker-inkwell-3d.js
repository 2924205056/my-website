/* 复古墨水瓶与羽毛笔 —— 程序化 3D 模型（three r128 兼容）
 * 八棱深蓝墨水瓶（黄铜描边/瓶口环）+ 白色大羽毛笔（Shape 羽形 + 弯曲笔杆）
 * userData.fx = { tap() } ：羽毛笔提起在空中划两笔，一滴墨珠落回瓶口，笔插回瓶中
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      CREAM = 0xead9b8, PORCELAIN = 0xf2ede2, INKDARK = 0x1b2a44,
      NAVY_D = 0x223a58, SHAFT = 0xd9cba8, GLASS = 0x26436a;

  function lam(color, opts){
    var m = new THREE.MeshLambertMaterial({color: color});
    if (opts){ for (var k in opts) m[k] = opts[k]; }
    return m;
  }

  /* 羽毛片：贴着笔杆弯曲的扁平羽形（XY 平面，Z 向挤出）
   * 脊线 x = bend*(y/H)^2，与笔杆同曲率；外缘宽、内缘窄，外缘带几处开衩 */
  function featherGeometry(bend, H, y0, y1, wMax){
    var N = 64;
    var notchL = [0.26, 0.42, 0.58, 0.74, 0.87];  // 外缘开衩位置(t)
    var notchR = [0.38, 0.62, 0.8];
    function dip(t, list, depth, halfw){
      var f = 1;
      for (var i = 0; i < list.length; i++){
        var d = Math.abs(t - list[i]);
        if (d < halfw) f = Math.min(f, 1 - depth * (1 - d / halfw));
      }
      return f;
    }
    var left = [], right = [];
    for (var i = 0; i <= N; i++){
      var t = i / N;
      var y = y0 + t * (y1 - y0);
      var sx = bend * (y / H) * (y / H);
      var slope = 2 * bend * y / (H * H);          // dx/dy
      var nl = 1 / Math.sqrt(1 + slope * slope);   // 法线 = (nl, -slope*nl)
      var w = wMax * Math.sin(Math.PI * Math.pow(t, 0.72));
      var wl = w * 1.35 * dip(t, notchL, 0.5, 0.035);
      var wr = w * 0.62 * dip(t, notchR, 0.4, 0.03);
      left.push(new THREE.Vector2(sx - wl * nl, y + wl * slope * nl));
      right.push(new THREE.Vector2(sx + wr * nl, y - wr * slope * nl));
    }
    var shape = new THREE.Shape();
    shape.moveTo(right[0].x, right[0].y);
    for (var a = 1; a <= N; a++) shape.lineTo(right[a].x, right[a].y);
    for (var b = N; b >= 0; b--) shape.lineTo(left[b].x, left[b].y);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.012, bevelEnabled: true, bevelThickness: 0.005,
      bevelSize: 0.005, bevelSegments: 2, curveSegments: 4
    });
    geo.translate(0, 0, -0.011);
    return geo;
  }

  window.createLockerInkwell = function(){
    var root = new THREE.Group();
    root.name = 'Inkwell & Quill';

    var matNavy   = lam(GLASS, {flatShading: true});
    var matNeck   = lam(GLASS);
    var matBrass  = lam(BRASS);
    var matBrassD = lam(BRASS_D);
    var matInk    = lam(INKDARK);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 八棱瓶身（Lathe 8 段 + flatShading = 棱面）：直壁棱柱，下宽上收肩 ---- */
    var prof = [
      [0.001, 0.0], [0.225, 0.0], [0.263, 0.02], [0.276, 0.09],
      [0.281, 0.19], [0.271, 0.265], [0.234, 0.323], [0.165, 0.363], [0.124, 0.378]
    ];
    var lathePts = prof.map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    mesh('body', new THREE.LatheGeometry(lathePts, 8), matNavy, 0, 0, 0);

    /* 棱边磨损金线：沿 8 条棱各走一条极细的暗黄铜管 */
    var edgeProf = prof.slice(2, 9);   // 从足部到肩部
    for (var k = 0; k < 8; k++){
      var ang = k * Math.PI / 4;
      var pts = edgeProf.map(function(p){
        return new THREE.Vector3(Math.sin(ang) * p[0] * 1.006, p[1], Math.cos(ang) * p[0] * 1.006);
      });
      mesh('edge-' + k, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.0032, 5), matBrassD);
    }
    /* 八棱黄铜足座（与瓶身棱面对齐的矮基座）+ 肩箍 */
    var footPts = [
      [0.19, 0.0], [0.298, 0.0], [0.304, 0.02], [0.286, 0.045], [0.24, 0.056], [0.19, 0.06]
    ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    mesh('foot-base', new THREE.LatheGeometry(footPts, 8),
      lam(BRASS_D, {flatShading: true}), 0, 0, 0);
    var shoulder = mesh('shoulder-ring', new THREE.TorusGeometry(0.126, 0.012, 8, 28), matBrassD, 0, 0.378, 0);
    shoulder.rotation.x = Math.PI / 2;

    /* ---- 圆瓶颈（平滑 Lathe）+ 凸唇 + 黄铜口环 ---- */
    var neckPts = [
      [0.118, 0.375], [0.10, 0.395], [0.094, 0.425], [0.10, 0.448],
      [0.126, 0.462], [0.132, 0.487], [0.122, 0.502], [0.10, 0.508], [0.064, 0.51]
    ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    mesh('neck', new THREE.LatheGeometry(neckPts, 24), matNeck, 0, 0, 0);
    var lip = mesh('lip-ring', new THREE.TorusGeometry(0.126, 0.0085, 8, 28), matBrass, 0, 0.497, 0);
    lip.rotation.x = Math.PI / 2;
    var collar = mesh('neck-collar', new THREE.TorusGeometry(0.107, 0.009, 8, 24), matBrass, 0, 0.392, 0);
    collar.rotation.x = Math.PI / 2;

    /* 瓶口墨面 */
    mesh('ink-surface', new THREE.CylinderGeometry(0.068, 0.068, 0.012, 20), matInk, 0, 0.503, 0);

    /* ---- 羽毛笔（组原点 = 笔尖，方便动画对位）---- */
    var quill = new THREE.Group();
    quill.name = 'quill';
    quill.position.set(0, 0.42, 0);
    quill.rotation.z = -0.30;
    root.add(quill);

    var BEND = 0.17, QH = 0.92;
    /* 笔杆：与羽脊同曲率的弯管，下端接笔尖锥 */
    var shaftPts = [];
    for (var s = 0; s <= 8; s++){
      var yy = 0.05 + (s / 8) * (QH - 0.05);
      shaftPts.push(new THREE.Vector3(BEND * (yy / QH) * (yy / QH), yy, 0));
    }
    mesh('shaft', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shaftPts), 16, 0.0115, 8),
      lam(SHAFT), 0, 0, 0, quill);
    mesh('nib', new THREE.CylinderGeometry(0.0115, 0.0018, 0.1, 8), lam(CREAM), 0.0015, 0.05, 0, quill);
    mesh('nib-ink', new THREE.CylinderGeometry(0.0052, 0.0012, 0.045, 8), lam(INKDARK), 0.0007, 0.022, 0, quill);
    mesh('shaft-tip', new THREE.SphereGeometry(0.0115, 8, 6), lam(SHAFT),
      BEND, QH, 0, quill);

    /* 羽毛片：白瓷色主片 + 奶油色衬片（稍小，错开一点厚度做层次）*/
    mesh('vane', featherGeometry(BEND, QH, 0.24, 0.96, 0.105), lam(PORCELAIN), 0, 0, 0, quill);
    var vane2 = mesh('vane-under', featherGeometry(BEND, QH, 0.28, 0.90, 0.085), lam(CREAM), 0, 0.012, 0, quill);
    vane2.scale.set(1, 0.985, 0.45);

    /* ---- 洒落的静态墨珠（呼应原画）---- */
    var spill = mesh('spill', new THREE.SphereGeometry(0.036, 12, 8), lam(NAVY_D), 0.40, 0.015, 0.12);
    spill.scale.set(1.2, 0.42, 1);
    var spill2 = mesh('spill-2', new THREE.SphereGeometry(0.018, 10, 6), lam(NAVY_D), 0.33, 0.008, 0.06);
    spill2.scale.set(1, 0.45, 1);

    /* ---- 动画用墨珠（平时缩到不可见）---- */
    var drop = mesh('ink-drop', new THREE.SphereGeometry(0.028, 12, 10), lam(NAVY_D), 0, 0.8, 0);
    drop.scale.set(0.001, 0.001, 0.001);

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 1.34, 8),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0.12, 0.67, 0);
    root.add(proxy);

    /* ---- 交互：提笔 → 空中划两笔 → 墨珠滴落弹回瓶口 → 插回 ---- */
    var REST = {x: 0, y: 0.42, rz: -0.30};
    var tl = null;
    root.userData.fx = {
      tap: function(){
        if (tl && tl.isActive()) return;   // 动画中忽略重复点击
        tl = gsap.timeline({
          onComplete: function(){
            quill.position.set(REST.x, REST.y, 0);
            quill.rotation.z = REST.rz;
            drop.scale.set(0.001, 0.001, 0.001);
          }
        });
        /* 1) 提笔（拔出瓶口，略前倾避免出画）*/
        tl.to(quill.position, {x: 0.03, y: 0.66, duration: 0.45, ease: 'power2.out'}, 0);
        tl.to(quill.rotation, {z: -0.38, duration: 0.45, ease: 'power2.out'}, 0);
        /* 2) 第一笔：向右下顿挫 */
        tl.to(quill.position, {x: 0.22, y: 0.55, duration: 0.26, ease: 'power1.inOut'}, 0.5);
        tl.to(quill.rotation, {z: -0.62, duration: 0.26, ease: 'power1.inOut'}, 0.5);
        /* 提锋 */
        tl.to(quill.position, {x: 0.30, y: 0.65, duration: 0.18, ease: 'power1.out'}, 0.78);
        tl.to(quill.rotation, {z: -0.4, duration: 0.18, ease: 'power1.out'}, 0.78);
        /* 3) 第二笔：回锋向左下捺 */
        tl.to(quill.position, {x: 0.08, y: 0.54, duration: 0.28, ease: 'power1.inOut'}, 0.98);
        tl.to(quill.rotation, {z: -0.24, duration: 0.28, ease: 'power1.inOut'}, 0.98);
        /* 悬停回到瓶口正上方 */
        tl.to(quill.position, {x: 0.02, y: 0.67, duration: 0.3, ease: 'power2.inOut'}, 1.3);
        tl.to(quill.rotation, {z: -0.36, duration: 0.3, ease: 'power2.inOut'}, 1.3);
        /* 4) 墨珠：在笔尖凝聚 → 坠落 → 瓶口压扁弹起 → 落回收进瓶中 */
        tl.set(drop.position, {x: 0.02, y: 0.65, z: 0}, 1.62);
        tl.to(drop.scale, {x: 0.9, y: 1.15, z: 0.9, duration: 0.2, ease: 'power1.out'}, 1.62);
        tl.to(drop.position, {y: 0.535, duration: 0.3, ease: 'power2.in'}, 1.84);
        tl.to(drop.scale, {x: 0.75, y: 1.35, z: 0.75, duration: 0.3, ease: 'power2.in'}, 1.84);
        tl.to(drop.scale, {x: 1.5, y: 0.4, z: 1.5, duration: 0.09, ease: 'power1.out'}, 2.14);
        tl.to(drop.position, {y: 0.63, duration: 0.17, ease: 'power1.out'}, 2.23);
        tl.to(drop.scale, {x: 0.85, y: 1.05, z: 0.85, duration: 0.17, ease: 'power1.out'}, 2.23);
        tl.to(drop.position, {y: 0.52, duration: 0.16, ease: 'power1.in'}, 2.4);
        tl.to(drop.scale, {x: 0.001, y: 0.001, z: 0.001, duration: 0.14, ease: 'power1.in'}, 2.5);
        /* 5) 笔插回瓶中 */
        tl.to(quill.position, {x: REST.x, y: REST.y, duration: 0.5, ease: 'power3.inOut'}, 2.35);
        tl.to(quill.rotation, {z: REST.rz, duration: 0.5, ease: 'power3.inOut'}, 2.35);
      }
    };

    return root;
  };
})();
