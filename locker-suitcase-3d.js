/* 复古手提箱 —— 程序化 3D 模型（three r128 兼容）
 * 米色箱体立放 + 木色护角 + 深色皮捆带 + 黄铜锁扣两枚 + 顶部提手
 * 箱盖为前半壳，绕底边铰链；tap() 时锁扣先后弹开、盖开缝透暖光、飘出小云
 * userData.fx = { tap() }
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8,
      PORCELAIN = 0xf2ede2,
      LEATHER = 0x4a3626, LEATHER_D = 0x38291d,
      CREAM_D = 0xd9c49e, CLOUD_W = 0xdfe9f2;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 圆角盒（bevel 外扩已补偿，实际外形正好 w×h×d） */
  function roundedBox(w, h, d, r){
    var bevel = Math.min(r * 0.9, d * 0.2);
    var bs = Math.min(bevel, r * 0.95);
    var w2 = w - bs * 2, h2 = h - bs * 2, r2 = Math.max(0.008, r - bs);
    var x = -w2/2, y = -h2/2;
    var shape = new THREE.Shape();
    shape.moveTo(x + r2, y);
    shape.lineTo(x + w2 - r2, y);
    shape.quadraticCurveTo(x + w2, y, x + w2, y + r2);
    shape.lineTo(x + w2, y + h2 - r2);
    shape.quadraticCurveTo(x + w2, y + h2, x + w2 - r2, y + h2);
    shape.lineTo(x + r2, y + h2);
    shape.quadraticCurveTo(x, y + h2, x, y + h2 - r2);
    shape.lineTo(x, y + r2);
    shape.quadraticCurveTo(x, y, x + r2, y);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, d - bevel * 2),
      bevelEnabled: true, bevelThickness: bevel, bevelSize: bs,
      bevelSegments: 3, curveSegments: 10
    });
    geo.translate(0, 0, -Math.max(0.01, d - bevel * 2) / 2);
    return geo;
  }

  /* 三角护角板：外角指向 (+x,+y)，斜边内凹，挤出沿 +z（含小 bevel） */
  function cornerShieldGeo(L, off, cr, depth){
    var s = new THREE.Shape();
    s.moveTo(-L, off);
    s.lineTo(-cr, off);
    s.quadraticCurveTo(off, off, off, -cr);
    s.lineTo(off, -L);
    s.quadraticCurveTo(-L * 0.3, -L * 0.3, -L, off);
    var g = new THREE.ExtrudeGeometry(s, {
      depth: depth, bevelEnabled: true, bevelThickness: 0.01,
      bevelSize: 0.008, bevelSegments: 2, curveSegments: 8
    });
    return g;
  }

  /* 皮捆带：在 (z,y) 平面画侧面轮廓，挤出为宽 width 的带。
   * 用法：mesh.rotation.y = -PI/2 后，shape X → 世界 z，shape Y → 世界 y。 */
  function strapGeo(profileFn, width){
    var s = new THREE.Shape();
    profileFn(s);
    var d = width - 0.012;
    var geo = new THREE.ExtrudeGeometry(s, {
      depth: d, bevelEnabled: true, bevelThickness: 0.006,
      bevelSize: 0.005, bevelSegments: 2, curveSegments: 10
    });
    geo.translate(0, 0, -d / 2);
    return geo;
  }

  window.createLockerSuitcase = function(){
    var root = new THREE.Group();
    root.name = 'Vintage Suitcase';

    var matCream = lam(CREAM), matWood = lam(WOOD), matWoodD = lam(WOOD_D),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D),
        matLeather = lam(LEATHER), matLeatherD = lam(LEATHER_D);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    /* ---- 尺寸：宽0.82 高1.02；缝在 z=0.05
     * 后壳(箱体) z:-0.23..0.05；前壳(盖) z:0.05..0.21，绕底前缘铰链 ---- */
    var W = 0.82, H = 1.02, R = 0.07;

    var body = new THREE.Group(); body.name = 'body'; root.add(body);
    mesh('shell-back', roundedBox(W, H, 0.28, R), matCream, 0, H/2, -0.09, body);

    var lidPivot = new THREE.Group();
    lidPivot.name = 'lid';
    lidPivot.position.set(0, 0.03, 0.055);
    root.add(lidPivot);
    // 盖壳：lid 局部坐标 = 世界坐标 - (0, 0.03, 0.055)（闭合时）
    function toLid(m){ m.position.y -= 0.03; m.position.z -= 0.055; return m; }
    toLid(mesh('shell-lid', roundedBox(W, H, 0.16, R), matCream, 0, H/2, 0.13, lidPivot));

    // 铰链：底前缘黄铜轴 + 三节指
    var hinge = mesh('hinge-rod', new THREE.CylinderGeometry(0.014, 0.014, 0.5, 10), matBrassD, 0, 0.03, 0.055, body);
    hinge.rotation.z = Math.PI / 2;
    [-0.19, 0, 0.19].forEach(function(hx, i){
      var k = mesh('hinge-knuckle-' + i, new THREE.CylinderGeometry(0.021, 0.021, 0.055, 10), matBrass, hx, 0.03, 0.055, body);
      k.rotation.z = Math.PI / 2;
    });

    /* ---- 缝口包边：箱体侧深木色一圈（挡住开缝时的截面）+ 盖前脸饰环 ---- */
    function rimCurve(w, h, r){
      var x = -w/2, y = -h/2;
      var s = new THREE.Shape();
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      var pts = s.getPoints(10).map(function(p){ return new THREE.Vector3(p.x, p.y, 0); });
      return new THREE.CatmullRomCurve3(pts, true);
    }
    mesh('rim-body', new THREE.TubeGeometry(rimCurve(W - 0.045, H - 0.045, R), 96, 0.016, 8, true),
      matWoodD, 0, H/2, 0.045, body);
    toLid(mesh('rim-lid', new THREE.TubeGeometry(rimCurve(W - 0.045, H - 0.045, R), 96, 0.014, 8, true),
      matWoodD, 0, H/2, 0.062, lidPivot));
    toLid(mesh('rim-lid-front', new THREE.TubeGeometry(rimCurve(W - 0.17, H - 0.17, R), 96, 0.01, 8, true),
      lam(CREAM_D), 0, H/2, 0.208, lidPivot));

    /* ---- 发光内衬（贴在箱体前口，微微凸出缝面；闭合时藏进盖壳内部）---- */
    var glowMat = new THREE.MeshLambertMaterial({color: 0xf5dfae, emissive: 0xcf8526, emissiveIntensity: 0.85});
    mesh('lining-glow', roundedBox(0.64, 0.84, 0.03, 0.06), glowMat, 0, H/2, 0.052, body);
    var glowLight = new THREE.PointLight(0xffc46a, 0, 1.5);
    glowLight.position.set(0, 0.85, 0.16);
    body.add(glowLight);

    /* ---- 木色护角：盖前四角 + 箱体后四角 ---- */
    var shieldGeoF = cornerShieldGeo(0.115, 0.012, R + 0.01, 0.13);
    var corners = [[ W/2, H, 0], [-W/2, H, 1], [-W/2, 0, 2], [ W/2, 0, 3]];
    corners.forEach(function(c){
      // 盖前角：世界 z 从 0.075 挤到 0.075+0.13+bevel≈0.215（罩过前脸圆角）
      var gLid = new THREE.Group();
      gLid.position.set(c[0], c[1] - 0.03, 0.02);   // lid 局部 (世界 y-0.03, z=0.075-0.055)
      gLid.rotation.z = c[2] * Math.PI / 2;
      var mL = new THREE.Mesh(shieldGeoF, matWood);
      mL.name = 'shield-lid-' + c[2];
      gLid.add(mL);
      var rv = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), matBrassD);
      rv.name = 'rivet-' + c[2];
      rv.position.set(-0.05, -0.05, 0.148);
      gLid.add(rv);
      lidPivot.add(gLid);
      // 箱体后角：世界 z 从 -0.245 挤到 ≈-0.095
      var gBody = new THREE.Group();
      gBody.position.set(c[0], c[1], -0.245);
      gBody.rotation.z = c[2] * Math.PI / 2;
      var mB = new THREE.Mesh(shieldGeoF, matWood);
      mB.name = 'shield-body-' + c[2];
      gBody.add(mB);
      body.add(gBody);
    });

    /* ---- 皮捆带两条：盖侧（前脸+顶前段）+ 箱体侧（顶后段+背面），顶面黄铜带扣相接 ---- */
    var T = 0.036;   // 带厚
    var frontStrapGeo = strapGeo(function(s){
      s.moveTo(0.21 + T, 0.04);
      s.lineTo(0.21 + T, 0.94);
      s.quadraticCurveTo(0.21 + T, 1.02 + T, 0.13, 1.02 + T);
      s.lineTo(0.062, 1.02 + T);
      s.lineTo(0.062, 1.016);
      s.lineTo(0.13, 1.016);
      s.quadraticCurveTo(0.206, 1.016, 0.206, 0.94);
      s.lineTo(0.206, 0.04);
      s.quadraticCurveTo(0.206, 0.014, 0.228, 0.014);
      s.quadraticCurveTo(0.21 + T, 0.014, 0.21 + T, 0.04);
    }, 0.085);
    var backStrapGeo = strapGeo(function(s){
      s.moveTo(0.048, 1.02 + T);
      s.lineTo(-0.15, 1.02 + T);
      s.quadraticCurveTo(-0.23 - T, 1.02 + T, -0.23 - T, 0.94);
      s.lineTo(-0.23 - T, 0.04);
      s.quadraticCurveTo(-0.23 - T, 0.014, -0.248, 0.014);
      s.quadraticCurveTo(-0.226, 0.014, -0.226, 0.04);
      s.lineTo(-0.226, 0.94);
      s.quadraticCurveTo(-0.226, 1.016, -0.15, 1.016);
      s.lineTo(0.048, 1.016);
      s.lineTo(0.048, 1.02 + T);
    }, 0.085);
    [-0.25, 0.25].forEach(function(sx, i){
      var sf = mesh('strap-front-' + i, frontStrapGeo, matLeather, sx, -0.03, -0.055, lidPivot);
      sf.rotation.y = -Math.PI / 2;
      var sb = mesh('strap-back-' + i, backStrapGeo, matLeatherD, sx, 0, 0, body);
      sb.rotation.y = -Math.PI / 2;
      // 前脸黄铜带箍
      toLid(mesh('strap-keeper-' + i, roundedBox(0.104, 0.05, 0.045, 0.016), matBrassD, sx, 0.42, 0.232, lidPivot));
      // 顶面带扣：卧倒的椭圆环，骑在两段带头交界处
      var buckle = mesh('buckle-' + i, new THREE.TorusGeometry(0.032, 0.009, 8, 18), matBrass, sx, 1.052, 0.055, body);
      buckle.rotation.x = Math.PI / 2;
      buckle.scale.set(1.35, 1, 0.8);
      var prong = mesh('buckle-prong-' + i, new THREE.CylinderGeometry(0.005, 0.004, 0.062, 6), matBrassD, sx, 1.055, 0.05, body);
      prong.rotation.x = Math.PI / 2;
    });

    /* ---- 顶部提手：皮革半环 + 黄铜脚座（装在箱体侧顶面）---- */
    var handle = mesh('handle', new THREE.TorusGeometry(0.1, 0.024, 10, 26, Math.PI), matLeather, 0, 1.03, -0.075, body);
    handle.scale.set(1, 0.85, 1);
    [-0.1, 0.1].forEach(function(hx, i){
      mesh('handle-mount-' + i, new THREE.CylinderGeometry(0.03, 0.037, 0.036, 12), matBrass, hx, 1.026, -0.075, body);
      mesh('handle-knob-' + i, new THREE.SphereGeometry(0.024, 10, 8), matBrassD, hx, 1.043, -0.075, body);
    });

    /* ---- 黄铜锁扣两枚（顶面跨缝）：底座在箱体，搭扣压过缝钩住盖上的锁鼻 ---- */
    var hasps = [];
    [-0.14, 0.14].forEach(function(cx, i){
      mesh('clasp-base-' + i, roundedBox(0.08, 0.02, 0.09, 0.02), matBrassD, cx, 1.026, -0.012, body);
      var haspPivot = new THREE.Group();
      haspPivot.name = 'hasp-' + i;
      haspPivot.position.set(cx, 1.036, -0.05);
      body.add(haspPivot);
      var plate = new THREE.Mesh(roundedBox(0.062, 0.016, 0.13, 0.02), matBrass);
      plate.name = 'hasp-plate-' + i;
      plate.position.set(0, 0.004, 0.062);
      haspPivot.add(plate);
      var lip = new THREE.Mesh(roundedBox(0.062, 0.036, 0.015, 0.006), matBrass);
      lip.name = 'hasp-lip-' + i;
      lip.position.set(0, -0.012, 0.128);
      haspPivot.add(lip);
      var stud = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), matBrassD);
      stud.name = 'hasp-stud-' + i;
      stud.position.set(0, 0.014, 0.062);
      haspPivot.add(stud);
      hasps.push(haspPivot);
      // 盖上的锁鼻（黄铜小柱 + 圆头），在搭扣钩前方
      toLid(mesh('catch-' + i, new THREE.CylinderGeometry(0.012, 0.016, 0.02, 10), matBrassD, cx, 1.028, 0.095, lidPivot));
      toLid(mesh('catch-knob-' + i, new THREE.SphereGeometry(0.013, 10, 8), matBrass, cx, 1.039, 0.095, lidPivot));
    });

    /* ---- 前脸贴纸：奶白高椭圆 + 蓝边 + 小云 + 克莱因蓝小燕子 ---- */
    var sticker = new THREE.Group();
    sticker.name = 'sticker';
    sticker.position.set(0, 0.535, 0.158);   // lid 局部（世界 z≈0.213）
    lidPivot.add(sticker);
    var oval = mesh('sticker-oval', new THREE.CylinderGeometry(0.13, 0.13, 0.014, 28), lam(PORCELAIN), 0, 0, 0, sticker);
    oval.rotation.x = Math.PI / 2;
    oval.scale.set(0.92, 1, 1.28);
    var ovalRim = mesh('sticker-rim', new THREE.TorusGeometry(0.128, 0.008, 6, 32), lam(BLUE), 0, 0, 0.004, sticker);
    ovalRim.scale.set(0.92, 1.28, 1);
    [[0, -0.062, 0.05], [0.058, -0.08, 0.036], [-0.055, -0.078, 0.033], [0.02, -0.098, 0.03]].forEach(function(p, i){
      var puff = mesh('sticker-cloud-' + i, new THREE.SphereGeometry(p[2], 10, 8), lam(CLOUD_W), p[0], p[1], 0.008, sticker);
      puff.scale.z = 0.35;
    });
    var bird = new THREE.Group();
    bird.name = 'sticker-bird';
    bird.position.set(0, 0.035, 0.013);
    bird.rotation.z = 0.18;
    sticker.add(bird);
    var bb = mesh('bird-body', new THREE.SphereGeometry(0.02, 10, 8), lam(NAVY), 0, 0, 0, bird);
    bb.scale.set(1.7, 0.65, 0.4);
    // 尾羽小三角
    var tail = mesh('bird-tail', new THREE.ConeGeometry(0.011, 0.045, 5), lam(NAVY), -0.042, -0.006, 0, bird);
    tail.rotation.z = Math.PI / 2 + 0.25;
    tail.scale.z = 0.35;
    // 双翼：向外上方展开的镰刀形
    [[-1, 0.032, 0.024, 0.7], [1, 0.024, 0.028, -0.45]].forEach(function(wd, i){
      var wing = mesh('bird-wing-' + i, new THREE.SphereGeometry(0.02, 8, 8), lam(NAVY), wd[0] * wd[1], wd[2], 0, bird);
      wing.scale.set(2.2, 0.55, 0.35);
      wing.rotation.z = wd[0] * -0.9 + wd[3] * 0;
      wing.rotation.z = wd[0] === -1 ? 0.75 : -0.55;
    });

    /* ---- 侧面小圆贴纸（左侧箱体）---- */
    var side = new THREE.Group();
    side.name = 'side-sticker';
    side.position.set(-0.413, 0.6, -0.09);
    side.rotation.z = Math.PI / 2;
    body.add(side);
    mesh('side-disc', new THREE.CylinderGeometry(0.082, 0.082, 0.012, 22), lam(PORCELAIN), 0, 0, 0, side);
    var sring = mesh('side-rim', new THREE.TorusGeometry(0.079, 0.006, 6, 26), lam(BLUE), 0, 0.004, 0, side);
    sring.rotation.x = Math.PI / 2;
    [[0, 0.0, 0.028], [0.033, 0.008, 0.021], [-0.031, 0.006, 0.019]].forEach(function(p, i){
      var puff = mesh('side-puff-' + i, new THREE.SphereGeometry(p[2], 8, 6), lam(CLOUD_W), p[0], 0.008, p[1], side);
      puff.scale.y = 0.45;
    });

    /* ---- 小云（tap 时从缝里飘出，指甲盖大）---- */
    var cloud = new THREE.Group();
    cloud.name = 'cloud';
    var cloudHome = {x: 0, y: 0.95, z: 0.14};
    cloud.position.set(cloudHome.x, cloudHome.y, cloudHome.z);
    cloud.scale.set(0.001, 0.001, 0.001);
    root.add(cloud);
    var cloudMat = new THREE.MeshLambertMaterial({color: 0xf7f3ea, emissive: 0x8a6b3a, emissiveIntensity: 0.45});
    [[0, 0, 0, 0.046], [0.046, -0.012, 0.004, 0.033], [-0.044, -0.01, -0.003, 0.031], [0.012, 0.024, -0.004, 0.028]].forEach(function(p, i){
      var puff = new THREE.Mesh(new THREE.SphereGeometry(p[3], 10, 8), cloudMat);
      puff.name = 'puff-' + i;
      puff.position.set(p[0], p[1], p[2]);
      puff.scale.z = 0.78;
      cloud.add(puff);
    });

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 1.26, 0.64),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.62, 0);
    root.add(proxy);

    /* ---- 交互：tap = 锁扣先后弹开 → 盖前开缝透暖光 → 小云飘出停 1 秒 → 收 ---- */
    var busy = false;
    var OPEN = 0.44;   // ≈25°
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;
        var tl = gsap.timeline({
          onComplete: function(){
            busy = false;
            hasps[0].rotation.x = 0; hasps[1].rotation.x = 0;
            lidPivot.rotation.x = 0;
            glowLight.intensity = 0;
            cloud.scale.set(0.001, 0.001, 0.001);
            cloud.position.set(cloudHome.x, cloudHome.y, cloudHome.z);
            cloud.rotation.y = 0;
          }
        });
        // 1) 两枚锁扣先后向后翻开
        tl.to(hasps[0].rotation, {x: -1.7, duration: 0.22, ease: 'back.out(2.2)'}, 0.0);
        tl.to(hasps[1].rotation, {x: -1.7, duration: 0.22, ease: 'back.out(2.2)'}, 0.16);
        // 2) 盖向前开缝 + 暖光
        tl.to(lidPivot.rotation, {x: OPEN, duration: 0.55, ease: 'back.out(1.1)'}, 0.38);
        tl.to(glowLight, {intensity: 1.6, duration: 0.4, ease: 'power1.out'}, 0.45);
        // 3) 小云从缝里飘出
        tl.to(cloud.scale, {x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(1.7)'}, 0.62);
        tl.to(cloud.position, {y: cloudHome.y + 0.32, z: cloudHome.z + 0.18, duration: 0.85, ease: 'power1.out'}, 0.62);
        tl.to(cloud.rotation, {y: 0.5, duration: 1.6, ease: 'sine.inOut'}, 0.62);
        // 4) 悬停约 1 秒（轻微上下浮动）
        tl.to(cloud.position, {y: '+=0.035', duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut'}, 1.48);
        // 5) 小云缩回、光熄、盖合、锁扣归位
        tl.to(cloud.scale, {x: 0.001, y: 0.001, z: 0.001, duration: 0.32, ease: 'back.in(1.6)'}, 2.52);
        tl.to(cloud.position, {y: cloudHome.y, z: cloudHome.z, duration: 0.32, ease: 'power1.in'}, 2.52);
        tl.to(glowLight, {intensity: 0, duration: 0.4, ease: 'power1.in'}, 2.64);
        tl.to(lidPivot.rotation, {x: 0, duration: 0.45, ease: 'power2.inOut'}, 2.72);
        tl.to(hasps[1].rotation, {x: 0, duration: 0.24, ease: 'back.out(2)'}, 3.14);
        tl.to(hasps[0].rotation, {x: 0, duration: 0.24, ease: 'back.out(2)'}, 3.26);
      }
    };

    return root;
  };
})();
