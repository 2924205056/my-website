/* 复古白鸟笼 + 小白鸟 —— 手作黏土感程序化 3D 模型（three r128 兼容）
 * 优雅圆顶笼形：车削线脚底盘、细密笼条、卷草饰带、黄铜圆环挂钩、拱窗小门
 * 交互 API：userData.cage = { doorPivot, bird, wings, perchY, doorOpen, setDoor(open) }
 *           userData.fx   = { tap() } —— 挂环轻晃 + 小鸟蹦跳扑翅
 * 飞行路径由页面层（index.html）用 CatmullRomCurve3 编排
 */
(function(){
  'use strict';

  var PORC = 0xf2ede2, PORC_D = 0xe0d8c8, CREAM = 0xead9b8,
      BRASS = 0xc9a05a, BRASS_D = 0xa8843f,
      WOOD = 0x8a6134, WOOD_D = 0x66452a,
      BLUE = 0x4a7cb8,
      BIRD_W = 0xf7f3ea, WING_B = 0xa9bfd6, BEAK = 0xd08a3e, EYE = 0x1c1c20, BLUSH = 0xe4b39c;

  function lam(color){ return new THREE.MeshLambertMaterial({color: color}); }

  /* 底盘蓝天云朵地板 —— 复古水粉配色 */
  function floorTexture(){
    var cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    var g = cv.getContext('2d');
    g.fillStyle = '#4a7cb8';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(240,234,220,.92)';
    function blob(x, y, s){
      g.beginPath();
      g.arc(x - s * 0.7, y + s * 0.15, s * 0.5, 0, 7);
      g.arc(x, y - s * 0.2, s * 0.7, 0, 7);
      g.arc(x + s * 0.7, y + s * 0.15, s * 0.5, 0, 7);
      g.fill();
    }
    blob(70, 90, 26); blob(165, 70, 20); blob(140, 160, 24); blob(60, 185, 16); blob(215, 140, 14);
    return new THREE.CanvasTexture(cv);
  }

  window.createLockerBirdcage = function(){
    var root = new THREE.Group();
    root.name = 'Clay Birdcage with White Bird';
    var matPorc = lam(PORC), matPorcD = lam(PORC_D),
        matBrass = lam(BRASS), matBrassD = lam(BRASS_D),
        matWood = lam(WOOD), matWoodD = lam(WOOD_D),
        matBirdW = lam(BIRD_W), matWing = lam(WING_B),
        matBeak = lam(BEAK), matEye = lam(EYE), matBlush = lam(BLUSH);

    function mesh(name, geo, mat, x, y, z, parent){
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x || 0, y || 0, z || 0);
      m.name = name;
      (parent || root).add(m);
      return m;
    }

    var R = 0.40;              // 笼身半径
    var BAR_Y0 = 0.155, BAR_Y1 = 0.80;   // 笼条上下端
    var BAND_Y0 = 0.80, BAND_Y1 = 0.88;  // 饰带
    var DOME_TOP = 1.152;

    /* ---- 车削线脚底盘 + 云朵地板 + 小圆脚 ---- */
    var gBase = new THREE.Group(); gBase.name = 'base'; root.add(gBase);
    var baseProfile = [
      [0.001, 0.040], [0.400, 0.040], [0.452, 0.052], [0.472, 0.082],
      [0.460, 0.112], [0.428, 0.132], [0.420, 0.150], [0.438, 0.162],
      [0.442, 0.176], [0.408, 0.184], [0.001, 0.184]
    ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    mesh('base-tray', new THREE.LatheGeometry(baseProfile, 44), matPorc, 0, 0, 0, gBase);
    var brassLine = mesh('base-brass-line', new THREE.TorusGeometry(0.468, 0.006, 6, 48), matBrassD, 0, 0.088, 0, gBase);
    brassLine.rotation.x = Math.PI / 2;
    var floor = mesh('floor-clouds', new THREE.CircleGeometry(0.40, 40),
      new THREE.MeshBasicMaterial({map: floorTexture()}), 0, 0.186, 0, gBase);
    floor.rotation.x = -Math.PI / 2;
    for (var fi = 0; fi < 4; fi++){
      var fa = (fi / 4) * Math.PI * 2 + Math.PI / 4;
      var foot = mesh('foot-' + fi, new THREE.SphereGeometry(0.044, 14, 10), matPorcD,
        Math.cos(fa) * 0.36, 0.034, Math.sin(fa) * 0.36, gBase);
      foot.scale.set(1, 0.75, 1);
    }

    /* ---- 笼条：24 根细条，门洞区域留空 ---- */
    var gBars = new THREE.Group(); gBars.name = 'cage-bars'; root.add(gBars);
    var barH = BAR_Y1 - BAR_Y0;
    var barGeo = new THREE.CylinderGeometry(0.008, 0.008, barH, 6);
    var DOOR_Z = 0.16;                          // 门洞半宽（z 向）
    var DOOR_Y0 = 0.265, DOOR_Y1 = 0.735;       // 门洞上下沿
    var barLoGeo = new THREE.CylinderGeometry(0.008, 0.008, DOOR_Y0 - BAR_Y0, 6);
    var barHiGeo = new THREE.CylinderGeometry(0.008, 0.008, BAR_Y1 - DOOR_Y1, 6);
    for (var i = 0; i < 24; i++){
      var a = (i / 24) * Math.PI * 2;
      var bx = Math.cos(a) * R, bz = Math.sin(a) * R;
      var inDoor = bx > 0 && Math.abs(bz) < DOOR_Z;
      if (!inDoor){
        mesh('bar-' + i, barGeo, matPorc, bx, (BAR_Y0 + BAR_Y1) / 2, bz, gBars);
      } else {
        mesh('bar-lo-' + i, barLoGeo, matPorc, bx, (BAR_Y0 + DOOR_Y0) / 2, bz, gBars);
        mesh('bar-hi-' + i, barHiGeo, matPorc, bx, (DOOR_Y1 + BAR_Y1) / 2, bz, gBars);
      }
    }
    // 门洞两侧立柱（稍粗）+ 上下横楣
    var postX = Math.sqrt(R * R - DOOR_Z * DOOR_Z);
    var postGeo = new THREE.CylinderGeometry(0.012, 0.012, barH, 8);
    mesh('door-post-a', postGeo, matPorc, postX, (BAR_Y0 + BAR_Y1) / 2, DOOR_Z, gBars);
    mesh('door-post-b', postGeo, matPorc, postX, (BAR_Y0 + BAR_Y1) / 2, -DOOR_Z, gBars);
    var lintelGeo = new THREE.CylinderGeometry(0.010, 0.010, DOOR_Z * 2, 6);
    [DOOR_Y0, DOOR_Y1].forEach(function(ly, li){
      var lt = mesh('door-lintel-' + li, lintelGeo, matPorc, postX, ly, 0, gBars);
      lt.rotation.x = Math.PI / 2;
    });
    // 底圈
    var ringLow = mesh('ring-low', new THREE.TorusGeometry(R, 0.012, 8, 48), matPorc, 0, BAR_Y0, 0, gBars);
    ringLow.rotation.x = Math.PI / 2;

    /* ---- 卷草饰带 ---- */
    var gBand = new THREE.Group(); gBand.name = 'scroll-band'; root.add(gBand);
    [BAND_Y0, BAND_Y1].forEach(function(by, bi){
      var rail = mesh('band-rail-' + bi, new THREE.TorusGeometry(R, 0.012, 8, 48), matPorc, 0, by, 0, gBand);
      rail.rotation.x = Math.PI / 2;
    });
    for (var ci = 0; ci < 12; ci++){
      var ca = (ci / 12) * Math.PI * 2 + Math.PI / 24;
      var curl = mesh('curl-' + ci, new THREE.TorusGeometry(0.026, 0.007, 6, 16, Math.PI * 1.5),
        matPorc, Math.cos(ca) * (R + 0.004), (BAND_Y0 + BAND_Y1) / 2, Math.sin(ca) * (R + 0.004), gBand);
      curl.rotation.y = -ca + Math.PI / 2;
      if (ci % 2) curl.rotation.z = Math.PI;
    }

    /* ---- 穹顶：贝塞尔弧线肋条 x24 + 束环 ---- */
    var gDome = new THREE.Group(); gDome.name = 'cage-dome'; root.add(gDome);
    var domeCurve = new THREE.CubicBezierCurve(
      new THREE.Vector2(R, BAND_Y1),
      new THREE.Vector2(R + 0.006, 1.035),
      new THREE.Vector2(0.26, 1.128),
      new THREE.Vector2(0.030, DOME_TOP)
    );
    var ribPts = [];
    for (var s = 0; s <= 14; s++){
      var dp = domeCurve.getPoint(s / 14);
      ribPts.push(new THREE.Vector3(dp.x, dp.y, 0));
    }
    var ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 18, 0.0075, 6);
    for (var ri = 0; ri < 24; ri++){
      var rib = mesh('rib-' + ri, ribGeo, matPorc, 0, 0, 0, gDome);
      rib.rotation.y = (ri / 24) * Math.PI * 2;
    }
    var midP = domeCurve.getPoint(0.52);
    var domeRing = mesh('dome-ring', new THREE.TorusGeometry(midP.x, 0.009, 6, 44), matPorc, 0, midP.y, 0, gDome);
    domeRing.rotation.x = Math.PI / 2;

    /* ---- 顶饰：车削收口 + 黄铜圆环挂钩 ---- */
    var gFinial = new THREE.Group(); gFinial.name = 'finial'; gDome.add(gFinial);
    var finProfile = [
      [0.056, DOME_TOP - 0.012], [0.058, DOME_TOP + 0.014], [0.040, DOME_TOP + 0.030],
      [0.022, DOME_TOP + 0.040], [0.036, DOME_TOP + 0.056], [0.048, DOME_TOP + 0.080],
      [0.040, DOME_TOP + 0.104], [0.018, DOME_TOP + 0.122], [0.013, DOME_TOP + 0.140],
      [0.001, DOME_TOP + 0.146]
    ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    mesh('finial-turned', new THREE.LatheGeometry(finProfile, 24), matPorc, 0, 0, 0, gFinial);
    mesh('finial-loop', new THREE.TorusGeometry(0.022, 0.009, 8, 18), matBrassD, 0, DOME_TOP + 0.152, 0, gFinial);
    // 挂环枢轴：环挂在小圈上，可轻轻摆动
    var ringPivot = new THREE.Group();
    ringPivot.name = 'hang-ring-pivot';
    ringPivot.position.set(0, DOME_TOP + 0.164, 0);
    gFinial.add(ringPivot);
    mesh('hanging-ring', new THREE.TorusGeometry(0.058, 0.011, 10, 30), matBrass, 0, 0.062, 0, ringPivot);

    /* ---- 门（拱窗小门；铰链在 +z 侧立柱，默认关闭）---- */
    var doorPivot = new THREE.Group();
    doorPivot.name = 'door-pivot';
    doorPivot.position.set(postX, (DOOR_Y0 + DOOR_Y1) / 2, DOOR_Z);
    root.add(doorPivot);
    // 铰链套筒（贴在枢轴上）
    [-0.15, 0.15].forEach(function(hy, hi){
      mesh('hinge-' + hi, new THREE.CylinderGeometry(0.015, 0.015, 0.05, 10), matBrassD, 0, hy, 0, doorPivot);
    });
    var door = new THREE.Group();
    door.name = 'door';
    doorPivot.add(door);
    var dw = DOOR_Z * 2, dh = 0.46, fr = 0.013;
    var stileGeo = new THREE.CylinderGeometry(fr, fr, dh, 8);
    var railGeo = new THREE.CylinderGeometry(fr, fr, dw, 8);
    mesh('door-stile-hinge', stileGeo, matPorc, 0, 0, 0, door);
    mesh('door-stile-latch', stileGeo, matPorc, 0, 0, -dw, door);
    [dh / 2, -dh / 2, 0.042].forEach(function(ry, riD){
      var rail = mesh('door-rail-' + riD, railGeo, matPorc, 0, ry, -dw / 2, door);
      rail.rotation.x = Math.PI / 2;
    });
    // 拱窗：半圆拱 + 两根短棂
    var arch = mesh('door-arch', new THREE.TorusGeometry(0.105, 0.0065, 6, 22, Math.PI),
      matPorc, 0, 0.042, -dw / 2, door);
    arch.rotation.y = Math.PI / 2;
    [0.062, -0.062].forEach(function(mz, mi){
      mesh('door-mullion-' + mi, new THREE.CylinderGeometry(0.006, 0.006, 0.135, 6),
        matPorc, 0, 0.11, -dw / 2 + mz, door);
    });
    // 下半：一对相对的 C 形卷草 + 中央小珠
    [1, -1].forEach(function(sgn, siD){
      var sc = mesh('door-scroll-' + siD, new THREE.TorusGeometry(0.048, 0.0065, 6, 16, Math.PI * 1.45),
        matPorc, 0, -0.095, -dw / 2 + sgn * 0.062, door);
      sc.rotation.y = Math.PI / 2;
      sc.rotation.z = sgn > 0 ? Math.PI * 0.75 : -Math.PI * 0.25 + Math.PI;
    });
    mesh('door-pearl', new THREE.SphereGeometry(0.016, 10, 8), matPorcD, 0, -0.095, -dw / 2, door);
    // 黄铜门把
    mesh('door-knob', new THREE.SphereGeometry(0.018, 12, 10), matBrass, 0.018, -0.02, -dw + 0.012, door);
    mesh('door-knob-stem', new THREE.CylinderGeometry(0.007, 0.009, 0.02, 8), matBrassD, 0.008, -0.02, -dw + 0.012, door)
      .rotation.z = Math.PI / 2;
    doorPivot.rotation.y = 0; // 关闭态（门为正对门洞的弦面）

    /* ---- 栖木：木杆 + 车削端头 ---- */
    var perch = mesh('perch', new THREE.CylinderGeometry(0.021, 0.021, 0.68, 10), matWood, 0, 0.42, 0.05);
    perch.rotation.z = Math.PI / 2;
    [-1, 1].forEach(function(sgn, pi){
      mesh('perch-end-' + pi, new THREE.SphereGeometry(0.027, 10, 8), matWoodD, sgn * 0.335, 0.42, 0.05);
    });

    /* ---- 小白鸟：球身 + 豆眼 + 小尖嘴 ---- */
    var bird = new THREE.Group();
    bird.name = 'bird';
    var perchY = 0.42 + 0.021;
    bird.position.set(0, perchY, 0.05);
    bird.scale.set(0.88, 0.88, 0.88);
    root.add(bird);
    var gBirdBody = new THREE.Group(); gBirdBody.name = 'bird-body'; bird.add(gBirdBody);
    var torso = mesh('bird-torso', new THREE.SphereGeometry(0.145, 22, 18), matBirdW, 0, 0.135, 0.005, gBirdBody);
    torso.scale.set(0.96, 0.94, 1.06);
    mesh('bird-head', new THREE.SphereGeometry(0.105, 20, 16), matBirdW, 0, 0.268, 0.045, gBirdBody);
    var crest = mesh('bird-crest', new THREE.SphereGeometry(0.02, 8, 6), matBirdW, 0.0, 0.372, 0.028, gBirdBody);
    crest.scale.set(0.5, 1.5, 0.5);
    crest.rotation.z = 0.18;
    var gBirdDetail = new THREE.Group(); gBirdDetail.name = 'bird-detail'; bird.add(gBirdDetail);
    var beak = mesh('bird-beak', new THREE.ConeGeometry(0.026, 0.062, 10), matBeak, 0, 0.262, 0.158, gBirdDetail);
    beak.rotation.x = Math.PI / 2;
    [-1, 1].forEach(function(sgn){
      var eye = mesh('bird-eye-' + (sgn < 0 ? 'l' : 'r'), new THREE.SphereGeometry(0.0135, 10, 8), matEye,
        sgn * 0.054, 0.298, 0.128, gBirdDetail);
      eye.scale.set(1, 1.25, 0.6);
      var cheek = mesh('bird-cheek-' + (sgn < 0 ? 'l' : 'r'), new THREE.SphereGeometry(0.014, 8, 6), matBlush,
        sgn * 0.078, 0.258, 0.108, gBirdDetail);
      cheek.scale.set(1, 0.7, 0.45);
    });
    var gBirdWing = new THREE.Group(); gBirdWing.name = 'bird-wing'; bird.add(gBirdWing);
    var wingL = mesh('bird-wing-l', new THREE.SphereGeometry(0.075, 16, 12), matWing, -0.122, 0.135, -0.005, gBirdWing);
    wingL.scale.set(0.48, 1.05, 0.88);
    wingL.rotation.x = -0.12;
    var wingR = mesh('bird-wing-r', new THREE.SphereGeometry(0.075, 16, 12), matWing, 0.122, 0.135, -0.005, gBirdWing);
    wingR.scale.set(0.48, 1.05, 0.88);
    wingR.rotation.x = -0.12;
    var tail = mesh('bird-tail', new THREE.SphereGeometry(0.075, 14, 10), matWing, 0, 0.125, -0.17, gBirdWing);
    tail.scale.set(0.55, 0.24, 1.35);
    tail.rotation.x = -0.5;
    [-1, 1].forEach(function(sgn){
      mesh('bird-foot-' + (sgn < 0 ? 'l' : 'r'), new THREE.CylinderGeometry(0.011, 0.013, 0.05, 8),
        matBeak, sgn * 0.042, 0.012, 0.01, gBirdDetail);
    });

    /* ---- 隐形点击热区（细条之间会漏 raycast）---- */
    var proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 1.5, 10),
      new THREE.MeshBasicMaterial({visible: false})
    );
    proxy.name = 'hit-proxy';
    proxy.position.set(0, 0.73, 0);
    root.add(proxy);

    /* ---- 交互 API（保持契约不变）---- */
    root.userData.cage = {
      doorPivot: doorPivot,
      bird: bird,
      wings: [wingL, wingR],
      perchY: perchY,
      doorOpen: false,
      setDoor: function(open){
        this.doorOpen = open;
        var target = open ? -1.32 : 0;
        if(window.gsap){
          gsap.to(doorPivot.rotation, {y: target, duration: 0.9, ease: 'power3.inOut'});
        } else {
          doorPivot.rotation.y = target;
        }
      }
    };

    /* ---- fx.tap：挂环轻晃 + （鸟在笼里时）蹦跳扑翅 ---- */
    var fxBusy = false;
    root.userData.fx = {
      tap: function(){
        if(fxBusy || !window.gsap) return;
        fxBusy = true;
        var tl = gsap.timeline({onComplete: function(){ fxBusy = false; }});
        tl.to(ringPivot.rotation, {z: 0.55, duration: 0.2, ease: 'power2.out'}, 0)
          .to(ringPivot.rotation, {z: 0, duration: 1.8, ease: 'elastic.out(1, 0.22)'}, 0.2);
        if(bird.parent === root){
          tl.to(bird.position, {y: perchY + 0.1, duration: 0.26, ease: 'power2.out'}, 0.05)
            .to(bird.position, {y: perchY, duration: 0.45, ease: 'bounce.out'}, 0.31)
            .to(wingL.rotation, {z: 0.8, duration: 0.1, yoyo: true, repeat: 7, ease: 'sine.inOut'}, 0)
            .to(wingR.rotation, {z: -0.8, duration: 0.1, yoyo: true, repeat: 7, ease: 'sine.inOut'}, 0)
            .set(wingL.rotation, {z: 0}, 0.85)
            .set(wingR.rotation, {z: 0}, 0.85)
            .to(gBirdBody.rotation, {z: 0.14, duration: 0.16, yoyo: true, repeat: 3, ease: 'sine.inOut'}, 0.15)
            .set(gBirdBody.rotation, {z: 0}, 0.85);
        }
      }
    };
    return root;
  };
})();
