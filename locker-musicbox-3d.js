/* 复古八音盒 —— 程序化 3D 模型（three r128 兼容）
 * 木质圆角箱体 + 黄铜包角/铰链/发条钥匙 + 海军蓝饰板
 * 盒内奶油色内衬，中央小圆台上立一朵小白云
 * userData.fx = { tap() } ：开盖→云升起自转浮动+发条旋转；再点→收回合盖
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8,
      PORC = 0xf2ede2, INK = 0x1c1c20;

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
      depth: Math.max(0.01, d - bevel * 2),
      bevelEnabled: true, bevelThickness: bevel, bevelSize: Math.min(bevel, r * 0.95),
      bevelSegments: 2, curveSegments: 8
    });
    geo.translate(0, 0, -Math.max(0.01, d - bevel * 2) / 2);
    return geo;
  }

  function roundedRectShape(w, d, r){
    var x = -w/2, y = -d/2;
    var s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r);
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d);
    s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* 平放的"画框"：外圈圆角矩形挖去内圈，厚度 h，中心在原点、沿 y 拉伸 */
  function frameGeometry(wOut, dOut, wIn, dIn, h, rOut, rIn){
    var shape = roundedRectShape(wOut, dOut, rOut);
    shape.holes.push(roundedRectShape(wIn, dIn, rIn));
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: h, bevelEnabled: false, curveSegments: 8
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -h / 2, 0);
    return geo;
  }

  window.createLockerMusicbox = function(){
    var root = new THREE.Group();
    root.name = 'Vintage Musicbox';
    var matWood = lam(WOOD), matWoodD = lam(WOOD_D), matNavy = lam(NAVY),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D), matCream = lam(CREAM),
        matPorc = lam(PORC);

    // core：整体等比放大，底部仍落在 y=0
    var core = new THREE.Group();
    core.name = 'core';
    core.scale.set(1.1, 1.1, 1.1);
    root.add(core);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || core).add(m);
      return m;
    }

    /* ---- 底座：黄铜圆脚 + 深木束腰底板 ---- */
    [[-0.35, -0.23], [0.35, -0.23], [-0.35, 0.23], [0.35, 0.23]].forEach(function(p, i){
      mesh('foot-' + i, new THREE.CylinderGeometry(0.028, 0.044, 0.07, 12), matBrassD, p[0], 0.035, p[1]);
      mesh('foot-ball-' + i, new THREE.SphereGeometry(0.03, 10, 8), matBrass, p[0], 0.068, p[1]);
    });
    mesh('plinth', roundedBox(0.92, 0.09, 0.68, 0.035), matWoodD, 0, 0.105, 0);

    /* ---- 箱体：实心下段 + 中空口沿（能看进盒内）---- */
    mesh('body', roundedBox(0.84, 0.32, 0.60, 0.05), matWood, 0, 0.295, 0);
    // 口沿木墙（框）
    mesh('body-wall', frameGeometry(0.84, 0.60, 0.70, 0.46, 0.10, 0.05, 0.04), matWood, 0, 0.50, 0);
    // 顶口深木压边框
    mesh('body-lip', frameGeometry(0.90, 0.66, 0.68, 0.44, 0.05, 0.04, 0.04), matWoodD, 0, 0.57, 0);
    // 奶油色内衬：内壁 + 盒底
    mesh('lining-wall', frameGeometry(0.71, 0.47, 0.64, 0.40, 0.105, 0.04, 0.035), matCream, 0, 0.505, 0);
    mesh('lining-floor', roundedBox(0.70, 0.035, 0.46, 0.05), matCream, 0, 0.462, 0);

    /* ---- 黄铜包角：四条竖边的护角柱 ---- */
    [[-0.40, -0.28], [0.40, -0.28], [-0.40, 0.28], [0.40, 0.28]].forEach(function(p, i){
      mesh('corner-' + i, new THREE.CylinderGeometry(0.032, 0.036, 0.42, 12), matBrass, p[0], 0.35, p[1]);
      mesh('corner-cap-' + i, new THREE.SphereGeometry(0.034, 10, 8), matBrass, p[0], 0.56, p[1]);
      mesh('corner-base-' + i, new THREE.CylinderGeometry(0.042, 0.048, 0.05, 12), matBrassD, p[0], 0.155, p[1]);
    });

    /* ---- 正面：海军蓝饰板 + 黄铜画框 + 菱形锁孔饰件 ---- */
    mesh('front-frame', roundedBox(0.60, 0.28, 0.02, 0.07), matBrassD, 0, 0.32, 0.295);
    mesh('front-panel', roundedBox(0.54, 0.23, 0.02, 0.06), matNavy, 0, 0.32, 0.303);
    var escBack = mesh('esc-diamond', roundedBox(0.105, 0.105, 0.016, 0.02), matBrassD, 0, 0.32, 0.31);
    escBack.rotation.z = Math.PI / 4;
    var esc = mesh('escutcheon', new THREE.CylinderGeometry(0.052, 0.052, 0.02, 18), matBrass, 0, 0.32, 0.314);
    esc.rotation.x = Math.PI / 2;
    var kh = mesh('keyhole', new THREE.CylinderGeometry(0.014, 0.014, 0.02, 10), lam(INK), 0, 0.335, 0.32);
    kh.rotation.x = Math.PI / 2;
    mesh('keyhole-slot', roundedBox(0.016, 0.036, 0.02, 0.006), lam(INK), 0, 0.312, 0.32);
    // 饰板四角黄铜铆钉
    [[-0.235, 0.415], [0.235, 0.415], [-0.235, 0.225], [0.235, 0.225]].forEach(function(p, i){
      mesh('rivet-' + i, new THREE.SphereGeometry(0.014, 8, 8), matBrass, p[0], p[1], 0.308);
    });

    /* ---- 侧面海军蓝饰板（左右各一，右侧供发条钥匙栖身）---- */
    [-1, 1].forEach(function(s, i){
      var sp = mesh('side-panel-' + i, roundedBox(0.36, 0.22, 0.02, 0.05), matNavy, s * 0.423, 0.32, 0);
      sp.rotation.y = Math.PI / 2;
      var sf = mesh('side-frame-' + i, roundedBox(0.42, 0.27, 0.02, 0.06), matBrassD, s * 0.415, 0.32, 0);
      sf.rotation.y = Math.PI / 2;
    });

    /* ---- 背面饰板（开盖后从背后看也精致）---- */
    mesh('back-frame', roundedBox(0.60, 0.28, 0.02, 0.07), matBrassD, 0, 0.32, -0.295);
    mesh('back-panel', roundedBox(0.54, 0.23, 0.02, 0.06), matNavy, 0, 0.32, -0.303);

    /* ---- 盒内小圆台（蓝柱 + 黄铜上下盘）---- */
    mesh('ped-base', new THREE.CylinderGeometry(0.10, 0.115, 0.03, 20), matBrassD, 0, 0.495, 0);
    mesh('ped-column', new THREE.CylinderGeometry(0.062, 0.078, 0.05, 18), lam(BLUE), 0, 0.535, 0);
    mesh('ped-plate', new THREE.CylinderGeometry(0.08, 0.066, 0.022, 18), matBrass, 0, 0.567, 0);

    /* ---- 小白云（瓷白团团，稍压扁更软糯；合盖时缩小藏进盒内）---- */
    var cloud = new THREE.Group();
    cloud.name = 'cloud';
    var CLOUD_CLOSED_Y = 0.53, CLOUD_OPEN_Y = 0.98;
    cloud.position.set(0, CLOUD_CLOSED_Y, 0);
    cloud.scale.set(0.35, 0.35, 0.35);
    core.add(cloud);
    [
      [0,      0.005,  0,     0.115],
      [-0.105, -0.014, 0.006, 0.082],
      [0.108,  -0.010, 0.014, 0.086],
      [0.034,  0.075, -0.014, 0.072],
      [-0.055, 0.060,  0.024, 0.063],
      [-0.012, -0.036, 0.066, 0.060],
      [0.01,   -0.030, -0.062, 0.058]
    ].forEach(function(p, i){
      var puff = mesh('cloud-puff-' + i, new THREE.SphereGeometry(p[3], 14, 12), matPorc, p[0], p[1], p[2], cloud);
      puff.scale.y = 0.85;
    });

    /* ---- 盒盖：后沿铰链，圆角面包盖 + 蓝顶饰板 ---- */
    var lid = new THREE.Group();
    lid.name = 'lid';
    lid.position.set(0, 0.60, -0.31);
    core.add(lid);
    mesh('lid-main', roundedBox(0.90, 0.09, 0.66, 0.04), matWood, 0, 0.045, 0.31, lid);
    mesh('lid-band', frameGeometry(0.905, 0.665, 0.80, 0.56, 0.028, 0.04, 0.05), matBrass, 0, 0.012, 0.31, lid);
    mesh('lid-dome', roundedBox(0.72, 0.06, 0.48, 0.07), matWoodD, 0, 0.10, 0.31, lid);
    mesh('lid-trim', frameGeometry(0.60, 0.38, 0.545, 0.325, 0.016, 0.06, 0.055), matBrass, 0, 0.126, 0.31, lid);
    mesh('lid-top-panel', roundedBox(0.52, 0.02, 0.30, 0.06), matNavy, 0, 0.128, 0.31, lid);
    mesh('lid-knob', new THREE.SphereGeometry(0.028, 12, 10), matBrass, 0, 0.148, 0.31, lid);
    // 盖内侧：奶油衬底 + 海军蓝绸面板（开盖后可见）
    mesh('lid-under-cream', roundedBox(0.78, 0.018, 0.54, 0.05), matCream, 0, -0.004, 0.31, lid);
    mesh('lid-under-navy', roundedBox(0.62, 0.02, 0.40, 0.06), matNavy, 0, -0.008, 0.31, lid);
    // 盖前沿黄铜搭扣
    mesh('lid-clasp', roundedBox(0.07, 0.05, 0.02, 0.015), matBrass, 0, 0.025, 0.645, lid);
    mesh('clasp-plate', roundedBox(0.09, 0.045, 0.02, 0.015), matBrassD, 0, 0.555, 0.325);

    /* ---- 铰链：后沿两枚黄铜合页轴（外凸可见）---- */
    [-0.20, 0.20].forEach(function(hx, i){
      var hg = mesh('hinge-' + i, new THREE.CylinderGeometry(0.026, 0.026, 0.12, 12), matBrass, hx, 0.60, -0.335);
      hg.rotation.z = Math.PI / 2;
      mesh('hinge-cap-a-' + i, new THREE.SphereGeometry(0.027, 10, 8), matBrassD, hx - 0.06, 0.60, -0.335);
      mesh('hinge-cap-b-' + i, new THREE.SphereGeometry(0.027, 10, 8), matBrassD, hx + 0.06, 0.60, -0.335);
    });

    /* ---- 发条钥匙（右侧，蝶形双环）---- */
    var key = new THREE.Group();
    key.name = 'windup-key';
    key.position.set(0.43, 0.38, 0);
    core.add(key);
    mesh('key-collar', new THREE.CylinderGeometry(0.032, 0.038, 0.03, 12), matBrassD, 0.008, 0, 0, key)
      .rotation.z = Math.PI / 2;
    mesh('key-shaft', new THREE.CylinderGeometry(0.014, 0.014, 0.10, 10), matBrass, 0.055, 0, 0, key)
      .rotation.z = Math.PI / 2;
    mesh('key-hub', new THREE.CylinderGeometry(0.024, 0.024, 0.028, 12), matBrassD, 0.105, 0, 0, key)
      .rotation.z = Math.PI / 2;
    // 蝶形两翼：拉长的双环向外张开，像小蝴蝶结
    [-1, 1].forEach(function(s, i){
      var wing = mesh('key-wing-' + i, new THREE.TorusGeometry(0.048, 0.015, 8, 20), matBrass,
        0.105, s * 0.052, 0, key);
      wing.rotation.y = Math.PI / 2;
      wing.rotation.x = s * 0.5;
      wing.scale.set(1, 1.3, 1);
    });
    mesh('key-tip', new THREE.SphereGeometry(0.018, 10, 8), matBrass, 0.124, 0, 0, key);

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.3, 0.95),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.62, -0.02);
    root.add(proxy);

    /* ---- 交互：tap 开盖/合盖 ---- */
    var st = { open: false, busy: false };
    var loops = [];
    function stopLoops(){
      for (var i = 0; i < loops.length; i++) loops[i].kill();
      loops = [];
    }
    root.userData.fx = {
      tap: function(){
        if (st.busy) return;
        st.busy = true;
        if (!st.open){
          st.open = true;
          var tl = gsap.timeline({onComplete: function(){ st.busy = false; }});
          tl.to(lid.rotation, {x: -1.745, duration: 0.9, ease: 'back.out(1.1)'}, 0);
          tl.to(cloud.position, {y: CLOUD_OPEN_Y, z: 0.11, duration: 0.8, ease: 'power2.out'}, 0.45);
          tl.to(cloud.scale, {x: 1, y: 1, z: 1, duration: 0.65, ease: 'back.out(1.6)'}, 0.45);
          tl.call(function(){
            loops.push(gsap.to(cloud.rotation, {y: '+=6.2832', duration: 4.2, repeat: -1, ease: 'none'}));
            loops.push(gsap.to(cloud.position, {y: CLOUD_OPEN_Y + 0.035, duration: 1.1,
              yoyo: true, repeat: -1, ease: 'sine.inOut'}));
            loops.push(gsap.to(key.rotation, {x: '+=6.2832', duration: 1.7, repeat: -1, ease: 'none'}));
          }, null, 1.3);
        } else {
          st.open = false;
          stopLoops();
          var tl2 = gsap.timeline({onComplete: function(){ st.busy = false; }});
          tl2.to(key.rotation, {x: '+=1.4', duration: 0.6, ease: 'power2.out'}, 0);
          tl2.to(cloud.position, {y: CLOUD_CLOSED_Y, z: 0, duration: 0.6, ease: 'power2.in'}, 0);
          tl2.to(cloud.scale, {x: 0.35, y: 0.35, z: 0.35, duration: 0.55, ease: 'power2.in'}, 0.05);
          tl2.to(lid.rotation, {x: 0, duration: 0.7, ease: 'power3.inOut'}, 0.5);
        }
      }
    };
    return root;
  };
})();
