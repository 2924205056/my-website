/* 复古蓝瓷茶杯 —— 程序化 3D 模型（three r128 兼容）
 * 扇贝边茶碟 + 鼓腹宽口杯身 + 半环杯柄 + 琥珀茶水 + 云朵热气
 * userData.fx = { tap() } —— 杯碟轻跳，三缕热气升起渐隐
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      CREAM = 0xead9b8, PORC = 0xf2ede2, TEA = 0xd8a55e, STEAM = 0xf3e6de;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }
  function lam2(color){ return new THREE.MeshLambertMaterial({color: color, side: THREE.DoubleSide}); }

  /* 带扇贝波浪的车削面：rows = [{r,y,amp,yamp}]，半径/高度按 cos(n·θ) 调制。
   * userData.edgeRow = 标记行(edge:true)的一圈点，给包边管用。 */
  function scallopLathe(rows, scallops){
    var R = 96, pos = [], idx = [], edge = [];
    for (var vi = 0; vi < rows.length; vi++){
      var row = rows[vi];
      for (var j = 0; j <= R; j++){
        var th = j / R * Math.PI * 2;
        var wave = Math.cos(scallops * th);
        var r = row.r * (1 + (row.amp || 0) * wave);
        var y = row.y + (row.yamp || 0) * wave;
        var px = Math.cos(th) * r, pz = Math.sin(th) * r;
        pos.push(px, y, pz);
        if (row.edge && j < R) edge.push(new THREE.Vector3(px, y, pz));
      }
    }
    var cols = R + 1;
    for (var a = 0; a < rows.length - 1; a++){
      for (var b = 0; b < R; b++){
        var o = a * cols + b;
        idx.push(o, o + cols, o + 1, o + 1, o + cols, o + cols + 1);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.userData = { edgeRow: edge };
    return geo;
  }

  function lathe(pts, seg){
    return new THREE.LatheGeometry(pts.map(function(p){
      return new THREE.Vector2(p[0], p[1]);
    }), seg || 48);
  }

  window.createLockerTeacup = function(){
    var root = new THREE.Group();
    root.name = 'Blue Teacup';
    root.scale.set(1.18, 1.18, 1.18); // 落地后总高 ≈ 0.85

    var matNavy = lam2(NAVY), matCream = lam(CREAM), matBrass = lam(BRASS);

    // body = 会跳动的整体（碟 + 杯 + 热气）
    var body = new THREE.Group();
    body.name = 'cup-body';
    root.add(body);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || body).add(m);
      return m;
    }

    /* ---- 茶碟：扇贝波浪边，中央浅窝托住杯脚，圈足落地 ---- */
    var SC = 12; // 扇贝数
    var saucerGeo = scallopLathe([
      {r: 0.012, y: 0.032},
      {r: 0.150, y: 0.026},                              // 中央浅窝（杯脚坐进来）
      {r: 0.185, y: 0.034},
      {r: 0.300, y: 0.058},
      {r: 0.360, y: 0.092, amp: 0.008, yamp: 0.005},
      {r: 0.405, y: 0.126, amp: 0.017, yamp: 0.011},
      {r: 0.415, y: 0.145, amp: 0.021, yamp: 0.015, edge: true},
      {r: 0.398, y: 0.132, amp: 0.016, yamp: 0.010},     // 以下为碟底回卷
      {r: 0.340, y: 0.080, amp: 0.005},
      {r: 0.250, y: 0.042},
      {r: 0.205, y: 0.010},
      {r: 0.185, y: 0.000},                              // 圈足触地
      {r: 0.150, y: 0.000},
      {r: 0.140, y: 0.014},
      {r: 0.015, y: 0.012}
    ], SC);
    mesh('saucer', saucerGeo, matNavy, 0, 0, 0);
    // 碟口奶油包边：沿波浪一圈的细管
    var edgeCurve = new THREE.CatmullRomCurve3(saucerGeo.userData.edgeRow, true);
    mesh('saucer-rim', new THREE.TubeGeometry(edgeCurve, 160, 0.008, 6), matCream, 0, 0, 0);
    // 碟面两圈奶油饰线
    [[0.235, 0.048], [0.310, 0.066]].forEach(function(p, i){
      var ring = mesh('saucer-line-' + i, new THREE.TorusGeometry(p[0], 0.0032, 5, 48), matCream, 0, p[1], 0);
      ring.rotation.x = Math.PI / 2;
    });

    /* ---- 杯身：鼓腹宽口 + 高脚，外海军蓝、内白瓷 ---- */
    var cupOuter = lathe([
      [0.000, 0.028], [0.095, 0.028], [0.135, 0.034],
      [0.148, 0.072], [0.125, 0.102], [0.118, 0.132],
      [0.150, 0.172], [0.215, 0.242], [0.262, 0.335],
      [0.285, 0.440], [0.292, 0.530], [0.290, 0.600],
      [0.296, 0.660], [0.308, 0.710]
    ], 48);
    mesh('cup-outer', cupOuter, matNavy, 0, 0, 0);
    var cupInner = lathe([
      [0.000, 0.330], [0.160, 0.345], [0.235, 0.420],
      [0.268, 0.520], [0.276, 0.600], [0.283, 0.660], [0.297, 0.710]
    ], 48);
    mesh('cup-inner', cupInner,
      new THREE.MeshLambertMaterial({color: PORC, side: THREE.BackSide}), 0, 0, 0);
    // 杯口奶油圆包边，盖住内外壁接缝
    var rim = mesh('cup-rim', new THREE.TorusGeometry(0.303, 0.011, 8, 48), matCream, 0, 0.712, 0);
    rim.rotation.x = Math.PI / 2;
    // 茶水面：浅琥珀圆片（略大于内壁半径，边缘埋入壁内）
    mesh('tea', new THREE.CylinderGeometry(0.284, 0.284, 0.01, 40), lam(TEA), 0, 0.648, 0);

    // 杯身饰线：一圈细蓝线 + 上下奶油细线
    [[0.2985, 0.652, BLUE, 0.0046],
     [0.3030, 0.684, CREAM, 0.0030],
     [0.2935, 0.556, CREAM, 0.0028]].forEach(function(p, i){
      var ln = mesh('cup-line-' + i, new THREE.TorusGeometry(p[0], p[3], 5, 48), lam(p[2]), 0, p[1], 0);
      ln.rotation.x = Math.PI / 2;
    });
    // 高脚上的黄铜箍
    var foot = mesh('foot-band', new THREE.TorusGeometry(0.121, 0.0062, 6, 32), matBrass, 0, 0.133, 0);
    foot.rotation.x = Math.PI / 2;

    // 杯身正面小花饰（黄铜花芯 + 奶油五瓣 + 枝叶点）
    var flower = new THREE.Group();
    flower.name = 'flower';
    flower.position.set(0, 0.415, 0.281);
    body.add(flower);
    mesh('fl-core', new THREE.SphereGeometry(0.018, 8, 6), matBrass, 0, 0, 0.005, flower);
    for (var f = 0; f < 5; f++){
      var fa = f / 5 * Math.PI * 2 + 0.3;
      mesh('fl-petal-' + f, new THREE.SphereGeometry(0.0155, 8, 6), matCream,
        Math.cos(fa) * 0.029, Math.sin(fa) * 0.029, 0, flower);
    }
    [[-0.070, 0.058], [0.074, 0.042], [-0.050, -0.062], [0.058, -0.070]].forEach(function(p, i){
      mesh('fl-dot-' + i, new THREE.SphereGeometry(0.009, 6, 5), matCream, p[0], p[1], -0.008, flower);
    });

    /* ---- 杯柄：半环 Torus，两端埋进杯壁 ---- */
    var handle = new THREE.Group();
    handle.name = 'handle';
    handle.position.set(0.356, 0.468, 0);
    handle.rotation.z = -Math.PI * 0.75; // 开口朝向杯身
    body.add(handle);
    mesh('handle-ring', new THREE.TorusGeometry(0.102, 0.024, 10, 28, Math.PI * 1.5), matNavy, 0, 0, 0, handle);
    // 柄外侧奶油细棱线
    mesh('handle-line', new THREE.TorusGeometry(0.102, 0.0255, 4, 28, Math.PI * 1.5),
      lam(CREAM), 0, 0, 0, handle).scale.set(1, 1, 0.26);
    // 端头圆球，藏接缝
    [0, Math.PI * 1.5].forEach(function(a, i){
      mesh('handle-cap-' + i, new THREE.SphereGeometry(0.025, 10, 8), matNavy,
        Math.cos(a) * 0.102, Math.sin(a) * 0.102, 0, handle);
    });

    /* ---- 热气：三缕云朵串（构造时隐藏，tap 时升起）---- */
    var steamRoot = new THREE.Group();
    steamRoot.name = 'steam';
    body.add(steamRoot);
    var strands = [];
    [{x: 0.00, z: 0.10, sway: 0.10},
     {x: -0.12, z: -0.07, sway: -0.09},
     {x: 0.13, z: -0.02, sway: 0.08}].forEach(function(cfg, i){
      var mat = new THREE.MeshLambertMaterial({
        color: STEAM, transparent: true, opacity: 0, depthWrite: false
      });
      var g = new THREE.Group();
      g.name = 'steam-' + i;
      g.position.set(cfg.x, 0.66, cfg.z);
      g.visible = false;
      steamRoot.add(g);
      // 一缕 = 大小交叠的小球连成云朵串（下细上蓬）
      [[0.000, 0.000, 0.030], [0.018, 0.048, 0.040], [-0.014, 0.100, 0.036],
       [0.020, 0.148, 0.050], [-0.022, 0.184, 0.040], [0.040, 0.196, 0.031],
       [-0.048, 0.158, 0.026], [0.008, 0.212, 0.034]
      ].forEach(function(s, k){
        mesh('puff-' + k, new THREE.SphereGeometry(s[2], 10, 8), mat, s[0], s[1], 0, g);
      });
      strands.push({group: g, mat: mat, baseX: cfg.x, sway: cfg.sway});
    });

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 1.1, 10),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0.02, 0.5, 0);
    root.add(proxy);

    /* ---- 交互：tap = 杯碟轻跳 + 三缕热气 ---- */
    var busy = false;
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;
        var tl = gsap.timeline({
          onComplete: function(){
            busy = false;
            strands.forEach(function(s){ s.group.visible = false; s.mat.opacity = 0; });
          }
        });
        // 杯碟轻跳（快起 + 弹落 + 微倾）
        tl.to(body.position, {y: 0.055, duration: 0.13, ease: 'power2.out'}, 0)
          .to(body.position, {y: 0, duration: 0.42, ease: 'bounce.out'}, 0.13)
          .to(body.rotation, {z: 0.03, duration: 0.1, ease: 'sine.out'}, 0)
          .to(body.rotation, {z: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)'}, 0.1);
        // 三缕热气：错峰升起、摇曳、到顶淡出
        strands.forEach(function(s, i){
          var d = 0.18 + i * 0.22;
          s.group.position.set(s.baseX, 0.66, s.group.position.z);
          s.group.scale.set(0.5, 0.5, 0.5);
          s.mat.opacity = 0;
          s.group.visible = true;
          tl.to(s.mat, {opacity: 0.92, duration: 0.4, ease: 'sine.out'}, d)
            .to(s.group.position, {y: 1.12, duration: 1.7, ease: 'sine.inOut'}, d)
            .to(s.group.scale, {x: 1.15, y: 1.15, z: 1.15, duration: 1.7, ease: 'sine.out'}, d)
            .to(s.group.position, {x: s.baseX + s.sway, duration: 0.85, yoyo: true,
              repeat: 1, ease: 'sine.inOut'}, d)
            .to(s.mat, {opacity: 0, duration: 0.5, ease: 'sine.in'}, d + 1.2);
        });
      }
    };
    return root;
  };
})();
