/* 复古木画架 —— 程序化 3D 模型（three r128 兼容）
 * A 字形三腿画架 + 搁画横档 + 顶部夹块 + 奶油画框小油画（蓝色海天）
 * 画里藏一只白色小飞鸟（独立 mesh），tap() 时跳出画框绕画架飞一圈再落回。
 * userData.fx = { tap }
 */
(function(){
  'use strict';

  var NAVY = 0x2c4a6e, BLUE = 0x4a7cb8, BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a, CREAM = 0xead9b8, PORC = 0xf2ede2,
      INK = 0x1c1c20;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 圆角盒（XY 圆角轮廓沿 Z 挤出 + 倒角），几何中心在原点 */
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

  /* 画框：外圆角矩形 - 内孔，带倒角挤出（背面贴 z=0，正面朝 +z） */
  function frameGeo(ow, oh, iw, ih, depth, bevel, r){
    var shape = new THREE.Shape();
    var x = -ow/2, y = -oh/2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + ow - r, y);
    shape.quadraticCurveTo(x + ow, y, x + ow, y + r);
    shape.lineTo(x + ow, y + oh - r);
    shape.quadraticCurveTo(x + ow, y + oh, x + ow - r, y + oh);
    shape.lineTo(x + r, y + oh);
    shape.quadraticCurveTo(x, y + oh, x, y + oh - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    var hole = new THREE.Path();
    hole.moveTo(-iw/2, -ih/2);
    hole.lineTo(iw/2, -ih/2);
    hole.lineTo(iw/2, ih/2);
    hole.lineTo(-iw/2, ih/2);
    hole.closePath();
    shape.holes.push(hole);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 2, curveSegments: 8
    });
    geo.translate(0, 0, bevel); // 让几何从 z≈0 开始向 +z
    return geo;
  }

  /* 手绘油画：蓝色海天 + 奶油云 + 远山 + 浪花（不画鸟，鸟是独立 mesh） */
  function paintingTexture(){
    var c = document.createElement('canvas');
    c.width = 256; c.height = 224;
    var g = c.getContext('2d');
    var HORIZON = 132;
    // 天空渐变（克莱因蓝系）
    var sky = g.createLinearGradient(0, 0, 0, HORIZON + 10);
    sky.addColorStop(0, '#2f5a96');
    sky.addColorStop(0.55, '#5e8fc0');
    sky.addColorStop(1, '#d8dfd2');
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, HORIZON + 10);
    // 奶油色云团
    function cloud(cx, cy, s, alpha){
      g.fillStyle = 'rgba(240,228,201,' + alpha + ')';
      var lobes = [[0,0,1.6,0.62],[-1.1,0.22,0.9,0.42],[1.15,0.18,1.0,0.46],[0.35,-0.42,0.85,0.4],[-0.5,-0.3,0.7,0.36]];
      for (var i = 0; i < lobes.length; i++){
        g.beginPath();
        g.ellipse(cx + lobes[i][0]*s, cy + lobes[i][1]*s, lobes[i][2]*s, lobes[i][3]*s, 0, 0, Math.PI*2);
        g.fill();
      }
    }
    cloud(46, 118, 17, 0.8);
    cloud(200, 66, 16, 0.7);
    cloud(158, 112, 24, 0.9);
    cloud(232, 30, 11, 0.4);
    cloud(228, 118, 14, 0.75);
    // 远山（海军蓝剪影）
    g.fillStyle = '#3c5c82';
    g.beginPath();
    g.moveTo(0, HORIZON + 2);
    var mts = [[0,124],[34,116],[70,122],[104,112],[138,120],[172,110],[206,118],[236,113],[256,121]];
    for (var m = 0; m < mts.length; m++) g.lineTo(mts[m][0], mts[m][1]);
    g.lineTo(256, HORIZON + 2);
    g.closePath();
    g.fill();
    // 海面渐变
    var sea = g.createLinearGradient(0, HORIZON, 0, 224);
    sea.addColorStop(0, '#3c6796');
    sea.addColorStop(0.35, '#2c4a6e');
    sea.addColorStop(1, '#1e3552');
    g.fillStyle = sea;
    g.fillRect(0, HORIZON, 256, 224 - HORIZON);
    // 浪花：一排排短弧（确定性伪随机）
    var seed = 7;
    function rnd(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var row = 0; row < 9; row++){
      var y = HORIZON + 8 + row * 9 + rnd() * 4;
      var scale = 0.5 + (y - HORIZON) / (224 - HORIZON);
      for (var k = 0; k < 7; k++){
        var wx = rnd() * 256, wl = (8 + rnd() * 16) * scale;
        g.strokeStyle = rnd() > 0.45 ? 'rgba(240,235,224,0.8)' : 'rgba(122,160,198,0.75)';
        g.lineWidth = 1.2 * scale + rnd();
        g.beginPath();
        g.moveTo(wx, y);
        g.quadraticCurveTo(wx + wl * 0.5, y - 2.5 * scale, wx + wl, y + rnd());
        g.stroke();
      }
    }
    // 手作颗粒感：细小斑点
    for (var s2 = 0; s2 < 260; s2++){
      g.fillStyle = 'rgba(255,250,235,' + (0.03 + rnd() * 0.05) + ')';
      g.fillRect(rnd() * 256, rnd() * 224, 1.4, 1.4);
    }
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  window.createLockerEasel = function(){
    var root = new THREE.Group();
    root.name = 'Vintage Easel';
    var matWood = lam(WOOD), matWoodD = lam(WOOD_D),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D),
        matCream = lam(CREAM), matPorc = lam(PORC);

    var body = new THREE.Group();  // tap 时轻晃整体
    body.name = 'easel-body';
    root.add(body);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || body).add(m);
      return m;
    }

    /* 两点之间放一根圆角木梁（几何 z 轴对齐两点连线） */
    var Y_AXIS_Z = new THREE.Vector3(0, 0, 1);
    function beam(name, p1, p2, w, h, mat, parent, r){
      var a = new THREE.Vector3(p1[0], p1[1], p1[2]),
          b = new THREE.Vector3(p2[0], p2[1], p2[2]);
      var dir = new THREE.Vector3().subVectors(b, a);
      var len = dir.length();
      var m = mesh(name, roundedBox(w, h, len, r || Math.min(0.016, w * 0.35)), mat,
        (a.x + b.x)/2, (a.y + b.y)/2, (a.z + b.z)/2, parent);
      m.quaternion.setFromUnitVectors(Y_AXIS_Z, dir.normalize());
      return m;
    }

    /* ---- 前架（整体后仰的 A 字面：两前腿 + 中柱 + 搁档 + 画）---- */
    var frameG = new THREE.Group();
    frameG.name = 'front-frame';
    frameG.rotation.x = -0.11;   // 顶部向后仰
    body.add(frameG);

    // 两条前腿（上端收拢，下端外张）
    beam('leg-l', [-0.27, 0.03, 0], [-0.065, 1.22, 0], 0.055, 0.05, matWood, frameG);
    beam('leg-r', [ 0.27, 0.03, 0], [ 0.065, 1.22, 0], 0.055, 0.05, matWood, frameG);
    // 中柱（画后面的立柱，下端接横撑，一直伸到顶）
    beam('mast', [0, 0.19, -0.045], [0, 1.31, -0.045], 0.058, 0.05, matWoodD, frameG);
    // 下横撑：连住两腿与中柱，收掉悬空感
    beam('stretcher', [-0.25, 0.185, -0.022], [0.25, 0.185, -0.022], 0.052, 0.055, matWood, frameG);
    mesh('stretcher-pin-l', new THREE.SphereGeometry(0.012, 10, 8), matBrassD, -0.235, 0.185, 0.006, frameG);
    mesh('stretcher-pin-r', new THREE.SphereGeometry(0.012, 10, 8), matBrassD,  0.235, 0.185, 0.006, frameG);
    // 顶端黄铜小圆头
    mesh('mast-finial', new THREE.SphereGeometry(0.028, 12, 10), matBrass, 0, 1.325, -0.045, frameG);
    // 前腿顶端横楔（把三根料箍在一起）
    mesh('crown', roundedBox(0.21, 0.075, 0.11, 0.025), matWoodD, 0, 1.185, -0.015, frameG);
    mesh('crown-pin', new THREE.SphereGeometry(0.014, 10, 8), matBrassD, 0, 1.185, 0.042, frameG);

    // 搁画横档（比腿宽出一截）+ 前沿小挡唇 + 黄铜圆钉
    mesh('tray', roundedBox(0.64, 0.055, 0.12, 0.02), matWood, 0, 0.43, 0.03, frameG);
    mesh('tray-lip', roundedBox(0.64, 0.045, 0.03, 0.012), matWoodD, 0, 0.465, 0.1, frameG);
    mesh('tray-pin-l', new THREE.SphereGeometry(0.013, 10, 8), matBrass, -0.245, 0.462, 0.115, frameG);
    mesh('tray-pin-r', new THREE.SphereGeometry(0.013, 10, 8), matBrass,  0.245, 0.462, 0.115, frameG);

    /* ---- 小油画（奶油画框 + 蓝色海天画面）：明显立在腿平面之前，坐在搁档上 ---- */
    var painting = new THREE.Group();
    painting.name = 'painting';
    painting.position.set(0, 0.72, 0.05);
    frameG.add(painting);

    // 背板
    mesh('canvas-back', roundedBox(0.53, 0.47, 0.02, 0.012), matWoodD, 0, 0, 0.002, painting);
    // 画面（CanvasTexture）
    mesh('canvas-paint',
      new THREE.PlaneGeometry(0.47, 0.41),
      new THREE.MeshLambertMaterial({map: paintingTexture()}), 0, 0, 0.016, painting);
    // 黄铜内衬细线框
    mesh('liner', frameGeo(0.5, 0.44, 0.41, 0.35, 0.012, 0.004, 0.015), matBrass, 0, 0, 0.012, painting);
    // 奶油色外框
    mesh('frame', frameGeo(0.58, 0.52, 0.47, 0.41, 0.026, 0.009, 0.03), matCream, 0, 0, 0.012, painting);
    // 画框四角黄铜小钉
    [[-0.255, -0.225], [0.255, -0.225], [-0.255, 0.225], [0.255, 0.225]].forEach(function(p, i){
      mesh('frame-pin-' + i, new THREE.SphereGeometry(0.009, 8, 6), matBrassD, p[0], p[1], 0.052, painting);
    });

    // 顶部夹块（从中柱探出、压住画框上沿）+ 黄铜旋钮
    mesh('clamp', roundedBox(0.115, 0.08, 0.185, 0.024), matWood, 0, 0.99, 0.03, frameG);
    var knob = mesh('clamp-knob', new THREE.CylinderGeometry(0.02, 0.026, 0.026, 12), matBrass, 0, 0.99, 0.132, frameG);
    knob.rotation.x = Math.PI / 2;

    // 搁档前唇上：一支斜躺的小画笔 + 三点颜料渍（手作趣味）
    var brush = new THREE.Group();
    brush.name = 'brush';
    brush.position.set(-0.12, 0.497, 0.112);
    brush.rotation.set(0.1, 0.14, 1.42);
    frameG.add(brush);
    mesh('brush-handle', new THREE.CylinderGeometry(0.0065, 0.009, 0.15, 8), matWoodD, 0, 0.02, 0, brush);
    mesh('brush-ferrule', new THREE.CylinderGeometry(0.007, 0.006, 0.024, 8), matBrass, 0, -0.062, 0, brush);
    var tip = mesh('brush-tip', new THREE.ConeGeometry(0.0063, 0.03, 8), lam(BLUE), 0, -0.086, 0, brush);
    tip.rotation.x = Math.PI;
    [[0.075, NAVY], [0.115, BLUE], [0.152, CREAM]].forEach(function(p, i){
      var dab = mesh('paint-dab-' + i, new THREE.SphereGeometry(0.011, 10, 8), lam(p[1]), p[0], 0.492, 0.112, frameG);
      dab.scale.set(1, 0.6, 0.7);
    });

    /* ---- 后撑腿（铰接在顶部横楔后方，向后斜撑）---- */
    beam('leg-back', [0, 1.13, -0.185], [0, 0.03, -0.48], 0.052, 0.048, matWood, body);
    var hinge = mesh('hinge', new THREE.CylinderGeometry(0.02, 0.02, 0.13, 12), matBrassD, 0, 1.135, -0.17);
    hinge.rotation.z = Math.PI / 2;

    /* ---- 四只小脚垫（落地扎实）---- */
    [[-0.272, 0.005], [0.272, 0.005]].forEach(function(p, i){
      // 前腿脚垫要放在 frameG 里跟着后仰前的落点走 → 直接放 body，按倾斜后位置
      mesh('foot-f' + i, new THREE.CylinderGeometry(0.038, 0.045, 0.045, 12), matWoodD, p[0], 0.023, p[1]);
    });
    mesh('foot-b', new THREE.CylinderGeometry(0.036, 0.043, 0.045, 12), matWoodD, 0, 0.023, -0.485);

    /* ---- 小白鸟（平时贴在画面上，融入画）---- */
    var bird = new THREE.Group();
    bird.name = 'bird';
    frameG.add(bird);

    // 身体（鼻尖朝 +z）
    var bBody = mesh('bird-body', new THREE.SphereGeometry(0.02, 12, 10), matPorc, 0, 0, 0, bird);
    bBody.scale.set(0.8, 0.68, 2.0);
    mesh('bird-head', new THREE.SphereGeometry(0.0125, 10, 8), matPorc, 0, 0.008, 0.036, bird);
    var beak = mesh('bird-beak', new THREE.ConeGeometry(0.0045, 0.016, 8), matBrassD, 0, 0.006, 0.05, bird);
    beak.rotation.x = Math.PI / 2;
    // 燕形分叉尾
    var tailL = mesh('bird-tail-l', new THREE.SphereGeometry(0.012, 8, 6), matPorc, -0.006, 0.001, -0.036, bird);
    tailL.scale.set(0.4, 0.16, 1.5);
    tailL.rotation.y = 0.22;
    var tailR = mesh('bird-tail-r', new THREE.SphereGeometry(0.012, 8, 6), matPorc, 0.006, 0.001, -0.036, bird);
    tailR.scale.set(0.4, 0.16, 1.5);
    tailR.rotation.y = -0.22;
    // 两翼（带扇动枢轴）：内段 + 轻微后掠的外段，彼此大幅重叠成一整片
    var wingPivotL = new THREE.Group(), wingPivotR = new THREE.Group();
    wingPivotL.position.set(-0.006, 0.007, 0.006);
    wingPivotR.position.set( 0.006, 0.007, 0.006);
    bird.add(wingPivotL); bird.add(wingPivotR);
    function buildWing(pivot, sgn){
      var inner = mesh('wing-in', new THREE.SphereGeometry(0.03, 12, 8), matPorc, sgn * 0.026, 0, -0.002, pivot);
      inner.scale.set(1.25, 0.17, 0.8);
      inner.rotation.y = -sgn * 0.2;
      var outer = mesh('wing-out', new THREE.SphereGeometry(0.03, 12, 8), matPorc, sgn * 0.062, 0.001, -0.016, pivot);
      outer.scale.set(1.15, 0.13, 0.55);
      outer.rotation.y = -sgn * 0.5;   // 外段后掠 → 燕形
    }
    buildWing(wingPivotL, -1);
    buildWing(wingPivotR, 1);

    // 停驻姿态：平贴画布（画面在 frameG z≈0.066），背对观众，鼻尖朝画面右上方斜飞
    var REST_POS = new THREE.Vector3(-0.06, 0.79, 0.08);
    var REST_SCL = new THREE.Vector3(0.85, 0.4, 0.85);   // 略缩小 + 压扁贴画
    bird.position.copy(REST_POS);
    root.updateMatrixWorld(true);
    var restTarget = new THREE.Vector3(0.45, 0.55, 0).add(REST_POS);
    frameG.localToWorld(restTarget);
    bird.up.set(0, 0, 1);        // 让鸟背(+y)朝向画布法线 → 观众看到展翅背影
    bird.lookAt(restTarget);
    bird.up.set(0, 1, 0);        // 恢复默认 up，飞行时用
    var REST_QUAT = bird.quaternion.clone();
    bird.scale.copy(REST_SCL);

    /* ---- 飞行路径：跳出画框 → 绕画架一圈 → 回到画里（frameG 局部坐标）---- */
    var flightCurve = new THREE.CatmullRomCurve3([
      REST_POS.clone(),
      new THREE.Vector3( 0.03, 0.87,  0.34),
      new THREE.Vector3( 0.44, 0.97,  0.30),
      new THREE.Vector3( 0.60, 1.08, -0.08),
      new THREE.Vector3( 0.12, 1.20, -0.48),
      new THREE.Vector3(-0.52, 1.08, -0.28),
      new THREE.Vector3(-0.58, 0.94,  0.16),
      new THREE.Vector3(-0.26, 0.84,  0.42),
      new THREE.Vector3(-0.10, 0.80,  0.18),
      REST_POS.clone()
    ]);

    /* ---- 隐形点击热区 ---- */
    var proxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 1.42, 1.0),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.71, -0.1);
    root.add(proxy);

    /* ---- 交互 ---- */
    var busy = false;
    var tmpV = new THREE.Vector3();
    root.userData.fx = {
      tap: function(){
        if (busy) return;
        busy = true;

        // 1. 画架轻晃两下
        gsap.timeline()
          .to(body.rotation, {z: 0.045, duration: 0.15, ease: 'sine.inOut'})
          .to(body.rotation, {z: -0.04, duration: 0.28, ease: 'sine.inOut'})
          .to(body.rotation, {z: 0.025, duration: 0.26, ease: 'sine.inOut'})
          .to(body.rotation, {z: 0, duration: 0.24, ease: 'sine.out'});

        // 2. 小鸟起飞：恢复立体、扇翅
        gsap.to(bird.scale, {x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(2)'});
        var flapL = gsap.to(wingPivotL.rotation, {z: 0.75, duration: 0.11, yoyo: true, repeat: -1, ease: 'sine.inOut'});
        var flapR = gsap.to(wingPivotR.rotation, {z: -0.75, duration: 0.11, yoyo: true, repeat: -1, ease: 'sine.inOut'});

        var fly = {t: 0};
        gsap.to(fly, {
          t: 1, duration: 3.0, ease: 'power1.inOut',
          onUpdate: function(){
            var t = fly.t;
            flightCurve.getPoint(t, tmpV);
            bird.position.copy(tmpV);
            if (t > 0.02 && t < 0.96){
              flightCurve.getPoint(Math.min(1, t + 0.02), tmpV);
              frameG.localToWorld(tmpV);
              bird.lookAt(tmpV);  // 鼻尖(+z)沿切线
            }
          },
          onComplete: function(){
            flapL.kill(); flapR.kill();
            bird.position.copy(REST_POS);
            gsap.to(wingPivotL.rotation, {z: 0, duration: 0.3, ease: 'sine.out'});
            gsap.to(wingPivotR.rotation, {z: 0, duration: 0.3, ease: 'sine.out'});
            gsap.to(bird.scale, {x: REST_SCL.x, y: REST_SCL.y, z: REST_SCL.z, duration: 0.35, ease: 'power2.out'});
            // 姿态用四元数插值回停驻位
            var qFrom = bird.quaternion.clone();
            var lerp = {t: 0};
            gsap.to(lerp, {
              t: 1, duration: 0.4, ease: 'power2.out',
              onUpdate: function(){
                THREE.Quaternion.slerp(qFrom, REST_QUAT, bird.quaternion, lerp.t);
              },
              onComplete: function(){ busy = false; }
            });
          }
        });
      }
    };

    return root;
  };
})();
